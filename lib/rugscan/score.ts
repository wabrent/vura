// ============================================================================
// VURA Rug Scanner — Degradation Score engine
//
// Real-data scoring spec:
//   score = min(10, tokens * 0.4 + tokensWithoutLogoOrPrice * 1.2)
// Transparent by design so the verdict feels fair (and screenshot-shareable).
// ============================================================================

import type {
  ScoreBreakdown,
  ScanResult,
  TokenRisk,
  Verdict,
} from "./types";

// --- Hardcoded scoring parameters (per spec) -------------------------------
const POINTS_PER_TOKEN = 0.4; // every ERC20 position adds up
const POINTS_NO_LOGO = 1.2; // no logo / no price feed → probably dead or a scam
const SCORE_CAP = 10;

// --- Verdict bands ---------------------------------------------------------
export const VERDICTS: Verdict[] = [
  {
    min: 0,
    max: 2,
    title: "SAFE BUT BORING",
    oneLiner:
      "You hold blue chips and the personality to match. Congrats on your 4% APY, grandpa.",
    diagnosis: [
      "Portfolio is suspiciously clean.",
      "Did you even try to degen?",
      "Recommendation: buy something stupid at least once.",
    ],
  },
  {
    min: 3,
    max: 5,
    title: "DEGEN-IN-TRAINING",
    oneLiner:
      "A few scratcher tickets in the portfolio. You're learning. The chain is watching.",
    diagnosis: [
      "Some low-liq bags detected — cute.",
      "You Google 'how to spot a rug' before bed.",
      "Graduation imminent: one more honeypot and you're promoted.",
    ],
  },
  {
    min: 6,
    max: 8,
    title: "HONEYPOT HUNTER",
    oneLiner:
      "You don't buy tokens, you collect exit liquidity. The scammers screenshot YOU.",
    diagnosis: [
      "Multiple contracts would love to take your money.",
      "Sell button: decorative only.",
      "At this point the honeypots are farming you.",
    ],
  },
  {
    min: 9,
    max: 10,
    title: "TERMINAL DEGRADATION",
    oneLiner:
      "This isn't a portfolio, it's a museum of poor decisions. Exit liquidity has a fan club named after you.",
    diagnosis: [
      "Every bag is a cry for help.",
      "Blockchain forensics called. They're laughing.",
      "This wallet should be studied. For science.",
    ],
  },
];

/** Pick the verdict band for a 0–10 score (handles decimal scores). */
export function verdictFor(score: number): Verdict {
  for (let i = VERDICTS.length - 1; i >= 0; i--) {
    if (score >= VERDICTS[i].min) return VERDICTS[i];
  }
  return VERDICTS[0];
}

/**
 * Severity color for a score — drives the neon glow across the UI.
 * safe → acid green, dirty → amber, rug territory → neon orange, terminal → hot red-orange.
 */
export function scoreColor(score: number): string {
  if (score <= 2) return "#00ff66";
  if (score <= 5) return "#ffaa00";
  if (score <= 8) return "#ff7700";
  return "#ff3300";
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Calculate the Degradation Score (0–10) + a human breakdown.
 * Spec: min(10, tokens * 0.4 + tokensWithoutLogoOrPrice * 1.2)
 * Pure function → deterministic for the same portfolio (stable share cards).
 */
export function scorePortfolio(tokens: TokenRisk[]): {
  score: number;
  breakdown: ScoreBreakdown[];
} {
  const breakdown: ScoreBreakdown[] = [];

  // Unidentified = no logo AND no price feed → probably dead or a scam.
  // (Known assets like USDC/WETH have prices even when the logo feed is empty.)
  const unidentified = tokens.filter((t) => !t.logo && t.priceUsd == null).length;

  const tokenPts = round1(tokens.length * POINTS_PER_TOKEN);
  if (tokens.length > 0) {
    breakdown.push({ label: `${tokens.length} ERC20 positions`, points: tokenPts });
  }

  const noLogoPts = round1(unidentified * POINTS_NO_LOGO);
  if (unidentified > 0) {
    breakdown.push({
      label: `${unidentified} without logo / price feed`,
      points: noLogoPts,
    });
  }

  const raw = breakdown.reduce((sum, b) => sum + b.points, 0);
  const score = round1(Math.min(SCORE_CAP, Math.max(0, raw)));
  return { score, breakdown };
}

/** One-call helper: portfolio → full ScanResult. */
export function buildScanResult(
  address: string,
  tokens: TokenRisk[]
): ScanResult {
  const { score, breakdown } = scorePortfolio(tokens);
  return {
    address,
    scannedAt: Date.now(),
    tokens,
    score,
    verdict: verdictFor(score),
    breakdown,
  };
}
