# Critic review, round 2: hero-composition-c

Plan: `.claude/plans/hero-composition-c.md` (folded 2026-09-04). Rubric v2. Read against the worktree at `69328a1`. Round 1's findings are not re-litigated; this pass hunts the folds' second-order effects.

## Applicability

Public marketing site, live Netlify deploy, one booking CTA on opening weekend.

- **X4 [GATING]** fires, per round 1. **X5 [ADVISORY]** fires (scrim vs reveal clock). **X6 [ADVISORY]** fires (deploys).
- **X1 no**: CSS and markup, nothing physical. **X2 no**: no personal data; href and UTM unchanged. **X3 no**: no factual claim produced. **X7 no**: the two harness configs are project declarations, not MARVIN gates; `decisions_amend` is the sanctioned writer. **X8 no**: no dependency; `:has()`, `svh`, `text-wrap: balance` are native and degrade cleanly.

## Answers from the code

- **`seen` lifecycle.** `RevealManager` only adds `seen` (animations.js:193, 423, 445); the observer unobserves after one fire; nothing removes it. `init()` runs on DOMContentLoaded and `load`, neither fires on bfcache restore, so back-navigation shows the composed page, scrim at 1. `compose()` adds `reveal--quick` and `seen` in one task; the quick rule at (0,5,1) beats the seen rule at (0,4,1).
- **`--stagger-step`** is `120ms` on `:root` (styles.css:339); `calc(1 * var(--stagger-step))` resolves on `.hero::after`.
- **Nav scrim.** `nav { background: var(--nav-scrim) }` is unconditional (styles.css:711-722, `rgba(12,12,12,.72)` plus blur); no `.scrolled` state exists. Jen's render lost Contact and Book because her nav was `background: transparent` (base.css:12). On the real site every link sits on a 0.72 scrim, roughly 9:1 against bright cedar. The nav reveals via `.js body.page-home nav.seen` (styles.css:3164) and its background fades with it. No element spans 22svh; a top gradient would be a new `.hero::before`, keyed on `body:has(nav.seen)` (nav is body's child, base.njk:6).
- **Harness capture** (`scripts/lib/capture.mjs:348, 150`): visual-diff and dom-integrity run with `reducedMotion: 'reduce'` and pin `.hero-content` visible by injected CSS without granting `seen`. The scrim reaches the measurement only through the JS reduced-motion branch and the CSS mirror. The plan's reduced-motion rule is load-bearing for measurement and must sit at `.js .hero::after` specificity inside the media block; a bare `.hero::after` there loses to the hidden rule.
- **`delete-subtree` hash.** `scripts/dom-subtree-hash.mjs` is the tool: `node scripts/dom-subtree-hash.mjs --ref main --route / --width 1440 --path html/body/div/section/div/a --tag A`. It prints every candidate at the path with its span; both hero anchors share it, so the worker picks the one with the removed label. Nothing in `.dom-integrity/` is read by hand.
- **Baseline advance.** `visual-diff.mjs` has no advance flag (`parseArgs`: `--baseline`, `--candidate`, `--config`, `--open`). The baseline is `main`, so the advance IS the merge; afterwards the `/` waiver fires on zero pages and the run WARNs (l.401-406) until retired or re-stamped. Nothing consumes the verdict: `netlify.toml` builds only, no repo hooks, no skill names the harness. A red `/` blocks nothing mechanically.
- **Analytics.** `js/analytics.js` has no hero or `.btn` selector; nothing in-repo counted the removed anchor. The external ssc-ops tracker may count generic link clicks; a drop in hero-to-contact clicks is intended.
- **rhythm.test.mjs** asserts only `firstLineTop - navBottom >= 8` (l.566, 693); bottom-anchoring raises clearance. `events.test.mjs:974-1043` reads `.hero-content` only.

## Core dimensions

