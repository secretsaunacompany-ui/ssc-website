# SSC Website Redesign — Implementation Plan (rev. 3)

**Created:** 2026-07-28 · **Revised:** 2026-07-28, twice — after critic rev.1 FAIL
(11 must-fixes) and critic rev.2 NOT-CLEARED (four blockers).
**Repo:** `/home/leesalo/Projects/ssc-website` (Eleventy, Netlify, live at secretsaunacompany.ca)
**Critic review:** `.claude/plans/website-redesign-2026-07-critic.md` — 8 FAIL / 7 CONCERN / 1 PASS.
This revision addresses all 11 must-fixes; the mapping is in §9.

---

## 0. What this is

Three specialist audits (2026-07-27) and five Creative Department specifications
(2026-07-28) agree: the design foundation is good, the execution has drifted, and
the funnel has been broken for the site's entire history.

This plan is the **spine**. It sequences the specifications; it does not restate
them.

**Specifications — `docs/redesign-2026-07/`:**

| # | Document | Authority over |
|---|---|---|
| 00 | `00-design-brief.md` | Context, Lee's fixed decisions, verbatim voice source |
| 01 | `01-audit-functional.md` | Forms, configurator failure, security, data sync |
| 02 | `02-audit-copy.md` | Copy audit (superseded by 13) |
| 03 | `03-audit-ux.md` | UX/UI findings with line numbers |
| 04 | `04-brand-guidelines-updated.md` | Replacement brand guidelines |
| 10 | `10-jen-art-direction.md` | Composition, archetypes, page structure, motion, case-study template |
| 11 | `11-beatrice-typography.md` | Type system, fonts, scale, performance |
| 12 | `12-saul-visual-photography.md` | Photography, grid, mark, Cloudinary |
| 13 | `13-george-copy.md` | All copy, microcopy, meta |
| 14 | `14-wim-journey-funnel.md` | Configurator flow, journeys, booking states, analytics |
| 15 | `15-mood-board.html` | The approved visual direction, as a working page |
| 20 | `20-fact-gathering-questions.md` | The 50 questions whose answers become published copy |
| **21** | **`21-resolved-tokens.md`** | **Every contested shared value. Overrides 10–14 on those values.** |

**Arbitration.** The previous rule ("higher number wins for its own lane") could not
resolve disputes about *whose lane it is*, and the real collisions were all of that
kind — `--gutter` was specified twice, same token name, two values. Document **21**
now carries the single agreed value for every contested token, each with the losing
document named and the reasoning stated. **Ted implements shared values from 21 only.**
Anything not in 21 follows its owning document. New conflicts discovered mid-relay
stop the batch and get resolved into 21, never settled in a template.

---

## 1. The problem in three sentences

The "Request Quote" button has never once delivered a submission — it closes the
modal and abandons the user on a generic contact page with their configuration
buried below the fold. The copy sells a category rather than a company. The motion
layer runs six concurrent systems, one of which takes the visitor's scroll hostage
for up to ten seconds on arrival.

The palette, token system, and section rhythm are good and are being kept.

---

## 2. Sequencing — what is actually unblocked

The previous revision claimed WP-0 through WP-2 needed nothing from Lee. **That was
false**, and §6 of that same document said so in two places. Corrected:

| Package | Blocked by |
|---|---|
| **WP-0a** Security + measurement | **Nothing.** Ships today. |
| **WP-0b** Configurator | Q4 (reply-time), Q8 (auto-reply), Q11 (add-on price) |
| **WP-1a** Type + fonts | Doc 21 |
| **WP-1b** Colour, radius, spacing, motion | Doc 21 |
| **WP-2** Composition | Doc 21; **Q7** (per-model prices appear in the `/saunas/` ledger rows); **not** the mark (moved to WP-2a) |
| **WP-2a** Mark | Q10 (badge sign-off) + Saul's asset production |
| **WP-3** Copy | Q4, Q5, Q7, Q12 + source-verification gate |
| **WP-4** New pages | Q1, Q3, Q5, Q6, Q9 + Jen's `/commercial/` `/care/` spec |
| **WP-5** Photography | Lee's shop time |
| **WP-6** Case studies | Q1, Q2 + Jen's case-study template |

**Genuinely unblocked right now: WP-0a, WP-1a, WP-1b.** WP-2 unblocks the moment
doc 21 lands.

---

## 3. Work packages

### WP-0a — Security and measurement (unblocked; partly DONE)

