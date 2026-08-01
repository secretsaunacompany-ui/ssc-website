---
status: live
current: "Wave A LIVE on production (2026-07-31, Lee-confirmed deploy). Post-deploy: Lee's items (Formspree dashboard 90d auto-delete + tier check; four product decisions: nav mark E1 two-part question, favicon, speaker mounting copy, package-audio upsell). Weekly watchdog: needs a small credentials probe (events-table RLS/keys) before the cron ships — INTERIM: manual weekly quote_submit_success count via Supabase MCP, first check due 2026-08-07."
next: "WAVE B — Lee's post-deploy feedback leads (2026-08-01, fixed decisions in doc 00 addendum): (1) restore the hero-first reveal on the homepage (image arrives clean and unobstructed, beat of time, THEN nav + title — the Wave A motion cleanup deleted an effect Lee had explicitly asked to keep; capture failure, now recorded); (2) /saunas/ leads with the model index, comparisons demoted below (confirms doc 10 §3.2 verbatim — live page still leads with comparisons); (3) spacing/container rhythm is a first-class WP-2 acceptance criterion. Then the queued candidates: mobile-gutter batch + ember-dark decision; modal-scoping batch (dom-integrity cap raise); WP-2 composition / WP-3 copy / WP-4 pages (unblocked by Lee's remaining fact answers); case studies (parked pending client agreements); npm-audit remediation; ssc-ops tracker root-cause fix (cross-repo). Hand-off: ~/marvin/state/ssc-website-handoff-2026-08-01.md."
deploy_gates:
  - "HARD GATE — Formspree receipt test from the Netlify draft-deploy URL: one submission with realistic content through the real modal MUST arrive in the inbox before ANY production deploy of the quote funnel. Formspree returns HTTP 200 success on silently-discarded submissions — a green status code proves nothing; only the inbox does. EVIDENCE, stated precisely (corrected 2026-08-01): the 2026-07-30 proof is a LOCALHOST-origin discard — the test was accepted with a documented success body, never delivered, Lee confirmed absent from all inboxes incl. spam. That is a localhost result. Whether a *.netlify.app DRAFT-DEPLOY origin is likewise discarded has NEVER been tested, and the localhost result must not be generalized to it in either direction. The gate itself is unchanged and stands as written; only the citation gains this precision. The draft-URL probe in the Wave B-1 receipt protocol is what settles the draft-origin question empirically. Note also that Formspree may carry a domain allowlist, which would make a no-receipt result from a draft URL ambiguous (wrong origin vs genuinely broken): a draft-URL test can PROVE success, never failure. Companion: the WP-0a weekly zero-submission Telegram check is the production-side alarm for the same failure mode."
  - "Lee dashboard actions before funnel production deploy: (1) Formspree submission auto-delete set to 90 days (PIPA retention, Petra item 3); (2) confirm Formspree plan tier (gates whether formspreeAutoresponse can ever be enabled); (3) privacy page updated for the five quote fields + US processor + both retention stories, then Petra review."
  - "PRICE-SHEET PARITY: models.json v2 (pricesVersion 2) must be live in ~/marvin/content/reference/operations/ BEFORE the next quote is issued — Lee's firm-prices ruling (2026-07-30) is already effective for new inquiries, and the v1 sheet under-quotes an S4+changing-room+interior by $8,600 vs the repriced site. v2 sits in the session worktree (byte-identical to docs/redesign-2026-07/41-models-v2.json); lands in the primary at the session's /save merge — verify at deploy AND at next quote, whichever comes first. The site round-trip script gains a canonical-path byte-identity assertion so the next repricing cannot pass by validating only its own copy. LANDED 2026-07-31 (83421b9). RESOLVED — the canonical file reached ~/marvin and `npm run models-json:roundtrip` was RUN on 2026-08-01: ROUND-TRIP CLEAN, exit 0, byte-identity PASS at 9644 bytes. The earlier 'correctly red until the MARVIN merge lands' status no longer describes reality. Note the primary ~/marvin checkout runs a non-main branch (see reference_monitor_deploy pattern), so a FUTURE repricing's merge must again reach the branch the primary actually has checked out, not just main. Path overridable via SSC_MODELS_JSON."
