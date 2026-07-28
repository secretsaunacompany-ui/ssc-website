# Plan Critic — SSC Website Redesign

**Plan:** `.claude/plans/website-redesign-2026-07.md`
**Rubric:** `~/marvin/.claude/rules/plan-critic-rubric.md` (v2)
**Reviewed:** 2026-07-28
**Reviewer:** separate critic subagent — did not author the plan or any of the specifications.

Every load-bearing claim below was verified against the repo at
`/home/leesalo/Projects/ssc-website` or quoted verbatim from the specification
documents. Line numbers and file paths in this review are checked, not inherited.

---

## Applicability block

**Project type(s):**
1. Change to a **live, revenue-bearing production website** (secretsaunacompany.ca) that
   is currently receiving real customer inquiries (~201 Formspree submissions to date).
2. **Public-facing marketing copy** carrying money, warranty, and certification claims
   about a real business, on a $22,500–$57,000 product.
3. **Security remediation** in a repo that contains live Netlify functions, one of them
   an unauthenticated API.
4. **Design-system refactor** of a 2,871-line monolithic stylesheet.

**Conditional dimensions:**

| # | Fires? | Reasoning | Tag |
|---|---|---|---|
| X1 Physical & human safety | **No** | Negative attestation: nothing in scope actuates hardware, heat, mains power, firmware, or G-code. The saunas are *described* by this site, never controlled by it. No plan state can injure a person. | N/A |
| X2 Privacy & data stewardship | **Yes** | `netlify/functions/analytics.js` is an unauthenticated endpoint that live-verified returns page URLs and titles from **fern-app.netlify.app** (the family baby tracker), opencanopy.ca, and dev sessions. The plan edits this exact directory. Separately, the plan moves PII collection (name, email) into the modal and specifies browser-storage retention. | **GATING** |
| X3 Evidence & source integrity | **Yes** | The plan sequences copy that makes factual claims about the business's history, materials, certifications, tax treatment, and named third-party clients' operations. | **GATING** |
| X4 Audience, brand & money accuracy | **Yes** | Prices, warranty terms, and certification language are all in scope, on public pages Lee's name stands behind. Money and legal terms present → gating per the default. | **GATING** |
| X5 Concurrency & re-entrancy | Yes | Form double-submit, modal re-entry, browser-storage state, and six relay batches sharing one stylesheet and one `netlify.toml`. | Advisory |
| X6 Operability & observability | Yes | Ships to an unattended production deploy; analytics is currently recording nothing. | Advisory |
| X7 Self-modification safety | **No** | Negative attestation: this plan changes a client website. It does not touch MARVIN's gates, hooks, skills, agents, or automation. No self-lockout path exists. | N/A |
| X8 Dependencies, performance & cost | Yes | Adds self-hosted font binaries, implies new build tooling, and adds a third-party script origin to the CSP. | Advisory |

Active: 10 core (gating) + X2, X3, X4 (gating) + X5, X6, X8 (advisory) = 16 verdicts.

---

## Verdicts — universal core

### 1. Problem-fit — **PASS**

The plan targets a real, evidence-backed defect: `01-audit-functional.md:5` documents
~201 Formspree emails against **zero** configurator-originated submissions in the entire
mailbox history, with the Gmail search methodology stated. WP-0 fixes that path first.
Naming the funnel dead-end as the headline problem, rather than the redesign, is correct
prioritisation and the strongest judgement call in the document.

### 2. Approach soundness — **CONCERN**

Spine-plus-references is the right architecture for a corpus this size, and the authority
table (§0) is a genuine improvement over restating 3,000 lines of spec. But the
arbitration rule is under-specified exactly where it is needed. "Where two documents
disagree, the higher number wins **for its own lane**" cannot resolve a dispute about
*whose lane it is*, and the real collisions are all of that kind:

- `--gutter`, **same token name, two values**, both destined for `:root`:
  `10-jen-art-direction.md:47` → `clamp(1.5rem, 6vw, 7rem)`;
  `12-saul-visual-photography.md:223` → `clamp(1.5rem, 5vw, 6rem)`.
  Is a gutter composition (Jen's lane) or grid (Saul's)? The rule has no answer.
  Whichever file Ted writes second silently wins.
- Type floor. `11-beatrice-typography.md:80`: "**Nothing on the site may be set below
  0.6875rem.**" Violated by `10:23` (`0.68rem`), `10:246` (`0.65rem`), `12:304`
  (`0.68rem`), `12:308` (`0.66rem`). Type is Beatrice's lane, but 12 > 11.
