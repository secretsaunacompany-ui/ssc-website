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
                // Fired BEFORE the navigation, which is safe: the tracker
                // sends via navigator.sendBeacon, which is specified to
                // survive the unload it is racing.
                //
                // `source` separates the two streams doc 14 §8 asks about. The
                // banner is inserted by navigation.js only when a saved
                // configurator record was found, so its presence is the honest
                // signal that this contact submission is a configurator
                // fallback rather than a direct enquiry.
                const fromConfigurator = !!document.querySelector('.quote-attached-banner');
                window.SSC.track('contact_submit_success', {
                    source: fromConfigurator ? 'configurator_fallback' : 'direct',
                    // The enum the visitor picked, never their words. Empty
                    // stays empty and is dropped by the sanitiser rather than
                    // being recorded as a fake "not specified".
                    interest: formData.get('project_type') || ''
                });

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
