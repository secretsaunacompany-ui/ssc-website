/**
 * Deterministic full-page capture.
 *
 * Everything in here exists to answer one question: "if nothing changed, does
 * this produce a byte-identical PNG?" A harness that drifts on its own is
 * worse than no harness, because it teaches you to ignore it.
 *
 * The four sources of drift on this site, and what is done about each:
 *
 *  1. MOTION. Scroll-reveal (IntersectionObserver adds `.visible`) and the
 *     homepage hero intro (`.hero-revealed` / `.hero-locked`) mean an element's
 *     opacity depends on scroll position and elapsed time. Fixed by launching
 *     with `reducedMotion: 'reduce'` AND injecting a stylesheet that kills every
 *     animation/transition and forces every reveal target to its settled state.
 *     Forcing the settled state matters: without it, below-the-fold content is
 *     captured at opacity 0 and the harness would be blind to most of the page.
 *
 *  2. REMOTE ASSETS. Cloudinary images and Google Fonts are fetched over the
 *     network. Live fetches make runs slow, offline-fragile, and subject to
 *     silent CDN re-encoding. Fixed with a record/replay disk cache: the first
 *     run fetches and stores each remote response, every run after replays it
 *     byte for byte. Real fonts and real image dimensions are preserved, which
 *     matters because a type-scale refactor is exactly what this gates.
 *
 *     KNOWN BUG, not fixed here: the cache keys on URL alone and stores one
 *     whole body per URL, ignoring the request's `Range` header and replaying
 *     the recorded status (a `206 Partial Content` would be replayed as a 206
 *     carrying the full body). Harmless for images and fonts, which are fetched
 *     whole. It matters only for ranged media — which is why the video is
 *     stubbed outright (3b) rather than cached. Filed rather than fixed so the
 *     determinism claim does not quietly depend on it.
 *
 *  3. THE CLOCK. Any client-side `new Date()` / `Date.now()` is pinned to a
 *     fixed epoch before any page script runs, and `Math.random` is replaced
 *     with a seeded PRNG. No time-of-day or randomised branch was found in the
 *     current site (see scripts/README.md), so this is insurance rather than a
 *     fix, and it costs nothing.
 *
 *  3b. VIDEO. The homepage carries an autoplaying looping `<video>`. Which
 *     frame is on screen when the shutter fires depends on decode timing, so
 *     the element is STUBBED: its media request is aborted and the element
 *     renders as a flat block inside its own fixed 70vh box. Determinism here
 *     is by construction — it does not depend on the asset replay cache
 *     behaving itself for a streamed, range-requested media file. (The cache's
 *     handling of ranged media responses is a real bug, but it is a site/harness
 *     bug on its own merits and is NOT what this determinism claim rests on.)
 *
 *  4. LIVE ENDPOINTS. The analytics tracker, Supabase, and Formspree are
 *     aborted outright. Beyond determinism this is a correctness point: 19
 *     pages x 2 widths x 2 builds is 76 fake pageviews per run, and the site
 *     owner's analytics should not be polluted by his own test harness.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { chromium } from 'playwright';

/** Hosts whose responses are cached and replayed. */
const CACHED_HOSTS = new Set([
  'res.cloudinary.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
]);

/** Hosts that are aborted: live endpoints with side effects or no visual role. */
const BLOCKED_HOSTS = new Set([
  'ssc-ops.netlify.app',      // analytics tracker; do not record test traffic
  'formspree.io',
  'script.google.com',
  'unpkg.com',
  'cdn.jsdelivr.net',
]);

