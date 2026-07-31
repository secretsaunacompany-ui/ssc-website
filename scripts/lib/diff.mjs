/**
 * Image comparison.
 *
 * Two numbers come out of every page pair, and they answer different questions:
 *
 *   changedPct   - how much of the page looks different at all. A colour-ramp
 *                  or type change lights this up everywhere by design, so it is
 *                  a "did anything change" signal, not a pass/fail one.
 *
 *   layoutShiftPx - how far things MOVED. This is the number the acceptance
 *                  criterion is written against ("no layout shift greater than
 *                  8px"). It is computed by structural row matching, not colour
 *                  comparison, so a pure recolour scores ~0 shift while a 4px
 *                  padding change scores 4.
 *
 * How the shift metric works: each row of pixels is reduced to a signature of
 * where its horizontal luminance edges are, quantised to 4px buckets. That
 * signature survives a colour change (the edges stay in the same places) but
 * moves with the row when layout shifts. Matching baseline rows to candidate
 * rows by signature and taking the vertical displacement gives a real
 * displacement distribution, and the 99th percentile of it is the gate.
 * p99 rather than max, because a single coincidental row match on a page with
 * repeating texture would otherwise produce a false failure.
 *
 * GLOBAL OFFSET (2026-07-30). The matcher used to measure displacement against
 * a fixed origin, so a page that moved *as a whole* looked like chaos: WP-1a's
 * leading change compressed pages by 83–454px, every row slid past the 240px
 * search window, and coverage collapsed to 0.171 on content that was provably
 * identical. The instrument was calling a uniform translation "unmatchable",
 * which is a measurement failure, not a finding.
 *
 * So each page pair now gets ONE estimated global vertical offset, and every
 * local shift is measured RELATIVE to it:
 *
 *     localShift(row) = (candidateY - baselineY) - globalOffset
 *
 * A page that slid up 300px reports globalOffset -300 and local shifts of zero.
 * A 6px button move inside a page that slid 300px still reports a 6px local
 * shift and still fails the 4px budget. The offset is reported and gated on its
 * own terms rather than folded into the shift number, because "everything moved
 * together" and "things moved relative to each other" are different findings
 * and only one of them is a layout regression.
 *
 * What this deliberately does NOT do is launder a reorder as a translation.
 * See estimateGlobalOffset for why the estimator is a vote rather than a mean.
 */
import fs from 'node:fs';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const EDGE_THRESHOLD = 24;   // luminance step that counts as an edge
const X_QUANT = 2;           // x quantised to 4px buckets (>> 2)
// Max LOCAL displacement we will look for, px — measured relative to the
// estimated global offset, not to zero. A row that ends up further than this
// from where the global offset predicts is left unmatched, which is what makes
// a reorder show up as collapsed coverage instead of a clean match.
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
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

function median(values) {
  if (values.length === 0) return 0;
  const s = values.slice().sort((x, y) => x - y);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}

/**
 * Estimate the single vertical translation that best explains this page pair.
 *
 * The estimator is a VOTE, not a mean or a plain median of nearest matches, and
 * the difference is the whole safety property:
 *
 *   - A mean is dragged by outliers, so a handful of wildly relocated rows
 *     would move the estimate and start bending honest content into "explained
 *     by the offset".
 *   - A median of each row's NEAREST match is biased by whatever window you
 *     search in: with no window it picks up coincidental near matches, and with
 *     a window it cannot see the very displacement it is trying to estimate.
 *     That circularity is what the old matcher died of.
 *   - A vote asks every baseline row to name every candidate row carrying its
 *     signature, and takes the offset that the largest number of rows agree on.
 *     A uniform translation makes every row vote for the same bucket and wins
 *     decisively. A REORDER makes the moved sections vote for their own
 *     offsets, but they are outvoted by the rest of the page, so the estimate
 *     stays honest and the moved rows show up as large local shifts. Absorbing
 *     a reorder would require the reordered content to outvote everything else,
 *     and in that case the page really has moved as a whole and the remaining
 *     content becomes the anomaly instead. Either way something is loud.
 *
 * The winning bucket is refined to the median of the votes inside it, so the
 * reported offset is a real displacement rather than a bucket centre. Ties
 * resolve toward zero: an unchanged page must report 0, never ±BUCKET.
 *
 * @returns {{ offset: number, votes: number, totalVotes: number }}
 */
export function estimateGlobalOffset(a, index) {
  const buckets = new Map();   // bucket -> count
  const samples = new Map();   // bucket -> displacements

  for (let y = 0; y < a.length; y++) {
    if (!a[y]) continue;
    const hits = index.get(a[y]);
    if (!hits || hits.length > MAX_SIGNATURE_HITS) continue;
    for (const cy of hits) {
      const d = cy - y;
      const bucket = Math.round(d / OFFSET_BUCKET);
      buckets.set(bucket, (buckets.get(bucket) || 0) + 1);
      let s = samples.get(bucket);
      if (!s) { s = []; samples.set(bucket, s); }
      s.push(d);
    }
  }

  let winner = null;
  let best = 0;
  let totalVotes = 0;
  for (const [bucket, count] of buckets) {
    totalVotes += count;
    // Strictly-greater keeps the FIRST best seen; the |bucket| comparison then
    // breaks exact ties toward zero, so an unchanged page cannot drift.
    if (count > best || (count === best && Math.abs(bucket) < Math.abs(winner))) {
      winner = bucket;
      best = count;
    }
  }
  if (winner === null) return { offset: 0, votes: 0, totalVotes: 0 };

  return { offset: median(samples.get(winner)), votes: best, totalVotes };
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

  const global = estimateGlobalOffset(a, index);

  const offsets = [];
  let candidateRows = 0;
  for (let y = 0; y < a.length; y++) {
    if (!a[y]) continue;
    candidateRows += 1;
    const hits = index.get(a[y]);
    if (!hits) continue;
    let best = null;
    for (const cy of hits) {
      // Local displacement: how far this row sits from where the page's own
      // global translation says it should be. The window is applied HERE, to
      // the local residual, not to the raw displacement — that is the change.
      const local = (cy - y) - global.offset;
      if (Math.abs(local) > SEARCH_WINDOW) continue;
      if (best === null || Math.abs(local) < Math.abs(best)) best = local;
    }
    if (best !== null) offsets.push(Math.abs(best));
  }

  const sorted = offsets.slice().sort((x, y) => x - y);
  return {
    p99: percentile(sorted, 99),
    max: sorted.length ? sorted[sorted.length - 1] : 0,
    globalOffset: global.offset,
    globalOffsetVotes: global.votes,
    // What fraction of the structured baseline rows agreed on the offset. A
    // confident uniform translation sits near 1; a page held together by a
    // minority agreement is worth a human look even if coverage is fine.
    globalOffsetConfidence: candidateRows ? global.votes / candidateRows : 0,
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
    globalOffsetVotes: shift.globalOffsetVotes,
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
