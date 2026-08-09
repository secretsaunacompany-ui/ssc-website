/**
 * Secret Sauna Company - Analytics Module
 *
 * ONE call site shape for every event on the site: `window.SSC.track(type, data)`.
 *
 * WHY A WRAPPER AND NOT `window.analyticsTracker.trackEvent` DIRECTLY
 *
 * Three reasons, each of which has already bitten this site once:
 *
 *   1. THE GLOBAL IS NOT ALWAYS THERE. The tracker is a cross-origin, deferred
 *      script from ssc-ops.netlify.app. Under a CSP that blocks it -- which is
 *      exactly the state this site was in until 2026-07-28, and why it has no
 *      historical funnel data at all -- `window.analyticsTracker` is undefined.
 *      Every call site therefore needs an existence check. Six copies of that
 *      check is six chances to write the wrong one.
 *
 *   2. THE WRONG GLOBAL IS EASY TO WRITE. `js/advisor.js` guarded on
 *      `window.SSC.trackEvent`, a name nothing has ever assigned. It looked
 *      exactly like working, defensive code and was a permanent no-op. A guard
 *      that is silently false forever is worse than no guard: it is
 *      instrumentation that reports success while measuring nothing.
 *
 *   3. THE PAYLOAD CAP FAILS OPEN. The collector (ssc-ops `track.js:211-217`)
 *      replaces any `eventData` over 5,000 characters with `{}` and STILL
 *      RETURNS 200. An oversized event is therefore indistinguishable from a
 *      healthy one carrying nothing. So the budget is enforced HERE, on the
 *      way out, at a fraction of the server's limit.
 *
 * PRIVACY IS ENFORCED STRUCTURALLY, NOT BY CONVENTION
 *
 * Analytics payloads on this site carry counts, enums and identifiers. Never a
 * name, an email, a phone number, a street, free text, or a configuration blob.
 * That is not a rule written in a doc for the next author to read -- the
 * denylists below drop those fields on the floor before they can leave the
 * browser, and the fixture asserts it. The visitor's words belong in Lee's
 * inbox, not in an events table.
 *
 * FOUR EVENTS FROM DOC 14 §8 ARE DELIBERATELY NOT WIRED HERE
 *
 * `sessions_band_click`, `waitlist_submit_success`, `commercial_page_view` and
 * `commercial_contact_click` have no trigger in this codebase: there is no
 * sessions band, no waitlist form, and no /commercial/ page yet. They belong
 * to the packages that build those surfaces, and each should be wired in the
 * same commit as the thing it measures. Their absence is a decision, not an
 * omission -- nobody should invent an event for a page that does not exist.
 */
