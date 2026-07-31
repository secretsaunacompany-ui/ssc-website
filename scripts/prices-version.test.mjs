#!/usr/bin/env node
/**
 * Fixture that ties `pricesVersion` to the prices it claims to version.
 *
 *   npm run prices-version:test
 *   npm run prices-version:test -- --update    (after a deliberate reprice)
 *
 * WHAT IS UNDER TEST
 *
 * `js/data.js` exports `pricesVersion`. Every saved configuration on a
 * visitor's device is stamped with it. On restore, a stamp that no longer
 * matches means "this total was computed in the old world" -- the selections
 * are re-applied, the total is recomputed from live prices, and the visitor is
 * told. That whole mechanism rests on one integer being incremented by a human
 * who remembered to.
 *
 * Nobody remembers. And the failure is silent in the worst possible direction:
 * forget the bump, and a week-old saved total restores looking fresh, with no
 * note, disagreeing with its own line items. The visitor sees a number we are
 * no longer willing to honour, presented as current.
 *
 * WHY THIS FILE EXISTS
 *
 * Because "bump this when you change a price" was a comment, and a comment is
 * not a mechanism. The repricing batch moves roughly forty numbers across two
 * files; the odds of a future one-line price tweak remembering the stamp are
 * poor, and nothing anywhere would notice.
 *
 * WHAT IT HASHES
 *
 * Not the source text -- the RENDERED price surface, read out of a real browser
 * against the real built site, per model: every option's resolved input value
 * and its visible price, the base price, and the package savings claim. That is
 * the thing a customer is quoted, and it is what has to be versioned.
 *
 * Reading the resolved values matters. Half the prices on this page do not
 * exist in the markup at all -- they are per-model tokens resolved at open
 * time. A source-text hash would be blind to exactly the prices most likely to
 * be edited, and would also go red on reindentation, which teaches people to
 * pass `--update` without looking. This hash moves when, and only when, a
 * price a customer can see moves.
 *
 * THE CONTRACT
 *
 * `prices-version.lock.json` records the hash, the version it belongs to, and
 * the schema of the extractor that produced it.
 *   - hash unchanged, version matches lock  -> PASS, nothing happened.
 *   - hash moved                            -> FAIL. Prices changed.
 *   - version does not match the lock       -> FAIL. The lock is stale.
 *   - hashSchema does not match             -> FAIL, but a different failure:
 *     the measurement changed, not the prices. `--update` re-locks without
 *     demanding a price bump, and says so.
 *
 * `--update` re-records the lock, and REFUSES unless `pricesVersion` has been
 * incremented past what the lock holds. That refusal is the entire point: it
 * makes "change a price without bumping the stamp" a state you cannot commit
 * from, rather than a discipline you have to sustain. The schema escape hatch
 * exists so that refusal always means what it says -- a guard that cries wolf
 * when someone edits the fixture is a guard people learn to route around.
 *
 * MUTATION IS BUILT IN, NOT A RITUAL
 *
 * Every run also measures a scratch copy with one price edited and the version
 * deliberately left alone, and fails if that does not come back as
 * "prices moved without a bump". A guard that cannot catch its own failure
 * case is a comment with extra steps.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { startServer } from './lib/server.mjs';

const REPO_ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const require = createRequire(path.join(REPO_ROOT, '/'));
const Eleventy = require('@11ty/eleventy');
const { chromium } = require('playwright');

const LOCK_FILE = path.join(REPO_ROOT, 'scripts', 'prices-version.lock.json');

/**
 * Version of the EXTRACTION, not of the prices.
 *
 * The lock stores a hash of whatever this file chooses to measure, so editing
 * the extractor moves the hash without a single price changing. Without this
 * field the guard reads that as "prices moved, bump the version", which is
 * false, and the only ways out are a bogus version bump or deleting the lock --
 * both of which teach people that the guard is an obstacle rather than a check.
 * Bump this when you change WHAT is measured; the guard then allows one
 * re-lock, loudly, without a price-version bump.
 */
const HASH_SCHEMA = 2;
const MODELS = ['s2', 's4', 's6', 's8', 'sc'];
const UPDATE = process.argv.includes('--update');

