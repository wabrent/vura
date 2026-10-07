"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAccount, useConnect, useDisconnect, usePublicClient, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, formatEther, formatUnits, toHex, zeroAddress, type Address } from "viem";
import { robinhood } from "@/lib/web3/config";
import {
  FACTORY, EXPLORER, PONS_APP, factoryAbi, curveAbi,
  discoverLaunches, loadTrack, quoteBuy, walletBalances, buildDescription, VPLAY_SOCIALS,
  type Track, type LaunchLog, type Quote,
} from "./pons";

const MONO = { fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" };
const GREEN = "#00ff66";

const DEMO_TRACKS: Track[] = [
  { token: zeroAddress, curve: zeroAddress, deployer: zeroAddress, name: "Cosmic Echo", symbol: "CSMIC", logo: "", artist: "Vura", audio: "", priceEth: 0.1, totalSupply: 1_000_000_000n * 10n ** 18n, available: 450n * 10n ** 18n, progress: 0.42, graduated: false, creatorTaxBps: 0, isDemo: true },
  { token: zeroAddress, curve: zeroAddress, deployer: zeroAddress, name: "Eclipse", symbol: "ECLPS", logo: "", artist: "Kora", audio: "", priceEth: 0.05, totalSupply: 1_000_000_000n * 10n ** 18n, available: 1_000_000_000n * 10n ** 18n, progress: 0.12, graduated: false, creatorTaxBps: 0, isDemo: true },
  { token: zeroAddress, curve: zeroAddress, deployer: zeroAddress, name: "Galactic Soul", symbol: "GSL", logo: "", artist: "Orion", audio: "", priceEth: 0.08, totalSupply: 1_000_000_000n * 10n ** 18n, available: 820n * 10n ** 18n, progress: 0.66, graduated: false, creatorTaxBps: 0, isDemo: true },
];

const DEMO_TICKS = [
  "NEW LISTING: ECLIPSE BY KORA",
  "COSMIC ECHO PRICE: 0.1 ETH (+2%)",
  "TOP GAINER: GALACTIC SOUL",
];

function mulberry32(a: number) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function fmtEth(p: number) {
  if (p >= 0.01) return p.toFixed(4);
  if (p >= 0.000001) return p.toFixed(6);
  return p.toExponential(2);
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

function Waveform({ playing, seed }: { playing: boolean; seed: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const phase = useRef(0);
  const amps = useRef<number[]>([]);

  const draw = useCallback(() => {
    const cv = ref.current;
    if (!cv) return;
    const dpr = window.devicePixelRatio || 1;
    const w = cv.clientWidth, h = cv.clientHeight;
    if (cv.width !== w * dpr || cv.height !== h * dpr) { cv.width = w * dpr; cv.height = h * dpr; }
    const cx = cv.getContext("2d");
    if (!cx) return;
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx.clearRect(0, 0, w, h);
    cx.strokeStyle = "#fff";
    cx.lineWidth = 1;
    cx.beginPath();
    const mid = h / 2, s = amps.current;
    for (let x = 0, i = 0; x < w && i < s.length; x += 3, i++) {
      const a = s[i];
      const live = playing ? 0.55 + 0.45 * Math.sin(phase.current + i * 0.45 + a * 6) : 1;
      const amp = a * live * h * 0.46;
      cx.moveTo(x + 0.5, mid - amp);
      cx.lineTo(x + 0.5, mid + amp);
    }
    cx.stroke();
  }, [playing]);

  useEffect(() => {
    const w = ref.current?.clientWidth || 1200;
    const rnd = mulberry32(seed);
    const peaks = [0.08, 0.17, 0.26, 0.36, 0.45, 0.5, 0.56, 0.64, 0.74, 0.83, 0.92];
    const n = Math.ceil(w / 3);
    const s: number[] = new Array(n);
    for (let i = 0; i < n; i++) {
      const p = i / n;
      let env = 0.05;
      peaks.forEach((c) => { env += Math.exp(-Math.pow((p - c) * 20, 2)) * (0.4 + rnd() * 0.6); });
      s[i] = Math.min(1, env) * (0.35 + 0.65 * rnd());
    }
    amps.current = s;
    draw();
  }, [seed, draw]);

  useEffect(() => {
    let raf = 0;
    const loop = () => { phase.current += 0.18; draw(); raf = requestAnimationFrame(loop); };
    if (playing) loop(); else draw();
    const onResize = () => draw();
    window.addEventListener("resize", onResize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", onResize); };
  }, [playing, draw]);

  return <canvas ref={ref} className="block w-full" style={{ height: 112 }} aria-hidden="true" />;
}

type LaunchForm = { title: string; artist: string; symbol: string; cover: string; audio: string; tax: string };

export function VplayApp() {
  const [tracks, setTracks] = useState<Track[]>(DEMO_TRACKS);
  const [logs, setLogs] = useState<LaunchLog[]>([]);
  const [live, setLive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [toast, setToast] = useState("");
  const timer = useRef<number | null>(null);

  // modals
  const [buyOpen, setBuyOpen] = useState(false);
  const [launchOpen, setLaunchOpen] = useState(false);
  const [portfolioOpen, setPortfolioOpen] = useState(false);
  const [ethIn, setEthIn] = useState("0.01");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [form, setForm] = useState<LaunchForm>({ title: "", artist: "", symbol: "", cover: "", audio: "", tax: "200" });
  const [coverUp, setCoverUp] = useState(false);
  const coverInput = useRef<HTMLInputElement>(null);
  const [cfg, setCfg] = useState<{ id: bigint; fee: bigint; maxTax: number; can: boolean } | null>(null);
  const [balances, setBalances] = useState<Record<string, bigint>>({});

  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
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
    setLoading(true);
    try {
      const lgs = await discoverLaunches();
      const tks: Track[] = [];
      const paired: LaunchLog[] = [];
      for (const l of lgs) {
        const t = await loadTrack(l);
        if (t) { tks.push(t); paired.push(l); }
        if (tks.length >= 30) break;
      }
      if (tks.length > 0) {
        setTracks(tks);
        setLogs(paired);
        setLive(true);
        setSel(0);
      } else {
        setTracks(DEMO_TRACKS);
        setLogs([]);
        setLive(false);
      }
    } catch {
      say("rpc error — demo data");
    }
    setLoading(false);
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
    if (txSuccess) { say("purchase confirmed onchain ✓"); setBuyOpen(false); setQuote(null); }
  }, [txSuccess, say]);
  useEffect(() => {
    if (launchWait.isSuccess) {
      say("track launched on pons ✓ — indexing…");
      setLaunchOpen(false);
      loadCatalog();
    }
  }, [launchWait.isSuccess, loadCatalog, say]);
  useEffect(() => {
    if (txError) say(`tx error: ${String(txError).slice(0, 140)}`);
  }, [txError, say]);
  useEffect(() => {
    if (launch.error) say(`launch error: ${String(launch.error).slice(0, 140)}`);
  }, [launch.error, say]);

  /* ---------- audio ---------- */
  const playingRef = useRef(false);
  const stepRef = useRef(0);
  const stepTimer = useRef<number | null>(null);
  const actxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
    if (track.audio) {
      if (audioRef.current?.dataset.url !== track.audio) {
        const a = new Audio(track.audio);
        a.loop = true;
        a.dataset.url = track.audio;
        audioRef.current = a;
      }
      audioRef.current.play().catch(() => startSynth());
    } else startSynth();
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
    stepRef.current = 0;
    audioRef.current?.pause();
    audioRef.current = null;
    if (playingRef.current) {
      const t = tracks[n];
      if (t?.audio) {
        const a = new Audio(t.audio);
        a.loop = true;
        a.dataset.url = t.audio;
        audioRef.current = a;
        a.play().catch(() => startSynth());
      } else startSynth();
    }
  };
  useEffect(() => () => { stopSynth(); audioRef.current?.pause(); if (timer.current) window.clearTimeout(timer.current); }, []);

  /* ---------- wallet ---------- */
  const connectWallet = () => {
    const c = connectors[0];
    if (c) connect({ connector: c });
    else say("no injected wallet found");
  };
  const onWallet = () => {
    if (isConnected) { disconnect(); say("wallet disconnected"); return; }
    connectWallet();
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
    if (!quote || !address) return;
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

  const uploadCover = async (f: File) => {
    if (f.size > 4 * 1024 * 1024) { say("cover: max 4MB"); return; }
    setCoverUp(true);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const r = await fetch("/api/upload", { method: "POST", body: fd });
      const j = (await r.json()) as { url?: string; error?: string };
      if (!r.ok || !j.url) throw new Error(j.error || "upload failed");
      const url: string = j.url;
      setForm((p) => ({ ...p, cover: url }));
      say("cover uploaded");
    } catch (e) {
      say(`cover upload failed: ${String((e as Error).message).slice(0, 90)}`);
    } finally {
      setCoverUp(false);
    }
  };

  const doLaunch = async () => {
    if (!isConnected || !address || !publicClient) { connectWallet(); return; }
    if (!form.title.trim() || !form.artist.trim()) { say("title and artist are required"); return; }
    if (!cfg || !cfg.can) { say("launching is closed for this wallet"); return; }
    try {
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
            logo: form.cover.trim(),
            description: buildDescription(form.artist.trim(), form.audio.trim()),
            socials: VPLAY_SOCIALS,
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
      say(`launch failed: ${String(e).slice(0, 140)}`);
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

  /* ---------- ticker ---------- */
  const tickItems: { text: string; green?: boolean }[] = live
    ? tracks.slice(0, 8).map((t) => ({
        text: t.graduated
          ? `${t.name.toUpperCase()} BY ${t.artist.toUpperCase()} — GRADUATED · ${fmtEth(t.priceEth)} ETH`
          : `${t.name.toUpperCase()} BY ${t.artist.toUpperCase()} — ${(t.progress * 100).toFixed(0)}% TO POOL · ${fmtEth(t.priceEth)} ETH`,
      }))
    : DEMO_TICKS.map((text) => ({ text }));

  const ctrl = "flex items-center justify-center w-9 h-8 border border-neutral-600 text-white hover:bg-white hover:text-black transition-colors focus:outline-none";

  return (
    <div className="flex flex-col w-full bg-black text-white" style={{ minHeight: "100vh", background: "#000", fontFamily: "Helvetica Neue, Arial, sans-serif" }}>
      <style>{`@keyframes vp-slide{to{transform:translateX(-50%)}}
        @media (prefers-reduced-motion:reduce){.vp-track{animation:none!important}}`}</style>

      {/* Header */}
      <header className="grid items-center px-6 border-b border-neutral-800" style={{ height: 64, gridTemplateColumns: "1fr auto 1fr", columnGap: 32 }}>
        <div className="bg-white" style={{ height: 1, width: "100%" }} />
        <div className="text-white text-center" style={{ letterSpacing: "0.5em", fontWeight: 300, fontSize: 18, paddingLeft: "0.5em" }}>
          VURAFY
        </div>
        <nav className="flex items-center gap-5 text-sm uppercase tracking-wider justify-self-end">
          <button className="uppercase hover:underline" style={{ ...MONO, background: "none", border: "none", color: "inherit", fontSize: 14, cursor: "pointer" }} onClick={() => loadCatalog()}>
            Discover
          </button>
          <button className="uppercase hover:underline" style={{ ...MONO, background: "none", border: "none", color: "inherit", fontSize: 14, cursor: "pointer" }} onClick={() => setLaunchOpen(true)}>
            Launchpad
          </button>
          <button className="uppercase hover:underline" style={{ ...MONO, background: "none", border: "none", color: "inherit", fontSize: 14, cursor: "pointer" }} onClick={openPortfolio}>
            My Portfolio
          </button>
          <button
            onClick={onWallet}
            className="border border-white px-3 py-2 uppercase tracking-wider hover:bg-white hover:text-black transition-colors"
            style={{ ...MONO, fontSize: 12, cursor: "pointer", background: "none", color: "inherit" }}
          >
            {isPending || txPending || txMining || launchWait.isLoading ? "Pending…" : isConnected && address ? `${address.slice(0, 6)}…${address.slice(-4)} ×` : "Connect Wallet"}
          </button>
        </nav>
      </header>

      {/* Hero */}
      <main className="relative flex flex-col flex-1 items-center justify-center overflow-hidden px-6 py-8" style={{ minHeight: 340 }}>
        <div className="relative flex items-center justify-center w-full">
          <svg viewBox="0 0 320 330" className="absolute" style={{ width: 340, left: "50%", top: "50%", transform: "translate(-50%, -50%)", pointerEvents: "none" }} fill="none" stroke="#fff" strokeWidth="5" aria-hidden="true">
            <path d="M10 0 L160 300 L310 0 L270 0 L160 220 L50 0 Z" />
            <path d="M70 0 L160 180 L250 0 L210 0 L160 100 L110 0 Z" />
          </svg>

          <div className="relative flex flex-row items-stretch gap-4" style={{ flexWrap: "nowrap", width: "100%", maxWidth: 760, minWidth: 0, zIndex: 1 }}>
          {/* cover */}
          <div className="flex flex-col items-center justify-center gap-3 border border-neutral-700 overflow-hidden" style={{ background: "#0a0a0a", flex: "0 0 24%", position: "relative" }}>
            {track.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={track.logo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0 }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
            ) : (
              <Logo className="w-16" />
            )}
            <span className="text-xs text-neutral-400 tracking-wider absolute" style={{ ...MONO, bottom: 10, zIndex: 2, textShadow: "0 0 6px #000" }}>{track.symbol}</span>
          </div>

          {/* info */}
          <div className="border border-neutral-700 p-5 relative" style={{ background: "#0a0a0a", flex: "1 1 0", minWidth: 0 }}>
            <p className="uppercase tracking-wider m-0 mb-1" style={{ fontSize: 15 }}>
              <span className="text-neutral-400">Track:</span> <b style={{ fontWeight: 700 }}>{track.name}</b>
            </p>
            <p className="uppercase tracking-wider m-0 mb-1 flex items-baseline gap-2">
              <span className="text-neutral-400" style={{ fontSize: 15 }}>Artist:</span>
              <span style={{ fontSize: 26, lineHeight: 1.1, fontWeight: 800 }}>{track.artist}</span>
            </p>
            <p className="uppercase tracking-wider m-0" style={{ fontSize: 15 }}>
              <span className="text-neutral-400">Token:</span> <b style={{ fontWeight: 700 }}>{track.symbol}</b>
              {!isDemo && (
                <a href={`${EXPLORER}/address/${track.token}`} target="_blank" rel="noopener" className="ml-3" style={{ color: "#ffffff", fontSize: 12, textDecoration: "underline" }}>
                  {track.token.slice(0, 6)}…{track.token.slice(-4)} ↗
                </a>
              )}
            </p>
            <div className="flex justify-between gap-3 mt-4 pt-3 border-t border-neutral-700 uppercase text-neutral-400" style={{ fontSize: 11, letterSpacing: "0.04em" }}>
              <div>Total shares:<div className="text-white" style={{ fontSize: 17 }}>{fmtBig(track.totalSupply)}</div></div>
              <div>Price per share:<div className="text-white" style={{ fontSize: 17 }}>{isDemo ? `${track.priceEth} ETH` : `${fmtEth(track.priceEth)} ETH`}</div></div>
              <div>Available:<div className="text-white" style={{ fontSize: 17 }}>{fmtTokens(track.available)}</div></div>
            </div>
            <div className="mt-3 uppercase" style={{ fontSize: 10.5, letterSpacing: "0.14em", color: track.graduated ? "#ffffff" : "#8a8a8a" }}>
              {isDemo ? "demo data — launch a real track" : track.graduated ? "✓ graduated — trading in v4 pool" : `${(track.progress * 100).toFixed(1)}% → graduation (4.2 eth)`}
              {!isDemo && !track.graduated && (
                <div style={{ height: 3, background: "#222", marginTop: 5 }}>
                  <div style={{ height: 3, width: `${Math.min(100, track.progress * 100)}%`, background: "#ffffff" }} />
                </div>
              )}
            </div>
          </div>

          {/* actions */}
          <div className="flex flex-col justify-center gap-3 border border-neutral-700 p-4" style={{ background: "#0a0a0a", flex: "0 0 25%", minWidth: 0 }}>
            <button onClick={openBuy} className="w-full bg-white text-black uppercase tracking-wider py-3 hover:bg-neutral-200 active:scale-95 transition" style={{ fontSize: 12, fontWeight: 700, cursor: "pointer", border: "none" }}>
              {track.graduated && !isDemo ? "Trade on pons ↗" : "Purchase Shares"}
            </button>
            <button
              onClick={() => {
                if (!isDemo) window.open(`${EXPLORER}/address/${track.token}`, "_blank");
                else say("appears after launch");
              }}
              className="w-full border border-white uppercase tracking-wider py-3 px-2 hover:bg-white hover:text-black transition-colors"
              style={{ fontSize: 12, cursor: "pointer", background: "none", color: "inherit" }}
            >
              View Track on Robinhood Chain
            </button>
            <button onClick={() => setLaunchOpen(true)} className="w-full border border-neutral-600 uppercase tracking-wider py-2 hover:border-white transition-colors" style={{ fontSize: 11, cursor: "pointer", background: "none", color: "#8a8a8a" }}>
              + Launch your track
            </button>
          </div>
          </div>
        </div>

        <svg viewBox="0 0 74 52" style={{ width: 64, marginTop: 40, flex: "none" }} fill="none" stroke="#fff" strokeWidth="5" aria-hidden="true">
          <path d="M4 4 L37 47 L70 4" />
        </svg>
      </main>

      {/* Ticker */}
      <div className="w-full overflow-hidden border-t border-b border-neutral-700 uppercase whitespace-nowrap py-3" style={{ ...MONO, fontSize: 13 }}>
        <div className="vp-track inline-block" style={{ animation: "vp-slide 40s linear infinite" }}>
          {[0, 1, 2, 3].map((n) => (
            <span key={n}>
              {tickItems.map((t, i) => (
                <span key={`${n}-${i}`}>
                  <span className="mx-4 text-neutral-500">/</span>
                  <span style={t.green ? { color: GREEN } : undefined}>
                    {t.text.includes("(+2%)")
                      ? <>{t.text.replace(" (+2%)", " ")}<span style={{ color: GREEN }}>(+2%)</span></>
                      : t.text}
                  </span>
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* Player */}
      <Waveform playing={playing} seed={track.name.length * 977 + track.artist.length * 131 + 41} />
      <footer className="grid items-center gap-4 px-6 pb-5 pt-3 uppercase tracking-wider text-neutral-400" style={{ ...MONO, fontSize: 11, gridTemplateColumns: "1fr auto 1fr" }}>
        <div className="flex items-center gap-2 text-white">
          <button className={ctrl} onClick={() => { if (!playing) play(); }} aria-label="Play">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M5 3l15 9-15 9z" /></svg>
          </button>
          <button className={ctrl} onClick={() => { if (playing) pause(); }} aria-label="Pause">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M5 3h5v18H5zM14 3h5v18h-5z" /></svg>
          </button>
          <button className={ctrl} onClick={() => switchTrack(sel - 1)} aria-label="Previous">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M5 3h3v18H5zM21 3v18L9 12z" /></svg>
          </button>
          <button className={ctrl} onClick={() => switchTrack(sel + 1)} aria-label="Next">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M16 3h3v18h-3zM3 3l12 9L3 21z" /></svg>
          </button>
          <span className="ml-3" style={{ fontSize: 13, letterSpacing: "0.22em" }}>{playing ? "Pause" : "Play"}</span>
        </div>
        <div className="text-center">VURAFY // Track Tokenization Protocol // Robinhood Chain</div>
        <div className="text-right">24-bit // 48kHz // {track.name}</div>
      </footer>

      {/* ===== BUY MODAL ===== */}
      {buyOpen && (
        <div className="fixed inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,.8)", zIndex: 60 }} onClick={() => { setBuyOpen(false); setQuote(null); }}>
          <div className="border border-white p-6" style={{ background: "#0a0a0a", width: 460, maxWidth: "calc(100vw - 40px)" }} onClick={(e) => e.stopPropagation()}>
            <div className="uppercase text-neutral-400" style={{ ...MONO, fontSize: 12, letterSpacing: "0.2em" }}>Purchase shares // curve buy</div>
            <div className="uppercase" style={{ fontSize: 22, fontWeight: 800, marginBottom: 16 }}>{track.name} — {track.artist}</div>

            <div className="uppercase text-neutral-400 mb-1" style={{ ...MONO, fontSize: 11 }}>You pay (ETH)</div>
            <div className="flex gap-2 mb-3">
              <input
                value={ethIn}
                onChange={(e) => setEthIn(e.target.value.replace(/[^0-9.]/g, ""))}
                className="flex-1 bg-black text-white border border-neutral-700 px-3 py-2"
                style={{ ...MONO, fontSize: 16 }}
                inputMode="decimal"
              />
              {["0.01", "0.05", "0.1"].map((q) => (
                <button key={q} className="border border-neutral-700 px-3 hover:bg-white hover:text-black transition-colors uppercase" style={{ ...MONO, fontSize: 11, cursor: "pointer", background: "none", color: "inherit" }} onClick={() => setEthIn(q)}>{q}</button>
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
              <button className="flex-1 border border-white py-3 uppercase hover:bg-white hover:text-black transition-colors" style={{ ...MONO, fontSize: 12, cursor: "pointer", background: "none", color: "inherit" }} onClick={() => { setBuyOpen(false); setQuote(null); }}>Cancel</button>
              <button className="flex-1 bg-white text-black py-3 uppercase hover:bg-neutral-200 transition-colors disabled:opacity-50" style={{ ...MONO, fontSize: 12, fontWeight: 700, cursor: "pointer", border: "none" }} disabled={!quote || quoting || txPending || txMining} onClick={doBuy}>
                {!isConnected ? "Connect Wallet" : txPending || txMining ? "Confirming…" : "Confirm Purchase"}
              </button>
            </div>
            <div className="uppercase text-neutral-500 mt-3 text-center" style={{ ...MONO, fontSize: 10 }}>
              pons v2 curve · trade settles onchain · robinhood chain
            </div>
          </div>
        </div>
      )}

      {/* ===== LAUNCH MODAL ===== */}
      {launchOpen && (
        <div className="fixed inset-0 flex items-center justify-center overflow-y-auto" style={{ background: "rgba(0,0,0,.8)", zIndex: 60 }} onClick={() => setLaunchOpen(false)}>
          <div className="border border-white p-6" style={{ background: "#0a0a0a", width: 480, maxWidth: "calc(100vw - 40px)", margin: "30px 0" }} onClick={(e) => e.stopPropagation()}>
            <div className="uppercase text-neutral-400" style={{ ...MONO, fontSize: 12, letterSpacing: "0.2em" }}>Launchpad // track = token</div>
            <div className="uppercase" style={{ fontSize: 22, fontWeight: 800, marginBottom: 16 }}>Launch your track</div>

            {([["title", "Track title", "Cosmic Echo"], ["artist", "Artist name", "Vura"], ["symbol", `Symbol (auto: ${autoSymbol})`, ""]] as const).map(([key, label, ph]) => (
              <div key={key} className="mb-3">
                <div className="uppercase text-neutral-400 mb-1" style={{ ...MONO, fontSize: 11 }}>{label}</div>
                <input
                  value={form[key]}
                  placeholder={ph}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  className="w-full bg-black text-white border border-neutral-700 px-3 py-2"
                  style={{ ...MONO, fontSize: 13 }}
                />
              </div>
            ))}
            <div className="mb-3">
              <div className="uppercase text-neutral-400 mb-1" style={{ ...MONO, fontSize: 11 }}>Cover — URL (ipfs/http) или файл</div>
              <div className="flex gap-2">
                <input
                  value={form.cover}
                  placeholder="https://.../cover.png"
                  onChange={(e) => setForm((f) => ({ ...f, cover: e.target.value }))}
                  className="flex-1 min-w-0 bg-black text-white border border-neutral-700 px-3 py-2"
                  style={{ ...MONO, fontSize: 13 }}
                />
                <button
                  className="border border-neutral-600 px-3 uppercase hover:border-white transition-colors"
                  style={{ ...MONO, fontSize: 11, cursor: "pointer", background: "none", color: "#8a8a8a" }}
                  disabled={coverUp}
                  onClick={() => coverInput.current?.click()}
                >
                  {coverUp ? "..." : "Upload"}
                </button>
              </div>
              <input
                ref={coverInput}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadCover(f);
                  e.target.value = "";
                }}
              />
              {form.cover && (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={form.cover} src={form.cover} alt="cover preview" style={{ width: 72, height: 72, objectFit: "cover", marginTop: 8, border: "1px solid #404040" }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "0.25"; }} />
              )}
            </div>
            <div className="mb-3">
              <div className="uppercase text-neutral-400 mb-1" style={{ ...MONO, fontSize: 11 }}>Audio URL (ipfs/http)</div>
              <input
                value={form.audio}
                placeholder="https://.../track.mp3"
                onChange={(e) => setForm((f) => ({ ...f, audio: e.target.value }))}
                className="w-full bg-black text-white border border-neutral-700 px-3 py-2"
                style={{ ...MONO, fontSize: 13 }}
              />
            </div>
            <div className="mb-3">
              <div className="uppercase text-neutral-400 mb-1" style={{ ...MONO, fontSize: 11 }}>Creator tax on trades, bps (max {cfg ? cfg.maxTax / 100 : "—"}%) — автор получает % с каждой сделки</div>
              <input
                value={form.tax}
                onChange={(e) => setForm((f) => ({ ...f, tax: e.target.value.replace(/[^0-9]/g, "") }))}
                className="w-full bg-black text-white border border-neutral-700 px-3 py-2"
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
              <button className="flex-1 border border-white py-3 uppercase hover:bg-white hover:text-black transition-colors" style={{ ...MONO, fontSize: 12, cursor: "pointer", background: "none", color: "inherit" }} onClick={() => setLaunchOpen(false)}>Cancel</button>
              <button className="flex-1 bg-white text-black py-3 uppercase hover:bg-neutral-200 transition-colors disabled:opacity-50" style={{ ...MONO, fontSize: 12, fontWeight: 700, cursor: "pointer", border: "none" }} disabled={!isConnected || launch.isPending || launchWait.isLoading || !cfg} onClick={doLaunch}>
                {!isConnected ? "Connect Wallet" : launch.isPending || launchWait.isLoading ? "Launching…" : `Launch (${cfg ? formatEther(cfg.fee) : "…"} ETH)`}
              </button>
            </div>
            <div className="uppercase text-neutral-500 mt-3 text-center" style={{ ...MONO, fontSize: 10 }}>
              description format: vurafy | artist | audio: url — так каталог находит треки
            </div>
          </div>
        </div>
      )}

      {/* ===== PORTFOLIO MODAL ===== */}
      {portfolioOpen && (
        <div className="fixed inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,.8)", zIndex: 60 }} onClick={() => setPortfolioOpen(false)}>
          <div className="border border-white p-6" style={{ background: "#0a0a0a", width: 520, maxWidth: "calc(100vw - 40px)" }} onClick={(e) => e.stopPropagation()}>
            <div className="uppercase text-neutral-400" style={{ ...MONO, fontSize: 12, letterSpacing: "0.2em" }}>My portfolio // track shares</div>
            <div className="uppercase" style={{ fontSize: 22, fontWeight: 800, margin: "6px 0 14px" }}>
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
              <button className="flex-1 border border-white py-3 uppercase hover:bg-white hover:text-black transition-colors" style={{ ...MONO, fontSize: 12, cursor: "pointer", background: "none", color: "inherit" }} onClick={() => setPortfolioOpen(false)}>Close</button>
              <button className="flex-1 bg-white text-black py-3 uppercase hover:bg-neutral-200 transition-colors" style={{ ...MONO, fontSize: 12, fontWeight: 700, cursor: "pointer", border: "none" }} onClick={() => { setPortfolioOpen(false); setLaunchOpen(true); }}>+ Launch track</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      <div
        role="status"
        className="fixed bg-white text-black px-4 py-2 uppercase transition-opacity"
        style={{ ...MONO, fontSize: 11, letterSpacing: "0.08em", left: "50%", bottom: 24, transform: "translateX(-50%)", opacity: toast ? 1 : 0, pointerEvents: "none", zIndex: 70, maxWidth: "90vw", textAlign: "center" }}
      >
        {toast}
      </div>

      {loading && (
        <div className="fixed uppercase" style={{ ...MONO, fontSize: 10, top: 70, left: 24, color: "#888888", letterSpacing: "0.2em", zIndex: 5 }}>
          indexing pons factory…
        </div>
      )}
    </div>
  );
}
