---
status: active
current: "Redesign 2026-07 — WP-A cleared to build (pre-flight, harness repair, quote-integrity fixes, type/font system, colour+motion, mark). Plan: .claude/plans/redesign-wave-a.md"
next: "Lee's outstanding answers unblock WP-2 (per-model prices), WP-3 (copy), WP-4 (process + warranty facts). See docs/redesign-2026-07/20-fact-gathering-questions.md"
testing: "npm run visual-diff -- --baseline main --candidate <branch> (harness repair pending — see plan §2)"
pinned: false
shipped:
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
