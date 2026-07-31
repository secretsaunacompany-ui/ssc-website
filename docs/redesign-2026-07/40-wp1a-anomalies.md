# WP-1a — named anomalies, investigated

**Investigation only. No code changed, nothing committed.** Working tree clean at `7d00ade`
(plus the three harness commits `3f736a2`/`409483e`/`7b4974f` on top, which touch `scripts/` only).

**Artifacts under examination:** `.visual-diff/report.json`, generated `2026-07-31T07:36:11Z`,
baseline `4dc8716` (verified genuinely pre-WP-1a: no `dist/fonts/`, no `--text-4xl` in its
stylesheet), candidate `7b4974f` (verified: has both). Correct pairing.

**Verdict up front: no defects found.** All four items resolve as intended consequences or
pre-existing conditions. One genuinely new condition (h1 ink overhang) is benign and explained
below. One thing to fix in the fix round (§4).

---

## 0. A measurement caveat that matters for reading everything below

An early probe of mine disagreed with `report.json` on page heights (e.g. `/privacy/@1440`
−217px vs the report's −130px). The report is right and my probe was wrong: it read
`document.body.scrollHeight` at `networkidle` **without** the capture pipeline's reveal-settling
(scroll to bottom, let IntersectionObserver fire, return to top). Un-settled `.fade-in` /
`.slide-up` blocks still carry their transform, so layout differs.

**Everything below is measured from the captured PNGs** (`.visual-diff/{baseline,candidate}/shots/`)
or from DOM probes that replicate the settle. PNG heights reconcile with `report.json` exactly.

---

## 1. `/privacy/` divergence — **intended consequence, no defect. The premise is a metric misreading.**

### The claim, restated correctly

The brief reads "+6px at 1440 while −108px at 390" as a height divergence. Those two numbers are
`globalOffsetPx`, not height. Actual heights fell at **both** widths:

| `/privacy/` | `heightDeltaPx` | `globalOffsetPx` | `globalScale` | fit confidence |
|---|---|---|---|---|
| @1440 | **−130** | +6 | **0.9513** | 1.00 |
| @390 | **−165** | −108 | 0.9940 | 0.61 |

Nothing grew at either width. `globalOffsetPx` is the **intercept** of the fitted affine map
`y_cand ≈ scale·y_base + offset`; the compression lives in the **scale** term. The harness's own
header says so: *"A page whose leading went 1.8 → 1.65 reports scale ~0.917 and residuals of
zero, because that is what a leading change actually does to geometry: it compresses
progressively rather than translating."*

### Arithmetic check

`2777 × 0.9513 + 6 = 2648.6` vs candidate PNG height **2647**. The model reproduces the observed
height to 1.6px. A +6px intercept alongside a 0.951 slope is not 6px of growth anywhere; it is
where the best-fit line crosses `y=0` when the top ~10% of the page (nav + hero, fixed height,
does not compress) is flat and everything beneath it compresses.

### Direct evidence — offset vs depth, from the captured PNGs

Median matched-row offset by depth decile. **Monotonically negative at both widths; never positive
at any depth.**

```
/privacy/@1440  (PNG 2777 -> 2647)        /privacy/@390  (PNG 3870 -> 3705)
  0-10%    0px   (n=141)                    0-10%    0px   (n=45)
 20-30%  -27px                             10-20%  -21px
 40-50%  -59px                             20-30%  -25px
 50-60%  -78px                             30-40%  -49px
 60-70%  -99px                             40-50%  -81px
 70-80% -106px                             60-70% -112px
 80-90% -112px                             70-80% -125px  (n=154)
90-100% -113px                             80-90% -140px
                                          90-100% -159px
```

### Per-element confirmation

Baseline vs candidate, same measurement method both sides, `/privacy/`:

- **77 elements both sides**, sequence never diverges (no content added, removed or reordered).
- **Elements that grew taller: 0 at 1440. 0 at 390.**
- The only downward movement anywhere is `ul.nav-links` **+2px at 1440** — the nav row re-centres
  because `.nav-links a` went 1.1rem → 14px inside a flex row of fixed-height chrome.

### Classification

**Intended.** Authorising rows in `11-beatrice-typography.md`:

| What | Token | Authority |
|---|---|---|
| Page-wide compression | `--leading-body` (1.65) | §2 line-height block; §5 *"Body: `line-height: var(--leading-body)` (1.65) replaces 1.8 at styles.css:101"* |
| Nav row re-centre (+2px) | `--text-sm` | §2 step→role table, `--text-sm` row: *".nav-links a 1.1rem → 14px per §4"*; §4 *"Nav, quieted"* |

Why 1440 and 390 decompose differently: at 1440 `/privacy/` is a near-pure text column, so the fit
is dominated by compression (scale 0.951, confidence 1.00). At 390 the same content wraps into a
narrow column where fixed-height chrome is a larger fraction of the page, and the estimator has
fewer distinctive full-width edge rows to vote with (confidence 0.61, 272 inliers of 449 eligible)
— so it lands on a mostly-translation fit (scale 0.994, offset −108) instead. Same physical change,
two different best-fit decompositions of it. That is estimator behaviour, not page behaviour.

---

## 2. Shift outliers at 390 — **intended kind. Nothing overlaps, clips or vanishes.**

`/about/@390` (426), `/saunas/@390` (414), `/gallery/@390` (same page via the declared redirect,
identical numbers), `/@390` (333).

### 2a. Safety audit — the question that actually matters

DOM audit at 390 on all three distinct pages, baseline vs candidate, with reveals settled:

| | `/about/` | `/saunas/` | `/` |
|---|---|---|---|
| text length | 3109 → 3109 (**Δ0**) | 4140 → 4140 (**Δ0**) | 3462 → 3462 (**Δ0**) |
| visible text nodes | 161 → 161 | 271 → 271 | 185 → 185 |
| zero-size text els | 114 → 114 | 114 → 114 | 114 → 114 |
| horizontal overflow | 1 → 1 | 1 → 1 | 1 → 1 |
| clipped by `overflow:hidden` | 1 → 1 | 1 → 1 | 1 → 1 |
| offscreen | 6 → 6 | 6 → 6 | 4 → 4 |
| overlapping text boxes | 1 → 1 | 1 → 1 | 1 → 1 |

**Every category is identical to baseline.** Nothing was introduced. For completeness, the
non-zero pre-existing entries are benign and present on both sides:

- `a.skip-to-content` — the off-screen skip link at `left:-9999px`; its "overflow" and "clipped"
  flags are that design, unchanged.
- `button.mobile-menu-btn` overlapping a text block by ~22×16px — pre-existing on both sides.
- offscreen `h3`/`p` at `L−11 R340` and `th` at `L291 R409` — negative-margin blocks and the
  horizontally-scrollable compare table. Same count both sides.

Content parity is exact. **Nothing vanished, nothing became unreachable.**

### 2b. The Ö-clip class — one NEW condition, benign

`inkClip` went **0 → 1** on each page: the `h1` ink extends above its line box.

| page | h1 | ink above line box |
|---|---|---|
| `/about/` | "About Us" | 2.0px @390, 3.0px @1440 |
| `/saunas/` | "Our Saunas" | 2.0px @390 |
| `/` | "Authentic Finnish Saunas" | 2.0px @390 |

This is `--leading-display` 1.12 against Cormorant's ascender, and it matches the 3px I measured
pre-batch at 64px. It does **not** clip:

- Full ancestor chain is `overflow: visible` — `section.page-hero` → `div.page` → `main`. Nothing
  can crop it. (The audit's `clipped` count stayed 1→1, the skip link.)
- Nothing renders above it: probe for any text box whose bottom lands within 30px above the h1
  returns `null` on every page. The overhang extends into empty hero space.
- **No `h1` anywhere on the site contains a diacritic.** The only heading with one is
  `<h3>Proper löyly</h3>`, lowercase `ö`, at `--leading-subhead` 1.35 — measured unclipped at both
  widths (ink 1–2px *inside* its box).

Doc 11 §9's remedy (bump that element to `line-height: 1.18`) stays available and unspent. It
becomes necessary only if a display line ever gets a capital **Ö/Ä/Å** *and* sits directly beneath
another line. Neither condition holds today. **No change recommended** — spending it now would move
every h1 site-wide for a hypothetical.

### 2c. Why the residuals are large — and it is NOT re-wrap

I tested the re-wrap hypothesis and **the measurement does not support it.** Line-box counts at 390:

| page | line boxes base → cand | blocks whose line count changed |
|---|---|---|
| `/saunas/` | 144 → 143 | 1 |
| `/about/` | 80 → 80 | **0** |
| `/privacy/` | 78 → 78 | **0** |

Text is re-setting, but it is **not re-wrapping** into different line counts. So re-wrap is not the
driver. The actual mechanism, from the offset-vs-depth curve on `/saunas/@390` (PNG 15723 → 15269):

```
  y      0   median    0px
  y   1572   median  -76px      progressive compression
  y   3931   median -188px      (text region: leading 1.8 -> 1.65)
  y   5503   median -250px
  y   7075   median -329px
  y   8648   median -385px
  y  10220   median -414px  <-- compression ends
  y  11006   median -414px
  y  11792   median -413px      FLAT TAIL, ~40% of the page:
  y  12578   median -414px      fixed-height media + compare table
  y  13365   median -413px      translate rigidly, they do not compress
  y  14151   median -413px
```

The true mapping is **piecewise**: sloped through text, flat through fixed-height content (27
images plus the compare table on this page). A single scale+offset line cannot fit both regions.
The estimator's vote histogram is dominated by the flat tail (600–650 rows per bucket there versus
10–93 up top), so it fits the tail — reporting `scale 1.0, offset −414` — and every row in the
compressing upper page becomes a residual of up to 414px.

That is why **`layoutShiftMaxPx` ≈ |`globalOffsetPx`| ≈ |`heightDeltaPx`| on every outlier**, which
is not a coincidence:

| page @390 | shift | offset | heightΔ |
|---|---|---|---|
| `/saunas/`, `/gallery/` | 414 | −414 | −454 |
| `/about/`, `/process/` | 426 | −154 | −200 |
| `/` | 333 | −82 | −240 |

The two absurd buckets in the raw curve (median +626 at n=4; −3037 at n=7) are tiny-sample
mismatches against repeating texture, three orders of magnitude below the confident buckets in
row count. Noise.

**Classification: intended kind — same content, tighter, plus fixed-height media that legitimately
refuses to compress.** The instrument is reporting a real geometric fact it has no model for. No
defect.

---

## 3. Fonts rendering — **confirmed in the captured screenshots**

Not merely live: measured and eyeballed in the PNGs the report was computed from.

**Cormorant, `/about/@1440` h1 "About Us"** — ink bbox `x 603–834` (w 232), `y 202–248` (h 47),
centred on 718.5 against a 720 viewport centre. Crops written for review:
`assets/40-wp1a-anomalies/crop-h1-baseline-1440.png` and `assets/40-wp1a-anomalies/crop-h1-candidate-1440.png`.

- Ink width **232** against browser advance widths at 64px: Cormorant **244** (Δ12), Georgia 247
  (Δ15), Arial 263 (Δ31). Ink is always narrower than advance by side bearings, so 232↔244 is
  consistent; Arial is excluded.
- Ink coverage **17.7%** of the bbox — the low density of a high-contrast hairline serif. A
  grotesque at the same cap height is markedly denser.
- Visual: unmistakably Cormorant. Hairline bowls on `o`/`b`, fine bracketed serifs, small x-height
  against cap height, the thin-left/thick-right `A`, thin-stemmed `U`. None of the Arial tells
  (uniform stroke, angled `e`/`s`/`c` terminals). Not Georgia either — Georgia's x-height is far
  larger and its serifs heavier and lower-contrast.
- **Baseline and candidate crops are glyph-identical.** Correct: baseline served Cormorant from
  Google, candidate serves the same face self-hosted. The swap is invisible, which is the goal.

**Outfit** — `assets/40-wp1a-anomalies/crop-nav-candidate.png` (nav band, y 46–88) and
`assets/40-wp1a-anomalies/crop-body-candidate.png` (paragraph, y 584–645).

- Nav computes `Outfit / 14px / letter-spacing 1.96px` — exactly `--text-sm` and
  `--tracking-caps` (0.14em × 14px = 1.96px). Renders small, spaced and quiet; "BOOK" in ember.
- Body computes `Outfit / 16px / weight 400 / line-height 26.4px` — `--text-base` at
  `--leading-body` 1.65 exactly.
- Visual: circular geometric bowls, wide apertures, uniform stroke. No Arial terminals anywhere.

**No Arial-shaped fallback anywhere on either page, at either width.** Consistent with the fonts
suite, which independently intercepts the network (both woff2 fetched, zero Google origins
contacted) and measures a rendered glyph against both Arial and Georgia.

---

## 4. `fonts:test` cannot self-run from a clean checkout — **yes, fixing in the fix round**

Razor is right. `scripts/fonts.test.mjs` Group B drives Chromium against `dist/`, and on a clean
checkout `dist/` does not exist, so it prints "run `npm run build` first" and exits 1. Every other
suite in the repo is self-sufficient.

No reason not to fix it. Planned fix (**not applied now**): have the suite build `dist/` itself
when it is missing or stale, the way the other suites bootstrap what they need, rather than
documenting the prerequisite in `package.json`. Group A needs no build and should keep running
regardless, so a build failure reports as a Group B failure rather than killing the whole run.

Queued for the fix round alongside Razor's findings.

---

## Summary

| # | Item | Classification | Action |
|---|---|---|---|
| 1 | `/privacy/` "+6px at 1440" | **Not growth.** `globalOffsetPx` (fit intercept) misread as height; heights fell at both widths; 0 elements grew; offset-vs-depth monotonically negative | None — intended, per `--leading-body` and `--text-sm` |
| 2a | Overlap / clip / vanish at 390 | **None introduced.** Every category identical to baseline; text length Δ0 on all pages | None |
| 2b | h1 ink 2–3px above line box | **New but benign.** All ancestors `overflow:visible`, nothing above it, no h1 has diacritics | None — doc 11 §9 remedy held in reserve |
| 2c | 333–426px residuals | **Instrument.** Piecewise geometry (text compresses, media does not); estimator fits the flat tail. Re-wrap tested and *excluded* | None |
| 3 | Fonts in screenshots | **Confirmed.** Cormorant and Outfit both rendering; baseline/candidate glyph-identical; no fallback | None |
| 4 | `fonts:test` needs a prior build | **Real gap** | Fix round — yes |

**Defects for the fix round: one — item 4.** Nothing in items 1–3 requires a code change.
