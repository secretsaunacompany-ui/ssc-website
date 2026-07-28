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

The revision is a large and honest improvement. Nine of eleven must-fixes are genuinely
addressed, several better than what was asked for.

**A note on how this review unfolded, because it matters.** Mid-review I found the plan's
must-fix 1 — marked **DONE, "verified by curl"** — returning **200** on five of the six
paths it claimed were 404, confirmed deploy-scoped via the deploy permalink, not a cache
artifact. That finding was accurate. The cause turned out not to be a careless
verification: the plan's curl check **genuinely passed when it was run**, and a git push
four minutes later triggered a rebuild that restored a cached publish directory and
resurrected the deleted files. Eleventy does not clean its output directory and Netlify
restores it between builds, so a file deleted from the repo kept being served. That root
cause was fixed during this review (`99b1aac`, `rm -rf dist &&` prefixed to the build
command), a new deploy published, and I have re-verified: **all paths now 404 and the CSP
carries the tracker origin.** Must-fix 1 is closed.

The durable lesson is not that anyone was sloppy. It is that on this stack, **a passing
verification was not durable** — and every gate in this plan is a point-in-time check.
That is now fixed at the root, which is the right fix.

**Verdict: still blocked**, on four things, none of them must-fix 1. Details in the
closing section.

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

| # | Must-fix | Disposition | Treated in |
|---|---|---|---|
| 1 | Close the cross-project leak | **RESOLVED** — endpoint dead; source disclosure regressed via a cached publish dir mid-review, root cause fixed in `99b1aac`, re-verified 404 | below |
| 2 | Rebuild §6 as a two-way gate table | **PARTIAL** — 11 of 12 rows correct, one wrong, hand-maintained, already stale | below |
| 3 | Source-verification gate + fix nine claims | **PARTIAL** — all nine genuinely gone; a new false `[src: brief]` citation introduced; tax gate relaxed | X3, X4 |
| 4 | Reconcile the Revive 9kW price | **NOT RESOLVED** — correctly escalated, research still "Pending", scope too narrow (Kuuma) | below, core 8 |
| 5 | Rollback story | **PARTIAL** — real and verified, but the named restore point re-opens the leak | below |
| 6 | Resolve token collisions into one file | **PARTIAL** — all 8 resolved with real values; the file drops 108+ live references behind a completeness claim | core 2 |
| 7 | Split WP-1, give it an instrument | **PARTIAL** — split is right, criterion is right, the instrument is not installed | below |
| 8 | Storage bug + missing states | **RESOLVED** | below |
| 9 | Spec `/commercial/`, `/care/`, case-study template, mark phase | **PARTIAL** — all four now real specs; `/warranty/` overlap half-resolved; permission gate fails open | core 3, X2 |
| 10 | Font format, directory, cache headers, pin tooling | **RESOLVED** | below |
| 11 | Weekly submission check | **PARTIAL** — named, unspecified | below |

Score: 2 resolved, 7 partial, 2 not resolved. Must-fixes 3, 6 and 9 are treated under the
rubric dimensions they belong to rather than repeated here.

### Must-fix 1 — Close the cross-project leak — **RESOLVED** (after a regression caught and fixed mid-review)

The plan states, in the WP-0a table:

> Verified by curl: all six paths return 404; site, booking-admin, tracking, Monitor
> all unaffected — **DONE**

**When I first checked, that was false against production**, and the finding held up under
three independent tests. The full timeline is worth recording, because the mechanism is the
most important thing this review found.

**a) At ~18:00 UTC the live domain served five of the six paths** (all now 404):

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

**b) It was not an edge-cache artifact.** The then-published deploy was
`6a68d599080fcb0008afbb41`, `commit_ref` `2888a08` — the latest commit at the time —
confirmed via the Netlify deploy API. Requesting the same paths on that deploy's permalink,
`https://6a68d599080fcb0008afbb41--hilarious-pudding-5f8dd8.netlify.app`, returns
**200** for `/supabase-schema.sql`, `/netlify/functions/advisor.js`, and
`/analytics-dashboard-netlify.html` — and still does. The permalink is deploy-scoped, so
the files were genuinely in that deploy.

**c) The CSP header on that same deploy was the old one.** It contains neither
`https://ssc-ops.netlify.app` in `script-src` nor in `connect-src`, although
`netlify.toml` at `598bd27` does. Verified on the permalink and on the apex domain
with a cache-busting query string.

Local `dist/` was clean — the artifacts were absent there — so the repo-side change was
correct all along. The defect was that **a passthrough removed from `.eleventy.js` did not
remove the file from the deployed site.**

**The cause, now established.** Eleventy does not clean its own output directory, and
Netlify restores a cached publish dir between builds. Each build wrote fresh output *over*
the stale copy and never removed anything. So the plan's verification was not careless — it
**genuinely passed when it was run**, and a git push roughly four minutes later triggered an
automatic rebuild that restored the cached `dist` and resurrected
`analytics-dashboard-netlify.html`, `analytics-dashboard-netlify.js`,
`analytics-tracker-netlify.js`, `netlify/functions/advisor.js` and `supabase-schema.sql`.
A correct check was silently invalidated by the next unrelated commit.

