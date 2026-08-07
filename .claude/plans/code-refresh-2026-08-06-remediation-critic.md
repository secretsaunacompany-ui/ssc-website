# Critic Review — code-refresh-2026-08-06-remediation.md

Reviewer: independent critic (session model, no override), rubric v2.
Method: every batch item verified against the actual tree at `refresh/2026-08-06`
(baseline 7b506b5) — cited files opened, line numbers checked, test nets traced to
their suites, and two claims tested empirically (dist/faq garbling; the proposed
`on\w+=` sweep regex run against dist).

## Applicability block

**Project type:** live production static site (Eleventy, secretsaunacompany.ca) +
Netlify serverless functions + the project's own test/gate harness. Remediation of
audited defects (Bucket D) and test-infrastructure refactors (Bucket B).

**Conditional dimensions:**

| Dim | Fires? | Severity | Why |
|---|---|---|---|
| X1 Physical & human safety | **No** | — | Software-only website work; no hardware, hazardous output, or control path anywhere in scope. Explicit negative attestation. |
| X2 Privacy & data stewardship | Yes | **GATING** | D5/D6 touch the contact form's PII flow and processor disclosure; analytics events added (contact_submit_error). |
| X3 Evidence & source integrity | Yes | **GATING** | D7 removes false public claims; replacement copy must trace to doc 13, not be invented. |
| X4 Audience, brand & money accuracy | Yes | **GATING** | Public-facing copy, schema.org data, and a standing no-pricing-changes constraint. |
| X5 Concurrency & re-entrancy | Yes | Advisory | In-memory rate limiters (B5), harness scratch dirs, no long-running shared state beyond what exists. |
| X6 Operability & observability | Yes | Advisory | Deployed functions (D2, D10), deploy-time checklist items docked to Lee. |
| X7 Self-modification safety | **No** | — | B1/B2 modify the *project's* test gates (gate.mjs, suite guards), not MARVIN's hooks/gates/skills. Fail-closed discipline for those project gates is assessed under core 7/9. Explicit negative attestation. |
| X8 Dependencies, performance & cost | Yes | Advisory | Leaflet SRI pinning (existing dep, no new packages), Node 18→22 runtime bump. |

---

## Core dimensions (all gating)

