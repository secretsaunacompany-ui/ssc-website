# Redesign Wave A — everything not blocked on Lee

**Created:** 2026-07-28
**Updated:** 2026-07-29 — changing-room takeoff landed and survived Lee's accent-wall correction (prices unchanged); decks split two-tier (open platform + semi-enclosed); speakers split two-tier (standard + Polk premium). All in `35-configurator-price-sheet.md` (§2, §2B, §5B, decision rows 6/7/8–9b/14–14b).
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

### P-C — Reproducible builds *(critic X8)*

`package-lock.json` is gitignored and untracked while `@11ty/eleventy` floats on
`^2.0.0` — the build tool is the least-pinned thing in a programme whose deploy
story rests on reproducible builds, and Wave A adds three dev dependencies and a
font pipeline on top. Un-ignore and commit the lockfile; pin Eleventy exact. Two
lines, same cheap-now-expensive-later profile as P-A and P-B. Before WP-1a.

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

**Budgets — stated, not vibes** *(critic 9.2)*: on any page not in
`expectedToChange`, the gate fails at `layoutShiftMaxPx` > **4px** or
`shiftCoverage` < **0.95**. The three fixture tests calibrate the budgets — the
6px sitewide button move **must fail** and the self-comparison **must error**;
a budget the fixtures don't confirm is renegotiated in the plan, not in the
harness. `expectedToChange` restructures to **per-metric waivers** (a page may
waive `changedPct` and remain shift-gated) — a restructure, not a flag flip.
Four fail-open paths close and fail loud: `widths: []` errors, `fetchFailures > 0`
fails, the missing-PNG `continue` (`visual-diff.mjs:174`) fails, discarded redirects fail.
`WORKING` mode builds to a temp dir — never `rm -rf` against the live working tree.

**Hero video, resolved one way:** harness capture **stubs the video element**, so
determinism holds by construction; the underlying cache bug is filed as a site bug
and fixed on its own merits — the determinism claim no longer leans on it.

**Per-page overrides (orchestrator reconciliation, 2026-07-30, post-Razor batch 1
— his W5):** the budgets paragraph scoped shift gates to pages *not* expected to
change while also making them unwaivable — which leaves a page whose type scale
legitimately moves content 20px with no path to a green run, and the only
remaining lever (lowering the global budgets) is forbidden by the config's own
authority note. Reconciliation: global budgets stay unwaivable and untouchable; a
page may carry an explicit `pageOverrides` entry — `{page, metric, value, reason,
expires}` — that **raises a named budget, never disables a metric**, for a stated
reason with an expiry date. Overrides are diff-visible, fixture-tested, and
reviewed like code. The silent-blanket-waiver class stays dead; deliberate
restyles become shippable under review instead of un-shippable or re-run-until-green.

*Refined post-re-review (2026-07-30, Razor W-C/W-D, orchestrator-ratified):*
override direction follows the metric's TYPE — ceiling metrics
(`maxLayoutShiftPx`, `maxChangedPct`) may be **raised**, capped at 100× the
global (loud is fine, infinite is not); the floor metric (`minShiftCoverage`)
may be **lowered** — that is the shippable direction — bounded to [0.75, 1)
(below 0.75, a quarter of the page's rows can't be matched and that needs a
human conversation, not a config line). `expires` is mandatory and at most
90 days out at commit time. Same reason + expiry + report.json visibility for
every direction.

**Lazy-image dimensions (pulled forward, 2026-07-30 — Razor W4):** the `/about/`
flake's root cause (`loading="lazy"` images with no `width`/`height`) is real
visitor CLS and a standing flake source for every later batch. It becomes its own
micro-batch immediately after Batch 1 closes — a deliberate rendered-output
change, made under the repaired harness's own eyes with `pageOverrides` entries
carrying its expected shifts, reviewed normally. Not folded into Batch 1 (whose
contract is zero rendered change) and not left to WP-1b (too late to stop the
flakes in between).

