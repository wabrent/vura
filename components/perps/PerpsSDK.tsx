"use client";

// ============================================================================
// PerpsSDK — Orderly Network white-label trading page inside a VURA shell.
// Loaded with ssr:false (the SDK touches window/localStorage), wrapped in an
// error boundary so a provider failure degrades to a readable panel instead
// of taking down the whole page.
// ============================================================================

import { Component, type ReactNode } from "react";
import { OrderlyAppProvider, TradingPage } from "@orderly.network/react";
import "@orderly.network/react/dist/styles.css";

const VURA_BROKER_ID = process.env.NEXT_PUBLIC_ORDERLY_BROKER_ID ?? "your_broker_vura_id";

// The SDK's TradingView panel is a license placeholder unless you host
// charting_library yourself. disableFeatures=["kline"] does NOT gate the
// desktop chart section in this SDK version — the column is hidden via CSS
// in VuraPerps and replaced by PerpsChart above the widget. These paths stay
// only to satisfy the required prop; fill them to re-enable the built-in chart.
const tradingViewConfig = {
  scriptSRC: process.env.NEXT_PUBLIC_TV_SCRIPT_SRC ?? "",
  library_path: process.env.NEXT_PUBLIC_TV_LIBRARY_PATH ?? "",
};

class SdkBoundary extends Component<{ children: ReactNode }, { err: string | null }> {
  state = { err: null as string | null };

  static getDerivedStateFromError(err: Error) {
    return { err: err.message };
  }

  render() {
    if (this.state.err) {
      return (
        <div className="rounded-xl border border-[#ff7700]/60 bg-[#111] p-6">
          <div className="font-mono text-[12px] font-bold uppercase tracking-[2px] text-[#ff7700]">
            orderly sdk error
          </div>
          <p className="mt-2 font-mono text-[12px] leading-relaxed text-[#8a8a8a]">
            {this.state.err.slice(0, 200)}
          </p>
          <button
            onClick={() => this.setState({ err: null })}
            className="mt-4 rounded-lg border border-[#00ff66] px-4 py-2 font-mono text-[12px] uppercase tracking-[1px] text-[#00ff66] hover:bg-[#00ff66]/10"
          >
            retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function PerpsSDK() {
  return (
    <SdkBoundary>
      <OrderlyAppProvider
        brokerId={VURA_BROKER_ID}
        networkId="mainnet"
        brokerName="VURA"
        theme="dark"
        appIcons={{ main: { component: "💀" } }}
        shareOptions={{
          pnl: {
            fontFamily: "'SF Mono', monospace",
            backgroundImages: ["/bg-waves.jpg"],
            color: "#e5ffe8",
            profitColor: "#00ff66",
            lossColor: "#ff4411",
            brandColor: "#00ff66",
          },
        }}
      >
        <TradingPage
          symbol="PERP_ETH_USDC"
          tradingViewConfig={tradingViewConfig}
        />
      </OrderlyAppProvider>
    </SdkBoundary>
  );
}
