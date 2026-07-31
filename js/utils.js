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

            // C35. `.faq-question` is a real <button> in the template now, so
            // role, tabindex and the hand-rolled Enter/Space handler are gone --
            // they were an imitation of a button, and an incomplete one: the
            // element announced as a heading, and Space scrolled the page
            // instead of toggling because a keydown handler on a non-button
            // does not suppress the default scroll the way a button does.
            // aria-expanded is still set from here so the initial state is
            // asserted by the code that owns the toggling.
            question.setAttribute('aria-expanded', 'false');

            const toggle = () => {
                const isOpen = item.classList.toggle('is-open');
                question.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
            };

            question.addEventListener('click', toggle);
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
