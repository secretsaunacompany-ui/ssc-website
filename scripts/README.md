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

Listed pages are still measured and still appear in the report, marked
`EXPECTED`. They just don't fail the run. Use the route exactly as the report
prints it, including the trailing slash.

The same file holds the budget (`maxLayoutShiftPx`, default 8) and the capture
widths (1440 and 390).

### What it does not do

It compares two builds of *this repo*. It does not check the live site, it does
not check whether the design is any good, and it does not click anything —
every capture is the page as it first loads, scrolled to the top. Interactive
states (open FAQ answers, opened modals, the lightbox) are not covered.

---

## For developers: how determinism is achieved

Two runs of an unchanged site must produce byte-identical screenshots, or the
tool is noise. Five things on this site would otherwise drift, and each is
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

5. **Live endpoints.** The analytics tracker at `ssc-ops.netlify.app`, plus
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

### How "layout shift" is measured

Pixel-difference counting cannot distinguish "the page turned a different
colour" from "the page moved down 4 pixels", and the acceptance criterion is
written about the second one. So each row of pixels is reduced to a signature
of where its horizontal luminance edges sit, quantised to 4px buckets. That
signature survives a recolour — the edges stay put — but travels with the row
when layout moves. Matching baseline rows to candidate rows by signature yields
a distribution of vertical displacements.

The reported number is the 99th percentile, not the maximum: on a page with
repeating texture, one coincidental row match would otherwise produce a false
failure. The maximum is kept in `.visual-diff/report.json` as
`layoutShiftMaxPx` for anyone who wants it.

A run fails a page when *any* of these exceed budget: layout shift, absolute
height change, or changed-pixel percentage. Pages appearing or disappearing
between builds are reported separately as structural changes, since no pixel
comparison can see them.

### Layout

```
scripts/
  visual-diff.mjs           CLI + orchestration
  visual-diff.config.json   budget, widths, expected-to-change allowlist
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
