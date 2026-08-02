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

/**
 * HALF THREE (B4) -- the Eleventy data file the SITE renders from.
 *
 * `src/_data/models.json` is what the /saunas/ ledger rows, the /saunas/
 * ItemList and the sitewide OfferCatalog are all generated from. It exists to
 * collapse four hand-maintained copies of the same facts into one, and without
 * an assertion against canonical it would simply be the seventh copy -- a fix
 * in shape and a drift source in substance.
 *
 * So it is gated on both sides. Against CANONICAL, statically: the four fact
 * fields must be byte-equal per model. Against the RENDERED PAGE, in a real
 * browser: each row's capacity, size and price cell must read what canonical
 * says, modulo the two glyph substitutions Jen's Stage 0.7 spec sanctions as
 * pure typography. The second half is the one no suite carried, and it is the
 * one that would have caught the actual defect -- the SC's capacity was wrong
 * in the markup, in four places, while every JSON file in the repo was right.
 */
const SITE_DATA_FILE = path.join(REPO_ROOT, 'src', '_data', 'models.json');

/** The fields the canonical sheet is authoritative for. Nothing else is gated. */
const GATED_FIELDS = ['name', 'size', 'capacity', 'basePrice'];

/**
 * The two substitutions Jen's spec sanctions, and their exact scope: `x` -> `×`
 * between the two dimensions of a size, and the range hyphen -> en dash in a
 * capacity. They are applied at RENDER time and never stored, so the stored
 * string and the canonical string stay directly comparable. Written out here
 * rather than imported from the template, deliberately: an assertion that reads
 * its expectation from the thing it is testing proves nothing.
 */
// replaceAll, not replace (Razor N3). Nunjucks' `replace` filter is GLOBAL, so
// String.prototype.replace -- which stops at the first match -- was a quieter
// expectation than the thing it was checking. It happened to agree on today's
// five strings because each contains one match; a canonical size of
// "5' x 7' x 7'" would have made the gate disagree with the page and blame the
// page. An assertion must not be laxer than what it asserts about.
const displaySize = (s) => s.replaceAll(' x ', ' × ');
const displayCapacity = (s) => s.replaceAll('-', '–');

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

/**
 * Half three, static side. Returns the parsed canonical document when it is
 * readable, so the browser half can assert the rendered page against CANONICAL
 * rather than against the file it is checking.
 */
function checkSiteDataParity() {
  console.log('\n--- site data file vs canonical ---');
  console.log(`  site data ${SITE_DATA_FILE}`);
  console.log(`  canonical ${CANONICAL_PATH}`);

  let canonical;
  try {
    canonical = JSON.parse(fs.readFileSync(CANONICAL_PATH, 'utf8'));
  } catch (err) {
    skip(`canonical copy not readable (${err.code}): ${CANONICAL_PATH}. The site data file is `
      + 'therefore UNVERIFIED against it -- not confirmed. Set SSC_MODELS_JSON to assert it.');
    return null;
  }

  const site = JSON.parse(fs.readFileSync(SITE_DATA_FILE, 'utf8'));

  // The roster itself is gated. A model quietly dropped from `order` would
  // vanish from the rows, the ItemList and the OfferCatalog at once, and every
  // remaining per-model assertion would still pass.
  const canonicalKeys = Object.keys(canonical.models);
  ok(JSON.stringify(site.order) === JSON.stringify(canonicalKeys),
    `roster: site order ${JSON.stringify(site.order)} === canonical models `
    + `${JSON.stringify(canonicalKeys)}`);

  for (const key of canonicalKeys) {
    const m = site.models[key];
    if (!m) { ok(false, `${key}: canonical has this model, src/_data/models.json does not`); continue; }

    const pick = (o) => Object.fromEntries(GATED_FIELDS.map((f) => [f, o[f]]));
    const d = firstDifference(pick(canonical.models[key]), pick(m));
    ok(d === null, d === null
      ? `${key} facts: name/size/capacity/basePrice byte-equal to canonical`
      : `${key} facts DRIFTED from canonical at "${d.field}": canonical `
        + `${JSON.stringify(d.canonical)} vs site data ${JSON.stringify(d.inRepo)}. The site would `
        + `print the second one. Copy the canonical value into ${SITE_DATA_FILE}.`);

    // priceDisplay is the string a visitor reads. It is presentational in shape
    // and load-bearing in content, so it is gated on its DIGITS: "From $22,500"
    // must carry exactly basePrice, and a typo'd separator or a stale figure is
    // a wrong price in front of a customer.
    ok(money(m.priceDisplay) === canonical.models[key].basePrice,
      `${key} priceDisplay "${m.priceDisplay}" carries basePrice `
      + `${canonical.models[key].basePrice}`);

    ok(m.id === IDS[key],
      `${key} id "${m.id}" === the configurator's model id "${IDS[key]}" (the data-model the `
      + `row must carry, or the row opens nothing)`);
  }

  return canonical;
}

