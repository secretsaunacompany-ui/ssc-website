#!/usr/bin/env node
/**
 * csp-inline-hash.test.mjs — liveness check for the CSP-hashed inline script.
 *
 * The reveal-boot script must be inline (parse-time, pre-first-paint) and is
 * allowlisted in netlify.toml by sha256 hash. A hash-pinned inline script is a
 * reference into a foreign vocabulary — the class that has gone silently inert
 * five times on this branch (sha-abbrev scoping, stale whitelist entries, the
 * reveal pin, VIDEO_URL, and the reveal-boot itself, which shipped blocked
 * because no local server sends the CSP header). This check recomputes the
 * hash from the BUILT output and compares against netlify.toml: drift on
 * either side goes red here instead of silently killing the script on Netlify.
 *
 *   npm run build && node scripts/csp-inline-hash.test.mjs
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertDistFresh } from './lib/stale-dist.mjs';

// REPO_ROOT anchoring (2026-08-06): this was the one suite reading cwd-relative
// paths — it fail-closed by crashing when run from elsewhere, but uninformatively,
// and unlike its siblings. Paths now anchor to the script's own location.
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(REPO_ROOT, 'dist');

let passes = 0, failures = 0;
const check = (name, ok, detail) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `\n      ${detail}`}`);
  ok ? passes++ : failures++;
};

// This suite certifies inline-script hashes against netlify.toml — a stale
// dist certifies a hash pairing production will not have (the exact file the
// 2026-08-06 ops-console fix edits). Refuse before reading anything.
assertDistFresh(REPO_ROOT);

const html = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
const m = html.match(/<script data-ssc="reveal-boot">([\s\S]*?)<\/script>/);
check('the reveal-boot inline script exists in the built output', !!m,
  'F5\'s parse-time hidden state has no carrier — the reveal system regresses to fade-out-then-in');

const toml = fs.readFileSync(path.join(REPO_ROOT, 'netlify.toml'), 'utf8');
const declared = [...toml.matchAll(/'sha256-([A-Za-z0-9+/=]+)'/g)].map((x) => x[1]);
check('netlify.toml declares at least one script hash', declared.length > 0,
  'the CSP has no inline allowance — the boot script is blocked on Netlify');

if (m) {
  const actual = crypto.createHash('sha256').update(m[1]).digest('base64');
  check('the built script\'s hash matches a declared CSP hash', declared.includes(actual),
    `built content hashes to sha256-${actual}; netlify.toml declares [${declared.join(', ')}]. `
    + 'One side drifted — the CSP will silently block the script on Netlify only.');
  check('the script body is the single expected statement', m[1] === "document.documentElement.classList.add('js')",
    `body is ${JSON.stringify(m[1])} — any change must update the netlify.toml hash in the same commit`);
}
check('no inline event-handler attribute exists in any built page', (() => {
  // on{event}= attributes are ALSO CSP-blocked inline script, but they need
  // 'unsafe-hashes' plus an attribute hash — a grant this policy deliberately
  // refuses — so any on*= attribute in dist is dead code in production. This
  // is exactly how booking-ops.html's login shipped broken (onsubmit= refused,
  // form default-submitting forever) while the <script>-element sweep below
  // stayed green: attributes were invisible to it. The regex is anchored to
  // attribute position inside a tag — a bare /on\w+=/ matches inside content=
  // ("c-ONTENT=") with 50+ false hits on today's pages.
  const offenders = [];
  for (const f of fs.readdirSync(DIST, { recursive: true })) {
    if (!String(f).endsWith('.html')) continue;
    const page = fs.readFileSync(path.join(DIST, String(f)), 'utf8');
    for (const tag of page.matchAll(/<[a-zA-Z][^>]*>/g)) {
      const attr = tag[0].match(/\s(on\w+)\s*=\s*["']/);
      if (attr) offenders.push(`${f}: ${attr[1]} in ${tag[0].slice(0, 60)}`);
    }
  }
  if (offenders.length) { console.log(`      ${offenders.join('\n      ')}`); return false; }
  return true;
})(), 'an inline event handler is in the built output — CSP refuses it on Netlify (needs unsafe-hashes, which we do not grant)');

check('no OTHER undeclared inline script exists in any built page', (() => {
  for (const f of fs.readdirSync(DIST, { recursive: true })) {
    if (!String(f).endsWith('.html')) continue;
    const page = fs.readFileSync(path.join(DIST, String(f)), 'utf8');
    for (const s of page.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g)) {
      if (s[1].includes('application/ld+json') || s[1].includes('application/json')) continue;
      const h = crypto.createHash('sha256').update(s[2]).digest('base64');
      if (!declared.includes(h)) return false;
    }
  }
  return true;
})(), 'an inline script exists whose hash is not in the CSP — it will be blocked on Netlify');

console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
