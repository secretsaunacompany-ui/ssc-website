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

        hideFailure();

        fetch(formEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            body: encoded
        })
            .then((response) => {
                // 429 is invisible in the body: Formspree publishes no
                // rate-limit error code. Only response.status can tell us.
                // (Discrimination ported from js/modal.js 2026-08-06 — until
                // then this client trusted response.ok alone, the exact
                // "green status proves nothing" mode the funnel rebuild was
                // about: a 2xx with no `next` fired success, reset the form,
                // and navigated to the thank-you page while the visitor's
                // message evaporated. Proven live 2026-07-30.)
                if (response.status === 429) {
                    showFailure(form, 'We are getting a lot of requests right now. Give it a minute and try again, or email us directly.', 'rate_limited');
                    return null;
                }
                return response.json().catch(() => ({}));
            })
            .then((body) => {
                if (body === null) return;

                // Success is discriminated by the body carrying a string
                // `next`, which is what Formspree's own client checks.
                // Status is not sufficient on its own.
                const ok = body && typeof body.next === 'string';
                if (!ok) {
                    const detail = Array.isArray(body && body.errors)
                        ? body.errors.map((e) => e.message).filter(Boolean).join(' ')
                        : (body && typeof body.error === 'string' ? body.error : '');
                    showFailure(form, detail
                        ? 'That didn\'t send: ' + detail + ' Your message is still here.'
                        : 'That didn\'t send. Your message is still here; try again, or email us directly.', 'rejected');
                    return;
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
                showFailure(form, 'That didn\'t send. Your message is still here; try again, or email us directly.', 'network');
            })
            .finally(() => {
                if (submitBtn) {
                    submitBtn.textContent = originalText;
                    submitBtn.disabled = false;
                }
            });
    }

    /**
     * Every failure path renders through here, so this is the one place
     * `contact_submit_error` fires exactly once per failure the visitor
     * actually saw — the same contract showFailure() keeps for
     * quote_submit_error in modal.js, which doc 14 §8 calls the tripwire.
     * `error` is a short code, never the message text. The visitor's words
     * stay in the fields (no reset on failure), the message renders inline
     * (the old alert() blocked the page and left no trace), and a mailto
     * escape hatch carries the address from the form's data attribute.
     */
    function showFailure(form, message, code) {
        const fromConfigurator = !!document.querySelector('.quote-attached-banner');
        window.SSC.track('contact_submit_error', {
            source: fromConfigurator ? 'configurator_fallback' : 'direct',
            error: code
        });

        const box = document.getElementById('contactError');
        if (!box) {
            // Template lost its error container — degrade to the old alert
            // rather than failing silently, and say so in the console.
            console.error('SSC: #contactError missing from the contact template');
            alert(message);
            return;
        }
        box.innerHTML = '';
        const line = document.createElement('p');
        line.className = 'quote-error__message';
        line.textContent = message;
        box.appendChild(line);

        const address = (form.dataset.contactEmail || '').trim();
        if (address) {
            const link = document.createElement('a');
            link.href = 'mailto:' + address
                + '?subject=' + encodeURIComponent('Sauna Inquiry — website form failed');
            link.className = 'quote-error__mailto';
            link.textContent = 'Email us instead';
            box.appendChild(link);
        }
        box.hidden = false;
    }

    function hideFailure() {
        const box = document.getElementById('contactError');
        if (box) box.hidden = true;
    }

    // ============================================
    // Export to global scope
    // ============================================
    window.SSC = window.SSC || {};
    window.SSC.handleSubmit = handleSubmit;

})();
