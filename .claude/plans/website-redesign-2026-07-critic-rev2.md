# Plan Critic — SSC Website Redesign (rev. 2, second pass)

**Plan:** `.claude/plans/website-redesign-2026-07.md` (rev. 2)
**Previous review:** `.claude/plans/website-redesign-2026-07-critic.md` — FAIL, 11 must-fixes
**Rubric:** `~/marvin/.claude/rules/plan-critic-rubric.md` (v2)
**Reviewed:** 2026-07-28
**Reviewer:** separate critic subagent — did not author the plan, the revisions, or any specification.

Every claim below was verified against the repo at `/home/leesalo/Projects/ssc-website`,
against the live site by `curl`, or against the Netlify deploy API. The plan's own
assertions of completion were treated as claims to be tested, not as evidence. Where
this review contradicts the plan, the verification command is stated so it can be
re-run.

---

## Headline

The revision is a large, mostly honest improvement. Nine of eleven must-fixes are
genuinely addressed at the level of the *document*. But the one must-fix the plan
marks **DONE** and **"verified by curl"** is, on the live site, **not done** — and
the plan's verification claim for it is false against production as of this review.
That is a worse defect than the original omission, because rev. 1 was wrong in a way
that invited checking and rev. 2 is wrong in a way that discourages it.

**Verdict: still blocked.** Details in the closing section.

---

## Applicability block

**Project type(s):** unchanged from the first review —
1. Change to a **live, revenue-bearing production website** (secretsaunacompany.ca).
2. **Public-facing marketing copy** carrying money, warranty, tax, and certification
   claims on a $22,500–$57,000 product.
3. **Security remediation** in a repo holding live Netlify functions, one of them an
   admin API.
4. **Design-system refactor** of a 2,871-line monolithic stylesheet.

| # | Fires? | Reasoning | Tag |
|---|---|---|---|
| X1 Physical & human safety | **No** | Negative attestation, re-affirmed: nothing in scope actuates hardware, heat, mains power, firmware, or G-code. The saunas are described by this site, never controlled by it. No plan state can injure a person. | N/A |
| X2 Privacy & data stewardship | **Yes** | The analytics read path leaked rows from `fern-app.netlify.app` (a family baby tracker), `opencanopy.ca` and `opencave.ca`. The plan claims it closed. It also moves PII collection (name, email) into the modal and specifies browser-storage retention, and now adds a `builds.json` permission gate over named clients and their homes. | **GATING** |
| X3 Evidence & source integrity | **Yes** | The plan sequences copy making factual claims about company history, materials, certifications, tax treatment, and named third-party clients. Rev. 2 adds a tax claim sourced to a verbal answer. | **GATING** |
| X4 Audience, brand & money accuracy | **Yes** | Prices, warranty terms, tax rates and certification language on public pages Lee's name stands behind. Money and legal terms present. | **GATING** |
| X5 Concurrency & re-entrancy | Yes | Form double-submit, modal re-entry, browser-storage state, and now eight relay packages sharing one stylesheet and one `netlify.toml`. | Advisory |
| X6 Operability & observability | Yes | Ships to an unattended production deploy; site analytics still records nothing. | Advisory |
| X7 Self-modification safety | **No** | Negative attestation, re-affirmed: this plan changes a client website. It does not touch MARVIN's gates, hooks, skills, agents, or automation. No self-lockout path exists. | N/A |
| X8 Dependencies, performance & cost | Yes | Adds self-hosted font binaries, `fontaine`/`glyphhanger`, a Playwright screenshot-diff gate, `stylelint`, and a third-party script origin in the CSP. | Advisory |

Active: 10 core (gating) + X2, X3, X4 (gating) + X5, X6, X8 (advisory) = 16 verdicts.

---

## Part 1 — Audit of the eleven must-fixes

Assessed as **RESOLVED**, **PARTIAL**, or **NOT RESOLVED**. The plan's §9 mapping
asserts all eleven are addressed; §9 is a table of *intentions*, and two of its rows
do not survive contact with the live site.

### Must-fix 1 — Close the cross-project leak — **NOT RESOLVED IN PRODUCTION**

The plan states, in the WP-0a table:

> Verified by curl: all six paths return 404; site, booking-admin, tracking, Monitor
> all unaffected — **DONE**

**That is false against production.** Verified 2026-07-28, three independent ways.

**a) The live domain still serves five of the six paths.**

