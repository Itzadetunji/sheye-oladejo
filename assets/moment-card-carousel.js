/**
 * Moment card: one slide per view, prev/next scroll the viewport.
 */
(function () {
  function init(root) {
    var scope = root && root.querySelector ? root : document;
    scope.querySelectorAll('[data-moment-carousel]:not([data-moment-carousel-initialized])').forEach(function (carousel) {
      carousel.setAttribute('data-moment-carousel-initialized', '');

      var viewport = carousel.querySelector('[data-moment-carousel-viewport]');
      var slides = carousel.querySelectorAll('[data-moment-carousel-slide]');
      var prev = carousel.querySelector('[data-moment-carousel-prev]');
      var next = carousel.querySelector('[data-moment-carousel-next]');

      if (!viewport || slides.length === 0) {
        if (prev) prev.hidden = true;
        if (next) next.hidden = true;
        return;
      }

      if (slides.length < 2) {
        if (prev) prev.hidden = true;
        if (next) next.hidden = true;
        return;
      }

      function step() {
        return viewport.clientWidth || 1;
      }

      function updateDisabled() {
        var maxScroll = viewport.scrollWidth - viewport.clientWidth - 1;
        var left = viewport.scrollLeft;
        if (prev) prev.disabled = left <= 2;
        if (next) next.disabled = left >= maxScroll - 2;
      }

      prev.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        viewport.scrollBy({ left: -step(), behavior: 'smooth' });
      });
      next.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        viewport.scrollBy({ left: step(), behavior: 'smooth' });
      });
      viewport.addEventListener('scroll', function () {
        window.requestAnimationFrame(updateDisabled);
      });
      window.addEventListener(
        'resize',
        function () {
          window.requestAnimationFrame(updateDisabled);
        },
        { passive: true }
      );
      updateDisabled();
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    init(document);
  });
  document.addEventListener('shopify:section:load', function (event) {
    init(event.target);
  });
})();
