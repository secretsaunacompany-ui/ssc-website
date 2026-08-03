#!/usr/bin/env node
/**
 * models-json-selftest.mjs — the round-trip gate's mutation battery.
 *
 *   npm run models-json:selftest
 *
 * WHY THIS FILE EXISTS (Razor N4). The round-trip gate grew a set of new
 * assertions in B4 — the site data file against canonical, the rendered ledger
 * rows against canonical, the compare table against canonical — and each was
 * verified once, BY HAND, by breaking it in a scratch copy and watching it go
 * red. A hand-run mutation proves the assertion worked on the afternoon someone
 * ran it. It does not stop the assertion being deleted, weakened, or quietly
 * made tautological six months later, and it leaves no artifact anybody can
 * re-run. Every other suite in this repo encodes its mutations; this one now
 * does too. That is the house doctrine, not a nicety: `rhythm`, `dom-integrity`,
 * `events`, `prices-version` and `package-claim` all carry one.
 *
 * HOW IT WORKS. Each mutation names a real source file and a literal
 * find/replace, applies it, runs the gate, and asserts the gate FAILS naming the
 * expected assertion. Anything that still passes is a hole: the mutation
 * describes a defect a customer could be quoted from, and the gate did not see
 * it.
 *
 * THE SOURCE TREE IS MUTATED IN PLACE, and that is the one genuinely dangerous
 * thing here, so it is defended three ways: byte-exact backups taken before any
 * edit, restoration in a `finally`, and restoration again from process-level
 * handlers (SIGINT/SIGTERM/uncaughtException). The run then VERIFIES every file
 * is byte-identical to its backup and exits non-zero shouting if not. A suite
 * that can leave the working tree edited must prove it did not.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const REPO_ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const DATA = 'src/_data/models.json';
const PAGE = 'src/_includes/pages/saunas.njk';
const JSDATA = 'js/data.js';

/**
 * Each mutation: the file, a literal `from` -> `to`, and `expect`, a substring
 * that must appear in a FAIL line. `expect` is what stops a mutation reporting
 * itself detected because some UNRELATED assertion happened to break — the
 * failure has to be the one the mutation was aimed at.
 */
const MUTATIONS = [
  {
    name: 'M1  the SC capacity in the data file drifts back to 10-14+',
    proves: 'the data file is gated against canonical field by field',
    file: DATA, from: '"capacity": "10-12+ people"', to: '"capacity": "10-14+ people"',
    expect: 'SC facts DRIFTED from canonical at "capacity"',
  },
  {
    name: 'M2  priceDisplay stops carrying basePrice',
    proves: 'the string a visitor reads is gated on its digits, not merely present',
    file: DATA, from: '"priceDisplay": "From $29,500"', to: '"priceDisplay": "From $28,000"',
    expect: 'S4 priceDisplay',
  },
  {
    name: 'M3  a model is dropped from the roster',
    proves: 'a model vanishing from the rows, the ItemList and the OfferCatalog at '
      + 'once is caught — every surviving per-model assertion would still pass',
    file: DATA, from: '"order": ["S2", "S4", "S6", "S8", "SC"]',
    to: '"order": ["S2", "S4", "S8", "SC"]',
    expect: 'roster: site order',
  },
  {
    name: 'M4  a size drifts in the data file',
    proves: 'size is gated, not just capacity and price',
    file: DATA, from: '"size": "7\' x 9\'"', to: '"size": "7\' x 10\'"',
    expect: 'S6 facts DRIFTED from canonical at "size"',
  },
  {
    name: 'M5  a row\'s data-model id breaks',
    proves: 'a row that opens nothing is caught before a human clicks it',
    file: DATA, from: '"id": "sc"', to: '"id": "scx"',
    expect: 'SC id',
  },
  {
    name: 'M6  the MARKUP hard-codes a capacity while the data file stays canonical',
    proves: 'THE HISTORICAL DEFECT, exactly: every JSON file in the repo was right and '
      + 'the markup beside them was wrong. This is the non-tautological one — it fails '
      + 'only because the assertion reads the RENDERED PAGE rather than the file it '
      + 'is checking.',
    file: PAGE,
    from: '{{ m.capacity | replace("-", "–") | safe }}',
    to: '{% if m.id == "sc" %}10–14+ people{% else %}'
      + '{{ m.capacity | replace("-", "–") | safe }}{% endif %}',
    expect: 'SC rendered capacity',
  },
  {
    name: 'M7  a sanctioned glyph substitution is silently dropped',
    proves: 'the rendered check pins the exact string, not a loose match',
    file: PAGE, from: '{{ m.size | replace(" x ", " × ") | safe }}', to: '{{ m.size | safe }}',
    expect: 'rendered size',
  },
  {
    name: 'M8  js/data.js drifts, corrupting the COMPARE TABLE only',
    proves: 'Razor W3: the compare table states size/capacity/price for all five models '
      + 'from a source the ledger does not touch, and until B4 nothing asserted it. The '
      + 'ledger stays perfect under this mutation; only the table beneath it lies.',
    file: JSDATA, from: "capacity: '6-7 people'", to: "capacity: '6-9 people'",
    expect: 'S6 compare-table capacity',
  },
  {
    name: 'M9  the compare table and the ledger disagree about a price',
    proves: 'two renderings of one number cannot drift apart unnoticed (Razor N1)',
    file: JSDATA, from: 'basePrice: 44000', to: 'basePrice: 44500',
    expect: 'compare-table base price',
  },
];