**If the repair is declined**, say so explicitly and substitute a named page-by-page
human review at both widths — and then stop describing the harness as an acceptance
gate anywhere in the plan.

**Global-offset matching (instrument evolution, 2026-07-30 — from WP-1a's honest
failure):** the mandated 1.8→1.65 leading uniformly compressed every page (−83 to
−454px, content proven identical) and the row matcher's 240px search window reads
uniform compression as unmatchable chaos — coverage collapsed below the override
floor, which then correctly demanded a human conversation. This is that
conversation's outcome: the matcher learns to estimate a single global vertical
offset per page-pair (e.g. median row displacement) and match rows relative to
it, reporting the offset separately. Rules: (1) SEPARATE commit, authored by the
harness's own implementer, never by the agent whose batch awaits certification;
(2) fixtures prove the 6px sitewide move and a genuine row REORDER still fail
while uniform compression passes with honest coverage; (3) Razor reviews the
instrument change BEFORE any batch is re-measured against it; (4) the offset
itself is reported and gated (a page may compress; it may not compress
differently at the two widths without explanation). WP-1a re-measures only after
all four hold. The eighteen rejected `layoutShiftMaxPx` overrides stay rejected —
the implementer's own fixture proved they disarm the site-wide calibration, which
is the exact blindness the mechanism was built to refuse.

*Extension to affine (2026-07-30, same conversation):* the offset model landed
and honestly reported its own limit — leading changes compress progressively,
so a constant offset fits at 3% confidence and cannot certify WP-1a (measured,
locked in fixture G6). The model extends to an **affine fit** (offset + scale),
which is the actual geometry of a line-height change. Same four rules as above,
plus: scale bounded to a sane band (~[0.8, 1.05]) and reported beside the
offset; cross-width scale divergence gated like offset divergence; the reorder
and 6px-local-move fixtures re-proven under the affine model (an affine fit must
not launder either); confidence still reported, and a low-confidence fit still
fails. One Razor review covers both instrument commits before WP-1a re-measures.
The alternative — demoting the harness to advisory for the wave's largest visual
batch — is rejected: it is the outcome the Batch 1 repair exists to prevent.

