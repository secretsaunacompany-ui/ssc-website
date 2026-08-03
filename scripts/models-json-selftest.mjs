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
 *
 * TWO WAYS THOSE DEFENCES STILL LOSE, both learned the hard way during the
 * pricesVersion 4 batch (2026-08-03), recorded here because the next person to
 * lose an afternoon to them will be reading this header and not a session log.
 *
 *   RUN ONE AT A TIME. The backup/restore is per-process and knows nothing
 *   about a second process. Two concurrent runs mutate the SAME files, so each
 *   one's "backup" is whatever the other had already written: they restore each
 *   other's mutations and both report failures belonging to neither. The
 *   symptom is a baseline that fails M0/M0b naming a drift nobody introduced —
 *   e.g. `products.json basePrice 22500` (M14's mutation) or the group renamed
 *   to `exteriorCladdingREMOVED` (M19's) — while the file on disk looks fine by
 *   the time you go and read it, because the other run has moved on. Check
 *   `pgrep -f models-json-selftest` before starting, and never launch a second
 *   run because the first "seems stuck": it takes minutes, by design.
 *
 *   SIGKILL BEATS ALL THREE DEFENCES. `kill -9`, a harness timeout that hard-
 *   kills, or a crashed terminal leaves the tree MUTATED — no `finally`, no
 *   signal handler, no verification. Recovering is easy but only if you know to
 *   look: `git status` will show a mutated source file, and the mutation is
 *   always one of the literal find/replace pairs in MUTATIONS below, so it can
 *   be read straight out of this file and reversed by hand. Do that BEFORE
 *   committing anything, or a mutation ships. If the file has no uncommitted
 *   work of your own in it, `git checkout --` is the faster fix.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const REPO_ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const DATA = 'src/_data/models.json';
const PAGE = 'src/_includes/pages/saunas.njk';
const JSDATA = 'js/data.js';
const PRODUCTS = 'netlify/functions/data/products.json';

/**
 * THE CANONICAL SHEET IS NEVER WRITTEN TO. It lives in the MARVIN repo, outside
 * this checkout, and it is the file the quoting tools read at runtime — a suite
 * that edits it in place could leave a customer-facing price sheet mutated if it
 * died at the wrong moment, and no `finally` block is worth betting that on.
 *
 * So canonical mutations work the other way round: a BYTE copy is made into a
 * temp dir, the copy is mutated, and the gate is pointed at it with the
 * `SSC_MODELS_JSON` override the gate already honours for exactly this reason.
 * The real file is opened read-only and never written, by construction rather
 * than by discipline.
 */
const CANONICAL_SRC = process.env.SSC_MODELS_JSON
  || '/home/leesalo/marvin/content/reference/operations/models.json';

/**
 * Each mutation: the file, a literal `from` -> `to`, and `expect` — a substring,
 * or an array of substrings that must ALL appear, in FAIL lines. `expect` is
 * what stops a mutation reporting itself detected because some UNRELATED
 * assertion happened to break — the failure has to be the one the mutation was
 * aimed at.
 *
 * `canonical: true` marks a mutation that targets the canonical sheet. Its
 * `file` is ignored; the temp-copy machinery above is used instead.
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

  // ---------------------------------------------------------------------
  // THE COST-BASIS GATE (Razor W2). It shipped with zero encoded mutations,
  // in a file whose own preamble rejects hand-run ones. These are its battery.
  // ---------------------------------------------------------------------
  {
    name: 'M10 a non-held basePrice drops below its margin floor',
    proves: 'the whole point of the cost-basis gate: five perfectly consistent copies of a '
      + 'price we cannot afford to sell at are exactly as consistent as five good ones, and '
      + 'every other assertion in the gate would report ROUND-TRIP CLEAN either way',
    canonical: true, from: '"basePrice": 23500,', to: '"basePrice": 15000,',
    expect: 'S2 basePrice 15000 is BELOW its gross-margin floor',
  },
  {
    name: 'M11 the held flag is removed from a below-floor model',
    proves: 'the hold is the only thing keeping a knowingly-below-floor price from failing, '
      + 'so removing it must produce the failure it was suppressing — not silence',
    canonical: true,
    from: '"stressCost": 39438,\n        "gmFloor": 0.40,\n        "held": true,',
    to: '"stressCost": 39438,\n        "gmFloor": 0.40,',
    expect: 'SC basePrice 57000 is BELOW its gross-margin floor',
  },
  {
    name: 'M12 a model\'s costBasis is deleted outright',
    proves: '"this model has no recorded cost" must not be the cheap way to leave the gate. '
      + 'A missing costBasis is a FAIL, never a skip',
    canonical: true,
    from: '"costBasis": { "stressCost": 16328, "gmFloor": 0.40 }',
    to: '"_costBasisWasHere": true',
    expect: 'S4 has no usable costBasis',
  },
  {
    name: 'M13 THE W1 EXPLOIT: gmFloor lowered to 0.20 and the held flag dropped',
    proves: 'Razor W1, exactly as proven: the gate used to read its own bar out of the file it '
      + 'was policing, so the bar could be lowered by the party being measured and a '
      + 'below-floor price passed SILENTLY, with no diff anywhere near a price. The floor is '
      + 'now pinned in scripts/models-json-roundtrip.mjs, so this mutation must produce TWO '
      + 'failures: the tampered floor named, and the price still measured against the real one',
    canonical: true,
    from: '"stressCost": 39438,\n        "gmFloor": 0.40,\n        "held": true,',
    to: '"stressCost": 39438,\n        "gmFloor": 0.20,',
    expect: [
      'SC costBasis.gmFloor 20.0%',
      'SC basePrice 57000 is BELOW its gross-margin floor',
    ],
  },
  {
    name: 'M14 the ADVISOR price sheet drifts from canonical',
    proves: 'Razor W4: netlify/functions/data/products.json is pasted into four AI-advisor '
      + 'system prompts, so a stale number there is not a wrong price a visitor can check '
      + 'against the configurator — it is a wrong price an assistant states with confidence, '
      + 'in conversation, to someone with no way of knowing',
    file: PRODUCTS, from: '"basePrice": 23500,', to: '"basePrice": 22500,',
    expect: 'S2 advisor sheet DIVERGED from canonical at "basePrice"',
  },
  {
    name: 'M15 a hold loses its heldRef',
    proves: 'Razor N3: a hold is a promise that something specific retires it. Without the '
      + 'reference it is an untraceable permanent exemption with better manners',
    canonical: true,
    from: '"stressCost": 39438,\n        "gmFloor": 0.40,\n        "held": true,\n'
      + '        "heldRef":',
    to: '"stressCost": 39438,\n        "gmFloor": 0.40,\n        "held": true,\n'
      + '        "_heldRefWasHere":',
    expect: 'SC is flagged costBasis.held with NO heldRef',
  },
  {
    name: 'M16 a per-model price token goes missing while its placeholder stays',
    proves: 'Razor W3, and it is the subtle one. Deleting S2\'s exteriorYakisugi leaves the '
      + 'markup placeholder "+$5,000" on screen — so the LABEL assertion still passes — while '
      + 'calculateTotal\'s `|| 0` silently drops the money from the total. The option reads '
      + '+$5,000 and adds nothing. Only an assertion on the TOTAL DELTA can see it, which is '
      + 'why the expectation below is the delta reading 0 against a canonical 5000',
    file: JSDATA, from: '            exteriorYakisugi: 5000,\n', to: '',
    expect: 'S2 exteriorYakisugi: selecting it moved the TOTAL by 0',
  },

  // ---------------------------------------------------------------------
  // THE ADVISOR SHEET'S REMAINING BRANCHES (Razor re-review NEW-3). M14 covers
  // exactly one of them -- a model fact. The fixed-price lines, the prose
  // lines, a vanished group and the package range/savings were all reachable
  // only by reading the code and believing it. These four are their battery.
  // ---------------------------------------------------------------------
  {
    name: 'M17 a FIXED advisor add-on price drifts from canonical',
    proves: 'the per-line fixed-price branch. M14 only ever exercised a model FACT; every '
      + 'priced add-on line in the advisor sheet went through a different assertion that '
      + 'nothing had broken on purpose',
    file: PRODUCTS, from: '{ "name": "3\' Changing Room", "price": 11000 }',
    to: '{ "name": "3\' Changing Room", "price": 10000 }',
    expect: 'advisor addon "3\' Changing Room": 10000 === canonical 11000',
  },
  {
    name: 'M18 THE ATTRIBUTION PERMUTATION: the exterior sentence swaps which models '
      + 'get which price',
    proves: 'Razor re-review NEW-1, and it is the one the old check could not see. The set '
      + 'of figures is UNCHANGED -- still {5000, 6000} -- so the previous set-equality '
      + 'assertion reported green while the AI advisor told S2 and S4 customers their '
      + 'yakisugi cladding costs $6,000 and SC customers theirs costs $5,000',
    file: PRODUCTS,
    from: '"price": "varies by model (S2/S4 $5,000, S6/S8/SC $6,000)"',
    to: '"price": "varies by model (S2/S4 $6,000, S6/S8/SC $5,000)"',
    expect: 'advisor addon "Yakisugi (charred cedar) exterior" MIS-ATTRIBUTES per-model prices',
  },
  {
    name: 'M19 a whole advisor addon GROUP is deleted',
    proves: 'Razor re-review NEW-2: the vanished-mapping guard lived inside the loop over '
      + 'products.json\'s OWN keys, so deleting a group deleted the iteration that would '
      + 'have caught it. The advisor simply stops offering cladding, and every surviving '
      + 'assertion still passes',
    file: PRODUCTS,
    from: '"exteriorCladding": {', to: '"exteriorCladdingREMOVED": {',
    expect: 'advisor addons still carries the mapped group "exteriorCladding"',
  },
  {
    name: 'M20 the premium package range and its advertised saving both drift',
    proves: 'the last two ungated advisor assertions. The package is the single line most '
      + 'likely to be edited by hand for tone, and both the range ends and the "$500" in '
      + 'the note are money a customer is quoted',
    canonical: true, from: '"savings": 500,', to: '"savings": 750,',
    expect: 'advisor premium finish note states the canonical saving $750',
  },
  {
    name: 'M21 the advertised premium package RANGE stops matching canonical min/max',
    proves: 'the range ends are the only package figures a customer sees before a quote, and '
      + 'they live in a hand-written sentence in the advisor sheet. Nothing had ever broken '
      + 'this assertion on purpose',
    file: PRODUCTS,
    from: '"price": "varies by model ($9,200-$12,500)"',
    to: '"price": "varies by model ($9,200-$11,000)"',
    expect: 'advisor premium finish package range',
  },
];

const abs = (rel) => path.join(REPO_ROOT, rel);
const backups = new Map();

/**
 * The scratch canonical sheet. A byte copy, so an UNMUTATED run through this
 * path is identical to a normal run — which the M0b baseline proves, and has to:
 * if the temp-copy mechanism itself made the gate red, every canonical mutation
 * would report itself "detected" while proving nothing.
 *
 * Declared HERE, above the signal handlers, because those handlers call
 * cleanupTmp and a `const` they close over must be initialised before a signal
 * can reach them.
 */
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'ssc-selftest-canonical-'));
const TMP_CANONICAL = path.join(TMP, 'models.json');
fs.copyFileSync(CANONICAL_SRC, TMP_CANONICAL);
const CANONICAL_BYTES = fs.readFileSync(TMP_CANONICAL);
const cleanupTmp = () => { try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* going away anyway */ } };

