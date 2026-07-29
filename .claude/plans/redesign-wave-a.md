# Redesign Wave A — everything not blocked on Lee

**Created:** 2026-07-28
**Repo:** `/home/leesalo/Projects/ssc-website` (Eleventy, Netlify, live at secretsaunacompany.ca)
**Parent plan:** `.claude/plans/website-redesign-2026-07.md` (rev. 3)
**Clearance:** `.claude/plans/website-redesign-2026-07-critic-rev3.md` — partial clearance granted
**Specs:** `docs/redesign-2026-07/` — see ROADMAP for the authority table

---

## 0. Scope, and what is deliberately absent

Wave A is **the work that needs no further input from Lee.** Everything gated on
his outstanding answers is docked in `docs/redesign-2026-07/20-fact-gathering-questions.md`
and is out of scope here — not deferred vaguely, but named and excluded:

**Out of scope, blocked on Lee:** WP-2 composition (needs Q7, per-model prices),
WP-3 copy (process/warranty facts, design deposit, five small calls), WP-4 new
pages, WP-6 case studies (parked while Lee agrees packages with the three clients).

**Now IN scope — WP-0b, the configurator.** Lee's call (2026-07-28): *"Given the
importance of accurate quotes, I think we should be including the configurator
rebuild in this relay."* The critic's blocker 2 was that the costing basis was a
decision nobody had taken and twelve of fifteen priced lines were unreconciled.
**The basis is now decided** (incremental plus margin, bias upward) and the price
sheet is in production as `35-configurator-price-sheet.md`. See §3a.

**In scope:** two pre-flight fixes, the harness repair, two quote-integrity
corrections, the measurement remainder, the type/font system, the colour and
motion system, and the mark.

Ted implements shared token values from **doc 21 only**. Anything not in doc 21
follows its owning document. A new conflict discovered mid-relay stops the batch
and is resolved into doc 21 — never settled in a template.

---

## 1. Pre-flight — both one line, neither deferrable

The critic's condition: *"Neither may be deferred past the first production deploy
of anything."*

### P-A — Cache keys *(critic N1)*

`src/_includes/head.njk:301` and `src/_includes/scripts.njk:3–15` serve `styles.css`
and `js/*` behind `max-age=31536000, immutable` keyed on hand-typed `?v=` stamps.
Several are already stale — `forms.js` changed in February and its stamp still reads
`20260226`.

**Consequence if skipped: returning visitors keep the old site for up to a year.**
The entire redesign would ship and be invisible to everyone who has already been
to the site.

Preferred fix: an Eleventy filter appending a content hash, so the stamp cannot go
stale. Minimum fix: bump every `?v=` in the same commit as any change to those files.

**Either way, this becomes a line in the definition of done for every package that
touches `styles.css` or `js/*`.**

### P-B — Build cleanliness *(critic N2)*

`netlify.toml` already runs `rm -rf dist && npx @11ty/eleventy` — that was fixed
after deleted files came back from a cached publish dir. But `package.json`'s `build`
script does **not**, and the plan's own deploy workflow uploads an uncleaned local
`dist/`, bypassing the fix.

- Add `rm -rf dist &&` to the `build` script in `package.json`.
- Use `netlify-cli deploy --build` for both the draft and production steps.
- **Run absence checks against the deploy permalink, after the deploy** — not against
  the apex domain, and not before. That ordering is what caught the resurrection.

---

## 2. The harness repair

The harness exists (`scripts/visual-diff.mjs`, `0099bcf`) and its structural metric
is the right idea. It does not currently meet the bar, measured rather than argued:
it reports zero shift for any shift beyond 240px, zero for a page whose content
changed entirely, and passes a 6px sitewide button move at both widths.

**Required before any WP-1 production deploy:**

| Fix | Why |
|---|---|
| Gate `shiftCoverage` and `layoutShiftMaxPx` | Both are already computed and neither is gated. This is most of the repair. |
| `expectedToChange` waives `changedPct` **only**, never the shift gate | A stylesheet rewrite forces the allowlist, and today the allowlist silently waives the one metric that matters. |
| Zero-comparison runs **fail** | Comparing a ref to itself should be an error, not a pass. |
| Three fixture tests | The harness has no tests of its own. It is a fixture certifying a whole-stylesheet migration; the rubric's "testing the tests" clause applies to it directly. |

**Also:** the "zero changed pixels" determinism result holds partly because a cache
bug stops the hero video rendering in either build. Fix or document — a determinism
claim resting on a second bug is not a determinism claim.

**If the repair is declined**, say so explicitly and substitute a named page-by-page
human review at both widths — and then stop describing the harness as an acceptance
gate anywhere in the plan.

---

## 3. WP-0c — Quote integrity

Two corrections. Neither needs a pricing decision; both stop something wrong from
reaching a customer.

### Bench data loss *(cleared by critic)*

`js/modal.js:356` skips any checked radio whose `value === '0'`. Both bench options
carry `value="0"`, so **the bench choice is silently dropped from every quote the
site has ever produced.**

Scope the fix to the bench group specifically, so the six legitimate
"none / included" defaults do not start appearing in summaries.

