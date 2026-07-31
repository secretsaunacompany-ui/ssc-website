#!/usr/bin/env node
/**
 * Visual regression harness for the Secret Sauna Company website.
 *
 * Builds the site twice from two git refs, screenshots every page it produced
 * at desktop and mobile widths, and reports how much moved. Exits non-zero when
 * anything moves further than the configured budget, so it can gate a merge.
 *
 *   node scripts/visual-diff.mjs --baseline main --candidate WORKING
 *
 * See scripts/README.md for what the output means.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildRef, enumeratePages, routeSlug, resolveRef } from './lib/build-ref.mjs';
import { startServer } from './lib/server.mjs';
import { captureAll } from './lib/capture.mjs';
import { comparePair } from './lib/diff.mjs';
import {
  loadConfig as loadGateConfig, evaluatePair, overBudget, evaluateFitDivergence,
} from './lib/gate.mjs';

const REPO_ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const WORK_DIR = path.join(REPO_ROOT, '.visual-diff');
const CACHE_DIR = path.join(WORK_DIR, 'asset-cache');

const log = (msg) => process.stdout.write(`${msg}\n`);

function parseArgs(argv) {
  const args = { baseline: 'main', candidate: 'WORKING', open: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--baseline' || a === '-b') args.baseline = argv[++i];
    else if (a === '--candidate' || a === '-c') args.candidate = argv[++i];
    else if (a === '--config') args.config = argv[++i];
    else if (a === '--help' || a === '-h') args.help = true;
    else throw new Error(`Unknown argument: ${a}`);
  }
  return args;
}

const HELP = `
Visual diff harness

  npm run visual-diff -- --baseline <ref> --candidate <ref>

  --baseline, -b   git ref to treat as "before"  (default: main)
  --candidate, -c  git ref to treat as "after",  or WORKING for the
                   current uncommitted working tree (default: WORKING)
  --config         path to a config JSON (default: scripts/visual-diff.config.json)

Exits 0 if every page is within budget, 1 if any page is not.
`;

/** Budgets and waiver rules live in lib/gate.mjs; nothing is defaulted here. */
const loadConfig = (file) => loadGateConfig(file, fs.readFileSync);

/** Compare the observed redirect map against the declared one, both ways. */
export function redirectFailures(name, observed, declared) {
  const out = [];
  for (const [route, dest] of Object.entries(observed)) {
    if (!(route in declared)) {
      out.push(`${name}: ${route} redirected to ${dest}, which is not declared in `
        + `"expectedRedirects". Its screenshot is of a different page than its name says.`);
    } else if (declared[route] !== dest) {
      out.push(`${name}: ${route} redirected to ${dest}, but "expectedRedirects" declares `
        + `${declared[route]}.`);
    }
  }
  for (const route of Object.keys(declared)) {
    if (!(route in observed)) {
      out.push(`${name}: ${route} is declared in "expectedRedirects" but did not redirect. `
        + `Remove the declaration, or find out why the redirect stopped.`);
    }
  }
  return out;
}

