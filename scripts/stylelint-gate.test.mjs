/**
 * Does the CSS guard actually bite?
 *
 * A lint config that passes proves nothing on its own -- a rule with a typo in
 * its name, a rule that silently does not apply to the file, or an `overrides`
 * block that turns it off everywhere all pass exactly as loudly as a working
 * one. The only evidence that matters is a planted violation being REJECTED.
 *
 * So this plants each violation the guard exists to catch, confirms the run
 * fails on it, and confirms the untouched stylesheet still passes. It also
 * checks the documented exceptions are exceptions rather than a disabled rule.
 *
 * Nothing here is written into styles.css: every fixture is linted from a string
 * copy in a temp dir with the real .stylelintrc.json resolved from the repo root.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const CSS = join(ROOT, 'styles.css');

let failures = 0;
let passes = 0;
const check = (name, cond, detail = '') => {
    if (cond) {
        passes += 1;
        console.log(`  PASS  ${name}`);
    } else {
        failures += 1;
        console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ''}`);
    }
};

/** Lint a CSS string against the repo's real config. Returns true if it PASSES. */
function lints(css) {
    const dir = mkdtempSync(join(tmpdir(), 'ssc-lint-'));
    const file = join(dir, 'fixture.css');
    writeFileSync(file, css);
    try {
        execFileSync('npx', ['stylelint', '--config', join(ROOT, '.stylelintrc.json'), file], {
            cwd: ROOT,
            stdio: 'pipe'
        });
        return true;
    } catch {
        return false;
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
}

console.log('\nCSS guard\n');

// --- the guard rejects what it exists to reject ------------------------------
check('a raw rem font-size is REJECTED',
    lints('.x { font-size: 1.25rem; }') === false);

check('a raw px font-size is REJECTED',
    lints('.x { font-size: 18px; }') === false);

check('a raw px border-radius is REJECTED',
    lints('.x { border-radius: 8px; }') === false);

check('a raw rem border-radius is REJECTED',
    lints('.x { border-radius: 0.5rem; }') === false);

// The specific regressions this batch just removed. If either of these ever
// passes again, the consolidation has come undone at its two worst points.
check('the frosted-card radius (12px) is REJECTED',
    lints('.card { border-radius: 12px; }') === false);

check('the pill radius (999px) is REJECTED',
    lints('.logo img { border-radius: 999px; }') === false);

// --- the guard permits what it must permit ----------------------------------
check('a token font-size PASSES',
    lints('.x { font-size: var(--text-sm); }') === true);

check('a token border-radius PASSES',
    lints('.x { border-radius: var(--radius-sm); }') === true);

check('50% circles PASS -- map pins and dots keep their geometry',
    lints('.pin { border-radius: 50%; }') === true
    && lints('.pin { border-radius: 50% 50% 50% 0; }') === true);

check('font-size: inherit PASSES -- a keyword is not a magic number',
    lints('.x { font-size: inherit; }') === true);

check('the token definitions in :root are out of reach by construction',
    lints(':root { --text-sm: 0.875rem; --radius-sm: 2px; }') === true,
    ':root declares custom properties, never font-size/border-radius directly');

// --- the exceptions are exceptions, not a disabled rule ---------------------
check('a disable comment exempts ONLY its next line',
    lints([
        '.a { /* stylelint-disable-next-line declaration-property-value-allowed-list */',
        '     font-size: 1.5rem; }',
        '.b { font-size: 2rem; }'
    ].join('\n')) === false,
    'the second, undocumented raw size must still fail');

// --- the real stylesheet, and the shape of its exemptions -------------------
const css = readFileSync(CSS, 'utf8');

check('the live stylesheet passes the guard', lints(css) === true);

{
    const disables = (css.match(/stylelint-disable-next-line/g) || []).length;
    const blanket = /stylelint-disable(?!-next-line)/.test(css);
    check('every exemption is next-line scoped -- no blanket disable exists',
        blanket === false);
    // Was 6. .stat-number's raw 3.5rem was held open "pending Jen at Stage 3";
    // Jen ruled it display-by-function and it now takes --text-4xl, so its
    // exception retired with it. This number is supposed to go DOWN, and it can
    // only go down through a deliberate edit here -- which is the point.
    check(`exactly 5 documented exceptions remain (found ${disables})`,
        disables === 5,
        'four icon glyphs and the iOS zoom guard. A sixth means an exception was '
        + 'added without this test being told; a fourth means one retired without '
        + 'the reason being recorded.');
}

{
    // A disable that says only "stylelint-disable-next-line" and moves on is an
    // undocumented exemption wearing a comment. Each must carry a reason.
    const bare = css.split('\n').filter((l) =>
        l.includes('stylelint-disable-next-line')
        && !l.includes('--')
    );
    check('every disable carries a stated reason on its own line',
        bare.length === 0, `bare disables: ${bare.length}`);
}

// NOTE-2d: the same summary line every sibling suite prints. "All checks passed"
// hides the one failure mode a count catches for free — a suite that silently
// stopped running most of its checks still says "All checks passed", and reads
// as green to a human and to CI alike.
console.log(`\n${passes} passed, ${failures} failed\n`);
process.exit(failures === 0 ? 0 : 1);
