// ============================================================================
// VURA // RINGS - production generator for the 10,000-piece collection.
// Deterministic: token id -> seed -> same SVG + traits forever.
//
// Usage:
//   node ring_gen.mjs test           - 12 sample renders
//   node ring_gen.mjs all            - full 10,000 PNGs + metadata
//   node ring_gen.mjs range 1 500    - render ids 1..500
//
// Output:  <OUT>/images/00001.png ... <OUT>/metadata/00001.json ... traits.json
// ============================================================================

import { Resvg } from "@resvg/resvg-js";
import sharp from "sharp";
import { writeFileSync, mkdirSync, statSync, readFileSync, rmSync } from "node:fs";
import { spawn } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = process.env.VURA_OUT || "C:/Users/waabrent/Downloads/vura_signal/out";
const SIZE = 1024;

// ── rng ─────────────────────────────────────────────────────────────────────
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── traits ──────────────────────────────────────────────────────────────────
const PALETTES = [
  { w: 72, name: "PHOSPHOR", main: "#00ff66", mid: "#39ffb0", light: "#daffea", bg0: "#0a1710", bg1: "#020a06" },
  { w: 10, name: "ICE", main: "#39d8ff", mid: "#7de8ff", light: "#d0f6ff", bg0: "#08161c", bg1: "#03090c" },
  { w: 7, name: "CRIMSON", main: "#ff4d26", mid: "#ff7a55", light: "#ffd2c4", bg0: "#1a0a06", bg1: "#0b0403" },
  { w: 5, name: "AURUM", main: "#ffc233", mid: "#ffd87a", light: "#fff0c2", bg0: "#191204", bg1: "#0a0702" },
  { w: 4, name: "PRISM", main: "#e8f2ec", mid: "#ffffff", light: "#ffffff", bg0: "#121614", bg1: "#050706" },
  { w: 2, name: "VIOLET", main: "#a07cff", mid: "#c4aaff", light: "#e6dcff", bg0: "#130d20", bg1: "#060410" },
];
const TIERS = [
  [90, "COMMON"],
  [97, "UNCOMMON"],
  [99, "RARE"],
  [99.7, "EPIC"],
  [100, "LEGENDARY"],
];

function traitsFor(id) {
  const r = mulberry32((id * 2654435761) >>> 0);
  const rf = (a, b) => a + r() * (b - a);
  const ri = (a, b) => Math.floor(rf(a, b + 1));

  let pick = rf(0, 100);
  let palette = PALETTES[0];
  for (const p of PALETTES) {
    if (pick < p.w) { palette = p; break; }
    pick -= p.w;
  }
  const rings = ri(22, 42);
  const dirX = (r() < 0.5 ? -1 : 1) * rf(1.8, 4.6);
  const dirY = (r() < 0.5 ? -1 : 1) * rf(0.8, 2.4);
  const bandK = ri(5, 9);
  const bandOff = ri(0, bandK - 1);
  const warpMode = r() < 0.22 ? "VORTEX" : r() < 0.45 ? "DRIFT" : "ORBIT";
  const rarityRoll = r();
  const rarity = Math.min(99, Math.max(3, Math.round(3 + Math.pow(rarityRoll, 1.7) * 96)));
  let tier = "COMMON";
  const rp = rarityRoll * 100;
  for (const [lim, t] of TIERS) { if (rp <= lim) { tier = t; break; } }
  return { palette, rings, dirX, dirY, bandK, bandOff, warpMode, rarity, tier };
}

