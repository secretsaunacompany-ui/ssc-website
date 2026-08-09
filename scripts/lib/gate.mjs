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
export const UNWAIVABLE = Object.freeze(['layoutShiftMaxPx', 'shiftCoverage', 'fitConfidence']);

/**
 * Budgets a `pageOverrides` entry is permitted to name.
 *
 * These are the CONFIG KEYS, not the metric names, because an override changes
 * a budget rather than switching off a measurement. That distinction is the
 * whole safety property: an override can say "on this page the shift budget is
 * 24px because the type scale legitimately moved things", and it can never say
 * "on this page do not measure shift".
 */
export const OVERRIDABLE = Object.freeze(['maxLayoutShiftPx', 'minShiftCoverage', 'maxChangedPct']);

/**
 * Which way an override is allowed to move each budget, and how far.
 *
 * Direction follows the metric's TYPE, not a blanket "raise" rule. The first
 * version applied raise-only to everything, which was right for the two
 * ceilings and exactly backwards for the floor: `minShiftCoverage` is a
 * MINIMUM, so raising it tightens the gate and the shippable direction —
 * lowering it — was rejected outright. A real 6px restyle run had 6 of 19 pages
 * failing on coverage with no legal override available, so overrides did not
 * actually make a deliberate restyle shippable, which was their whole purpose.
 *
 *   ceiling  raise only, capped at 100x the global. Loud is fine; infinite is
 *            not. A `value: 999999` override is not a considered decision, it
 *            is switching the metric off with extra steps.
 *   floor    lower only, bounded to [0.75, 1). Below 0.75 a quarter of the
 *            page's rows could not be matched at all, and that is a
 *            conversation with a human, not a config line.
 */
export const BUDGET_KIND = Object.freeze({
  maxLayoutShiftPx: 'ceiling',
  maxChangedPct: 'ceiling',
  minShiftCoverage: 'floor',
});

/** Absolute bounds for the floor metric, independent of the global budget. */
export const COVERAGE_OVERRIDE_MIN = 0.75;
export const COVERAGE_OVERRIDE_MAX = 1;

/** A ceiling override may not exceed this multiple of its global budget. */
export const CEILING_OVERRIDE_MAX_MULTIPLE = 100;

/** An override may not be dated further than this many days out, at load time. */
export const MAX_OVERRIDE_DAYS = 90;

/**
 * Map key for one page/metric pair. A printable separator: nothing ever parses the
 * key back apart, and a NUL byte in the source made git treat this whole
 * module as a binary file, which is no way to review a security-shaped gate.
 * Callers never parse the key back apart — the stored value
 * carries page and metric as fields.
 */
const overrideKey = (page, metric) => `${page} :: ${metric}`;

/**
 * @param {number} now  epoch ms used for override-expiry checks. Injectable so
 *   the fixtures can test an expired override without depending on the clock.
 */
/**
 * The one expiry discipline, shared by pageOverrides and (since 2026-08-06)
 * expectedToChange. Until then expectedToChange was the single waiver
 * vocabulary in this harness with neither expiry nor staleness detection —
 * a waiver that stopped being needed persisted invisibly, silently covering
 * the NEXT change to that route/metric, which nobody reviewed. Same rules
 * for both: mandatory, YYYY-MM-DD, inside the 90-day horizon, and an
 * expired entry is a loud config error, never a silent return to the gate.
 */
function validateExpiry(file, where, expires, now) {
  if (typeof expires !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(expires)) {
    throw new Error(
      `${file}: ${where} needs an "expires" date as YYYY-MM-DD. An override with no `
      + `end date is a permanent weakening of the gate wearing a temporary label.`);
  }
  // Valid through the whole of the named day, in UTC.
  const deadline = Date.parse(`${expires}T23:59:59Z`);
  if (Number.isNaN(deadline)) {
    throw new Error(`${file}: ${where} has an unparseable "expires" date ${expires}.`);
  }
  // An expiry far enough out is a permanent hole wearing a date. 90 days is
  // the plan's number: long enough for a batch to land, short enough that
  // somebody has to look at it again.
  const horizon = now + (MAX_OVERRIDE_DAYS * 24 * 60 * 60 * 1000);
  if (deadline > horizon) {
    throw new Error(
      `${file}: ${where} expires on ${expires}, past the ${MAX_OVERRIDE_DAYS}-day horizon `
      + `(measured from the current moment, so the practical boundary is ~${MAX_OVERRIDE_DAYS - 1} days). `
      + `Nobody will revisit an expiry that distant. Pick a date inside `
      + `${MAX_OVERRIDE_DAYS} days; if the change genuinely needs longer, renew it `
      + `deliberately and say why.`);
  }
  if (deadline < now) {
    throw new Error(
      `${file}: ${where} expired on ${expires}. An expired override is a config `
      + `error, not a silent return to the global budget: either the change it was `
      + `written for has landed and the entry should be deleted, or it has not and `
      + `somebody needs to say so with a new expiry.`);
  }
}