| Item | Status |
|---|---|
| **Legacy analytics stack deleted** — `netlify/functions/analytics.js`, `track.js`, `analytics-tracker-netlify.*`, `analytics-dashboard-netlify.*` | **DONE** `7149b93` |
| **Passthroughs removed** — `netlify/` (function source), `supabase-schema.sql`, legacy dashboard assets | **DONE** `7149b93` |
| Verified by curl: all six paths return 404; site, booking-admin, tracking, Monitor all unaffected | **DONE** |
| CSP tracker unblock — `netlify.toml`, add `https://ssc-ops.netlify.app` to `script-src` + `connect-src` | TODO |
| Analytics events per `14 §8` | TODO |
| Weekly submission-count check (see §7) | TODO |

**The leak, resolved.** The critic's must-fix #1 was an unauthenticated endpoint
returning page URLs and titles for every property posting to the shared store,
including `fern-app.netlify.app`. Root cause: the repo held an **orphaned older
generation** of the analytics stack — its own tracker, reader and dashboard,
referenced by nothing, reachable only by direct URL, and its reader ignored the
`site` column the store already carries. Live tracking is and was the centralized
tracker at `ssc-ops.netlify.app` (`src/_includes/scripts.njk`, `data-site-id="ssc"`);
the dashboard is `ops.secretsaunacompany.ca`. Deleting the orphan removed the
exposure at source. **No analytics data was deleted** — all 6,021 page views,
3,092 sessions and 19,704 events remain, correctly attributed across
ssc / opencanopy / fern / republic.

**On trusting `ssc-ops.netlify.app`.** The CSP grants it script execution on
secretsaunacompany.ca. It is Lee's own Netlify property, already the live tracker
origin, and self-hosting the tracker would duplicate a working centralized system
across five sites. Accepted deliberately. Revisit if that site ever gains
contributors.

### WP-0b — The configurator (blocked: Q4, Q8, Q11)

Wim's two-step modal, `14 §1`. Corrections folded in:

| Item | Source |
|---|---|
| Modal becomes configure → send; real `<form>` to the existing Formspree endpoint, no navigation until success | 14 §1 |
| **`localStorage`, not `sessionStorage`** — a 7-day window is incoherent against per-tab storage that dies on tab close | critic §2 |
| **Four missing states added:** client-side validation failure, double-submit guard, offline, modal closed mid-step-2 | critic §6 |
| Bench omission bug — `modal.js:354` skips `value="0"`, so U-bench never reaches any quote | 14 §1, 01 §1 |
| Quote button contrast — grey Cormorant on warm wood at ~2.4:1 | 11 |
| Modal accessibility — `role="dialog"`, `aria-modal`, focus trap, focus restore | 10 §5.4, 14 §1 |
| Success copy carries the reply-time promise **only once Lee supplies it** (Q4) and claims a confirmation email **only if auto-reply is enabled** (Q8) | 14 §1 |

**Why not the one-hour version.** `01 §5` offers a cheap alternative: rename the
button to "Continue to Quote Request," banner the config on arrival at `/contact/`,
stop deleting the storage key. The critic's inversion test found two of its three
winning conditions already true — there is no funnel data at all, so nobody knows
whether visitors abandon at the handoff or never reach the button. It was still
rejected, on the merits: the handoff *is* the bug. The button promises a submission
and performs a navigation, and the user's mental model completes on the promise. The
cheap version preserves that mismatch and would measure the abandonment rather than
fix it. **But WP-0a ships the CSP fix first**, so a real baseline accumulates while
WP-0b is built — which recovers most of the alternative's value at no cost.

**Definition of done:** a real quote request arrives in the inbox from the modal.

### WP-1a — Type and fonts (blocked: doc 21)

| Item | Source |
|---|---|
| Type token scale (`--text-*`, leading, tracking) replacing 20 ad-hoc sizes | 11 |
| Self-host Cormorant + Outfit; delete the two Google origins from the CSP | 11 §6 |
| **`format('woff2')` with `font-weight: 100 900`** — `format('woff2-variations')` is deprecated syntax that silently falls back to Arial | critic §6, X8 |
| Font binaries in `src/fonts/`, served `max-age=31536000, immutable` via `netlify.toml`; filenames content-hashed, **not** `?v=` stamps (the repo already has stale ones) | critic X8 |
| `fontaine` + `glyphhanger` pinned to exact versions and typosquat-checked before install | integrations rule |
| Cormorant weight-substitution optical sizing; 19px floor; 400 italic added | 11 |
| Outfit body 400/1.65; tabular numerals on prices and specs | 11 |
| Beatrice corrects her malformed step→role table before implementation | critic §10 |

