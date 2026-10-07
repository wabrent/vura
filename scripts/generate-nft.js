/**
 * Vura Genesis Pass — NFT Asset & Metadata Generator
 *
 * Generates 333 unique 1-bit monochrome (1000x1000) PNG images and
 * matching ERC-721 JSON metadata files.
 *
 * Usage:
 *   node scripts/generate-nft.js
 *   npm run generate:nft
 *
 * Output:
 *   nft-assets/images/{id}.png
 *   nft-assets/metadata/{id}.json
 */

const { createCanvas } = require("canvas");
const fs = require("fs");
const path = require("path");

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const MAX_SUPPLY = 333;
const IMAGE_SIZE = 1000;
const IMG_DIR = path.join(__dirname, "..", "nft-assets", "images");
const META_DIR = path.join(__dirname, "..", "nft-assets", "metadata");

// Placeholder IPFS CID — replace after uploading assets.
const IPFS_CID = "__CID__";

// Rarity tiers
const TIERS = [
  { name: "Common", weight: 60, start: 1, end: 200 }, // #001-#200
  { name: "Uncommon", weight: 25, start: 201, end: 280 }, // #201-#280
  { name: "Rare", weight: 10, start: 281, end: 320 }, // #281-#320
  { name: "Legendary", weight: 5, start: 321, end: 333 }, // #321-#333
];

// ---------------------------------------------------------------------------
// Deterministic PRNG (mulberry32) — same id => same image, always reproducible
// ---------------------------------------------------------------------------
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function tierForId(id) {
  for (const t of TIERS) {
    if (id >= t.start && id <= t.end) return t;
  }
  return TIERS[0];
}

// ---------------------------------------------------------------------------
// ASCII / pixel cyber-skull — 26 rows x 34 cols grid of characters
// Each id gets a deterministic perturbation so every skull is unique.
// ---------------------------------------------------------------------------
const SKULL_BASE = [
  "     .....................     ",
  "   ..:::::::::::::::::::::..   ",
  "  .:::::::::****::::::::::::.  ",
  " .:::::::**********:::::::::. ",
  ".::::::**************::::::::.",
  ".:::::****..    ..****:::::.",
  ".::::***..      ..***::::::.",
  ".:::**..        ..**:::::::.",
  ".:::**  ######  **::::::::.",
  ".:::*. ######### .*::::::::.",
  ".:::* ##  ###  ## *::::::::.",
  ".:::* #  #####  # *::::::::.",
  ".:::** ##### **::::::::::.",
  ".:::**  ###  **:::::::::",
  ".:::*.  # #  .*:::::::::",
  ".::::* ###### *::::::::",
  ".::::**######**::::::::",
  " .:::*  |||  *::::::. ",
  " .:::*. | | .*::::::.  ",
  "  .:::: ||| ::::::.    ",
  "  .:::::|||::::::::.   ",
  "   .::::||||:::::.     ",
  "    .::::::::::::.      ",
  "     ....::....         ",
  "      ........          ",
  "                          ",
];

// Symbols used in the skull grid (1-bit: full block / empty / dither levels)

