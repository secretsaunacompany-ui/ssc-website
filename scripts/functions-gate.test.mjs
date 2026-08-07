#!/usr/bin/env node
/**
 * functions-gate.test.mjs — the Netlify functions' guard rails, exercised
 * without a network and without Netlify.
 *
 * Born 2026-08-06 (code-refresh D2): the advisor endpoint sat deployed and
 * publicly POST-able for weeks while its UI was feature-flagged off, because
 * no instrument looked at the functions at all. This suite requires the real
 * handlers in-process and asserts their refusal paths. It never touches the
 * Anthropic client or Supabase: every scenario must resolve BEFORE any
 * outbound call, and a scenario that tried one would fail loudly on the
 * missing credentials/socket rather than silently passing.
 *
 * The advisor flag is controlled via ADVISOR_ENABLED_OVERRIDE — the test must
 * drive BOTH states, and reading the live site.json would invert the suite's
 * meaning the day the flag flips (critic round 1).
 *
 *   node scripts/functions-gate.test.mjs
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(REPO_ROOT, 'scripts', 'noop.js'));

let passes = 0, failures = 0;
const check = (name, ok, detail) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `\n      ${detail}`}`);
  ok ? passes++ : failures++;
};

const advisorPath = path.join(REPO_ROOT, 'netlify/functions/advisor.js');
const { handler: advisor } = require(advisorPath);

const post = (body, ip = '203.0.113.7') => ({
  httpMethod: 'POST',
  headers: { 'x-nf-client-connection-ip': ip, origin: 'https://www.secretsaunacompany.ca' },
  body: JSON.stringify(body),
});

// ---- Gate closed -----------------------------------------------------------
process.env.ADVISOR_ENABLED_OVERRIDE = 'false';
{
  const res = await advisor(post({ type: 'inquiry', message: 'hello' }));
  check('advisor: flag off → 503 before any parsing or client work',
    res.statusCode === 503 && JSON.parse(res.body).error === 'advisor disabled',
    `got ${res.statusCode} ${res.body}`);
  const res2 = await advisor({ httpMethod: 'GET', headers: {} });
  check('advisor: method check still precedes the gate (GET → 405, not 503)',
    res2.statusCode === 405, `got ${res2.statusCode}`);
}

// ---- Gate open: request must PROCEED past the gate -------------------------
process.env.ADVISOR_ENABLED_OVERRIDE = 'true';
{
  // Invalid type: proves we got past the 503 into real validation, with no
  // network possible (rejection happens before the Anthropic call).
  const res = await advisor(post({ type: 'not-a-real-type', message: 'hi' }, '203.0.113.8'));
  check('advisor: flag on → proceeds past the gate to type validation (400, not 503)',
    res.statusCode === 400, `got ${res.statusCode} ${res.body}`);
}

// ---- Default state: no override → live site.json flag ----------------------
delete process.env.ADVISOR_ENABLED_OVERRIDE;
{
  const site = require(path.join(REPO_ROOT, 'src/_data/site.json'));
  const res = await advisor(post({ type: 'inquiry', message: 'hello' }, '203.0.113.9'));
  const expected503 = site.features?.advisor !== true;
  check('advisor: no override → gate mirrors the live site.json flag',
    expected503 ? res.statusCode === 503 : res.statusCode !== 503,
    `site.json advisor=${site.features?.advisor}, got ${res.statusCode}`);
}

// ---- booking-admin: shared rate limiter (B5, 2026-08-06) -------------------
{
  const { getClientIp } = require(path.join(REPO_ROOT, 'netlify/functions/lib/rate-limit.js'));
  check('getClientIp prefers Netlify\'s own header over x-forwarded-for',
    getClientIp({ 'x-nf-client-connection-ip': '198.51.100.1', 'x-forwarded-for': '203.0.113.9' }) === '198.51.100.1',
    'the platform-stamped header is the trustworthy one');

  const { handler: bookingAdmin } = require(path.join(REPO_ROOT, 'netlify/functions/booking-admin.js'));
  // 31 calls from one IP: the limiter (30/min, BEFORE any Supabase touch)
  // must refuse the 31st with 429. Earlier calls may 500 on missing local
  // Supabase env — irrelevant here; the refusal ordering is the claim.
  let last;
  for (let i = 0; i < 31; i++) {
    last = await bookingAdmin({
      httpMethod: 'GET',
      headers: { 'x-nf-client-connection-ip': '198.51.100.77' },
      queryStringParameters: { action: 'sessions' },
    });
  }
  check('booking-admin: the 31st request in a minute from one IP is refused 429 before any backend touch',
    last.statusCode === 429, `31st response was ${last.statusCode}`);
}

console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
