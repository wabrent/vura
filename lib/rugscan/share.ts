// ============================================================================
// VURA Rug Scanner — X (Twitter) sharing helpers
// ============================================================================

import type { ScanResult } from "./types";

/** Build the brutal pre-filled tweet text. */
export function buildShareText(result: ScanResult): string {
  const link = `${window.location.origin}/scanner`;
  return [
    `My VURA Rug Scanner Degradation Score: ${result.score}/10 — ${result.verdict.title}`,
    `"${result.verdict.oneLiner}"`,
    "",
    `${result.tokens.length} ERC20 positions scanned via Alchemy.`,
    `Scan your bags: ${link}`,
  ].join("\n");
}

/**
 * Open X with the pre-filled tweet.
 *
 * Note: the web intent URL cannot attach images programmatically (X API
 * limitation) — we download the generated PNG next to the tab so the user can
 * drag it into the composer. With X API v2 paid tiers you would instead upload
 * the media_id first and add `media_ids` to the tweet.
 */
export function openXShare(text: string) {
  const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

/** Trigger a browser download of the share card PNG (data URL). */
export function downloadCard(dataUrl: string, address: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = `vura-rug-scan-${address.slice(0, 10)}.png`;
  a.click();
}
