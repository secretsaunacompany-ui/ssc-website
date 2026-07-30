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
  brown is not. The budget is 8 pixels.
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
| C | an unchanged page **passes**, byte-identically (control) |

Plus the config-validation cases covering the fail-open paths.

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
  visual-diff.config.json   budgets, widths, per-metric waivers, expected redirects
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
