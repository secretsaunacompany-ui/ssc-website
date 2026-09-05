# ssc-website: landing hero, composition C

**Tier:** Standard. One repo, four files (`styles.css`, `src/_includes/pages/home.njk`, `scripts/dom-integrity.config.json`, `scripts/visual-diff.config.json`) plus one ruling amendment through the writer. CSS and markup, no JavaScript change intended, no data.
**Repo:** ssc-website (Eleventy). Work in the worktree `/home/leesalo/.local/share/marvin/worktrees/ssc-website/relay-copy-followups`, which sits at `69328a1`; create `relay/hero-composition-c` there with `git checkout -b` from that sha. Never touch `/home/leesalo/Projects/ssc-website`: the primary checkout is parked on `relay/cloudinary-migration` at `8a547a3` and is not main.

**Reference render governs POSITION and GRADIENT only.** Jen's `variant-c` is a one-line hero (no subtitle, no button, plus a top gradient behind the nav). This plan builds a three-element block (h1, one-sentence subtitle, one button), so the insets are re-derived for that block, not copied, and Jen's Stage 3 compares against this plan's own described result, not against her render pixel for pixel.
**Deploy rule:** a push to `main` is a live Netlify deploy. The relay ends on a branch; the push waits for Lee's yes.

## Intent (grilled)

Skip line: Lee, 2026-09-04, after seeing the 29ad824 hero live and reviewing the artifact The Held Photograph (four rendered compositions, eight thesis lines): "I like C personally, actually, for the composition. I'm not actually as against the title as I was before. I just think that maybe how the subtitle was laid out was kind of bothering me. Maybe it felt a little long. Maybe it felt like it shouldn't be so location specific." Then, to MARVIN's three recommendations (drop the brightness filter and the permanent scrim in favour of a bottom gradient behind the line; keep one button, "Book a Session", and drop "Plan My Sauna Design" from the hero; subtitle "Handcrafted Finnish saunas from Squamish, BC."; amend the Brackendale ruling so the Try-a-Session card carries the venue): "lets go with all of your recommendations." Nothing is left to discover from Lee. The reference render is Jen's `variant-c` (session scratchpad `hero/variant-c.html`, `variant-c-1440-settled.png`, `variant-c-390-settled.png`).

## Summary

The hero keeps its photograph, its 1.6 s hold, its headline and its reveal machinery. What changes: the photograph is shown untreated during the hold; a bottom-only gradient fades in with the text instead of a permanent full scrim plus a brightness filter; the text block moves from centred to bottom-left; the subtitle becomes one short sentence; one outline button remains. A ruling is amended to match. The DOM gate and the visual-diff gate are told exactly what changed.

## Standing rulings that bind this plan (`.claude/DECISIONS.md`)

- **Hero-first reveal**: image first, unobstructed, then chrome, via the delayed `.reveal` stagger; `HeroIntroAnimation` stays dead. This plan keeps `--hero-hold`, `.reveal--held` and the scheduler untouched and makes the hold cleaner, not shorter.
- **Confirm against Lee's stated likes before any effect deletion** (2026-08-01). The filter and scrim removal was put to Lee explicitly with the render and approved 2026-09-04 ("all of your recommendations"). Quote it in the CSS comment.
- **Fixed photo backgrounds removed except the Contact fog**: untouched.
- **The Brackendale Art Gallery is named on the landing page**: amended by this relay (below), not reversed. The card and the hero button still carry the venue and its booking link.
- **No em dashes in rendered prose**: the new subtitle has none.

## Changes

### 1. `styles.css`

a. `.hero-image` (line ~902): delete `filter: brightness(0.7);`. Replace the comment's "brightness(0.7) on the image is UNCHANGED" note in the `.hero::after` block accordingly.

b. `--hero-scrim` token (line ~180): redefine as the bottom-only gradient from Jen's render: `linear-gradient(180deg, rgba(12,12,12,0) 45%, rgba(12,12,12,0.55) 100%)`. The worker greps for every other consumer of `--hero-scrim` first; if any page other than the home hero uses it (sub-page heroes, `.page-hero`), introduce a second token `--hero-scrim-line` for the home hero and leave `--hero-scrim` alone. Report which.

