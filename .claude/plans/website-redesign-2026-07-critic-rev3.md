# Plan Critic — SSC Website Redesign (rev. 3, third pass)

**Plan:** `.claude/plans/website-redesign-2026-07.md` (rev. 3, tree at `b0d946b`)
**Prior reviews:** `…-critic.md` (rev. 1 — FAIL, 11 must-fixes) · `…-critic-rev2.md` (rev. 2 — NOT CLEARED, four blockers)
**Rubric:** `~/marvin/.claude/rules/plan-critic-rubric.md` (v2)
**Reviewed:** 2026-07-28, against the repo at `b0d946b`, not against the plan's own claims.

> **Method note.** Rev. 2 closed with an instruction to its successor: *"a third pass
> should re-run every empirical claim in this document rather than inheriting it —
> including the ones that favour the plan."* This pass does that. Where a rev. 2 finding
> is repeated below it is because it was re-verified, not because it was carried forward.
> Improvement across three passes is not graded. The only question is whether this can be
> safely implemented against a live revenue site currently taking real customer inquiries.

---

## Applicability block

**Project type(s):** (a) a redesign of a live, revenue-generating marketing website with a
working lead-capture form; (b) published client- and public-facing copy including prices,
warranty terms and tax statements; (c) a stylesheet/token migration on that live site;
(d) case studies containing named clients and their homes; (e) a new test harness and
lint tooling entering the repo.

| Dim | Fires? | Why | Severity |
|---|---|---|---|
| **X1 Physical & human safety** | **No** | Website content and CSS. No hardware, firmware, G-code, heat or mains-power control path. The plan discusses sauna *heaters* as catalogue items and prices, never as anything it actuates or specifies for construction. Nothing in this plan can injure a person. Explicit negative attestation, per rubric. | N/A |
| **X2 Privacy & data stewardship** | **Yes** | WP-6 publishes named clients, their city and their homes from a permission field; the plan closed a live cross-project analytics leak and keeps a third-party tracker; the quote form carries customer contact details to Formspree. | **GATING** |
| **X3 Evidence & source integrity** | **Yes** | Doc 13 is replacement published copy making factual claims — materials, warranty, credentials, company history, tax. These inform customer purchase decisions. | **GATING** |
| **X4 Audience, brand & money accuracy** | **Yes** | Published prices, a proposed design deposit, warranty names feeding Google rich results, and a tax-treatment line. Money and quasi-legal terms are in scope. | **GATING** |
| **X7 Self-modification safety** | **No** | The plan changes the SSC website repo. It adds `stylelint` and a visual-diff script to *that* repo. It does not touch MARVIN's own gates, hooks, skills or automation. Explicit negative attestation, per rubric. | N/A |
| **X5 Concurrency & re-entrancy** | **Yes** | Form double-submit, `localStorage` shared across tabs with a 7-day window, a weekly cron-style submission check, a harness that builds and serves two git refs. | ADVISORY |
| **X6 Operability & observability** | **Yes** | Deployed unattended to Netlify; the only revenue instrument is the inbox. | ADVISORY |
| **X8 Dependencies, performance & cost** | **Yes** | Three new harness deps, `stylelint`, `fontaine`, `glyphhanger`, self-hosted font binaries, Cloudinary delivery. | ADVISORY |

Ten universal core dimensions are active and gating, as always.

---

## Part 0 — Independent re-verification against production

Rev. 2's central lesson was that deploying the repo did not make production match the repo,
and that a prior "verified" is not evidence. So this pass re-ran the security checks against
`www.secretsaunacompany.ca` rather than against the tree.

| Check | Result |
|---|---|
| `/analytics-dashboard-netlify.html` | **404** |
| `/supabase-schema.sql` | **404** |
| `/analytics-tracker-netlify.js` | **404** |
| `/.netlify/functions/analytics` | **404** |
| `/.netlify/functions/track` | **404** |
| CSP on `/` carries `ssc-ops.netlify.app` | **Present** in `script-src` and `connect-src` |

**Must-fix 1 holds under re-verification.** The leak is closed in production, not just in the
repo. The `rm -rf dist` in `netlify.toml`'s build command is present and carries an inline
comment explaining why it is load-bearing — rev. 2's must-fix 6, done properly.

One stale status claim, in the safe direction: plan §3 WP-0a still lists **"CSP tracker
unblock — TODO"**. It shipped in `598bd27` and is live. Harmless here, but the plan's status
column is what sequences the work, and it is not tracking the tree.

---

## Part 1 — The four rev. 2 blockers

**Two closed, two open.**

| # | Blocker | Disposition |
|---|---|---|
| 1 | Token file incomplete behind a completeness claim | **CLOSED** — verified token-by-token |
| 2 | Configurator prices unreconciled | **OPEN** — and wider than rev. 2 knew |
| 3 | False `[src: brief]` citation | **OPEN** — the claim relocated and re-cited falsely |
| 4 | Permission gate fails open | **CLOSED**, residual hole on a second axis |

### Blocker 1 — `21-resolved-tokens.md` incomplete — **CLOSED**

This one was done properly, and it was the largest of the four. Independently re-derived
against `styles.css`, not read:

- Live `:root` is `styles.css:9–75`, **exactly 48** custom properties. The doc's count and
  line range are exact.
- The §5 classification table carries 49 rows = all 48 live tokens + `--color-bg`. **The diff
  is clean in both directions**: zero live tokens missing, zero phantom tokens named.
- **All 47 use counts in §5 were re-grepped and every one matches**, including the families
  rev. 2 found missing — `--spacing-md` 27, `--transition-fast` 29 occurrences / 20
  declarations, `--color-warm-wood` 52, `--color-charcoal` 14, and the alpha family. The §6.2
  deletion ledger matches selector-by-selector.
- **Paste safety is real.** 52 distinct `var(--x)` names are consumed across `styles.css`,
  `src/` and `js/`. The new `:root` defines 47; the other five (`--pin-*`, `--stagger-index`)
  are declared at their own selectors or carry JS fallbacks, and all five are named in the
  doc. **Undefined references after paste: zero.**
- `--shadow-sm` / `--shadow-md` are deleted with 0 live uses each — confirmed.
- **The self-reported AA defect is real, correctly diagnosed, and correctly fixed.** Every
  contrast ratio in the doc recomputes to its stated figure. `.stat-source`
  (`styles.css:666–670`, 0.8rem ⇒ 12.8px normal ⇒ 4.5:1 threshold) inside `.stat-card`
  (`:644–649`, background `--elevated`) puts `--ink-faint` at **4.294 — fail**. Re-pointing
  to `--ink-quiet` gives **6.152 — pass**. After the fix no alias resolves to `--ink-faint`
  at all. The two residual sub-AA pairs are disclosed with their constraints and neither has
  a live consumer.
- Independently spot-checked ten cross-document citations (10:45, 10:46, 10:85, 10:310,
  11:80, 12:223, 12:300, 15:6, 15:16, 15:17) — all verbatim correct. Rev. 2's complaint about
  doc 21's citations is resolved.
- The §6.7 reveal table is exact in every cell, and independently confirms the plan's
  corrected figure: 158 markup/JS usages + 11 stylesheet selector lines = **169**. I re-ran
  this myself and got 80/35/16/17/5/5 = 158 and 11 CSS selectors. The plan's rev. 3 correction
  is right and the old 148 was wrong.

**Four defects, none of which breaks the paste, all of which should be corrected before
WP-1b batches the work:**

- **T1 — `.bg-grey` markup count wrong, both numbers.** Doc `:311` says "6 markup sites" and
  "four of those six are `hero-overlay`". Actual: **7** sites — the omitted one is
  `src/_includes/pages/warranty.njk:45` — and **six of the seven** carry `hero-overlay`. This
  is a WP-1b batch-planning number, so it will be used.
- **T2 — a false scope-verification claim, and a second shipped page nobody inventoried.**
  Doc `:209` states that `styles.css` plus inline styles in `src/` are *"the only two places
  any token is consumed — verified."* **`booking-ops.html` at the repo root** — built to
  `dist/`, routed live at `/ops` by `netlify.toml` — carries its own `:root` at `:10–21` with
  **63 `var()` references across 10 token names**. Nothing breaks on paste (it is
  self-contained), but three things go unrecorded: `--color-bg-light` is *declared* there
  while §5.2 says it "exist[s] in no stylesheet"; `--color-bg` means `#0f0f0f` there and
  `#0c0c0c` under doc 21; and `--color-warm-wood` is `#d4a574` there against `#c4a57b` in
  `styles.css`, so R9's "one accent, one base" is asserted over an inventory that never saw
  the third accent value. **This matters operationally:** WP-1b's grep-clean gate is scoped to
  *"anywhere in `src/`, `js/` or `styles.css`"* — which is precisely the three places that
  exclude `booking-ops.html`. A global token sweep either misses it (harmless) or catches it
  (breaks `/ops`), and neither the gate nor the doc would tell you which.