function snapshot(rel) {
  if (!backups.has(rel)) backups.set(rel, fs.readFileSync(abs(rel)));
}
function restoreAll() {
  for (const [rel, bytes] of backups) {
    try { fs.writeFileSync(abs(rel), bytes); } catch { /* best effort on the way out */ }
  }
}
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { restoreAll(); cleanupTmp(); process.exit(130); });
process.on('uncaughtException', (err) => { restoreAll(); cleanupTmp(); console.error(err); process.exit(2); });

/** Run the gate, capture everything, never throw on a non-zero exit. */
function runGate(env = {}) {
  try {
    return execFileSync('node', [path.join(REPO_ROOT, 'scripts', 'models-json-roundtrip.mjs')],
      {
        cwd: REPO_ROOT, encoding: 'utf8', stdio: 'pipe', maxBuffer: 64 * 1024 * 1024,
        env: { ...process.env, ...env },
      });
  } catch (err) {
    return `${err.stdout || ''}${err.stderr || ''}`;
  }
}

/** All of `expect`, as an array. A single string is the one-element case. */
const expectations = (e) => (Array.isArray(e) ? e : [e]);

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

  // The canonical temp-copy PATH must be green before any canonical mutation is
  // attributed to anything, for the same reason M0 exists.
  const cleanTmp = runGate({ SSC_MODELS_JSON: TMP_CANONICAL });
  const tmpOk = /ROUND-TRIP CLEAN/.test(cleanTmp);
  console.log(`${tmpOk ? 'PASS' : 'FAIL'}  M0b an UNMUTATED byte copy of canonical, reached `
    + 'through SSC_MODELS_JSON, is still green');
  if (tmpOk) passes += 1; else {
    failures += 1;
    console.log('      the canonical battery cannot attribute anything through a path that is '
      + 'already red:\n'
      + cleanTmp.split('\n').filter((l) => l.startsWith('FAIL')).slice(0, 5).map((l) => `      ${l}`).join('\n'));
  }

  for (const m of MUTATIONS) {
    // Canonical mutations edit the scratch copy and point the gate at it. Repo
    // mutations edit the real file in place, under the backup/restore contract.
    const target = m.canonical ? TMP_CANONICAL : abs(m.file);
    const where = m.canonical ? `${CANONICAL_SRC} (via a temp byte copy)` : m.file;
    const env = m.canonical ? { SSC_MODELS_JSON: TMP_CANONICAL } : {};
    if (!m.canonical) snapshot(m.file);

    const original = fs.readFileSync(target, 'utf8');
    if (!original.includes(m.from)) {
      failures += 1;
      console.log(`FAIL  ${m.name}\n      its anchor is not in ${where}: `
        + `${JSON.stringify(m.from.slice(0, 70))}. The mutation never applied, so it proved `
        + `nothing — re-anchor it rather than deleting it.`);
      report.push({ name: m.name, result: 'ANCHOR MISSING' });
      continue;
    }
    fs.writeFileSync(target, original.replace(m.from, m.to));
    const out = runGate(env);
    fs.writeFileSync(target, original);

    const failLines = out.split('\n').filter((l) => l.startsWith('FAIL'));
    const wanted = expectations(m.expect);
    const missed = wanted.filter((w) => !failLines.some((l) => l.includes(w)));
    if (missed.length === 0) {
      passes += 1;
      console.log(`PASS  ${m.name} — ${m.proves.split('.')[0]}`);
      report.push({ name: m.name, result: 'detected', line: failLines.find((l) => l.includes(wanted[0])) });
    } else {
      failures += 1;
      console.log(`FAIL  ${m.name}\n      expected FAIL line(s) containing ${JSON.stringify(missed)}; `
        + `got ${failLines.length} failure line(s). ${m.proves}`);
      if (failLines.length) console.log(failLines.slice(0, 3).map((l) => `      ${l}`).join('\n'));
      report.push({ name: m.name, result: 'NOT DETECTED' });
    }
  }
} finally {
  restoreAll();
}

// The scratch canonical copy must also have come back, or a later mutation in
// the same run was measuring an already-broken sheet.
const tmpClean = Buffer.compare(fs.readFileSync(TMP_CANONICAL), CANONICAL_BYTES) === 0;
console.log(`${tmpClean ? 'PASS' : 'FAIL'}  restore: the scratch canonical copy is byte-identical`);
if (tmpClean) passes += 1; else failures += 1;

// And the REAL canonical sheet must never have been touched at all.
const realUntouched = Buffer.compare(fs.readFileSync(CANONICAL_SRC), CANONICAL_BYTES) === 0;
console.log(`${realUntouched ? 'PASS' : 'FAIL'}  ${CANONICAL_SRC} is untouched `
  + '(this suite opens it read-only and mutates only its copy)');
if (realUntouched) passes += 1; else failures += 1;
cleanupTmp();

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
