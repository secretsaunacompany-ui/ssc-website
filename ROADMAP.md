---
status: live
current: "Relay ssc-website-copy-followups CLOSED on its branch 2026-09-04 (Razor, Jen, all gates green; merged with refresh/2026-09-02), waiting for Lee's yes to push. LIVE on main: deployed 2026-09-04: the hero copy refresh (29ad824, every string approved by Lee: 'Real heat. Built here.', Squamish and the Brackendale Art Gallery named, 90-minute session sold on the Try-a-Session card) on top of the 2026-09-02..04 code-refresh (2026-08-06 hardening restored after merge 4407858 had silently reverted it; /book retired with a 301 to the booking app; CARTO-keyed map with the BAG pin on Government Road and a Book button; cold plunge and fixed photo backgrounds gone; logos self-hosted at real sizes). pricesVersion 5, models-json:roundtrip GREEN after the 2026-09-03 yakisugi restore. Landing hero: Lee saw the 29ad824 hero live and asked for further ideation; four rendered compositions and eight thesis lines are on the artifact The Held Photograph (2026-09-04), three calls pending (composition, line, hero filter/scrim removal)."
next: "Push relay/website-copy-followups to main on Lee's yes (live deploy). Landing hero relay once Lee picks a composition, a thesis line and rules on the hero filter/scrim (see The Held Photograph artifact, 2026-09-04). Retire or renew the 18 visual-diff expectedToChange waivers before 2026-10-05, when the harness refuses to start. Mobile configurator CTA (152 opens, zero step-2 views since 2026-08-09; CTA sits 4,454px into a 4,945px modal at 390px) is a Wave B design decision, not a bug fix. Then: Wave B remaining, all blocked on Lee's fact answers (doc 20) or product decisions. WP-2 composition: blocked on Q7 (per-model prices, schema address, fire-ban scope, headcount, blog, interim testimonials); carries 5 inbound items from B-1 gates (Jen adjacency under-count, compare-table typography, centered thresholds, N7 IA dead-end, tier-fidelity manifest). WP-3 copy: blocked on Q5 (warranty terms + certification body), Q7, Q13 (design deposit) + source-verification gate. WP-4 new pages (/process/, /commercial/, /care/): blocked on Part A process facts (A2-A8), Q5, Q6 (commercial client permissions), Q9 (laser cut file), Q13 + Jen's spec. Case studies (WP-6): parked pending client agreements (Clarke, Emmanuel, Mountain Life). Package swap-at-delta configurator: deferred 2026-08-03 (Lee's occupancy rule implemented in quote generator, not yet in modal). ssc-ops tracker fix: cross-repo. Product decisions pending Lee: nav mark E1 (unmerged branch relay/redesign-wave-a-mark), favicon, speaker mounting copy, package-audio upsell. Formspree dashboard items still Lee's (90d auto-delete, allowed-domains)."
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
  - date: 2026-09-04
    item: "COPY FOLLOW-UPS (relay ssc-website-copy-followups, branch relay/website-copy-followups, 10 commits on 29ad824 + the merge of refresh/2026-09-02). Retired-voice sweep: hero alt, <title>, meta description (138 chars, Jen's cut), og/twitter defaults, LocalBusiness JSON-LD description, About and Saunas front-matter descriptions rewritten out of 'Authentic Finnish saunas handcrafted…'; 'authentic heat' → 'real heat' on the FAQ (answer + schemaAnswer) and the Brackendale card. Em dashes: every one in rendered prose restructured (home, about, contact, four FAQ answers, vancouver, five advisor starters, six configurator site-access options now 'Label: detail'); residual set is exactly the 17 parked separators. Gates: Razor PASS then WARNING-only on re-review (fragment pins, tightened in 022e3d8); Jen PASS WITH NOTES (all folded); dom-integrity declares 70 entries ranged 29ad824..07b2325; every suite green. Also carries the BAG business address in the LocalBusiness schema (e342685) and the day's hand-off, ROADMAP and five rulings. Deploy = push to main, on Lee's yes."
  - date: 2026-09-04
    item: "HERO COPY REFRESH (29ad824, peer session-691205). Hero 'Real heat. Built here.'; subtitle 'Handcrafted Finnish saunas from Squamish, BC. Try one at Brackendale Art Gallery, then plan your own.'; Try-a-Session card 'Book a 90-minute session and judge the heat yourself.' Every string approved verbatim by Lee. 'handcrafted' is NOT retired; 'authentic' and 'traditional' as category labels are."
  - date: 2026-09-04
    item: "CODE-REFRESH 2026-09-02..04 (branch refresh/2026-09-02, merged to main through 88ef1f0). Hardening: the 2026-08-06 refresh that merge 4407858 silently reverted is restored (NODE_VERSION 22, both CSP inline sha256 hashes, X-XSS-Protection dropped); csp-inline-hash.test.mjs strips HTML comments before hashing (the old regex spanned a comment, so even the present hash was wrong); cdn.jsdelivr.net and script.google.com removed from CSP. Content: /book page and coming-soon partial deleted with 301s to book.secretsaunacompany.ca; cold plunge removed sitewide; page-bg--fixed and hero-overlay__bg layers removed everywhere but the Contact fog, executing doc 10 §2.3; footer Quick Links gain Book. Map: CARTO basemap key (anonymous tiles now return HTTP 200 stamped 'API KEY REQUIRED', so nothing alerted); commercial pins lifted above residential; BAG pin moved to 41950 Government Road (OSM node) with a 'Book a Session' button into the booking app; Abbotsford 'flagship' pin deleted; /locations/ BAG card renamed 'SSC at the BAG' and made full-width. Assets: nav/footer logos self-hosted at 230w/604w (212KB → 28KB per page), favicon-64, hero preload derives from hero_image. Harness: model-thumbs and lightbox tests assert first-party images (Cloudinary residue gone); models-json-roundtrip savings rule is >= per model plus a tight-floor assertion; two stale selftest mutation anchors re-anchored; two /book fixtures dropped from events.test. INCIDENT: a 10-minute timeout killed models-json-selftest mid-mutation, its restore never ran, git add -A swept the deleted S2 exteriorYakisugi 5000 into 54d98ec and it shipped (S2 under-quoted yakisugi by $5,000 in production ~1 day); caught by roundtrip, restored in 35e8f18, all 12 mutation anchors and the canonical ~/marvin models.json verified untouched."
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
| AI Advisor Widget | `### Deferred from the 2026-09-02 code-refresh and creative review

Recorded 2026-09-04 from the five-specialist creative review (Beatrice type, Saul visual, George copy, Wim experience, motion) and the code-refresh "no" list. About 86 findings were raised; these are the ones judged worth doing and deliberately not done in that session.

- **Contact form submit button renders in Arial.** `button` never inherits `font-family`; one `button, input, select, textarea { font: inherit }` rule fixes it sitewide. Smallest item here, not done only because the session was closing.
- **Measure is too wide.** `--measure: 65ch` produces 91-105 actual characters per line on body text. Beatrice proposes `--measure: 44ch` and `--measure-wide: 48ch`; requires moving rhythm.test.mjs's 70ch pin, so it is a rhythm-suite change, not a CSS tweak.
- **`.page { animation: fadeIn 0.8s }` (styles.css ~692) tints the hero during load**, working against the hero-first reveal ruling in `.claude/DECISIONS.md`. Removal must be confirmed against Lee's stated likes first (operating constraint, 2026-08-01).
- **Responsive images / srcset restoration.** Roughly 5.6-6.5MB of images across seven pages ship at one size; the -Nw variants exist on disk. A srcset pass touches every template and the visual-diff baselines.
- **Modal, lightbox and mobile menu snap open with no transition.** Wim's item; needs the motion tokens decided before any of the three gets its own.
- **Hero title arrives as one slab rather than staggered.** This is the hero-first reveal ruling's unfinished second half (delayed `.reveal` stagger, never `HeroIntroAnimation`).
- **Advisor prompt contradiction (feature off):** `netlify/functions/prompts/product.js:29` and `inquiry.js:18` say wood-fired is included; `faq.js:41` says +$6,500. Harmless while `features.advisor` is false; must be reconciled before re-enabling the widget.
- **Residential map pins are `#4A90E2`,** a blue from no token in the system. Offered to Lee 2026-09-04, not yet chosen.
- **Visual-diff `expectedToChange` waivers:** 18 of them expire 2026-10-05, after which the harness refuses to start. Advance the baselines or renew before then.
- **rhythm.test.mjs crashes** because `/process/` in its page list is a meta-refresh stub, not a page. Drop the route or point the stub at real content.
- **Mobile configurator CTA (Wave B, per Lee 2026-09-04: "make sure we are tracking it and we'll come back to it during that wave").** 152 configurator opens since the 2026-08-09 deploy and zero step-2 views, against a prior rate of about 5%. Funnel and instrument both verified working from production on 2026-09-03 (own events landed in Supabase). On a 390px phone the CTA sits 4,454px into a 4,945px scrolling modal and the sticky total bar carries no CTA. The cause of the exact zero at the deploy boundary is not established. Candidate fixes: a CTA in the sticky bar, or a shorter step 1.
- **Pixel run owed** for the deliberate visible changes on 11 routes (backgrounds removed, BAG card, footer link, logos); the visual-diff baselines still describe the pre-refresh site.

