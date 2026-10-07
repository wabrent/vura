"use client";

// ============================================================================
// DiagnosisPanel — score readout, verdict, scoring audit trail & token table
// ============================================================================
import type { ScanResult } from "@/lib/rugscan/types";
import { scoreColor } from "@/lib/rugscan/score";

const fmtBalance = (n: number): string => {
  if (!isFinite(n)) return "—";
  if (n === 0) return "0";
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (n >= 1) return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
  return parseFloat(n.toPrecision(3)).toString();
};

const shortAddr = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

const fmtUsd = (value: number, priceUsd: number | null): string => {
  if (priceUsd == null) return "—";
  const usd = value * priceUsd;
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(1)}M`;
  if (usd >= 1_000) return `$${(usd / 1_000).toFixed(1)}k`;
  if (usd >= 1) return `$${usd.toFixed(2)}`;
  if (usd <= 0) return "$0";
  return `$${parseFloat(usd.toPrecision(2))}`;
};

export function DiagnosisPanel({ result }: { result: ScanResult }) {
  const { score, verdict, breakdown, tokens } = result;
  const color = scoreColor(score);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Score + verdict ─────────────────────────────────────────── */}
      <div className="grid md:grid-cols-[240px_1fr] gap-4">
        <div
          className="rounded-lg border bg-[#111] p-6 flex flex-col items-center justify-center"
          style={{ borderColor: `${color}66`, boxShadow: `0 0 30px ${color}22` }}
        >
          <div className="text-[11px] uppercase tracking-[0.25em] text-zinc-500 mb-2">
            Degradation Score
          </div>
          <div
            className="font-mono font-bold text-7xl leading-none"
            style={{ color, textShadow: `0 0 24px ${color}88` }}
          >
            {score}
          </div>
          <div className="font-mono text-zinc-600 text-sm mt-1">/ 10</div>
        </div>

        <div className="rounded-lg border border-[#2a2a2a] bg-[#111] p-6">
          <div
            className="font-mono font-bold text-2xl uppercase tracking-widest mb-2"
            style={{ color, textShadow: `0 0 14px ${color}66` }}
          >
            {verdict.title}
          </div>
          <p className="text-zinc-300 italic text-sm leading-relaxed mb-4">
            “{verdict.oneLiner}”
          </p>
          <ul className="space-y-1">
            {verdict.diagnosis.map((line) => (
              <li key={line} className="font-mono text-xs text-zinc-500">
                <span className="text-[#00ff66] mr-2">›</span>
                {line}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── Score audit trail ───────────────────────────────────────── */}
      <div className="rounded-lg border border-[#2a2a2a] bg-[#111] p-5">
        <div className="text-[11px] uppercase tracking-[0.25em] text-zinc-500 mb-3">
          Score Breakdown
        </div>
        {breakdown.length === 0 ? (
          <p className="font-mono text-xs text-[#00ff66]">
            No risk factors found. Suspiciously clean.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {breakdown.map((b) => (
              <li key={b.label} className="flex items-center justify-between font-mono text-xs">
                <span className="text-zinc-400">
                  <span className="text-[#ff7700] mr-2">+</span>
                  {b.label}
                </span>
                <span className="text-[#ff7700]">+{b.points.toFixed(1)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── Token table ─────────────────────────────────────────────── */}
      <div className="rounded-lg border border-[#2a2a2a] bg-[#111] overflow-hidden">
        <div className="text-[11px] uppercase tracking-[0.25em] text-zinc-500 px-5 py-3 border-b border-[#2a2a2a]">
          Scanned Positions ({tokens.length})
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="text-zinc-600 border-b border-[#2a2a2a]">
                <th className="px-5 py-2 font-normal uppercase">Chain</th>
                <th className="px-5 py-2 font-normal uppercase">Token</th>
                <th className="px-5 py-2 font-normal uppercase text-right">Balance</th>
                <th className="px-5 py-2 font-normal uppercase text-right">USD</th>
                <th className="px-5 py-2 font-normal uppercase text-right">Contract</th>
              </tr>
            </thead>
            <tbody>
              {tokens.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-6 text-center text-zinc-600">
                    No ERC20 positions found in this wallet.
                  </td>
                </tr>
              ) : (
                tokens.map((t) => (
                  <tr
                    key={`${t.chain}:${t.contractAddress}`}
                    className="border-b border-[#1c1c1c] hover:bg-white/[0.02]"
                  >
                    <td className="px-5 py-2.5">
                      <span className="border border-[#00ff66]/40 text-[#00ff66] bg-[#00ff66]/5 px-1.5 py-0.5 text-[10px] uppercase tracking-wider rounded">
                        {t.chain}
                      </span>
                    </td>
                    <td className="px-5 py-2.5">
                      <div className="flex items-center gap-2.5">
                        {t.logo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={t.logo}
                            alt=""
                            className="w-5 h-5 rounded-full bg-[#1c1c1c] shrink-0"
                            loading="lazy"
                          />
                        ) : (
                          <span className="w-5 h-5 rounded-full bg-[#1c1c1c] border border-[#2a2a2a] shrink-0" />
                        )}
                        <span className="text-[#00ff66]">{t.symbol}</span>
                        <span className="text-zinc-600 truncate">{t.name}</span>
                        {!t.logo && (
                          <span className="border border-zinc-700 text-zinc-600 px-1.5 py-0.5 text-[10px] uppercase tracking-wider rounded shrink-0">
                            no-logo
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-2.5 text-right text-zinc-300">
                      {fmtBalance(t.balance)}
                    </td>
                    <td className="px-5 py-2.5 text-right text-zinc-300">
                      {fmtUsd(t.balance, t.priceUsd)}
                    </td>
                    <td className="px-5 py-2.5 text-right text-zinc-600">
                      {shortAddr(t.contractAddress)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
