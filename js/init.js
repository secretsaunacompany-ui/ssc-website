/**
 * Secret Sauna Company - Initialization Module
 * Main entry point that initializes all components
 */
(function() {
    'use strict';

    // ============================================
    // Initialize on DOM Ready
    // ============================================
    document.addEventListener('DOMContentLoaded', function() {
        // Initialize scroll animations
        if (window.scrollAnimations && window.scrollAnimations.init) {
            window.scrollAnimations.init();
        }

        // Initialize hero intro animation
        if (window.heroIntro && window.heroIntro.init) {
            window.heroIntro.init();
        }

        // Initialize gallery lightbox
        if (window.galleryLightbox && window.galleryLightbox.init) {
            window.galleryLightbox.init();
        }

        // Initialize FAQ toggles
        if (window.SSC && window.SSC.initFaqToggles) {
            window.SSC.initFaqToggles();
        }

        // Initialize booking guest input listener
        var guestsInput = document.getElementById('bookingGuests');
        if (guestsInput && window.updateBookingSummary) {
            guestsInput.addEventListener('input', window.updateBookingSummary);
        }

        // Initialize booking type radio listeners
        var bookingTypeRadios = document.querySelectorAll('input[name="bookingType"]');
        bookingTypeRadios.forEach(function(radio) {
            if (window.updateBookingTypeUI) {
                radio.addEventListener('change', window.updateBookingTypeUI);
            }
        });

        console.log('Secret Sauna Company website initialized');

        // Handle initial hash navigation
        var hash = window.location.hash.replace('#', '');
        var targetPage = hash ? document.getElementById(hash) : null;
        if (targetPage && targetPage.classList.contains('page')) {
            if (window.navigation && window.navigation.showPage) {
                window.navigation.showPage(hash);
            }
        }
    });

    // ============================================
    // Initialize on Window Load
    // ============================================
    window.addEventListener('load', function() {
        // Re-initialize scroll animations after all resources loaded
        if (window.scrollAnimations && window.scrollAnimations.init) {
            window.scrollAnimations.init();
        }
    });

})();