**1. Problem-fit — PASS.** Each item maps to a verified audit finding; Lee's four
rulings (A+B+D, advisor code gate, review schema removal, blog deletion) are
implemented, not re-litigated. Constraints honored: no pricing value moves (S4
markup fix explicitly declined), nothing assumes a deploy (D10's production
verification is docked to Lee's deploy checklist).

**2. Approach soundness — PASS.** Spot-verified the load-bearing mechanics:
- **D1** — defect real (`booking-ops.html:579` carries the onsubmit attribute; CSP
  grants hashes to script *elements* only). Fix is correct: the form (l.579)
  precedes the inline auth script (l.644), so an addEventListener binding at
  script-eval time finds the element; `handleLogin` already calls
  `event.preventDefault()` synchronously. The hash pairing IS enforced: booking-ops
  .html is passthrough-copied to dist, and csp-inline-hash.test.mjs's final check
  sweeps *every* dist HTML for undeclared inline scripts — editing the auth script
  changes its hash and goes red until netlify.toml is updated in the same commit.
- **D3** — defect real (analytics.js:215-219; all page scripts deferred via
  scripts.njk with the cross-origin tracker last; deferred execution sees
  `readyState === 'interactive'`, so the else-branch fires trackPageState before
  tracker.js evaluates). The fix's semantics are right: ALL deferred scripts,
  including the cross-origin one, evaluate before DOMContentLoaded fires, so a DCL
  listener is guaranteed to run after the tracker exists. (Edge noted under
  Completeness.)
- **D5** — defect real (forms.js:44-46 treats `response.ok` alone as success;
  failure is an alert with no event). The port source exists: modal.js
  discriminates on `next` (l.1294, 1393 comments; Formspree's own client checks
  it) and has the error-rendering + `quote_submit_error` pattern (l.1254-1294).
- **D2** — hedged correctly: no `[functions]` block in netlify.toml means Netlify's
  default zisi/nft bundler, which traces static relative `require()`s of JSON;
  the env-var fallback fails closed if that assumption breaks. (Test-durability
  concern below.)

**3. Completeness — CONCERN.** Three genuine gaps, all fixable in-plan:
- **D9 grep scope misses styles.css.** `.blog-list/.blog-card/.blog-post__*` rules
  live at styles.css:3699-3760+; the plan's reference sweep covers only `src/` and
  `.eleventy.js`. After deletion those ~60 lines are dead weight the audit's own
  dead-CSS item (Bucket A) doesn't name. *Fix:* extend the D9 sweep to styles.css
  and delete the `.blog-*` rules in the same commit, or record them as an explicit
  residual. (Everything else about D9 is clean: `permalink: false`, zero posts,
  no dist/blog, no nav/sitemap/footer references; sitemap.njk's use of the `date`
  filter survives because only the collection block is deleted.)
- **D3's 'complete' guard has a named-but-unnamed residual.** `readyState ===
  'complete'` covers injection after `load`, but a script evaluated *between* DCL
  and load still reads `'interactive'`, its DCL listener never fires, and the
  event is lost. Production never hits this (analytics.js is always a deferred
  script, hence pre-DCL), so the fix is correct for the live defect — but the
  plan's "covers late injection" claim overstates. *Fix:* one comment in the code
  naming the residual window; no behavioral change needed.
- **D7(a) wording could mislead the implementer.** The plan says "→ BAG per doc
  13:356", but doc 13's *approved home-card sentence* (the one the plan orders
  copied verbatim, doc 13 'Try a session' card) is venue-neutral: "Sit in one
  before you decide. Our saunas run at partner locations around BC; book an hour
  and judge the heat yourself." Doc 13:356 is the *removal* ruling, not
  replacement copy naming BAG. *Fix:* drop the "→ BAG" shorthand; cite the card
  sentence directly so nobody invents a BAG mention on the home card.

**4. Right-sizing & reuse — PASS.** Consistently reuses what exists: modal.js's
success predicate and error rendering (D5), the modal's verbatim processor
sentence (D6, verified at sauna.njk:418), the jsonld filter (D4), doc 13's
approved copy (D7), lib/rate-limit.js (B5), pageOverrides' existing expiry
validation as the template for B1. B4 contains its own scope escape valve
(demote focus work rather than ship it unpinned). Per-suite mutate() helpers
correctly left alone in B3.

**5. Security — PASS.** D1 removes the last real inline handler without touching
CSP strictness (verified: the only true `on*=` attribute in all of dist is the
booking-ops onsubmit). D2 closes an unauthenticated Anthropic-spend hole and
fails closed on both paths; the ANTHROPIC_API_KEY-unset recommendation is the
right belt-and-suspenders. D8 adds SRI + crossorigin to the one remaining
un-pinned CDN load. B3's shared serve() *gains* path-traversal refusal. Nothing
widens any policy.

**6. Failure modes — PASS.** D2 returns 503 before touching the client; the env
fallback defaults to disabled. D8 converts a silent CDN-failure hang (the
current promise literally never rejects — verified navigation.js:32-54) into a
loud rejection. B2 makes the stale-dist failure mode fail closed with a named
remedy. Advisory: D8's new rejection needs a handler at the navigation.js call
site (`loadLeaflet().then(...)` today has no `.catch`), or the "loud in console"
is an unhandled-rejection warning rather than a designed message.

**7. Change safety — PASS.** Each item is its own commit with suites green;
branch-only, deploy explicitly Lee's; D10's runtime risk is contained by pinning
production verification to the next draft deploy. The equivalence gate
(whole-diff review + visual-diff/dom-integrity with declared intended changes)
is the right final interlock.

**8. Data integrity & compatibility — PASS.** Pricing surfaces untouched by
construction (the one item that would touch them is declined). B1's migration
preserves the three entries' reason text and keeps "/" in expectedToChange —
which is the *only* compliant home for it, since the repo's calibration rule
forbids any pageOverride naming "/" (the entry's own reason documents this, and
B1 respects it). 60-day stamps sit inside gate.mjs's 90-day horizon. D4 cannot
trip the jsonld filter's fail-closed throw: all 11 faq items carry string
question/schemaAnswer (checked).

**9. Verifiability — CONCERN.** The mutation discipline (new assertions
demonstrated red pre-fix) is exactly right where specified (D1, D3, B1, B2), and
D3's new scenario genuinely kills a tautology — events.test.mjs today installs
the tracker via `page.addInitScript` (verified, l.464+), an ordering production
never has. Three holes:
- **B2's freshness list omits the root-level passthrough inputs.** styles.css,
  js/**, src/** — but booking-ops.html and booking-ops.js are dist inputs too
  (addPassthroughCopy, verified in .eleventy.js), and .eleventy.js itself shapes
  every built page. booking-ops.html is *precisely the file D1 edits*: with the
  guard as specced, an unrebuilt dist lets csp-hash certify the pre-fix page —
  the exact class B2 exists to kill. *Fix:* add booking-ops.html, booking-ops.js,
  and .eleventy.js to the mtime set.
- **D1's companion sweep regex false-positives as written.** A bare `on\w+=`
  matches every `content=` attribute ("c**ontent=**") — empirically 50+ hits per
  page across dist meta tags. *Fix:* anchor to attribute position (scan inside
  tags for `[\s"']on\w+\s*=`, or parse tag attributes), and mutation-check both
  directions: red on the pre-fix booking-ops.html, green on a page dense with
  `content=` metas.
- **D2's gate test inverts the day the advisor ships.** "Require the handler with
  the flag off and assert 503" reads the *live* site.json, so enabling the
  feature later flips the test red (or worse, someone deletes it). *Fix:* the
  test must control the flag — inject/stub it (env override path, or module
  seam) and assert both branches: off→503 with no network, on→gate passes
  through to validation. Also operationalize "VERIFY the bundler includes it":
  run `npx @netlify/zip-it-and-ship-it netlify/functions <out>` locally and
  inspect the bundle for site.json — otherwise "verify" silently becomes "assume".
- (B3's verification weakness is scored under Maintainability, where the claim
  lives.)

**10. Maintainability — CONCERN.** The refactors all reduce drift (B3's SKIP
union resolves a real divergence — verified: build-ref.mjs excludes
`.netlify`/`.cache` but not `.probe`; the five suites exclude `.probe` but not
`.netlify`/`.cache`). Two accuracy points:
- **B3's "same assertion counts" is weak evidence.** Counts can match while an
  assertion's meaning changes. *Fix:* diff the suites' PASS-line *names* (full
  output) before vs after the extraction — cheap and strictly stronger.
- **B3 is not a pure no-op and shouldn't claim to be.** Deriving the shared SKIP
  from the union newly excludes `.netlify`/`.cache` from five suites' scratch
  sites and adds traversal refusal to three serve() copies — both strictly
  safer, but they are behavior changes; name them in the commit rather than
  under a "behavior-preserving" banner.

---

## Conditional dimensions

**X2 Privacy & data stewardship — PASS [GATING].** D6 extends the exact approved
processor disclosure to the second PII-collecting surface and makes /privacy/
discoverable site-wide (verified: today the only /privacy/ link in templates is
sauna.njk:418). D5's new contact_submit_error mirrors quote_submit_error's
enum/code shape — analytics.js's structural denylists (name/email/phone/message
substrings + value-shape guards) already strip anything PII-shaped from any new
event, so the addition rides existing enforcement. The doc 14 §8 amendment keeps
the event vocabulary honest.

**X3 Evidence & source integrity — PASS [GATING].** Every copy change traces to
an approved source: doc 13's home-card sentence (verified present), doc 13:356's
Aldergrove-removal ruling (verified verbatim), the modal's processor sentence
copied not paraphrased. The Progress Way address/openingHours question is
correctly *not* guessed at — parked on doc-13 NEEDS-LEE item 7 (verified, doc 13
l.554) and surfaced in the report. Subject to the D7(a) wording fix under
Completeness.

**X4 Audience, brand & money accuracy — PASS [GATING].** False Aldergrove claims
removed (both live instances found and only those two exist in src/ — verified
by sweep); self-serving SearchAction/aggregateRating/Review schema deleted per
Lee (verified at head.njk:160/209/218/230/242); LocalBusiness core retained;
pricing values untouched by construction. B6's visible tracking change on the
/locations/ filter buttons is honestly declared for the equivalence gate rather
than smuggled (and the four mixed-case raw-value survivors match the actual
stylesheet: .hero-subtitle:862, .btn:1573, .lightbox-counter:2641,
.link--accent:3104 — .map-filter-btn:2448 is indeed the only uppercase one).

**X5 Concurrency & re-entrancy — PASS [ADVISORY].** B5 swaps to the sliding-window
limiter advisor.js already uses; per-function in-memory state is the platform's
normal isolation. B2's mtime guard is racy only against a build running mid-test,
which the suites' existing scratch-site pattern already tolerates.

**X6 Operability & observability — PASS [ADVISORY].** Deploy-time checks (ops
auth round-trip, advisor 503, connect-src unpkg verification) are explicitly
docked to Lee's deploy checklist instead of pretending local coverage. D8's map
residual (no suite covers it) is recorded, not hidden. Recommend the report
also carries the ANTHROPIC_API_KEY-unset item prominently — it's the cheap half
of D2's defence and easy to lose in a checklist.

**X8 Dependencies, performance & cost — PASS [ADVISORY].** No new packages; SRI
pins an existing CDN artifact; Node 22 verified locally (node v22.22.1, eleventy
2.0.1 pinned exact). One advisory: D8's SRI hashes are computed from unpkg at
implementation time — trust-on-first-fetch. Cross-check the hash against a
second source (jsdelivr's copy of leaflet@1.9.4 or the GitHub release) before
embedding; one command, closes the "pinning a compromised artifact" corner. And
give the CSS `<link>` the same integrity treatment as the JS, which the plan
implies but should state.

---

## Stress tests

**Pre-mortem (3 months out, it failed):**
1. *The csp suite certified a stale page.* D1 landed, but a later edit to
   booking-ops.html was tested against an old dist — B2's guard watched only
   styles.css/js/src and never refused. The login loop returned in production
   with 14 suites green. This is the type-specific worst case (a gate that fails
   open) and it is live in the plan as written — must-fix #1.
2. *Advisor got enabled and the gate test went red — so it got deleted.* The
   functions-gate test hard-coded "flag off → 503" against live site.json;
   flipping the feature made it fail, and under deadline the test (not the gate)
   was removed. Six months later the gate was refactored away with nothing
   watching. Must-fix #3.
3. *The attribute sweep cried wolf and was silenced.* The unanchored `on\w+=`
   regex flagged every meta `content=` on day one; it got "fixed" with a
   hastily-scoped pattern that also stopped matching real handlers, and the
   class-killing assertion became decorative. Must-fix #2.

**Load-bearing assumptions:**
1. *Netlify's default bundler traces the site.json require* — medium-high
   confidence (zisi/nft static-require tracing, no bundler override in
   netlify.toml — verified absent); consequence if wrong is the env fallback,
   which fails closed. Resolve pre-implementation with the zip-it-and-ship-it
   inspection rather than at deploy.
2. *Deferred scripts always evaluate before DOMContentLoaded* — spec-guaranteed
   and load-bearing for D3; high confidence; residual is only the post-DCL
   injection window named above.
3. *The two declared CSP hashes are exactly reveal-boot + the booking-ops auth
   script* — the suite's whole-dist sweep enforces this today (it passes at
   baseline), so D1's recompute has a closed loop; high confidence.
4. *events.test.mjs's end-of-body tracker installation faithfully reproduces
   production ordering* — the mechanism (script tag at end of body vs
   addInitScript) matches how the real tracker loads; the required red-run
   against pre-fix code is the proof, and the plan mandates it.

**Inversion — what would make the rejected alternatives win?**
- *Env-var gate instead of site.json require (D2):* wins if bundling proves
  unreliable or if Lee wants to toggle the advisor without a commit. The plan
  already contains this as its fallback, so the inversion is priced in.
- *Deleting the advisor function outright:* wins if the feature is never coming
  back. Lee ruled code gate, and the gate is ~5 lines with a test — the ruling
  costs little even if deletion later proves right.
- *pageOverride instead of expectedToChange for "/" (B1):* can never win — the
  calibration rule forbids it structurally; the plan correctly doesn't try.
- *Full unused-fails-loud parity for expectedToChange:* wins if zero-fire
  windows turn out rare; the warning-first approach generates exactly the data
  to decide at next refresh. Sound sequencing.

---

## Overall verdict

**APPROVE WITH CHANGES.** Every diagnosis in the plan checked out against the
tree — locations, line numbers, and mechanism all real, including the subtle
ones (the CSP hash-pairing loop actually closes through the whole-dist sweep;
the WP-0a suppression seam is untouched by D5; "/" correctly stays out of
pageOverrides; the two drifted SKIP lists exist exactly as claimed). Lee's four
rulings are implemented soundly. The gaps are all in the *nets*, not the fixes:
one gate that would fail open on exactly the file this plan edits (B2), one
assertion that false-positives structurally (D1 sweep), one test that inverts
on a planned future state (D2), plus three smaller accuracy/scope items. All
are one-line-to-one-paragraph fixes inside the existing plan shape; nothing
requires re-planning.

## Prioritized must-fix list

1. **[B2 / gates fail open]** Add `booking-ops.html`, `booking-ops.js`, and
   `.eleventy.js` to the stale-dist mtime set. As specced, the guard misses the
   exact file D1 edits, and csp-hash can certify a pre-fix page.
2. **[D1 / sweep regex]** Anchor the `on\w+=` companion sweep to attribute
   position within tags — the bare pattern matches every `content=` meta
   (verified: 50+ false hits in dist). Mutation-check red on pre-fix
   booking-ops.html AND green on a meta-dense page.
3. **[D2 / test durability + verification method]** The functions-gate test must
   control the flag (stub/inject; assert off→503 and on→pass-through), not read
   live site.json. Verify bundling locally via `npx @netlify/zip-it-and-ship-it`
   inspection before choosing the require path over the env fallback.
4. **[B3 / evidence honesty]** Verify behavior preservation by diffing PASS-line
   names before/after, not assertion counts; name the two real behavior deltas
   (`.netlify`/`.cache` newly excluded, serve() traversal refusal) in the commit
   instead of claiming a pure no-op.
5. **[D9 / scope]** Extend the reference sweep to styles.css and delete (or
   explicitly record as residual) the ~60 lines of dead `.blog-*` rules at
   styles.css:3699+.
6. **[D7a / wording]** Replace the "→ BAG" shorthand with the actual doc 13
   home-card sentence (venue-neutral, names no location) so an implementer
   cannot introduce a BAG claim doc 13 never approved for that card.

Advisory (non-blocking): comment D3's post-DCL/pre-load residual window; give
D8's CSS link the same integrity attribute and add a `.catch` at the
loadLeaflet() call site; cross-check SRI hashes against a second source; keep
the ANTHROPIC_API_KEY-unset recommendation prominent in the report.