- **T3 — "74 aliased text call sites" (`:376`) is not reproducible.** The seven legacy text
  aliases total 67 `var()` occurrences / 63 `color:` declarations. The sweep's *conclusion*
  (all aliased text passes AA) is correct; the count attached to it is not.
- **T4 — `--spacing-*` is "108 live uses" at `:5` and "110" at `:45`.** Both are derivable
  (108 in `styles.css`, +2 inline in `404.njk:11`); the doc never says which scope it means
  where.

**One framing correction.** The claim that the paste was *"verified by simulation across 52
consumed properties"* appears in the commit message of `6aee698`, **not in the document**.
Inside doc 21 it is a bare assertion at `:13` backed by the §5 inventory, with no procedure,
no per-property results, and no artifact in the repo. The conclusion happens to be true — I
checked it — but "verified by simulation" describes something that did not happen. Given that
rev. 2's whole finding was attestation drift, the wording should be corrected to what was
actually done: an inventory-based derivation.

Net: blocker 1 is genuinely closed. **WP-1a and WP-1b are unblocked on the token axis.**

### Blocker 2 — Configurator prices unreconciled — **OPEN, and wider than rev. 2 knew**

Docs 30 and 31 are real work — both `Status: COMPLETE`, sourced with URLs, check-dates and
confidence ratings, with honest "Unverifiable" sections. Rev. 2's complaint that the research
was still "Pending" is resolved. **The research is finished. The reconciliation is not.**

The configurator has **22 `value=` attributes in `src/_includes/modals/sauna.njk`, 15 of them
carrying a price.** Q11 gives a signed number for **three**. Rev. 2's instruction was
"reconcile every `value=`." That did not happen.

| Status | Lines |
|---|---|
| Signed number in Q11 | 3 |
| Resolved in docs 30/31 but **absent from Q11** | 4 |
| Explicit reprice recommendation in the docs, **nowhere in Q11** | 5 |
| No verdict anywhere | 4 (decks ×2, cedar exterior, clear cedar) |
| Five base model prices | Unaddressed by either doc |

**P1 — the plan's stated arithmetic does not compute.** Plan `:323`: *"the working stack
(contactor $275–350 + touchpad $300 + rocks $200–350) is $2,625–2,850, so the +$2,000 add-on
runs 16–27% incremental."* The parenthesis sums to **$775–1,000**, not $2,625–2,850. And
$2,000 against $2,625–2,850 is **−31% to −43%**, not +16–27%. The doc's 16–27% is correct but
only via a **−$1,175 standard-heater credit** the plan drops: incremental cost $1,450–1,675 →
(2000−1450)/2000 = 27.5%, (2000−1675)/2000 = 16.25%. The number is right; the derivation
printed next to it is unreachable from its own inputs. This is the sentence Lee is being
asked to sign off.

**P2 — $2,750 rests on a basis nobody has chosen.** $2,750 against incremental cost is
39–47% GM. Against the **full** $2,625–2,850 stack it is **−3.6% to +4.5%**. Doc 30 §2 says
for the 15kW *"decide the basis, then price"* — then applies the incremental basis to the
Revive without that decision being taken. Q11 presents the output as settled and never
surfaces the choice.

**P3 — the load-bearing credit is unstable and the instability is not carried forward.** Doc
30 §2 notes Homecraft's *"'H Series' naming no longer appears"*, and §5.5 lists H-Series
availability as unresolved (3-phase out of stock; Apex Mini 7.5kW at $1,950 may replace it).
If the credit is $1,950 rather than $1,175, every margin figure in Q11 moves. Q11 imports the
conclusions without the flags.

**P4 — docs 30 and 31 contradict each other, and Q11 silently picks a side without stating
the number.** Doc 30 §2: extra IGU window → *"Reprice to $2,500+ … ($2,700 for 45%)"*, no
tiering. Doc 31 §2.1: *"a tiering error, not a pricing error — split it into small ($1,500,
keep) and full-size ($3,200+)"*, explicitly rejecting $2,500 as *"only ~30% GM stressed."*
Q11 adopts doc 31's framing word-for-word, never notes the conflict, and **omits the
actionable price entirely** — it gives the two cost bands and no number. There is nothing to
sign off. This is exactly the collision class doc 21 was built to end, in a pair of documents
that sit outside the arbitration system (see N3).

**P5 — the single largest repricing in the research is not in Q11 at all.** Doc 31 §3.3:
3' changing room **$8,500** and 4' changing room **$10,500–11,000**, against live prices of
**$3,500** (`sauna.njk:77`) and **$4,500** (`:82`). That is +$5,000 and +$6,000 — larger than
every Q11 item combined. Q11 does not mention changing rooms.

**P6 — the Kuuma freeze is a sales-side decision the website does not implement.**
`sauna.njk:63–65` still offers *Kuuma Banya (Wood-fired), +$3,000*, enabled for S4/S6/S8/SC
via `js/modal.js:184–192`. Against doc 30 §4's landed cost of **~$6,140–6,704 CAD**, the site
is quoting a **~$3,000-per-sale loss right now**. "Freeze holds" describes an internal state;
the configurator disagrees with it on the live site today.

**P7 — one $2,000 slot sells two different heaters, and only one of them has been priced.**
`js/modal.js:200–206`: for `sc` the label is *"Homecraft 15kW Apex (Electric)"* at
`value='2000'`; otherwise *"Homecraft Revive 9kW (Electric)"* at the same `value='2000'`. Doc
30 analyses these as two independent problems and offers $3,500 (incremental) or ~$5,455
(full-cost) for the 15kW. **Q11 never mentions the SC path.** Signing off Q11 prices half of
one input.

**P8 — Q11 mislocates the catalogue defect it reports.** The string "Homecraft 9kW Apex" is
**not** in the configurator add-on list. It is the SC model's *included* heater spec at
`js/data.js:84` — `heater: 'Harvia Pro20 or Homecraft 9kW Apex'` — and it is **rendered
publicly in two places**: the modal spec grid (`js/modal.js:97`) and the Compare Models table
on `/saunas/` (`js/compare.js:28`). A product that does not exist is on the live site now.
`src/_includes/modals/sauna.njk` does not contain the string; the plan implies it does.

**P9 — the `models.json` consolidation is justified on a premise that is false.** Both halves
of the plan's path correction check out: there is **no `models.json` anywhere in this repo**,
and `~/marvin/content/reference/operations/models.json` exists. But the plan's rationale —
*"Two copies of a price is how the current drift happened"* — is not supported. The two
copies have **not** drifted on any number: `basePrice`, `interiorUpgrade`, `electricOnly` and
`packages.pricing` are byte-identical across `models.json`, `js/data.js` and
`saunas.njk:214–274` for all five models. The real drift is (a) product **naming** and (b)
**coverage** — a $2,000 WiFi controller and $500 delivery priced in one system and unsellable
in the other. Consolidation is still the right call; it should be argued on the true reason.
Related: the plan's *"duplicated across nine meta descriptions"* is off — there are 10
occurrences, and three of them are not meta descriptions (one is JSON-LD `priceRange` at
`head.njk:85`, a structured-data surface needing separate handling).

**P10 — the bench bug is real, worse than described, and cited two lines off.** The filter is
`js/modal.js:356` (`if (value !== '0')`), not `:354` (the iterator). And **both** bench
radios are `value="0"` (`sauna.njk:148` L-shaped, `:153` U-shaped), so *neither* choice
reaches the quote — SSC receives no bench information at all and the two options are
indistinguishable in the submission. The fix must be scoped to the bench group: the other six
`value="0"` radios are genuine "none/included" defaults where suppression is correct, and a
blanket removal of the filter would regress all six.

Blocker 2 is not closed. **WP-0b cannot open.**

### Blocker 3 — the false `[src: brief]` citation — **OPEN; the claim relocated and was re-cited falsely**

The narrow fix is real: `13-george-copy.md:150` now reads *"**A sauna company in Squamish,
British Columbia.** [NEEDS LEE — headcount phrasing]"*, and `00-design-brief.md` — 152 lines
— contains the word "small" **zero times**, saying only *"keep it slightly vague rather than
a solo-founder story"* (`:85`). The withdrawal at that line is genuine.

