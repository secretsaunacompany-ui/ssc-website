/**
 * The case-study gate.
 *
 * Eleventy keys global data by filename minus extension and DEEP-MERGES two
 * files that share a key (node_modules/@11ty/eleventy/src/TemplateData.js), so
 * the records cannot live in a `builds.json` beside this file. They live in
 * `buildRecords.json` and this file is the only thing that computes a view over
 * them.
 *
 * WHY A FUNCTION WITH PROPERTIES HANGING OFF IT. Eleventy accepts a function as
 * a data file and calls it at build time, so the export has to be callable. The
 * pure helpers are attached to that same function object rather than exported
 * separately, so `scripts/case-study.test.mjs` requires the exact code the site
 * runs. A test that re-implements `isPublishable` proves only that two copies of
 * a mistake agree.
 *
 * THE GATE FAILS CLOSED, BY EQUALITY, NEVER BY INEQUALITY. `permission` is
 * matched against a closed set of three strings. It is never written as
 * `!== "pending"`: under that spelling an empty string, a missing field, a typo,
 * or the layout fixture all become publishable, and the failure is silent --
 * a client's build appears on a public site because a field was absent. Doc 10
 * §7.5(f): a pending build renders nothing.
 */

const records = require("./buildRecords.json");

/** The only three answers that publish. Anything else -- including "pending",
 *  "declined" and "fixture" -- does not. */
const PUBLISHABLE = new Set(["named", "anonymous", "name_only"]);

/** Consent to the name. The story and a real quote are name-bearing prose and
 *  ride on these two answers only (Petra, Stage 0.3, flags 1-2: an `anonymous`
 *  answer does not cover a description of the home, and "Kitsilano plus a
 *  front-yard sauna" is near-unique whether or not a name sits above it). */
const NAME_CONSENTED = new Set(["named", "name_only"]);

/** Exact equality against the closed set. No trim, no case-fold: a value that
 *  needs cleaning up is a value nobody checked, and "Named " publishing because
 *  of a stray space is the shape of the accident this gate exists to prevent. */
function isPublishable(build) {
  return Boolean(build)
    && typeof build.permission === "string"
    && PUBLISHABLE.has(build.permission);
}

/**
 * The preview flag, read from an env object rather than `process.env` directly
 * so the test can hand it synthetic environments.
 *
 * THE NETLIFY INTERLOCK IS THE POINT. `CASE_STUDY_PREVIEW=1` renders builds
 * whose permission has not been given. `netlify.toml` does not set it and the
 * build command does not either, but the Netlify UI can inject an environment
 * variable that no file in this repo can see. Netlify sets `NETLIFY=true` on
 * every build and every deploy preview, so this throws there: an unpublished
 * client build reaching a public URL is not a case for a warning.
 */
function previewFlag(env) {
  const on = env.CASE_STUDY_PREVIEW === "1";
  if (on && env.NETLIFY === "true") {
    throw new Error(
      "CASE_STUDY_PREVIEW=1 on Netlify (NETLIFY=true). The preview flag renders "
      + "builds whose owners have not given permission and is for a developer's "
      + "shell only. Remove the variable from the Netlify environment."
    );
  }
  return on;
}

/**
 * The computed view. The macro consumes these fields and decides nothing of its
 * own, so every permission rule is in this one function and is testable without
 * rendering a page.
 */
function view(build, preview) {
  const permission = build.permission;
  const publishable = isPublishable(build);
  const hasImages = Boolean(build.hero) || (Array.isArray(build.details) && build.details.length > 0);

  // WHETHER THIS UNIT IS RENDERED AT ALL. Both callers test it before calling
  // the macro, and EVERY field below rides on it, so the view fails closed on
  // its own rather than on the discipline of every future caller (Razor N3,
  // batch 1; finished after Razor's batch-2 review).
  //
  // THE FIRST ATTEMPT AT THIS WAS HALF A FIX, and the half that was missing was
  // the half that mattered. Only the three `show*` fields were gated, so a
  // caller that forgot the outer test still got the index line and the credits
  // ledger -- which is to say the client's display name, his neighbourhood, the
  // year, the footprint and six build facts, published under `pending`. The
  // story and the photographs were withheld and the identifying material was
  // not. `renderable` now gates the whole unit: the macro renders nothing at
  // all for a build that is not renderable, and `displayName` is null there so
  // that a future template printing it directly gets nothing rather than a name.
  const renderable = publishable || preview;

  // §7.5(d): an anonymous build is headed "Private Residence". Null when the
  // unit does not render, so the name is not merely unused but absent.
  const displayName = !renderable
    ? null
    : (permission === "anonymous" ? "Private Residence" : build.display_name);

  // §7.5(d)/(e). Under `name_only` the photographs are ignored even if the
  // record carries them -- that answer said name, not pictures -- which lands
  // the unit in state (a), text only.
  const showPhotos = renderable
    && build.photos === true
    && permission !== "name_only"
    && hasImages;

  // Prose about the home rides on consent to the name, or on preview.
  const showStory = renderable && (NAME_CONSENTED.has(permission) || preview);

  // ONE expression. A placeholder quote renders under preview regardless of
  // permission and never otherwise; a real quote renders under the two answers
  // that consent to the name, because a quote attributed by name is a
  // name-bearing element.
  const quote = build.quote;
  const showQuote = renderable
    && Boolean(quote)
    && (quote.placeholder ? preview : NAME_CONSENTED.has(permission));

  // The ribbon marks what preview added. A publishable build under preview is
  // rendering exactly what production renders, so it wears nothing.
  let ribbon = null;
  if (preview && !publishable) {
    ribbon = permission === "fixture"
      ? "Layout fixture. Site photographs standing in."
      : "Draft. Not for publication. Permission: " + permission;
  }

  return {
    publishable,
    renderable,
    displayName,
    showPhotos,
    showStory,
    showQuote,
    ribbon
  };
}

/** The Eleventy data file itself: the records, each with its computed view. */
function builds() {
  const preview = previewFlag(process.env);
  return records.map((build) => Object.assign({}, build, { view: view(build, preview) }));
}

builds.PUBLISHABLE = PUBLISHABLE;
builds.isPublishable = isPublishable;
builds.previewFlag = previewFlag;
builds.view = view;

module.exports = builds;
