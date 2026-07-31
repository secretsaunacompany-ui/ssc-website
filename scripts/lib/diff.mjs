/**
 * Image comparison.
 *
 * Two numbers come out of every page pair, and they answer different questions:
 *
 *   changedPct   - how much of the page looks different at all. A colour-ramp
 *                  or type change lights this up everywhere by design, so it is
 *                  a "did anything change" signal, not a pass/fail one.
 *
 *   layoutShiftPx - how far things MOVED RELATIVE TO EACH OTHER. This is the
 *                  number the acceptance criterion is written against (4px at
 *                  the time of writing; lib/gate.mjs holds the budget). It is
 *                  computed by structural row matching, not colour comparison,
 *                  so a pure recolour scores ~0 shift while a 4px padding
 *                  change scores 4.
 *
 * How the shift metric works: each row of pixels is reduced to a signature of
 * where its horizontal luminance edges are, quantised to 4px buckets. That
 * signature survives a colour change (the edges stay in the same places) but
 * moves with the row when layout shifts. Matching baseline rows to candidate
 * rows by signature and taking the vertical displacement gives a real
 * displacement distribution. The gate reads the SPREAD of that distribution;
 * see the note above the spread calculation in layoutShift for why a spread
 * rather than a largest-absolute-value.
 *
 * AFFINE MATCHING (2026-07-30). The matcher used to measure displacement against
 * a fixed origin, so a page that moved *as a whole* looked like chaos: WP-1a's
 * leading change compressed pages by 83–454px, every row slid past the 240px
 * search window, and coverage collapsed to 0.171 on content that was provably
 * identical. The instrument was calling a uniform translation "unmatchable",
 * which is a measurement failure, not a finding.
 *
 * So each page pair now gets ONE estimated affine map — a scale and an offset —
 * and every local shift is the RESIDUAL against it:
 *
 *     localShift(row) = candidateY - (scale * baselineY + offset)
 *
 * A page that slid up 300px reports scale 1, offset -300, and residuals of zero.
 * A page whose leading went 1.8 -> 1.65 reports scale ~0.917 and residuals of
 * zero, because that is what a leading change actually does to geometry: it
 * compresses progressively rather than translating. A 6px button move inside
 * either of those still reports a 6px residual and still fails the 4px budget.
 * The fit is reported and gated on its own terms rather than folded into the
 * shift number, because "the whole page moved or compressed together" and
 * "things moved relative to each other" are different findings and only one of
 * them is a layout regression.
 *
 * The scale started as a constant-offset-only model (scale fixed at 1). That
 * version fitted a real leading change at 3% confidence and said so, which is
 * how this extension came to be specified.
 *
 * What this deliberately does NOT do is launder a reorder as a compression.
 * See estimateAffine for why the estimator is a vote rather than a mean, and
 * the spread note in layoutShift for why the tilt an affine fit is free to make
 * cannot shrink a real displacement.
 */
import fs from 'node:fs';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const EDGE_THRESHOLD = 24;   // luminance step that counts as an edge
const X_QUANT = 2;           // x quantised to 4px buckets (>> 2)
// Max LOCAL displacement we will look for, px — measured as a residual against
// the estimated affine fit, not from zero. A row that ends up further than this
// from where the fit predicts is left unmatched, which is what makes a reorder
// show up as collapsed coverage instead of a clean match.
const SEARCH_WINDOW = 240;

// A signature appearing more often than this is not distinctive (repeating
// texture, rule lines, flat borders). Such rows would cast a vote for every
// possible offset and drown the histogram in noise, so they are excluded from
// the estimate. They are still MATCHED normally afterwards.
const MAX_SIGNATURE_HITS = 64;

// Vote histogram bucket, px. Sub-pixel rendering and hinting mean a uniformly
// translated page does not translate by exactly one integer everywhere; 2px
// buckets absorb that without blurring genuinely different offsets together.
const OFFSET_BUCKET = 2;

// Scale band for the affine fit. A leading change compresses modestly — 1.8 to
// 1.65 is a ratio of 0.917 — so anything outside this band is not a restyle,
// it is different content, and no fit may claim otherwise. The grid is built
// from SCALE_MIN in SCALE_STEP increments and 1.0 must land on it exactly, or
// an unchanged page could not score the identity: 0.8 + 200*0.001 = 1.0.
const SCALE_MIN = 0.8;
const SCALE_MAX = 1.05;
const SCALE_STEP = 0.001;

