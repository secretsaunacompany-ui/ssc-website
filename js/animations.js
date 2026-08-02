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
     * It cancels by removing the TRANSITION, not by rewriting the delay.
     * Rewriting the delay restarts a 1000ms fade from wherever the element
     * happened to be, which races the gesture that interrupted it. Snapping is
     * the honest response to "I am already doing something else": an
     * interrupted animation should yield, not negotiate.
     *
     * TWO scoping decisions, both learned the hard way:
     *
     * 1. page-home ONLY, exactly like the metric beside it. The hold exists on
     *    the homepage and nowhere else, but `nav` exists on all sixteen built
     *    pages -- so bound sitewide this listener fired on every interior page
     *    and wrote a PERMANENT inline `transition: none` onto the nav of a page
     *    that was never held. A cancel for something that is not happening is
     *    not free; it silently disables the nav's transitions for the rest of
     *    that visit.
     *
     * 2. Bound at DOMContentLoaded, not from inside RevealManager.init(). init()
     *    runs after a double rAF, so binding there left a two-frame window in
     *    which the beat was already resolving under CSS while nothing was
     *    listening for the gesture that should cancel it. Two frames is small
     *    and it is also exactly when an impatient returning visitor acts. It is
     *    correct to bind before the choreography starts: the snap adds `.seen`,
     *    which wins the cascade against the hidden state whether or not
     *    `.reveal-ready` has landed yet.
     *
     * Reduced motion never gets here -- there is no hold to escape, and binding
     * would mean writing an inline transition override onto a page that already
     * composed itself instantly.
     *
     * One-shot, capture phase, passive. Nothing here can block a scroll.
     */
    function initHoldEscape() {
        if (!document.body.classList.contains('page-home')) return;
        if (prefersReducedMotion()) return;

        const held = [
            document.querySelector('nav'),
            ...document.querySelectorAll('.reveal--held')
        ].filter(Boolean);
        if (held.length === 0) return;

        const events = ['scroll', 'keydown', 'pointerdown'];
        let fired = false;

        const cancel = () => {
            if (fired) return;
            fired = true;
            events.forEach((type) =>
                window.removeEventListener(type, cancel, { capture: true })
            );
            held.forEach((el) => {
                el.style.transition = 'none';
                el.classList.add('seen');
            });
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
