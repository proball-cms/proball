const { DateTime } = require("luxon");
const markdownIt = require("markdown-it");
const md = markdownIt({ html: true, breaks: false, linkify: false });

module.exports = function(eleventyConfig) {

  // Pass static files through unchanged
  eleventyConfig.addPassthroughCopy("index.html");
  eleventyConfig.addPassthroughCopy("how-to-join.html");
  eleventyConfig.addPassthroughCopy("schedule.html");
  eleventyConfig.addPassthroughCopy("terms.html");
  eleventyConfig.addPassthroughCopy("sitemap.xml");
  eleventyConfig.addPassthroughCopy("booking-modal.js");
  eleventyConfig.addPassthroughCopy("images");
  eleventyConfig.addPassthroughCopy("admin");

  // Date filters
  eleventyConfig.addFilter("readableDate", (dateObj) => {
    return DateTime.fromJSDate(dateObj, { zone: "utc" }).toFormat("d LLL yyyy");
  });

  eleventyConfig.addFilter("isoDate", (dateObj) => {
    return DateTime.fromJSDate(dateObj, { zone: "utc" }).toISODate();
  });

  // Render markdown string from frontmatter
  eleventyConfig.addFilter("markdown", (content) => {
    if (!content) return "";
    return md.render(String(content));
  });

  // Collection helpers
  eleventyConfig.addFilter("exclude", (collection, currentUrl) => {
    return collection.filter(post => post.url !== currentUrl);
  });

  eleventyConfig.addFilter("limit", (arr, n) => {
    return arr.slice(0, n);
  });

  eleventyConfig.addCollection("posts", (collectionApi) => {
    return collectionApi.getFilteredByTag("posts")
      .sort((a, b) => b.date - a.date);
  });

  eleventyConfig.addCollection("locations", (collectionApi) => {
    return collectionApi.getFilteredByTag("locations")
      .sort((a, b) => (a.data.order || 99) - (b.data.order || 99));
  });

  eleventyConfig.addCollection("miniballLocations", (collectionApi) => {
    return collectionApi.getFilteredByTag("locations")
      .filter(loc => loc.data.programs && loc.data.programs.includes("miniball"))
      .sort((a, b) => (a.data.order || 99) - (b.data.order || 99));
  });

  eleventyConfig.addCollection("academyLocations", (collectionApi) => {
    return collectionApi.getFilteredByTag("locations")
      .filter(loc => loc.data.programs && loc.data.programs.includes("academy"))
      .sort((a, b) => (a.data.order || 99) - (b.data.order || 99));
  });

  eleventyConfig.addCollection("team", (collectionApi) => {
    return collectionApi.getFilteredByTag("team")
      .sort((a, b) => (a.data.order || 99) - (b.data.order || 99));
  });

  return {
    dir: {
      input: ".",
      output: "_site",
      includes: "_includes",
      layouts: "_layouts",
      data: "_data"
    },
    htmlTemplateEngine: false,
    markdownTemplateEngine: "njk"
  };
};
