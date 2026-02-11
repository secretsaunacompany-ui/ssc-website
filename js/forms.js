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
        var form = event.target;
        var submitBtn = form.querySelector('button[type="submit"]');
        var originalText = submitBtn ? submitBtn.textContent : null;
        var formEndpoint = form.getAttribute('action') || 'https://formspree.io/f/mdaaejwp';

        if (submitBtn) {
            submitBtn.textContent = 'Sending...';
            submitBtn.disabled = true;
        }

        var formData = new FormData(form);
        var encoded = new URLSearchParams(formData).toString();

        fetch(formEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            body: encoded
        })
            .then(function(response) {
                if (!response.ok) {
                    throw new Error('Form submission failed');
                }
                alert('Thank you for your message! We\'ll be in touch soon.');
                form.reset();
                window.location.href = '/gallery/';
            })
            .catch(function() {
                alert('Sorry, something went wrong. Please try again or email us directly.');
            })
            .finally(function() {
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

    // Global function for form onsubmit handler
    window.handleSubmit = handleSubmit;

})();
