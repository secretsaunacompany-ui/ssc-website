# Critic review — npm-audit remediation + CLS fix (`lovely-cuddling-dragonfly.md`)

*Reviewer: plan critic (Fable), 2026-08-23. Rubric: plan-critic-rubric v2.*
*Note: this critic session was write-locked to its own plan file by plan mode; this content is intended for `.claude/plans/lovely-cuddling-dragonfly-critic.md` in the ssc-website-charter worktree.*

## Applicability

**Project type:** public-facing static business website (Eleventy on Netlify) with serverless functions; the plan itself is dependency maintenance plus a one-line template fix. Standard tier (3 files, fallback path, external tooling).

**Conditional dimensions:**

| Dim | Fires? | Why | Tag |
|---|---|---|---|
| X1 Physical & human safety | **No** | Pure software on a website; no hardware, hazardous output, or physical control path anywhere in scope. | N/A (negative attestation) |
| X2 Privacy & data stewardship | **Yes, narrowly** | The plan does not change any data handling, but it updates the runtime client (`@supabase/supabase-js`) of the one function that reads client reservation data (`booking-admin.js`). The stewardship risk is availability/breakage of that data path, not exposure. | **GATING** |
| X3 Evidence & source integrity | **No** | No research, civic analysis, or public factual claims are produced; the audit counts are verified empirically by the plan's own steps. | N/A (negative attestation) |
| X4 Audience, brand & money accuracy | Yes | The CLS fix alters HTML on five public pages. No money, legal terms, or copy changes. | ADVISORY |
| X5 Concurrency & re-entrancy | No | No long-running processes, timers, streaming, or shared mutable state. | N/A |
| X6 Operability & observability | Yes | The supabase-js bump deploys into a production serverless function; if it misbehaves in the field, someone must be able to see it. | ADVISORY |
| X7 Self-modification safety | **No** | No MARVIN gates, hooks, skills, or automation are touched. | N/A (negative attestation) |
| X8 Dependencies, performance & cost | Yes | The plan is a dependency update: one 17-minor-version bump, one 10-major-version bump, one lockfile sweep. | ADVISORY |

## Core dimensions

1. **Problem-fit — PASS.** `## Intent (grilled)` exists and the plan's goal (production tree clean, dev tree reduced where safe, CLS fixed, nothing broken) matches it. The DECISIONS.md pin — `npm audit fix --force` is not a relay side-quest, needs its own plan — is not merely respected but *satisfied*: this is that plan, and `--force` is explicitly out of scope.
2. **Approach soundness — PASS.** Surgical package-level updates instead of `audit fix --force`, ordered lowest-risk first, with the only major-version jump isolated to a dev-only tool behind a revert fallback. Correct shape for a live site.
3. **Completeness — PASS.** Both audit outcomes are covered (0 high/critical, or documented accepted dev-only risk via the fallback); the CLS fix names all five affected pages; the step-4 sweep catches transitive stragglers.
4. **Right-sizing & reuse — PASS.** Three minimal changes plus a semver-safe sweep; out-of-scope items are named, and the only deferrable outcome (accepted dev-tree risk on fallback) is routed to a ROADMAP deferred entry. The other out-of-scope items are refusals, not deferrals, so no Parking Lot index is owed.
5. **Security — PASS.** The plan *is* security remediation; blast radius is reasoned per-package, the production/dev attack-surface distinction is correctly drawn, and all updates stay semver-constrained through the lockfile.
6. **Failure modes — CONCERN.** Step 2 has a named fallback; step 1 — the only change that reaches production — has none. If supabase-js 2.112.3 breaks `booking-admin.js`, the plan neither says how that would be detected nor how to revert. **Fix:** add one line to step 1: revert = restore the previous `package-lock.json` (git) and redeploy; detection = the smoke check from dimension 9 plus a post-deploy probe of the admin endpoint (or Netlify function logs).
7. **Change safety — PASS.** Everything is git-revertible (lockfile, one version range, two HTML attributes), executed through the relay pipeline with the full gate stack, and the fallback path is an explicit restore procedure.
8. **Data integrity & compatibility — PASS.** No data or stored artifacts are touched; `package.json`/`package-lock.json` stay consistent by construction (`npm install` regenerates the lock).
9. **Verifiability — CONCERN.** The verification battery is genuinely strong for the *site* (twelve suites, visual-diff with a predicted diff footprint, built-output grep for the CLS attributes, audit recounts that directly prove the ws fix). But the single production-behavior change — supabase-js inside `booking-admin.js` — is exercised by none of it. `npm audit --omit=dev` proves the vulnerability is gone, not that the function still works. **Fix:** add a functional smoke check: invoke the function locally (`netlify dev` / `netlify functions:serve` with test env) or at minimum a Node script that imports `netlify/functions/lib/supabase.js`, constructs the client, and builds a reservations query against 2.112.3; and skim the supabase-js changelog 2.95→2.112 for behavior changes (auth, fetch, Node engine) before trusting the semver contract.
10. **Maintainability — PASS.** Dependency currency improves (netlify-cli 10 majors closer to supported), the ROADMAP is updated on completion, and the fallback path documents its residue instead of leaving it silent.

## Conditional verdicts

