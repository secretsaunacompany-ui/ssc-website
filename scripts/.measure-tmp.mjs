// Throwaway measurement helper for writing B4's dom-integrity declarations.
// Not a suite. Deleted before the batch closes.
import path from 'node:path';
import { chromium } from 'playwright';
import { buildRef } from './lib/build-ref.mjs';
import { startServer } from './lib/server.mjs';
import { installRouting } from './lib/capture.mjs';
import { extractFingerprint, findSubtreeHashes, diffTokens }
  from './lib/dom-fingerprint.mjs';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const CACHE = path.join(ROOT, '.visual-diff', 'asset-cache');

async function print(ref, dir) {
  buildRef(ref, dir);
  const server = await startServer(dir);
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const stats = {
    cacheHits: 0, cacheMisses: 0, fetchFailures: 0, blocked: 0,
    videoStubbed: 0, videoElements: 0, unknownHosts: new Set(), redirects: {}, brokenImages: [],
  };
  await installRouting(ctx, CACHE, stats);
  const page = await ctx.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${server.url}/saunas/`, { waitUntil: 'networkidle', timeout: 60000 });
  const t = await page.evaluate(extractFingerprint);
  await browser.close();
  await server.close();
  return t;
}

const base = await print(process.argv[2], path.join(ROOT, '.dom-integrity/measure-base/dist'));
const cand = await print('WORKING', path.join(ROOT, '.dom-integrity/measure-cand/dist'));
const { ops } = diffTokens(base, cand);
console.log('total ops:', ops.length);

const runs = [];
let cur = null;
for (const o of ops) {
  if (!cur || cur.op !== o.op) { cur = { op: o.op, items: [] }; runs.push(cur); }
  cur.items.push(o);
}

for (const r of runs) {
  console.log(`\n=== ${r.op} run, ${r.items.length} ops ===`);
  const roots = r.items.filter((x, i) => x.token.kind === 'element'
    && !r.items.slice(0, i).some((y) => y.token.kind === 'element'
      && x.token.path.startsWith(`${y.token.path}/`)));
  // span of each root INSIDE this run
  for (const x of roots) {
    const i = r.items.indexOf(x);
    const P = x.token.path;
    let n = 1;
    for (let j = i + 1; j < r.items.length; j++) {
      const t = r.items[j].token;
      if (t.path.startsWith(`${P}/`)) { n += 1; continue; }
      if (t.path === P && t.kind !== 'element') { n += 1; continue; }
      break;
    }
    const stream = r.op === 'removed' ? base : cand;
    const found = findSubtreeHashes(stream, P, x.token.tag);
    console.log(`  ${x.token.tag} span=${String(n).padStart(3)} path=${P}`);
    console.log(`     attrs: ${(x.token.attrs || '(none)').slice(0, 110)}`);
    console.log(`     hashes at that tag+path in ${r.op === 'removed' ? 'baseline' : 'candidate'}: `
      + found.map((f) => `${f.hash}(span ${f.span})`).join(' '));
  }
}
