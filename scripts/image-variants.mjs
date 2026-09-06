#!/usr/bin/env node
/**
 * scripts/image-variants.mjs — the responsive rungs for the sub-page heroes.
 *
 * WHY THIS EXISTS. `src/img` holds 71 stems and only nine of them carry the
 * full 400/800/1200/1920 ladder; the other 62 carry a lone 1200w. A template
 * that emits a four-candidate srcset for any stem therefore emits candidates
 * that 404 on 62 of 71 frames — which is exactly the shape this repo was burned
 * by once already (see the header of scripts/cloudinary-responsive.test.mjs).
 * This script closes that gap for the stems a hero actually names: it generates
 * the missing small rungs by DOWNSCALING the 1200w, and it writes the widths
 * that genuinely exist on disk into `src/_data/heroVariants.json`, which is what
 * the template loops. The srcset can then only ever name files that are there.
 *
 * NEVER UPSCALE — and that is mechanical, not prose. Targets are computed as
 * `LADDER.filter(w => w < sourceWidth)`, so a rung at or above the source width
 * is never even a candidate, and every resize call additionally passes
 * `withoutEnlargement: true` as a second, independent belt. A generated rung is
 * then asserted to be strictly smaller in bytes than the rung above it; if it
 * is not, something upscaled or the quality is wrong, and the script exits
 * non-zero rather than committing a rung that costs bytes to lose pixels.
 *
 * RE-ENCODE, THEN DROP. A rung that exists but blows the byte budget (Jen's
 * §1.4: `2-_in_the_air_1_mvf8ik-1920w.webp` at 471 KiB against a 250 KiB
 * ceiling) is re-encoded at descending quality until it fits. The file is only
 * replaced once a candidate actually fits, so a failed pass cannot leave a
 * degraded image behind.
 *
 * If no quality fits, the rung is DROPPED from the stem's declared widths — it
 * stays on disk, but the srcset never names it, so the browser cannot select a
 * candidate that busts the budget. That is the fail-closed direction: the
 * alternative is editing the budget to match the file, which is how a budget
 * stops being one. The cost of dropping the top rung is a browser upscale at
 * 1440, which is the same price Jen priced and accepted knowingly for three of
 * the seven frames in §1.4. A dropped rung is reported loudly and is a design
 * escalation, not a silent optimisation.
 *
 * USAGE
 *   node scripts/image-variants.mjs            # generate + write the data file
 *   node scripts/image-variants.mjs --check    # verify only; writes nothing
 *
 * The stem list is the seven heroes, in this file, deliberately: a hero frame is
 * a design ruling (Jen, Stage 0.7, 2026-09-06) and the ruling belongs next to
 * the code that spends bytes on it, not in an argv the next caller can forget.
 */

import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const sharp = require('sharp');

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const IMG_DIR = path.join(REPO, 'src', 'img');
const DATA_FILE = path.join(REPO, 'src', '_data', 'heroVariants.json');

/** The responsive ladder, ascending. Nothing outside it is ever generated. */
const LADDER = [400, 800, 1200, 1920];

/** WebP encode quality for generated rungs. Stated, not defaulted: sharp's own
 *  default is 80 and a silent default is a number nobody can audit later. 82
 *  was chosen against Jen's §1.5 accept criteria (no visible ringing on the
 *  stove mesh in IMG_7294 at 1:1, and ≤ 100 KiB at 800w). */
const WEBP_QUALITY = 82;

/** Byte ceiling for the largest rung, per the plan's DPR-corrected budget
 *  (1440 @ DPR 1 selects the largest candidate). KiB, not KB. */
const LARGEST_BUDGET_BYTES = 250 * 1024;

/** Descending qualities tried when a rung must be re-encoded to fit budget. */
const REENCODE_QUALITIES = [78, 72, 66, 60, 54];

/**
 * The seven sub-page hero frames. Jen, Stage 0.7, 2026-09-06 §1.1.
 * Ted does not swap a photograph (§2.4 step 3); changing this list is a design
 * escalation, which is why the pages are named here alongside the stems.
 */
