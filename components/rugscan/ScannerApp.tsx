"use client";

// ============================================================================
// ScannerApp — main flow: input → terminal scan animation → diagnosis → share
// ============================================================================
import { useCallback, useEffect, useRef, useState } from "react";
import { useAccount } from "wagmi";
import { toPng } from "html-to-image";
import { Radar, Download, Share2, Loader2 } from "lucide-react";
import { buildScanResult } from "@/lib/rugscan/score";
import { buildShareText, downloadCard, openXShare } from "@/lib/rugscan/share";
import { ALL_CHAINS, NETWORKS, networkById } from "@/lib/rugscan/networks";
import type { ScanResult, TokenRisk } from "@/lib/rugscan/types";
import { ConnectWallet } from "./ConnectWallet";
import { CreditPanel } from "./CreditPanel";
import { DiagnosisPanel } from "./DiagnosisPanel";
import { ShareCard } from "./ShareCard";
import { TreatmentProtocol } from "./TreatmentProtocol";
import { SiteNav } from "@/components/layout/SiteNav";

type Phase = "idle" | "scanning" | "done";

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

interface ScanApiResponse {
  address?: string;
  chain?: string;
  total?: number;
  returned?: number;
  chainsScanned?: number;
  chainsFailed?: number;
  tokens?: TokenRisk[];
  error?: string;
}

