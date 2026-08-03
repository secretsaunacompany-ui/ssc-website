/**
 * Secret Sauna Company - Motion
 *
 * ONE system: reveal. Load-in and scroll-in are the same thing (Jen 10 §5.1).
 *
 * What used to be here, and why it is not:
 *
 *   HeroIntroAnimation -- a three-stage scroll LOCK. It set `touch-action: none`
 *   on the body and preventDefault()'d wheel and touchmove for up to ten seconds,
 *   with two setTimeout safety valves because the state machine could otherwise
 *   strand a visitor with the page frozen. Lee loves the held photograph; that
 *   code held the VISITOR. The photograph is now simply the first thing on the
 *   page, and the first scroll gesture always works.
 *
 *   initHeroParallax -- four parallax variants (hero image via `top`, hero
 *   content opacity, overlay backgrounds, full-width images) plus a wrapper-div
 *   injection that mutated the DOM after render. It wrote five inline styles per
 *   scroll frame and animated `top`, a layout property rather than a compositor
 *   one, and the hero was 160% tall only so the rig had somewhere to travel.
 *   A photograph is not a rig.
 *
 *   slowZoom (CSS) -- a 20s infinite scale on the largest image on the site.
 *
 *   Six reveal classes across two observers with two different `visible`
 *   conventions, four of which moved in a direction that tracked which template
 *   the author had copied rather than any compositional intent.
 *
 * The reference implementation is the approved mood board's own script.
 */
