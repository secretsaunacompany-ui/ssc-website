# Critic review: hero-composition-c

Plan: `.claude/plans/hero-composition-c.md`. Rubric v2. Claims checked against the worktree at `69328a1`.

## Applicability

Public marketing site for a small business, mobile-heavy, live Netlify deploy, one booking link carrying the venue's opening weekend (Sep 5-7).

- **X4 Audience/brand: FIRES, [GATING].** Raised from advisory: the single remaining button is the only above-the-fold path to booking on opening weekend; a hidden button or unreadable nav is a revenue defect.
- **X5 Concurrency: fires, [ADVISORY].** The scrim's transition must agree with the reveal clock and the escape hatch.
- **X6 Operability: fires, [ADVISORY].** Ships to production.
- **X1 no:** CSS and markup, nothing physical. **X2 no:** no personal or client data; UTM unchanged. **X3 no:** no research or new factual claim. **X7 no:** no MARVIN hook or gate changes; `decisions_amend` is a documented write path. **X8 no.**

## Core dimensions

1. **Problem-fit: CONCERN.** Skip line present and specific. But `variant-c.html` is not what the plan builds: it holds ONE line (`--text-3xl`, 26ch) bottom-left, no subtitle, no button, plus a `.topscrim` (22svh top gradient) behind the nav. The plan ships h1 at `--text-4xl` + subtitle + 16rem button at Jen's 3.5rem/5.5rem insets, which were tuned for one line. Lee approved the button and subtitle, so the content is right; but Stage 3 "against variant-c" diverges by construction. Fix: variant-c governs position, gradient and hold; contents are per Lee 2026-09-04; the inset is re-derived for a three-element block and reported.
2. **Approach soundness: CONCERN.** Mechanism confirmed: `RevealManager` sets class `seen` (animations.js:193, 423, 445) and `reveal--quick` (l.192) on `.hero-content`, so `.hero:has(> .hero-content.seen)::after` keys correctly. Three gaps: (a) the content's delay is `calc(var(--i) * var(--stagger-step))` with `--i:1` on `.hero-content`; a `.hero::after` pseudo-element inherits from `.hero`, where `--i` is unset, so "reuse the token" yields 0ms and the scrim leads the text by 120ms. Write `calc(1 * var(--stagger-step))` with a comment naming `.hero-content.reveal--held { --i: 1 }`. (b) No `.reveal--quick` mirror: on early input the text fades in 350ms at zero delay while the scrim runs 700ms plus delay; type lands on the untreated photograph for half a second. Add `.hero:has(> .hero-content.reveal--quick)::after { transition-duration: var(--transition-quick-reveal); transition-delay: 0s }`. (c) `.hero::after { opacity: 0 }` ungated on `.js` leaves a no-JS visitor with type over an untreated photograph forever; the hidden state must be `.js .hero::after`, matching `.js .reveal`.
3. **Completeness: CONCERN.** The nav. Jen added `.topscrim` because with `brightness(0.7)` and the scrim's 0.2 top band gone, CONTACT and BOOK sit on bright cedar (see `variant-c-1440-settled.png`). The plan deletes both treatments and adds nothing. Worker must measure nav-link contrast at 1440 settled and add the top gradient, or report it passes.
4. **Right-sizing: PASS.** Four files, no new primitives, Parking Lot named.
5. **Security: PASS.** href and UTM unchanged; `pointer-events: none` retained.
6. **Failure modes: CONCERN.** Reduced motion handled; no-JS and the escape hatch are not (2b, 2c).
7. **Change safety: PASS.** Branch, revert, Netlify rollback; push waits for Lee.
8. **Data integrity: CONCERN.** The removed anchor cannot be declared as written. `href="/contact/" class="btn"` has an identical twin at home.njk:173 (`Get Your Quote`); element `contains` sees attributes, not text, so any substring matches two nodes and the specificity check refuses a count-1 entry. Use `op: "delete-subtree"` (path + measured `textHash`, the hero-intro precedent) plus a `kind:"text"` removal for `Plan My Sauna Design`. Baseline confirmed: `main` = `origin/main` = `69328a1` and it is the default `--baseline`. But the plan's repo path `~/Projects/ssc-website` is checked out on `relay/cloudinary-migration` at `8a547a3`; the relay must start a fresh worktree off `69328a1`.
9. **Verifiability: FAIL.** (a) `npm run visual-diff:test` is `visual-diff.test.mjs`, the harness self-test; it measures no page. The measured run is `npm run visual-diff` (`--baseline main --candidate WORKING`). As written the worker gets green from fixtures and writes a waiver with no numbers. (b) "add an `expectedToChange` waiver for `/`": `scripts/lib/gate.mjs:212` throws `duplicate expectedToChange entry for /`. The pattern, used five times in that entry, is a dated addendum appended to its `reason` with measured `changedPct`, `layoutShiftMaxPx`, `heightDelta`, `shiftCoverage` per width. "18 waivers for `/` at some width" misreads the file: 18 is the route count. (c) Shift gates are UNWAIVABLE and `/` may never carry a pageOverride. Moving the block from centre to bottom-left is real layout inside the hero band; expect `layoutShiftMaxPx` red at 390 and `shiftCoverage` red at 1440, as every prior hero change recorded. "Green with the new waiver" is likely unattainable; the honest criterion is "every other route 0.000%, `/` reds recorded as refused residuals with numbers".
10. **Maintainability: PASS.** Comments cite the ruling; `_notes` follows the last relay's shape.