const HERO_STEMS = [
  { stem: 'IMG_7875-EDIT-EDIT_dbj20g', page: '/squamish/' },
  { stem: 'IMG_3337_a48dbb', page: '/sea-to-sky/' },
  { stem: '2-_in_the_air_1_mvf8ik', page: '/about/' },
  { stem: 'IMG_6347_jz7fmg', page: '/saunas/' },
  { stem: 'IMG_2819_bl3kb1', page: '/whistler/' },
  { stem: 'IMG_7294_scub94', page: '/vancouver/' },
  { stem: 'IMG_2403-EDIT_j3axml', page: '/north-shore/' },
];

const rungPath = (stem, w) => path.join(IMG_DIR, `${stem}-${w}w.webp`);
const kib = (b) => (b / 1024).toFixed(1);

const CHECK_ONLY = process.argv.includes('--check');

/** Every failure is collected and reported together; a script that dies on the
 *  first problem makes you run it seven times to learn seven things. */
const failures = [];
const warnings = [];
const log = [];

/**
 * The widest rung that exists on disk for a stem, with its real pixel size.
 * This is the generation source AND the provenance of the dimensions written
 * into the data file — never a hand-typed number (the plan's MF3-9).
 */
async function widestExisting(stem) {
  for (const w of [...LADDER].reverse()) {
    const p = rungPath(stem, w);
    if (existsSync(p)) {
      const meta = await sharp(p).metadata();
      return { width: w, file: p, pixelWidth: meta.width, pixelHeight: meta.height };
    }
  }
  return null;
}

async function generateMissingRungs(stem, source) {
  // MECHANICAL "never upscale": a target at or above the source's real pixel
  // width is filtered out before any encode is attempted.
  const targets = LADDER.filter((w) => w < source.pixelWidth && !existsSync(rungPath(stem, w)));
  const made = [];
  for (const w of targets) {
    const out = rungPath(stem, w);
    if (CHECK_ONLY) { failures.push(`${stem}: ${w}w is missing and --check writes nothing`); continue; }
    await sharp(source.file)
      .resize({ width: w, withoutEnlargement: true })   // second, independent belt
      .webp({ quality: WEBP_QUALITY })
      .toFile(out);
    made.push({ w, bytes: statSync(out).size });
  }
  return made;
}

/**
 * Re-encode a rung that exists but exceeds the byte budget. Only the largest
 * rung is budgeted here, because it is the only one `sizes="100vw"` selects at
 * 1440/DPR1 and the only one the plan puts a ceiling on.
 */
async function fitLargestToBudget(stem, source) {
  const bytes = statSync(source.file).size;
  if (bytes <= LARGEST_BUDGET_BYTES) return null;
  // --check never encodes, so it cannot know whether a re-encode WOULD fit. It
  // reports the same shape a real run reaches for a rung nothing can save: the
  // rung is treated as dropped, and the data-file comparison at the end is what
  // actually catches a tree whose rungs and data file have drifted apart.
  if (CHECK_ONLY) return { dropped: true, bytes, floorQuality: REENCODE_QUALITIES[REENCODE_QUALITIES.length - 1] };
  for (const q of REENCODE_QUALITIES) {
    const buf = await sharp(source.file).webp({ quality: q }).toBuffer();
    if (buf.length <= LARGEST_BUDGET_BYTES) {
      // Written only once a candidate actually fits, so a failed pass cannot
      // leave a degraded file behind.
      writeFileSync(source.file, buf);
      return { quality: q, before: bytes, after: buf.length };
    }
  }
  // Nothing fit. Drop the rung from the declared widths rather than raise the
  // budget. Reported as a warning, not a failure: the build is correct and
  // inside budget without it, and the quality tradeoff is Jen's to rule on.
  return { dropped: true, bytes, floorQuality: REENCODE_QUALITIES[REENCODE_QUALITIES.length - 1] };
}

