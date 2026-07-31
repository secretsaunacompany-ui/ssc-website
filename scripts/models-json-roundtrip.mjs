#!/usr/bin/env node
/**
 * Round-trip check: every price in the models.json schema extension must equal
 * the price the site actually renders, per model, read from a real browser.
 *
 * A parity file that nobody checks is how the two systems drifted in the first
 * place. This is a verification tool for the batch, not a committed suite --
 * the durable in-repo guards are package-claim and prices-version.
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

let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS  ' : 'FAIL  ') + m); if (!c) fails += 1; };
const money = (s) => parseInt(String(s).replace(/[^0-9]/g, ''), 10);

const spec = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));

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
console.log(fails ? `\n${fails} FAILURES` : '\nROUND-TRIP CLEAN');
process.exit(fails ? 1 : 0);