export function loadConfig(file, readFile, now = Date.now()) {
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
    // How far the two widths of ONE page may disagree about how much that page
    // translated. Not a precision gate — the desktop and mobile layouts are
    // genuinely different documents and legitimately compress by different
    // amounts. This is a "wildly differently" detector.
    maxOffsetDivergencePx: num('maxOffsetDivergencePx',
      'How far the widths of one page may disagree about its global offset.'),
    // Same idea for the affine scale. Both widths of one page are subject to
    // the SAME stylesheet, so a leading change should compress them by a
    // comparable ratio even though their layouts differ.
    maxScaleDivergence: num('maxScaleDivergence',
      'How far the widths of one page may disagree about its affine scale.'),
    // Below this, the affine model does not describe the page and the fit is
    // not evidence of anything. Unwaivable and not overridable on purpose.
    minFitConfidence: num('minFitConfidence',
      'Fraction of rows the affine fit must explain before it counts as a fit.'),
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
    // Last in the entry's validation chain, deliberately: the rejection
    // fixtures for the earlier checks stay valid without stamps, and only an
    // entry the parser fully accepts needs a live expiry.
    validateExpiry(file, `expectedToChange entry for ${entry.route}`, entry.expires, now);
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

  const overrides = parsePageOverrides(file, raw.pageOverrides, budget, now);

  return { widths: raw.widths, ...budget, allow, expectedRedirects, overrides };
}

/**
 * Waiver routes that fired on ZERO compared pages this run. Not (yet) a
 * failure — a baseline advance legitimately zeroes a waiver in the runs
 * before its retirement — but silence is how an unconsumed waiver becomes
 * cover for the NEXT change to that route, which nobody reviewed. The run
 * says it out loud instead. (2026-08-06; full unused-fails-loud parity with
 * the dom-integrity whitelist revisits at the next refresh.)
 */
export function unconsumedWaivers(config, pages) {
  const consumed = new Set(pages
    .filter((p) => p.status === 'EXPECTED' || (p.waivedReasons && p.waivedReasons.length > 0))
    .map((p) => p.route));
  return [...config.allow.keys()].filter((route) => !consumed.has(route));
}

/**
 * Per-page budget overrides.
 *
 * The problem they solve: the global shift budgets are unwaivable on purpose,
 * which left a page whose type scale legitimately moves content 20px with no
 * path to a green run — and the only other lever, lowering the global budget,
 * would weaken the gate for all 19 pages at once. So an override RAISES one
 * named budget on one named page, with a reason and an expiry date, and is
 * reviewed like any other code change.
 *
 * Everything about it is deliberately loud:
 *   - it can never disable a metric, only move a number;
 *   - it can never LOWER a budget, so it cannot be used to quietly tighten or
 *     to sneak a metric to zero;
 *   - it must carry a human reason;
 *   - it must carry an expiry, and an EXPIRED override fails the run rather
 *     than lapsing silently back to the global budget. A silent lapse would
 *     turn a green run red for reasons nobody wrote down, which is how
 *     temporary waivers become permanent.
 *
 * @returns {Map<string, number>} `${page} :: ${metric}` -> value
 */
