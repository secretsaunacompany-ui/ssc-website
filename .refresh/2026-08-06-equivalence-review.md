# Equivalence Review — code-refresh 2026-08-06 — Stage 6

Reviewer: fresh Fable session (no model override), cold eyes, whole diff.
Range reviewed: `7b506b5..0dd1540` (26 commits on `refresh/2026-08-06`; the
briefed range ended at 285349b — the coordinator extended it mid-review with
0dd1540, the lightbox focus-strand fix, which is included below).
Plan: `.claude/plans/code-refresh-2026-08-06-remediation.md` (critic rounds 1–3
folded). Declines: `.refresh/2026-08-06.md`. Plan decisions were NOT re-litigated.

## Verdict: PASS WITH NOTES

The execution matches the plan, the behavior-preservation claims are true, the
constraints held, and the new assertions are live in both directions. Four
notes, two of which should be resolved before merge; none is a behavioral
defect in the shipped pages.

---

## 1. Behavior-preservation claims — VERIFIED

Each commit claiming preservation was checked against its own diff, not its
message:

- **bb38a59 ROADMAP restore** — doc only; ROADMAP.md is not a build input
  (Eleventy input dir is `src/`, no passthrough). Restored post-deploy record
  is coherent with the drift narrative in the refresh log.
- **1359e68 doc banners** — prose-only additions to docs 13/14/35.
- **b874d06 dead CSS (~290 lines) + nav booking hook** — grep-verified zero
  references for every deleted family (`booking-option`, `booking-summary`,
  `booking-form-container`, calendar/time-slot/no-slots, `.info-section`,
  `.content-wrapper--800`, `.full-width-image-wrap`, `.has-error` arms;
  `model-capacity`/`has-error` survivors are comments only). The removed
  navigation.js hook gated on `#bookingCalendar` / `.booking-section` /
  `SSC.initBookingSystem` — none defined anywhere since e710007. The
  fonts.test A15 edit removes only the assertion on the deleted selector,
  deliberately and documented in-place.
- **c2eb935 postgres uninstall** — package.json + lockfile only; no import
  anywhere.
- **952d8e0 CSP trim** — dropped `cdn.jsdelivr.net`, `script.google.com`,
  `X-XSS-Protection` only; grep confirms zero consumers (one jsdelivr mention
  survives — a comment). `unpkg.com` kept in all three lists per plan
  (connect-src pending draft-deploy, recorded in the "no" list).
- **c015e00 error-token swap** — `.advisor__error p` only; advisor is dark
  (`features.advisor: false`), nothing renders it.
- **127ee38 comment amendments** — comments only in modal.js,
  visual-diff.mjs, dom-integrity.mjs headers.
- **094dd84 B3 suite-helper consolidation** — mechanically verified: the
  `check()` name sets of all five suites are IDENTICAL across the commit
  (empty diff, exactly the discipline critic r1 demanded). The two named
  non-no-op deltas (scratch copies newly exclude `.netlify`/`.cache`/
  `.dom-integrity`/`.rhythm`; `serve()` gains path-traversal refusal) are both
  strictly tightening; per-suite `mutate()` helpers untouched as planned.
- **add5c13 blog deletion** — baseline `src/blog.njk` carried
  `permalink: false`, so no `/blog/` artifact ever built: deletion is
  output-neutral. Zero `blog` references remain outside one comment; the
  `date` filter correctly survives for the sitemap.

Corroboration: the full-range pixel run (report.json, 7b506b5 → 285349b,
38 pairs) shows `booking-ops.html` at 0.000% both widths despite D1 editing
it, and every above-budget delta on every route decomposes into the declared
D/B causes (below). The A-bucket-only run (7b506b5..c015e00, zero change on
38 pairs) was reported by the orchestrator; I did not re-run it, but every
A-bucket commit is independently pixel-neutral by inspection, and the
full-range artifact is consistent with that.

## 2. Intended D/B deltas — ALL AUTHORIZED, NOTHING EXTRA, ONE PROMISED TEST MISSING

All 53 changed files attribute to a planned batch; no unattributed change
exists in the range. Batch-by-batch:

- **D1** — `onsubmit=` removed; binding added inside the already-hashed inline
  session script; `handleLogin` keeps `preventDefault()`. netlify.toml's second
  hash recomputed in the same commit, and the pairing is genuinely enforced:
  the suite hashes EVERY non-src inline script in dist against the declared
  list. New attribute sweep is anchored to tag innards per critic r1
  (mutation-verified live in this review — see §4).