c. `.hero::after`: the gradient must be absent during the hold and arrive with the text. The reveal manager (`js/animations.js:193, 423`) adds the class `seen` to a revealed element, and `reveal--quick` (l.192) when early input shortens the hold; every hidden state in the reveal system is gated on `.js` (styles.css:3065) and the quick rules on `.js.reveal-ready` (~3179). Mirror all of that, so the no-JS page shows the scrim and nothing is hidden without a way to unhide it:
   - `.js .hero::after { opacity: 0; }` (hidden only when JS runs)
   - The transition is ARMED on the ready state, not inside the `:has()` rule: `.js.reveal-ready .hero::after { transition: opacity 700ms ease calc(1 * var(--stagger-step)); }`. Putting the transition in the same rule that flips opacity is the same-recalculation shape `animations.js:247-253` measured as a snap (round-2 critic). The delay is the held pair's own: `.hero-content` carries `--i:1` and `::after` inherits from `.hero` where `--i` is unset, so a bare token would resolve to 0ms and the scrim would lead the text by one step. Use the same step token the `--i` rules use; the worker confirms its name in styles.css and does not write a literal.
   - `.js .hero:has(> .hero-content.seen)::after { opacity: 1; }` flips it.
   - `.js.reveal-ready .hero:has(> .hero-content.reveal--quick)::after` uses the same shortened timing the `.reveal--quick` rules use, so an early scroll does not leave the scrim arriving late over text that already landed.
   - `prefers-reduced-motion: reduce`: `.js .hero::after { opacity: 1; transition: none; }` at that specificity inside the reduced-motion block. It must beat the `.js .hero::after` hidden rule without needing `seen`, because the visual-diff harness captures under `reducedMotion: 'reduce'` and pins `.hero-content` without granting `seen` (`capture.mjs:150/348`).
   `:has()` is acceptable (Baseline 2023). If the worker finds the manager's class differs from `seen`, it uses what the code sets and reports.

