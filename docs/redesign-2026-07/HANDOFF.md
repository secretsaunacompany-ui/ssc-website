# Redesign 2026-07 — Handoff

**Written:** 2026-07-28, end of session
**For:** whoever picks this up next, with no memory of the session that produced it
**Repo:** `/home/leesalo/Projects/ssc-website`, `main` at `4bd9c47`

---

## Where to start

Read these three, in order. They are enough to begin.

1. **`.claude/plans/redesign-wave-a.md`** — the relay-ready plan. This is the work.
2. **`.claude/plans/website-redesign-2026-07-critic-rev3.md`** — the clearance
   conditions and what is still blocked. Read at least §"Cleared to start now".
3. **`ROADMAP.md`** — the authority table for all eighteen specification documents.

Everything else in `docs/redesign-2026-07/` is reference. Do not re-derive it.

---

## The one-paragraph version

The site is competently built and its funnel is broken. The configurator's
"Request Quote" button has **never once delivered a submission** in the site's
entire history — it closes the modal and abandons the user on a generic contact
page with their configuration buried below the fold. Three specialist audits and
five Creative Department specifications produced a six-package redesign. Three
critic passes rejected the plan twice and granted partial clearance on the third.
Wave A is the scope that survived, plus the configurator, which Lee pulled back
into scope because accurate quotes are the point.

---

## What is already done and deployed

Do not redo any of this. All verified in production.

| | |
|---|---|
| **Cross-project data leak closed** | An orphaned legacy analytics stack in this repo — its own tracker, reader and dashboard, referenced by nothing — served page URLs and titles for **every** property posting to the shared Supabase store, unauthenticated. That included `fern-app.netlify.app`, a family application. Deleted entirely rather than guarded. |
| **Function source + DB schema unpublished** | `.eleventy.js` was passthrough-copying `netlify/` and `supabase-schema.sql` into the publish dir, serving them as static files. |
| **Build cleanliness** | Eleventy does not clean its output dir and Netlify caches it, so deleted files came back on the next auto-build. `netlify.toml` now runs `rm -rf dist &&` first. **This is load-bearing — do not remove it.** |
| **CSP fixed** | `script-src`/`connect-src` never included the tracker origin, so the site recorded **no analytics at all**. That is how a zero-submission funnel stayed invisible. |
| **Build duration** | FAQ said 4-6 weeks against 8-12 in commercial quotes. Now "as little as 8-12 weeks" in both `answer` and `schemaAnswer`. |
| **Visual-regression harness** | `scripts/visual-diff.mjs`. Works, but **needs repair before it can gate anything** — see below. |

---

## What to do next

**Start the relay on `redesign-wave-a.md`.** In order:

1. **P-A and P-B** (plan §1). Both one line. Neither may be deferred past the
   first production deploy of anything.
2. **The harness repair** (plan §2). It currently reports zero shift for any shift
   beyond 240px and passes a 6px sitewide button move. Mostly a matter of gating
   two numbers it already computes.
3. Then WP-0c, WP-0b-i (funnel), WP-0a, WP-1a, WP-1b, WP-2a as sequenced in plan
   §8 — with WP-0b-ii (repricing) landing any time after 0b-i once Lee's
   price-transition and discounting answers are in. It blocks nothing else.

**Consider re-running the critic on Wave A first.** It has not been reviewed since
the configurator and the price sheet were folded in. Offered to Lee; not yet done.

---

## Traps that have already bitten, once each

**Deleting a file does not take it off the internet.** Fixed at root, but the
pattern generalises: verify against the **deploy permalink after the deploy**, not
the apex domain before it. A check that genuinely passed was falsified four minutes
later by an auto-build.

**Agents change branch under you.** An implementation agent spawned into this
checkout created and checked out its own branch; orchestrator commits then landed
on *that branch* rather than `main`. Spawn implementation agents with
`isolation: "worktree"`, or re-check `git branch --show-current` before committing.

**Fix the class, not the instance.** Three critic passes failed in escalating ways;
the third named it: *"rev.1 failed by omission, rev.2 by attestation, rev.3 by
literalism. Every item quoted at this plan was fixed exactly as quoted and the class
it belonged to was not swept."* A quoted defect is a sample. Grep for the pattern.

**Rollback has a floor.** `6a68f16f80fdaf000837b588` (commit `cc8270f`). Every
deploy before it carries the data leak, the published schema, or the broken CSP.
Never restore below it.

---

## Open decisions — Lee, not the plan

All docked in `20-fact-gathering-questions.md`, which also records every answer
received so far. A formatted version was published for him to work through.

| Blocks | Needs |
|---|---|
| WP-2 composition | Per-model prices on `/saunas/` |
| WP-3 copy | Process facts (§A), warranty terms + certifying body (§B), design deposit, five small copy calls |
| WP-4 new pages | Same, plus which commercial clients may be named |
| WP-6 case studies | **Parked by Lee's choice** — he is agreeing curated packages directly with Clarke, Emmanuel and Mountain Life before anything publishes |

**Changing-room pricing: RESOLVED (2026-07-29).** Lee got the derivation, engaged
with it, and corrected an input (the accent-wall standard — entrance wall is
always T&G, never metal); the correction was folded and moved cost by only
−$35/+$15, so the prices held at **$11,000 (3') / $12,500 (4')**. Doc 35 §2 is
authoritative. Also folded 2026-07-29: decks split two-tier (§2B — open platform
keeps $2,000/$3,000, semi-enclosed NEW $4,100/$5,200) and speakers split two-tier
(§5B — standard $1,000, Polk premium NEW $1,500).

**Critic rev.4 (2026-07-30, `redesign-wave-a-critic.md`):** Wave A was NOT CLEARED
as written and the must-fixes were folded the same day. The load-bearing changes:
WP-0b is **two commits** — 0b-i funnel rebuild (no prices, no Lee input) and
0b-ii repricing (all nineteen doc 35 §6 changes + "Save $500" copy + the
models.json schema extension, **gated on Lee's price-transition and discounting
answers**). Never verify the package saving against a hardcoded dollar figure —
the criterion is "delta equals the saving stated at `sauna.njk:161`, at the
prices live in that commit."

---

## Things worth knowing that are not written anywhere else

- **The specifications are good.** Beatrice's font-delivery section, Saul's shot
  lists and Cloudinary tables, and Wim's state table were all singled out by the
  critic as the best work in the corpus. Trust them; implement from them.
- **`21-resolved-tokens.md` is the arbitration file.** Shared token values come
  from it and nowhere else. It was rebuilt after the first version omitted 108
  live `--spacing-*` references while calling itself paste-ready.
- **`models.json` is not in this repo.** It lives in
  `~/marvin/content/reference/operations/models.json`; `js/data.js` is the
  website's copy. Two copies of a price is how the drift started. Plan §8 calls
  for consolidating into `src/_data/models.json`.
- **Lee is non-technical.** Never ask him to review a diff, run a command, or
  verify code. Rollback is "tell me to put it back" — the orchestrator runs it.
- **Bias upward on pricing.** His instruction, with his reasoning: underpricing is
  what stopped them building. It is in `20-fact-gathering-questions.md`.
- **Photography is the highest-leverage unstarted work.** The library holds 1,116
  establishing frames and effectively **zero** detail or process shots, and has no
  shared grade — four frames read as four different companies. Saul wrote a
  shootable brief for a non-photographer (`12 §1.2`) and a 90-second regrade recipe
  (`12 §1.3`). It needs Lee's shop time, not a decision.