deferred:
  - "npm-audit remediation: 70 pre-existing vulnerabilities surfaced when the lockfile was committed (7 critical, 35 high; 1 high in the production tree — ws via @supabase/supabase-js). Needs its own plan; npm audit fix --force on a live site is not a relay side-quest. Recorded 2026-07-30, Wave A batch 1."
  - "Site CLS: lazy images without width/height/aspect-ratio (/about/ and elsewhere) — real cumulative layout shift for visitors, found during harness repair. Candidate WP-1b line. Recorded 2026-07-30."
  - "Media cache keys on URL alone, ignores Range header — ranged media replays wrong (hero video). Site bug documented in scripts/lib/capture.mjs. Recorded 2026-07-30."
  - "Badge SVG mask rendering verified in Chrome only — one Safari look owed before the footer seal ships. Recorded 2026-07-30."
  - "CROSS-REPO: ssc-ops shared tracker's form_submit handler reads a field named 'sauna' that no form has — every site on that tracker records interest 'not specified'. This site now suppresses the generic listener and sends its own event (WP-0a seam), but the tracker itself needs its own authorized change in the ssc-ops repo. Recorded 2026-07-30."
  - "CROSS-REPO, PAIRED (Petra 2026-07-31, HIGH not deploy-blocking): ssc-ops tracker PIPA s.35 work — (a) minimize IP at ingest (truncate last octet or salted hash; pageview counts don't need full IPs; takes the store out of PI territory) + set a retention window on page_views/sessions; (b) then add one analytics-retention sentence to the site's privacy page (its FLAG 2 openness gap). Note: the schema's country/city columns are DEAD — verified never populated by the ingest (FLAG 1 cleared 2026-07-31); if geolocation is ever added, the privacy page's 'never your location' sentence must be re-scoped FIRST."
  - "Analytics reading note — STALE, DO NOT READ AS CURRENT (marked 2026-08-01). The note said: 'hero_hold_complete always reports ms:5000 (fires from the auto-reveal, including backgrounded tabs) — read the complete/skipped pair as a ratio; only the skipped branch carries real attention time. Recorded 2026-07-30.' The auto-reveal it describes was deleted in 156c073 (WP-1b motion cleanup); no 5000ms literal survives in js/. The semantics change again with Wave B-1 batch B1 (the restored hero hold retargets SETTLE_MS, the boundary that decides the complete/skipped branch) — the full rewrite of this note, with the new semantics and the cutover timestamp, lands there. Until then no reading of hero_hold_* data is authorized by this ROADMAP."
testing: "TWELVE test scripts plus lint:css (stylelint itself) — counted from package.json 2026-08-01, correcting the earlier 'ten suites' claim which under-counted and elided two real suites: visual-diff:test (repaired, affine model, fail-closed) · dom-integrity:test · quote-funnel:test · events:test · fonts:test · rhythm:test · package-claim:test · prices-version:test · build-cache:test · models-json:roundtrip · lint:css:test (scripts/stylelint-gate.test.mjs — a real suite, not part of lint:css) · csp-hash:test (npm name is csp-hash:test, NOT csp-inline-hash; the script file is scripts/csp-inline-hash.test.mjs and the two names have been confused before). Run any as npm run <name> (see package.json // comments for the ones needing a build or a sibling ../ssc-ops checkout first). models-json:roundtrip: RUN 2026-08-01 on this branch — ROUND-TRIP CLEAN, exit 0, 156 PASS / 0 FAIL, including the canonical byte-identity half (~/marvin/content/reference/operations/models.json === docs/redesign-2026-07/41-models-v2.json, 9644 bytes). The 'correctly red until the MARVIN merge lands' state is OVER: the canonical file landed 2026-07-31 and the suite is green by observation, not by inference."
pinned: false
shipped:
  - date: 2026-07-31
    item: "REDESIGN WAVE A — the full relay (branch relay/redesign-wave-a, 8 work batches + 8 instrument/parity commits, 15 Razor passes, 1 circuit-breaker trip resolved by Lee, behavioral eval + Jen gates). Shipped: pre-flight (content-hash cache keys fail-closed, build cleaning, pinned reproducible builds); the visual-diff harness repaired to genuinely fail-closed (budgets, per-metric waivers, pageOverrides raise-never-disable, affine global-offset model with spread residuals, ~15 mutation classes killed) + a DOM-integrity certificate (delete-subtree/renameMap/kind:code vocabulary, range-scoped whitelist, content-hash identification); parallax flake root-caused and killed; quote integrity (bench choice reaches quotes, WiFi $2,000 line — corrected a LIVE false price claim: the package cost $1,000 MORE than its parts while advertising Save $1,000; now guarded by the package-claim detector); THE FUNNEL rebuilt (two-step in-modal form, 13 browser-verified states, keyboard-complete incl. previously-unreachable model cards, localStorage with pricesVersion stamps + step-1 persistence + race-proofed clears, PIPA disclosures in-flow, quote_submit_success wired); measurement (12 events, structural PII denylist, double-count suppression proven against the real shared tracker); the TYPE SYSTEM (87 declarations → 10 tokens, self-hosted subset variable fonts 99KB, zero Google origins, tnum preserved, 19px/11px floors, quote-btn contrast 1.28:1 → 9.02:1); COLOUR/RHYTHM/MOTION (169-site vocabulary migration, ember/ink/ground system, P0-3 killed, intro+parallax deleted with hero events re-based, stylelint permanence gate, computed-rhythm suite); THE REPRICING (all 19 doc-35 rows, Save $500 true by construction on all five models — verified by three independent derivations, v1-restore recompute proven, prices-version lock, models.json v2 parity check correctly red until the MARVIN merge). Ten suites, 454+ assertions, zero waivers anywhere. Evidence corpus: docs/redesign-2026-07/ incl. 40-wp1a-anomalies.md."
  - date: 2026-07-28
    item: "Security + measurement. Deleted an orphaned legacy analytics stack (own tracker, reader, dashboard) whose unauthenticated reader served page URLs and titles for every property posting to the shared store, including fern-app.netlify.app. Removed passthrough copies publishing function source and the database schema. Root-caused a resurrection: Eleventy does not clean its output dir and Netlify caches it, so deleted files returned on the next auto-build — build command now cleans first. CSP fixed to allow the tracker origin; the site had been recording no analytics at all. Verified 404 on apex and deploy permalink."
  - date: 2026-07-28
    item: "Visual-regression harness (scripts/visual-diff.mjs). Builds two git refs, captures 19 pages at 1440/390, gates on a structural layout-shift metric plus changed-pixel percentage. Repair pending per critic rev.3."
  - date: 2026-07-28
    item: "Quote-integrity corrections: build duration was 4-6 weeks in the FAQ against 8-12 in commercial quotes — now 'as little as 8-12 weeks' in both answer and schemaAnswer."
  - date: 2025-12-15
    item: Static site live on production (eleventy + Netlify)
