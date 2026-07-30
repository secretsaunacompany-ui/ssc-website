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

        initQuoteHandoff();
    });

    // ============================================
    // /contact/ fallback for a saved configurator quote
    // ============================================
    /**
     * The configurator now submits from inside its own modal, so this path is a
     * FALLBACK, not the main road: it catches deep links, a visitor who closed
     * the modal and wandered to /contact/, and the no-JS-in-the-modal edge.
     *
     * Two things changed from the version this replaces, and both matter:
     *
     *   1. The record lives in localStorage, not sessionStorage (doc 21 N5).
     *   2. It is NO LONGER DELETED ON READ. The old code consumed the key the
     *      moment it prefilled the textarea, so a visitor who reloaded /contact/
     *      or came back later lost the configuration they had just spent three
     *      minutes building. The key now survives until a confirmed submit, an
     *      explicit "start over", or the 7-day expiry.
     *
     * The banner is deliberately visible. A configuration silently pasted into
     * a textarea 1,500px down the page is indistinguishable from nothing having
     * happened -- which is the whole failure this package exists to fix.
     */
    function initQuoteHandoff() {
        const store = window.SSC && window.SSC.quoteStore;
        if (!store) return;

        const form = document.querySelector('.contact-form');
        const messageField = document.querySelector('textarea[name="message"]');
        if (!form || !messageField) return;

        const stored = store.read();
        if (!stored) return;

        messageField.value = `I'm interested in the following configuration:\n\n${stored.data.summary}\n\nPlease contact me to discuss further.`;

        const banner = document.createElement('div');
        banner.className = 'quote-attached-banner';
        banner.setAttribute('role', 'status');

        const heading = document.createElement('p');
        heading.className = 'quote-attached-banner__title';
        const model = stored.data.modelName || 'sauna';
        heading.textContent = `Your ${model} configuration is attached below.`;
        banner.appendChild(heading);

        if (stored.stale) {
            // The stored total was computed against a price sheet that has since
            // moved. This page has no configurator to recompute it with, so the
            // only honest thing is to say so rather than let an out-of-date
            // number travel to the inbox unlabelled.
            const note = document.createElement('p');
            note.className = 'quote-attached-banner__note';
            note.textContent = 'Prices have been updated since you saved this. We\'ll confirm the current total when we reply.';
            banner.appendChild(note);
        }

        form.parentNode.insertBefore(banner, form);

        form.scrollIntoView({
            behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
            block: 'start'
        });
        const nameField = form.querySelector('input[name="name"]');
        if (nameField) nameField.focus({ preventScroll: true });
    }

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
