// ============================================================================
// Wagmi v2 config — injected (browser) wallet, Robinhood Chain only
// ============================================================================

import { createConfig, http } from "wagmi";
import { defineChain } from "viem";
// NOTE: import `injected` from @wagmi/core directly — `wagmi/connectors` is a
// barrel file that pulls in optional SDK connectors (Coinbase CDP etc.) whose
// peer deps (`@x402/*`) are not installed and break `next build`.
// `walletConnect` is deep-imported the same way: next.config.js aliases
// `@wagmi/connectors/walletConnect` to the connector's own ESM file, so only
// the WalletConnect connector (deps already present) enters the bundle.
import { injected } from "@wagmi/core";
import { walletConnect } from "@wagmi/connectors/walletConnect";

// Robinhood Chain (pons v2 launch protocol lives here)
export function rpcUrl(): string {
  // browser → same-origin proxy (avoids duplicate Access-Control-Allow-Origin
  // headers the public RPC currently sends, which browsers reject)
  if (typeof window !== "undefined") return `${window.location.origin}/api/rpc`;
  return "https://rpc.mainnet.chain.robinhood.com/";
}

export const robinhood = defineChain({
  id: 4663,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.mainnet.chain.robinhood.com"] },
  },
  blockExplorers: {
    default: { name: "Blockscout", url: "https://robinhoodchain.blockscout.com" },
  },
  testnet: false,
  // Multicall3 at the canonical address — verified live on this chain
  contracts: {
    multicall3: { address: "0xcA11bde05977b3631167028862bE2a173976CA11" },
  },
});

const WC_PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

export const wagmiConfig = createConfig({
  chains: [robinhood],
  connectors: [
    injected(),
    // mobile / no-extension browsers: QR on desktop, wallet deep-links on phones
    ...(WC_PROJECT_ID ? [walletConnect({ projectId: WC_PROJECT_ID, showQrModal: true })] : []),
  ],
  transports: {
    [robinhood.id]: http(rpcUrl()),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
