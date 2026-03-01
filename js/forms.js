/**
 * Secret Sauna Company - Forms Module
 * Contact form handling
 */
(function() {
    'use strict';

    // ============================================
    // Form Handling
    // ============================================
    function handleSubmit(event) {
        event.preventDefault();
        const form = event.target;
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn ? submitBtn.textContent : null;
        const formEndpoint = form.getAttribute('action') || 'https://formspree.io/f/mdaaejwp';

        if (submitBtn) {
            submitBtn.textContent = 'Sending...';
            submitBtn.disabled = true;
        }

        const formData = new FormData(form);
        const encoded = new URLSearchParams(formData).toString();

        fetch(formEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            body: encoded
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error('Form submission failed');
                }
                form.reset();
                window.location.href = '/contact/thank-you/';
            })
            .catch(() => {
                alert('Sorry, something went wrong. Please try again or email us directly.');
            })
            .finally(() => {
                if (submitBtn) {
                    submitBtn.textContent = originalText;
                    submitBtn.disabled = false;
                }
            });
    }

    // ============================================
    // Export to global scope
    // ============================================
    window.SSC = window.SSC || {};
    window.SSC.handleSubmit = handleSubmit;

})();