**But the claim was not withdrawn from the document. It was moved, and re-cited to a source
that also does not contain it.** `13:383`, a new FAQ answer that ships:

> *"Secret Sauna Company is a **small operation**; we play every role from the first
> conversation to delivery. `[src: per Lee, 2026-07-28 — "here we play every role"]`"*

The quoted fragment supports "we play every role." It says nothing about size. This is the
same defect as the one being closed — an unsourced size claim wearing a citation — created in
the same revision that closed it, and now attached to a **"per Lee"** attribution, which is
the one citation form that cannot be checked against a file. The document simultaneously
holds headcount phrasing at `[NEEDS LEE]` in the About sub-headline and ships the headcount
claim twice below it (`:166` *"We've kept the company small on purpose"* — unannotated —
and `:383`).

**The wider sweep is worse. 20 falsely-cited or unsourced factual claims survive** — 11 where
the cited source does not contain the claim, 9 with no annotation at all — plus roughly 30
`[src: path:line]` pointers landing on the wrong line. Every item rev. 2 named individually
is still open except the warranty enumeration. Selected, all independently verified:

- **All three "an hour" session claims survive, all unsourced** (`:79`, `:83`, `:382`). A grep
  for `one hour|1 hour|60 min|an hour` across `src/`, `js/` and `_data` returns **zero hits**.
  `:382` ships in the FAQ. This is a duration promise to customers with no basis anywhere in
  the repo.
- **`:364` ships a fire-ban scope as fact that `:371` simultaneously flags as an open
  question** — *"Our **wood-fired** session saunas are shut down … and **bookings reopen when
  it lifts**" `[src: brief]`*. The brief (`:88`) says only that sessions pause. Neither the
  wood-fired restriction nor the automatic reopen is in it.
- **`:194`** — a paraphrase labelled *verbatim*. `[src: existing about.njk copy, verbatim]` on
  *"give everyone the feeling of"*; `about.njk:72` reads *"provide everyone with the sensation
  of."*
- **`:272`** — *"Wood-fired or electric **across the range**"*, cited to two card lines that
  are the S6 and S8 cards only. `js/data.js:20` sets **`electricOnly: true` for the S2**,
  whose heater is *"Homecraft 7.5kW H Series"* — electric. The claim is false for the entry
  model, which is the one most buyers price first. *(Verified precisely: S2 is the only
  `electricOnly: true` model; S4/S6/S8/SC are all `false`.)*
- **`:79`** — *"four bookable venues"*: three are bookable; The Good Sauna's CTA
  (`locations.njk:48`) is "Visit Website".
- **`:439`** — *"reconciled with `models.json`"*, a file that does not exist in this repo. The
  commit that made that very correction elsewhere (`06acf6f`) never propagated it to doc 13.
- **`:355`** — *"Consider them our references"* survives verbatim: a claim about four third
  parties' willingness to act as references, sourced only to evidence that the builds exist.
- **`saunas.njk:269` → `:273`** — not fixed, and survives **three times** (`:24`, `:288`,
  `:493`).
- **`:288`** — SC card reads *"10–14**+** Person"*; the visible card says "10–14 Person". The
  "+" exists only in the JSON-LD.
- **`saunas.njk:213` is cited six times for the "From $22,500" price** (`:67`, `:83`, `:206`,
  `:404`, `:467`, `:468`); `:213` is a dimensions span and the price is at `:214`.

**Two `[NEEDS LEE]` brackets sit inside sentences presented as final copy** — `:150` and
`:166` — and would render as literal brackets if pasted. Doc 13's own rule at `:5` says
`[NEEDS LEE]` is a *"visible placeholder, cannot ship as written."* By the document's own
standard those are hard blockers. Rev. 2 asked for a fail-closed rule that no page ships
containing one. It was not added.

**Warranty naming is the one item fully closed.** All four instances are enumerated correctly
in §5 (`:339–342`) **including `faq.json:31`**, the schema answer feeding Google rich results.
Two residuals: §0a's audit trail (`:25`) enumerates only `faq.json:30`/`:31` and omits
`src/warranty.njk:4`, contradicting its own fix list; and bare `warranty.njk` denotes two
different files (`src/warranty.njk` vs `src/_includes/pages/warranty.njk`) with no
disambiguation, so three of four pointers resolve wrongly if read against one file.

**On causation:** `06acf6f` touched doc 13 in exactly two places. `6aee698`, `0099bcf` and
`b0d946b` did not touch it at all — the rev. 3 "stale figures" pass never reached this file.
Blocker 3 was addressed at the single line the review quoted, not as the class of defect it
was.

Blocker 3 is not closed. **WP-3 cannot open.**

### Blocker 4 — Case-study permission gate fails open — **CLOSED, with a residual hole**

`10-jen-art-direction.md` §7.2 and §7.5(f) now specify a genuine allowlist:

> *"The gate is an allowlist and fails CLOSED: a unit renders only if `permission` is exactly
> one of those three strings. Anything else — `"pending"`, absent, empty, misspelled, a typo,
> a value someone invents later — renders nothing. Do not implement this as
> `if (permission !== "pending")`; a denylist means one typo publishes a client's home
> without consent."*

§7.5(f) repeats the instruction as an implementation directive to Ted, and adds the case the
old spec omitted: the loop must render correctly with 2, 1, or **0** publishable builds. The
seed record ships `"permission": "pending"`, so the default state publishes nothing. This is
a correct fail-closed gate and a better one than was asked for.

**But rev. 2's second half was not done, and the reason it was asked for still bites.** The
fix requested `photos_only`, which Q45 allows and the enum omitted. It was not added.
Instead §7.5(d) says that under `permission: "anonymous"`, *"photographs render only if the
anonymous-but-shown permission covers them."*

**There is no such field.** §7.2's schema has exactly one permission key with three values.
Enumerate what the three encode across the two independent axes — may we name them, may we
show their house:

| | Photos OK | Photos not OK |
|---|---|---|
| **Name OK** | `named` | `name_only` |
| **Name not OK** | `anonymous` | **unrepresentable** |

A client who agrees to be written about but not named *and* not photographed cannot be
encoded. The nearest available value is `anonymous`, which publishes the photographs. And
§7.5(d)'s conditional is undecidable as written — Ted has no field to test, so the branch
collapses to "render the photographs."

So the gate fails closed on the *unrecognised-value* axis and fails **open on the photo axis
inside an allowlisted value**. This is the same X2 exposure rev. 2 named, in a new location:
a client's home published without consent, from a data file that looked like it had a gate.

**Fix (cheap, and it should be the shape of the original request):** make the photo
permission its own required boolean — `photos: true` renders imagery, and *absent, empty, or
anything other than boolean `true` renders none* — orthogonal to `permission`. Two
fail-closed gates on two axes beats one enum trying to carry both. `photos_only` then falls
out as `permission: "anonymous"` + `photos: true`, which is what Q45 was describing.

This blocks **WP-6 only**, which is separately parked on Q1/Q2 and on Lee's client
agreements. It does not block the pipeline.

---

## Part 2 — Findings neither prior pass caught

Rev. 2 asked its successor not to re-check only its own list. These are new, and all four
were verified against the tree or against production.

### N1. The redesign will not reach returning visitors — **the version stamps are not in the plan** [GATING: Change safety]

Production, confirmed by `curl` today:

| URL | `Cache-Control` |
|---|---|
| `/styles.css` | `public,max-age=31536000,immutable` |
| `/js/modal.js` | `public,max-age=31536000,immutable` |
| `/saunas/` (HTML) | `public,max-age=0,must-revalidate` |

HTML revalidates on every request. CSS and JS are pinned for **one year** and marked
`immutable`, which instructs the browser not to revalidate even on an explicit reload. The
only cache key is a hand-typed query string:

- `src/_includes/head.njk:301` — `/styles.css?v=20260226`
- `src/_includes/scripts.njk:3–15` — `modal.js?v=20260226`, `forms.js?v=20260226`, and nine more

Those stamps are **already stale**: `styles.css` was last modified `2026-04-15` (`9c73cb2`)
and has been touched by six commits since the date in its own stamp.

This plan rewrites `styles.css` wholesale (WP-1a, WP-1b, WP-2) and rewrites `js/modal.js`,
`js/forms.js` and `js/animations.js` (WP-0b, WP-1b). **Nothing in the plan bumps a stamp.**
Grep across the plan finds exactly one mention of `?v=` — a parenthetical in WP-1a scoping
content-hashing to *font* filenames, noting in passing that "the repo already has stale
ones." The author saw the symptom and fixed the instance, not the class.