/** Requests treated as video and stubbed rather than fetched or replayed. */
const VIDEO_URL = /\/video\/upload\/|\.(?:mp4|webm|m4v|mov|ogv)(?:[?#]|$)/i;

/** Frozen epoch: 2026-01-01T12:00:00Z. Arbitrary, but fixed forever. */
const FROZEN_EPOCH = 1767268800000;

/**
 * The scroll-reveal pin, as selectors, exported so a fixture can assert it still
 * matches real elements.
 *
 * WHY THIS IS A NAMED EXPORT AND NOT AN INLINE STRING. Until now the pin listed
 * six classes -- .fade-in, .slide-up, .slide-left, .slide-right, .scale-in,
 * .gallery-item--reveal -- which WP-1b collapsed into a single `.reveal`. Nobody
 * re-aimed it. Measured in the built site afterwards: those six matched ZERO
 * elements while `.reveal` matched 206. The pin had been inert since 1b, so
 * below-fold reveal targets were captured in whatever IntersectionObserver state
 * the run happened to catch -- precisely the non-determinism it exists to
 * remove.
 *
 * That is the third inert-thing-failing-silently on this branch (sha-abbrev
 * scoping, stale whitelist entries, now this), and the cure is the same each
 * time: make inertness LOUD. A fixture asserts these selectors match a nonzero
 * element count in the real build, and that no reveal-family element escapes
 * them, so the next rename turns the pin's death into a red test.
 *
 * The state inventory this covers:
 *   .js .reveal              hidden state, resolved before first paint
 *   .js.reveal-ready .reveal the transition-carrying state added after paint
 *   .reveal.seen             the settled state the observer grants
 *   .reveal                  the bare class, so a target still pins if the
 *                            gating classes are ever restructured again
 * Specificity matters here: `.js .reveal` is (0,2,0), so pinning only `.reveal`
 * would lose to it even with !important. Every gating form is listed.
 */
/* UNCHANGED by B1, deliberately: `.reveal--held` is a MODIFIER that rides on
   `.reveal`, never a replacement for it, so every held element is already
   matched by the entries below and pinning the modifier separately would add a
   selector that can only ever match a subset of an existing one. If a future
   batch ever gives something a held delay WITHOUT `.reveal`, that element is
   unpinned and this list is wrong -- which is the whole reason the convention
   is written down here rather than assumed. */
export const REVEAL_PIN_SELECTORS = Object.freeze([
  '.js .reveal',
  '.js.reveal-ready .reveal',
  '.reveal.seen',
  '.reveal',
]);

const DETERMINISM_CSS = `
  *, *::before, *::after {
    animation: none !important;
    animation-duration: 0s !important;
    animation-delay: 0s !important;
    transition: none !important;
    transition-duration: 0s !important;
    transition-delay: 0s !important;
    caret-color: transparent !important;
    scroll-behavior: auto !important;
  }
  html { scroll-behavior: auto !important; }
  /* Force every scroll-reveal target to its settled, visible state.
     Selectors live in REVEAL_PIN_SELECTORS so a fixture can check the pin still
     MATCHES SOMETHING -- see the note there. */
  ${REVEAL_PIN_SELECTORS.join(',\n  ')} {
    opacity: 1 !important;
    transform: none !important;
    transition: none !important;
    transition-delay: 0s !important;
  }
  /* Homepage hero intro: skip straight to revealed.
     These two are now the PRIMARY determinism guard for this page rather than a
     belt-and-braces one. B1 holds both for --hero-hold before they arrive, and
     the nav's hidden state is CSS keyed on body.page-home, so without this pin
     a capture that raced the beat would photograph a page with no navigation
     and no headline on it. */
  body.page-home nav,
  body.page-home .hero-content {
    opacity: 1 !important;
    transform: none !important;
    pointer-events: auto !important;
  }
  /* Second layer for the interior-page hero, matching .hero-content's two-layer
     protection: today only the reducedMotion guard stops its opacity write; if
     that emulation ever changes, this pin keeps it deterministic. */
  .page-hero {
    opacity: 1 !important;
  }
  /* The body.page-home.hero-locked unlock pin that used to sit here is gone.
     It undid HeroIntroAnimation's scroll lock, and WP-1b deleted that animation
     along with the class. The events suite asserts the class cannot come back
     ("no scroll-lock class or style survives on the body"), so this is a pin
     with a fixture standing behind its absence rather than a pin removed on the
     assumption nothing needs it.

     B1 is the batch that re-examined the hold, and it deliberately reintroduces
     no lock of any kind: the hold was a transition-delay until 2026-08-02, when
     it moved into the reveal clock (a withheld .seen class) so an early gesture
     could fade the held pair in rather than snap it. Either way it is a hold and
     never a lock, and the first scroll gesture always works -- which is the
     claim this pin's absence rests on.

     The two opacity pins ABOVE are what keep the capture deterministic across
     that change: they force the held pair visible whatever is or is not
     withholding it, which is why the move produced byte-identical numbers on all
     38 page/width rows.

     NOTE: this block is inside a JS template literal. No backticks in these
     comments, or the string terminates here and the whole capture module throws
     on import. That happened once already this batch. */
  /* Parallax: SSC.initHeroParallax writes a scroll-position-dependent inline
     style on every scroll event, so each target lands wherever scrolling
     stopped. Pin them to their untransformed positions. A stylesheet
     !important beats the inline non-important style the script writes.

     ALL of the handler's layout-affecting targets are pinned here, not just
     the one that was noticed first. The handler (js/animations.js,
     initHeroParallax) writes five inline styles per scroll frame:

       .hero-image      style.top       = -(scrollY * 0.6)px
       .hero-content    style.opacity                          (reduced-motion guarded)
       .hero-overlay__bg style.transform = translateY(±40px)
 *     INERT since WP-1b (2026-07-31) deleted the parallax: nothing writes these
 *     transforms any more, so these pins currently pin nothing. KEPT ON PURPOSE
 *     -- they are the guard if scroll-driven motion ever returns, and a pin that
 *     costs nothing is cheaper than rediscovering why it was needed.
       .page-hero       style.opacity                          (reduced-motion guarded)
       .full-width-image style.transform = translateY(±50px)

     The two opacity writes are already inert because the context launches with
     reducedMotion: 'reduce' and the handler guards them. The three geometric
     ones are not, and only .hero-overlay__bg was pinned originally. That left
     a 100px swing on .full-width-image and a 0.6*scrollY swing on .hero-image
     free to land anywhere, which is precisely the intermittent "large
     localised shift on a page nobody touched" this harness exists to not
     report: measured as a 60px phantom shift on /saunas/ @1440 that appeared
     in one run and not the next, from identical builds.

     If a new parallax target is added to that handler, it belongs in this
     list. A scroll-dependent inline style that is not pinned here is a flake
     waiting to be blamed on a content change. */
  .hero-image {
    top: 0 !important;
    will-change: auto !important;
  }
  .full-width-image {
    transform: none !important;
    will-change: auto !important;
  }
  .hero-overlay__bg {
    transform: none !important;
    will-change: auto !important;
  }
  /* Video is stubbed (see header note 3b): its media request is aborted, so it
     paints as a flat block. Its box is CSS-sized (.video--fullwidth is
     width:100%/height:70vh) and therefore layout-stable without the media. */
  video {
    background-color: #0c0c0c !important;
    object-fit: cover !important;
  }
  video::-webkit-media-controls, video::-webkit-media-controls-enclosure {
    display: none !important;
  }
`;

export const INIT_SCRIPT = `(() => {
  const EPOCH = ${FROZEN_EPOCH};
  const RealDate = Date;
  function FrozenDate(...args) {
    if (args.length === 0) return new RealDate(EPOCH);
    return new RealDate(...args);
  }
  FrozenDate.prototype = RealDate.prototype;
  FrozenDate.now = () => EPOCH;
  FrozenDate.parse = RealDate.parse;
  FrozenDate.UTC = RealDate.UTC;
  window.Date = FrozenDate;

  // Seeded PRNG (mulberry32) so any randomised branch is stable run to run.
  let seed = 0x9e3779b9;
  Math.random = () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
})();`;

function cachePathFor(cacheDir, url) {
  const hash = crypto.createHash('sha256').update(url).digest('hex').slice(0, 32);
  return { body: path.join(cacheDir, `${hash}.bin`), meta: path.join(cacheDir, `${hash}.json`) };
}

/**
 * Exported so dom-integrity.mjs uses the SAME host policy: which third parties
 * are replayed, which are aborted, and which are unknown-and-therefore-refused.
 * Two instruments disagreeing about that would be two different definitions of
 * "the page", and the blocked-host refusal is a safety property in both.
 */
export async function installRouting(context, cacheDir, stats) {
  fs.mkdirSync(cacheDir, { recursive: true });

  await context.route('**/*', async (route) => {
    const url = route.request().url();
    let host;
    try { host = new URL(url).hostname; } catch { return route.continue(); }

    // Video is stubbed before any host rule, including the cached-host rule:
    // determinism must not depend on the replay cache handling ranged media.
    if (VIDEO_URL.test(url)) { stats.videoStubbed += 1; return route.abort(); }

    if (host === '127.0.0.1' || host === 'localhost') return route.continue();

    if (BLOCKED_HOSTS.has(host)) { stats.blocked += 1; return route.abort(); }

    if (!CACHED_HOSTS.has(host)) {
      // Unknown third party: abort rather than let an unreviewed host affect
      // the capture. If a legitimate one appears, it shows up in the run
      // summary as a blocked host and gets added to CACHED_HOSTS deliberately.
      stats.blocked += 1;
      stats.unknownHosts.add(host);
      return route.abort();
    }

    const { body, meta } = cachePathFor(cacheDir, url);
    if (fs.existsSync(body) && fs.existsSync(meta)) {
      stats.cacheHits += 1;
      const m = JSON.parse(fs.readFileSync(meta, 'utf8'));
      return route.fulfill({
        status: m.status,
        headers: m.headers,
        body: fs.readFileSync(body),
      });
    }

    try {
      const response = await route.fetch();
      const buf = await response.body();
      const headers = { 'content-type': response.headers()['content-type'] || 'application/octet-stream' };
      fs.writeFileSync(body, buf);
      fs.writeFileSync(meta, JSON.stringify({ status: response.status(), headers, url }));
      stats.cacheMisses += 1;
      return route.fulfill({ status: response.status(), headers, body: buf });
    } catch (err) {
      stats.fetchFailures += 1;
      return route.abort();
    }
  });
}

/**
 * Capture every route at every width.
 *
 * @param {object} opts
 * @param {string} opts.baseUrl      running static server for the build
 * @param {string[]} opts.routes
 * @param {number[]} opts.widths
 * @param {string} opts.outDir       where PNGs are written
 * @param {string} opts.cacheDir     shared remote-asset replay cache
 * @param {(msg:string)=>void} opts.log
 */
export async function captureAll({ baseUrl, routes, widths, outDir, cacheDir, log }) {
  fs.mkdirSync(outDir, { recursive: true });
  const stats = {
    blocked: 0, cacheHits: 0, cacheMisses: 0, fetchFailures: 0,
    videoStubbed: 0, videoElements: 0, brokenImages: [],
    unknownHosts: new Set(), redirects: {},
  };

  const browser = await chromium.launch();
  try {
    for (const width of widths) {
      const context = await browser.newContext({
        viewport: { width, height: 900 },
        deviceScaleFactor: 1,
        reducedMotion: 'reduce',
        // Freeze locale/timezone so any date rendering is stable regardless of
        // where the harness runs.
        locale: 'en-CA',
        timezoneId: 'America/Vancouver',
        javaScriptEnabled: true,
      });
      await context.addInitScript(INIT_SCRIPT);
      await installRouting(context, cacheDir, stats);

      const page = await context.newPage();
      for (const route of routes) {
        const target = `${baseUrl}${route}`;
        await page.goto(target, { waitUntil: 'load', timeout: 60000 });

        // Some pages navigate themselves after load (booking-ops bounces to an
        // auth screen, forms redirect on state). Let the URL settle before
        // injecting anything, or the injection races the navigation away.
        let settled = page.url();
        for (let i = 0; i < 10; i++) {
          await page.waitForTimeout(120);
          const now = page.url();
          if (now === settled) break;
          settled = now;
        }
        if (settled !== target && settled !== `${target}/`) {
          stats.redirects[route] = settled.replace(baseUrl, '');
        }

        // Retry the injection: a late navigation can still destroy the context.
        for (let attempt = 0; ; attempt++) {
          try { await page.addStyleTag({ content: DETERMINISM_CSS }); break; }
          catch (err) {
            if (attempt >= 3) throw new Error(`addStyleTag failed for ${route}: ${err.message}`);
            await page.waitForTimeout(300);
          }
        }

        // Stub every video element: halt playback and clear any media source so
        // no decoded frame can reach the raster. With the request aborted above
        // this is belt-and-braces, but it also covers an inline/data source that
        // never hits the network at all.
        stats.videoElements += await page.evaluate(() => {
          const videos = Array.from(document.querySelectorAll('video'));
          // Deliberately not wrapped in try/catch: if a video cannot be
          // stubbed, the capture is nondeterministic and the run must crash
          // rather than quietly photograph whichever frame happened to decode.
          for (const v of videos) {
            v.pause();
            v.removeAttribute('autoplay');
            v.removeAttribute('poster');
            v.querySelectorAll('source').forEach((s) => s.remove());
            v.removeAttribute('src');
            v.load();
          }
          return videos.length;
        });

        // Scroll the full page once so `loading="lazy"` images request, and any
        // IntersectionObserver work settles, then return to the top.
        await page.evaluate(async () => {
          const step = window.innerHeight;
          for (let y = 0; y < document.body.scrollHeight; y += step) {
            window.scrollTo(0, y);
            await new Promise((r) => setTimeout(r, 30));
          }
          window.scrollTo(0, 0);
        });

        // Wait for fonts and for every image to be decoded, so nothing pops in
        // between the screenshot command and the raster.
        await page.evaluate(() => document.fonts.ready);

        // Wait for every image to finish loading, by POLLING rather than by
        // attaching load handlers.
        //
        // The handler version had a race that could hang the run forever: an
        // image that finished between the `!complete` filter and the handler
        // attach had already fired its event, so the promise never settled.
        // waitForFunction re-evaluates the condition instead, so it cannot miss
        // an edge, and it is bounded — a stuck image fails the run loudly
        // rather than being photographed half-loaded.
        //
        // This matters more than it looks. Several pages carry `loading="lazy"`
        // images with NO width/height attributes, so nothing reserves their
        // space: if one is still undecoded when the shutter fires, everything
        // below it sits at a different offset, and the run reports a large
        // localised layout shift on a page nobody touched.
        await page.waitForFunction(
          () => Array.from(document.images).every((img) => img.complete),
          null,
          { timeout: 30000 });

        // A broken image collapses to zero height and silently changes the
        // layout of everything beneath it, which would read as a real
        // regression. Surface it instead of photographing it.
        //
        // "Broken" means HAS a source and still failed to load. An `<img>` with
        // no source at all is a deliberate placeholder the page fills in later
        // — the sitewide lightbox `<img id="lightboxImage">` is one — and
        // flagging those made every single run fail on all 19 pages, which is a
        // gate that teaches you to ignore it.
        const brokenImages = await page.evaluate(() => Array.from(document.images)
          .filter((img) => {
            const src = img.currentSrc || img.getAttribute('src') || '';
            return src !== '' && img.naturalWidth === 0;
          })
          .map((img) => img.currentSrc || img.getAttribute('src')));
        if (brokenImages.length > 0) {
          stats.brokenImages.push(
            `${route} @${width}: ${brokenImages.length} image(s) failed to load `
            + `(${brokenImages.slice(0, 3).join(', ')}${brokenImages.length > 3 ? ', …' : ''})`);
        }

        await page.waitForTimeout(150);

        const file = path.join(outDir, `${route.replace(/^\/+|\/+$/g, '').replace(/[^a-zA-Z0-9._-]+/g, '_') || 'home'}@${width}.png`);
        await page.screenshot({ path: file, fullPage: true, animations: 'disabled', caret: 'hide' });
        log?.(`      ${route} @${width}`);
      }
      await context.close();
    }
  } finally {
    await browser.close();
  }

  return {
    ...stats,
    unknownHosts: [...stats.unknownHosts],
  };
}