## Conditional dimensions

- **X4 [GATING]: CONCERN.** `.hero > .hero-content { height: 100vh }` is unconditional (styles.css:842), so below 768 the stage is `--nav-band` + 100vh, and 100vh on iOS Safari is the large viewport. A bottom-anchored h1 (2 lines at 40px) + subtitle (2 lines) + 48px margin + button is about 260px; at 5.5rem inset the button's bottom edge sits roughly 90px above the 100vh floor, inside the toolbar band on a first-paint iPhone. The one CTA can be half-hidden until the visitor scrolls, and Playwright at 390x844 has no toolbar, so step 5 cannot see it. Jen's render uses `100svh` for this reason. Fix: `100svh` for the mobile stage items, or an svh-measured inset; state the guard. Subtitle, label, href, UTM: correct. No em dash; "handcrafted" survives per the 2026-09-04 ruling.
- **X5 [ADVISORY]: CONCERN.** See 2b. Scrim end 1600+120+700 < SETTLE_MS 2720, so the events agreement fixture (events.test.mjs:996-1004, reads `.hero-content` only) is unaffected.
- **X6 [ADVISORY]: PASS.**

## Ruling amendment

`match` hits exactly one of 16 headings. `kind: "amend"` strikes nothing: it appends `**Amended, Lee, 2026-09-04:** <text>` to the entry body and suffixes the date line `, amended 2026-09-04` (update-decisions.mjs:344-360). `--check` prints `entries: 16`. Accurate.

## Selectors and suites

Nothing selects the hero buttons. `rhythm.test.mjs:300` reads `.hero h1` clearance from the nav (bottom-anchoring increases it); `js/analytics.js` has no hero selector. `--hero-scrim` is consumed only by `.hero::after` (styles.css:926; 938 is a comment). No second token needed.

## Stress tests

**Pre-mortem.** (1) Opening weekend, iPhone: the Book button sits under Safari's toolbar. (2) The loader throws on the second `/` waiver; the worker deletes the old entry and its five addenda of measured history. (3) Nav links unreadable over cedar at 1440; the fix round eats Saturday.

**Assumptions.** (a) `:has()` acceptable on the visitor base: high. (b) One-line insets survive a three-element block: low. (c) `/` shift gates stay green: low. (d) Lee's approval covers a hero with no top scrim: unverified; Jen's render had one.

**Inversion.** C as Jen drew it (one line, button in the thesis block below) wins if the 390 stack is too tall or the button hides under the toolbar. (b) may already make that true; the 390 shot decides.

## Verdict

Design right, approved by Lee; the verification and declaration steps are wrong against the code in ways that would yield a green run that measured nothing and a config the loader refuses. Core 9 fails; the mobile CTA and the scrim gating could embarrass the site this weekend.

VERDICT: FAIL

**Must-fix, in order**
1. Verification 3: `npm run visual-diff`, not `:test`; append a dated addendum to the existing `/` entry, never a second entry; define green as "all other routes 0.000%, `/` shift reds recorded as refused residuals with numbers".
2. Section 4: declare the removed anchor as `delete-subtree` plus a `kind:"text"` removal; `contains` cannot name it.
3. Section 1c: gate the hidden scrim on `.js`; add the `.reveal--quick` mirror; delay `calc(1 * var(--stagger-step))`.
4. Section 1e: `100svh` (or an svh-measured inset) for the mobile stage; name the iOS toolbar; the 390 Playwright shot is not proof.
5. Measure nav-link contrast at 1440 settled; add Jen's top gradient if it fails.
6. Reference governs position and gradient only; re-derive the inset; start the worktree from `69328a1`, not `~/Projects/ssc-website`.
