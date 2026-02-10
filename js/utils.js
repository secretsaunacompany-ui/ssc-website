/**
 * Secret Sauna Company - Utilities Module
 * Shared helper functions and utilities
 */
(function() {
    'use strict';

    // ============================================
    // Currency Formatting
    // ============================================
    function formatCurrency(value) {
        const amount = Number(value);
        const formatted = Number.isFinite(amount) ? amount.toLocaleString('en-US') : '0';
        return `$${formatted}`;
    }

    // ============================================
    // DOM Helpers
    // ============================================
    function setText(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    function getElement(id) {
        return document.getElementById(id);
    }

    // ============================================
    // Storage Protection (Simple Obfuscation for localStorage PII)
    // Note: This is NOT encryption - for true security, use server-side storage
    // This provides basic protection against casual inspection
    // ============================================
    const StorageProtection = {
        // Simple encoding (base64) - provides basic obfuscation
        encode: function(data) {
            try {
                return btoa(encodeURIComponent(JSON.stringify(data)));
            } catch (e) {
                return JSON.stringify(data);
            }
        },

        decode: function(encoded) {
            try {
                return JSON.parse(decodeURIComponent(atob(encoded)));
            } catch (e) {
                // Fallback for legacy unencoded data
                try {
                    return JSON.parse(encoded);
                } catch (e2) {
                    return {};
                }
            }
        },

        save: function(key, data) {
            localStorage.setItem(key, this.encode(data));
        },

        load: function(key) {
            var stored = localStorage.getItem(key);
            if (!stored) return null;
            return this.decode(stored);
        }
    };

    // ============================================
    // FAQ Toggle Initialization
    // ============================================
    function initFaqToggles() {
        document.querySelectorAll('.faq-item').forEach(function(item) {
            var question = item.querySelector('.faq-question');
            if (!question) return;

            question.setAttribute('role', 'button');
            question.setAttribute('tabindex', '0');
            question.setAttribute('aria-expanded', 'false');

            var toggle = function() {
                var isOpen = item.classList.toggle('is-open');
                question.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
            };

            question.addEventListener('click', toggle);
            question.addEventListener('keydown', function(event) {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    toggle();
                }
            });
        });
    }

    // ============================================
    // Export to global scope
    // ============================================
    window.SSC = window.SSC || {};
    window.SSC.formatCurrency = formatCurrency;
    window.SSC.setText = setText;
    window.SSC.getElement = getElement;
    window.SSC.StorageProtection = StorageProtection;
    window.SSC.initFaqToggles = initFaqToggles;

    // Also expose directly for backward compatibility
    window.formatCurrency = formatCurrency;
    window.setText = setText;

})();
