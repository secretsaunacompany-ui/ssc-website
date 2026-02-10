module.exports = function(eleventyConfig) {
  eleventyConfig.addPassthroughCopy("js");
  eleventyConfig.addPassthroughCopy("styles.css");
  eleventyConfig.addPassthroughCopy("netlify");
  eleventyConfig.addPassthroughCopy("analytics-tracker-netlify.js");
  eleventyConfig.addPassthroughCopy("analytics-dashboard-netlify.js");
  eleventyConfig.addPassthroughCopy("analytics-dashboard-netlify.html");
  eleventyConfig.addPassthroughCopy("supabase-schema.sql");

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