1. **Problem-fit: PASS.**
2. **Approach soundness: CONCERN.** 1c declares the scrim's `transition` inside the `:has(.seen)` rule, so transition and value change arrive in one recalculation. That is the shape `animations.js:247-253` measured as a snap, and why `.js.reveal-ready .reveal` arms transitions apart from `.seen`. Fix: `transition: opacity 700ms ease calc(1 * var(--stagger-step))` on `.js.reveal-ready .hero::after`; only `opacity: 1` on the seen rule; the quick mirror overrides duration and delay as the existing quick rules do.
3. **Completeness: CONCERN.** 1f adds the top gradient unconditionally, justified by contrast the real nav already carries. Round 1 said measure, add on failure; the fold dropped the condition. Restore measure-first; if the gradient is wanted for the render's look, say so and let Jen rule at Stage 0.7.
4. **Right-sizing: PASS.**
5. **Security: PASS.**
6. **Failure modes: PASS** (no-JS, reduced motion, pre-ready release covered once fix 2 lands).
7. **Change safety: PASS.**
8. **Data integrity: FAIL (fold error).** Section 4 declares both a `delete-subtree` for the anchor and a `kind:"text"` removal for its label. `applyWhitelist` (dom-fingerprint.mjs:669-701) gives subtree entries first refusal and they claim the whole run, element and text. The text entry matches nothing, is reported `STALE WHITELIST`, and `failCount` (dom-integrity.mjs:434) fails the run. Verification 2 is unattainable as written. Fix: delete the text entry.
9. **Verifiability: CONCERN.** Section 5 sends the worker after a baseline-advance flag that does not exist. State that the merge is the advance and the `/` entry is re-stamped or retired at Stage 5.
10. **Maintainability: CONCERN, minor.** styles.css:889 claims the photograph is "100svh"; it is `100vh`. Correct the comment.

## Conditional dimensions

- **X4 [GATING]: FAIL (fold error, one-line fix).** 1e's arithmetic is wrong. Below 768 `.hero` is `height: auto; padding-block: var(--nav-band) 0` (styles.css:3812-3816); `--nav-band` at 390 is 58 + 2*16 + 1 = 91px. A `100svh` grid item's bottom edge therefore sits 91px BELOW the small-viewport floor, and with the 5.5rem (88px) inset the block's bottom lands 3px under the visible floor at first paint on iOS: the one button is off-screen, the defect the fold claimed to close. The reference's inset does not transfer because its hero has no band padding. Fix: below 768, `.hero > .hero-image, .hero > .hero-content, .hero::after { height: calc(100svh - var(--nav-band)) }` so the hero totals 100svh; or drop the padding and pad `.hero-content` top so the photograph runs under the nav as on desktop (Jen's call). The 390 shot at 844 will show either, since the error is not toolbar-dependent.
- **X5 [ADVISORY]: PASS** with fix 2. **X6 [ADVISORY]: PASS.**

## Stress tests

**Pre-mortem.** (1) Saturday, iPhone: Book sits 3px under the floor; the fold "fixed" this and nobody re-measured. (2) dom-integrity fails on the stale text entry; Ted deletes the subtree entry instead and the removal goes undeclared. (3) The scrim snaps in at 1720ms; the t=3000 screenshot cannot see it.

**Assumptions.** (a) Playwright's `svh` equals viewport height: true, so the 390 shot proves geometry, not the toolbar. (b) The nav's 0.72 scrim is what Lee approved live; Jen's transparent nav was never on the site.

**Inversion.** Today's centred mobile hero wins if the bottom-anchored stack collides with the floor after the fix; at 390 the stack is about 260px in a 753px stage, so it should not. The 390 shot decides.

## Verdict

Design right, most folds correct, but two are wrong against the code in ways that fail the plan's own verification: the mobile CTA still lands below the floor, and the DOM declaration double-consumes one node. Both are one-line corrections. The scrim transition repeats a snap this codebase has measured twice.

VERDICT: CONCERN

**Must-fix before Ted starts**
1. 1e: mobile stage items at `calc(100svh - var(--nav-band))` (or pad the content instead of the container); re-derive the inset from the real floor.
2. Section 4: delete the `kind:"text"` entry; name `scripts/dom-subtree-hash.mjs` as the tool.
3. 1c: transition on `.js.reveal-ready .hero::after`, opacity only on the seen rule; reduced-motion mirror at `.js .hero::after` specificity.

**Advisory**
4. 1f: measure-first; if kept for the look, it is a `.hero::before` keyed on `body:has(nav.seen)` and a Jen ruling.
5. Section 5: no advance flag; the merge is the advance; retire or re-stamp `/` at Stage 5 on the WARN.
6. Report line: no in-repo analytics counted the removed anchor; an external drop in hero-to-contact clicks is intended.
7. Fix the "100svh" comment at styles.css:889.
