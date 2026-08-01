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
            this.holdEscapeBound = false;
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

        // The escape hatch on the held beat.
        //
        // 1600ms is a long time to ask of someone who has seen the page before,
        // and for the duration of it the nav is invisible AND focusable -- Tab
        // lands on links nobody can see. So the first sign of intent ends the
        // hold: scroll, key (Tab included, which is the point), or pointer.
        //
        // It cancels by removing the TRANSITION, not by rewriting the delay.
        // Rewriting the delay restarts a 1000ms fade from wherever the element
        // happened to be, which races the gesture that interrupted it. Snapping
        // is the honest response to "I am already doing something else": an
        // interrupted animation should yield, not negotiate.
        //
        // One-shot, capture phase, passive. Nothing here can block a scroll.
        initHoldEscape() {
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

        init() {
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

            // init() runs twice (see below), so the hatch latches: two sets of
            // listeners would both fire and the second would find nothing left
            // to cancel, which is harmless but is not something to rely on.
            if (!this.holdEscapeBound) {
                this.holdEscapeBound = true;
                this.initHoldEscape();
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
    function initHeroHoldMetric() {
        if (!document.body.classList.contains('page-home')) return;
        if (!window.SSC || typeof window.SSC.track !== 'function') return;

        const start = Date.now();
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
            const ms = Date.now() - start;
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
    window.SSC.initHeroHoldMetric = initHeroHoldMetric;

})();
