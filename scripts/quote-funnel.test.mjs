#!/usr/bin/env node
/**
 * Fixture for the configurator quote funnel (WP-0b-i).
 *
 *   npm run quote-funnel:test
 *
 * WHAT IS UNDER TEST
 *
 * The path from "I want this one" to a submission in Lee's inbox. Before this
 * package that path did not exist: the button performed a navigation, and the
 * site received zero configurator submissions in its entire history against
 * ~201 contact-form emails. Nothing detected that, because nothing was watching
 * the funnel end to end -- every individual piece worked.
 *
 * So this fixture watches the funnel end to end, in a real browser, against the
 * real built site, driven by real clicks and real keystrokes. It does not call
 * functions directly and it does not re-implement any of the logic it checks. A
 * test that pokes `modalManager.submitQuote()` proves the method runs; it does
 * not prove a visitor can reach it.
 *
 * WHAT IT COVERS
 *
 * Every state in the spec, each one reached the way a visitor reaches it:
 * configure, send, sending, success, failure, client-side validation failure,
 * double-submit, offline, rate-limited, closed mid-step-2, the /contact/
 * fallback, plus storage expiry, the stale price-sheet stamp, the honeypot, the
 * subject-line contract, a keyboard-only walk, and the single-source endpoint.
 *
 * The network is stubbed at the browser, never at the module boundary. Success,
 * failure, 429 and offline are produced by making the actual fetch behave that
 * way, so the code under test takes exactly the branch it would take in the
 * field. The one thing no stub can prove -- that Formspree accepts the payload
 * -- was verified by a real submission during the relay and recorded in the
 * report, not here: a fixture that posts to production every run is a fixture
 * that burns the monthly quota.
 *
 * MUTATION IS BUILT IN, NOT A RITUAL
 *
 * Three of these behaviours are invisible when they break -- a record that
 * never expires, a stale-price note that never shows, a honeypot that quietly
 * stops being posted. All three would look exactly like a passing suite. So the
 * suite tampers with the source and re-runs: scenario M must FAIL to observe
 * the behaviour once the mechanism is removed. If a mutation stops being
 * detectable, the run fails on the spot rather than going quietly green.
 *
 * If a mutation regex stops matching, the run throws. A mutation that silently
 * fails to apply would make its scenario "pass" for the wrong reason and retire
 * the only thing giving the other half its meaning.
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

/** Directories never copied into the scratch site (mirrors package-claim.test.mjs). */
const SKIP = new Set(['node_modules', '.git', 'dist', '_site', '.visual-diff', '.probe', 'tmp', '.env']);

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.xml': 'application/xml',
  '.webmanifest': 'application/json', '.txt': 'text/plain',
};

const STORAGE_KEY = 'ssc_quote_config';
const MODEL = 's4';

let failures = 0;
let passes = 0;

function check(name, condition, detail) {
  if (condition) { passes += 1; process.stdout.write(`  PASS  ${name}\n`); }
  else { failures += 1; process.stdout.write(`  FAIL  ${name}\n        ${detail}\n`); }
}

function scratchSite() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ssc-quote-funnel-'));
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
 * Throws unless the pattern matches exactly once -- see the header.
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
 * A page with the analytics tracker stubbed and Formspree under our control.
 *
 * The real tracker is cross-origin and unreachable from a local build, so it is
 * replaced with a recorder BEFORE any site script runs. That also makes the
 * call-site check meaningful: `window.analyticsTracker` is exactly the global
 * the tracker publishes, and the site's previous near-miss called
 * `window.SSC.trackEvent`, which nothing has ever assigned.
 */
async function newPage(browser) {
  const page = await browser.newPage();
  // The real tracker must not load. It is cross-origin, it publishes its own
  // window.analyticsTracker on top of the recorder below, and a passing suite
  // would then be quietly posting test events at the production endpoint.
  await page.route('**ssc-ops.netlify.app/**', (route) => route.abort());
  await page.addInitScript(() => {
    window.__events = [];
    window.analyticsTracker = {
      trackEvent: (type, data) => window.__events.push({ type, data }),
      trackPageView: () => {},
    };
  });
  page.__posts = [];
  return page;
}

