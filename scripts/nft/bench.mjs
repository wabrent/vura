import { Resvg } from "@resvg/resvg-js";

const head = (defs) => `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><defs>${defs}</defs>`;
const glowDef = `<filter id="glow" x="-25%" y="-25%" width="150%" height="150%"><feGaussianBlur stdDeviation="6.8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
const bgDef = `<radialGradient id="bg" cx="50%" cy="50%" r="76%"><stop offset="0" stop-color="#0a1710"/><stop offset="1" stop-color="#020a06"/></radialGradient>`;
const noiseDef = `<filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>`;

let rings = "";
for (let i = 0; i < 34; i++) {
  const cx = 512 + i * 3.2, cy = 512 - i * 1.6, r = 14 + i * 14;
  rings += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#00ff66" stroke-opacity="0.8" stroke-width="4"/>`;
}
const text = `<text x="60" y="980" font-family="Courier New, monospace" font-size="34" fill="#00ff66">VURA // RINGS #0001 / 10000</text>`;

const variants = {
  minimal: head("") + `<rect width="1024" height="1024" fill="red"/></svg>`,
  bgOnly: head(bgDef) + `<rect width="1024" height="1024" fill="url(#bg)"/></svg>`,
  bgRingsNoFilter: head(bgDef) + `<rect width="1024" height="1024" fill="url(#bg)"/>${rings}${text}</svg>`,
  bgRingsGlow: head(bgDef + glowDef) + `<rect width="1024" height="1024" fill="url(#bg)"/><g filter="url(#glow)">${rings}</g>${text}</svg>`,
  bgRingsGlowNoise: head(bgDef + glowDef + noiseDef) + `<rect width="1024" height="1024" fill="url(#bg)"/><g filter="url(#glow)">${rings}</g><rect width="1024" height="1024" filter="url(#n)" opacity="0.05"/>${text}</svg>`,
};

const fontOpts = { fontFiles: ["C:/Windows/Fonts/cour.ttf", "C:/Windows/Fonts/courbd.ttf"], loadSystemFonts: false, defaultFontFamily: "Courier New" };

for (const [name, svg] of Object.entries(variants)) {
  // ctor + render + png
  let t0 = performance.now();
  let png;
  for (let i = 0; i < 3; i++) png = new Resvg(svg, { fitTo: { mode: "width", value: 1024 }, font: fontOpts }).render().asPng();
  const full = (performance.now() - t0) / 3;
  // render only (reuse instance)
  const inst = new Resvg(svg, { fitTo: { mode: "width", value: 1024 }, font: fontOpts });
  t0 = performance.now();
  for (let i = 0; i < 3; i++) inst.render();
  const render = (performance.now() - t0) / 3;
  console.log(`${name.padEnd(18)} full=${full.toFixed(0)}ms render=${render.toFixed(0)}ms png=${(png.length / 1024).toFixed(0)}KB`);
}
