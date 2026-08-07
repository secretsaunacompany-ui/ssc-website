#!/usr/bin/env node
/**
 * jsonld.test.mjs — every structured-data block in the built site parses, and
 * none carries HTML-alphabet escaping.
 *
 * Born 2026-08-06 (code-refresh D4): faq.njk was the one schema block whose
 * holes never went through the | jsonld filter, so nunjucks autoescape wrote
 * &#39; into Google's FAQ parser — HTML escaping inside a JSON medium, live
 * in production, invisible to every suite because nothing read the blocks
 * back. This reads every application/ld+json block on every built page and
 * asserts (1) it is valid JSON, (2) it contains no HTML entity artifacts
 * (&#…; / &quot; / &amp; — legitimate content keeps raw characters under the
 * jsonld filter; entities mean a hole bypassed it).
 *
 *   npm run build && node scripts/jsonld.test.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(REPO_ROOT, 'dist');

let passes = 0, failures = 0;
const check = (name, ok, detail) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `\n      ${detail}`}`);
  ok ? passes++ : failures++;
};

if (!fs.existsSync(path.join(DIST, 'index.html'))) {
  console.log('dist/ is missing — run `npm run build` first.');
  process.exit(1);
}

let blocks = 0;
const parseErrors = [];
const entityHits = [];
for (const f of fs.readdirSync(DIST, { recursive: true })) {
  if (!String(f).endsWith('.html')) continue;
  const page = fs.readFileSync(path.join(DIST, String(f)), 'utf8');
  for (const m of page.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    blocks++;
    try { JSON.parse(m[1]); } catch (e) { parseErrors.push(`${f}: ${e.message}`); }
    const ent = m[1].match(/&#\d+;|&quot;|&amp;|&lt;|&gt;/);
    if (ent) entityHits.push(`${f}: ${ent[0]} near ${m[1].slice(Math.max(0, ent.index - 40), ent.index + 20).trim()}`);
  }
}

check(`every JSON-LD block parses as JSON (${blocks} blocks scanned)`,
  parseErrors.length === 0, parseErrors.join('\n      '));
check('no JSON-LD block carries HTML-entity escaping (the wrong-medium tell)',
  entityHits.length === 0, entityHits.join('\n      '));
check('the scan actually found structured data (vacuity guard)',
  blocks >= 10, `only ${blocks} blocks found — the regex or the build moved`);

console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
