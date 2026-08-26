---
status: live
current: "DEPLOYED 2026-08-03 (single-train deploy, PR #2). Wave A + Wave B-1 + base-price reprice + complete-sauna catalogue (pricesVersion 4) shipped together. Receipt gate CLOSED per Lee ruling 2026-08-03 (genuine inquiries prove delivery). Cloudinary migration shipped 2026-08-09 (68 assets self-hosted, zero external deps, account deactivation post-Aug-15). Latest: pricesVersion 5 (standing seam into Premium Finish Package, 2026-08-21), service-area copy edits (2026-08-10). Twelve test suites, models-json:roundtrip GREEN (canonical landed 2026-07-31)."
next: "Wave B remaining, all blocked on Lee's fact answers (doc 20) or product decisions. WP-2 composition: blocked on Q7 (per-model prices, schema address, fire-ban scope, headcount, blog, interim testimonials); carries 5 inbound items from B-1 gates (Jen adjacency under-count, compare-table typography, centered thresholds, N7 IA dead-end, tier-fidelity manifest). WP-3 copy: blocked on Q5 (warranty terms + certification body), Q7, Q13 (design deposit) + source-verification gate. WP-4 new pages (/process/, /commercial/, /care/): blocked on Part A process facts (A2-A8), Q5, Q6 (commercial client permissions), Q9 (laser cut file), Q13 + Jen's spec. Case studies (WP-6): parked pending client agreements (Clarke, Emmanuel, Mountain Life). Package swap-at-delta configurator: deferred 2026-08-03 (Lee's occupancy rule implemented in quote generator, not yet in modal). ssc-ops tracker fix: cross-repo. Product decisions pending Lee: nav mark E1 (unmerged branch relay/redesign-wave-a-mark), favicon, speaker mounting copy, package-audio upsell. Formspree dashboard items still Lee's (90d auto-delete, allowed-domains)."
deploy_gates:
  - "RECEIPT GATE — CLOSED per Lee 2026-08-03. Genuine inquiries prove delivery (embr inquiry arrived 2026-08-02). Draft-URL probe was ambiguous (accepted 200, never delivered — same as localhost; Formspree domain allowlist makes draft-origin tests prove success only, never failure). Production alarm: WP-0a weekly zero-submission Telegram check."
  - "PRICE-SHEET PARITY — RESOLVED. Canonical models.json landed 2026-07-31 (83421b9). models-json:roundtrip RUN 2026-08-01: ROUND-TRIP CLEAN, exit 0, 156 PASS, byte-identity PASS at 9644 bytes. Future repricings must reach the branch the primary ~/marvin checkout actually has checked out. Path overridable via SSC_MODELS_JSON."
  - "Lee dashboard items (docked, not deploy-blocking): (1) Formspree 90d auto-delete (PIPA); (2) confirm plan tier; (3) privacy page for quote fields + US processor, then Petra review. Formspree auto-sync: the site must automatically sync with the newest canonical pricesVersion (build-time derivation, not manual discipline)."