*Instrument follow-ups queued (2026-07-30/31, Razor's instrument reviews):*
(0) Flake retirement (NOTE-A, next instrument touch): give mutation predicate
A-m12 the F1 treatment — assert the mutation *materially shrank* the measured
value relative to the reference (`v < ref - 2`), not that it landed under a bare
constant with 1px of render headroom; and make the battery's failure detail
interpolate the measured number so a one-in-twenty flake self-diagnoses on first
recurrence. Neither gates anything — the failure mode is false-red only.
(1) the long-distance small-reorder blind spot — rows displaced beyond the 240px
search window drop from the residual set, so <5% of rows swapped across a long
page reports spread 0 and passes coverage (sized: 8 row-pairs on a 400-row page
= clean PASS); mitigation is already-in-hand information — count and report "N
rows matched only outside the search window". Later instrument round; does not
gate WP-1a (a leading change is not a reorder). (2) fonts.test.mjs cannot
self-run from a clean checkout (exits 1 without a prior build, unlike every
sibling suite) — fold into WP-1a's review round. (3) The fixture-realism lesson,
recorded for every future instrument change: synthetic fixtures with unique
per-row signatures test the instrument against pages unlike the ones it
measures; every new estimator behaviour needs at least one fixture built from
repeating-texture content that mirrors the real site.

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
customer can actually assemble is `interiorUpgrade + $5,000` against a package at
`interiorUpgrade + $6,000` — **the claim is wrong by $2,000 in direction, on every
model, live now** (the gap is model-invariant; per-model absolutes vary).

Add WiFi as an individually-selectable $2,000 option in
`src/_includes/modals/sauna.njk` and the modal total logic. The assemblable basket
rises from `interiorUpgrade + $5,000` to `interiorUpgrade + $7,000` against a
package at `interiorUpgrade + $6,000` — the "Save $1,000" claim becomes true on
every model (the gap is model-invariant; dollar absolutes quoted previously were
the S2 row only), and a high-margin line stops being given away inside a bundle.
The full controller stack costs $1,020 direct ($550 heat-rated touchpad + $350
contactor + 2 h) — doc 35 row 15; $550 is one component, not the basis.

**Verify:** with WiFi selected individually alongside the other four package
components, the basket-minus-package delta must equal **the saving stated at
`sauna.njk:161`**, on all five models, at whatever prices are live in that commit.
Never a hardcoded dollar figure: at current prices the stated saving is $1,000 and
this makes it true; when WP-0b-ii lands doc 35 change 13, the stated saving becomes
**"Save $500"** and the copy ships in the same commit as the prices that make it
true (§3a). A verify criterion that names a number certifies the wrong world the
moment the other world deploys — that is critic rev.4's central finding, folded.

---

## 3a. WP-0b — The configurator — TWO commits (critic rev.4, inversion)

The package this whole programme exists for. The button has never once delivered
a submission in the site's history.

**Authority:** `14-wim-journey-funnel.md` §1 for the flow,
`35-configurator-price-sheet.md` for every number, `33-intake-form-design.md` §6
for the Step 2 field set.

**The split.** WP-0b is two commits with different risk profiles, different revert
consequences, and different approvals:

- **WP-0b-i — funnel rebuild.** The form, states, a11y, fallback, storage, events.
  **Zero price changes.** Needs no decision from Lee. Reverting it restores a
  broken funnel but never moves a price.
- **WP-0b-ii — repricing.** All nineteen doc 35 §6 changes as one commit, including
  the savings copy. **Gated on Lee's price-transition and discounting answers.**
  Reverting it is a deliberate price flip — `git revert` of this one commit only,
  never a deploy-restore that drags the funnel out with it.

### WP-0b-i — the flow

Two-step modal — configure, then send — with a real `<form>` posting to the
existing Formspree endpoint from inside the modal. **No navigation until success.**
(The endpoint is defined once — `contact.njk:18` and the hardcoded fallback in
`js/forms.js:16` collapse to one source before this form becomes a third copy.)

- **`localStorage`, not `sessionStorage`.** A 7-day window is incoherent against
  per-tab storage that dies on tab close.
- **`js/navigation.js:72–79` moves with the storage.** It reads
  `sessionStorage.getItem('ssc_quote_config')` and deletes on read; switching the
  modal to `localStorage` without it silently kills the `/contact/` fallback state.
  Carry doc 14 §1:47–49 in full: delete-on-read removed, the key survives until
  successful submit, `/contact/` shows a visible attached-config banner.
- **One key, last writer wins, version-stamped.** The stored config carries a
  `priceSheetVersion`. On restore with a stale stamp, totals recompute from the
  stored selections against live prices with a visible "prices have been updated"
  note — a saved total never silently disagrees with its own line items, and a
  price deploy never resurrects a pre-deploy total. Two tabs share one key by
  design; last write wins, stated.
- **Retention & privacy (X2, gating — Petra pre-check folded 2026-07-30):**
  cleared on successful submit; expires at 7 days; a visible "start over" clears
  it on demand, with the one-line notice **"your progress is saved on this device
  for 7 days"** beside it. The key holds a physical address and site-access notes
  in plaintext — that is why the rule is explicit. Petra's corrections, same
  commit: (1) the governing statute is **BC PIPA (SBC 2003 c.63)**, not PIPEDA —
  privacy language builds against PIPA ss.6-9/34/35, PIPEDA covers only the
  cross-border flow; (2) **the US transfer is disclosed at the point of send** —
  one line near the Step 2 submit ("sent via our US form processor — see privacy
  policy") so consent is informed, per OIPC BC guidance on foreign storage;
  (3) **server-side retention gets a number**: Formspree submission auto-delete
  set to 90 days (confirm the plan tier supports it — if not, a documented manual
  purge cadence), inbox practice stated on the privacy page. Step 2 carries a
  privacy-policy link beside the submit. **Pre-deploy checks:** privacy page in
  front of Petra (must-haves: the five fields + purpose, Formspree named with US
  location, both retention stories, access/correction contact with the 30-day
  PIPA response duty, OIPC BC complaint route) and the Formspree DPA/terms
  sufficiency check (Pierre owns the wording call). The email field is collected
  for quoting only — it joins no mailing list without separate CASL consent.
- **Serialisation contract: composed blob.** The form posts one human-readable
  `configuration` field composed from the live summary, plus name / email / notes /
  location / access as named fields, plus `_subject` and `_gotcha`. **Not**
  per-option named fields — three checkboxes carry no `name` attribute today and
  two radio groups still collide on `value` until 0b-ii; a composed blob is immune
  to both failure modes. `_subject` is doc 33 §6's string —
  `Configurator Quote — {Model} — ${Total} — {location}` — arbitrated into doc 21
  (2026-07-30); doc 14's variant loses.
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

### WP-0b-ii — the repricing

**The enumeration is doc 35 §6's nineteen-change table, not this section.** The
commit is verified against that table **row by row, all nineteen** — this list is
highlights only, and treating it as the enumeration is how ten changes went
missing before critic rev.4 caught it. Among the nineteen: the S2–S8 electric
heater rises $2,000 → **$3,500** (not just the SC split), `interiorUpgrade` and
`premiumFinishPrice` reprice per-model, both exteriors go per-model, a **new
$3,700 full-size window tier** is born, lighting rises to $2,000, the savings
copy becomes **"Save $500"** (change 13 — same commit as the prices), the deck
group gains its two semi-enclosed options (rows 8b/9b) and the speaker group its
premium option (row 14b). Load-bearing highlights:

- **Kuuma removed.** Live at +$3,000 against ~$6,150–6,700 landed. This is a
  ~$3,000-per-sale loss quoting today, and "the freeze holds" described an
  internal state the website disagreed with.
- **Wood-fired replaced** by the IKI line, priced with margin.
- **WiFi controller** — already added by WP-0c, where it makes the current
  "Save $1,000" claim true at current prices. In *this* commit's world the honest
  saving is **"Save $500"** (change 13) — the copy and the prices that make it
  true ship together here, never a commit apart.
- **SC heater path priced separately** from the 15kW Apex's real cost. One
  `+$2,000` slot currently sells two different heaters and only one was ever priced.
- **Bench group fix** (§3) so bench choice stops vanishing from every quote.
- **Catalogue string fix — swept, not spot-fixed:** "Homecraft 9kW Apex" names a
  heater the manufacturer does not make (the Apex line is 10/12/15/18kW), and the
  string lives in **five files**, not the one previously named — sweep every
  occurrence (`js/data.js` plus the four the critic enumerated in finding 8.2),
  then grep-prove zero survivors. The literalism class, closed rather than sampled.
- **Value-collision sweep completed:** three radio groups collide today — bench
  (both `value="0"`, fixed in WP-0c), exterior (both `value="2500"`, fixed by the
  per-model split), and **interior — Clear Cedar and Thermowood both carry
  `value="interiorUpgrade"`** (`sauna.njk:134,:139`), which nothing fixed.
  Thermowood gets its own token in this commit. Doc 35 §7.7 says clear-cedar
  parity may split later; one shared token cannot carry two prices.
- **Changing rooms priced** *(resolved 2026-07-29)*: 3' **+$11,000** / 4' **+$12,500**,
  from the doc 35 §2 itemised takeoff. Lee asked for the derivation, then corrected
  an input (the accent-wall standard: entrance wall is always T&G, never metal);
  the correction was folded and moved cost by −$35/+$15 — prices held. These were
  the last unresolved lines; there are none now.
- **Decks split two-tier** *(per Lee, 2026-07-29 — doc 35 §2B, rows 8/8b/9/9b)*:
  existing options relabelled **"open deck platform"** at unchanged $2,000/$3,000,
  plus two NEW options — **semi-enclosed deck** (two finished side walls + roof
  over deck) at **+$4,100** (2') / **+$5,200** (3'). The semi-enclosed build is what
  buyers expect from "front deck" and was selling below cost at the platform price.
- **Speakers split two-tier** *(per Lee, 2026-07-29 — doc 35 §5B, rows 14/14b)*:
  existing option relabelled as the **standard set** at $1,000, plus a NEW
  **premium set** — Polk Atrium 5 pair + Fosi BT30D Pro 2.1 amp — at **+$1,500**.
  Premium sits outside the Premium Finish Package (package carries the standard
  set; item-18 math untouched). The tier ships with the minimal true mounting line
  — **"mounted outside the peak-heat zone; placement confirmed at consultation"**
  — which needs no input from Lee to be accurate (critic X4.4: a $1,500 audio
  upgrade on a hot-room product cannot ship silent on where the speakers go). Lee's
  actual practice sentence replaces it when he supplies it (docked, doc 35 §5B.2).
- **`pricesVersion` bump, same commit, enforced** *(from WP-0b-i, 2026-07-30)*:
  `js/data.js` exports `pricesVersion = 1`, stamped into every saved
  configuration; the restore path recomputes and shows a "prices have been
  updated" note when stale. This commit bumps it to 2 **and adds the fixture
  that ties the stamp to the price values** (hash the price table into the test;
  a price change without a version bump goes red) — nothing currently enforces
  the bump, and a repricing that forgets it lets week-old saved totals restore
  silently as fresh.
- **`models.json` — a schema extension, not a value copy** *(critic 8.1)*: the
  file cannot represent what doc 35 creates — one `heater_apex` entry cannot hold
  the S2–S8/SC split, and there is no bench, deck-tier, speaker-tier, window-tier
  or per-model wood-fired structure at all (its `_source` still cites an
  `index.html` that died in the Eleventy migration). This commit designs the
  extended structure and lands it with the same values, same pass — P9's intent,
  achievable form. Budgeted as real work, not a copy step.

**What is still soft (carried from doc 35 §7 — the plan does not strip the
uncertainty):** IKI freight is a $500 *allowance* against quote-only reality
(±$300 moves the wood-fired price ±$570); IKI stones are proxied at Homecraft's
$50/box; **IKI stock at B Saunas is unconfirmed** — one call (1-705-727-0404)
before the first wood-fired quote goes out. The H-Series credit (P3) is
re-verified but watch-listed — if the line dies, base-model cost rises $775.
Clear cedar is priced at thermowood parity on an unverified assumption (§7.7) and
may split — which is exactly why Thermowood gets its own token above.

**Answered by Lee (2026-07-30) — WP-0b-ii is un-gated:**

- **Transition: honour issued quotes.** New prices are effective immediately for
  new inquiries. Any written quote already issued is honoured for its stated
  validity, or 30 days from issue where unstated. Every quote going forward
  carries a **30-day validity line** — a quoting-practice rule that also flows to
  the quote templates outside this wave. In-flight conversations without a
  written quote get the new prices.
- **Discounting: firm prices, none.** The sheet's 40–45% floors are real prices,
  not opening positions — matching Lee's "bias upward" ruling and the lesson that
  underpricing is what stopped the builds. The historical ~73%-of-list realized
  price (doc 31 / rev3 Assumption 3) is retired as a practice, not built into the
  sheet. The configurator quotes what SSC charges.

### Verify

**WP-0b-i:** a real quote request arrives in the inbox from the modal, carrying
every selected option including the $0-value bench choice, with location and
access attached, **verified from a browser profile that visited the site before
the deploy** (critic 9.4 — a fresh-context test is a false green while returning
visitors keep the year-cached bundle; P-A is the fix and this is its proof).
`quote_submit_success` moves off zero. The `/contact/` fallback fires with the
config attached after a forced submit failure.

**WP-0b-ii:** every one of doc 35 §6's nineteen rows checked off against the
diff; the package/basket delta equals the saving stated at `sauna.njk:161` on all
five models; the new deck and speaker options serialize into the summary and the
composed payload; grep proves zero "9kW Apex" and zero duplicate `value=` within
any radio group; `models.json` round-trips the same numbers the site renders.

---

## 4. WP-0a remainder — Measurement

Analytics only started recording on 2026-07-28, when the CSP was corrected. There
is no historical funnel data for this site at all.

- **Events** per `14 §8` — roughly fifteen named events with payloads. The one that
  matters is `quote_submit_success`, which has been zero for the site's entire
  history and is the success criterion for the whole programme.
- **Count the configurator stream separately** via `_subject` *(critic N4)*, so a
  configurator submission is distinguishable from a contact-form one.
- **Weekly submission check — specified** *(critic X6: "surfaced in plain English"
  is an outcome, not a design)*: a MARVIN local cron (weekly, Monday 08:00, the
  market-watch pattern) reads the analytics store for `quote_submit_success` and
  the configurator-stream count (by the doc-33 `_subject`), and pushes a
  plain-English Telegram note via /notify when this week is zero or drops >50%
  week-over-week. It is the only instrument on this stack that would catch a
  silent revenue-channel outage. **No baseline exists before 2026-07-28** — the
  first two weeks report raw counts with no comparison, and say so in the message,
  so a quiet first fortnight is not read as a regression.

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
doc 21's T1–T4 (three count corrections **plus T2, the `booking-ops.html` scope
defect** — it lives outside `src/` and must be inside every sweep; calling all four
"count corrections" is how it would have been skipped).

**Certification for this batch — DOM integrity, not pixel geometry (2026-07-31).**
The re-measure under the repaired-and-affine harness failed 37 of 38 pairs, and
that verdict is HONEST: a typeface replacement changes every text pixel by
design, so row signatures can't match and no position model applies — coverage
collapse here is the product, not a defect. Making the pixel instrument certify
a font swap would be modelling until the answer turns green. The change-class-
correct certificate: (a) **DOM-integrity check** (new, instrument-adjacent) —
element tree + text content extracted from both builds must be IDENTICAL modulo
an explicit whitelist (the deleted Google Fonts link); any structural or textual
delta fails loudly; (b) the fonts suite's computed-style assertions (faces,
floors, tabular numerals — already 31 checks); (c) the pixel harness read as
advisory data (heightDelta direction, cross-width divergence anomalies get
named investigation, not overrides); (d) Jen's Stage 3 fidelity review against
docs 11/21 and the behavioral evaluation — the human-shaped checks a wholesale
re-render always needed. The failing pixel run is RECORDED as the honest
instrument verdict, not overridden; `expectedToChange`/`pageOverrides` stay
untouched. Named anomalies owed an explanation before the batch clears:
`/privacy/` +6px @1440 vs −108px @390 (a font compression shrinks both widths),
and the largest shift outliers (426px /about/@390, 414px /saunas/@390).

