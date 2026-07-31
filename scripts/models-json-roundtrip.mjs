#!/usr/bin/env node
/**
 * Round-trip check for the models.json parity file, in two halves.
 *
 *   npm run models-json:roundtrip
 *
 * HALF ONE -- does the in-repo copy match the site?
 *
 * Every price in the schema extension must equal the price the site actually
 * renders, per model, read from a real browser.
 *
 * HALF TWO -- does the CANONICAL copy match the in-repo one?
 *
 * The in-repo file is a reviewable mirror. The file quoting tools actually read
 * lives in the MARVIN repo, and agreement between the two is asserted by nobody
 * -- which is the entire original defect. `models.json` sat at `_updated:
 * "2026-02-09"` citing an `index.html` that died in the Eleventy migration,
 * while the site moved on without it.
 *
 * That gap is not academic. With the canonical file at v1 and the site at v2,
 * an S4 with a changing room and a clear-cedar interior quotes $34,000 from one
 * system and $42,600 from the other. Same customer, same configuration, two
 * numbers, and the only detector was somebody noticing.
 *
 * Three outcomes, all loud, never a silent pass:
 *   identical  -> PASS, naming both paths.
 *   differing  -> FAIL, naming the first differing field and both versions.
 *   unreadable -> SKIP, naming the reason. A CI box or a foreign checkout has
 *                 no MARVIN repo, and that is not a parity failure -- but it is
 *                 also not evidence of parity, so it must never read as green.
 *
 * The path is overridable with `SSC_MODELS_JSON` so a checkout that keeps
 * MARVIN somewhere else can still assert parity rather than skipping forever.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { startServer } from './lib/server.mjs';
import { buildRef } from './lib/build-ref.mjs';

const REPO_ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const require = createRequire(path.join(REPO_ROOT, '/'));
const { chromium } = require('playwright');

const JSON_FILE = path.join(REPO_ROOT, 'docs', 'redesign-2026-07', '41-models-v2.json');
const IDS = { S2: 's2', S4: 's4', S6: 's6', S8: 's8', SC: 'sc' };

/** Where the tools that quote customers actually read from. */
const CANONICAL_PATH = process.env.SSC_MODELS_JSON
  || '/home/leesalo/marvin/content/reference/operations/models.json';

let fails = 0;
let skips = 0;
const ok = (c, m) => { console.log((c ? 'PASS  ' : 'FAIL  ') + m); if (!c) fails += 1; };
const skip = (m) => { console.log(`SKIP  ${m}`); skips += 1; };
const money = (s) => parseInt(String(s).replace(/[^0-9]/g, ''), 10);

/**
 * First field at which two parsed objects disagree, as a dotted path.
 *
 * "the files differ" is useless in a report -- it is the difference between
 * "someone reformatted it" and "the S6 package price is stale". Returns null
 * only when the two are deeply equal.
 */
function firstDifference(a, b, trail = '') {
  if (a === b) return null;
  const aObj = a && typeof a === 'object';
  const bObj = b && typeof b === 'object';
  if (!aObj || !bObj) {
    return { field: trail || '(root)', canonical: a, inRepo: b };
  }
  if (Array.isArray(a) !== Array.isArray(b)) {
    return { field: trail || '(root)', canonical: Array.isArray(a) ? 'array' : 'object', inRepo: Array.isArray(b) ? 'array' : 'object' };
  }
  const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])];
  for (const k of keys) {
    const where = trail ? `${trail}.${k}` : k;
    if (!(k in a)) return { field: where, canonical: '(absent)', inRepo: b[k] };
    if (!(k in b)) return { field: where, canonical: a[k], inRepo: '(absent)' };
    const d = firstDifference(a[k], b[k], where);
    if (d) return d;
  }
  return null;
}

/**
 * Everything in the file that can put a wrong number in front of a customer.
 *
 * Compared BEFORE the whole document, because key order decides what a naive
 * first-difference reports, and here that is `_comment` -- burying "the S6
 * package price is stale" under a prose edit. Severity has to lead.
 */
