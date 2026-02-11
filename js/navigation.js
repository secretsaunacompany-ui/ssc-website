/**
 * Secret Sauna Company - Navigation Module
 * Mobile menu toggle, Leaflet lazy loading, and page-specific initialization
 */
(function() {
    'use strict';

    // ============================================
    // Mobile Menu Toggle
    // ============================================
    function toggleMenu() {
        var navLinks = document.getElementById('navLinks');
        if (navLinks) {
            navLinks.classList.toggle('active');
        }
    }

    // ============================================
    // Leaflet Lazy Loading for Maps
    // ============================================
    var leafletLoaded = false;

    function loadLeaflet() {
        return new Promise(function(resolve) {
            if (leafletLoaded) {
                resolve();
                return;
            }

            // Load CSS
            var link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            document.head.appendChild(link);

            // Load JS
            var script = document.createElement('script');
            script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            script.onload = function() {
                leafletLoaded = true;
                resolve();
            };
            document.head.appendChild(script);
        });
    }

    // ============================================
    // Page-specific initialization
    // ============================================
    document.addEventListener('DOMContentLoaded', function() {
        // Initialize map if on locations page
        if (document.getElementById('map')) {
            loadLeaflet().then(function() {
                setTimeout(function() {
                    if (window.initMap) {
                        window.initMap();
                    }
                }, 100);
            });
        }

        // Initialize booking system if on book page
        if (document.getElementById('bookingCalendar') || document.querySelector('.booking-section')) {
            setTimeout(function() {
                if (window.initBookingSystem) {
                    window.initBookingSystem();
                }
            }, 100);
        }

        // Pre-fill contact form from quote configurator (via sessionStorage)
        var quoteConfig = sessionStorage.getItem('ssc_quote_config');
        if (quoteConfig) {
            var messageField = document.querySelector('textarea[name="message"]');
            if (messageField) {
                messageField.value = 'I\'m interested in the following configuration:\n\n' + quoteConfig + '\n\nPlease contact me to discuss further.';
                sessionStorage.removeItem('ssc_quote_config');
            }
        }
    });

    // ============================================
    // Hash redirect for backward compatibility
    // ============================================
    (function() {
        var hash = window.location.hash.replace('#', '');
        if (hash && window.location.pathname === '/') {
            var validPages = ['about', 'saunas', 'process', 'gallery', 'faq', 'locations', 'contact', 'book'];
            if (validPages.indexOf(hash) !== -1) {
                window.location.replace('/' + hash + '/');
            }
        }
    })();

    // ============================================
    // Export to global scope
    // ============================================
    window.SSC = window.SSC || {};
    window.SSC.loadLeaflet = loadLeaflet;

    // Global functions for onclick handlers
    window.toggleMenu = toggleMenu;

})();