deferred:
  - "Dev-only vulnerabilities: 11 remain (9 high, 1 moderate, 1 low), all in netlify-cli 27.x transitive deps (sharp/libvips CVEs). Require npm audit fix --force or major version bumps of eleventy/esbuild. DECISIONS.md pin prohibits --force. Recorded 2026-08-23."
  - "NODE_VERSION 18→22 in netlify.toml: would unblock supabase-js updates past 2.95.3 (2.112.x requires Node>=22) and clear Node 18 EOL risk. Changes the Netlify runtime — needs its own plan. Recorded 2026-08-23."
  - "Media cache keys on URL alone, ignores Range header — ranged media replays wrong (hero video). Documented in scripts/lib/capture.mjs. Recorded 2026-07-30."
  - "Badge SVG mask rendering verified in Chrome only — one Safari look owed before the footer seal ships. Recorded 2026-07-30."
  - "CROSS-REPO: ssc-ops tracker form_submit handler reads 'sauna' field no form has — every site records interest 'not specified'. This site suppresses the generic listener (WP-0a seam), but the tracker needs its own fix in ssc-ops. Recorded 2026-07-30."
  - "CROSS-REPO (Petra, HIGH): ssc-ops tracker PIPA s.35 — minimize IP at ingest, set retention window on page_views/sessions, then add analytics-retention sentence to site privacy page. Recorded 2026-07-31."
  - "Percentage gutters: 2 survive (nav 2.5%, .page-hero 5%), pinned by rhythm.test.mjs. The third (mobile section 5% override) was deleted in B2. --nav-clear token queued to let hero migration proceed without conflating nav clearance with rhythm tiers. Recorded 2026-07-31."
  - "Harness post-wave items (consolidated, 9 items, none deploy-blocking): (1) row-matcher per-pixel tolerance; (2) non-unique rhythm mutation anchors; (3) redirect-stub route double-count; (4) tier-fidelity gate (no instrument knows which section gets which tier — needs pairing with WP-2); (5) Z28 comma-dangle sensitivity; (6) M12 disclosure completion; (7) /contact/ honeypot absence; (8) priceRange ungated in head.njk; (9) ledger/compare typographic split. Full record in the post-deploy ROADMAP on branch docs/post-deploy-status."
  - "Quote-funnel:test flake — two transient failures (B3, B5), no root cause. Needs FULL log capture on next occurrence, not tail-2. Hypothesis: concurrent dist/ rebuild. Interim: serialize, never run concurrently with other dist-reading suites. Recorded 2026-08-02."
  - "Visual-diff refused residuals — three results deliberately left RED: /faq/@390 coverage, fit-confidence on /@390 and /saunas/+/gallery/@390. Retire on baseline advance. Home carries no shift override by rule (F-series calibration). Recorded 2026-08-02."
  - "Package swap-at-delta configurator: Lee ruled 2026-08-03 that a package OCCUPIES each select-one group. Quote generator implements this (resolveSelection()); modal does not — exterior/interior locked at $0, not swappable. Until it ships, yakisugi+package must be hand-quoted. Deferred 2026-08-03."
testing: "Twelve test scripts plus lint:css (corrected from earlier 'ten suites'): visual-diff:test · dom-integrity:test · quote-funnel:test · events:test · fonts:test · rhythm:test · package-claim:test · prices-version:test · build-cache:test · models-json:roundtrip · lint:css:test · csp-hash:test. Run any as npm run <name> (see package.json // comments for build/sibling requirements). models-json:roundtrip: GREEN, 156 PASS, canonical byte-identity PASS."
pinned: false
shipped:
  - date: 2026-08-23
    item: "npm-audit remediation + CLS fix. Production tree: 0 vulnerabilities (ws 8.19.0→8.21.3 via npm audit fix within realtime-js range; supabase-js stays at 2.95.3 — 2.112.x requires Node>=22). Dev tree: 68→11 vulnerabilities, all 7 criticals eliminated (netlify-cli 17→27). CLS: width/height added to service-area.njk intro image (5 pages). Razor PASS, 0 findings. Plan: lovely-cuddling-dragonfly.md."
  - date: 2026-08-09
    item: "CLOUDINARY MIGRATION — self-hosted all images (68 assets: 66 images + 2 videos) from Cloudinary to repo-committed WebP + MP4, served via Netlify CDN. Cloudinary free plan was at 264% quota, account scheduled for deactivation Aug 15. 126 URL replacements across 30 files, cloudinaryResponsive transform removed, image-audit script added. Zero external image dependencies."
  - date: 2026-08-03
    item: "WAVE B-1 — single-train deploy with base-price reprice + complete-sauna catalogue (pricesVersion 4). Nine units of work: B0 docs · B1 hero-first reveal + LCP · B2 spacing/container-padding root cause (F-1, padding→padding-inline) + ember-dark retired · deploy-1 fix round (hero/nav collision at 390) · B3 modal scoping ({% if configurator %} guard, MAX_SUBTREE_TOKENS 64→400) · B4-pre add-subtree primitive · B4 /saunas/ recomposed as Ledger + model-fact unification · B5 section-tier assignment · B6 wave-closing docs + harness hygiene. Razor passed every unit. Jen Stage 0.7 + Stage 3 PASS (one in-wave fix: W5 uppercase on .eyebrow--wide). Harness capabilities added: add-subtree with Z21-Z28 fixtures, models-json-roundtrip third half, rhythm tier assertions + --nav-band, quote-funnel presence invariant, fingerprintsIdentical vacuity guard."
  - date: 2026-07-31
    item: "REDESIGN WAVE A — the full relay (branch relay/redesign-wave-a, 8 work batches + 8 instrument/parity commits, 15 Razor passes, 1 circuit-breaker trip resolved by Lee, behavioral eval + Jen gates). Rebuilt quote funnel (two-step modal, 13 states, keyboard-complete), type system (87→10 tokens, self-hosted fonts, zero Google origins), colour/rhythm/motion (169-site vocabulary migration, ember/ink/ground), repricing (Save $500 true by construction on all five models). Twelve suites, 454+ assertions, zero waivers."
  - date: 2026-07-28
    item: "Security + measurement. Deleted orphaned analytics stack (unauthenticated reader exposed cross-project page URLs). CSP fixed for tracker origin. Build command now cleans first (Eleventy resurrection bug)."
  - date: 2026-07-28
    item: "Visual-regression harness (scripts/visual-diff.mjs). 19 pages at 1440/390, structural layout-shift metric, fail-closed."
  - date: 2026-07-28
    item: "Quote-integrity: build duration corrected from 4-6 weeks to 'as little as 8-12 weeks' in FAQ answer + schemaAnswer."
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

