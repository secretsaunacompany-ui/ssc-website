/**
 * Secret Sauna Company - Initialization Module
 * Main entry point that initializes all components
 */
(function() {
    'use strict';

    const SSC = window.SSC;

    // ============================================
    // Event Delegation Hub
    // ============================================
    // Click actions (static template elements)
    document.addEventListener('click', (e) => {
        const target = e.target.closest('[data-action]');
        if (!target) return;

        const action = target.dataset.action;

        switch (action) {
            case 'toggle-menu':
                SSC.toggleMenu();
                break;
            case 'close-modal':
                if (SSC.modalManager) SSC.modalManager.close();
                break;
            case 'open-modal':
                if (SSC.modalManager) SSC.modalManager.open(target.dataset.model);
                break;
            case 'request-quote':
                if (SSC.modalManager) SSC.modalManager.requestQuote();
                break;
            case 'quote-back':
                if (SSC.modalManager) SSC.modalManager.goBack();
                break;
            case 'quote-start-over':
                if (SSC.modalManager) SSC.modalManager.startOver();
                break;
            case 'close-lightbox':
                if (SSC.galleryLightbox) SSC.galleryLightbox.close();
                break;
            case 'lightbox-nav':
                if (SSC.galleryLightbox) SSC.galleryLightbox.navigate(parseInt(target.dataset.dir));
                break;
            case 'filter-map':
                SSC.filterMapMarkers(target.dataset.filter);
                break;
        }
    });

    // Keyboard activation for elements that behave as buttons but are not one.
    //
    // The model cards are divs carrying data-action="open-modal" -- they were
    // reachable by mouse only, which made the configurator, and therefore the
    // entire quote funnel, keyboard-inaccessible from its very first step. They
    // now carry role="button" and tabindex="0"; this is the other half of that
    // contract, since a div does not synthesise a click from Enter or Space.
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
        const target = e.target.closest('[data-action][role="button"]');
        if (!target || target.tagName === 'BUTTON' || target.tagName === 'A') return;
        e.preventDefault();
        target.click();
    });

    // Change actions (radio/checkbox elements)
    document.addEventListener('change', (e) => {
        const target = e.target.closest('[data-action]');
        if (!target) return;

        const action = target.dataset.action;

        switch (action) {
            case 'premium-change':
                if (SSC.modalManager) SSC.modalManager.handlePremiumPackageChange();
                break;
        }
    });

    // Submit actions (forms)
    document.addEventListener('submit', (e) => {
        const target = e.target.closest('[data-action]');
        if (!target) return;

        const action = target.dataset.action;

        switch (action) {
            case 'contact-submit':
                e.preventDefault();
                // ONE analytics event per submission.
                //
                // The shared tracker (ssc-ops/tracker.js) has its own
                // document-level submit listener bound to `.contact-form`, and
                // it reads a field named `sauna` that this form has never had
                // -- so every form_submit it has ever recorded says
                // `interest: "not specified"`. It is a broken duplicate of an
                // event we now send correctly ourselves (contact_submit_success
                // in forms.js, with the real project_type and the stream
                // source).
                //
                // We cannot remove a listener registered by another origin's
                // script, so we stop the event before it reaches it. This
                // listener is registered at init.js eval time, and the tracker
                // registers during its own later-deferred script, so ours runs
                // first -- and the site's other handlers are dispatched from
                // inside this switch, not from separate listeners, so nothing
                // of ours is suppressed. Deliberately scoped to this one case.
                //
                // The root-cause fix belongs in ssc-ops (correct the field
                // mapping, or stop double-binding a form the site instruments
                // itself). Until that lands, this is the seam that keeps the
                // contact-form count honest.
                e.stopImmediatePropagation();
                SSC.handleSubmit(e);
                break;
            // Deliberately NOT routed through handleSubmit: that one navigates
            // to /contact/thank-you/ on success, which is exactly what the
            // configurator must never do.
            case 'quote-submit':
                e.preventDefault();
                if (SSC.modalManager) SSC.modalManager.submitQuote(e);
                break;
            case 'booking-submit':
                e.preventDefault();
                SSC.handleBookingSubmit(e);
                break;
        }
    });

    // ============================================
    // Initialize on DOM Ready
    // ============================================
    document.addEventListener('DOMContentLoaded', () => {
        document.body.classList.remove('pre-js');
        document.body.classList.add('js-loaded');

        // Initialize scroll animations
        if (SSC.scrollAnimations && SSC.scrollAnimations.init) {
            SSC.scrollAnimations.init();
        }

        // Initialize hero intro animation
        if (SSC.heroIntro && SSC.heroIntro.init) {
            SSC.heroIntro.init();
        }

        // Initialize hero parallax
        if (SSC.initHeroParallax) {
            SSC.initHeroParallax();
        }

        // Initialize gallery lightbox
        if (SSC.galleryLightbox && SSC.galleryLightbox.init) {
            SSC.galleryLightbox.init();
        }

        // Initialize FAQ toggles
        if (SSC.initFaqToggles) {
            SSC.initFaqToggles();
        }

        // Initialize booking guest input listener
        const guestsInput = document.getElementById('bookingGuests');
        if (guestsInput && SSC.updateBookingSummary) {
            guestsInput.addEventListener('input', SSC.updateBookingSummary);
        }

        // Initialize booking type radio listeners
        const bookingTypeRadios = document.querySelectorAll('input[name="bookingType"]');
        bookingTypeRadios.forEach((radio) => {
            if (SSC.updateBookingTypeUI) {
                radio.addEventListener('change', SSC.updateBookingTypeUI);
            }
        });

        // Initialize AI advisors
        if (SSC.initAdvisors) {
            SSC.initAdvisors();
        }

        console.log('Secret Sauna Company website initialized');
    });

    // ============================================
    // Initialize on Window Load
    // ============================================
    window.addEventListener('load', () => {
        // Re-initialize scroll animations after all resources loaded
        if (SSC.scrollAnimations && SSC.scrollAnimations.init) {
            SSC.scrollAnimations.init();
        }
    });

})();
