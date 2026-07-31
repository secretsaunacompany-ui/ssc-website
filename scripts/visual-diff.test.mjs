#!/usr/bin/env node
/**
 * Tests for the visual-diff harness.
 *
 * The harness is a fixture certifying a whole-stylesheet migration. If it is
 * wrong, every "no visual change" claim built on it is wrong too, and nobody
 * would find out until the site looked different in production. So it gets
 * tests of its own.
 *
 *   npm run visual-diff:test
 *
 * Three behavioural fixtures, each one a defect the harness actually shipped
 * with, plus a control and the config-validation cases:
 *
 *   F1  a 6px sitewide button move MUST fail        (it used to pass, at both widths)
 *   F2  a self-comparison MUST error                (it used to report PASS)
 *   F3  a fully-changed page MUST register          (it used to report zero shift)
 *   C   an unchanged page MUST pass                 (control: the gate is not just always-fail)
 *
 * F1, F3 and C render real HTML through the real capture pipeline
 * (lib/server.mjs + lib/capture.mjs), compare it with the real comparison
 * (lib/diff.mjs) and judge it with the real gate (lib/gate.mjs) reading the
 * real production budgets from visual-diff.config.json. The only production
 * step they do not exercise is lib/build-ref.mjs: the fixture pages are written
 * to disk directly instead of being produced by an Eleventy build from a git
 * ref. Nothing else is substituted, and no threshold is restated here.
 *
 * F2 shells out to the real CLI entry point, so it exercises everything.
 *
 * If a fixture and a budget ever disagree, the fixture is right and the budget
 * is renegotiated in the plan. Do not edit a fixture to make a run go green.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { startServer } from './lib/server.mjs';
import { captureAll, REVEAL_PIN_SELECTORS } from './lib/capture.mjs';
import { comparePair, estimateAffine } from './lib/diff.mjs';
import { loadConfig, evaluatePair, evaluateFitDivergence } from './lib/gate.mjs';
import { resolveRef } from './lib/build-ref.mjs';
import { comparePairs, tallyFailures, redirectFailures } from './visual-diff.mjs';

const REPO_ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const CONFIG_FILE = path.join(REPO_ROOT, 'scripts', 'visual-diff.config.json');
const WIDTH = 1440;

let failures = 0;
let passes = 0;

function check(name, condition, detail) {
  if (condition) { passes += 1; process.stdout.write(`  PASS  ${name}\n`); }
  else { failures += 1; process.stdout.write(`  FAIL  ${name}\n        ${detail}\n`); }
}

function expectThrows(name, fn, mustMention) {
  let msg = null;
  try { fn(); } catch (err) { msg = err.message; }
  if (msg === null) { failures += 1; process.stdout.write(`  FAIL  ${name}\n        expected an error, got none\n`); return; }
  if (mustMention && !msg.toLowerCase().includes(mustMention.toLowerCase())) {
    failures += 1;
    process.stdout.write(`  FAIL  ${name}\n        error did not mention "${mustMention}": ${msg}\n`);
    return;
  }
  passes += 1;
  process.stdout.write(`  PASS  ${name}\n`);
}

// ---------------------------------------------------------------- fixture pages

const SHELL = (body, extraCss = '') => `<!doctype html>
<html><head><meta charset="utf-8"><title>fixture</title><style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #0c0c0c; color: #e8e6e3; font: 16px/1.5 Helvetica, Arial, sans-serif; }
  .block { border-bottom: 1px solid #c4a57b; padding: 18px 24px; }
  .btn { display: inline-block; background: #c4a57b; color: #0c0c0c;
         padding: 12px 28px; font-weight: 700; border-radius: 2px; }
  ${extraCss}
</style></head><body>${body}</body></html>`;

/** Twenty distinguishable content rows, so row signatures have something to match. */
const CONTENT = Array.from({ length: 20 }, (_, i) =>
  `<div class="block">Row ${i} &mdash; ${'the quick brown fox jumps over the lazy dog. '.repeat(1 + (i % 3))}</div>`
).join('');

/** Baseline: a button near the top, then a long column of content beneath it. */
const PAGE_BASE = SHELL(`<div class="block"><a class="btn">Request a quote</a></div>${CONTENT}`);

/**
 * F1 candidate: the button is 6px taller (12px -> 15px vertical padding). Every
 * row below it moves down by exactly 6px. Nothing is recoloured, so a pixel
 * diff and a p99 shift both stay quiet -- which is precisely how this slipped
 * through before.
 */
const PAGE_BUTTON_MOVED = SHELL(
  `<div class="block"><a class="btn">Request a quote</a></div>${CONTENT}`,
  `.btn { padding-top: 15px; padding-bottom: 15px; }`);

/**
 * F1b candidate: the SAME 6px button growth, but on a button near the bottom,
 * so only the last few rows of the page move. This is the case that decides
 * whether the gate reads the maximum displacement or the 99th percentile: p99
 * discards the top 1% of rows, so a move confined to a small tail of the page
 * can be averaged into invisibility. The maximum cannot be.
 */
const PAGE_BUTTON_MOVED_TAIL = SHELL(
  `${CONTENT}<div class="block"><a class="btn">Request a quote</a></div>` +
  `<div class="block">Trailing row after the button</div>`,
  `.btn { padding-top: 15px; padding-bottom: 15px; }`);
const PAGE_BASE_TAIL = SHELL(
  `${CONTENT}<div class="block"><a class="btn">Request a quote</a></div>` +
  `<div class="block">Trailing row after the button</div>`);

/**
 * G-family fixtures: global-offset matching.
 *
 * A 300px spacer above the content, present in the baseline and absent in the
 * candidate, translates every content row up by exactly 300px — further than
 * the 240px search window, which is the point. Before global-offset matching
 * this scored near-zero coverage on identical content.
 */
const SPACER = '<div style="height:300px"></div>';
const PAGE_SPACED = SHELL(`${SPACER}<div class="block"><a class="btn">Request a quote</a></div>${CONTENT}`);
const PAGE_UNSPACED = SHELL(`<div class="block"><a class="btn">Request a quote</a></div>${CONTENT}`);

/** Uniform translation AND a local 6px growth: the local move must survive. */
const PAGE_UNSPACED_BUTTON_MOVED = SHELL(
  `<div class="block"><a class="btn">Request a quote</a></div>${CONTENT}`,
  `.btn { padding-top: 15px; padding-bottom: 15px; }`);

/**
 * Reorder fixtures. Two sections swap places; nothing else moves.
 *
 * Designed so the vote CANNOT absorb it: the swapped rows are a minority, so
 * the estimator correctly reports an offset of ~0 and the moved sections show
 * up as large local shifts. If the estimator were a mean, the outliers would
 * drag it; if it laundered reorders as translation, this fixture goes green and
 * the harness starts certifying reordered pages as unchanged.
 */
const ROW = (i, tag) =>
  `<div class="block">Section ${tag}${i} &mdash; ${'distinct marker text for this row. '.repeat(1 + (i % 3))}</div>`;
const REORDER_BASE = SHELL(
  Array.from({ length: 6 }, (_, i) => ROW(i, 'pre')).join('')
  + `<div class="block" style="background:#141414">ALPHA one</div>`
  + `<div class="block" style="background:#141414">ALPHA two</div>`
  + Array.from({ length: 6 }, (_, i) => ROW(i, 'mid')).join('')
  + `<div class="block" style="background:#1a1a1a">BETA one</div>`
  + `<div class="block" style="background:#1a1a1a">BETA two</div>`
  + Array.from({ length: 6 }, (_, i) => ROW(i, 'post')).join(''));
/** The same page with ALPHA and BETA swapped. Identical height, identical content. */
const REORDER_SWAPPED = SHELL(
  Array.from({ length: 6 }, (_, i) => ROW(i, 'pre')).join('')
  + `<div class="block" style="background:#1a1a1a">BETA one</div>`
  + `<div class="block" style="background:#1a1a1a">BETA two</div>`
  + Array.from({ length: 6 }, (_, i) => ROW(i, 'mid')).join('')
  + `<div class="block" style="background:#141414">ALPHA one</div>`
  + `<div class="block" style="background:#141414">ALPHA two</div>`
  + Array.from({ length: 6 }, (_, i) => ROW(i, 'post')).join(''));

/**
 * G6: PROGRESSIVE compression — what a real leading change actually does.
 * Each paragraph shrinks, so displacement accumulates down the page and no
 * single translation describes it. Distinct from the constant-translation
 * fixtures above, deliberately.
 */
const LEADING_PARAS = Array.from({ length: 60 }, (_, i) =>
  `<p class="para">Paragraph ${i} &mdash; ${'the quick brown fox jumps over the lazy dog and keeps going. '.repeat(3 + (i % 2))}</p>`
).join('');
const LEADING_CSS = '.para { padding: 10px 24px; border-bottom: 1px solid #c4a57b; }';
const PAGE_LEADING_BASE = SHELL(LEADING_PARAS, `${LEADING_CSS} body { line-height: 1.8; }`);
const PAGE_LEADING_TIGHT = SHELL(LEADING_PARAS, `${LEADING_CSS} body { line-height: 1.65; }`);
/**
 * G9: the same leading change PLUS one local displacement — paragraph 30 gains
 * 6px of top padding, so everything below it sits 6px lower than the affine fit
 * predicts. This is the case the scale degree of freedom could launder.
 *
 * SIX pixels specifically, and the size is load-bearing. A step is laundered by
 * tilting the fit to interpolate it, which leaves a residual of roughly half the
 * step — so a 16px nudge fails on residual (~8px) even with a broken tolerance,
 * and proves nothing about the tolerance. A 6px nudge tilts to ~3px, UNDER the
 * 4px budget: with the refit tolerance loosened, this page goes green and the
 * harness stops catching exactly the regression it was repaired for. Found by
 * mutation — the 16px version let a loosened tolerance survive.
 */
const PAGE_LEADING_TIGHT_NUDGED = SHELL(LEADING_PARAS,
  `${LEADING_CSS} body { line-height: 1.65; } .para:nth-of-type(30) { padding-top: 6px; }`);

/**
 * R-family: pages with REPEATING TEXTURE, which is what real content looks like.
 *
 * Every other fixture in this file builds pages whose rows all carry unique
 * signatures. Real pages do not: navigation, rules, card grids, repeated list
 * rows and flat borders produce the same row signature dozens or hundreds of
 * times. Rows like that are deliberately excluded from the affine fit, because
 * a signature that matches everywhere votes for every offset and decides
 * nothing.
 *
 * That difference hid a CRITICAL defect for an entire review round. Confidence
 * was computed as inliers / STRUCTURED rows while the excluded texture rows sat
 * in the denominator and could never be inliers, so on real content the figure
 * measured how distinctive a page is rather than how well the model fits it.
 * Five of 38 real page pairs failed a BYTE-IDENTICAL comparison — changedPixels
 * 0, spread 0, scale 1, offset 0 — and since fitConfidence is unwaivable by
 * design, the harness could not return a clean run on the real site at all. On
 * synthetic pages eligible and structured are always equal, so the whole
 * G-series was structurally incapable of noticing.
 *
 * The lesson is the fixture, not the fix: an instrument must be tested against
 * material with the same texture as the material it measures.
 */