// ── svg ─────────────────────────────────────────────────────────────────────
function buildSVG(id) {
  const t = traitsFor(id);
  const S = SIZE;
  const k = S / 480;
  const P = t.palette;
  const r = mulberry32(((id ^ 0x5f3759df) * 2654435761) >>> 0);
  const rf = (a, b) => a + r() * (b - a);
  const cx0 = S / 2 + rf(-14, 14) * k;
  const cy0 = S / 2 + rf(-14, 14) * k;

  const span = S * 0.47;
  const step = span / (t.rings - 1);
  const warpStepX = t.dirX * (k * 1.55);
  const warpStepY = t.dirY * (k * 1.55);

  let ringsSvg = "";
  for (let i = 0; i < t.rings; i++) {
    const cx = cx0 + warpStepX * i;
    const cy = cy0 + warpStepY * i;
    let rad = step * (i + 0.4);
    if (t.warpMode === "VORTEX") rad *= 1 + 0.045 * i * Math.sin(i * 1.1);
    else if (t.warpMode === "ORBIT") rad *= 1 + 0.06 * Math.cos(i * 0.9);
    const isBand = i % t.bandK === t.bandOff;
    const w = isBand ? (6.5 + rf(0, 2)) * k : i % 3 === 0 ? 3.6 * k : 2 * k;
    const col = isBand ? P.light : i % 3 === 0 ? P.mid : P.main;
    const op = isBand ? 0.98 : (0.9 - i * 0.012).toFixed(2);
    const R = Math.max(rad, 4).toFixed(1);
    const cx1 = cx.toFixed(1), cy1 = cy.toFixed(1);
    const c = (sw, so, sc) => `<circle cx="${cx1}" cy="${cy1}" r="${R}" fill="none" stroke="${sc}" stroke-opacity="${so}" stroke-width="${sw.toFixed(1)}"/>`;
    // stacked vector glow: same look as feGaussianBlur, ~8x cheaper to render
    ringsSvg += c(w * 7, isBand ? 0.14 : 0.1, P.main);
    ringsSvg += c(w * 3.4, isBand ? 0.28 : 0.2, P.mid);
    ringsSvg += c(w, op, col);
    if (isBand) {
      ringsSvg += `<circle cx="${cx1}" cy="${cy1}" r="${R}" fill="none" stroke="${P.light}" stroke-opacity="0.9" stroke-width="${(w + 10 * k).toFixed(1)}" stroke-dasharray="${(2 * k).toFixed(1)} ${(16 * k).toFixed(1)}" stroke-linecap="round"/>`;
    }
  }

  const pad = 24 * k;
  const bracket = (x, y, sx, sy) =>
    `<path d="M${x + sx * 26 * k} ${y} L${x} ${y} L${x} ${y + sy * 26 * k}" fill="none" stroke="${P.main}" stroke-opacity="0.9" stroke-width="${2.5 * k}"/>`;
  const bw = S - pad * 2;

  const texts = `
<text x="${pad + 16 * k}" y="${pad + 34 * k}" font-family="Courier New, monospace" font-size="${15 * k}" letter-spacing="${4 * k}" fill="${P.main}" opacity="0.95">${P.name} // N${t.rings} // ${t.warpMode}</text>
<text x="${S - pad - 16 * k}" y="${pad + 34 * k}" text-anchor="end" font-family="Courier New, monospace" font-size="${15 * k}" letter-spacing="${3 * k}" fill="${P.light}" opacity="0.9">R-${t.rarity}</text>
<line x1="${pad + 16 * k}" y1="${S - pad - 44 * k}" x2="${S - pad - 16 * k}" y2="${S - pad - 44 * k}" stroke="${P.main}" stroke-opacity="0.3" stroke-width="${k}"/>
<text x="${pad + 16 * k}" y="${S - pad - 18 * k}" font-family="Courier New, monospace" font-size="${20 * k}" font-weight="bold" letter-spacing="${6 * k}" fill="#e5ffe8">VURA // RINGS</text>
<text x="${S - pad - 16 * k}" y="${S - pad - 18 * k}" text-anchor="end" font-family="Courier New, monospace" font-size="${16 * k}" letter-spacing="${2.5 * k}" fill="#8a8a8a">#${String(id).padStart(4, "0")} / 10000</text>`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
<defs>
<radialGradient id="bg" cx="50%" cy="50%" r="76%"><stop offset="0" stop-color="${P.bg0}"/><stop offset="1" stop-color="${P.bg1}"/></radialGradient>
<radialGradient id="vig" cx="50%" cy="50%" r="72%"><stop offset="58%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity="0.6"/></radialGradient>
</defs>
<rect width="${S}" height="${S}" fill="url(#bg)"/>
${ringsSvg}
<rect width="${S}" height="${S}" fill="url(#vig)"/>
<rect x="${pad}" y="${pad}" width="${bw}" height="${bw}" fill="none" stroke="${P.main}" stroke-opacity="0.4" stroke-width="${1.5 * k}"/>
<rect x="${pad + 12 * k}" y="${pad + 12 * k}" width="${bw - 24 * k}" height="${bw - 24 * k}" fill="none" stroke="${P.main}" stroke-opacity="0.14" stroke-width="${k}"/>
${bracket(pad + 20 * k, pad + 20 * k, 1, 1)}${bracket(S - pad - 20 * k, pad + 20 * k, -1, 1)}${bracket(pad + 20 * k, S - pad - 20 * k, 1, -1)}${bracket(S - pad - 20 * k, S - pad - 20 * k, -1, -1)}
${texts}
</svg>`;
  return { svg, traits: t };
}

// ── metadata ────────────────────────────────────────────────────────────────
function metaFor(id, t) {
  return {
    name: `VURA RINGS #${String(id).padStart(4, "0")}`,
    description:
      "One of 10,000 VURA RINGS. Concentric op-art signal rings warped by a deterministic seed - palette, count, warp mode and rarity are fixed and reproducible from the token id.",
    image: `${String(id).padStart(5, "0")}.png`,
    attributes: [
      { trait_type: "palette", value: t.palette.name },
      { trait_type: "rings", value: t.rings },
      { trait_type: "warp", value: t.warpMode },
      { trait_type: "tier", value: t.tier },
      { trait_type: "rarity", value: t.rarity },
    ],
  };
}

