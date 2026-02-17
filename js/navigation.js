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
        const navLinks = document.getElementById('navLinks');
        if (navLinks) {
            navLinks.classList.toggle('active');
        }
    }

    // ============================================
    // Leaflet Lazy Loading for Maps
    // ============================================
    let leafletLoaded = false;

    function loadLeaflet() {
        return new Promise((resolve) => {
            if (leafletLoaded) {
                resolve();
                return;
            }

            // Load CSS
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            document.head.appendChild(link);

            // Load JS
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            script.onload = () => {
                leafletLoaded = true;
                resolve();
            };
            document.head.appendChild(script);
        });
    }

    // ============================================
    // Page-specific initialization
    // ============================================
    document.addEventListener('DOMContentLoaded', () => {
        // Initialize map if on locations page
        if (document.getElementById('map')) {
            loadLeaflet().then(() => {
                setTimeout(() => {
                    if (window.SSC.initMap) {
                        window.SSC.initMap();
                    }
                }, 100);
            });
        }

        // Initialize booking system if on book page
        if (document.getElementById('bookingCalendar') || document.querySelector('.booking-section')) {
            setTimeout(() => {
                if (window.SSC.initBookingSystem) {
                    window.SSC.initBookingSystem();
                }
            }, 100);
        }

        // Pre-fill contact form from quote configurator (via sessionStorage)
        const quoteConfig = sessionStorage.getItem('ssc_quote_config');
        if (quoteConfig) {
            const messageField = document.querySelector('textarea[name="message"]');
            if (messageField) {
                messageField.value = `I'm interested in the following configuration:\n\n${quoteConfig}\n\nPlease contact me to discuss further.`;
                sessionStorage.removeItem('ssc_quote_config');
            }
        }
    });

    // ============================================
    // Hash redirect for backward compatibility
    // ============================================
    (function() {
        const hash = window.location.hash.replace('#', '');
        if (hash && window.location.pathname === '/') {
            const redirectMap = {
                'process': '/about/',
                'gallery': '/saunas/'
            };
            const validPages = ['about', 'saunas', 'faq', 'locations', 'contact', 'book'];
            if (redirectMap[hash]) {
                window.location.replace(redirectMap[hash]);
            } else if (validPages.includes(hash)) {
                window.location.replace(`/${hash}/`);
            }
        }
    })();

    // ============================================
    // Export to global scope
    // ============================================
    window.SSC = window.SSC || {};
    window.SSC.loadLeaflet = loadLeaflet;
    window.SSC.toggleMenu = toggleMenu;

})();
