# scripts/

## visual-diff — does a change alter how the site looks?

This is a safety net for design work. Before you merge a branch that touches
CSS, it builds the website twice — once the way it is now, once the way your
branch would make it — takes a photograph of every page at desktop and phone
width, and tells you exactly what moved and by how much.

It exists because "the redesign shouldn't change anything visually" is not a
claim anyone can check by eye across 19 pages at two screen sizes. This checks it.

### Running it

```bash
npm install                  # once
npx playwright install chromium   # once, downloads the browser it drives

npm run visual-diff -- --baseline main --candidate my-branch
```

Options:

| Flag | Meaning |
|---|---|
| `--baseline`, `-b` | The "before" version. Usually `main`. Default: `main`. |
| `--candidate`, `-c` | The "after" version. A branch name, or the word `WORKING` to test edits you have not committed yet. Default: `WORKING`. |
| `--config` | Path to a different settings file. Default: `scripts/visual-diff.config.json`. |

It takes a few minutes. It builds the site twice and takes 76 screenshots.

### Reading the output

At the end you get either

```
No visual change on any of 19 pages at 1440/390px.
PASS — everything within budget.
```

which means the branch is visually invisible to a visitor, or a table like this:

```
  Page                                    Width   Changed    Shift   Height   Status
  /faq/                                     390     3.531%      4px     +4px   FAIL
```

Four numbers, and they mean different things:

- **Changed** — how much of the page looks different at all. If you changed a
  colour, this will be large everywhere, and that is not a problem by itself.
- **Shift** — how far things *moved*. This is the one that matters. Text
  jumping down the page is what breaks a layout; a slightly different shade of
  brown is not. The budget is 4 pixels.
- **Height** — the page got taller or shorter by this much.
- **Status** — `PASS` (within budget), `FAIL` (over budget, and nobody said it
  should change), or `EXPECTED` (over budget, but it is on the approved list).

A prettier version with clickable side-by-side difference images is written to
`.visual-diff/report.html` — open that in a browser. Pink highlighting marks
every pixel that differs.

The command exits with an error code when anything fails, so it can be wired
into a merge check later.

### Telling it which pages are supposed to change

When a redesign *intends* to change the homepage, list it in
`scripts/visual-diff.config.json` so the real regressions are not buried:

```json
"expectedToChange": [
  { "route": "/", "reason": "new hero type scale, per spec section 3" }
]
```

Every entry needs a `route`, a `reason`, and a **`waive` list naming exactly
which metrics it excuses**. A bare route string is rejected.

Waivable: `changedPct`, `heightDelta`, `structural` (a page appearing or
disappearing). **Never waivable: `layoutShiftMaxPx` and `shiftCoverage`** — a
config that tries to waive either is a hard error. `expectedToChange` exists so
a deliberate restyle does not bury real regressions in "the colour changed"
noise; it must not be able to switch off the measurement the acceptance
criterion is actually written against. So a page can waive `changedPct` and
stay shift-gated, and not the other way round.

Listed pages are still measured and still appear in the report, marked
`EXPECTED`. Use the route exactly as the report prints it, trailing slash and
all.

The same file holds the budgets and the capture widths, and it is the **only**
place any of them are written down — `lib/gate.mjs` reads it and defaults
nothing, so a missing budget is an error rather than a silent fallback.

| Setting | Value | Gates |
|---|---|---|
| `maxLayoutShiftPx` | 4 | `layoutShiftMaxPx` — the **maximum** row displacement, not the p99 |
| `minShiftCoverage` | 0.95 | `shiftCoverage` — how much of the baseline was found again |
| `maxChangedPct` | 0.5 | `changedPct` |
| `widths` | 1440, 390 | an empty list is a hard error |

`expectedRedirects` declares the client-side redirects the capture is expected
to see (`/gallery/` -> `/saunas/` and `/process/` -> `/about/` today). A
redirect that is undeclared, points somewhere new, or stops happening fails the
run. Without it, those two routes screenshot a *different page* under their own
name and get reported as unchanged.