(function() {
    'use strict';

    /**
     * Field names that must never reach the events store, whatever a future
     * call site believes it is doing.
     *
     * Two lists, because two matching rules are correct. Long, distinctive
     * words match as SUBSTRINGS, so `customerEmail` is caught as well as
     * `email`. Short words match as WHOLE WORDS: `ip` as a substring silently
     * eats `skipped`, `zip` and `description`, and `{ skipped: true }` is a
     * payload this site is one hero-hold event away from wanting. A denylist
     * that quietly deletes legitimate fields teaches the next author to stop
     * trusting it.
     */
    const DENIED_SUBSTRINGS = [
        'name', 'email', 'phone', 'message', 'note', 'address',
        'location', 'city', 'summary', 'configuration', 'text', 'query'
    ];
    const DENIED_WORDS = ['ip', 'url', 'href', 'user'];

    /**
     * Value-side guard. The key denylist structurally cannot see a NOVEL key
     * carrying free text -- `{ detail: 'call me at lee@example.com' }` passes
     * every name check anyone will ever write. So the value is checked too:
     * anything shaped like an email address or a phone number is dropped
     * whatever it is called. Values on this site are enums, counts and short
     * identifiers, none of which can legitimately look like contact details.
     */
    const EMAIL_SHAPE = /[^\s@]+@[^\s@]+\.[^\s@]/;
    const PHONE_SHAPE = /(?:\+?\d[\s().-]*){9,}/;

    /**
     * The outgoing budget. The server's silent-drop threshold is 5,000; this is
     * an order of magnitude under it, which is all any event in doc 14 §8 needs
     * and leaves no way to creep up on a limit that does not announce itself.
     */
    const MAX_PAYLOAD_CHARS = 500;

    /** Strings are enums and short identifiers. Anything longer is a mistake. */
    const MAX_STRING_CHARS = 48;

    function isDenied(key) {
        const k = String(key).toLowerCase();
        if (DENIED_SUBSTRINGS.some((bad) => k.indexOf(bad) !== -1)) return true;
        // Split on separators AND on camelCase boundaries, so `userId` and
        // `user_id` are both denied while `skipped` is not.
        const words = String(key).split(/[^A-Za-z0-9]+|(?=[A-Z])/)
            .filter(Boolean).map((w) => w.toLowerCase());
        return words.some((word) => DENIED_WORDS.indexOf(word) !== -1);
    }

    /** True when a value looks like contact details, whatever its key is. */
    function looksLikeContact(value) {
        return EMAIL_SHAPE.test(value) || PHONE_SHAPE.test(value);
    }

    /**
     * Reduce a value to something an events table can hold: a short string, a
     * finite number, or a boolean. Everything else (objects, arrays,
     * functions, null, NaN) is dropped rather than stringified -- a stringified
     * object is how a configuration blob ends up in analytics.
     */
    function clean(value) {
        if (typeof value === 'boolean') return value;
        if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
        if (typeof value === 'string') {
            const trimmed = value.trim();
            if (!trimmed) return undefined;
            // Checked BEFORE truncation: a 48-character prefix of an email
            // address is still an email address.
            if (looksLikeContact(trimmed)) {
                warn('analytics: dropped a value shaped like contact details');
                return undefined;
            }
            return trimmed.slice(0, MAX_STRING_CHARS);
        }
        return undefined;
    }

    /**
     * Build the payload actually sent. Denied and unusable fields are removed;
     * if the result is still over budget, keys are dropped longest-first until
     * it fits. Dropping a field loudly beats the server dropping every field
     * silently.
     */
    function sanitize(data) {
        const out = {};
        Object.keys(data || {}).forEach((key) => {
            if (isDenied(key)) {
                warn(`analytics: dropped disallowed field "${key}"`);
                return;
            }
            const value = clean(data[key]);
            if (value === undefined) return;
            out[key] = value;
        });

        let keys = Object.keys(out);
        while (JSON.stringify(out).length > MAX_PAYLOAD_CHARS && keys.length) {
            keys.sort((a, b) => JSON.stringify(out[b]).length - JSON.stringify(out[a]).length);
            const biggest = keys.shift();
            warn(`analytics: payload over budget, dropped "${biggest}"`);
            delete out[biggest];
        }
        return out;
    }

    function warn(message) {
        if (window.console && typeof console.warn === 'function') console.warn(message);
    }

    /**
     * Send one event.
     *
     * When the tracker is absent -- CSP-blocked, offline, a future consent gate
     * that has not been granted -- this degrades silently BY DESIGN. Analytics
     * must never be able to break the funnel it is measuring. What it must not
     * do is degrade silently against a global that never existed, which is the
     * distinction this whole module draws.
     *
     * @param {string} type  event name from `docs/redesign-2026-07/14-wim-journey-funnel.md` §8
     * @param {object} [data] compact payload -- enums, counts, identifiers only
     */
    function track(type, data) {
        if (!type || typeof type !== 'string') return false;
        const tracker = window.analyticsTracker;
        if (!tracker || typeof tracker.trackEvent !== 'function') return false;
        try {
            tracker.trackEvent(type, sanitize(data));
        } catch (err) {
            // An analytics failure is never a visitor-facing failure.
            return false;
        }
        return true;
    }

    /**
     * Turn a rendered price ("$28,500") into the integer an events table can
     * aggregate. Returns undefined for anything it cannot read, which
     * sanitize() then drops -- an event with no total beats an event with a
     * total of 0.
     */
    function amount(text) {
        if (typeof text === 'number') return Number.isFinite(text) ? Math.round(text) : undefined;
        if (typeof text !== 'string') return undefined;
        const digits = text.replace(/[^0-9.]/g, '');
        if (!digits) return undefined;
        const value = Math.round(parseFloat(digits));
        return Number.isFinite(value) ? value : undefined;
    }

    // ============================================
    // Page-level events (doc 14 §8, "Arrival & ladder")
    // ============================================
    /**
     * `/book/` renders one of two states. The template stamps which one it
     * rendered on the page container, so the event reports the state the
     * visitor actually saw rather than a guess made in JavaScript about what
     * the server decided.
     */
    function trackPageState() {
        const book = document.querySelector('[data-book-state]');
        if (book) {
            track('book_page_view', { paused: book.dataset.bookState === 'paused' });
        }
    }

    /**
     * Always wait for DOMContentLoaded. This script is deferred, so
     * readyState is already 'interactive' when it evaluates -- the old
     * readyState-branch called trackPageState() immediately, RACING the
     * cross-origin tracker (also deferred, later in source, therefore not
     * yet evaluated): window.analyticsTracker was undefined, track()
     * returned false, and book_page_view was dropped on every production
     * view of /book/ until 2026-08-06. Deferred scripts all evaluate before
     * DOMContentLoaded fires, in source order, so at DCL the tracker global
     * exists and the event has a carrier.
     *
     * The 'complete' guard covers injection after the load event (readyState
     * never returns to 'loading'). Residual window, named for honesty: a copy
     * injected between DCL and load would bind a listener that never fires --
     * impossible for this file, which ships only as a static deferred
     * include (src/_includes/scripts.njk).
     */
    if (document.readyState === 'complete') {
        trackPageState();
    } else {
        document.addEventListener('DOMContentLoaded', trackPageState);
    }

    // ============================================
    // Export to global scope
    // ============================================
    window.SSC = window.SSC || {};
    window.SSC.track = track;
    window.SSC.trackAmount = amount;

})();
