# Critic Review ROUND 2 — code-refresh-2026-08-06-remediation.md

Reviewer: fresh critic (session model, no override), rubric v2. Round 2 of the
convergence loop: the six round-1 blocking findings are folded in and were NOT
re-litigated. This pass hunted second-order issues (problems the folds introduced,
bucket-A drift) and corners round 1 never reached. Every finding below was
verified against the tree at `refresh/2026-08-06` tip 127ee38 (bucket A landed:
7 commits since the 7b506b5 baseline).

## Applicability block

**Project type:** unchanged from round 1 — live production static site (Eleventy)
+ Netlify functions + the project's own test/gate harness. Same conditional set;
re-attested rather than re-derived:

| Dim | Fires? | Severity | Why |
|---|---|---|---|
| X1 Physical & human safety | **No** | — | Software-only website work; no hardware or hazardous control path anywhere in scope. Explicit negative attestation. |
| X2 Privacy & data stewardship | Yes | **GATING** | D5/D6 PII-flow and disclosure surfaces (round 1 passed them; no round-2 change disturbs that). |
| X3 Evidence & source integrity | Yes | **GATING** | D7 copy provenance (round 1 passed with the D7a wording fold; verified the fold is coherent). |
| X4 Audience, brand & money accuracy | Yes | **GATING** | Public copy, schema.org, standing pricing constraint. |
| X5 Concurrency & re-entrancy | Yes | Advisory | Unchanged surface. |
| X6 Operability & observability | Yes | Advisory | Deploy-docked items; B1's expiry clock adds one (see MF-2). |
| X7 Self-modification safety | **No** | — | B1/B2 alter the *project's* gates, not MARVIN's hooks/skills; fail-closed discipline scored under core 7/9. Explicit negative attestation. |
| X8 Dependencies, performance & cost | Yes | Advisory | No change from round 1; postgres uninstall verified safe below. |

## Bucket-A drift check (did the inline commits invalidate any plan assumption?)

Empirically checked, all clean except where noted under verdicts:

- **styles.css shrank 4343 → 4053 lines** (b874d06 dead-CSS deletion). B6's five
  letter-spacing raw-value selectors all survive at shifted offsets — re-mapped:
  `.hero-subtitle`:862 (0.05em), `.btn`:1541 (0.05em), `.map-filter-btn`:2406
  (0.05em), `.lightbox-counter`:2599 (0.1em), `.link--accent`:3053 (0.03em).
  Same five selectors, same values; the plan pins no line numbers, so B6 is
  intact. D9's `.blog-*` family now starts at styles.css:3444 (was ~3699).
- **CSP (952d8e0):** jsdelivr/script.google.com/X-XSS-Protection dropped; unpkg
  KEPT in script-src/style-src/connect-src with a comment naming navigation.js —
  D8's Leaflet load path is unaffected. Round 1's advisory "cross-check SRI
  hashes against jsdelivr's copy" is a *local hash comparison at implementation
  time*, not a runtime fetch, so the CSP trim does not touch it. netlify.toml's
  CSP line now carries exactly two script hashes (reveal-boot + booking-ops
  auth) — D1's recompute target is as described.
