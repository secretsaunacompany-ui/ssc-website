module.exports = function(eleventyConfig) {
  eleventyConfig.addFilter("currentYear", () => new Date().getFullYear());

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
  eleventyConfig.addPassthroughCopy("netlify");
  eleventyConfig.addPassthroughCopy("analytics-tracker-netlify.js");
  eleventyConfig.addPassthroughCopy("analytics-dashboard-netlify.js");
  eleventyConfig.addPassthroughCopy("analytics-dashboard-netlify.html");
  eleventyConfig.addPassthroughCopy("booking-ops.html");
  eleventyConfig.addPassthroughCopy("booking-ops.js");
  eleventyConfig.addPassthroughCopy("supabase-schema.sql");
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
    templateFormats: ["njk", "html"],
    htmlTemplateEngine: "njk"
  };
};