### WP-1b — Colour, shape, spacing, motion (blocked: doc 21)

| Item | Source |
|---|---|
| Section rhythm tokens + container tiers | 21 |
| Grey ramp to three honest tokens; retire the lying `--color-charcoal` (`#c0c0c0`); fix `#666` contrast | 21, 03 |
| Radius collapse; delete frosted-glass cards; nav blur the one exception | 10 §4 |
| Motion: delete `HeroIntroAnimation`, four parallax variants, `slowZoom`; six reveal classes collapse to one `.reveal` | 10 §5 |
| **Grep-clean gate:** no deleted class name survives anywhere in `src/`, `js/` or `styles.css` — **158** usages across the six reveal classes (fade-in 80, slide-up 35, scale-in 16, gallery-item--reveal 17, slide-left 5, slide-right 5), plus 11 stylesheet selectors = 169 total. The 148 figure that circulated earlier counted markup attributes only and would have left dead CSS behind. Per-class breakdown and page concentration: doc 21 §6.7 | critic §6, doc 21 §6.7 |
| Undefined `var(--color-bg)` fix | 03 |
| `stylelint` config banning raw `font-size` / `border-radius` literals outside `:root` | critic §10 |

### WP-2 — Composition (blocked: doc 21)

Jen's archetypes applied. Mark work moved to WP-2a. Otherwise as previously
specified: hero choreography per doc 21, `hero-overlay` retirement,
`section--warm-glow` retirement, `page-bg--fixed` deletion, `/saunas/` inversion,
40/60 alternation, Cloudinary delivery, crop flip, keyboard access, mobile
configurator sheet. Sources: `10 §2–3`, `12 §1.4, §3`, `14 §6`.

### WP-2a — The mark (blocked: Q10 + design production)

Saul's `12 §5` says "**I'll produce** `logo-wordmark.svg`" and the favicon "needs
the usual 2–3 direction exploration." That production had no slot. It is now its
own package: asset redraw, wordmark, monogram, favicon, then nav/footer placement.

Asset debt, path corrected: the source files are **`~/marvin/content/assets/`**
(not this repo — the previous revision dropped the prefix and would have sent Ted
to the wrong repository). `logo.svg` there is Inkscape output with embedded base64
PNG masks — a raster in SVG clothing — and needs redrawing from `logo-original.pdf`
alongside it.

### WP-3 — Copy (blocked: Q4, Q5, Q7, Q12 + gate below)

George's replacement copy, `13-george-copy.md`, **after** the source-verification
pass now in flight.

**Source-verification gate — hard blocker.** Every factual sentence carries an
inline annotation: a repo path, a brief quote, "per Lee, [date]," or it is cut.
The critic found nine unsourced or overstated claims, including a citation to the
brief for a tax treatment the brief never mentions, and an operating-history claim
("still doing it twenty-five years on") derived from a durability *target*. Also
blocking: restore **Homecraft** to the heater list (it is the standard electric
heater; dropping it makes the spec read more premium than what customers receive),
correct the transposed SC dimensions, and fix all four warranty-name instances
including `faq.json:31`, which feeds Google rich results.

The previous revision's check validated only the corrections in §6 and applied "no
invented facts" to every package *except* this one. Inverted.

### WP-4 — New pages (blocked: Q1, Q3, Q5, Q6, Q9 + Jen's spec)

`/process/`, `/commercial/`, `/care/`, `/book/` paused state. `/commercial/` and
`/care/` existed only as journey rationale in Wim; Jen is specifying composition
now, including how `/care/` reconciles against the existing `/warranty/` page
rather than duplicating it.

### WP-5 — Photography (blocked: Lee's shop time)

Saul's shootable brief `12 §1.2` — ten rules for a non-photographer, a 12-shot
detail list, a 10-shot process list. Plus the one-recipe regrade `12 §1.3`: the
library currently has **no shared grade**, so four frames read as four companies.
Culls: retire DSC03223 (unfixable midday light, currently on the homepage).

### WP-6 — Case studies (blocked: Q1, Q2 + Jen's template)

Three confirmed by Lee: **Clarke** (S2, Kitsilano), **Emmanuel** (SC, Edmonton —
43 photos and 45 videos, the only real process footage in the library), and
**Mountain Life** (S4). Jen is expanding `10 §2.1F` from one table cell into an
implementable template.

---

