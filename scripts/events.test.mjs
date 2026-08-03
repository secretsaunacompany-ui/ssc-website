#!/usr/bin/env node
/**
 * Fixture for the analytics event set (WP-0a).
 *
 *   npm run events:test
 *
 * WHAT IS UNDER TEST
 *
 * Whether the redesign can be measured at all. This site recorded its first
 * analytics event on 2026-07-28, when a CSP block was corrected; before that
 * there was nothing, which is how a configurator funnel that produced zero
 * submissions in the site's entire history stayed invisible. Every event named
 * in `docs/redesign-2026-07/14-wim-journey-funnel.md` §8 whose trigger exists
 * today is fired here, from a real browser, against the real built dist/, by
 * real clicks -- and its payload is inspected on the way out.
 *
 * THREE THINGS THIS SUITE EXISTS TO CATCH, ALL OF WHICH LOOK LIKE SUCCESS
 *
 *   1. AN EVENT THAT NEVER FIRES. `js/advisor.js` guarded on
 *      `window.SSC.trackEvent`, a global nothing has ever assigned. Two call
 *      sites, permanently dead, indistinguishable from working code by
 *      reading it. So the guard is exercised, not reviewed.
 *
 *   2. AN EVENT THAT FIRES TWICE. The shared tracker binds its own document
 *      -level `submit` listener to `.contact-form` and emits `form_submit`
 *      alongside the site's own `contact_submit_success`. Two rows, one
 *      submission, and a conversion rate that is wrong in the flattering
 *      direction. So the REAL tracker is loaded from the local ssc-ops
 *      checkout for the double-count scenarios, rather than the friendly stub
 *      that would never have caught it.
 *
 *   3. AN EVENT THAT ARRIVES EMPTY. The collector replaces any `eventData`
 *      over 5,000 characters with `{}` and still answers 200 (ssc-ops
 *      `track.js:211-217`). An oversized payload is therefore invisible at
 *      both ends. Every payload here is byte-counted, and the privacy
 *      denylist is driven through the real shipped module rather than trusted.
 *
 * REQUIRES A SIBLING ssc-ops CHECKOUT
 *
 * The stream-separation scenarios load `../ssc-ops/tracker.js` -- the real
 * shared tracker, from a checkout beside this repo. A stub written by the same
 * hand as the fix cannot prove the fix, so this suite goes RED (with that
 * message, not a crash) on a machine where ssc-ops is missing. Clone it beside
 * this repo:  git clone <ssc-ops> ../ssc-ops
 *
 * MUTATION IS BUILT IN, NOT A RITUAL
 *
 * The two load-bearing repairs in this package -- the advisor guard rewire and
 * the double-count suppression -- are exactly the kind that pass silently when
 * undone. So the suite tampers with the source and rebuilds: each mutation
 * MUST be detected. If a mutation regex stops matching, the run throws rather
 * than quietly retiring the assertion it gives meaning to.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';

const REPO_ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const require = createRequire(path.join(REPO_ROOT, '/'));
const Eleventy = require('@11ty/eleventy');
const { chromium } = require('playwright');

/**
 * The shared tracker's source, checked out beside this repo. The double-count
 * scenarios load THIS file into the page: the bug they guard against lives in
 * it, and a stub written by the same hand as the fix proves nothing.
 */
const TRACKER_SRC = path.resolve(REPO_ROOT, '..', 'ssc-ops', 'tracker.js');

/** Directories never copied into the scratch site (mirrors the sibling suites). */
const SKIP = new Set(['node_modules', '.git', 'dist', '_site', '.visual-diff', '.probe', 'tmp', '.env']);

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.xml': 'application/xml',
  '.webmanifest': 'application/json', '.txt': 'text/plain',
};

const STORAGE_KEY = 'ssc_quote_config';
const MODEL = 's4';

/** The server's silent-drop threshold, and the budget the site holds itself to. */
const SERVER_DROP_CHARS = 5000;
const SITE_BUDGET_CHARS = 500;

/** Values typed into forms during the run. None of them may appear in any event. */
const PII = {
  name: 'Testperson Mcdouble',
  email: 'testperson@example.com',
  location: 'Whistler',
  notes: 'south side of the driveway behind the shed',
};

let failures = 0;
let passes = 0;

function check(name, condition, detail) {
  if (condition) { passes += 1; process.stdout.write(`  PASS  ${name}\n`); }
  else { failures += 1; process.stdout.write(`  FAIL  ${name}\n        ${detail}\n`); }
}

function scratchSite() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ssc-events-'));
  fs.cpSync(REPO_ROOT, dir, {
    recursive: true,
    filter: (src) => {
      const base = path.basename(src);
      if (base.startsWith('.env')) return false; // never copy secrets into scratch
      return !SKIP.has(base) || path.dirname(src) !== REPO_ROOT;
    },
  });
  fs.symlinkSync(path.join(REPO_ROOT, 'node_modules'), path.join(dir, 'node_modules'));
  return dir;
}

/**
 * Apply a single exact substitution to a file in the scratch copy.
 * Throws unless the pattern matches exactly once.
 */
function mutate(file, find, replace) {
  const before = fs.readFileSync(file, 'utf8');
  const parts = before.split(find);
  if (parts.length !== 2) {
    throw new Error(
      `mutation could not be applied to ${path.basename(file)}: expected exactly one `
      + `occurrence of ${JSON.stringify(find)}, found ${parts.length - 1}. If the code was `
      + `refactored, update the mutation. Do NOT delete it: it is what proves the `
      + `corresponding assertion can fail.`);
  }
  fs.writeFileSync(file, parts.join(replace));
}

/** Turn the advisor feature flag on in a scratch copy. */
function enableAdvisor(dir) {
  const file = path.join(dir, 'src', '_data', 'site.json');
  const json = JSON.parse(fs.readFileSync(file, 'utf8'));
  json.features.advisor = true;
  fs.writeFileSync(file, JSON.stringify(json, null, 2));
}

