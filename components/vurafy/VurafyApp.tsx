"use client";

import { useState, useEffect, useRef, useCallback, useMemo, memo } from "react";
import { useAccount, useConnect, useDisconnect, usePublicClient, useWriteContract, useWaitForTransactionReceipt, useSwitchChain } from "wagmi";
import { parseEther, formatEther, formatUnits, parseUnits, toHex, zeroAddress, type Address } from "viem";
import { robinhood } from "@/lib/web3/config";
import {
  FACTORY, EXPLORER, PONS_APP, PROJECT_TOKEN, factoryAbi, curveAbi, tokenAbi, ipfsHttp,
  discoverLaunches, loadTrack, quoteBuy, quoteSell, loadProjectToken, walletBalances, buildDescription, VURAFY_SOCIALS,
  loadCurveTrades, type Track, type LaunchLog, type Quote, type ProjectToken, type TradePoint,
} from "./pons";
import { buildDemoTracks } from "./demoCatalog";
import { fetchAudiusTracks } from "./audius";
import PriceChart from "./PriceChart";

const MONO = { fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" };
const CATALOG_TARGET = 50; // Audius trending feed size (on-chain launches take priority)

const DEMO_TRACKS: Track[] = buildDemoTracks();

function mulberry32(a: number) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash32(s: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

const CoverArt = memo(function CoverArt({ seed, symbol }: { seed: string; symbol: string }) {
  const h = hash32(seed);
  const rnd = mulberry32(h);
  const hue = h % 360;
  const gid = `vg${h}`;
  const variant = h % 3;
  const bars = Array.from({ length: 7 }, (_, i) => ({ x: 7 + i * 13, h: 14 + rnd() * 66 }));
  const orbs = Array.from({ length: 4 }, () => ({ cx: 12 + rnd() * 76, cy: 12 + rnd() * 76, r: 8 + rnd() * 24, o: 0.05 + rnd() * 0.12 }));
  const rays = Array.from({ length: 5 }, (_, i) => ({ y: i * 22 + 8, o: 0.06 + rnd() * 0.1 }));
  return (
    <svg viewBox="0 0 100 100" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={`hsl(${hue},74%,46%)`} />
          <stop offset="55%" stopColor={`hsl(${(hue + 34) % 360},68%,24%)`} />
          <stop offset="100%" stopColor={`hsl(${(hue + 338) % 360},64%,13%)`} />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill={`url(#${gid})`} />
      {variant === 0 && orbs.map((o, i) => <circle key={i} cx={o.cx} cy={o.cy} r={o.r} fill="#fff" opacity={o.o} />)}
      {variant === 1 && bars.map((b, i) => <rect key={i} x={b.x} y={94 - b.h} width="7" height={b.h} rx="2" fill="#fff" opacity={0.12 + rnd() * 0.22} />)}
      {variant === 2 && rays.map((r, i) => <rect key={i} x={-10} y={r.y} width="120" height="6" fill="#fff" opacity={r.o} transform="rotate(-14 50 50)" />)}
      <text x="50" y="57" textAnchor="middle" fontSize="30" fontWeight="800" fill="#fff" opacity="0.95" fontFamily="Helvetica, Arial, sans-serif" letterSpacing="1">{symbol.slice(0, 3)}</text>
      <rect x="0.5" y="0.5" width="99" height="99" fill="none" stroke="rgba(255,255,255,.22)" />
    </svg>
  );
});

function fmtEth(p: number) {
  if (p <= 0) return "0";
  if (p >= 0.01) return p.toFixed(4);
  if (p >= 0.000001) return p.toFixed(6);
  return p.toExponential(2);
}
function fmtRaised(v: bigint) {
  const n = Number(formatEther(v));
  return n < 1e-6 ? "0" : fmtEth(n);
}
function fmtTokens(v: bigint) {
  const n = Number(formatUnits(v, 18));
  if (n >= 1e9) return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (n >= 1) return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
  return n.toLocaleString("en-US", { maximumFractionDigits: 6 });
}
function fmtBig(v: bigint) {
  return Number(formatUnits(v, 18)).toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function Logo({ className = "", stroke = 4 }: { className?: string; stroke?: number }) {
  return (
    <svg viewBox="0 0 100 90" className={className} fill="none" stroke="#fff" strokeWidth={stroke} aria-hidden="true">
      <path d="M3 3 L50 86 L97 3 L83 3 L50 62 L17 3 Z" />
      <path d="M22 3 L50 53 L78 3 L66 3 L50 31 L34 3 Z" />
    </svg>
  );
}

function BgWaves({ playing }: { playing: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const playingRef = useRef(playing);
  playingRef.current = playing;

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const RM = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let mx = 0.5, my = 0.5, energy = 0, raf = 0;
    let P: { x: number; y: number; s: number; v: number; o: number }[] = [];
    const size = () => {
      const r = Math.min(window.devicePixelRatio || 1, window.innerWidth < 768 ? 1 : 1.5);
      cv.width = Math.round(window.innerWidth * r);
      cv.height = Math.round(window.innerHeight * r);
      ctx.setTransform(r, 0, 0, r, 0, 0);
      P = Array.from({ length: Math.round(window.innerWidth / 16) }, () => ({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        s: Math.random() * 1.8 + 0.4,
        v: Math.random() * 0.25 + 0.05,
        o: Math.random() * 6,
      }));
    };
    const onMove = (e: PointerEvent) => {
      mx = e.clientX / window.innerWidth;
      my = e.clientY / window.innerHeight;
    };
    const bg = (t: number) => {
      energy += ((playingRef.current ? 1 : 0) - energy) * 0.03;
      const w = window.innerWidth, h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);
      for (let l = 0; l < 8; l++) {
        ctx.beginPath();
        const base = h * (0.12 + l * 0.11);
        const amp = 18 + l * 7 + energy * 28;
        const f = 0.004 + l * 0.0007;
        for (let x = 0; x <= w; x += 8) {
          const y = base + Math.sin(x * f + t / 1700 + l) * amp + Math.sin(x * f * 2.3 - t / 2300) * amp * 0.4 + ((my - 0.5) * 44 * (l - 3)) / 3;
          if (x) ctx.lineTo(x, y); else ctx.moveTo(x, y);
        }
        ctx.strokeStyle = `hsla(0,0%,78%,${0.06 + l * 0.012 + energy * 0.06})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
      for (const p of P) {
        p.y -= p.v * (1 + energy * 2.5);
        if (p.y < -5) { p.y = h + 5; p.x = Math.random() * w; }
        ctx.fillStyle = `hsla(0,0%,88%,${0.25 + 0.3 * Math.sin(t / 700 + p.o)})`;
        ctx.fillRect(p.x + (mx - 0.5) * p.s * 16, p.y, p.s, p.s);
      }
    };
    let frame = 0;
    const loop = (t: number) => {
      if (!RM && frame++ % 2 === 0) bg(t);
      raf = requestAnimationFrame(loop);
    };
    size();
    window.addEventListener("resize", size);
    window.addEventListener("pointermove", onMove);
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", size);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return (
    <>
      <div className="aur" aria-hidden><i /><i /><i /></div>
      <canvas ref={ref} id="bg" aria-hidden />
      <div className="grain" aria-hidden />
    </>
  );
}

function DockWave({ seed, playing, prog, onSeek }: { seed: number; playing: boolean; prog: number; onSeek: (ratio: number) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const amps = useRef<number[]>([]);
  const playingRef = useRef(playing);
  const progRef = useRef(prog);
  playingRef.current = playing;
  progRef.current = prog;
  const dirtyRef = useRef(true);

  useEffect(() => {
    dirtyRef.current = true;
  }, [seed, playing, prog]);

  useEffect(() => {
    const rnd = mulberry32(seed);
    amps.current = Array.from({ length: 220 }, () => 0.25 + 0.75 * Math.abs(rnd() * Math.sin(rnd() * 6)));
  }, [seed]);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    const onResize = () => { dirtyRef.current = true; };
    window.addEventListener("resize", onResize);
    const draw = (t: number) => {
      if (!playingRef.current && !dirtyRef.current) {
        raf = requestAnimationFrame(draw);
        return;
      }
      dirtyRef.current = false;
      const r = Math.min(window.devicePixelRatio || 1, 2);
      const w = cv.clientWidth, h = cv.clientHeight;
      if (cv.width !== Math.round(w * r)) { cv.width = Math.round(w * r); cv.height = Math.round(h * r); }
      ctx.setTransform(r, 0, 0, r, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const s = amps.current;
      if (!s.length) return;
      const bw = w / s.length;
      const g = ctx.createLinearGradient(0, 0, w, 0);
      g.addColorStop(0, "#fff");
      g.addColorStop(1, "#8a8a94");
      for (let i = 0; i < s.length; i++) {
        let v = s[i] || 0.4;
        if (playingRef.current) v *= 0.7 + 0.3 * Math.sin(t / 160 + i * 0.5);
        ctx.fillStyle = i / s.length < progRef.current ? g : "#24242e";
        const bh = Math.max(v * h, 2);
        ctx.fillRect(i * bw, (h - bh) / 2, Math.max(bw - 1.5, 1), bh);
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [seed]);

  return (
    <canvas
      ref={ref}
      className="dockwave"
      aria-label="Track waveform, click to seek"
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        onSeek(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)));
      }}
    />
  );
}

function CurveSvg({ p }: { p: number }) {
  let d = "M0,120";
  for (let j = 0; j <= 40; j++) {
    const x = j / 40;
    d += ` L${(x * 400).toFixed(1)},${(120 - 105 * (0.8 * x * x + 0.2 * x)).toFixed(1)}`;
  }
  const mx = p * 400;
  const my = 120 - 105 * (0.8 * p * p + 0.2 * p);
  return (
    <svg className="curve" viewBox="0 0 400 130" width="100%" role="img" aria-label="Stream progress">
      <defs>
        <linearGradient id="cg" x1="0" x2="1">
          <stop offset="0" stopColor="var(--acc)" />
          <stop offset="1" stopColor="var(--acc2)" />
        </linearGradient>
      </defs>
      <path d={`${d} L400,120Z`} fill="var(--acc)" opacity="0.08" />
      <path className="l" pathLength={1} d={d} fill="none" stroke="url(#cg)" strokeWidth={3} />
      <line x1={mx} y1={my} x2={mx} y2={120} stroke="var(--mute)" strokeDasharray="3" />
      <circle className="p" cx={mx} cy={my} r={5} fill="var(--acc)" />
      <circle cx={mx} cy={my} r={5} fill="var(--acc)" />
    </svg>
  );
}

type LaunchForm = { title: string; artist: string; symbol: string; cover: string; audio: string; tax: string };

export function VurafyApp() {
  const [tracks, setTracks] = useState<Track[]>(DEMO_TRACKS);
  const [logs, setLogs] = useState<LaunchLog[]>([]);
  const [live, setLive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState({ p: 0, t: 0, d: 0 });
  const [tab, setTab] = useState<"trending" | "az">("trending");
  const [toast, setToast] = useState("");
  const timer = useRef<number | null>(null);

  // modals
  const [buyOpen, setBuyOpen] = useState(false);
  const [launchOpen, setLaunchOpen] = useState(false);
  const [portfolioOpen, setPortfolioOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [ethIn, setEthIn] = useState("0.01");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [form, setForm] = useState<LaunchForm>({ title: "", artist: "", symbol: "", cover: "", audio: "", tax: "200" });
  const [coverFile, setCoverFile] = useState<{ file: File; url: string } | null>(null);
  const [audioFile, setAudioFile] = useState<{ file: File; url: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [upPct, setUpPct] = useState<number | null>(null);
  const autoplayRef = useRef(false);
  const catalogRunRef = useRef(0);
  const [cfg, setCfg] = useState<{ id: bigint; fee: bigint; maxTax: number; can: boolean } | null>(null);
  const [balances, setBalances] = useState<Record<string, bigint>>({});

  /* ---------- $VURAFY trade panel ---------- */
  const [pt, setPt] = useState<ProjectToken | null>(null);
  const [ptSide, setPtSide] = useState<"buy" | "sell">("buy");
  const [ptAmt, setPtAmt] = useState("0.01");
  const [ptQuote, setPtQuote] = useState<{ out: bigint; min: bigint; spent: bigint } | null>(null);
  const [ptQuoting, setPtQuoting] = useState(false);
  const [ptBusy, setPtBusy] = useState<"approve" | "buy" | "sell" | null>(null);
  const ptStage = useRef<"" | "approve" | "buy" | "sell">("");
  const [ptTrades, setPtTrades] = useState<TradePoint[]>([]);
  const [ptTradesTick, setPtTradesTick] = useState(0);

  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: chainSwitching } = useSwitchChain();
  const publicClient = usePublicClient({ chainId: robinhood.id });
  const { writeContract, data: txHash, isPending: txPending, error: txError } = useWriteContract();
  const { isLoading: txMining, isSuccess: txSuccess } = useWaitForTransactionReceipt({ hash: txHash });
  const launch = useWriteContract();
  const launchWait = useWaitForTransactionReceipt({ hash: launch.data });

  const track = tracks[Math.min(sel, tracks.length - 1)] ?? DEMO_TRACKS[0];
  const isDemo = !!track.isDemo;

  const say = useCallback((m: string) => {
    setToast(m);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(""), 3600);
  }, []);

  /* ---------- catalog ---------- */
  const loadCatalog = useCallback(async () => {
    const run = ++catalogRunRef.current;
    setLoading(true);
    // fast path: paint the Audius feed while the factory scan runs in the background
    const audiusP = fetchAudiusTracks(CATALOG_TARGET).catch(() => [] as Track[]);
    audiusP.then((a) => {
      if (a.length > 0 && catalogRunRef.current === run) {
        setTracks(a);
        setLogs([]);
        setLive(false);
        setSel(0);
      }
    });
    try {
      const lgs = await discoverLaunches();
      const tks: Track[] = [];
      const paired: LaunchLog[] = [];
      let processed = 0;
      for (const l of lgs) {
        if (tks.length >= 30 || processed >= 60) break;
        processed += 1;
        const t = await loadTrack(l);
        if (t) { tks.push(t); paired.push(l); }
      }
      const audius = await audiusP;
      if (catalogRunRef.current !== run) return;
      if (tks.length > 0) {
        // on-chain launches first, Audius trending fills the feed up to CATALOG_TARGET
        const fill = audius
          .filter((a) => !tks.some((t) => t.name === a.name))
          .slice(0, Math.max(0, CATALOG_TARGET - tks.length));
        setTracks([...tks, ...fill]);
        setLogs(paired);
        setLive(true);
        setSel(0);
      } else if (audius.length === 0) {
        setTracks(DEMO_TRACKS);
        setLogs([]);
        setLive(false);
      }
      // else: Audius feed already painted by the fast path above
    } catch {
      const audius = await audiusP;
      if (catalogRunRef.current !== run) return;
      if (audius.length > 0) {
        say("catalog loaded from audius");
      } else {
        setTracks(DEMO_TRACKS);
        setLogs([]);
        setLive(false);
        say("catalog unavailable — demo data");
      }
    } finally {
      if (catalogRunRef.current === run) setLoading(false);
    }
  }, [say]);

  useEffect(() => { loadCatalog(); }, [loadCatalog]);

  // refresh selected track every 15s
  useEffect(() => {
    if (!live) return;
    const iv = window.setInterval(async () => {
      const l = logs[sel];
      if (!l) return;
      try {
        const t = await loadTrack(l);
        if (t) setTracks((prev) => prev.map((p, i) => (i === sel ? t : p)));
      } catch { /* noop */ }
    }, 15000);
    return () => window.clearInterval(iv);
  }, [live, logs, sel]);

  useEffect(() => {
    if (launchWait.isSuccess) {
      say("track launched on pons ✓ — indexing…");
      setLaunchOpen(false);
      setForm({ title: "", artist: "", symbol: "", cover: "", audio: "", tax: "200" });
      setCoverFile(null);
      setAudioFile(null);
      loadCatalog();
    }
  }, [launchWait.isSuccess, loadCatalog, say]);
  useEffect(() => {
    if (txError) say(`tx error: ${String(txError).slice(0, 140)}`);
  }, [txError, say]);
  useEffect(() => {
    if (launch.error) say(`launch error: ${String(launch.error).slice(0, 140)}`);
  }, [launch.error, say]);
  useEffect(() => {
    if (connectError) say(`connect error: ${String(connectError).slice(0, 140)}`);
  }, [connectError, say]);

  /* ---------- audio ---------- */
  const playingRef = useRef(false);
  const stepRef = useRef(0);
  const stepTimer = useRef<number | null>(null);
  const actxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastPosRef = useRef(0);

  const ensureCtx = () => {
    if (!actxRef.current) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      actxRef.current = new AC();
      masterRef.current = actxRef.current.createGain();
      masterRef.current.gain.value = 0.55;
      masterRef.current.connect(actxRef.current.destination);
    }
    return actxRef.current;
  };

  const tick = useCallback(() => {
    const actx = ensureCtx();
    if (!masterRef.current) return;
    const scale = [0, 3, 5, 7, 10, 12, 15, 17];
    const s = stepRef.current;
    const seed = (track.name.length * 731 + track.artist.length * 197) || 4211;
    const root = 174 + (seed % 90);
    const deg = scale[(s * 3 + seed) % scale.length];
    const oct = (Math.floor(s / 7) % 2) * 12;
    const f = root * Math.pow(2, (deg + oct) / 12);
    const t = actx.currentTime;
    const g = actx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.1, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    const o1 = actx.createOscillator(); o1.type = "triangle"; o1.frequency.value = f;
    const o2 = actx.createOscillator(); o2.type = "sine"; o2.frequency.value = f * 2.004;
    o1.connect(g); o2.connect(g); g.connect(masterRef.current);
    o1.start(t); o1.stop(t + 0.55); o2.start(t); o2.stop(t + 0.55);
    if (s % 4 === 0) {
      const bg = actx.createGain();
      bg.gain.setValueAtTime(0, t);
      bg.gain.linearRampToValueAtTime(0.16, t + 0.04);
      bg.gain.exponentialRampToValueAtTime(0.001, t + 0.95);
      const b = actx.createOscillator(); b.type = "sine"; b.frequency.value = root / 2;
      b.connect(bg); bg.connect(masterRef.current);
      b.start(t); b.stop(t + 1);
    }
    stepRef.current = s + 1;
  }, [track]);

  const startSynth = useCallback(() => {
    const actx = ensureCtx();
    actx.resume();
    if (stepTimer.current) window.clearInterval(stepTimer.current);
    tick();
    stepTimer.current = window.setInterval(tick, 300);
  }, [tick]);
  const stopSynth = () => {
    if (stepTimer.current) { window.clearInterval(stepTimer.current); stepTimer.current = null; }
  };

  const play = () => {
    playingRef.current = true;
    setPlaying(true);
    stopSynth();
    if (track.audio) {
      if (audioRef.current?.dataset.url !== track.audio) {
        // stop the previous stream before switching — only one track may sound at a time
        audioRef.current?.pause();
        const a = new Audio(track.audio);
        a.preload = "auto";
        a.dataset.url = track.audio;
        // manual loop: iOS glitches when looping remote streams with loop=true
        a.onended = () => { a.currentTime = 0; a.play().catch(() => {}); };
        a.ontimeupdate = () => {
          const now = performance.now();
          if (now - lastPosRef.current < 200) return;
          lastPosRef.current = now;
          const d = isFinite(a.duration) ? a.duration : 0;
          setPos({ p: d ? a.currentTime / d : 0, t: a.currentTime, d });
        };
        audioRef.current = a;
      }
      audioRef.current.play().catch(() => startSynth());
    } else {
      audioRef.current?.pause();
      audioRef.current = null;
      startSynth();
    }
  };
  const pause = () => {
    playingRef.current = false;
    setPlaying(false);
    audioRef.current?.pause();
    stopSynth();
  };
  const switchTrack = (next: number) => {
    const n = (next + tracks.length) % tracks.length;
    setSel(n);
    setPos({ p: 0, t: 0, d: 0 });
    stepRef.current = 0;
    audioRef.current?.pause();
    audioRef.current = null;
    stopSynth();
    if (playingRef.current) {
      const t = tracks[n];
      if (t?.audio) {
        const a = new Audio(t.audio);
        a.preload = "auto";
        a.dataset.url = t.audio;
        a.onended = () => { a.currentTime = 0; a.play().catch(() => {}); };
        a.ontimeupdate = () => {
          const now = performance.now();
          if (now - lastPosRef.current < 200) return;
          lastPosRef.current = now;
          const d = isFinite(a.duration) ? a.duration : 0;
          setPos({ p: d ? a.currentTime / d : 0, t: a.currentTime, d });
        };
        audioRef.current = a;
        a.play().catch(() => startSynth());
      } else startSynth();
    }
  };
  const seek = (ratio: number) => {
    const a = audioRef.current;
    if (a && isFinite(a.duration) && a.duration > 0) {
      a.currentTime = ratio * a.duration;
      setPos({ p: ratio, t: a.currentTime, d: a.duration });
    }
  };
  useEffect(() => () => { stopSynth(); audioRef.current?.pause(); if (timer.current) window.clearTimeout(timer.current); }, []);

  // media session: browser tab / OS media popup shows the track instead of "Music"
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator) || !track) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.name,
        artist: track.artist || "VURAFY",
        album: "VURAFY // Track Tokenization Protocol",
        artwork: track.logo ? [{ src: track.logo, sizes: "512x512" }] : [],
      });
      navigator.mediaSession.setActionHandler("play", () => play());
      navigator.mediaSession.setActionHandler("pause", () => pause());
      navigator.mediaSession.setActionHandler("nexttrack", () => switchTrack(sel + 1));
      navigator.mediaSession.setActionHandler("previoustrack", () => switchTrack(sel - 1));
    } catch { /* unsupported */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track, sel]);

  // autoplay once after a locally added track becomes the current one
  useEffect(() => {
    if (autoplayRef.current && tracks.length > 0) {
      autoplayRef.current = false;
      play();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracks, sel]);

  // keyboard: space — play/pause, ← → — switch track
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      if (e.code === "Space") {
        e.preventDefault();
        if (playingRef.current) pause(); else play();
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        switchTrack(sel + 1);
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        switchTrack(sel - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel, tracks, playing]);

  /* ---------- local demo track (no wallet, no tx) ---------- */
  const addLocalTrack = () => {
    if (!form.title.trim()) { say("track title is required"); return; }
    const t: Track = {
      token: zeroAddress,
      curve: zeroAddress,
      deployer: zeroAddress,
      name: form.title.trim(),
      symbol: (form.symbol.trim() || autoSymbol).toUpperCase(),
      logo: coverFile?.url || form.cover.trim(),
      artist: form.artist.trim() || "VURAFY",
      audio: audioFile?.url || form.audio.trim(),
      priceEth: 0,
      totalSupply: 1_000_000_000n * 10n ** 18n,
      available: 1_000_000_000n * 10n ** 18n,
      progress: 0,
      graduated: false,
      creatorTaxBps: 0,
      isDemo: true,
    };
    setTracks((prev) => [t, ...prev]);
    setSel(0);
    autoplayRef.current = true;
    setLaunchOpen(false);
    setForm({ title: "", artist: "", symbol: "", cover: "", audio: "", tax: "200" });
    if (coverFile) URL.revokeObjectURL(coverFile.url);
    if (audioFile) URL.revokeObjectURL(audioFile.url);
    setCoverFile(null);
    setAudioFile(null);
    say("Track loaded locally (Demo Mode)");
  };

  /* ---------- wallet ---------- */
  const connectWallet = () => {
    const hasInjected = typeof window !== "undefined" && "ethereum" in window;
    const c =
      (hasInjected ? connectors.find((x) => x.type === "injected") : undefined) ??
      connectors.find((x) => x.type === "walletConnect") ??
      connectors[0];
    if (c) connect({ connector: c });
    else say("no wallet found — open this page inside your wallet's browser");
  };
  const onWallet = () => {
    if (isConnected) { disconnect(); say("wallet disconnected"); return; }
    connectWallet();
  };
  const wrongChain = isConnected && chainId !== undefined && chainId !== robinhood.id;
  const switchToRobinhood = () => {
    say("switching to Robinhood Chain…");
    switchChain(
      { chainId: robinhood.id },
      {
        onSuccess: () => say("Robinhood Chain connected ✓"),
        onError: (e) => say(`switch failed: ${e.message.slice(0, 80)}`),
      },
    );
  };
  useEffect(() => {
    if (isConnected && address) say(`wallet: ${address.slice(0, 6)}…${address.slice(-4)}`);
  }, [isConnected, address, say]);

  /* ---------- buy ---------- */
  const openBuy = () => {
    if (isDemo) { say("demo track — launch yours to trade"); setLaunchOpen(true); return; }
    if (track.graduated) { window.open(PONS_APP, "_blank"); return; }
    setEthIn("0.01");
    setQuote(null);
    setBuyOpen(true);
  };

  useEffect(() => {
    if (!buyOpen || isDemo) return;
    let cancelled = false;
    setQuoting(true);
    const to = window.setTimeout(async () => {
      try {
        const v = parseFloat(ethIn);
        if (!v || v <= 0) { setQuote(null); setQuoting(false); return; }
        const q = await quoteBuy(track.curve, parseEther(String(v)), address ?? zeroAddress);
        if (!cancelled) { setQuote(q); setQuoting(false); }
      } catch {
        if (!cancelled) { setQuote(null); setQuoting(false); }
      }
    }, 450);
    return () => { cancelled = true; window.clearTimeout(to); };
  }, [ethIn, buyOpen, track, address, isDemo]);

  const doBuy = () => {
    if (!isConnected) { connectWallet(); return; }
    if (wrongChain) { switchToRobinhood(); return; }
    if (!quote || !address) return;
    ptStage.current = "";
    const minOut = (quote.tokensOut * 90n) / 100n;
    writeContract({
      address: track.curve,
      abi: curveAbi,
      functionName: "buy",
      args: [quote.spent, minOut, address],
      value: quote.spent,
      chainId: robinhood.id,
    });
  };

  /* ---------- $VURAFY trade ---------- */
  const loadPt = useCallback(async () => {
    try {
      const p = await loadProjectToken(address);
      if (p) setPt(p);
    } catch { /* noop */ }
  }, [address]);

  useEffect(() => { void loadPt(); }, [loadPt]);
  useEffect(() => {
    const iv = window.setInterval(() => { void loadPt(); }, 20000);
    return () => window.clearInterval(iv);
  }, [loadPt]);

  const ptCurve = pt?.curve;
  useEffect(() => {
    if (!ptCurve) return;
    let cancelled = false;
    const refresh = async () => {
      try {
        const pts = await loadCurveTrades(ptCurve, PROJECT_TOKEN);
        if (!cancelled) setPtTrades([...pts]);
      } catch { /* noop */ }
    };
    void refresh();
    const iv = window.setInterval(() => { void refresh(); }, 20000);
    return () => { cancelled = true; window.clearInterval(iv); };
  }, [ptCurve, ptTradesTick]);

  useEffect(() => {
    if (!pt) return;
    let cancelled = false;
    setPtQuoting(true);
    const to = window.setTimeout(async () => {
      try {
        const v = parseFloat(ptAmt);
        if (!v || v <= 0) { if (!cancelled) { setPtQuote(null); setPtQuoting(false); } return; }
        if (ptSide === "buy") {
          const q = await quoteBuy(pt.curve, parseEther(String(v)), address ?? zeroAddress);
          if (!cancelled) { setPtQuote({ out: q.tokensOut, min: (q.tokensOut * 90n) / 100n, spent: q.spent }); setPtQuoting(false); }
        } else {
          const q = await quoteSell(pt.curve, parseUnits(String(v), 18));
          if (!cancelled) { setPtQuote({ out: q.quoteOut, min: (q.quoteOut * 90n) / 100n, spent: 0n }); setPtQuoting(false); }
        }
      } catch {
        if (!cancelled) { setPtQuote(null); setPtQuoting(false); }
      }
    }, 450);
    return () => { cancelled = true; window.clearTimeout(to); };
  }, [ptAmt, ptSide, pt, address]);

  const doPtBuy = () => {
    if (!isConnected) { connectWallet(); return; }
    if (wrongChain) { switchToRobinhood(); return; }
    if (!ptQuote || !address || !pt) return;
    ptStage.current = "buy";
    setPtBusy("buy");
    writeContract({
      address: pt.curve,
      abi: curveAbi,
      functionName: "buy",
      args: [ptQuote.spent, ptQuote.min, address],
      value: ptQuote.spent,
      chainId: robinhood.id,
    });
  };

  const doPtSell = async () => {
    if (!isConnected) { connectWallet(); return; }
    if (wrongChain) { switchToRobinhood(); return; }
    if (!ptQuote || !address || !pt || !publicClient) return;
    const tokensIn = parseUnits(ptAmt, 18);
    try {
      const allowance = (await publicClient.readContract({
        address: PROJECT_TOKEN, abi: tokenAbi, functionName: "allowance", args: [address, pt.curve],
      })) as bigint;
      if (allowance >= tokensIn) {
        ptStage.current = "sell";
        setPtBusy("sell");
        writeContract({
          address: pt.curve, abi: curveAbi, functionName: "sell",
          args: [tokensIn, ptQuote.min, address],
          chainId: robinhood.id,
        });
      } else {
        ptStage.current = "approve";
        setPtBusy("approve");
        writeContract({
          address: PROJECT_TOKEN, abi: tokenAbi, functionName: "approve",
          args: [pt.curve, tokensIn],
          chainId: robinhood.id,
        });
      }
    } catch {
      ptStage.current = "";
      setPtBusy(null);
      say("allowance check failed — try again");
    }
  };

  const doPtSellRef = useRef(doPtSell);
  doPtSellRef.current = doPtSell;

  const doPt = () => {
    if (ptSide === "buy") doPtBuy();
    else void doPtSell();
  };

  const ptSellOver = (() => {
    if (!isConnected || ptSide !== "sell" || !pt) return false;
    try { return parseUnits(ptAmt || "0", 18) > pt.balance; } catch { return false; }
  })();

  useEffect(() => {
    if (txError) { ptStage.current = ""; setPtBusy(null); }
  }, [txError]);

  useEffect(() => {
    if (!txSuccess) return;
    const st = ptStage.current;
    if (st === "approve") {
      ptStage.current = "";
      say("approved ✓ — confirming sell…");
      void doPtSellRef.current();
      return;
    }
    if (st === "buy" || st === "sell") {
      ptStage.current = "";
      setPtBusy(null);
      say(st === "buy" ? "$VURAFY purchase confirmed ✓" : "$VURAFY sold ✓");
      void loadPt();
      setPtTradesTick((t) => t + 1);
      return;
    }
    say("purchase confirmed onchain ✓");
    setBuyOpen(false);
    setQuote(null);
  }, [txSuccess, say, loadPt]);

  /* ---------- launch ---------- */
  useEffect(() => {
    if (!launchOpen || !publicClient) return;
    (async () => {
      try {
        const count = await publicClient.readContract({ address: FACTORY, abi: factoryAbi, functionName: "launchConfigCount" });
        let cfgId = -1;
        for (let i = 0n; i < count; i++) {
          const c = await publicClient.readContract({ address: FACTORY, abi: factoryAbi, functionName: "getLaunchConfig", args: [i] });
          if (c.enabled) { cfgId = Number(i); break; }
        }
        const [fee, maxTax, can] = await Promise.all([
          publicClient.readContract({ address: FACTORY, abi: factoryAbi, functionName: "launchFee" }),
          publicClient.readContract({ address: FACTORY, abi: factoryAbi, functionName: "maxCreatorTaxBps" }),
          address ? publicClient.readContract({ address: FACTORY, abi: factoryAbi, functionName: "canLaunch", args: [address] }) : Promise.resolve(true),
        ]);
        setCfg({ id: BigInt(cfgId < 0 ? 0 : cfgId), fee, maxTax: Number(maxTax), can });
      } catch { setCfg(null); }
    })();
  }, [launchOpen, publicClient, address]);

  const autoSymbol = form.title.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 8) || "TRACK";

  const CHUNK = 4 * 1024 * 1024;

  const pinFile = async (f: File, onProgress?: (pct: number) => void): Promise<string> => {
    if (f.size > 4.4 * 1024 * 1024) {
      // bigger than the Vercel body limit — send in chunks, assemble and pin server-side
      const uploadId = crypto.randomUUID();
      const total = Math.ceil(f.size / CHUNK);
      for (let i = 0; i < total; i++) {
        const fd = new FormData();
        fd.append("chunk", f.slice(i * CHUNK, Math.min((i + 1) * CHUNK, f.size)), `part-${i}`);
        fd.append("uploadId", uploadId);
        fd.append("index", String(i));
        const r = await fetch("/api/upload-chunk", { method: "POST", body: fd });
        const j = (await r.json()) as { ok?: boolean; error?: string };
        if (!r.ok || !j.ok) throw new Error(j.error || "chunk upload failed");
        onProgress?.(Math.round(((i + 1) / total) * 90));
      }
      onProgress?.(95);
      const r2 = await fetch("/api/pin-chunks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ uploadId, filename: f.name, mime: f.type }),
      });
      const j2 = (await r2.json()) as { url?: string; error?: string };
      if (!r2.ok || !j2.url) throw new Error(j2.error || "pin failed");
      onProgress?.(100);
      return j2.url;
    }
    const fd = new FormData();
    fd.append("file", f);
    const r = await fetch("/api/upload", { method: "POST", body: fd });
    const j = (await r.json()) as { url?: string; error?: string };
    if (!r.ok || !j.url) throw new Error(j.error || "upload failed");
    return j.url;
  };

  const pickMedia = (kind: "cover" | "audio", f: File) => {
    const max = kind === "cover" ? 4 * 1024 * 1024 : 50 * 1024 * 1024;
    if (f.size > max) { say(`${kind}: max ${Math.round(max / 1024 / 1024)}MB`); return; }
    const url = URL.createObjectURL(f);
    const set = kind === "cover" ? setCoverFile : setAudioFile;
    set((p) => { if (p) URL.revokeObjectURL(p.url); return { file: f, url }; });
  };

  const doLaunch = async () => {
    if (!isConnected || !address || !publicClient) { connectWallet(); return; }
    if (wrongChain) { switchToRobinhood(); return; }
    if (!form.title.trim() || !form.artist.trim()) { say("title and artist are required"); return; }
    if (!cfg || !cfg.can) { say("launching is closed for this wallet"); return; }
    if (!coverFile || !audioFile) { say("cover and audio files are required"); return; }
    setUploading(true);
    try {
      const [coverUrl, audioUrl] = await Promise.all([pinFile(coverFile.file), pinFile(audioFile.file, setUpPct)]);
      const pairToken = zeroAddress;
      const salt = toHex(crypto.getRandomValues(new Uint8Array(32)));
      const [expectedEconomics, fee] = await Promise.all([
        publicClient.readContract({ address: FACTORY, abi: factoryAbi, functionName: "previewLaunchEconomics", args: [cfg.id, pairToken] }),
        Promise.resolve(cfg.fee),
      ]);
      const tax = Math.max(0, Math.min(cfg.maxTax, parseInt(form.tax || "0", 10)));
      launch.writeContract({
        address: FACTORY,
        abi: factoryAbi,
        functionName: "launchToken",
        args: [
          {
            name: form.title.trim(),
            symbol: (form.symbol.trim() || autoSymbol).toUpperCase(),
            logo: coverUrl,
            description: buildDescription(form.artist.trim(), audioUrl),
            socials: VURAFY_SOCIALS,
            creatorFeeRecipient: address,
            creatorTaxBps: tax,
            buybackEnabled: false,
            expectedEconomics,
            salt,
          },
          cfg.id,
          pairToken,
        ],
        value: fee,
        chainId: robinhood.id,
      });
    } catch (e) {
      say(`launch failed: ${String((e as Error).message || e).slice(0, 140)}`);
    } finally {
      setUploading(false);
      setUpPct(null);
    }
  };

  /* ---------- portfolio ---------- */
  const openPortfolio = async () => {
    if (!isConnected || !address) { connectWallet(); return; }
    setPortfolioOpen(true);
    if (live) {
      const b = await walletBalances(tracks.map((t) => t.token), address);
      setBalances(b);
    } else setBalances({});
  };

  /* ---------- derived feeds ---------- */
  const tickLine = tracks
    .slice(0, 12)
    .map((t) => `${t.name} / ${t.artist} / ${fmtEth(t.priceEth)} ETH`)
    .join("   ✦   ");
  const tickSep = "\u00A0\u00A0\u00A0✦\u00A0\u00A0\u00A0";

  const mqPart = (k: string) =>
    tracks.slice(0, 12).map((t, i) => (
      <span key={`${k}-${i}`}>
        <b>{t.name}</b> {fmtEth(t.priceEth)} ETH&nbsp;&nbsp;✦&nbsp;&nbsp;
      </span>
    ));

  const mqEl = useMemo(
    () => (
      <div className="mq">
        <div>{mqPart("a")}{mqPart("b")}</div>
      </div>
    ),
    [tracks], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const topArtists = useMemo(() => {
    const m = new Map<string, { artist: string; plays: number; img: string }>();
    for (const t of tracks) {
      const e = m.get(t.artist) ?? { artist: t.artist, plays: 0, img: "" };
      e.plays += t.plays ?? 0;
      if (!e.img) e.img = t.logo;
      m.set(t.artist, e);
    }
    return [...m.values()].sort((a, b) => b.plays - a.plays).slice(0, 5);
  }, [tracks]);

  const artistsCount = useMemo(() => new Set(tracks.map((t) => t.artist)).size, [tracks]);
  const graduatedCount = useMemo(() => tracks.filter((t) => t.graduated).length, [tracks]);

  const view = useMemo(() => {
    const idx = tracks.map((_, i) => i);
    if (tab === "az") idx.sort((a, b) => (tracks[a].name < tracks[b].name ? -1 : 1));
    return idx;
  }, [tracks, tab]);

  const liveLabel = loading
    ? "Robinhood Chain / loading catalog…"
    : live
      ? `Robinhood Chain / ${tracks.length} tracks on pons v2`
      : tracks.length
        ? `Robinhood Chain / ${tracks.length} tracks via Audius`
        : "Robinhood Chain";

  const launchStatus = isDemo
    ? track.audio
      ? "audius stream — launch yours to trade onchain"
      : "demo data — launch a real track"
    : track.graduated
      ? "✓ graduated — trading in v4 pool"
      : `${(track.progress * 100).toFixed(1)}% → graduation (4.2 eth)`;

  const fmtTime = (s: number) => {
    if (!isFinite(s) || s <= 0) return "0:00";
    const m = Math.floor(s / 60);
    const ss = Math.floor(s % 60);
    return `${m}:${String(ss).padStart(2, "0")}`;
  };

  /* ---------- navigation ---------- */
  const closeMenu = () => setMenuOpen(false);
  const walletLabel =
    isPending || txPending || txMining || launchWait.isLoading
      ? "Pending…"
      : isConnected && address
        ? `${address.slice(0, 6)}…${address.slice(-4)} ×`
        : "Connect wallet";

  const navItems = (
    <>
      <a href="#tracks" onClick={closeMenu}>Discover</a>
      <a href="#token" onClick={closeMenu}>$VURAFY</a>
      <a href="#artists" onClick={closeMenu}>Artists</a>
      <a href="/vurafy/how" onClick={closeMenu}>How it works</a>
      <a href="https://x.com/vurafy" target="_blank" rel="noreferrer" onClick={closeMenu}>X ↗</a>
      <button onClick={() => { closeMenu(); setLaunchOpen(true); }}>Launchpad</button>
      <button onClick={() => { closeMenu(); openPortfolio(); }}>Portfolio</button>
      {wrongChain && (
        <button className="chain-warn" onClick={() => { closeMenu(); switchToRobinhood(); }}>
          {chainSwitching ? "Switching…" : "⚠ Robinhood Chain →"}
        </button>
      )}
      <button className="btn" onClick={() => { closeMenu(); onWallet(); }}>{walletLabel}</button>
    </>
  );

  /* ---------- 3d tilt ---------- */
  const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const onGridMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reducedMotion()) return;
    const el = (e.target as HTMLElement).closest(".card") as HTMLElement | null;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--ry", `${((e.clientX - r.left) / r.width - 0.5) * 10}deg`);
    el.style.setProperty("--rx", `${-((e.clientY - r.top) / r.height - 0.5) * 10}deg`);
  };
  const onGridLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.querySelectorAll<HTMLElement>(".card").forEach((el) => {
      el.style.setProperty("--rx", "0deg");
      el.style.setProperty("--ry", "0deg");
    });
  };
  const onStageMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (reducedMotion()) return;
    const st = e.currentTarget.querySelector<HTMLElement>(".stage");
    if (!st) return;
    const r = e.currentTarget.getBoundingClientRect();
    st.style.setProperty("--ry", `${((e.clientX - r.left) / r.width - 0.5) * 18}deg`);
    st.style.setProperty("--rx", `${-((e.clientY - r.top) / r.height - 0.5) * 14}deg`);
  };
  const onStageLeave = (e: React.PointerEvent<HTMLDivElement>) => {
    const st = e.currentTarget.querySelector<HTMLElement>(".stage");
    st?.style.setProperty("--rx", "0deg");
    st?.style.setProperty("--ry", "0deg");
  };

  // grid is memoized: stream position updates (several times a second) must not re-render 50 cards.
  // `playing` is NOT a dep — the badge visibility is driven by a data-attribute on the wrapper
  // (React bails out of the memoized subtree when only the attribute changes), otherwise every
  // play/pause re-renders all cards and the UI visibly jumps on mobile.
  const gridEl = useMemo(
    () => (
      <div className="tgrid" onMouseMove={onGridMove} onMouseLeave={onGridLeave}>
        {view.map((i, vp) => {
          const t = tracks[i];
          const active = i === sel;
          return (
            <button
              key={`${t.symbol}-${i}`}
              className="card"
              aria-current={active}
              style={{ animationDelay: `${(vp % 12) * 60}ms` }}
              // prevent iOS from scrolling the page to the focused button on tap (page "jumps")
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => {
                if (active) play();
                else {
                  autoplayRef.current = true;
                  setSel(i);
                }
              }}
            >
              <div className="thumb">
                <CoverArt seed={`${t.name}-${t.symbol}`} symbol={t.symbol} />
                {t.logo && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={t.logo}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                  />
                )}
                <span className="sym">{t.symbol}</span>
                <span className="pbadge">{fmtEth(t.priceEth)} ETH</span>
                {active && <span className="playing">▶ playing</span>}
              </div>
              <h3>{t.name}</h3>
              <div className="art">{t.artist}</div>
              <div className="row">
                <span className="note">
                  {t.graduated ? "✓ graduated" : t.isDemo ? "stream" : `${Math.round(t.progress * 100)}% → pool`}
                </span>
                <span className="note">{t.plays ? `${t.plays.toLocaleString("en-US")} plays` : ""}</span>
              </div>
            </button>
          );
        })}
      </div>
    ),
    [view, tracks, sel], // eslint-disable-line react-hooks/exhaustive-deps
  );

  return (
    <div style={{ position: "relative", zIndex: 0, minHeight: "100vh", paddingBottom: 170 }}>
      <style>{`@keyframes vp-up{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
        .vp-glass{background:linear-gradient(165deg,rgba(255,255,255,.065),rgba(255,255,255,.015));border:1px solid rgba(255,255,255,.13);backdrop-filter:blur(16px) saturate(130%);-webkit-backdrop-filter:blur(16px) saturate(130%);box-shadow:0 30px 70px rgba(0,0,0,.65),inset 0 1px 0 rgba(255,255,255,.09);border-radius:8px;transition:border-color .35s,box-shadow .35s}
        .vp-glass:hover{border-color:rgba(255,255,255,.32);box-shadow:0 34px 80px rgba(0,0,0,.7),0 0 48px rgba(255,255,255,.08),inset 0 1px 0 rgba(255,255,255,.15)}
        .vp-btn-p{background:linear-gradient(180deg,#ffffff,#e2e2e2);color:#000;border:none;border-radius:6px;box-shadow:0 10px 30px rgba(255,255,255,.16),inset 0 1px 0 rgba(255,255,255,.95);transition:transform .25s,box-shadow .25s;font-weight:700}
        .vp-btn-p:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 16px 44px rgba(255,255,255,.32)}
        .vp-btn-s{border:1px solid rgba(255,255,255,.38);border-radius:6px;background:rgba(255,255,255,.035);transition:background .25s,color .25s,transform .25s,border-color .25s}
        .vp-btn-s:hover{background:#fff;color:#000;transform:translateY(-2px);border-color:#fff}
        .vp-grad{background:linear-gradient(92deg,#ffffff 15%,#9b9b9b 50%,#ffffff 85%);-webkit-background-clip:text;background-clip:text;color:transparent}
        .vp-input{background:rgba(0,0,0,.5);border:1px solid rgba(255,255,255,.16);border-radius:6px;color:#fff;outline:none;transition:border-color .2s,box-shadow .2s}
        .vp-input:focus{border-color:rgba(255,255,255,.6);box-shadow:0 0 0 3px rgba(255,255,255,.09)}
        .vp-input::placeholder{color:#6b6b6b}
        .tok-logo{position:relative;width:72px;height:72px;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,.18);flex:0 0 auto;background:rgba(255,255,255,.05)}
        .tok-logo img{width:100%;height:100%;object-fit:cover}`}</style>

      <BgWaves playing={playing} />

      {/* Header */}
      <header className="site-head">
        <div className="disp logo">VURAFY</div>
        <nav className="nav-main">{navItems}</nav>
        <button className="burger" aria-label={menuOpen ? "Close menu" : "Open menu"} onClick={() => setMenuOpen((o) => !o)}>
          {menuOpen ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 5l14 14M19 5L5 19" /></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
          )}
        </button>
      </header>
      {menuOpen && <div className="mnav">{navItems}</div>}

      <div className="wrap">
        {/* Hero */}
        <div className="hero">
          <div>
            <div className="live">{liveLabel}</div>
            <h1 className="disp"><span><b>OWN THE</b></span><span><b>SOUND.</b></span></h1>
            <p className="lead">
              Every track is a token on a bonding curve. Buy shares in the music you believe in,
              or launch your own track for 0.0005 ETH.
            </p>
            <div className="cta">
              <button className="btn" onClick={openBuy}>Purchase shares</button>
              <button className="btn out" onClick={() => setLaunchOpen(true)}>+ Launch your track</button>
            </div>
            <div className="note" style={{ marginTop: 10, minHeight: 18 }}>
              tip: space — play/pause · ← → — switch track · click a cover to listen
            </div>
          </div>
          <div className="stageWrap" onPointerMove={onStageMove} onPointerLeave={onStageLeave}>
            <div className="stage" onClick={() => (playing ? pause() : play())}>
              <div className={`vinyl${playing ? " on" : ""}`} />
              <div className="cover">
                <CoverArt seed={`${track.name}-${track.symbol}`} symbol={track.symbol} />
                {track.logo && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={track.logo} src={track.logo} alt="" className="swap" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Outlined marquee */}
        {mqEl}

        {/* Now playing — glow panel */}
        <div className="glow feat">
          <div>
            <span className="note">now playing</span>
            <h2 className="disp">{track.name}</h2>
            <div className="note">{track.artist}</div>
            <div className="meta">
              <div>
                <b>{isDemo ? `${track.priceEth} ETH` : `${fmtEth(track.priceEth)} ETH`}</b>
                <span className="note">price per share</span>
              </div>
              <div>
                <b>{fmtTokens(track.available)}</b>
                <span className="note">available</span>
              </div>
              <div>
                <b>{track.symbol}</b>
                <span className="note">token</span>
              </div>
            </div>
            <div className="row">
              <span>Launch status</span>
              <span className="note">{launchStatus}</span>
            </div>
            <div className="bar"><i style={{ width: `${Math.min(100, track.progress * 100)}%` }} /></div>
            <div className="cta" style={{ marginTop: 14 }}>
              <button className="btn" onClick={openBuy}>
                {track.graduated && !isDemo ? "Trade on pons ↗" : "Purchase shares"}
              </button>
              <button
                className="btn out"
                onClick={() => {
                  if (!isDemo) window.open(`${EXPLORER}/address/${track.token}`, "_blank");
                  else say("appears after launch");
                }}
              >
                View on chain
              </button>
            </div>
            {!isDemo && (
              <a
                href={`${EXPLORER}/address/${track.token}`}
                target="_blank"
                rel="noopener"
                className="note"
                style={{ display: "block", marginTop: 8 }}
              >
                {track.token.slice(0, 6)}…{track.token.slice(-4)} ↗
              </a>
            )}
          </div>
          <div>
            <div className="row">
              <span>Stream position</span>
              <span className="note">{fmtTime(pos.t)} / {fmtTime(pos.d)}</span>
            </div>
            <CurveSvg p={pos.p} />
            <div className="row" style={{ marginTop: 6 }}>
              <span className="note">{playing ? "▶ live stream" : "⏸ paused"}</span>
              <span className="note">{Math.round(pos.p * 100)}%</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="stats">
          <div className="stat"><span className="note">tracks</span><b>{tracks.length}</b></div>
          <div className="stat"><span className="note">artists</span><b>{artistsCount}</b></div>
          <div className="stat"><span className="note">graduated</span><b>{graduatedCount}</b></div>
          <div className="stat"><span className="note">launch fee</span><b>{cfg ? `${formatEther(cfg.fee)} ETH` : "0.0005 ETH"}</b></div>
        </div>

        {/* $VURAFY token trade */}
        <section id="token">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
            <h2 className="disp t">$VURAFY</h2>
            <a
              className="note"
              href={`${EXPLORER}/address/${PROJECT_TOKEN}`}
              target="_blank"
              rel="noreferrer"
              style={{ color: "var(--mute)" }}
            >
              {PROJECT_TOKEN.slice(0, 6)}…{PROJECT_TOKEN.slice(-4)} ↗
            </a>
          </div>
          <div style={{ margin: "16px 0 18px" }}>
            <PriceChart trades={ptTrades} priceEth={pt?.priceEth ?? 0} totalSupply={pt?.totalSupply ?? 0n} />
          </div>
          <div className="two">
            <div className="glow">
              <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                <div className="tok-logo">
                  {pt?.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={ipfsHttp(pt.logo)} alt="" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                  ) : (
                    <CoverArt seed="vurafy-project-token" symbol={(pt?.symbol ?? "VUR").slice(0, 3)} />
                  )}
                </div>
                <div>
                  <div className="disp" style={{ fontSize: 22 }}>{pt?.name ?? "VURAFY"}</div>
                  <div className="note">{pt?.symbol ?? "VURAFY"} · project token</div>
                </div>
              </div>
              <p
                className="note"
                style={{ marginTop: 12, lineHeight: 1.6, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}
              >
                {pt?.description}
              </p>
              <div className="row" style={{ marginTop: 12 }}>
                <span>Price</span>
                <span>{pt ? `${(pt.priceEth * 1e9).toFixed(2)} gwei` : "…"}</span>
              </div>
              <div className="row">
                <span>Raised</span>
                <span>{pt ? `${fmtRaised(pt.raised)} / ${formatEther(pt.threshold)} ETH` : "…"}</span>
              </div>
              <div className="bar" style={{ marginTop: 8 }}>
                <i style={{ width: `${Math.min(100, (pt?.progress ?? 0) * 100)}%` }} />
              </div>
              <div className="row" style={{ marginTop: 12 }}>
                <span>Fees</span>
                <span>{pt ? `${pt.feeBps / 100}% trade + ${pt.creatorTaxBps / 100}% creator tax` : "…"}</span>
              </div>
              <div className="row">
                <span>Your balance</span>
                <span>{isConnected && pt ? `${fmtTokens(pt.balance)} ${pt.symbol}` : "—"}</span>
              </div>
            </div>
            <div className="panel">
              <div className="tabs">
                <button className="tab" aria-pressed={ptSide === "buy"} onClick={() => { setPtSide("buy"); setPtAmt("0.01"); setPtQuote(null); }}>Buy</button>
                <button className="tab" aria-pressed={ptSide === "sell"} onClick={() => { setPtSide("sell"); setPtAmt("0"); setPtQuote(null); }}>Sell</button>
              </div>
              {pt?.graduated ? (
                <button className="btn" style={{ width: "100%" }} onClick={() => window.open(`${PONS_APP}/${PROJECT_TOKEN}`, "_blank")}>
                  Graduated — trade on pons ↗
                </button>
              ) : (
                <>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      className="vp-input"
                      inputMode="decimal"
                      value={ptAmt}
                      onChange={(e) => setPtAmt(e.target.value.replace(/[^0-9.]/g, "").replace(/^0+(?=\d)/, ""))}
                      placeholder={ptSide === "buy" ? "0.01" : "1000"}
                      style={{ flex: 1, padding: "12px 14px", fontSize: 16, width: "100%" }}
                      aria-label={ptSide === "buy" ? "ETH amount" : "VURAFY amount"}
                    />
                    <span className="note" style={{ minWidth: 54, textAlign: "right" }}>{ptSide === "buy" ? "ETH" : pt?.symbol ?? "VURAFY"}</span>
                  </div>
                  <div className="note" style={{ marginTop: 8, minHeight: 18 }}>
                    {ptQuoting
                      ? "quoting…"
                      : ptQuote
                        ? ptSide === "buy"
                          ? `≈ ${fmtTokens(ptQuote.out)} ${pt?.symbol ?? "VURAFY"}`
                          : `≈ ${fmtEth(Number(formatUnits(ptQuote.out, 18)))} ETH`
                        : " "}
                  </div>
                  <button
                    className="btn"
                    style={{ width: "100%", marginTop: 10 }}
                    disabled={!!ptBusy || !ptQuote || ptSellOver}
                    onClick={doPt}
                  >
                    {!isConnected
                      ? "Connect wallet"
                      : wrongChain
                        ? chainSwitching ? "Switching…" : "Switch to Robinhood Chain"
                        : ptBusy === "approve"
                          ? "Approving…"
                          : ptBusy === "sell"
                            ? "Selling…"
                            : ptBusy === "buy"
                              ? "Buying…"
                              : ptSellOver
                                ? "Insufficient balance"
                                : !ptQuote
                                  ? "Enter an amount"
                                  : ptSide === "buy"
                                    ? "Buy $VURAFY"
                                    : "Sell $VURAFY"}
                  </button>
                  <div className="note" style={{ marginTop: 8 }}>
                    {ptSide === "sell"
                      ? pt
                        ? `balance: ${fmtTokens(pt.balance)} ${pt.symbol} · slippage 10%`
                        : " "
                      : pt
                        ? `slippage 10% · fee ${pt.feeBps / 100}%`
                        : " "}
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Tracks */}
        <section id="tracks">
          <h2 className="disp t">TRACKS</h2>
          <div className="tabs">
            <button className="tab" aria-pressed={tab === "trending"} onPointerDown={(e) => e.preventDefault()} onClick={() => setTab("trending")}>Trending 24h</button>
            <button className="tab" aria-pressed={tab === "az"} onPointerDown={(e) => e.preventDefault()} onClick={() => setTab("az")}>A–Z</button>
          </div>
          <div data-playing={playing}>{gridEl}</div>
        </section>

        {/* Top artists + launch */}
        <section id="artists" className="two">
          <div>
            <h2 className="disp t">TOP ARTISTS</h2>
            <div className="panel">
              <ul className="lb">
                {topArtists.map((o, i) => (
                  <li key={o.artist}>
                    <span className="note">#{i + 1}</span>
                    <span className="av" style={o.img ? { backgroundImage: `url("${o.img}")` } : undefined} />
                    <span style={{ color: "var(--ink)", fontSize: 13 }}>{o.artist}</span>
                    <span className="note">{o.plays ? `${o.plays.toLocaleString("en-US")} plays` : "—"}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div id="launch">
            <h2 className="disp t">LAUNCH YOUR TRACK</h2>
            <div className="panel">
              <div className="row"><span>Upload cover + audio, name your track</span><span className="note">vurafy app</span></div>
              <div className="row"><span>Launch fee</span><span>{cfg ? `${formatEther(cfg.fee)} ETH` : "0.0005 ETH"}</span></div>
              <div className="row"><span>Graduation</span><span>4.2 ETH → pool</span></div>
              <div className="row"><span>Creator tax</span><span>{cfg ? `up to ${cfg.maxTax / 100}%` : "up to 20%"}</span></div>
              <button className="btn" style={{ width: "100%", marginTop: 12 }} onClick={() => setLaunchOpen(true)}>
                Open launchpad
              </button>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
            <h2 className="disp t">HOW IT WORKS</h2>
            <a className="note" href="/vurafy/how" style={{ color: "var(--mute)" }}>read the full guide →</a>
          </div>
          <div className="steps">
            {[
              { n: "1", t: "CONNECT", d: "Connect your wallet. The site switches you to Robinhood Chain — even if you don't have the network yet." },
              { n: "2", t: "LAUNCH", d: "Upload a cover and audio, name your track. For 0.0005 ETH the token goes live on the curve." },
              { n: "3", t: "TRADE", d: "Anyone can buy shares of the track. At 4.2 ETH the track graduates into the pool." },
            ].map((s) => (
              <div className="panel" key={s.n}>
                <div className="n">{s.n}</div>
                <b>{s.t}</b>
                <p>{s.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Verify and risks */}
        <section id="risks">
          <h2 className="disp t">VERIFY AND RISKS</h2>
          <details className="risk">
            <summary>Are track tokens a guaranteed investment?</summary>
            <p>
              No. Tokens trade on a bonding curve: the price falls as easily as it rises and you can
              lose everything you put in. Nothing here is financial advice — verify every contract and
              only spend what you can afford to lose.
            </p>
          </details>
          <details className="risk">
            <summary>Who controls the contracts?</summary>
            <p>
              Nobody, admin-wise. The factory, the curves and the pools are public pons v2 contracts on
              Robinhood Chain (chainId 4663). Every address is verifiable in the explorer — the site
              only calls them, it cannot move your funds.
            </p>
          </details>
          <details className="risk">
            <summary>Where does the audio live?</summary>
            <p>
              The mp3 link is stored in the token description on-chain (VURAFY | artist | audio: url)
              and the artist picks the audio host. If a host goes down the link may stop working — the
              token itself keeps trading.
            </p>
          </details>
          <details className="risk">
            <summary>What happens at graduation?</summary>
            <p>
              When 4.2 ETH has been raised, liquidity moves into a Uniswap v4 pool, the curve closes,
              and the track trades like a regular token.
            </p>
          </details>
          <details className="risk">
            <summary>Do I need a crypto wallet?</summary>
            <p>
              Yes — MetaMask, Rabby or any wallet. On desktop the site connects your extension; on a
              phone it opens your wallet through a WalletConnect deep-link. Switching to Robinhood
              Chain takes one click.
            </p>
          </details>
        </section>

        <footer className="site-foot">
          <span className="disp" style={{ letterSpacing: ".4em" }}>VURAFY</span>
          <span className="note">
            Track tokenization protocol // Robinhood Chain // catalog:{" "}
            {live ? "pons v2 onchain + Audius trending" : "Audius trending electronic"}
          </span>
          <span className="note">
            <a href="https://x.com/vurafy" target="_blank" rel="noreferrer" style={{ color: "var(--ink)" }}>X ↗</a>
          </span>
        </footer>
      </div>

      {/* Dock player */}
      <div className="dock">
        <div className="tick"><div>{tickLine}{tickSep}{tickLine}{tickSep}</div></div>
        <DockWave
          seed={track.name.length * 977 + track.artist.length * 131 + 41}
          playing={playing}
          prog={pos.p}
          onSeek={seek}
        />
        <div className="player">
          <button className="ctl" onPointerDown={(e) => e.preventDefault()} onClick={() => switchTrack(sel - 1)} aria-label="Previous track">⏮</button>
          <button className="ctl" onPointerDown={(e) => e.preventDefault()} onClick={() => (playing ? pause() : play())} aria-label={playing ? "Pause" : "Play"}>
            {playing ? "⏸" : "▶"}
          </button>
          <button className="ctl" onPointerDown={(e) => e.preventDefault()} onClick={() => switchTrack(sel + 1)} aria-label="Next track">⏭</button>
          <span className="now">now: {track.name} by {track.artist}</span>
          <span className="status">{sel + 1} / {tracks.length} · {fmtTime(pos.t)} / {fmtTime(pos.d)}</span>
        </div>
      </div>

      {/* ===== BUY MODAL ===== */}
      {buyOpen && (
        <div className="fixed inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,.72)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", zIndex: 60 }} onClick={() => { setBuyOpen(false); setQuote(null); }}>
          <div className="vp-glass p-6" style={{ width: 460, maxWidth: "calc(100vw - 40px)", animation: "vp-up .45s cubic-bezier(.16,1,.3,1) both", background: "linear-gradient(165deg, rgba(20,20,20,.92), rgba(8,8,8,.94))" }} onClick={(e) => e.stopPropagation()}>
            <div className="uppercase" style={{ ...MONO, fontSize: 12, letterSpacing: "0.2em", color: "#8f8f8f" }}>Purchase shares // curve buy</div>
            <div className="uppercase vp-grad" style={{ fontSize: 22, fontWeight: 800, marginBottom: 16 }}>{track.name} — {track.artist}</div>

            <div className="uppercase mb-1" style={{ ...MONO, fontSize: 11, color: "#8f8f8f" }}>You pay (ETH)</div>
            <div className="flex gap-2 mb-3">
              <input
                value={ethIn}
                onChange={(e) => setEthIn(e.target.value.replace(/[^0-9.]/g, ""))}
                className="vp-input flex-1 px-3 py-2"
                style={{ ...MONO, fontSize: 16 }}
                inputMode="decimal"
              />
              {["0.01", "0.05", "0.1"].map((q) => (
                <button key={q} className="vp-btn-s px-3 uppercase" style={{ ...MONO, fontSize: 11, cursor: "pointer" }} onClick={() => setEthIn(q)}>{q}</button>
              ))}
            </div>

            <div className="uppercase text-neutral-400 flex justify-between py-2 border-b border-dashed border-neutral-700" style={{ ...MONO, fontSize: 12 }}>
              <span>You receive ≈</span>
              <b className="text-white">{quote ? `${fmtTokens(quote.tokensOut)} ${track.symbol}` : quoting ? "…" : "—"}</b>
            </div>
            <div className="uppercase text-neutral-400 flex justify-between py-2 border-b border-dashed border-neutral-700" style={{ ...MONO, fontSize: 12 }}>
              <span>Trade fee</span><b className="text-white">{quote ? `${Number(quote.feeBps) / 100}%` : "—"}</b>
            </div>
            <div className="uppercase text-neutral-400 flex justify-between py-2 border-b border-dashed border-neutral-700" style={{ ...MONO, fontSize: 12 }}>
              <span>Creator tax</span><b className="text-white">{quote ? `${Number(quote.creatorTaxBps) / 100}%` : "—"}</b>
            </div>
            {quote && quote.snipeBps > 0n && (
              <div className="uppercase flex justify-between py-2 border-b border-dashed border-neutral-700" style={{ ...MONO, fontSize: 12, color: "#ff7700" }}>
                <span>Opening snipe tax</span><b>{Number(quote.snipeBps) / 100}%</b>
              </div>
            )}
            <div className="uppercase text-neutral-400 flex justify-between py-2 border-b border-dashed border-neutral-700" style={{ ...MONO, fontSize: 12 }}>
              <span>Slippage protection</span><b className="text-white">10%</b>
            </div>

            <div className="flex gap-3 mt-5">
              <button className="flex-1 py-3 uppercase vp-btn-s" style={{ ...MONO, fontSize: 12, cursor: "pointer" }} onClick={() => { setBuyOpen(false); setQuote(null); }}>Cancel</button>
              <button className="flex-1 py-3 uppercase vp-btn-p disabled:opacity-50" style={{ ...MONO, fontSize: 12, cursor: "pointer" }} disabled={!quote || quoting || txPending || txMining} onClick={doBuy}>
                {!isConnected ? "Connect Wallet" : wrongChain ? (chainSwitching ? "Switching…" : "Switch to Robinhood Chain") : txPending || txMining ? "Confirming…" : "Confirm Purchase"}
              </button>
            </div>
            <div className="uppercase mt-3 text-center" style={{ ...MONO, fontSize: 10, color: "#6f6f6f" }}>
              pons v2 curve · trade settles onchain · robinhood chain
            </div>
          </div>
        </div>
      )}

      {/* ===== LAUNCH MODAL ===== */}
      {launchOpen && (
        <div className="fixed inset-0 flex items-center justify-center overflow-y-auto" style={{ background: "rgba(0,0,0,.72)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", zIndex: 60 }} onClick={() => setLaunchOpen(false)}>
          <div className="vp-glass p-6" style={{ width: 480, maxWidth: "calc(100vw - 40px)", margin: "30px 0", animation: "vp-up .45s cubic-bezier(.16,1,.3,1) both", background: "linear-gradient(165deg, rgba(20,20,20,.92), rgba(8,8,8,.94))" }} onClick={(e) => e.stopPropagation()}>
            <div className="uppercase" style={{ ...MONO, fontSize: 12, letterSpacing: "0.2em", color: "#8f8f8f" }}>Launchpad // track = token</div>
            <div className="uppercase vp-grad" style={{ fontSize: 22, fontWeight: 800, marginBottom: 16 }}>Launch your track</div>

            {([["title", "Track title", "Cosmic Echo"], ["artist", "Artist name", "VURAFY"], ["symbol", `Symbol (auto: ${autoSymbol})`, ""]] as const).map(([key, label, ph]) => (
              <div key={key} className="mb-3">
                <div className="uppercase text-neutral-400 mb-1" style={{ ...MONO, fontSize: 11 }}>{label}</div>
                <input
                  value={form[key]}
                  placeholder={ph}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  className="vp-input w-full px-3 py-2"
                  style={{ ...MONO, fontSize: 13 }}
                />
              </div>
            ))}
            <div className="mb-3">
              <div className="uppercase text-neutral-400 mb-1" style={{ ...MONO, fontSize: 11 }}>Cover image (.jpg/.png/.webp, max 4MB)</div>
              <label className="filepick">
                <span className="filepick-btn">{coverFile ? "Change" : "Choose image"}</span>
                <span className="filepick-name">{coverFile ? coverFile.file.name : "no file chosen"}</span>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) pickMedia("cover", f);
                    e.target.value = "";
                  }}
                />
              </label>
              {coverFile && (
                <div className="flex items-center gap-2 mt-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={coverFile.url} alt="" style={{ width: 72, height: 72, objectFit: "cover", border: "1px solid #404040" }} />
                  <span className="truncate" style={{ ...MONO, fontSize: 11, color: "#9a9a9a" }}>{coverFile.file.name}</span>
                  <button className="ml-auto" style={{ background: "none", border: "none", color: "#8f8f8f", cursor: "pointer", fontSize: 14 }} onClick={() => { URL.revokeObjectURL(coverFile.url); setCoverFile(null); }}>×</button>
                </div>
              )}
            </div>
            <div className="mb-3">
              <div className="uppercase text-neutral-400 mb-1" style={{ ...MONO, fontSize: 11 }}>Audio file (.mp3/.wav, max 50MB)</div>
              <label className="filepick">
                <span className="filepick-btn">{audioFile ? "Change" : "Choose audio"}</span>
                <span className="filepick-name">{audioFile ? audioFile.file.name : "no file chosen"}</span>
                <input
                  type="file"
                  accept=".mp3,.wav,audio/mpeg,audio/wav"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) pickMedia("audio", f);
                    e.target.value = "";
                  }}
                />
              </label>
              {audioFile && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="truncate" style={{ ...MONO, fontSize: 11, color: "#9a9a9a" }}>{audioFile.file.name}</span>
                  <button className="ml-auto" style={{ background: "none", border: "none", color: "#8f8f8f", cursor: "pointer", fontSize: 14 }} onClick={() => { URL.revokeObjectURL(audioFile.url); setAudioFile(null); }}>×</button>
                </div>
              )}
            </div>
            <div className="mb-3">
              <div className="uppercase text-neutral-400 mb-1" style={{ ...MONO, fontSize: 11 }}>Creator tax on trades, bps (max {cfg ? cfg.maxTax / 100 : "—"}%) — artist earns % on every trade</div>
              <input
                value={form.tax}
                onChange={(e) => setForm((f) => ({ ...f, tax: e.target.value.replace(/[^0-9]/g, "") }))}
                className="vp-input w-full px-3 py-2"
                style={{ ...MONO, fontSize: 13 }}
              />
            </div>

            <div className="uppercase text-neutral-400 flex justify-between py-2 border-b border-dashed border-neutral-700" style={{ ...MONO, fontSize: 12 }}>
              <span>Launch fee</span><b className="text-white">{cfg ? `${formatEther(cfg.fee)} ETH` : "…"}</b>
            </div>
            <div className="uppercase text-neutral-400 flex justify-between py-2 border-b border-dashed border-neutral-700" style={{ ...MONO, fontSize: 12 }}>
              <span>Supply</span><b className="text-white">1,000,000,000 (fixed)</b>
            </div>
            <div className="uppercase text-neutral-400 flex justify-between py-2 border-b border-dashed border-neutral-700" style={{ ...MONO, fontSize: 12 }}>
              <span>Curve</span><b className="text-white">native ETH · v4 pool at graduation</b>
            </div>
            {cfg && !cfg.can && (
              <div className="uppercase mt-2" style={{ ...MONO, fontSize: 11, color: "#ff3b5c" }}>launching closed for this wallet</div>
            )}

            <div className="flex gap-3 mt-5">
              <button className="flex-1 py-3 uppercase vp-btn-s" style={{ ...MONO, fontSize: 12, cursor: "pointer", color: "inherit" }} onClick={addLocalTrack}>
                Add Track (Free Demo)
              </button>
            </div>
            <div className="flex gap-3 mt-3">
              <button className="flex-1 py-3 uppercase vp-btn-s" style={{ ...MONO, fontSize: 12, cursor: "pointer" }} onClick={() => setLaunchOpen(false)}>Cancel</button>
              <button className="flex-1 py-3 uppercase vp-btn-p disabled:opacity-50" style={{ ...MONO, fontSize: 12, cursor: "pointer" }} disabled={!isConnected || launch.isPending || launchWait.isLoading || uploading || !cfg} onClick={doLaunch}>
                {!isConnected ? "Connect Wallet" : wrongChain ? (chainSwitching ? "Switching…" : "Switch to Robinhood Chain") : uploading ? (upPct != null ? `Uploading media to IPFS… ${upPct}%` : "Uploading media to IPFS…") : launch.isPending || launchWait.isLoading ? "Launching…" : `Launch on Chain (${cfg ? formatEther(cfg.fee) : "…"} ETH)`}
              </button>
            </div>
            <div className="uppercase mt-3 text-center" style={{ ...MONO, fontSize: 10, color: "#6f6f6f" }}>
              description format: vurafy | artist | audio: url — that&apos;s how the catalog finds tracks
            </div>
          </div>
        </div>
      )}

      {/* ===== PORTFOLIO MODAL ===== */}
      {portfolioOpen && (
        <div className="fixed inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,.72)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", zIndex: 60 }} onClick={() => setPortfolioOpen(false)}>
          <div className="vp-glass p-6" style={{ width: 520, maxWidth: "calc(100vw - 40px)", animation: "vp-up .45s cubic-bezier(.16,1,.3,1) both", background: "linear-gradient(165deg, rgba(20,20,20,.92), rgba(8,8,8,.94))" }} onClick={(e) => e.stopPropagation()}>
            <div className="uppercase" style={{ ...MONO, fontSize: 12, letterSpacing: "0.2em", color: "#8f8f8f" }}>My portfolio // track shares</div>
            <div className="uppercase vp-grad" style={{ fontSize: 22, fontWeight: 800, margin: "6px 0 14px" }}>
              {address ? `${address.slice(0, 8)}…${address.slice(-6)}` : "—"}
            </div>
            {!live ? (
              <div className="uppercase text-neutral-400 py-6 text-center" style={{ ...MONO, fontSize: 12 }}>
                no onchain tracks yet — launch the first one
              </div>
            ) : tracks.length === 0 ? (
              <div className="uppercase text-neutral-400 py-6 text-center" style={{ ...MONO, fontSize: 12 }}>catalog empty</div>
            ) : (
              tracks.map((t) => {
                const bal = balances[t.token.toLowerCase()] ?? 0n;
                const value = Number(formatUnits(bal, 18)) * t.priceEth;
                return (
                  <div key={t.token} className="uppercase flex justify-between py-2 border-b border-dashed border-neutral-700" style={{ ...MONO, fontSize: 12 }}>
                    <span className="text-neutral-400">{t.name} — {t.symbol}</span>
                    <b className="text-white">{fmtTokens(bal)} sh · {value >= 0.0001 ? value.toFixed(4) : "≈0"} ETH</b>
                  </div>
                );
              })
            )}
            <div className="flex gap-3 mt-5">
              <button className="flex-1 py-3 uppercase vp-btn-s" style={{ ...MONO, fontSize: 12, cursor: "pointer" }} onClick={() => setPortfolioOpen(false)}>Close</button>
              <button className="flex-1 py-3 uppercase vp-btn-p" style={{ ...MONO, fontSize: 12, cursor: "pointer" }} onClick={() => { setPortfolioOpen(false); setLaunchOpen(true); }}>+ Launch track</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      <div
        role="status"
        className="fixed bg-white text-black px-5 py-2.5 uppercase transition-opacity"
        style={{ ...MONO, fontSize: 11, letterSpacing: "0.08em", left: "50%", bottom: 96, transform: "translateX(-50%)", opacity: toast ? 1 : 0, pointerEvents: "none", zIndex: 70, maxWidth: "90vw", textAlign: "center", borderRadius: 8, boxShadow: "0 18px 50px rgba(0,0,0,.65), 0 0 34px rgba(255,255,255,.25)" }}
      >
        {toast}
      </div>

      {loading && (
        <div className="fixed uppercase note" style={{ top: 76, left: 24, letterSpacing: "0.2em", zIndex: 5 }}>
          indexing pons factory…
        </div>
      )}
    </div>
  );
}
