"use client";

// ============================================================================
// VuraPad — source research → native launch → market feeds.
// Wears the vura.ink chrome (nav / ticker / footer) so it reads as part of
// the site; interior follows the home design language (dark + green accent).
// ============================================================================

import { useState } from "react";
import { DiscoverPanel, type RepoSource } from "./DiscoverPanel";
import { LaunchPanel } from "./LaunchPanel";
import { TokensPanel } from "./TokensPanel";
import { MarketsPanel } from "./MarketsPanel";
import { SiteNav } from "@/components/layout/SiteNav";

type Tab = "launch" | "tokens" | "markets";

const TABS: { id: Tab; label: string }[] = [
  { id: "launch", label: "01 Launch" },
  { id: "tokens", label: "02 Tokens" },
  { id: "markets", label: "03 Markets" },
];

export function VuraPadApp() {
  const [tab, setTab] = useState<Tab>("launch");
  const [source, setSource] = useState<RepoSource | null>(null);
  const [discoverOpen, setDiscoverOpen] = useState(false);

  function adoptSource(repo: RepoSource) {
    setSource(repo);
    setDiscoverOpen(false);
  }

  return (
    <div className="relative min-h-screen font-sans text-white selection:bg-[#00ff66] selection:text-[#06110a]">
      {/* keyframes + CRT scrollbars (same language as home) */}
      <style>{`
        @keyframes vp-ticker { 100% { transform: translateX(-100%); } }
        @keyframes vp-blink { 50% { opacity: 0; } }
        .vp-ticker-track { display: inline-block; padding-left: 100%; animation: vp-ticker 34s linear infinite; }
        .vp-ticker:hover .vp-ticker-track { animation-play-state: paused; }
        .vp-blink { animation: vp-blink 1.1s step-end infinite; }
        ::-webkit-scrollbar { width: 10px; height: 10px; }
        ::-webkit-scrollbar-track { background: #0a0a0a; }
        ::-webkit-scrollbar-thumb { background: #00ff66; border: 2px solid #0a0a0a; }
        ::-webkit-scrollbar-thumb:hover { background: #33ff88; }
      `}</style>

      {/* dust starfield */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage:
            "radial-gradient(1.5px 1.5px at 18% 24%, rgba(0,255,102,0.30), transparent), " +
            "radial-gradient(1px 1px at 64% 58%, rgba(255,255,255,0.14), transparent), " +
            "radial-gradient(1.5px 1.5px at 42% 82%, rgba(0,255,102,0.18), transparent), " +
            "radial-gradient(1px 1px at 86% 16%, rgba(255,255,255,0.10), transparent)",
          backgroundSize: "640px 640px, 460px 460px, 820px 820px, 380px 380px",
        }}
      />

      <div className="relative z-10 flex min-h-screen flex-col">
        {/* ===== SITE NAV (shared with scanner) ===== */}
        <SiteNav active="vurapad" />

        {/* ===== TICKER (as home) ===== */}
        <div className="vp-ticker relative z-40 overflow-hidden border-b border-[#2a2a2a] bg-[#111] py-1.5 font-mono text-[11px] tracking-[2px] text-[#00ff66]">
          <div className="vp-ticker-track whitespace-nowrap">
            <b>■ VURAPAD</b>
            <span className="mx-[18px] text-[#8a8a8a]">SOURCE → LAUNCH → MARKETS</span>
            <span className="mx-[18px] text-[#8a8a8a]">NATIVE PONS V2 LAUNCHES</span>
            <span className="mx-[18px] text-[#8a8a8a]">ROBINHOOD CHAIN // 4663</span>
            <span className="mx-[18px] text-[#8a8a8a]">LIQ LOCKED FOREVER</span>
            <span className="mx-[18px] text-[#8a8a8a]">GITHUB → BRIEF → ONCHAIN</span>
            <b>■ VURAPAD</b>
            <span className="mx-[18px] text-[#8a8a8a]">SOURCE → LAUNCH → MARKETS</span>
            <span className="mx-[18px] text-[#8a8a8a]">NATIVE PONS V2 LAUNCHES</span>
            <span className="mx-[18px] text-[#8a8a8a]">ROBINHOOD CHAIN // 4663</span>
            <span className="mx-[18px] text-[#8a8a8a]">LIQ LOCKED FOREVER</span>
            <span className="mx-[18px] text-[#8a8a8a]">GITHUB → BRIEF → ONCHAIN</span>
          </div>
        </div>

        {/* ===== PAGE ===== */}
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-7 pb-16 pt-8">
          {/* hero */}
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <h1 className="font-mono text-[clamp(28px,4vw,40px)] font-bold uppercase leading-none tracking-[4px] [text-shadow:0_0_24px_rgba(0,255,102,0.3)]">
                VuraPad
              </h1>
              <p className="mt-2.5 max-w-xl text-[15px] leading-relaxed text-[#8a8a8a]">
                Source research → native launch → market feeds. Every step is
                your wallet signing onchain — pons never custodies funds.
              </p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <span className="inline-flex items-center gap-2 rounded-lg border border-[#00ff66] bg-[#00ff66]/10 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[1px] text-[#00ff66]">
                <span className="vp-blink">●</span> Robinhood Chain (4663)
              </span>
              <span className="rounded-lg border border-[#2a2a2a] bg-[#161616] px-3 py-1.5 font-mono text-[11px] uppercase tracking-[1px] text-[#8a8a8a]">
                Pons V2 Factory
              </span>
              <span className="rounded-lg border border-[#2a2a2a] bg-[#161616] px-3 py-1.5 font-mono text-[11px] uppercase tracking-[1px] text-[#8a8a8a]">
                Launch Fee 0.0005 ETH
              </span>
            </div>
          </div>

          {/* tabs */}
          <div className="mt-7 inline-flex gap-1 rounded-lg border border-[#2a2a2a] bg-[#111] p-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`rounded-[7px] px-5 py-2.5 text-[13px] font-semibold uppercase tracking-[1.5px] transition-colors ${
                  tab === t.id
                    ? "bg-[#161616] text-white shadow-[inset_0_0_0_1px_#2a2a2a]"
                    : "text-[#8a8a8a] hover:bg-[#161616]/60 hover:text-white"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* panels */}
          <div className="mt-4">
            {tab === "launch" && (
              <>
                {discoverOpen && (
                  <div className="mb-4">
                    <DiscoverPanel onUse={adoptSource} />
                  </div>
                )}
                <LaunchPanel
                  source={source}
                  discoverOpen={discoverOpen}
                  onToggleDiscover={() => setDiscoverOpen((v) => !v)}
                  onClearSource={() => setSource(null)}
                />
              </>
            )}
            {tab === "tokens" && <TokensPanel />}
            {tab === "markets" && <MarketsPanel />}
          </div>
        </main>

        {/* ===== FOOTER (as home) ===== */}
        <footer className="flex flex-wrap justify-between gap-3.5 border-t border-[#2a2a2a] px-9 py-5 font-mono text-[11px] uppercase tracking-[1px] text-[#8a8a8a]">
          <span>VuraPad // Built on Pons V2 // vura.ink</span>
          <span className="flex flex-wrap gap-1">
            <a href="/" className="border-b border-transparent hover:border-[#00ff66] hover:text-[#00ff66]">Launch</a>
            <span className="px-1.5">·</span>
            <a href="/terminal" className="border-b border-transparent hover:border-[#00ff66] hover:text-[#00ff66]">Radar</a>
            <span className="px-1.5">·</span>
            <a href="/gallery" className="border-b border-transparent hover:border-[#00ff66] hover:text-[#00ff66]">Gallery</a>
            <span className="px-1.5">·</span>
            <a href="/mint" className="border-b border-transparent hover:border-[#00ff66] hover:text-[#00ff66]">Mint</a>
            <span className="px-1.5">·</span>
            <a href="/scanner" className="border-b border-transparent hover:border-[#00ff66] hover:text-[#00ff66]">Scanner</a>
            <span className="px-1.5">·</span>
            <a href="https://www.ponsfamily.com/launchpad/0xB8e73F3afc0B263f58770cA39DBf960FB0D587A9" target="_blank" rel="noopener" className="border-b border-transparent hover:border-[#00ff66] hover:text-[#00ff66]">$VURA</a>
            <span className="px-1.5">·</span>
            <a href="https://x.com/0x_Vura" target="_blank" rel="noopener" className="border-b border-transparent hover:border-[#00ff66] hover:text-[#00ff66]">X / 0x_Vura</a>
            <span className="px-1.5">·</span>
            <a href="https://vura.ink" className="border-b border-transparent hover:border-[#00ff66] hover:text-[#00ff66]">vura.ink</a>
          </span>
        </footer>
      </div>
    </div>
  );
}
