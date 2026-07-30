module.exports = function(eleventyConfig) {
  eleventyConfig.addFilter("currentYear", () => new Date().getFullYear());

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

  /** urlPath -> { stamped, code: Buffer, rel } for every asset a template stamped. */
  const assetCache = new Map();

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

  // Date formatting filter for blog posts and sitemap
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

  // Blog collection
  eleventyConfig.addCollection("blog", function(collectionApi) {
    return collectionApi.getFilteredByTag("blog").sort((a, b) => a.date - b.date);
  });

  eleventyConfig.addPassthroughCopy("js");
  eleventyConfig.addPassthroughCopy("styles.css");

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

  // Auto-add responsive srcset to Cloudinary images
  eleventyConfig.addTransform("cloudinaryResponsive", function(content, outputPath) {
    if (!outputPath || !outputPath.endsWith(".html")) return content;

    var cloudinaryBase = "https://res.cloudinary.com/dlhqdgmih/image/upload/";
    var widths = [400, 800, 1200, 1920];

    return content.replace(
      /<img([^>]*?)src="https:\/\/res\.cloudinary\.com\/dlhqdgmih\/image\/upload\/q_auto,f_auto\/([^"]+)"([^>]*?)>/g,
      function(match, before, imagePath, after) {
        // Skip if already has srcset
        if (before.indexOf("srcset") !== -1 || after.indexOf("srcset") !== -1) return match;
        // Skip logo/favicon (small images that don't need responsive)
        if (imagePath.indexOf("FINAL_LOGO") !== -1 || imagePath.indexOf("Circle") !== -1) return match;

        var srcset = widths.map(function(w) {
          return cloudinaryBase + "q_auto,f_auto,w_" + w + "/" + imagePath + " " + w + "w";
        }).join(", ");

        var defaultSrc = cloudinaryBase + "q_auto,f_auto,w_800/" + imagePath;
        var sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 800px';

        return '<img' + before + 'src="' + defaultSrc + '" srcset="' + srcset + '" sizes="' + sizes + '"' + after + '>';
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