const REPEAT_CARD = '<div class="card">Standard card row for texture</div>';
const PAGE_TEXTURED = SHELL(
  `<div class="block">Unique heading alpha with its own distinctive measure</div>`
  + REPEAT_CARD.repeat(100)
  + `<div class="block">Unique footer omega with a different distinctive measure</div>`,
  `.card { padding: 8px 24px; border-bottom: 1px solid #3a3a3a; }`);
/** The same textured page with one card 6px taller: a genuine regression. */
const PAGE_TEXTURED_MOVED = SHELL(
  `<div class="block">Unique heading alpha with its own distinctive measure</div>`
  + REPEAT_CARD.repeat(100)
  + `<div class="block">Unique footer omega with a different distinctive measure</div>`,
  `.card { padding: 8px 24px; border-bottom: 1px solid #3a3a3a; }
   .card:nth-of-type(50) { padding-top: 14px; }`);

/** F3 candidate: same page furniture, entirely different content. */
const PAGE_CONTENT_REPLACED = SHELL(
  `<div class="block"><a class="btn">Book a consultation</a></div>` +
  Array.from({ length: 20 }, (_, i) =>
    `<div class="block">Entirely different line ${i * 7} :: ${'||| == ++ %% ## @@ '.repeat(2 + (i % 4))}</div>`
  ).join(''));

// ---------------------------------------------------------------- harness

async function renderPair(tmp, baselineHtml, candidateHtml, slug) {
  const dirs = {};
  for (const [side, html] of [['baseline', baselineHtml], ['candidate', candidateHtml]]) {
    const site = path.join(tmp, slug, side, 'site');
    fs.mkdirSync(site, { recursive: true });
    fs.writeFileSync(path.join(site, 'index.html'), html);
    const shots = path.join(tmp, slug, side, 'shots');
    const server = await startServer(site);
    try {
      await captureAll({
        baseUrl: server.url,
        routes: ['/'],
        widths: [WIDTH],
        outDir: shots,
        cacheDir: path.join(tmp, 'asset-cache'),
        log: () => {},
      });
    } finally {
      await server.close();
    }
    dirs[side] = path.join(shots, `home@${WIDTH}.png`);
  }
  return comparePair(dirs.baseline, dirs.candidate, path.join(tmp, slug, 'diff.png'));
}

/** Capture one HTML page and return the capture stats (not a comparison). */
async function captureStats(tmp, html, slug) {
  const site = path.join(tmp, slug, 'site');
  fs.mkdirSync(site, { recursive: true });
  fs.writeFileSync(path.join(site, 'index.html'), html);
  const server = await startServer(site);
  try {
    return await captureAll({
      baseUrl: server.url,
      routes: ['/'],
      widths: [WIDTH],
      outDir: path.join(tmp, slug, 'shots'),
      cacheDir: path.join(tmp, 'asset-cache'),
      log: () => {},
    });
  } finally {
    await server.close();
  }
}

// ---------------------------------------------------------------- mutations

/**
 * Mutation battery, executable.
 *
 * Every other suite in this repo carries its mutations as a runnable
 * `MUTATIONS` array. This one carried them as prose in commit messages and a
 * throwaway script — which meant the module that certifies every downstream
 * batch was the one module whose safety properties nobody could re-check on
 * demand. Worse, the throwaway script mutated the WORKING TREE, and twice left
 * live residue behind when it was killed mid-run.
 *
 * This version mutates COPIES. Each mutant is written under `.visual-diff/`
 * (gitignored, and inside the repo so `node_modules` still resolves), imported
 * dynamically, and exercised against PNG pairs that were rendered ONCE by the
 * fixtures above. No working-tree edit, no lockfile, nothing to leave behind if
 * this process dies, and the whole battery costs seconds rather than an hour
 * because nothing is re-rendered or re-built per mutation.
 *
 * Each entry states what it proves and returns TRUE when the defect is
 * DETECTED. A mutation whose anchor no longer matches is a hard failure, never
 * a silent pass: an un-applied mutation reporting "detected" is the one outcome
 * that would make this whole mechanism a lie.
 */
const MUTANT_ROOT = path.join(REPO_ROOT, '.visual-diff', 'mutants');

async function loadMutant(id, edits) {
  const dir = path.join(MUTANT_ROOT, id);
  fs.mkdirSync(dir, { recursive: true });
  for (const file of ['diff.mjs', 'gate.mjs']) {
    let src = fs.readFileSync(path.join(REPO_ROOT, 'scripts', 'lib', file), 'utf8');
    const edit = edits[file];
    if (edit) {
      if (!src.includes(edit[0])) {
        throw new Error(`mutation ${id}: anchor not found in ${file}. The code moved; `
          + `re-aim the mutation. An un-applied mutation must never look like a pass.`);
      }
      src = src.replace(edit[0], edit[1]);
    }
    fs.writeFileSync(path.join(dir, file), src);
  }
  return {
    diff: await import(pathToFileURL(path.join(dir, 'diff.mjs')).href),
    gate: await import(pathToFileURL(path.join(dir, 'gate.mjs')).href),
  };
}

/** A synthetic correspondence set: y -> scale*y, as signatures and an index. */
function synthetic(scale, from, to, step) {
  const sigs = [];
  const index = new Map();
  for (let y = from; y <= to; y += step) {
    sigs[y] = `s${y}`;
    index.set(`s${y}`, [Math.round(scale * y)]);
  }
  return { sigs, index };
}

const LOW_CONFIDENCE_RESULT = {
  layoutShiftPx: 0, layoutShiftMaxPx: 0, shiftCoverage: 1, shiftMeasurable: true,
  heightDeltaPx: 0, changedPct: 0,
  globalScale: 1, globalOffsetPx: 0, globalOffsetConfidence: 0.2,
};

const MUTATIONS = [
  {
    name: 'A-m1  force scale = 1 always (affine collapses to constant offset)',
    proves: 'the scale degree of freedom is real and load-bearing',
    edits: { 'diff.mjs': ['      const idx = Math.round((cys[k] - scale * ys[k]) / OFFSET_BUCKET) + bias;',
      '      const idx = Math.round((cys[k] - 1 * ys[k]) / OFFSET_BUCKET) + bias;'] },
    run: (m, pairs) => {
      const r = m.diff.comparePair(pairs.g6.a, pairs.g6.b, null, () => false);
      return r.globalScale === 1 || r.layoutShiftMaxPx > 4;
    },
  },
  {
    name: 'A-m2  refit may leave the scale band',
    proves: 'the band is enforced AFTER refitting, not only on the vote grid',
    edits: { 'diff.mjs': ['    if (nextScale < SCALE_MIN || nextScale > SCALE_MAX) break;', ''] },
    run: (m) => {
      const { sigs, index } = synthetic(1.15, 0, 60, 5);
      return m.diff.estimateAffine(sigs, index).scale > 1.05;
    },
  },
  {
    name: 'A-m3  widen the band to [0.2, 3]',
    proves: 'out-of-band content is refused rather than fitted',
    edits: { 'diff.mjs': ['const SCALE_MIN = 0.8;\nconst SCALE_MAX = 1.05;',
      'const SCALE_MIN = 0.2;\nconst SCALE_MAX = 3;'] },
    run: (m) => {
      const { sigs, index } = synthetic(0.5, 100, 2050, 50);
      return m.diff.estimateAffine(sigs, index).scale < 0.8;
    },
  },
  {
    name: 'A-m4  residual ignores the fit entirely (raw displacement)',
    proves: 'shift is measured against the fit, not from a fixed origin',
    edits: { 'diff.mjs': ['      const local = cy - (fit.scale * y + fit.offset);', '      const local = cy - y;'] },
    run: (m, pairs) => m.diff.comparePair(pairs.g1.a, pairs.g1.b, null, () => false)
      .layoutShiftMaxPx > 4,
  },
  {
    name: 'A-m5  residual ignores the SCALE (offset-relative again)',
    proves: 'the scale term participates in the residual',
    edits: { 'diff.mjs': ['      const local = cy - (fit.scale * y + fit.offset);',
      '      const local = cy - (y + fit.offset);'] },
    run: (m, pairs) => m.diff.comparePair(pairs.g6.a, pairs.g6.b, null, () => false)
      .layoutShiftMaxPx > 4,
  },
  {
    name: 'A-m6  refit tolerance loosened 2px -> 24px',
    proves: 'KNOWN UNDETECTABLE, and why — the spread is invariant to the tilt',
    knownUndetectable: true,
    edits: { 'diff.mjs': ['const FIT_TOLERANCE = 2;', 'const FIT_TOLERANCE = 24;'] },
    // Not "we could not be bothered to catch it": the claim is that loosening
    // the tolerance lets the fit tilt further but CANNOT shrink a spread. Assert
    // exactly that, so the reasoning is checked rather than asserted.
    run: (m, pairs, ref) => {
      const r = m.diff.comparePair(pairs.g9.a, pairs.g9.b, null, () => false);
      return r.layoutShiftMaxPx >= ref.g9.layoutShiftMaxPx;
    },
  },
  {
    name: 'A-m7  monotone-improvement guard removed',
    proves: 'an unchanged page cannot drift off the exact identity',
    edits: { 'diff.mjs': ['    if (gained <= held) break;', ''] },
    run: (m, pairs) => m.diff.comparePair(pairs.control.a, pairs.control.b, null, () => false)
      .globalScale !== 1,
  },
  {
    name: 'A-m8  cross-width scale-divergence gate defanged',
    proves: 'two widths disagreeing about compression is reported',
    edits: { 'gate.mjs': ['    if (sHi - sLo > config.maxScaleDivergence) {', '    if (false) {'] },
    run: (m) => {
      const cfg = m.gate.loadConfig(CONFIG_FILE, fs.readFileSync);
      return m.gate.evaluateFitDivergence(cfg, '/a/', [
        { width: 1440, offset: 0, scale: 0.99 }, { width: 390, offset: 0, scale: 0.82 },
      ]).length === 0;
    },
  },
  {
    name: 'A-m9  fit-confidence gate defanged',
    proves: 'a fit that does not describe the page fails the run',
    edits: { 'gate.mjs': ['    if (!fitHolds) {', '    if (false) {'] },
    run: (m) => {
      const cfg = m.gate.loadConfig(CONFIG_FILE, fs.readFileSync);
      return m.gate.evaluatePair(cfg, '/none/', LOW_CONFIDENCE_RESULT).status !== 'FAIL';
    },
  },
  {
    name: 'A-m10 confidence measured at the TIGHT tolerance',
    proves: 'KNOWN UNDETECTABLE since the denominator fix — tightening only lowers '
      + 'confidence, and the wholly-unfittable case collapses at either setting',
    knownUndetectable: true,
    edits: { 'diff.mjs': ['  const inlierRows = countRows(scale, offset, FIT_CONFIDENCE_TOLERANCE);',
      '  const inlierRows = countRows(scale, offset, FIT_TOLERANCE);'] },
    // This mutation WAS detected before the denominator was fixed: measuring
    // confidence at the tight tolerance dropped a page with one real regression
    // to 47% and got it dismissed as unfittable. Dividing by eligible rows
    // instead of structured rows moved every confidence figure up, and the same
    // page now reads 0.9316 at the tight tolerance and 1.0000 at the loose one
    // — both comfortably over the floor, so no fixture separates the two
    // settings any more. Rather than invent one, assert the two properties that
    // make the shipped value safe either way.
    run: (m, pairs, ref) => {
      const g9 = m.diff.comparePair(pairs.g9.a, pairs.g9.b, null, () => false);
      // 1. Tightening can only ever LOWER confidence, never inflate it, so the
      //    shipped setting cannot be hiding a fit that the tight one would
      //    reject as inadequate... beyond what the floor already allows.
      const monotone = g9.globalOffsetConfidence <= ref.g9.globalOffsetConfidence + 1e-9;
      // 2. The case the gate actually exists for — a page no affine map
      //    describes — still collapses far below the floor at the tight
      //    setting, so the gate has not been disarmed by the change.
      const { sigs, index } = synthetic(0.5, 100, 2050, 50);
      const unfittable = m.diff.estimateAffine(sigs, index).confidence < 0.75;
      return monotone && unfittable;
    },
  },
  {
    name: 'A-m11 tie-break toward the identity removed',
    proves: 'a tied vote resolves to the identity, not to whatever came last',
    edits: { 'diff.mjs': ['        const better = Math.abs(scale - 1) < Math.abs(bestScale - 1)',
      '        const better = Math.abs(scale - 1) <= Math.abs(bestScale - 1)'] },
    run: (m) => {
      const est = m.diff.estimateAffine(['sigA', 'sigB'],
        new Map([['sigA', [0, 50]], ['sigB', [1, 51]]]));
      return est.offset !== 0 || est.scale !== 1;
    },
  },
  {
    name: 'A-m12 shift reverts to max ABSOLUTE residual',
    proves: 'THE anti-laundering property: a tilt cannot hide a step',
    edits: { 'diff.mjs': ['  const spread = sorted.length ? sorted[sorted.length - 1] - sorted[0] : 0;',
      '  const spread = sorted.length ? Math.max(...sorted.map(Math.abs)) : 0;'] },
    run: (m, pairs) => m.diff.comparePair(pairs.g9.a, pairs.g9.b, null, () => false)
      .layoutShiftMaxPx <= 4,
  },
  {
    name: 'A-m14 reveal pin reverted to the six pre-WP-1b classes',
    proves: 'a dead determinism pin is loud, not silently inert',
    edits: {},
    // Not a module mutation: the defect is a VOCABULARY drift, so the mutation
    // is the old selector list run against the real build. If those six ever
    // match something again the assertion is wrong, not the pin.
    special: async () => {
      const { matched } = await revealPinCoverage(['.fade-in', '.slide-up', '.slide-left',
        '.slide-right', '.scale-in', '.gallery-item--reveal']);
      return matched === 0;
    },
  },
  {
    name: 'A-m13 confidence denominator reverts to structuredRows',
    proves: 'the CRITICAL: byte-identical real-shaped pages stay passable',
    edits: { 'diff.mjs': ['    confidence: eligibleRows ? inlierRows / eligibleRows : 0,',
      '    confidence: structuredRows ? inlierRows / structuredRows : 0,'] },
    run: (m, pairs) => m.diff.comparePair(pairs.r1.a, pairs.r1.b, null, () => false)
      .globalOffsetConfidence < 0.95,
  },
];

