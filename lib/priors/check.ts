// ============================================================================
// Priors credit check — thin client for the free, keyless priors.trade API.
// Answers one question about a wallet or agent: what has it actually repaid?
// Docs: github.com/priors-agents/priors/blob/main/docs/CHECK-API.md
// ============================================================================

export type PriorsVerdict = "no record" | "defaulted" | "no repayments yet" | "repaid";

export interface PriorsAgentRecord {
  agentId: number;
  name: string;
  owner: string;
  matchedAs: string[];
  record: {
    loansRepaid: number;
    volumeRepaidUsdg: number;
    activeLoans: number;
    defaulted: boolean;
    frozen: boolean;
    isRoot: boolean;
    enrolledAt: number;
    lastRepayAt: number | null;
    onchainScore: number;
  };
  scoreV2: {
    score: number;
    rung: number;
    rungName: string;
    version: string;
    updatedAt: number;
    lateRepayments: number;
    repaidByOthers: number;
    distinctPayers: number;
  } | null;
  links: { badge: string; page: string };
}

export interface PriorsCheck {
  verdict: PriorsVerdict;
  agents: PriorsAgentRecord[];
}

/** Map the API verdict to a color used across Vura UI. */
export function verdictColor(v: PriorsVerdict): "red" | "orange" | "green" | "gray" {
  if (v === "defaulted") return "red";
  if (v === "no repayments yet") return "orange";
  if (v === "repaid") return "green";
  return "gray";
}

/**
 * Look up a wallet's Priors record (agents it owns or declared it as payment
 * wallet). Returns null on network failure/timeout — callers should fail open
 * (no credit info is not a scan error).
 */
export async function fetchPriorsByAddress(
  address: string,
  timeoutMs = 8000
): Promise<PriorsCheck | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(
      `https://priors.trade/api/check?address=${encodeURIComponent(address)}`,
      { signal: ctrl.signal, headers: { accept: "application/json" } }
    );
    if (!res.ok) return null;
    const json = (await res.json()) as Partial<PriorsCheck>;
    if (typeof json.verdict !== "string") return null;
    return { verdict: json.verdict as PriorsVerdict, agents: json.agents ?? [] };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Same lookup keyed by ERC-8004 agent id (used by tests / deep links).
 */
export async function fetchPriorsByAgent(
  agentId: number,
  timeoutMs = 8000
): Promise<PriorsCheck | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`https://priors.trade/api/check?agent=${agentId}`, {
      signal: ctrl.signal,
      headers: { accept: "application/json" },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as Partial<PriorsCheck>;
    if (typeof json.verdict !== "string") return null;
    return { verdict: json.verdict as PriorsVerdict, agents: json.agents ?? [] };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