// Hard inlier tolerance for the refit, px. Deliberately below the shift budget
// the gate enforces, so the refit cannot pull a real local move into the model.
//
// HONESTY NOTE, because it would otherwise read as load-bearing: since the
// shift metric became the SPREAD of signed residuals (see layoutShift), this
// constant is defence in depth rather than the thing that stops laundering.
// Loosening it to 24 leaves the whole suite green, and that is not a coverage
// gap I could close with an honest fixture — it is the correct consequence of
// the spread being invariant to how far the fit tilts. The tilt is what a loose
// tolerance buys, and the tilt no longer changes the verdict. Tightness here
// still keeps the REPORTED scale close to the page's honest compression, which
// matters for the cross-width scale-divergence gate. Do not loosen it on the
// grounds that the tests do not notice.
const FIT_TOLERANCE = 2;
const REFINE_PASSES = 4;

// Tolerance for the CONFIDENCE figure, px — deliberately much looser than the
// refit's, because the two answer different questions.
//
//   FIT_TOLERANCE (tight)  "which rows may influence the fit?" Tight, so a real
//                          local move stays an outlier and cannot tilt the model.
//   this one (loose)       "does an affine map describe this page AT ALL?"
//
// Using the tight tolerance for both conflated the two: a page with a genuine
// 6px regression split into two groups either side of the moved element, so
// only ~47% of rows were inliers and the instrument announced "model does not
// fit" for a page the model describes perfectly well apart from the very
// regression we want reported. A real regression must fail on the SHIFT gate,
// with its size named — not be dismissed as unmeasurable.
//
// 24px = six times the shift budget: loose enough that any residual a human
// would call "a layout shift" still counts as explained by the model, tight
// enough that a page the model genuinely cannot describe (replaced content, a
// reorder, an out-of-band scale) still collapses.
const FIT_CONFIDENCE_TOLERANCE = 24;

export function readPng(file) {
  return PNG.sync.read(fs.readFileSync(file));
}

/** Pad an image onto a white canvas of the given size. */
function pad(png, width, height) {
  if (png.width === width && png.height === height) return png;
  const out = new PNG({ width, height });
  out.data.fill(255);
  PNG.bitblt(png, out, 0, 0, Math.min(png.width, width), Math.min(png.height, height), 0, 0);
  return out;
}

function rowSignatures(png) {
  const { width, height, data } = png;
  const sigs = new Array(height);
  const lum = (idx) => (data[idx] * 299 + data[idx + 1] * 587 + data[idx + 2] * 114) / 1000;

  for (let y = 0; y < height; y++) {
    const base = y * width * 4;
    let prev = lum(base);
    const edges = [];
    let last = -1;
    for (let x = 1; x < width; x++) {
      const l = lum(base + x * 4);
      if (Math.abs(l - prev) > EDGE_THRESHOLD) {
        const q = x >> X_QUANT;
        if (q !== last) { edges.push(q); last = q; }
      }
      prev = l;
    }
    // Rows with almost no structure (flat colour bands) are skipped: they match
    // everywhere and would contribute noise, not signal.
    sigs[y] = edges.length >= 2 ? edges.join(',') : null;
  }
  return sigs;
}

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor((p / 100) * sorted.length)));
  return sorted[idx];
}

