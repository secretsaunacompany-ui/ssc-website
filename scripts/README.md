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

## dom-integrity — did the page still say the same thing?

```bash
npm run dom-integrity -- --baseline <ref> --candidate <ref>
npm run dom-integrity:test
```

The pixel harness answers "did anything move?". For a **typeface swap** that
question has no useful answer: changing the font changes every text pixel by
design, so row signatures cannot match and the affine fit correctly reports
does-not-fit. WP-1a failed 37 of 38 pairs and every verdict was honest. Tuning
the pixel instrument until a font swap came back green would be modelling until
the answer is the one we wanted.

The question a restyle actually needs answered is different: *did the page still
say the same thing, in the same structure?* If the element tree and the text are
identical, whatever changed was presentation — which is exactly what a restyle
is allowed to change.

So this builds both refs, loads every page, and compares a normalized
fingerprint: the element tree (tags, nesting, order, attributes) and the text.
Identical modulo an explicit whitelist, or a named per-page failure saying which
node and what changed.

### What is normalized, and what is not

Only two things, because a normalizer is a laundering machine pointed at your
own gate:

- **Whitespace in text**, collapsed and trimmed — rendering collapses it anyway.
  Beyond that text compares EXACTLY. A reworded sentence, a changed price or a
  dropped word FAILS. That is the instrument's purpose, not a limitation.
- **Two URL segments**: the `?v=` content-hash stamp (it changes whenever
  styles.css changes, which is what a restyle does) and the hash segment of
  `/fonts/<name>.<hash>.woff2` — the **family name is kept**, so substituting a
  different typeface still fails.

Every other attribute, tag, nesting relationship and ordering compares raw.

### The whitelist is a declaration, not a mute button

Each entry names an `op`, a `tag`, a `contains` substring, a **count**, a reason
and the **commit** that made the change legitimate. Undeclared changes fail. A
declared change that does not occur ALSO fails — a stale entry is a hole nobody
closed. Counts are per page, so a *second* unexpected instance of a declared
change still fails: the two Google preconnects are declared, and a third
disappearing preconnect (the Cloudinary one, which must survive) is caught.

### The four entry kinds

A `contains` substring names a node by its attributes. That works for a `<link>`
and not at all for the other three shapes a real batch produces, so the
vocabulary has four ops. Each is a declaration with the same authority and the
same exactness; none is a waiver.

| `op` | Declares | Identified by |
|---|---|---|
| `removed` / `added` | one node appeared or disappeared | `tag` + `contains` substring + `count` |
| `removed` / `added` with `"kind": "code"` (or `"text"`) | an inline `<style>`/`<script>` body, or a text node, changed | `tag` + `contains` substring **of the text** + `count` |
| `rename` | a class token was renamed sitewide (`from` → `to`) | the token pair |
| `rename` with `"to": null` | a class token was **removed** sitewide | the token |
| `delete-subtree` | an attribute-less node and everything under it was deleted | `tag` + `path` + **content hash** + `count` |

**Renames and removals** are applied to the *baseline's* vocabulary before
anything is compared, so a 158-site collapse reads as the one declared structure
change it is rather than 158 undeclared attribute deltas. Whole tokens only,
never substrings, so renaming `fade-in` cannot touch `fade-in-late`. Everything
the map does not explain survives into the comparison and still fails: a rename
plus a smuggled extra class fails **naming the smuggled token**. A removal
(`to: null`) is the same mechanism for the WP-1b rhythm utilities, which were
deleted rather than renamed — the element survives, one of its class tokens goes,
and no node entry can express that.

**`kind`** exists because `contains` was tested only against a node's serialized
attributes, so a token that has none — a text node, or an inline `<style>` body —
could never match an entry. An edit to inline CSS was undeclarable by
construction. With an explicit kind the substring is tested against the text
instead, under the same count and specificity discipline; `kind` is part of the
entry's identity, so a code declaration cannot consume an element change even
when its substring happens to appear in an attribute.

**`delete-subtree`** exists for the deletions a `contains` entry physically
cannot describe: the hero-intro `<style>` and `<noscript>` blocks carry no
attributes, so the only substrings available (`"style"`, `""`) are exactly the
lazy kind the specificity check rejects. Instead the entry names the node three
ways at once — its tag, its ancestry path, and a **hash of its own serialized
content** — and consumes the whole run of removed tokens or nothing at all. The
hash is what makes the entry impossible to write lazily: you cannot guess it, you
measure it, and two attribute-less siblings of the same tag hash differently the
moment their content differs. An entry whose hash matches nothing in the baseline
is reported *before* any verdict rests on it, with a message that separates "the
hash is wrong" from "the deletion never happened".

