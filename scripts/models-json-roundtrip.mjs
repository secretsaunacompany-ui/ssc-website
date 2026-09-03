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

/**
 * The advisor's hand-synced copy of the price sheet. Not a mirror of canonical
 * in shape -- it is a flattened projection shaped for a prompt -- but every
 * number in it is a number canonical is authoritative for. See
 * `checkAdvisorProductsProjection`.
 */
const PRODUCTS_FILE = path.join(REPO_ROOT, 'netlify', 'functions', 'data', 'products.json');

/**
 * THE MARGIN FLOOR IS POLICY, AND POLICY DOES NOT LIVE IN THE FILE THE GATE
 * POLICES (Razor W1).
 *
 * The cost-basis check used to read its floor out of `costBasis.gmFloor` in
 * canonical -- the same document whose prices it is checking. That is a gate
 * holding its own bar, and the bar was lowerable by the person being measured:
 * editing S6's gmFloor to 0.20 and dropping its `held` flag turned a knowingly
 * below-floor price into a silent PASS, with no diff to review anywhere near a
 * price. Razor proved it.
 *
 * So the floor is pinned HERE, in code, and canonical's own gmFloor is checked
 * AGAINST it rather than trusted as it. The policy: "No quote leaves under 40%
 * GM stress-tested" (pricing-overhaul-reference.md §3 rule 1). A model whose
 * recorded gmFloor differs from this constant is a FAIL naming both values --
 * not a quietly-honoured local override. Lowering the floor now requires
 * editing this line, which is a code review; it can no longer be done by
 * editing the data the line exists to police.
 */
const GM_FLOOR_POLICY = 0.40;

let fails = 0;
let skips = 0;
let warns = 0;
const ok = (c, m) => { console.log((c ? 'PASS  ' : 'FAIL  ') + m); if (!c) fails += 1; };
const skip = (m) => { console.log(`SKIP  ${m}`); skips += 1; };
const warn = (m) => { console.log(`WARN  ${m}`); warns += 1; };
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
    // and load-bearing in content, so it is gated on its DIGITS: "From $23,500"
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

/**
 * HALF FIVE -- THE COST-BASIS GATE.
 *
 * Every other assertion in this file checks that five copies of a price AGREE.
 * None of them has any opinion about whether the number they agree on is a
 * number we can afford to sell at. Five perfectly consistent copies of a price
 * below cost is exactly as consistent as five copies of a good one, and the
 * gate that catches drift would report ROUND-TRIP CLEAN either way.
 *
 * So: canonical records, per model, the stress-case build cost and the gross
 * margin floor the list price is expected to clear against it. This asserts
 * (basePrice - stressCost) / basePrice >= GM_FLOOR_POLICY -- the floor pinned in
 * THIS file, not the one recorded in the data (Razor W1). Canonical's own
 * `gmFloor` is still read, but only to be checked against the policy: a
 * disagreement is a FAIL naming both numbers, never a local override.
 *
 * THE HELD FLAG, and why it is not a way of turning the check off.
 *
 * S6, S8 and SC are KNOWINGLY below floor pending step 2 (trailer-line
 * separation). Two obvious designs are both wrong. Failing on them leaves the
 * tree permanently red, and a suite that is always red is a suite everyone
 * learns to run past -- it would swallow a real regression on S2 or S4 inside
 * noise that is expected. Exempting them silently is worse: the whole reason
 * this gate exists is that below-floor pricing is invisible, and a silent
 * exemption restores the invisibility with a config key on top.
 *
 * So a held model does not fail, and does not pass quietly either: it prints a
 * loud WARNING naming the model, its actual margin, the floor it misses, and
 * the `heldRef` that says what has to happen for the hold to end. The warning
 * is a standing bill, visible on every run, that someone eventually has to
 * clear. A non-held model below floor is a hard FAIL naming both numbers.
 *
 * A missing costBasis is a FAIL, not a skip. "This model has no recorded cost"
 * must not be the cheap way to leave the gate.
 */
