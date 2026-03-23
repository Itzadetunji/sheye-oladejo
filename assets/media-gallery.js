if (!customElements.get("media-gallery")) {
	customElements.define(
		"media-gallery",
		class MediaGallery extends HTMLElement {
			constructor() {
				super();
				this.elements = {
					liveRegion: this.querySelector('[id^="GalleryStatus"]'),
					viewer: this.querySelector('[id^="GalleryViewer"]'),
					thumbnails: this.querySelector('[id^="GalleryThumbnails"]'),
					overlayNavButtons: this.querySelectorAll(
						"[data-gallery-overlay-nav]",
					),
				};
				this.mql = window.matchMedia("(min-width: 750px)");
				this.autoplayDelay = 5000;

				if (this.elements.viewer) {
					this.elements.viewer.addEventListener(
						"slideChanged",
						debounce(this.onSlideChanged.bind(this), 500),
					);
				}

				if (this.elements.thumbnails) {
					this.elements.thumbnails
						.querySelectorAll("[data-target]")
						.forEach((mediaToSwitch) => {
							mediaToSwitch
								.querySelector("button")
								.addEventListener(
									"click",
									this.setActiveMedia.bind(
										this,
										mediaToSwitch.dataset.target,
										false,
									),
								);
						});
				}

				if (
					this.dataset.desktopLayout.includes("thumbnail") &&
					this.mql.matches
				)
					this.removeListSemantic();

				this.bindViewerNavigationControls();
				this.bindOverlayNavigation();
				this.startAutoplay();
				window.requestAnimationFrame(() => {
					this.updateSliderControlsVisibility();
					this.syncViewerCounter();
				});
			}

			connectedCallback() {
				if (typeof subscribe !== "function" || !PUB_SUB_EVENTS?.variantChange)
					return;

				this.onVariantChangeUnsubscriber = subscribe(
					PUB_SUB_EVENTS.variantChange,
					({ data }) => {
						const sectionId = data?.sectionId;
						const featuredMediaId = data?.variant?.featured_media?.id;
						if (!sectionId || !featuredMediaId) return;
						if (this.id !== `MediaGallery-${sectionId}`) return;

						this.setActiveMedia(`${sectionId}-${featuredMediaId}`, true);
					},
				);
			}

			disconnectedCallback() {
				this.stopAutoplay();
				this.onVariantChangeUnsubscriber?.();
			}

			onSlideChanged(event) {
				const currentElement = event?.detail?.currentElement;
				if (currentElement?.dataset?.mediaId) {
					this.markActiveItem(currentElement);
					this.syncViewerCounter(currentElement);
				}

				if (!this.elements.thumbnails || !currentElement?.dataset?.mediaId)
					return;

				const thumbnail = this.elements.thumbnails.querySelector(
					`[data-target="${currentElement.dataset.mediaId}"]`,
				);
				this.setActiveThumbnail(thumbnail);
			}

			getMediaItems() {
				if (!this.elements.viewer) return [];
				return Array.from(
					this.elements.viewer.querySelectorAll("[data-media-id]"),
				);
			}

			getVisibleMediaItems() {
				return this.getMediaItems().filter((element) => {
					if (!element.isConnected) return false;
					if (element.clientWidth <= 0 || element.clientHeight <= 0)
						return false;
					return window.getComputedStyle(element).display !== "none";
				});
			}

			updateSliderControlsVisibility() {
				if (!this.elements.viewer) return;

				const visibleItems = this.getVisibleMediaItems();
				const sliderButtons =
					this.elements.viewer.querySelector(".slider-buttons");

				if (!sliderButtons) return;

				const hasMultipleItems = visibleItems.length > 1;
				sliderButtons.classList.toggle("hidden", !hasMultipleItems);
			}

			syncViewerCounter(activeMedia = null) {
				if (
					!this.elements.viewer?.currentPageElement ||
					!this.elements.viewer?.pageTotalElement
				)
					return;

				const visibleItems = this.getVisibleMediaItems();
				const fallbackActive =
					visibleItems.find((item) => item.classList.contains("is-active")) ||
					visibleItems[0];
				const activeItem = activeMedia || fallbackActive;
				const currentIndex = visibleItems.indexOf(activeItem);

				this.elements.viewer.currentPageElement.textContent =
					currentIndex >= 0 ? currentIndex + 1 : 1;
				this.elements.viewer.pageTotalElement.textContent = visibleItems.length;
			}

			getCurrentVisibleIndex(mediaItems = this.getVisibleMediaItems()) {
				if (!mediaItems.length) return -1;

				const activeIndex = mediaItems.findIndex((item) =>
					item.classList.contains("is-active"),
				);
				if (activeIndex >= 0) return activeIndex;

				const currentPageIndex = (this.elements.viewer?.currentPage || 1) - 1;
				if (currentPageIndex >= 0 && currentPageIndex < mediaItems.length)
					return currentPageIndex;

				return 0;
			}

			markActiveItem(activeMedia) {
				this.getMediaItems().forEach((element) => {
					element.classList.toggle("is-active", element === activeMedia);
				});
			}

			setActiveMedia(mediaId, prepend = false) {
				let activeMedia =
					this.elements.viewer.querySelector(`[data-media-id="${mediaId}"]`) ||
					this.elements.viewer.querySelector("[data-media-id]");
				if (!activeMedia) return;

				if (prepend) {
					activeMedia.parentElement.firstChild !== activeMedia &&
						activeMedia.parentElement.prepend(activeMedia);

					if (this.elements.thumbnails) {
						const activeThumbnail = this.elements.thumbnails.querySelector(
							`[data-target="${mediaId}"]`,
						);
						activeThumbnail.parentElement.firstChild !== activeThumbnail &&
							activeThumbnail.parentElement.prepend(activeThumbnail);
					}

					if (this.elements.viewer.slider) this.elements.viewer.resetPages();
				}

				const visibleItems = this.getVisibleMediaItems();
				if (!visibleItems.includes(activeMedia)) {
					activeMedia = visibleItems[0] || activeMedia;
				}

				this.markActiveItem(activeMedia);
				this.updateSliderControlsVisibility();
				this.syncViewerCounter(activeMedia);

				this.preventStickyHeader();
				window.setTimeout(() => {
					if (!this.mql.matches || this.elements.thumbnails) {
						activeMedia.parentElement.scrollTo({
							left: activeMedia.offsetLeft,
						});
					}
					const activeMediaRect = activeMedia.getBoundingClientRect();
					// Don't scroll if the image is already in view
					if (activeMediaRect.top > -0.5) return;
					const top = activeMediaRect.top + window.scrollY;
					window.scrollTo({ top: top, behavior: "smooth" });
				});
				this.playActiveMedia(activeMedia);

				if (!this.elements.thumbnails) return;
				const activeThumbnail = this.elements.thumbnails.querySelector(
					`[data-target="${mediaId}"]`,
				);
				this.setActiveThumbnail(activeThumbnail);
				const position =
					activeThumbnail?.dataset?.mediaPosition ||
					String(this.getCurrentVisibleIndex() + 1);
				this.announceLiveRegion(activeMedia, position);
			}

			setActiveMediaByIndex(index) {
				const mediaItems = this.getVisibleMediaItems();
				if (mediaItems.length < 1) return;

				const wrappedIndex =
					((index % mediaItems.length) + mediaItems.length) % mediaItems.length;
				const activeMedia = mediaItems[wrappedIndex];

				this.markActiveItem(activeMedia);
				this.syncViewerCounter(activeMedia);
				this.preventStickyHeader();
				this.elements.viewer?.setSlidePosition?.(activeMedia.offsetLeft);
				this.playActiveMedia(activeMedia);

				if (!this.elements.thumbnails) return;
				const activeThumbnail = this.elements.thumbnails.querySelector(
					`[data-target="${activeMedia.dataset.mediaId}"]`,
				);
				this.setActiveThumbnail(activeThumbnail);
			}

			nextMedia() {
				const mediaItems = this.getVisibleMediaItems();
				if (mediaItems.length < 2) return;
				const currentIndex = this.getCurrentVisibleIndex(mediaItems);
				this.setActiveMediaByIndex(currentIndex + 1);
			}

			previousMedia() {
				const mediaItems = this.getVisibleMediaItems();
				if (mediaItems.length < 2) return;
				const currentIndex = this.getCurrentVisibleIndex(mediaItems);
				this.setActiveMediaByIndex(currentIndex - 1);
			}

			setActiveThumbnail(thumbnail) {
				if (!this.elements.thumbnails || !thumbnail) return;

				this.elements.thumbnails
					.querySelectorAll("button")
					.forEach((element) => {
						element.removeAttribute("aria-current");
					});
				thumbnail.querySelector("button").setAttribute("aria-current", true);
				if (this.elements.thumbnails.isSlideVisible(thumbnail, 10)) return;

				this.elements.thumbnails.slider.scrollTo({
					left: thumbnail.offsetLeft,
				});
			}

			announceLiveRegion(activeItem, position) {
				const image = activeItem.querySelector(
					".product__modal-opener--image img",
				);
				if (!image) return;
				const updateLiveRegion = () => {
					this.elements.liveRegion.setAttribute("aria-hidden", false);
					this.elements.liveRegion.innerHTML =
						window.accessibilityStrings.imageAvailable.replace(
							"[index]",
							position,
						);
					setTimeout(() => {
						this.elements.liveRegion.setAttribute("aria-hidden", true);
					}, 2000);
				};

				if (image.complete) {
					updateLiveRegion();
					return;
				}

				image.onload = updateLiveRegion;
			}

			playActiveMedia(activeItem) {
				window.pauseAllMedia();
				const deferredMedia = activeItem.querySelector(".deferred-media");
				if (deferredMedia) deferredMedia.loadContent(false);
			}

			preventStickyHeader() {
				this.stickyHeader =
					this.stickyHeader || document.querySelector("sticky-header");
				if (!this.stickyHeader) return;
				this.stickyHeader.dispatchEvent(new Event("preventHeaderReveal"));
			}

			removeListSemantic() {
				if (!this.elements.viewer.slider) return;
				this.elements.viewer.slider.setAttribute("role", "presentation");
				this.elements.viewer.sliderItems.forEach((slide) => {
					slide.setAttribute("role", "presentation");
				});
			}

			bindViewerNavigationControls() {
				if (
					!this.elements.viewer?.prevButton ||
					!this.elements.viewer?.nextButton
				)
					return;
				this.elements.viewer.enableSliderLooping = true;

				this.manualNavHandler = (event) => {
					event.preventDefault();
					event.stopImmediatePropagation();

					if (event.currentTarget.name === "next") {
						this.nextMedia();
						return;
					}

					this.previousMedia();
				};

				this.elements.viewer.prevButton.addEventListener(
					"click",
					this.manualNavHandler,
					{ capture: true },
				);
				this.elements.viewer.nextButton.addEventListener(
					"click",
					this.manualNavHandler,
					{ capture: true },
				);
			}

			bindOverlayNavigation() {
				if (!this.elements.overlayNavButtons?.length || !this.elements.viewer)
					return;

				this.overlayNavHandler = (event) => {
					event.preventDefault();
					const direction = event.currentTarget.dataset.galleryOverlayNav;
					if (direction === "next") {
						this.nextMedia();
						return;
					}

					this.previousMedia();
				};

				this.elements.overlayNavButtons.forEach((button) => {
					button.addEventListener("click", this.overlayNavHandler);
				});
			}

			startAutoplay() {
				if (!this.elements.viewer?.slider || !this.elements.viewer?.nextButton)
					return;
				if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
					return;

				const shouldAutoplay = () => {
					if (document.hidden) return false;
					return this.getVisibleMediaItems().length > 1;
				};

				const startInterval = () => {
					if (this.autoplayInterval || !shouldAutoplay()) return;
					this.autoplayInterval = window.setInterval(() => {
						if (!shouldAutoplay()) return;
						this.nextMedia();
					}, this.autoplayDelay);
				};

				const stopInterval = () => {
					if (!this.autoplayInterval) return;
					window.clearInterval(this.autoplayInterval);
					this.autoplayInterval = null;
				};

				this.autoplayStartHandler = startInterval;
				this.autoplayStopHandler = stopInterval;
				this.autoplayVisibilityHandler = () => {
					if (document.hidden) {
						stopInterval();
						return;
					}
					startInterval();
				};

				this.addEventListener("mouseenter", this.autoplayStopHandler);
				this.addEventListener("mouseleave", this.autoplayStartHandler);
				this.addEventListener("focusin", this.autoplayStopHandler);
				this.addEventListener("focusout", this.autoplayStartHandler);
				document.addEventListener(
					"visibilitychange",
					this.autoplayVisibilityHandler,
				);

				window.requestAnimationFrame(startInterval);
				window.setTimeout(startInterval, 300);
			}

			stopAutoplay() {
				if (this.autoplayInterval) {
					window.clearInterval(this.autoplayInterval);
					this.autoplayInterval = null;
				}

				if (this.autoplayStopHandler) {
					this.removeEventListener("mouseenter", this.autoplayStopHandler);
					this.removeEventListener("focusin", this.autoplayStopHandler);
				}

				if (this.autoplayStartHandler) {
					this.removeEventListener("mouseleave", this.autoplayStartHandler);
					this.removeEventListener("focusout", this.autoplayStartHandler);
				}

				if (this.autoplayVisibilityHandler) {
					document.removeEventListener(
						"visibilitychange",
						this.autoplayVisibilityHandler,
					);
				}

				if (
					this.manualNavHandler &&
					this.elements.viewer?.prevButton &&
					this.elements.viewer?.nextButton
				) {
					this.elements.viewer.prevButton.removeEventListener(
						"click",
						this.manualNavHandler,
						true,
					);
					this.elements.viewer.nextButton.removeEventListener(
						"click",
						this.manualNavHandler,
						true,
					);
				}

				if (this.overlayNavHandler && this.elements.overlayNavButtons?.length) {
					this.elements.overlayNavButtons.forEach((button) => {
						button.removeEventListener("click", this.overlayNavHandler);
					});
				}
			}
		},
	);
}