Two properties of that hash are worth stating because they were chosen, not
inherited. It is computed over the **sorted** token keys: two identical `<style>`
siblings produce byte-identical element tokens, so when one is deleted the
sequence matcher is free to align the survivor's token against the deleted one's
and the removed run comes back as *[A's text, B's element]* — the right content
in an order nobody chose. Sorting reads the content and ignores the artifact.
What that gives up is intra-subtree *order*, which is not a hole: a permuted
subtree is not a deleted one, and it fails as its own added/removed pair.

**Scope.** Every entry carries a `range` of `<baselineSha>..<candidateSha>` naming
the comparison it belongs to. The file is per-repo but an entry describes ONE
batch, so without a scope an old batch's declarations sit here forever, reading
stale against every later baseline while still being load-bearing. Out-of-scope
entries are **inert** — reported so they can be pruned, never consuming a diff
they were not written for. Abbreviated shas in the config match full shas at
runtime, in both directions; a guard clause that demanded an exact match once
made every abbreviated entry silently inert, which is fixture Y1's whole job.

### The boundary: scripts are disabled

Pages are loaded with JavaScript off, so the certificate is over the **delivered
markup** — what the templates produced, parsed by a real browser.

This is a deliberate boundary, not a convenience. With scripts running, the DOM
carries animation state: the parallax writes `transform: translateY(-14.8212px)`
into inline styles, derived from *document height*. A restyle that compresses
line-height changes document height, so that value legitimately differs between
builds and between widths — 20 pages failed on nothing but fractional transform
deltas, and every page was flagged width-dependent for the same reason. An
instrument that cannot certify any restyle without noise is measuring its own
camera. Excluding the `style` attribute instead would have been laundering.

**Script-injected content is therefore outside what this vouches for**, and the
run refuses to be quiet about it: if the two builds' `js/` differs at all, the
report says the boundary was crossed rather than letting a reader infer a
guarantee the run cannot give.

One consequence worth stating plainly: with scripts off, the **width check is
very nearly vacuous** — both widths parse the same bytes, so they cannot differ
unless a `media` attribute changes what parses, and the fixture asserts that
vacuity rather than pretending otherwise. It is kept at essentially zero cost
because it would still catch genuinely width-conditional markup, and because a
JS-enabled mode would need it on day one: *under scripts the DOM really is
width-dependent*, which is what the first real run measured. Do not read a green
width result as evidence about a JS-enabled page.

Every whitelist entry must also **identify its node, not a family of nodes**. The
run refuses to start if an entry's `contains` matches more nodes than it
declares — a count is a budget, not an identity, and an entry held in check by
its count alone starts absorbing a different node the moment the intended one
stops changing. This is why the two Google preconnects are two entries keyed on
their exact hrefs rather than one entry matching the word `preconnect` (which
also matches the Cloudinary hint that must survive).

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
| G1–G2 | a uniform 300px translation reports scale exactly 1 and passes with honest coverage; a 6px local move *inside* it is still caught |
| G3 | a genuine section **reorder** is not laundered — neither the offset nor the *scale* bends to explain it, and the swap fails |
| G4 | an unchanged page reports scale exactly 1 and offset exactly 0 (ties resolve toward the identity) |
| G5 | the cross-width offset **and scale** gates: wild divergence and opposite directions are reported |
| G6 | progressive (leading-style) compression is now fitted at ~96% confidence with a 1px residual — the capability proof (it began life as a limitation lock under the constant-offset model, at 3% confidence and a 238px residual) |
| G9 | a local move *inside* an affinely compressed page is still caught as a residual — the case the scale degree of freedom could have laundered |
| G10 | a low-confidence fit fails with an explicit model-does-not-fit reason, and cannot be waived |
| R | pages built from **repeating texture**, the way real content is: a byte-identical comparison passes, and a real move inside that texture is still caught |
| M | the mutation battery itself — 13 deliberate defects, each of which must be detected |

Plus the config-validation cases covering the fail-open paths, and a runnable
mutation battery (below). 157 assertions.

**The suite needs an ambient git repository.** O4 and F4e shell out to the real
CLI against real refs (`HEAD`, `HEAD~1`), so from a `git archive` export or any
copy without `.git/` they fail with `fatal: not a git repository`. That is a
missing prerequisite, not a harness defect — run the tests from a clone.

O4 is the slow one: it builds two refs and captures a pass, because it is the
only way to prove the redirect check is *wired in* rather than merely correct.
Deleting the one line that calls it leaves every other fixture green.

#### The mutation battery is runnable, not a story