function parsePageOverrides(file, rawOverrides, budget, now) {
  const overrides = new Map();
  if (rawOverrides === undefined) return overrides;
  if (!Array.isArray(rawOverrides)) {
    throw new Error(`${file}: "pageOverrides" must be an array.`);
  }

  for (const o of rawOverrides) {
    if (!o || typeof o !== 'object' || Array.isArray(o)) {
      throw new Error(`${file}: every pageOverrides entry must be an object `
        + `{ page, metric, value, reason, expires }.`);
    }
    const where = `pageOverrides entry ${JSON.stringify(o.page ?? '(no page)')}`;

    if (typeof o.page !== 'string' || !o.page.trim()) {
      throw new Error(`${file}: every pageOverrides entry needs a "page" route.`);
    }
    if (!OVERRIDABLE.includes(o.metric)) {
      throw new Error(
        `${file}: ${where} names unknown metric ${JSON.stringify(o.metric)}. `
        + `Overridable: ${OVERRIDABLE.join(', ')}. An override raises a budget; `
        + `it cannot switch a metric off.`);
    }
    if (typeof o.value !== 'number' || !Number.isFinite(o.value)) {
      throw new Error(`${file}: ${where} needs a numeric "value".`);
    }
    // Direction and bounds, by metric type. See BUDGET_KIND.
    const global = budget[o.metric];
    if (BUDGET_KIND[o.metric] === 'ceiling') {
      if (o.value <= global) {
        throw new Error(
          `${file}: ${where} sets ${o.metric} to ${o.value}, which does not raise the `
          + `global budget of ${global}. ${o.metric} is a ceiling: an override may only `
          + `RAISE it, for a stated reason. The global budgets are not negotiable here.`);
      }
      const cap = global * CEILING_OVERRIDE_MAX_MULTIPLE;
      if (o.value > cap) {
        throw new Error(
          `${file}: ${where} sets ${o.metric} to ${o.value}, more than `
          + `${CEILING_OVERRIDE_MAX_MULTIPLE}x the global budget of ${global} (cap ${cap}). `
          + `An override that large is not a raised budget, it is the metric switched off `
          + `with extra steps. If the page really moves that much, say so in the plan.`);
      }
    } else {
      // Floor. Lowering is the shippable direction; raising it here would only
      // tighten the gate somewhere nobody would think to look.
      if (o.value >= global) {
        throw new Error(
          `${file}: ${where} sets ${o.metric} to ${o.value}, which does not lower the `
          + `global budget of ${global}. ${o.metric} is a FLOOR — the fraction of the `
          + `baseline that must be found again — so the direction that makes a `
          + `deliberate restyle shippable is DOWN. Raising it only tightens the gate.`);
      }
      if (o.value < COVERAGE_OVERRIDE_MIN || o.value >= COVERAGE_OVERRIDE_MAX) {
        throw new Error(
          `${file}: ${where} sets ${o.metric} to ${o.value}, outside the permitted `
          + `[${COVERAGE_OVERRIDE_MIN}, ${COVERAGE_OVERRIDE_MAX}) range. Below `
          + `${COVERAGE_OVERRIDE_MIN}, a quarter of the page's rows could not be matched `
          + `at all — that needs a human conversation, not a config line.`);
      }
    }
    if (typeof o.reason !== 'string' || !o.reason.trim()) {
      throw new Error(
        `${file}: ${where} needs a non-empty "reason". An override without a reason `
        + `is an unexplained hole in the acceptance gate.`);
    }
    validateExpiry(file, where, o.expires, now);

    const key = overrideKey(o.page, o.metric);
    if (overrides.has(key)) {
      throw new Error(`${file}: duplicate pageOverrides entry for ${o.page} / ${o.metric}.`);
    }
    // The whole entry, not just the number: the reason and the expiry are the
    // reviewable part, and report.json carries them so a green run always says
    // which budgets were raised, why, and until when.
    overrides.set(key, {
      page: o.page, metric: o.metric, value: o.value,
      reason: o.reason.trim(), expires: o.expires,
    });
  }

  return overrides;
}

/**
 * The budget in force for one page and one metric: the global budget unless
 * this exact page carries an override for this exact metric.
 */
function budgetFor(config, route, metric) {
  const o = config.overrides && config.overrides.get(overrideKey(route, metric));
  return o === undefined ? config[metric] : o.value;
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

  // Budgets in force for THIS page. Identical to the globals unless the page
  // carries an explicit, reasoned, dated override.
  const maxShift = budgetFor(config, route, 'maxLayoutShiftPx');
  const minCoverage = budgetFor(config, route, 'minShiftCoverage');
  const maxChanged = budgetFor(config, route, 'maxChangedPct');
  const src = (metric, value) =>
    (value === config[metric] ? 'budget' : `budget (override for this page)`);

  // Fail-closed: if the shift metric could not be computed there is no evidence
  // the page is unchanged, and "no evidence" is not "no change". An override
  // cannot reach this branch — it moves a threshold, it does not excuse a page
  // that could not be measured at all.
  if (!result.shiftMeasurable) {
    reasons.push('layout shift not measurable (page has no structured rows to match)');
  } else {
    // Does an affine map describe this page at all? If not, the instrument says
    // so rather than reporting a number nobody should trust: every shift figure
    // is a residual against this fit, so if the fit does not hold, neither do
    // they. That suppresses the SHIFT reason only — coverage is reported
    // alongside, because "almost none of the baseline was found again" is
    // independently true and is the signal a content replacement has always
    // produced. A gate that replaced one true reason with another would make
    // failures harder to read, not easier.
    const fitHolds = result.globalOffsetConfidence === undefined
      || result.globalOffsetConfidence >= config.minFitConfidence;
    if (!fitHolds) {
      reasons.push(
        `affine fit explains only ${(result.globalOffsetConfidence * 100).toFixed(1)}% of rows `
        + `(< ${(config.minFitConfidence * 100).toFixed(0)}% required; `
        + `scale ${result.globalScale}, offset ${result.globalOffsetPx}px). `
        + `No single scale-and-offset describes this page, so the shift numbers `
        + `beside it are residuals against a fit that does not hold. This is a `
        + `model-does-not-fit result, not a pass and not a measured regression.`);
    }
    if (fitHolds && result.layoutShiftMaxPx > maxShift) {
      reasons.push(`layout shift ${result.layoutShiftMaxPx}px > ${maxShift}px `
        + `${src('maxLayoutShiftPx', maxShift)}`);
    }
    if (result.shiftCoverage < minCoverage) {
      reasons.push(
        `shift coverage ${result.shiftCoverage.toFixed(3)} < ${minCoverage} `
        + `(too little of the baseline was found in the candidate — content moved further `
        + `than the search window, or changed outright)`);
    }
  }

  if (Math.abs(result.heightDeltaPx) > maxShift) {
    note('heightDelta', `page height moved ${result.heightDeltaPx}px > ${maxShift}px `
      + `${src('maxLayoutShiftPx', maxShift)}`);
  }
  if (result.changedPct > maxChanged) {
    note('changedPct', `${result.changedPct.toFixed(3)}% of pixels changed > ${maxChanged}% `
      + `${src('maxChangedPct', maxChanged)}`);
  }

  let status = 'PASS';
  if (reasons.length > 0) status = 'FAIL';
  else if (waivedReasons.length > 0) status = 'EXPECTED';
  return { status, reasons, waivedReasons };
}