- The arbiter is a party. Jen (10) arbitrates cross-lane conflicts while being one side
  of the hero, gutter, padding, and `/saunas/` disputes — and contradicts herself: `10:23`
  sets an index caption in `--ink-faint` at `0.68rem`; her own §4.3 rules that faint is
  "*never* used below 0.8rem."

The plan also inherits a concrete design defect verbatim. WP-0 specifies "sessionStorage
7-day preservation." `sessionStorage` is per-tab and dies on tab close; a 7-day expiry is
incoherent against it and implies `localStorage`. The plan restates the flaw rather than
catching it.

**Fix:** replace the arbitration rule with a resolved token file. Before WP-1 opens, produce
`docs/redesign-2026-07/20-resolved-tokens.md` containing the single agreed value for every
contested token (`--gutter`, narrow tier, `--section-pad*`, grey ramp, type floor, rule
colour), each with a one-line note on which doc lost and why. Ted implements from that file
only. Separately, change WP-0's storage to `localStorage` or drop the 7-day window.

### 3. Completeness — **FAIL**

Four categories of silent gap.

**(a) The sequencing promise is contradicted by the plan's own §6.** §2 states "WP-0 through
WP-2 need nothing from him"; §6's preamble repeats "WP-0 through WP-2 proceed without any of
these." Then:

- §6 Q10: "Badge removal from nav … Sign-off needed. ***(Gates WP-2)***" — and WP-2 contains
  the row "Mark: wordmark 22px in nav, badge to footer as maker's seal."
- §6 Q8: "Formspree auto-reply … ***(Gates WP-0 success copy)***" — and Wim
  (`14:39`) is explicit: "**do not claim a confirmation email** unless Formspree's
  auto-response is enabled."
- §6 Q4 (reply-time) is tagged *Gates WP-3*, but the success panel it feeds is a WP-0
  deliverable, and Wim (`14:39`) writes "expect a reply within X business days — **Lee must
  supply X, do not invent**."
- §6 Q7 includes "per-model prices visible on `/saunas/`" — WP-2's `/saunas/` ledger rows are
  specified by Jen as "model · footprint · capacity · **price**."

The gate map is also internally inconsistent in both directions: WP-3's header claims answer
6, but Q6 says *Gates WP-4*. WP-4's header claims 8, but Q8 says *Gates WP-0*. WP-4's header
omits 5, but Q5 says *Gates WP-3, WP-4*. **Five of ten rows are mis-mapped, and at least four
questions gate the packages declared unblocked.** The plan's central organizing principle is
false as written.

**(b) WP-2 has an unstated design-production dependency.** Its mark row cites `12 §5`, where
Saul writes "**I'll produce** `logo-wordmark.svg`" and, on the favicon, "I'll design this in
the mark phase of the relay; it needs the usual 2–3 direction exploration." That mark phase is
not a work package, has no slot in the sequence, and is gated on Q10.

**(c) WP-4's two new pages have neither composition nor copy.** `/commercial/` and `/care/`
exist only in Wim (14 §J4, §J5). Jen enumerates fourteen page templates (10 §3.1–3.14) and
neither appears. George writes no copy for either, despite Wim's handoff assigning it to him.
The plan cites `14 §J4` / `14 §J5` as though those sections are implementable specs; they are
one-paragraph rationales. `/care/` also duplicates the existing warranty page's content with
no reconciliation.

**(d) Known-open items are neither in scope nor out of scope.** `01-audit-functional.md:70`
names the legacy analytics leak "still the most serious security item in the repo" — absent.
`01 §3` documents `js/data.js` vs `models.json` drift — absent. `01 §5` P1 item 4, "Reconcile
the Revive 9kW heater addon with `models.json` and current supplier pricing (**needs Lee's
numbers**)" — absent from the work packages *and* from §6, while feeding the quote totals WP-0
is about to start emailing. `/ops` is broken by the CSP (research audit C2) and lives on this
site, not the excluded booking subdomain.

**Fix:** rebuild §6 as a two-way table (question ↔ every WP it gates) generated from the WP
rows, not written alongside them. Rename §2's claim to what survives — realistically WP-0
minus success copy, and WP-1. Add the Revive 9kW addon price as a blocking question. Add a
WP-2a mark phase. Either spec `/commercial/` and `/care/` (Jen composition + George copy) or
move them behind their own gate.

### 4. Right-sizing & reuse — **CONCERN**

§4 names out-of-scope items explicitly, which most plans skip — credit. But WP-1 bundles eight
independent subsystems (type scale, font delivery + CSP, grey ramp, radius, spacing tokens,
container tiers, the entire motion layer, one undefined-variable fix) into a single reviewable
batch against a 2,871-line file with no test signal. That is not one work package; it is six.