> **Read redirected rows with care.** `gallery@1440.png` and `process@1440.png`
> contain the pixels of their redirect *destination* — `/saunas/` and `/about/`
> respectively — because the capture follows the redirect before photographing.
> A green row for `/gallery/` therefore says nothing whatever about the
> `/gallery/` stub page itself; it is a second, redundant photograph of
> `/saunas/`. The stub pages are unmeasured. `expectedRedirects` exists to stop
> that being *silent*, not to fix it.

#### Per-page overrides

The global budgets above are unwaivable and are not to be lowered to make a run
pass. When a page legitimately moves — a new type scale shifting the fold by
20px, say — it may carry a `pageOverrides` entry that moves **one named budget
on that one page**:

```json
{ "page": "/about/", "metric": "maxLayoutShiftPx", "value": 24,
  "reason": "new hero type scale moves the fold ~20px, approved in design review",
  "expires": "2026-09-30" }
```

**Which way an override may move depends on what kind of budget it is**, and
getting this backwards makes overrides useless:

| Metric | Kind | Legal direction | Bounds |
|---|---|---|---|
| `maxLayoutShiftPx` | ceiling | raise only | at most 100× the global |
| `maxChangedPct` | ceiling | raise only | at most 100× the global |
| `minShiftCoverage` | **floor** | **lower only** | `[0.75, 1)` |

`minShiftCoverage` is a *minimum* — the fraction of the baseline that must be
found again in the candidate. Raising it tightens the gate; the direction that
makes a deliberate restyle shippable is **down**. Treating it as raise-only left
6 of 19 pages in a real 6px restyle run failing on coverage with no legal
override available, which defeated the entire point of having overrides.

The bounds are there so an override stays a decision rather than an off switch:
100× a 4px budget is a loud, reviewable 400px, while `999999` is the metric
switched off with extra steps; and a coverage floor below 0.75 means a quarter
of the page's rows could not be matched at all, which wants a human
conversation, not a config line.

An override cannot disable a metric, cannot move in the wrong direction, cannot
affect another page or another metric, and cannot rescue a page whose shift
could not be measured at all. A missing reason, a missing or malformed expiry,
an expiry **more than 90 days out**, an unknown metric, a wrong-direction value,
or an out-of-bounds value is a hard config error.

**An expired override fails the run.** It does not lapse quietly back to the
global budget — either the change it was written for has landed and the entry
should be deleted, or it has not and somebody needs to say so with a new date.
Every override in force is written into `report.json`, so a green run always
carries the list of budgets that were raised to make it green, with reasons.

### Testing the harness itself

```bash
npm run visual-diff:test
```

The harness is a fixture certifying a whole-stylesheet migration: if it is
wrong, every "no visual change" claim resting on it is wrong too. So it has
tests, and each one is a defect it actually shipped with.

| Fixture | Asserts |
|---|---|
| F1 | a 6px sitewide button move **fails** (and cannot be waived away) |
| F2 | a self-comparison **errors**, before any build runs |
| F3 | a page whose content changed entirely **registers**, via the coverage gate |
| F4 | `WORKING` on a *clean* tree resolves to a bare sha, so the self-comparison guard can fire; two ref names for one commit are refused |
| C | an unchanged page **passes**, byte-identically (control) |
| B | a broken image is reported; a source-less placeholder is not |
| O1–O3 | the orchestration layer: a missing screenshot becomes a run failure, run failures reach the failure count, the redirect comparison works in all three directions |
| O4 | the redirect gate is actually *called* — a real end-to-end CLI run with no declared redirects must fail and say which route |
| P | per-page overrides move one budget the way its type allows — ceilings up (capped at 100×), the coverage floor down (bounded to `[0.75, 1)`) — only on the page and metric named, never past a 90-day expiry |

