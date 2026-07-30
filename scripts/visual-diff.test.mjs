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
import { startServer } from './lib/server.mjs';
import { captureAll } from './lib/capture.mjs';
import { comparePair } from './lib/diff.mjs';
import { loadConfig, evaluatePair } from './lib/gate.mjs';
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
      check('F1 measured a 6px displacement',
        r.layoutShiftMaxPx === 6,
        `expected layoutShiftMaxPx === 6, got ${r.layoutShiftMaxPx} `
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

  process.stdout.write('\nP — per-page budget overrides raise a budget, never disable a metric\n');
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

    throwsWith('P4 a value below the global budget is rejected',
      [{ ...LIVE, value: 2 }], 'does not raise');
    throwsWith('P4 a value equal to the global budget is rejected',
      [{ ...LIVE, value: base.maxLayoutShiftPx }], 'does not raise');
    throwsWith('P4 a zero value is rejected — an override cannot disable a metric',
      [{ ...LIVE, value: 0 }], 'does not raise');

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

    check('P6 the shipped config declares no overrides',
      loadConfig(CONFIG_FILE, fs.readFileSync).overrides.size === 0,
      'Batch 1 changes no rendered output, so it must need no raised budgets');
  }

  process.stdout.write(`\n${passes} passed, ${failures} failed\n`);
  return failures === 0 ? 0 : 1;
}

main().then(
  (code) => process.exit(code),
  (err) => { console.error(`\nvisual-diff tests crashed: ${err.stack || err.message}`); process.exit(2); }
);
