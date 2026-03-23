/**
 * Carousel for appointment-couture: flex-positioned arrows; 1 slide on mobile, 2 on desktop.
 * Autoplay with per-root interval; infinite loop when navigation is shown.
 */
(function () {
  /** 1 slide per view at this width and below; 2 slides above */
  var SINGLE_SLIDE_MQ = '(max-width: 1024px)';

  function clearCarouselTimers(root) {
    if (root._appointmentCarouselTimer) {
      clearInterval(root._appointmentCarouselTimer);
      root._appointmentCarouselTimer = null;
    }
  }

  function getPerView() {
    return window.matchMedia(SINGLE_SLIDE_MQ).matches ? 1 : 2;
  }

  function detachCarouselListeners(root) {
    if (root._appointmentCarouselResizeHandler) {
      window.removeEventListener('resize', root._appointmentCarouselResizeHandler);
      root._appointmentCarouselResizeHandler = null;
    }
    if (root._appointmentCarouselMql && root._appointmentCarouselOnMql) {
      root._appointmentCarouselMql.removeEventListener('change', root._appointmentCarouselOnMql);
      root._appointmentCarouselMql = null;
      root._appointmentCarouselOnMql = null;
    }
    if (root._appointmentCarouselHoverPause) {
      root.removeEventListener('mouseenter', root._appointmentCarouselHoverPause);
      root.removeEventListener('mouseleave', root._appointmentCarouselHoverResume);
      root._appointmentCarouselHoverPause = null;
      root._appointmentCarouselHoverResume = null;
    }
  }

  function initCarousel(root) {
    clearCarouselTimers(root);
    detachCarouselListeners(root);

    var viewport = root.querySelector('[data-carousel-viewport]');
    var track = root.querySelector('[data-carousel-track]');
    var slides = track ? Array.from(track.querySelectorAll('[data-carousel-slide]')) : [];
    var prev = root.querySelector('[data-carousel-prev]');
    var next = root.querySelector('[data-carousel-next]');

    if (!viewport || !track || slides.length === 0) {
      if (prev) prev.hidden = true;
      if (next) next.hidden = true;
      return;
    }

    function getMaxIndex() {
      var pv = getPerView();
      return Math.max(0, slides.length - pv);
    }

    function shouldHideNav() {
      return slides.length <= getPerView();
    }

    function setNavHidden(hidden) {
      if (prev) prev.hidden = hidden;
      if (next) next.hidden = hidden;
    }

    var intervalMs = parseInt(root.getAttribute('data-carousel-interval'), 10) || 3000;

    var index = 0;

    function slideStepWidth() {
      if (slides.length < 2) return 0;
      return slides[1].offsetLeft - slides[0].offsetLeft;
    }

    function update() {
      if (shouldHideNav()) return;
      var maxIdx = getMaxIndex();
      if (index > maxIdx) index = maxIdx;
      var step = slideStepWidth();
      track.style.transform = 'translate3d(' + -index * step + 'px, 0, 0)';
      if (prev) prev.disabled = false;
      if (next) next.disabled = false;
    }

    function startAutoplay() {
      clearCarouselTimers(root);
      if (shouldHideNav()) return;
      root._appointmentCarouselTimer = setInterval(function () {
        var maxIdx = getMaxIndex();
        index = index >= maxIdx ? 0 : index + 1;
        update();
      }, intervalMs);
    }

    function syncState() {
      if (shouldHideNav()) {
        clearCarouselTimers(root);
        setNavHidden(true);
        index = 0;
        track.style.transform = '';
        return;
      }
      setNavHidden(false);
      index = Math.min(index, getMaxIndex());
      update();
      startAutoplay();
    }

    function onPrevClick() {
      if (shouldHideNav()) return;
      var maxIdx = getMaxIndex();
      index = index <= 0 ? maxIdx : index - 1;
      update();
      startAutoplay();
    }

    function onNextClick() {
      if (shouldHideNav()) return;
      var maxIdx = getMaxIndex();
      index = index >= maxIdx ? 0 : index + 1;
      update();
      startAutoplay();
    }

    if (prev) prev.addEventListener('click', onPrevClick);
    if (next) next.addEventListener('click', onNextClick);

    root._appointmentCarouselResizeHandler = function () {
      syncState();
    };
    window.addEventListener('resize', root._appointmentCarouselResizeHandler, { passive: true });

    root._appointmentCarouselMql = window.matchMedia(SINGLE_SLIDE_MQ);
    root._appointmentCarouselOnMql = syncState;
    root._appointmentCarouselMql.addEventListener('change', root._appointmentCarouselOnMql);

    /** Pause autoplay while hovering carousel (slides, viewport, or arrows); resume on leave */
    root._appointmentCarouselHoverPause = function () {
      clearCarouselTimers(root);
    };
    root._appointmentCarouselHoverResume = function () {
      if (shouldHideNav()) return;
      startAutoplay();
    };
    root.addEventListener('mouseenter', root._appointmentCarouselHoverPause);
    root.addEventListener('mouseleave', root._appointmentCarouselHoverResume);

    syncState();
  }

  function initAll() {
    document.querySelectorAll('[data-appointment-carousel]').forEach(initCarousel);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

  document.addEventListener('shopify:section:load', function (e) {
    if (e.target.querySelector && e.target.querySelector('[data-appointment-carousel]')) {
      e.target.querySelectorAll('[data-appointment-carousel]').forEach(initCarousel);
    }
  });

  document.addEventListener('shopify:section:unload', function (e) {
    if (!e.target.querySelectorAll) return;
    e.target.querySelectorAll('[data-appointment-carousel]').forEach(function (root) {
      clearCarouselTimers(root);
      detachCarouselListeners(root);
    });
  });
})();