```
GET https://www.secretsaunacompany.ca/netlify/functions/analytics.js        -> 200
GET https://www.secretsaunacompany.ca/netlify/functions/advisor.js          -> 200
GET https://www.secretsaunacompany.ca/netlify/functions/booking-admin.js    -> 200
GET https://www.secretsaunacompany.ca/netlify/functions/lib/http.js         -> 200
GET https://www.secretsaunacompany.ca/supabase-schema.sql                   -> 200
GET https://www.secretsaunacompany.ca/analytics-tracker-netlify.js          -> 200
GET https://www.secretsaunacompany.ca/analytics-dashboard-netlify.js        -> 200
GET https://www.secretsaunacompany.ca/analytics-dashboard-netlify.html      -> 200
```

**b) This is not an edge-cache artifact.** The current *published* deploy is
`6a68d599080fcb0008afbb41`, `commit_ref` `2888a08` — the latest commit — confirmed
via the Netlify deploy API. Requesting the same paths on that deploy's own permalink,
`https://6a68d599080fcb0008afbb41--hilarious-pudding-5f8dd8.netlify.app`, returns
**200** for `/supabase-schema.sql`, `/netlify/functions/advisor.js`, and
`/analytics-dashboard-netlify.html`. The permalink is deploy-scoped. The files are in
the deploy.

**c) The CSP header on that same deploy is the old one.** It contains neither
`https://ssc-ops.netlify.app` in `script-src` nor in `connect-src`, although
`netlify.toml` at `598bd27` does. Verified on the permalink and on the apex domain
with a cache-busting query string.

Local `dist/` is clean — the artifacts are absent there — so the repo-side change is
correct. The defect is that **a passthrough removed from `.eleventy.js` did not remove
the file from the deployed site.** Eleventy does not clean its output directory, both
deploys report `deploy_source: "api"` with `has_source_zip: true`, and the newest
deploy's own summary says *"All files already uploaded by a previous deploy with the
same commits."* Whatever the precise mechanism, the operational fact is established
and reproducible: **deleting a file from the repo did not delete it from production,
and nobody re-checked production after the deploy.**

**What is genuinely closed.** The data exposure itself. The Netlify API lists exactly
three functions on the current deploy — `advisor`, `booking-admin`, `prompts`.
`analytics` and `track` are gone. `GET /.netlify/functions/analytics?action=pages`
returns 404, and `POST /.netlify/functions/track` returns 404. No caller can read the
shared store through this site any more. The July-12 deploy, by contrast, lists five
functions including `analytics` and `track`. So the endpoint is dead and **must-fix 1's
primary harm — cross-project rows returned to an anonymous caller — is stopped.**
Credit for that, and the diagnosis in `7149b93`'s commit message (orphaned older
generation, `site` column never filtered) is careful and reads as true.

**What is not closed.** Function *source disclosure*, which the source audit named as
the reason the leak mattered in the first place. Live right now:

- `/netlify/functions/booking-admin.js` publishes the admin auth mechanism verbatim —
  `x-admin-token` header, `OPS_ADMIN_TOKEN` env var, the comparison, and the 401 shape.
- `/netlify/functions/advisor.js` publishes the Anthropic wiring, `ANTHROPIC_API_KEY`
  as the env var name, the model id, and the prompt-config indirection.
- `/netlify/functions/lib/http.js` publishes the allowed-origins list.
- `/supabase-schema.sql` publishes the database schema.
- `/netlify/functions/analytics.js` — the *token-gated* version from `20864bd` — is
  still served, which means the commit that added the auth check also published a
  working description of that check, annotated with a comment explaining that it is
  "Same header/secret as booking-admin.js."

No secrets are exposed. But the plan asserts these are 404 and they are 200, so nobody
is looking.

**Fix.** Force a clean rebuild (clear build cache, redeploy) or delete the stale paths
from the deploy explicitly, then **re-verify on the deploy permalink, not the cached
domain**. Add to WP-0a's definition of done: the curl check runs *after* deploy, against
the permalink, and its output is pasted into the relay pack. Until that passes, treat
must-fix 1 as open.

### Must-fix 5 — Rollback story — **PARTIAL, and the named restore point is unsafe**