## 4. Explicitly out of scope

- The booking subdomain (separate property)
- Testimonial collection (Lee running separately; slot reserved)
- Blog content (Q7)
- Pricing changes — the first-principles model concluded current prices are sound
  once the trailer is a separate line item. **Except** the add-on reconciliation in
  Q11, which is a correctness blocker, not a pricing change.
- Splitting `styles.css` into partials — named and deferred; the `stylelint` rule in
  WP-1b is the guard against recurrence.

---

## 5. Rollback — verified, not assumed

The previous revision had none. The words rollback, staging, and preview appeared
zero times across the plan and all eight specs.

**What exists, confirmed today:** Netlify retains restorable deploys for this site,
back to 2026-05-14.

**Restore floor — do not go below it.** The obvious restore point,
`6a531f5506b87600082b2a1a` (2026-07-12), is the last state before today's changes
— and restoring it would **re-open the cross-project data leak**, republish the
function source and the database schema, and revert the CSP so analytics stops
recording again. Every deploy created before `6a68f16f80fdaf000837b588`
(2026-07-28 18:14, commit `cc8270f`) carries at least one of those defects.

**The restore floor is `6a68f16f80fdaf000837b588`.** Roll back to it or later,
never past it. If a rollback below the floor is ever genuinely needed, the leak
fix must be re-applied in the same operation, not afterwards.

This is why a rollback story needs a floor and not just a mechanism: "put it
back" is only safe if "back" is a state you would still ship.

**The workflow, per work package:**
1. One WP = one commit on `main` with a stated revert SHA.
2. `npx netlify-cli deploy` (no `--prod`) → draft URL. Review there.
3. `npx netlify-cli deploy --prod` only after review passes.
4. **Rollback:** `netlify api restoreSiteDeploy` with the prior deploy id — instant,
   no rebuild. Code rollback is `git revert <sha>` then redeploy.

**In plain English for Lee:** if something looks wrong, say "put it back." The
orchestrator runs the restore; you never touch a command. Recovery is seconds, not
a rebuild.

---

## 6. Verification

| Package | Gate |
|---|---|
| WP-0a | Curl every deleted path → 404. Site, booking-admin, tracking, Monitor unaffected. **Done and verified.** |
| WP-0b | A real quote request arrives in the inbox. Razor pass on the form path. |
| WP-1a/1b | **Screenshot-diff gate — the harness now exists** (`0099bcf`): `npm run visual-diff -- --baseline main --candidate <branch>`. Builds both refs, captures 19 pages at 1440 and 390, gates on a structural layout-shift metric (luminance-edge row signatures, so a recolour scores ~0 shift while a 4px move scores 4px) plus changed-pixel percentage. Proven: `main` vs `main` = exactly zero changed pixels; a deliberate 4px regression caught on the right page at both widths, exit 1. Budget: no shift >8px outside the `expectedToChange` allowlist, **enumerate the expected pages before starting**. See `scripts/README.md`. **Known limits, from its author:** a bare sub-8px shift passes the shift gate on its own (4 < 8 — the 4px proof failed on pixel percentage instead), so lower `maxLayoutShiftPx` if that matters; interactive states (open FAQ, modals, lightbox, map) are uncovered — every capture is first-load, scrolled to top; residual noise floor is 15 pixels from Chromium decode variance. Plus grep-clean for deleted classes, and Lighthouse before/after on font loading. |
| WP-2/2a | Jen Stage-3 review against `10 §3`, page by page. |
| WP-3 | Source-verification gate (§3) + brand-critic pass. |
| WP-4/5/6 | Jen review; no invented facts. |
| Throughout | `prefers-reduced-motion` in CSS **and** JS; AA contrast at every size; keyboard-complete. |

"Near-nil visual regression" is deleted as an acceptance criterion — it was
unfalsifiable with no instrument to measure it. The `npx tsc` line is deleted; this
is a static Eleventy site with no TypeScript.

---

## 7. Operability

No alerting watches the channel that actually works. A regression in `js/forms.js`
on the 201-submission contact form would be invisible until the inbox went quiet.

**Weekly submission-count check:** submissions this week vs prior week, surfaced to
Lee in plain English. Cheap, and the only instrument on this stack that catches a
silent revenue outage.

---

## 8. Blocking questions

Two-way table, generated from the WP rows. The full 50-question fact-gathering list
is `20-fact-gathering-questions.md`; these are the ones that block work.