Separately, the audit's cheap option is dropped rather than rejected. `01 §5` P0 item 1 offers
a "*Minimum viable alternative (~1 hr)*" — rename the button, banner the config on arrival,
stop deleting the storage key on read. The plan goes straight to a full two-step modal with a
state table and never mentions the alternative existed. Working-heuristics require the one-line
version to be asked for first, then beaten on the merits.

**Fix:** split WP-1 into WP-1a (type scale + font self-hosting + CSP) and WP-1b (colour, radius,
spacing, motion), each reviewed and merged separately. Add two sentences to WP-0 naming the
~1hr alternative and why the full build wins.

### 5. Security — **FAIL**

The plan carries two of the three security findings and omits the one the source audit calls
worst. `01-audit-functional.md:70`: "Legacy analytics stack (`analytics.js` unauthenticated
cross-project leak, C3) — unchanged since prior audit; **still the most serious security item
in the repo.**" It appears nowhere in the plan.

This is worse than an omission. WP-0 deletes `.eleventy.js:63` (`addPassthroughCopy("netlify")`)
to stop serving function source. That is correct in itself — but the audit's stated reason the
disclosure matters is that "it hands an attacker the exact shape of the unauthenticated
analytics API." Deleting the passthrough removes the *map* while leaving the *door* open.
Post-WP-0 the vulnerability is harder to find and exactly as exploitable.

Three further gaps, all verified:

- **The passthrough problem is wider than line 63.** `.eleventy.js:64–69` also passthrough-copy
  `analytics-tracker-netlify.js`, `analytics-dashboard-netlify.js`,
  `analytics-dashboard-netlify.html`, `booking-ops.html`, `booking-ops.js`, and
  **`supabase-schema.sql`** — the database schema, served publicly. The plan names only line 63.
- **The CSP change adds a third-party script origin.** WP-0 adds `https://ssc-ops.netlify.app`
  to `script-src` and `connect-src`. That grants arbitrary script execution on
  secretsaunacompany.ca to whoever controls that Netlify site. It is Lee's own property and the
  call is defensible, but the plan records no supply-chain reasoning and considers no SRI or
  self-hosted-tracker alternative.
- **`style-src 'unsafe-inline'`** survives untouched in a plan that rewrites the entire style
  layer — the one moment it would be cheap to remove.

**Fix:** add to WP-0, above everything else: delete the legacy analytics stack per the research
audit's own instruction (`netlify/functions/analytics.js`, `track.js`,
`analytics-tracker-netlify.*`, `analytics-dashboard-netlify.*`, `supabase-schema.sql`, and
passthrough lines 63–69), or token-gate `analytics.js` identically to `booking-admin.js:38-43`.
Verify by curling `/.netlify/functions/analytics?action=pages` after deploy and confirming a
401 or 404. Add one line on why `ssc-ops.netlify.app` is trusted.

### 6. Failure modes — **CONCERN**

The configurator path is the best-handled part of the whole corpus: Wim's state table
enumerates Configure / Send / Sending / Success / Failure / Fallback with a real `mailto:`
fallback. Credit where due.

Everything else has none. No stated behaviour if: the self-hosted fonts fail to load (Beatrice's
`format('woff2-variations')` is deprecated syntax — several current engines want `format('woff2')`
with `font-weight: 100 900`, and a literal paste means Outfit silently falls back to Arial, the
exact CLS failure §6 of her doc exists to prevent); the CSP edit is malformed and kills the
stylesheet; a deleted reveal class is still referenced (79 `.fade-in` + 34 `.slide-up` + 4 + 4 +
12 + 15 = **148 template usages** across `src/`); the tracker origin is unreachable. Wim's own
state table also omits client-side validation failure, double-submit, offline, and modal-closed-
mid-step-2.

**Fix:** name the failure behaviour for the font swap (keep `font-display: swap` and verify the
fallback stack renders before deleting the Google origins), require a grep-clean check that no
deleted class name survives in `src/`, and add the four missing modal states.

### 7. Change safety — **FAIL**

There is no rollback story, and this is not an oversight the documents cover elsewhere: the
words `rollback`, `revert`, `staging`, `preview deploy`, `branch deploy`, `undo`, `canary`, and
`feature flag` appear **zero times across all eight specification documents and the plan**.

Verified repo state: `netlify.toml` has no `[context.*]` blocks of any kind — no production,
deploy-preview, or branch-deploy configuration. There is no `.github/` directory. `.netlify/` is
gitignored. The only rollback affordance in existence is the Netlify deploy-history UI, which the
plan never mentions and which a non-technical owner has never been walked through.