### WiFi controller as a $2,000 line *(per Lee, 2026-07-28)*

The Premium Finish Package advertises *"Save $1,000 vs selecting individually."*
It bundles a WiFi controller that cannot be bought individually, so the basket a
customer can actually assemble is $6,000 against a $7,000 package — **the claim is
wrong by $2,000 in direction, on every model, live now.**

Add WiFi as an individually-selectable $2,000 option in
`src/_includes/modals/sauna.njk` and the modal total logic. The basket becomes
$8,000, the claim becomes true, and a high-margin line stops being given away
inside a bundle. Research priced a heat-rated controller around $550.

**Verify:** with WiFi selected individually alongside the other four components,
the total must exceed the package price by exactly $1,000 on all five models.

---

## 3a. WP-0b — The configurator

The package this whole programme exists for. The button has never once delivered
a submission in the site's history.

**Authority:** `14-wim-journey-funnel.md` §1 for the flow,
`35-configurator-price-sheet.md` for every number, `33-intake-form-design.md` §6
for the Step 2 field set.

### The flow

Two-step modal — configure, then send — with a real `<form>` posting to the
existing Formspree endpoint from inside the modal. **No navigation until success.**

- **`localStorage`, not `sessionStorage`.** A 7-day window is incoherent against
  per-tab storage that dies on tab close.
- **Step 2 carries five fields**, not three: name, email, notes, **location** and
  **site access**. A configuration without a location is still an unscopeable lead
  — this is Wim's own self-override in doc 33 §6.
- `_gotcha` honeypot and a dynamic `_subject` so the inbox is triageable and the
  configurator stream is countable separately from contact-form traffic.
- **Six states**, all specified: configure, send, sending, success, failure,
  `/contact/` fallback. Plus the four the review added — client-side validation
  failure, double-submit, offline, and modal closed mid-step-2.
- Failure keeps the form mounted with values intact and offers a `mailto:`
  fallback carrying the configuration. The config must always have a second exit.
- `role="dialog"`, `aria-modal`, focus trap, focus restore. A flow that leads to
  money is keyboard-complete or it is not done.
- **Success copy branches on a `site.json` flag** and never claims a confirmation
  email unless Formspree autoresponse is actually enabled. True either way; not
  gated on the answer.
- Reply-time promise reads **"within three business days, usually the next day"**
  — the bad-week number, so it holds on the worst week rather than the best.

### The prices

Every line from `35-configurator-price-sheet.md`. Load-bearing changes:

- **Kuuma removed.** Live at +$3,000 against ~$6,150–6,700 landed. This is a
  ~$3,000-per-sale loss quoting today, and "the freeze holds" described an
  internal state the website disagreed with.
- **Wood-fired replaced** by the IKI line, priced with margin.
- **WiFi controller added at $2,000**, individually selectable — which makes the
  Premium Package's "Save $1,000" true instead of backwards by $2,000.
- **SC heater path priced separately** from the 15kW Apex's real cost. One
  `+$2,000` slot currently sells two different heaters and only one was ever priced.
- **Bench group fix** (§3) so bench choice stops vanishing from every quote.
- **Catalogue string fix:** `js/data.js:84` advertises a "Homecraft 9kW Apex" that
  the manufacturer does not make — the Apex line is 10/12/15/18kW. It renders
  publicly in the modal spec grid and the compare table.

### Still open at time of writing

**Changing rooms.** Lee has not accepted $8,500 / $10,500–11,000 and asked for the
derivation. If the itemised takeoff lands before this package starts, the numbers
go in; if not, **the changing-room lines ship at current prices and are flagged**,
rather than holding the whole package. They are the only unresolved lines.

### Verify

A real quote request arrives in the inbox from the modal, carrying every selected
option including the $0-value bench choice, with location and access attached.
`quote_submit_success` moves off zero.

---

## 4. WP-0a remainder — Measurement

Analytics only started recording on 2026-07-28, when the CSP was corrected. There
is no historical funnel data for this site at all.

- **Events** per `14 §8` — roughly fifteen named events with payloads. The one that
  matters is `quote_submit_success`, which has been zero for the site's entire
  history and is the success criterion for the whole programme.
- **Count the configurator stream separately** via `_subject` *(critic N4)*, so a
  configurator submission is distinguishable from a contact-form one.
- **Weekly submission check** — submissions this week against last, surfaced to Lee
  in plain English. It is the only instrument on this stack that would catch a
  silent revenue-channel outage; a regression in `js/forms.js` would otherwise be
  invisible until the inbox went quiet.

---

## 5. WP-1a — Type and fonts

Governed by `11-beatrice-typography.md`, with shared values from doc 21.

- Type token scale replacing twenty ad-hoc sizes doing nine jobs.
- Self-host Cormorant Garamond + Outfit. Both are OFL. This **shrinks** the CSP —
  it deletes two Google origins rather than adding any.
- `format('woff2')` with `font-weight: 100 900`. **Not** `format('woff2-variations')`,
  which is deprecated syntax that silently falls back to Arial — the exact CLS
  failure the self-hosting is meant to prevent.