/**
 * Estimate the AFFINE map `candidateY ≈ scale * baselineY + offset` that best
 * explains this page pair.
 *
 * Why affine and not a constant offset. The constant-offset model landed first
 * and honestly reported its own limit: a line-height change does not translate
 * a page, it compresses it PROGRESSIVELY — the first row barely moves, the last
 * moves by the full height delta. Measured on a synthetic 1.8→1.65 page, a
 * single offset fitted at 3% confidence. Affine is the actual geometry of the
 * change: every row's position scales by the leading ratio, plus a constant for
 * the unscaled furniture above it. Pure translation is simply `scale === 1`, so
 * there is ONE model and one code path — no confidence threshold deciding which
 * model to use, and therefore no cliff to tune and no mode to get wrong.
 *
 * The estimator is the same VOTE as before, one dimension up: a 2-D consensus
 * over (scale, offset) rather than a 1-D histogram over offset. Everything the
 * 1-D vote bought is preserved, and the reasoning is unchanged —
 *
 *   - a mean is dragged by outliers, so it would bend honest content into
 *     "explained by the fit";
 *   - a nearest-match median is biased by the very window it is trying to see
 *     past, which is the circularity the original matcher died of;
 *   - a vote lets a MINORITY be outvoted rather than absorbed.
 *
 * Three properties do the anti-laundering work, and each is fixture-backed:
 *
 *   1. VOTING REWARDS CONCENTRATION. For a fixed scale, every correspondence
 *      contributes `offset = cy - scale*y` to a histogram, and the winner is the
 *      most populous bucket. A page with a 6px step in the middle is two
 *      constant groups; each group concentrates ONLY at its true scale, and
 *      tilting the scale SPREADS a constant group across buckets rather than
 *      merging the two. So the vote prefers the honest scale and the larger
 *      group — it cannot buy inliers by tilting.
 *   2. REFINEMENT USES A HARD, TIGHT TOLERANCE (FIT_TOLERANCE, below the gate's
 *      own budget). This is the important one. A least-squares fit over
 *      everything WOULD tilt to interpolate a 6px step and could drive the
 *      residual under the 4px budget — laundering the exact regression this
 *      harness exists to catch. Refitting only on hard inliers means the
 *      minority group stays an outlier and keeps its full residual.
 *   3. SCALE IS BOUNDED to [0.8, 1.05]. A leading change compresses modestly; a
 *      page that "scaled" to 0.5 is not a leading change, it is different
 *      content, and no fit should be able to claim otherwise.
 *
 * Ties resolve toward the identity (scale 1, offset 0), so an unchanged page
 * reports exactly a=1, b=0 rather than drifting to a neighbouring bucket.
 *
 * Deterministic by construction — a grid search plus a fixed number of
 * refinement passes, no sampling and no RNG, so a fixture cannot flake.
 *
 * @param {(string|null)[]} sigs   baseline row signatures, null where unstructured
 * @param {Map<string, number[]>} index  candidate signature -> row numbers
 * @returns {{ scale: number, offset: number, inliers: number,
 *             structuredRows: number, confidence: number }}
 */
