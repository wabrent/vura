// ============================================================================
// VURA Rug Scanner — shared network registry.
// Used by the UI selector AND /api/scan — single source of truth.
// EVM mainnets enabled on our Alchemy app (testnets / non-EVM excluded).
// ============================================================================

export interface NetworkDef {
  /** API id used in { chain: … } payloads. */
  id: string;
  /** Short label for the selector / table badge. */
  label: string;
  /** Alchemy host (https://{host}.g.alchemy.com/v2/KEY). */
  host: string;
}

/** Sentinel id: scan every network below in one request. */
export const ALL_CHAINS = "all";

export const NETWORKS: NetworkDef[] = [
  { id: "eth", label: "ETH", host: "eth-mainnet" },
  { id: "base", label: "BASE", host: "base-mainnet" },
  { id: "arb", label: "ARB", host: "arb-mainnet" },
  { id: "op", label: "OP", host: "opt-mainnet" },
  { id: "polygon", label: "POLY", host: "polygon-mainnet" },
  { id: "robinhood", label: "RH", host: "robinhood-mainnet" },
  { id: "worldchain", label: "WORLD", host: "worldchain-mainnet" },
  { id: "shape", label: "SHAPE", host: "shape-mainnet" },
  { id: "zksync", label: "ZKSYNC", host: "zksync-mainnet" },
  { id: "avax", label: "AVAX", host: "avax-mainnet" },
  { id: "bnb", label: "BNB", host: "bnb-mainnet" },
  { id: "blast", label: "BLAST", host: "blast-mainnet" },
  { id: "linea", label: "LINEA", host: "linea-mainnet" },
  { id: "scroll", label: "SCROLL", host: "scroll-mainnet" },
  { id: "zora", label: "ZORA", host: "zora-mainnet" },
  { id: "mantle", label: "MANTLE", host: "mantle-mainnet" },
  { id: "gnosis", label: "GNOSIS", host: "gnosis-mainnet" },
  { id: "celo", label: "CELO", host: "celo-mainnet" },
  { id: "sonic", label: "SONIC", host: "sonic-mainnet" },
  { id: "berachain", label: "BERA", host: "berachain-mainnet" },
  { id: "unichain", label: "UNICHAIN", host: "unichain-mainnet" },
  { id: "ink", label: "INK", host: "ink-mainnet" },
  { id: "soneium", label: "SONEIUM", host: "soneium-mainnet" },
  { id: "abstract", label: "ABSTRACT", host: "abstract-mainnet" },
  { id: "moonbeam", label: "MOONBEAM", host: "moonbeam-mainnet" },
  { id: "apechain", label: "APE", host: "apechain-mainnet" },
  { id: "metis", label: "METIS", host: "metis-mainnet" },
  { id: "sei", label: "SEI", host: "sei-mainnet" },
  { id: "cronos", label: "CRONOS", host: "cronos-mainnet" },
  { id: "ronin", label: "RONIN", host: "ronin-mainnet" },
  { id: "rootstock", label: "RSK", host: "rootstock-mainnet" },
  { id: "bob", label: "BOB", host: "bob-mainnet" },
  { id: "plasma", label: "PLASMA", host: "plasma-mainnet" },
  { id: "katana", label: "KATANA", host: "katana-mainnet" },
  { id: "megaeth", label: "MEGA", host: "megaeth-mainnet" },
  { id: "monad", label: "MONAD", host: "monad-mainnet" },
  { id: "flow", label: "FLOW", host: "flow-mainnet" },
  { id: "arc", label: "ARC", host: "arc-mainnet" },
  { id: "story", label: "STORY", host: "story-mainnet" },
  { id: "humanity", label: "HUMANITY", host: "humanity-mainnet" },
  { id: "hyperliquid", label: "HYPE", host: "hyperliquid-mainnet" },
  { id: "tempo", label: "TEMPO", host: "tempo-mainnet" },
  { id: "galactica", label: "GALACTICA", host: "galactica-mainnet" },
  { id: "lens", label: "LENS", host: "lens-mainnet" },
  { id: "frax", label: "FRAX", host: "frax-mainnet" },
  { id: "stable", label: "STABLE", host: "stable-mainnet" },
  { id: "xlayer", label: "XLAYER", host: "xlayer-mainnet" },
  { id: "mode", label: "MODE", host: "mode-mainnet" },
  { id: "edge", label: "EDGE", host: "edge-mainnet" },
  { id: "mythos", label: "MYTHOS", host: "mythos-mainnet" },
  { id: "settlus", label: "SETTLUS", host: "settlus-mainnet" },
  { id: "astar", label: "ASTAR", host: "astar-mainnet" },
  { id: "zetachain", label: "ZETA", host: "zetachain-mainnet" },
  { id: "kaia", label: "KAIA", host: "kaia-mainnet" },
  { id: "boba", label: "BOBA", host: "boba-mainnet" },
  { id: "opbnb", label: "OPBNB", host: "opbnb-mainnet" },
  { id: "crossfi", label: "CROSSFI", host: "crossfi-mainnet" },
  { id: "adi", label: "ADI", host: "adi-mainnet" },
  { id: "jovay", label: "JOVAY", host: "jovay-mainnet" },
  { id: "pharos", label: "PHAROS", host: "pharos-mainnet" },
  { id: "rise", label: "RISE", host: "rise-mainnet" },
  { id: "anime", label: "ANIME", host: "anime-mainnet" },
  { id: "citrea", label: "CITREA", host: "citrea-mainnet" },
  { id: "worldmobile", label: "WMC", host: "worldmobilechain-mainnet" },
];

export function networkById(id: string): NetworkDef | undefined {
  return NETWORKS.find((n) => n.id === id);
}

/** Resolve a chain param ("all" | id) to concrete networks. */
export function resolveChainParam(param: string): NetworkDef[] | null {
  if (param === ALL_CHAINS) return NETWORKS;
  const net = networkById(param);
  return net ? [net] : null;
}
