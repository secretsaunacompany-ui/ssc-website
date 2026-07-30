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
        // The endpoint has exactly ONE definition: `site.forms.endpoint` in
        // src/_data/site.json, rendered into each form's `action`. This used to
        // carry a hardcoded fallback copy of the URL, which meant a template
        // could lose its action and nothing would ever say so. A form with no
        // action is a bug in the template, so it fails loudly here instead of
        // being silently rescued by a literal that can drift.
        const formEndpoint = form.getAttribute('action');
        if (!formEndpoint) {
            console.error('SSC: form has no action attribute; expected site.forms.endpoint', form);
            return;
        }

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
