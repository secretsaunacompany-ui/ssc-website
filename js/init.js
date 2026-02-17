/**
 * Secret Sauna Company - Initialization Module
 * Main entry point that initializes all components
 */
(function() {
    'use strict';

    const SSC = window.SSC;

    // ============================================
    // Event Delegation Hub
    // ============================================
    // Click actions (static template elements)
    document.addEventListener('click', (e) => {
        const target = e.target.closest('[data-action]');
        if (!target) return;

        const action = target.dataset.action;

        switch (action) {
            case 'toggle-menu':
                SSC.toggleMenu();
                break;
            case 'close-modal':
                if (SSC.modalManager) SSC.modalManager.close();
                break;
            case 'open-modal':
                if (SSC.modalManager) SSC.modalManager.open(target.dataset.model);
                break;
            case 'request-quote':
                if (SSC.modalManager) SSC.modalManager.requestQuote();
                break;
            case 'close-lightbox':
                if (SSC.galleryLightbox) SSC.galleryLightbox.close();
                break;
            case 'lightbox-nav':
                if (SSC.galleryLightbox) SSC.galleryLightbox.navigate(parseInt(target.dataset.dir));
                break;
            case 'filter-map':
                SSC.filterMapMarkers(target.dataset.filter);
                break;
        }
    });

    // Change actions (radio/checkbox elements)
    document.addEventListener('change', (e) => {
        const target = e.target.closest('[data-action]');
        if (!target) return;

        const action = target.dataset.action;

        switch (action) {
            case 'premium-change':
                if (SSC.modalManager) SSC.modalManager.handlePremiumPackageChange();
                break;
        }
    });

    // Submit actions (forms)
    document.addEventListener('submit', (e) => {
        const target = e.target.closest('[data-action]');
        if (!target) return;

        const action = target.dataset.action;

        switch (action) {
            case 'contact-submit':
                e.preventDefault();
                SSC.handleSubmit(e);
                break;
            case 'booking-submit':
                e.preventDefault();
                SSC.handleBookingSubmit(e);
                break;
        }
    });

    // ============================================
    // Initialize on DOM Ready
    // ============================================
    document.addEventListener('DOMContentLoaded', () => {
        document.body.classList.add('js-loaded');

        // Initialize scroll animations
        if (SSC.scrollAnimations && SSC.scrollAnimations.init) {
            SSC.scrollAnimations.init();
        }

        // Initialize hero intro animation
        if (SSC.heroIntro && SSC.heroIntro.init) {
            SSC.heroIntro.init();
        }

        // Initialize hero parallax
        if (SSC.initHeroParallax) {
            SSC.initHeroParallax();
        }

        // Initialize gallery lightbox
        if (SSC.galleryLightbox && SSC.galleryLightbox.init) {
            SSC.galleryLightbox.init();
        }

        // Initialize FAQ toggles
        if (SSC.initFaqToggles) {
            SSC.initFaqToggles();
        }

        // Initialize booking guest input listener
        const guestsInput = document.getElementById('bookingGuests');
        if (guestsInput && SSC.updateBookingSummary) {
            guestsInput.addEventListener('input', SSC.updateBookingSummary);
        }

        // Initialize booking type radio listeners
        const bookingTypeRadios = document.querySelectorAll('input[name="bookingType"]');
        bookingTypeRadios.forEach((radio) => {
            if (SSC.updateBookingTypeUI) {
                radio.addEventListener('change', SSC.updateBookingTypeUI);
            }
        });

        console.log('Secret Sauna Company website initialized');
    });

    // ============================================
    // Initialize on Window Load
    // ============================================
    window.addEventListener('load', () => {
        // Re-initialize scroll animations after all resources loaded
        if (SSC.scrollAnimations && SSC.scrollAnimations.init) {
            SSC.scrollAnimations.init();
        }
    });

})();