`MUTATIONS` in `visual-diff.test.mjs` breaks the instrument thirteen ways and
requires each break to be noticed. It mutates **copies** under `.visual-diff/`
rather than the working tree, so a killed run cannot leave a half-mutated file
behind, and it reuses screenshots the fixtures already rendered, so the whole
battery costs seconds. A mutation whose anchor no longer matches is a hard
failure, never a silent pass.

Two entries are marked **known-undetectable** and assert the reason they are
acceptable instead of the defect. That is deliberate: a battery that quietly
dropped the mutations it could not catch would be measuring its own optimism.

**Confidence is measured against ELIGIBLE rows** — those whose row signature is
distinctive enough to take part in the fit at all. Rows of repeating texture are
excluded from the fit, so counting them in the denominator measured how
*distinctive* a page is rather than how well the model fits it. That bug failed
byte-identical comparisons on five real pages, and because `minFitConfidence` is
unwaivable the harness could not return a clean run on the site at all. The
synthetic fixtures could never have caught it — every row of a synthetic page has
a unique signature. Hence the R family.

**If a fixture and a budget disagree, the fixture is right.** Renegotiate the
budget in the plan; never edit a fixture to make a run go green.

### What it does not do

It compares two builds of *this repo*. It does not check the live site, it does
not check whether the design is any good, and it does not click anything —
every capture is the page as it first loads, scrolled to the top. Interactive
states (open FAQ answers, opened modals, the lightbox) are not covered.

**Pinned motion is invisible.** Determinism is achieved by pinning every
scroll/time-dependent style (parallax offsets, the hero video's frame, reveal
transforms) to one settled state — which means a change to **parallax
magnitude**, video content, or reveal choreography reads as "no visual change"
no matter how large it is. If a batch deliberately retunes motion, it must be
reviewed by eye; this harness will pass it silently.

---

## rhythm — did the spacing system survive the deletions?

```bash
npm run build && npm run rhythm:test
```

The two harnesses above answer *did it move?* and *did it still say the same
thing?*. Between them sits a question neither can reach: **a deleted class and a
deleted class whose job nobody picked up look identical in a token stream.**
WP-1b deleted six spacing utilities, consolidated three percentage gutters into
one token, and relaxed the line-length cap. DOM-integrity happily certifies that
those class names left the markup. It cannot tell you the pages did not quietly
collapse.

So this measures **computed style in a real browser at both widths**, against the
real built stylesheet, and pins three things:

1. **The deletions were safe.** `.grid-3--mt-2/-3/-4`, `.heading--mb-2` and
   `.section--mt-8` supplied per-instance vertical space. After deletion every
   `.grid-3` takes the *one* system value (3rem) instead of three ad-hoc ones,
   and no site collapsed to zero separation — the failure mode that would
   otherwise surface as a layout bug months later with no failing test.
2. **`--gutter` really is one value.** 21 R1's premise is that `0 5%` resolved
   against three different parents and produced three gutters that looked like
   one rule. A token most elements use and some do not is that same bug wearing
   the fix's name, so every element in the container/section family is checked
   and the surviving deviations are **pinned to their rule, not waived**. Three
   percentage gutters survive WP-1b: `nav` (2.5%), `.page-hero` (5%), and — found
   by this suite — `@media (max-width: 768px) { section { padding: … 5% } }`,
   which reverts every bare section to a percentage gutter at the narrow width
   and flattens the three `--section-pad` tiers to one value. That last one is
   invisible from the desktop width, invisible to the DOM check (no markup
   changed) and invisible to the pixel harness (the batch was expected to move
   things). A *fourth* deviation fails the suite, and the count of three is
   asserted so that migrating one has to be a deliberate edit here.
3. **The line length is 70ch.** `.measure-wide` replaced four `text--*` utilities
   capped at 60ch and 65ch — a real change to how the site reads that no other
   gate sees (the pixel harness calls it "content moved", the DOM check calls it
   "a class was renamed"). Asserted at the token's declared value *and* asserted
   to be measurably wider than the 65ch it replaced, so it cannot pass by having
   never moved.

The heading-rhythm rules are measured against probe nodes injected into the real
page. That is deliberate: `* + h2` fires on exactly **one** element in the whole
built site, because almost every heading is the first child of its container.
Asserting only on live instances would leave four of the five documented rules
with no coverage and lose the fifth the moment a template changed. Live instances
are asserted too, wherever they exist.

Group M is the mutation battery: each mutation patches the **built** stylesheet
in a throwaway copy of `dist/` under `.rhythm/` (gitignored, never the working
tree) and must move the probe it aims at — a heading token, the gutter, the cap,
the grid margin. Anchors are asserted before patching, so an un-applied mutation
can never look like a pass.