The consequence for a returning visitor with a warm cache is not a subtle regression. HTML
updates immediately; CSS and JS do not. They get **new markup against the old stylesheet and
the old scripts** — new class names (`.reveal`, the new tokens, retired `hero-overlay`,
retired `section--warm-glow`) with no rules behind them, and old JS binding to elements that
no longer exist. For WP-0b specifically, the returning visitor keeps the **broken
configurator** — the one whose repair is the entire point of the plan — for up to a year.

Two aggravating factors:

1. **The acceptance gate cannot see it.** WP-0b's definition of done is "a real quote request
   arrives in the inbox." The orchestrator will test in a fresh context and it will pass,
   while the cohort that matters keeps the broken path. The screenshot harness is structurally
   blind here too — it builds and serves from git, so it never exercises a cache at all. This
   is a false-green on the revenue-critical package.
2. **`01-audit-functional.md` already found this** — §51 documents the exact failure
   ("Visitors from the one-day window keep the old file for a year"), and its recommendation
   #7 is "Bump stale `?v=` stamps … or move to content-hashed filenames (M10)." The plan's
   stated job is to sequence the specifications. It dropped this one.

**Fix:** add a cache-key bump to the definition of done of **every** package that touches
`styles.css` or any file in `js/`. The durable version is an Eleventy filter appending a
content hash at build time, which is a few lines and removes the hand-maintenance that
produced the current staleness; the minimum version is bumping the stamps in `head.njk` and
`scripts.njk` in the same commit as the file change. Either way it must be a gate, not a
memory.

### N2. The prescribed deploy workflow bypasses the fix that stopped the last resurrection [GATING: Change safety]

`netlify.toml` build command: `rm -rf dist && npx @11ty/eleventy`, with a comment explaining
that without it "a file deleted from the repo keeps being served forever."

`package.json` build script: `npx @11ty/eleventy`. **No clean.**

Plan §5 steps 2–3: `npx netlify-cli deploy` → draft, then `npx netlify-cli deploy --prod`.
Neither carries `--build`, so the CLI uploads the local `dist/` directory as it finds it. The
clean lives only in Netlify's CI build command, which that path never runs. A local `dist/`
survives across builds — it is present in the working tree now — so any file dropped from
`src/` persists in it and would be published straight to production.

This is the *same failure mode* as the analytics-dashboard resurrection rev. 2 caught, on a
different path, prescribed by the plan as the standard per-package workflow. It matters more
than usual here because WP-1b's grep-clean gate certifies **absences** — deleted classes,
deleted files — and an absence certified against a repo then deployed from an unclean local
directory is not certified at all.

Worse, §5 step 1 commits each WP to `main`, which triggers Netlify's own git build (clean),
and then steps 2–3 push the local `dist/` over it. Two deploy paths with different
cleanliness guarantees, run back to back, last writer wins.

**Fix, one word:** use `npx netlify-cli deploy --build` for both the draft and the prod step
so the CLI runs `netlify.toml`'s command, or add `rm -rf dist &&` to the `build` script in
`package.json` so both paths clean. Do the second regardless — it removes the divergence at
source. And per rev. 2 must-fix 6, run the absence checks against the **deploy permalink**
after the deploy, not against the repo before it.

### N3. Four specification documents sit outside the arbitration system, and one of them silently overrides a document inside it [GATING: Completeness]

The plan's flagship structural fix is arbitration: §0's authority table plus "Ted implements
shared values from 21 only. Anything not in 21 follows its owning document."

`docs/redesign-2026-07/` contains **30-pricing-heaters-equipment.md**,
**31-pricing-materials.md**, **33-intake-form-design.md** and **34-design-fee-conventions.md**.
None appears in the §0 authority table. All four are cited as decision sources in §8 — Q11
rests on 30 and 31, Q13 on 34, Q14 on 33. So four documents carry binding content and have no
declared authority over anything.

That is not merely untidy, because **doc 33 overrides doc 14**, which *is* in the table and
*is* declared authoritative over "Configurator flow." Doc 33 §160:

> *"**Amendment to my own journey spec (§1, "exactly three fields"):** configurator Step 2
> grows from three visible fields to five: name, email, **location, site_access**, notes."*

Plan §3 WP-0b cites `14 §1` and lists neither added field. Under the plan's own arbitration
rule — not in 21, so follow the owning document — Ted builds Wim's three fields and the
amendment is lost. The stated rationale for the override is the strongest sentence in doc 33:
*"a configuration without a location is still an unquotable lead."* Losing it means the
rebuilt configurator produces leads that cannot be quoted, which is a subtler version of the
bug WP-0b exists to fix.

Also unpackaged from doc 33, and flagged as unpackaged by rev. 2: the contact-form field
changes (two out, two in), the `_gotcha` honeypot the current form lacks, and the dynamic
`_subject` line. None has a work package.

**Fix:** add 30, 31, 33 and 34 to the §0 authority table with their lanes stated; fold doc 33
§160's five-field Step 2 and the honeypot/`_subject`/contact-field work explicitly into
WP-0b's item table; and state which document wins where 33 and 14 disagree, since that pair
now has a live collision of exactly the kind doc 21 was created to end.

*(Credit where due: doc 33 is otherwise the best-sourced document in the corpus. It verified
Formspree's limits against Formspree's own documentation, and it correctly retired the
submission-quota worry — free tier is 50/month, SSC's ~201 submissions are all-time, so
volume is not a constraint. It flags what it could not verify rather than guessing.)*

### N4. The weekly submission check cannot see the package it exists to protect [ADVISORY: X6]

§7 specifies "submissions this week vs prior week." But the modal posts to the **same
Formspree form** as the contact page — `https://formspree.io/f/mdaaejwp`
(`contact.njk:18`, and hardcoded as the fallback at `js/forms.js:16`). One aggregate count
across both paths means a regression that kills *only* the configurator submission — the new,
untested, JS-heavy path — is masked by ordinary contact-form volume. The instrument would
stay quiet through exactly the failure it was built for.

**Fix:** doc 33 already supplies the mechanism — a per-submission `_subject` set via hidden
input. Tag configurator submissions distinctly and count the two streams separately, with the
quote stream's first non-zero week recorded as the baseline that must not return to zero.

### N5. A false money claim is live on the configurator right now [GATING: X4]

`src/_includes/modals/sauna.njk:161`:

> *"Clear cedar interior, cedar or standing seam exterior, WiFi controller, lighting package,
> Bluetooth speakers. **Save $1,000** vs selecting individually."*

Verified arithmetic, against `js/data.js:18–19` etc.:

- Package price = `interiorUpgrade + $6,000`, for every model. S4: **$7,500**.
- Maximum equivalent a customer can actually select à la carte = `interiorUpgrade`
  + $2,500 (cedar exterior, `:120`) + $1,500 (lighting, `:182`) + $1,000 (speakers, `:187`)
  = `interiorUpgrade + $5,000`. S4: **$6,500**.

**The package costs exactly $1,000 more than selecting individually, on every model.** The
claim is only reachable by crediting the **$2,000 WiFi controller**, which appears in
`models.json` but is **not purchasable anywhere in the configurator** — the selector at
`js/modal.js:317` is dead, commented *"WiFi controller (if it exists)"*, and no
`input[name="wifi"]` exists in the markup. So the saving is real only against a price list the
customer cannot see and an option they cannot buy.

This is a public, quantified, checkable-false money claim on a live commerce surface. It is
not caused by this plan — it is pre-existing — but the plan's own pricing research walked
past it, Q11 does not mention it, and no work package owns it.

### N6. Q13 publishes binding contract terms with no legal review gate [GATING: X4]

`34-design-fee-conventions.md` is good, well-sourced comparative research — eight competitors
with URLs and check-dates. But what it proposes is not copy. §114 is drafted **published
contract language**:

> *"The full deposit is credited against your first construction payment when a build
> agreement is signed **within 12 months**. If the project doesn't proceed, the deposit covers
> the design work completed and **isn't refunded**. You keep the design PDFs; **working files
> and build rights remain with Secret Sauna Company** until a build agreement is in place."*

That is a non-refundable-fee clause, a limitation period, a forfeiture term and an IP
retention term, published on a consumer-facing site in British Columbia, where they become
representations that form part of the bargain. The plan routes Q13 through **WP-3 and WP-4**,
whose only gates are a brand-critic pass and "Jen review; no invented facts."