function checkCostBasis(canonical) {
  console.log('\n--- cost basis: every basePrice clears its gross-margin floor ---');
  if (!canonical) {
    skip('canonical not readable; NO basePrice was checked against a cost. '
      + 'Margins are UNVERIFIED -- not confirmed. Set SSC_MODELS_JSON to assert them.');
    return;
  }

  const pct = (n) => `${(n * 100).toFixed(1)}%`;

  for (const [key, m] of Object.entries(canonical.models)) {
    const cb = m.costBasis;
    if (!cb || typeof cb.stressCost !== 'number' || typeof cb.gmFloor !== 'number') {
      ok(false, `${key} has no usable costBasis {stressCost, gmFloor} in canonical, so its `
        + `basePrice ${m.basePrice} is not checked against any cost. Record one; do not `
        + 'delete the model from the check.');
      continue;
    }

    // W1. The recorded floor is checked against the pinned policy BEFORE it is
    // used for anything. Everything below compares against GM_FLOOR_POLICY, not
    // against cb.gmFloor, so even a tampered value cannot lower the real bar --
    // it can only add a second failure line saying it was tampered with.
    ok(cb.gmFloor === GM_FLOOR_POLICY,
      `${key} costBasis.gmFloor ${pct(cb.gmFloor)} === the pinned policy floor `
      + `${pct(GM_FLOOR_POLICY)} (pricing-overhaul-reference.md §3 rule 1, "No quote leaves `
      + 'under 40% GM stress-tested"). A per-model floor is not a thing this business has: '
      + 'if the policy really changed, change GM_FLOOR_POLICY in '
      + 'scripts/models-json-roundtrip.mjs, where it gets reviewed.');

    // N3. A hold is a promise that something specific will retire it. Without a
    // heldRef it is just an exemption with better manners, and nobody can tell
    // years later what was supposed to clear it.
    if (cb.held && !cb.heldRef) {
      ok(false, `${key} is flagged costBasis.held with NO heldRef. A hold must carry the `
        + 'reference that says what has to happen for it to end, or it is an untraceable '
        + 'permanent exemption from the margin floor.');
    }

    const gm = (m.basePrice - cb.stressCost) / m.basePrice;

    if (gm >= GM_FLOOR_POLICY) {
      ok(true, `${key} margin ${pct(gm)} >= floor ${pct(GM_FLOOR_POLICY)} `
        + `(basePrice ${m.basePrice} - stressCost ${cb.stressCost})`);
      if (cb.held) {
        warn(`${key} is still flagged costBasis.held but its margin ${pct(gm)} now CLEARS the `
          + `floor ${pct(GM_FLOOR_POLICY)}. The hold has served its purpose -- remove the flag `
          + `(heldRef: ${cb.heldRef || '(none recorded)'}).`);
      }
      continue;
    }

    if (cb.held) {
      warn(`${key} is BELOW its floor and knowingly held: margin ${pct(gm)} < floor `
        + `${pct(GM_FLOOR_POLICY)} (basePrice ${m.basePrice} - stressCost ${cb.stressCost} = `
        + `${m.basePrice - cb.stressCost}). This is not a pass, it is a standing bill. `
        + `Held pending: ${cb.heldRef || '(no heldRef recorded -- record one)'}`);
      continue;
    }

    ok(false, `${key} basePrice ${m.basePrice} is BELOW its gross-margin floor: margin `
      + `${pct(gm)} < floor ${pct(GM_FLOOR_POLICY)} against stressCost ${cb.stressCost} `
      + `(gross ${m.basePrice - cb.stressCost}). Either raise basePrice to at least `
      + `${Math.ceil(cb.stressCost / (1 - GM_FLOOR_POLICY))} or record a costBasis.held with a `
      + 'heldRef saying what makes the shortfall deliberate.');
  }
}