function priceProjection(doc) {
  if (!doc || typeof doc !== 'object') return doc;
  const pick = (o, keys) => Object.fromEntries(keys.filter((k) => o && k in o).map((k) => [k, o[k]]));
  const models = Object.fromEntries(Object.entries(doc.models || {})
    .map(([k, m]) => [k, pick(m, ['basePrice', 'heater', 'electricOnly'])]));
  const groups = Object.fromEntries(Object.entries(doc.optionGroups || {})
    .map(([g, grp]) => [g, (grp.options || []).map((o) => pick(o, ['id', 'price', 'pricePerModel']))]));
  return {
    // pricesVersion deliberately excluded: it is reported on its own line
    // either way, and leaving it here made it the "first differing price
    // field" every time, hiding the actual money behind the stamp.
    models,
    optionGroups: groups,
    packages: Object.fromEntries(Object.entries(doc.packages || {})
      .map(([k, p]) => [k, pick(p, ['pricePerModel', 'savings', 'includes'])])),
    // v1 had a flat `addons` map and no optionGroups at all. Carried so a
    // schema-shaped difference reports as a price difference, not as prose.
    addons: doc.addons,
  };
}

/** Half two. Returns nothing; records its own PASS / FAIL / SKIP. */
function checkCanonicalParity(inRepoRaw) {
  console.log('\n--- canonical parity ---');
  console.log(`  in-repo   ${JSON_FILE}`);
  console.log(`  canonical ${CANONICAL_PATH}`);

  let canonicalRaw;
  try {
    canonicalRaw = fs.readFileSync(CANONICAL_PATH);
  } catch (err) {
    skip(`canonical copy not readable (${err.code}): ${CANONICAL_PATH}. `
      + 'No MARVIN checkout here, so parity is UNVERIFIED -- not confirmed. '
      + 'Set SSC_MODELS_JSON to assert it from this machine.');
    return;
  }

  if (Buffer.compare(canonicalRaw, Buffer.from(inRepoRaw)) === 0) {
    ok(true, `byte-identical: ${CANONICAL_PATH} === ${JSON_FILE} (${canonicalRaw.length} bytes)`);
    return;
  }

  // Not identical. Say WHERE, and say it in the terms that matter.
  let detail;
  try {
    const canonical = JSON.parse(canonicalRaw.toString('utf8'));
    const inRepo = JSON.parse(inRepoRaw);
    const cv = canonical.pricesVersion === undefined ? '(absent)' : canonical.pricesVersion;
    const rv = inRepo.pricesVersion === undefined ? '(absent)' : inRepo.pricesVersion;
    const versions = `pricesVersion canonical=${cv} in-repo=${rv}.`;

    const priced = firstDifference(priceProjection(canonical), priceProjection(inRepo));
    if (priced) {
      detail = `first differing PRICE field "${priced.field}": canonical `
        + `${JSON.stringify(priced.canonical)} vs in-repo ${JSON.stringify(priced.inRepo)}. ${versions}`;
    } else {
      const d = firstDifference(canonical, inRepo);
      detail = d
        ? `prices agree; first differing field is metadata, "${d.field}": canonical `
          + `${JSON.stringify(d.canonical)} vs in-repo ${JSON.stringify(d.inRepo)}. ${versions}`
        : `same data, different bytes (formatting only). ${versions}`;
    }
  } catch (err) {
    detail = `canonical copy is not parseable JSON (${err.message}), so it cannot be quoting anything correctly.`;
  }

  ok(false,
    `canonical copy has DRIFTED from the in-repo copy. ${detail} `
    + 'Two systems are quoting the same configuration differently. Copy '
    + `${JSON_FILE} over ${CANONICAL_PATH} (file write only -- that repo is not this batch's to commit).`);
}

const inRepoRaw = fs.readFileSync(JSON_FILE, 'utf8');
const spec = JSON.parse(inRepoRaw);