/** Directories never copied into the scratch site (mirrors build-cache.test.mjs). */
const SKIP = new Set(['node_modules', '.git', 'dist', '_site', '.visual-diff', '.probe', 'tmp', '.env']);

let failures = 0;
let passes = 0;

function check(name, condition, detail) {
  if (condition) { passes += 1; process.stdout.write(`  PASS  ${name}\n`); }
  else { failures += 1; process.stdout.write(`  FAIL  ${name}\n        ${detail}\n`); }
}

function scratchSite() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ssc-prices-version-'));
  fs.cpSync(REPO_ROOT, dir, {
    recursive: true,
    filter: (src) => {
      const base = path.basename(src);
      if (base.startsWith('.env')) return false;
      return !SKIP.has(base) || path.dirname(src) !== REPO_ROOT;
    },
  });
  fs.symlinkSync(path.join(REPO_ROOT, 'node_modules'), path.join(dir, 'node_modules'));
  return dir;
}

/**
 * Edit one price in a copied data.js, leaving `pricesVersion` alone.
 *
 * Strict: the target must be found exactly once per model. A mutation that
 * silently fails to apply would make the mutation check pass for the wrong
 * reason and quietly retire the thing that gives this fixture teeth.
 */
function bumpOnePrice(dataFile) {
  const before = fs.readFileSync(dataFile, 'utf8');
  const hits = [...before.matchAll(/interiorUpgrade:\s*(\d+)/g)];
  if (hits.length !== MODELS.length) {
    throw new Error(
      `mutation could not be applied to ${dataFile}: expected ${MODELS.length} `
      + `interiorUpgrade entries, found ${hits.length}. If the data shape changed, `
      + `update this. Do NOT delete the mutation.`);
  }
  const target = hits[1]; // s4
  const patched = `interiorUpgrade: ${parseInt(target[1], 10) + 100}`;
  fs.writeFileSync(dataFile,
    before.slice(0, target.index) + patched + before.slice(target.index + target[0].length));
}

/** Build a site directory and read its rendered price surface. */
async function measure(dir) {
  const dist = path.join(dir, 'dist');
  await new Eleventy(path.join(dir, 'src'), dist, {
    configPath: path.join(dir, '.eleventy.js'),
    quietMode: true,
  }).write();

  const server = await startServer(dist);
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const models = [];
    let pricesVersion = null;

    for (const id of MODELS) {
      await page.goto(`${server.url}/saunas/`, { waitUntil: 'networkidle' });
      await page.click(`[data-action="open-modal"][data-model="${id}"]`);
      await page.waitForSelector('.modal-addons .addon-option', { state: 'visible' });

      const snapshot = await page.evaluate(() => ({
        pricesVersion: window.SSC.pricesVersion,
        base: document.getElementById('summaryBase')?.textContent.trim(),
        claim: document.querySelector('.package-description')?.textContent.trim(),
        // Resolved value AND visible price. The two disagreeing is its own bug
        // class, so both belong in the hash.
        options: [...document.querySelectorAll('.modal-addons .addon-option')].map((o) => ({
          addon: o.querySelector('input')?.dataset.addon || '',
          label: o.querySelector('.addon-label')?.textContent.trim() || '',
          value: o.querySelector('input')?.value ?? '',
          price: o.querySelector('.addon-price')?.textContent.trim() || '',
          disabled: !!o.querySelector('input')?.disabled,
        })),
      }));

      pricesVersion = snapshot.pricesVersion;
      // pricesVersion is deliberately NOT hashed. Keeping the two separate is
      // what lets the failure messages be precise: A3 means "a price moved",
      // A2 means "the stamp is out of step". Fold the version into the hash and
      // every bump moves it too, so neither check can say which happened.
      const { pricesVersion: _omit, ...priced } = snapshot;
      models.push({ id, ...priced });
    }

    const surface = { models };
    const hash = crypto.createHash('sha256')
      .update(JSON.stringify(surface)).digest('hex').slice(0, 16);
    return { pricesVersion, hash, surface };
  } finally {
    await browser.close();
    await server.close();
  }
}

