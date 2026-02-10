/**
 * Secret Sauna Company - Gallery Module
 * Gallery lightbox functionality
 */
(function() {
    'use strict';

    // ============================================
    // Gallery Lightbox
    // ============================================
    function GalleryLightbox() {
        this.lightbox = null;
        this.lightboxImage = null;
        this.currentIndex = 0;
        this.galleryImages = [];
    }

    GalleryLightbox.prototype.init = function() {
        this.lightbox = document.getElementById('galleryLightbox');
        this.lightboxImage = document.getElementById('lightboxImage');

        if (!this.lightbox) return;

        // Collect all gallery images
        this.collectGalleryImages();

        // Add click handlers to gallery items
        this.attachClickHandlers();

        // Keyboard navigation
        var self = this;
        document.addEventListener('keydown', function(e) { self.handleKeydown(e); });

        // Close on overlay click
        this.lightbox.addEventListener('click', function(e) {
            if (e.target === self.lightbox) {
                self.close();
            }
        });

        // Touch swipe support
        this.initTouchSwipe();
    };

    GalleryLightbox.prototype.collectGalleryImages = function() {
        var galleryItems = document.querySelectorAll('.gallery-item img');
        this.galleryImages = Array.from(galleryItems).map(function(img) { return img.src; });
    };

    GalleryLightbox.prototype.attachClickHandlers = function() {
        var self = this;
        var galleryItems = document.querySelectorAll('.gallery-item');
        galleryItems.forEach(function(item, index) {
            item.addEventListener('click', function() { self.open(index); });
        });
    };

    GalleryLightbox.prototype.open = function(index) {
        this.currentIndex = index;
        this.updateImage();
        this.lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
    };

    GalleryLightbox.prototype.close = function() {
        this.lightbox.classList.remove('active');
        document.body.style.overflow = '';
    };

    GalleryLightbox.prototype.navigate = function(direction) {
        this.currentIndex += direction;

        // Loop around
        if (this.currentIndex < 0) {
            this.currentIndex = this.galleryImages.length - 1;
        } else if (this.currentIndex >= this.galleryImages.length) {
            this.currentIndex = 0;
        }

        this.updateImage();
    };

    GalleryLightbox.prototype.updateImage = function() {
        if (this.lightboxImage && this.galleryImages[this.currentIndex]) {
            this.lightboxImage.src = this.galleryImages[this.currentIndex];

            // Update counter
            var currentEl = document.getElementById('lightboxCurrent');
            var totalEl = document.getElementById('lightboxTotal');
            if (currentEl) currentEl.textContent = this.currentIndex + 1;
            if (totalEl) totalEl.textContent = this.galleryImages.length;
        }
    };

    GalleryLightbox.prototype.handleKeydown = function(e) {
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
    };

    GalleryLightbox.prototype.initTouchSwipe = function() {
        var self = this;
        var touchStartX = 0;
        var touchEndX = 0;

        this.lightbox.addEventListener('touchstart', function(e) {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        this.lightbox.addEventListener('touchend', function(e) {
            touchEndX = e.changedTouches[0].screenX;
            var diff = touchStartX - touchEndX;

            if (Math.abs(diff) > 50) {
                if (diff > 0) {
                    self.navigate(1); // Swipe left = next
                } else {
                    self.navigate(-1); // Swipe right = prev
                }
            }
        }, { passive: true });
    };

    // ============================================
    // Create instance
    // ============================================
    var galleryLightbox = new GalleryLightbox();

    // ============================================
    // Export to global scope
    // ============================================
    window.SSC = window.SSC || {};
    window.SSC.galleryLightbox = galleryLightbox;

    // Global functions for lightbox buttons
    window.galleryLightbox = galleryLightbox;
    window.closeLightbox = function() { galleryLightbox.close(); };
    window.navigateLightbox = function(direction) { galleryLightbox.navigate(direction); };

})();
