module.exports = function(eleventyConfig) {
  eleventyConfig.addFilter("currentYear", () => new Date().getFullYear());

  /**
   * Interpolate a data-file string into a JSON-LD document body, safely.
   *
   * The JSON-LD blocks on /saunas/ and in head.njk are hand-written JSON with
   * `{{ ... }}` holes in it, and Nunjucks autoescaping is HTML escaping, which
   * is the wrong alphabet for the inside of a <script type="application/ld+json">
   * -- it would turn an apostrophe in "7' x 12'" into `&#39;` and leave a double
   * quote free to terminate the string it sits in. So every hole carried `| safe`,
   * which is correct for today's data and a loaded gun for tomorrow's: one
   * product name with a quote in it ("Sauna 7\" clearance") silently emits
   * structured data that no parser can read, on nineteen pages, and nothing
   * fails. Google would just stop seeing the products.
   *
   * Not hypothetical. Writing this batch's own census note into
   * src/_data/models.json with a quoted string in it broke that file the same
   * way -- caught only because a suite happened to JSON.parse it.
   *
   * JSON.stringify does the escaping the medium actually requires; slicing the
   * surrounding quotes leaves a fragment that drops into an existing pair. It
   * FAILS CLOSED on anything that is not a string, because a stray object or
   * undefined reaching a JSON-LD hole means the template is wrong, and emitting
   * "undefined" as structured data is worse than not building.
   */
  eleventyConfig.addFilter("jsonld", (value) => {
    if (typeof value !== "string") {
      throw new Error(`jsonld filter: expected a string, got ${typeof value} `
        + `(${JSON.stringify(value)}). A JSON-LD hole must be filled by a string from the `
        + `data file; anything else means the template names a field that does not exist.`);
    }
    // `<` is escaped on top of JSON's own alphabet, because JSON.stringify does
    // not escape it and the medium here is not JSON -- it is JSON inside an HTML
    // <script>. The HTML parser looks for the literal `</script` before any JSON
    // parser sees a byte, so a data value containing `</script>` closes the block
    // early and everything after it is parsed as MARKUP. That is script injection
    // through a data file, and it fails open: the page still builds, still
    // renders, and the only symptom is structured data that stops working.
    // < is valid JSON and reads back as `<`, so no consumer sees a
    // difference. Measured across all 19 routes at the time of the change: zero
    // JSON-LD blocks contain a `<`, so this moves no byte today -- it is the
    // guard for the day a product name or FAQ answer contains one. (Razor N1.)
    return JSON.stringify(value).slice(1, -1).replace(/</g, "\\u003c");
  });

  // Content-hashed asset URLs (P-A).
  //
  // styles.css and js/* are served with `max-age=31536000, immutable`
  // (netlify.toml). Before this, the cache key was a hand-typed `?v=YYYYMMDD`
  // stamp, and several were already stale by months — a returning visitor kept
  // the old asset for up to a year. The stamp is now derived from the file's
  // own bytes, so it cannot go stale and cannot be forgotten in a commit.
  //
  // The stamp hashes the MINIFIED bytes — the ones actually served. The first
  // version hashed the repo-root source instead, while the `eleventy.after`
  // hook rewrote dist/js/* and dist/styles.css through esbuild and lightningcss
  // afterwards. Source and served bytes therefore had different hashes
  // (measured: src 122e6cbc049c vs dist 717170a3633a for styles.css), and a
  // minifier upgrade would have changed what visitors receive without changing
  // the cache key — reintroducing the exact year-stale-cache bug this filter
  // exists to kill. Both minifiers are now pinned exact in package.json too,
  // belt and braces.
  //
  // One minification per asset, memoised here and consumed by the after-hook,
  // so the hash and the emitted file cannot drift apart by construction: they
  // are the same buffer.
  //
  // Fails CLOSED: a missing, unreadable, or unminifiable asset throws and the
  // build stops. Emitting an unstamped URL would silently reintroduce the bug.
  const crypto = require('crypto');
  const nodeFs = require('fs');
  const nodePath = require('path');
  const esbuild = require('esbuild');
  const lightningcss = require('lightningcss');

  /**
   * urlPath -> { stamped, code: Buffer, rel } for every asset a template stamped.
   *
   * Memoised PER BUILD, and cleared at the start of every build. The lifetime
   * matters in both directions:
   *
   *   within a build  the filter and the after-hook must see the same buffer,
   *                   or the hash and the published file drift apart — which is
   *                   the whole point of the cache;
   *   across builds   it must be empty, or `eleventy --watch`/`--serve` serves
   *                   the FIRST build's bytes forever. Passthrough copy would
   *                   put the edited styles.css into dist, and then the
   *                   after-hook would overwrite it with the stale cached
   *                   buffer — an edit silently absent from the served file.
   *                   Measured, not theorised: an edit made under --serve did
   *                   not reach dist/styles.css and the stamp never moved.
   *
   * A one-shot process (npm run build, Netlify, each visual-diff ref build)
   * runs `eleventy.before` exactly once against an already-empty map, so this
   * costs nothing there.
   */
  const assetCache = new Map();

  eleventyConfig.on('eleventy.before', () => {
    assetCache.clear();
  });

  /**
   * Apply the same minification the published file gets. Synchronous on
   * purpose: Eleventy filters cannot await, and the stamp must be computable at
   * render time. esbuild.transformSync and lightningcss.transform are both sync.
   */
  function minifyAsset(rel, bytes) {
    if (rel.endsWith('.js')) {
      return Buffer.from(esbuild.transformSync(bytes.toString('utf8'),
        { minify: true, loader: 'js' }).code);
    }
    if (rel.endsWith('.css')) {
      return Buffer.from(lightningcss.transform({
        filename: nodePath.basename(rel), code: bytes, minify: true,
      }).code);
    }
    return bytes;
  }

  eleventyConfig.addFilter("assetUrl", (urlPath) => {
    if (typeof urlPath !== 'string' || urlPath.length === 0) {
      throw new Error(`assetUrl: expected a non-empty path, got ${JSON.stringify(urlPath)}`);
    }
    if (urlPath.includes('?') || urlPath.includes('#')) {
      throw new Error(`assetUrl: path must not carry a query or fragment: ${urlPath}`);
    }
    if (assetCache.has(urlPath)) return assetCache.get(urlPath).stamped;

    // Source files live at the repo root (both are addPassthroughCopy targets),
    // so the request path maps one-to-one onto a path relative to __dirname.
    const rel = urlPath.replace(/^\/+/, '');
    const source = nodePath.resolve(__dirname, rel);
    if (!source.startsWith(nodePath.resolve(__dirname) + nodePath.sep)) {
      throw new Error(`assetUrl: path escapes the repo root: ${urlPath}`);
    }
    let bytes;
    try {
      bytes = nodeFs.readFileSync(source);
    } catch (err) {
      throw new Error(`assetUrl: cannot read asset for ${urlPath} (${source}): ${err.message}`);
    }
    let code;
    try {
      code = minifyAsset(rel, bytes);
    } catch (err) {
      throw new Error(`assetUrl: cannot minify ${urlPath}: ${err.message}`);
    }
    const hash = crypto.createHash('sha256').update(code).digest('hex').slice(0, 12);
    const stamped = `${urlPath}?v=${hash}`;
    assetCache.set(urlPath, { stamped, code, rel });
    return stamped;
  });

  // Date formatting filter for the sitemap (its only remaining consumer --
  // the blog plumbing that co-owned it was deleted 2026-08-06)
  eleventyConfig.addFilter("date", (dateObj, format) => {
    if (!dateObj) return '';
    const d = new Date(dateObj);
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    if (format === 'YYYY-MM-DD') {
      return d.toISOString().split('T')[0];
    }
    if (format === 'MMMM D, YYYY') {
      return months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
    }
    return d.toISOString();
  });

  eleventyConfig.addPassthroughCopy("js");
  eleventyConfig.addPassthroughCopy("styles.css");
  // Self-hosted web fonts. The binaries carry a content hash IN THE FILENAME
  // (not a ?v= stamp), so the `max-age=31536000, immutable` header in
  // netlify.toml can never serve a stale face: new bytes mean a new name and a
  // new URL. Copied verbatim -- woff2 is already brotli-compressed, so the
  // minify hook does not touch them. The OFL licence files ride along, which is
  // the attribution the licence asks for.
  eleventyConfig.addPassthroughCopy({ "src/fonts": "fonts" });

  // Post-build minification: JS (esbuild) + CSS (lightningcss).
  //
  // Any asset a template stamped with `assetUrl` is written from the SAME
  // buffer that produced its hash — never re-minified here — so the cache key
  // provably covers the served bytes. Assets nobody stamped (a JS file not
  // referenced through the filter) are still minified, from dist, exactly as
  // before; they are not cache-keyed, so there is nothing to keep in step.
  eleventyConfig.on('eleventy.after', async () => {
    const distDir = nodePath.resolve(__dirname, 'dist');

    /** Write the pre-minified, already-hashed buffer if we have one. */
    const writeStamped = (rel, filePath) => {
      const entry = assetCache.get(`/${rel}`);
      if (!entry) return false;
      nodeFs.writeFileSync(filePath, entry.code);
      return true;
    };

    const jsDir = nodePath.join(distDir, 'js');
    let fromCache = 0;
    let minifiedHere = 0;
    if (nodeFs.existsSync(jsDir)) {
      for (const file of nodeFs.readdirSync(jsDir).filter(f => f.endsWith('.js'))) {
        const filePath = nodePath.join(jsDir, file);
        if (writeStamped(`js/${file}`, filePath)) { fromCache += 1; continue; }
        nodeFs.writeFileSync(filePath,
          minifyAsset(file, nodeFs.readFileSync(filePath)));
        minifiedHere += 1;
      }
      console.log(`[minify] JS: ${fromCache} from the hashed buffer, ${minifiedHere} unstamped`);
    }

    const cssPath = nodePath.join(distDir, 'styles.css');
    if (nodeFs.existsSync(cssPath)) {
      if (writeStamped('styles.css', cssPath)) {
        console.log('[minify] CSS: styles.css written from the hashed buffer');
      } else {
        nodeFs.writeFileSync(cssPath, minifyAsset('styles.css', nodeFs.readFileSync(cssPath)));
        console.log('[minify] CSS: styles.css minified (unstamped)');
      }
    }
  });
  // NOTE: do not passthrough-copy "netlify" — Netlify deploys functions from the
  // repo path declared in netlify.toml (`functions = "netlify/functions"`), so
  // copying the directory into the publish dir only served function *source*
  // (advisor prompts, admin auth shape, Supabase wiring) as static files.
  // Same reasoning retires supabase-schema.sql: publishing the schema helps
  // nobody but an attacker.
  //
  // The analytics tracker/dashboard passthroughs are gone with the legacy
  // analytics stack they served. Live tracking is the centralized tracker at
  // ssc-ops.netlify.app (see src/_includes/scripts.njk), and the dashboard is
  // ops.secretsaunacompany.ca via the /analytics redirect in netlify.toml.
  eleventyConfig.addPassthroughCopy("booking-ops.html");
  eleventyConfig.addPassthroughCopy("booking-ops.js");
  eleventyConfig.addPassthroughCopy({ "src/robots.txt": "robots.txt" });

  // Auto-add responsive srcset to Cloudinary images.
  //
  // ONE generator. The transform below writes the srcset that ships on <img>
  // elements, and the two filters beside it write the SAME list for a
  // <link rel="preload" as="image"> so the preload and the element agree
  // candidate-for-candidate. They agree because they read the same two
  // constants -- a preload whose list drifts from the element's is not a
  // preload, it is a second download.
  var cloudinaryBase = "https://res.cloudinary.com/dlhqdgmih/image/upload/";
  var widths = [400, 800, 1200, 1920];

  // The accepted shape: `q_auto,f_auto`, then an OPTIONAL rotation, then the
  // path. Capture 1 is the angle segment (",a_90" / ",a_-90" / ",a_180") or
  // undefined; capture 2 is the image path.
  //
  // The angle tolerance exists because several photographs on this site carry
  // EXIF rotation their derivative does not honour, and the fix for that was a
  // hand-written `a_90` in the URL. That hand-written angle silently OPTED THE
  // IMAGE OUT of responsive delivery: the old pattern demanded `q_auto,f_auto/`
  // exactly, so an angle-carrying URL simply did not match, no srcset was
  // generated, and the browser fetched the full-size original. Measured on
  // three <img> elements (about :27, about :95, home :54) -- the correction that
  // made the picture the right way up was also the thing making it enormous.
  //
  // A WIDTH is still rejected, and deliberately so: the angle is a property of
  // the SOURCE (this photograph is on its side), while a width is a decision
  // about DELIVERY, which is the generator's job. `q_auto,f_auto,w_1200/...`
  // and `q_auto,f_auto,a_90,w_600/...` both fail to match and both still throw
  // from the filters, which is the B1 guard that stopped the homepage fetching
  // its LCP photograph twice. Tolerating rotation must not widen that hole.
  //
  // Order within the component is angle-then-width (`a_90,w_400`), matching the
  // hand-written URLs already in the templates: Cloudinary applies the
  // transforms left to right, so rotating before scaling is what keeps the
  // requested width meaning "width of the upright picture".
  var CLOUDINARY_BARE = /^https:\/\/res\.cloudinary\.com\/dlhqdgmih\/image\/upload\/q_auto,f_auto(,a_-?\d+)?\/(.+)$/;

  /** Build a delivery URL at width `w`, preserving any source rotation. */
  function cloudinaryAt(angle, imagePath, w) {
    return cloudinaryBase + "q_auto,f_auto" + (angle || "") + ",w_" + w + "/" + imagePath;
  }

  // The URL the transform puts in `src`: the w_800 candidate. A preload's href
  // is what a browser without imagesrcset support fetches, so it must be this
  // exact string or that browser fetches a second file.
  // Both filters REFUSE a URL that already carries a width, loudly, rather than
  // degrading.
  //
  // The shape they reject is the exact shape `src/index.njk` had before this
  // batch (`.../q_auto,f_auto,w_1200/...`), so it is not hypothetical -- it is
  // one careless edit away, and it is the shape every other preload page still
  // uses. Failing soft was the real hazard: `cloudinarySrcset` returning ""
  // emits `imagesrcset=""`, which no browser reports and which silently
  // reinstates the double fetch this whole commit exists to remove, while
  // `cloudinaryDefaultSrc` handing back the URL unchanged makes the page look
  // correct. A build that throws is a build somebody fixes.
  function bareCloudinaryPath(url, filterName) {
    var m = CLOUDINARY_BARE.exec(url || "");
    if (!m) {
      throw new Error(
        filterName + ": expected a Cloudinary URL with NO width transform "
        + '(".../q_auto,f_auto/<path>" or ".../q_auto,f_auto,a_<angle>/<path>"), got '
        + JSON.stringify(url) + ". "
        + "A page that sets `preload_responsive_sizes` must give `preload_image` "
        + "the same widthless src the <img> carries, because the responsive "
        + "preload's candidate list is generated from it. Hard-coding a width "
        + "here is what made the homepage fetch its LCP photograph twice.");
    }
    // { angle, path } -- angle is "" when the source needs no rotation, so
    // callers can concatenate it unconditionally.
    return { angle: m[1] || "", path: m[2] };
  }

  eleventyConfig.addFilter("cloudinaryDefaultSrc", function(url) {
    var src = bareCloudinaryPath(url, "cloudinaryDefaultSrc");
    return cloudinaryAt(src.angle, src.path, 800);
  });

  eleventyConfig.addFilter("cloudinarySrcset", function(url) {
    var src = bareCloudinaryPath(url, "cloudinarySrcset");
    return widths.map(function(w) {
      return cloudinaryAt(src.angle, src.path, w) + " " + w + "w";
    }).join(", ");
  });

  eleventyConfig.addTransform("cloudinaryResponsive", function(content, outputPath) {
    if (!outputPath || !outputPath.endsWith(".html")) return content;

    return content.replace(
      /<img([^>]*?)src="https:\/\/res\.cloudinary\.com\/dlhqdgmih\/image\/upload\/q_auto,f_auto(,a_-?\d+)?\/([^"]+)"([^>]*?)>/g,
      function(match, before, angleRaw, imagePath, after) {
        var angle = angleRaw || "";
        // Skip if already has srcset
        if (before.indexOf("srcset") !== -1 || after.indexOf("srcset") !== -1) return match;
        // The logo/favicon marks: a responsive candidate list is the wrong tool
        // for them (they render at a fixed ~48px of chrome, identically at every
        // breakpoint), but "no srcset" used to mean "no width either", and the
        // browser therefore fetched the ORIGINAL -- CircleWhite2025 is
        // 1257x1251. So they are pinned to a single small derivative instead of
        // being handed back untouched. w_192 is 4x the rendered box, which
        // covers a 3x display with room to spare and is still a rounding error
        // next to the full-size PNG.
        if (imagePath.indexOf("FINAL_LOGO") !== -1 || imagePath.indexOf("Circle") !== -1) {
          return '<img' + before + 'src="' + cloudinaryAt(angle, imagePath, 192) + '"' + after + '>';
        }

        var srcset = widths.map(function(w) {
          return cloudinaryAt(angle, imagePath, w) + " " + w + "w";
        }).join(", ");

        var defaultSrc = cloudinaryAt(angle, imagePath, 800);

        // The default `sizes` describes the site's ordinary case: a card or a
        // plate inside a contained column, which is why it tops out at 800px.
        // The hero is not that case -- it renders full-bleed 100vw (styles.css
        // .hero-image), so the default made the browser resolve w_800 for the
        // LCP element on a 1440px viewport. A GLOBAL change here would be
        // wrong in the other direction, so instead the transform now RESPECTS
        // a `sizes` an author put on the element: per-element override, one
        // srcset generator, no hand-authored srcset anywhere.
        var authored = /\ssizes\s*=\s*"([^"]*)"/.exec(before) || /\ssizes\s*=\s*"([^"]*)"/.exec(after);
        var sizes = authored ? authored[1] : '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 800px';
        var strippedBefore = before.replace(/\ssizes\s*=\s*"[^"]*"/, '');
        var strippedAfter = after.replace(/\ssizes\s*=\s*"[^"]*"/, '');

        return '<img' + strippedBefore + 'src="' + defaultSrc + '" srcset="' + srcset + '" sizes="' + sizes + '"' + strippedAfter + '>';
      }
    );
  });

  return {
    dir: {
      input: "src",
      output: "dist",
      includes: "_includes",
      data: "_data"
    },
    templateFormats: ["njk", "html", "md"],
    htmlTemplateEngine: "njk"
  };
};