§5 is a real improvement over rev. 1's silence, and the Netlify affordance is verified
rather than assumed: deploy `6a531f5506b87600082b2a1a` exists, `state: ready`,
`published_at 2026-07-12`, restorable. The plain-English framing for Lee ("say 'put it
back'; the orchestrator runs the restore") is exactly right and matches the standing
rule that Lee never runs commands.

**But the plan names the wrong deploy as its restore point.** It calls
`6a531f5506b87600082b2a1a` "the last state before any of today's changes" and offers it
as the rollback target. That deploy is at commit `bd8022e` and its
`available_functions` list contains **five** functions — including `analytics` and
`track`. Restoring it to fix, say, a WP-1b stylesheet regression would silently
**reinstate the unauthenticated analytics endpoint, the passthrough function source,
and the pre-fix CSP.** The rollback plan has no rule forbidding a restore to a deploy
older than the security fix, and no post-restore verification step.

Two further gaps:

- Steps 2–3 (`npx netlify-cli deploy` → draft URL → `--prod`) is a sound workflow, but
  it is the *same* API deploy path that just produced a deploy whose file set did not
  match the repo. The rollback section inherits the defect in must-fix 1: it assumes
  "deployed" means "what the repo says." On this site, today, it did not.
- `git revert <sha>` then redeploy is offered as the code-rollback path. Given the
  above, a revert that *re-adds* a file will work; a revert that *removes* one may not
  take effect. That asymmetry is unstated and is exactly the WP-1b case (deleting six
  reveal classes, `HeroIntroAnimation`, parallax, `slowZoom`).

**Fix.** Name a restore floor — no restore to any deploy published before the security
fix lands and is verified — and add a post-restore curl check. State that removals are
verified on the permalink after every deploy, not assumed.

### Must-fix 2 — Rebuild §6 as a two-way gate table — **PARTIAL**

§8 is a genuine rebuild and most of it is right. I checked **every** row against §2's
"Blocked by" column in both directions. Eleven of twelve reconcile exactly:

| Q | §8 says gates | §2 WP row lists it? |
|---|---|---|
| Q1 | WP-4, WP-6 | ✔ both |
| Q2 | WP-6 | ✔ |
| Q3 | WP-4 | ✔ |
| Q4 | WP-0b, WP-3 | ✔ both |
| Q5 | WP-3, WP-4 | ✔ both |
| Q6 | WP-4 | ✔ |
| **Q7** | **WP-2, WP-3** | **WP-3 ✔ — WP-2 ✘, its row reads only "Doc 21; not the mark"** |
| Q8 | WP-0b | ✔ |
| Q9 | WP-4 | ✔ |
| Q10 | WP-2a | ✔ |
| Q11 | WP-0b | ✔ |
| Q12 | WP-3 | ✔ |

One mismatch, and it lands on the same load-bearing sentence as last time. §2 concludes
"**WP-2 unblocks the moment doc 21 lands**" — but §8 says Q7 (which includes "per-model
prices visible on `/saunas/`") gates WP-2, and WP-2 is the package that rebuilds
`/saunas/`. §8 is right on the merits; §2's summary sentence is wrong. Rev. 1's central
false claim was "WP-0 through WP-2 need nothing from Lee." Rev. 2's is a smaller version
of the identical error, in the identical place. Five-of-ten became one-of-twelve, which
is real progress, but the *mechanism* that produced the error is untouched.

The plan calls §8 "**generated from the WP rows**." It is not generated — it is
hand-maintained, which is why it drifted again, and it has **already gone stale within
hours of being written**:

- `20-fact-gathering-questions.md` now opens with an "Answers received" block.
  **Q12 (tax) is answered** — "PST applies to custom sauna builds," per Lee 2026-07-28.
  **Q4 (reply time) is answered** — "within three business days, usually the next day."
  Both still appear as open blockers in §8 and §2.
- Q1/Q2 are recorded there as **deferred, not answered**, with WP-6 parked pending Lee
  contacting Clarke, Emmanuel and Mountain Life. The plan does not reflect the park.
- That same block assigns **new work that has no work package**: intake-field redesign
  ("the current form asks nine questions and requires two… does not ask location or
  access"), assigned to Wim. This is a WP-0b-adjacent change to the only working lead
  channel, and it is nowhere in §3.
- Two new specification documents exist that the §0 authority table does not list:
  `30-pricing-heaters-equipment.md` and `31-pricing-materials.md`.

**Fix.** Either generate §8 mechanically from the WP rows, or delete §2's summary
sentence and let the table be the only statement of what is blocked. Add docs 30 and 31
to the §0 authority table. Fold the intake-field work into WP-0b or give it a package.

### Must-fix 4 — Reconcile the Revive 9kW price — **NOT RESOLVED (correctly escalated, not answered)**

Q11 is now a first-class blocking question with a well-argued justification, and it
correctly gates WP-0b. That is exactly what was asked for. But the answer does not
exist yet, and the research that would produce it is explicitly unfinished:
`30-pricing-heaters-equipment.md` carries **"Status: IN PROGRESS"** and its
**"§3 Revive 9kW Verdict (blocking)"** section reads, verbatim, *"Pending."*

What that research has already found makes the exposure wider than Q11 admits.
Verified in `src/_includes/modals/sauna.njk`, these are the live configurator values —
radio `value=` attributes that feed the quote arithmetic directly:

- Revive 9kW electric: `value="2000"`, displayed `+$2,000` (`:58–60`). Doc 30 records
  the manufacturer's current price as **$1,850 CAD** — before rocks, which it notes are
  sold separately and required, and before a contactor box.
- **Kuuma Banya wood-fired: `value="3000"`, displayed `+$3,000` (`:63–65`).** Doc 30
  records suspected landed cost **$3,800+** and states sales are **"FROZEN."** The
  configurator still sells it, and WP-0b is the package that turns that number into an
  emailed quote. **This is not in Q11 and is not in the plan at all.**
- Doc 30 also finds that `models.json`'s SC heater, "Homecraft 9kW Apex," **names a
  product that does not exist** in the current lineup — and the string is live on the
  site at `js/data.js:84` ("Harvia Pro20 or Homecraft 9kW Apex") and
  `modals/sauna.njk:30`.

**A path error repeated.** Rev. 2 deserves credit for fixing the `logo.svg` path
(`~/marvin/content/assets/`, not this repo). It then makes the same mistake with
`models.json`. Verified: **there is no `models.json` anywhere in this repository.**
`src/_data/` contains only `faq.json` and `site.json`. The file Q11 and doc 30 refer to
is `/home/leesalo/marvin/content/reference/operations/models.json` — a different repo.
Meanwhile §8's "Price source of truth" paragraph instructs moving prices *into*
`src/_data/models.json`, a file to be created. Two different referents, same bare
filename, no prefix on either. An implementer told to "reconcile against `models.json`"
will not find it.

**The live price source the plan never names.** `js/data.js` holds
`basePrice: 22500 / 29000 / 35500 / 44000 / 57000` — the same figures hardcoded in
`saunas.njk:214–274`. The configurator's totals are computed in `js/modal.js` from
`js/data.js` and the `value=` attributes above. The plan's price-consolidation paragraph
names `saunas.njk`, the nine meta descriptions, and `modals/sauna.njk`, but **not
`js/data.js`** — the file the quote arithmetic actually reads. `01 §3` flagged the
`js/data.js` drift and it remains unaddressed, as in rev. 1.

**Fix.** Widen Q11 to "reconcile *every* configurator add-on value against doc 30/31 and
supplier cost," name Kuuma explicitly, and block WP-0b until doc 30 §3 is no longer
"Pending." Qualify every `models.json` reference with its repository. Add `js/data.js`
to the price-consolidation list.

### Must-fix 7 — Split WP-1 and give it an instrument — **PARTIAL**

The split is real and well-drawn: WP-1a is type + fonts + CSP, WP-1b is colour, radius,
spacing, motion. "Near-nil visual regression" is deleted and named as unfalsifiable, and
the `npx tsc` line is gone. An 8px shift budget with a pre-enumerated list of pages
expected to change is a genuine, checkable criterion. Good.

**But the instrument does not exist.** The plan asserts "**Playwright is already in the
toolchain.**" Verified: `package.json` devDependencies are `@11ty/eleventy`, `esbuild`,
`lightningcss`, `netlify-cli`, `postgres`. There is no Playwright, no Puppeteer, and no
screenshot-diff library in `package.json` or `node_modules`. **`stylelint`, required by
WP-1b, is also absent.** My first review asserted the same thing about Playwright and
was wrong to; the plan inherited the error rather than checking it. Neither package is
pinned or typosquat-checked, though the plan correctly applies that discipline to
`fontaine` and `glyphhanger` — so the rule is understood, just not applied to the two
new dependencies the revision itself introduces.

This matters more than a missing dev dependency usually would, because the screenshot
gate is the *only* instrument standing between a 2,871-line stylesheet rewrite and a
live revenue site. If it slips, WP-1 ships on the same vibes rev. 1 was blocked for.

**Fix.** Add Playwright and stylelint to WP-1a's dependency list, pinned and
typosquat-checked, and make "the diff harness runs green on an unchanged branch" a
precondition of opening WP-1 — a non-tautological check that the instrument works
before it is trusted to certify anything.

### Must-fix 8 — Storage bug and missing states — **RESOLVED**

`localStorage` replaces `sessionStorage`, with the correct reasoning stated. Verified
against the live defect: `js/modal.js:381` writes `sessionStorage.setItem('ssc_quote_config', …)`,
`js/navigation.js:72` reads it, and `js/navigation.js:77` calls `removeItem` on read —
the read-once behaviour the audit described. All four missing states are named
(validation failure, double-submit guard, offline, closed mid-step-2).

The bench bug claim also checks out: `js/modal.js:354` filters with `if (value !== '0')`,
and `modals/sauna.njk:153` gives the U-bench `value="0"`, so it can never reach a quote.

One unlisted hazard in the same code path: two add-on inputs carry **non-numeric**
values — `value="interiorUpgrade"` (`:134`, `:139`) and `value="premiumFinishPrice"`
(`:168`). A rewrite of the total arithmetic that assumes numeric `value=` will silently
mis-total. Worth adding to WP-0b's list beside the bench bug.

### Must-fix 10 — Font format, directory, cache headers, tooling — **RESOLVED**

`format('woff2')` with `font-weight: 100 900` replaces the deprecated
`format('woff2-variations')`, with the failure mode stated (silent fallback to Arial).
`src/fonts/` is named, `max-age=31536000, immutable` is specified via `netlify.toml`, and
content-hashed filenames replace `?v=` stamps — with the correct observation that the
repo already has stale ones (confirmed: `src/_includes/scripts.njk` serves
`/js/data.js?v=20260226` and eight siblings under an immutable header).
`fontaine`/`glyphhanger` are to be pinned and typosquat-checked. This one is done
properly.

### Must-fix 11 — Weekly submission-count check — **PARTIAL**

§7 states the need clearly and the reasoning is right. But it specifies no mechanism, no
owner, no schedule, and no threshold — "surfaced to Lee in plain English" is an
intention, not an implementable item, and it appears in WP-0a's table as a bare TODO
with no source column. Given that this is the only instrument that catches a silent
revenue outage, and that the plan's other observability claim (analytics recording) is
still not live in production, it needs the same treatment the screenshot gate got.

**Fix.** Name where it runs (MARVIN cron / `/tasks` / Netlify scheduled function), what
it reads (Formspree submission count), the comparison window, and the threshold that
makes it speak. "Signal over noise" means it should say nothing in a normal week.

---

## Part 2 — Verdicts, universal core

### 1. Problem-fit — **PASS**

Unchanged and still the plan's strongest quality. The funnel dead-end remains the
headline problem, WP-0b fixes it, and the definition of done ("a real quote request
arrives in the inbox") is a true end-to-end proof stated in language Lee can check.
Rev. 2 adds something better: §3's "Why not the one-hour version" now argues the cheap
alternative on the merits — the button promises a submission and performs a navigation,
so half-fixing preserves the mental-model mismatch — and then *takes* the alternative's
main benefit by shipping the measurement fix first. That is the correct response to an
inversion test: absorb what the rejected option was right about rather than restate the
original choice. Credit.

### 2. Approach soundness — **FAIL** (was CONCERN)

The *architecture* of the fix is right and I want to be clear about that: replacing a
lane-based arbitration rule with a single resolved-value file is the correct move, the
precedence sentence is unambiguous ("Where this file and any of `10`–`14` disagree, **this
file wins**", `21:4`), and doc 21 does resolve **all eight** named collisions to concrete,
paste-able CSS values. Verified individually:

| Collision | Doc 21's resolution |
|---|---|
| `--gutter` | `clamp(1.5rem, 6vw, 7rem)` (`21:32`) — Jen wins, Saul's `5vw/6rem` named as loser |
| narrow tier | `--measure-narrow: 34rem` (`21:34`) — Saul wins over Jen's 38rem |
| `--section-pad*` | three tiers (`21:42–44`), Jen's values |
| grey ramp | `--ink` / `--ink-quiet` / `--ink-faint`, with `--color-charcoal` aliased (`21:23–25`, `:79`) |
| type floor | `--text-2xs: 0.6875rem`, absolute (`21:51`) |
| rule colour | `--rule: #2a2724` (`21:19`), replacing the live `#2a2a2a`/`#3a3a3a` pair |
| nav mark | 22/18/20/72px (`21:120`), honestly gated on Lee's sign-off |
| hero choreography | nothing on the photograph, one `.reveal` system (`21:121`) |

The contrast arithmetic is real arithmetic, which is rare and worth saying. I recomputed
the WCAG ratios independently: `#6b6762` on `#0c0c0c` = **3.4853** (doc says 3.49) and
`#7f7a74` = **4.6002** (doc says 4.60). The AA failure it self-reported is genuine and the
fix clears the threshold. The accent-alpha finding is also real — `styles.css:15` declares
`--color-warm-wood: #c4a57b` (rgb 196,165,123) while `:34`, `:35` and `:36` are built on
`rgba(184,156,104,…)` (`#b89c68`). Three of five, exactly as claimed.

**So why FAIL.** Doc 21 is not merely advisory — the plan makes it the sole source Ted
implements shared values from, and doc 21 presents its `:root` as **"Paste-ready"**
(`21:10–12`) with the explicit assurance that *"the legacy alias block at the bottom keeps
all 2,871 live lines resolving during migration."*

**That assurance is false, and pasting the block would break the site.** Verified by grep
against `styles.css`:

- **`--spacing-*` is used 108 times** (`sm` 28, `md` 27, `lg` 18, `xl` 13, `xs` 10, `2xl` 7,
  `3xl` 5). The string "spacing" **does not appear anywhere in doc 21.** No declaration, no
  alias, no deliberate-deletion note.
- Also dropped without alias, with live `var()` consumers: `--color-white` (16),
  `--color-white-alpha-*` (11), `--color-black` (9), `--font-heading` (6),
  `--color-warm-wood-hover` (4), `--font-primary` (3), `--color-black-alpha-*` (3),
  `--color-warm-wood-alpha-04/-05` (3), `--color-warm-wood-dark` (1), `--shadow-lg`/`-xl` (2).
- Jen's own spec depends on the missing set — `10:85` and `10:310` use `var(--spacing-2xl)`,
  `10:314` uses `var(--spacing-md)`.

Only `--transition-medium`/`--transition-slow` are declared as intentional deletions. The
rest are silent omissions behind a completeness claim. This is precisely the failure mode
the resolved-token file was created to prevent, relocated one level up: rev. 1 had two
documents disagreeing; rev. 2 has one document asserting a coverage it does not have.

Three further defects in the arbiter:

- **Silent semantic redefinitions with live blast radius, not flagged.** `--transition-fast`
  goes `0.3s ease` (`styles.css:62`) → `200ms ease-out` (`21:64`) across **20 live
  consumers**; `--radius-sm` 4px→2px (7 uses), `--radius-md` 6px→2px (4), `--radius-lg`
  20px→0 (2). Doc 21 calls radius "uncontested" (`21:53`) — true across documents, and
  misleading about the site.
- **Dangling references doc 21 leaves undefined.** `--color-bg-light` (Jen `10:51`, `:65`,
  `:203`) and `--color-text-secondary` (`10:23`, `:314`) exist in neither `styles.css` nor
  doc 21. `--hold-narrow` is retired (`21:102`) without the alias every other retired name
  receives, while Jen still references it at `10:60`, `:141`, `:316`. Saul's
  `--width-content`/`--width-wide` get no alias to `--hold`/`--hold-wide`.
- **Doc 21 asserts it re-derived its evidence and did not.** `21:6` says computed values
  "were extracted directly, not quoted from the specs." At least five of its citations are
  wrong against the files as committed — its R4 floor-violation citations to `10:23` and
  `10:246` do not match doc 10's current text (which at `10:23` reads `0.6875rem` and
  explicitly says it complies), R5's guard citation is off by two lines, and two George
  citations point at unrelated passages. It reproduced my first review's citations rather
  than re-checking them. I cannot verify whether those citations were true of doc 10 *before*
  its revision, because doc 10, doc 21 and the revised copy doc all landed in a single commit
  (`2888a08`) with no prior committed state — which is itself a reviewability problem worth
  fixing next time.

There is also a methodological inconsistency at the heart of the arbitration: doc 21 decides
R1, R2 and R7 on the principle "the mood board is what Lee approved, therefore it wins," but
decides R3 the opposite way (Jen's critique of the board beats the board). The design brief
at `00-design-brief.md:135` says "**Do not simply ratify the mood board. Find what it
misses.**" The arbiter never names that instruction, so its tie-breaker is unstated and
applied inconsistently.

**Fix.** Before WP-1 opens: diff doc 21's `:root` against the live `:root` and account for
**every** token in one of three buckets — carried, aliased, or deliberately deleted with its
live `var()` count. Add the missing aliases. Flag `--transition-fast` and the radius changes
as regression surfaces with their consumer counts. Correct or delete the five bad citations.
State the tie-breaker and reconcile it with the brief.

### 4. Right-sizing & reuse — **PASS** (was CONCERN)

WP-1 is split as asked, the split lands on a real seam (type/fonts vs colour/shape/motion),
and the mark phase that had no slot is now WP-2a. §4 continues to name out-of-scope items
explicitly and now adds the `styles.css` partials deferral with its containment mechanism.
The one-hour alternative is named and beaten on the merits rather than ignored (§3, "Why not
the one-hour version"), which is what the first review asked for. Nothing here is
gold-plated.

### 5. Security — **CONCERN** (was FAIL)

The substantive hole is closed: the unauthenticated read path no longer exists as a
function on the deployed site, and the fix chosen (delete the orphaned generation rather
than guard dead code) is the right one and is well reasoned in `7149b93`. The
supply-chain note on `ssc-ops.netlify.app` is now recorded in `netlify.toml` itself, with
the trust basis stated and a revisit trigger ("if that site gains contributors"). That is
better than what was asked for.

Three things keep this off PASS:

1. **Source disclosure is still live** (must-fix 1, above). Admin auth mechanism,
   `ANTHROPIC_API_KEY` env name, allowed-origins list, and the database schema are all
   served at 200 from the current production deploy.
2. **The plan asserts otherwise.** A false "DONE, verified by curl" in a security row is
   a durable hazard: it is the row nobody re-checks.
3. **`style-src 'unsafe-inline'` survives**, and the plan does not mention it. The
   reasoning for deferring it to WP-1b — inline styles still exist in templates — is
   sound, but it lives only in `598bd27`'s commit message. An implementer reading the
   plan will not find it, and WP-1b has no line item for removing it once the style
   layer is rewritten, which was the whole argument for deferring.

**Fix.** Re-verify on the deploy permalink and correct the WP-0a row. Add "remove
`style-src 'unsafe-inline'`" as an explicit WP-1b deliverable with a stated check.

### 6. Failure modes — **CONCERN** (was CONCERN)

Improved on every specific raised. The font-format failure is named with its
consequence (silent Arial fallback); the grep-clean gate for deleted class names is a
real, runnable check; the four missing modal states are enumerated.

Two gaps remain:

- **The grep-clean gate counts a number nobody has verified.** WP-1b states "148 usages
  exist across the six classes." That figure came from my first review and the plan
  adopted it verbatim. Re-counting across `src/`, `styles.css` and `js/`, the three
  classes I can confirm give `fade-in` 82, `slide-up` 37, `scale-in` 18 — and the other
  three names are not fixed anywhere in the plan or the specs. The gate is right; the
  count is folklore. Enumerate the six class names in WP-1b before the grep is trusted
  to be exhaustive.
- **No stated behaviour if the tracker origin is unreachable**, still. `scripts.njk`
  loads `https://ssc-ops.netlify.app/tracker.js` with `defer` and posts to that origin's
  `/track`. There is no failure path if it 404s or hangs.

### 7. Change safety — **CONCERN** (was FAIL)

The move from *nothing* to a verified, four-step, per-package workflow with a real
restorable deploy is the single largest improvement in the revision, and the plain-English
framing for Lee is exactly right. It clears FAIL.

It does not clear to PASS because of the restore-floor defect described under must-fix 5
(the named restore point re-opens the security hole), and because the mechanism the whole
section relies on — "deploy, then the site matches the repo" — was demonstrably not true
for the deploy that shipped this very fix. There is also still no stated conversion of
Beatrice §10's ~68 raw line numbers into selector names; that was raised in the first
review as a one-way destructive edit against coordinates that shift on first deletion, and
rev. 2's WP-1a lists "Beatrice corrects her malformed step→role table" but says nothing
about the line-number list.

**Fix.** Restore floor + post-deploy permalink verification + convert the line-number
deletion list to selectors before WP-1a opens.

### 8. Data integrity & compatibility — **FAIL** (was FAIL)

This is the dimension that has moved least, and it is now the clearest gating failure
after must-fix 1.

§8's "Price source of truth" paragraph is the right idea — consolidate into a data file
and render every surface from it, meta descriptions included. But:

- The consolidation target, `src/_data/models.json`, **does not exist**, and the same
  bare filename is used elsewhere in the plan to mean a file in a *different repository*
  (`~/marvin/content/reference/operations/models.json`). Two referents, no prefix.
- **`js/data.js` — the file the configurator's arithmetic actually reads** — is named
  nowhere in the plan, and `01 §3`'s drift finding remains unaddressed for the second
  revision running.
- The add-on reconciliation Q11 gates on is **unfinished research**: doc 30 §3 says
  "Pending."
- The reconciliation's scope is too narrow. Kuuma Banya is live in the configurator at
  `+$3,000` (`modals/sauna.njk:63–65`) against a suspected landed cost of $3,800+ with
  sales recorded as FROZEN in doc 30, and it is not in Q11.
- A product name that doesn't exist ("Homecraft 9kW Apex") is live at `js/data.js:84`
  and `modals/sauna.njk:30`, per doc 30's supplier check.

WP-0b is still the package that emails the site's first computed quote, and the numbers
feeding it are still not reconciled.

**Fix.** Block WP-0b on doc 30 §3 reaching a verdict, not merely on Q11 being asked.
Widen the reconciliation to every `value=` in `modals/sauna.njk`. Qualify both
`models.json` referents. Add `js/data.js` to the consolidation.

### 9. Verifiability — **CONCERN** (was FAIL)

Substantially fixed at the level of design. "Near-nil" is gone and named as the
unfalsifiable criterion it was; the `tsc` line is gone; the 8px budget with a
pre-enumerated change list is checkable; the grep-clean gate is runnable; WP-0b's
inbox test is a genuine end-to-end proof; Lighthouse before/after survives as the one
solid instrument that already existed.

Held at CONCERN by two things. First, the instrument does not exist yet and is asserted
to (must-fix 7) — and per the rubric's "testing the tests" clause, an unproven harness
certifying a whole-stylesheet migration is exactly the fixture that needs a
non-tautological check of its own. Second, and more seriously, **the one verification the
plan reports as already executed and passed did not pass.** The WP-0a row says "Curl every
deleted path → 404… **Done and verified.**" Five of those paths return 200. Whatever
produced that claim, it was not run against production after the deploy. A plan that
mis-reports a completed check is a plan whose other completed checks cannot be taken at
face value.

### 10. Maintainability — **PASS** (was CONCERN)

The `stylelint` rule banning raw `font-size`/`border-radius` literals outside `:root` is
adopted, and §4 now names the deferral of splitting `styles.css` into partials *and*
names the stylelint rule as the guard against recurrence — which is the honest version of
"we are not fixing the mechanism, here is what contains it instead." Beatrice's malformed
step→role table is scheduled for correction before implementation. Doc 21 gives the token
work a single durable home. This one is genuinely resolved; the only caveat is that
stylelint is not yet a dependency (must-fix 7).

### X5. Concurrency & re-entrancy — **CONCERN** [ADVISORY]

The storage incoherence is fixed and the four missing modal states are named, which was
most of the finding. What remains is the shared-file problem, now slightly worse: the
split into WP-0a/0b/1a/1b/2/2a produces **eight** packages writing the same
`styles.css` and `netlify.toml`, and the plan still names no merge order and no single
owner for either file. `netlify.toml` is edited in WP-0a (add `ssc-ops`), WP-1a (delete
the two Google font origins, add font cache headers) and, if the fix above is taken,
WP-1b (remove `style-src 'unsafe-inline'`). §5 says one WP equals one commit, which
helps, but ordering is still implicit.

### X6. Operability & observability — **CONCERN** [ADVISORY]

The weekly submission check is named (must-fix 11) but unspecified. More concretely:
**the site is still recording nothing.** The CSP served by the current production deploy
does not contain `https://ssc-ops.netlify.app` in either `script-src` or `connect-src`,
so `scripts.njk`'s tracker cannot load and cannot post. The fix is committed at `598bd27`
and is not in effect.

Note also that the plan's own status column is wrong in the other direction here: WP-0a
lists "CSP tracker unblock — `netlify.toml`" as **TODO**, but that edit is already
committed. So WP-0a contains one row marked DONE that is not done and one row marked TODO
that is done-in-repo-but-not-live. The package's status column cannot be trusted as a
statement of the world.

### X8. Dependencies, performance & cost — **CONCERN** [ADVISORY]

Font delivery is handled properly now (must-fix 10) — directory, cache headers,
content-hashed filenames, correct `@font-face` syntax, pinned and typosquat-checked
tooling. The supply-chain reasoning for the one new script origin is recorded in the file
that grants it, with a revisit trigger.

The remaining gap is the revision's own new dependencies: **Playwright and stylelint are
introduced by rev. 2 and neither is pinned, typosquat-checked, nor present** — and
Playwright is asserted to be already installed when it is not. The plan applies the
packages rule correctly to the dependencies it inherited and not at all to the two it
added.