/** Terminal lines streamed while the Alchemy request runs (for the Matrix vibe). */
const buildLogLines = (addr: string, target: string): string[] => [
  "> INITIALIZING VURA RUG SCANNER v1.0",
  `> HANDSHAKE WITH ALCHEMY ENHANCED API // ${target}... OK`,
  `> TARGET LOCKED: ${addr.slice(0, 10)}…${addr.slice(-6)}`,
  "> alchemy_getTokenBalances [method=erc20]...",
  "> FILTERING ZERO BALANCES...",
  "> alchemy_getTokenMetadata x15...",
  "> CALCULATING DEGRADATION SCORE...",
  "> DIAGNOSIS READY_",
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function ScannerApp() {
  const { address: walletAddress } = useAccount();

  const [address, setAddress] = useState("");
  const [chain, setChain] = useState<string>(ALL_CHAINS);
  const [phase, setPhase] = useState<Phase>("idle");
  const [log, setLog] = useState<string[]>([]);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const runIdRef = useRef(0);

  // Fill the input automatically after connecting a wallet
  useEffect(() => {
    if (walletAddress) setAddress(walletAddress);
  }, [walletAddress]);

  // Keep terminal log scrolled to the bottom
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [log]);

  const scan = useCallback(async () => {
    const addr = address.trim();
    if (!ADDRESS_RE.test(addr)) {
      setError("INVALID ADDRESS — expecting 0x + 40 hex chars, operator.");
      return;
    }
    setError(null);
    setResult(null);
    setPhase("scanning");
    setLog([]);

    const runId = ++runIdRef.current;
    const target =
      chain === ALL_CHAINS
        ? `ALL NETWORKS (${NETWORKS.length})`
        : networkById(chain)?.host ?? chain;

    // Stream the terminal log…
    const logPromise = (async () => {
      const lines = buildLogLines(addr, target);
      for (let i = 0; i < lines.length; i++) {
        if (runIdRef.current !== runId) return;
        setLog((prev) => [...prev, lines[i]]);
        await sleep(230 + Math.random() * 220);
      }
    })();

    // …while the real portfolio fetch runs in parallel (Alchemy via /api/scan)
    const tokensPromise = (async (): Promise<TokenRisk[]> => {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: addr, chain }),
      });
      const data = (await res.json().catch(() => null)) as ScanApiResponse | null;
      if (!res.ok || !data?.tokens) {
        throw new Error(data?.error || `scan request failed (HTTP ${res.status})`);
      }
      const extra: string[] = [];
      if (typeof data.total === "number") {
        extra.push(`> NON-ZERO TOKENS: ${data.total} // DETAILED: ${data.tokens!.length}`);
      }
      if (typeof data.chainsScanned === "number") {
        extra.push(
          `> CHAINS OK: ${data.chainsScanned} // SKIPPED: ${data.chainsFailed ?? 0}`
        );
      }
      if (extra.length) setLog((prev) => [...prev, ...extra]);
      return data.tokens;
    })();

    try {
      const tokens = await Promise.all([tokensPromise, logPromise]).then(
        ([t]) => t
      );
      if (runIdRef.current !== runId) return;
      setResult(buildScanResult(addr, tokens));
      setPhase("done");
    } catch (err) {
      if (runIdRef.current !== runId) return;
      const msg = err instanceof Error ? err.message : "unknown error";
      setLog((prev) => [...prev, `> [ERR] ${msg.toUpperCase()}`]);
      setError(msg);
      setPhase("done");
    }
  }, [address, chain]);

  /** Render the share card to a PNG data URL. */
  const renderCard = useCallback(async (): Promise<string> => {
    if (!result || !cardRef.current) throw new Error("card is not ready");
    return toPng(cardRef.current, {
      pixelRatio: 2,
      backgroundColor: "#0a0a0a",
      cacheBust: true,
    });
  }, [result]);

  /** X share: render PNG → drop it next to the tab → open the composer. */
  const handleShare = useCallback(async () => {
    if (!result || sharing) return;
    setSharing(true);
    try {
      const pngDataUrl = await renderCard();
      // X web-intent cannot attach media programmatically → we open the tweet
      // with text+link and download the PNG next to it for drag & drop.
      downloadCard(pngDataUrl, result.address);
      openXShare(buildShareText(result));
    } catch (err) {
      console.error("Card generation failed", err);
      setError("CARD RENDER FAILED — screenshot manually, pleb.");
    } finally {
      setSharing(false);
    }
  }, [result, sharing, renderCard]);

  /** Plain PNG download — no X tab. */
  const handleDownload = useCallback(async () => {
    if (!result || sharing) return;
    setSharing(true);
    try {
      const pngDataUrl = await renderCard();
      downloadCard(pngDataUrl, result.address);
    } catch (err) {
      console.error("Card generation failed", err);
      setError("CARD RENDER FAILED — screenshot manually, pleb.");
    } finally {
      setSharing(false);
    }
  }, [result, sharing, renderCard]);

  return (    <div className="min-h-screen text-white">
      {/* site nav — so the standalone scanner can navigate back */}
      <SiteNav active="scanner" />

      {/* ── Hero / input ─────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 pt-14 pb-8">
        <div className="text-center mb-10">
          <a
            href="/"
            className="font-mono text-xs uppercase tracking-[0.4em] text-[#00ff66] mb-4 inline-block hover:text-white transition-colors"
          >
            ◄ VURA Terminal Suite
          </a>
          <h1 className="font-mono font-bold text-4xl sm:text-5xl uppercase tracking-tight mb-3">
            Rug <span className="text-[#00ff66]" style={{ textShadow: "0 0 20px #00ff6688" }}>Scanner</span>
          </h1>
          <p className="text-zinc-500 font-mono text-sm max-w-xl mx-auto">
            Point it at any wallet. Get a brutally honest{" "}
            <span className="text-[#ff7700]">Degradation Score</span> for its ERC20 portfolio.
          </p>
        </div>

        {/* Input row */}
        <div className="flex flex-col sm:flex-row gap-3 max-w-3xl mx-auto">
          <div className="flex-1 relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-mono text-[#00ff66] text-sm select-none">
              &gt;
            </span>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && phase !== "scanning" && scan()}
              placeholder="0xdeadbeef… wallet address"
              spellCheck={false}
              disabled={phase === "scanning"}
              className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg pl-8 pr-4 py-3.5
                         font-mono text-sm text-zinc-200 placeholder:text-zinc-700
                         focus:outline-none focus:border-[#00ff66]/60 focus:shadow-[0_0_20px_#00ff6622]
                         transition-colors disabled:opacity-60"
            />
          </div>

          {/* Network selector */}
          <select
            value={chain}
            onChange={(e) => setChain(e.target.value)}
            disabled={phase === "scanning"}
            aria-label="Network"
            className="shrink-0 rounded-lg border border-[#2a2a2a] bg-[#111] px-3.5 py-3.5
                       font-mono text-xs font-bold uppercase tracking-widest text-zinc-300
                       focus:outline-none focus:border-[#00ff66]/60 focus:shadow-[0_0_20px_#00ff6622]
                       hover:border-[#00ff66]/40 transition-colors disabled:opacity-60 cursor-pointer"
          >
            <option value={ALL_CHAINS}>
              ALL CHAINS ({NETWORKS.length})
            </option>
            {NETWORKS.map((n) => (
              <option key={n.id} value={n.id} title={n.host}>
                {n.label}
              </option>
            ))}
          </select>

          <button
            onClick={scan}
            disabled={phase === "scanning"}
            className="flex items-center justify-center gap-2 font-mono text-sm font-bold uppercase tracking-wider
                       px-6 py-3.5 rounded-lg bg-[#00ff66] text-black
                       hover:shadow-[0_0_28px_#00ff6688] active:translate-y-px
                       transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {phase === "scanning" ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Scanning…</>
            ) : (
              <><Radar className="w-4 h-4" /> Scan Portfolio</>
            )}
          </button>
          <ConnectWallet />
        </div>

        {error && (
          <p className="font-mono text-xs text-[#ff3300] text-center mt-4 animate-fade-in">
            [ERR] {error}
          </p>
        )}
      </section>

      {/* ── Terminal log ─────────────────────────────────────────────── */}
      {phase !== "idle" && (
        <section className="max-w-5xl mx-auto px-4 pb-8">
          <div className="rounded-lg border border-[#00ff66]/30 bg-black overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2 border-b border-[#00ff66]/20 bg-[#00ff66]/5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00ff66] animate-pulse" />
              <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-[#00ff66]">
                scan.log
              </span>
            </div>
            <div ref={logRef} className="p-4 h-44 overflow-y-auto font-mono text-[13px] leading-relaxed">
              {log.map((line, i) => (
                <div
                  key={i}
                  className={line.includes("DIAGNOSIS") ? "text-[#ff7700]" : "text-[#00ff66]/80"}
                >
                  {line}
                </div>
              ))}
              {phase === "scanning" && <span className="inline-block w-2 h-4 bg-[#00ff66] animate-pulse" />}
            </div>
          </div>
        </section>
      )}

      {/* ── Results ──────────────────────────────────────────────────── */}
      {phase === "done" && result && (
        <section className="max-w-5xl mx-auto px-4 pb-20 space-y-8">
          <div className="grid lg:grid-cols-[1fr_660px] gap-8 items-start">
            <DiagnosisPanel result={result} />

            {/* Share card + actions */}
            <div className="space-y-4 lg:sticky lg:top-20">
              <ShareCard ref={cardRef} result={result} />
              <div className="flex gap-3">
                <button
                  onClick={handleShare}
                  disabled={sharing}
                  className="flex-1 flex items-center justify-center gap-2 font-mono text-sm font-bold uppercase tracking-wider
                             px-5 py-3.5 rounded-lg bg-[#ff7700] text-black
                             hover:shadow-[0_0_28px_#ff770088] active:translate-y-px
                             transition-all disabled:opacity-50"
                >
                  {sharing ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Rendering…</>
                  ) : (
                    <><Share2 className="w-4 h-4" /> Share My Disgrace on X</>
                  )}
                </button>
                <button
                  onClick={handleDownload}
                  disabled={sharing}
                  title="Download the card as PNG"
                  className="p-3.5 rounded-lg border border-[#2a2a2a] text-zinc-400
                             hover:text-[#00ff66] hover:border-[#00ff66]/50 transition-colors"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
              <p className="font-mono text-[11px] text-zinc-600 leading-relaxed">
                * The PNG downloads automatically — drag it into the X composer.
                (X web-intent doesn&apos;t allow attaching media via URL.)
              </p>
            </div>
          </div>

          {/* Wallet credit record — free priors.trade check */}
          <CreditPanel address={result.address} />

          {/* Treatment Protocol — shown when the score is bad enough */}
          {result.score >= 4 && <TreatmentProtocol />}
        </section>
      )}
    </div>
  );
}