**No legal review is specified anywhere.** Note the asymmetry the plan has already accepted:
Q12 correctly refuses to publish a tax line without Jon's determination. A non-refundable
deposit with IP retention is at least as consequential and gets nothing. Doc 34 itself never
raises the question, and its risk section (`:125`, `:133`) analyses only *commercial* risk —
conversion, deal loss — never enforceability.

**Fix:** give Q13 a Pierre gate on the same terms as Q12's Jon gate — no deposit clause
publishes without a business-law review of the non-refundable, 12-month and IP-retention
language against BC consumer protection law. This is cheap, it is one dispatch, and it should
happen before the copy is written rather than after it is live. Rev. 2 asked for the same
treatment for the privacy page (`13:390`); neither has it.

### N7. The plan's research found four live revenue defects and scheduled none of them

Grouping what is broken **on the production site today**, independent of whether this redesign
proceeds:

| Defect | Location | Exposure |
|---|---|---|
| Kuuma Banya sold at ~$3,000/sale loss | `sauna.njk:63–65` | Margin, every wood-fired sale |
| "Save $1,000" is −$1,000 | `sauna.njk:161` | False public money claim |
| Nonexistent product "Homecraft 9kW Apex" published | `js/data.js:84` → `modal.js:97`, `compare.js:28` | False spec on `/saunas/` |
| Neither bench option reaches the quote | `modal.js:356` + `sauna.njk:148,153` | Silent data loss on every quote |

All four are single-line or single-value fixes. All four are gated in the current plan behind
WP-0b, which is itself gated behind an unfinished price reconciliation, three unanswered
questions, and a full modal rebuild. **The plan has coupled four urgent one-line corrections
to its largest and most-blocked package.** That is a sequencing error with a live cost, and it
is the clearest argument in this review for a small WP-0c that ships the corrections now,
independent of the rebuild.

---

## Part 3 — The instrument

Rev. 2 deleted "near-nil visual regression" as unfalsifiable and demanded a real instrument.
`scripts/visual-diff.mjs` now exists. The question the prompt asks — does it satisfy "testing
the tests", and is the 8px budget meaningful — has a clear answer, and it is not the one the
author's disclosure implies.

**The plumbing is genuine.** It really does build two refs via `git worktree`, serve them from
a dependency-free static server, enumerate pages from built output rather than a hardcoded
list, and capture **19 routes × [1440, 390]** — every claim in §6 of the plan checks out.
Several touches are better than competent: `reducedMotion: 'reduce'` plus injected settle-state
CSS that forces reveal targets visible (the parallax pin is a real catch), a frozen epoch and
seeded PRNG, record/replay asset caching, and blocking the analytics host so the harness does
not pollute Lee's own numbers. The three dependencies — `playwright@1.62.0`,
`pixelmatch@7.2.0`, `pngjs@7.0.0` — are exact-pinned, real, and resolve to
`registry.npmjs.org`.

**The gate metric has no tests of its own, and probing it empirically returns *pass* for its
worst inputs.** These were measured by running the code, not by reading it:

| Input | Reported `layoutShiftPx` | Gate |
|---|---|---|
| Whole page shifted +200px | 200 | **fails** (correct) |
| Whole page shifted **+260px** | **0** | **passes** |
| Whole page shifted **+600px** | **0** | **passes** |
| **Entirely different content, same dimensions** | **0** (coverage 0.00) | **passes** |

`SEARCH_WINDOW = 240` (`diff.mjs:31`) bounds the correlation search, and past it unmatched rows
are silently dropped (`diff.mjs:71–74`) rather than failing loud. The one value that would
catch it — `shiftCoverage` — **is computed at `diff.mjs:113`, carried into the result at
`:147`, and never consulted by the gate at `visual-diff.mjs:176–179`.**

Two more structural blind spots. The metric takes **p99** (`diff.mjs:73`), so a displacement
confined to under ~1% of signature rows reports **0 at any magnitude** — measured: a 40px band
moved 80px on a 4000px page reports `p99=0, max=0`. On the ~7,000px homepage that is anything
under ~70px tall: a nav item, a price, a button, a heading. `layoutShiftMaxPx` is computed and
never gated. And horizontal shift is quantised to 4px and ungated, producing not just silence
but **fabricated numbers** — a 3px horizontal move reported as 18px, an 8px move as 89px, a
200px move as **0px, passing**.

**On the 8px budget specifically — the answer is worse than the author's disclosure.** He
reports that a bare sub-8px shift clears the shift gate alone and that his 4px proof was caught
by the pixel-percentage gate instead. Measured against this site: nudging every button and CTA
down **6px** on `/` yields **0.1401% changed at 1440 and 0.3556% at 390, shift 6px, height
delta 0 — passing both gates at both widths**, against a configured `maxChangedPct: 0.5`. So
the pixel gate is not a backstop for small shifts; it is a backstop for *his particular* 4px
example on *that particular* page. The 8px budget is not meaningful as stated.

**And the failure that matters most: the instrument neutralizes itself in the exact job it was
built for.** `expectedToChange` is a single boolean per route that downgrades **shift, height
*and* pixel percentage together**, at any magnitude, at both widths, with no cap, no expiry,
and no check that the listed route exists (`visual-diff.mjs:184–187`). Meanwhile a *pure body
text recolour* measures **0.87%–3.21%** on real pages — two to six times over the pixel gate.
WP-1b is a recolour plus a token migration. **Every page it touches will breach the pixel gate,
so the operator must allowlist them — and allowlisting deletes the 8px shift gate on those same
pages.** The plan's instruction to "enumerate the expected pages before starting" does not help:
enumerating them is what disarms the gate. A stylesheet rewrite run through this harness ends
with the pages that changed exempted from the only check that would catch a layout regression.

**Nine paths produce a green run having verified little or nothing.** Beyond the above: zero
shared pages exits 0 with the message *"No visual change on any of 0 pages"*; `"widths": []`
runs zero comparisons and exits 0 (`raw.widths || [...]` treats `[]` as truthy); a missing
baseline or candidate PNG hits `continue` at `visual-diff.mjs:174` and is never counted, while
the reported screenshot count at `:87` is arithmetic rather than a count of files on disk;
asset-fetch failures are warnings, so a cold cache with no network compares a site rendered
without its images or its real fonts — the exact scope a type-scale refactor needs — and goes
green; and detected redirects are computed and discarded, so `/booking-ops.html` bouncing to an
auth screen compares two identical auth screens and passes without ever comparing the page.

**The determinism claim is hollow, and its own bug is what makes it true.**
`home.njk:142` is an autoplaying Cloudinary `<video>`. Nothing pauses or seeks it;
Playwright's `animations: 'disabled'` does not cover media playback. With the video actually
rendering, identical-input runs of `/` @1440 differ by **0.62%, 5.17%, 0.62%** — up to 10× the
failure threshold, with a spurious 59px shift. The harness reports zero only because
`capture.mjs:164` strips response headers while `:166` preserves `status: 206`, so the ranged
video replays as a malformed partial response the browser refuses. **"`main` vs `main` = exactly
zero changed pixels" is true because the site's largest nondeterminism source never renders in
either build** — and any regression in that region (sizing, aspect, crop, overlay, poster) is
invisible. Relatedly, the "15-pixel decode-variance noise floor" was measured on a
`main` vs `WORKING` run — two *different* builds — so it is not a noise-floor measurement at
all, and the attribution to Chromium decode variance is unverified.

**There are zero tests of the harness.** `git ls-files` returns no test or spec file anywhere in
the repo. There is no fixture proving 4px reads 4, none proving 300px does not read 0, no
regression test on `SEARCH_WINDOW`, no golden. Every determinism and metric claim in
`scripts/README.md` is an unverified assertion by the author of the thing being asserted about.
That is the rubric's "testing the tests" clause failing in one sentence. It is also not wired
to CI — no workflow, nothing in `netlify.toml` — so it is a manually-invoked honour-system gate.

**Verdict on the instrument: it does not meet the bar.** Rev. 2's must-fix 5 asked that the
instruments be *installed and proven*. They are installed. Nothing about them is proven, and
the two positive claims that do hold (a pure recolour reads `p99=0`; a translation of N reads
exactly N for N ≤ 240) are the two the author happened to test.