export function estimateAffine(sigs, index) {
  // Correspondences. Non-distinctive signatures are excluded from the FIT for
  // the same reason as before: repeating texture matches everywhere, so it
  // votes for everything and decides nothing. Such rows are still MATCHED
  // afterwards, they just do not get to choose the model.
  const ys = [];
  const cys = [];
  let structuredRows = 0;
  let maxY = 1;
  let maxCY = 1;
  for (let y = 0; y < sigs.length; y++) {
    if (!sigs[y]) continue;
    structuredRows += 1;
    const hits = index.get(sigs[y]);
    if (!hits || hits.length > MAX_SIGNATURE_HITS) continue;
    for (const cy of hits) {
      ys.push(y); cys.push(cy);
      if (y > maxY) maxY = y;
      if (cy > maxCY) maxCY = cy;
    }
  }
  const identity = { scale: 1, offset: 0, inliers: 0, structuredRows, confidence: 0 };
  if (ys.length === 0) return identity;

  // Offset accumulator, indexed by bucket. An Int32Array with a touched-list
  // reset rather than a Map: this inner loop runs once per scale step per
  // correspondence, and Map churn dominated everything else.
  const bound = Math.ceil(maxCY + SCALE_MAX * maxY) + OFFSET_BUCKET;
  const bias = Math.ceil(bound / OFFSET_BUCKET);
  const acc = new Int32Array(2 * bias + 2);
  const touched = new Int32Array(ys.length);

  let bestCount = 0;
  let bestScale = 1;
  let bestOffset = 0;
  const steps = Math.round((SCALE_MAX - SCALE_MIN) / SCALE_STEP);

  for (let i = 0; i <= steps; i++) {
    // Built so that scale === 1 is exactly representable: an unchanged page must
    // be able to score the identity, not merely something near it.
    const scale = Number((SCALE_MIN + i * SCALE_STEP).toFixed(6));
    for (let k = 0; k < ys.length; k++) {
      const idx = Math.round((cys[k] - scale * ys[k]) / OFFSET_BUCKET) + bias;
      touched[k] = idx;
      acc[idx] += 1;
    }
    for (let k = 0; k < ys.length; k++) {
      const idx = touched[k];
      const count = acc[idx];
      if (count > bestCount) {
        bestCount = count;
        bestScale = scale;
        bestOffset = (idx - bias) * OFFSET_BUCKET;
      } else if (count === bestCount) {
        // Tie-break toward the identity, scale first: an unchanged page must
        // land on (1, 0) and not on whichever tied cell was visited last.
        const off = (idx - bias) * OFFSET_BUCKET;
        const better = Math.abs(scale - 1) < Math.abs(bestScale - 1)
          || (scale === bestScale && Math.abs(off) < Math.abs(bestOffset));
        if (better) { bestScale = scale; bestOffset = off; }
      }
    }
    for (let k = 0; k < ys.length; k++) acc[touched[k]] = 0;
  }

  // Count distinct baseline rows a candidate fit explains, so a row with several
  // candidate matches cannot inflate the count. `ys` is built in ascending y.
  const countRows = (s, o, tol) => {
    let rows = 0;
    let lastY = -1;
    for (let k = 0; k < ys.length; k++) {
      if (ys[k] === lastY) continue;
      if (Math.abs(cys[k] - (s * ys[k] + o)) > tol) continue;
      rows += 1; lastY = ys[k];
    }
    return rows;
  };

  // Refine on HARD inliers only. See property 2 above: a least-squares pass over
  // everything would tilt to interpolate a step and hide a real local move.
  let scale = bestScale;
  let offset = bestOffset;
  let held = countRows(scale, offset, FIT_TOLERANCE);
  for (let pass = 0; pass < REFINE_PASSES; pass++) {
    let n = 0, sx = 0, sy = 0, sxx = 0, sxy = 0;
    for (let k = 0; k < ys.length; k++) {
      if (Math.abs(cys[k] - (scale * ys[k] + offset)) > FIT_TOLERANCE) continue;
      n += 1; sx += ys[k]; sy += cys[k];
      sxx += ys[k] * ys[k]; sxy += ys[k] * cys[k];
    }
    if (n < 2) break;
    const denom = n * sxx - sx * sx;
    if (denom === 0) break;
    const nextScale = (n * sxy - sx * sy) / denom;
    const nextOffset = (sy - nextScale * sx) / n;
    // A refit that escapes the band is not a leading change; keep the voted fit
    // and let the residuals say so.
    if (!Number.isFinite(nextScale) || !Number.isFinite(nextOffset)) break;
    if (nextScale < SCALE_MIN || nextScale > SCALE_MAX) break;
    if (Math.abs(nextScale - scale) < 1e-9 && Math.abs(nextOffset - offset) < 1e-9) break;
    // Accept the refit only if it STRICTLY explains more rows. Least squares is
    // optimal for squared error, not for consensus, so on an unchanged page a
    // few coincidental near-diagonal matches would tilt it a whisker off the
    // identity — 0.99971 rather than 1, which is 1.5px of phantom drift over a
    // 5000px page and a scale nobody can justify. Monotone-improvement keeps the
    // simpler fit unless the data actually pays for the more complex one.
    const gained = countRows(nextScale, nextOffset, FIT_TOLERANCE);
    if (gained <= held) break;
    scale = nextScale;
    offset = nextOffset;
    held = gained;
  }

  // Snap a fit that is identity to within rounding onto exact identity, so an
  // unchanged page reports a=1, b=0 rather than 0.9999998 / -1e-13.
  if (Math.abs(scale - 1) < 1e-6) scale = 1;
  if (Math.abs(offset) < 1e-6) offset = 0;

  // Confidence answers "does an affine map describe this page", so it is
  // measured at the LOOSE tolerance. See FIT_CONFIDENCE_TOLERANCE.
  const inlierRows = countRows(scale, offset, FIT_CONFIDENCE_TOLERANCE);

  return {
    scale,
    offset,
    inliers: inlierRows,
    structuredRows,
    confidence: structuredRows ? inlierRows / structuredRows : 0,
  };
}

/**
 * Structural vertical displacement between two images.
 *
 * `p99` and `max` are LOCAL shifts — displacement relative to the page's own
 * global offset. `globalOffset` is reported separately and gated separately.
 */
