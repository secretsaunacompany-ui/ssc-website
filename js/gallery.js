/**
 * Secret Sauna Company - Gallery Module
 * Gallery lightbox functionality
 */
(function() {
    'use strict';

    // ============================================
    // Gallery Lightbox
    // ============================================
    class GalleryLightbox {
        constructor() {
            this.lightbox = null;
            this.lightboxImage = null;
            this.currentIndex = 0;
            this.galleryImages = [];
        }

        init() {
            this.lightbox = document.getElementById('galleryLightbox');
            this.lightboxImage = document.getElementById('lightboxImage');

            if (!this.lightbox) return;

            // Collect all gallery images
            this.collectGalleryImages();

            // Add click handlers to gallery items
            this.attachClickHandlers();

            // Keyboard navigation
            document.addEventListener('keydown', (e) => { this.handleKeydown(e); });

            // Close on overlay click
            this.lightbox.addEventListener('click', (e) => {
                if (e.target === this.lightbox) {
                    this.close();
                }
            });

            // Touch swipe support
            this.initTouchSwipe();
        }

        collectGalleryImages() {
            const galleryItems = document.querySelectorAll('.gallery-item img');
            // {src, alt} pairs, not bare srcs (2026-08-06): every source image
            // carries a descriptive alt, but the lightbox kept its static
            // 'Gallery image' across navigation -- AT heard nothing change.
            // The full-screen src also upgrades the grid's w_600/w_800
            // Cloudinary variant to w_1600; the grid sizes were soft on large
            // displays when shown full-screen.
            this.galleryImages = Array.from(galleryItems).map((img) => ({
                src: img.src.replace(/\bw_\d+\b/, 'w_1600'),
                alt: img.alt || 'Gallery image'
            }));
        }

        attachClickHandlers() {
            const galleryItems = document.querySelectorAll('.gallery-item');
            galleryItems.forEach((item, index) => {
                item.addEventListener('click', () => { this.open(index); });
            });
        }

        open(index) {
            this.currentIndex = index;
            // Captured at open, restored at close. Today the invokers are
            // non-focusable divs, so this captures <body> and the restore is
            // a coded no-op -- written this way (not body.focus()) so it
            // starts restoring to the real invoker the day the grid becomes
            // keyboard-reachable (a Jen-lane interaction change, recorded as
            // a Wave B residual; there is currently NO keyboard path to open
            // this lightbox at all).
            this.invoker = document.activeElement;
            this.updateImage();
            this.lightbox.classList.add('active');
            document.body.style.overflow = 'hidden';
            const closeBtn = this.lightbox.querySelector('.lightbox-close');
            if (closeBtn) closeBtn.focus();
        }

        close() {
            this.lightbox.classList.remove('active');
            document.body.style.overflow = '';
            // Order matters. document.body.focus() is a NO-OP (body is not
            // focusable), so restoring to a body invoker would leave focus
            // stranded on the close button we just hid -- worse than doing
            // nothing. Blur first, unconditionally, then restore only to an
            // invoker that can actually take focus (none today: the gallery
            // grid is not keyboard-reachable; see the note in open()).
            const active = document.activeElement;
            if (active && this.lightbox.contains(active) && typeof active.blur === 'function') {
                active.blur();
            }
            if (this.invoker && this.invoker !== document.body
                && typeof this.invoker.focus === 'function') {
                this.invoker.focus();
            }
        }

        navigate(direction) {
            this.currentIndex += direction;

            // Loop around
            if (this.currentIndex < 0) {
                this.currentIndex = this.galleryImages.length - 1;
            } else if (this.currentIndex >= this.galleryImages.length) {
                this.currentIndex = 0;
            }

            this.updateImage();
        }

        updateImage() {
            if (this.lightboxImage && this.galleryImages[this.currentIndex]) {
                const current = this.galleryImages[this.currentIndex];
                this.lightboxImage.src = current.src;
                this.lightboxImage.alt = current.alt;

                // Update counter
                const currentEl = document.getElementById('lightboxCurrent');
                const totalEl = document.getElementById('lightboxTotal');
                if (currentEl) currentEl.textContent = this.currentIndex + 1;
                if (totalEl) totalEl.textContent = this.galleryImages.length;
            }
        }

        handleKeydown(e) {
            if (!this.lightbox.classList.contains('active')) return;

            switch (e.key) {
                case 'Escape':
                    this.close();
                    break;
                case 'ArrowLeft':
                    this.navigate(-1);
                    break;
                case 'ArrowRight':
                    this.navigate(1);
                    break;
            }
        }

        initTouchSwipe() {
            let touchStartX = 0;
            let touchEndX = 0;

            this.lightbox.addEventListener('touchstart', (e) => {
                touchStartX = e.changedTouches[0].screenX;
            }, { passive: true });

            this.lightbox.addEventListener('touchend', (e) => {
                touchEndX = e.changedTouches[0].screenX;
                const diff = touchStartX - touchEndX;

                if (Math.abs(diff) > 50) {
                    if (diff > 0) {
                        this.navigate(1); // Swipe left = next
                    } else {
                        this.navigate(-1); // Swipe right = prev
                    }
                }
            }, { passive: true });
        }
    }

    // ============================================
    // Create instance
    // ============================================
    const galleryLightbox = new GalleryLightbox();

    // ============================================
    // Export to global scope
    // ============================================
    window.SSC = window.SSC || {};
    window.SSC.galleryLightbox = galleryLightbox;

})();