**The good news is that the fix is small and specific**, and most of it is wiring up numbers the
harness already computes: gate on `shiftCoverage` (fail below ~0.6) and on `layoutShiftMaxPx`,
not just p99; make zero comparisons, zero routes, empty widths, and `fetchFailures > 0` hard
failures; reconcile actual screenshot files against the expected count; surface redirects as a
failure; **make `expectedToChange` waive `changedPct` only, never `layoutShiftPx` or
`heightDeltaPx`** (this single change restores the gate for WP-1b); pause and seek `<video>` to a
fixed frame and fix the range-request cache; and write the three fixture tests that prove 4px
reads 4, 300px does not read 0, and a 1%-of-page move is not invisible. A day's work, and then
it is a real instrument.

*Two smaller notes:* `package-lock.json` is **gitignored** (`.gitignore:2`), so exact transitive
resolution is not reproducible from a fresh clone — that undercuts the typosquat/pinning
discipline the plan correctly applies to `fontaine` and `glyphhanger`. And `@11ty/eleventy` is
`^2.0.0`, unpinned, which is a larger reproducibility hole than the three diff dependencies it
sits next to. Also, `WORKING` mode runs `rm -rf dist && eleventy` in the real working tree
(`build-ref.mjs:33, 46`).

---

## Part 4 — Verdicts, universal core

### 1. Problem-fit — **PASS**
Unchanged and still right. The broken quote handoff, the category-selling copy, and the six
concurrent motion systems are the real problems, and the plan targets them. §1 remains the
clearest statement of the case anywhere in the corpus.

### 2. Approach soundness — **CONCERN** (was FAIL)
The FAIL is lifted: doc 21 is complete, verified token-by-token, and the arbitration
architecture works — one file carrying every contested shared value, each with the losing
document named. That was the right design and it is now real. It does not reach PASS because
the architecture is applied to 13 documents and there are 17: docs 30, 31, 33 and 34 carry
binding content, are cited as decision sources, and sit outside the authority table entirely —
and one of them (33) silently overrides a document inside it (N3). An arbitration system with
four documents outside it has the same hole it was built to close.

### 3. Completeness — **FAIL** (was CONCERN)
Four named gaps, each independently material: the cache-key bump that the redesign requires to
reach returning visitors is absent (N1); doc 33's five-field Step 2, the honeypot, the
`_subject` line and the contact-form field changes have no work package (N3); Q11 omits the
largest repricing in its own research (P5) and the SC heater path entirely (P7); and four live
revenue defects the plan's research uncovered are scheduled nowhere (N7). Rev. 2's must-fix 7
also remains partly open — docs 30 and 31 were not added to the §0 table.

### 4. Right-sizing & reuse — **PASS**
Scope is honest and out-of-scope is named. The refusal to split `styles.css` into partials is
still correct. WP-2a exists because the mark work needed a slot rather than a mention. If
anything the plan is now under-sized rather than over — see N6.

### 5. Security — **PASS**
Re-verified against production, not the repo: all five deleted paths return 404 and the CSP
carries the tracker origin. The root cause (an orphaned analytics generation plus a publish dir
Netlify restored between builds) was found and fixed at source, and `netlify.toml` carries the
`rm -rf dist` with an inline comment explaining why it is load-bearing. The decision to grant
`ssc-ops.netlify.app` script execution is documented, reasoned, and given a revisit condition.
This dimension went FAIL → PASS on evidence.

### 6. Failure modes — **CONCERN**
The four missing modal states are specified, the `localStorage` correction is right, and doc
21's degradation cases (§7.5) are unusually thorough. Against that: the harness's nine
fail-open paths are themselves failure-mode defects in the thing that certifies the largest
package, and the bench fix needs scoping or it regresses six working defaults (P10).

### 7. Change safety — **FAIL** (was CONCERN)
The rollback story genuinely improved: the restore **floor** is the right concept, correctly
reasoned (a floor is needed because "back" must be a state you would still ship), and correctly
placed after `99b1aac` — confirmed by `git merge-base --is-ancestor`. Naming a deploy id rather
than a commit is also right, since `restoreSiteDeploy` restores an artifact.
But the plan's own per-package deploy workflow (§5 steps 2–3) uses `netlify-cli deploy` without
`--build`, uploading the local `dist/` — which `npm run build` never cleans — so it bypasses the
exact fix that stopped the last resurrection, on every package (N2). And WP-1b's grep-clean gate
certifies *absences* through that path. Add N1: shipping CSS and JS behind a one-year
`immutable` header with hand-typed, already-stale version stamps.

### 8. Data integrity & compatibility — **FAIL** (unchanged)
Blocker 2 is open. Three of fifteen priced configurator lines carry a signed number; the plan's
stated arithmetic for the one price it does commit to is unreachable from its own inputs (P1);
the pricing basis is undecided while its output is presented as settled (P2); docs 30 and 31
contradict each other on the window and Q11 picks a side without stating a number (P4); and the
`models.json` consolidation — the right change — is argued from a premise that the evidence
contradicts (P9). Additionally `js/data.js:84` publishes a product that does not exist.

### 9. Verifiability (incl. testing the tests) — **FAIL** (was CONCERN)
Part 3. The instrument for the largest package is untested, has nine green-with-nothing-verified
paths, reports 0 for shifts beyond 240px and for a page whose content changed entirely, and is
disarmed by the allowlist that a stylesheet rewrite forces you to use. Under the rubric's
explicit "fixtures are non-tautological" clause this is the cleanest FAIL in the review. It is
also the most fixable: the numbers needed are already computed.

### 10. Maintainability — **CONCERN**
The plan leaves the codebase better — token consolidation, price consolidation, one `.reveal`
class replacing six. Against that: `stylelint` is still not a dependency and no config exists,
so §4's stated guard against `styles.css` re-accreting does not yet exist (acceptable as a WP-1b
deliverable, but it must not be spoken of as present); and doc 21's sweep scope, along with
WP-1b's grep-clean gate, both exclude `booking-ops.html` — a shipped page with its own `:root`
and 63 `var()` references (T2).

---

## Part 5 — Verdicts, conditional dimensions

### X2. Privacy & data stewardship — **CONCERN** [GATING]
The leak is closed and re-verified in production. The permission gate is now a real fail-closed
allowlist with an explicit anti-denylist directive and a zero-builds loop case — a good fix.
It stays at CONCERN, not PASS, because the photo axis is unrepresentable in the schema and
§7.5(d) tests a field that does not exist, so `anonymous` publishes a client's home by default
(Blocker 4). Also outstanding from rev. 2: the privacy page still has no work package and no
Pierre/Petra gate, which `13:390` itself asks for.

### X3. Evidence & source integrity — **FAIL** [GATING]
Twenty falsely-cited or unsourced factual claims survive in copy intended to publish, including
three session-duration promises with **zero** supporting occurrences anywhere in `src/` or
`js/`, a false product-capability claim about the entry model, a paraphrase labelled *verbatim*,
a fire-ban scope shipped as fact on one line and flagged as an open question fourteen lines
later, and a reference to a `models.json` that does not exist in this repo. The specific
citation rev. 2 named was withdrawn at its line and **re-created eleven lines later under a
"per Lee" attribution that the quoted words do not support** — the one citation form that cannot
be checked against a file. Two `[NEEDS LEE]` brackets sit inside shipping sentences, which doc
13's own rule at `:5` forbids. This is the dimension the whole X3 clause exists for.

### X4. Audience, brand & money accuracy — **FAIL** [GATING]
Money is wrong in three directions at once. Published: a **"Save $1,000"** claim that is
−$1,000 on every model (N5), a nonexistent heater in the spec table (P8), and a wood-fired
option sold at roughly a $3,000-per-sale loss (P6). In the plan: an arithmetic chain that does
not compute (P1) presented to Lee for sign-off. And ahead of it: Q13 publishes a
non-refundable-fee, forfeiture, limitation-period and IP-retention clause with no legal review,
while the adjacent Q12 correctly refuses to publish a tax line without Jon (N6).

### X5. Concurrency & re-entrancy — **CONCERN** [ADVISORY]
`localStorage` over `sessionStorage` is right, and the double-submit guard and offline state are
specified. Unaddressed: the 7-day window now spans tabs, so two tabs configuring different
models share one key with no last-writer rule stated; and the harness's `WORKING` mode runs
`rm -rf dist` in the live working tree.

### X6. Operability & observability — **CONCERN** [ADVISORY]
The weekly submission check survives and is the right instrument. It still lacks the
specification rev. 2 asked for — where it runs, what it reads, the threshold that makes it
speak — and, newly, it cannot see the stream it exists to protect, because the configurator
posts to the same Formspree form as the contact page (N4).

