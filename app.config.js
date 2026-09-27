// Extends app.json. The only dynamic piece is the web base URL: empty for
// local development and root hosting, "/orexis" when built for GitHub Pages.
module.exports = ({ config }) => ({
  ...config,
  experiments: {
    ...config.experiments,
    baseUrl: process.env.WEB_BASE_URL ?? "",
  },
});