### Deferred from ssc-website-copy-followups (2026-09-04)

Verbatim from Ted's reports, Razor's two passes and Jen's review. None of these blocks the relay.

- **Separator dashes need a house-style ruling.** Left untouched by ruling: the four process-step titles (`01 — Consultation` etc., `home.njk`), the three testimonial bylines (`— Private Client`), the four `addon-price` placeholders (`—`), and six configurator `addon-label` strings in `modals/sauna.njk` (the two heater labels at :78/:83, which `js/modal.js:646,672` repaint on model select and `scripts/quote-funnel.test.mjs:81` + `scripts/dom-integrity.config.json:1303` pin; and the 2' deck, 3' deck, Trailer integration and Premium audio labels, byte-duplicated in `docs/redesign-2026-07/41-models-v2.json` and pinned by `models-json:roundtrip` (20 assertions) and `prices-version:test` A3, proven by Ted at Stage 1). Executing any ruling touches all of those at once. Jen's recommendation when raised: keep them; they are labels, not prose, and "01: Consultation" reads like a form field.
- **dom-integrity fragment pins.** Razor (re-review): an `added` entry whose `contains` names a fragment of a node absorbs any undeclared edit elsewhere in that node. The seven copy-follow-ups entries were widened to whole values (022e3d8); the pattern remains in 12 earlier entries and in the vocabulary itself. Separately, `prices-version.test.mjs:155-176` reads only the configurator modal, so the `$23,500` in the home and /saunas/ meta strings has no gate but the whitelist.
- **dom-integrity staleness by design.** Ted: the whitelist is per-comparison while the file is per-repo, so every shipped batch's entries read STALE (inert) against any baseline at or after their own commit; 186 inert entries before this relay, 256 after. The `_notes.staleness` block in the config already names it. Harness change, not a copy job.
- **dom-integrity flake on redirect stubs.** Razor: `src/gallery.njk:10` and `src/process.njk:10` are `meta http-equiv="refresh"` stubs; `waitUntil: 'networkidle'` can resolve before the refresh lands and `page.evaluate` races it (`dom-integrity.mjs:204`, exit 2). Fails closed; second run passes.
- **Retired-voice stragglers, none in rendered prose:** `head.njk` meta keywords still list "traditional sauna" and "handcrafted sauna"; `netlify/functions/prompts/faq.js:38` says "Authentic Finnish experience" (advisor off); `src/_data/site.json:2` `title` is the old "Handcrafted Finnish Saunas in British Columbia" but has no consumer; `about` founding story says "an authentic Finnish riverside sauna" (lowercase, descriptive) and one client testimonial says "the best authentic sauna experience" (quoted speech, leave it).
- **Quote modal at 390** opens with roughly 300px of dead space above the model title (Jen, `access-390.png`), pre-existing.
- **Landing hero.** Lee, 2026-09-04: "not actually a fan of my new hero now seeing it in place and think we need to ideate further on that landing." Jen rendered four compositions (July spec executed; nameplate; one line on a bottom scrim; live) and found the live hero darkens the photograph to ~30% with `filter: brightness(0.7)` plus a permanent `.hero::after` gradient, including during the hold. George wrote eight thesis lines; his pick "Squamish has saunas hidden in the woods. We build the ones you get to keep." Three calls for Lee on the artifact The Held Photograph: composition (recommend the July spec), line, and removal of the filter/scrim (an effect deletion, so it needs his explicit yes under the 2026-08-01 constraint). Renders and sources in the session scratchpad `hero/`.