/**
 * HALF SIX (Razor W4) -- THE ADVISOR'S PRICE SHEET.
 *
 * `netlify/functions/data/products.json` is a sixth copy of the price sheet and
 * was, until now, the only one no assertion touched. It is read by the AI
 * advisor functions and pasted wholesale into their system prompts, so a stale
 * number there is not a stale number on a page a visitor can check against the
 * configurator -- it is a stale number an assistant states with confidence, in
 * conversation, to a customer who has no way of knowing. Its own `_comment`
 * says "keep in sync with js/data.js", which is a hand-sync instruction with no
 * detector behind it. This is the detector.
 *
 * It is a PROJECTION, not a mirror: the file is deliberately flattened and
 * re-worded for a prompt, so it cannot be byte-compared like the in-repo copy.
 * What is gated is every number in it that canonical is authoritative for, plus
 * the version stamp that says which sheet it belongs to.
 *
 * The mapping tables below are HAND-WRITTEN and that is the point. A table
 * derived from products.json would agree with products.json no matter what it
 * said, which is the tautology this whole file exists to avoid. The cost is
 * that adding a priced line means adding a mapping -- and an unmapped priced
 * line is a FAIL, not a skip, so the cost is paid rather than silently dodged.
 */
const PRODUCTS_MODEL_KEYS = { s2: 'S2', s4: 'S4', s6: 'S6', s8: 'S8', sc: 'SC' };

/**
 * Fixed-price advisor lines -> the canonical option they copy. A bare string is
 * an option with a flat `price`; a `[id, MODEL]` pair is one line of an option's
 * `pricePerModel` map, which is how the advisor file flattens the per-model
 * heater split into separate named lines.
 */
const PRODUCTS_FIXED_LINES = {
  heaterUpgrade: {
    'Standard electric heater (included)': 'heater_standard_electric',
    // The second INCLUDED build, at $0 on the models that offer it. It is
    // mapped to S4 rather than left out because a $0 line still has to be
    // proved $0 -- an included build that silently acquires a price is the
    // exact failure the complete-sauna rule exists to prevent.
    'Standard wood-fired heater, Harvia M3 (included, S4/S6/S8)': ['heater_standard_wood', 'S4'],
    'Homecraft Revive 9kW Electric (S2-S8)': ['heater_electric', 'S2'],
    'Homecraft 15kW Apex Electric (SC)': ['heater_electric', 'SC'],
    'Mini-IKI Wood-fired (S4)': ['heater_wood_premium', 'S4'],
    'Original-IKI Wood-fired (S6, S8)': ['heater_wood_premium', 'S6'],
    'Original-IKI Wood-fired (SC)': ['heater_wood_premium', 'SC'],
  },
  mounting: {
    'Skid-mounted (included)': 'mount_skid',
    'Trailer integration': 'mount_trailer',
  },
  changingRoom: {
    None: 'changing_none',
    "3' Changing Room": 'changing_3ft',
    "4' Changing Room": 'changing_4ft',
  },
  frontDeck: {
    None: 'deck_none',
    "2' open deck platform": 'deck_platform_2ft',
    "3' open deck platform": 'deck_platform_3ft',
    "2' semi-enclosed deck (two finished side walls, covered roof)": 'deck_enclosed_2ft',
    "3' semi-enclosed deck (two finished side walls, covered roof)": 'deck_enclosed_3ft',
  },
  exteriorCladding: { 'Standard metal (included)': 'exterior_standard' },
  interiorWood: { 'Knotty Western Red Cedar (included)': 'interior_knotty_cedar' },
  benchConfig: { 'L-Shaped': 'bench_l', 'U-Shaped': 'bench_u' },
  additionalOptions: {
    'Additional window (standard size)': 'window_standard',
    'Additional full-size window (~23 sq ft)': 'window_full_size',
    'Interior + exterior lighting': 'lighting_package',
    'Bluetooth speakers (standard set)': 'speakers_standard',
    'Premium audio (Polk Atrium 5 all-weather pair + 2.1 Bluetooth amp)': 'speakers_premium',
    'WiFi heater controller': 'wifi_controller',
  },
};

