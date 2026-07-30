/**
 * Secret Sauna Company - Quote Configuration Store
 *
 * One key, `ssc_quote_config`, holding the visitor's in-progress configurator
 * quote so it survives a closed modal, a closed tab, and a return visit inside
 * a week.
 *
 * WHY localStorage AND NOT sessionStorage
 *
 * The original spec said `sessionStorage` with a 7-day expiry. Those two things
 * cannot both be true: sessionStorage is per-tab and dies on tab close, so the
 * 7-day window was decorative. `localStorage` is the mechanism that delivers
 * the stated intent (doc 21, arbitration N5).
 *
 * WHY THE STORED TOTAL IS NEVER DISPLAYED AS-IS
 *
 * The record carries `version` -- `SSC.pricesVersion`, bumped whenever the
 * price sheet moves. A record written before a price deploy still describes a
 * real set of choices, but its arithmetic belongs to a world that no longer
 * exists. So a restore never trusts the stored total: the stored SELECTIONS are
 * re-applied to the live form and the total is recomputed from live prices,
 * with a visible note when the stamp is stale. A saved total must never
 * silently disagree with its own line items, and a price deploy must never
 * resurrect a pre-deploy number.
 *
 * The `/contact/` fallback is the one place that cannot recompute (no
 * configurator on that page). It shows the stored text and, when stale, says
 * so out loud.
 *
 * PRIVACY
 *
 * The record holds a city/area and free-text site-access notes in plaintext on
 * the visitor's own device. That is why the expiry is enforced on read rather
 * than trusted to a cleanup pass, why a visible "start over" exists, and why
 * the notice beside it states the 7 days plainly. It is cleared on confirmed
 * submit, on expiry, and on demand -- nowhere else.
 *
 * CONCURRENCY
 *
 * Two tabs share one key by design. Last writer wins. There is no merge and no
 * lock: the loser of the race is a configuration the visitor abandoned in
 * another tab, and reconstructing it is worth less than the complexity of
 * arbitrating it. Stated here so the next reader knows it is a decision and
 * not an oversight.
 */
(function() {
    'use strict';

    const KEY = 'ssc_quote_config';
    const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

    /**
     * Read the record, or null.
     *
     * Returns null for: absent, unparseable, wrong shape, or expired. Anything
     * it cannot vouch for is treated as absent and removed -- a half-understood
     * record is worse than no record, because it produces a quote nobody chose.
     *
     * @returns {null|{data: object, stale: boolean, ageMs: number}}
     *          `stale` means the record predates the current price sheet.
     */
    function read() {
        let raw;
        try {
            raw = window.localStorage.getItem(KEY);
        } catch (err) {
            // Safari private mode and friends. No storage is a supported state.
            return null;
        }
        if (!raw) return null;

        let record;
        try {
            record = JSON.parse(raw);
        } catch (err) {
            clear();
            return null;
        }

        if (!record || typeof record !== 'object'
            || typeof record.savedAt !== 'number'
            || typeof record.summary !== 'string') {
            clear();
            return null;
        }

        const ageMs = Date.now() - record.savedAt;
        // A clock that moved backwards (timezone fiddling, a restored image)
        // produces a negative age. Treat it as fresh rather than expiring
        // something the visitor just wrote.
        if (ageMs > MAX_AGE_MS) {
            clear();
            return null;
        }

        return {
            data: record,
            stale: record.version !== window.SSC.pricesVersion,
            ageMs: ageMs
        };
    }

    /**
     * Write the record. Stamps the current price-sheet version and the time.
     * Silently does nothing when storage is unavailable -- a visitor with
     * storage disabled still gets a working funnel, just no restore.
     */
    function save(payload) {
        const record = Object.assign({}, payload, {
            version: window.SSC.pricesVersion,
            savedAt: Date.now()
        });
        try {
            window.localStorage.setItem(KEY, JSON.stringify(record));
        } catch (err) {
            return false;
        }
        return true;
    }

    function clear() {
        try {
            window.localStorage.removeItem(KEY);
        } catch (err) { /* nothing to clear */ }
    }

    // ============================================
    // Export to global scope
    // ============================================
    window.SSC = window.SSC || {};
    window.SSC.quoteStore = {
        key: KEY,
        maxAgeMs: MAX_AGE_MS,
        read: read,
        save: save,
        clear: clear
    };

})();
