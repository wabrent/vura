// record the promo: serve .promo/, step frames through puppeteer, pipe JPEGs to ffmpeg
import puppeteer from "puppeteer-core";
import { createServer } from "http";
import { readFile, mkdir } from "fs/promises";
import { spawn } from "child_process";
import { extname, join } from "path";

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 8931;
const OUT = "docs/videos/vurafy-promo-x.mp4";
const FPS = 30, DURATION = 20.5;
const FRAMES = Math.round(DURATION * FPS);

const MIME = { ".html": "text/html", ".png": "image/png", ".jpg": "image/jpeg", ".wav": "audio/wav", ".css": "text/css", ".js": "text/javascript" };
const server = createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(req.url.split("?")[0]);
    if (p === "/") p = "/index.html";
    let file = join(process.cwd(), ".promo", p);
    if (p.startsWith("/shots/")) file = join(process.cwd(), ".promo", p);
    if (p.includes("feed-mobile")) file = join(process.cwd(), "docs", "screenshots", "feed-mobile.png");
    const data = await readFile(file);
    res.writeHead(200, { "content-type": MIME[extname(file)] || "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404); res.end("nf");
  }
});
await new Promise((r) => server.listen(PORT, r));

await mkdir("docs/videos", { recursive: true });

const ff = spawn("ffmpeg", [
  "-y",
  "-f", "image2pipe", "-framerate", String(FPS), "-i", "-",
  "-i", ".promo/audio.wav",
  "-c:v", "libx264", "-preset", "slow", "-crf", "18",
  "-pix_fmt", "yuv420p",
  "-c:a", "aac", "-b:a", "160k",
  "-movflags", "+faststart",
  "-shortest",
  OUT,
], { stdio: ["pipe", "ignore", "pipe"] });
let ffErr = "";
ff.stderr.on("data", (d) => { ffErr += d; });

const browser = await puppeteer.launch({ executablePath: EDGE, headless: true, args: ["--no-sandbox", "--disable-gpu", "--allow-file-access-from-files"] });
const page = await browser.newPage();
await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
page.on("console", (m) => { if (m.type() === "error") console.log("page err:", m.text()); });

await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: "networkidle2", timeout: 60000 });
await page.waitForFunction("window.__ready === true", { timeout: 30000 });

const t0 = Date.now();
for (let n = 0; n < FRAMES; n++) {
  const t = n / FPS;
  const dataUrl = await page.evaluate((tt) => window.render(tt), t);
  ff.stdin.write(Buffer.from(dataUrl.split(",")[1], "base64"));
  if (n % 60 === 0) console.log(`frame ${n}/${FRAMES} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
}
ff.stdin.end();

const code = await new Promise((res) => ff.on("close", res));
await browser.close();
server.close();

if (code !== 0) {
  console.error("ffmpeg failed:", ffErr.slice(-1500));
  process.exit(1);
}
console.log("DONE ->", OUT, `(${((Date.now() - t0) / 1000).toFixed(0)}s encoding)`);