*Anomalies CLEARED (2026-07-31, investigation at `.visual-diff/wp1a-anomalies.md`)*
— and the record corrects two orchestrator misreadings: (1) `/privacy/` never
grew; the +6/−108 were the affine fit's INTERCEPTS, not heights — heights fell
at both widths, proven three independent ways (monotonic offset-vs-depth, zero
elements taller, arithmetic reconciling to 1.6px). The divergence gate's
message ("one width grew while another shrank") reads intercepts as growth —
**queued instrument-message fix**: report intercept divergence as what it is,
never as growth language. (2) The model fails on these pages by **piecewise
geometry**, not re-wrap — line-box counts are near-identical (text re-sets
without re-wrapping); text regions compress while fixed-height media and tables
translate rigidly, the vote fits the dominant rigid tail, and every compressing
row upstream becomes residual (hence shift ≈ |offset| ≈ |heightΔ| on every
outlier). A piecewise/segmented fit is the theoretical completion; NOT built —
the DOM-integrity certificate covers this batch, and the pixel model's next
evolution happens only if a future batch needs it. Safety audit: zero new
overlap/clip/vanish conditions; the 2–3px h1 ink-rise does not clip and the
site's only diacritic heading is measured unclipped — doc 11 §9's leading
remedy deliberately unspent.