### X8. Dependencies, performance & cost — **CONCERN** [ADVISORY]
The three harness dependencies are exact-pinned, real, and correctly sourced; the font tooling
is pinned and typosquat-checked per the rule; font delivery (self-hosted, content-hashed,
`format('woff2')` with `font-weight: 100 900`) is handled properly. Against that:
`package-lock.json` is gitignored, so no install is reproducible from a clone, and
`@11ty/eleventy` is unpinned at `^2.0.0` — the build tool is the least pinned thing in the repo.

---

## Stress test 1 — Pre-mortem

**It is late October 2026. This shipped and it went badly. Three ways.**

**(a) The redesign never reached half the audience, and the instrument said it was fine.**
WP-1a/1b ship. The harness runs green — because every page that changed was allowlisted, which
is what a recolour forces, and allowlisting waived the shift gate too. Nobody bumps
`?v=20260226`. Returning visitors get the new markup against the year-old stylesheet: unstyled
sections, a nav that does not lay out, retired classes with no rules behind them. New visitors
see a beautiful site, so every check the orchestrator runs passes. Inquiries fall roughly in
proportion to the returning-visitor share, and the weekly submission check does fire — but it
reports one aggregate number and the drop is read as seasonality in a business with six builds a
year. It is found weeks later, by a customer, or by Lee opening the site on his own phone.
*What we should have seen:* `01-audit-functional.md` §51 documented this exact failure before
the plan was written.

**(b) Fixing the funnel made the margin problem worse, faster.** This is the nastiest one and
it is a direct consequence of the plan succeeding. WP-0b ships on a Q11 sign-off. The
configurator finally delivers submissions — its whole purpose — while the changing rooms are
still $5,000–6,000 under cost, Kuuma is still live at roughly $3,000 a sale of loss, the
Premium Package still promises a saving it does not give, and the SC electric upgrade was never
priced at all. **The plan's success is the amplifier:** a funnel that previously converted
nothing now converts efficiently into underpriced work. On six builds a year, two mispriced
sales is a third of the year. And Lee signed it off from a sentence whose arithmetic does not
reach its own conclusion.

**(c) A published claim turns into a dispute.** WP-3 ships George's copy. Someone books a
session on the promise of "an hour" — a duration with zero occurrences anywhere in the
repo — or buys an S2 on "wood-fired or electric across the range" when `js/data.js:20` marks it
`electricOnly: true`. Or, more likely and more quietly, a prospect adds up the Premium Finish
Package, finds it costs $1,000 more than the parts, and simply leaves — the failure that
generates no complaint and no signal at all. The one with teeth is the design deposit: a
non-refundable clause with IP retention, published without a legal review, first tested when a
customer walks and wants their $750 back.

## Stress test 2 — Load-bearing assumptions

1. **"The screenshot harness bounds visual risk on WP-1 and WP-2."** *Confidence: low —
   measured, not estimated.* It returns 0 for shifts over 240px, 0 for a page whose content
   changed entirely, and passes a 6px sitewide button shift on the real homepage at both widths.
   *If wrong:* the acceptance gate for the two largest packages is decorative, and Netlify
   restore is the only real safety net. **Resolve before WP-1 opens** — the fix is wiring up
   numbers the harness already computes.
2. **"A claim marked verified in this corpus was verified."** *Confidence: mixed, and the
   mixture is the point.* Doc 21's 47 use-counts survived a full re-grep intact — genuinely
   excellent work. Doc 21's *scope* claim ("the only two places any token is consumed —
   verified") is false. Doc 13's citations fail at scale. The plan's own status column says the
   CSP fix is TODO when it has been live since `598bd27`. *If wrong:* sequencing decisions rest
   on a status table that does not track the tree. **Already demonstrated wrong twice.**
3. **"The prices being reconciled are the prices SSC transacts at."** *Confidence: low.*
   `models.json`, `js/data.js` and `saunas.njk` agree to the dollar on all five models — but doc
   31 records realized price at **73% of list on average**. The entire reconciliation operates on
   list prices while the margin problem lives in the discount. *If wrong:* Q11 could be answered
   perfectly and margins still fail. Nothing in the plan touches the discounting.
4. **"Formspree delivers."** *Confidence: moderate.* Single point of failure on the only working
   revenue path, no alerting until §7 exists, and the plan is about to route a second submission
   type through the same form. Doc 33 verified the quota honestly (50/month free tier vs ~201
   all-time — not a constraint) but delivery failure is unmonitored either way.

## Stress test 3 — Inversion

**What would have to be true for the rejected one-hour fix (`01 §5`) to win?** Rename the
button to "Continue to Quote Request," banner the config on arrival at `/contact/`, stop
deleting the storage key. Its winning conditions: (a) no funnel data exists, so the diagnosis is
guesswork; (b) the button name, not the handoff, is the mismatch; (c) the cost of waiting for
the full rebuild is low.

Rev. 2 found two of three already true. **Condition (c) has since moved decisively toward the
cheap fix, and not for any reason the plan chose.** The plan's own rebuttal is that "WP-0a ships
the CSP fix first, so a real baseline accumulates *while WP-0b is built*." The CSP fix did ship
and the baseline is accumulating — but WP-0b is not being built. It is blocked on a price
reconciliation covering three of fifteen lines, on a costing basis Lee has not been asked to
choose, on the largest repricing not yet being in the question, and on Q4, Q8, Q11 and Q14.
That is not a sprint; it is an open-ended wait on decisions outside engineering's control. Every
week of it, the funnel delivers exactly zero.

**The plan's argument on the merits still holds** — the handoff *is* the bug, and the cheap
version would measure the abandonment rather than fix it. The inversion does not overturn the
decision. What it overturns is the *sequencing*: the rebuttal assumed the wait was short, and it
is not. The honest response is not to reopen the one-hour fix but to **decouple what needs no
decision from what does** — which is exactly what WP-0c below is for. The bench bug alone is a
one-line fix on `modal.js:356` that today silently drops bench data from every quote SSC
receives, and it is currently sitting behind a full modal rebuild behind a pricing negotiation.

---

## Overall verdict

**Not cleared — but the shape of the remaining work is very different from rev. 2's, and one of
the two closed blockers was closed exceptionally well.**

Doc 21 is the strongest artifact in this corpus. Forty-eight tokens, a clean two-way diff,
forty-seven use-counts that survived a full independent re-grep without a single discrepancy,
zero undefined references after paste, contrast math that recomputes exactly, and a
self-reported AA defect that is real, correctly diagnosed, and correctly fixed. It was asked
for and it was delivered. The permission gate is likewise a genuine fail-closed allowlist,
better specified than the fix request. Security went FAIL → PASS on production evidence rather
than assertion. Those are real closures and they should be read as such.

The other two blockers were not closed, and the way they failed is more concerning than the
fact. **Blocker 3 was addressed at the single line the review quoted** — the citation was
withdrawn from `13:150` and the identical claim reappears at `13:383` under a new false
attribution, in the same revision, with nineteen siblings untouched. **Blocker 2 was addressed
at the three items the review named** and the research it commissioned went on to find a larger
repricing, a second unpriced heater path and a false public money claim, none of which reached
the plan. Rev. 2 named the pattern as attestation failure — claims about the world that are not
true. The third pass finds the pattern intact but narrower: **the plan now fixes precisely what
was quoted at it.**

That is why the new findings matter more than the re-checks. The four largest — the version
stamps that keep the redesign from reaching returning visitors, the deploy workflow that
bypasses the clean that stopped the last resurrection, the four specification documents outside
the arbitration system, and a "Save $1,000" that is minus one thousand dollars — were not on
anyone's list, and three of them are live on the site right now.

And the instrument does not hold. This is the finding that most changes the risk picture,
because it was the answer to rev. 2's central complaint. It genuinely builds, serves and
captures; its gate then returns *pass* for a page whose content changed entirely, for any shift
over 240px, and for a measured 6px sitewide button move on the real homepage at both widths —
and the allowlist a stylesheet rewrite forces you to use waives the shift gate along with the
pixel gate. It has no tests of its own. "Near-nil visual regression" was correctly deleted as
unfalsifiable; what replaced it is falsifiable and, tested, largely false. The repair is a day's
work and mostly consists of gating numbers the harness already computes — `shiftCoverage` and
`layoutShiftMaxPx` are calculated, carried, and never read.

**Gate decision: NOT cleared to enter the relay pipeline as a whole.** Four gating core
dimensions carry FAIL — **3 Completeness**, **7 Change safety**, **8 Data integrity**,
**9 Verifiability** — together with two gating conditionals, **X3** and **X4**. Six FAILs on
gating dimensions; any one of them blocks.

