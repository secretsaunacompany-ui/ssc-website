/**
 * Secret Sauna Company - Navigation Module
 * Navigation management and page switching
 */
(function() {
    'use strict';

    // ============================================
    // Navigation Manager
    // ============================================
    function NavigationManager() {
        this.currentPage = 'home';
    }

    NavigationManager.prototype.showPage = function(pageId) {
        var pages = document.querySelectorAll('.page');
        pages.forEach(function(page) { page.classList.remove('active'); });

        var targetPage = document.getElementById(pageId);
        if (targetPage) {
            targetPage.classList.add('active');
            this.currentPage = pageId;
        }

        // Close mobile menu if open
        var navLinks = document.getElementById('navLinks');
        if (navLinks) {
            navLinks.classList.remove('active');
        }

        // Scroll to top smoothly
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // Reinitialize scroll animations for the new page
        if (window.scrollAnimations && window.scrollAnimations.reinit) {
            window.scrollAnimations.reinit();
        }
    };

    NavigationManager.prototype.toggleMenu = function() {
        var navLinks = document.getElementById('navLinks');
        if (navLinks) {
            navLinks.classList.toggle('active');
        }
    };

    // ============================================
    // Create instance
    // ============================================
    var navigation = new NavigationManager();

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
    // Enhanced showPage with lazy loading
    // ============================================
    function showPage(pageId) {
        navigation.showPage(pageId);

        // Initialize map when locations page is shown
        if (pageId === 'locations') {
            loadLeaflet().then(function() {
                setTimeout(function() {
                    if (window.initMap) {
                        window.initMap();
                    }
                }, 100);
            });
        }

        // Initialize booking system when book page is shown
        if (pageId === 'book') {
            setTimeout(function() {
                if (window.initBookingSystem) {
                    window.initBookingSystem();
                }
            }, 100);
        }
    }

    function toggleMenu() {
        navigation.toggleMenu();
    }

    // ============================================
    // Export to global scope
    // ============================================
    window.SSC = window.SSC || {};
    window.SSC.navigation = navigation;
    window.SSC.loadLeaflet = loadLeaflet;

    // Global functions for onclick handlers
    window.showPage = showPage;
    window.toggleMenu = toggleMenu;
    window.navigation = navigation;
    window.navigateTo = showPage; // Alias used in requestQuote

})();