const abs = (rel) => path.join(REPO_ROOT, rel);
const backups = new Map();

function snapshot(rel) {
  if (!backups.has(rel)) backups.set(rel, fs.readFileSync(abs(rel)));
}
function restoreAll() {
  for (const [rel, bytes] of backups) {
    try { fs.writeFileSync(abs(rel), bytes); } catch { /* best effort on the way out */ }
  }
}
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { restoreAll(); process.exit(130); });
process.on('uncaughtException', (err) => { restoreAll(); console.error(err); process.exit(2); });

/** Run the gate, capture everything, never throw on a non-zero exit. */
function runGate() {
  try {
    return execFileSync('node', [path.join(REPO_ROOT, 'scripts', 'models-json-roundtrip.mjs')],
      { cwd: REPO_ROOT, encoding: 'utf8', stdio: 'pipe', maxBuffer: 64 * 1024 * 1024 });
  } catch (err) {
    return `${err.stdout || ''}${err.stderr || ''}`;
  }
}

let passes = 0;
let failures = 0;
const report = [];

try {
  console.log('models-json round-trip — mutation battery\n');

  // The shipped tree must be GREEN first. Without this, every mutation below
  // could be "detected" by a defect that was already there.
  const clean = runGate();
  const cleanOk = /ROUND-TRIP CLEAN/.test(clean);
  console.log(`${cleanOk ? 'PASS' : 'FAIL'}  M0  the shipped tree is green before anything is broken`);
  if (cleanOk) passes += 1; else {
    failures += 1;
    console.log('      the battery cannot attribute anything while the baseline is red:\n'
      + clean.split('\n').filter((l) => l.startsWith('FAIL')).slice(0, 5).map((l) => `      ${l}`).join('\n'));
  }

  for (const m of MUTATIONS) {
    snapshot(m.file);
    const original = fs.readFileSync(abs(m.file), 'utf8');
    if (!original.includes(m.from)) {
      failures += 1;
      console.log(`FAIL  ${m.name}\n      its anchor is not in ${m.file}: `
        + `${JSON.stringify(m.from.slice(0, 70))}. The mutation never applied, so it proved `
        + `nothing — re-anchor it rather than deleting it.`);
      report.push({ name: m.name, result: 'ANCHOR MISSING' });
      continue;
    }
    fs.writeFileSync(abs(m.file), original.replace(m.from, m.to));
    const out = runGate();
    fs.writeFileSync(abs(m.file), original);

    const failLines = out.split('\n').filter((l) => l.startsWith('FAIL'));
    const hit = failLines.some((l) => l.includes(m.expect));
    if (hit) {
      passes += 1;
      console.log(`PASS  ${m.name} — ${m.proves.split('.')[0]}`);
      report.push({ name: m.name, result: 'detected', line: failLines.find((l) => l.includes(m.expect)) });
    } else {
      failures += 1;
      console.log(`FAIL  ${m.name}\n      expected a FAIL line containing ${JSON.stringify(m.expect)}; `
        + `got ${failLines.length} failure line(s). ${m.proves}`);
      if (failLines.length) console.log(failLines.slice(0, 3).map((l) => `      ${l}`).join('\n'));
      report.push({ name: m.name, result: 'NOT DETECTED' });
    }
  }
} finally {
  restoreAll();
}

// Prove the tree came back. A suite that edits source files in place owes this.
let dirty = 0;
for (const [rel, bytes] of backups) {
  if (Buffer.compare(fs.readFileSync(abs(rel)), bytes) !== 0) {
    dirty += 1;
    console.log(`FAIL  RESTORE  ${rel} is NOT byte-identical to its backup. The working tree is `
      + `still mutated — restore it from git before doing anything else.`);
  }
}
console.log(`${dirty ? 'FAIL' : 'PASS'}  restore: ${backups.size} mutated file(s) returned byte-identical`);
if (dirty) failures += dirty; else passes += 1;

console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