**But a substantial partial clearance is available, and withholding it would be the wrong
call.** The token work is done and verified; the security work is done and verified in
production; and there are one-line corrections sitting behind multi-week negotiations that
should not be there.

### Cleared to start now

**Two pre-flight fixes first. Both are one line. Neither may be deferred past the first
production deploy of anything.**

- **P-A — Cache keys.** Bump `?v=` in `src/_includes/head.njk:301` and
  `src/_includes/scripts.njk:3–15` in the same commit as any change to `styles.css` or `js/*`,
  or better, add an Eleventy filter appending a content hash. Make it a line in the definition
  of done for every package that touches those files. *(N1)*
- **P-B — Build cleanliness.** Add `rm -rf dist &&` to the `build` script in `package.json`, so
  the local path matches `netlify.toml`. Use `netlify-cli deploy --build` for the draft and prod
  steps in §5. Run absence checks against the deploy permalink, after the deploy. *(N2)*

| Package | Clearance |
|---|---|
| **WP-0a remainder** | **Cleared.** Analytics events per `14 §8`, and the weekly submission check — specified per rev. 2 item 10 and counting the configurator stream separately via `_subject` *(N4)*. |
| **WP-0c** *(new — recommended)* | **Cleared for the bench fix only.** `js/modal.js:356`, scoped to the bench group so the six legitimate "none/included" defaults do not regress. Pure correction, no decision required, and it stops silent data loss on every quote received today. |
| **WP-1a** Type + fonts | **Cleared to implement and deploy to a draft URL.** Blocker 1 is closed; doc 21 governs. |
| **WP-1b** Colour, shape, spacing, motion | **Cleared to implement and deploy to a draft URL.** The 169-usage figure is verified correct. Extend the grep-clean gate to `booking-ops.html` *(T2)*. |

**Production deploy of WP-1a/1b is gated on four things:** P-A, P-B, the harness repair (at
minimum: gate `shiftCoverage` and `layoutShiftMaxPx`; make `expectedToChange` waive
`changedPct` only; make zero-comparison runs fail; add the three fixture tests), and doc 21's
count corrections T1–T4. If the harness repair is declined, say so explicitly and substitute a
named page-by-page human review at both widths — but then stop describing the harness as an
acceptance gate in §6.

### Blocked on the plan — not on Lee

| Package | Blocked by |
|---|---|
| **WP-0b** Configurator | **Blocker 2.** Reconcile the remaining twelve priced lines or park them explicitly; fix P1's arithmetic; put the costing basis (P2) to Lee as a decision; add changing rooms (P5) and the SC 15kW path (P7); resolve the docs 30/31 window contradiction (P4). Also fold in doc 33 §160's five-field Step 2, `_gotcha` and `_subject` *(N3)*. |
| **WP-3** Copy | **Blocker 3.** Re-run the source gate over the whole document, not the quoted lines. Cut or source all twenty claims; correct the ~30 line pointers; add the fail-closed rule that no page ships containing `[NEEDS LEE]`. |
| **WP-6** Case studies | Add a required `photos` boolean, fail-closed, orthogonal to `permission`; §7.5(d) currently tests a field that does not exist *(Blocker 4)*. |

### Blocked on Lee's answers

| Needs | Gates | Note |
|---|---|---|
| **Q7** — per-model prices on `/saunas/` | **WP-2** | The only thing between WP-2 and start; doc 21 has landed. |
| **Q10** — nav badge sign-off | **WP-2a** | Plus Saul's asset production. |
| **Q11** — add-on prices | **WP-0b** | Not sign-off-ready as written; see Blocker 2. Needs the **basis decision** first. |
| **Q14** — Formspree tier, **Q8** — auto-reply, **Q4** — reply time | **WP-0b** | Gates whether the success panel may promise a confirmation email. |
| **Q3** — the four process questions (§A of doc 20) | **WP-4** | Timeline durations, payment milestones. |
| **Q5** — warranty terms per component + certifying body | **WP-3, WP-4** | |
| **Q13** — design deposit | **WP-3, WP-4** | **Add a Pierre gate** before any deposit clause publishes *(N6)*. |
| **Q12** — PST treatment | **WP-3** | Jon, correctly restored as a hard gate. |
| **Q1, Q2, Q6, Q9** | **WP-4, WP-6** | Case-study facts, client permissions, laser file. |
| **Shop time** | **WP-5** | |

### Three live defects needing one decision each — worth doing this week, independent of the relay

1. **Kuuma Banya** at `sauna.njk:63–65`: remove the option or reprice it. It is quoting a
   ~$3,000 loss per sale today.
2. **"Save $1,000"** at `sauna.njk:161`: either correct the claim, or make the $2,000 WiFi
   controller separately selectable so the arithmetic becomes true. It is false as published.
3. **`js/data.js:84`**: replace "Homecraft 9kW Apex" — a product that does not exist — with the
   real SC heater. Publicly rendered via `js/modal.js:97` and `js/compare.js:28`.

---

## Prioritized must-fix list

1. **Repair the harness before WP-1 deploys to production.** Gate `shiftCoverage` and
   `layoutShiftMaxPx`; make `expectedToChange` waive `changedPct` only; make zero comparisons,
   empty widths and `fetchFailures > 0` hard failures; pause and seek the hero `<video>`; add
   fixtures proving 4px reads 4, 300px does not read 0, and a 1%-of-page move is visible.
   *(Verifiability — gating)*
2. **P-A and P-B — the cache keys and the build clean.** Two one-line changes standing between
   the redesign and the people who already visit the site. *(Change safety — gating)*
3. **Re-run the source gate over all of doc 13.** Twenty claims, ~30 pointers, the `[NEEDS LEE]`
   fail-closed rule. Treat `[src: per Lee]` as requiring a quote that contains the claim, not
   one adjacent to it. *(X3 — gating)*
4. **Finish the price reconciliation and put the basis question to Lee.** Twelve unreconciled
   lines, the P1 arithmetic, changing rooms, the SC heater path, the docs 30/31 contradiction.
   *(Data integrity, X4 — gating)*
5. **Fix the three live money/spec defects** — Kuuma, "Save $1,000", the phantom heater.
   *(X4 — gating)*
6. **Bring docs 30, 31, 33 and 34 into the §0 authority table**, and fold doc 33 §160's
   five-field Step 2, `_gotcha`, `_subject` and the contact-form changes into WP-0b.
   *(Completeness — gating)*
7. **Add the `photos` boolean to the case-study schema**, fail-closed, before WP-6.
   *(X2 — gating)*
8. **Add a Pierre gate to Q13** on the same terms as Q12's Jon gate, and give the privacy page
   a work package with the Pierre/Petra review `13:390` asks for. *(X4, X2)*
9. **Correct doc 21's T1–T4** — the `.bg-grey` count (7, not 6), the false scope claim, the
   "74 call sites" figure, the 108/110 discrepancy — and extend WP-1b's grep-clean gate to
   `booking-ops.html`. Restate the paste verification as what it was: an inventory-based
   derivation. *(Maintainability, Approach soundness)*
10. **Specify the weekly submission check** and count the configurator stream separately.
    Commit `package-lock.json` and pin `@11ty/eleventy`. *(X6, X8 — advisory)*

---

## Note for a fourth pass

Two things worth carrying forward.

**The corpus rewards re-derivation unevenly, and the unevenness is informative.** Doc 21's
counts survived a complete independent re-grep — forty-seven of forty-seven — which is rare and
should raise confidence in everything else that document says about numbers. Doc 13's citations
failed at roughly the same rate they were sampled. A fourth pass should re-derive doc 13 and the
pricing documents line by line, and can reasonably spot-check doc 21.

**The failure mode has changed shape across the three passes and is worth naming for whoever
reads next.** Rev. 1 failed by omission. Rev. 2 failed by attestation — claiming things that
were not true. Rev. 3 fails by **literalism**: every item quoted in a review was fixed exactly
as quoted, and the class each item belonged to was not swept. The false citation was removed
from the line that was cited and recreated eleven lines below. The `?v=` lesson was applied to
fonts because fonts were what the review mentioned. The prices named in must-fix 2 were
researched and the ones the research itself surfaced were not carried. **The next review should
state the class, not the instance** — and should expect that a fix which exactly matches the
words of the request has probably not been generalised.

One consequence for the relay: the packages cleared above are cleared because they were verified
directly, not because the plan says they are ready. The plan's own status column was wrong about
the CSP fix in the safe direction. Verify before each package opens, not once at the top.