The specific hazard is WP-1. Beatrice §10's migration is driven by a deletion list of ~68 raw
line numbers ("Delete once migrated: the raw sizes at lines 302, 368, 389, 469…") against
`styles.css` — **and those line numbers shift the moment the first deletion lands.** That is a
one-way destructive edit across a 2,871-line file, executed against stale coordinates, with no
checkpoint between steps and no way to compare before and after.

And the blast radius is the business. WP-0 touches `js/forms.js` and the Formspree path — the
*only* working lead channel, 201 submissions deep. If it regresses, analytics is currently dead,
there is no alerting, and Wim's success check is a 30-day lookback. Detection latency on a total
revenue-channel outage is **weeks**.

**Fix:** three things, all cheap. (1) Every WP merges to `main` as its own commit with a stated
revert command, and the plan states in plain English that Lee's rollback is "tell me to put it
back" — with the orchestrator, not Lee, running it. (2) Add `[context.branch-deploy]` to
`netlify.toml` in WP-0 and review every WP on its preview URL before merge. (3) Convert
Beatrice's line-number list to selector names before implementation starts; a selector survives
an edit, a line number does not.

### 8. Data integrity & compatibility — **FAIL**

Prices have no source of truth today and the plan multiplies the surfaces. Verified live:
`saunas.njk:214/229/244/259/274` hardcode $22,500 / $29,000 / $35,500 / $44,000 / $57,000; "from
$22,500" is duplicated across nine meta descriptions (`head.njk:33`, `:85`, `saunas.njk:4`,
`squamish.njk:4`, `whistler.njk:4`, `vancouver.njk:4`, `north-shore.njk:4`, `sea-to-sky.njk:4`,
`home.njk:31`); add-on prices live separately in `modals/sauna.njk:60–201`. The plan then adds
prices to `/saunas/` ledger rows (WP-2) and into George's copy (WP-3) without naming a single
source. `01 §3` already documents `js/data.js` drifting from `models.json` — omitted.

The sharpest instance: `01 §5` P1 item 4 flags the Revive 9kW heater addon as unreconciled with
`models.json` and current supplier pricing, "needs Lee's numbers." WP-0 is the package that makes
the configurator email quote totals for the first time in the site's history. The first real quote
would be computed from a price the audit already flagged as wrong.

**Fix:** before WP-0 ships a working quote, reconcile every add-on price against `models.json` and
supplier cost, and add it to §6 as a blocking question. Before WP-2/WP-3 add price surfaces, move
model and add-on prices into `src/_data/models.json` and render every occurrence — meta
descriptions included — from it.

### 9. Verifiability — **FAIL**

Verified: `package.json` has three scripts (`dev`, `build`, `dev:netlify`). There is **no test
suite, no test runner, no linting, no formatter, no visual-regression tooling, and no CI** — no
`.github/` directory exists. Nothing runs between `git push` and production.

Against that, §5's verification for WP-1 reads: "visual regression is *expected to be near-nil* —
if pages move significantly, the token mapping is wrong. `npx tsc`-equivalent for the build,
Lighthouse before/after on font loading."

- "Near-nil" is unfalsifiable with no instrument to measure it, so it cannot distinguish a correct
  migration from a broken one (see §10 below on why the prediction is also wrong).
- "`npx tsc`-equivalent" does not exist. This is a static Eleventy site with no TypeScript. `npx
  @11ty/eleventy` proves templates parse; it cannot detect a broken type scale, a dead class, or
  a colour regression.
- Lighthouse before/after on font loading is real and executable — the one solid check in the row.

WP-0's "a real quote request arrives in the inbox" is a genuine end-to-end proof and is expressible
in plain English for a non-technical owner. Credit. It is the only one.