| F5 | invoking the CLI through a **symlinked** path still runs it, rather than exiting 0 in silence |

Plus the config-validation cases covering the fail-open paths. 91 assertions.

**The suite needs an ambient git repository.** O4 and F4e shell out to the real
CLI against real refs (`HEAD`, `HEAD~1`), so from a `git archive` export or any
copy without `.git/` they fail with `fatal: not a git repository`. That is a
missing prerequisite, not a harness defect — run the tests from a clone.

O4 is the slow one: it builds two refs and captures a pass, because it is the
only way to prove the redirect check is *wired in* rather than merely correct.
Deleting the one line that calls it leaves every other fixture green.

**If a fixture and a budget disagree, the fixture is right.** Renegotiate the
budget in the plan; never edit a fixture to make a run go green.

### What it does not do

It compares two builds of *this repo*. It does not check the live site, it does
not check whether the design is any good, and it does not click anything —
every capture is the page as it first loads, scrolled to the top. Interactive
states (open FAQ answers, opened modals, the lightbox) are not covered.

---

## For developers: how determinism is achieved

Two runs of an unchanged site must produce byte-identical screenshots, or the
tool is noise. Six things on this site would otherwise drift, and each is
handled in `scripts/lib/capture.mjs`:

1. **Scroll-reveal animation.** `js/animations.js` adds `.visible` via an
   `IntersectionObserver`, and the homepage hero fades in on a timer. Captures
   run with Playwright's `reducedMotion: 'reduce'`, plus an injected stylesheet
   that zeroes every animation and transition and forces `.fade-in`,
   `.slide-up`, `.slide-left`, `.slide-right`, `.scale-in`,
   `.gallery-item--reveal`, and the homepage nav/hero to their settled state.
   Forcing the settled state is not cosmetic: without it, everything below the
   fold captures at `opacity: 0` and the harness is blind to most of the site.

2. **Scroll-driven parallax.** `SSC.initHeroParallax()` writes an inline
   `translateY` to `.hero-overlay__bg` on every scroll event, so the background
   image lands wherever scrolling happened to stop. Pinned with a
   `transform: none !important` rule, which beats the inline style the script
   writes. This was found the honest way: the first main-vs-main run reported
   0.057% change on `/about/`, in a 650px band, and it turned out to be that
   image sitting a few pixels off.

3. **Remote assets.** Cloudinary images and Google Fonts are fetched over the
   network, which is slow, offline-fragile, and subject to silent CDN
   re-encoding. A record/replay cache in `.visual-diff/asset-cache/` fetches
   each remote URL once and replays it byte-for-byte forever after. Real fonts
   and real image dimensions are preserved, which matters, since a type-scale
   refactor is precisely what this is built to gate. Delete the cache directory
   to re-record.

4. **The clock.** `Date`, `Date.now()`, and `Math.random` are replaced before
   any page script runs — a fixed epoch and a seeded PRNG — and the browser is
   pinned to `en-CA` / `America/Vancouver`. No time-of-day or randomised branch
   was found anywhere in the current `js/` or `src/` (searched for `getHours`,
   time-of-day phase classes, and rotating quotes; there are none). The only
   time-dependent value on the site is the copyright year, computed at build
   time by the `currentYear` Eleventy filter, which is identical for two builds
   run minutes apart. This layer is therefore insurance against future
   time-dependent code rather than a fix for existing drift, and it costs
   nothing to keep.

5. **The hero video.** The homepage carries an autoplaying, looping `<video>`.
   Which frame is on screen when the shutter fires depends on decode timing, so
   the element is **stubbed**: its media request is aborted before any host rule
   applies, and the element paints as a flat block inside its own CSS-fixed
   `70vh` box, so nothing moves. Determinism here is by construction. It
   deliberately does *not* rest on the asset replay cache handling a ranged
   media response correctly — the cache stores one whole body per URL and
   ignores `Range`, which is a real bug, but it is a separate bug on its own
   merits and this claim does not lean on it.

