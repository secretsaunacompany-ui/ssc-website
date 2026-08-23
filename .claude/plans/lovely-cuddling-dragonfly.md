# npm-audit remediation + CLS fix

## Context

The ROADMAP has carried "npm-audit remediation: 70 pre-existing vulnerabilities"
as a deferred item since Wave A batch 1 (2026-07-30), with a DECISIONS.md pin
that `npm audit fix --force` on a live site is not a relay side-quest. The
coordinator's assignment targets production tree 0 high/critical as the done
condition, and folds in the deferred CLS fix if it fits cleanly.

Current state (2026-08-23): 68 vulnerabilities (5 low, 22 moderate, 34 high, 7
critical). Production tree: 1 HIGH (ws 8.19.0 via @supabase/supabase-js →
@supabase/realtime-js). Dev tree: 67 vulnerabilities, nearly all in
netlify-cli 17.38.1's transitive dependencies.

## Intent (grilled)

Fix the production vulnerability. Reduce dev-tree exposure where safe. Fix the
CLS image. Do not break the build, the test suites, or the deploy workflow.

## Approach

Three changes, ordered by risk (lowest first):

### 1. Update @supabase/supabase-js (production fix)

`npm update @supabase/supabase-js` — moves from 2.95.3 to 2.112.3 within the
existing `^2.39.0` semver range. This pulls a fixed ws (>= 8.21.3), resolving
the only production HIGH. Non-breaking by semver contract.

The package is used by exactly one serverless function (`netlify/functions/booking-admin.js`
via `netlify/functions/lib/supabase.js`). The function creates a Supabase client
and queries reservations/slots — a stable API surface unlikely to break across
minor versions.

**Pre-check:** skim the supabase-js changelog 2.95→2.112 for behavior changes
(auth, fetch, Node engine requirements) before trusting the semver contract.

**Smoke check:** after the update, verify booking-admin still works by importing
`netlify/functions/lib/supabase.js` and confirming client construction succeeds
against the new version. At minimum: `node -e "require('./netlify/functions/lib/supabase')"` 
must not throw (env vars will be absent, so the client won't connect — but the
import proves API compatibility).

**Revert path:** if the smoke check fails or post-deploy function logs show errors,
restore the previous `package-lock.json` from git and redeploy. Detection:
Netlify function logs for booking-admin 500s after the first production invocation.

**Files changed:** `package-lock.json` only (the range in `package.json` already
covers 2.112.3).

### 2. Update netlify-cli (dev-tree remediation)

`netlify-cli` 17.38.1 is 10 major versions behind latest (27.1.2) and accounts
for nearly all 68 vulnerabilities including all 7 criticals (tar path traversal,
decompress archive escapes) and most highs.

**Pre-check:** `npm view netlify-cli@27 engines` — verify the Node requirement is
compatible with the local environment and the CI target (Node 18 per netlify.toml).

**Approach:** bump `package.json` from `^17.0.0` to `^27.0.0`, run `npm install`,
then verify:
- `npx netlify dev` starts without errors (the only script that uses it:
  `"dev:netlify": "netlify dev"`)
- `npx netlify build` completes (even though production builds use Netlify CI, not
  the local CLI)
- `npm audit` recount

**Risk:** This is a major version jump. If it introduces incompatibilities with
the project's Netlify function structure or build config, the fallback is to
revert and document the dev-only risk as accepted — netlify-cli vulnerabilities
are supply-chain risks during local development only, not production attack
surface. The deployed site and serverless functions are unaffected regardless.

**Fallback (if the update breaks things):** Revert `package.json` to `^17.0.0`,
run `npm install` to restore, and record a ROADMAP deferred entry stating that
the dev-tree vulnerabilities are accepted pending a future netlify-cli migration.
The production target (0 high/critical) is met by step 1 alone.

**Files changed:** `package.json` (one version range), `package-lock.json`.

### 3. CLS fix (folded in)

Add `width="1200" height="500"` to the lazy-loaded `<img>` in
`src/_includes/pages/service-area.njk:15`. The CSS class `.img--full-cover-500`
already constrains the rendered box to `width: 100%; height: 500px;
object-fit: cover`, but the browser needs HTML attributes to reserve space before
CSS loads.

This is a one-line template change affecting the five service-area pages
(/squamish/, /whistler/, /vancouver/, /north-shore/, /sea-to-sky/). All other
lazy images in the codebase already carry width and height.

**Sanity check:** confirm 1200x500 is a reasonable intrinsic-ratio proxy for the
actual images. The CSS already forces `height: 500px; object-fit: cover`, so the
reserved box matches the rendered box regardless of the image's native ratio —
the attributes exist for layout reservation, not for aspect-ratio fidelity.

**Files changed:** `src/_includes/pages/service-area.njk` (line 15, add two
attributes).

### 4. Run `npm audit fix` (sweep)

After steps 1-2, run `npm audit fix` (without --force) to pick up any remaining
safe transitive updates (minimatch, nanoid, brace-expansion, js-yaml, etc.).

**Files changed:** `package-lock.json`.

## Out of scope

- `npm audit fix --force` — the DECISIONS.md pin prohibits this as a side-quest.
  Steps 1-2 target the same packages surgically.
- Removing @supabase/supabase-js — booking-admin.js is owned by SSC Booking's
  charter (per CHARTER.md). The dependency stays; its vulnerability is fixed by
  updating it.
- Removing or rewriting Netlify functions — out of scope for an audit remediation.

## Verification

All verification runs AFTER step 4's sweep, not between steps — the sweep can
shift transitive deps that affect build output.

1. `npm audit --omit=dev` — must report 0 vulnerabilities (production tree clean)
2. `npm audit` — must report 0 critical, 0 high (or document accepted dev-only risk)
3. `npm run build` — Eleventy build succeeds, 20 files written
4. Run all twelve test suites sequentially:
   ```
   npm run visual-diff:test
   npm run dom-integrity:test
   npm run quote-funnel:test
   npm run events:test
   npm run fonts:test
   npm run rhythm:test
   npm run package-claim:test
   npm run prices-version:test
   npm run build-cache:test
   npm run models-json:roundtrip
   npm run lint:css:test
   npm run csp-hash:test
   ```
5. `npx stylelint styles.css` — lint clean
6. Verify the CLS fix: built pages at `dist/squamish/index.html` (and siblings)
   contain `width="1200" height="500"` on the intro image
7. Visual-diff: `npm run visual-diff -- --baseline main --candidate HEAD` — the
   only movement should be on the five service-area pages (the CLS attributes
   may cause sub-pixel rendering differences)

## Execution

This plan is executed via /relay — the full pipeline (implement, review, design
review as applicable). Direct implementation of a plan outside the relay pipeline
is outside session authority (standing rule, brief authority block, 2026-08-23).

## ROADMAP update

On completion, update the ROADMAP deferred list: remove the npm-audit and CLS
entries, add a shipped entry with the date and summary.