async function main() {
  const lock = fs.existsSync(LOCK_FILE)
    ? JSON.parse(fs.readFileSync(LOCK_FILE, 'utf8'))
    : null;

  process.stdout.write('\nA. the price surface as shipped\n');
  // Built in a scratch copy rather than in place: `npm run build` starts with
  // `rm -rf dist`, and a measurement tool must not destroy the developer's own
  // build output as a side effect.
  const liveDir = scratchSite();
  let live;
  try {
    live = await measure(liveDir);
  } finally {
    fs.rmSync(liveDir, { recursive: true, force: true });
  }
  process.stdout.write(`  pricesVersion ${live.pricesVersion}, surface hash ${live.hash}\n`);

  const schemaChanged = !!lock && lock.hashSchema !== HASH_SCHEMA;

  if (UPDATE) {
    if (schemaChanged) {
      process.stdout.write(
        `  hash schema ${lock.hashSchema} -> ${HASH_SCHEMA}: what is measured changed, so the old\n`
        + '  hash is not comparable. Re-locking WITHOUT requiring a price-version bump.\n'
        + '  If prices also changed in this commit, that bump is still yours to make.\n');
    }
    if (lock && !schemaChanged && live.hash !== lock.hash && live.pricesVersion <= lock.pricesVersion) {
      process.stdout.write(
        `\n  REFUSED: prices changed but pricesVersion is still ${live.pricesVersion}.\n`
        + `  Bump pricesVersion in js/data.js first -- a saved configuration stamped\n`
        + `  ${lock.pricesVersion} would otherwise restore against these new prices with no\n`
        + `  note, showing the visitor a total we no longer honour.\n\n`);
      return 1;
    }
    fs.writeFileSync(LOCK_FILE, `${JSON.stringify(
      { hashSchema: HASH_SCHEMA, pricesVersion: live.pricesVersion, hash: live.hash },
      null, 2)}\n`);
    process.stdout.write(`  lock updated: version ${live.pricesVersion}, hash ${live.hash}\n\n`);
    return 0;
  }

  check('A1 the lock exists',
    !!lock,
    `${LOCK_FILE} is missing. Run with --update to record the current surface.`);
  if (!lock) { process.stdout.write(`\n${passes} passed, ${failures} failed\n`); return 1; }

  check('A1b the lock was written by this extractor',
    lock.hashSchema === HASH_SCHEMA,
    `the lock records hash schema ${lock.hashSchema}, this fixture measures schema ${HASH_SCHEMA}. `
    + `What gets hashed changed, so the stored hash is not comparable. Re-run with --update; `
    + `it will re-lock without demanding a price-version bump, because no price necessarily moved.`);

  check('A2 pricesVersion matches the lock',
    live.pricesVersion === lock.pricesVersion,
    `js/data.js says ${live.pricesVersion}, the lock says ${lock.pricesVersion}. `
    + `Either the bump was not recorded (run --update) or the version moved without prices.`);

  check('A3 the rendered price surface matches the lock',
    live.hash === lock.hash,
    `the prices a customer sees have changed (${lock.hash} -> ${live.hash}) since the lock `
    + `was recorded at pricesVersion ${lock.pricesVersion}. If that was deliberate: bump `
    + `pricesVersion in js/data.js, then re-run with --update. If it was not, a price moved `
    + `that nobody meant to move -- find it before shipping.`);

  process.stdout.write('\nB. with one price moved and the version left alone\n');
  const dir = scratchSite();
  let mutated;
  try {
    bumpOnePrice(path.join(dir, 'js', 'data.js'));
    mutated = await measure(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }

  check('B1 a price change is DETECTED by the hash',
    mutated.hash !== live.hash,
    'one model\'s interior upgrade was moved $100 and the surface hash did not budge. '
    + 'This fixture cannot see the thing it exists to see, so A3 proves nothing.');

  check('B2 the version did NOT move with it',
    mutated.pricesVersion === live.pricesVersion,
    'the mutation changed pricesVersion as well, so B1 does not isolate the failure mode');

  check('B3 that state is exactly what the guard refuses',
    mutated.hash !== lock.hash && mutated.pricesVersion === lock.pricesVersion,
    'a price moved with a stale stamp and the lock comparison would not have caught it');

  process.stdout.write(`\n${passes} passed, ${failures} failed\n`);
  return failures === 0 ? 0 : 1;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(`\nprices-version tests crashed: ${err.stack || err.message}`);
    process.exit(2);
  },
);
