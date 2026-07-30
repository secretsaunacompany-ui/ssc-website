/**
 * Config loading and the pass/fail decision.
 *
 * This module is the SINGLE source of the budgets and of the rule that turns
 * measurements into a verdict. `visual-diff.mjs` and `visual-diff.test.mjs`
 * both call `evaluatePair` — no threshold is written down anywhere else, so a
 * fixture and a production run can never disagree about what "over budget"
 * means.
 *
 * Why this file exists at all: the first version of the harness computed
 * `layoutShiftMaxPx` and `shiftCoverage` and then gated on neither. It passed a
 * 6px sitewide button move and reported zero shift for a page whose content had
 * changed completely. The gate below is the repair, and everything in it is
 * written to fail CLOSED — an unmeasurable page is a failure, not a pass.
 */

/** Metrics a config entry is permitted to waive. */
export const WAIVABLE = Object.freeze(['changedPct', 'heightDelta', 'structural']);

/**
 * Metrics that can NEVER be waived. `expectedToChange` exists so a deliberate
 * restyle does not drown the run in "the colour changed" noise. It must not be
 * able to switch off the measurement the acceptance criterion is written
 * against — that is precisely how the allowlist silently waived the only metric
 * that mattered.
 */
export const UNWAIVABLE = Object.freeze(['layoutShiftMaxPx', 'shiftCoverage']);

export function loadConfig(file, readFile) {
  let raw;
  try {
    raw = JSON.parse(readFile(file, 'utf8'));
  } catch (err) {
    throw new Error(`Cannot read visual-diff config ${file}: ${err.message}`);
  }

  // widths: [] used to sail through and compare nothing, reporting PASS.
  if (!Array.isArray(raw.widths) || raw.widths.length === 0) {
    throw new Error(`${file}: "widths" must be a non-empty array of capture widths.`);
  }
  for (const w of raw.widths) {
    if (!Number.isInteger(w) || w <= 0) {
      throw new Error(`${file}: every width must be a positive integer, got ${JSON.stringify(w)}.`);
    }
  }

  const num = (key, fallbackless) => {
    const v = raw[key];
    if (typeof v !== 'number' || !Number.isFinite(v)) {
      throw new Error(`${file}: "${key}" must be a number. ${fallbackless}`);
    }
    return v;
  };

  const budget = {
    // The gate is the MAXIMUM observed displacement, not the p99. p99 is still
    // reported, but a 6px move on a handful of rows is exactly the regression
    // this harness is for, and a percentile hides it.
    maxLayoutShiftPx: num('maxLayoutShiftPx', 'No default: state the budget explicitly.'),
    minShiftCoverage: num('minShiftCoverage', 'Fraction of structured baseline rows that must match.'),
    maxChangedPct: num('maxChangedPct', 'No default: state the budget explicitly.'),
  };
  if (budget.minShiftCoverage <= 0 || budget.minShiftCoverage > 1) {
    throw new Error(`${file}: "minShiftCoverage" must be in (0, 1].`);
  }

  // expectedToChange — per-metric waivers, not a blanket pass.
  const allow = new Map();
  for (const entry of raw.expectedToChange || []) {
    if (typeof entry === 'string') {
      throw new Error(
        `${file}: expectedToChange entry ${JSON.stringify(entry)} is a bare string. `
        + `Waivers are per-metric now — use `
        + `{ "route": "${entry}", "reason": "...", "waive": ["changedPct"] }.`);
    }
    if (!entry || typeof entry.route !== 'string' || !entry.route) {
      throw new Error(`${file}: every expectedToChange entry needs a "route".`);
    }
    if (!Array.isArray(entry.waive) || entry.waive.length === 0) {
      throw new Error(
        `${file}: expectedToChange entry for ${entry.route} needs a non-empty "waive" array `
        + `(any of: ${WAIVABLE.join(', ')}).`);
    }
    for (const m of entry.waive) {
      if (UNWAIVABLE.includes(m)) {
        throw new Error(
          `${file}: ${entry.route} tries to waive "${m}", which can never be waived. `
          + `The shift gate is the acceptance criterion; a page may waive changedPct and `
          + `remain shift-gated, never the other way round.`);
      }
      if (!WAIVABLE.includes(m)) {
        throw new Error(
          `${file}: ${entry.route} waives unknown metric "${m}". Waivable: ${WAIVABLE.join(', ')}.`);
      }
    }
    if (typeof entry.reason !== 'string' || !entry.reason.trim()) {
      throw new Error(`${file}: expectedToChange entry for ${entry.route} needs a "reason".`);
    }
    if (allow.has(entry.route)) {
      throw new Error(`${file}: duplicate expectedToChange entry for ${entry.route}.`);
    }
    allow.set(entry.route, { reason: entry.reason, waive: new Set(entry.waive) });
  }

  // Declared client-side redirects. Any redirect the capture observes that is
  // not declared here — or a declared one that changed target or stopped
  // happening — fails the run. Before this, redirects were recorded into a
  // stats object nobody read, so two routes were silently screenshotting a
  // third page under their own name.
  const expectedRedirects = raw.expectedRedirects || {};
  if (typeof expectedRedirects !== 'object' || Array.isArray(expectedRedirects)) {
    throw new Error(`${file}: "expectedRedirects" must be an object of route -> destination.`);
  }

  return { widths: raw.widths, ...budget, allow, expectedRedirects };
}

function waived(config, route, metric) {
  const entry = config.allow.get(route);
  return Boolean(entry && entry.waive.has(metric));
}

/**
 * Decide one page/width pair.
 *
 * @returns {{ status: 'PASS'|'EXPECTED'|'FAIL', reasons: string[], waivedReasons: string[] }}
 *   status FAIL means the run must exit non-zero. EXPECTED means something was
 *   over budget but every breached metric was explicitly waived for this route.
 */
export function evaluatePair(config, route, result) {
  const reasons = [];
  const waivedReasons = [];
  const note = (metric, text) => {
    if (waived(config, route, metric)) waivedReasons.push(`${text} (waived: ${metric})`);
    else reasons.push(text);
  };

  // Fail-closed: if the shift metric could not be computed there is no evidence
  // the page is unchanged, and "no evidence" is not "no change".
  if (!result.shiftMeasurable) {
    reasons.push('layout shift not measurable (page has no structured rows to match)');
  } else {
    if (result.layoutShiftMaxPx > config.maxLayoutShiftPx) {
      reasons.push(`layout shift ${result.layoutShiftMaxPx}px > ${config.maxLayoutShiftPx}px budget`);
    }
    if (result.shiftCoverage < config.minShiftCoverage) {
      reasons.push(
        `shift coverage ${result.shiftCoverage.toFixed(3)} < ${config.minShiftCoverage} `
        + `(too little of the baseline was found in the candidate — content moved further `
        + `than the search window, or changed outright)`);
    }
  }

  if (Math.abs(result.heightDeltaPx) > config.maxLayoutShiftPx) {
    note('heightDelta', `page height moved ${result.heightDeltaPx}px > ${config.maxLayoutShiftPx}px budget`);
  }
  if (result.changedPct > config.maxChangedPct) {
    note('changedPct', `${result.changedPct.toFixed(3)}% of pixels changed > ${config.maxChangedPct}% budget`);
  }

  let status = 'PASS';
  if (reasons.length > 0) status = 'FAIL';
  else if (waivedReasons.length > 0) status = 'EXPECTED';
  return { status, reasons, waivedReasons };
}

/** True when anything at all was over budget — used to decide whether to write a diff image. */
export function overBudget(config, route, result) {
  const v = evaluatePair(config, route, result);
  return v.status !== 'PASS';
}