/**
 * Advisor lines whose price is PROSE rather than a number, because the real
 * price varies by model. Two kinds, and the distinction is load-bearing:
 *
 *   'enumerating' -- the sentence lists the actual figures, so the set of
 *                    dollar amounts in it must equal canonical's distinct
 *                    per-model values EXACTLY. A dropped figure is as wrong as
 *                    a stale one.
 *   'vague'       -- the sentence says "varies by model" and names no figure.
 *                    Legitimate. Gated as a subset: it may say nothing, but
 *                    anything it does say must be a number canonical actually
 *                    carries, so a stale figure cannot creep in later.
 */
const PRODUCTS_PROSE_LINES = {
  exteriorCladding: {
    'Standing seam metal': ['exterior_standing_seam', 'enumerating'],
    'Cedar exterior': ['exterior_cedar', 'enumerating'],
    'Yakisugi (charred cedar) exterior': ['exterior_yakisugi', 'enumerating'],
  },
  interiorWood: {
    'Clear Cedar': ['interior_clear_cedar', 'vague'],
    Thermowood: ['interior_thermowood', 'vague'],
  },
};

/** Every dollar figure in a sentence, as numbers. "$9,200-$12,500" -> [9200, 12500]. */
const dollarsIn = (s) => [...String(s).matchAll(/\$([\d,]+)/g)].map((m) => money(m[1]));

/**
 * ATTRIBUTION, not a set of figures (Razor re-review NEW-1).
 *
 * The 'enumerating' check used to compare the SET of dollar amounts in the
 * sentence against the SET of canonical per-model values. Sets have no idea
 * who owns what: swap the exterior sentence to "S2/S4 $6,000, S6/S8/SC $5,000"
 * and the set is still {5000, 6000}, so the gate stayed green while the AI
 * advisor quoted an S2 customer $6,000 for cladding that costs $5,000. This
 * parses the sentence into a model -> price map so each model is asserted
 * against its own canonical `pricePerModel` entry.
 *
 * Grammar (all three exterior sentences follow it): one or more segments of
 * slash-joined model tokens followed by a dollar figure --
 *   "varies by model (S2/S4 $5,000, S6/S8/SC $6,000)"
 *
 * Any dollar figure the grammar cannot attribute to a model makes this return
 * an error, and the caller FAILS asking for a parseable sentence. It does NOT
 * fall back to the set comparison: falling back is how the hole got here.
 */
function parseModelPrices(sentence) {
  const text = String(sentence);
  const segment = /((?:S2|S4|S6|S8|SC)(?:\s*\/\s*(?:S2|S4|S6|S8|SC))*)\s*\$([\d,]+)/g;
  const map = {};
  let attributed = 0;

  for (const m of text.matchAll(segment)) {
    const value = money(m[2]);
    for (const token of m[1].split('/').map((t) => t.trim())) {
      if (token in map && map[token] !== value) {
        return { err: `attributes both $${map[token]} and $${value} to ${token}` };
      }
      map[token] = value;
    }
    attributed += 1;
  }

  const figures = dollarsIn(text);
  if (figures.length !== attributed) {
    return {
      err: `names ${figures.length} dollar figure(s) but only ${attributed} could be attributed `
        + 'to a model. Write it as "MODEL[/MODEL...] $N" segments, e.g. '
        + '"varies by model (S2/S4 $5,000, S6/S8/SC $6,000)", so each price has an owner',
    };
  }
  return { map };
}