async function runMutationBattery(tmp) {
  const shots = (slug) => ({
    a: path.join(tmp, slug, 'baseline', 'shots', `home@${WIDTH}.png`),
    b: path.join(tmp, slug, 'candidate', 'shots', `home@${WIDTH}.png`),
  });
  const pairs = {
    g1: shots('g1'), g6: shots('g6'), g9: shots('g9'),
    control: shots('control'), r1: shots('r1'), r2: shots('r2'),
  };
  for (const [name, p] of Object.entries(pairs)) {
    if (!fs.existsSync(p.a) || !fs.existsSync(p.b)) {
      check(`M battery inputs present (${name})`, false,
        `${p.a} / ${p.b} missing — the battery reuses the fixtures' renders`);
      return;
    }
  }
  // Reference results from the UNMUTATED module, for comparisons that need one.
  const ref = { g9: comparePair(pairs.g9.a, pairs.g9.b, null, () => false) };

  fs.rmSync(MUTANT_ROOT, { recursive: true, force: true });
  try {
    for (let i = 0; i < MUTATIONS.length; i++) {
      const mut = MUTATIONS[i];
      let detected = null;
      let err = null;
      try {
        if (mut.special) detected = await mut.special();
        else {
          const mod = await loadMutant(`m${i}`, mut.edits);
          detected = await mut.run(mod, pairs, ref);
        }
      } catch (e) { err = e; }
      if (err) {
        check(mut.name, false, `mutation could not be applied or run: ${err.message}`);
      } else if (mut.knownUndetectable) {
        check(`${mut.name} [known-undetectable: ${mut.proves}]`, detected === true,
          `this mutation is documented as undetectable, and the assertion is the REASON `
          + `it is acceptable. That reason no longer holds.`);
      } else {
        check(`${mut.name} — ${mut.proves}`, detected === true,
          `the mutation ran and the instrument did not notice: this safety property `
          + `has no coverage`);
      }
    }
  } finally {
    fs.rmSync(MUTANT_ROOT, { recursive: true, force: true });
  }
}


/**
 * Assert the scroll-reveal pin is still LIVE against the real built site.
 *
 * A determinism pin that matches nothing is worse than no pin: it looks like
 * protection in review and provides none. This one silently died when WP-1b
 * renamed six reveal classes to one, and every capture since has been racing an
 * IntersectionObserver. The check is deliberately about the REAL build rather
 * than a fixture page, because the failure mode is "the site's vocabulary moved
 * and the harness did not".
 *
 * @returns {{matched: number, escaped: string[]}}
 */
export async function revealPinCoverage(selectors) {
  const dist = path.join(REPO_ROOT, 'dist');
  if (!fs.existsSync(dist)) {
    throw new Error('dist/ is missing — run `npm run build` first. This check is about the '
      + 'REAL built site, so there is nothing meaningful to assert without one.');
  }
  const routes = ['/', '/about/', '/saunas/', '/locations/', '/faq/'];
  const server = await startServer(dist);
  const { chromium } = await import('playwright');
  const browser = await chromium.launch();
  let matched = 0;
  const escaped = [];
  try {
    const page = await browser.newPage();
    for (const route of routes) {
      await page.goto(`${server.url}${route}`, { waitUntil: 'domcontentloaded' });
      const r = await page.evaluate((sels) => {
        const pinned = new Set(document.querySelectorAll(sels.join(',')));
        // STATE classes, not reveal TARGETS: `reveal-ready` and `reveal-boot`
        // live on <html> and gate the system rather than being animated by it.
        // Scanning for them made this check flaky, because init.js adds
        // `reveal-ready` asynchronously — so the root element sometimes carried
        // a reveal-ish class and sometimes did not. The scan stays broad enough
        // to catch a NEW target vocabulary (a future `.reveal-item` would be
        // flagged) while ignoring the two known state tokens.
        const STATE = new Set(['reveal-ready', 'reveal-boot']);
        const escaped = [];
        for (const el of Array.from(document.querySelectorAll('[class*="reveal"]'))) {
          if (el === document.documentElement) continue;
          const tokens = Array.from(el.classList).filter((c) => c.includes('reveal'));
          if (tokens.length === 0 || tokens.every((t) => STATE.has(t))) continue;
          if (!pinned.has(el)) {
            escaped.push(`<${el.tagName.toLowerCase()} class="${el.className}">`);
          }
        }
        return { matched: pinned.size, escaped };
      }, selectors);
      matched += r.matched;
      escaped.push(...r.escaped.map((e) => `${route} ${e}`));
    }
    await page.close();
  } finally {
    await browser.close();
    await server.close();
  }
  return { matched, escaped };
}

async function checkRevealPin(selectors, tag) {
  const { matched, escaped } = await revealPinCoverage(selectors);
  check(`${tag}1 the reveal pin matches real elements in the built site`,
    matched > 0,
    `the pin selectors ${JSON.stringify(selectors)} matched ZERO elements. A determinism `
    + `pin that matches nothing looks like protection in review and provides none — this is `
    + `exactly how it died when WP-1b renamed six reveal classes into one.`);
  check(`${tag}2 no reveal-family element escapes the pin`,
    escaped.length === 0,
    `these carry a reveal-ish class but are not pinned, so they are captured in whatever `
    + `observer state the run catches:\n        ${escaped.slice(0, 8).join('\n        ')}`);
  return matched;
}