// Half two runs first: it needs no browser, and a drifted canonical copy is
// worth knowing about before spending two minutes on a build.
checkCanonicalParity(inRepoRaw);

console.log('\n--- site parity, per model ---');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ssc-roundtrip-'));
buildRef('WORKING', dir);
const server = await startServer(dir);
const browser = await chromium.launch();
const page = await browser.newPage();

for (const [key, id] of Object.entries(IDS)) {
  await page.goto(`${server.url}/saunas/`, { waitUntil: 'networkidle' });
  await page.click(`[data-action="open-modal"][data-model="${id}"]`);
  await page.waitForSelector('.modal-addons .addon-option', { state: 'visible' });

  const rendered = await page.evaluate(() => ({
    base: document.getElementById('summaryBase').textContent,
    version: window.SSC.pricesVersion,
    claim: document.querySelector('.package-description').textContent.match(/Save\s+\$[\d,]+/)[0],
    options: [...document.querySelectorAll('.modal-addons .addon-option')].map((o) => ({
      label: o.querySelector('.addon-label').textContent.trim(),
      price: o.querySelector('.addon-price').textContent.trim(),
      disabled: o.querySelector('input').disabled,
    })),
  }));

  const byLabel = new Map(rendered.options.map((o) => [o.label, o]));
  ok(money(rendered.base) === spec.models[key].basePrice,
    `${key} basePrice: site ${rendered.base} === json ${spec.models[key].basePrice}`);

  for (const group of Object.values(spec.optionGroups)) {
    for (const opt of group.options) {
      const name = (opt.nameByModel && opt.nameByModel[key]) || opt.name;
      const want = opt.pricePerModel ? opt.pricePerModel[key] : opt.price;
      const shown = byLabel.get(name);

      if (want === null) {
        ok(!!shown && shown.disabled, `${key} ${opt.id}: no price in json, option disabled on site`);
        continue;
      }
      if (!shown) { ok(false, `${key} ${opt.id}: json names "${name}", the site has no such option`); continue; }
      if (want === 0) {
        ok(/Included|—/.test(shown.price), `${key} ${opt.id}: $0 in json, "${shown.price}" on site`);
        continue;
      }
      ok(money(shown.price) === want, `${key} ${opt.id}: site ${shown.price} === json ${want}`);
    }
  }

  const pkg = spec.packages.premium_finish;
  const pkgShown = byLabel.get(pkg.name);
  ok(money(pkgShown.price) === pkg.pricePerModel[key],
    `${key} premium package: site ${pkgShown.price} === json ${pkg.pricePerModel[key]}`);
  ok(money(rendered.claim) === pkg.savings,
    `${key} advertised saving: site "${rendered.claim}" === json ${pkg.savings}`);
  ok(rendered.version === spec.pricesVersion,
    `${key} pricesVersion: site ${rendered.version} === json ${spec.pricesVersion}`);

  // The saving must also be arithmetically true against the json's own numbers,
  // not merely equal to the number the site prints.
  const sum = pkg.includes.reduce((acc, incId) => {
    const opt = Object.values(spec.optionGroups)
      .flatMap((g) => g.options).find((o) => o.id === incId);
    return acc + (opt.pricePerModel ? opt.pricePerModel[key] : opt.price);
  }, 0);
  ok(sum - pkg.pricePerModel[key] === pkg.savings,
    `${key} json is internally true: components ${sum} - package ${pkg.pricePerModel[key]} = ${sum - pkg.pricePerModel[key]} === savings ${pkg.savings}`);
}

await browser.close();
await server.close();
fs.rmSync(dir, { recursive: true, force: true });
const skipNote = skips ? ` (${skips} check(s) SKIPPED -- unverified, not confirmed)` : '';
console.log(fails ? `\n${fails} FAILURES${skipNote}` : `\nROUND-TRIP CLEAN${skipNote}`);
process.exit(fails ? 1 : 0);
