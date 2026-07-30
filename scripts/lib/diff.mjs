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
 */
import fs from 'node:fs';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const EDGE_THRESHOLD = 24;   // luminance step that counts as an edge
const X_QUANT = 2;           // x quantised to 4px buckets (>> 2)
const SEARCH_WINDOW = 240;   // max vertical displacement we will look for, px

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

/**
 * Structural vertical displacement between two images.
 * Returns { p99, max, matchedRows, coverage }.
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

  const offsets = [];
  let candidateRows = 0;
  for (let y = 0; y < a.length; y++) {
    if (!a[y]) continue;
    candidateRows += 1;
    const hits = index.get(a[y]);
    if (!hits) continue;
    let best = null;
    for (const cy of hits) {
      const d = cy - y;
      if (Math.abs(d) > SEARCH_WINDOW) continue;
      if (best === null || Math.abs(d) < Math.abs(best)) best = d;
    }
    if (best !== null) offsets.push(Math.abs(best));
  }

  const sorted = offsets.slice().sort((x, y) => x - y);
  return {
    p99: percentile(sorted, 99),
    max: sorted.length ? sorted[sorted.length - 1] : 0,
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