d. `.hero > .hero-content` / `.hero-content`: from centred to bottom-left. `justify-content: flex-end; align-items: flex-start; text-align: left;` and a bottom padding that lands the block at roughly `3.5rem` from the bottom at 1440 and `5.5rem` at 390 (Jen's values; use the spacing tokens closest to them and say which). Left inset uses the site's existing gutter token (the one the nav uses), not a new value. `h1` gets `max-width: 26ch; text-wrap: balance;`. The subtitle drops its `margin-left/right: auto` (it is no longer centred) and keeps its size, weight and the sanctioned 0.05em tracking. Colour stays `var(--ink)`.

e. Mobile stage height. `.hero > .hero-image, .hero > .hero-content, .hero::after { height: 100vh }` (styles.css ~841-847) is unconditional, and the mobile `.hero` rule (~3812) only relaxes the container (`height: auto; min-height: 80vh; padding-block: var(--nav-band) 0`). On iOS Safari `100vh` is the LARGE viewport (toolbar retracted), so a block anchored to the bottom of a 100vh item sits under the browser toolbar at first paint, roughly the bottom 80-100px, exactly where this plan puts the button. Below 768 the container also carries `padding-block: var(--nav-band) 0` (91px at 390), so a `100svh` item would still overhang the small-viewport floor by the nav band. The three items therefore use `height: calc(100svh - var(--nav-band))` below 768, so the item's bottom edge IS the visible floor (round-2 critic). A Playwright screenshot at 390x844 cannot show the toolbar and is NOT proof of this; the proof is the `svh` unit plus one look on Lee's phone after deploy, recorded as owed. The 5.5rem bottom inset is then measured from the svh floor. Check that nothing overlaps the nav band at the top at 390.

f. Nav contrast over the untreated photograph, MEASURE FIRST. The real nav already carries a permanent 0.72 scrim of its own (styles.css:711-722); Jen's render used a transparent nav, which is why hers needed a top gradient. So: no top gradient by default. Verification samples the screenshot pixels behind each nav link at 1440 and 390 settled and computes contrast against `#e8e6e3`; every link must reach 3:1 (WCAG AA for large text). Paste the numbers. Only if a link fails does the worker add a `.hero::before` top gradient (`linear-gradient(180deg, rgba(12,12,12,0.6), rgba(12,12,12,0) 22svh)`) keyed on the nav's own revealed state, absent at t=0, and reports it as a deviation for Jen to rule on at Stage 3.

g. Nothing else in the hero system changes: `--hero-hold`, `--hero-runway`, the sticky stage, `.reveal--held`, the grid.

### 2. `src/_includes/pages/home.njk` (lines 3-13)

- `h1` unchanged: `Real heat. Built here.`
- `.hero-subtitle` becomes `Handcrafted Finnish saunas from Squamish, BC.`
- Delete the `<a href="/contact/" class="btn">Plan My Sauna Design</a>` anchor.
- The remaining anchor: label `Book a Session` (drop the leading "Or"), href unchanged (`https://book.secretsaunacompany.ca/book/brackendale-art-gallery?utm_source=website&utm_medium=hero&utm_campaign=booking`), classes `btn-outline btn`. The worker checks what `btn--hero-secondary` does in `styles.css`; if it only spaces a second button beside a first, drop it; if it carries the outline treatment, keep it. Report which.
- Rewrite the Nunjucks comment above the button: it now explains that the subtitle no longer names the venue and the button is the hero's one ask, per Lee 2026-09-04.

### 3. Ruling amendment (writer only, on the relay branch)

```json
{"decisions_amend":[{"match":"The Brackendale Art Gallery is named on the landing page","kind":"amend","date":"2026-09-04","attribution":"Lee","text":"The hero subtitle no longer names the gallery: Lee, seeing the 29ad824 hero live, found the two-sentence subtitle long and too location-specific and cut it to 'Handcrafted Finnish saunas from Squamish, BC.' The venue stays on the landing page through the Try-a-Session card and the hero's single button, both of which still link to the gallery's own booking page. The walk-in test in the entry above is unchanged."}]}
```
Run `node ~/marvin/scripts/update-decisions.mjs --project-name "SSC Website" --repo-root "$(pwd)" --content <file>`, then `--check` must print `entries: 16` (an amendment adds no heading). Commit `.claude/DECISIONS.md` by explicit path.

### 4. `scripts/dom-integrity.config.json`

Baseline for this comparison is `main` at `69328a1`. Declare, in a new `_notes.heroCompositionC20260904` block with the two-commit pattern (markup commit, then a config-only commit whose `range` ends at the markup sha and activates by descent):
- `removed` text in `P` (`.hero-subtitle`): the old two-sentence subtitle; `added` text: the new one. Whole value, not a tail.
- The removed anchor cannot be named by `contains`: `home.njk:173` carries an identical `href="/contact/" class="btn"` twin, so the specificity check refuses any substring. Declare it as ONE `delete-subtree` entry (tag `A`, `path` and `textHash` measured from the BASELINE build with `scripts/dom-subtree-hash.mjs`, the tool the existing `delete-subtree` entries were written with; count 1). No separate `kind: "text"` entry for the label: subtree entries get first refusal and claim the whole run including the text token (`dom-fingerprint.mjs:669-701`), so a text entry would never match and fail the run as STALE (round-2 critic). Follow the existing entries' shape exactly.
- `removed`/`added` text in `A` for `Or Book a Session` → `Book a Session`; if the class list changes, that is an attribute change on the same node and needs its own pair.
- Nothing else. Any further undeclared delta means the markup changed more than planned; stop and report.

### 5. `scripts/visual-diff.config.json`

The hero moves pixels on `/` at both widths. Two facts govern this section: `npm run visual-diff` is the measurement and `npm run visual-diff:test` is the harness's self-test against fixtures (it measures nothing); and `scripts/lib/gate.mjs:212` throws on a second `expectedToChange` entry for the same route, so there is never a second entry for `/`.
- Run `npm run visual-diff` against `main` and read the measured numbers for `/` at 1440 and 390.
- Append a dated addendum (`2026-09-04, hero composition C: ...`) to the EXISTING `/` entry's `reason`, with the measured numbers, and add to its `waive` array only the waivable metrics that actually moved. `expires` stays `2026-10-05`.
- `layoutShiftMaxPx`, `shiftCoverage` and `fitConfidence` are UNWAIVABLE (`gate.mjs:27`) and a block that moves from centre to bottom-left will trip them on `/`. "Green" for this relay therefore means: every other route reports 0.000% change, and `/`'s shift metrics are recorded as refused residuals WITH their numbers, in the same form as the three existing refused residuals in the ROADMAP's deferred list ("deliberately left RED, retire on baseline advance"). There is no baseline-advance flag: the harness's baseline is `main`, so the merge to `main` IS the advance, and the residual retires on the first run after the push (round-2 critic). Nothing to do at Stage 5 beyond re-running the harness and confirming `/` is clean against the new main.
- Do not widen any other waiver.

### 6. Tests and scripts that may pin the removed button

Before editing, the worker greps `scripts/` and `js/` for `Plan My Sauna Design`, `btn--hero-secondary`, `.hero .btn`, `hero-content a` and `Or Book a Session`. For each hit: an analytics selector that only counts clicks keeps working with one button (report); a test fixture that clicks the removed anchor is updated to the remaining one with a comment naming this plan; anything that would change behaviour beyond the hero is a stop-and-report.

## Verification

1. `npm run build`.
2. `npm run dom-integrity` exit 0 with every new entry consumed and nothing stale; `npm run dom-integrity:test` green.
3. `npm run visual-diff` (the measurement): every route other than `/` at 0.000%; `/` waivable metrics covered by the addendum; `/` unwaivable shift metrics pasted with numbers as the refused residual. `npm run visual-diff:test` (the self-test) still green, since the config loader is exercised by it.
4. `npm run quote-funnel:test`, `npm run events:test`, `npm run prices-version:test`, `npm run models-json:roundtrip`, `node scripts/jsonld.test.mjs`, `node scripts/csp-inline-hash.test.mjs`, `npm run lint:css`, `npm run fonts:test` if present. Do NOT run `models-json:selftest`.
5. Playwright from the worktree root against `dist/` served locally, 1440x900 and 390x844: a screenshot at t=200 ms (the hold: photograph untreated, no scrim, no top gradient, no text), at t=3000 ms (settled: bottom-left block, gradient behind it, one outline button, nav with its top gradient), with `prefers-reduced-motion: reduce` emulated (everything composed, scrims on), and with JavaScript disabled (scrims on, text visible). Save under the scratchpad `hero/relay/`. Also one screenshot at 1440 scrolled by `--hero-runway` to show where the button sits while the image holds (Jen flagged the old buttons parking under the nav; report whether the new block does). The nav-contrast numbers from 1f. The 390 shots do not prove the iOS toolbar case; 1e's `svh` unit and a look on Lee's phone after deploy do.
6. `node scripts/update-decisions.mjs --check` prints `entries: 16`.
7. Razor on the diff; Jen on the rendered result against her `variant-c` render.

## Out of scope (Parking Lot, Stage 3.5)

- The thesis block below the hero, the 1px breathing scroll cue, and George's thesis lines: composition A's furniture, kept on the artifact for a later pass.
- `--hero-runway` behaviour (buttons parking under the nav while the image holds): report only.
- The `.page { animation: fadeIn 0.8s }` tint (styles.css ~692), already in the Parking Lot.
- Any change to sub-page heroes.

## Critic round 1 (FAIL) folded, 2026-09-04

Six must-fixes from the first critic pass are folded above: the measurement script and the single-entry waiver rule (section 5, verification 3); `delete-subtree` for the twinned anchor (section 4); `.js` gating, the `reveal--quick` mirror and the `--i:1` delay for the scrim (1c); `100svh` for the mobile stage and the iOS toolbar named (1e); nav contrast measured with Jen's top gradient (1f); the reference render's scope and the worktree start point (header). A fresh critic reads the folded plan before Ted starts.

## Critic round 2 (CONCERN) folded, 2026-09-04

Three must-fixes folded: the mobile stage height subtracts the nav band (1e); the anchor is one `delete-subtree` entry, no text twin (section 4); the scrim transition is armed on `.js.reveal-ready` and the reduced-motion mirror sits at `.js .hero::after` specificity (1c). Advisories folded: the top gradient is measure-first because the nav already carries its own 0.72 scrim (1f); the merge to main is the visual-diff baseline advance (section 5). Round 2 confirmed no in-repo analytics counted the removed anchor and that X1, X2, X3 and X7 do not fire. Three rounds is the cap; the round-2 items were line-level, so the plan proceeds to Stage 1 on this fold.

## Rollback

`git revert` of the relay's commits, or Netlify rollback. No data, no migrations.

## Risks

- The reveal manager may set its visible state on a class this plan has not named; the worker finds it in the code rather than guessing, and if the reveal is driven by inline style rather than a class, the scrim falls back to a CSS transition-delay equal to `--hero-hold` plus the pair's own delay, with a comment saying why.
- A bottom-anchored block at 390 with a long headline wrap could collide with the bottom edge; the 5.5rem inset and `max-width: 26ch` are the guard, and the 390 screenshot is the proof.
- The visual-diff harness refuses to start after 2026-10-05; the new waiver expires with the others so nothing is orphaned.