Like `fonts.test.mjs` Group B this needs `npm run build` first, and it **says so
and exits 2** rather than passing vacuously.

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

### The Affine fit column

Every page pair gets one estimated **affine fit** — a scale and an offset, the
single map `candidateY = scale x baselineY + offset` that best explains where the
candidate's rows ended up — and every shift number in the report is the
*residual* against it:

```
localShift(row) = candidateY - (scale x baselineY + offset)
```

This exists because the matcher used to read uniform movement as chaos. When a
leading change moved every row on a page, coverage collapsed to 0.171 on content
that was provably identical — the instrument calling a restyle "unmatchable",
which is a measurement failure rather than a finding.

So the questions are separated. **"The whole page moved or compressed together"**
shows up as the fit. **"Things moved relative to each other"** shows up as
shift. Only the second is a layout regression.

- A page that slid up 300px reports `x1.0000 -300px` and residuals of zero.
- A page whose leading went 1.8 to 1.65 reports about `x0.9388 +0px` and
  residuals of zero, because that is what a leading change does to geometry: it
  compresses progressively rather than translating. (The text ratio is 0.9167;
  padding and borders do not scale, which pulls the page's effective scale
  toward 1.)
- A 6px button move inside **either** of those still reports a 6px residual and
  still fails the 4px budget.

The scale is bounded to **[0.8, 1.05]**. A leading change compresses modestly; a
page that "scaled" to 0.5 is not a restyle, it is different content, and no fit
may claim otherwise.

#### How much of the page the fit explains

Beside the fit the report shows a **percentage**: how many rows the fit actually
accounts for. This is the instrument's own confidence, and a fit below
`minFitConfidence` **fails the run** with an explicit *model-does-not-fit*
message rather than reporting residuals against a fit that does not hold. That
check cannot be waived and cannot be overridden per page — if the harness cannot
describe what happened to a page, that is a conversation, not a config line.

| Fit explains | Reading |
|---|---|
| near 100% | the fit describes the page; trust the residuals beside it |
| low | no single scale-and-offset fits; the shift numbers are residuals against nothing and are not evidence |

#### Why it cannot launder a reorder or a local move

The fit is chosen by a **vote** — a 2-D consensus over (scale, offset) — not a
mean and not a least-squares pass over everything. Three properties do the work:

1. **Voting rewards concentration.** For a fixed scale, every row contributes an
   offset to a histogram and the winner is the most populous bucket. Tilting the
   scale *spreads* a constant group rather than merging two of them, so the vote
   cannot buy agreement by tilting.
2. **The shift number is a *spread*, not a largest-absolute-value.** This is the
   one that matters. A fit with a scale is free to *tilt*, and tilting can merge
   two groups of rows rather than just spreading them: a page that compressed
   *and* gained a 6px step was fitted 0.0013 off the honest scale, turning
   residuals of `{0, +6}` into `{-3, +3}` — largest absolute residual 3px, under
   the 4px budget, real regression gone green. Measured, not hypothesised. The
   spread of `{0, +6}` and of `{-3, +3}` is 6 either way, because a spread has no
   origin for the fit to slide. Refitting also uses a hard 2px inlier tolerance
   as a second line of defence.
3. **The scale band** stops an extreme fit mapping arbitrary content onto
   arbitrary content.

A reordered page has no honest fit: the swapped sections are a minority, they are
outvoted rather than absorbed, and they surface as large residuals. There are
fixtures for all of this, and breaking any of the three turns them red.

The fit is also gated across the two capture widths of one page — see
`maxOffsetDivergencePx` and `maxScaleDivergence`. Both widths render from one
stylesheet, so they should compress by a comparable ratio; a page may compress,
but the widths may not disagree wildly about how much, or move in opposite
directions, without that being visible.

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

> **The asset cache is cleared at the start of every build** (an
> `eleventy.before` hook), so under `npx @11ty/eleventy --serve` (`npm run dev`)
> an edit to `styles.css` or any `js/*` file MUST appear in the served output on
> the next rebuild, with a fresh stamp. **If a dev-server page ever seems to be
> ignoring a CSS/JS edit, do NOT shrug and restart the server — that symptom
> means the `eleventy.before` cache-clear in `.eleventy.js` has regressed.**
> The machine check for that regression is `npm run build-cache:test` — it
> drives two builds through Eleventy's programmatic API and goes red if the
> cache-clear is removed (the stamp-vs-served check below stays green even in
> the broken state, since both sides serve the same stale buffer — it is
> necessary but not sufficient). Treat stale dev CSS as a build bug, always.

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