- Font binaries in `src/fonts/`, content-hashed filenames, `max-age=31536000, immutable`.
  Content-hashed, **not** `?v=` stamps — see P-A for why.
- `fontaine` and `glyphhanger` pinned to exact versions and typosquat-checked before install.
- Cormorant: weight-substitution optical sizing, 19px hard floor, 400 italic added.
- Outfit: body moves to 400/1.65; tabular numerals on prices and specs.
- Beatrice corrects her malformed step→role table before implementation begins.

**Cleared to implement and deploy to a draft URL.** Production gated on §1, §2, and
doc 21's T1–T4 count corrections.

---

## 6. WP-1b — Colour, shape, spacing, motion

Governed by doc 21 for tokens and `10-jen-art-direction.md` §4–5 for the systems.

- Section rhythm tokens and container tiers.
- Grey ramp to three honest tokens. Retire `--color-charcoal` — the name says
  charcoal, the value is `#c0c0c0`, a light silver. 14 call sites, all `color:`
  declarations, enumerated in doc 21 §6.1.
- Define `--color-bg`. The stylesheet consumes it twice and never defines it — a
  live bug matching audit finding P0-3.
- Radius collapse. Delete frosted-glass cards; the nav blur is the one sanctioned
  exception.
- Motion: delete `HeroIntroAnimation`, four parallax variants, `slowZoom`. Six
  reveal classes collapse to one `.reveal`.
- **Grep-clean gate:** no deleted class name survives in `src/`, `js/`, `styles.css`
  **or `booking-ops.html`** *(critic T2 — it sits outside `src/` and would have been
  missed)*. Verified figure is **158** class usages plus 11 stylesheet selectors =
  169 total. The 148 that circulated earlier counted markup attributes only.
- `stylelint` config banning raw `font-size` / `border-radius` literals outside
  `:root` — the guard that makes the consolidation permanent rather than a one-time
  tidy.

**Cleared to implement and deploy to a draft URL.** Same production gate as WP-1a.

---

## 7. WP-2a — The mark *(unblocked by Lee, 2026-07-28)*

Lee's decision: **remove the badge from the nav; it becomes a maker's mark.**

Per `12-saul-visual-photography.md` §5 and `10-jen-art-direction.md` §9:

1. Redraw from `~/marvin/content/assets/logo-original.pdf`. The existing
   `logo.svg` there is Inkscape output with embedded base64 PNG masks — a raster
   wearing SVG clothing.
2. Wordmark SVG at 22px for the nav, `currentColor`.
3. Badge to the footer as a maker's seal at 72px.
4. Monogram — 2–3 direction exploration — for mobile nav and favicon.
5. Favicon set.
6. Assets land in `src/assets/brand/`.

A PNG-at-2x stopgap is sanctioned for the nav if the SVG redraw runs long. **None
for the favicon.**

Runs parallel to WP-1; blocks nothing in it.

---

## 8. Sequencing

```
P-A ─┐
P-B ─┴─► WP-0c ─► WP-0a ─► WP-1a ─► WP-1b ─► [prod gate] ─► production
         (quote)   (events)  (type)   (colour)
                                          ▲
    §2 harness repair ────────────────────┘
    WP-2a mark ── parallel, independent ──┘
```

Each package is one commit on `main` with a stated revert SHA. Draft deploy,
review on the draft URL, then production. Nothing merges to production before
§1 and §2 are done.

**Owner for shared files:** `netlify.toml` and `styles.css` are touched by several
packages. One owner, sequential merges, no parallel edits. WP-1a edits the CSP
(removing Google origins); nothing else may touch it in the same window.

---

## 9. Rollback

**Restore floor: `6a68f16f80fdaf000837b588`** (2026-07-28 18:14, commit `cc8270f`).

Every deploy before it carries at least one of: the cross-project data leak, the
published function source and database schema, or the CSP that stopped analytics
recording. Roll back to the floor or later, never past it. If a rollback below the
floor is ever genuinely needed, the leak fix is re-applied in the same operation.

Mechanism: `netlify api restoreSiteDeploy` with a deploy id — instant, no rebuild.
Code rollback is `git revert <sha>` then redeploy.

**For Lee, in plain English:** if something looks wrong, say "put it back." The
orchestrator runs it. You never touch a command, and recovery is seconds.

---

## 10. Definition of done

Per package:

- [ ] `?v=` stamps bumped or content-hash filter in place *(P-A — every package touching `styles.css` or `js/*`)*
- [ ] `npm run visual-diff` passes against `main`, with expected-to-change pages enumerated **before** the work starts
- [ ] Grep-clean: no deleted class name survives in `src/`, `js/`, `styles.css`, `booking-ops.html`
- [ ] Draft deploy reviewed at 1440 and 390
- [ ] Absence checks run against the **deploy permalink, after deploy**
- [ ] `prefers-reduced-motion` honoured in CSS **and** JS
- [ ] AA contrast at every size actually used, on both ground and elevated surfaces
- [ ] Keyboard-complete on every interactive surface touched
- [ ] One commit, revert SHA stated

Programme-level: `quote_submit_success` moves off zero. It has never been anything
else.