/** Monotonicity: a smaller rung that costs more bytes than the one above it is
 *  a generation bug (an upscale, or a quality inversion), not a curiosity. */
function assertMonotonic(stem, widths) {
  for (let i = 1; i < widths.length; i++) {
    const lo = statSync(rungPath(stem, widths[i - 1])).size;
    const hi = statSync(rungPath(stem, widths[i])).size;
    if (!(lo < hi)) {
      failures.push(`${stem}: ${widths[i - 1]}w (${kib(lo)} KiB) is not strictly smaller than `
        + `${widths[i]}w (${kib(hi)} KiB). A rung that costs more bytes for fewer pixels is never shipped.`);
    }
  }
}

async function main() {
  const out = {};
  for (const { stem, page } of HERO_STEMS) {
    const source = await widestExisting(stem);
    if (!source) { failures.push(`${stem} (${page}): no rung of any width exists in src/img`); continue; }

    const budget = await fitLargestToBudget(stem, source);
    let dropped = null;
    if (budget && budget.dropped) {
      dropped = source.width;
      warnings.push(`${stem}: ${source.width}w is ${kib(budget.bytes)} KiB and does not reach the `
        + `${kib(LARGEST_BUDGET_BYTES)} KiB budget even at quality ${budget.floorQuality} `
        + `(it is a re-encode of an already-lossy file, so the generational loss buys little). `
        + `DROPPED from the srcset; the file is left on disk untouched. DESIGN ESCALATION: the `
        + `largest declared rung for this stem becomes the 1200w, i.e. a 1.2x browser upscale at `
        + `1440/DPR1 — the same price accepted knowingly in Jen's spec §1.4 for three other frames.`);
    } else if (budget) {
      log.push(`${stem}: ${source.width}w re-encoded q${budget.quality}, `
        + `${kib(budget.before)} -> ${kib(budget.after)} KiB`);
    }

    const made = await generateMissingRungs(stem, source);
    for (const m of made) log.push(`${stem}: generated ${m.w}w at ${kib(m.bytes)} KiB (q${WEBP_QUALITY})`);

    const widths = LADDER.filter((w) => existsSync(rungPath(stem, w)) && w !== dropped);
    if (widths.length === 0) { failures.push(`${stem}: no rungs left after generation and budget checks`); continue; }
    assertMonotonic(stem, widths);

    // Dimensions come from the widest DECLARED rung's own bytes — the file the
    // element's `src` actually names. They describe the DELIVERED derivative,
    // which is what rhythm.test.mjs's B2 check measures: a declared aspect the
    // bytes do not have is exactly the defect that check exists for, and
    // reading them here means it cannot be hand-typed wrong. Reading them from
    // a rung that was dropped for budget would reintroduce that defect.
    const widestDeclared = await sharp(rungPath(stem, widths[widths.length - 1])).metadata();
    out[stem] = { widths, w: widestDeclared.width, h: widestDeclared.height };
  }

  const json = JSON.stringify(out, null, 2) + '\n';
  if (CHECK_ONLY) {
    const onDisk = existsSync(DATA_FILE) ? readFileSync(DATA_FILE, 'utf8') : '';
    if (onDisk !== json) failures.push(`${path.relative(REPO, DATA_FILE)} is stale; re-run without --check`);
  } else {
    writeFileSync(DATA_FILE, json);
    log.push(`wrote ${path.relative(REPO, DATA_FILE)} (${Object.keys(out).length} stems)`);
  }

  for (const l of log) console.log(`  ${l}`);
  if (warnings.length) {
    console.warn(`\nWARNING — ${warnings.length} rung(s) dropped for budget:`);
    for (const w of warnings) console.warn(`  ${w}`);
  }
  if (failures.length) {
    console.error(`\nFAIL — image-variants (${failures.length}):`);
    for (const f of failures) console.error(`  ${f}`);
    process.exit(1);
  }
  console.log(`\nPASS — ${Object.keys(out).length} hero stems, every declared width present on disk.`);
}

main().catch((err) => { console.error(err); process.exit(1); });