function checkAdvisorProductsProjection(canonical) {
  console.log('\n--- advisor price sheet vs canonical (netlify/functions/data/products.json) ---');
  console.log(`  advisor   ${PRODUCTS_FILE}`);
  if (!canonical) {
    skip('canonical not readable; the advisor price sheet is UNVERIFIED against it -- not '
      + 'confirmed. Four AI-advisor prompts quote from this file. Set SSC_MODELS_JSON to assert it.');
    return;
  }

  let products;
  try {
    products = JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf8'));
  } catch (err) {
    ok(false, `${PRODUCTS_FILE} is not readable/parseable (${err.message}). The advisor `
      + 'functions read it at runtime, so this is a broken advisor, not just a broken check.');
    return;
  }

  // Flat index of every canonical option, by id.
  const optById = new Map(Object.values(canonical.optionGroups)
    .flatMap((g) => g.options).map((o) => [o.id, o]));

  const canonicalAmount = (spec) => {
    const [id, model] = Array.isArray(spec) ? spec : [spec, null];
    const o = optById.get(id);
    if (!o) return { err: `canonical has no option "${id}"` };
    if (model) {
      if (!o.pricePerModel || typeof o.pricePerModel[model] !== 'number') {
        return { err: `canonical option "${id}" has no pricePerModel.${model}` };
      }
      return { value: o.pricePerModel[model] };
    }
    if (typeof o.price !== 'number') return { err: `canonical option "${id}" has no flat price` };
    return { value: o.price };
  };

  ok(products._pricesVersion === canonical.pricesVersion,
    `advisor _pricesVersion ${products._pricesVersion} === canonical pricesVersion `
    + `${canonical.pricesVersion} (the stamp that says which sheet the advisor is quoting)`);

  // --- per model ---
  for (const [lower, KEY] of Object.entries(PRODUCTS_MODEL_KEYS)) {
    const p = products.models[lower];
    const c = canonical.models[KEY];
    if (!p) { ok(false, `advisor products.json has no model "${lower}" (canonical has ${KEY})`); continue; }

    const expect = {
      fullName: c.name,
      basePrice: c.basePrice,
      size: c.size,
      capacity: c.capacity,
      electricOnly: c.electricOnly,
      interiorUpgrade: canonicalAmount(['interior_clear_cedar', KEY]).value,
      premiumFinishPrice: canonical.packages.premium_finish.pricePerModel[KEY],
    };
    const got = Object.fromEntries(Object.keys(expect).map((f) => [f, p[f]]));
    const d = firstDifference(expect, got);
    ok(d === null, d === null
      ? `${KEY} advisor facts: fullName/basePrice/size/capacity/electricOnly/interiorUpgrade/`
        + 'premiumFinishPrice all equal canonical'
      : `${KEY} advisor sheet DIVERGED from canonical at "${d.field}": canonical `
        + `${JSON.stringify(d.canonical)} vs products.json ${JSON.stringify(d.inRepo)}. The AI `
        + `advisor states the second one to customers in conversation. Fix ${PRODUCTS_FILE}.`);
  }

  // --- add-on lines ---
  // `additionalOptions` is a bare array; every other group is {options: [...]}.
  const groupLines = (g) => (Array.isArray(products.addons[g])
    ? products.addons[g] : (products.addons[g]?.options || []));

  for (const group of Object.keys(products.addons)) {
    if (group === 'premiumFinishPackage') continue; // handled on its own below
    const fixed = PRODUCTS_FIXED_LINES[group] || {};
    const prose = PRODUCTS_PROSE_LINES[group] || {};
    const lines = groupLines(group);
    if (!lines.length) { ok(false, `advisor addon group "${group}" has no option lines to check`); continue; }

    for (const line of lines) {
      if (typeof line.price === 'number') {
        if (!(line.name in fixed)) {
          ok(false, `advisor addon "${group}" / "${line.name}" carries a price (${line.price}) `
            + 'that maps to NO canonical option. Every priced advisor line must be traceable to '
            + 'canonical -- add it to PRODUCTS_FIXED_LINES in this script, do not leave it ungated.');
          continue;
        }
        const r = canonicalAmount(fixed[line.name]);
        if (r.err) { ok(false, `advisor addon "${line.name}": ${r.err}`); continue; }
        ok(line.price === r.value,
          `advisor addon "${line.name}": ${line.price} === canonical ${r.value}`);
        continue;
      }

      // Prose price.
      if (!(line.name in prose)) {
        ok(false, `advisor addon "${group}" / "${line.name}" has a non-numeric price `
          + `${JSON.stringify(line.price)} and no entry in PRODUCTS_PROSE_LINES. An unmapped `
          + 'prose price is an ungated price.');
        continue;
      }
      const [id, mode] = prose[line.name];
      const opt = optById.get(id);
      if (!opt || !opt.pricePerModel) {
        ok(false, `advisor addon "${line.name}": canonical option "${id}" has no pricePerModel`);
        continue;
      }
      const canon = [...new Set(Object.values(opt.pricePerModel).filter((v) => typeof v === 'number'))]
        .sort((a, b) => a - b);
      const said = [...new Set(dollarsIn(line.price))].sort((a, b) => a - b);
      if (mode === 'enumerating') {
        const parsed = parseModelPrices(line.price);
        if (parsed.err) {
          ok(false, `advisor addon "${line.name}" price sentence ${JSON.stringify(line.price)} `
            + `${parsed.err}. An unparseable per-model sentence cannot be attributed, and an `
            + 'unattributed price is an ungated price.');
          continue;
        }
        const canonMap = Object.fromEntries(Object.entries(opt.pricePerModel)
          .filter(([, v]) => typeof v === 'number'));
        const wrong = [];
        for (const [model, want] of Object.entries(canonMap)) {
          if (!(model in parsed.map)) wrong.push(`${model} unstated (canonical $${want})`);
          else if (parsed.map[model] !== want) wrong.push(`${model} says $${parsed.map[model]}, canonical $${want}`);
        }
        for (const model of Object.keys(parsed.map)) {
          if (!(model in canonMap)) wrong.push(`${model} priced at $${parsed.map[model]} but canonical has no price for it`);
        }
        ok(wrong.length === 0,
          wrong.length === 0
            ? `advisor addon "${line.name}" attributes each model its canonical price `
              + `(${Object.entries(canonMap).map(([k, v]) => `${k} $${v}`).join(', ')})`
            : `advisor addon "${line.name}" MIS-ATTRIBUTES per-model prices: ${wrong.join('; ')}. `
              + 'The set of figures can be right while every model is quoted the wrong one; the '
              + 'AI advisor states this attribution to customers.');
      } else {
        const strays = said.filter((v) => !canon.includes(v));
        ok(strays.length === 0,
          `advisor addon "${line.name}" names only figures canonical carries `
          + `(said ${JSON.stringify(said)}, canonical ${JSON.stringify(canon)}`
          + `${strays.length ? `, STRAY ${JSON.stringify(strays)}` : ''})`);
      }
    }

    // Every mapping must have found its line, or the mapping is describing a
    // file that no longer looks like this and is quietly checking nothing.
    const names = new Set(lines.map((l) => l.name));
    for (const mapped of [...Object.keys(fixed), ...Object.keys(prose)]) {
      ok(names.has(mapped), `advisor addon "${group}" still carries the mapped line "${mapped}" `
        + '(a mapping whose line vanished is a check that stopped checking)');
    }
  }

  // A WHOLE GROUP can vanish and nothing above notices (Razor re-review NEW-2).
  // The vanished-mapping guard lives INSIDE the per-group loop, and that loop
  // walks products.json's own keys -- so deleting `exteriorCladding` outright
  // deletes the only iteration that would have missed it. Every group the
  // mapping tables describe must still be present, checked from the mapping
  // side, which products.json cannot edit its way out of.
  const MAPPED_GROUPS = new Set([
    ...Object.keys(PRODUCTS_FIXED_LINES),
    ...Object.keys(PRODUCTS_PROSE_LINES),
    'premiumFinishPackage',
  ]);
  for (const group of MAPPED_GROUPS) {
    ok(Object.prototype.hasOwnProperty.call(products.addons || {}, group),
      `advisor addons still carries the mapped group "${group}" (a group deleted wholesale is `
      + 'checked by nothing: the per-line guard only runs for groups that still exist, so the '
      + 'advisor would simply stop offering priced options and the gate would stay green)');
  }

  // The package line states a RANGE, and both ends are money.
  const pkgPrice = products.addons.premiumFinishPackage?.price;
  const pkgCanon = Object.values(canonical.packages.premium_finish.pricePerModel);
  const bounds = [Math.min(...pkgCanon), Math.max(...pkgCanon)];
  ok(JSON.stringify(dollarsIn(pkgPrice)) === JSON.stringify(bounds),
    `advisor premium finish package range ${JSON.stringify(dollarsIn(pkgPrice))} === canonical `
    + `min/max of pricePerModel ${JSON.stringify(bounds)}`);
  // Commas stripped before the comparison. The note is prose an LLM reads aloud
  // to a customer, so it must say "$1,000" the way a person writes it; the
  // canonical figure is a bare integer. Comparing the two literally would force
  // the prose to read "$1000" to keep a gate happy — the tail wagging the dog.
  ok(String(products.addons.premiumFinishPackage?.note || '').replace(/,/g, '').includes(
    `$${canonical.packages.premium_finish.savings}`),
  `advisor premium finish note states the canonical saving `
    + `$${canonical.packages.premium_finish.savings}`);
}