async function main() {
  // The real production budgets. Widths are narrowed to one for run time; every
  // threshold that decides pass or fail is the shipped one, unmodified.
  const config = loadConfig(CONFIG_FILE, fs.readFileSync);

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ssc-visual-diff-test-'));
  try {
    process.stdout.write('\nF1 — a 6px sitewide button move must FAIL\n');
    {
      const r = await renderPair(tmp, PAGE_BASE, PAGE_BUTTON_MOVED, 'f1');
      const v = evaluatePair(config, '/', r);
      // The shift metric is the SPREAD of signed residuals, so a true 6px move
      // reads as 6 plus up to a pixel of antialiasing tail (measured: the fit
      // locks to the moved majority at offset +6, the unmoved rows sit at -6,
      // and one stray row lands at +1 — spread 7). Spread can over-report by a
      // pixel; it can never UNDER-report, which is the direction that matters
      // for a gate. A tight `=== 6` here would be asserting the absence of
      // antialiasing, not the presence of the move.
      check('F1 measured a 6px displacement',
        r.layoutShiftMaxPx >= 6 && r.layoutShiftMaxPx <= 8,
        `expected a spread of 6-8px for a 6px move, got ${r.layoutShiftMaxPx} `
        + `(p99 ${r.layoutShiftPx}, coverage ${r.shiftCoverage.toFixed(3)})`);
      check('F1 verdict is FAIL',
        v.status === 'FAIL',
        `expected FAIL, got ${v.status}. reasons=${JSON.stringify(v.reasons)} `
        + `shiftMax=${r.layoutShiftMaxPx} coverage=${r.shiftCoverage.toFixed(3)} `
        + `changedPct=${r.changedPct.toFixed(3)}`);
      check('F1 fails specifically on the shift gate, not on pixel noise',
        v.reasons.some((x) => x.includes('layout shift')),
        `no layout-shift reason present: ${JSON.stringify(v.reasons)}`);
      check('F1 cannot be waived away by expectedToChange',
        (() => {
          const waived = loadConfig(CONFIG_FILE, () => JSON.stringify({
            ...JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')),
            expectedToChange: [{ route: '/', reason: 'test', waive: ['changedPct', 'heightDelta'] }],
          }));
          return evaluatePair(waived, '/', r).status === 'FAIL';
        })(),
        'a route waiving every waivable metric still must not escape the shift gate');
    }
    {
      // Same 6px move, confined to the tail of the page: the case that
      // justifies gating on the maximum rather than the p99.
      const r = await renderPair(tmp, PAGE_BASE_TAIL, PAGE_BUTTON_MOVED_TAIL, 'f1b');
      const v = evaluatePair(config, '/', r);
      check('F1b a tail-only 6px move still FAILs',
        v.status === 'FAIL',
        `expected FAIL, got ${v.status}. shiftMax=${r.layoutShiftMaxPx} `
        + `p99=${r.layoutShiftPx} coverage=${r.shiftCoverage.toFixed(3)} `
        + `reasons=${JSON.stringify(v.reasons)}`);
      // NOTE, recorded honestly: on both F1 fixtures p99 and max come out
      // equal, because a button growing by 6px moves every row beneath it and
      // that is far more than the top 1% p99 discards. So these fixtures do
      // NOT independently prove that gating on the max is better than gating
      // on the p99 — at realistic page geometry the two agree. Gating on the
      // max is the plan's stated requirement, and the unit case below is what
      // proves the gate actually reads it.
      check('F1b max is never below p99',
        r.layoutShiftMaxPx >= r.layoutShiftPx,
        `max ${r.layoutShiftMaxPx} < p99 ${r.layoutShiftPx}, which is impossible`);
    }

    process.stdout.write('\nF2 — a self-comparison must ERROR\n');
    {
      let code = 0;
      let out = '';
      try {
        out = execFileSync(process.execPath,
          [path.join(REPO_ROOT, 'scripts', 'visual-diff.mjs'), '-b', 'HEAD', '-c', 'HEAD'],
          { cwd: REPO_ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
      } catch (err) {
        code = err.status;
        out = `${err.stdout || ''}${err.stderr || ''}`;
      }
      check('F2 exits non-zero on a self-comparison',
        code !== 0, `expected a non-zero exit, got ${code}. output: ${out.slice(0, 400)}`);
      check('F2 says why, rather than reporting a clean run',
        /itself|self-comparison|proves nothing/i.test(out),
        `output did not explain the refusal: ${out.slice(0, 400)}`);
      check('F2 never reached the build stage',
        !/Building baseline/.test(out),
        'the refusal must come before any expensive work');
    }

    process.stdout.write('\nF3 — a fully-changed page must REGISTER\n');
    {
      const r = await renderPair(tmp, PAGE_BASE, PAGE_CONTENT_REPLACED, 'f3');
      const v = evaluatePair(config, '/', r);
      check('F3 coverage collapses below the floor',
        r.shiftMeasurable && r.shiftCoverage < config.minShiftCoverage,
        `expected coverage < ${config.minShiftCoverage}, got `
        + `${r.shiftCoverage.toFixed(3)} (measurable=${r.shiftMeasurable})`);
      check('F3 verdict is FAIL',
        v.status === 'FAIL',
        `expected FAIL, got ${v.status}. reasons=${JSON.stringify(v.reasons)}`);
      check('F3 fails on coverage — the metric that sees a content replacement',
        v.reasons.some((x) => x.includes('coverage')),
        `expected a coverage reason. shiftMax=${r.layoutShiftMaxPx} `
        + `coverage=${r.shiftCoverage.toFixed(3)} reasons=${JSON.stringify(v.reasons)}`);
    }

    process.stdout.write('\nC — an unchanged page must PASS (control)\n');
    {
      const r = await renderPair(tmp, PAGE_BASE, PAGE_BASE, 'control');
      const v = evaluatePair(config, '/', r);
      check('C verdict is PASS',
        v.status === 'PASS',
        `expected PASS, got ${v.status}. reasons=${JSON.stringify(v.reasons)} `
        + `shiftMax=${r.layoutShiftMaxPx} coverage=${r.shiftCoverage.toFixed(3)} `
        + `changedPct=${r.changedPct.toFixed(3)}`);
      check('C is byte-identical — the capture is deterministic',
        r.changedPixels === 0, `expected 0 changed pixels, got ${r.changedPixels}`);
    }
    process.stdout.write('\nB — broken images are reported, placeholders are not\n');
    {
      // A real broken image: a src that 404s against the fixture server.
      const broken = await captureStats(tmp,
        SHELL(`<div class="block"><img src="/does-not-exist.jpg" alt="broken"></div>${CONTENT}`),
        'broken');
      check('B a genuinely broken image is reported',
        broken.brokenImages.length === 1
        && broken.brokenImages[0].includes('does-not-exist.jpg'),
        `expected one report naming the bad src, got ${JSON.stringify(broken.brokenImages)}`);

      // A source-less placeholder, like the sitewide lightbox img. Reporting
      // these made every page of every run fail; the gate must stay quiet.
      const placeholder = await captureStats(tmp,
        SHELL(`<div class="block"><img id="lightboxImage" alt="placeholder"></div>${CONTENT}`),
        'placeholder');
      check('B a source-less placeholder is NOT reported',
        placeholder.brokenImages.length === 0,
        `expected no reports, got ${JSON.stringify(placeholder.brokenImages)}`);
    }
    process.stdout.write('\nG — global-offset matching: uniform movement is not a regression\n');
    {
      // These fixtures deliberately do NOT read the shipped expectedToChange
      // list. That list currently carries the very batch this instrument has to
      // certify, and a certifier whose fixtures inherit the allowlist of the
      // work under test proves nothing. Budgets are the shipped ones; the
      // waivers are stated here.
      //
      // A uniformly translated page legitimately changes height, and heightDelta
      // is gated against the shift budget, so the waiver below is the honest
      // shape of "this page compressed": changedPct and heightDelta waived,
      // layoutShiftMaxPx and shiftCoverage still armed and unwaivable.
      const gcfg = loadConfig('g.json', () => JSON.stringify({
        ...JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')),
        expectedToChange: [{
          route: '/g/',
          reason: 'uniform translation fixture: page height legitimately changes',
          waive: ['changedPct', 'heightDelta'],
        }],
        pageOverrides: [],
      }));
      // Same budgets, no waivers at all, for asserting WHY something failed.
      const strict = loadConfig('strict.json', () => JSON.stringify({
        ...JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')),
        expectedToChange: [], pageOverrides: [],
      }));

      // G1: a page translated 300px up, content provably identical.
      const g1 = await renderPair(tmp, PAGE_SPACED, PAGE_UNSPACED, 'g1');
      check('G1 the offset is estimated at the true -300px translation',
        Math.abs(g1.globalOffsetPx + 300) <= 2,
        `expected about -300, got ${g1.globalOffsetPx} `
        + `(confidence ${g1.globalOffsetConfidence.toFixed(3)})`);
      check('G1 a pure translation reports scale EXACTLY 1',
        g1.globalScale === 1,
        `a translated page has not been scaled; the affine model must report the `
        + `a=1 special case exactly, got ${g1.globalScale}`);
      check('G1 coverage is honest, not collapsed',
        g1.shiftMeasurable && g1.shiftCoverage >= 0.95,
        `expected coverage >= 0.95 on identical content, got `
        + `${g1.shiftCoverage.toFixed(3)} — this is the WP-1a failure mode`);
      check('G1 local shift is ~zero: nothing moved RELATIVE to anything',
        g1.layoutShiftMaxPx <= gcfg.maxLayoutShiftPx,
        `expected local shift within ${gcfg.maxLayoutShiftPx}px, got ${g1.layoutShiftMaxPx}px`);
      check('G1 nothing unwaived breached: the run stays green',
        (() => {
          const v = evaluatePair(gcfg, '/g/', g1);
          return v.status !== 'FAIL' && v.reasons.length === 0;
        })(),
        `a uniformly translated page with identical content must not fail the run. `
        + `${JSON.stringify(evaluatePair(gcfg, '/g/', g1))}`);
      check('G1 contributes nothing to the failure count',
        tallyFailures({
          pages: [{ route: '/g/', status: evaluatePair(gcfg, '/g/', g1).status }],
          structural: [], runFailures: [],
        }) === 0,
        'EXPECTED is a green outcome; only FAIL counts against the run');
      check('G1 the two UNWAIVABLE gates are clean on their own merits',
        !evaluatePair(strict, '/none/', g1).reasons.some(
          (x) => x.includes('layout shift') || x.includes('coverage')),
        `with every waiver removed, a uniform translation must breach only the height `
        + `budget — never shift or coverage. Got `
        + `${JSON.stringify(evaluatePair(strict, '/none/', g1).reasons)}`);
      check('G1 the offset is reported, not hidden inside the shift number',
        g1.globalOffsetPx !== 0 && g1.layoutShiftMaxPx !== Math.abs(g1.globalOffsetPx),
        'the translation must appear as an offset and NOT as a local shift');

      // G2: the mixed case. Same 300px translation, plus one 6px local growth.
      const g2 = await renderPair(tmp, PAGE_SPACED, PAGE_UNSPACED_BUTTON_MOVED, 'g2');
      check('G2 the offset still resolves to the translation',
        Math.abs(g2.globalOffsetPx + 300) <= 8,
        `expected about -300, got ${g2.globalOffsetPx}`);
      check('G2 a 6px local move inside a translated page is STILL CAUGHT',
        evaluatePair(gcfg, '/g/', g2).status === 'FAIL',
        `a local move must not be laundered by the global offset, even with `
        + `changedPct and heightDelta waived. shiftMax=${g2.layoutShiftMaxPx} `
        + `offset=${g2.globalOffsetPx} coverage=${g2.shiftCoverage.toFixed(3)}`);
      check('G2 it fails on the shift gate specifically',
        evaluatePair(gcfg, '/g/', g2).reasons.some((x) => x.includes('layout shift')),
        `expected a layout-shift reason, got `
        + `${JSON.stringify(evaluatePair(gcfg, '/g/', g2).reasons)}`);

      // G3: THE fixture that keeps this honest. A genuine reorder must not be
      // explained away as a translation.
      const g3 = await renderPair(tmp, REORDER_BASE, REORDER_SWAPPED, 'g3');
      check('G3 a reorder is NOT absorbed into the global offset',
        Math.abs(g3.globalOffsetPx) <= 4,
        `the page did not translate — two sections swapped. Expected an offset near 0, `
        + `got ${g3.globalOffsetPx}. A non-zero offset here means the estimator is `
        + `laundering reordering as compression.`);
      check('G3 the affine fit does not BEND to explain a reorder either',
        Math.abs(g3.globalScale - 1) <= 0.01,
        `the page did not compress — two sections swapped, page height identical. `
        + `Expected scale ~1, got ${g3.globalScale}. Adding a scale degree of freedom `
        + `must not give the estimator a new way to explain reordering away; the `
        + `swapped rows are a minority and must be OUTVOTED, not fitted.`);
      check('G3 verdict is FAIL even with every waivable metric waived',
        evaluatePair(gcfg, '/g/', g3).status === 'FAIL',
        `a swapped page must fail. shiftMax=${g3.layoutShiftMaxPx} `
        + `offset=${g3.globalOffsetPx} coverage=${g3.shiftCoverage.toFixed(3)} `
        + `reasons=${JSON.stringify(evaluatePair(gcfg, '/g/', g3).reasons)}`);
      check('G3 the reorder is visible as displacement or lost coverage, not silence',
        g3.layoutShiftMaxPx > gcfg.maxLayoutShiftPx
        || g3.shiftCoverage < gcfg.minShiftCoverage,
        `the swap must register on a gated metric. shiftMax=${g3.layoutShiftMaxPx} `
        + `coverage=${g3.shiftCoverage.toFixed(3)}`);

      // G4: control. An unchanged page must report exactly zero offset — the
      // estimator must not invent a translation out of tie-breaking noise.
      const g4 = await renderPair(tmp, PAGE_BASE, PAGE_BASE, 'g4');
      check('G4 an unchanged page reports offset exactly 0',
        g4.globalOffsetPx === 0,
        `expected 0, got ${g4.globalOffsetPx} — ties must resolve toward identity`);
      check('G4 an unchanged page reports scale exactly 1',
        g4.globalScale === 1,
        `expected exactly 1, got ${g4.globalScale} — the identity must be exactly `
        + `representable on the scale grid and must win ties`);
      check('G4 an unchanged page still passes',
        evaluatePair(config, '/', g4).status === 'PASS', 'control');

      // G6: progressive compression — what a real leading change actually does.
      //
      // HISTORY, kept deliberately. This fixture was born as a LIMITATION LOCK.
      // Under the constant-offset model it recorded confidence 0.034, a 238px
      // residual and a failing verdict, because a leading change compresses a
      // page progressively rather than translating it and no single offset fits
      // that. That measurement is what specified the affine extension. It is now
      // a CAPABILITY PROOF, and the numbers it asserts are the evidence the
      // extension did what it claimed. Do not soften it back into a lock.
      const g6 = await renderPair(tmp, PAGE_LEADING_BASE, PAGE_LEADING_TIGHT, 'g6');
      check('G6 the fit recovers a compression scale inside the band',
        g6.globalScale > 0.85 && g6.globalScale < 1,
        `a 1.8 -> 1.65 leading change compresses text by 0.9167; unscaled padding and `
        + `borders pull the effective page scale toward 1, so the fit should land `
        + `between. got scale=${g6.globalScale}`);
      check('G6 the fit is now CONFIDENT (was 0.034 under constant-offset)',
        g6.globalOffsetConfidence >= 0.9,
        `expected >= 0.9, got ${g6.globalOffsetConfidence.toFixed(3)} — this is the `
        + `number that justified building the affine model`);
      check('G6 coverage is honest',
        g6.shiftMeasurable && g6.shiftCoverage >= 0.95,
        `expected >= 0.95, got ${g6.shiftCoverage.toFixed(3)}`);
      check('G6 the residual after the fit is within budget (was 238px)',
        g6.layoutShiftMaxPx <= gcfg.maxLayoutShiftPx,
        `expected <= ${gcfg.maxLayoutShiftPx}px, got ${g6.layoutShiftMaxPx}px`);
      check('G6 the UNWAIVABLE gates are clean on their own merits',
        !evaluatePair(strict, '/none/', g6).reasons.some(
          (x) => x.includes('layout shift') || x.includes('coverage') || x.includes('affine fit')),
        `a leading change must breach only the height and pixel budgets — both `
        + `waivable — never shift, coverage or fit confidence. Got `
        + `${JSON.stringify(evaluatePair(strict, '/none/', g6).reasons)}`);
      check('G6 a leading change is now certifiable under a normal restyle waiver',
        (() => {
          const v = evaluatePair(gcfg, '/g/', g6);
          return v.status !== 'FAIL' && v.reasons.length === 0;
        })(),
        `the whole point of the extension. ${JSON.stringify(evaluatePair(gcfg, '/g/', g6))}`);

      // G9: THE adversarial case for affine — a local move hiding inside a
      // genuine compression. The scale degree of freedom is exactly what could
      // launder it: a least-squares fit over everything would tilt slightly to
      // interpolate the step and drive the residual under the budget. The hard
      // inlier tolerance is what stops that, and this fixture is what proves it.
      const g9 = await renderPair(tmp, PAGE_LEADING_BASE, PAGE_LEADING_TIGHT_NUDGED, 'g9');
      check('G9 the fit still recovers the compression',
        g9.globalScale > 0.85 && g9.globalScale < 1,
        `got scale=${g9.globalScale} confidence=${g9.globalOffsetConfidence.toFixed(3)}`);
      check('G9 the fit is still CONFIDENT — one step is a regression, not a bad model',
        g9.globalOffsetConfidence >= 0.9,
        `an affine map describes this page perfectly well apart from the very 6px step `
        + `we want reported, so confidence must stay high and the failure must land on `
        + `the SHIFT gate. Measuring confidence at the fit tolerance instead of the `
        + `looser model-fit tolerance drops this to ~50% and the page gets dismissed as `
        + `unmeasurable instead of reported as a regression. `
        + `got ${g9.globalOffsetConfidence.toFixed(3)}`);
      check('G9 a local move INSIDE a compressed page is still caught',
        evaluatePair(gcfg, '/g/', g9).status === 'FAIL',
        `the affine fit must not absorb a local displacement. `
        + `shiftMax=${g9.layoutShiftMaxPx} scale=${g9.globalScale} `
        + `coverage=${g9.shiftCoverage.toFixed(3)} `
        + `reasons=${JSON.stringify(evaluatePair(gcfg, '/g/', g9).reasons)}`);
      check('G9 it fails on the shift gate specifically, as a residual',
        evaluatePair(gcfg, '/g/', g9).reasons.some((x) => x.includes('layout shift')),
        `expected a layout-shift reason, got `
        + `${JSON.stringify(evaluatePair(gcfg, '/g/', g9).reasons)}`);

      // G7/G8: the estimator's two robustness rules, driven directly.
      //
      // Both of these were found by mutation: breaking the tie-break and
      // removing the non-distinctive-signature guard each left the whole suite
      // green, because rendered fixtures do not naturally produce an exact vote
      // tie or a page of 100 identical rows. Rendering cannot reach these; the
      // function is exported and takes a signature array plus an index, so the
      // honest coverage is to hand it the pathological input directly.

      // G7: an exact tie must resolve toward zero. Two baseline rows, each
      // matching both at displacement 0 and at displacement +50 — two buckets,
      // two votes apiece. Picking "whichever tied bucket came last" would let
      // an unchanged page report a phantom translation.
      {
        const a = ['sigA', 'sigB'];
        const index = new Map([['sigA', [0, 50]], ['sigB', [1, 51]]]);
        const est = estimateAffine(a, index);
        check('G7 an exact vote tie resolves toward the identity',
          est.offset === 0 && est.scale === 1,
          `two cells tied; the estimator must prefer the identity, got `
          + `scale ${est.scale} offset ${est.offset}. Otherwise an unchanged page can `
          + `report a translation or a compression that never happened.`);
      }
      // ...and the same tie in the other direction: a real translation must
      // still win when it is not a tie, so G7 is not just "always return identity".
      {
        const a = ['sigA', 'sigB', 'sigC'];
        const index = new Map([['sigA', [50]], ['sigB', [51]], ['sigC', [52]]]);
        const est = estimateAffine(a, index);
        check('G7 an unambiguous translation still wins outright',
          Math.abs(est.offset - 50) < 0.5 && Math.abs(est.scale - 1) < 1e-6,
          `control: preferring the identity must only break TIES, not override `
          + `evidence. got scale ${est.scale} offset ${est.offset}`);
      }
      // A genuine SCALE must win too, or the identity preference has become a
      // refusal to ever see compression.
      {
        const a = [];
        const index = new Map();
        for (let i = 0; i < 40; i++) {
          const y = 100 + i * 50;
          a[y] = `s${i}`;
          index.set(`s${i}`, [Math.round(0.9 * y + 20)]);
        }
        const est = estimateAffine(a, index);
        check('G7 a genuine compression is recovered, not flattened to identity',
          Math.abs(est.scale - 0.9) < 0.005 && Math.abs(est.offset - 20) < 2,
          `synthetic y' = 0.9y + 20 must be recovered. got scale ${est.scale} `
          + `offset ${est.offset} confidence ${est.confidence.toFixed(3)}`);
      }
      // A scale outside the band is not a restyle and must not be fitted.
      {
        const a = [];
        const index = new Map();
        for (let i = 0; i < 40; i++) {
          const y = 100 + i * 50;
          a[y] = `h${i}`;
          index.set(`h${i}`, [Math.round(0.5 * y)]);
        }
        const est = estimateAffine(a, index);
        check('G7 a scale outside [0.8, 1.05] is refused, not fitted',
          est.scale >= 0.8 && est.scale <= 1.05 && est.confidence < 0.75,
          `a page "scaled" to 0.5 is different content, not a leading change. The fit `
          + `must stay in band and report low confidence, got scale ${est.scale} `
          + `confidence ${est.confidence.toFixed(3)}`);
      }

      // G8: a signature repeated more often than MAX_SIGNATURE_HITS is
      // repeating texture, not evidence. Here 100 identical rows would cast
      // ~10,000 votes clustered at displacement 0, drowning the two distinctive
      // rows that carry the page's true +100 translation.
      {
        const a = [];
        for (let y = 0; y < 100; y++) a.push('repeat');
        a[200] = 'unique1';
        a[201] = 'unique2';
        for (let y = 100; y < 200; y++) a[y] = null;
        const index = new Map([
          ['repeat', Array.from({ length: 100 }, (_, i) => i)],
          ['unique1', [300]],
          ['unique2', [301]],
        ]);
        const est = estimateAffine(a, index);
        check('G8 non-distinctive rows do not drown the real offset',
          Math.abs(est.offset - 100) < 0.5 && Math.abs(est.scale - 1) < 1e-6,
          `100 identical rows must be excluded from the vote so the two distinctive `
          + `rows carry the true +100 translation. Got scale ${est.scale} offset `
          + `${est.offset} — repeating texture is matching everywhere and voting `
          + `for nothing.`);
      }

      // G12: the band is enforced on the REFIT too, not only on the vote grid.
      //
      // Found by mutation: deleting the refit's bounds check left the suite
      // green, because on a normal page the least-squares refit never wanders
      // far. It can on a SHORT one. The refit fits rows within 2px of the
      // current line, so over a y-span of Y the slope can move by ~4/Y — on a
      // 40px span that is 0.1, far enough to leave the band entirely. The grid
      // would then have honoured the band and the refit would have quietly
      // undone it.
      {
        // Getting this fixture to actually reach the bounds check took two
        // goes, both caught by mutation. The refit is also protected by the
        // monotone-improvement guard, so unless the out-of-band fit explains
        // STRICTLY MORE rows than the in-band one, that guard rejects it first
        // and the bounds check is never exercised — the fixture passes while
        // testing nothing.
        //
        // A slope of 1.15 over a 60px span does it: the best in-band fit
        // (capped at 1.05) drifts far enough to lose several rows, while the
        // true 1.15 line captures all of them. So the refit genuinely wants to
        // leave the band, strictly improves by doing so, and ONLY the bounds
        // check stands in the way.
        const a = [];
        const index = new Map();
        for (let y = 0; y <= 60; y += 5) {
          a[y] = `t${y}`;
          index.set(`t${y}`, [Math.round(1.15 * y)]);
        }
        const est = estimateAffine(a, index);
        check('G12 the refit cannot walk the scale out of the band',
          est.scale >= 0.8 && est.scale <= 1.05,
          `a least-squares refit on a short span can escape [0.8, 1.05] while every `
          + `point stays inside the 2px inlier tolerance. The bound must hold after `
          + `refinement, not only on the vote grid. got scale ${est.scale}`);
      }

      // G10: a low-confidence fit FAILS, and says model-does-not-fit rather
      // than reporting residuals against a fit that does not hold. The
      // confidence gate is unwaivable and not overridable: if the instrument
      // cannot describe the page, that is a human conversation.
      {
        const unfittable = {
          layoutShiftPx: 0, layoutShiftMaxPx: 0, shiftCoverage: 1, shiftMeasurable: true,
          heightDeltaPx: 0, changedPct: 0,
          globalScale: 1, globalOffsetPx: 0, globalOffsetConfidence: 0.2,
        };
        const v = evaluatePair(strict, '/none/', unfittable);
        check('G10 a low-confidence fit fails even when every other metric is clean',
          v.status === 'FAIL',
          `shift 0, coverage 1, nothing changed — but the fit explains 20% of rows, so `
          + `none of those numbers mean anything. ${JSON.stringify(v)}`);
        check('G10 it says model-does-not-fit, not a fake shift figure',
          v.reasons.some((x) => x.includes('does not hold') || x.includes('affine fit')),
          `expected an explicit model-does-not-fit reason, got ${JSON.stringify(v.reasons)}`);
        check('G10 fit confidence cannot be waived away',
          (() => {
            try {
              loadConfig('t.json', () => JSON.stringify({
                ...JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')),
                expectedToChange: [{ route: '/a/', reason: 'r', waive: ['fitConfidence'] }],
                pageOverrides: [],
              }));
              return false;
            } catch (err) { return /never be waived/.test(err.message); }
          })(),
          'a page must not be able to waive the check that says its measurement is void');
      }

      // G5: the offset gate, across widths of one page.
      check('G5 consistent widths raise nothing',
        evaluateFitDivergence(config, '/a/',
          [{ width: 1440, offset: -300 }, { width: 390, offset: -340 }]).length === 0,
        'comparable compression at both widths is normal and must stay quiet');
      check('G5 wildly divergent widths are reported',
        evaluateFitDivergence(config, '/a/',
          [{ width: 1440, offset: -40 }, { width: 390, offset: -900 }]).length === 1,
        'a 860px spread must be reported');
      check('G5 opposite directions are reported regardless of magnitude',
        evaluateFitDivergence(config, '/a/',
          [{ width: 1440, offset: 60 }, { width: 390, offset: -60 }]).length >= 1,
        'one width growing while another shrinks is never a single spacing change');
      check('G5 sub-noise offsets do not trip the sign check',
        evaluateFitDivergence(config, '/a/',
          [{ width: 1440, offset: 1 }, { width: 390, offset: -1 }]).length === 0,
        'rounding must not be reported as a direction conflict');
      check('G5 a single width cannot diverge from itself',
        evaluateFitDivergence(config, '/a/', [{ width: 1440, offset: -300 }]).length === 0,
        'one width is not a comparison');

      // Scale divergence, gated on the same terms as offset divergence. Under
      // an affine model this is the sharper of the two: both widths render from
      // ONE stylesheet, so a leading change should compress them by a
      // comparable ratio even though their layouts differ.
      check('G5 comparable compression at both widths is quiet',
        evaluateFitDivergence(config, '/a/', [
          { width: 1440, offset: 0, scale: 0.938 },
          { width: 390, offset: 0, scale: 0.921 },
        ]).length === 0,
        'two widths compressing by a similar ratio is exactly what a leading change does');
      check('G5 wildly divergent SCALE is reported',
        evaluateFitDivergence(config, '/a/', [
          { width: 1440, offset: 0, scale: 0.99 },
          { width: 390, offset: 0, scale: 0.82 },
        ]).some((f) => f.includes('COMPRESSED')),
        'one width barely moving while the other compresses 18% is not one restyle');
      check('G5 scale divergence is independent of offset divergence',
        evaluateFitDivergence(config, '/a/', [
          { width: 1440, offset: -10, scale: 0.99 },
          { width: 390, offset: -12, scale: 0.82 },
        ]).length === 1,
        'identical offsets must not mask a scale disagreement');
      check('G5 a missing scale defaults to identity rather than crashing',
        evaluateFitDivergence(config, '/a/', [
          { width: 1440, offset: -300 }, { width: 390, offset: -320 },
        ]).length === 0,
        'the offset-only shape must stay callable');
    }

    process.stdout.write('\nR — repeating texture: the material real pages are made of\n');
    {
      const strictR = loadConfig('r.json', () => JSON.stringify({
        ...JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')),
        expectedToChange: [], pageOverrides: [],
      }));

      // R0 first: if this page has no excluded texture, the rest of the block
      // proves nothing. Assert the fixture actually reproduces real content's
      // shape before asserting anything about behaviour.
      const r1 = await renderPair(tmp, PAGE_TEXTURED, PAGE_TEXTURED, 'r1');
      check('R0 the fixture really does have repeating texture',
        r1.globalEligibleRows < r1.globalStructuredRows * 0.75,
        `this fixture exists to have rows excluded from the fit. eligible=`
        + `${r1.globalEligibleRows} structured=${r1.globalStructuredRows} — if these are `
        + `equal the page is synthetic-shaped and cannot exercise the denominator at all`);

      // R1: the case that was broken in production. Identical bytes in, clean
      // run out.
      check('R1 a BYTE-IDENTICAL textured page is byte-identical',
        r1.changedPixels === 0 && r1.layoutShiftMaxPx === 0,
        `sanity: ${r1.changedPixels} px changed, spread ${r1.layoutShiftMaxPx}`);
      check('R1 confidence is measured against ELIGIBLE rows, so it is ~1',
        r1.globalOffsetConfidence >= 0.95,
        `an identical page must fit itself perfectly. got `
        + `${r1.globalOffsetConfidence.toFixed(4)} (inliers ${r1.globalFitInliers} / eligible `
        + `${r1.globalEligibleRows}; dividing by structured ${r1.globalStructuredRows} instead `
        + `gives ${(r1.globalFitInliers / r1.globalStructuredRows).toFixed(4)} — which is what `
        + `failed five real pages)`);
      check('R1 an identical textured page PASSES with no waivers at all',
        evaluatePair(strictR, '/none/', r1).status === 'PASS',
        `the harness must be able to return a clean run on real-shaped content. `
        + `${JSON.stringify(evaluatePair(strictR, '/none/', r1))}`);

      // R2: and it has not gone blind — a real change in the same texture is
      // still caught. A fix that made everything pass would be worse than the bug.
      const r2 = await renderPair(tmp, PAGE_TEXTURED, PAGE_TEXTURED_MOVED, 'r2');
      check('R2 a real 6px move inside repeating texture is still caught',
        evaluatePair(strictR, '/none/', r2).status === 'FAIL',
        `spread=${r2.layoutShiftMaxPx} confidence=${r2.globalOffsetConfidence.toFixed(4)} `
        + `reasons=${JSON.stringify(evaluatePair(strictR, '/none/', r2).reasons)}`);
      check('R2 it fails on the shift gate, not by being dismissed as unfittable',
        evaluatePair(strictR, '/none/', r2).reasons.some((x) => x.includes('layout shift')),
        `a regression must be reported as a regression. `
        + `${JSON.stringify(evaluatePair(strictR, '/none/', r2).reasons)}`);

      // R3: the zero-eligible case must fail, not divide into NaN. A NaN
      // comparison is false, so `NaN < minFitConfidence` would be false and the
      // gate would silently pass a page nothing is known about.
      {
        const none = estimateAffine(['a', 'b'], new Map());
        check('R3 a page with NO eligible rows reports 0, not NaN',
          none.confidence === 0 && Number.isFinite(none.confidence),
          `got ${none.confidence} — NaN compares false against every budget, so a page `
          + `with nothing matchable would sail through the gate`);
      }
    }

    process.stdout.write('\nO — the orchestration layer (visual-diff.mjs itself)\n');
    {
      // Everything above tests lib/. The layer that decides what gets compared
      // and what the exit code is had NO coverage at all: three separate
      // mutations to it (delete the run-failure tally, revert the
      // missing-screenshot branch to `continue`, delete the redirect gate call)
      // each left the whole suite green. These fixtures drive the real exported
      // functions from visual-diff.mjs, not lookalikes.

      // --- O1: a missing screenshot must become a run failure, not a skip.
      // Two routes, one candidate PNG deleted. Reverting the branch to
      // `continue` leaves one compared pair and an empty runFailures list.
      const shotDirs = {};
      for (const side of ['baseline', 'candidate']) {
        const site = path.join(tmp, 'o1', side, 'site');
        fs.mkdirSync(path.join(site, 'b'), { recursive: true });
        fs.writeFileSync(path.join(site, 'index.html'), PAGE_BASE);
        fs.writeFileSync(path.join(site, 'b', 'index.html'), PAGE_BASE);
        const shots = path.join(tmp, 'o1', side, 'shots');
        const server = await startServer(site);
        try {
          await captureAll({
            baseUrl: server.url,
            routes: ['/', '/b/'],
            widths: [WIDTH],
            outDir: shots,
            cacheDir: path.join(tmp, 'asset-cache'),
            log: () => {},
          });
        } finally {
          await server.close();
        }
        shotDirs[side] = shots;
      }
      // The page that could not be photographed.
      fs.rmSync(path.join(shotDirs.candidate, `b@${WIDTH}.png`));

      const oneWidth = loadConfig('test.json', () => JSON.stringify({
        ...JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')), widths: [WIDTH],
      }));
      fs.mkdirSync(path.join(tmp, 'o1', 'diffs'), { recursive: true });
      const out = comparePairs({
        config: oneWidth,
        sharedRoutes: ['/', '/b/'],
        baselineShotDir: shotDirs.baseline,
        candidateShotDir: shotDirs.candidate,
        diffDir: path.join(tmp, 'o1', 'diffs'),
      });

      check('O1 a missing screenshot raises a run failure',
        out.runFailures.some((f) => f.includes('screenshot missing') && f.includes(`b@${WIDTH}.png`)),
        `expected a "screenshot missing" run failure naming b@${WIDTH}.png, `
        + `got ${JSON.stringify(out.runFailures)}`);
      check('O1 the unphotographed page is not reported as compared',
        out.comparedPairs === 1 && out.pages.length === 1 && out.pages[0].route === '/',
        `expected exactly the photographed route to be compared, got `
        + `comparedPairs=${out.comparedPairs} pages=${JSON.stringify(out.pages.map((p) => p.route))}`);
      check('O1 the page that WAS photographed still passes',
        out.pages[0] && out.pages[0].status === 'PASS',
        `the control half of this fixture must stay green, got `
        + `${out.pages[0] && out.pages[0].status}`);
    }

    // --- O2: run failures must reach the failure count.
    // Deleting `failCount += runFailures.length` makes a run whose MEASUREMENT
    // is untrustworthy exit 0.
    {
      const clean = [{ route: '/', status: 'PASS' }, { route: '/b/', status: 'PASS' }];
      check('O2 run failures alone make a run fail',
        tallyFailures({ pages: clean, structural: [], runFailures: ['a', 'b'] }) === 2,
        `a run with two run failures and no failing page must count 2, got `
        + `${tallyFailures({ pages: clean, structural: [], runFailures: ['a', 'b'] })}`);
      check('O2 structural changes alone make a run fail',
        tallyFailures({ pages: clean, structural: ['page removed: /x/'], runFailures: [] }) === 1,
        'a removed page with no failing pixel comparison must still count');
      check('O2 failing pages are counted',
        tallyFailures({
          pages: [...clean, { route: '/c/', status: 'FAIL' }],
          structural: [], runFailures: [],
        }) === 1,
        'a FAIL page must count');
      check('O2 a wholly clean run counts zero',
        tallyFailures({ pages: clean, structural: [], runFailures: [] }) === 0,
        'control: the tally is not just always-nonzero');
    }

    // --- O3: the redirect comparison itself, both directions.
    {
      check('O3 an undeclared redirect is a failure',
        redirectFailures('baseline', { '/gallery/': '/saunas/' }, {}).length === 1,
        'a route that redirected somewhere nobody declared must be reported');
      check('O3 a redirect to the wrong place is a failure',
        redirectFailures('baseline', { '/gallery/': '/elsewhere/' }, { '/gallery/': '/saunas/' })
          .length === 1,
        'a declared redirect that changed target must be reported');
      check('O3 a redirect that stopped happening is a failure',
        redirectFailures('baseline', {}, { '/gallery/': '/saunas/' }).length === 1,
        'a declaration with no matching observation must be reported');
      check('O3 a matching redirect is silent',
        redirectFailures('baseline', { '/gallery/': '/saunas/' }, { '/gallery/': '/saunas/' })
          .length === 0,
        'control: a correctly declared redirect must not fail the run');
    }
    process.stdout.write('\nV — the reveal pin still points at something\n');
    await checkRevealPin(REVEAL_PIN_SELECTORS, 'V');

    process.stdout.write('\nM — mutation battery (runnable, not a prose comment)\n');
    await runMutationBattery(tmp);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  process.stdout.write('\nO4 — the redirect gate is actually WIRED IN (real CLI run)\n');
  {
    // O3 tests the comparison function. This tests that main() still CALLS it:
    // deleting the `redirectFailures(...)` line from captureBuild leaves O3
    // green. So run the real CLI, end to end, against two real commits, with a
    // config that declares no redirects at all — the site genuinely redirects
    // /gallery/ and /process/, so a wired-in gate must fail the run and say so.
    //
    // This is the slow fixture (two Eleventy builds + a capture pass). It is
    // narrowed to one width, and it is the only way to prove the wiring.
    const cfgFile = path.join(os.tmpdir(), `ssc-vd-redirect-${process.pid}.json`);
    const base = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    fs.writeFileSync(cfgFile, JSON.stringify({ ...base, widths: [1440], expectedRedirects: {} }));
    let code = 0;
    let out = '';
    try {
      out = execFileSync(process.execPath,
        [path.join(REPO_ROOT, 'scripts', 'visual-diff.mjs'),
          '-b', 'HEAD~1', '-c', 'HEAD', '--config', cfgFile],
        { cwd: REPO_ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (err) {
      code = err.status;
      out = `${err.stdout || ''}${err.stderr || ''}`;
    } finally {
      fs.rmSync(cfgFile, { force: true });
    }
    check('O4 an undeclared redirect fails the real run',
      code !== 0, `expected a non-zero exit, got ${code}. output tail: ${out.slice(-600)}`);
    check('O4 the run says which route redirected undeclared',
      /is not declared in "expectedRedirects"/.test(out) && /\/gallery\/|\/process\//.test(out),
      `the redirect gate did not fire. output tail: ${out.slice(-800)}`);
  }

  process.stdout.write('\nF4 — WORKING on a CLEAN tree must not disguise a self-comparison\n');
  {
    // The defect: resolveRef('WORKING') appended "+dirty" unconditionally, so
    // WORKING could never string-match any real sha and the sha-equality guard
    // in main() was unreachable. On a clean checkout of main, the DEFAULT
    // invocation `-b main -c WORKING` built the same commit twice, compared it
    // with itself, and reported "PASS, 19 pairs" having measured nothing.
    //
    // Two halves, tested separately because the live repo is dirty during any
    // test run and so cannot itself supply the clean case:
    //   F4a  WORKING on a clean tree resolves to a BARE sha (scratch repo)
    //   F4b  two ref names resolving to one sha are refused (real CLI)
    // Together those are the bug: F4a restores the collision, F4b acts on it.
    const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'ssc-vd-cleanrepo-'));
    try {
      const g = (...a) => execFileSync('git', a, { cwd: scratch, encoding: 'utf8', stdio: 'pipe' });
      g('init', '--quiet');
      g('config', 'user.email', 'fixture@example.com');
      g('config', 'user.name', 'fixture');
      fs.writeFileSync(path.join(scratch, 'a.txt'), 'one\n');
      g('add', '-A');
      g('commit', '--quiet', '-m', 'first');
      const head = g('rev-parse', '--short', 'HEAD').trim();

      check('F4a a clean tree resolves WORKING to the bare HEAD sha',
        resolveRef('WORKING', scratch) === head,
        `expected ${head}, got ${resolveRef('WORKING', scratch)}. An unconditional `
        + `"+dirty" suffix here is what made the self-comparison guard unreachable.`);

      // A tracked edit.
      fs.writeFileSync(path.join(scratch, 'a.txt'), 'two\n');
      check('F4b a modified tracked file marks WORKING dirty',
        resolveRef('WORKING', scratch) === `${head}+dirty`,
        `expected ${head}+dirty, got ${resolveRef('WORKING', scratch)}`);

      // ...and back to clean, then an UNTRACKED file. materializeWorkingTree
      // copies untracked files into the build, so they genuinely make WORKING a
      // different build from HEAD and must count as dirty.
      g('checkout', '--quiet', '--', 'a.txt');
      check('F4c a clean tree is clean again after the edit is reverted',
        resolveRef('WORKING', scratch) === head,
        `expected ${head}, got ${resolveRef('WORKING', scratch)}`);
      fs.writeFileSync(path.join(scratch, 'untracked.txt'), 'new\n');
      check('F4d an untracked file marks WORKING dirty',
        resolveRef('WORKING', scratch) === `${head}+dirty`,
        `expected ${head}+dirty, got ${resolveRef('WORKING', scratch)}. Untracked files `
        + `are copied into a WORKING build, so they change what is measured.`);
    } finally {
      fs.rmSync(scratch, { recursive: true, force: true });
    }

    // F4e: two DIFFERENT ref names resolving to ONE sha must be refused. This
    // is the guard that F4a re-arms; the string-equality check above it in
    // main() does not catch this shape.
    let code = 0;
    let out = '';
    try {
      out = execFileSync(process.execPath,
        [path.join(REPO_ROOT, 'scripts', 'visual-diff.mjs'), '-b', 'HEAD', '-c', 'HEAD~0'],
        { cwd: REPO_ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (err) {
      code = err.status;
      out = `${err.stdout || ''}${err.stderr || ''}`;
    }
    check('F4e two ref names for one commit are refused',
      code !== 0 && /both resolve to|proves nothing/i.test(out),
      `expected a refusal naming the collision, got exit ${code}: ${out.slice(0, 500)}`);
    check('F4e the refusal comes before any build',
      !/Building baseline/.test(out),
      'the sha-equality guard must fire before the expensive work');
  }

  process.stdout.write('\nF5 — the CLI must still RUN when invoked through a symlink\n');
  {
    // The invokedDirectly guard compared the literal argv path against the
    // module's resolved URL, so `node /symlinked/path/scripts/visual-diff.mjs`
    // matched nothing, main() never ran, and the process exited 0 having done
    // nothing. Exit 0 with no output is what CI reads as "the gate passed" --
    // the worst possible failure mode for a gate.
    const link = path.join(os.tmpdir(), `ssc-vd-link-${process.pid}`);
    fs.rmSync(link, { force: true });
    fs.symlinkSync(REPO_ROOT, link, 'dir');
    let code = 0;
    let out = '';
    try {
      out = execFileSync(process.execPath,
        [path.join(link, 'scripts', 'visual-diff.mjs'), '-b', 'HEAD', '-c', 'HEAD'],
        { cwd: REPO_ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (err) {
      code = err.status;
      out = `${err.stdout || ''}${err.stderr || ''}`;
    } finally {
      fs.rmSync(link, { force: true });
    }
    // Invoked through the symlink with a self-comparison, it must refuse loudly
    // -- exactly as it does through the real path. What it must never do is
    // exit 0 in silence.
    check('F5 a symlinked invocation actually runs',
      !(code === 0 && out.trim() === ''),
      'exit 0 with no output means main() never ran: the guard failed open');
    check('F5 a symlinked invocation reaches the same refusal',
      code !== 0 && /itself|self-comparison|proves nothing/i.test(out),
      `expected the self-comparison refusal, got exit ${code}: ${out.slice(0, 400)}`);
  }

  process.stdout.write('\nConfig validation — the four fail-open paths, closed\n');
  {
    const base = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    const withCfg = (patch) => () => loadConfig('test.json', () => JSON.stringify({ ...base, ...patch }));

    expectThrows('empty widths is an error', withCfg({ widths: [] }), 'non-empty');
    expectThrows('missing widths is an error', withCfg({ widths: undefined }), 'non-empty');
    expectThrows('a bare-string waiver is rejected',
      withCfg({ expectedToChange: ['/about/'] }), 'per-metric');
    expectThrows('waiving layoutShiftMaxPx is rejected',
      withCfg({ expectedToChange: [{ route: '/a/', reason: 'r', waive: ['layoutShiftMaxPx'] }] }),
      'never be waived');
    expectThrows('waiving shiftCoverage is rejected',
      withCfg({ expectedToChange: [{ route: '/a/', reason: 'r', waive: ['shiftCoverage'] }] }),
      'never be waived');
    expectThrows('an unknown waiver metric is rejected',
      withCfg({ expectedToChange: [{ route: '/a/', reason: 'r', waive: ['vibes'] }] }), 'unknown metric');
    expectThrows('a waiver without a reason is rejected',
      withCfg({ expectedToChange: [{ route: '/a/', waive: ['changedPct'] }] }), 'reason');
    expectThrows('a missing budget is an error, not a default',
      withCfg({ minShiftCoverage: undefined }), 'must be a number');

    const ok = loadConfig('test.json', () => JSON.stringify({
      ...base, expectedToChange: [{ route: '/a/', reason: 'restyle', waive: ['changedPct'] }],
    }));
    check('a changedPct waiver leaves the shift gate armed',
      evaluatePair(ok, '/a/', {
        layoutShiftMaxPx: 9, shiftCoverage: 1, shiftMeasurable: true,
        heightDeltaPx: 0, changedPct: 40,
      }).status === 'FAIL',
      'a page waiving changedPct must still fail on shift');
    check('a changedPct waiver does silence changedPct',
      evaluatePair(ok, '/a/', {
        layoutShiftMaxPx: 0, shiftCoverage: 1, shiftMeasurable: true,
        heightDeltaPx: 0, changedPct: 40,
      }).status === 'EXPECTED',
      'the waiver must actually waive the metric it names');
    check('the gate reads layoutShiftMaxPx, not the p99',
      evaluatePair(ok, '/nowhere/', {
        layoutShiftPx: 0, layoutShiftMaxPx: 9, shiftCoverage: 1, shiftMeasurable: true,
        heightDeltaPx: 0, changedPct: 0,
      }).status === 'FAIL',
      'a page whose p99 is clean but whose worst row moved 9px must still fail');
    {
      // Coverage is reported as 0 for an unmeasurable page, so a FAIL here can
      // happen for the wrong reason. Assert the SPECIFIC reason, or a mutation
      // that deletes the unmeasurable branch still shows green.
      const v = evaluatePair(ok, '/a/', {
        layoutShiftPx: 0, layoutShiftMaxPx: 0, shiftCoverage: 0, shiftMeasurable: false,
        heightDeltaPx: 0, changedPct: 0,
      });
      check('an unmeasurable page fails rather than passes',
        v.status === 'FAIL', 'no evidence of change is not evidence of no change');
      check('...and fails as unmeasurable, not as a coverage breach',
        v.reasons.length === 1 && v.reasons[0].includes('not measurable'),
        `expected exactly one "not measurable" reason, got ${JSON.stringify(v.reasons)}`);
    }
  }

  process.stdout.write('\nP — per-page overrides move ONE budget, the way its TYPE allows, never off\n');
  {
    const base = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    const NOW = Date.parse('2026-08-01T12:00:00Z');
    const cfg = (pageOverrides, now = NOW) =>
      loadConfig('test.json', () => JSON.stringify({ ...base, pageOverrides }), now);
    const throwsWith = (name, pageOverrides, mustMention, now = NOW) =>
      expectThrows(name, () => cfg(pageOverrides, now), mustMention);

    const LIVE = {
      page: '/about/', metric: 'maxLayoutShiftPx', value: 24,
      reason: 'new hero type scale moves the fold ~20px, approved in design review',
      expires: '2026-09-30',
    };
    // A page that legitimately moved 20px: over the global 4px budget, under a
    // raised 24px one.
    const MOVED_20PX = {
      layoutShiftPx: 20, layoutShiftMaxPx: 20, shiftCoverage: 1, shiftMeasurable: true,
      heightDeltaPx: 0, changedPct: 0,
    };

    check('P1 without an override, a 20px shift fails',
      evaluatePair(cfg([]), '/about/', MOVED_20PX).status === 'FAIL',
      'control: the global 4px budget must reject a 20px shift');
    check('P1 an override admits a page that would otherwise fail',
      evaluatePair(cfg([LIVE]), '/about/', MOVED_20PX).status === 'PASS',
      `expected PASS under a 24px override, got `
      + `${JSON.stringify(evaluatePair(cfg([LIVE]), '/about/', MOVED_20PX))}`);

    check('P2 an override touches only the page it names',
      evaluatePair(cfg([LIVE]), '/faq/', MOVED_20PX).status === 'FAIL',
      'a raised budget on /about/ must leave every other page on the global budget');
    check('P2 an override touches only the metric it names',
      evaluatePair(cfg([LIVE]), '/about/', {
        ...MOVED_20PX, layoutShiftMaxPx: 0, layoutShiftPx: 0, shiftCoverage: 0.5,
      }).status === 'FAIL',
      'raising the shift budget must not also relax the coverage floor');
    check('P2 an override cannot rescue an unmeasurable page',
      evaluatePair(cfg([LIVE]), '/about/', {
        layoutShiftPx: 0, layoutShiftMaxPx: 0, shiftCoverage: 0, shiftMeasurable: false,
        heightDeltaPx: 0, changedPct: 0,
      }).status === 'FAIL',
      'an override moves a threshold; it cannot excuse a page nothing is known about');
    check('P2 a page still fails once it exceeds even its raised budget',
      evaluatePair(cfg([LIVE]), '/about/', { ...MOVED_20PX, layoutShiftMaxPx: 25 }).status === 'FAIL',
      'the raised budget is still a budget');

    throwsWith('P3 an expired override fails the run',
      [{ ...LIVE, expires: '2026-07-01' }], 'expired');
    check('P3 an override is valid through the whole of its expiry day',
      cfg([{ ...LIVE, expires: '2026-08-01' }], Date.parse('2026-08-01T12:00:00Z'))
        .overrides.size === 1,
      'an override expiring today must still be in force today');
    throwsWith('P3 an override with no expiry is rejected',
      [{ page: '/a/', metric: 'maxLayoutShiftPx', value: 24, reason: 'r' }], 'expires');
    throwsWith('P3 a malformed expiry is rejected',
      [{ ...LIVE, expires: 'next tuesday' }], 'YYYY-MM-DD');

    throwsWith('P3 an expiry more than 90 days out is rejected',
      [{ ...LIVE, expires: '2027-06-30' }], '90 days');
    check('P3 an expiry just inside 90 days is accepted',
      cfg([{ ...LIVE, expires: '2026-10-29' }]).overrides.size === 1,
      'a date inside the horizon must be allowed');

    // --- ceilings: raise only, capped ---
    throwsWith('P4 a ceiling value below the global budget is rejected',
      [{ ...LIVE, value: 2 }], 'does not raise');
    throwsWith('P4 a ceiling value equal to the global budget is rejected',
      [{ ...LIVE, value: base.maxLayoutShiftPx }], 'does not raise');
    throwsWith('P4 a zero value is rejected — an override cannot disable a metric',
      [{ ...LIVE, value: 0 }], 'does not raise');
    throwsWith('P4 an absurd ceiling value is rejected (metric off with extra steps)',
      [{ ...LIVE, value: 999999 }], '100x');
    throwsWith('P4 Infinity is rejected', [{ ...LIVE, value: Infinity }], 'numeric');
    check('P4 a ceiling at exactly 100x the global is the last legal value',
      cfg([{ ...LIVE, value: base.maxLayoutShiftPx * 100 }]).overrides.size === 1,
      'the cap is inclusive; one step past it is not');
    throwsWith('P4 one step past 100x is rejected',
      [{ ...LIVE, value: base.maxLayoutShiftPx * 100 + 1 }], '100x');
    throwsWith('P4 the other ceiling behaves the same way',
      [{ ...LIVE, metric: 'maxChangedPct', value: base.maxChangedPct * 100 + 1 }], '100x');

    // --- the floor: LOWER only, bounded ---
    // minShiftCoverage is a minimum, so raising it tightens the gate and the
    // shippable direction is down. Raise-only treatment made 6 of 19 pages in a
    // real 6px restyle run unshippable with no legal override available.
    const COVER = {
      page: '/about/', metric: 'minShiftCoverage', value: 0.88,
      reason: 'hero rebuild replaces the top third of the page, approved in design review',
      expires: '2026-09-30',
    };
    const COVERAGE_DROPPED = {
      layoutShiftPx: 0, layoutShiftMaxPx: 0, shiftCoverage: 0.9, shiftMeasurable: true,
      heightDeltaPx: 0, changedPct: 0,
    };
    check('P7 without an override, coverage 0.90 fails the 0.95 floor',
      evaluatePair(cfg([]), '/about/', COVERAGE_DROPPED).status === 'FAIL',
      'control: the global floor must reject it');
    check('P7 LOWERING the floor admits the page — the shippable direction',
      evaluatePair(cfg([COVER]), '/about/', COVERAGE_DROPPED).status === 'PASS',
      `expected PASS under a 0.88 floor, got `
      + `${JSON.stringify(evaluatePair(cfg([COVER]), '/about/', COVERAGE_DROPPED))}`);
    check('P7 a page still fails below even its lowered floor',
      evaluatePair(cfg([COVER]), '/about/', { ...COVERAGE_DROPPED, shiftCoverage: 0.8 })
        .status === 'FAIL',
      'the lowered floor is still a floor');
    check('P7 a lowered floor touches only the page it names',
      evaluatePair(cfg([COVER]), '/faq/', COVERAGE_DROPPED).status === 'FAIL',
      'every other page stays on the global floor');
    throwsWith('P7 RAISING the floor is rejected — wrong direction',
      [{ ...COVER, value: 0.99 }], 'does not lower');
    throwsWith('P7 a floor equal to the global is rejected',
      [{ ...COVER, value: base.minShiftCoverage }], 'does not lower');
    throwsWith('P7 a floor below 0.75 is rejected',
      [{ ...COVER, value: 0.5 }], '[0.75');
    check('P7 exactly 0.75 is the last legal floor',
      cfg([{ ...COVER, value: 0.75 }]).overrides.size === 1,
      'the lower bound is inclusive');
    throwsWith('P7 a nonsense floor above 1 is rejected',
      [{ ...COVER, value: 5 }], 'does not lower');
    throwsWith('P7 a floor of exactly 1 is rejected',
      [{ ...COVER, value: 1 }], 'does not lower');

    throwsWith('P5 an unknown metric is rejected',
      [{ ...LIVE, metric: 'vibes' }], 'unknown metric');
    throwsWith('P5 waiving-by-override is not a thing',
      [{ ...LIVE, metric: 'shiftMeasurable' }], 'unknown metric');
    throwsWith('P5 a missing reason is rejected',
      [{ page: '/a/', metric: 'maxChangedPct', value: 40, expires: '2026-09-30' }], 'reason');
    throwsWith('P5 an empty reason is rejected', [{ ...LIVE, reason: '   ' }], 'reason');
    throwsWith('P5 a missing page is rejected',
      [{ metric: 'maxLayoutShiftPx', value: 24, reason: 'r', expires: '2026-09-30' }], 'page');
    throwsWith('P5 a duplicate page/metric pair is rejected', [LIVE, LIVE], 'duplicate');
    throwsWith('P5 a non-array pageOverrides is rejected', { page: '/a/' }, 'must be an array');

    check('P6 an override keeps its reason and expiry for the report',
      (() => {
        const [o] = [...cfg([LIVE]).overrides.values()];
        return o && o.page === '/about/' && o.metric === 'maxLayoutShiftPx'
          && o.value === 24 && o.reason === LIVE.reason && o.expires === '2026-09-30';
      })(),
      'report.json must be able to say which budget was raised, why, and until when, '
      + 'without reconstructing it from the map key');
    check('P6 two metrics on one page coexist',
      cfg([LIVE, { ...LIVE, metric: 'maxChangedPct', value: 40 }]).overrides.size === 2,
      'the key must distinguish metrics, not just pages');
    check('P6 one metric on two pages coexist',
      cfg([LIVE, { ...LIVE, page: '/faq/' }]).overrides.size === 2,
      'the key must distinguish pages, not just metrics');

    // Historical note: this assertion originally required ZERO shipped overrides
    // ("Batch 1 changes no rendered output"). That was Batch-1-scoped truth baked
    // as a permanent invariant; the wave's later batches legitimately ship
    // reviewer-attributed overrides. What IS permanent is the calibration-route
    // rule, learned 2026-07-31 when a reviewer-prescribed override on '/' was
    // applied and disarmed F1 within minutes: the F-series calibrates against
    // route '/' using the SHIPPED config, so an override there blinds the
    // harness's own self-test. This fixture is that rule's enforcement.
    {
      const shipped = loadConfig(CONFIG_FILE, fs.readFileSync).overrides;
      const onCalibrationRoute = [...shipped.values()].filter((o) => o.page === '/');
      check('P6 no shipped override ever names the calibration route "/"',
        onCalibrationRoute.length === 0,
        `the F-series self-test evaluates '/' against the shipped config; an override there `
        + `disarms it (caught live 2026-07-31). Found: ${JSON.stringify(onCalibrationRoute)}`);
    }
  }

  process.stdout.write(`\n${passes} passed, ${failures} failed\n`);
  return failures === 0 ? 0 : 1;
}

main().then(
  (code) => process.exit(code),
  (err) => { console.error(`\nvisual-diff tests crashed: ${err.stack || err.message}`); process.exit(2); }
);