async function serve(root) {
  const server = http.createServer((req, res) => {
    let file = path.join(root, decodeURIComponent(req.url.split('?')[0]));
    try { if (fs.statSync(file).isDirectory()) file = path.join(file, 'index.html'); } catch { /* 404 below */ }
    fs.readFile(file, (err, buf) => {
      if (err) { res.writeHead(404); res.end('not found'); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
      res.end(buf);
    });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return { server, base: `http://127.0.0.1:${server.address().port}` };
}

/** Build a (possibly mutated) copy of the site and serve it. */
async function bootSite(mutator) {
  const dir = scratchSite();
  if (mutator) mutator(dir);
  const dist = path.join(dir, 'dist');
  await new Eleventy(path.join(dir, 'src'), dist, {
    configPath: path.join(dir, '.eleventy.js'),
    quietMode: true,
  }).write();
  const served = await serve(dist);
  return { dir, ...served };
}

/**
 * The recorder. Events are kept in sessionStorage, not a window array, because
 * the contact form NAVIGATES on success -- a per-document array would lose the
 * one event that scenario exists to observe.
 */
const RECORDER = `
  window.__record = (type, data) => {
    const a = JSON.parse(sessionStorage.getItem('__ssc_events') || '[]');
    a.push({ type, data });
    sessionStorage.setItem('__ssc_events', JSON.stringify(a));
  };
`;

/**
 * Marks, INSIDE the page, the two instants the hero-hold clock fixture compares:
 * when `.reveal-ready` actually appeared, and when the metric's own trigger
 * condition (a scroll event seeing a non-zero pageYOffset) first became true.
 *
 * Both are marked here rather than from the test side because a CDP round trip
 * is tens of milliseconds and the tolerance being asserted is two frames. An
 * earlier version of this fixture noted the ready instant with an
 * `await page.evaluate(() => Date.now())` after waitForFunction, and the round
 * trip alone put it over the line in roughly one run in three -- it was
 * measuring its own instrumentation.
 *
 * A MutationObserver on the class attribute, not a poll: it observes the DOM
 * fact the transition-delays key off, it fires in the same task as the class
 * lands, and it is independent of the page's own bookkeeping, which is what
 * keeps the comparison from being tautological.
 *
 * The attach step retries: an init script runs at document-creation time, when
 * `document.documentElement` can still be null, and observing null throws --
 * which killed the whole script and hung the fixture on a wait that could never
 * resolve. Found by this suite going red, which is the correct way to find it.
 */
const HERO_CLOCK_PROBE = `
  window.__tReady = null;
  window.__tTrigger = null;
  (function () {
    var mark = function () {
      if (window.__tReady === null
          && document.documentElement
          && document.documentElement.classList.contains('reveal-ready')) {
        window.__tReady = Date.now();
      }
    };
    var attach = function () {
      if (!document.documentElement) { setTimeout(attach, 0); return; }
      new MutationObserver(mark).observe(document.documentElement, {
        attributes: true, attributeFilter: ['class'],
      });
      mark();
    };
    attach();
    window.addEventListener('scroll', function () {
      if (window.__tTrigger === null && window.pageYOffset > 0) {
        window.__tTrigger = Date.now();
      }
    }, { passive: true, capture: true });
  })();
`;

/**
 * Marks, INSIDE the page, the three instants the escape hatch's contract is
 * made of: the keydown, the moment the nav is GRANTED its reveal, and the
 * painted opacity every frame thereafter.
 *
 * Nothing here is polled over CDP. A round trip is tens of milliseconds and the
 * whole fade is 350, so a poll would be measuring its own instrumentation --
 * the same lesson HERO_CLOCK_PROBE was written for, applied to the other
 * page-side timing question. The old CDP poll is in fact why this fixture's
 * first failure reported `opacity was 0` for a page that was painting ~0.5.
 *
 * TWO clocks on purpose, because the contract has two halves that fail
 * differently:
 *
 *   key -> `.seen`   did the page RESPOND? A DOM fact, set synchronously in
 *                    the keydown handler. Measured at 0ms in 6 of 6 runs.
 *   painted opacity  did it LOOK right? Only paint can answer "did it fade or
 *                    did it snap", and only paint knows when focus stopped
 *                    sitting on an invisible link.
 *
 * The distinction is load-bearing rather than tidy. An earlier version of this
 * fixture asserted the painted fade had STARTED within 100ms and went red at
 * 121ms on a machine also running sixteen mutation builds. Measured standalone,
 * the same page starts painting between 28ms and 87ms with a median FRAME gap
 * of 25ms and a worst gap of 60 -- so that bound was reading the headless
 * browser's frame cadence and calling it site latency. The responsiveness claim
 * it was trying to make is real; it just has to be made against the grant,
 * which is deterministic, and not against the first frame that happens to get
 * scheduled.
 *
 * The keydown listener is registered at document-creation time, so it runs
 * before the hatch's own capture-phase listener and records the input instant
 * rather than some instant after the release. Passive: nothing here can affect
 * the gesture it is measuring.
 */
const NAV_FADE_PROBE = `
  window.__fade = { key: null, seen: null, samples: [] };
  (function () {
    window.addEventListener('keydown', function () {
      if (window.__fade.key === null) window.__fade.key = performance.now();
    }, { capture: true, passive: true });
    var attach = function () {
      var n = document.querySelector('nav');
      if (!n) { setTimeout(attach, 0); return; }
      new MutationObserver(function () {
        if (window.__fade.seen === null && n.classList.contains('seen')) {
          window.__fade.seen = performance.now();
        }
      }).observe(n, { attributes: true, attributeFilter: ['class'] });
    };
    document.addEventListener('DOMContentLoaded', attach);
    var tick = function () {
      var n = document.querySelector('nav');
      if (n) {
        window.__fade.samples.push({
          t: performance.now(),
          o: parseFloat(getComputedStyle(n).opacity),
        });
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  })();
`;

const readEvents = (page) => page.evaluate(
  () => JSON.parse(sessionStorage.getItem('__ssc_events') || '[]'));

/**
 * A page with the tracker STUBBED. Used for everything except the double-count
 * scenarios: it observes what the site asks the tracker to send.
 */
async function newPage(browser) {
  return instrumentPage(await browser.newPage());
}

/**
 * The same instrumented page, but inside a context carrying emulation options
 * (reducedMotion, and whatever a later fixture needs).
 *
 * It exists so an emulated fixture cannot accidentally become tautological. A
 * page opened WITHOUT the recorder and the analyticsTracker stub records no
 * events for any reason whatsoever, so a fixture asserting "no events were
 * emitted" would pass against a completely broken site. Both fixtures share one
 * instrumentation path so that cannot drift apart.
 *
 * Returns { page, close } -- the context must be closed too, not just the page.
 */
async function newEmulatedPage(browser, contextOptions) {
  const ctx = await browser.newContext(contextOptions);
  const page = await instrumentPage(await ctx.newPage());
  return { page, close: async () => { await page.close(); await ctx.close(); } };
}

async function instrumentPage(page) {
  // The real tracker must not load here: it is cross-origin, it would publish
  // its own window.analyticsTracker over the recorder, and a passing suite
  // would then be posting test events at the production endpoint.
  await page.route('**ssc-ops.netlify.app/**', (route) => route.abort());
  await page.addInitScript(RECORDER + `
    window.analyticsTracker = {
      trackEvent: (type, data) => window.__record(type, data),
      trackPageView: () => {},
    };
  `);
  return page;
}

/**
 * A page running the REAL shared tracker, served from the local ssc-ops
 * checkout, with its transport intercepted in the browser.
 *
 * navigator.sendBeacon is overridden rather than routed: it is the transport
 * the tracker actually chooses, and overriding it records exactly the bytes
 * that would have left the machine. The endpoint is also routed, so the
 * fetch fallback cannot escape either.
 */
async function newRealTrackerPage(browser) {
  const source = fs.readFileSync(TRACKER_SRC, 'utf8');
  const page = await browser.newPage();
  await page.route('**ssc-ops.netlify.app/tracker.js*', (route) => route.fulfill({
    status: 200, contentType: 'text/javascript', body: source,
  }));
  await page.route('**ssc-ops.netlify.app/.netlify/functions/track*', (route) => route.fulfill({
    status: 200, contentType: 'application/json', body: '{"ok":true}',
  }));
  await page.addInitScript(RECORDER + `
    const record = (body) => {
      try {
        const parsed = JSON.parse(body);
        if (parsed && parsed.type === 'event') window.__record(parsed.eventType, parsed.eventData);
      } catch (err) { /* pageview payloads and junk are not our business */ }
    };
    const originalBeacon = navigator.sendBeacon && navigator.sendBeacon.bind(navigator);
    navigator.sendBeacon = (url, blob) => {
      if (blob && typeof blob.text === 'function') blob.text().then(record);
      return true;
    };
    void originalBeacon;
  `);
  return page;
}

/** Route Formspree to a given outcome. */
async function stubFormspree(page, outcome) {
  await page.unroute('**/formspree.io/**').catch(() => {});
  await page.route('**/formspree.io/**', async (route) => {
    if (outcome === 'abort') return route.abort();
    if (outcome === 429) {
      return route.fulfill({ status: 429, contentType: 'application/json', body: JSON.stringify({ error: 'Too many requests' }) });
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ next: 'https://formspree.io/thanks' }),
    });
  });
}

const openModal = async (page, base, model = MODEL) => {
  await page.goto(`${base}/saunas/`, { waitUntil: 'networkidle' });
  await page.click(`[data-action="open-modal"][data-model="${model}"]`);
  await page.waitForSelector('.modal-addons .addon-option', { state: 'visible' });
};

const fillStep2 = async (page) => {
  await page.fill('#quoteName', PII.name);
  await page.fill('#quoteEmail', PII.email);
  await page.fill('#quoteLocation', PII.location);
  const notes = await page.$('#quoteNotes');
  if (notes) await notes.fill(PII.notes);
};

const typeOf = (events, type) => events.filter((e) => e.type === type);
const one = (events, type) => typeOf(events, type)[0];

