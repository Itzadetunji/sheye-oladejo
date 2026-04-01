class CollectionInfiniteScroll {
	constructor() {
		this.isLoading = false;
		this.destroyed = false;
		this.nextUrl = null;
		this.rafId = 0;
		this.lastLoadAt = 0;
		this.minimumLoadInterval = 400;
		this.triggerThreshold = 0.7;
		this.generation = 0;
		this.itemKeys = new Set();
		this.init();
	}

	init() {
		this.cleanup();
		this.destroyed = false;
		this.generation += 1;

		this.gridContainer = document.getElementById("ProductGridContainer");
		this.grid = document.getElementById("product-grid");
		if (!this.gridContainer || !this.grid) return;
		this.section =
			this.gridContainer.closest('[id^="shopify-section-"]') ||
			this.gridContainer.closest(".shopify-section") ||
			this.gridContainer;

		this.nextUrl = this.extractNextUrl();
		if (!this.nextUrl) return;

		this.cacheExistingItemKeys();

		const pag = this.gridContainer.querySelector(".pagination-wrapper");
		if (pag) pag.style.display = "none";

		this.onScrollOrResize = this.onScrollOrResize.bind(this);
		window.addEventListener("scroll", this.onScrollOrResize, { passive: true });
		window.addEventListener("resize", this.onScrollOrResize);
		this.onScrollOrResize();
	}

	cleanup() {
		this.destroyed = true;
		this.generation += 1;

		if (this.onScrollOrResize) {
			window.removeEventListener("scroll", this.onScrollOrResize);
			window.removeEventListener("resize", this.onScrollOrResize);
		}

		if (this.rafId) cancelAnimationFrame(this.rafId);
		this.rafId = 0;
		this.isLoading = false;
		this.nextUrl = null;
	}

	extractNextUrl() {
		const pag = this.gridContainer?.querySelector(".pagination-wrapper");
		return this.extractNextUrlFromPagination(pag);
	}

	extractNextUrlFromPagination(pag) {
		if (!pag) return null;

		// Theme pagination uses the "--prev" class for the visual next arrow.
		const anchor =
			pag.querySelector("a.pagination__item--prev") ||
			pag.querySelector('a[aria-label*="next" i]') ||
			pag.querySelector(".pagination__list a:last-of-type");
		return anchor ? anchor.href : null;
	}

	buildSectionUrl(href) {
		const url = new URL(href, window.location.origin);
		const sectionId = this.grid?.dataset?.id;
		if (sectionId) url.searchParams.set("section_id", sectionId);
		return url.toString();
	}

	cacheExistingItemKeys() {
		this.itemKeys.clear();
		const items = this.grid.querySelectorAll(":scope > li");
		items.forEach((item) => {
			const key = this.getItemKey(item);
			if (key) this.itemKeys.add(key);
		});
	}

	getItemKey(item) {
		const productLink =
			item.querySelector('a[href*="/products/"]') ||
			item.querySelector("a[href]");
		if (!productLink) return null;

		try {
			return new URL(productLink.href, window.location.origin).pathname;
		} catch (_error) {
			return productLink.getAttribute("href");
		}
	}

	onScrollOrResize() {
		if (this.destroyed || !this.nextUrl) return;
		if (this.rafId) return;

		this.rafId = requestAnimationFrame(() => {
			this.rafId = 0;
			this.maybeLoadMore();
		});
	}

	getSectionProgress() {
		if (!this.section) return 0;

		const rect = this.section.getBoundingClientRect();
		if (rect.height <= 0) return 0;

		const viewportBottom = window.innerHeight;
		const clampedDistance = Math.max(
			0,
			Math.min(viewportBottom - rect.top, rect.height),
		);
		return clampedDistance / rect.height;
	}

	maybeLoadMore() {
		if (this.isLoading || !this.nextUrl || this.destroyed) return;

		const now = Date.now();
		if (now - this.lastLoadAt < this.minimumLoadInterval) return;

		const progress = this.getSectionProgress();
		if (progress >= this.triggerThreshold) {
			this.loadNextPage();
		}
	}

	async loadNextPage() {
		if (!this.nextUrl || this.isLoading || this.destroyed) return;

		const loadGeneration = this.generation;
		const urlToFetch = this.nextUrl;
		this.isLoading = true;
		this.lastLoadAt = Date.now();

		try {
			const response = await fetch(this.buildSectionUrl(urlToFetch));
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			const htmlText = await response.text();
			if (this.destroyed || loadGeneration !== this.generation) return;

			const doc = new DOMParser().parseFromString(htmlText, "text/html");

			const newItems = doc.querySelectorAll("#product-grid > li");
			let appendedCount = 0;
			newItems.forEach((item) => {
				const key = this.getItemKey(item);
				if (key && this.itemKeys.has(key)) return;
				if (key) this.itemKeys.add(key);
				this.grid.appendChild(item);
				appendedCount += 1;
			});

			const newPag = doc.querySelector(".pagination-wrapper");
			const oldPag = this.gridContainer.querySelector(".pagination-wrapper");

			if (newPag) {
				if (oldPag) {
					oldPag.replaceWith(newPag);
				} else {
					this.grid.insertAdjacentElement("afterend", newPag);
				}
				newPag.style.display = "none";
				this.nextUrl = this.extractNextUrlFromPagination(newPag);
			} else {
				if (oldPag) oldPag.remove();
				this.nextUrl = null;
			}

			if (
				appendedCount === 0 &&
				(this.nextUrl === urlToFetch || !this.nextUrl)
			) {
				this.nextUrl = null;
			}

			if (appendedCount === 0 && !this.nextUrl) {
				this.cleanup();
				return;
			}

			if (typeof initCardImageSkeleton === "function") initCardImageSkeleton();
			if (typeof initializeScrollAnimationTrigger === "function")
				initializeScrollAnimationTrigger();
		} catch (error) {
			console.error("Infinite scroll error:", error);
			// Keep nextUrl so scrolling can retry on transient network failures.
		} finally {
			this.isLoading = false;

			if (!this.nextUrl) {
				this.cleanup();
			} else {
				this.onScrollOrResize();
			}
		}
	}
}

window.collectionInfiniteScroll = null;

window.initCollectionInfiniteScroll = function () {
	if (window.collectionInfiniteScroll) {
		window.collectionInfiniteScroll.cleanup();
	}
	window.collectionInfiniteScroll = new CollectionInfiniteScroll();
};

if (document.readyState === "loading") {
	document.addEventListener(
		"DOMContentLoaded",
		window.initCollectionInfiniteScroll,
	);
} else {
	window.initCollectionInfiniteScroll();
}

document.addEventListener(
	"collection:facets-updated",
	window.initCollectionInfiniteScroll,
);
