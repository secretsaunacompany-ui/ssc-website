# Code-Refresh Remediation — ssc-website — 2026-08-06

Buckets D (verified live defects) + B (worthwhile refactors) from the 6-reader Fable
audit (workflow wf_9a7afbc5-38c). Bucket A (behavior-preserving cleanups) executes
inline outside this plan and is listed at the end for context only. Bucket C declines
are recorded in the audit report, not here.

**Baseline:** origin/main tip 7b506b5, branch `refresh/2026-08-06`, 14 suites green
(~600 assertions), build clean. Lee's rulings (2026-08-06): apply A+B+D; advisor
neutralized by code gate; self-serving review markup removed; blog plumbing deleted.

**Standing constraints:**
- Hands off pricing values: no change to js/data.js prices, models.json, pricesVersion,
  or sauna.njk option values (the stale S4-default markup fix is DECLINED to a future
  pricing-window batch for exactly this reason).
- Deploy trigger belongs to Lee. This plan commits to the refresh branch only.
- Every batch ends with the relevant suites green; full battery before the equivalence gate.

---

## Batch D — live defects (9 fixes, each its own commit)

### D1. Ops console login: CSP-broken inline handler
`booking-ops.html:579` carries `onsubmit="return handleLogin(event)"`. CSP hashes
cover `<script>` elements only; attribute handlers need `'unsafe-hashes'`, which the
policy (correctly) does not grant. In production the handler is refused, the form
default-submits (GET to same URL), and the login overlay loops.
**Fix:** remove the attribute; bind `document.getElementById('loginForm')
.addEventListener('submit', handleLogin)` inside the EXISTING inline auth script
(already hash-allowlisted). `handleLogin` keeps its `event.preventDefault()`. Recompute
the script hash and update `netlify.toml` script-src in the SAME commit (csp-hash:test
enforces the pairing — run it).
**Companion (from finding pd-3):** extend `scripts/csp-inline-hash.test.mjs` with a
sweep that fails on any inline event-handler ATTRIBUTE in any dist/*.html — kills the
class. CRITIC ROUND 1: the regex must be attribute-anchored — bare `on\w+=` matches
inside `content=` (c-ONTENT=) with 50+ false hits in today's dist. Use an
attribute-position pattern (e.g. `/\s(on\w+)\s*=\s*["']/` applied to tag innards, or
parse attributes properly), and mutation-check BOTH directions: red against the
pre-fix booking-ops.html, green on today's clean pages.
**Net:** csp-hash:test (extended). Verify the new assertion goes red against the
pre-fix booking-ops.html (mutation check) before the fix lands, or in the same commit
demonstrate via the suite's existing scenario mechanism.

### D2. Advisor function: dark front-end, dark back-end
`netlify/functions/advisor.js` is deployed and publicly POST-able while
`site.features.advisor=false`. Unauthenticated Anthropic-key spend risk.
**Fix (Lee's ruling — code gate):** at the top of the handler, before any parsing:
load the flag from `src/_data/site.json` (bundled at deploy: `require` with a relative
path — VERIFY the Netlify bundler includes it; if bundling is unreliable, fall back to
an `ADVISOR_ENABLED` env check defaulting to disabled, which fails closed). When off,
return 503 `{ error: 'advisor disabled' }` before touching the Anthropic client.
**Net:** no live suite covers functions. Add `scripts/functions-gate.test.mjs`,
dependency-free (stub event/context). CRITIC ROUND 1 — the test must CONTROL the
flag, not read live site.json (a live-flag read inverts the day advisor is enabled).
Inject the flag (env override or module injection) and assert BOTH directions:
flag off → 503 before any Anthropic/network touch; flag on → proceeds past the gate
(to the next validation error, no network needed). Bundling assumption
operationalized: verify locally with @netlify/zip-it-and-ship-it (in netlify-cli's
tree) that advisor.js's bundle carries site.json; if not, use the env-var gate
(ADVISOR_ENABLED, absent = disabled = fails closed) instead of the require.
**Note for report:** recommend Lee ALSO unset ANTHROPIC_API_KEY while the feature is
dark (belt and suspenders; not blocking).

### D3. book_page_view dropped by script ordering
`js/analytics.js:215-219`: with all scripts deferred, `readyState` is already
`interactive`, so `trackPageState()` runs before the cross-origin tracker (last
deferred script) has evaluated; `window.analyticsTracker` is undefined; event lost.
**Fix:** always defer to DOMContentLoaded (deferred tracker evaluates before DCL
fires): replace the readyState branch with an unconditional
`document.addEventListener('DOMContentLoaded', trackPageState)` guarded for the
already-fired case (`readyState === 'complete'` → run now, covers late injection).
**Net:** events.test.mjs gains a late-tracker scenario: install the tracker global via
a script tag at end-of-body (real production ordering) instead of page.addInitScript,
and assert book_page_view arrives. This scenario must FAIL against current code (run
before fix) and pass after — the suite currently certifies an ordering production
never has (finding js-secondary-1).

### D4. FAQ JSON-LD entity garbling
`src/_includes/pages/faq.njk:10,13` interpolate bare `{{ item.question }}` /
`{{ item.schemaAnswer }}` into JSON-LD; nunjucks autoescape emits `&#39;` into the
structured data (verified live in dist/faq/index.html).
**Fix:** `| jsonld | safe` on both holes, matching head.njk/saunas.njk convention.
(blog-post.njk's twin defect disappears with D9's deletion.)
**Net:** build + grep dist/faq/index.html for `&#39;` (add a one-assertion check to
an existing static suite if cheap; otherwise verify in-batch and note).

### D5. Contact form success predicate + failure visibility
`js/forms.js:44-46` treats any 2xx as success (fires contact_submit_success, resets,
navigates to thank-you) — the exact "green status proves nothing" mode the modal
client was rebuilt around; failures are a blocking alert() with no analytics event.
**Fix:** port modal.js's discrimination: success requires `response.ok` AND body
carrying string `next`. On failure: no reset, no navigation; inline error message
with mailto fallback (reuse modal.js's error-rendering pattern adapted to the contact
form's markup — add a single error container to pages/contact.njk); fire
`contact_submit_error` with status/code payload mirroring quote_submit_error's shape
(doc 14 §8 vocabulary — this ADDS an event name; document it in the doc 14 amendment
rather than silently, one line).
**Net:** events.test.mjs already drives the contact form (double-count scenarios);
add: (a) 2xx-without-next → error path, no success event, fields preserved;
(b) failure fires contact_submit_error. Characterize BEFORE changing: capture the
current happy path so the refactor provably preserves it.

### D6. Privacy discoverability + processor notice
/privacy/ linked only from the quote modal (ships on /saunas/ alone post-scoping);
contact form collects PII with no notice.
**Fix:** (a) footer.njk Quick Links gains a Privacy entry (all 19 routes);
(b) pages/contact.njk gains the same one-line US-processor + privacy-link note the
modal carries (copy the modal's sentence verbatim — George's approved copy, no new
prose invented).
**Net:** build + link check; dom-integrity/visual-diff will show intended adds at the
equivalence gate (declared there, not waived).

### D7. False claims + schema policy exposure
(a) home.njk:47 "Book a session at our Aldergrove location" — replaced by doc 13's
approved home-card sentence VERBATIM. CRITIC ROUND 1: that sentence is venue-neutral
and names NO location; do not introduce a BAG claim doc 13 never approved there;
(b) locations.njk:5 meta description drops Aldergrove (match the page's real cards);
(c) head.njk: DELETE the WebSite SearchAction block (no search exists) and the
aggregateRating + three anonymous review blocks (Lee's ruling). LocalBusiness core
stays. Progress Way street address / openingHours are NOT touched — blocked on doc-13
NEEDS-LEE item 7; recorded in report as an open Lee decision.
**Net:** build; grep dist for 'Aldergrove' (expect only truthful mentions, if any);
schema still parses (node JSON.parse on extracted blocks — extend the D4 check).

### D8. Leaflet SRI (advisory folds from critic round 1: the CSS <link> gets the
same integrity treatment as the script; the loadLeaflet() call site gains a .catch;
SRI hashes cross-checked against a second source before embedding)
`js/navigation.js:40-52`: add `integrity` (SRI hashes for leaflet@1.9.4 css+js,
computed from the pinned unpkg artifacts at implementation time — fetch once, hash
sha384, embed) + `crossorigin="anonymous"` + an onerror that rejects/releases the
pending promise so a CDN failure degrades loudly-in-console instead of hanging.
**Net:** manual browser check of /locations/ map (loads, tiles render); no suite
covers the map — note as residual thin coverage.

### D9. Blog plumbing deletion (Lee's ruling)
Delete src/blog.njk, src/blog/ (blog.json), src/_includes/blog-post.njk, and the
.eleventy.js blog collection block. CRITIC ROUND 1: the sweep extends to styles.css —
the `.blog-*` rule family (~60 lines, post-deletion offsets near the old :3699 region)
goes dead with the templates and leaves with them, same zero-reference verification
as the bucket-A CSS batch. Verify zero references remain (grep blog- across src/,
.eleventy.js, styles.css, js/) and the build emits no /blog/ artifacts.
**Net:** build + full static battery (collection removal touches .eleventy.js).

### D10. Node 18 → 22 runtime bump
netlify.toml NODE_VERSION 18 (EOL) → 22. Local: `node --check` all functions (already
passing), build unaffected (build runs on Netlify's image node, controlled by the same
pin — verify eleventy 2.0.1 + the build scripts run under 22 locally, which this
machine's node 22.22.1 already proves).
**Risk containment:** production verification (one /ops auth round-trip + advisor 503)
belongs to the next draft deploy — recorded as a deploy-time checklist item for Lee,
since deploy trigger is his.

## Batch B — refactors (each its own commit)

### B1. expectedToChange gains the expiry discipline pageOverrides already has
`scripts/lib/gate.mjs:140-176`: add mandatory `expires` (ISO date, ≤90-day horizon,
same validation as pageOverrides:281-309); an expired entry FAILS the run loudly;
an in-scope entry that fires on zero routes across a run emits a warning (full
unused-fails-loud parity deferred — baseline advances are rare and legitimate
zero-fire windows exist; warning now, revisit at next refresh).
Migrate the 3 live entries in visual-diff.config.json: attribute + stamp expiries
(60d), preserving their reason text — EXCEPT (CRITIC ROUND 2) the '/' entry's clause
"the schema has no expiry field for expectedToChange", which this change makes false:
amend that one clause to record the field's 2026-08-06 arrival, leave the rest
verbatim. CRITIC ROUND 3 — the schema-doc sweep has THREE surfaces, same commit:
(1) that reason clause; (2) visual-diff.config.json `_notes.expectedToChange` (add
`expires` to the documented shape, horizon + fail-loud noted, mirroring
`_notes.pageOverrides`); (3) scripts/README.md:72-82, whose example also omits the
already-mandatory `waive`. Advisory adopted: fixture stamps are computed from the
suite's injected `now`, never the live clock; the :1468-1478 rejection fixtures keep
their validation-order discipline and get stamps only where the parser reaches the
expiry check.
CRITIC ROUND 2, fixture migration: making `expires` mandatory crashes the suite's own
synthetic fixtures at loadConfig (the F1 waiver-immunity fixture ~:656-658 and the
G-fixture ~:770-777 pipe expiry-less expectedToChange entries through the same
parser). B1's scope includes sweeping EVERY synthetic expectedToChange fixture in
visual-diff.test.mjs and stamping expiries computed relative to loadConfig's injected
`now` — never hardcoded ISO dates, which either rot into time bombs or trip the
90-day horizon check.
CRITIC ROUND 2, deploy clock: a lapsed stamp on the '/' entry fails the ENTIRE
visual-diff run at loadConfig, and the entry's natural retirement trigger (baseline
advance) is Lee's deploy event — so "re-stamp or retire the three expectedToChange
entries by <stamped date>" goes on the deploy-time checklist beside D10's items, and
the report names the date.
**Net:** visual-diff.test.mjs gains: missing-expires rejected, expired fails loudly,
valid entry passes, zero-fire warns. Mutation discipline: each new assertion
demonstrated red against a deliberately broken fixture (the suite's existing pattern).

### B2. Stale-dist guard for the three dist-trusting suites
fonts/rhythm/csp-hash certify whatever dist/ holds. Add to each (shared helper in
scripts/lib): refuse (fail-closed, clear message naming the stale file and the
rebuild command) when any of styles.css, js/**, src/** has mtime newer than
dist/index.html. Also: csp-inline-hash.test.mjs paths anchored to REPO_ROOT like its
siblings (today it crashes when cwd differs — fail-closed but uninformative).
**Net:** each suite's guard demonstrated: touch styles.css → suite refuses; rebuild →
passes. Encoded as a scenario where the suite has a selftest mechanism; otherwise
verified in-batch and documented in the commit. CRITIC ROUND 1: the guarded source
set MUST include booking-ops.html, booking-ops.js and .eleventy.js — csp-hash
certifies booking-ops.html's inline script (the exact file D1 edits) and .eleventy.js
shapes every built page; as first specced the guard failed open for both.

### B3. Suite-helper consolidation into scripts/lib
Five suites carry drifted copies of scratchSite/serve/SKIP/MIME (quote-funnel,
events, package-claim, prices-version, build-cache). Extract to scripts/lib:
- shared SKIP/exclude set DERIVED from build-ref.mjs's WORKING_COPY_EXCLUDE (single
  source; union of today's two drifted lists + '.dom-integrity', '.rhythm'),
- shared scratchSite() and serve() (serve gains lib/server.mjs's path-traversal
  refusal — strictly safer).
Per-suite mutate() helpers are NOT touched (suite-specific anchors are load-bearing).
**Net:** this is refactor-of-tests; the tests themselves are the net. CRITIC
ROUND 1 — counts are too weak (a swapped assertion keeps the count): capture each
suite's PASS-line NAMES before and after and diff them (empty diff required). And
the claim is not a pure no-op — name the two real deltas in the commit: (1) the five
scratch sites newly exclude .netlify/.cache (they ingested them before), (2) serve()
gains lib/server.mjs's path-traversal refusal. Both strictly-tightening.

### B4. Lightbox accessibility
`js/gallery.js`: collect {src, alt} pairs (use each image's real alt), set both in
updateImage(); focus close button on open; aria-modal/role verified on the lightbox
container (lightbox.njk). Swap full-screen display to a w_1600 Cloudinary variant in
the same collection pass.
CRITIC ROUND 2 — "restore invoker focus on close" is UNREACHABLE as first specced:
gallery invokers are non-focusable divs (no tabindex/role, direct click listeners),
so activeElement at open is <body> and the restore silently no-ops; there is no
keyboard path to OPEN the lightbox at all. Scope decision, recorded up front: B4
ships the reachable half (alt propagation, focus-to-close-button on open, w_1600;
on close, focus RESTORES to the element captured from document.activeElement at
open — body today, the invoker the day invokers become focusable; also un-strands
focus from the hidden close button at identical cost. CRITIC ROUND 3 fold.)
Equivalence-gate note: B4's role/aria-modal markup delta ships on ALL routes
(lightbox.njk is unguarded via footer.njk:58) — enumerate it beside D6's adds in the
gate declarations. Making gallery invokers keyboard-
reachable is a VISIBLE interaction-design change (tabbable grid on /saunas/ +
/locations/) that belongs to Jen's lane — recorded as a named Wave B residual in the
report, not smuggled into a refresh.
**Net:** no existing suite covers the lightbox. Minimal characterization first: a
small browser scenario (extend quote-funnel.test.mjs's browser session or a tiny
standalone) pinning open/navigate/close today, then asserting alt propagation +
focus placement after. If a scenario proves disproportionate, demote the focus work
to D-class manual verification and record the residual — do NOT ship unpinned focus
logic silently.

### B5. booking-admin rate limiter → lib/rate-limit.js
Replace the inline fixed-window rateMap (booking-admin.js:15-30) with
checkRateLimit/getClientIp from lib/rate-limit.js (sliding window, better IP header).
Keep 30/min. Semantics shift slightly (documented in commit).
**Net:** D2's functions test file gains a rate-limit smoke (two calls, mocked IP,
no network). Auth behavior (401 unset/wrong token) characterized in the same file.

### B6. Letter-spacing: the uppercase outlier only
`.map-filter-btn` (uppercase per its own text-transform) moves from raw 0.05em to
var(--tracking-caps) per doc 11's one-value rule — the unambiguous case. The four
mixed-case survivors (.hero-subtitle, .btn, .lightbox-counter, .link--accent) are
RECORDED as sanctioned exceptions with a comment block naming doc 11's rule and
deferring the register question to Jen/WP-2 — no visual churn on live elements
without a design ruling.
**Net:** rhythm/fonts suites green; visible delta on /locations/ filter buttons is
intended and small — flagged for the equivalence gate + Lee's next look.

---

## Sequencing & gates

1. D-batch in order D1→D10 (independent; each commit self-contained, suites green).
2. B-batch B1→B6.
3. Full 14-suite battery + build.
4. Equivalence gate (Stage 6): fresh Fable reviewer (no model override), whole-diff
   review vs 7b506b5 — behavior-preserving claims verified, intended changes
   enumerated against this plan, no scope creep. visual-diff + dom-integrity run
   7b506b5..tip with intended changes declared (not waived).
5. Report (.refresh/2026-08-06.md) + global ledger + ROADMAP note. Merge/deploy is
   Lee's call.

## Bucket A (context only — executes outside this plan, inline)
ROADMAP frontmatter restore (three-way d0397b7 + 7b506b5 gates); doc 35/13
supersession banners + doc 14 §8 amendment + retire stale ROADMAP notes (CLS,
hero_hold ms:5000); dead CSS (~230-line booking block, pre-redesign residue,
.has-error arm) + dead navigation.js booking hook; npm uninstall postgres; CSP trim
(jsdelivr, script.google.com, X-XSS-Protection) — connect-src unpkg KEPT pending
draft-deploy verification; advisor error #c0887a → var(--error); harness concurrency
warning headers (visual-diff.mjs, dom-integrity.mjs); modal.js package-toggle comment
amended to describe the ordering it sacrifices.

---

## Probe record (resolve-before-implementation items)

**D2 bundling probe (2026-08-06, executed):** `@netlify/zip-it-and-ship-it` (from
netlify-cli's tree) bundled a scratch copy of advisor.js carrying
`require('../../src/_data/site.json')` with the zisi bundler: the zip contains
`src/_data/site.json` (318B) beside `netlify/functions/advisor.js`. netlify.toml has
no [functions] block, so production uses the default (zisi for CJS). Corroboration
from production itself: prompts/faq.js ALREADY requires `../../../src/_data/faq.json`
across the same boundary and the advisor function deploys and routes (405 on GET,
live-verified) — the pattern is proven in the field, not just in the probe. D2
proceeds with the require + flag gate; the ADVISOR_ENABLED env fallback is not needed.
