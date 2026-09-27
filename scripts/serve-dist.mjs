// Serves dist/ the way a static host would, for checking the built web app locally.
// Honours experiments.baseUrl from app.json so sub-path hosting can be tested too.
// Run with: node scripts/serve-dist.mjs [port]
import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";

const DIST = "dist";
const port = Number(process.argv[2] ?? 8082);
const appConfig = JSON.parse(readFileSync("app.json", "utf8"));
const base = (appConfig.expo.experiments?.baseUrl ?? "").replace(/\/$/, "");

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".ttf": "font/ttf",
  ".woff2": "font/woff2",
};

createServer((req, res) => {
  let path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (base && path.startsWith(base)) path = path.slice(base.length) || "/";
  else if (base) {
    res.writeHead(404).end("outside base path");
    return;
  }
  let file = join(DIST, normalize(path));
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
  if (!existsSync(file)) file = join(DIST, "404.html");
  const type = TYPES[extname(file)] ?? "application/octet-stream";
  res.writeHead(200, { "Content-Type": type, "Cache-Control": "no-store" });
  res.end(readFileSync(file));
}).listen(port, () => console.log(`Serving ${DIST} at http://localhost:${port}${base}/`));
