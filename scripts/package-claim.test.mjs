#!/usr/bin/env node
/**
 * Fixture for the Premium Finish Package savings claim.
 *
 *   npm run package-claim:test
 *
 * WHAT IS UNDER TEST
 *
 * `sauna.njk` tells every visitor, in the configurator, that the Premium Finish
 * Package will "Save $X vs selecting individually". That is a price claim made
 * to a customer, so it has to be arithmetically true, on every model, at
 * whatever prices are live in the commit that ships it.
 *
 * Nothing computes it. It is true only when FOURTEEN independently
 * hand-maintained numbers happen to agree:
 *
 *   - `premiumFinishPrice` x 5   (js/data.js)
 *   - `interiorUpgrade`    x 5   (js/data.js)
 *   - cedar exterior, lighting, speakers, WiFi   (sauna.njk option values)
 *
 * plus the claim string itself, which is a fifteenth number written in prose.
 * Any one of them can be edited alone, by someone with every reason to think
 * they are making a small isolated change, and the site immediately starts
 * making a false price claim to customers with nothing anywhere going red.
 *
 * WHY THIS FILE EXISTS
 *
 * That is not hypothetical. Before WP-0c, the package cost $1,000 MORE than
 * the parts a customer could actually assemble, on all five models, while the
 * page claimed a $1,000 saving -- wrong by $2,000 in direction. It shipped and
 * stayed shipped, because the only detector was a human doing the arithmetic
 * by hand. WP-0c made the claim true by adding the WiFi line. This file is what
 * keeps it true. The repricing batch moves all fourteen numbers AND restates
 * the claim; this is the thing that will tell it whether it landed.
 *
 * HOW IT IS TESTED
 *
 * Through the real UI, in a real browser, against the real built site. Not by
 * re-implementing the arithmetic in the test -- a test that recomputes the
 * total its own way merely proves the test agrees with itself, and would have
 * happily passed through the entire bug above. This one clicks the options a
 * customer clicks and reads the total the customer reads.
 *
 * The claim is SCRAPED from the rendered page at runtime and never hardcoded.
 * A fixture that names a dollar figure certifies one world and starts lying
 * the moment the other world deploys, which is precisely the failure it is
 * here to prevent.
 *
 * The basket is the CHEAPEST qualifying combination -- cedar exterior, not
 * standing seam. The claim has to hold against the cheapest way a customer can
 * assemble the package's contents, or it is false for whoever picks that way.
 * The two exterior options are the same price today and diverge under the
 * repricing batch, which is exactly when this distinction starts mattering.
 *
 * MUTATION IS BUILT IN, NOT A RITUAL
 *
 * A fixture that cannot fail is decoration. This one runs the whole scenario
 * twice: once against the site as shipped, and once against a copy with a
 * single `premiumFinishPrice` bumped in `js/data.js`. Scenario A must find the
 * claim true on all five models; scenario B must find it FALSE on the tampered
 * model and still true on the other four. So the mutation is not something
 * someone has to remember to perform -- if this fixture ever stops being able
 * to detect a wrong package price, scenario B goes green and the run fails on
 * the spot.
 *
 * If the mutation regex stops matching (data.js reformatted, model removed),
 * the run fails loudly rather than quietly skipping the half of the fixture
 * that gives the other half its meaning.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';
import { SCRATCH_SKIP, scratchSite as sharedScratchSite, serve } from './lib/scratch.mjs';

const REPO_ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const require = createRequire(path.join(REPO_ROOT, '/'));
const Eleventy = require('@11ty/eleventy');
const { chromium } = require('playwright');

/** Model ids as they appear in `data-model` on the cards. */
const MODELS = ['s2', 's4', 's6', 's8', 'sc'];

/**
 * The model whose package price the mutation tampers with, identified by its
 * POSITION in data.js rather than by its current price. The repricing batch
 * moves all five of these numbers; a fixture that hardcoded one of them would
 * blow up on the very commit it exists to check.
 */
const MUTATED_MODEL = 's4';
const MUTATED_INDEX = MODELS.indexOf(MUTATED_MODEL);

/**
 * The package contents, as individually selectable options, by their visible
 * label. Cedar exterior rather than standing seam: cheapest qualifying combo.
 * If a label here stops matching the page, the run throws -- a renamed option
 * must be reflected here deliberately, never silently skipped.
 */
const BASKET = [
  'Clear Cedar',
  'Cedar exterior',
  'WiFi heater controller',
  'Interior & exterior lighting package',
  'Built-in Bluetooth speakers (standard set)',
];
const PACKAGE_OPTION = 'Premium Finish Package';

const SKIP = SCRATCH_SKIP; // one list, lib/scratch.mjs — the private copies drifted

let failures = 0;
let passes = 0;

function check(name, condition, detail) {
  if (condition) { passes += 1; process.stdout.write(`  PASS  ${name}\n`); }
  else { failures += 1; process.stdout.write(`  FAIL  ${name}\n        ${detail}\n`); }
}

/** Copy the site into a fresh temp dir, minus build output and dependencies. */
const scratchSite = () => sharedScratchSite('ssc-package-claim');

/**
 * Bump one model's `premiumFinishPrice` in a copied data.js.
 *
 * Deliberately strict: if the value is not found EXACTLY once, throw. A
 * mutation that silently fails to apply would make scenario B "pass" for the
 * wrong reason and quietly retire the only thing that gives this fixture teeth.
 */