6. **Live endpoints.** The analytics tracker at `ssc-ops.netlify.app`, plus
   Formspree, Supabase, and the CDN script hosts, are aborted. Beyond
   determinism this is a correctness point: one run is 76 page loads, and the
   site owner's analytics should not be polluted by his own test harness. Any
   *unrecognised* third-party host is also aborted and named in the run summary,
   so a new dependency surfaces as a deliberate decision rather than silent
   nondeterminism.

### Observed noise floor

`main` vs `main` has been measured at **exactly zero changed pixels** across all
38 page/width pairs, twice. That is the target and the harness currently hits it.

One `main` vs `WORKING` run showed a residual 15 pixels (0.0004%) on `/` at
390px, in a photographic region, with per-channel deltas of 1–5 out of 255 —
Chromium image-decode variance, invisible to a human. That is roughly 1400x
below the 0.5% failure threshold, so it does not affect verdicts, but it is
recorded here rather than rounded away: if a future run's noise floor climbs
toward the threshold, the harness is degrading and should be fixed, not
re-thresholded.

**One observed flake, and what was done about it (2026-07-30).** A `main` vs
`WORKING` run reported `/about/` @1440 at 1.427% changed with a 139px maximum
shift, on a pair of builds whose HTML differed only in `?v=` cache stamps. It
did not reproduce: capturing the same two `dist/` directories four times
afterwards gave zero changed pixels every time, in both directions. The cause is
structural rather than mysterious — several pages carry `loading="lazy"` images
with **no `width`/`height` attributes**, so nothing reserves their space, and a
page photographed before one of them decodes puts everything below it at a
different offset. The settle step has been made race-free and bounded (polling
via `waitForFunction` instead of attaching load handlers, which could also hang
the run forever if an image completed between the check and the attach), and a
failed image is now surfaced as a run failure instead of being photographed as a
collapsed box.

Recorded rather than smoothed over, because the honest status is *mitigated, not
proven eliminated*: the flake was seen once and never reproduced, so the fix is
reasoned from the mechanism rather than demonstrated against a reliable
repro. **If `/about/` or any other image-heavy page reports a large shift on a
change that cannot explain it, suspect this before believing the number.** The
real fix belongs in the site: give those images explicit dimensions or an
`aspect-ratio`, which would also remove genuine layout shift for actual
visitors.

### How "layout shift" is measured

Pixel-difference counting cannot distinguish "the page turned a different
colour" from "the page moved down 4 pixels", and the acceptance criterion is
written about the second one. So each row of pixels is reduced to a signature
of where its horizontal luminance edges sit, quantised to 4px buckets. That
signature survives a recolour — the edges stay put — but travels with the row
when layout moves. Matching baseline rows to candidate rows by signature yields
a distribution of vertical displacements.

Two numbers come out of that, and **both are gated**:

- **`layoutShiftMaxPx`** — the largest displacement observed. The p99 is still
  reported alongside it (as `layoutShiftPx`) because a coincidental row match on
  repeating texture can spike the maximum, but the *gate* reads the maximum: a
  percentile discards the worst rows, and the worst rows are the regression.
- **`shiftCoverage`** — the fraction of structured baseline rows found again in
  the candidate. This is what catches the two failures the other metrics are
  blind to. Row matching only searches +/-240px, so anything that moved further
  than that simply fails to match and reports a shift of *zero*; a page whose
  content was replaced outright does the same. Both collapse coverage instead.

A page whose shift cannot be measured at all (no structured rows) **fails**. No
evidence of change is not evidence of no change.