- **D2** — gate placed after OPTIONS/405, before rate-limit/parse/client;
  matches plan and the test's asserted 503/405 ordering. `require` of
  site.json rests on the executed zisi probe (probe record in plan) plus the
  fielded prompts/faq.js precedent. `ADVISOR_ENABLED_OVERRIDE` is test-only,
  documented, operator-controlled surface.
- **D3** — readyState branch replaced exactly as specced; new events fixture
  delivers the tracker stub as the BODY of the real deferred script tag
  (production ordering, not addInitScript). init.js and scripts.njk are
  UNTOUCHED in the whole range — WP-0a's submit-listener ordering is
  undisturbed.
- **D4** — both faq.njk holes now `| jsonld | safe`; new jsonld suite scans
  all blocks with a vacuity guard (64 blocks on my build).
- **D5** — modal discrimination ported faithfully: 429 by status, success
  requires string `next`, no reset / no navigation on failure, inline error +
  mailto from `data-contact-email` (site.json single source),
  `contact_submit_error` with `rate_limited|rejected|network` codes;
  doc 14 §8 amended in the same commit as required. Error container added to
  contact.njk with `aria-live`, degrade-to-alert fallback if the container
  goes missing.
- **D6** — footer Privacy link (the +31px band on all routes in the pixel
  report); contact processor notice is character-identical to the modal's
  sentence in sauna.njk. Verified verbatim.
- **D7** — home card copy is character-identical to doc 13:80-82 (venue-
  neutral, no BAG claim); locations meta matches the real cards; SearchAction
  and the aggregateRating/reviews block deleted; LocalBusiness core, Progress
  Way address and openingHours untouched (open Lee decision, recorded).
- **D8** — SRI on both artifacts. **Hashes independently recomputed in this
  review** from the pinned unpkg files: both match exactly. onerror rejects;
  call site `.catch` degrades loudly. Residual thin coverage (no map suite)
  recorded as planned.
- **D9** — see §1 (blog).
- **D10** — NODE_VERSION 18→22, comment documents the deploy-time checklist;
  nothing assumes the deploy happened.