---

## 6. WP-1b — Colour, shape, spacing, motion

Governed by doc 21 for tokens and `10-jen-art-direction.md` §4–5 for the systems.

- Section rhythm tokens and container tiers.
- Grey ramp to three honest tokens. Retire `--color-charcoal` — the name says
  charcoal, the value is `#c0c0c0`, a light silver. 14 call sites, all `color:`
  declarations, enumerated in doc 21 §6.1. **Named must-fix in this package
  (from WP-0b-i, 2026-07-30): `.quote-btn` renders ~1.1:1 contrast
  (`--color-charcoal` on `--color-warm-wood`) and it is now the SEND button on
  the money flow — it must not survive the colour pass.**
- Define `--color-bg`. The stylesheet consumes it twice and never defines it — a
  live bug matching audit finding P0-3. Reconcile with `booking-ops.html`'s own
  definition in the same edit, so the token isn't defined twice differently.
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

**Certification for this batch (2026-07-31, from WP-1b's honest double-FAIL, no
overrides):** (a) the DOM-integrity certificate extended with a **`renameMap`
whitelist type** — declared old-class→new-class pairs applied during
normalization (a 158-node rename is declared structure change, not noise);
undeclared attribute changes still fail; built by the instrument author,
Razor-reviewed, then the 1b DOM run re-issued — the batch author's out-of-band
normalization already showed text byte-identical and residuals exactly the four
declared change classes. (b) A **computed-rhythm suite** (spacing analog of the
fonts suite): representative elements' computed paddings/margins/gutters at
both widths asserted against doc 21's token values — built in the batch fix
round. (c) The batch's measured isolation probes (heading/gutter/section-pad
reverts) and Jen's Stage 3 fidelity review. (d) The pixel harness FAIL recorded
as the honest verdict: viewport-relative rhythm tiers compress the widths by
different ratios and sections progressively — outside any global-transform
model's jurisdiction, and the instrument's next model evolution happens only if
a future need justifies it. Instrument follow-up queued: the DOM whitelist is
per-comparison but its file is per-repo (WP-1a's entries read stale against
later baselines — the battery caught the naive removal; scope entries to a
baseline..candidate range). *[Both landed 2026-07-31 in the fix round, plus
delete-subtree and kind:'code' vocabulary.]*

