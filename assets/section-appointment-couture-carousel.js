/**
 * Single-image slider carousel for appointment-couture tiles.
 * One slide is visible at a time and rotates every 3s by default.
 */
(() => {
	function clearCarouselTimer(root) {
		if (root._appointmentSliderCarouselTimer) {
			clearTimeout(root._appointmentSliderCarouselTimer);
			root._appointmentSliderCarouselTimer = null;
		}
	}

	function clearCarouselClone(track) {
		if (!track) return;
		track.querySelectorAll('[data-carousel-clone="true"]').forEach((node) => {
			node.remove();
		});
	}

	function initCarousel(root) {
		clearCarouselTimer(root);

		var track = root.querySelector("[data-carousel-track]");
		if (!track) return;

		clearCarouselClone(track);

		var slides = Array.from(track.querySelectorAll("[data-carousel-slide]"));
		if (!track || slides.length <= 1) return;

		var intervalMs =
			parseInt(root.getAttribute("data-carousel-interval"), 10) || 3000;
		var totalSlides = slides.length;
		var currentIndex = 0;

		var firstClone = slides[0].cloneNode(true);
		firstClone.setAttribute("data-carousel-clone", "true");
		firstClone.removeAttribute("id");
		track.appendChild(firstClone);

		function setTransition(enabled) {
			track.style.transition = enabled ? "transform 0.55s ease" : "none";
		}

		function moveToSlide(nextIndex, withTransition) {
			currentIndex = nextIndex;
			setTransition(withTransition !== false);
			track.style.transform = "translate3d(" + -currentIndex * 100 + "%, 0, 0)";
		}

		function showNext() {
			moveToSlide(currentIndex + 1, true);
			track.addEventListener(
				"transitionend",
				function onSlideTransitionDone() {
					if (currentIndex === totalSlides) {
						moveToSlide(0, false);
					}
					scheduleNext();
				},
				{ once: true },
			);
		}

		function scheduleNext() {
			clearCarouselTimer(root);
			root._appointmentSliderCarouselTimer = setTimeout(showNext, intervalMs);
		}

		root.addEventListener("mouseenter", () => {
			clearCarouselTimer(root);
		});

		root.addEventListener("mouseleave", () => {
			scheduleNext();
		});

		moveToSlide(0, false);
		scheduleNext();
	}

	function initAll() {
		document
			.querySelectorAll("[data-appointment-slider-carousel]")
			.forEach(initCarousel);
	}

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", initAll);
	} else {
		initAll();
	}

	document.addEventListener("shopify:section:load", (event) => {
		if (!event.target.querySelectorAll) return;
		event.target
			.querySelectorAll("[data-appointment-slider-carousel]")
			.forEach(initCarousel);
	});

	document.addEventListener("shopify:section:unload", (event) => {
		if (!event.target.querySelectorAll) return;
		event.target
			.querySelectorAll("[data-appointment-slider-carousel]")
			.forEach(clearCarouselTimer);
	});
})();