const inRepoRaw = fs.readFileSync(JSON_FILE, 'utf8');
const spec = JSON.parse(inRepoRaw);

// Half two runs first: it needs no browser, and a drifted canonical copy is
// worth knowing about before spending two minutes on a build.
checkCanonicalParity(inRepoRaw);
const canonicalDoc = checkSiteDataParity();
checkCostBasis(canonicalDoc);
checkAdvisorProductsProjection(canonicalDoc);

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

/**
 * HALF SEVEN (Razor W3) -- THE MONEY MUST MOVE, NOT JUST THE LABEL.
 *
 * Every per-model option in the modal is a radio carrying a TOKEN, not a price:
 * `value="exteriorYakisugi"`, resolved at total time by
 * `currentModel[PER_MODEL_PRICE_KEYS[value]] || 0`, with the visible span
 * repainted from the same field. Two independent reads of one number, which is
 * the right design -- but it has a seam, and the seam was open.
 *
 * The markup ships a PLACEHOLDER price in every span (+$5,000 for yakisugi,
 * +$2,500 for cedar -- the S2/S4 figures), and `updatePrices` only repaints when
 * the field is a number. So if a per-model key goes missing from js/data.js for
 * one model, the span keeps showing the placeholder while `|| 0` silently drops
 * the money from the total. The option reads "+$5,000" and adds nothing. Razor
 * reproduced it on S2. Every assertion above stayed green, because the browser
 * leg was reading the LABEL -- and the label is the half that lies.
 *
 * So the label is no longer the only witness. For each per-model token, on each
 * model, this SELECTS the option and asserts `#summaryTotal` moved by exactly
 * the canonical per-model amount, then puts the group back to its default. The
 * delta comes out of `calculateTotal`'s own resolution path -- the `|| 0` -- so
 * a missing key surfaces as a $0 move against a canonical expectation, and no
 * placeholder can absorb it.
 *
 * Fixed as a CLASS, not as the yakisugi instance: all five per-model radio
 * tokens are walked, exterior and interior alike, because the placeholder shape
 * is identical in both groups.
 */