**Queued from the 1b fix round (2026-07-31):** (1) the mobile gutter — `@media
(max-width: 768px) { section { padding: … 5% } }` flattens the three
`--section-pad` tiers at the width most visitors use; found by the rhythm
suite, invisible to every prior instrument; recorded at doc 21 §6.2a; a
rendered-output change on every page = its own small batch with the full gate
run, post-Wave-A or as WP-1c. (2) `--ember-dark` survived the warm-wood fold
(only `-hover` folded) — doc 21 §6.5's flat-ember-vs-keep decision is inherited,
not made; decide it in the same batch as (1).

---

## 7. WP-2a — The mark *(unblocked by Lee, 2026-07-28)*

Lee's decision: **remove the badge from the nav; it becomes a maker's mark.**

**Scope corrected per Lee, 2026-07-30: no redesign, no redraw.** Lee's own files
are canonical — `~/Downloads/FINAL LOGO TEXT2.0.svg` (+ `...white.svg` variant)
for the wordmark and `~/Downloads/FINAL LOGO3.0SQBC2025white.svg` for the badge.
Both wordmark files verified true vector (26 paths, no embedded rasters, text
outlined) — better source than anything in the repo.

1. **Prepare, don't draw:** copy sources into `src/assets/brand/` with
   provenance; produce web-ready versions by viewBox crop to content bounds +
   metadata strip + lossless optimize — never altering path geometry, verified
   by pixel-diff against the source render.
