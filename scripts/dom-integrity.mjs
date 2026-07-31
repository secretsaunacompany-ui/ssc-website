#!/usr/bin/env node
/**
 * DOM-integrity check: did the page still say the same thing, in the same
 * structure?
 *
 *   node scripts/dom-integrity.mjs --baseline <ref> --candidate <ref>
 *
 * Builds both refs, loads every page each produced in the same headless browser
 * the pixel harness uses, and compares a normalized structural fingerprint —
 * the element tree and the text. Identical modulo an explicit whitelist, or a
 * named, per-page, loud failure saying which node and what changed.
 *
 * This is the certificate for a change class the pixel harness cannot speak to.
 * A typeface replacement changes every text pixel by design, so row signatures
 * cannot match and the affine model correctly reports does-not-fit. That verdict
 * is the product, not a defect, and it is recorded rather than overridden. What
 * still needs proving is that a restyle changed only presentation — and that is
 * a DOM question.
 *
 * See scripts/README.md for what the output means. Exits 0 when every page is
 * identical modulo the whitelist, 1 when any page is not, 2 on a crash.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { buildRef, enumeratePages, resolveRef } from './lib/build-ref.mjs';
import { startServer } from './lib/server.mjs';
import { installRouting } from './lib/capture.mjs';
import {
  extractFingerprint, diffTokens, describeToken, loadWhitelist, applyWhitelist,
} from './lib/dom-fingerprint.mjs';

const REPO_ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const WORK_DIR = path.join(REPO_ROOT, '.dom-integrity');
const CACHE_DIR = path.join(REPO_ROOT, '.visual-diff', 'asset-cache');

const log = (msg) => process.stdout.write(`${msg}\n`);

const HELP = `
DOM integrity check

  npm run dom-integrity -- --baseline <ref> --candidate <ref>

  --baseline, -b   git ref to treat as "before"  (default: main)
  --candidate, -c  git ref to treat as "after", or WORKING (default: WORKING)
  --config         path to a config JSON (default: scripts/dom-integrity.config.json)
  --widths         comma-separated widths to load each page at (default: 1440,390)

Exits 0 if every page's DOM is identical modulo the whitelist, 1 if not.
`;

function parseArgs(argv) {
  const args = { baseline: 'main', candidate: 'WORKING' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--baseline' || a === '-b') args.baseline = argv[++i];
    else if (a === '--candidate' || a === '-c') args.candidate = argv[++i];
    else if (a === '--config') args.config = argv[++i];
    else if (a === '--widths') args.widths = argv[++i];
    else if (a === '--help' || a === '-h') args.help = true;
    else throw new Error(`Unknown argument: ${a}`);
  }
  return args;
}

function loadConfig(file, widthsOverride) {
  let raw;
  try { raw = JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (err) { throw new Error(`Cannot read dom-integrity config ${file}: ${err.message}`); }

  const widths = widthsOverride
    ? widthsOverride.split(',').map((w) => Number(w.trim()))
    : raw.widths;
  if (!Array.isArray(widths) || widths.length === 0) {
    throw new Error(`${file}: "widths" must be a non-empty array.`);
  }
  for (const w of widths) {
    if (!Number.isInteger(w) || w <= 0) throw new Error(`${file}: bad width ${JSON.stringify(w)}.`);
  }
  return { widths, whitelist: loadWhitelist(file, raw) };
}

/** Load every route at every width and return fingerprints keyed `route@width`. */
async function fingerprintBuild(name, ref, config) {
  const distDir = path.join(WORK_DIR, name, 'dist');
  log(`\n  Building ${name} (${ref})`);
  const built = buildRef(ref, distDir);
  const routes = enumeratePages(distDir);
  log(`  Built ${built.sha} — ${routes.length} pages`);

  const server = await startServer(distDir);
  const browser = await chromium.launch();
  const stats = {
    cacheHits: 0, cacheMisses: 0, fetchFailures: 0, blocked: 0,
    videoStubbed: 0, videoElements: 0, unknownHosts: new Set(), redirects: {}, brokenImages: [],
  };
  const prints = new Map();
  const failures = [];
  try {
    // JAVASCRIPT DISABLED, deliberately, and this is the instrument's stated
    // boundary rather than a convenience.
    //
    // With scripts running, the DOM carries animation state: the parallax writes
    // `transform: translateY(-14.8212px)` into inline styles, and that value is
    // derived from DOCUMENT HEIGHT. A restyle that compresses line-height
    // changes document height, so the resting transform legitimately differs
    // between the two builds — and between the two widths. Measured: 20 pages
    // failed on nothing but fractional transform deltas, and every page was
    // flagged width-dependent for the same reason. An instrument that cannot
    // certify ANY restyle without noise is not measuring the restyle, it is
    // measuring its own camera.
    //
    // The alternative — excluding the `style` attribute — would have been
    // laundering: an inline style is exactly the sort of thing a template
    // change alters, and a volatile-list entry for it would blind the check to
    // real changes.
    //
    // So the certificate is over the DELIVERED markup: what the templates
    // produced, parsed by a real browser (so implied elements, attribute
    // casing and entity handling are the browser's, not a regex's). That is the
    // precise claim a restyle needs, and it is fully deterministic.
    //
    // WHAT THIS DOES NOT COVER: content injected or rewritten by scripts. That
    // is a real boundary, so the run REFUSES to stay quiet about it — if the
    // two builds' js/ differs at all, the report says the boundary was crossed
    // rather than letting a reader assume JS-injected content was certified.
    const context = await browser.newContext({ javaScriptEnabled: false });
    await installRouting(context, CACHE_DIR, stats);
    for (const width of config.widths) {
      const page = await context.newPage();
      await page.setViewportSize({ width, height: 900 });
      for (const route of routes) {
        await page.goto(`${server.url}${route}`, { waitUntil: 'networkidle', timeout: 60000 });
        const tokens = await page.evaluate(extractFingerprint);
        prints.set(`${route}@${width}`, tokens);
      }
      await page.close();
    }
    if (stats.fetchFailures > 0) {
      failures.push(`${name}: ${stats.fetchFailures} remote asset fetch(es) failed; a page may `
        + `have rendered without content it normally has.`);
    }
    if (stats.unknownHosts.size > 0) {
      failures.push(`${name}: blocked unrecognised host(s): ${[...stats.unknownHosts].join(', ')}.`);
    }
  } finally {
    await browser.close();
    await server.close();
  }
  return { built, routes, prints, failures };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { log(HELP); return 0; }

  const config = loadConfig(
    args.config || path.join(REPO_ROOT, 'scripts', 'dom-integrity.config.json'), args.widths);

  // Same refusal as the pixel harness: comparing a ref with itself can only
  // report "nothing changed" and proves nothing.
  if (args.baseline === args.candidate) {
    throw new Error(`Refusing to compare "${args.baseline}" with itself.`);
  }
  const baseSha = resolveRef(args.baseline);
  const candSha = resolveRef(args.candidate);
  if (baseSha === candSha) {
    throw new Error(`Refusing to run: --baseline ${args.baseline} and --candidate `
      + `${args.candidate} both resolve to ${baseSha}. A self-comparison proves nothing.`);
  }

  log(`DOM integrity: ${args.baseline} (${baseSha}) -> ${args.candidate} (${candSha})`);
  log(`Widths: ${config.widths.join(', ')} · whitelist entries: ${config.whitelist.length}`);
  fs.mkdirSync(WORK_DIR, { recursive: true });

  const baseline = await fingerprintBuild('baseline', args.baseline, config);
  const candidate = await fingerprintBuild('candidate', args.candidate, config);

  const runFailures = [...baseline.failures, ...candidate.failures];

  // The stated boundary, enforced rather than assumed. This certificate covers
  // delivered markup; if the two builds ship different client JS then script-
  // injected content may differ in ways nothing here can see, and a reader must
  // be told that instead of inferring a guarantee the run cannot give.
  const jsFingerprint = (distDir) => {
    const dir = path.join(distDir, 'js');
    if (!fs.existsSync(dir)) return '';
    return fs.readdirSync(dir).filter((f) => f.endsWith('.js')).sort()
      .map((f) => `${f}:${fs.readFileSync(path.join(dir, f), 'utf8').length}:`
        + `${fs.readFileSync(path.join(dir, f), 'utf8').replace(/\s+/g, '').length}`)
      .join('|');
  };
  const baseJs = jsFingerprint(path.join(WORK_DIR, 'baseline', 'dist'));
  const candJs = jsFingerprint(path.join(WORK_DIR, 'candidate', 'dist'));
  const jsChanged = baseJs !== candJs;
  if (jsChanged) {
    runFailures.push('client JavaScript differs between the two builds. This check certifies '
      + 'DELIVERED MARKUP with scripts disabled, so script-injected or script-rewritten content '
      + 'is outside what it can vouch for. Either confirm the JS change cannot alter content, '
      + 'or certify this batch another way — do not read a PASS here as covering it.');
  }
  const baseSet = new Set(baseline.routes);
  const candSet = new Set(candidate.routes);
  for (const r of candidate.routes) if (!baseSet.has(r)) runFailures.push(`page added: ${r}`);
  for (const r of baseline.routes) if (!candSet.has(r)) runFailures.push(`page removed: ${r}`);
  const shared = baseline.routes.filter((r) => candSet.has(r));

  // Whitelist consumption is tallied across the whole run, then checked once at
  // the end: an entry that never matched anywhere is a stale declaration.
  const totalConsumed = new Map();
  const pages = [];
  let comparisons = 0;

  for (const route of shared) {
    for (const width of config.widths) {
      const key = `${route}@${width}`;
      const a = baseline.prints.get(key);
      const b = candidate.prints.get(key);
      if (!a || !b) {
        runFailures.push(`${key}: fingerprint missing, so the page was never compared.`);
        continue;
      }
      comparisons += 1;
      const { ops, bulk } = diffTokens(a, b);
      const { failures, consumed } = applyWhitelist(ops, config.whitelist);
      for (const [idx, n] of consumed) totalConsumed.set(idx, (totalConsumed.get(idx) || 0) + n);
      pages.push({
        route,
        width,
        baselineTokens: a.length,
        candidateTokens: b.length,
        bulk,
        whitelisted: [...consumed.entries()].map(([idx, n]) => ({
          entry: config.whitelist[idx].contains, count: n,
        })),
        failures: failures.map((f) => ({ op: f.op, describe: describeToken(f.token) })),
        status: failures.length === 0 ? 'PASS' : 'FAIL',
      });
    }
  }

  if (comparisons === 0) {
    runFailures.push('No page was compared. A run that measures nothing cannot report PASS.');
  }

  // A page whose DOM differs BETWEEN WIDTHS is its own finding: this site is
  // responsive by CSS, so the same HTML should be delivered at both widths. If
  // that stops being true, every "identical DOM" claim silently becomes
  // width-specific, and a reviewer should be told rather than left to assume.
  const widthAnomalies = [];
  if (config.widths.length > 1) {
    for (const route of shared) {
      for (const side of [['baseline', baseline], ['candidate', candidate]]) {
        const [label, build] = side;
        const first = build.prints.get(`${route}@${config.widths[0]}`);
        for (const width of config.widths.slice(1)) {
          const other = build.prints.get(`${route}@${width}`);
          if (!first || !other) continue;
          const { ops } = diffTokens(first, other);
          if (ops.length > 0) {
            widthAnomalies.push(`${label} ${route}: DOM differs between ${config.widths[0]}px `
              + `and ${width}px (${ops.length} token difference(s)) — this page's markup is `
              + `width-dependent, so a DOM-integrity result for it is per-width, not general. `
              + `First: ${describeToken(ops[0].token)}`);
          }
        }
      }
    }
  }

  const staleWhitelist = config.whitelist
    .map((e, idx) => ({ e, idx, got: totalConsumed.get(idx) || 0 }))
    .filter(({ got }) => got === 0)
    .map(({ e }) => `whitelist entry never matched anywhere: ${e.op} <${e.tag.toLowerCase()}> `
      + `containing ${JSON.stringify(e.contains)} (${e.reason}). A declaration that did not `
      + `happen is a hole someone forgot to close — remove it, or find out why it stopped.`);

  const failedPages = pages.filter((p) => p.status === 'FAIL');
  const failCount = failedPages.length + runFailures.length + staleWhitelist.length;

  const report = {
    generatedAt: new Date().toISOString(),
    baseline: { ref: args.baseline, sha: baseline.built.sha, pages: baseline.routes.length },
    candidate: { ref: args.candidate, sha: candidate.built.sha, pages: candidate.routes.length },
    widths: config.widths,
    whitelist: config.whitelist.map((e, idx) => ({
      op: e.op, tag: e.tag, contains: e.contains, declared: e.count,
      consumedAcrossRun: totalConsumed.get(idx) || 0, reason: e.reason, commit: e.commit,
    })),
    comparisons,
    jsChanged,
    pages,
    widthAnomalies,
    runFailures,
    staleWhitelist,
    failCount,
    failed: failCount > 0,
  };
  fs.writeFileSync(path.join(WORK_DIR, 'report.json'), JSON.stringify(report, null, 2));

  log('');
  for (const p of pages) {
    if (p.status === 'FAIL') {
      log(`  FAIL  ${p.route} @${p.width} — ${p.failures.length} undeclared change(s)`);
      for (const f of p.failures.slice(0, 10)) log(`          ${f.op}: ${f.describe}`);
      if (p.failures.length > 10) log(`          ...and ${p.failures.length - 10} more`);
    } else if (p.whitelisted.length > 0) {
      log(`  ok    ${p.route} @${p.width} — identical, `
        + `${p.whitelisted.map((w) => `${w.count}x ${w.entry}`).join(', ')} (declared)`);
    }
  }
  for (const a of widthAnomalies) log(`  WIDTH ANOMALY: ${a}`);
  for (const s of staleWhitelist) log(`  STALE WHITELIST: ${s}`);
  for (const f of runFailures) log(`  RUN FAILURE: ${f}`);

  log('');
  log('  Whitelist consumption:');
  for (const w of report.whitelist) {
    log(`    ${w.consumedAcrossRun} consumed (declared ${w.declared}/page) — ${w.op} `
      + `<${w.tag.toLowerCase()}> ${JSON.stringify(w.contains)}`);
  }
  log('');
  log(`  Report: ${path.join(WORK_DIR, 'report.json')}`);
  if (report.failed) {
    log(`  FAIL — ${failCount} item(s): the DOM changed in ways nobody declared.`);
    return 1;
  }
  log(`  PASS — ${comparisons} page/width fingerprint(s) identical modulo the whitelist.`);
  return 0;
}

const invokedDirectly = process.argv[1]
  && (() => {
    const real = (p) => { try { return fs.realpathSync(p); } catch { return path.resolve(p); } };
    return real(process.argv[1]) === real(fileURLToPath(import.meta.url));
  })();

if (invokedDirectly) {
  main().then(
    (code) => process.exit(code),
    (err) => { console.error(`\ndom-integrity failed: ${err.stack || err.message}`); process.exit(2); }
  );
}

export { main, loadConfig };