A run fails a page when any gated metric is over budget, and fails the *run*
when the measurement itself is untrustworthy: a failed asset fetch, an
unrecognised host, an undeclared redirect, a missing screenshot, or zero
page/width pairs compared. Each of those used to be a warning or a silent
`continue`, and each of them let a run report PASS while measuring nothing.
Pages appearing or disappearing between builds are reported separately as
structural changes, since no pixel comparison can see them.

### Layout

```
scripts/
  visual-diff.mjs           CLI + orchestration
  visual-diff.test.mjs      the harness's own fixtures
  visual-diff.config.json   budgets, widths, per-metric waivers, per-page
                            overrides, expected redirects
  lib/gate.mjs              config validation + the single pass/fail decision
  lib/build-ref.mjs         git worktree checkout + Eleventy build + page enumeration
  lib/server.mjs            dependency-free static server (Eleventy pretty URLs)
  lib/capture.mjs           the determinism layer + screenshots
  lib/diff.mjs              pixel diff + structural layout-shift metric
.visual-diff/               working directory, gitignored
  baseline/ candidate/      built sites and their screenshots
  diffs/                    difference images for pages over budget
  asset-cache/              recorded remote responses
  report.json report.html
```

Pages are enumerated from the built `dist/` directory, never from a hardcoded
list, so new pages are picked up automatically. The build command is always
`rm -rf dist && eleventy`, matching `netlify.toml`; the clean is load-bearing
and must not be removed.

**Both refs build in a temp directory, including `WORKING`.** `WORKING` used to
build in place, which meant a measurement tool running `rm -rf dist` against the
developer's live working tree as a side effect. It now copies the working tree
(uncommitted edits included, minus build artefacts and `.env`) to a temp dir and
builds there. Nothing the harness does writes inside the repo except
`.visual-diff/`.

### Asset cache keys, and one caveat about `--serve`

`styles.css` and `js/*` are served `immutable` for a year, so their URLs carry a
content hash from the `assetUrl` filter in `.eleventy.js` rather than a
hand-typed `?v=` stamp. The hash covers the **minified** bytes — the ones
actually published — because the build minifies those files after Eleventy
writes them, and hashing the pre-minified source would let a minifier upgrade
change what visitors receive without changing the cache key. Minification
happens once, inside the filter; the post-build hook writes that same buffer.

To check a build's stamps against its own output:

```bash
npm run build && node -e "
const fs=require('fs'),c=require('crypto'),p=require('path');
for (const [,u,s] of fs.readFileSync('dist/index.html','utf8')
    .matchAll(/[\"'](\/(?:styles\.css|js\/[\w.-]+))\?v=([0-9a-f]{12})/g)) {
  const h=c.createHash('sha256').update(fs.readFileSync(p.join('dist',u.slice(1))))
    .digest('hex').slice(0,12);
  console.log((h===s?'OK   ':'DRIFT')+' '+u+' '+s+' '+h);
}"
```

> **The filter memoises per Eleventy process.** Under `npx @11ty/eleventy
> --serve` (`npm run dev`), editing `styles.css` re-renders the templates but
> reuses the cached hash, so the dev server can serve a stale stamp until it is
> restarted. This affects local development only: `npm run build` and the
> Netlify build are fresh processes that start with an empty cache, and the
> visual-diff harness builds each ref in its own process too. If a dev-server
> page seems to be ignoring a CSS edit, restart the server.

### Dependencies

Three, all pinned to exact versions:

| Package | Version | Why |
|---|---|---|
| `playwright` | 1.62.0 | Drives headless Chromium. The only real option for scripted full-page screenshots, already in this toolchain. |
| `pixelmatch` | 7.2.0 | Pixel comparison with anti-aliasing tolerance. ~150 lines, no dependencies. |
| `pngjs` | 7.0.0 | Reading and writing the PNGs. No dependencies. |

All three are `devDependencies` and none ship to the site. The static server and
the layout-shift metric are hand-written rather than pulled from packages,
deliberately: a tool whose whole job is to be trustworthy should not import more
supply chain than it needs.