(function () {
    'use strict';

    // The choreography boundary, and the only timing number in this file.
    //
    // Derived from the tokens rather than chosen:
    //
    //   1600  --hero-hold      the beat the photograph is held alone
    // + 1000  --transition-reveal
    // +  120  1 x --stagger-step, the LAST held member's --i
    // = 2720
    //
    // UNCHANGED by the move of the hold out of CSS, and worth saying why rather
    // than leaving it to be re-derived. Before: `.seen` landed at t=0 and the
    // transition sat out a 1600ms delay before starting. Now: `.seen` lands at
    // t=1600 and the transition starts immediately. Same three numbers, same
    // order, same instant the last held member finishes -- the hold simply
    // stopped being a property of the transition and became a property of when
    // the transition is allowed to begin. The visible timeline is identical, so
    // the boundary is too.
    //
    // The old comment here asserted the last member sat at --i:2 and derived
    // 1240 from it. That was wrong on the day it was written: the --i:2 slot
    // belongs to the scroll cue, which is WP-2 composition and does not exist,
    // so the real last member has always been --i:1 and the constant has been
    // 120ms out ever since. Fixed here rather than carried forward.
    //
    // The held group is nav (--i:0) and .hero-content (--i:1). If --hero-hold,
    // --transition-reveal or --stagger-step move, this must move with them, and
    // the events suite's agreement fixture reads --hero-hold off the live page
    // and fails until it does.
    const SETTLE_MS = 2720;

    // Uncapped, a twelve-row ledger spends 1.4s of stagger on top of a 1s reveal
    // and its last row lands nearly three seconds after its first.
    const STAGGER_CAP = 4;

    const prefersReducedMotion = () =>
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // The hold's length, if the stylesheet cannot be read for it. Loud, because
    // a silent fallback here is a hold that no longer tracks its token and a
    // SETTLE_MS that quietly stops describing the page.
    const FALLBACK_HERO_HOLD_MS = 1600;

    const parseMs = (value) => {
        const v = String(value).trim();
        const n = parseFloat(v);
        if (!Number.isFinite(n)) return null;
        if (v.endsWith('ms')) return n;
        if (v.endsWith('s')) return n * 1000;
        return null;
    };

    // ONE authoritative value for the hold, and it is still the CSS token.
    //
    // The hold is spent in JS now (see RevealManager.scheduleHold), but --hero-hold
    // is not copied into a constant here -- it is READ. A retune of the token
    // therefore still moves the hold, which is the promise the ROADMAP's retune
    // note makes and the events suite's agreement fixture checks.
    function readHeroHoldMs() {
        const raw = getComputedStyle(document.documentElement)
            .getPropertyValue('--hero-hold');
        const ms = parseMs(raw);
        if (ms === null || ms < 0) {
            // Not a debug line. If this fires, the hold and SETTLE_MS have come
            // apart and every hero_hold reading after it is measuring something
            // other than what its name says.
            window.console.warn(
                '[ssc] --hero-hold did not resolve to a time (' + String(raw).trim()
                + '). Falling back to ' + FALLBACK_HERO_HOLD_MS
                + 'ms; SETTLE_MS may no longer describe the page.');
            return FALLBACK_HERO_HOLD_MS;
        }
        return ms;
    }

    // One frame, with the same fallback shape init.js uses for its double rAF:
    // a browser without requestAnimationFrame still has to compose the page,
    // and a setTimeout(0) there is a worse fade rather than no content.
    const deferAFrame = (fn) => {
        if (typeof window.requestAnimationFrame === 'function') {
            window.requestAnimationFrame(fn);
        } else {
            window.setTimeout(fn, 0);
        }
    };

    /**
     * The held pair, named in ONE place.
     *
     * The hold scheduler and the escape hatch must agree exactly on which
     * elements are held -- a scheduler that holds an element the hatch cannot
     * release is a nav stuck invisible. So both call this.
     *
     * page-home ONLY. The hold exists on the homepage and nowhere else, but
     * `nav` exists on all sixteen built pages; unscoped, this would hold the
     * navigation of a page that was never meant to have one held.
     *
     * The nav is found by element rather than by class because a bare <nav>
     * cannot be named by a dom-integrity `contains` (empty attributes are
     * rejected, dom-fingerprint.mjs:316-324), so it carries no markup class.
     * `.hero-content` does carry `.reveal--held`, which is the declared markup
     * change B1 makes.
     */
    function heldTargets() {
        if (!document.body || !document.body.classList.contains('page-home')) {
            return [];
        }
        return [
            document.querySelector('nav'),
            ...document.querySelectorAll('.reveal--held')
        ].filter(Boolean);
    }

    // Containers whose children reveal as a staggered GROUP. A grid that reveals
    // item-by-item on each item's own intersection reads as a page still
    // loading; a grid that reveals as one composed group reads as designed.
    const GROUP_SELECTOR = [
        '.grid-2',
        '.grid-3',
        '.model-grid',
        '.grid-offerings',
        '.comparison-grid',
        '.gallery-mosaic',
        '.gallery'
    ].join(', ');

    class RevealManager {
        constructor() {
            this.observer = null;
            // The origin of the CHOREOGRAPHY's clock, and the only clock the
            // hero-hold metric is allowed to measure against. See init().
            this.startedAt = null;
            // The hold, which lives here rather than in a transition-delay.
            // holdMs is read from --hero-hold at init; holdTimer is the pending
            // grant; holdReleased latches the beat as over, by either path.
            this.holdMs = null;
            this.holdTimer = null;
            this.holdReleased = false;
            // A release that arrived BEFORE `.reveal-ready`, waiting for the
            // frame in which a fade is actually possible. Once set it is never
            // cleared: it is the claim that ONLY the deferred quick compose may
            // write the held pair. See releaseHold and scheduleHold.
            this.pendingQuick = false;
            this.quickScheduled = false;
        }

        /**
         * Grant the reveal. `quick` swaps the duration for the escape hatch's
         * short one, in the SAME task as `.seen`, so the browser resolves one
         * style change and starts exactly one transition at the short duration.
         *
         * Two classes in one recalculation is the whole trick. Adding `.seen`
         * first and retiming afterwards is what failed twice: it leaves a
         * transition already running (or, worse, pending) at 1000ms, and Chrome
         * UPDATES a pending transition rather than replacing it, so the
         * shortened fade inherits the long timing regardless of what the
         * computed style says.
         */
        compose(elements, quick) {
            elements.forEach((el) => {
                if (quick) el.classList.add('reveal--quick');
                el.classList.add('seen');
            });
        }

        /**
         * THE HOLD.
         *
         * Not a second motion system. It is the same RevealManager, granting
         * `.seen` to the same .reveal targets through the same transition and
         * the same CSS stagger -- the only thing that moved is WHEN the grant
         * happens for two of them. 21 N2's one-system ruling is satisfied by
         * that: there is still exactly one thing on this page that reveals
         * elements, and this is it.
         *
         * Why the grant and not a `transition-delay`, which is where the hold
         * used to live: a 1600ms delay on an element whose `.seen` comes from
         * JS leaves a PENDING transition on it for the length of the beat. Any
         * attempt to retime that transition -- which is what a gentle escape
         * fade is -- gets folded into the pending one instead of starting a new
         * one, and the fade runs at 1600/1000 no matter what the computed delay
         * and duration read (measured: computed 0s/0.35s, actual 1600/1000).
         * With no delay declared, nothing is pending, and the hatch's fade is
         * an ordinary first transition.
         *
         * Measured from `startedAt`, the same clock the metric reads, so the
         * hold and the boundary that judges it cannot drift apart.
         */
        scheduleHold(held) {
            if (held.length === 0) return;
            // Interrupted before the choreography even started: the hatch binds
            // at DOMContentLoaded and init() is two frames later, so this is a
            // real window and it is exactly when an impatient visitor acts.
            if (this.holdReleased) {
                if (this.pendingQuick) {
                    // EXACTLY ONE WRITER, and it took a second instance of the
                    // batch's own bug to see why. init() runs twice -- once at
                    // DOMContentLoaded and again on window load. The first call
                    // deferred the quick compose by a frame; the second call
                    // arrived in between, found `pendingQuick` already consumed,
                    // and took the plain branch -- so `.seen` landed alone at
                    // t=272 with a 1000ms transition, and the deferred
                    // `.reveal--quick` arrived one frame later at t=292 into a
                    // transition that was already running. Chrome UPDATED it
                    // rather than replacing it, computed duration read 0.35s,
                    // and the fade took 914ms. That is the same hijack this
                    // whole batch exists to remove, reintroduced by a second
                    // caller rather than by a pending delay.
                    //
                    // So `pendingQuick` is never cleared -- it means "this
                    // release happened pre-ready, and ONLY the deferred quick
                    // compose may write these elements" -- and `quickScheduled`
                    // makes the scheduling itself idempotent.
                    //
                    // ONE FRAME, and it is load-bearing rather than defensive.
                    // `.reveal-ready` was added by startReveal in THIS task, so
                    // its transition is not in the before-change style yet. A
                    // transition whose property becomes applicable in the same
                    // style change as the value change does not run -- compose
                    // here and the fade we deferred in order to get would snap
                    // anyway, one task later. Waiting a frame lets the armed
                    // transition resolve first, so `.seen` is an ordinary value
                    // change against it.
                    if (!this.quickScheduled) {
                        this.quickScheduled = true;
                        deferAFrame(() => this.compose(held, true));
                    }
                } else {
                    this.compose(held, false);
                }
                return;
            }
            // init() runs again on window load. One beat, one timer.
            if (this.holdTimer !== null) return;
            if (this.holdMs === null) this.holdMs = readHeroHoldMs();
            const elapsed = this.startedAt === null ? 0 : Date.now() - this.startedAt;
            const remaining = Math.max(0, this.holdMs - elapsed);
            this.holdTimer = window.setTimeout(() => {
                this.holdTimer = null;
                this.holdReleased = true;
                this.compose(held, false);
            }, remaining);
        }

        /**
         * End the beat early, gently. Called by the escape hatch.
         *
         * On the timer, said plainly rather than dressed up: clearing it has NO
         * observable effect today. If it were left pending it would fire at
         * 1600ms and add two classes that are already on the elements. There is
         * therefore no mutation in the events suite for the `clearTimeout`
         * line, because a mutation nothing can detect is a decoration with a
         * green tick, and this suite's own contract forbids those. It is kept
         * because a scheduled callback that outlives its reason is a trap for
         * whoever next makes the grant do more than add a class -- but that is
         * a maintenance argument, not a behavioural one, and it should not be
         * mistaken for one.
         *
         * The `holdReleased` latch beside it IS load-bearing: it is what makes
         * a cancel in the two frames before init() runs turn into an immediate
         * compose instead of a hold nobody is waiting for.
         */
        releaseHold() {
            if (this.holdReleased) return;
            this.holdReleased = true;
            if (this.holdTimer !== null) {
                window.clearTimeout(this.holdTimer);
                this.holdTimer = null;
            }
            // THE PRE-READY WINDOW (Razor W-1).
            //
            // Both `.reveal--quick` rules are gated on `.js.reveal-ready`,
            // because that class is what arms transitions at all. The hatch,
            // deliberately, binds one double-rAF EARLIER than that -- 53-168ms
            // in the field and unbounded in a starved tab -- so an input can
            // land when no transition rule matches the held pair. Composing
            // then is a snap, which is the one outcome Lee ruled out. Measured
            // before this guard: zero intermediate frames at 0-40ms, fades from
            // 80ms on.
            //
            // Rejected: a `.js:not(.reveal-ready)` quick rule. That arms a
            // transition before the double rAF has committed the hidden state,
            // which is the visible-to-hidden animation init.js's ordering
            // exists to prevent -- and it would not even fade, for the
            // same before-change-style reason noted in scheduleHold.
            //
            // Rejected: documenting the exception. This window is not an edge
            // of the feature, it is the window the early bind was added to
            // serve; a hole there is a hole in the point.
            //
            // So the release LATCHES and the compose moves to the first frame
            // in which a fade is possible. The visitor waits out the remainder
            // of a gap they were already inside, and then sees a fade instead
            // of a flash. `holdReleased` is set above regardless, so the beat
            // is over either way and the scheduled grant cannot resurrect it.
            if (!document.documentElement.classList.contains('reveal-ready')) {
                this.pendingQuick = true;
                return;
            }
            this.compose(heldTargets(), true);
        }

        assignStagger() {
            document.querySelectorAll(GROUP_SELECTOR).forEach((container) => {
                let i = 0;
                Array.from(container.children).forEach((child) => {
                    if (!child.classList.contains('reveal')) return;
                    child.style.setProperty('--i', Math.min(i, STAGGER_CAP));
                    i += 1;
                });
            });
        }

        // The load-in group: nav, hero content, scroll cue, in that order.
        // Observed like everything else -- this is what makes load-in and
        // scroll-in one system. The page settles once, with no separate intro
        // and no lock. The scroll cue is WP-2 composition and may not exist
        // yet; a missing member simply does not take a slot.
        //
        // The HERO IMAGE used to lead this list and no longer appears in it at
        // all. It is the LCP element. Giving it a reveal class meant the
        // largest paint on the page was deliberately withheld -- the one thing
        // the choreography must never do. It composites on first paint now and
        // the group arrives over it.
        initLoadIn() {
            const ordered = [
                document.querySelector('nav'),
                document.querySelector('.hero-content'),
                document.querySelector('.scroll-cue')
            ];
            ordered.forEach((el, i) => {
                if (!el) return;
                el.classList.add('reveal');
                el.style.setProperty('--i', i);
            });
        }

        init() {
            // THE CHOREOGRAPHY CLOCK, and the reason it is recorded here.
            //
            // `.reveal-ready` lands on <html> and init.js calls this method in
            // the same synchronous block (its startReveal), so this timestamp
            // is the instant the CLASS landed, to within the statements
            // between them.
            //
            // PRECISION, because the earlier wording here conflated two
            // instants that are one frame apart (Razor, B1 re-review). The
            // class landing is NOT the moment the held transition-delays begin
            // counting. Delays start from the style recalculation the class
            // change provokes, which the browser does on the NEXT frame -- so
            // this clock is anchored about one frame BEFORE the delays actually
            // start spending -- one 60Hz frame is 16.7ms, and the gap measured
            // at ~19ms, i.e. about one frame, not exactly one. `ms` therefore
            // over-credits the visitor by roughly a frame.
            //
            // That is recorded rather than corrected, and the distinction
            // matters for the size of the error, not for the reading. One
            // frame against a 1600ms hold is ~1.2%, two orders of magnitude
            // below the DOMContentLoaded anchor it replaced (53-168ms, and
            // unbounded in a rAF-starved tab). It is bounded and always in the
            // same direction, so it cannot flip a branch that was not already
            // within a frame of the boundary. The events suite pins the bound
            // by asserting the two clocks agree within TWO frames -- that
            // fixture is what would notice this gap growing.
            //
            // It is recorded because the hero-hold METRIC used to start its own
            // clock at DOMContentLoaded instead, which is 53-168ms earlier (the
            // double rAF init.js waits out before enabling transitions). Every
            // view was therefore credited with time the choreography had not
            // begun to spend, and a visitor who watched the entire arrival and
            // scrolled at the end of it could be recorded as having SKIPPED it.
            // The metric now reads this value, so the branch boundary and the
            // thing it is a boundary of cannot be on different clocks. The
            // events suite asserts they agree within two frames.
            //
            // Set once: init() runs again on window load and the second call
            // must not restart the clock.
            if (this.startedAt === null) {
                this.startedAt = Date.now();
            }

            this.initLoadIn();

            const targets = document.querySelectorAll('.reveal');
            if (targets.length === 0) return;

            // Reduced motion: compose everything and return BEFORE constructing
            // the observer, so no JS-driven motion of any kind runs. The CSS
            // media query does the same job independently -- both layers, so a
            // reduced-motion visitor can never land on invisible content.
            if (prefersReducedMotion()) {
                targets.forEach((el) => el.classList.add('seen'));
                return;
            }

            this.assignStagger();

            // The held pair is granted by the clock below, not by intersection.
            // It is above the fold and would otherwise be composed by the
            // observer on the first callback, which is precisely the hold not
            // happening.
            const held = heldTargets();
            const isHeld = new Set(held);
            this.scheduleHold(held);

            // init() runs on DOMContentLoaded and again on window load, because
            // late-arriving images move things into view. Reuse the observer: a
            // second one would double-observe every element on the page.
            if (!this.observer) {
                this.observer = new IntersectionObserver(
                    (entries, observer) => {
                        entries.forEach((entry) => {
                            if (!entry.isIntersecting) return;
                            entry.target.classList.add('seen');
                            // Fires once, then stops watching. A reveal that
                            // reverses on scroll-up is a scroll-position
                            // readout, not a reveal.
                            observer.unobserve(entry.target);
                        });
                    },
                    { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
                );
            }

            targets.forEach((el) => {
                if (el.classList.contains('seen')) return;
                if (isHeld.has(el)) return;
                this.observer.observe(el);
            });
        }
    }

    /**
     * Arrival instrumentation -- doc 14 §8, explicitly carried forward by 21 N2
     * as one of the things that survives from Wim's journey spec.
     *
     * The question is unchanged: is the held moment being watched or skipped?
     * It is now asked of a photograph the visitor is free to leave at any moment
     * rather than of a page that would not let them, so the answer means more
     * than it did -- a skip is now a choice instead of a struggle.
     *
     * The branch is decided by SETTLE_MS, the choreography's own boundary, so no
     * threshold is invented for it:
     *
     *   hero_hold_skipped   first scroll arrived BEFORE the page finished settling
     *   hero_hold_complete  first scroll after it, or no scroll at all
     *
     * `ms` is the time they gave it, in both branches, which is what makes the
     * median usable for tuning the settle duration. Exactly one event per view.
     */
    /**
     * The escape hatch on the held beat.
     *
     * 1600ms is a long time to ask of someone who has seen the page before, and
     * for the duration of it the nav is invisible AND focusable -- Tab lands on
     * links nobody can see. So the first sign of intent ends the hold: scroll,
     * key (Tab included, which is the point), or pointer.
     *
     * It cancels with a SHORT FADE, not a snap. That is Lee's fixed decision
     * and it is a reversal of what this comment used to argue, so the argument
     * is worth replacing rather than deleting: the old text said an interrupted
     * animation should yield rather than negotiate, and snapped with an inline
     * `transition: none`. Yielding and snapping turn out not to be the same
     * thing. A ~350ms fade yields -- it is over before the gesture is -- while
     * a snap reads as the page flinching.
     *
     * The mechanism is RevealManager.releaseHold: clear the pending grant, add
     * `.reveal--quick` and `.seen` together, one recalculation, one fresh
     * transition at the short duration. It is emphatically NOT a retime of an
     * existing transition. Two attempts to do it that way were reverted; the
     * reason is in scheduleHold's comment and in the --hero-hold token's.
     *
     * TWO scoping decisions, both learned the hard way:
     *
     * 1. page-home ONLY, exactly like the metric beside it. The hold exists on
     *    the homepage and nowhere else, but `nav` exists on all sixteen built
     *    pages -- so bound sitewide this listener fired on every interior page
     *    and wrote a PERMANENT inline `transition: none` onto the nav of a page
     *    that was never held. A cancel for something that is not happening is
     *    not free; it silently disabled the nav's transitions for the rest of
     *    that visit. The inline write is gone, but the scoping is not softened
     *    on that account: `heldTargets()` returns nothing off the homepage, so
     *    the guard is now stated in two places that agree.
     *
     * 2. Bound at DOMContentLoaded, not from inside RevealManager.init(). init()
     *    runs after a double rAF, so binding there left a two-frame window in
     *    which the beat was already resolving under CSS while nothing was
     *    listening for the gesture that should cancel it. Two frames is small
     *    and it is also exactly when an impatient returning visitor acts. It is
     *    correct to bind before the choreography starts: the release adds
     *    `.seen`, which wins the cascade against the hidden state whether or
     *    not `.reveal-ready` has landed yet. A release in that two-frame window
     *    also latches `holdReleased`, so init() -- which has not run yet --
     *    composes the pair instead of scheduling a beat nobody is waiting for.
     *
     * Reduced motion never gets here -- there is no hold to escape, and the
     * page has already composed itself instantly by both the CSS mirror and
     * the JS guard.
     *
     * One-shot, capture phase, passive. Nothing here can block a scroll.
     */
    function initHoldEscape() {
        if (!document.body.classList.contains('page-home')) return;
        if (prefersReducedMotion()) return;

        if (heldTargets().length === 0) return;

        const events = ['scroll', 'keydown', 'pointerdown'];
        let fired = false;

        const cancel = () => {
            if (fired) return;
            fired = true;
            events.forEach((type) =>
                window.removeEventListener(type, cancel, { capture: true })
            );
            reveal.releaseHold();
        };

        events.forEach((type) =>
            window.addEventListener(type, cancel, { capture: true, passive: true })
        );
    }

    function initHeroHoldMetric() {
        if (!document.body.classList.contains('page-home')) return;
        if (!window.SSC || typeof window.SSC.track !== 'function') return;

        // A reduced-motion visitor is never held. The CSS mirror and the JS
        // guard both compose the page immediately for them, so they see the
        // whole homepage at once and scroll whenever they like -- which lands
        // them in the `skipped` branch essentially always.
        //
        // That is not a skip. It is a visitor answering a question they were
        // never asked, and the answer is indistinguishable from the one this
        // metric exists to collect. Since the skipped:complete ratio is the
        // instrument for RETUNING --hero-hold, every such view would have been
        // a vote to shorten a beat that visitor never saw. Bail before binding
        // anything: no event at all is the honest reading, and it mirrors the
        // guard RevealManager.init already applies to the motion itself.
        if (prefersReducedMotion()) return;

        let reported = false;

        const onScroll = () => {
            if (window.pageYOffset > 0) report();
        };
        // The visitor who never scrolls still answered the question. Reported
        // when the page goes away rather than on a timer, so the number is the
        // time they actually gave it and not a timeout we chose for them.
        //
        // TWO listeners, because one of them does not always fire (NOTE-2b).
        // `visibilitychange` covers tab-switching and most backgrounding, but a
        // straight NAVIGATION AWAY -- clicking a link, hitting back, closing the
        // tab -- can take the page down without a hidden transition ever being
        // observed, and on those views the metric simply never reported. That
        // is a silent under-count biased toward exactly the visitor the metric
        // is about: the one who looked at the photograph and then left.
        //
        // `pagehide` is the event that does fire on that path, so it reports
        // unconditionally -- by the time it runs the page IS going away (or into
        // bfcache, which is the same thing for this question). The
        // `visibilitychange` handler keeps its state guard, because it also
        // fires on the way BACK to visible and that is not an answer.
        //
        // Double-reporting is not a risk: `reported` is the same latch both
        // paths already went through, so a view that fires visibilitychange and
        // then pagehide still emits exactly one event. That invariant is what
        // the fixtures assert, in both orders.
        const onHide = () => {
            if (document.visibilityState === 'hidden') report();
        };
        const onPageHide = () => report();

        function report() {
            if (reported) return;
            reported = true;
            // Measured from the CHOREOGRAPHY's clock, not this function's own.
            // See RevealManager.init for why. If the choreography never started
            // -- the visitor acted before the double rAF resolved, or the
            // reveal system failed outright -- they gave the held moment
            // nothing, and 0 is both the true answer and the skipped branch.
            const startedAt = reveal.startedAt;
            const ms = startedAt === null ? 0 : Math.max(0, Date.now() - startedAt);
            window.SSC.track(
                ms < SETTLE_MS ? 'hero_hold_skipped' : 'hero_hold_complete',
                { ms }
            );
            window.removeEventListener('scroll', onScroll);
            document.removeEventListener('visibilitychange', onHide);
            window.removeEventListener('pagehide', onPageHide);
        }

        window.addEventListener('scroll', onScroll, { passive: true });
        document.addEventListener('visibilitychange', onHide);
        window.addEventListener('pagehide', onPageHide);
    }

    const reveal = new RevealManager();

    window.SSC = window.SSC || {};
    window.SSC.reveal = reveal;
    window.SSC.initHoldEscape = initHoldEscape;
    window.SSC.initHeroHoldMetric = initHeroHoldMetric;

})();