async function captureBuild(name, ref, config) {
  const distDir = path.join(WORK_DIR, name, 'dist');
  const shotDir = path.join(WORK_DIR, name, 'shots');

  log(`\n  Building ${name} (${ref})`);
  const built = buildRef(ref, distDir);
  const routes = enumeratePages(distDir);
  log(`  Built ${built.sha} — ${routes.length} pages`);

  const server = await startServer(distDir);
  try {
    fs.rmSync(shotDir, { recursive: true, force: true });
    const assetStats = await captureAll({
      baseUrl: server.url,
      routes,
      widths: config.widths,
      outDir: shotDir,
      cacheDir: CACHE_DIR,
      log: () => {},
    });
    log(`  Captured ${routes.length * config.widths.length} screenshots`
      + ` (assets: ${assetStats.cacheHits} cached, ${assetStats.cacheMisses} fetched,`
      + ` ${assetStats.blocked} blocked, ${assetStats.videoStubbed} video stubbed`
      + ` across ${assetStats.videoElements} video element(s))`);

    // Every one of these used to be a WARNING or a silently-dropped stat. A
    // measurement tool that cannot vouch for its own inputs must not return a
    // verdict, so each is a hard failure of the run.
    const failures = [];
    if (assetStats.fetchFailures > 0) {
      failures.push(`${name}: ${assetStats.fetchFailures} remote asset fetch(es) failed. `
        + `The screenshots are missing assets, so any comparison against them is meaningless. `
        + `Check the network and re-run.`);
    }
    if (assetStats.unknownHosts.length > 0) {
      failures.push(`${name}: blocked unrecognised host(s): ${assetStats.unknownHosts.join(', ')}. `
        + `Add them to CACHED_HOSTS or BLOCKED_HOSTS in lib/capture.mjs deliberately.`);
    }
    if (assetStats.brokenImages.length > 0) {
      failures.push(`${name}: image(s) failed to load, which collapses their box and moves `
        + `everything beneath them:\n      - ${assetStats.brokenImages.join('\n      - ')}`);
    }
    failures.push(...redirectFailures(name, assetStats.redirects, config.expectedRedirects));

    return { built, routes, shotDir, failures };
  } finally {
    await server.close();
  }
}

/**
 * Compare every shared route at every configured width.
 *
 * Extracted from main() so the fixtures can drive the REAL loop — the same
 * function the CLI calls — instead of a lookalike. Without a seam here the
 * whole orchestration layer was untestable, and three separate mutations to it
 * (deleting the run-failure tally, reverting the missing-screenshot handling to
 * `continue`, deleting the redirect gate call) left the suite fully green.
 *
 * @returns {{ pages: object[], comparedPairs: number, runFailures: string[] }}
 */
export function comparePairs({ config, sharedRoutes, baselineShotDir, candidateShotDir, diffDir }) {
  const pages = [];
  const runFailures = [];
  let comparedPairs = 0;

  for (const route of sharedRoutes) {
    const entry = config.allow.get(route) || null;
    for (const width of config.widths) {
      const name = `${routeSlug(route)}@${width}.png`;
      const a = path.join(baselineShotDir, name);
      const b = path.join(candidateShotDir, name);

      // A missing screenshot used to `continue`, silently dropping the page
      // from the run while still reporting PASS at the end. If a page could not
      // be photographed, nothing is known about it.
      const missing = [];
      if (!fs.existsSync(a)) missing.push(`baseline ${name}`);
      if (!fs.existsSync(b)) missing.push(`candidate ${name}`);
      if (missing.length > 0) {
        runFailures.push(`${route} @${width}: screenshot missing (${missing.join(', ')}). `
          + `The page was never compared, so it cannot be reported as unchanged.`);
        continue;
      }

      const result = comparePair(a, b, path.join(diffDir, name),
        (r) => overBudget(config, route, r));
      const verdict = evaluatePair(config, route, result);
      comparedPairs += 1;

      pages.push({
        route,
        width,
        status: verdict.status,
        reasons: verdict.reasons,
        waivedReasons: verdict.waivedReasons,
        expectedReason: entry ? entry.reason : null,
        ...result,
      });
    }
  }

  // The affine fit is gated on its own terms, across the widths of a single
  // page. A page may compress; the two widths may not compress by wildly
  // different ratios, or move in opposite directions, without that being visible.
  const byRoute = new Map();
  for (const p of pages) {
    if (!byRoute.has(p.route)) byRoute.set(p.route, []);
    byRoute.get(p.route).push({ width: p.width, offset: p.globalOffsetPx, scale: p.globalScale });
  }
  for (const [route, perWidth] of byRoute) {
    runFailures.push(...evaluateFitDivergence(config, route, perWidth));
  }

  // Comparing nothing at all is not a pass. This closes the `widths: []` class
  // of failure at the far end too, whatever produced it.
  if (comparedPairs === 0) {
    runFailures.push(`No page/width pair was compared. A run that measures nothing `
      + `cannot report PASS. (${sharedRoutes.length} shared route(s), `
      + `${config.widths.length} width(s).)`);
  }

  return { pages, comparedPairs, runFailures };
}

