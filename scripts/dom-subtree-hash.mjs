#!/usr/bin/env node
/**
 * dom-subtree-hash.mjs — measure the subtree hashes a delete-subtree or
 * add-subtree declaration needs.
 *
 *   node scripts/dom-subtree-hash.mjs --ref <git-ref|WORKING> --route /saunas/ \
 *        --width 1440 --path html/body/div/div/div/div/div/div/label --tag LABEL
 *
 * WHY THIS EXISTS. dom-integrity.config.json's subtree entries are keyed on a
 * hash of the node's own serialized content, and the config says plainly that
 * the hash "cannot be written from memory -- it is measured from the baseline
 * build". Until now there was no way to measure one except by hand-instrumenting
 * the runner, so the two shapes the config documents for ATTRIBUTE-LESS nodes
 * were the two shapes nobody could actually write. Declaring an attribute-less
 * <label class="addon-option"> any other way means a `contains` on "addon-option"
 * -- precisely the family-of-nodes match the specificity check refuses.
 *
 * It reuses the runner's own build and fingerprint path rather than a private
 * copy, so a hash printed here is the hash the runner will compute. It prints
 * every candidate at the path with its span, because a page usually holds
 * several attribute-less siblings of the same tag and the whole point is to tell
 * them apart -- pick the one whose span and position match the node you mean.
 *
 * Read-only: it builds into the same scratch area the runner uses and writes
 * nothing to the repo.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { buildRef, enumeratePages } from './lib/build-ref.mjs';
import { startServer } from './lib/server.mjs';
import { installRouting } from './lib/capture.mjs';
import { extractFingerprint, findSubtreeHashes, describeToken } from './lib/dom-fingerprint.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..');
const WORK_DIR = path.join(REPO_ROOT, '.dom-integrity');
const CACHE_DIR = path.join(WORK_DIR, 'cache');

function parseArgs(argv) {
  const a = { ref: 'WORKING', route: '/saunas/', width: 1440, path: null, tag: null, context: 0 };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === '--ref') a.ref = argv[++i];
    else if (k === '--route') a.route = argv[++i];
    else if (k === '--width') a.width = Number(argv[++i]);
    else if (k === '--path') a.path = argv[++i];
    else if (k === '--tag') a.tag = argv[++i];
    else if (k === '--context') a.context = Number(argv[++i]);
  }
  if (!a.path || !a.tag) {
    console.error('need --path and --tag (see the header for an example)');
    process.exit(2);
  }
  return a;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const distDir = path.join(WORK_DIR, `hashprobe-${args.ref.replace(/[^\w.-]/g, '_')}`, 'dist');
  const built = buildRef(args.ref, distDir);
  const routes = enumeratePages(distDir);
  if (!routes.includes(args.route)) {
    console.error(`route ${args.route} not in the build (${routes.length} pages)`);
    process.exit(2);
  }
  const server = await startServer(distDir);
  const browser = await chromium.launch();
  try {
    const stats = {
      cacheHits: 0, cacheMisses: 0, fetchFailures: 0, blocked: 0,
      videoStubbed: 0, videoElements: 0, unknownHosts: new Set(), redirects: {}, brokenImages: [],
    };
    // JS disabled, same as the runner: the hash must describe delivered markup.
    const context = await browser.newContext({ javaScriptEnabled: false });
    await installRouting(context, CACHE_DIR, stats);
    const page = await context.newPage();
    await page.setViewportSize({ width: args.width, height: 900 });
    await page.goto(`${server.url}${args.route}`, { waitUntil: 'networkidle', timeout: 60000 });
    const tokens = await page.evaluate(extractFingerprint);

    const found = findSubtreeHashes(tokens, args.path, args.tag);
    console.log(`\n${built.sha}  ${args.route}@${args.width}`);
    console.log(`${args.tag} at ${args.path} — ${found.length} node(s)\n`);
    let n = 0;
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      if (t.kind !== 'element' || t.path !== args.path || t.tag !== args.tag.toUpperCase()) continue;
      const f = found[n++];
      console.log(`  [${n}] textHash ${f.hash}   span ${f.span} token(s)`);
      for (let j = i; j < i + Math.min(f.span, 1 + args.context * 4); j++) {
        console.log(`        ${describeToken(tokens[j])}`);
      }
    }
    console.log('');
  } finally {
    await browser.close();
    await server.close();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