// ============================================================
// A. the event set as wired
// ============================================================
async function runInventory(base, browser) {
  const collected = [];

  // --- configurator: open, option change, step 2, attempt, success -----
  {
    const page = await newPage(browser);
    await stubFormspree(page, 'success');
    await openModal(page, base);

    let events = await readEvents(page);
    const open = one(events, 'configurator_open');
    check('configurator_open: fires on open, carrying the model',
      !!open && open.data.model === MODEL, `events were ${JSON.stringify(events)}`);

    // Three rapid toggles. Debounced, so this is engagement depth, not a
    // per-click ledger.
    const boxes = await page.$$('.modal-addons input[type="checkbox"]:not([disabled])');
    for (const box of boxes.slice(0, 3)) await box.click();
    await page.waitForTimeout(800);
    events = await readEvents(page);
    const changes = typeOf(events, 'configurator_option_change');
    check('configurator_option_change: debounced to one event for a rapid burst',
      changes.length === 1 && typeof changes[0].data.addon === 'string' && changes[0].data.model === MODEL,
      `option-change events were ${JSON.stringify(changes)}`);

    await page.click('[data-action="request-quote"]');
    events = await readEvents(page);
    const step2 = one(events, 'quote_step2_view');
    check('quote_step2_view: fires on entering step 2 with a NUMERIC total',
      !!step2 && step2.data.model === MODEL && typeof step2.data.total === 'number' && step2.data.total > 0,
      `step2 event was ${JSON.stringify(step2)}`);

    await fillStep2(page);
    await page.click('#quoteSubmit');
    await page.waitForSelector('#successStep', { state: 'visible' });
    events = await readEvents(page);

    check('quote_submit_attempt: exactly one, before the send',
      typeOf(events, 'quote_submit_attempt').length === 1,
      `attempt events were ${JSON.stringify(typeOf(events, 'quote_submit_attempt'))}`);

    const success = typeOf(events, 'quote_submit_success');
    check('quote_submit_success: EXACTLY ONE per submission',
      success.length === 1, `success events were ${JSON.stringify(success)}`);
    check('quote_submit_success: model, numeric total, option count',
      success[0] && success[0].data.model === MODEL
      && typeof success[0].data.total === 'number'
      && typeof success[0].data.options === 'number',
      `payload was ${JSON.stringify(success[0] && success[0].data)}`);
    check('the modal submission emits ZERO form_submit',
      typeOf(events, 'form_submit').length === 0,
      'the configurator stream is being double-counted as contact-form traffic');
    check('the ordering is a funnel: open -> step2 -> attempt -> success',
      events.findIndex((e) => e.type === 'configurator_open')
        < events.findIndex((e) => e.type === 'quote_step2_view')
      && events.findIndex((e) => e.type === 'quote_step2_view')
        < events.findIndex((e) => e.type === 'quote_submit_attempt')
      && events.findIndex((e) => e.type === 'quote_submit_attempt')
        < events.findIndex((e) => e.type === 'quote_submit_success'),
      `order was ${JSON.stringify(events.map((e) => e.type))}`);

    collected.push(...events);
    await page.close();
  }

  // --- the exact inventory of a clean success walk ---------------------
  //
  // Not "the events I expected are present" -- "these events and NO OTHERS,
  // in this order". The looser property is what let a real defect ship: step
  // 2's own name/email/location fields were bound as configurator options, so
  // every walk that CONVERTED emitted three phantom option-change events and
  // burned three of the twelve per-open slots. Every assertion around it
  // passed, because each of them only asked whether the event it cared about
  // was there.
  {
    const page = await newPage(browser);
    await stubFormspree(page, 'success');
    await openModal(page, base);
    await page.click('.modal-addons input[data-addon="wifi"]');
    await page.click('[data-action="request-quote"]');
    await fillStep2(page);
    await page.click('#quoteSubmit');
    await page.waitForSelector('#successStep', { state: 'visible' });
    // Longer than the option-change debounce: a phantom event fired by the
    // step 2 fields lands ~500ms after the last keystroke, which is AFTER the
    // success panel. Reading immediately would miss exactly the bug this
    // scenario exists to catch.
    await page.waitForTimeout(900);
    const events = await readEvents(page);

    const expected = [
      'configurator_open',
      'configurator_option_change',
      'quote_step2_view',
      'quote_submit_attempt',
      'quote_submit_success',
    ];
    check('inventory: a clean success walk emits EXACTLY these events, in order',
      JSON.stringify(events.map((e) => e.type)) === JSON.stringify(expected),
      `walk emitted ${JSON.stringify(events.map((e) => e.type))}`);
    check('inventory: the one option change is the option the visitor clicked',
      one(events, 'configurator_option_change')
      && one(events, 'configurator_option_change').data.addon === 'wifi',
      `option change was ${JSON.stringify(one(events, 'configurator_option_change'))}`);
    collected.push(...events);
    await page.close();
  }

  // --- the per-open ceiling --------------------------------------------
  {
    const page = await newPage(browser);
    await openModal(page, base);
    // Spaced past the debounce so each toggle is its own event. Fifteen
    // deliberate changes, twelve slots: a visitor who plays with the
    // configurator for ten minutes registers as engaged, not as a flood.
    for (let i = 0; i < 15; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await page.click('.modal-addons input[data-addon="wifi"]');
      // eslint-disable-next-line no-await-in-loop
      await page.waitForTimeout(600);
    }
    const events = await readEvents(page);
    check('configurator_option_change: capped at 12 per open, whatever the visitor does',
      typeOf(events, 'configurator_option_change').length === 12,
      `${typeOf(events, 'configurator_option_change').length} option-change events for 15 changes`);
    collected.push(...events);
    await page.close();
  }

  // --- failure codes ---------------------------------------------------
  const failureCase = async (outcome, expectedCode, offline) => {
    const page = await newPage(browser);
    await stubFormspree(page, outcome);
    await openModal(page, base);
    await page.click('[data-action="request-quote"]');
    await fillStep2(page);
    if (offline) await page.context().setOffline(true);
    await page.click('#quoteSubmit');
    await page.waitForSelector('#quoteError', { state: 'visible' });
    const events = await readEvents(page);
    const errors = typeOf(events, 'quote_submit_error');
    check(`quote_submit_error: one event coded "${expectedCode}"`,
      errors.length === 1 && errors[0].data.error === expectedCode
      && typeof errors[0].data.total === 'number',
      `error events were ${JSON.stringify(errors)}`);
    collected.push(...events);
    if (offline) await page.context().setOffline(false);
    await page.close();
  };
  await failureCase(429, 'rate_limited', false);
  await failureCase('abort', 'network', false);
  await failureCase('success', 'offline', true);

  // --- restore ---------------------------------------------------------
  {
    const page = await newPage(browser);
    await stubFormspree(page, 'success');
    await openModal(page, base);
    const boxes = await page.$$('.modal-addons input[type="checkbox"]:not([disabled])');
    if (boxes.length) await boxes[0].click();
    await page.click('[data-action="request-quote"]');   // writes the record
    await page.reload({ waitUntil: 'networkidle' });
    await page.evaluate(() => sessionStorage.setItem('__ssc_events', '[]'));
    await page.click(`[data-action="open-modal"][data-model="${MODEL}"]`);
    await page.waitForSelector('.modal-addons .addon-option', { state: 'visible' });
    const events = await readEvents(page);
    const restore = one(events, 'quote_restore');
    check('quote_restore: fires when a saved configuration is re-applied',
      !!restore && restore.data.model === MODEL && typeof restore.data.stale === 'boolean',
      `events were ${JSON.stringify(events)}`);
    collected.push(...events);
    await page.close();
  }

  // --- /contact/ fallback ----------------------------------------------
  {
    const page = await newPage(browser);
    await page.goto(`${base}/contact/`, { waitUntil: 'networkidle' });
    await page.evaluate(([key, model]) => {
      localStorage.setItem(key, JSON.stringify({
        modelId: model, modelName: 'S4 Standard Sauna', total: '$28,500',
        selections: [], summary: 'S4 Standard Sauna\nEstimated Total: $28,500',
        version: window.SSC.pricesVersion, savedAt: Date.now(),
      }));
      sessionStorage.setItem('__ssc_events', '[]');
    }, [STORAGE_KEY, MODEL]);
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('.quote-attached-banner');
    const events = await readEvents(page);
    const fallback = one(events, 'quote_fallback_contact');
    check('quote_fallback_contact: fires when the banner is shown',
      !!fallback && fallback.data.model === MODEL,
      `events were ${JSON.stringify(events)}`);
    collected.push(...events);
    await page.close();
  }

  // --- /book/ paused state ---------------------------------------------
  {
    const page = await newPage(browser);
    await page.goto(`${base}/book/`, { waitUntil: 'networkidle' });
    const events = await readEvents(page);
    const view = one(events, 'book_page_view');
    check('book_page_view: reports the state the template actually rendered',
      !!view && view.data.paused === true, `events were ${JSON.stringify(events)}`);
    collected.push(...events);
    await page.close();
  }

  // --- the held hero moment --------------------------------------------
  //
  // The hold is no longer a scroll LOCK -- WP-1b deleted HeroIntroAnimation and
  // with it `body.hero-locked` and the 5s auto-reveal that these two scenarios
  // used to synchronise on. The question the events answer is unchanged (is the
  // held moment watched or skipped?) but it is now asked of a photograph the
  // visitor is free to leave, so the branch is decided by the choreography's own
  // settle boundary rather than by which timer fired.
  //
  //   hero_hold_skipped   first scroll BEFORE the page finished settling
  //   hero_hold_complete  first scroll after it, or the page going away unscrolled
  //
  // Note both scenarios scroll for real now. Scrolling is the thing that used to
  // be impossible here, which is the whole point of the change.
  //
  // ONE settle number in this block, not five literals scattered through it.
  // B1 moved the boundary from 1240 to 2720 (the hold arrived) and the old
  // shape meant finding every copy by hand; a copy missed is a fixture that
  // still passes while measuring the wrong thing. The agreement fixture below
  // ties this constant to the CSS token it is derived from, so the two cannot
  // drift apart silently either.
  //
  //   SETTLE_MS      = --hero-hold 1600 + reveal 1000 + 1 x stagger 120
  //   PAST_SETTLE_MS = a wait comfortably past it, for the "watched it" cases
  const SETTLE_MS = 2720;
  const PAST_SETTLE_MS = 3100;
  {
    const page = await newPage(browser);
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    // Immediately: well inside the settle, so this is the skip branch.
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(200);
    const events = await readEvents(page);
    const skipped = one(events, 'hero_hold_skipped');
    check('hero_hold_skipped: a scroll before the page settles reports the ms given to it',
      !!skipped && typeof skipped.data.ms === 'number'
      && skipped.data.ms < SETTLE_MS
      && typeOf(events, 'hero_hold_complete').length === 0,
      `events were ${JSON.stringify(events)}`);
    collected.push(...events);
    await page.close();
  }
  {
    const page = await newPage(browser);
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    // Let it settle, THEN scroll. That is the "watched it" case.
    await page.waitForTimeout(PAST_SETTLE_MS);
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(200);
    const events = await readEvents(page);
    const done = one(events, 'hero_hold_complete');
    check('hero_hold_complete: a scroll after the settle reports as complete, once',
      !!done && typeof done.data.ms === 'number' && done.data.ms >= SETTLE_MS
      && typeOf(events, 'hero_hold_complete').length === 1
      && typeOf(events, 'hero_hold_skipped').length === 0,
      `events were ${JSON.stringify(events)}`);
    collected.push(...events);
    await page.close();
  }
  {
    // NOTE-2b: the visitor who LOOKS and then LEAVES.
    //
    // `visibilitychange` covers tab-switching, and it was the only listener, so
    // a straight navigation away -- link, back button, closed tab -- could take
    // the page down without any hidden transition being observed and the metric
    // never reported at all. That is a silent under-count biased toward exactly
    // the behaviour this metric exists to measure.
    //
    // The fixture is written to have no other way to pass: visibilityState is
    // asserted 'visible' at the moment pagehide fires, so the visibilitychange
    // handler is provably not the thing that reported. Measured against the
    // pre-fix build, this scenario produced ZERO events.
    const page = await newPage(browser);
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(PAST_SETTLE_MS);   // past the settle boundary
    const stillVisible = await page.evaluate(() => {
      window.dispatchEvent(new Event('pagehide'));
      return document.visibilityState;
    });
    await page.waitForTimeout(100);
    const events = await readEvents(page);
    const done = one(events, 'hero_hold_complete');
    check('hero_hold_complete: leaving WITHOUT scrolling reports exactly once (NOTE-2b)',
      stillVisible === 'visible'
      && !!done && typeof done.data.ms === 'number' && done.data.ms >= SETTLE_MS
      && typeOf(events, 'hero_hold_complete').length === 1
      && typeOf(events, 'hero_hold_skipped').length === 0,
      `visibilityState was ${stillVisible}, events were ${JSON.stringify(events)}`);
    collected.push(...events);
    await page.close();
  }
  {
    // The latch, from the other direction: a view that scrolls AND then leaves
    // has two paths into report() and must still emit one event. Two listeners
    // reporting the same thing is the obvious way to break a metric while making
    // its numbers look healthier, so it is asserted rather than reasoned about.
    const page = await newPage(browser);
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.mouse.wheel(0, 600);    // inside the settle: the skip branch
    await page.waitForTimeout(200);
    await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
    await page.waitForTimeout(100);
    const events = await readEvents(page);
    check('scroll then leave still reports exactly one event, and it is the scroll\'s verdict',
      typeOf(events, 'hero_hold_skipped').length === 1
      && typeOf(events, 'hero_hold_complete').length === 0,
      `events were ${JSON.stringify(events)}`);
    collected.push(...events);
    await page.close();
  }
  {
    // The scroll lock is gone, and that is a behavioural claim worth asserting
    // rather than assuming: this scenario would have hung or timed out against
    // the old build, which is exactly why it belongs here.
    const page = await newPage(browser);
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.mouse.wheel(0, 800);
    await page.waitForTimeout(300);
    const y = await page.evaluate(() => window.pageYOffset);
    check('the first scroll gesture always works -- no lock, at any moment',
      y > 0, `pageYOffset was ${y}`);
    check('no scroll-lock class or style survives on the body',
      await page.evaluate(() =>
        !document.body.classList.contains('hero-locked')
        && getComputedStyle(document.body).overflow !== 'hidden'),
      'body still carries the lock');
    await page.close();
  }
  {
    // AGREEMENT. SETTLE_MS is a DERIVED number and it lives in three places:
    // the --hero-hold token in styles.css, the constant in js/animations.js,
    // and the constant at the top of this block. Nothing but a person keeps
    // them equal, and the failure mode when they diverge is silent: the metric
    // keeps emitting, the branch boundary is simply in the wrong place, and
    // every hero_hold reading after that day is measuring something other than
    // what its name says. That is the defect this fixture exists for.
    //
    // It is not tautological: it reads the LIVE COMPUTED values off the last
    // held element in a real browser -- the delay the browser actually resolved
    // and the duration it actually resolved -- and asserts their sum is
    // SETTLE_MS. Editing the token without editing the constants fails it.
    //
    // REWIRED, because the mechanism moved and this fixture caught the move:
    //
    //   FAIL  the settle boundary agrees with the CSS the browser actually resolved
    //         computed {"hold":1600,"step":120,"i":1,"delay":120,"duration":1000,
    //         "heroHasReveal":false}; delay+duration was 1120, SETTLE_MS is 2720
    //
    // That is the fixture reporting the truth about a page it no longer
    // described. The hold is no longer inside `transition-delay` -- it is the
    // moment RevealManager grants `.seen` -- so the 120ms this reads is the
    // held pair's ordinary stagger and 1120 is the correct sum of the two
    // things it was reading. What it must read now is three terms, not two.
    //
    // The single-source claim survives the move and is asserted DIRECTLY here
    // rather than inferred: --hero-hold is still the one authoritative value,
    // and js/animations.js READS it (SSC.reveal.holdMs) instead of carrying a
    // copy. So this checks the CSS token, the value the JS actually resolved
    // from it, the stagger the browser actually applied, and the duration the
    // browser actually applied, and requires all four to compose to SETTLE_MS.
    // A token retuned alone fails it via the JS read; a constant edited alone
    // fails it via the sum; and a hold that crept back into a transition-delay
    // fails `delay === i * step`, which is the specific regression this whole
    // rewrite exists to make impossible.
    const page = await newPage(browser);
    await page.goto(base, { waitUntil: 'load' });
    // WAIT FOR THE CLASS THAT CARRIES THE TRANSITION, not for `load`.
    // `.reveal-ready` is added behind a double rAF, and `load` can resolve
    // before it -- more often when Cloudinary is blocked and there is no image
    // traffic to wait on. Read one frame early and transitionDelay computes to
    // "0s" and the fixture reports a false RED: measured 11 of 12 runs with the
    // CDN blocked, 1 of 12 with it reachable, which is the worst possible shape
    // for a fixture (green on the developer's machine, red in CI).
    await page.waitForFunction(
      () => document.documentElement.classList.contains('reveal-ready'));
    const m = await page.evaluate(() => {
      const ms = (v) => (String(v).trim().endsWith('ms')
        ? parseFloat(v) : parseFloat(v) * 1000);
      const root = getComputedStyle(document.documentElement);
      const title = document.querySelector('.hero-content');
      const cs = getComputedStyle(title);
      return {
        hold: ms(root.getPropertyValue('--hero-hold')),
        // What the JS resolved from that token, not a copy of it.
        jsHold: window.SSC.reveal.holdMs,
        step: ms(root.getPropertyValue('--stagger-step')),
        i: parseFloat(cs.getPropertyValue('--i')),
        delay: ms(cs.transitionDelay.split(',')[0]),
        duration: ms(cs.transitionDuration.split(',')[0]),
        heroHasReveal: document.querySelector('.hero-image').classList.contains('reveal'),
      };
    });
    // Note what is NOT asserted here: the literal values 1600 and 120. Those
    // were a fourth and fifth copy of tokens the ROADMAP retune note promises
    // are single-sourced ("the token is the only value that needs to move"),
    // and a fixture that hard-codes them makes that promise false -- a
    // legitimate retune would have gone red for the wrong reason. Everything is
    // DERIVED from the computed read instead: the delay the browser resolved
    // must equal the hold plus this element's own stagger, and the delay plus
    // the duration must equal the boundary the metric branches on. A consistent
    // retune passes; a token moved without its constants does not.
    check('the settle boundary agrees with the hold the page actually runs on',
      m.jsHold === m.hold
      && m.delay === m.i * m.step
      && m.hold + m.delay + m.duration === SETTLE_MS
      && m.hold > 0 && m.step > 0 && m.i === 1,
      `computed ${JSON.stringify(m)}; hold+delay+duration was `
      + `${m.hold + m.delay + m.duration}, SETTLE_MS is ${SETTLE_MS}`);
    check('the hold is spent by the reveal clock, never by a transition-delay',
      m.delay < m.hold && m.delay === m.i * m.step,
      `.hero-content resolved a ${m.delay}ms transition-delay against a ${m.hold}ms `
      + `hold and a ${m.i * m.step}ms stagger. A held element carrying its hold as a `
      + `delay leaves a PENDING transition for the length of the beat, and Chrome `
      + `UPDATES a pending transition rather than replacing it -- which is what made `
      + `the escape hatch's short fade run at the long timing twice before`);
    check('the LCP hero image is never a reveal target',
      m.heroHasReveal === false,
      'the hero <img> carries .reveal -- the largest paint on the page is being withheld');
    await page.close();
  }
  {
    // THE HOLD ACTUALLY HOLDS.
    //
    // New, and it is not redundant with the agreement fixture above -- it is
    // the assertion that fixture used to make implicitly and can no longer
    // make at all. While the hold lived in `transition-delay`, reading the
    // computed delay WAS reading the hold: the browser had already resolved
    // the cascade and there was nothing left to go wrong. The hold is now a
    // scheduled grant, and a computed style cannot see a setTimeout. Every way
    // of getting that scheduling wrong -- never arming it, arming it at zero,
    // letting the IntersectionObserver compose the pair on its first callback
    // -- leaves the whole page above green while the photograph is never alone
    // for a single frame.
    //
    // So it is asserted as the thing Lee actually asked for: at 900ms the nav
    // and the title are not on the page, and by the settle boundary they are.
    // No input of any kind is issued here, because input is the one thing that
    // legitimately ends the beat early.
    const page = await newPage(browser);
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(900);
    const during = await page.evaluate(() => ({
      nav: parseFloat(getComputedStyle(document.querySelector('nav')).opacity),
      title: parseFloat(getComputedStyle(document.querySelector('.hero-content')).opacity),
    }));
    await page.waitForTimeout(PAST_SETTLE_MS - 900 + 200);
    const after = await page.evaluate(() => ({
      nav: parseFloat(getComputedStyle(document.querySelector('nav')).opacity),
      title: parseFloat(getComputedStyle(document.querySelector('.hero-content')).opacity),
    }));
    check('the photograph is held alone: nothing has arrived over it at 900ms',
      during.nav === 0 && during.title === 0,
      `900ms in, nav opacity ${during.nav} and title opacity ${during.title} -- the `
      + `hold is not being spent. The grant is scheduled in JS now, so a computed `
      + `style cannot catch this and this fixture is the only thing that can`);
    check('and both have arrived by the settle boundary',
      after.nav === 1 && after.title === 1,
      `past the settle, nav opacity ${after.nav} and title opacity ${after.title} -- `
      + `the scheduled grant never landed and the homepage has no navigation on it`);
    await page.close();
  }
  {
    // ONE CLOCK.
    //
    // The metric brands a view `skipped` or `complete` by comparing the time
    // the visitor gave the page against SETTLE_MS -- a number derived entirely
    // from the choreography's own delays. That comparison is only meaningful if
    // both sides start counting at the same instant, and for a while they did
    // not: the metric started at DOMContentLoaded while the delays start when
    // `.reveal-ready` lands, two rAFs later. The gap measured 53-168ms, so a
    // visitor who watched the entire 2720ms arrival and scrolled at the end of
    // it was recorded as having skipped it -- the metric's own headline branch,
    // wrong, silently, for the visitor it most cares about.
    //
    // Asserted end to end rather than by inspection: note the wall-clock inside
    // the page the moment `.reveal-ready` appears, scroll at a known later
    // moment, and require the `ms` the metric REPORTS to match the elapsed time
    // since that instant to within two frames. Nothing here reads the
    // implementation, so any future re-plumbing that puts the two back on
    // different clocks fails this.
    // Both instants are marked INSIDE the page, because the two things being
    // compared are both page-side clocks and a CDP round trip is not one of
    // them. The second instant is the metric's own trigger condition -- the
    // first scroll event that sees a non-zero pageYOffset -- rather than the
    // moment the scroll was requested: `html { scroll-behavior: smooth }` means
    // those are ~100ms apart, and timing from the request would measure the
    // easing curve and call it clock drift. (It did, on the first run of this
    // fixture.) The scroll itself is issued as 'instant' as well, so the
    // assertion does not depend on how long an animation takes.
    const TWO_FRAMES_MS = 34;
    const page = await newPage(browser);
    await page.addInitScript(HERO_CLOCK_PROBE);
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__tReady !== null);
    await page.waitForTimeout(400);
    await page.evaluate(() => window.scrollTo({ top: 600, behavior: 'instant' }));
    await page.waitForTimeout(200);
    const marks = await page.evaluate(
      () => ({ ready: window.__tReady, trigger: window.__tTrigger }));
    const events = await readEvents(page);
    const ev = one(events, 'hero_hold_skipped') || one(events, 'hero_hold_complete');
    const expected = marks.trigger === null ? null : marks.trigger - marks.ready;
    const drift = (ev && expected !== null) ? Math.abs(ev.data.ms - expected) : null;
    check('the metric and the choreography count from the same instant',
      !!ev && drift !== null && drift <= TWO_FRAMES_MS,
      `reported ms ${ev && ev.data.ms}, elapsed since .reveal-ready ${expected}, `
      + `drift ${drift}ms > ${TWO_FRAMES_MS}ms — the branch boundary is measuring `
      + `a different clock than the delays it is a boundary of`);
    collected.push(...events);
    await page.close();
  }
  {
    // REDUCED MOTION ABSTAINS.
    //
    // A visitor who asked for no motion is never held: both the CSS mirror and
    // the JS guard compose the page immediately. They then scroll whenever they
    // like, which lands in the `skipped` branch essentially always -- and since
    // the skipped:complete ratio is the instrument for retuning --hero-hold,
    // every one of those views was a vote to shorten a beat that visitor never
    // saw. The metric is supposed to answer "is the held moment watched or
    // skipped?"; from someone who was never held, there is no answer to give.
    //
    // Emitting nothing is the honest reading, and it is asserted rather than
    // assumed because the failure is invisible in production: the events keep
    // arriving and simply mean something else.
    const { page, close } = await newEmulatedPage(browser, { reducedMotion: 'reduce' });
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(300);
    await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
    await page.waitForTimeout(100);
    // NOT vacuous, and this half is load-bearing: the homepage's ONLY event is
    // the hero_hold verdict, so "no events" is the expected result whether the
    // metric abstained or the recorder was never wired up at all. A probe event
    // is pushed through the same window.SSC.track path the metric uses, and the
    // recorder must have caught it -- otherwise this fixture would pass against
    // a site whose analytics are entirely broken.
    await page.evaluate(() => window.SSC.track('probe_recorder_live', { ok: 1 }));
    await page.waitForTimeout(50);
    const events = await readEvents(page);
    check('a reduced-motion visitor emits no hero_hold verdict at all',
      typeOf(events, 'probe_recorder_live').length === 1
      && typeOf(events, 'hero_hold_skipped').length === 0
      && typeOf(events, 'hero_hold_complete').length === 0,
      `events were ${JSON.stringify(events)} — either a visitor who was never `
      + `held is voting on the length of the hold, or the probe event is missing `
      + `and this page recorded nothing at all, in which case the fixture proves `
      + `nothing`);
    await close();
  }
  {
    // TAB DURING THE BEAT.
    //
    // For the length of the hold the nav is at opacity 0 and its links are
    // still in the tab order. Without the escape hatch the first Tab moves
    // focus onto a link nobody can see and leaves it there for the remainder of
    // the beat -- invisible focus, which is the accessibility failure the hold
    // introduces and the reason keydown is one of its cancel triggers.
    //
    // RETARGETED, and this fixture is how the retarget was forced:
    //
    //   FAIL  a Tab during the held beat reveals the nav immediately, not eventually
    //         nav opacity was 0 100ms after Tab -- focus is sitting on an
    //         invisible link
    //
    // The old contract was `opacity === 1` inside 100ms, and its comment argued
    // that "a cancel implemented as a shortened delay rather than a snap would
    // miss that window, which is deliberate -- an interrupted animation must
    // yield". Lee's fixed decision reverses the aesthetic half of that: the
    // cancel is a short FADE now. The accessibility half is not negotiable and
    // is not being softened away, it is being restated at the three bounds that
    // still mean something:
    //
    //   grant within 50ms of the key   -- the page RESPONDED to the input
    //   composed within 500ms          -- focus is not on an invisible link
    //   the fade lasts at least 120ms  -- it faded; it did not snap
    //
    // The third clause is what stops the first two being satisfied by going
    // back to the snap; the second is what stops them being satisfied by a
    // crawl. 500ms is the contract rather than a tolerance -- it is how long
    // focus may sit somewhere invisible -- so if it ever goes red, the fade got
    // slower and the answer is not to raise the number.
    //
    // The first clause is measured against the GRANT, not against the first
    // painted frame. See NAV_FADE_PROBE for why: the painted-start version of
    // this bound was reading the headless browser's frame cadence.
    const page = await newPage(browser);
    await page.addInitScript(NAV_FADE_PROBE);
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(200);
    await page.keyboard.press('Tab');
    await page.waitForTimeout(800);
    const f = await page.evaluate(() => window.__fade);
    const after = f.key === null ? [] : f.samples.filter((s) => s.t >= f.key);
    const moved = after.find((s) => s.o > 0.01);
    const done = after.find((s) => s.o >= 0.999);
    const grantMs = (f.key !== null && f.seen !== null)
      ? Math.round(f.seen - f.key) : null;
    const doneMs = done ? Math.round(done.t - f.key) : null;
    const fadeMs = (moved && done) ? Math.round(done.t - moved.t) : null;
    check('a Tab during the held beat ends the beat on the keystroke itself',
      grantMs !== null && grantMs <= 50,
      `the nav was granted its reveal ${grantMs}ms after the key (want <=50). The `
      + `hatch handles keydown synchronously, so anything above a frame here means `
      + `the release has been deferred behind something`);
    check('and focus is never left on an invisible link for long',
      doneMs !== null && doneMs <= 500,
      `the nav reached full opacity ${doneMs}ms after Tab (want <=500). That is how `
      + `long focus sat on a link nobody could see`);
    check('and it FADES -- the interrupted beat yields, it does not flinch',
      fadeMs !== null && fadeMs >= 120,
      `the nav went from invisible to composed in ${fadeMs}ms, which is a snap. `
      + `Lee's fixed decision is a gentle fade on early input; a snap is the `
      + `behaviour this replaced`);
    await page.close();
  }

  // --- the payload contract, across everything collected ---------------
  {
    const pii = Object.values(PII).map((v) => v.toLowerCase());
    const leaked = collected.filter((e) => {
      const blob = JSON.stringify(e.data || {}).toLowerCase();
      return pii.some((v) => blob.includes(v));
    });
    check('privacy: no name, email, city or free text appears in ANY payload',
      leaked.length === 0, `leaking events: ${JSON.stringify(leaked)}`);

    const oversize = collected.filter(
      (e) => Buffer.byteLength(JSON.stringify(e.data || {}), 'utf8') > SITE_BUDGET_CHARS);
    check(`budget: every payload is under ${SITE_BUDGET_CHARS} bytes (server drops silently at ${SERVER_DROP_CHARS})`,
      oversize.length === 0, `oversized: ${JSON.stringify(oversize)}`);

    const shapes = collected.filter((e) => Object.values(e.data || {}).some(
      (v) => !['string', 'number', 'boolean'].includes(typeof v)));
    check('shape: payloads carry only strings, numbers and booleans',
      shapes.length === 0, `non-scalar payloads: ${JSON.stringify(shapes)}`);
  }

  // --- the sanitiser itself, driven through the shipped module ---------
  {
    const page = await newPage(browser);
    await page.goto(`${base}/contact/`, { waitUntil: 'networkidle' });
    const sent = await page.evaluate(() => {
      const out = [];
      window.analyticsTracker = { trackEvent: (t, d) => out.push({ t, d }), trackPageView: () => {} };
      window.SSC.track('probe_pii', {
        model: 's4', name: 'Lee Salo', email: 'lee@example.com',
        message: 'a long free-text note', location: 'Squamish', ok: true,
      });
      // Two different limits, tested separately. A long STRING is cut by the
      // per-value cap; a payload with too many FIELDS is cut by the budget
      // loop. Testing only the first would leave the second unexercised while
      // looking like coverage.
      // A key nothing could have anticipated, carrying contact details.
      window.SSC.track('probe_novel_key', {
        model: 's4', detail: 'reach me at lee@example.com', ref: '+1 604 555 0134',
      });
      // The other half of the denylist contract: it must not eat legitimate
      // fields. `skipped` is one hero-hold event away from being real.
      window.SSC.track('probe_keep', {
        skipped: true, zip: 1234, userId: 'abc', url: 'https://example.com',
      });
      window.SSC.track('probe_string', { model: 's4', addon: 'y'.repeat(4000) });
      const wide = { model: 's4' };
      for (let i = 0; i < 60; i += 1) wide[`k${i}`] = 1234567;
      window.SSC.track('probe_budget', wide);
      return out;
    });
    const piiEvent = sent.find((e) => e.t === 'probe_pii');
    check('sanitiser: denied fields are dropped before they can leave the browser',
      piiEvent && !('name' in piiEvent.d) && !('email' in piiEvent.d)
      && !('message' in piiEvent.d) && !('location' in piiEvent.d)
      && piiEvent.d.model === 's4' && piiEvent.d.ok === true,
      `payload was ${JSON.stringify(piiEvent && piiEvent.d)}`);
    const novelEvent = sent.find((e) => e.t === 'probe_novel_key');
    check('sanitiser: contact details are dropped by SHAPE, under a key no denylist knows',
      novelEvent && !('detail' in novelEvent.d) && !('ref' in novelEvent.d)
      && novelEvent.d.model === 's4',
      `payload was ${JSON.stringify(novelEvent && novelEvent.d)}`);
    const keepEvent = sent.find((e) => e.t === 'probe_keep');
    check('sanitiser: short denied words are anchored, so skipped/zip survive',
      keepEvent && keepEvent.d.skipped === true && keepEvent.d.zip === 1234
      && !('userId' in keepEvent.d) && !('url' in keepEvent.d),
      `payload was ${JSON.stringify(keepEvent && keepEvent.d)}`);
    const stringEvent = sent.find((e) => e.t === 'probe_string');
    check('sanitiser: an over-long string value is capped, not passed through',
      stringEvent && typeof stringEvent.d.addon === 'string' && stringEvent.d.addon.length <= 48,
      `payload was ${JSON.stringify(stringEvent && stringEvent.d).slice(0, 120)}`);
    const budgetEvent = sent.find((e) => e.t === 'probe_budget');
    check('sanitiser: an over-budget payload is trimmed here, not silently emptied there',
      budgetEvent && JSON.stringify(budgetEvent.d).length <= SITE_BUDGET_CHARS
      && budgetEvent.d.model === 's4',
      `payload was ${JSON.stringify(budgetEvent && budgetEvent.d).slice(0, 120)}`);

    const absent = await page.evaluate(() => {
      delete window.analyticsTracker;
      let threw = false;
      let returned = null;
      try { returned = window.SSC.track('probe_absent', { model: 's4' }); } catch (e) { threw = true; }
      return { threw, returned };
    });
    check('absent tracker: degrades silently, and says so in its return value',
      absent.threw === false && absent.returned === false,
      `track() returned ${JSON.stringify(absent)}`);
    await page.close();
  }
}