- **X2 Privacy & data stewardship [GATING] — CONCERN.** No records are collected, retained, or exposed differently, and nothing irreplaceable can be lost — but the reservation-data read path gets a new client version with zero functional verification. Same fix as dimension 9's smoke check; that one addition clears both.
- **X4 Audience & brand [ADVISORY] — PASS.** Two HTML attributes on a template; visual-diff bounds the blast radius to the five named pages. One cheap check worth adding: confirm `1200×500` matches (or acceptably approximates) the intrinsic ratio of the actual service-area images, since the pre-CSS reserved box uses that ratio.
- **X6 Operability & observability [ADVISORY] — CONCERN.** If booking-admin 500s after deploy, nothing in the plan notices — the charter's zero-submission alarm watches the quote path, not this endpoint, and the admin surface belongs to SSC Booking, so breakage would be discovered by its consumer. **Fix:** one post-deploy probe of the admin endpoint, or a look at Netlify function logs after the first production invocation.
- **X8 Dependencies [ADVISORY] — CONCERN.** The netlify-cli 17→27 jump is well-fenced by the fallback, but the plan never checks the new version's Node `engines` requirement against the local and CI Node versions — the most likely way the bump fails, and a check that costs one `npm view netlify-cli@27 engines` *before* burning an install/verify/revert cycle. No typosquat risk (existing packages, registry-resolved); cost/perf N/A.

## Stress tests

**Pre-mortem** (3 months out, it failed):
1. **The worst case for this plan type: the production function broke silently.** supabase-js changed something between 2.95 and 2.112 (auth header handling, fetch polyfill, Node engine floor) and booking-admin started 500ing. Every site test stayed green because none of them touches the function. Discovered weeks later through SSC Booking's admin surface. We should have seen it in a 30-second smoke invoke that was never in the plan.
2. netlify-cli 27 required a newer Node than the local environment carries; `npm install` or `netlify dev` failed, the fallback fired, and the session spent its budget on an install-verify-revert cycle a one-line engines check would have skipped. Outcome acceptable (fallback worked as designed), but the plan predicted none of it.
3. The step-4 `npm audit fix` sweep nudged a transitive build dependency and shifted built output — caught by csp-hash:test or visual-diff *if* verification is rerun after step 4. The plan's ordering implies verification runs once at the end; if an implementer verifies between steps 2 and 4, the sweep lands unverified.

**Load-bearing assumptions:**
1. *supabase-js 2.95→2.112 is non-breaking for booking-admin's API surface.* Confidence: medium-high (semver contract, stable query API). Consequence if wrong: production admin breakage with no detection — the plan's only unmitigated failure. Resolve before implementation via the smoke check.
2. *`npm update` within `^2.39.0` actually lands a ws ≥ 8.21.3.* Confidence: high, and — credit where due — verification step 1 proves it empirically rather than assuming it.
3. *netlify-cli is dev-only and never in the production build path.* Confidence: high (Netlify CI uses its own CLI), but worth a 10-second glance at `netlify.toml` for anything that shells out to the local CLI.
4. *Only the CLS attributes move visual-diff.* Holds only if step 4's sweep didn't perturb build output — which is exactly what the end-of-plan verification ordering checks, so keep verification after step 4, not before.

**Inversion:** For `npm audit fix --force` to win, the surgical path would have to fail to reach 0 production high/critical *and* the dev tree would have to be disposable. Neither is true: step 1 alone clears production, and the DECISIONS pin stands. A second rejected-by-omission alternative — dropping netlify-cli from devDependencies entirely and using `npx netlify-cli` on demand — would win if `dev:netlify` is effectively unused; if step 2's fallback fires, that alternative deserves a line in the deferred entry rather than silently accepting 67 vulnerabilities forever.

## Overall verdict

**PASS with concerns — proceed after folding in the must-fix list.** This is a well-scoped, honestly-fenced remediation plan: it satisfies the standing pin by being the dedicated plan the pin demanded, it isolates the risky jump behind a real fallback, and its site-level verification is among the more complete batteries I've reviewed. Its one structural blind spot is an inversion of effort: the change with the smallest diff and the only production reach (supabase-js) gets the least verification, while the change with zero production reach (netlify-cli) gets the fallback engineering. No gating dimension FAILs, so the gate is not blocked — but the X2/failure-mode/verifiability concerns all collapse into one cheap addition, and there is no good reason to ship without it.

**Must-fix (prioritized):**
1. **Add a booking-admin smoke check against supabase-js 2.112.3** (local function invoke, or minimally an import-and-query-construction script) and skim the 2.95→2.112 changelog for behavior/engine changes. Clears the dimension 6, 9, and X2 concerns at once.
2. **Name step 1's revert and detection path:** revert = git-restore the previous lockfile and redeploy; detection = one post-deploy probe of the admin endpoint or the Netlify function logs (also clears X6).
3. **Check netlify-cli 27's Node `engines` requirement before the bump** (`npm view netlify-cli@27 engines`) against local and CI Node versions (clears X8).
4. Minor: confirm verification runs *after* step 4's sweep (the plan's ordering implies it — make it explicit), and sanity-check `1200×500` against the intrinsic ratio of the service-area images.
