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

  // REWRITTEN 2026-09-03. This asserted a Cloudinary URL shape
  // (/upload/q_auto,f_auto/), on the reasoning that a width baked into the
  // stored URL would be rejected by .eleventy.js's Cloudinary filters at build
  // time. Those filters were deleted with the 2026-08-09 migration and the
  // thumbs are now first-party paths, so the check has been failing on all five
  // models ever since — asserting a shape the repo deliberately abandoned.
  //
  // The drift it should catch now is the local analogue: the file the row will
  // request must be first-party and must EXIST, so a rename or a deletion fails
  // here with a message, rather than silently as a 404 on /saunas/.
  check(`${key}: the thumbnail is a first-party path`,
    typeof model.thumb === 'string' && model.thumb.startsWith('/img/'),
    `thumb must be a root-relative first-party path (the CHARTER forbids external `
    + `asset origins): ${model.thumb}`);
  check(`${key}: the thumbnail file exists in the source tree`,
    typeof model.thumb === 'string'
      && fs.existsSync(path.join(REPO_ROOT, 'src', model.thumb)),
    `no such file: src${model.thumb} — the /saunas/ row would 404`);
  check(`${key}: the thumbnail is a sized derivative, not a bare original`,
    typeof model.thumb === 'string' && /-\d+w\.webp$/.test(model.thumb),
    `thumb should name a width-suffixed WebP derivative: ${model.thumb}`);
}

console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