function drawSkull(ctx, rand, cx, cy, cell) {
  const rows = SKULL_BASE.length;
  const cols = Math.max(...SKULL_BASE.map((r) => r.length));
  const offsetX = cx - (cols * cell) / 2;
  const offsetY = cy - (rows * cell) / 2;

  ctx.fillStyle = "#ffffff";

  for (let r = 0; r < rows; r++) {
    const line = SKULL_BASE[r];
    // center each row individually (rows have different lengths)
    const lineOffset = Math.floor((cols - line.length) / 2);
    for (let c = 0; c < line.length; c++) {
      const base = line[c];
      if (base === " ") continue;

      // Convert density char -> filled ratio for 1-bit dither
      const density = { "#": 1.0, "*": 0.8, ".": 0.55, ":": 0.35, " ": 0 }[base];
      if (density === undefined || density === 0) continue;

      // Deterministic per-id noise: slightly shift density at random pixels
      let d = density;
      if (rand() > 0.93) {
        d = density >= 0.5 ? Math.max(0.35, density - 0.25) : Math.min(1.0, density + 0.25);
      }

      // Ordered 4x4 Bayer dither for crisp 1-bit look
      const bayer = [
        [0, 8, 2, 10],
        [12, 4, 14, 6],
        [3, 11, 1, 9],
        [15, 7, 13, 5],
      ];
      const bay = bayer[r % 4][c % 4] / 16;
      if (d > bay) {
        ctx.fillRect(
          offsetX + (c + lineOffset) * cell,
          offsetY + r * cell,
          cell,
          cell
        );
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Pixel-art VURA wordmark (5x7 pixel font, scaled up)
// ---------------------------------------------------------------------------
const FONT = {
  A: [".XXX.", "X...X", "X...X", "XXXXX", "X...X", "X...X", "X...X"],
  B: ["XXXX.", "X...X", "X...X", "XXXX.", "X...X", "X...X", "XXXX."],
  C: [".XXX.", "X...X", "X....", "X....", "X....", "X...X", ".XXX."],
  D: ["XXXX.", "X...X", "X...X", "X...X", "X...X", "X...X", "XXXX."],
  E: ["XXXXX", "X....", "X....", "XXXX.", "X....", "X....", "XXXXX"],
  F: ["XXXXX", "X....", "X....", "XXXX.", "X....", "X....", "X...."],
  G: [".XXX.", "X...X", "X....", "X.XXX", "X...X", "X...X", ".XXXX"],
  H: ["X...X", "X...X", "X...X", "XXXXX", "X...X", "X...X", "X...X"],
  I: [".XXX.", "..X..", "..X..", "..X..", "..X..", "..X..", ".XXX."],
  J: ["..XXX", "...X.", "...X.", "...X.", "...X.", "X..X.", ".XX.."],
  K: ["X...X", "X..X.", "X.X..", "XX...", "X.X..", "X..X.", "X...X"],
  L: ["X....", "X....", "X....", "X....", "X....", "X....", "XXXXX"],
  M: ["X...X", "XX.XX", "X.X.X", "X.X.X", "X...X", "X...X", "X...X"],
  N: ["X...X", "XX..X", "XX..X", "X.X.X", "X..XX", "X..XX", "X...X"],
  O: [".XXX.", "X...X", "X...X", "X...X", "X...X", "X...X", ".XXX."],
  P: ["XXXX.", "X...X", "X...X", "XXXX.", "X....", "X....", "X...."],
  Q: [".XXX.", "X...X", "X...X", "X...X", "X.X.X", "X..X.", ".XX.X"],
  R: ["XXXX.", "X...X", "X...X", "XXXX.", "X.X..", "X..X.", "X...X"],
  S: [".XXXX", "X....", "X....", ".XXX.", "....X", "....X", "XXXX."],
  T: ["XXXXX", "..X..", "..X..", "..X..", "..X..", "..X..", "..X.."],
  U: ["X...X", "X...X", "X...X", "X...X", "X...X", "X...X", ".XXX."],
  V: ["X...X", "X...X", "X...X", ".X.X.", ".X.X.", ".X.X.", "..X.."],
  W: ["X...X", "X...X", "X...X", "X.X.X", "X.X.X", "XX.XX", "X...X"],
  X: ["X...X", "X...X", ".X.X.", "..X..", ".X.X.", "X...X", "X...X"],
  Y: ["X...X", "X...X", ".X.X.", "..X..", "..X..", "..X..", "..X.."],
  Z: ["XXXXX", "....X", "...X.", "..X..", ".X...", "X....", "XXXXX"],
  "0": [".XXX.", "X...X", "X..XX", "X.X.X", "XX..X", "X...X", ".XXX."],
  "1": ["..X..", ".XX..", "..X..", "..X..", "..X..", "..X..", ".XXX."],
  "2": [".XXX.", "X...X", "....X", "..XX.", ".X...", "X....", "XXXXX"],
  "3": [".XXX.", "X...X", "....X", "..XX.", "....X", "X...X", ".XXX."],
  "4": ["...X.", "..XX.", ".X.X.", "X..X.", "XXXXX", "...X.", "...X."],
  "5": ["XXXXX", "X....", "XXXX.", "....X", "....X", "X...X", ".XXX."],
  "6": [".XXX.", "X....", "XXXX.", "X...X", "X...X", "X...X", ".XXX."],
  "7": ["XXXXX", "....X", "...X.", "..X..", ".X...", ".X...", ".X..."],
  "8": [".XXX.", "X...X", "X...X", ".XXX.", "X...X", "X...X", ".XXX."],
  "9": [".XXX.", "X...X", "X...X", ".XXXX", "....X", "....X", ".XXX."],
  " ": [".....", ".....", ".....", ".....", ".....", ".....", "....."],
  "{": ["...XX", "..X..", "..X..", "..X..", "..X..", "..X..", "...XX"],
  "}": ["XX...", "..X..", "..X..", "..X..", "..X..", "..X..", "XX..."],
  "#": [".X.X.", "XXXXX", ".X.X.", ".X.X.", "XXXXX", ".X.X.", ".X.X."],
  ".": [".....", ".....", ".....", ".....", ".....", ".XX..", ".XX.."],
  "/": ["....X", "...X.", "...X.", "..X..", ".X...", ".X...", "X...."],
  ":": [".....", ".XX..", ".XX..", ".....", ".XX..", ".XX..", "....."],
};

function drawText(ctx, text, x, y, px) {
  ctx.fillStyle = "#ffffff";
  let cursor = x;
  for (const raw of text.toUpperCase()) {
    const glyph = FONT[raw];
    if (!glyph) {
      cursor += px * 4;
      continue;
    }
    for (let r = 0; r < glyph.length; r++) {
      for (let c = 0; c < glyph[r].length; c++) {
        if (glyph[r][c] === "X") {
          ctx.fillRect(cursor + c * px, y + r * px, px, px);
        }
      }
    }
    cursor += px * (glyph[0].length + 1);
  }
  return cursor - x; // total width
}

function textWidth(text, px) {
  let w = 0;
  for (const raw of text.toUpperCase()) {
    const glyph = FONT[raw];
    w += px * ((glyph ? glyph[0].length : 3) + 1);
  }
  return w;
}

// ---------------------------------------------------------------------------
// Scanline + border decoration
// ---------------------------------------------------------------------------
function drawFrame(ctx, rand, id) {
  ctx.fillStyle = "#ffffff";
  const b = 14; // border thickness
  // outer border
  ctx.fillRect(0, 0, IMAGE_SIZE, b);
  ctx.fillRect(0, IMAGE_SIZE - b, IMAGE_SIZE, b);
  ctx.fillRect(0, 0, b, IMAGE_SIZE);
  ctx.fillRect(IMAGE_SIZE - b, 0, b, IMAGE_SIZE);

  // corner brackets (thicker)
  const bracket = 60;
  ctx.fillRect(0, 0, bracket, b + 6);
  ctx.fillRect(0, 0, b + 6, bracket);
  ctx.fillRect(IMAGE_SIZE - bracket, 0, bracket, b + 6);
  ctx.fillRect(IMAGE_SIZE - b - 6, 0, b + 6, bracket);
  ctx.fillRect(0, IMAGE_SIZE - b - 6, bracket, b + 6);
  ctx.fillRect(0, IMAGE_SIZE - bracket, b + 6, bracket);
  ctx.fillRect(IMAGE_SIZE - bracket, IMAGE_SIZE - b - 6, bracket, b + 6);
  ctx.fillRect(IMAGE_SIZE - b - 6, IMAGE_SIZE - bracket, b + 6, bracket);

  // pixel noise along top edge
  for (let i = 0; i < 40; i++) {
    const x = Math.floor(rand() * (IMAGE_SIZE - 8));
    const w = 2 + Math.floor(rand() * 6);
    ctx.fillRect(x, b + 6, w, 4);
  }

  // scanline dashes on sides
  for (let y = 100; y < IMAGE_SIZE - 100; y += 40) {
    if (rand() > 0.5) {
      ctx.fillRect(b + 6, y, 10, 4);
      ctx.fillRect(IMAGE_SIZE - b - 16, y, 10, 4);
    }
  }
}

// ---------------------------------------------------------------------------
// Compose one NFT image
// ---------------------------------------------------------------------------
function generateImage(id) {
  const canvas = createCanvas(IMAGE_SIZE, IMAGE_SIZE);
  const ctx = canvas.getContext("2d");

  // black background
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, IMAGE_SIZE, IMAGE_SIZE);

  const rand = mulberry32(id * 7919 + 104729);

  // frame
  drawFrame(ctx, rand, id);

  // ---- Top: VURA logo wordmark ----
  const logoPx = 18; // pixel size
  const logoText = "VURA";
  const logoW = textWidth(logoText, logoPx);
  drawText(ctx, logoText, (IMAGE_SIZE - logoW) / 2, 70, logoPx);

  // subtitle under logo
  const subPx = 6;
  const subText = "{ GENESIS PASS }";
  const subW = textWidth(subText, subPx);
  drawText(ctx, subText, (IMAGE_SIZE - subW) / 2, 70 + 7 * logoPx + 24, subPx);

  // ---- Center: cyber-skull ----
  const cell = 15;
  drawSkull(ctx, rand, IMAGE_SIZE / 2, IMAGE_SIZE / 2 - 20, cell);

  // ---- Bottom text block ----
  const line1 = `GENESIS PASS #${String(id).padStart(3, "0")}`;
  const px1 = 8;
  const w1 = textWidth(line1, px1);
  drawText(ctx, line1, (IMAGE_SIZE - w1) / 2, IMAGE_SIZE - 215, px1);

  const line2 = "VURA.INK/MINT";
  const px2 = 7;
  const w2 = textWidth(line2, px2);
  drawText(ctx, line2, (IMAGE_SIZE - w2) / 2, IMAGE_SIZE - 145, px2);

  const line3 = "JOINED THE GENESIS";
  const px3 = 6;
  const w3 = textWidth(line3, px3);
  drawText(ctx, line3, (IMAGE_SIZE - w3) / 2, IMAGE_SIZE - 85, px3);

  // id hash footer (unique per token, monospace-ish pixel bar)
  ctx.fillStyle = "#ffffff";
  const barY = IMAGE_SIZE - 34;
  for (let i = 0; i < 33; i++) {
    const h = 4 + Math.floor(rand() * 12);
    ctx.fillRect(40 + i * ((IMAGE_SIZE - 80) / 33), barY - h, 18, h);
  }

  return canvas;
}

// ---------------------------------------------------------------------------
// ERC-721 metadata
// ---------------------------------------------------------------------------
function generateMetadata(id) {
  const tier = tierForId(id);
  return {
    name: `Vura Genesis Pass #${String(id).padStart(3, "0")}`,
    description:
      "Vura Genesis Pass — a limited 1-bit monochrome access pass on Robinhood. " +
      "333 passes only. Holders get early access to the Vura ecosystem. " +
      "Joined the genesis. vura.ink/mint",
    image: `ipfs://${IPFS_CID}/${id}.png`,
    external_url: "https://vura.ink",
    attributes: [
      { trait_type: "Pass Type", value: "Genesis Pass" },
      { trait_type: "Pass ID", value: id },
      { trait_type: "Tier", value: tier.name },
      { trait_type: "Total Supply", value: 333 },
      { trait_type: "Chain", value: "Robinhood" },
    ],
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
function ensureDirs() {
  for (const dir of [IMG_DIR, META_DIR]) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }
}

function main() {
  ensureDirs();
  console.log(`\n=== Vura Genesis Pass generator ===`);
  console.log(`Supply : ${MAX_SUPPLY}`);
  console.log(`Images : ${IMG_DIR}`);
  console.log(`Meta   : ${META_DIR}\n`);

  const start = Date.now();

  for (let id = 1; id <= MAX_SUPPLY; id++) {
    const canvas = generateImage(id);
    const png = canvas.toBuffer("image/png");
    fs.writeFileSync(path.join(IMG_DIR, `${id}.png`), png);

    const meta = generateMetadata(id);
    fs.writeFileSync(
      path.join(META_DIR, `${id}.json`),
      JSON.stringify(meta, null, 2)
    );

    if (id % 50 === 0 || id === MAX_SUPPLY) {
      const pct = ((id / MAX_SUPPLY) * 100).toFixed(0);
      process.stdout.write(`\r  generating... ${id}/${MAX_SUPPLY} (${pct}%)`);
    }
  }

  const secs = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\n\nDone in ${secs}s`);
  console.log(`  ${MAX_SUPPLY} images in nft-assets/images/`);
  console.log(`  ${MAX_SUPPLY} metadata in nft-assets/metadata/`);
  console.log(`\nNext steps:`);
  console.log(`  1. Upload nft-assets/images/ + metadata/ to IPFS`);
  console.log(`  2. Replace __CID__ in metadata with real CID`);
  console.log(`  3. Set baseTokenURI on contract to ipfs://{CID}/\n`);
}

main();