const inRepoRaw = fs.readFileSync(JSON_FILE, 'utf8');
const spec = JSON.parse(inRepoRaw);

// Half two runs first: it needs no browser, and a drifted canonical copy is
// worth knowing about before spending two minutes on a build.
checkCanonicalParity(inRepoRaw);
const canonicalDoc = checkSiteDataParity();

/**
 * HALF FOUR (B4 fix round, Razor W3) -- the COMPARE TABLE.
 *
 * `#compareTable` is rendered by js/compare.js from js/data.js and states Size,
 * Capacity and Base Price for all five models: the exact three fields the
 * historical defect corrupted, on the same page as the ledger, and until now
 * touched by no assertion in this file or any other. The ledger could be
 * perfect and the table beneath it could disagree with canonical, and the only
 * detector would be somebody reading both.
 *
 * TWO RENDERING CONVENTIONS, asserted separately and on purpose. The ledger
 * applies Jen's two sanctioned glyph substitutions; compare.js does not, so the
 * table prints "5' x 7'" and "2-3 people" where the ledger prints "5' × 7'" and
 * "2–3 people". Each is compared to canonical in its OWN convention rather than
 * being normalised into agreement here -- normalising would hide the divergence
 * instead of asserting it. The divergence itself is Razor N2 and is recorded for
 * B6: harmonising it means teaching compare.js the substitutions, which is a
 * js/ change, and a js/ change flips dom-integrity's stated boundary
 * ("client JavaScript differs ... do not read a PASS here as covering it") for a
 * typographic nicety. Not worth the certificate.
 */
