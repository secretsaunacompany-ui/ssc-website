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
  // Fails CLOSED: a missing or unreadable asset throws and the build stops.
  // Emitting an unstamped URL would silently reintroduce the year-cache bug.
  const crypto = require('crypto');
  const nodeFs = require('fs');
  const nodePath = require('path');
  const assetHashCache = new Map();

  eleventyConfig.addFilter("assetUrl", (urlPath) => {
    if (typeof urlPath !== 'string' || urlPath.length === 0) {
      throw new Error(`assetUrl: expected a non-empty path, got ${JSON.stringify(urlPath)}`);
    }
    if (urlPath.includes('?') || urlPath.includes('#')) {
      throw new Error(`assetUrl: path must not carry a query or fragment: ${urlPath}`);
    }
    if (assetHashCache.has(urlPath)) return assetHashCache.get(urlPath);

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
    const hash = crypto.createHash('sha256').update(bytes).digest('hex').slice(0, 12);
    const stamped = `${urlPath}?v=${hash}`;
    assetHashCache.set(urlPath, stamped);
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

  // Post-build minification: JS (esbuild) + CSS (lightningcss)
  eleventyConfig.on('eleventy.after', async () => {
    const fs = require('fs');
    const path = require('path');
    const esbuild = require('esbuild');
    const { transform } = require('lightningcss');

    const distDir = path.resolve(__dirname, 'dist');

    // Minify JS files in dist/js/
    const jsDir = path.join(distDir, 'js');
    if (fs.existsSync(jsDir)) {
      const jsFiles = fs.readdirSync(jsDir).filter(f => f.endsWith('.js'));
      for (const file of jsFiles) {
        const filePath = path.join(jsDir, file);
        const result = await esbuild.transform(fs.readFileSync(filePath, 'utf8'), {
          minify: true,
          loader: 'js',
        });
        fs.writeFileSync(filePath, result.code);
      }
      console.log('[minify] JS: ' + jsFiles.length + ' files minified');
    }

    // Minify CSS: dist/styles.css
    const cssPath = path.join(distDir, 'styles.css');
    if (fs.existsSync(cssPath)) {
      const cssCode = fs.readFileSync(cssPath);
      const result = transform({
        filename: 'styles.css',
        code: cssCode,
        minify: true,
      });
      fs.writeFileSync(cssPath, result.code);
      console.log('[minify] CSS: styles.css minified');
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