**Fix:** add a screenshot-diff gate before WP-1 — build `main`, capture every page at 1440 and 390,
build the branch, diff. Playwright is already available in the toolchain and this is an afternoon.
Then replace "near-nil" with a stated budget ("no layout shift greater than X px on any page except
where the spec calls for it") and enumerate the pages expected to change. Delete the `tsc` line.

### 10. Maintainability — **CONCERN**

Collapsing 20 ad-hoc sizes to 10 tokens, six reveal classes to one, and a lying `--color-charcoal:
#c0c0c0` (verified, `styles.css:13`) into an honest ramp is real maintainability work, and the
specification documents become the durable spec. But `styles.css` stays a single 2,871-line file
with no partials, no preprocessor, and no lint rule to stop the same drift recurring — the plan
cleans the symptom and leaves the mechanism. Beatrice's own §2 step→role table has rows rendering
with three cells instead of four and maps `.model-header h3` to two different tokens; Ted will
guess.

**Fix:** add a `stylelint` config in WP-1 with a rule banning raw `font-size`/`border-radius`
literals outside `:root`. That is the guard that makes the consolidation permanent. Have Beatrice
correct the malformed table before implementation.

---

## Verdicts — conditional dimensions

### X2. Privacy & data stewardship — **FAIL** [GATING]

`research/front-end-audit-2026-07.md` C3, verified verbatim: `netlify/functions/analytics.js:246-321`
"has **no auth check at all**… Live test: `GET /.netlify/functions/analytics?action=pages` returned
page URLs and titles from **fern-app.netlify.app** (the family baby tracker), **opencanopy.ca**, and
localhost dev sessions." The dashboard password "is never validated by this function — it's theater."

This is a live, unauthenticated read path into a shared Supabase database, leaking data from a
family application built around a seven-month-old child, exposed from a sauna company's marketing
repo. The plan edits `netlify/` in WP-0 and does not close it.

Two smaller items also unaddressed: the plan moves name/email collection into the modal without a
word on Formspree as a US-resident processor (PIPEDA), and George (13 §5) asks *Ted* to write the
replacement privacy clause for Square → Helcim — legal copy assigned to an implementer with no
review gate.

**Fix:** close C3 in WP-0, as the first item, verified by curl. Add a line to the privacy page
change requiring Pierre or Petra review rather than Ted authorship.

### X3. Evidence & source integrity — **FAIL** [GATING]

George's copy contains claims with no traceable source, and one with a **false citation**.

The false citation first, because it is the only one of its kind in the corpus.
`13-george-copy.md:166`: "GST 5% + PST 7% **(per brief)**." Verified:
`grep -c "GST\|PST" docs/redesign-2026-07/00-design-brief.md` returns **0**. The brief contains
neither string. The claim is then repeated at `13:204`, `13:324`, and `13:380`. Whether PST applies
to a custom sauna build turns on goods versus improvement-to-real-property — a live tax question, not
a copy decision.

Unsourced or overstated, each checked against `src/` and the brief:

| Claim | Status |
|---|---|
| "still doing it twenty-five years on" (`13:63`) | Site says "Built to last **25+ years** outdoors" (`saunas.njk:126`) — a durability *target*. George converts it into an operating history SSC does not have. |
| "A **$30** session is the top of a $30,000 funnel" | No session price exists anywhere in `src/`, `_data/`, or the brief. Wim uses the same figure; mutual corroboration is not a source. |
| "Our saunas **run daily** at The Good Sauna…" | The four venues verify (`locations.njk:34/45/56/67`). "Run daily" does not appear anywhere. |
| "Several of them **earn their living** at commercial sites, running daily" | Same defect, stronger phrasing, and it *replaces* the site's existing softer sourced claim. |
| "Running today at **breweries**, beaches…" | George's own parenthetical names one brewery. |
| "There's **no charge for any of it**" | Source supports free *site visits* (`squamish.njk:28`), not a free consultation stage. |
| "a **fixed quote** … a **build slot** … **buys your materials**" | Only "30% deposit" verifies (`faq.json:40`). "Fixed quote" also contradicts the disclaimer George retains: "Final pricing is confirmed after consultation." |
| "Bookings already in the system will **resume on their own**" | A functional claim about an external system, in neither cited source. |
| "— Kuopio Ischaemic Heart Disease study, 20-year follow-up *(Verified: …)*" | Reasoning is sound and the underlying facts are right, but no link, DOI, or document path. Critical Rule #6. |

The plan's verification (§5) makes this worse rather than catching it: WP-3's check is "brand-critic
pass; no em dashes, no three-point patterns; every factual correction from §6 verified" — which
validates the *corrections listed in §6* and nothing else. "No invented facts anywhere" is applied to
WP-4/5/6, and **not** to WP-3, the package that contains the invented facts.

**Fix:** add a source-verification gate to WP-3 as a hard blocker — every factual sentence in
`13-george-copy.md` annotated with a repo path, a brief line, or "per Lee, [date]," and anything
unannotated cut before it ships. Delete or re-source the nine claims above. Get the tax treatment from
Jon before any tax line publishes.

### X4. Audience, brand & money accuracy — **FAIL** [GATING]

Beyond X3's list, four accuracy defects that would go out under Lee's name:

- **The heater list drops the default heater.** `13:` "Harvia, Kuuma, and HUUM stoves" against
  `warranty.njk:59` "Harvia, **Homecraft**, Kuuma, and HUUM heaters." Homecraft is the *standard*
  electric heater in the configurator (`modals/sauna.njk:30`, `:59`). The edited list reads more
  premium than what the customer receives. On a $22.5k–$57k purchase that is a material
  misrepresentation, not a copy trim.
- **SC dimensions transposed.** George writes "12' × 7'+"; `saunas.njk:84` says "7' x 12'+".
- **The warranty fix misses three of four instances.** George states the name is "2-5 Year Limited
  Warranty" "everywhere else on the site." It is, in exactly one place (`warranty.njk:13`). It reads
  "2-5 Limited Warranty" in `warranty.njk:4`, `faq.json:30`, and `faq.json:31` — the last being the
  **schema answer**, which feeds Google rich results. His instruction "Warranty — no copy changes"
  therefore leaves a wrong warranty name in the site's structured data.
- **Headcount contradicts the brief.** "Secret Sauna Company is Lee and Anthony" against the brief's
  "keep it **slightly vague** rather than a solo-founder story" — while George's own open item #4 asks
  Lee to confirm the vagueness level.

Add the reply-time promise: Wim flags it "do not invent" (`14:39`, `14:232`); George writes "typically
within one business day" in five places. He cites `thank-you.njk:5`, which is real — but that is a
*post-submission* courtesy line, and George moves it to a *pre-submission promise* on the quote
button. Materially different commitment, made on Lee's behalf, on a question flagged as his.

Then the unreconciled add-on price (core dim 8) reaches the customer as a number in an email.

**Fix:** as X3, plus restore Homecraft, correct the SC dimensions, fix all four warranty-name
instances including `faq.json:31`, and hold the reply-time promise until Lee gives it. No price
publishes until the add-on reconciliation lands.

### X5. Concurrency & re-entrancy — **CONCERN** [ADVISORY]

`sessionStorage` with a 7-day expiry is incoherent (per-tab, dies on tab close). Double-submit,
offline, and validation-failure are absent from Wim's state table. Six relay batches all write
`styles.css` and `netlify.toml` — the CSP is edited twice, in two packages (WP-0 adds
`ssc-ops.netlify.app`; WP-1 deletes the two Google origins) — with no merge order stated and no owner
named for the shared files.

**Fix:** name a merge order and a single owner for `netlify.toml` and `styles.css`; switch to
`localStorage`; add the missing states.

### X6. Operability & observability — **CONCERN** [ADVISORY]

Fixing the dead tracker first is exactly right and is the plan's second-best judgement call. But
nothing watches the channel that actually works: no alert if Formspree submissions stop, no error
monitoring, and a 30-day success lookback. A regression in `js/forms.js` on the 201-submission contact
form would be invisible until someone noticed the inbox had gone quiet.

**Fix:** add a weekly check — submission count versus prior week, surfaced to Lee in plain English. It
is the only instrument that catches a silent revenue outage on this stack.

### X8. Dependencies, performance & cost — **CONCERN** [ADVISORY]

Beatrice's §6 is genuinely excellent — named files, weights, OFL licence confirmation, the literal
unicode-range, real `size-adjust`/`ascent-override` numbers, and an honest caveat that Ted must
regenerate them with `fontaine`. The plan under-carries it. Unmentioned: ~110–140KB of font binaries
enter the repo (where?), their cache headers (the repo already serves `/js/*` as
`max-age=31536000, immutable` with `?v=` stamps that have gone stale — the same trap), `fontaine` and
`glyphhanger` as new unpinned, unverified tooling, and the deprecated `format('woff2-variations')`.

**Fix:** name the font directory and its cache header in WP-1; pin and typosquat-check `fontaine` and
`glyphhanger` per the packages rule; correct the `@font-face` format syntax before implementation.

---

## Stress test 1 — Pre-mortem

**Three months out. What broke.**

**1. The leak — the type-specific worst case for this plan.** Someone probes
`https://www.secretsaunacompany.ca/.netlify/functions/analytics?action=pages` and pulls page URLs and
titles from Fern, Louis's tracker, and from OpenCanopy. WP-0 had deleted the passthrough that
published the endpoint's source, so the shape was slightly harder to guess — and the endpoint itself
answered anyway, unauthenticated, exactly as it had for months. *What we should have seen:* the same
audit document the plan cites twice for other items says, in plain words, "still the most serious
security item in the repo."

**2. The first working quote is wrong.** The configurator finally submits — the project's stated
success criterion, `quote_submit_success` off zero at last — and the total is built on the Revive 9kW
add-on price the audit had already flagged as unreconciled with `models.json` and supplier cost. Lee
either eats the difference or walks a number back with a customer who has it in writing. *What we
should have seen:* `01 §5` P1 item 4, "needs Lee's numbers," which appears in neither the work
packages nor the blocking questions.

**3. A false claim ships under Lee's name.** "Still doing it twenty-five years on" goes live on a
company that has not existed twenty-five years, alongside a tax line citing a brief that contains no
tax line. Someone notices — a competitor, a customer, or the CRA. *What we should have seen:* a
two-second grep. The brief contains zero occurrences of "GST" or "PST" and the site's own copy says
"built to last," not "has lasted."

**Runner-up:** WP-1 lands, pages move visibly, and nobody can say whether that is the new type scale
working or the token mapping broken — because "near-nil" was the acceptance criterion and there is no
tool that measures it. The branch merges on vibes and the regression is discovered by a customer.

---

## Stress test 2 — Load-bearing assumptions

**1. "WP-0 through WP-2 need nothing from Lee." — Confidence: LOW. Falsified.**
Contradicted by the plan's own §6 (Q10 gates WP-2; Q8 gates WP-0's success copy), and by two more on
inspection (Q4 reply-time, Q7 pricing). *If wrong:* the plan's entire organizing principle collapses.
The concrete danger is not delay — it is that a relay batch running on "no input needed" hits a
missing fact mid-flight and Ted invents it, which is precisely how the X3/X4 failures above get worse.
**Resolve before implementation.**