2. Wordmark at 22px for the nav — `currentColor` only if the mark is
   single-color; otherwise the dark/white variant pair serves the themes.
3. Badge to the footer as the maker's seal at 72px. Its 7 live `<text>` elements
   convert to outlines only if the exact fonts are present and the rasters
   pixel-match; otherwise ship unconverted and flag the portability risk.
4. ~~Monogram exploration~~ **cancelled per Lee.** Favicon derives mechanically
   from the existing badge's central emblem — proposed to Lee, ships only on his
   approval.
5. Assets land in `src/assets/brand/` with a provenance README.

Runs parallel to WP-1; blocks nothing in it.

---

## 8. Sequencing

```
P-A ─┐
P-B ─┼─► WP-0c ─► WP-0b-i ─► WP-0a ─► WP-1a ─► WP-1b ─► [prod gate] ─► production
P-C ─┘   (quote)   (funnel)   (events)  (type)   (colour)
                      │                              ▲
                      └─► WP-0b-ii (repricing) ──────┤  ← un-gated 2026-07-30
                                                     │    (Lee's answers in §3a-ii)
    §2 harness repair ───────────────────────────────┘
    WP-2a mark ── parallel, independent ─────────────┘
```

Each package is one commit on `main` with a stated revert SHA. Draft deploy,
review on the draft URL, then production. Nothing merges to production before
§1 and §2 are done. WP-0b-ii may land any time after WP-0b-i once Lee's answers
arrive — it does not block WP-0a/1a/1b.