async function checkCompareTable(page, canonical) {
  console.log('\n--- compare table vs canonical (#compareTable, rendered by js/compare.js) ---');
  if (!canonical) { skip('canonical not readable; the compare table is UNVERIFIED against it.'); return; }

  await page.waitForSelector('#compareTable table', { state: 'attached' });
  const table = await page.evaluate(() => {
    const out = { headers: [], rows: {} };
    const t = document.querySelector('#compareTable table');
    out.headers = [...t.querySelectorAll('thead th')].map((th) => th.textContent.trim());
    for (const tr of t.querySelectorAll('tbody tr')) {
      const label = tr.querySelector('th').textContent.trim();
      out.rows[label] = [...tr.querySelectorAll('td')].map((td) => td.textContent.trim());
    }
    return out;
  });

  // The column ORDER is load-bearing: every cell assertion below indexes by it,
  // so a reordered table would compare the S2 column against the S4 spec and
  // could pass while being wrong about both.
  const order = Object.keys(canonical.models);
  const cols = table.headers.slice(1).map((h) => h.replace(/Most Popular/i, '').trim());
  ok(JSON.stringify(cols) === JSON.stringify(order),
    `compare table column order ${JSON.stringify(cols)} === canonical ${JSON.stringify(order)}`);
  if (JSON.stringify(cols) !== JSON.stringify(order)) return;

  for (const [i, key] of order.entries()) {
    const c = canonical.models[key];
    const cell = (row) => (table.rows[row] || [])[i];

    // RAW canonical strings: compare.js applies no substitutions.
    ok(cell('Size') === c.size,
      `${key} compare-table size: "${cell('Size')}" === canonical "${c.size}"`);
    ok(cell('Capacity') === c.capacity,
      `${key} compare-table capacity: "${cell('Capacity')}" === canonical "${c.capacity}"`);
    ok(money(cell('Base Price')) === c.basePrice,
      `${key} compare-table base price: "${cell('Base Price')}" carries canonical ${c.basePrice}`);
    ok(cell('Heater') === c.heater,
      `${key} compare-table heater: "${cell('Heater')}" === canonical "${c.heater}"`);
  }

  // Razor N1, folded in because it turned out to be one line: the ledger's
  // price and the table's price are two renderings of one number and must not
  // disagree with each other either.
  const ledger = await page.evaluate(() => Object.fromEntries(
    [...document.querySelectorAll('.model-row')].map((r) => [r.dataset.model,
      r.querySelector('.model-row__price').textContent.trim()])));
  for (const [i, key] of order.entries()) {
    ok(money(ledger[IDS[key]]) === money((table.rows['Base Price'] || [])[i]),
      `${key}: the ledger row (${ledger[IDS[key]]}) and the compare table `
      + `(${(table.rows['Base Price'] || [])[i]}) print the same number`);
  }
}

console.log('\n--- site parity, per model ---');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ssc-roundtrip-'));
buildRef('WORKING', dir);
const server = await startServer(dir);
const browser = await chromium.launch();
const page = await browser.newPage();

for (const [key, id] of Object.entries(IDS)) {
  await page.goto(`${server.url}/saunas/`, { waitUntil: 'networkidle' });

  // THE ROW, before the modal. The assertion no suite carried: what the page
  // actually PRINTS about a model, compared against canonical. Every earlier
  // check in this file reads the configurator, and the configurator was always
  // right -- the wrong capacity was sitting in the markup beside it.
  if (canonicalDoc) {
    const row = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const cell = (c) => el.querySelector(c)?.textContent.trim() ?? null;
      return {
        designation: cell('.model-row__designation'),
        size: cell('.model-row__size'),
        capacity: cell('.model-row__capacity'),
        price: cell('.model-row__price'),
      };
    }, `[data-action="open-modal"][data-model="${id}"]`);

    if (!row) {
      ok(false, `${key}: no ledger row matched [data-action="open-modal"][data-model="${id}"] on `
        + '/saunas/. The row contract is broken and three suites click that selector.');
    } else {
      const c = canonicalDoc.models[key];
      ok(row.capacity === displayCapacity(c.capacity),
        `${key} rendered capacity: page "${row.capacity}" === canonical "${c.capacity}" `
        + `(rendered "${displayCapacity(c.capacity)}")`);
      ok(row.size === displaySize(c.size),
        `${key} rendered size: page "${row.size}" === canonical "${c.size}" `
        + `(rendered "${displaySize(c.size)}")`);
      ok(money(row.price) === c.basePrice,
        `${key} rendered price: page "${row.price}" carries canonical basePrice ${c.basePrice}`);
      ok(row.designation === key,
        `${key} rendered designation: page "${row.designation}" === "${key}"`);
    }
  }

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

// Half four. Runs once, on a clean load of the page rather than on whatever
// state the modal walk left behind.
await page.goto(`${server.url}/saunas/`, { waitUntil: 'networkidle' });
await checkCompareTable(page, canonicalDoc);

await browser.close();
await server.close();
fs.rmSync(dir, { recursive: true, force: true });
const skipNote = skips ? ` (${skips} check(s) SKIPPED -- unverified, not confirmed)` : '';
console.log(fails ? `\n${fails} FAILURES${skipNote}` : `\nROUND-TRIP CLEAN${skipNote}`);
process.exit(fails ? 1 : 0);
