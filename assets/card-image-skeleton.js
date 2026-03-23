/**
 * CardImageSkeleton
 *
 * Shows a shadcn-style skeleton placeholder while product card images load.
 * When the primary image loads, the skeleton fades out and the image fades in.
 */

function initCardImageSkeleton() {
	document.querySelectorAll(".card__media-inner").forEach((mediaEl) => {
		if (mediaEl.classList.contains("card__media--loaded")) return;

		const primaryImg = mediaEl.querySelector(".card__media-img");
		if (!primaryImg) return;

		function markLoaded() {
			mediaEl.classList.add("card__media--loaded");
		}

		if (primaryImg.complete && primaryImg.naturalHeight > 0) {
			markLoaded();
		} else {
			primaryImg.addEventListener("load", markLoaded);
			primaryImg.addEventListener("error", markLoaded);
		}
	});
}

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", initCardImageSkeleton);
} else {
	initCardImageSkeleton();
}

document.addEventListener("shopify:section:load", initCardImageSkeleton);