// ============================================================
// A2. the real tracker -- stream separation and double counting
// ============================================================
async function runRealTracker(base, browser) {
  if (!fs.existsSync(TRACKER_SRC)) {
    check('real tracker: the ssc-ops checkout is available to test against', false,
      `${TRACKER_SRC} not found. The double-count scenarios cannot run against a `
      + 'stub -- the bug they guard lives in that file. Clone ssc-ops beside this repo.');
    return;
  }

  // --- contact form: one event, with a real interest -------------------
  {
    const page = await newRealTrackerPage(browser);
    await stubFormspree(page, 'success');
    await page.goto(`${base}/contact/`, { waitUntil: 'networkidle' });
    await page.fill('#name', PII.name);
    await page.fill('#email', PII.email);
    await page.selectOption('#project-type', 'commercial');
    await page.click('.contact-form button[type="submit"]');
    await page.waitForURL('**/contact/thank-you/');
    const events = await readEvents(page);

    const submissionEvents = events.filter(
      (e) => e.type === 'contact_submit_success' || e.type === 'form_submit');
    check('contact form: EXACTLY ONE submission event reaches the wire',
      submissionEvents.length === 1 && submissionEvents[0].type === 'contact_submit_success',
      `submission-class events were ${JSON.stringify(submissionEvents)}`);
    check('contact form: the interest is the value the visitor actually picked',
      submissionEvents[0] && submissionEvents[0].data.interest === 'commercial',
      `payload was ${JSON.stringify(submissionEvents[0] && submissionEvents[0].data)}`);
    check('contact form: the stream is marked as direct, not configurator fallback',
      submissionEvents[0] && submissionEvents[0].data.source === 'direct',
      `payload was ${JSON.stringify(submissionEvents[0] && submissionEvents[0].data)}`);
    check('contact form: no name or email travels with the event',
      !JSON.stringify(events).toLowerCase().includes(PII.email.toLowerCase())
      && !JSON.stringify(events).toLowerCase().includes(PII.name.toLowerCase()),
      `events were ${JSON.stringify(events)}`);
    await page.close();
  }

  // --- configurator: still one, still its own stream --------------------
  {
    const page = await newRealTrackerPage(browser);
    await stubFormspree(page, 'success');
    await openModal(page, base);
    await page.click('[data-action="request-quote"]');
    await fillStep2(page);
    await page.click('#quoteSubmit');
    await page.waitForSelector('#successStep', { state: 'visible' });
    const events = await readEvents(page);
    check('configurator: one quote_submit_success and zero form_submit, real tracker',
      typeOf(events, 'quote_submit_success').length === 1
      && typeOf(events, 'form_submit').length === 0,
      `events were ${JSON.stringify(events.map((e) => e.type))}`);
    await page.close();
  }
}