/**
 * Gate the global offset on its own terms, across the widths of one page.
 *
 * A page is allowed to compress — that is the whole point of estimating the
 * offset rather than reading it as chaos. What it is not allowed to do is
 * compress by 40px at one width and 400px at the other without anyone seeing
 * it, because that is not a uniform restyle, it is two different things
 * happening that happen to average out per width.
 *
 * Two signals, and the second is the sharp one:
 *
 *   magnitude   the widths disagree by more than maxOffsetDivergencePx.
 *   direction   the widths disagree about the SIGN — one page grew while the
 *               other shrank. No single leading change does that, so it points
 *               at content or reflow differences and is worth a look regardless
 *               of magnitude.
 *
 * @param {{width:number, offset:number}[]} perWidth  one entry per captured width
 * @returns {string[]} human-readable failures, empty when the page is consistent
 */
export function evaluateFitDivergence(config, route, perWidth) {
  if (!Array.isArray(perWidth) || perWidth.length < 2) return [];
  const out = [];

  // Scale first: under an affine model this is the sharper of the two numbers.
  // Both widths are rendered from the SAME stylesheet, so a leading change
  // compresses them by a comparable ratio even though their layouts differ. Two
  // widths that disagree about the ratio are not describing one restyle.
  const scales = perWidth.map((p) => (p.scale === undefined ? 1 : p.scale));
  if (scales.some((s) => s !== undefined)) {
    const sLo = Math.min(...scales);
    const sHi = Math.max(...scales);
    if (sHi - sLo > config.maxScaleDivergence) {
      const shownScale = perWidth
        .map((p, i) => `${p.width}px: ${scales[i].toFixed(4)}`).join(', ');
      out.push(`${route}: the widths disagree about how much this page COMPRESSED `
        + `(${shownScale}) — a spread of ${(sHi - sLo).toFixed(4)}, over the `
        + `${config.maxScaleDivergence} budget. One stylesheet change should scale both `
        + `widths comparably; this did not.`);
    }
  }

  const offsets = perWidth.map((p) => p.offset);
  const lo = Math.min(...offsets);
  const hi = Math.max(...offsets);
  const shown = perWidth.map((p) => `${p.width}px: ${p.offset > 0 ? '+' : ''}${p.offset}px`).join(', ');

  if (hi - lo > config.maxOffsetDivergencePx) {
    out.push(`${route}: the widths disagree about how far this page moved `
      + `(${shown}) — a spread of ${hi - lo}px, over the `
      + `${config.maxOffsetDivergencePx}px budget. A uniform restyle moves both widths `
      + `by comparable amounts; this did not.`);
  }

  // Sign disagreement, ignoring offsets small enough to be rounding.
  const NOISE = 4;
  const grew = perWidth.filter((p) => p.offset > NOISE);
  const shrank = perWidth.filter((p) => p.offset < -NOISE);
  if (grew.length > 0 && shrank.length > 0) {
    out.push(`${route}: one width grew while another shrank (${shown}). No single `
      + `spacing change does that — something is reflowing differently at the two widths.`);
  }
  return out;
}

/** True when anything at all was over budget — used to decide whether to write a diff image. */
export function overBudget(config, route, result) {
  const v = evaluatePair(config, route, result);
  return v.status !== 'PASS';
}