- **postgres uninstall (c2eb935):** verified no `require('postgres')` anywhere in
  netlify/functions/** — advisor.js pulls @anthropic-ai/sdk + local libs,
  booking-admin pulls @supabase/supabase-js + local libs. D2/B5 unaffected.
- **fonts.test.mjs A15** checks tabular numerals on price/spec selectors —
  untouched by bucket A and by any plan item. No suite (fonts/rhythm/stylelint)
  asserts anything about tracking tokens or letter-spacing, so B6 cannot trip
  them; "rhythm/fonts suites green" in B6's net is trivially achievable and is
  honest as stated.
- **NODE_VERSION still "18"** — D10 remains live and correctly scoped.

---

## Core dimensions (all gating) — round-2 deltas only

**1. Problem-fit — PASS.** Unchanged; the folds did not bend any item away from
its finding.

**2. Approach soundness — PASS.** New spot-checks this round:
- **D5 vs init.js's suppression seam:** the contact form dispatches through
  init.js's `contact-submit` case, which calls `e.stopImmediatePropagation()`
  *before* `SSC.handleSubmit(e)` runs — suppression of the cross-origin
  tracker's duplicate is decided before success/failure is known, so D5's new
  error path cannot change dispatch order or double-count accounting. Verified
  in js/init.js (submit hub) + js/forms.js.
- **D5 fixture safety:** events.test.mjs's Formspree route stub *already*
  returns `{ next: 'https://formspree.io/thanks' }` on success (:516-519), so
  the new `response.ok && next` predicate does not flip the existing happy-path
  scenarios (:1306-1334, :1394+). The "characterize before changing" step will
  find a stable baseline.
- **D3 'complete' guard semantics probed:** readyState transitions to
  'interactive' *before* DOMContentLoaded fires and stays 'interactive' until
  load — so `'loading' → listen, 'complete' → run now` has exactly one
  uncovered window (injection between DCL and load), which is round 1's named
  residual, unreachable for a deferred script. No new hole; the guard is
  correct for every ordering production can produce, including the test's
  end-of-body tracker scenario.
- **D7c template mechanics:** the WebSite/SearchAction block (head.njk:152-165)
  and the reviews block (head.njk:202-254) are each self-contained
  `<script type="application/ld+json">` elements — the reviews one wrapped in
  its own `{% if bodyClass == "page-home" %}` — so wholesale deletion leaves no
  trailing-comma or template-logic damage. Note verified: the reviews block's
  outer `@type` is a *second* LocalBusiness that exists solely to carry
  aggregateRating/review; deleting the whole `{% if %}` block is the correct
  read of "aggregateRating + three review blocks", and the real LocalBusiness
  core (head.njk:66-127, with its models-driven hasOfferCatalog price plumbing)
  survives untouched — the pricing constraint is safe by construction.
- **D2 flag path:** src/_data/site.json carries `features.advisor: false` at
  the exact shape the gate reads; lib/rate-limit.js's
  `checkRateLimit(key, maxRequests, windowMs)` is parameterized, so B5's
  30/min carries over cleanly.

**3. Completeness — CONCERN (one new gap).**
- **B4's focus-restore is structurally a no-op as specced.** The lightbox's
  invokers are plain `<div class="gallery-item ...">` elements (saunas.njk:229+,
  locations.njk) with **no tabindex, no role, and direct click listeners** (not
  the data-action hub — gallery.js attaches its own handlers). Two
  consequences: (a) `document.activeElement` at open time is `<body>`, so
  "restore invoker focus on close" restores nothing — `.focus()` on a
  non-focusable div silently no-ops; (b) there is **no keyboard path to open
  the lightbox at all** — init.js's keyboard-activation hub requires
  `[data-action][role="button"]`, which gallery items lack. B4 as written
  either ships restore logic that can never execute, or silently grows into a
  markup change (tabindex + role + keyboard activation across the gallery
  grids on two routes, with dom-integrity declarations) that the plan never
  costed. Also incidental: /gallery/ is a meta-refresh redirect to /saunas/ —
  the lightbox lives on /saunas/ and /locations/, which is fine for B4's plan
  to ride quote-funnel's browser session (same page) but should be said.
  *Fix (must):* B4 must choose explicitly — (a) extend scope to make invokers
  focusable/keyboard-operable as a declared markup change, or (b) trigger its
  own escape valve NOW for the restore half, recording the true reason
  ("invokers are unfocusable; restore is unreachable until they are") rather
  than discovering it mid-implementation. The alt/aria-modal/close-focus and
  w_1600 halves of B4 stand as specced.

**4. Right-sizing & reuse — PASS.** Unchanged.

**5. Security — PASS.** Unchanged; bucket-A CSP trim verified strictly narrower.

**6. Failure modes — CONCERN (one new, introduced by a fold).**
- **B1's mandatory-`expires` fold breaks existing fixtures at parse, not at
  assert.** gate.mjs's `loadConfig(file, readFile, now = Date.now())` *throws*
  on a missing/expired/over-horizon expiry (verified for pageOverrides at
  :281-309 — the exact validator B1 clones). visual-diff.test.mjs pipes
  synthetic configs through this same `loadConfig` with expectedToChange
  entries that carry **no `expires`**: the F1 "cannot be waived away" check
  (:656-658) and the G-fixture `gcfg` (:770-777) at minimum. The moment B1's
  validation lands, those loadConfig calls throw inside fixtures — the suite
  *crashes* mid-run instead of reporting assertions, and F1's waiver-immunity
  check silently stops testing what it claims to test (a parse error is not
  proof the shift gate held). The plan's B1 net names only the four NEW
  assertions; it never names migrating the existing synthetic fixtures.
  *Fix (must):* B1's scope includes sweeping visual-diff.test.mjs for every
  synthetic expectedToChange entry and stamping each — and the stamps must be
  **computed relative to the injected `now`** (loadConfig's third parameter
  exists precisely for this), never hardcoded ISO dates, or the fixtures
  become 60-day time bombs; note the >90-day horizon check also rejects
  far-future hardcoded dates, so "just put 2099" is structurally impossible.

**7. Change safety — PASS with one named consequence (see MF-2/X6).**

**8. Data integrity & compatibility — CONCERN (one new, introduced by a fold).**
- **B1's "preserving their reason text" preserves a now-false claim.** The
  shipped `/` entry's reason says, verbatim: *"the schema has no expiry field
  for expectedToChange"* (visual-diff.config.json:15) — that clause is the
  entry's own explanation for why retirement rides B6/baseline-advance instead
  of an expiry. B1 makes the sentence false the moment it lands, inside a
  config whose entire discipline is that reasons are the reviewable,
  trustworthy part. *Fix (must):* amend that one clause during migration
  (e.g. "expiry field added 2026-08 by the refresh's B1; this entry now
  carries one") — everything else in the reason text stays verbatim.
- Related, scored here but surfaced as a deploy item under X6: the `/` entry's
  retirement is **event-driven** (Deploy-1 baseline advance — Lee's trigger),
  and B1 puts a 60-day **clock** on it. When the clock lapses before the
  event, `loadConfig(CONFIG_FILE, ...)` throws at the top of
  visual-diff.test.mjs `main()` (:627) — the **entire suite bricks**, not just
  one gate run. That is arguably the design ("expired fails loudly", exact
  pageOverrides parity), but the blast radius must be a conscious choice:
  dock "re-stamp or retire the '/' expectedToChange entry by <expiry date>"
  onto the same deploy-time checklist that carries D10's items.

**9. Verifiability — PASS** (subject to MF-1's fixture migration; the round-1
mutation-discipline folds are coherent as folded — the D1 attribute-anchored
regex, the D2 flag-controlled both-direction test, and B2's widened mtime set
each check out against the files they name; csp-inline-hash.test.mjs's bare
relative `dist/` reads at :25/:46 confirm B2's cwd-crash claim).

**10. Maintainability — PASS.** B3's foundations re-verified post-bucket-A:
WORKING_COPY_EXCLUDE lives at scripts/lib/build-ref.mjs:56; scripts/lib holds
build-ref/capture/diff/dom-fingerprint/gate/server — the extraction has a
natural home and the round-1 PASS-name-diff fold is the right evidence.

---

## Conditional dimensions — round-2 deltas only

**X2 — PASS [GATING].** No change; D5's fixture interaction verified safe.

**X3 — PASS [GATING].** The D7a fold is coherent: home.njk:47 still carries the
false Aldergrove sentence; exactly two Aldergrove instances exist in src/
(home.njk:47, locations.njk:4 — the plan says "locations.njk:5", trivial
off-by-one in the frontmatter, same field). The venue-neutral card sentence
directive cannot now be misread.

**X4 — PASS [GATING].** D7c verified to leave the priced hasOfferCatalog and
every pricing surface untouched (see core 2). Footer Quick Links
(footer.njk:9-15) has no privacy entry — D6a is real and one line.

**X5 — PASS [ADVISORY].** Unchanged.

**X6 — PASS [ADVISORY]** with one addition: the B1 expiry-lapse consequence
(suite bricks at parse) joins the deploy checklist — see core 8.

**X8 — PASS [ADVISORY].** postgres uninstall verified import-free; no new deps.

---

## Stress tests (round-2 additions only)

**Pre-mortem:**
1. *The visual-diff suite died the week after Deploy-1 slipped.* B1 stamped the
   `/` entry 60 days out; the baseline advance that retires it was Lee's
   deploy trigger, which slipped. On day 61 loadConfig threw, all of
   visual-diff.test.mjs went down with it, and under pressure someone stamped
   a fresh 60 days *without re-reading the 4,000-word reason* — the exact
   rubber-stamp renewal the expiry discipline exists to prevent. The deploy
   checklist line (MF-2) is what turns this into a scheduled decision.
2. *B4 shipped and the accessibility win was fictional.* Focus-restore code
   review-passed, tests pinned close-button focus on open — but no keyboard
   user can open the lightbox and no restore ever fired, because the invokers
   were never focusable. The residual was discovered by an actual user, not
   the harness. MF-3 forces the choice before implementation.
3. *F1's waiver-immunity check quietly became a parse-error check.* After B1,
   the :658 fixture threw on missing expires; the try/catch-less IIFE crashed
   the suite; the "fix" wrapped it in try/catch and asserted "it threw" —
   which no longer proves the shift gate survives a waiver attempt. MF-1's
   explicit fixture migration (with now-relative dates) keeps the assertion
   meaning what it says.

**Load-bearing assumptions (new):**
1. *loadConfig's injected `now` is honored end-to-end for expectedToChange
   expiry as it is for pageOverrides* — verified for pageOverrides (:287-309,
   `now` from :87); B1 must thread it identically. High confidence, checked.
2. *The gallery invokers' unfocusability is the only obstacle to B4's restore
   half* — verified (no tabindex/role in saunas.njk or locations.njk gallery
   markup; direct listeners bypass the data-action hub). High confidence.
3. *No other synthetic expectedToChange fixtures exist beyond :658 and :771* —
   medium confidence; MF-1 mandates the sweep rather than trusting this list.

**Inversion:** *Should expectedToChange expiry have been warn-only instead of
fail-loud?* It would dissolve MF-1's crash and MF-2's brick — but it would also
recreate exactly the unconsumed-waiver hazard the b6Prune note documents (18→3
pruned because stale waivers silently cover the NEXT unreviewed change). The
plan's fail-loud choice is right; the cost is that fixtures and the deploy
checklist must be updated with it, which is what MF-1/MF-2 do.

---

## Verified-clean list (round-2 checks that found nothing)

D5×init.js dispatch order; D5×events.test.mjs stubs; D3 guard semantics;
D7c template structure + LocalBusiness core + pricing plumbing; sauna.njk
untouched by any item (its processor sentence is copied FROM, never edited —
no inline-hash exposure); postgres uninstall vs functions; site.json flag
shape; rate-limit parameterization; B6 selector survival post-CSS-deletion;
CSP/unpkg vs D8; footer state vs D6a; blog collection location vs D9;
fonts/rhythm/stylelint vs B6; scripts/lib inventory vs B2/B3; NODE_VERSION vs
D10; Aldergrove instance count vs D7.

## Advisory (non-blocking)

- **D5/doc-14 sequencing:** bucket A's doc-14 amendment already landed
  (1359e68); D5's `contact_submit_error` line is therefore a *second* doc-14
  edit, not a rider on the first. One line in D5's commit plan so it isn't
  assumed already covered.
- **B4 alt fallback:** `collectGalleryImages` should carry a fallback for an
  empty alt (e.g. positional "Gallery image N") rather than propagating "" to
  the lightbox image.
- **D7b:** locations.njk description sits at line 4, not 5 — cosmetic.
- **B1 zero-fire warning** necessarily lives partly in visual-diff.mjs (the
  runner knows which routes fired), not solely in gate.mjs:140-176 — name the
  second file so the commit doesn't look like scope creep.
- Round 1's advisories (D3 residual comment, D8 .catch/CSS-integrity/second-
  source — now folded into D8's heading, ANTHROPIC_API_KEY prominence) remain
  live and adopted.

## Overall verdict

**APPROVE WITH CHANGES.** The round-1 folds are all coherent against the tree —
none of the six introduced damage, and bucket A's seven commits invalidated no
plan assumption (offsets shifted, inventories survived, CSP narrowed away from
nothing the plan touches). The three new blockers are all second-order: two are
consequences of the B1 expiry fold meeting the *existing* fixture corpus and
the shipped config's own reason text, and one is a spec-level impossibility in
B4's focus-restore that the plan would otherwise discover mid-implementation.
All three are paragraph-scale amendments; nothing requires re-planning.

## Prioritized must-fix list

1. **[B1 / fixture migration]** Sweep visual-diff.test.mjs for every synthetic
   expectedToChange entry (:656-658 F1 waiver-immunity, :770-777 G-fixture, plus
   any the sweep finds) and stamp `expires` computed relative to loadConfig's
   injected `now` — never hardcoded dates (the ≤90-day horizon rejects
   far-future literals; near-future literals rot into time bombs). Without
   this, B1's validation crashes the suite at parse and F1's waiver check
   stops proving what it claims.
2. **[B1 / config honesty + deploy clock]** Amend the one clause in the shipped
   `/` entry's reason that says "the schema has no expiry field for
   expectedToChange" (false after B1); rest stays verbatim. Add "re-stamp or
   retire the '/' expectedToChange entry by <its expiry date>" to the
   deploy-time checklist — its retirement trigger (baseline advance) is Lee's
   event, and a lapsed stamp bricks the entire visual-diff suite at
   loadConfig, not just one gate run.
3. **[B4 / focus-restore is unreachable as specced]** Gallery invokers are
   non-focusable divs with no keyboard-open path (no tabindex/role; direct
   click listeners bypass init.js's keyboard hub) — `activeElement` at open is
   `<body>` and restore silently no-ops. B4 must choose up front: extend scope
   to make invokers focusable/keyboard-operable as a declared markup change on
   /saunas/ + /locations/, or invoke its escape valve now for the restore half
   and record the true reason. Do not let this be discovered mid-implementation.
