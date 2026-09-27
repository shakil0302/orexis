// Generates the web app icons in public/icons from assets/icon.png.
// Run with: node scripts/make-icons.mjs
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";

const require = createRequire(import.meta.url);
const Jimp = require("jimp-compact");

const SOURCE = "assets/icon.png";
const OUT = "public/icons";
const BACKGROUND = 0xffffffff;

mkdirSync(OUT, { recursive: true });

const source = await Jimp.read(SOURCE);

for (const size of [192, 512]) {
  const img = source.clone().cover(size, size);
  await img.writeAsync(`${OUT}/icon-${size}.png`);
}

// Maskable icons are cropped to a circle or squircle by the launcher, so the
// artwork must sit inside the central 80%. Pad it on a solid background.
const maskable = new Jimp(512, 512, BACKGROUND);
const inner = source.clone().cover(410, 410);
maskable.composite(inner, (512 - 410) / 2, (512 - 410) / 2);
await maskable.writeAsync(`${OUT}/icon-maskable-512.png`);

console.log(`Wrote icons to ${OUT}`);