**Fixed during this review.** `99b1aac` changes the build command to
`rm -rf dist && npx @11ty/eleventy`, with the reasoning recorded inline in `netlify.toml`.
A new deploy (`6a68f16f80fdaf000837b588`) is published, and I re-verified against the live
domain: `/supabase-schema.sql`, `/netlify/functions/advisor.js`,
`/netlify/functions/booking-admin.js`, `/analytics-dashboard-netlify.html` and
`/.netlify/functions/analytics?action=pages` **all return 404**, and the CSP now contains
`ssc-ops.netlify.app`. The old deploy's permalink still serves 200 and still lacks the new
CSP, which confirms the original observation was a genuine deploy-scoped fact rather than an
edge-cache artifact.

**This is the right fix and it is the root cause, not a patch.** "Deleting a file from the
repo must actually take it off the internet" is now true of this site for the first time.

**What is genuinely closed.** The data exposure itself. The Netlify API lists exactly
three functions on the current deploy — `advisor`, `booking-admin`, `prompts`.
`analytics` and `track` are gone. `GET /.netlify/functions/analytics?action=pages`
returns 404, and `POST /.netlify/functions/track` returns 404. No caller can read the
shared store through this site any more. The July-12 deploy, by contrast, lists five
functions including `analytics` and `track`. So the endpoint is dead and **must-fix 1's
primary harm — cross-project rows returned to an anonymous caller — is stopped.**
Credit for that, and the diagnosis in `7149b93`'s commit message (orphaned older
generation, `site` column never filtered) is careful and reads as true.

**What was exposed during the regression window** (roughly 08:59–11:13 on 2026-07-28, and
for however long the passthroughs had been live before that). Function *source
disclosure* — which the source audit named as the reason the leak mattered in the first
place. All now 404, but readable at the time:

- `/netlify/functions/booking-admin.js` publishes the admin auth mechanism verbatim —
  `x-admin-token` header, `OPS_ADMIN_TOKEN` env var, the comparison, and the 401 shape.
- `/netlify/functions/advisor.js` publishes the Anthropic wiring, `ANTHROPIC_API_KEY`
  as the env var name, the model id, and the prompt-config indirection.
- `/netlify/functions/lib/http.js` publishes the allowed-origins list.
- `/supabase-schema.sql` publishes the database schema.
- `/netlify/functions/analytics.js` — the *token-gated* version from `20864bd` — was also
  served, which means the commit that added the auth check simultaneously published a
  working description of that check, annotated with a comment noting it is "Same
  header/secret as booking-admin.js."

No secrets were exposed — only env var *names*, auth *shape*, and schema. No rotation is
strictly required, though rotating `OPS_ADMIN_TOKEN` is cheap insurance given its
mechanism was published alongside a note pointing at the endpoint it protects. That is a
judgement call for Lee, not a blocker.

**Remaining fix — small, and it should still be taken.** Add to WP-0a's definition of
done that the curl check runs *after* deploy **against the deploy permalink**, not the
cached domain, with its output pasted into the relay pack. The build-command fix removes
the cause; the post-deploy check is what would have caught it in four minutes instead of
two hours, and it is the pattern every subsequent deletion-heavy package (WP-1b above all)
needs.

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

### 3. Completeness — **CONCERN** (was FAIL)

The four categories of silent gap from the first review are addressed, three of them well.

**(a) Sequencing/gate map — mostly fixed**, one row and one summary sentence still wrong,
and the table is hand-maintained and already stale. Detail under must-fix 2.

**(b) The mark phase now exists** as WP-2a, and Jen §9 backs it with a real specification
rather than a promise: five ordered deliverables, named filenames (`logo-wordmark.svg`,
`logo-badge.svg`, `logo-monogram.svg`, `favicon.svg`, `favicon-32.png`,
`apple-touch-icon.png`), sizes at every placement, technical gates (`fill="currentColor"`,
viewBox only), and an explicit "no stopgap for the favicon." The asset-debt premise is
verified on disk: `~/marvin/content/assets/logo.svg` is 46KB of Inkscape output containing
two base64 PNG blobs, with `logo-original.pdf` beside it. The plan's corrected path is
right. One gap: `src/assets/brand/` does not exist and `.eleventy.js` has no passthrough
for it, while §9 asserts the assets are "passthrough-copied."

**(c) `/commercial/`, `/care/` and the case-study template are now specifications, not
citations** — the failure named in the first review's assumption #4. This is real progress
and the largest single piece of work in the revision.

- **§7 is implementable.** Template path (`src/_includes/components/case-study.njk`), a
  decided mechanism (data file + include, with a stated migration trigger at ~6 builds),
  14 typed fields with required flags, an explicit credits-row order, seven BEM class
  names, and a worked JSON example. An implementer would still have to invent six things —
  alt text (no field, though `10:23` mandates it), the detail-pair caption text, the
  enclosing `<dl>` for the `dt`/`dd` credit rows, `--color-text-secondary` (declared
  nowhere), the three-images-into-two-slots case, and `models.json`.
- **§8 gives both new pages real compositions** — sections in order, content per section,
  template paths, footer placement — and the sitemap claim checks out (`src/sitemap.njk:7`
  iterates `collections.all`). Main-nav placement is never stated.

**(d) Known-open items — still the weak category.** `js/data.js` drift is unaddressed for
the second revision running. `/ops` is unmentioned. And two new gaps of the same kind:

- **The `/warranty/` overlap is only half-resolved.** `10:386` states the rule crisply:
  "`/care/` never restates a coverage table, term length, or exclusion — every warranty
  fact has exactly one home, and it is `/warranty/`." That settles three categories and
  leaves two. `10:151` (§3.9) gives `/warranty/` "maintenance"; `10:386` (§3.16) gives
  `/care/` "maintenance cadence, seasonal care, **and how to make a claim**." Both pages
  own maintenance and claims, §3.9 was not amended, and the collision is live in the repo:
  `src/_includes/pages/warranty.njk:92` is `<h2>Maintenance Requirements</h2>`, `:108` is
  `<h2>Making a Claim</h2>`, and `:99` carries a `data-advisor-type="care"` widget. **No
  content migration is named for any of the three.** The plan's WP-4 says Jen is
  "specifying… how `/care/` reconciles against the existing `/warranty/` page rather than
  duplicating it" — she has, partially, and the plan should not treat that as closed.
- **`/gallery/` is retired and §3.5 does not know.** Verified: `src/gallery.njk` is a
  meta-refresh stub with `permalink: /gallery/index.html`, `netlify.toml` carries
  `/gallery/` and `/gallery` 301s to `/saunas/`, `src/_includes/pages/gallery.njk` does not
  exist, and the actual content is a `.gallery-mosaic` inside `saunas.njk`. Jen §3.5
  specifies a full Gallery composition and §7.7 makes case studies depend on it. The same
  applies more mildly to `/process/`: `src/process.njk` already exists as a redirect stub
  and `netlify.toml` carries **two** 301s, while doc 10 says "remove the redirect"
  (singular) and never mentions `netlify.toml`. Netlify's non-forced rules are shadowed by
  built files, so the pages will work — but the stale config stays, and the plan calls
  `/process/` a new page when it is a resurrection.

Two more inherited defects worth listing because they are deletion instructions, and
deletions are the operations this deploy pipeline has already proven it does badly:

- **`slowZoom` is in the wrong file.** `10:222` lists it among things deleted from
  `js/animations.js`. Verified: `grep slowZoom js/` returns **0**; it lives at
  `styles.css:345` (`animation: slowZoom 20s ease-in-out infinite alternate`) with
  keyframes at `:349`. Following the deletion list literally leaves a 20-second infinite
  zoom on the hero — and falsifies `10:248`'s "this is the only infinite animation on the
  site."
- Several §4.2 line references point at neighbouring components (`.offering-card` /
  `.model-card` cited at 599/609, actually `:432`/`:478`; `.contact-form--styled` cited at
  2661, actually `:2042`). The findings are right, the coordinates are not — the same class
  of hazard as Beatrice's ~68 raw line numbers.

### 4. Right-sizing & reuse — **PASS** (was CONCERN)