// ── render helpers ──────────────────────────────────────────────────────────
async function renderOne(id, imgDir, metaDir) {
  const { svg, traits } = buildSVG(id);
  const raw = new Resvg(svg, {
    fitTo: { mode: "width", value: SIZE },
    font: {
      fontFiles: ["C:/Windows/Fonts/cour.ttf", "C:/Windows/Fonts/courbd.ttf"],
      loadSystemFonts: false,
      defaultFontFamily: "Courier New",
    },
  }).render().asPng();
  // 8-bit palette + dither: 700KB -> ~200-300KB, line art quantizes cleanly
  const png = await sharp(raw).png({ palette: true, colors: 255, dither: 1.0, effort: 7 }).toBuffer();
  const sid = String(id).padStart(5, "0");
  writeFileSync(join(imgDir, `${sid}.png`), png);
  writeFileSync(join(metaDir, `${sid}.json`), JSON.stringify(metaFor(id, traits), null, 2));
  return {
    id,
    palette: traits.palette.name,
    rings: traits.rings,
    warp: traits.warpMode,
    tier: traits.tier,
    rarity: traits.rarity,
  };
}

function ensureDirs() {
  mkdirSync(join(OUT, "images"), { recursive: true });
  mkdirSync(join(OUT, "metadata"), { recursive: true });
}

// ── cli ─────────────────────────────────────────────────────────────────────
const cmd = process.argv[2] || "test";
ensureDirs();
const imgDir = join(OUT, "images");
const metaDir = join(OUT, "metadata");

if (cmd === "test") {
  const ids = [1, 7, 13, 42, 77, 100, 333, 666, 1000, 2500, 5000, 9999];
  const t0 = Date.now();
  const rows = [];
  for (const id of ids) rows.push(await renderOne(id, imgDir, metaDir));
  writeFileSync(join(OUT, "test_traits.json"), JSON.stringify(rows, null, 2));
  console.log(`test: ${ids.length} imgs in ${Date.now() - t0}ms`);
  console.log(`sample size: ${(statSync(join(imgDir, "00001.png")).size / 1024).toFixed(0)} KB`);
} else if (cmd === "range") {
  const a = Number(process.argv[3]);
  const b = Number(process.argv[4]);
  const t0 = Date.now();
  const rows = [];
  for (let id = a; id <= b; id++) {
    rows.push(await renderOne(id, imgDir, metaDir));
    if ((id - a) % 250 === 0) console.log(`[${a}-${b}] ${id} - ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  }
  writeFileSync(join(OUT, `traits_${a}_${b}.json`), JSON.stringify(rows));
  console.log(`range ${a}-${b}: ${rows.length} imgs in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
} else if (cmd === "all") {
  const WORKERS = Number(process.env.VURA_WORKERS || 8);
  const t0 = Date.now();
  const self = fileURLToPath(import.meta.url);
  const span = Math.ceil(10000 / WORKERS);
  const jobs = [];
  for (let w = 0; w < WORKERS; w++) {
    const a = w * span + 1;
    if (a > 10000) break;
    jobs.push({ a, b: Math.min(10000, a + span - 1) });
  }
  console.log(`orchestrator: ${jobs.length} workers, chunks ${jobs.map((j) => `${j.a}-${j.b}`).join(", ")}`);
  await Promise.all(
    jobs.map(
      ({ a, b }) =>
        new Promise((res, rej) => {
          const ch = spawn(process.execPath, [self, "range", String(a), String(b)], { stdio: "inherit" });
          ch.on("exit", (code) => (code === 0 ? res() : rej(new Error(`range ${a}-${b} exit ${code}`))));
        })
    )
  );
  const rows = [];
  for (const { a, b } of jobs) {
    const p = join(OUT, `traits_${a}_${b}.json`);
    rows.push(...JSON.parse(readFileSync(p, "utf8")));
    rmSync(p);
  }
  rows.sort((x, y) => x.id - y.id);
  writeFileSync(join(OUT, "traits.json"), JSON.stringify(rows));
  console.log(`DONE ${rows.length} in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  const pals = {};
  const tiers = {};
  rows.forEach((r2) => {
    pals[r2.palette] = (pals[r2.palette] || 0) + 1;
    tiers[r2.tier] = (tiers[r2.tier] || 0) + 1;
  });
  console.log("palettes:", JSON.stringify(pals));
  console.log("tiers:", JSON.stringify(tiers));
} else {
  console.log("unknown cmd");
}