---

# SSC Website — Roadmap

## Redesign 2026-07 — where everything lives

A full redesign was specified in July 2026: three specialist audits, five Creative
Department specifications, and three critic passes. **Nothing in `docs/redesign-2026-07/`
is a draft — each document is the authority for its lane**, and the plan sequences
them rather than restating them.

| Doc | Authority over |
|---|---|
| `00-design-brief.md` | Context, Lee's fixed decisions, verbatim voice source |
| `01-audit-functional.md` | Forms, the configurator failure, security, data sync |
| `02-audit-copy.md` | Copy audit (superseded by 13) |
| `03-audit-ux.md` | UX/UI findings with line numbers |
| `04-brand-guidelines-updated.md` | Replacement brand guidelines |
| `10-jen-art-direction.md` | Composition, archetypes, page structure, motion, case-study template, `/commercial/` + `/care/`, mark phase |
| `11-beatrice-typography.md` | Type system, fonts, scale, web-font performance |
| `12-saul-visual-photography.md` | Photography direction + shot lists, grid, mark, Cloudinary delivery |
| `13-george-copy.md` | All copy, microcopy, meta — source-annotated |
| `14-wim-journey-funnel.md` | Configurator flow, journeys, booking states, analytics events |
| `15-mood-board.html` | The approved visual direction, as a working page |
| `20-fact-gathering-questions.md` | **The questions whose answers become published copy, and the answers received so far** |
| `21-resolved-tokens.md` | **Every contested shared token. Overrides 10–14 on those values.** |
| `30-pricing-heaters-equipment.md` | Heater + equipment market pricing, sourced |
| `31-pricing-materials.md` | Material + fabrication pricing, sourced |
| `33-intake-form-design.md` | Contact form field set, evidence, Formspree capabilities |
| `34-design-fee-conventions.md` | Design-deposit conventions + draft copy |
| `35-configurator-price-sheet.md` | **Every configurator price, resolved.** One convention, 19 lines, arithmetic shown |
| `HANDOFF.md` | **Start here on a cold pickup** |

**Plans and reviews** in `.claude/plans/`:
- `redesign-wave-a.md` — the relay-ready plan for everything not blocked on Lee
- `website-redesign-2026-07.md` — the full six-package plan (rev. 3)
- `website-redesign-2026-07-critic{,-rev2,-rev3}.md` — three critic passes

**Docked pending Lee's answers** (see doc 20): the process page facts, warranty
terms and the certifying body, the design-deposit decision, per-model price
display, and five smaller copy calls. Case studies are parked separately while
Lee agrees curated packages directly with Clarke, Emmanuel and Mountain Life.

---

## Ideas parked for later

Order is not a priority ranking.

## AI Advisor Widget (parked, needs more thought)

**What it is.** A chat widget that lives on contact, about, faq, saunas, and warranty pages. Context-aware starters per page (product, care, commercial, etc.), multi-turn on some pages, single-shot on others.

**Current state.** Code is in the repo but gated off via `site.features.advisor = false` in `src/_data/site.json`. Backend is `netlify/functions/advisor.js`. Frontend is `js/advisor.js`. Containers are already wired into the relevant templates — just wrapped in `{% if site.features.advisor %}`.

**Why it's off.** The backend wasn't fully wired and the widget wasn't functioning in production. Good idea, shipped too early.

**What it would need before re-enabling:**
- Backend function verified end-to-end against current Anthropic SDK
- Prompts reviewed per page type; right now they're generic and duplicate work the page copy already does
- UX decision: is a chat widget even the right surface? The contact page already has a structured form. A chat widget on top risks split-brain UX (which one do I fill in?). Consider:
  - Advisor on product/FAQ pages only (where questions are open-ended)
  - Advisor ONLY as a fallback when a form field is blank and user stalls
  - Or skip the widget entirely and use the saved prompts to improve static FAQ content
- Analytics to verify it actually drives inquiries rather than replacing them with conversations that never convert
- Rate limiting + abuse handling on the function

**Re-enabling:** flip `features.advisor` to `true` in `src/_data/site.json`. All existing templates will render their containers again and the script tag loads.