/**
 * The single place a run's failure count is computed.
 *
 * All three buckets count. Run failures in particular: they are the ones that
 * say the MEASUREMENT is untrustworthy (a failed asset fetch, an undeclared
 * redirect, a screenshot that does not exist), and dropping them from the tally
 * turns every such run into a green one that proves nothing.
 */
export function tallyFailures({ pages, structural, runFailures }) {
  return pages.filter((p) => p.status === 'FAIL').length
    + structural.length
    + runFailures.length;
}

function writeHtmlReport(file, report) {
  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const rows = report.pages.map((p) => `
    <tr class="${p.status.toLowerCase()}">
      <td><code>${esc(p.route)}</code></td>
      <td>${p.width}px</td>
      <td>${p.changedPct.toFixed(3)}%</td>
      <td>&times;${p.globalScale.toFixed(4)} ${p.globalOffsetPx > 0 ? '+' : ''}${p.globalOffsetPx}px <span style="color:#777">(${(p.globalOffsetConfidence * 100).toFixed(0)}% fit)</span></td>
      <td>${p.layoutShiftMaxPx}px <span style="color:#777">(p99 ${p.layoutShiftPx}px)</span></td>
      <td>${p.shiftMeasurable ? p.shiftCoverage.toFixed(3) : 'unmeasurable'}</td>
      <td>${p.heightDeltaPx > 0 ? '+' : ''}${p.heightDeltaPx}px</td>
      <td><strong>${p.status}</strong>${
        [...p.reasons, ...p.waivedReasons].length
          ? `<br><span style="color:#999;font-size:12px">${esc([...p.reasons, ...p.waivedReasons].join('; '))}</span>`
          : ''}</td>
      <td>${p.diffImage ? `<a href="${esc(path.relative(path.dirname(file), p.diffImage))}">view</a>` : ''}</td>
    </tr>`).join('');

  fs.writeFileSync(file, `<!doctype html>
<html><head><meta charset="utf-8"><title>Visual diff report</title>
<style>
 body{font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;margin:0;padding:2.5rem;background:#111;color:#eee}
 h1{font-weight:500;font-size:1.5rem;margin:0 0 .25rem}
 p.sub{color:#999;margin:0 0 2rem}
 table{border-collapse:collapse;width:100%;font-size:14px}
 th,td{text-align:left;padding:.5rem .75rem;border-bottom:1px solid #262626}
 th{color:#888;font-weight:500;font-size:12px;text-transform:uppercase;letter-spacing:.06em}
 tr.fail td{background:rgba(220,60,60,.12)}
 tr.expected td{background:rgba(200,160,60,.10)}
 code{color:#8ab4f8}
 a{color:#8ab4f8}
 .verdict{display:inline-block;padding:.4rem .9rem;border-radius:6px;margin-bottom:2rem;font-weight:500}
 .verdict.pass{background:#1d3a24;color:#7ee39a}
 .verdict.fail{background:#3a1d1d;color:#ff8a8a}
 ul.runfail{margin:0 0 2rem;padding:0 0 0 1.2rem;color:#ff8a8a;font-size:14px}
 ul.runfail li{margin:.3rem 0}
</style></head><body>
<h1>Visual diff report</h1>
<p class="sub">${esc(report.baseline.ref)} (${esc(report.baseline.sha)}) &rarr; ${esc(report.candidate.ref)} (${esc(report.candidate.sha)}) &middot; ${esc(report.generatedAt)}</p>
<div class="verdict ${report.failed ? 'fail' : 'pass'}">${report.failed ? `FAIL — ${report.failCount} item(s) over budget or unmeasurable` : `PASS — ${report.comparedPairs} page/width pair(s) compared, all within budget`}</div>
${(report.runFailures.length || report.structural.length) ? `<ul class="runfail">${
  [...report.runFailures, ...report.structural].map((f) => `<li>${esc(f)}</li>`).join('')
}</ul>` : ''}
<table><thead><tr><th>Page</th><th>Width</th><th>Pixels changed</th><th>Affine fit (scale + offset)</th><th>Local shift (max)</th><th>Shift coverage</th><th>Height change</th><th>Status</th><th>Diff</th></tr></thead>
<tbody>${rows}</tbody></table>
</body></html>`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { log(HELP); return 0; }

  const config = loadConfig(args.config || path.join(REPO_ROOT, 'scripts', 'visual-diff.config.json'));

  // A run that compares a ref to itself measures nothing and reports PASS. That
  // is a false green on the one question the harness exists to answer, so it is
  // an error before any expensive work happens, not a clean run.
  if (args.baseline === args.candidate) {
    throw new Error(
      `Refusing to compare "${args.baseline}" with itself: a self-comparison can only `
      + `report "nothing changed" and proves nothing. Give --baseline and --candidate `
      + `two different refs.`);
  }
  const baselineSha = resolveRef(args.baseline);
  const candidateSha = resolveRef(args.candidate);
  if (baselineSha === candidateSha) {
    throw new Error(
      `Refusing to run: --baseline ${args.baseline} and --candidate ${args.candidate} both `
      + `resolve to ${baselineSha}. A self-comparison proves nothing.`);
  }

  log(`Visual diff: ${args.baseline} (${baselineSha}) -> ${args.candidate} (${candidateSha})`);
  log(`Budget: layout shift <= ${config.maxLayoutShiftPx}px (max, not p99),`
    + ` shift coverage >= ${config.minShiftCoverage},`
    + ` changed pixels <= ${config.maxChangedPct}%`);

  fs.mkdirSync(WORK_DIR, { recursive: true });

  const baseline = await captureBuild('baseline', args.baseline, config);
  const candidate = await captureBuild('candidate', args.candidate, config);

  const diffDir = path.join(WORK_DIR, 'diffs');
  fs.rmSync(diffDir, { recursive: true, force: true });
  fs.mkdirSync(diffDir, { recursive: true });

  const baseSet = new Set(baseline.routes);
  const candSet = new Set(candidate.routes);
  const added = candidate.routes.filter((r) => !baseSet.has(r));
  const removed = baseline.routes.filter((r) => !candSet.has(r));
  const shared = baseline.routes.filter((r) => candSet.has(r));

  const { pages, comparedPairs, runFailures: pairFailures } = comparePairs({
    config,
    sharedRoutes: shared,
    baselineShotDir: baseline.shotDir,
    candidateShotDir: candidate.shotDir,
    diffDir,
  });

  // Run-level failures: things that make the measurement itself untrustworthy,
  // as opposed to a page that legitimately moved.
  const runFailures = [...baseline.failures, ...candidate.failures, ...pairFailures];

  // A page appearing or disappearing is a structural change the pixel diff
  // cannot see, so it is reported separately and fails unless the route
  // explicitly waives "structural".
  const structuralWaived = (r) => {
    const e = config.allow.get(r);
    return Boolean(e && e.waive.has('structural'));
  };
  const structural = [];
  for (const r of added) if (!structuralWaived(r)) structural.push(`page added: ${r}`);
  for (const r of removed) if (!structuralWaived(r)) structural.push(`page removed: ${r}`);

  const failCount = tallyFailures({ pages, structural, runFailures });

  const report = {
    generatedAt: new Date().toISOString(),
    baseline: { ref: args.baseline, sha: baseline.built.sha, pages: baseline.routes.length },
    candidate: { ref: args.candidate, sha: candidate.built.sha, pages: candidate.routes.length },
    budget: {
      maxLayoutShiftPx: config.maxLayoutShiftPx,
      minShiftCoverage: config.minShiftCoverage,
      maxChangedPct: config.maxChangedPct,
    },
    expectedToChange: [...config.allow.entries()].map(([route, e]) => ({
      route, reason: e.reason, waive: [...e.waive],
    })),
    // Overrides are recorded in the report so a green run always carries the
    // list of budgets that were raised to make it green, with the reasons.
    pageOverrides: [...config.overrides.values()],
    expectedRedirects: config.expectedRedirects,
    comparedPairs,
    runFailures,
    structural,
    pages,
    failCount,
    failed: failCount > 0,
  };

  fs.writeFileSync(path.join(WORK_DIR, 'report.json'), JSON.stringify(report, null, 2));
  writeHtmlReport(path.join(WORK_DIR, 'report.html'), report);

  // Console summary: only rows that moved, so a clean run stays quiet.
  log('');
  const noisy = pages.filter((p) => p.status !== 'PASS' || p.changedPixels > 0);
  if (noisy.length === 0) {
    log(`  No visual change on any of ${shared.length} pages at ${config.widths.join('/')}px`
      + ` (${comparedPairs} page/width pairs compared).`);
  } else {
    log('  Page                                    Width   Changed    Scale   Offset    Shift   Height   Status');
    log('  ' + '-'.repeat(103));
    for (const p of noisy.sort((x, y) => y.changedPct - x.changedPct)) {
      log(`  ${p.route.padEnd(38)}  ${String(p.width).padStart(5)}`
        + `  ${(`${p.changedPct.toFixed(3)}%`).padStart(9)}`
        + `  ${(`x${p.globalScale.toFixed(3)}`).padStart(7)}`
        + `  ${(`${p.globalOffsetPx > 0 ? '+' : ''}${p.globalOffsetPx}px`).padStart(7)}`
        + `  ${(`${p.layoutShiftPx}px`).padStart(7)}`
        + `  ${(`${p.heightDeltaPx > 0 ? '+' : ''}${p.heightDeltaPx}px`).padStart(7)}`
        + `   ${p.status}${p.expectedReason ? ` (${p.expectedReason})` : ''}`);
    }
  }
  // Say WHY each failing page failed, not just that it did.
  for (const p of pages) {
    for (const r of p.reasons) log(`  FAIL  ${p.route} @${p.width}: ${r}`);
    for (const r of p.waivedReasons) log(`  ok    ${p.route} @${p.width}: ${r}`);
  }
  for (const s of structural) log(`  STRUCTURAL: ${s}`);
  for (const f of runFailures) log(`  RUN FAILURE: ${f}`);

  log('');
  log(`  Report: ${path.join(WORK_DIR, 'report.html')}`);
  if (report.failed) {
    log(`  FAIL — ${failCount} item(s) outside the budget.`);
    return 1;
  }
  log('  PASS — everything within budget.');
  return 0;
}

// Run only when invoked as the CLI. The fixtures import comparePairs and
// tallyFailures from this file to test the real orchestration layer, and an
// unguarded top-level main() would launch a full two-ref build on import.
//
// Both sides go through realpath. `path.resolve` alone compared the literal
// invocation path against the module's own resolved URL, so invoking through a
// symlinked checkout — `node /symlinked/path/scripts/visual-diff.mjs` — made
// the two disagree and the CLI exited 0 having done nothing at all. A gate that
// silently succeeds when it did not run is worse than one that crashes, and
// exit 0 with no output is exactly what a CI step reads as "passed".
const invokedDirectly = (() => {
  if (!process.argv[1]) return false;
  const real = (p) => { try { return fs.realpathSync(p); } catch { return path.resolve(p); } };
  return real(process.argv[1]) === real(fileURLToPath(import.meta.url));
})();

if (invokedDirectly) {
  main().then(
    (code) => process.exit(code),
    (err) => { console.error(`\nvisual-diff failed: ${err.stack || err.message}`); process.exit(2); }
  );
}