/** Route Formspree to a given outcome and record every attempt. */
async function stubFormspree(page, outcome) {
  await page.unroute('**/formspree.io/**').catch(() => {});
  await page.route('**/formspree.io/**', async (route) => {
    page.__posts.push({
      url: route.request().url(),
      body: route.request().postData() || '',
      headers: route.request().headers(),
    });
    if (outcome === 'abort') return route.abort();
    if (outcome === 429) {
      return route.fulfill({ status: 429, contentType: 'application/json', body: JSON.stringify({ error: 'Too many requests' }) });
    }
    if (outcome === 'field-error') {
      return route.fulfill({
        status: 422,
        contentType: 'application/json',
        body: JSON.stringify({ errors: [{ message: 'Email is invalid', field: 'email', code: 'TYPE_EMAIL' }] }),
      });
    }
    if (outcome === 'slow-success') {
      await new Promise((r) => setTimeout(r, 400));
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

const fillStep2 = async (page, over = {}) => {
  await page.fill('#quoteName', over.name ?? 'Relay Verification');
  await page.fill('#quoteEmail', over.email ?? 'relay@example.com');
  await page.fill('#quoteLocation', over.location ?? 'Squamish');
};

/** Click an addon by its visible label, exactly as a customer does. */
const pick = (page, label) => page.evaluate((wanted) => {
  const option = [...document.querySelectorAll('.modal-addons .addon-option')]
    .find((o) => o.querySelector('.addon-label')?.textContent.trim() === wanted);
  if (!option) throw new Error(`configurator has no option labelled "${wanted}"`);
  const input = option.querySelector('input');
  if (input.disabled) throw new Error(`option "${wanted}" is disabled`);
  input.click();
}, label);

const readStore = (page) => page.evaluate((k) => {
  const raw = localStorage.getItem(k);
  return raw ? JSON.parse(raw) : null;
}, STORAGE_KEY);

// ============================================================
// The state walk
// ============================================================
async function runStates(base, browser) {
  // --- configure -------------------------------------------------------
  {
    const page = await newPage(browser);
    await openModal(page, base);
    const label = (await page.textContent('[data-action="request-quote"]')).trim();
    check('configure: step 1 button reads "Request This Quote"',
      label === 'Request This Quote', `read ${JSON.stringify(label)}`);
    check('configure: the dialog announces itself as one',
      await page.getAttribute('#saunaModal', 'role') === 'dialog'
      && await page.getAttribute('#saunaModal', 'aria-modal') === 'true'
      && await page.getAttribute('#saunaModal', 'aria-hidden') === 'false',
      'role/aria-modal/aria-hidden not all set on the open dialog');
    check('configure: step 2 is not reachable yet',
      !(await page.isVisible('#quoteForm')), 'the send form is visible on step 1');
    await page.close();
  }

  // --- send ------------------------------------------------------------
  {
    const page = await newPage(browser);
    await openModal(page, base);
    await pick(page, 'Kuuma Banya (Wood-fired)');
    const totalBefore = await page.textContent('#summaryTotal');
    const urlBefore = page.url();

    await page.click('[data-action="request-quote"]');
    await page.waitForSelector('#quoteForm', { state: 'visible' });

    check('send: transitions in place, nothing navigates',
      page.url() === urlBefore, `url moved to ${page.url()}`);
    check('send: the price summary survives the transition',
      await page.isVisible('#summaryTotal')
      && (await page.textContent('#summaryTotal')) === totalBefore,
      'the summary is gone or changed between steps');
    check('send: step 1 inputs are hidden but still mounted',
      await page.evaluate(() => {
        const step = document.getElementById('configureStep');
        return step.hidden && step.querySelectorAll('input').length > 0;
      }), 'configureStep was unmounted or left visible');
    check('send: focus lands in the form',
      await page.evaluate(() => document.activeElement.id) === 'quoteName',
      'focus was not moved to the first field');
    check('send: all five fields are present',
      await page.evaluate(() => ['quoteName', 'quoteEmail', 'quoteLocation', 'quoteAccess', 'quoteNotes']
        .every((id) => !!document.getElementById(id))),
      'the step 2 field set is incomplete');
    check('send: the US-processor disclosure and privacy link sit at the point of send',
      (await page.textContent('.quote-privacy-note')).includes('US form processor')
      && await page.getAttribute('.quote-privacy-note a', 'href') === '/privacy/',
      'the transfer disclosure or its privacy link is missing');
    check('send: the storage notice states the 7 days beside start over',
      (await page.textContent('.quote-storage-note')).includes('saved on this device for 7 days')
      && await page.isVisible('[data-action="quote-start-over"]'),
      'the retention notice or the eraser is missing');

    const stored = await readStore(page);
    check('send: the configuration is stored on ENTERING step 2',
      !!stored && stored.modelId === MODEL && stored.summary.includes('Kuuma Banya'),
      `stored record was ${JSON.stringify(stored)}`);

    // "Change something" must return to exactly what was left.
    await page.click('[data-action="quote-back"]');
    await page.waitForSelector('#configureStep', { state: 'visible' });
    check('send: "Change something" returns with every choice intact',
      await page.evaluate(() => {
        const opt = [...document.querySelectorAll('.modal-addons .addon-option')]
          .find((o) => o.querySelector('.addon-label')?.textContent.trim() === 'Kuuma Banya (Wood-fired)');
        return opt.querySelector('input').checked;
      }), 'the selection was lost going back to step 1');
    await page.close();
  }

  // --- the step transition, both ways ---------------------------------
  {
    const page = await newPage(browser);
    await openModal(page, base);
    await page.click('[data-action="request-quote"]');
    await page.waitForSelector('#sendStep', { state: 'visible' });
    check('motion: the incoming panel is animated in, not snapped in',
      await page.evaluate(() => {
        const el = document.getElementById('sendStep');
        return el.classList.contains('quote-step--entering')
          || getComputedStyle(el).animationName === 'quoteStepIn';
      }), 'the step change had no choreography at default motion settings');
    await page.close();

    // Reduced motion is a refusal, and it must be honoured without making the
    // flow slower for the people who asked.
    const still = await browser.newPage();
    await still.route('**ssc-ops.netlify.app/**', (route) => route.abort());
    await still.emulateMedia({ reducedMotion: 'reduce' });
    await openModal(still, base);
    await still.click('[data-action="request-quote"]');
    check('motion: under prefers-reduced-motion the swap is instant',
      await still.evaluate(() => {
        const el = document.getElementById('sendStep');
        return !el.hidden && getComputedStyle(el).animationName === 'none';
      }), 'a keyframe ran for a visitor who asked for stillness');
    await still.close();
  }

  // --- validation failure ---------------------------------------------
  {
    const page = await newPage(browser);
    await stubFormspree(page, 'success');
    await openModal(page, base);
    await page.click('[data-action="request-quote"]');
    await page.click('#quoteSubmit');

    check('validation: nothing is sent with the form empty',
      page.__posts.length === 0, `${page.__posts.length} request(s) went out`);
    check('validation: the error is inline and focus goes to the offending field',
      await page.isVisible('#quoteNameError')
      && await page.evaluate(() => document.activeElement.id) === 'quoteName'
      && await page.getAttribute('#quoteName', 'aria-invalid') === 'true',
      'no inline error, or focus was not moved to the first invalid field');

    await page.fill('#quoteName', 'Relay Verification');
    await page.fill('#quoteEmail', 'not-an-email');
    await page.click('#quoteSubmit');
    check('validation: a malformed email is caught before the network',
      await page.isVisible('#quoteEmailError') && page.__posts.length === 0,
      'a malformed email either passed or was posted');

    await page.fill('#quoteEmail', 'relay@example.com');
    await page.click('#quoteSubmit');
    check('validation: location is required -- an unlocatable lead is unquotable',
      await page.isVisible('#quoteLocationError') && page.__posts.length === 0,
      'the form submitted without a location');
    await page.close();
  }

  // --- sending + double-submit ----------------------------------------
  {
    const page = await newPage(browser);
    await stubFormspree(page, 'slow-success');
    await openModal(page, base);
    await page.click('[data-action="request-quote"]');
    await fillStep2(page);

    await page.click('#quoteSubmit');
    await page.waitForFunction(() => document.getElementById('quoteSubmit').disabled);
    check('sending: the button is disabled and says so while in flight',
      await page.evaluate(() => {
        const b = document.getElementById('quoteSubmit');
        return b.disabled && /Sending/.test(b.textContent);
      }), 'the submit button did not enter the sending state');

    // Second and third attempts mid-flight, by click and by keyboard -- a
    // keyboard Enter can outrun a disabled attribute.
    await page.evaluate(() => document.getElementById('quoteSubmit').click());
    await page.evaluate(() => document.getElementById('quoteForm')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    await page.waitForSelector('#successStep', { state: 'visible' });
    check('double-submit: exactly one request leaves, however hard you press',
      page.__posts.length === 1, `${page.__posts.length} requests were sent`);
    await page.close();
  }

  // --- success ---------------------------------------------------------
  {
    const page = await newPage(browser);
    await stubFormspree(page, 'success');
    await openModal(page, base);
    await pick(page, 'U-Shaped benches');
    await pick(page, 'WiFi heater controller');
    await page.click('[data-action="request-quote"]');
    await fillStep2(page, { location: 'Whistler' });
    await page.selectOption('#quoteAccess', 'crane');
    check('send: the access helper teaches without adding a field',
      await page.isVisible('#quoteAccessHelper')
      && (await page.textContent('#quoteAccessHelper')).length > 0,
      'the conditional microcopy did not appear');

    const urlBefore = page.url();
    await page.click('#quoteSubmit');
    await page.waitForSelector('#successStep', { state: 'visible' });

    check('success: rendered in place, still no navigation',
      page.url() === urlBefore, `url moved to ${page.url()}`);
    check('success: the form is gone and the confirmation is honest about the reply time',
      !(await page.isVisible('#quoteForm'))
      && (await page.textContent('#successStep')).includes('within three business days, usually the next day'),
      'the success panel is missing its reply-time promise');
    check('success: no confirmation email is claimed while the flag is false',
      !/inbox/i.test(await page.textContent('#successStep')),
      'the success copy claims an email that Formspree is not configured to send');
    check('success: focus moves to the confirmation',
      await page.evaluate(() => document.activeElement.className.includes('quote-success-heading')),
      'focus was left behind on the submitted form');
    check('success: the saved record is cleared, and only here',
      await readStore(page) === null, 'the stored configuration outlived a successful submit');
    check('success: the retention notice goes with the record it describes',
      !(await page.isVisible('.quote-storage-note')),
      'the page still promises 7 days of saved progress after clearing it');

    const body = new URLSearchParams(page.__posts[0].body);
    check('success: the request declares Accept: application/json',
      /application\/json/.test(page.__posts[0].headers.accept || ''),
      'without this header Formspree answers with a redirect, not JSON');
    check('serialisation: one composed configuration blob carries every choice',
      body.get('configuration').includes('U-Shaped benches')
      && body.get('configuration').includes('WiFi heater controller')
      && body.get('configuration').includes('No changing room'),
      `blob was ${JSON.stringify(body.get('configuration'))}`);
    check('serialisation: the five named fields are all posted',
      ['name', 'email', 'location', 'site_access', 'notes'].every((f) => body.has(f))
      && body.get('location') === 'Whistler' && body.get('site_access') === 'crane',
      'a step 2 field is missing from the payload');
    check('serialisation: the subject is the arbitrated string, location included',
      /^Configurator Quote — S4 Standard Sauna — \$[\d,]+ — Whistler$/.test(body.get('_subject'))
      && body.get('subject') === body.get('_subject'),
      `_subject was ${JSON.stringify(body.get('_subject'))}`);
    check('honeypot: _gotcha is posted, empty, and unreachable by tab',
      body.has('_gotcha') && body.get('_gotcha') === ''
      && await page.evaluate(() => document.querySelector('[name="_gotcha"]').tabIndex === -1),
      'the honeypot is absent, pre-filled, or in the tab order');

    const events = await page.evaluate(() => window.__events);
    check('events: quote_submit_success fires, compactly',
      events.length === 1 && events[0].type === 'quote_submit_success'
      && JSON.stringify(events[0].data).length < 200,
      `events were ${JSON.stringify(events)}`);
    await page.close();
  }

  // --- failure ---------------------------------------------------------
  {
    const page = await newPage(browser);
    await stubFormspree(page, 'abort');
    await openModal(page, base);
    await page.click('[data-action="request-quote"]');
    await fillStep2(page, { name: 'Kept Intact' });
    await page.fill('#quoteNotes', 'south side of the driveway');
    await page.click('#quoteSubmit');
    await page.waitForSelector('#quoteError', { state: 'visible' });

    check('failure: the form stays mounted with every value intact',
      await page.isVisible('#quoteForm')
      && await page.inputValue('#quoteName') === 'Kept Intact'
      && await page.inputValue('#quoteNotes') === 'south side of the driveway',
      'the form was reset or unmounted on failure');
    check('failure: the button comes back so it can be retried',
      await page.evaluate(() => !document.getElementById('quoteSubmit').disabled),
      'the submit button stayed disabled after a failure');
    check('failure: the saved record is NOT cleared',
      (await readStore(page)) !== null, 'a failed send threw away the configuration');

    const mailto = await page.getAttribute('.quote-error__mailto', 'href');
    check('failure: the mailto fallback carries the whole configuration',
      mailto.startsWith('mailto:') && decodeURIComponent(mailto).includes('Estimated Total')
      && decodeURIComponent(mailto).includes('S4 Standard Sauna'),
      `mailto was ${mailto}`);

    // A retry after the network comes back must succeed from the same state.
    await stubFormspree(page, 'success');
    await page.click('#quoteSubmit');
    await page.waitForSelector('#successStep', { state: 'visible' });
    check('failure: a retry from the failed state succeeds',
      await readStore(page) === null, 'the retry did not complete the funnel');
    await page.close();
  }

  // --- field errors from Formspree ------------------------------------
  {
    const page = await newPage(browser);
    await stubFormspree(page, 'field-error');
    await openModal(page, base);
    await page.click('[data-action="request-quote"]');
    await fillStep2(page);
    await page.click('#quoteSubmit');
    await page.waitForSelector('#quoteError', { state: 'visible' });
    check('failure: a Formspree field error is surfaced, not swallowed',
      (await page.textContent('#quoteError')).includes('Email is invalid'),
      'the errors[] body was discarded and replaced with a generic message');
    await page.close();
  }

  // --- rate limited ----------------------------------------------------
  {
    const page = await newPage(browser);
    await stubFormspree(page, 429);
    await openModal(page, base);
    await page.click('[data-action="request-quote"]');
    await fillStep2(page);
    await page.click('#quoteSubmit');
    await page.waitForSelector('#quoteError', { state: 'visible' });
    const text = await page.textContent('#quoteError');
    check('rate limit: a 429 is distinguished from a generic failure',
      /lot of requests/i.test(text) && /minute/i.test(text),
      `the 429 branch produced ${JSON.stringify(text)} -- status is the ONLY signal, `
      + 'Formspree publishes no rate-limit error code');
    check('rate limit: the form survives it',
      await page.isVisible('#quoteForm') && (await readStore(page)) !== null,
      'a rate limit lost the configuration');
    await page.close();
  }

  // --- offline ---------------------------------------------------------
  {
    const page = await newPage(browser);
    await stubFormspree(page, 'success');
    await openModal(page, base);
    await page.click('[data-action="request-quote"]');
    await fillStep2(page);
    await page.evaluate(() => Object.defineProperty(navigator, 'onLine', { get: () => false, configurable: true }));
    await page.click('#quoteSubmit');
    await page.waitForSelector('#quoteError', { state: 'visible' });
    check('offline: nothing is sent and the message says what to do about it',
      page.__posts.length === 0 && /offline/i.test(await page.textContent('#quoteError')),
      `${page.__posts.length} request(s) went out while offline`);
    check('offline: the configuration is explicitly said to be safe',
      /saved/i.test(await page.textContent('#quoteError')) && (await readStore(page)) !== null,
      'the offline message does not reassure, or the record was lost');
    await page.close();
  }

  // --- closed mid-step-2, then a return visit --------------------------
  {
    const page = await newPage(browser);
    await openModal(page, base);
    await pick(page, 'Kuuma Banya (Wood-fired)');
    await pick(page, 'Built-in Bluetooth speakers');
    const total = await page.textContent('#summaryTotal');
    await page.click('[data-action="request-quote"]');
    await page.waitForSelector('#quoteForm', { state: 'visible' });
    await page.click('.modal-close');

    // A full reload stands in for the return visit -- localStorage is what has
    // to carry it, and this is the thing sessionStorage could never do.
    await openModal(page, base);
    check('closed mid-step-2: a return visit restores the configuration',
      await page.textContent('#summaryTotal') === total
      && await page.evaluate(() => [...document.querySelectorAll('.modal-addons .addon-option')]
        .filter((o) => o.querySelector('input').checked)
        .map((o) => o.querySelector('.addon-label').textContent.trim())
        .includes('Kuuma Banya (Wood-fired)')),
      'the saved selections did not come back');
    check('closed mid-step-2: it reopens on step 1, not mid-form',
      await page.isVisible('#configureStep') && !(await page.isVisible('#quoteForm')),
      'the modal reopened into the middle of the send step');

    // Start over is the visitor's own eraser.
    await page.click('[data-action="quote-start-over"]');
    check('start over: clears the record and returns to defaults',
      await readStore(page) === null
      && await page.evaluate(() => !![...document.querySelectorAll('.modal-addons .addon-option')]
        .find((o) => o.querySelector('.addon-label').textContent.trim() === 'Standard heater (included)')
        .querySelector('input').checked),
      'start over left either the record or the selections behind');
    await page.close();
  }

  // --- expiry ----------------------------------------------------------
  {
    const page = await newPage(browser);
    await openModal(page, base);
    await pick(page, 'Kuuma Banya (Wood-fired)');
    await page.click('[data-action="request-quote"]');
    const fresh = await readStore(page);

    // Age the record past the window. Eight days, not seven and a bit, so a
    // clock skew of a few seconds cannot decide the outcome.
    await page.evaluate(([k, rec]) => {
      rec.savedAt = Date.now() - (8 * 24 * 60 * 60 * 1000);
      localStorage.setItem(k, JSON.stringify(rec));
    }, [STORAGE_KEY, fresh]);

    await openModal(page, base);
    check('expiry: a record older than 7 days is ignored and removed',
      await readStore(page) === null
      && await page.evaluate(() => !![...document.querySelectorAll('.modal-addons .addon-option')]
        .find((o) => o.querySelector('.addon-label').textContent.trim() === 'Standard heater (included)')
        .querySelector('input').checked),
      'an expired configuration was restored, or left on disk');
    await page.close();
  }

  // --- stale price sheet ----------------------------------------------
  {
    const page = await newPage(browser);
    await openModal(page, base);
    await pick(page, 'Kuuma Banya (Wood-fired)');
    await page.click('[data-action="request-quote"]');
    const rec = await readStore(page);

    // Rewrite the record as one written under an older price sheet, carrying a
    // total from a world that no longer exists.
    await page.evaluate(([k, r]) => {
      r.version = -1;
      r.total = '$1';
      localStorage.setItem(k, JSON.stringify(r));
    }, [STORAGE_KEY, rec]);

    await openModal(page, base);
    const shown = await page.textContent('#summaryTotal');
    check('stale stamp: the total is recomputed from live prices, never replayed',
      shown !== '$1' && shown === rec.total,
      `the modal showed ${shown} against a stored total of $1`);
    check('stale stamp: the visitor is told the total changed',
      await page.isVisible('#quoteStaleNote')
      && /prices have been updated/i.test(await page.textContent('#quoteStaleNote')),
      'a superseded configuration was restored with no note');
    check('stale stamp: the selections themselves still survive',
      await page.evaluate(() => !![...document.querySelectorAll('.modal-addons .addon-option')]
        .find((o) => o.querySelector('.addon-label').textContent.trim() === 'Kuuma Banya (Wood-fired)')
        .querySelector('input').checked),
      'a stale record was thrown away instead of recomputed');
    await page.close();
  }

  // --- the /contact/ fallback -----------------------------------------
  {
    const page = await newPage(browser);
    await openModal(page, base);
    await pick(page, 'Kuuma Banya (Wood-fired)');
    await page.click('[data-action="request-quote"]');

    await page.goto(`${base}/contact/`, { waitUntil: 'networkidle' });
    await page.waitForSelector('.quote-attached-banner');
    check('fallback: /contact/ says out loud that a configuration is attached',
      (await page.textContent('.quote-attached-banner')).includes('S4 Standard Sauna'),
      'the banner is missing or does not name the model');
    check('fallback: the message field is prefilled with the configuration',
      (await page.inputValue('textarea[name="message"]')).includes('Kuuma Banya'),
      'the configuration did not reach the contact form');
    check('fallback: the key SURVIVES the read',
      (await readStore(page)) !== null,
      'the old delete-on-read is back -- a reload would lose the configuration');

    await page.reload({ waitUntil: 'networkidle' });
    check('fallback: and survives a reload, banner and all',
      await page.isVisible('.quote-attached-banner')
      && (await page.inputValue('textarea[name="message"]')).includes('Kuuma Banya'),
      'the second visit to /contact/ came up empty');
    await page.close();
  }

  // --- keyboard-only walk ----------------------------------------------
  {
    const page = await newPage(browser);
    await stubFormspree(page, 'success');
    await page.goto(`${base}/saunas/`, { waitUntil: 'networkidle' });

    // Open from the keyboard, from a known opener, so focus restore is testable.
    await page.evaluate((m) => document.querySelector(`[data-action="open-modal"][data-model="${m}"]`).focus(), MODEL);
    await page.keyboard.press('Enter');
    await page.waitForSelector('.modal-addons .addon-option', { state: 'visible' });

    // Tab all the way round. Focus must never leave the dialog.
    let escaped = false;
    for (let i = 0; i < 80; i += 1) {
      await page.keyboard.press('Tab');
      // eslint-disable-next-line no-await-in-loop
      const inside = await page.evaluate(() => document.getElementById('saunaModal').contains(document.activeElement));
      if (!inside) { escaped = true; break; }
    }
    check('a11y: Tab is trapped inside the dialog',
      !escaped, 'focus escaped to the page behind the modal mid-quote');

    // The honeypot is an <input>, so a naive focusable query includes it and
    // Shift+Tab can wrap straight onto a field the visitor must never fill.
    await page.evaluate(() => document.querySelector('.modal-close').focus());
    await page.keyboard.press('Shift+Tab');
    check('a11y: the honeypot is never a focus target',
      await page.evaluate(() => document.activeElement.name !== '_gotcha'),
      'wrapping backwards landed on the honeypot, which discards the submission if filled');

    // Reach step 2 and complete it without touching the mouse.
    await page.evaluate(() => document.querySelector('[data-action="request-quote"]').focus());
    await page.keyboard.press('Enter');
    await page.waitForSelector('#quoteForm', { state: 'visible' });
    await page.keyboard.type('Keyboard Only');
    await page.keyboard.press('Tab');
    await page.keyboard.type('keys@example.com');
    await page.keyboard.press('Tab');
    await page.keyboard.type('Pemberton');
    await page.evaluate(() => document.getElementById('quoteSubmit').focus());
    await page.keyboard.press('Enter');
    await page.waitForSelector('#successStep', { state: 'visible' });

    const body = new URLSearchParams(page.__posts[0].body);
    check('a11y: the whole funnel completes from the keyboard alone',
      body.get('name') === 'Keyboard Only' && body.get('location') === 'Pemberton',
      `keyboard-entered payload was ${page.__posts[0].body}`);

    await page.keyboard.press('Escape');
    check('a11y: closing restores focus to whatever opened the dialog',
      await page.evaluate((m) => document.activeElement
        === document.querySelector(`[data-action="open-modal"][data-model="${m}"]`), MODEL),
      'focus was dumped at the top of the document on close');
    await page.close();
  }
}

// ============================================================
// Endpoint single-source (static, no browser needed)
// ============================================================
function runEndpointCheck() {
  const literal = 'formspree.io/f/';
  const offenders = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (SKIP.has(entry.name) || entry.name.startsWith('.')) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      if (!/\.(js|mjs|njk|html|css|json)$/.test(entry.name)) continue;
      if (full.endsWith(path.join('_data', 'site.json'))) continue; // the one definition
      if (full.startsWith(path.join(REPO_ROOT, 'scripts'))) continue; // this file names it
      if (full.startsWith(path.join(REPO_ROOT, 'docs'))
        || full.startsWith(path.join(REPO_ROOT, 'research'))) continue; // prose, not code
      if (fs.readFileSync(full, 'utf8').includes(literal)) offenders.push(path.relative(REPO_ROOT, full));
    }
  };
  walk(REPO_ROOT);
  check('endpoint: exactly one definition, in src/_data/site.json',
    offenders.length === 0,
    `the endpoint is also written out in: ${offenders.join(', ')}. It had three copies `
    + 'before this package; every extra one can drift independently.');
}

// ============================================================
// Mutations -- each removes a mechanism whose absence is invisible
// ============================================================
const MUTATIONS = [
  {
    name: 'M1 storage expiry',
    proves: 'a record that never expires is detected',
    apply: (dir) => mutate(path.join(dir, 'js', 'quote-store.js'),
      'if (ageMs > MAX_AGE_MS) {', 'if (false) {'),
    // With the expiry removed, an 8-day-old record must come BACK.
    run: async (base, browser) => {
      const page = await newPage(browser);
      await openModal(page, base);
      await pick(page, 'Kuuma Banya (Wood-fired)');
      await page.click('[data-action="request-quote"]');
      const rec = await readStore(page);
      await page.evaluate(([k, r]) => {
        r.savedAt = Date.now() - (8 * 24 * 60 * 60 * 1000);
        localStorage.setItem(k, JSON.stringify(r));
      }, [STORAGE_KEY, rec]);
      await openModal(page, base);
      const survived = (await readStore(page)) !== null;
      await page.close();
      return survived;
    },
  },
  {
    name: 'M2 stale price-sheet note',
    proves: 'a silently-restored superseded configuration is detected',
    apply: (dir) => mutate(path.join(dir, 'js', 'quote-store.js'),
      'stale: record.version !== window.SSC.pricesVersion,', 'stale: false,'),
    run: async (base, browser) => {
      const page = await newPage(browser);
      await openModal(page, base);
      await pick(page, 'Kuuma Banya (Wood-fired)');
      await page.click('[data-action="request-quote"]');
      const rec = await readStore(page);
      await page.evaluate(([k, r]) => {
        r.version = -1;
        localStorage.setItem(k, JSON.stringify(r));
      }, [STORAGE_KEY, rec]);
      await openModal(page, base);
      const noteHidden = !(await page.isVisible('#quoteStaleNote'));
      await page.close();
      return noteHidden;
    },
  },
  {
    name: 'M3 honeypot',
    proves: 'a honeypot that stops being posted is detected',
    apply: (dir) => mutate(path.join(dir, 'src', '_includes', 'modals', 'sauna.njk'),
      'name="_gotcha"', 'name="not_gotcha"'),
    run: async (base, browser) => {
      const page = await newPage(browser);
      await stubFormspree(page, 'success');
      await openModal(page, base);
      await page.click('[data-action="request-quote"]');
      await fillStep2(page);
      await page.click('#quoteSubmit');
      await page.waitForSelector('#successStep', { state: 'visible' });
      const gone = !new URLSearchParams(page.__posts[0].body).has('_gotcha');
      await page.close();
      return gone;
    },
  },
  {
    name: 'M4 double-submit guard',
    proves: 'a funnel that can post twice is detected',
    apply: (dir) => mutate(path.join(dir, 'js', 'modal.js'),
      'if (this.submitting) return;', 'if (false) return;'),
    run: async (base, browser) => {
      const page = await newPage(browser);
      await stubFormspree(page, 'slow-success');
      await openModal(page, base);
      await page.click('[data-action="request-quote"]');
      await fillStep2(page);
      await page.click('#quoteSubmit');
      await page.waitForFunction(() => document.getElementById('quoteSubmit').disabled);
      await page.evaluate(() => document.getElementById('quoteForm')
        .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
      await page.waitForSelector('#successStep', { state: 'visible' });
      const doubled = page.__posts.length > 1;
      await page.close();
      return doubled;
    },
  },
  {
    name: 'M5 rate-limit branch',
    proves: 'a 429 collapsing back into a generic failure is detected',
    apply: (dir) => mutate(path.join(dir, 'js', 'modal.js'),
      'if (response.status === 429) {', 'if (false) {'),
    run: async (base, browser) => {
      const page = await newPage(browser);
      await stubFormspree(page, 429);
      await openModal(page, base);
      await page.click('[data-action="request-quote"]');
      await fillStep2(page);
      await page.click('#quoteSubmit');
      await page.waitForSelector('#quoteError', { state: 'visible' });
      const generic = !/lot of requests/i.test(await page.textContent('#quoteError'));
      await page.close();
      return generic;
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

    process.stdout.write('\nA. the funnel as shipped\n\n');
    const baseline = await bootSite(null);
    sites.push(baseline);
    await runStates(baseline.base, browser);
    runEndpointCheck();

    process.stdout.write('\nB. mutations -- each of these MUST be detectable\n\n');
    for (const m of MUTATIONS) {
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
