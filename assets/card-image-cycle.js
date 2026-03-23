/**
 * CardImageCycle
 *
 * On hover, infinitely cycles through all product images in a card with a fade
 * (and subtle scale) transition. Resets back to the first image on mouse-leave.
 *
 * Requires: the `.media[data-image-cycle]` attribute added in card-product.liquid
 * and the companion CSS rules in component-card.css.
 */

class CardImageCycle {
  constructor(cardWrapper) {
    this.cardWrapper = cardWrapper;
    this.mediaEl = cardWrapper.querySelector('.media[data-image-cycle]');
    if (!this.mediaEl) return;

    this.images = Array.from(this.mediaEl.querySelectorAll('img'));
    if (this.images.length < 2) return;

    this.currentIndex = 0;
    this.intervalId = null;
    // Time each image is visible (ms). The fade-out is 400ms (from base.css),
    // so keep this well above 400ms to let the transition finish.
    this.intervalDuration = 1000;

    // Set initial opacity via inline style so the first image is always
    // visible and all subsequent images are hidden regardless of CSS specificity.
    this.images.forEach((img, i) => {
      img.style.opacity = i === 0 ? '1' : '0';
      img.style.transform = 'scale(1)';
    });

    this.cardWrapper.addEventListener('mouseenter', this._onEnter.bind(this));
    this.cardWrapper.addEventListener('mouseleave', this._onLeave.bind(this));
  }

  _onEnter() {
    if (this.intervalId) return;
    // Start cycling immediately on the first tick
    this.intervalId = setInterval(() => this._advance(), this.intervalDuration);
  }

  _advance() {
    const prev = this.currentIndex;
    this.currentIndex = (this.currentIndex + 1) % this.images.length;

    // Fade out the previous image
    this.images[prev].style.opacity = '0';
    this.images[prev].style.transform = 'scale(1)';

    // Fade in the next image with a subtle scale
    this.images[this.currentIndex].style.opacity = '1';
    this.images[this.currentIndex].style.transform = 'scale(1.03)';
  }

  _onLeave() {
    clearInterval(this.intervalId);
    this.intervalId = null;

    // Fade back to the first image
    this.images.forEach((img, i) => {
      img.style.opacity = i === 0 ? '1' : '0';
      img.style.transform = 'scale(1)';
    });
    this.currentIndex = 0;
  }
}

function initCardImageCycle() {
  document.querySelectorAll('.card-wrapper').forEach((wrapper) => {
    if (!wrapper._imageCycleInstance) {
      wrapper._imageCycleInstance = new CardImageCycle(wrapper);
    }
  });
}

// Initialise on DOMContentLoaded (or immediately if already loaded)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCardImageCycle);
} else {
  initCardImageCycle();
}

// Re-init whenever a Shopify section is dynamically loaded
document.addEventListener('shopify:section:load', initCardImageCycle);
