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
import { buildRef, enumeratePages, routeSlug } from './lib/build-ref.mjs';
import { startServer } from './lib/server.mjs';
import { captureAll } from './lib/capture.mjs';
import { comparePair } from './lib/diff.mjs';

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

function loadConfig(file) {
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  const allow = new Map();
  for (const entry of raw.expectedToChange || []) {
    if (typeof entry === 'string') allow.set(entry, '(no reason given)');
    else allow.set(entry.route, entry.reason || '(no reason given)');
  }
  return {
    widths: raw.widths || [1440, 390],
    maxLayoutShiftPx: raw.maxLayoutShiftPx ?? 8,
    maxChangedPct: raw.maxChangedPct ?? 0.5,
    allow,
  };
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
      + ` ${assetStats.blocked} blocked)`);
    if (assetStats.fetchFailures > 0) {
      log(`  WARNING: ${assetStats.fetchFailures} remote asset fetches failed.`
        + ` If this is the first run, check the network and run again.`);
    }
    if (assetStats.unknownHosts.length > 0) {
      log(`  NOTE: blocked unrecognised hosts: ${assetStats.unknownHosts.join(', ')}`);
    }
    return { built, routes, shotDir };
  } finally {
    await server.close();
  }
}

function writeHtmlReport(file, report) {
  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const rows = report.pages.map((p) => `
    <tr class="${p.status.toLowerCase()}">
      <td><code>${esc(p.route)}</code></td>
      <td>${p.width}px</td>
      <td>${p.changedPct.toFixed(3)}%</td>
      <td>${p.layoutShiftPx}px</td>
      <td>${p.heightDeltaPx > 0 ? '+' : ''}${p.heightDeltaPx}px</td>
      <td><strong>${p.status}</strong></td>
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
</style></head><body>
<h1>Visual diff report</h1>
<p class="sub">${esc(report.baseline.ref)} (${esc(report.baseline.sha)}) &rarr; ${esc(report.candidate.ref)} (${esc(report.candidate.sha)}) &middot; ${esc(report.generatedAt)}</p>
<div class="verdict ${report.failed ? 'fail' : 'pass'}">${report.failed ? `FAIL — ${report.failCount} page/width pair(s) over budget` : 'PASS — everything within budget'}</div>
<table><thead><tr><th>Page</th><th>Width</th><th>Pixels changed</th><th>Layout shift</th><th>Height change</th><th>Status</th><th>Diff</th></tr></thead>
<tbody>${rows}</tbody></table>
</body></html>`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { log(HELP); return 0; }

  const config = loadConfig(args.config || path.join(REPO_ROOT, 'scripts', 'visual-diff.config.json'));

  log(`Visual diff: ${args.baseline} -> ${args.candidate}`);
  log(`Budget: layout shift <= ${config.maxLayoutShiftPx}px, changed pixels <= ${config.maxChangedPct}%`);

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

  const pages = [];
  let failCount = 0;

  for (const route of shared) {
    const expected = config.allow.has(route);
    for (const width of config.widths) {
      const name = `${routeSlug(route)}@${width}.png`;
      const a = path.join(baseline.shotDir, name);
      const b = path.join(candidate.shotDir, name);
      if (!fs.existsSync(a) || !fs.existsSync(b)) continue;

      const overBudget = (r) =>
        r.layoutShiftPx > config.maxLayoutShiftPx
        || Math.abs(r.heightDeltaPx) > config.maxLayoutShiftPx
        || r.changedPct > config.maxChangedPct;

      const result = comparePair(a, b, path.join(diffDir, name), overBudget);

      let status = 'PASS';
      if (overBudget(result)) {
        status = expected ? 'EXPECTED' : 'FAIL';
        if (status === 'FAIL') failCount += 1;
      }

      pages.push({
        route,
        width,
        status,
        expectedReason: expected ? config.allow.get(route) : null,
        ...result,
      });
    }
  }

  // A page appearing or disappearing is a structural change the pixel diff
  // cannot see, so it is reported separately and fails unless allowlisted.
  const structural = [];
  for (const r of added) if (!config.allow.has(r)) { structural.push(`page added: ${r}`); failCount += 1; }
  for (const r of removed) if (!config.allow.has(r)) { structural.push(`page removed: ${r}`); failCount += 1; }

  const report = {
    generatedAt: new Date().toISOString(),
    baseline: { ref: args.baseline, sha: baseline.built.sha, pages: baseline.routes.length },
    candidate: { ref: args.candidate, sha: candidate.built.sha, pages: candidate.routes.length },
    budget: { maxLayoutShiftPx: config.maxLayoutShiftPx, maxChangedPct: config.maxChangedPct },
    expectedToChange: [...config.allow.keys()],
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
    log(`  No visual change on any of ${shared.length} pages at ${config.widths.join('/')}px.`);
  } else {
    log('  Page                                    Width   Changed    Shift   Height   Status');
    log('  ' + '-'.repeat(84));
    for (const p of noisy.sort((x, y) => y.changedPct - x.changedPct)) {
      log(`  ${p.route.padEnd(38)}  ${String(p.width).padStart(5)}`
        + `  ${(`${p.changedPct.toFixed(3)}%`).padStart(9)}`
        + `  ${(`${p.layoutShiftPx}px`).padStart(7)}`
        + `  ${(`${p.heightDeltaPx > 0 ? '+' : ''}${p.heightDeltaPx}px`).padStart(7)}`
        + `   ${p.status}${p.expectedReason ? ` (${p.expectedReason})` : ''}`);
    }
  }
  for (const s of structural) log(`  STRUCTURAL: ${s}`);

  log('');
  log(`  Report: ${path.join(WORK_DIR, 'report.html')}`);
  if (report.failed) {
    log(`  FAIL — ${failCount} item(s) outside the budget.`);
    return 1;
  }
  log('  PASS — everything within budget.');
  return 0;
}

main().then(
  (code) => process.exit(code),
  (err) => { console.error(`\nvisual-diff failed: ${err.stack || err.message}`); process.exit(2); }
);