function bumpPackagePrice(dataFile) {
  const before = fs.readFileSync(dataFile, 'utf8');
  const pattern = /premiumFinishPrice:\s*(\d+)/g;
  const hits = [...before.matchAll(pattern)];
  if (hits.length !== MODELS.length) {
    throw new Error(
      `mutation could not be applied to ${dataFile}: expected exactly ${MODELS.length} `
      + `premiumFinishPrice entries, one per model, found ${hits.length}. If a model was `
      + `added or removed, update MODELS. Do NOT delete the mutation: it is what proves `
      + `this fixture can fail.`);
  }
  const target = hits[MUTATED_INDEX];
  const bumped = `premiumFinishPrice: ${parseInt(target[1], 10) + 250}`;
  fs.writeFileSync(dataFile,
    before.slice(0, target.index) + bumped + before.slice(target.index + target[0].length));
}

/** Serve a built directory on a random port. */

const money = (s) => {
  const digits = String(s).replace(/[^0-9]/g, '');
  if (!digits) throw new Error(`no number to read in ${JSON.stringify(s)}`);
  return parseInt(digits, 10);
};

/**
 * Drive the configurator per model and report, for each, what a customer can
 * assemble versus what the package costs.
 *
 * @param {boolean} mutate  bump one model's premiumFinishPrice before building
 */
async function measureClaim(mutate) {
  const dir = scratchSite();
  let browser; let http1;
  try {
    if (mutate) bumpPackagePrice(path.join(dir, 'js', 'data.js'));

    const dist = path.join(dir, 'dist');
    await new Eleventy(path.join(dir, 'src'), dist, {
      configPath: path.join(dir, '.eleventy.js'),
      quietMode: true,
    }).write();

    http1 = await serve(dist);
    browser = await chromium.launch();
    const page = await browser.newPage();

    const openModal = async (model) => {
      await page.goto(`${http1.base}/saunas/`, { waitUntil: 'networkidle' });
      await page.click(`[data-action="open-modal"][data-model="${model}"]`);
      await page.waitForSelector('.modal-addons .addon-option', { state: 'visible' });
    };

    // Click by visible label, exactly as a customer does. Throws if the option
    // is missing or disabled -- silence here would be the whole failure mode.
    const pick = (label) => page.evaluate((wanted) => {
      const option = [...document.querySelectorAll('.modal-addons .addon-option')]
        .find((o) => o.querySelector('.addon-label')?.textContent.trim() === wanted);
      if (!option) throw new Error(`configurator has no option labelled "${wanted}"`);
      const input = option.querySelector('input');
      if (input.disabled) throw new Error(`option "${wanted}" is disabled`);
      input.click();
    }, label);

    const total = async () => money(await page.textContent('#summaryTotal'));

    // The claim, read off the rendered page. Never a literal in this file.
    await openModal(MODELS[0]);
    const description = await page.textContent('.premium-package-category .package-description');
    const claimMatch = description.match(/Save\s+\$[\d,]+/i);
    if (!claimMatch) {
      throw new Error(
        'no "Save $X" claim found in .package-description. If the package stopped '
        + 'advertising a saving, this fixture needs retiring deliberately, not deleting.');
    }
    const claim = money(claimMatch[0]);

    const rows = [];
    for (const model of MODELS) {
      await openModal(model);
      const base = await total();
      for (const option of BASKET) await pick(option);
      const basket = (await total()) - base;

      await openModal(model); // fresh state, not an unwind
      await pick(PACKAGE_OPTION);
      const pkg = (await total()) - base;

      rows.push({ model, basket, pkg, delta: basket - pkg });
    }
    return { claim, claimText: claimMatch[0], rows };
  } finally {
    if (browser) await browser.close();
    if (http1) http1.server.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

async function main() {
  process.stdout.write('\nA. the site as shipped\n');
  const shipped = await measureClaim(false);
  process.stdout.write(`  claim read from the rendered page: "${shipped.claimText}"\n`);

  check('A0 the package advertises a saving greater than zero',
    shipped.claim > 0,
    `scraped ${shipped.claim} -- a $0 claim would make every other assertion vacuous`);

  for (const r of shipped.rows) {
    check(`A ${r.model}: basket ${r.basket} - package ${r.pkg} = ${r.delta} matches the claimed ${shipped.claim}`,
      r.delta === shipped.claim,
      `the configurator promises a $${shipped.claim.toLocaleString()} saving on ${r.model} and delivers `
      + `$${r.delta.toLocaleString()}. This is a false price claim shown to customers. Either the `
      + `prices (js/data.js premiumFinishPrice/interiorUpgrade, or the option values in `
      + `sauna.njk) or the claim text in sauna.njk is wrong -- they ship together or not at all.`);
  }

  process.stdout.write(`\nB. with ${MUTATED_MODEL}'s premiumFinishPrice tampered with\n`);
  const mutated = await measureClaim(true);
  const tampered = mutated.rows.find((r) => r.model === MUTATED_MODEL);
  const untouched = mutated.rows.filter((r) => r.model !== MUTATED_MODEL);

  check(`B1 a wrong package price on ${MUTATED_MODEL} is DETECTED`,
    tampered.delta !== mutated.claim,
    `${MUTATED_MODEL}'s package price was moved by $250 and the delta still equals the claim. `
    + `This fixture cannot detect the exact regression it exists for, so section A proves `
    + `nothing. Find out why before trusting any of it.`);

  check('B2 the other four models are unaffected by that tampering',
    untouched.every((r) => r.delta === mutated.claim),
    `tampering with one model's package price changed the verdict for others `
    + `(${untouched.filter((r) => r.delta !== mutated.claim).map((r) => r.model).join(', ')}), `
    + `so B1 may be firing for some reason other than the mutation`);

  process.stdout.write(`\n${passes} passed, ${failures} failed\n`);
  return failures === 0 ? 0 : 1;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(`\npackage-claim tests crashed: ${err.stack || err.message}`);
    process.exit(2);
  },
);
