"use client";

// ============================================================================
// VuraPerps — trading page layout:
//   hero → our ETH chart banner → Orderly white-label widget (full width,
//   VURA theme) → points leaderboard row.
//
// The widget's own chart column is a TradingView license placeholder unless
// you host charting_library yourself — we hide it via CSS (disableFeatures
// does NOT gate the desktop chart section in this SDK version) and show
// PerpsChart above instead. The orderbook pane is stretched to fill the gap.
// ============================================================================

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { SiteNav } from "@/components/layout/SiteNav";
import { PerpsChart } from "./PerpsChart";
import { VuraPointsWidget } from "./VuraPointsWidget";
import { applyVuraTheme } from "@/lib/perps/vuraTheming";

const PerpsSDK = dynamic(() => import("./PerpsSDK"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[560px] items-center justify-center rounded-xl border border-[#2a2a2a] bg-[#111]">
      <span className="font-mono text-[12px] uppercase tracking-[3px] text-[#8a8a8a]">
        loading trading engine…
      </span>
    </div>
  ),
});

const WIDGET_CSS = `
#orderly-widget [style*="468px"]:not([style*="position"]) { display: none !important; }
#orderly-widget [style*="468px"]:not([style*="position"]) + .w-split-line-bar { display: none !important; }
#orderly-widget [style*="300px"][style*="800px"]:not([style*="position"]) {
  flex: 1 1 auto !important;
  width: auto !important;
  max-width: none !important;
}
`;

export function VuraPerps() {
  useEffect(() => {
    applyVuraTheme();
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-[#0a0a0a] text-white">
      <style>{WIDGET_CSS}</style>
      <SiteNav active="perps" />

      {/* Hero strip */}
      <section className="border-b border-[#2a2a2a] px-7 py-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-mono text-3xl font-bold uppercase tracking-tight">
              Vura <span className="text-[#00ff66] [text-shadow:0_0_20px_#00ff6688]">Perps</span>
            </h1>
            <p className="mt-1.5 font-mono text-[12px] uppercase tracking-[2px] text-[#8a8a8a]">
              points season 1 // trade volume → vura points
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-md border border-[#00ff66] bg-[#00ff66]/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[1px] text-[#00ff66]">
              orderly mainnet
            </span>
            <span className="rounded-md border border-[#2a2a2a] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[1px] text-[#8a8a8a]">
              up to 50x
            </span>
            <span className="rounded-md border border-[#2a2a2a] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[1px] text-[#8a8a8a]">
              +10 pts / $1 vol · ×1.5 holder boost
            </span>
          </div>
        </div>
      </section>

      <main className="mx-auto w-full max-w-[1700px] flex-1 space-y-5 px-7 py-6">
        {/* ETH chart banner */}
        <PerpsChart />

        {/* Orderly white-label trading widget — full width */}
        <div id="orderly-widget">
          <PerpsSDK />
        </div>

        {/* Points */}
        <div className="grid gap-5 lg:grid-cols-[1fr_420px]">
          <VuraPointsWidget title="points leaderboard" resetTimer="3d 12h" />
          <aside className="rounded-xl border border-[#2a2a2a] bg-[#111] p-5">
            <div className="mb-3 border-b border-[#2a2a2a] pb-3 font-mono text-[11px] uppercase tracking-[2px] text-[#8a8a8a]">
              ◈ how points work
            </div>
            <ul className="space-y-2 font-mono text-[11px] leading-relaxed text-[#8a8a8a]">
              <li>
                <span className="text-[#00ff66]">•</span> +10 pts for every $1 of trading volume
              </li>
              <li>
                <span className="text-[#00ff66]">•</span> ×1.5 if you hold 50,000+ $VURA
              </li>
              <li>
                <span className="text-[#00ff66]">•</span> volumes synced hourly by the backend
              </li>
              <li>
                <span className="text-[#00ff66]">•</span> leaderboard resets mondays 00:00 utc
              </li>
            </ul>
          </aside>
        </div>
      </main>

      <footer className="border-t border-[#2a2a2a] px-7 py-4 font-mono text-[10px] uppercase tracking-[1px] text-[#5a5a5a]">
        vura perps // powered by orderly network white-label // trading involves risk — size it
        like someone who has been liquidated before
      </footer>
    </div>
  );
}