const PER_MODEL_TOKEN_OPTIONS = {
  exteriorStandingSeam: { group: 'exterior', option: 'exterior_standing_seam' },
  exteriorCedar: { group: 'exterior', option: 'exterior_cedar' },
  exteriorYakisugi: { group: 'exterior', option: 'exterior_yakisugi' },
  interiorClearCedar: { group: 'interior', option: 'interior_clear_cedar' },
  interiorThermowood: { group: 'interior', option: 'interior_thermowood' },
};

/** Canonical per-model price for an option id, or null if it has none. */
function canonicalPerModel(canonical, optionId, key) {
  const opt = Object.values(canonical.optionGroups).flatMap((g) => g.options)
    .find((o) => o.id === optionId);
  if (!opt || !opt.pricePerModel) return null;
  const v = opt.pricePerModel[key];
  return typeof v === 'number' ? v : null;
}

async function checkPerModelTokenTotals(page, key, canonical) {
  if (!canonical) return;
  const readTotal = () => page.$eval('#summaryTotal', (el) => el.textContent.trim());

  for (const [token, { group, option }] of Object.entries(PER_MODEL_TOKEN_OPTIONS)) {
    const want = canonicalPerModel(canonical, option, key);
    if (want === null) {
      ok(false, `${key} ${token}: canonical option "${option}" carries no pricePerModel.${key}, `
        + 'so the token the modal ships resolves against nothing.');
      continue;
    }

    const sel = `.modal-addons input[name="${group}"][value="${token}"]`;
    const input = await page.$(sel);
    if (!input) {
      ok(false, `${key} ${token}: no radio matched ${sel}. The per-model token is gone from the `
        + 'markup, and the total would quietly stop being able to include this option.');
      continue;
    }

    const before = money(await readTotal());
    await page.check(sel);
    const after = money(await readTotal());
    const delta = after - before;

    // Put the group back so the next token measures from the same baseline
    // rather than from whatever the previous one left selected.
    await page.check(`.modal-addons input[name="${group}"][value="0"]`);
    const restored = money(await readTotal());

    ok(delta === want,
      `${key} ${token}: selecting it moved the TOTAL by ${delta} === canonical ${want} `
      + `(${before} -> ${after}). This is the assertion no price placeholder can satisfy: the `
      + 'delta comes from calculateTotal resolving the token, not from the label beside it.');
    ok(restored === before,
      `${key} ${token}: deselecting returned the total to ${restored} === ${before}`);
  }
}

