// Builds the installable web app into dist/:
//   1. expo export for web
//   2. inject the manifest link and service worker registration into index.html
//   3. copy index.html to 404.html so deep links work on static hosts
//   4. generate a precaching service worker with Workbox
// Run with: node scripts/build-web.mjs
import { execSync } from "node:child_process";
import { copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { generateSW } = require("workbox-build");

const DIST = "dist";
// Sub-path the site is hosted under, e.g. "/orexis" on GitHub Pages. Empty at the root.
// app.config.js passes the same value to Expo as experiments.baseUrl.
const base = (process.env.WEB_BASE_URL ?? "").replace(/\/$/, "");

execSync(`npx expo export --platform web --output-dir ${DIST}`, { stdio: "inherit" });

const indexPath = `${DIST}/index.html`;
let html = readFileSync(indexPath, "utf8");

const headTags = `<link rel="manifest" href="${base}/manifest.json" />
<link rel="apple-touch-icon" href="${base}/icons/icon-192.png" />
<meta name="mobile-web-app-capable" content="yes" />`;

const swScript = `<script>
if ("serviceWorker" in navigator) {
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("${base}/sw.js").catch(function (e) { console.warn("Service worker failed", e); });
  });
}
</script>`;

if (!html.includes('rel="manifest"')) html = html.replace("</head>", `${headTags}\n</head>`);
if (!html.includes("serviceWorker")) html = html.replace("</body>", `${swScript}\n</body>`);
writeFileSync(indexPath, html);
copyFileSync(indexPath, `${DIST}/404.html`);

const { count, size, warnings } = await generateSW({
  globDirectory: DIST,
  globPatterns: ["**/*.{html,js,css,png,ico,json,ttf,otf,woff,woff2}"],
  globIgnores: ["404.html", "metadata.json"],
  swDest: `${DIST}/sw.js`,
  // Bundles carry content hashes in their names; the shell is small enough to cache whole.
  maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
  navigateFallback: `${base}/index.html`,
  clientsClaim: true,
  skipWaiting: true,
  sourcemap: false,
});
for (const w of warnings) console.warn(w);
console.log(`Service worker precaches ${count} files, ${(size / 1024).toFixed(0)} KB`);