// ============================================================
// A3. the advisor guard
// ============================================================
async function runAdvisor(base, browser, { expectLive }) {
  const page = await newPage(browser);
  await page.route('**/.netlify/functions/advisor*', (route) => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ response: 'Sure.' }),
  }));
  await page.goto(`${base}/contact/`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.advisor__input');
  await page.fill('.advisor__input', 'backyard sauna please');
  await page.click('.advisor__submit');
  await page.waitForTimeout(600);
  const events = await readEvents(page);
  const live = typeOf(events, 'advisor_submit').length === 1;
  if (expectLive) {
    check('advisor: the rewired guard reaches the tracker that actually exists',
      live, `events were ${JSON.stringify(events)}`);
  }
  await page.close();
  return live;
}

// ============================================================
// B. mutations -- each of these MUST be detectable
// ============================================================
const MUTATIONS = [
  {
    name: 'M1 advisor guard re-deadened',
    proves: 'the dead-global guard cannot come back unnoticed',
    apply: (dir) => {
      enableAdvisor(dir);
      mutate(path.join(dir, 'js', 'advisor.js'),
        "if (window.SSC && typeof window.SSC.track === 'function') {\n        window.SSC.track(eventType, data);",
        'if (window.SSC && window.SSC.trackEvent) {\n        window.SSC.trackEvent(eventType, data);');
    },
    run: async (base, browser) => !(await runAdvisor(base, browser, { expectLive: false })),
  },
  {
    name: 'M2 double-count suppression removed',
    proves: 'a contact submission counted twice is detected',
    needsTracker: true,
    run: async (base, browser) => {
      const page = await newRealTrackerPage(browser);
      await stubFormspree(page, 'success');
      await page.goto(`${base}/contact/`, { waitUntil: 'networkidle' });
      await page.fill('#name', PII.name);
      await page.fill('#email', PII.email);
      await page.selectOption('#project-type', 'commercial');
      await page.click('.contact-form button[type="submit"]');
      await page.waitForURL('**/contact/thank-you/');
      const events = await readEvents(page);
      const submissionEvents = events.filter(
        (e) => e.type === 'contact_submit_success' || e.type === 'form_submit');
      await page.close();
      return submissionEvents.length !== 1;
    },
    apply: (dir) => mutate(path.join(dir, 'js', 'init.js'),
      'e.stopImmediatePropagation();', 'void 0;'),
  },
  {
    name: 'M3 privacy denylist disabled',
    proves: 'a payload carrying a name or an email is detected',
    apply: (dir) => mutate(path.join(dir, 'js', 'analytics.js'),
      'if (DENIED_SUBSTRINGS.some((bad) => k.indexOf(bad) !== -1)) return true;',
      'if (false && k) return true;'),
    run: async (base, browser) => {
      const page = await newPage(browser);
      await page.goto(`${base}/contact/`, { waitUntil: 'networkidle' });
      const payload = await page.evaluate(() => {
        let sent = null;
        window.analyticsTracker = { trackEvent: (t, d) => { sent = d; }, trackPageView: () => {} };
        // A plain name, deliberately: it is caught by the KEY denylist and by
        // nothing else, so this mutation tests the thing it claims to. An
        // email address would still be stopped by the value-side guard and
        // the mutation would look detected for the wrong reason.
        window.SSC.track('probe_pii', { model: 's4', name: 'Lee Salo' });
        return sent;
      });
      await page.close();
      return !!(payload && 'name' in payload);
    },
  },
  {
    name: 'M4 payload budget removed',
    proves: 'an oversized payload -- which the server empties in silence -- is detected',
    apply: (dir) => mutate(path.join(dir, 'js', 'analytics.js'),
      'const MAX_PAYLOAD_CHARS = 500;', 'const MAX_PAYLOAD_CHARS = 999999;'),
    run: async (base, browser) => {
      const page = await newPage(browser);
      await page.goto(`${base}/contact/`, { waitUntil: 'networkidle' });
      const size = await page.evaluate(() => {
        let sent = null;
        window.analyticsTracker = { trackEvent: (t, d) => { sent = d; }, trackPageView: () => {} };
        const wide = { model: 's4' };
        for (let i = 0; i < 60; i += 1) wide[`k${i}`] = 1234567;
        window.SSC.track('probe_budget', wide);
        return JSON.stringify(sent).length;
      });
      await page.close();
      return size > SITE_BUDGET_CHARS;
    },
  },
  {
    name: 'M5 total left as rendered text',
    proves: 'a total the events table cannot add up is detected',
    apply: (dir) => mutate(path.join(dir, 'js', 'analytics.js'),
      'const digits = text.replace(/[^0-9.]/g, \'\');',
      'if (text) return text; const digits = text.replace(/[^0-9.]/g, \'\');'),
    run: async (base, browser) => {
      const page = await newPage(browser);
      await stubFormspree(page, 'success');
      await openModal(page, base);
      await page.click('[data-action="request-quote"]');
      const events = await readEvents(page);
      await page.close();
      const step2 = one(events, 'quote_step2_view');
      return !step2 || typeof step2.data.total !== 'number';
    },
  },
  {
    // The W2a proof, made permanent. This is the exact defect Razor found:
    // #quoteForm lives inside .modal-addons, so the looser selector binds
    // step 2's own fields as configurator options.
    name: 'M6 option listener widened back over #quoteForm',
    proves: 'phantom option-change events from step 2 fields are detected',
    apply: (dir) => mutate(path.join(dir, 'js', 'modal.js'),
      ".modal-addons .addon-option input')", ".modal-addons input')"),
    run: async (base, browser) => {
      const page = await newPage(browser);
      await stubFormspree(page, 'success');
      await openModal(page, base);
      await page.click('.modal-addons input[data-addon="wifi"]');
      await page.click('[data-action="request-quote"]');
      await fillStep2(page);
      await page.click('#quoteSubmit');
      await page.waitForSelector('#successStep', { state: 'visible' });
      await page.waitForTimeout(900);
      const events = await readEvents(page);
      await page.close();
      const expected = [
        'configurator_open', 'configurator_option_change', 'quote_step2_view',
        'quote_submit_attempt', 'quote_submit_success',
      ];
      return JSON.stringify(events.map((e) => e.type)) !== JSON.stringify(expected);
    },
  },
  {
    name: 'M7 per-open option ceiling raised',
    proves: 'an uncapped option-change stream is detected',
    apply: (dir) => mutate(path.join(dir, 'js', 'modal.js'),
      'const OPTION_EVENT_CAP = 12;', 'const OPTION_EVENT_CAP = 9999;'),
    run: async (base, browser) => {
      const page = await newPage(browser);
      await openModal(page, base);
      for (let i = 0; i < 15; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        await page.click('.modal-addons input[data-addon="wifi"]');
        // eslint-disable-next-line no-await-in-loop
        await page.waitForTimeout(600);
      }
      const events = await readEvents(page);
      await page.close();
      return typeOf(events, 'configurator_option_change').length !== 12;
    },
  },
  {
    name: 'M8 value-side contact guard disabled',
    proves: 'free text carrying an email under an innocent key is detected',
    apply: (dir) => mutate(path.join(dir, 'js', 'analytics.js'),
      'return EMAIL_SHAPE.test(value) || PHONE_SHAPE.test(value);',
      'return false && value;'),
    run: async (base, browser) => {
      const page = await newPage(browser);
      await page.goto(`${base}/contact/`, { waitUntil: 'networkidle' });
      const payload = await page.evaluate(() => {
        let sent = null;
        window.analyticsTracker = { trackEvent: (t, d) => { sent = d; }, trackPageView: () => {} };
        window.SSC.track('probe_novel_key', { detail: 'reach me at lee@example.com' });
        return sent;
      });
      await page.close();
      return !!(payload && 'detail' in payload);
    },
  },
  // ---- B1, the held hero ------------------------------------------------
  //
  // These five were run by hand during review and discriminate; encoded here
  // because this section's own contract is that EVERY assertion above has a
  // mutation proving it can fail, and five fixtures had arrived without one.
  // A fixture nobody has ever seen go red is a decoration with a green tick.
  {
    name: 'M9 hero hold token changed without its constants',
    proves: 'a --hero-hold that no longer agrees with SETTLE_MS is detected',
    apply: (dir) => mutate(path.join(dir, 'styles.css'),
      '--hero-hold: 1600ms;', '--hero-hold: 1200ms;'),
    run: async (base, browser) => {
      const page = await newPage(browser);
      await page.goto(base, { waitUntil: 'load' });
      await page.waitForFunction(
        () => document.documentElement.classList.contains('reveal-ready'));
      // Three terms now, not two. The hold left `transition-delay` for the
      // reveal clock, so the token's effect on the page arrives through
      // SSC.reveal.holdMs -- which is exactly the path this mutation has to
      // travel down for the single-source claim to still mean anything.
      const agrees = await page.evaluate(() => {
        const ms = (v) => (String(v).trim().endsWith('ms')
          ? parseFloat(v) : parseFloat(v) * 1000);
        const hold = ms(getComputedStyle(document.documentElement)
          .getPropertyValue('--hero-hold'));
        const cs = getComputedStyle(document.querySelector('.hero-content'));
        return window.SSC.reveal.holdMs === hold
          && hold + ms(cs.transitionDelay.split(',')[0])
            + ms(cs.transitionDuration.split(',')[0]) === 2720;
      });
      await page.close();
      return !agrees;
    },
  },
  {
    name: 'M10 hero image put back in the load-in group',
    proves: 'the LCP element being withheld behind a reveal is detected',
    apply: (dir) => mutate(path.join(dir, 'js', 'animations.js'),
      "                document.querySelector('nav'),\n"
      + "                document.querySelector('.hero-content'),",
      "                document.querySelector('.hero-image'),\n"
      + "                document.querySelector('nav'),"),
    run: async (base, browser) => {
      const page = await newPage(browser);
      await page.goto(base, { waitUntil: 'load' });
      await page.waitForFunction(
        () => document.documentElement.classList.contains('reveal-ready'));
      const hasReveal = await page.evaluate(
        () => document.querySelector('.hero-image').classList.contains('reveal'));
      await page.close();
      return hasReveal;
    },
  },
  {
    name: 'M11 escape hatch never bound',
    proves: 'a held beat that cannot be interrupted by Tab is detected',
    apply: (dir) => mutate(path.join(dir, 'js', 'init.js'),
      'SSC.initHoldEscape();', 'void SSC.initHoldEscape;'),
    // `opacity !== 1` at 100ms was the old discriminator and it stopped being
    // one the moment the cancel became a 350ms fade: at 100ms an UNMUTATED page
    // is mid-fade at roughly 0.5, so the mutation would have "detected" a build
    // with nothing wrong with it. A mutation that fires either way is worse
    // than no mutation, because it reads as coverage.
    //
    // Read at 800ms instead, which is past the longest legitimate fade and
    // still 800ms clear of the 1600ms hold. Unbound, the nav is exactly 0 there
    // because the beat is simply still running.
    run: async (base, browser) => {
      const page = await newPage(browser);
      await page.goto(base, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(200);
      await page.keyboard.press('Tab');
      await page.waitForTimeout(600);
      const opacity = await page.evaluate(
        () => parseFloat(getComputedStyle(document.querySelector('nav')).opacity));
      await page.close();
      return opacity === 0;
    },
  },
  {
    name: 'M12 choreography clock origin displaced',
    proves: 'the branch boundary drifting off the choreography clock is detected',
    // The historical bug was the metric timing from DOMContentLoaded, and that
    // is NOT what this mutation reproduces -- deliberately. The DCL-to-
    // reveal-ready gap is environment-dependent (53-168ms measured; the low end
    // is barely three frames), so mutating to the literal old behaviour
    // discriminates on a slow machine and not on a fast one: it failed 2 runs
    // in 3 here. A mutation that only sometimes fires is worse than none,
    // because it teaches the next person to re-run until it is quiet.
    //
    // So the clock ORIGIN is displaced by a flat quarter second instead. That
    // is the general defect the fixture claims to catch -- the metric counting
    // from an instant that is not the one the delays count from -- tested at a
    // magnitude that cannot hide inside the tolerance. The specific historical
    // instance is a member of that class.
    apply: (dir) => mutate(path.join(dir, 'js', 'animations.js'),
      'this.startedAt = Date.now();',
      'this.startedAt = Date.now() - 250;'),
    run: async (base, browser) => {
      const page = await newPage(browser);
      await page.addInitScript(HERO_CLOCK_PROBE);
      await page.goto(base, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => window.__tReady !== null);
      await page.waitForTimeout(400);
      await page.evaluate(() => window.scrollTo({ top: 600, behavior: 'instant' }));
      await page.waitForTimeout(200);
      const marks = await page.evaluate(
        () => ({ ready: window.__tReady, trigger: window.__tTrigger }));
      const events = await readEvents(page);
      const ev = one(events, 'hero_hold_skipped') || one(events, 'hero_hold_complete');
      await page.close();
      if (!ev || marks.trigger === null) return true;
      return Math.abs(ev.data.ms - (marks.trigger - marks.ready)) > 34;
    },
  },
  {
    name: 'M13 reduced-motion abstention removed',
    proves: 'a visitor who was never held voting on the hold is detected',
    apply: (dir) => mutate(path.join(dir, 'js', 'animations.js'),
      '        if (prefersReducedMotion()) return;\n\n        let reported = false;',
      '        if (false) return;\n\n        let reported = false;'),
    run: async (base, browser) => {
      const { page, close } = await newEmulatedPage(browser, { reducedMotion: 'reduce' });
      await page.goto(base, { waitUntil: 'domcontentloaded' });
      await page.mouse.wheel(0, 600);
      await page.waitForTimeout(300);
      const events = await readEvents(page);
      await close();
      return typeOf(events, 'hero_hold_skipped').length
        + typeOf(events, 'hero_hold_complete').length > 0;
    },
  },
  // ---- the hold, now that it lives in the reveal clock -------------------
  //
  // While the hold was a `transition-delay`, the agreement fixture's computed
  // read was proof it happened: the browser had resolved the cascade and there
  // was no further step to get wrong. A scheduled grant has three further steps
  // -- arm the timer, arm it at the right length, and keep the observer's hands
  // off the held pair -- and a computed style can see none of them. These three
  // mutations are one per step, and all three are caught by the same new
  // behavioural fixture, which is the point: that fixture is now the only thing
  // standing between the site and a homepage with no hold at all.
  {
    name: 'M14 hold scheduled at zero',
    proves: 'a beat that is armed but never actually waited out is detected',
    apply: (dir) => mutate(path.join(dir, 'js', 'animations.js'),
      'const remaining = Math.max(0, this.holdMs - elapsed);',
      'const remaining = 0;'),
    run: async (base, browser) => {
      const page = await newPage(browser);
      await page.goto(base, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(900);
      const opacity = await page.evaluate(
        () => parseFloat(getComputedStyle(document.querySelector('nav')).opacity));
      await page.close();
      return opacity !== 0;
    },
  },
  {
    name: 'M15 escape release drops the short duration',
    proves: 'a cancel that fades at the FULL reveal length is detected',
    // The failure this guards is the one the previous two attempts shipped: the
    // hatch fires, the classes are right, and the fade still runs at 1000ms.
    apply: (dir) => mutate(path.join(dir, 'js', 'animations.js'),
      'this.compose(heldTargets(), true);',
      'this.compose(heldTargets(), false);'),
    run: async (base, browser) => {
      const page = await newPage(browser);
      await page.addInitScript(NAV_FADE_PROBE);
      await page.goto(base, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(200);
      await page.keyboard.press('Tab');
      await page.waitForTimeout(800);
      const f = await page.evaluate(() => window.__fade);
      await page.close();
      if (f.key === null) return true;
      const done = f.samples.filter((s) => s.t >= f.key).find((s) => s.o >= 0.999);
      return !done || done.t - f.key > 500;
    },
  },
  {
    name: 'M16 held pair handed back to the intersection observer',
    proves: 'the hold being composed away on the observer\'s first callback is detected',
    // The subtlest of the three, and the easiest to reintroduce by tidying:
    // the held pair carries `.reveal` like everything else, so an observer that
    // is not told to skip it grants `.seen` on its first callback -- the pair is
    // above the fold -- and the scheduled grant then lands 1600ms later on
    // elements that have already arrived. Nothing errors. There is just no hold.
    apply: (dir) => mutate(path.join(dir, 'js', 'animations.js'),
      'if (isHeld.has(el)) return;',
      'if (false && isHeld.has(el)) return;'),
    run: async (base, browser) => {
      const page = await newPage(browser);
      await page.goto(base, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(900);
      const opacity = await page.evaluate(
        () => parseFloat(getComputedStyle(document.querySelector('nav')).opacity));
      await page.close();
      return opacity !== 0;
    },
  },
];

// ============================================================
// Run
// ============================================================
(async () => {
  let browser;
  const sites = [];
  try {
    browser = await chromium.launch();

    process.stdout.write('\nA. the event set as wired\n\n');
    const baseline = await bootSite(null);
    sites.push(baseline);
    await runInventory(baseline.base, browser);

    process.stdout.write('\nA2. the real shared tracker: stream separation\n\n');
    await runRealTracker(baseline.base, browser);

    process.stdout.write('\nA3. the advisor guard, with the feature flag on\n\n');
    const advisorSite = await bootSite(enableAdvisor);
    sites.push(advisorSite);
    await runAdvisor(advisorSite.base, browser, { expectLive: true });

    process.stdout.write('\nB. mutations -- each of these MUST be detectable\n\n');
    for (const m of MUTATIONS) {
      if (m.needsTracker && !fs.existsSync(TRACKER_SRC)) {
        check(`${m.name}: ${m.proves}`, false, 'ssc-ops checkout missing; mutation not run');
        continue;
      }
      // eslint-disable-next-line no-await-in-loop
      const site = await bootSite(m.apply);
      sites.push(site);
      // eslint-disable-next-line no-await-in-loop
      const detected = await m.run(site.base, browser);
      check(`${m.name}: ${m.proves}`, detected,
        'the mutation was applied and the suite did not notice. The corresponding '
        + 'assertion in scenario A is decoration -- fix it rather than deleting this.');
    }
  } catch (err) {
    failures += 1;
    process.stdout.write(`\n  ERROR  ${err.stack}\n`);
  } finally {
    if (browser) await browser.close();
    for (const s of sites) {
      s.server.close();
      fs.rmSync(s.dir, { recursive: true, force: true });
    }
  }

  process.stdout.write(`\n${passes} passed, ${failures} failed\n`);
  process.exit(failures ? 1 : 0);
})();
