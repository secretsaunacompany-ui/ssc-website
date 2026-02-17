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

    // ============================================
    // FAQ Toggle Initialization
    // ============================================
    function initFaqToggles() {
        document.querySelectorAll('.faq-item').forEach((item) => {
            const question = item.querySelector('.faq-question');
            if (!question) return;

            question.setAttribute('role', 'button');
            question.setAttribute('tabindex', '0');
            question.setAttribute('aria-expanded', 'false');

            const toggle = () => {
                const isOpen = item.classList.toggle('is-open');
                question.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
            };

            question.addEventListener('click', toggle);
            question.addEventListener('keydown', (event) => {
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
    window.SSC.initFaqToggles = initFaqToggles;

})();