export function layoutShift(basePng, candPng) {
  const a = rowSignatures(basePng);
  const b = rowSignatures(candPng);

  const index = new Map();
  for (let y = 0; y < b.length; y++) {
    if (!b[y]) continue;
    if (!index.has(b[y])) index.set(b[y], []);
    index.get(b[y]).push(y);
  }

  const fit = estimateAffine(a, index);

  const offsets = [];
  let candidateRows = 0;
  for (let y = 0; y < a.length; y++) {
    if (!a[y]) continue;
    candidateRows += 1;
    const hits = index.get(a[y]);
    if (!hits) continue;
    let best = null;
    for (const cy of hits) {
      // RESIDUAL: how far this row sits from where the page's own affine fit
      // says it should be. The window is applied HERE, to the residual, not to
      // the raw displacement. A row inside a page that compressed by 9% is at
      // residual ~0; a row that additionally moved 6px is at residual 6.
      const local = cy - (fit.scale * y + fit.offset);
      if (Math.abs(local) > SEARCH_WINDOW) continue;
      if (best === null || Math.abs(local) < Math.abs(best)) best = local;
    }
    if (best !== null) offsets.push(Math.round(best));
  }

  // The shift metric is the SPREAD of the signed residuals, not the largest
  // absolute one, and that distinction closes a laundering channel that a
  // fixture caught me shipping.
  //
  // Adding a scale degree of freedom means the fit can TILT. Tilting does not
  // merely spread a constant group as I first reasoned — it can also MERGE two
  // groups. A page that compressed AND gained a 6px step was fitted at a scale
  // 0.0013 off the honest one, which converted residuals of {0, +6} into
  // {-3, +3}: the largest absolute residual fell to 3px, under the 4px budget,
  // and a real 6px sitewide move went green. Measured, not hypothesised.
  //
  // The spread is invariant to that tilt — {0, +6} and {-3, +3} both span 6 —
  // because it measures what the gate actually cares about: how far things moved
  // RELATIVE TO EACH OTHER. An absolute residual is measured from an arbitrary
  // origin the fit is free to slide; a spread has no origin to slide.
  const sorted = offsets.slice().sort((x, y) => x - y);
  const spread = sorted.length ? sorted[sorted.length - 1] - sorted[0] : 0;
  // Robust spread: trims a single antialiasing outlier at either end rather
  // than letting it set the headline number.
  const robustSpread = sorted.length
    ? Math.max(0, percentile(sorted, 99) - percentile(sorted, 1)) : 0;
  return {
    p99: robustSpread,
    max: spread,
    globalOffset: Math.round(fit.offset),
    globalScale: fit.scale,
    globalFitInliers: fit.inliers,
    // What fraction of the structured baseline rows the fit actually explains.
    // A confident uniform translation or a clean leading change sits near 1; a
    // page held together by a minority agreement is worth a human look even if
    // coverage is fine, and a low-confidence fit is the instrument saying the
    // model does not describe this page rather than guessing.
    globalOffsetConfidence: fit.confidence,
    matchedRows: offsets.length,
    structuredRows: candidateRows,
    // `coverage` is only meaningful when the baseline had structure to match
    // against. A page of flat colour produces candidateRows === 0, and a
    // coverage of 0 there means "unmeasurable", not "everything moved". The
    // caller must distinguish the two, so say which it is rather than
    // collapsing both onto the number zero.
    measurable: candidateRows > 0,
    coverage: candidateRows ? offsets.length / candidateRows : 0,
  };
}

/**
 * Compare one baseline/candidate PNG pair.
 * Writes a diff image to `diffPath` when anything differs.
 */
export function comparePair(baselineFile, candidateFile, diffPath, shouldWriteDiff = () => true) {
  const base = readPng(baselineFile);
  const cand = readPng(candidateFile);

  const width = Math.max(base.width, cand.width);
  const height = Math.max(base.height, cand.height);
  const a = pad(base, width, height);
  const b = pad(cand, width, height);

  const diff = new PNG({ width, height });
  const changed = pixelmatch(a.data, b.data, diff.data, width, height, {
    threshold: 0.1,
    includeAA: false,
    alpha: 0.25,
  });

  const shift = layoutShift(base, cand);
  const result = {
    changedPixels: changed,
    changedPct: (changed / (width * height)) * 100,
    baselineSize: { width: base.width, height: base.height },
    candidateSize: { width: cand.width, height: cand.height },
    heightDeltaPx: cand.height - base.height,
    widthDeltaPx: cand.width - base.width,
    layoutShiftPx: shift.p99,
    layoutShiftMaxPx: shift.max,
    // Reported, never folded into the shift numbers above: "the whole page slid
    // 300px" and "things moved relative to each other" are different findings.
    globalOffsetPx: shift.globalOffset,
    globalScale: shift.globalScale,
    globalFitInliers: shift.globalFitInliers,
    globalOffsetConfidence: shift.globalOffsetConfidence,
    shiftCoverage: shift.coverage,
    shiftMeasurable: shift.measurable,
    shiftStructuredRows: shift.structuredRows,
    shiftMatchedRows: shift.matchedRows,
    diffImage: null,
  };

  if (changed > 0 && diffPath && shouldWriteDiff(result)) {
    fs.writeFileSync(diffPath, PNG.sync.write(diff));
    result.diffImage = diffPath;
  }
  return result;
}
