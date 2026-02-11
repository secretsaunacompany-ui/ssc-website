module.exports = function(eleventyConfig) {
  eleventyConfig.addFilter("currentYear", () => new Date().getFullYear());

  eleventyConfig.addPassthroughCopy("js");
  eleventyConfig.addPassthroughCopy("styles.css");
  eleventyConfig.addPassthroughCopy("netlify");
  eleventyConfig.addPassthroughCopy("analytics-tracker-netlify.js");
  eleventyConfig.addPassthroughCopy("analytics-dashboard-netlify.js");
  eleventyConfig.addPassthroughCopy("analytics-dashboard-netlify.html");
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
