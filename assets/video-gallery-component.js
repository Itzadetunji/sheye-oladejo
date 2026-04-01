(() => {
  if (window.__videoGalleryComponentBound) return;
  window.__videoGalleryComponentBound = true;

  const initGallery = (gallery) => {
    if (!gallery || gallery.dataset.initialized === 'true') return;

    const cards = Array.from(gallery.querySelectorAll('[data-video-card]'));
    const videos = cards.map((card) => card.querySelector('video')).filter((videoEl) => videoEl);

    if (!videos.length) {
      gallery.dataset.initialized = 'true';
      return;
    }

    let currentIndex = 0;

    const setActive = (nextIndex) => {
      currentIndex = nextIndex;

      videos.forEach((videoEl, index) => {
        const card = videoEl.closest('[data-video-card]');
        if (!card) return;

        if (index === currentIndex) {
          card.classList.add('is-active');
          videoEl.muted = true;
          videoEl.play().catch(() => {});
        } else {
          card.classList.remove('is-active');
          videoEl.pause();
        }
      });
    };

    videos.forEach((videoEl, index) => {
      videoEl.addEventListener('ended', () => {
        if (index !== currentIndex) return;
        const nextIndex = (currentIndex + 1) % videos.length;
        setActive(nextIndex);
      });

      const card = videoEl.closest('[data-video-card]');
      if (card) {
        card.addEventListener('click', () => {
          setActive(index);
        });
      }
    });

    setActive(0);
    gallery.dataset.initialized = 'true';
  };

  const initInRoot = (root) => {
    if (!root) return;

    if (root.matches?.('[data-video-gallery-component]')) {
      initGallery(root);
    }

    root.querySelectorAll('[data-video-gallery-component]').forEach(initGallery);
  };

  const onReady = () => initInRoot(document);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onReady, { once: true });
  } else {
    onReady();
  }

  document.addEventListener('shopify:section:load', (event) => {
    initInRoot(event.target);
  });
})();
