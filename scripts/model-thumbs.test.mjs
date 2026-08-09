#!/usr/bin/env node
/**
 * model-thumbs.test.mjs — the /saunas/ index thumbnail is the same photograph
 * the configurator opens on.
 *
 * Born 2026-08-07. The model index gained a photo per row (Lee: the list told
 * you what the models cost and nothing about what they look like). The photos
 * already existed — js/data.js carries an `images` array per model and the
 * modal opens on `images[0]` — so the row's thumbnail is a MIRROR of that
 * first frame, stored as `thumb` in src/_data/models.json because templates
 * cannot read the client bundle.
 *
 * A mirror is a second copy, and this repo's whole history with second copies
 * of model data is drift (the price sheet, twice). So the copy is gated: if
 * anyone reorders a model's images, swaps the opening frame, or edits one file
 * without the other, the row would show one sauna and the modal another. That
 * is the failure this suite exists to make loud.
 *
 * js/data.js is EVALUATED, not regexed — a parser that guesses at source text
 * is its own drift risk, and the file is a plain IIFE that only needs a window.
 *
 *   node scripts/model-thumbs.test.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let passes = 0, failures = 0;
const check = (name, ok, detail) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `\n      ${detail}`}`);
  ok ? passes++ : failures++;
};

const isVideo = (url) => /\/video\/|\.(mp4|mov|webm)(\?|$)/i.test(url);

const win = {};
const ctx = vm.createContext({ window: win, document: {} });
vm.runInContext(fs.readFileSync(path.join(REPO_ROOT, 'js/data.js'), 'utf8'), ctx);
const clientModels = win.SSC && win.SSC.saunaModels;
check('js/data.js exposes saunaModels (vacuity guard)',
  !!clientModels && Object.keys(clientModels).length >= 5,
  `got ${clientModels ? Object.keys(clientModels).length : 'nothing'}`);

const site = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'src/_data/models.json'), 'utf8'));

for (const key of site.order) {
  const model = site.models[key];
  const client = clientModels[model.id];
  check(`${key}: js/data.js has an images array to mirror`,
    !!client && Array.isArray(client.images) && client.images.length > 0,
    `no images for id ${JSON.stringify(model.id)}`);
  if (!client || !Array.isArray(client.images)) continue;

  const opensOn = client.images.find((u) => !isVideo(u));
  check(`${key}: the index thumbnail IS the frame the configurator opens on`,
    model.thumb === opensOn,
    `models.json thumb:\n        ${model.thumb}\n      data.js first non-video image:\n        ${opensOn}\n`
    + '      The row would show one sauna and the modal another. Update both, or neither.');

  // A width baked into the stored URL would be rejected by .eleventy.js's
  // Cloudinary filters at build time — catch it here, where the message can
  // say why, rather than as a build crash.
  check(`${key}: the stored thumbnail carries no width transform`,
    typeof model.thumb === 'string' && /\/upload\/q_auto,f_auto(,a_-?\d+)?\//.test(model.thumb),
    `thumb must be a bare Cloudinary URL (delivery width is the transform's job): ${model.thumb}`);
}

console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