console.log('\n--- site parity, per model ---');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ssc-roundtrip-'));
buildRef('WORKING', dir);
const server = await startServer(dir);
const browser = await chromium.launch();
const page = await browser.newPage();

/** model key -> (sum of the package's includes) - (that model's package price). */
const perModelSavings = {};

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
  // pricesVersion 5 retired exact equality. Standing seam became the package
  // baseline at the old cedar-baseline package prices, so SSC absorbs a delta
  // that differs by model: S2/S4/S6 save exactly the advertised $1,000, S8 and
  // SC save $1,500. The advertised figure is therefore the MINIMUM across
  // models, not a per-model identity (canonical `_note`, per Lee 2026-08-17).
  // Asserting equality here would demand the site under-claim on two models.
  // The floor is checked per model; that the floor is TIGHT — that some model
  // actually achieves it, so the claim is not quietly conservative — is
  // asserted once, after the loop.
  perModelSavings[key] = sum - pkg.pricePerModel[key];
  ok(perModelSavings[key] >= pkg.savings,
    `${key} json is internally true: components ${sum} - package ${pkg.pricePerModel[key]} = ${perModelSavings[key]} >= advertised savings ${pkg.savings}`);

  // Half seven, per model, with the modal open and at its defaults.
  await checkPerModelTokenTotals(page, key, canonicalDoc);
}

// The advertised saving is the MINIMUM across models, so `>=` per model is only
// half the claim: it permits a sheet where every model beats the figure and the
// advertised number is simply too low, which is a different lie in a kinder
// direction. Assert the floor is achieved by at least one model, so the number
// the customer reads is the real one and not a safe under-claim.
{
  const pkg = spec.packages.premium_finish;
  const achieved = Math.min(...Object.values(perModelSavings));
  ok(achieved === pkg.savings,
    `advertised saving is the tight floor: cheapest model saves ${achieved} === advertised ${pkg.savings} `
    + `(per model: ${JSON.stringify(perModelSavings)})`);
}

// Half four. Runs once, on a clean load of the page rather than on whatever
// state the modal walk left behind.
await page.goto(`${server.url}/saunas/`, { waitUntil: 'networkidle' });
await checkCompareTable(page, canonicalDoc);

await browser.close();
await server.close();
fs.rmSync(dir, { recursive: true, force: true });
const skipNote = skips ? ` (${skips} check(s) SKIPPED -- unverified, not confirmed)` : '';
// Warnings do not fail the run, but they must not vanish from the last line
// either -- an outstanding below-floor hold is the whole reason the count exists.
const warnNote = warns ? ` (${warns} WARNING(s) -- held below-floor prices outstanding)` : '';
console.log(fails ? `\n${fails} FAILURES${skipNote}${warnNote}` : `\nROUND-TRIP CLEAN${skipNote}${warnNote}`);
process.exit(fails ? 1 : 0);
