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

const readEvents = (page) => page.evaluate(
  () => JSON.parse(sessionStorage.getItem('__ssc_events') || '[]'));

/**
 * A page with the tracker STUBBED. Used for everything except the double-count
 * scenarios: it observes what the site asks the tracker to send.
 */
async function newPage(browser) {
  const page = await browser.newPage();
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
  {
    const page = await newPage(browser);
    // domcontentloaded, NOT networkidle: the hero carries heavy media and
    // network idle on this page can arrive after the hold has already
    // auto-revealed at 5s -- which is how this scenario silently measured the
    // wrong branch the first two times it was run. The hold starts when the
    // intro initialises, so that is what we wait for.
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('body.hero-locked');
    // ArrowDown, not mouse.wheel: the hold blocks scrolling with a
    // preventDefault-ing wheel listener, and Playwright's wheel helper waits
    // for a scroll that by design never comes -- it hangs past the 5s
    // auto-reveal and the test ends up measuring the wrong branch. A key press
    // is a real visitor gesture and takes the same code path.
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(200);
    const events = await readEvents(page);
    const skipped = one(events, 'hero_hold_skipped');
    check('hero_hold_skipped: a gesture during the hold reports the ms given to it',
      !!skipped && typeof skipped.data.ms === 'number'
      && typeOf(events, 'hero_hold_complete').length === 0,
      `events were ${JSON.stringify(events)}`);
    collected.push(...events);
    await page.close();
  }
  {
    const page = await newPage(browser);
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('body.hero-locked');
    // The hold ends itself at 5s when nobody touches it. That is the
    // "watched it" case, and it is the only way to observe it.
    await page.waitForTimeout(5600);
    const events = await readEvents(page);
    check('hero_hold_complete: the unattended hold reports as complete, once',
      typeOf(events, 'hero_hold_complete').length === 1
      && typeOf(events, 'hero_hold_skipped').length === 0,
      `events were ${JSON.stringify(events)}`);
    collected.push(...events);
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
      'return DENIED_KEYS.some((bad) => k.indexOf(bad) !== -1);',
      'return false && k;'),
    run: async (base, browser) => {
      const page = await newPage(browser);
      await page.goto(`${base}/contact/`, { waitUntil: 'networkidle' });
      const payload = await page.evaluate(() => {
        let sent = null;
        window.analyticsTracker = { trackEvent: (t, d) => { sent = d; }, trackPageView: () => {} };
        window.SSC.track('probe_pii', { model: 's4', email: 'lee@example.com' });
        return sent;
      });
      await page.close();
      return !!(payload && 'email' in payload);
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
