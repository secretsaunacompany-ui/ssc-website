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
    // Reveal is 1000ms and the load-in group staggers at 120ms per child with
    // its last member at --i:2, so 1000 + 2*120 = 1240ms is when the page has
    // settled. Derived from the tokens rather than chosen: if --transition-reveal
    // or --stagger-step move, this moves with them.
    const SETTLE_MS = 1240;

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

        // The load-in group: hero image, nav, scroll cue, in that order. Observed
        // like everything else -- this is what makes load-in and scroll-in one
        // system. The page settles once, with no separate intro and no lock.
        // The scroll cue is WP-2 composition and may not exist yet; a missing
        // member simply does not take a slot.
        initLoadIn() {
            const ordered = [
                document.querySelector('.hero-image'),
                document.querySelector('nav'),
                document.querySelector('.scroll-cue')
            ];
            ordered.forEach((el, i) => {
                if (!el) return;
                el.classList.add('reveal');
                el.style.setProperty('--i', i);
            });
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
        const onHide = () => {
            if (document.visibilityState === 'hidden') report();
        };

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
        }

        window.addEventListener('scroll', onScroll, { passive: true });
        document.addEventListener('visibilitychange', onHide);
    }

    const reveal = new RevealManager();

    window.SSC = window.SSC || {};
    window.SSC.reveal = reveal;
    window.SSC.initHeroHoldMetric = initHeroHoldMetric;

})();
