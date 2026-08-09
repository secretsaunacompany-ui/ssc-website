---
status: deploying
current: "Wave A COMPLETE pending deploy (2026-07-31): Jen Stage 3 + privacy-page batch + the deploy sequence (draft → receipt test → production, Lee-authorized without further approval). Then Lee's post-deploy items: Formspree dashboard (90d auto-delete + tier), four product decisions (nav mark E1, favicon, speaker mounting copy, package-audio upsell)."
next: "Wave B candidates, all queued in the plan: mobile-gutter batch + ember-dark decision; modal-scoping batch (carries the dom-integrity cap raise); WP-2 composition / WP-3 copy / WP-4 pages (unblocked by Lee's remaining fact answers); case studies (parked pending client agreements); npm-audit remediation; ssc-ops tracker root-cause fix (cross-repo). Cloudinary account can be deleted post-Aug-15 (zero references remain)."
deploy_gates:
  - "GATE STATUS UPDATE (Lee, 2026-08-03): the Formspree receipt test is WAIVED — Lee is satisfied by the resolved root cause (his tests were caught by Formspree's own server-side spam filter; real inquiries deliver, embr 08-02 proves it). The three pre-deploy dashboard items are DOCKED, not blocking: (1) 90-day submission auto-delete (Lee unconcerned), (2) plan tier confirmation (it's the free tier — formspreeAutoresponse stays off), (3) privacy-page update + Petra review. NEW REQUIREMENT for the pricing arc (in flight in Lee's other window — this session keeps hands off pricing files): the site must AUTOMATICALLY sync with the newest canonical pricesVersion rather than relying on the manual bump-both-together discipline — e.g. a build-time step that derives data.js prices from canonical models.json so drift becomes impossible. Deploy trigger belongs to Lee / the pricing window."
  - "HARD GATE — Formspree receipt test from the Netlify draft-deploy URL: one submission with realistic content through the real modal MUST arrive in the inbox before ANY production deploy of the quote funnel. Formspree returns HTTP 200 success on silently-discarded submissions (proven 2026-07-30: localhost test accepted with documented success body, never delivered, Lee confirmed absent from all inboxes incl. spam) — a green status code proves nothing; only the inbox does. ROOT CAUSE RESOLVED (Lee, 2026-08-03): Formspree's OWN server-side spam filtering was catching the test submissions — delivery works for real inquiries (embr inquiry arrived normally 08-02). Gate procedure accordingly: submit REALISTIC content from the deployed draft URL (localhost origin + test-shaped content is exactly what their classifier eats), and if a test doesn't arrive, check the Formspree dashboard's spam view BEFORE diagnosing delivery. Production implication: a terse real inquiry could be spam-caught just as silently — the WP-0a weekly zero-submission Telegram check stays load-bearing, and the dashboard spam view deserves a periodic glance. Companion: the WP-0a weekly zero-submission Telegram check is the production-side alarm for the same failure mode."
  - "Lee dashboard actions before funnel production deploy: (1) Formspree submission auto-delete set to 90 days (PIPA retention, Petra item 3); (2) confirm Formspree plan tier (gates whether formspreeAutoresponse can ever be enabled); (3) privacy page updated for the five quote fields + US processor + both retention stories, then Petra review."
  - "PRICE-SHEET PARITY: models.json v2 (pricesVersion 2) must be live in ~/marvin/content/reference/operations/ BEFORE the next quote is issued — Lee's firm-prices ruling (2026-07-30) is already effective for new inquiries, and the v1 sheet under-quotes an S4+changing-room+interior by $8,600 vs the repriced site. v2 sits in the session worktree (byte-identical to docs/redesign-2026-07/41-models-v2.json); lands in the primary at the session's /save merge — verify at deploy AND at next quote, whichever comes first. The site round-trip script gains a canonical-path byte-identity assertion so the next repricing cannot pass by validating only its own copy. LANDED 2026-07-31 (83421b9) and CORRECTLY RED at tip: it fails until the canonical file reaches ~/marvin — the MARVIN session-save merge is therefore load-bearing for a green suite. Note the primary ~/marvin checkout runs a non-main branch (see reference_monitor_deploy pattern), so the merge must reach the branch the primary actually has checked out, not just main. Path overridable via SSC_MODELS_JSON."
deferred:
  - "npm-audit remediation: 70 pre-existing vulnerabilities surfaced when the lockfile was committed (7 critical, 35 high; 1 high in the production tree — ws via @supabase/supabase-js). Needs its own plan; npm audit fix --force on a live site is not a relay side-quest. Recorded 2026-07-30, Wave A batch 1."
  - "Site CLS: lazy images without width/height/aspect-ratio (/about/ and elsewhere) — real cumulative layout shift for visitors, found during harness repair. Candidate WP-1b line. Recorded 2026-07-30."
  - "Media cache keys on URL alone, ignores Range header — ranged media replays wrong (hero video). Site bug documented in scripts/lib/capture.mjs. Recorded 2026-07-30."
  - "Badge SVG mask rendering verified in Chrome only — one Safari look owed before the footer seal ships. Recorded 2026-07-30."
  - "CROSS-REPO: ssc-ops shared tracker's form_submit handler reads a field named 'sauna' that no form has — every site on that tracker records interest 'not specified'. This site now suppresses the generic listener and sends its own event (WP-0a seam), but the tracker itself needs its own authorized change in the ssc-ops repo. Recorded 2026-07-30."
  - "Analytics reading note: hero_hold_complete always reports ms:5000 (fires from the auto-reveal, including backgrounded tabs) — read the complete/skipped pair as a ratio; only the skipped branch carries real attention time. Recorded 2026-07-30."
testing: "Ten suites: visual-diff (repaired, affine model, fail-closed) · dom-integrity · quote-funnel · events · fonts · rhythm · package-claim · prices-version · build-cache · lint:css. Run any as npm run <name>:test (see package.json // comments for the ones needing a build or sibling checkout first). models-json:roundtrip asserts canonical parity and is CORRECTLY red until the MARVIN merge lands."
pinned: false
shipped:
  - date: 2026-08-09
    item: "CLOUDINARY MIGRATION — self-hosted all images (68 assets: 66 images + 2 videos) from Cloudinary to repo-committed WebP + MP4, served via Netlify CDN. Cloudinary free plan was at 264% quota, account scheduled for deactivation Aug 15. 6 commits on relay/cloudinary-migration: asset processing (100 WebP at multiple responsive sizes from external drive originals, 2 compressed MP4s, 2 PNG logos, 1 JPEG for og:image), infrastructure (passthrough copy, immutable cache headers), 126 URL replacements across 30 files (templates, frontmatter, JS data, CSP, structured data), cloudinaryResponsive transform removed, privacy page corrected, modal.js dead code cleaned, image-audit script added. Zero external image dependencies. Plan: robust-fluttering-flame.md."
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