**Owner for shared files:** `netlify.toml` and `styles.css` are touched by several
packages. One owner, sequential merges, no parallel edits. WP-1a edits the CSP
(removing Google origins); nothing else may touch it in the same window.
**`src/_includes/modals/sauna.njk`, `js/modal.js` and `js/data.js`** are touched
by WP-0c, WP-0b-i and WP-0b-ii — same single-owner rule, strictly sequential
merges in that order (critic 3.2).

---

## 9. Rollback

**Restore floor: `6a68f16f80fdaf000837b588`** (2026-07-28 18:14, commit `cc8270f`).

Every deploy before it carries at least one of: the cross-project data leak, the
published function source and database schema, or the CSP that stopped analytics
recording. Roll back to the floor or later, never past it. If a rollback below the
floor is ever genuinely needed, the leak fix is re-applied in the same operation.

Mechanism: `netlify api restoreSiteDeploy` with a deploy id — instant, no rebuild.
Code rollback is `git revert <sha>` then redeploy.

**Price rollbacks are `git revert`, never deploy-restore** *(critic 7.3)*. Once
WP-0b-ii has landed, restoring any earlier deploy is an uncontrolled price flip —
Kuuma's ~$3,000-per-sale loss returns and every corrected price reverts with it.
If the repricing must come back out, revert the 0b-ii commit alone: prices and the
savings copy move together, and the funnel stays up.

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
- [ ] `models.json` updated in the same pass as any price/option change *(P9 — via the 0b-ii schema extension, never a bare value copy)*
- [ ] WP-0b-i only: acceptance verified from a browser profile that visited the site **before** the deploy *(critic 9.4)*
- [ ] One commit, revert SHA stated

Programme-level: `quote_submit_success` moves off zero. It has never been anything
else.