## AI Advisor Widget (parked, needs more thought)` |
| Creative review 2026-09-04 — six deferred findings (button font inherit, `--measure` 65ch, `.page` fadeIn tint, srcset restoration, modal/lightbox/menu transitions, hero title stagger) | `### Deferred from the 2026-09-02 code-refresh and creative review` |
| Advisor prompt contradiction on wood-fired heater pricing (feature is off) | `### Deferred from the 2026-09-02 code-refresh and creative review` |
| Residential map pins are off-system blue `#4A90E2` | `### Deferred from the 2026-09-02 code-refresh and creative review` |
| Mobile configurator CTA — zero step-2 views since 2026-08-09 (Wave B, per Lee 2026-09-04) | frontmatter `next` + `### Deferred from the 2026-09-02 code-refresh and creative review` |
| Visual-diff `expectedToChange` waivers expire 2026-10-05 | `.claude/handoff.md` owed + below |
| rhythm.test.mjs crashes on the `/process/` meta-refresh stub | `.claude/handoff.md` owed + below |
| Pixel run owed for the deliberate visible changes on 11 routes | `### Deferred from the 2026-09-02 code-refresh and creative review` |
| Separator dashes: house-style ruling owed (process-step titles, testimonial bylines, addon-price placeholders, six add-on labels pinned by JS, docs JSON and two gates) | `### Deferred from ssc-website-copy-followups (2026-09-04)` |
| dom-integrity fragment pins absorb same-node edits; `$23,500` in meta strings guarded by no gate | `### Deferred from ssc-website-copy-followups (2026-09-04)` |
| dom-integrity whitelist is per-comparison but the file is per-repo (every shipped block reads STALE against later baselines) | `### Deferred from ssc-website-copy-followups (2026-09-04)` |
| dom-integrity crashes intermittently on the `/gallery/` and `/process/` meta-refresh stubs | `### Deferred from ssc-website-copy-followups (2026-09-04)` |
| Retired-voice stragglers outside rendered prose (meta keywords, advisor prompt, dead `site.json` title, two lowercase "authentic") | `### Deferred from ssc-website-copy-followups (2026-09-04)` |
| Quote modal at 390 opens with ~300px dead space above the model title | `### Deferred from ssc-website-copy-followups (2026-09-04)` |
| Landing hero: composition, thesis line, filter/scrim removal (Lee's three calls) | `### Deferred from ssc-website-copy-followups (2026-09-04)` + artifact The Held Photograph |

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
