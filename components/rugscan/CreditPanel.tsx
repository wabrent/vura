"use client";

// ============================================================================
// CreditPanel — the scanned wallet's onchain credit record, from the free
// priors.trade check API (Robinhood Chain). Shown under a scan result.
// Fail-open: if the API is unreachable the panel simply doesn't render.
// ============================================================================

import { useEffect, useState } from "react";
import { fetchPriorsByAddress, type PriorsCheck, type PriorsVerdict } from "@/lib/priors/check";

const VERDICT_STYLE: Record<
  PriorsVerdict,
  { color: string; title: string; line: string }
> = {
  defaulted: {
    color: "#ff3300",
    title: "PERMANENT CREDIT DEFAULT",
    line: "This wallet's agent missed a due date by more than 3 days. The default is public and forever — the identity can never borrow again.",
  },
  "no repayments yet": {
    color: "#ff7700",
    title: "NO REPAYMENTS YET",
    line: "Credit exists but nothing has been repaid yet. A record with zero repayments proves nothing.",
  },
  repaid: {
    color: "#00ff66",
    title: "REPAID",
    line: "Real debt, repaid onchain. Reviews can be faked — repaid loans can't.",
  },
  "no record": {
    color: "#8a8a8a",
    title: "NO ONCHAIN CREDIT RECORD",
    line: "This wallet owns no Priors agents. Absence of a record is not proof of honesty — it means nothing was ever put at risk.",
  },
};

export function CreditPanel({ address }: { address: string }) {
  const [check, setCheck] = useState<PriorsCheck | null | "loading">("loading");

  useEffect(() => {
    let alive = true;
    setCheck("loading");
    fetchPriorsByAddress(address).then((c) => {
      if (alive) setCheck(c);
    });
    return () => {
      alive = false;
    };
  }, [address]);

  if (check === null) return null; // fail open — no credit panel on network errors

  if (check === "loading") {
    return (
      <div className="rounded-lg border border-[#2a2a2a] bg-[#111] px-5 py-4">
        <span className="font-mono text-xs uppercase tracking-[0.2em] text-zinc-600">
          querying priors ledger for credit history…
        </span>
      </div>
    );
  }

  const style = VERDICT_STYLE[check.verdict];
  const totalRepaid = check.agents.reduce((s, a) => s + a.record.loansRepaid, 0);
  const totalVolume = check.agents.reduce((s, a) => s + a.record.volumeRepaidUsdg, 0);

  return (
    <div
      className="rounded-lg border bg-[#111] p-5 animate-fade-in"
      style={{ borderColor: `${style.color}66`, boxShadow: `0 0 24px ${style.color}18` }}
      data-testid="credit-panel"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-zinc-500">
          wallet credit // priors
        </div>
        <div
          className="font-mono text-xs font-bold uppercase tracking-[0.18em] px-2.5 py-1 rounded"
          style={{ color: style.color, border: `1px solid ${style.color}88`, background: `${style.color}12` }}
        >
          {style.title}
          {check.verdict === "repaid" && check.agents.length > 0 && (
            <span className="ml-2 opacity-80">
              {totalRepaid} loan{totalRepaid === 1 ? "" : "s"} · ${totalVolume.toLocaleString("en-US")}
            </span>
          )}
        </div>
      </div>

      <p className="text-sm text-zinc-400 leading-relaxed mb-4 max-w-3xl">{style.line}</p>

      {check.agents.length > 0 && (
        <div className="space-y-1.5 mb-3">
          {check.agents.map((a) => (
            <a
              key={a.agentId}
              href={a.links.page}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded border border-[#2a2a2a] bg-black/40 px-3.5 py-2.5
                         font-mono text-xs text-zinc-400 transition-colors hover:border-[#00ff66]/50 hover:text-zinc-200"
            >
              <span className="text-[#00ff66]">agent #{a.agentId}</span>
              <span>{a.name}</span>
              <span className={a.record.defaulted ? "text-[#ff3300]" : "text-zinc-300"}>
                repaid {a.record.loansRepaid} · ${a.record.volumeRepaidUsdg}
              </span>
              <span>
                active {a.record.activeLoans}
              </span>
              <span>
                score {a.scoreV2 ? `${a.scoreV2.score}/1000 · ${a.scoreV2.rungName}` : `${a.record.onchainScore} onchain`}
              </span>
              <span className="ml-auto text-zinc-600">open ↗</span>
            </a>
          ))}
        </div>
      )}

      <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-zinc-600">
        source: priors.trade check api // robinhood chain 4663 // free, no key // score lags chain ≤25 pts
      </div>
    </div>
  );
}
