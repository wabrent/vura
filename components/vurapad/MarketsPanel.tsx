"use client";

// ============================================================================
// Markets — live Robinhood Chain pools via GeckoTerminal (read-only feed)
// ============================================================================

import { useCallback, useEffect, useState } from "react";
import { Card, btnGhost, alertCls } from "./ui";

type Pool = {
  id: string;
  name: string;
  address: string;
  priceUsd: string | null;
  change24h: string | null;
  vol24h: string | null;
  liqUsd: string | null;
};

type GtAttributes = {
  name: string;
  base_token_price_usd: string | null;
  price_change_percentage: { h24?: string | null };
  volume_usd: { h24?: string | null };
  reserve_in_usd: string | null;
};

type GtRelationship = { data: { id: string } | null };

function toPool(item: {
  id: string;
  attributes: GtAttributes;
  relationships?: { base_token?: GtRelationship };
}): Pool {
  const address = item.id.split("_")[1] || item.id;
  return {
    id: item.id,
    name: item.attributes.name || item.id,
    address,
    priceUsd: item.attributes.base_token_price_usd,
    change24h: item.attributes.price_change_percentage?.h24 ?? null,
    vol24h: item.attributes.volume_usd?.h24 ?? null,
    liqUsd: item.attributes.reserve_in_usd,
  };
}

function fmtUsd(v: string | null): string {
  const n = v === null ? NaN : Number(v);
  if (!isFinite(n)) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  return `$${n.toPrecision(3)}`;
}

export function MarketsPanel() {
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        "https://api.geckoterminal.com/api/v2/networks/robinhood/pools?page=1&sort=h24_volume_usd_desc",
        { headers: { Accept: "application/json" } }
      );
      if (!res.ok) {
        setError(`GECKOTERMINAL ERROR ${res.status}`);
        return;
      }
      const data = await res.json();
      setPools((data.data || []).map(toPool));
      setUpdatedAt(new Date().toLocaleTimeString());
    } catch {
      setError("FEED UNREACHABLE — RETRY");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Card
      title="Markets // Robinhood Chain Live Pools"
      meta={
        <div className="flex items-center gap-3">
          {updatedAt && (
            <span className="hidden font-mono text-[10px] uppercase tracking-[1px] text-[#8a8a8a] sm:inline">
              Sync {updatedAt}
            </span>
          )}
          <button onClick={load} disabled={loading} className={btnGhost + " px-3 py-1.5 text-[11px]"}>
            {loading ? "Syncing…" : "⟳ Refresh"}
          </button>
        </div>
      }
    >
      {error && <div className={`m-5 ${alertCls}`}>! {error}</div>}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2a2a2a] font-mono text-[10px] uppercase tracking-[1.5px] text-[#8a8a8a]">
              <th className="px-5 py-3 text-left font-normal">Pair</th>
              <th className="px-3 py-3 text-right font-normal">Price</th>
              <th className="px-3 py-3 text-right font-normal">24h</th>
              <th className="px-3 py-3 text-right font-normal">Vol 24h</th>
              <th className="px-3 py-3 text-right font-normal">Liq</th>
              <th className="px-5 py-3 text-right font-normal">Chart</th>
            </tr>
          </thead>
          <tbody>
            {pools.map((p) => {
              const ch = p.change24h === null ? null : Number(p.change24h);
              const up = ch !== null && isFinite(ch) && ch >= 0;
              return (
                <tr key={p.id} className="border-b border-[#2a2a2a]/60 transition-colors last:border-0 hover:bg-[#161616]">
                  <td className="px-5 py-3.5 font-mono text-[13px] font-semibold text-white">{p.name}</td>
                  <td className="px-3 py-3.5 text-right font-mono text-[13px] text-white">{fmtUsd(p.priceUsd)}</td>
                  <td
                    className="px-3 py-3.5 text-right font-mono text-[13px] font-semibold"
                    style={{
                      color:
                        ch === null || !isFinite(ch)
                          ? "#8a8a8a"
                          : up
                            ? "#00ff66"
                            : "#ff7700",
                    }}
                  >
                    {ch === null || !isFinite(ch) ? "—" : `${up ? "+" : ""}${ch.toFixed(1)}%`}
                  </td>
                  <td className="px-3 py-3.5 text-right font-mono text-[13px] text-[#8a8a8a]">{fmtUsd(p.vol24h)}</td>
                  <td className="px-3 py-3.5 text-right font-mono text-[13px] text-[#8a8a8a]">{fmtUsd(p.liqUsd)}</td>
                  <td className="px-5 py-3.5 text-right">
                    <a
                      href={`https://www.geckoterminal.com/robinhood/pools/${p.address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block rounded-md border border-[#2a2a2a] px-2 py-1 font-mono text-[11px] text-[#8a8a8a] transition-colors hover:border-[#00ff66] hover:text-[#00ff66]"
                    >
                      ↗
                    </a>
                  </td>
                </tr>
              );
            })}
            {!loading && !error && pools.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center font-mono text-[12px] text-[#8a8a8a]">
                  NO POOLS FOUND.
                </td>
              </tr>
            )}
            {loading && pools.length === 0 && !error && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center font-mono text-[12px] text-[#8a8a8a]">
                  SYNCING FEED…
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="border-t border-[#2a2a2a] px-5 py-2.5 font-mono text-[10px] uppercase tracking-[1px] text-[#8a8a8a]">
        Data: GeckoTerminal // pool page opens the full chart
      </div>
    </Card>
  );
}