WP-1 is split as asked, the split lands on a real seam (type/fonts vs colour/shape/motion),
and the mark phase that had no slot is now WP-2a. §4 continues to name out-of-scope items
explicitly and now adds the `styles.css` partials deferral with its containment mechanism.
The one-hour alternative is named and beaten on the merits rather than ignored (§3, "Why not
the one-hour version"), which is what the first review asked for. Nothing here is
gold-plated.

### 5. Security — **PASS** (was FAIL)

The substantive hole is closed: the unauthenticated read path no longer exists as a
function on the deployed site, and the fix chosen (delete the orphaned generation rather
than guard dead code) is the right one and is well reasoned in `7149b93`. The
supply-chain note on `ssc-ops.netlify.app` is now recorded in `netlify.toml` itself, with
the trust basis stated and a revisit trigger ("if that site gains contributors"). That is
better than what was asked for.

The source-disclosure regression that held this at CONCERN through most of the review is
resolved at the root (`99b1aac`) and re-verified 404. What remains is one item:

**`style-src 'unsafe-inline'` survives, and the plan does not mention it.** The reasoning
for deferring it to WP-1b — inline styles still exist in templates — is sound, but it
lives only in `598bd27`'s commit message. An implementer reading the plan will not find
it, and WP-1b has no line item for removing it once the style layer is rewritten, which
was the entire argument for deferring. A deferral with no scheduled removal is just an
acceptance.

**Fix.** Add "remove `style-src 'unsafe-inline'`" as an explicit WP-1b deliverable with a
stated check. Consider rotating `OPS_ADMIN_TOKEN` given its mechanism was briefly public.

### 6. Failure modes — **CONCERN** (was CONCERN)

Improved on every specific raised. The font-format failure is named with its
consequence (silent Arial fallback); the grep-clean gate for deleted class names is a
real, runnable check; the four missing modal states are enumerated.

Two gaps remain:

- **The grep-clean gate counts a number that is wrong.** WP-1b states "148 usages exist
  across the six classes." That figure came from my first review and the plan adopted it
  verbatim without checking. The six classes are named only in the spec, at
  `10-jen-art-direction.md:231` — `.fade-in`, `.slide-up`, `.slide-right`, `.slide-left`,
  `.scale-in`, `.gallery-item--reveal`. Actual counts across `src/` and `js/`: 80, 35, 5,
  5, 16, 17 = **158**; including `styles.css`, **169**. My 148 was wrong and the plan
  inherited it. The gate itself is sound and runnable — but a migration whose acceptance
  criterion is "no deleted class name survives" should carry the class list and a
  re-derived count in WP-1b, not a number copied from a review.
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

Held at CONCERN by two things. First, the instrument does not exist yet and is asserted to
(must-fix 7) — and per the rubric's "testing the tests" clause, an unproven harness
certifying a whole-stylesheet migration is exactly the fixture that needs a
non-tautological check of its own. Install it and prove it green on an unchanged branch
before it certifies anything.

Second, and this is the more instructive one: **the plan's one already-executed
verification passed and then stopped being true.** The WP-0a curl check was correct when
run; an unrelated commit four minutes later silently invalidated it, and it stayed invalid
for over two hours with the row still reading "Done and verified." The build-command fix
(`99b1aac`) removes that specific mechanism. The general lesson survives it and should be
written into the plan: **on a live site, a check is evidence about a moment, not a
property.** Every gate in §6 that certifies an absence — deleted paths, deleted classes,
no invented facts — needs to run *after* the deploy that is supposed to make it true, and
its output recorded. That is a cheap change to §6 and it is the single highest-value
process fix available here.

### 10. Maintainability — **PASS** (was CONCERN)

The `stylelint` rule banning raw `font-size`/`border-radius` literals outside `:root` is
adopted, and §4 now names the deferral of splitting `styles.css` into partials *and*
names the stylelint rule as the guard against recurrence — which is the honest version of
"we are not fixing the mechanism, here is what contains it instead." Beatrice's malformed
step→role table is scheduled for correction before implementation. Doc 21 gives the token
work a single durable home. This one is genuinely resolved; the only caveat is that
stylelint is not yet a dependency (must-fix 7).

## Part 3 — Verdicts, conditional dimensions

### X2. Privacy & data stewardship — **CONCERN** [GATING] (was FAIL)

The substantive leak is closed at the source, the reasoning is sound, and the
source-disclosure regression that followed it has been root-caused and fixed and
re-verified (must-fix 1). That clears the FAIL decisively. Two things keep it from PASS:

- **The two smaller X2 items from the first review are untouched.** The plan contains no
  mention of Formspree as a US-resident processor handling Canadian personal information
  (PIPEDA), and **no work package covers the privacy page at all** — grep for "privacy"
  in the plan returns nothing. To George's credit, `13-george-copy.md:390` withdraws his
  earlier instruction assigning the Square→Helcim clause to Ted and now asks for Pierre
  or Petra review, citing this review's X2. But that gate exists only inside a
  specification document; the plan's §6 verification table gives WP-3 "source-verification
  gate + brand-critic pass" and no legal review. A gate named in a spec and absent from
  the pipeline is not a gate.
- **New personal-data surface, and its gate fails open.** WP-6 depends on a permission
  gate in `builds.json`, which `20-fact-gathering-questions.md:27–28` describes as the
  reason "an un-permissioned build cannot render regardless." Two problems, both verified:

  **The gate is a denylist, not an allowlist.** Doc 10 specifies it as
  *"`"pending"` → the unit does not render at all"* (`10:306`) and *"unit skipped in the
  template loop"* (`10:333`). It never says *render only if permission is one of the
  approved values*. A build whose `permission` is absent, null, empty, or misspelled
  **renders**. The field is marked required, which helps, but "required" is a convention in
  a hand-edited JSON file, not an enforcement. The one-line fix is to state the condition
  positively.

  **The enum is missing a value its own source requires.** Q45 (`20-…:151–153`) names
  **photos-only** as a valid client answer. The enum is `named | anonymous | name_only |
  pending`. There is no `photos_only`, and `10:331` then conditions on whether "the
  anonymous-but-shown permission covers them" — a distinction one string field cannot
  express.

  The data at stake is client names, their homes, and their neighbourhoods, published
  because a JSON field was set correctly. `builds.json` does not yet exist, so this is
  cheap to fix now and expensive later.

To its credit, the instrumentation spec (`14 §8`) is clean on this axis: all sixteen event
payloads carry `{model, total, addon, ms_before_scroll, paused, source, error}` — no email,
no name, no free text. Worth recording explicitly, because "add analytics events" is
normally where PII leaks in.

### X3. Evidence & source integrity — **CONCERN** [GATING] (was FAIL)

The single largest genuine improvement in the revision, and it does not fully land.

**What worked.** All nine flagged claims are gone from live copy, verified individually
against the repo. "Twenty-five years on" is back to the durability target it came from
(`saunas.njk:126`). All four GST/PST lines are withdrawn — `grep -c "GST\|PST"` on the
brief still returns **0**, and no tax percentage survives in doc 13. The "$30 session"
becomes "a five-figure funnel" sourced to the real "From $22,500". "Run daily" is gone.
"Running today at breweries" narrows to "a Vancouver brewery and a seaside hotel," which
verifies at `locations.njk:47` and `:69`, with Gatherwell correctly excluded because
`locations.njk:60` records it as a custom build, not an SC. "No charge for any of it"
narrows to "Site visits are included." "Fixed quote / build slot / buys your materials"
collapses to the one thing `faq.json:40` supports, which also dissolves the contradiction
with the retained disclaimer. The Kuopio relabel is withdrawn rather than dressed up. The
§0a audit trail is real: **17 dispositions**, each naming the claim, the verb, and the
reason. This is the discipline that was asked for and it was applied honestly to the
sentences under review.

**Why it is still gating.** The same defect reappeared in a sentence the revision itself
wrote. Verified independently:

> `13:150` — **"A small sauna company in Squamish, British Columbia." `[src: brief]`**

`grep -ci "small" 00-design-brief.md` returns **0**. This is a false brief citation on an
H1 sub — structurally identical to the GST/PST failure that triggered the review, in the
most prominent line of §2. It is compounded three lines down: the doc withdraws the
headcount claim to `[NEEDS LEE]` at `13:159`, and in the very same paragraph asserts "We've
kept the company small on purpose," sourced to a per-Lee quote about playing every role
that says nothing about size. "Small company" recurs at `13:199` and `13:376`.

Also new and unsourced:

- **Session duration "an hour," three places** (`13:79`, `:83`, `:375`). Verified:
  `grep -rniE "one hour|an hour|60 min"` across `src/` returns **0**. The `$30` was cut
  from that sentence; the duration was not.
- `13:127` carries a source note that is verifiably false — "each card names the model in
  service" when `locations.njk:38` names no model.
- `13:348` "Consider them our references" escalates four named third-party businesses from
  locations to endorsers. That is a consent question, not a copy question, and it is
  unsourced.
- `13:432` blocks the configurator on reconciling against **`models.json`**, which does
  not exist in this repo (see core dim 8).
- The stale-workshop sweep claims to cover all instances and misses five, including
  `home.njk:105`, `whistler.njk:50`, and `blog.njk:14`.
- About twelve of ~55 point citations are off by one to four lines. Nearly all are
  cosmetic, but one is not: doc 13 twice cites `saunas.njk:269` for the SC dimension card
  when the card is at `:273` and `:269` is the capacity line. Ted following that pointer
  edits the wrong element on the exact fix the section exists to specify.

**The tax gate has been quietly relaxed, and this is the most consequential item.**
Doc 13 is unambiguous — `13:199` and `13:244`: *"Do not publish any GST/PST statement until
**Jon** confirms the tax treatment of a custom sauna build (goods vs improvement to real
property)."* The plan's Q12 says the same: "Get it from Jon before any tax line publishes."
But `20-fact-gathering-questions.md`'s new "Answers received" block records:

> "**PST applies to custom sauna builds.** *(per Lee, 2026-07-28.)* … George's copy may now
> carry a tax line; the `[NEEDS LEE]` placeholders on tax come out."

That substitutes the owner's verbal answer for the professional determination two documents
require, and authorises the placeholders to be removed. Lee is the business owner and has
been invoicing this way, so his answer is evidence — but it is not the thing the gate asked
for, and goods-versus-improvement-to-real-property is exactly the question where an owner's
working assumption and the CRA's view diverge. A published tax rate on a $22,500–$57,000
purchase is a money claim under X4 as well.

**Fix.** Cut or re-source `[src: brief]` on "small" and the three "hour" claims; correct
`13:127` and the `saunas.njk:269` pointer; complete the workshop sweep; get consent before
"references." Then extend the source-verification gate to cover **the replacement copy, not
only the withdrawn claims** — the gate as written checks the corrections, which is the
narrower version of the same mistake rev. 1 made. And either get Jon's answer or publish
"Prices are quoted before tax" and nothing more specific, which is doc 13's own fallback at
`13:244`.

### X4. Audience, brand & money accuracy — **CONCERN** [GATING] (was FAIL)

Three of the four accuracy defects are properly fixed and one is fixed with a flaw.

- **Homecraft restored.** `13:99` now reads "Harvia, Homecraft, Kuuma, and HUUM heaters,"
  character-exact against `warranty.njk:59`, with the reasoning recorded (it is the standard
  electric heater, and dropping it made the spec read more premium than what customers
  receive).
- **Warranty name — count and fix list correct.** Verified current state: one instance of
  "2-5 Year Limited Warranty" (`src/_includes/pages/warranty.njk:13`) and three of "2-5
  Limited Warranty" (`src/warranty.njk:4`, `faq.json:30`, `faq.json:31`). Doc 13 enumerates
  all four and flags `:31` as the schema answer feeding rich results. One disambiguation
  needed: it cites "warranty.njk:13" and "warranty.njk:4" as one file; they are two
  different files.
- **Reply-time promise held.** Zero pre-submission assertions survive; the post-submission
  line on `thank-you.njk:5` is correctly left alone. Note that doc 20 now supplies the
  number ("within three business days, usually the next day"), phrased to hold on a bad
  week — good judgement, and it unblocks Q4.
- **SC dimensions — right answer, wrong pointer.** The repo genuinely contradicts itself:
  `saunas.njk:84` (schema) says `7' x 12'+`, `saunas.njk:273` (visible card) says
  `12' × 7'+`. Doc 13 picks `7' × 12'+`, which is correct on 3-to-1 evidence it did not
  find — `netlify/functions/data/products.json:56` and `js/data.js:82` both agree with the
  schema. But it sends Ted to `:269`.

**What keeps this gating** is money, not copy. The reply-time and heater problems are
solved; the price problems are not, and they are the ones that reach a customer as a number
in a contract-adjacent email:

- The Kuuma Banya add-on is live at **+$3,000** against a suspected landed cost of $3,800+
  with sales recorded FROZEN in doc 30, and it is in no blocking question.
- The Revive 9kW verdict is still "Pending."
- A heater name that the supplier no longer sells ("Homecraft 9kW Apex") is live at
  `js/data.js:84` and `modals/sauna.njk:30`.
- The published tax rate rests on a verbal answer where the plan requires an accountant's.

WP-0b is the package that turns these into the first computed quote the site has ever sent.

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

**Measurement is now live**, which is the single most valuable operational change in this
whole effort. The current production CSP contains `https://ssc-ops.netlify.app` in both
`script-src` and `connect-src`, and `https://ssc-ops.netlify.app/tracker.js` returns 200,
so `scripts.njk`'s tracker can finally load and post. After a history of recording nothing,
this site can now answer the question the plan is built around. Credit where it is due.

Two things keep this at CONCERN. The weekly submission check remains named but unspecified
(must-fix list #10) — and it is the only instrument that catches a silent outage on the
Formspree channel, which analytics does not cover. And the plan's WP-0a status column
still lists "CSP tracker unblock" as **TODO** when it is committed, deployed and verified.
Combined with the DONE row that was, for two hours, not done, the lesson is the same one
as under Verifiability: **the status column is a claim, not a state**, and on this project
it has now been wrong in both directions on the same day. Whoever runs the relay should
re-derive WP-0a's status before opening WP-0b rather than reading it.

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

---

## Stress test 1 — Pre-mortem

**Three months out. What broke.**

**1. The deploy that didn't delete — this one already happened, and was caught.** It is
kept at the top because it is the type-specific worst case and because the near-miss is the
best evidence in this document. WP-1b lands: six reveal classes deleted,
`HeroIntroAnimation` removed, parallax gone, frosted-glass cards retired. Locally clean,
branch preview right, merged. On production the removed assets keep being served — exactly
as `/supabase-schema.sql` and `/netlify/functions/advisor.js` were, for two hours, from a
deploy whose commit deleted them. A stale stylesheet co-exists with the new one, the cascade
resolves unpredictably per page, and the screenshot diff — run against `main` and the branch
build, never against production — shows nothing. A customer finds it. *What we should have
seen:* the plan's WP-0a row said "verified 404" and five paths answered 200. **This is now
fixed at the root** (`99b1aac`), so the scenario is closed — but only because someone
re-ran a check that had already passed. Nothing in §6 requires that.

**2. The site breaks on the first paste.** Ted opens doc 21, which says "Paste-ready" and
"keeps all 2,871 live lines resolving," and replaces `:root`. **108 `var(--spacing-*)`
references go undefined**, along with `--color-white` (16 uses), `--color-black` (9),
`--font-heading` (6) and the rest. Padding and margins collapse across every page. The
instrument that would have caught it in a screenshot diff is not installed, and the plan
says it already is. *What we should have seen:* one grep of `styles.css` against doc 21's
token list — the same check doc 21 claims at `21:6` to have performed.

**3. The first working quote is wrong, and it is the Kuuma.** WP-0b ships,
`quote_submit_success` comes off zero for the first time in the site's history, and a
customer configures a Kuuma Banya at **+$3,000** — a unit whose landed cost is recorded in
doc 30 as $3,800+ and whose sales are recorded as **FROZEN**. Q11 gated on the Revive and
nobody widened it. Lee eats the difference or walks a number back with a customer who has it
in writing. *What we should have seen:* doc 30 was open in the same directory, still marked
"IN PROGRESS," with its blocking verdict section reading "Pending."

**4. A false claim ships under a gate that certified it.** "**A small sauna company in
Squamish, British Columbia.** `[src: brief]`" goes live on the About page. The brief
contains the word "small" zero times. It ships *because* it carries a source tag, in a
document whose §0a audit trail is otherwise scrupulous — and it is the H1 sub, the most
-read line on the page. Alongside it, a published GST+PST figure resting on the owner's
verbal answer, on a question two documents said required Jon. If PST does not apply to an
improvement to real property, the site has been quoting customers a tax they do not owe.

**Runner-up:** a case study renders a named client, their neighbourhood and their home
because `permission` was typed `"Named"` instead of `"named"`, or omitted. The gate skips
only `"pending"`.

---

## Stress test 2 — Load-bearing assumptions

**1. "Deploying the repo makes production match the repo." — Was FALSE. Now repaired,
and worth keeping on the list.** For roughly two hours the published deploy sat at the
newest commit while serving eight paths that commit had deleted, under a CSP that commit
had changed. Every other verification in this plan — the curl check, the branch-preview
review, the screenshot diff, the rollback — rests on this assumption. `99b1aac` makes it
true. *Residual risk:* it is now true because of one line in `netlify.toml` that nobody
will think about again. If the build command is ever edited, every absence-check in §6
silently becomes decorative. Worth a comment in the plan, not only in the toml (where, to
be fair, the reasoning is already recorded well).

**2. "Doc 21 is a complete, paste-ready token set." — Confidence: LOW. Falsified.**
108 spacing references plus ~11 further token families are absent, behind an explicit
completeness claim. *If wrong:* the file the plan names as sole authority is the file that
breaks the site. **Resolve before WP-1 opens.**

**3. "The instrument exists." — Confidence: LOW. Falsified.** Playwright and stylelint are
in neither `package.json` nor `node_modules`. *If wrong:* WP-1 ships on judgement, which is
what rev. 1 was blocked for.

**4. "The source-verification gate makes the copy safe." — Confidence: MEDIUM.** It
demonstrably worked on the nine claims it was pointed at — all nine are gone, verified
individually. It did not cover the sentences the revision itself wrote, and a new false
`[src: brief]` citation landed in the most prominent line of §2. *If wrong:* the gate
becomes a source of false confidence rather than a check, which is more dangerous than no
gate.

**5. "Q4 / Q8 / Q11 / Q12 are the blockers." — Confidence: MEDIUM.** Two are already
answered in a document the plan does not reflect, one is answered by the wrong authority,
one is unanswerable until an unfinished research doc completes, and a fifth blocker (Kuuma)
was never identified. *If wrong:* a relay batch starting on "unblocked" hits a missing or
wrong number mid-flight — the failure mode that produced the X3/X4 problems in the first
place.

---

## Stress test 3 — Inversion

**What would have to be true for the rejected alternative to win?**

Rev. 1's inversion targeted the one-hour configurator fix, and rev. 2 answered it properly —
argued on the merits, and then took the alternative's main benefit by shipping measurement
first. That one is closed. So the live inversion is different.

**The alternative now is: do not enter the relay. Spend a day on the plumbing first — fix
the deploy so deletions propagate, complete doc 21 against the live `:root`, install and
prove the screenshot harness on an unchanged branch — and only then open WP-1.**

It wins if: (a) the verification apparatus is unreliable in a way that makes every
downstream gate cosmetic, (b) the sole-authority document is incomplete in a way that would
break the site, and (c) the failures are cheap to fix now and expensive after code is
moving.

**All three were true this morning, and the argument has just been vindicated in the most
direct way available: (a) was independently discovered and fixed mid-review** — the deploy
pipeline turned out to be silently discarding deletions, exactly the "cosmetic gate" failure
this inversion predicts. That was one line of `netlify.toml`. **(b) remains true**: 108
undeclared spacing references behind a completeness claim. **(c) remains true**: the rest is
a grep, an `npm install`, and a redeploy.

One of the three conditions has now been demonstrated rather than argued. That is strong
evidence the inversion is correct and that the remaining plumbing should be finished before
any code-moving package opens.

A weaker inversion also deserves a line: §4 defers splitting `styles.css` into partials,
with `stylelint` as the containment. Doc 21's dropped tokens are evidence that whole-file
operations on this stylesheet are error-prone in exactly the way partials would contain. The
deferral is still probably right — but it is now resting on an instrument that is not
installed.

---

## Overall verdict

**Still blocked — but the distance to unblocked is short, and the direction of travel is
right.** This is a substantially better plan than rev. 1. Nine of the eleven must-fixes are
genuinely addressed in the document: the rollback story is real and verified against the
Netlify API rather than asserted, WP-1 is split on a sensible seam with a falsifiable
acceptance criterion replacing "near-nil," the mark phase has a slot and a specification,
the storage bug and the four missing modal states are fixed, font delivery is handled
properly, `/commercial/`, `/care/` and the case-study template have become implementable
specifications rather than citations, and the nine unsourced copy claims are — every one of
them — gone, behind a 17-row audit trail that is honest about what it withdrew and why. The
arbitration architecture is correct. The one-hour alternative is argued rather than ignored.
Several of these are better than what was asked for.

It is blocked on four things, each independently sufficient, and the pattern connecting
them is worth naming: **they are all claims the plan makes about the world that are not
true.** An installed dependency that is absent. A complete token file that drops 108 live
references. Reconciled prices whose reconciliation is still marked "Pending." A sourced
sentence whose source does not contain it. Rev. 1 failed by omission, which reading fixes.
Rev. 2's remaining failures are attestation failures, which reading does not fix — only
checking does.

The single most important finding here was of exactly that kind, and it has already been
resolved: **deploying the repo did not make production match the repo**, silently, while
every gate in §6 assumed it did. It was found by re-running a check that had already
passed, and fixed at the root within the review. That is the model for the remaining four:
each is cheap, each is checkable in minutes, and none of them is an argument about
judgement.

Fix the four, re-verify against production rather than locally, and the spine is a good
structure carrying good specifications, ready to run.

**Gate decision: NOT cleared to enter the relay pipeline.** Two gating core dimensions
carry FAIL — **2 Approach soundness** (doc 21 incomplete behind a completeness claim) and
**8 Data integrity** (unreconciled configurator prices, phantom `models.json`, unaddressed
`js/data.js`) — and a FAIL on any gating dimension blocks. The three gating conditionals
(X2, X3, X4) are CONCERN, not FAIL: each has a specific, cheap, named fix.

**Blocked on exactly these four:**

1. `21-resolved-tokens.md` drops 108+ live `var()` references while claiming completeness
   *(must-fix list #1)*.
2. Configurator prices are unreconciled, the blocking research is still marked "Pending,"
   and Kuuma Banya is not even in scope *(must-fix list #2)*.
3. A new false `[src: brief]` citation shipped through the source gate, and the tax gate
   was relaxed from Jon to a verbal answer *(must-fix list #3)*.
4. The case-study permission gate fails open on personal data *(must-fix list #4)*.

**Partial clearance is available and worth taking.** **WP-0a is cleared** — its security
work is done, verified, and root-caused. **WP-1a/1b** unblock on blocker 1 plus installing
the instruments (#5). **WP-0b** unblocks on blocker 2. **WP-3** unblocks on blocker 3.
**WP-2/2a** are clear once doc 21 is complete and Q10 is signed off. **WP-6** unblocks on
blocker 4 and is separately parked by Lee pending client agreement.

None of the four is a design disagreement. All four are factual gaps with named fixes, and
the largest of them is a grep.

---

## Prioritized must-fix list

*(The original #1 — "make production match the repo" — was fixed during this review by
`99b1aac` and re-verified. It survives only as item 6 below, the process half of it.)*

1. **Complete doc 21 before WP-1 opens.** Diff its `:root` against the live `:root` and put
   every token in one of three buckets — carried, aliased, or deliberately deleted with its
   live `var()` count. `--spacing-*` alone is 108 uses. Add the missing aliases
   (`--hold-narrow`, `--width-content`, `--width-wide`), declare `--color-bg-light` and
   `--color-text-secondary` or remove their references, and flag `--transition-fast` (20
   consumers) and the radius changes as regression surfaces. Then fix or delete doc 21's
   five bad citations and state its tie-breaker.
   *(Approach soundness, Data integrity — gating)*
2. **Finish the price reconciliation before WP-0b, and widen it.** Block on doc 30 §3
   reaching a verdict, not on Q11 being asked. Add **Kuuma Banya** (`modals/sauna.njk:63–65`,
   +$3,000 against $3,800+ cost, sales frozen) as a blocker. Reconcile every `value=` in the
   configurator. Fix the "Homecraft 9kW Apex" name at `js/data.js:84` and
   `modals/sauna.njk:30`. Qualify both `models.json` referents with their repository, and
   add `js/data.js` to the price-consolidation list.
   *(Data integrity, X4 — gating)*
3. **Extend the source gate to the replacement copy, and restore the tax gate.** Cut or
   re-source `[src: brief]` on "A small sauna company" (`13:150`), the three "an hour"
   session claims, the false source note at `13:127`, and "Consider them our references"
   (`13:348`). Correct the `saunas.njk:269` → `:273` pointer. Finish the workshop sweep
   (five survivors). Add a fail-closed rule that no page ships containing a `[NEEDS LEE]`
   bracket — three sit inside shipping copy. Either get Jon's determination or publish doc
   13's own fallback, "Prices are quoted before tax," and nothing more specific.
   *(X3, X4 — gating)*
4. **Make the case-study permission gate fail closed.** State it as an allowlist — render
   only if `permission` is one of the approved values — and add `photos_only`, which Q45
   requires and the enum omits.
   *(X2 — gating)*
5. **Install and prove the instruments.** Add Playwright and stylelint, pinned and
   typosquat-checked, and make "the screenshot harness runs green on an unchanged branch" a
   precondition of opening WP-1.
   *(Verifiability, X8 — gating for WP-1 only)*
6. **Make absence-checks post-deploy, and name a rollback floor.** Every §6 gate that
   certifies an absence — deleted paths, deleted classes — runs *after* the deploy it
   depends on, **against the deploy permalink**, with output pasted into the relay pack.
   This is what caught the resurrection and it is what stops the next one. Separately: no
   restore to a deploy published before the security fix — `6a531f5506b87600082b2a1a`
   carries five functions including `analytics` and `track`, so the plan's named restore
   point re-opens the leak. Add a post-restore curl check, and note in the plan that the
   `rm -rf dist` in the build command is load-bearing.
   *(Change safety, Verifiability)*
7. **Fix §8's remaining row and stop hand-maintaining it.** Q7 gates WP-2; §2's "WP-2
   unblocks the moment doc 21 lands" is false. Reflect doc 20's answered questions (Q4, Q12),
   the WP-6 park, and the unpackaged intake-field work. Add docs 30 and 31 to the §0
   authority table.
   *(Completeness)*
8. **Close the `/warranty/` ↔ `/care/` overlap and the retired-page gaps.** Maintenance and
   claims currently have two homes; name the migration for `warranty.njk:92`, `:108` and the
   `:99` care widget. Resolve `/gallery/` (retired, but §3.5 specifies it and §7.7 depends on
   it) and note that `/process/` is a resurrection with two stale `netlify.toml` 301s.
   *(Completeness)*
9. **Correct the deletion coordinates.** `slowZoom` is at `styles.css:345`, not in
    `js/animations.js`. Convert Beatrice §10's ~68 raw line numbers and doc 10 §4.2's
    references to selector names before WP-1 opens. Enumerate the six reveal classes in
    WP-1b with a re-derived count — the real figure is 158 across `src/` and `js/`, not 148.
    *(Failure modes, Change safety)*
10. **Specify the weekly submission check** — where it runs, what it reads, the window, and
    the threshold that makes it speak. And give the privacy page a work package with the
    Pierre/Petra review gate that `13:390` asks for.
    *(X6, X2 — advisory)*

---

## Note on review conditions

Two things a future reviewer should know. First, `10-jen-art-direction.md`,
`13-george-copy.md` and `21-resolved-tokens.md` were all **added** in a single commit
(`2888a08`) with no prior committed state, so revisions cannot be diffed against what they
revised — which is why doc 21's citations to pre-revision line numbers cannot be
adjudicated. Committing the specs before revising them would make the next pass cheaper and
more reliable. Second, the corpus changed **during** this review: `20-fact-gathering-questions.md`
was modified and `30-pricing-heaters-equipment.md` and `31-pricing-materials.md` were created
while it was in progress, and both pricing documents are still marked "IN PROGRESS." Findings
here are against the tree as of 2026-07-28, and the two pricing documents are the ones most
likely to have moved. During the review the repo also gained `99b1aac` (the build-dir fix),
`cc8270f`, and `34-design-fee-conventions.md`, and a new production deploy
(`6a68f16f80fdaf000837b588`) was published. Verdicts on must-fix 1 and core dimension 5
reflect the post-fix state; everything else was re-checked against the tree at the end.

Third, and the reason the first two matter: **this review changed the thing it was
reviewing.** Re-running a check the plan had already marked passed is what surfaced the
deploy defect, and the fix landed before the review did. That is the argument for
re-verifying rather than reading, and it is the argument against ever treating a prior
"verified" as evidence. It also means a third pass should re-run every empirical claim in
this document rather than inheriting it — including the ones that favour the plan.