**2. "The five specialist documents are consistent enough to implement from." — Confidence: LOW.**
Verified collisions on `--gutter` (same token, two values), the narrow tier (38rem vs 34rem — and the
plan writes 34rem while citing both sources), section padding (Saul restores the exact value Jen's
opening critique dismantles), the type floor (three violations of Beatrice's stated minimum), the hero
(Jen: "No headline, no buttons on the photograph"; Wim: "the hero heading and subline fade up"),
`/saunas/` structure, CTA labels, and the nav mark (three sizes, no decision). *If wrong:* the site
ends up an unintentional average of two design systems, which is the exact "visible seam between two
design generations" the UX audit was commissioned to remove. **Resolve before implementation.**

**3. "WP-1 produces near-nil visual regression." — Confidence: LOW.**
The package replaces the type scale (20 ad-hoc sizes → 10 tokens), changes `body` line-height from 1.8
— which reflows the vertical rhythm of every paragraph on every page — shifts the grey ramp on 14
`--color-charcoal` references, collapses every radius, deletes six reveal classes used **148 times**
across `src/`, removes `HeroIntroAnimation`, five parallax effects, and `slowZoom`, and swaps the font
delivery pipeline to self-hosted files with new metric overrides. Near-nil is not a prediction; it is a
hope. *If wrong:* the stated acceptance criterion cannot distinguish success from failure.

**4. "The referenced documents carry the detail the spine delegates." — Confidence: MIXED, and this is
the one worth knowing precisely.** Verified **strong**: Saul §1.2 (ten numbered rules, D1–D12 and P1–P10
shot lists — the best-executed section in the corpus), Saul §3 (seven-role Cloudinary table, real public
IDs, complete `<picture>` markup, ten-line lightbox fix), Beatrice §6 (named files, weights, licence,
unicode-range, real override numbers), Wim §1 (six-state table) and §8 (16 named events with payloads).
Verified **thin or absent**: Jen §2.1F — the El Croquis case-study template, which Jen herself calls
"the single largest thing an architecture-studio register demands that we do not yet deliver" — is
**one table cell**, with no template path, no class names, no field list for the credits row, no data
source, and no example; `/commercial/` and `/care/` have no composition and no copy. *If wrong:* WP-4
and WP-6 have citations where they need specifications, and the gap only surfaces once Ted opens the
document mid-relay.

---

## Stress test 3 — Inversion

**What would have to be true for the rejected alternative to win?** The alternative is the audit's own
`01 §5` P0 minimum-viable path — rename the button to "Continue to Quote Request," banner the
configuration on arrival at `/contact/`, stop deleting the storage key on read — shipped alone with the
five-minute CSP fix, ahead of everything else. Roughly one hour of work.

It wins if: (a) the funnel dead-end is the whole revenue problem, (b) measurement matters more than
form, and (c) you want evidence of demand before committing the design budget.

**Are any of those conditions already true? Two of the three are.** Analytics has recorded nothing for
SSC, so there is *no* funnel data — not weak data, none. And the configurator has produced zero
submissions in the site's entire history, which means nobody actually knows whether visitors abandon at
the handoff or never reach the button at all. The plan's own success metric, `quote_submit_success > 0`,
is currently unmeasurable in both the before and after state. Shipping the one-hour version plus the CSP
fix would produce a real baseline within a fortnight, at near-zero risk to a live revenue site, and
would tell you how much the full two-step modal is worth before you build it.

The full build is still probably right — the handoff *is* the bug, and half-fixing it preserves the
mental-model mismatch that causes the abandonment. But "probably right" is a conclusion the plan should
reach in writing, not skip. As drafted, the cheaper option was never weighed.

---

## Overall verdict

**FAIL — blocked.** Not on ambition, and not on the underlying work: parts of this corpus are genuinely
excellent (Beatrice's font-delivery section, Saul's shot lists and Cloudinary tables, Wim's state table
and event taxonomy), the diagnosis of the revenue defect is evidence-backed rather than asserted, and
sequencing the funnel fix ahead of the redesign is the right instinct. The plan is blocked on five
things, each independently sufficient. Its central organizing principle — that WP-0 through WP-2 need
nothing from Lee — is contradicted by its own §6 in two places and by inspection in two more, with five
of ten gate mappings wrong. It omits the repo's most serious security item, a live unauthenticated
endpoint leaking data from a family baby-tracker application, while editing that very directory and
deleting the passthrough that made the endpoint discoverable. It carries at least nine unsourced or
overstated public claims about a real business into publishable copy — including a citation to a brief
that does not contain the fact it cites — behind a WP-3 verification step that checks only the
*corrections* and explicitly applies "no invented facts" to every package except the one containing the
invented facts. It routes an unreconciled add-on price into the first working quote the site will ever
send. And it proposes a whole-stylesheet migration against a live revenue site with no tests, no CI, no
staging, no branch deploys, no rollback, and an acceptance criterion ("near-nil regression") that no
instrument in the repo can measure. Fix the five, and the sequencing spine is a good structure worth
keeping.

---

## Prioritized must-fix list

1. **Close the cross-project leak in WP-0, before anything else.** Delete or token-gate
   `netlify/functions/analytics.js` per the research audit's own instruction, including passthrough
   lines 63–69 and `supabase-schema.sql`. Verify by curl. *(X2, Security — gating)*
2. **Rebuild §6 as a two-way gate table** generated from the WP rows. Correct the five mis-mapped
   questions, and restate §2's sequencing claim to what actually survives. *(Completeness — gating)*
3. **Add a source-verification gate to WP-3** and cut or re-source the nine unsourced claims — starting
   with "twenty-five years on," the GST/PST "(per brief)" citation, the "$30 session," and "run daily."
   Restore Homecraft to the heater list, fix the SC dimensions, and fix all four warranty-name instances
   including the schema answer in `faq.json:31`. *(X3, X4 — gating)*
4. **Reconcile the Revive 9kW add-on price before WP-0 ships a working quote**, and add it to §6 as a
   blocking question. *(Data integrity, X4 — gating)*
5. **Give the plan a rollback story.** Per-WP commits with a stated revert path, `[context.branch-deploy]`
   in `netlify.toml`, and review on preview URLs before merge — with the orchestrator running it, not Lee.
   *(Change safety — gating)*
6. **Resolve the token collisions into one file** (`20-resolved-tokens.md`) before WP-1 opens: `--gutter`,
   narrow tier, `--section-pad*`, grey ramp, type floor, rule colour, nav mark size, hero choreography.
   Ted implements from that file only. *(Approach soundness — gating)*
7. **Split WP-1 and give it an instrument.** WP-1a (type + fonts + CSP) and WP-1b (colour, radius, spacing,
   motion); replace "near-nil" with a screenshot-diff gate and a stated budget; delete the `tsc` line.
   *(Right-sizing, Verifiability — gating)*
8. **Fix the storage bug and the missing states** — `localStorage` not `sessionStorage` for a 7-day window;
   add double-submit, offline, validation-failure, and closed-mid-step-2. *(Approach soundness, X5)*
9. **Spec or gate `/commercial/` and `/care/`**, expand Jen §2.1F into an implementable case-study template,
   and add the WP-2a mark phase the plan currently has no slot for. *(Completeness)*
10. **Correct `format('woff2-variations')`**, name the font directory and its cache headers, and pin
    `fontaine`/`glyphhanger`. *(Failure modes, X8 — advisory)*
11. **Add a weekly submission-count check** so a silent revenue-channel outage cannot run for weeks.
    *(X6 — advisory)*

**Note on §7 (Known asset debt):** the plan states "`logo.svg` is Inkscape output… Needs redrawing from
`logo-original.pdf`." Neither file exists in this repo — there is no SVG or PDF anywhere in it, and none
ever in its history. Saul's source (`12:286`) gives the real path: `~/marvin/content/assets/logo.svg`
(46KB, confirmed present, alongside `logo-original.pdf`). The plan dropped the prefix, so as written it
sends Ted looking in the wrong repository. Also worth noting as evidence for must-fix #2: Jen escalates
per-model pricing to Lee as an open question (10 §6 #7, "currently only 'from $22,500' on home"), but the
per-model prices are already live at `saunas.njk:214–274`. Escalations were assembled from the documents
without checking them against the site.

**Minor:** §2 line 60 contains a corrupted glyph — "WP-3 onward需 his input" — in a sentence Ted reads.