| # | Question | Gates |
|---|---|---|
| Q1 | Case-study builds: publishable location, year, footprint, species, heater, client permission | WP-4, WP-6 |
| Q2 | Drawings — do presentable plans or field sketches exist, and will you publish them? | WP-6 |
| Q3 | Process facts — timeline durations, payment milestones (§A of doc 20) | WP-4 |
| Q4 | Reply-time promise for the quote success panel | **WP-0b**, WP-3 |
| Q5 | Warranty terms per component + certification body name (§B of doc 20) | WP-3, WP-4 |
| Q6 | Which commercial clients may be named / photographed | WP-4 |
| Q7 | Smaller calls: schema address, fire-ban scope, headcount phrasing, blog unlink, per-model prices on `/saunas/`, interim testimonials | **WP-2**, WP-3 |
| Q13 | **Design deposit** — adopt David's recommendation (doc 34)? $750 residential / $2,500 commercial, called a "design deposit", credited against the first 30% payment, non-refundable, two revision rounds included, further revisions $95/hr. Free call and free Sea-to-Sky site visit stay free. Changes `/process/`, `/contact/`, the FAQ and the quote template. | WP-3, WP-4 |
| Q14 | **Formspree plan tier** — does it include auto-response? Gates whether the quote confirmation may claim an email is coming (doc 33 §4). | **WP-0b** |
| Q8 | Formspree auto-reply — enable? (recommended) | **WP-0b** |
| Q9 | Laser cut file — does a real one exist? | WP-4 |
| Q10 | Badge removal from nav — sign-off | **WP-2a** |
| **Q11** | **Add-on prices — RESEARCHED, needs Lee's sign-off only.** See docs 30 and 31. Findings: **Revive 9kW** heater is $1,850 but the working stack (contactor $275–350 + touchpad $300 + rocks $200–350) is $2,625–2,850, so the +$2,000 add-on runs 16–27% incremental → **charge $2,750**. **Kuuma Banya** landed cost is now ~$6,150–6,700 against a $3,000 list, losing ~$3,000 a sale → **freeze holds**, route wood-fired to the Harvia Pro 20 ($1,910). **Extra window** is a tiering error, not a pricing error — one price covers a small lite ($720–900 cost) and a full-size lite ($1,650–1,900) → split the line. **15kW Apex** sells $1,000 below supplier retail. **Catalogue defect:** the "9kW Apex" does not exist — Homecraft's Apex line is 10/12/15/18kW, and the recorded cost matches the Revive. | **WP-0b** |
| **Q12** | **Tax treatment** — whether PST applies to a custom sauna build turns on goods vs improvement-to-real-property. Get it from Jon before any tax line publishes. | WP-3 |

**Price source of truth.** Prices are currently hardcoded in `saunas.njk:214–274`,
duplicated across nine meta descriptions, and add-ons live separately in
`modals/sauna.njk`. **Note:** `models.json` does *not* exist in this repo — it
lives at `~/marvin/content/reference/operations/models.json`, and `js/data.js` is
the website's own copy. Earlier drafts cited it as though it were local; it is not.
Before WP-2/WP-3 add further price surfaces, model and add-on prices move into
`src/_data/models.json` **in this repo**, seeded from the marvin file plus the
corrections in Q11, and every occurrence renders from it, meta descriptions
included. Two copies of a price is how the current drift happened.

---

## 9. Must-fix mapping

| # | Critic must-fix | Where addressed |
|---|---|---|
| 1 | Close the cross-project leak | §3 WP-0a — **DONE**, verified by curl |
| 2 | Rebuild §6 as a two-way gate table | §8 |
| 3 | Source-verification gate + fix nine claims | §3 WP-3; George revising now |
| 4 | Reconcile the Revive 9kW price | §8 Q11 |
| 5 | Rollback story | §5 |
| 6 | Resolve token collisions into one file | Doc 21; agent in flight |
| 7 | Split WP-1, give it an instrument | §3 WP-1a/1b, §6 screenshot-diff |
| 8 | Storage bug + missing states | §3 WP-0b |
| 9 | Spec `/commercial/`, `/care/`, case-study template, mark phase | §3 WP-2a, WP-4, WP-6; Jen revising now |
| 10 | Font format, directory, cache headers, pin tooling | §3 WP-1a |
| 11 | Weekly submission check | §7 |

Also corrected: the logo asset path (`~/marvin/content/assets/`, not this repo);
the per-model pricing escalation, which Jen raised as an open question when the
prices are already live at `saunas.njk:214–274`; and a corrupted glyph in §2.
