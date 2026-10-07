// ============================================================================
// VURA Rug Scanner — shared types
// ============================================================================

/** One real ERC20 position in the scanned wallet (Alchemy Enhanced API). */
export interface TokenRisk {
  contractAddress: string;
  /** Short network label (e.g. "ETH", "BASE") the token lives on. */
  chain: string;
  symbol: string;
  name: string;
  decimals: number;
  /** Token logo URL from Alchemy metadata (null → unknown/dead token). */
  logo: string | null;
  /** Raw token balance (human units, decimal-adjusted). */
  balance: number;
  /** USD price per token from the Alchemy Prices API (null → no price feed). */
  priceUsd: number | null;
}

/** Brutal verdict band (0–10 scale). */
export interface Verdict {
  min: number;
  max: number;
  /** ALL-CAPS verdict title shown on the score card. */
  title: string;
  /** The brutal one-liner printed under the title. */
  oneLiner: string;
  /** Extra lines shown in the terminal diagnosis. */
  diagnosis: string[];
}

/** One line of the scoring breakdown (audit trail for the score). */
export interface ScoreBreakdown {
  label: string;
  points: number;
}

/** Full scan result — what the terminal prints after "SCAN PORTFOLIO". */
export interface ScanResult {
  address: string;
  scannedAt: number;
  tokens: TokenRisk[];
  /** Degradation Score, 0 (safe but boring) – 10 (terminal degradation). */
  score: number;
  verdict: Verdict;
  breakdown: ScoreBreakdown[];
}
