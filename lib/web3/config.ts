// ============================================================================
// Wagmi v2 config — injected (browser) wallet, multi-chain transports
// ============================================================================

import { createConfig, http } from "wagmi";
import { arbitrum, base, bsc, mainnet } from "wagmi/chains";
import { defineChain } from "viem";
// NOTE: import `injected` from @wagmi/core directly — `wagmi/connectors` is a
// barrel file that pulls in optional SDK connectors (Coinbase CDP etc.) whose
// peer deps break `next build` when unused.
import { injected } from "@wagmi/core";

// Robinhood Chain (pons v2 launch protocol lives here)
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

export const wagmiConfig = createConfig({
  // Chains relevant to the VURA ecosystem (BSC / Base / Arbitrum) + mainnet
  // + Robinhood Chain for VuraPad launches
  chains: [mainnet, bsc, base, arbitrum, robinhood],
  connectors: [injected()],
  transports: {
    [mainnet.id]: http(),
    [bsc.id]: http(),
    [base.id]: http(),
    [arbitrum.id]: http(),
    [robinhood.id]: http("https://rpc.mainnet.chain.robinhood.com"),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