- **B1** — `validateExpiry` is TEXTUALLY IDENTICAL to the removed inline
  pageOverrides block (same four checks, same order, same messages) — the
  pageOverrides path validates exactly as before. expectedToChange expiry
  validation placed last in the chain (critic r3); three shipped entries
  stamped 2026-10-05; only the newly-false clause of the '/' reason amended;
  all three schema-doc surfaces updated (config `_notes`, README incl. the
  missing `waive`); fixtures stamped via clock-relative `stampDays` (critic
  r2); zero-fire is a warning; deploy-clock item recorded. '/' still carries
  no pageOverride — P6 green (164/164 in this review's own run).
- **B2** — `assertDistFresh` fail-closed, watched set includes
  booking-ops.html/js and .eleventy.js per critic r1, plus netlify.toml
  (extra, strictly tightening). csp-hash paths REPO_ROOT-anchored.
  Guard mutation-verified live in this review.
- **B3** — see §1.
- **B4 + 0dd1540** — {src, alt} collection, alt propagation, w_1600 upgrade,
  focus-to-close on open, capture/restore per critic r3, role/aria-modal on
  lightbox.njk (sitewide DOM delta, declared in the template comment). Scope
  cut (non-focusable invokers) recorded, not smuggled. **0dd1540 is a genuine
  defect fix to B4's own new code**, caught by its own suite: body.focus() is
  a no-op, so the restore stranded focus on the hidden close button. The fix
  blurs inside the lightbox unconditionally and restores only to a focusable
  invoker; the test now asserts the invariant (focus never inside the closed
  lightbox) instead of the implementation. Strictly tightening; approved
  under B4's authorization as a correctness completion of the same item.
- **B5** — inline limiter replaced with lib `checkRateLimit`/`getClientIp`,
  30/min kept, fixed→sliding shift documented. **Gap: the plan's promised
  401-auth characterization ("401 unset/wrong token") is absent from
  functions-gate.test.mjs** — only the IP-header preference and the 429
  refusal landed. See note N3.
- **B6** — `.map-filter-btn` → `var(--tracking-caps)` (0.05em → 0.14em, real
  visible delta, present in the pixel report as /locations/' coverage dip);
  four survivors carry named sanction comments deferring to Jen/WP-2.

**Pixel-report reconciliation (7b506b5 → 285349b, 38 pairs, 36 declared-red/2 pass):**
+31px footer band on every route (D6) accounts for the uniform shift-31/33 +
heightDelta reds; /contact/ carries D5+D6's larger recomposition with an
honest affine-does-not-fit refusal; / @390's 10.3% is D7's copy reflow;
/locations/ additionally carries B6's letterfit (coverage 0.986/0.976, unique
to that route); /saunas/ + /gallery/ ride their stamped waivers with shift
gates still live; booking-ops.html 0.000% control. No route moved that no
commit claims. Reds are declared, not waived — consistent with plan step 4.

## 3. Constraints — HELD

- **Pricing:** `git diff 7b506b5..HEAD` over js/data.js, src/_data/ (incl.
  models.json), and src/_includes/pages/sauna.njk is EMPTY. Every
  `pricesVersion` hit in the range diff is prose (ROADMAP/docs/plan), no
  value changed. The S4-default markup fix remains correctly declined.
- **No deploy assumed:** netlify.toml changes are inert until Lee deploys;
  D10/B1/D2 production checks are parked on a named deploy-time checklist
  (incl. the 2026-10-05 expectedToChange re-stamp clock and the
  ANTHROPIC_API_KEY unset recommendation).

## 4. Test integrity — SPOT-CHECKED LIVE, NON-TAUTOLOGICAL

Beyond reading the fixtures, this review re-ran mutations on the current tree:

- **csp attribute sweep:** injected `onclick=` into dist/index.html → RED
  (offender named); restored → 6/6 green.
- **stale-dist guard:** touched styles.css → csp-hash refuses loudly;
  freshened → green.
- **jsonld entity check:** injected `&#39;` into a dist FAQ schema block →
  RED; restored → 3/3 green.
- **functions-gate:** both flag directions asserted (503 with exact body /
  400 past the gate), plus the no-override mirror — inverts correctly the day
  the flag flips.
- **B1 rejections:** missing-expires / expired / beyond-horizon fixtures use
  clock-relative stamps; validation-order discipline keeps earlier rejection
  fixtures unstamped and valid.
- **lightbox:** real-alt precondition guards the alt-propagation check
  against vacuity; close assertion waits for the observable state.
- **D3 late-tracker:** stub evaluates at the real deferred position; the
  commit records the red-before/green-after demonstration.

## 5. Suite state — INDEPENDENTLY RE-RUN (static) + REPORTED (browser)

Run by this review on the tip (0dd1540) after a fresh build: lint:css clean,
stylelint-gate 16, cloudinary 16, csp-hash 6, jsonld 3, functions-gate 6,
prices-version 7, package-claim 8, build-cache 8, **visual-diff:test 164/164**
(incl. P6), **dom-integrity:test 114/114**. Not re-run here: models-json
roundtrip/selftest (untouched by the range). Browser counts from the
orchestrator's re-run: quote-funnel 89, events 76, fonts 31, rhythm 77,
lightbox 7 — all green. Nothing in the diff should redden them; the one thing
that already did (B4's focus strand) was caught and fixed in 0dd1540.

---

## Findings / notes

- **N1 (resolve before merge):** `.marvin-worktree.json` — session worktree
  metadata (local absolute paths, tmux session name) — was committed into the
  repo inside add5c13. Not a build input, zero page effect, but it does not
  belong in a production repo and will churn every session.
  `git rm --cached .marvin-worktree.json` + gitignore entry on this branch.
- **N2 (resolve before merge, or name the evidence):** the plan's equivalence
  gate calls for a **dom-integrity run 7b506b5..tip with intended changes
  declared**. dom-integrity.config.json is untouched in the range (zero
  whitelist entries scoped to a 7b506b5 baseline) and `.dom-integrity/` holds
  no report. The range makes real DOM deltas on all 19 routes (footer link,
  lightbox aria, contact additions, schema deletions, home/meta copy). Either
  the run happened with an uncommitted declaration set — in which case commit
  it — or the DOM half of the gate is still owed.
- **N3 (minor, carry as residual):** B5's promised 401-auth characterization
  (token unset/wrong) never landed in functions-gate.test.mjs. Two-assertion
  addition; fold into the next functions touch or the deploy-time checklist.
- **N4 (record only):** the full-range pixel run's candidate is 285349b, one
  commit short of tip 0dd1540. Acceptable — 0dd1540 changes only runtime
  focus behavior, invisible to a static capture — but the gate record should
  say so rather than imply the run covered the tip.
- **N5 (observation, no action):** the events suite's `one()` helper returns
  first-of-type, so "exactly once per visible failure" is not strictly
  count-asserted for `contact_submit_error`; same shape as the pre-existing
  quote assertions, not a regression.

## Prioritized must-do

1. N1 — evict `.marvin-worktree.json` from the branch.
2. N2 — produce/commit the dom-integrity range declarations, or record where
   that evidence lives.
3. N3, N4 — one-line residuals for the report; no code required before merge.