## Parking Lot — every deferral, one index

This is the single entry point for named-but-unscheduled work.

Rule: a deferral is recorded here or it does not exist. The detailed sections below are kept verbatim and are not to be edited into summaries — this index points at them.

| Deferral | Detail lives in |
|---|---|
| npm-audit remediation (70 pre-existing vulnerabilities) | frontmatter `deferred:` |
| Site CLS — lazy images without width/height/aspect-ratio | frontmatter `deferred:` + below |
| Media cache keys on URL alone, ignores `Range` header | frontmatter `deferred:` + below |
| Badge SVG mask — Safari check owed before the footer seal ships | frontmatter `deferred:` + below |
| ssc-ops shared tracker `form_submit` fix (cross-repo) | frontmatter `deferred:` + below |
| Analytics reading note — `hero_hold_complete` always reports ms:5000 | frontmatter `deferred:` |
| Wave B — WP-2 composition / WP-3 copy / WP-4 pages | frontmatter `next`, and the rulings in `.claude/DECISIONS.md` |
| Case studies (parked pending client agreements) | `## Redesign 2026-07 — where everything lives` |
| Ideas with no schedule | `## Ideas parked for later` |
| AI Advisor Widget | `## AI Advisor Widget (parked, needs more thought)` |

### Deferred from the 2026-08-21 hand-off restructure

Carried verbatim out of the pre-restructure `.claude/handoff.md` so no wording is lost:

- **Site CLS issue named, not yet fixed:** lazy images without width/height/aspect-ratio on `/about/` and elsewhere -- candidate for a WP-1b line.
- **Cross-repo: ssc-ops shared tracker bug.** Its `form_submit` handler reads a field named `sauna` that no form actually sends -- every site on that tracker records interest as "not specified." This site suppresses the generic listener and sends its own event, but the tracker itself needs an authorized fix in the ssc-ops repo.
- **Media cache bug documented, not fixed:** cache keys on URL alone, ignoring the `Range` header -- ranged media (hero video) can replay wrong. Documented in `scripts/lib/capture.mjs`.
- **Badge SVG mask** only visually verified in Chrome -- a Safari check is owed before the footer seal ships.
- **npm-audit remediation deferred, not urgent:** 70 pre-existing vulnerabilities (7 critical, 35 high; 1 high in the production tree via `ws`/`@supabase/supabase-js`). Needs its own plan -- `npm audit fix --force` on a live site is not a relay side-quest.

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
