"use client";

// ============================================================================
// Tokens — onchain index of TokenLaunched events from the pons v2 factory.
// Walks backward from the head of Robinhood Chain in 1M-block chunks, then
// enriches the newest launches with symbol/name (multicall) and timestamps.
// Tokens launched from this device get a VURAPAD badge (localStorage).
// ============================================================================

import { useCallback, useEffect, useState } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { formatEther, parseAbi, parseAbiItem } from "viem";
import { robinhood } from "@/lib/web3/config";
import { fetchPriorsByAddress, type PriorsVerdict } from "@/lib/priors/check";
import { Card, btnGhost, alertCls } from "./ui";

const FACTORY = "0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e" as const;
const EXPLORER = "https://robinhoodchain.blockscout.com";
const DEVICE_KEY = "vurapad.launches.v1";
const ROWS = 30;
const CHUNK = BigInt(1000000);
const MAX_CHUNKS = 5;
const TARGET = 200;

const TOKEN_LAUNCHED = parseAbiItem(
  "event TokenLaunched(address indexed token, address indexed curve, address indexed deployer, address pairToken, uint256 launchConfigId, uint256 graduationThreshold)"
);

const erc20Abi = parseAbi([
  "function symbol() view returns (string)",
  "function name() view returns (string)",
]);

type Row = {
  token: `0x${string}`;
  curve: `0x${string}`;
  deployer: `0x${string}`;
  configId: bigint;
  threshold: bigint;
  blockNumber: bigint;
  txHash: `0x${string}`;
  date: string | null;
  symbol: string | null;
  name: string | null;
  onDevice: boolean;
};

type DeviceLaunch = { token: string; curve: string; tx?: string; ts?: number };

/** Creator's onchain credit record (priors.trade check API), keyed by address. */
type Credit = {
  verdict: PriorsVerdict;
  repaid: number;
  volume: number;
  agentId: number;
  page: string;
};

type LaunchedLog = {
  args: {
    token: `0x${string}`;
    curve: `0x${string}`;
    deployer: `0x${string}`;
    pairToken: `0x${string}`;
    launchConfigId: bigint;
    graduationThreshold: bigint;
  };
  blockNumber: bigint | null;
  transactionHash: `0x${string}` | null;
};

function readDeviceLaunches(): DeviceLaunch[] {
  try {
    const raw = localStorage.getItem(DEVICE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function recordDeviceLaunch(l: DeviceLaunch) {
  try {
    const prev = readDeviceLaunches();
    const next = [l, ...prev.filter((p) => p.token !== l.token)].slice(0, 200);
    localStorage.setItem(DEVICE_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable */
  }
}

export function TokensPanel() {
  const client = usePublicClient({ chainId: robinhood.id });
  const { address } = useAccount();
  const [rows, setRows] = useState<Row[]>([]);
  const [credit, setCredit] = useState<Record<string, Credit>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!client) return;
    setLoading(true);
    setError(null);
    try {
      // 1 — collect recent TokenLaunched logs, walking backward from head
      const latest = await client.getBlockNumber();
      const collected: LaunchedLog[] = [];
      let to = latest;
      let emptyStreak = 0;
      for (let i = 0; i < MAX_CHUNKS && collected.length < TARGET; i++) {
        const from = to - CHUNK < BigInt(0) ? BigInt(0) : to - CHUNK;
        const logs = await client.getLogs({
          address: FACTORY,
          event: TOKEN_LAUNCHED,
          fromBlock: from,
          toBlock: to,
        });
        if (logs.length === 0) {
          emptyStreak += 1;
          if (emptyStreak >= 2) break;
        } else {
          emptyStreak = 0;
          collected.push(...(logs as unknown as LaunchedLog[]));
        }
        if (from === BigInt(0)) break;
        to = from - BigInt(1);
      }

      collected.sort((a, b) => Number((b.blockNumber ?? BigInt(0)) - (a.blockNumber ?? BigInt(0))));
      const device = new Set(readDeviceLaunches().map((d) => d.token.toLowerCase()));
      const base: Row[] = collected.slice(0, ROWS).map((l) => {
        const args = l.args as {
          token: `0x${string}`;
          curve: `0x${string}`;
          deployer: `0x${string}`;
          launchConfigId: bigint;
          graduationThreshold: bigint;
        };
        return {
          token: args.token,
          curve: args.curve,
          deployer: args.deployer,
          configId: args.launchConfigId,
          threshold: args.graduationThreshold ?? BigInt(0),
          blockNumber: l.blockNumber ?? BigInt(0),
          txHash: l.transactionHash ?? "0x",
          date: null,
          symbol: null,
          name: null,
          onDevice: device.has(args.token.toLowerCase()),
        };
      });
      setRows(base);

      // 2 — enrich: timestamps (parallel) + symbol/name (one multicall)
      const blocks = [...new Set(base.map((r) => r.blockNumber))];
      const tsByBlock = new Map<bigint, string>();
      await Promise.allSettled(
        blocks.map(async (bn) => {
          const blk = await client.getBlock({ blockNumber: bn });
          const d = new Date(Number(blk.timestamp) * 1000);
          tsByBlock.set(bn, d.toLocaleString("en-GB", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }));
        })
      );

      let meta: { symbol: string | null; name: string | null }[] = [];
      try {
        const mc = await client.multicall({
          contracts: base.flatMap((r) => [
            { address: r.token, abi: erc20Abi, functionName: "symbol" as const },
            { address: r.token, abi: erc20Abi, functionName: "name" as const },
          ]),
          allowFailure: true,
        });
        meta = base.map((_, i) => ({
          symbol: mc[i * 2]?.status === "success" ? String(mc[i * 2].result) : null,
          name: mc[i * 2 + 1]?.status === "success" ? String(mc[i * 2 + 1].result) : null,
        }));
      } catch {
        /* keep nulls */
      }

      setRows((prev) =>
        prev.map((r, i) => ({
          ...r,
          date: tsByBlock.get(r.blockNumber) ?? r.date,
          symbol: meta[i]?.symbol ?? r.symbol,
          name: meta[i]?.name ?? r.name,
        }))
      );
      setUpdatedAt(new Date().toLocaleTimeString());
    } catch (e) {
      setError(`INDEX FAILED — ${(e as Error).message.split("\n")[0].slice(0, 120)}`);
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    load();
  }, [load]);

  // Enrich creators with their priors credit record (free, fail-open, 5 in parallel)
  const rowsKey = rows.map((r) => r.deployer.toLowerCase()).join(",");
  useEffect(() => {
    if (!rowsKey) return;
    let alive = true;
    const deployers = [...new Set(rowsKey.split(","))];
    const map: Record<string, Credit> = {};
    let next = 0;
    const worker = async () => {
      while (next < deployers.length) {
        const d = deployers[next++];
        const c = await fetchPriorsByAddress(d);
        if (!c || c.agents.length === 0) continue;
        const a = c.agents[0];
        map[d] = {
          verdict: c.verdict,
          repaid: a.record.loansRepaid,
          volume: a.record.volumeRepaidUsdg,
          agentId: a.agentId,
          page: a.links.page,
        };
      }
    };
    Promise.all(Array.from({ length: 5 }, () => worker())).then(() => {
      if (alive) setCredit(map);
    });
    return () => {
      alive = false;
    };
  }, [rowsKey]);

  const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

  return (
    <Card
      title="Tokens // Launched on Robinhood Chain"
      meta={
        <div className="flex items-center gap-3">
          {updatedAt && (
            <span className="hidden font-mono text-[10px] uppercase tracking-[1px] text-[#8a8a8a] sm:inline">
              Sync {updatedAt}
            </span>
          )}
          <button onClick={load} disabled={loading} className={btnGhost + " px-3 py-1.5 text-[11px]"}>
            {loading ? "Indexing…" : "⟳ Refresh"}
          </button>
        </div>
      }
    >
      {error && <div className={`m-5 ${alertCls}`}>! {error}</div>}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2a2a2a] font-mono text-[10px] uppercase tracking-[1.5px] text-[#8a8a8a]">
              <th className="px-5 py-3 text-left font-normal">#</th>
              <th className="px-3 py-3 text-left font-normal">Token</th>
              <th className="px-3 py-3 text-left font-normal">Launched</th>
              <th className="px-3 py-3 text-left font-normal">Creator</th>
              <th className="px-3 py-3 text-right font-normal">Grad. Target</th>
              <th className="px-5 py-3 text-right font-normal">Links</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const mine = address && r.deployer.toLowerCase() === address.toLowerCase();
              const cr = credit[r.deployer.toLowerCase()];
              const chip =
                cr?.verdict === "defaulted"
                  ? { cls: "border-[#ff3300]/60 bg-[#ff3300]/10 text-[#ff3300]", label: "✕ Default" }
                  : cr?.verdict === "repaid"
                    ? {
                        cls: "border-[#00ff66]/60 bg-[#00ff66]/10 text-[#00ff66]",
                        label: `✓ ${cr.repaid} rep`,
                      }
                    : cr?.verdict === "no repayments yet"
                      ? { cls: "border-[#ff7700]/60 bg-[#ff7700]/10 text-[#ff7700]", label: "? Unproven" }
                      : null;
              return (
                <tr
                  key={r.token}
                  className="border-b border-[#2a2a2a]/60 transition-colors last:border-0 hover:bg-[#161616]"
                >
                  <td className="px-5 py-3.5 font-mono text-[12px] text-[#8a8a8a]">
                    {String(i + 1).padStart(3, "0")}
                  </td>
                  <td className="px-3 py-3.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[13px] font-semibold text-white">
                        {r.symbol || short(r.token)}
                      </span>
                      {r.onDevice && (
                        <span className="rounded-md border border-[#00ff66] bg-[#00ff66]/10 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[1px] text-[#00ff66]">
                          Vurapad
                        </span>
                      )}
                      {mine && !r.onDevice && (
                        <span className="rounded-md border border-[#ff7700]/60 bg-[#ff7700]/10 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[1px] text-[#ff7700]">
                          Yours
                        </span>
                      )}
                      {r.name && (
                        <span className="truncate text-[12px] text-[#8a8a8a]">{r.name}</span>
                      )}
                    </div>
                    {r.symbol && (
                      <div className="mt-0.5 font-mono text-[11px] text-[#8a8a8a]/70">
                        {short(r.token)}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-3.5 font-mono text-[12px] text-[#8a8a8a]">
                    {r.date || `block ${r.blockNumber.toLocaleString()}`}
                  </td>
                  <td className="px-3 py-3.5 font-mono text-[12px]">
                    <span className={mine ? "text-[#00ff66]" : "text-[#8a8a8a]"}>{short(r.deployer)}</span>
                    {cr && chip && (
                      <a
                        href={cr.page}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={`Priors credit: ${cr.verdict}`}
                        className={`ml-2 inline-block rounded-md border px-1.5 py-0.5 align-middle text-[9px] font-bold uppercase tracking-[1px] transition-colors hover:opacity-80 ${chip.cls}`}
                      >
                        {chip.label}
                      </a>
                    )}
                  </td>
                  <td className="px-3 py-3.5 text-right font-mono text-[12px] text-[#8a8a8a]">
                    {(() => {
                      if (r.threshold <= BigInt(0)) return "—";
                      const eth = Number(formatEther(r.threshold));
                      if (!Number.isFinite(eth)) return "—";
                      if (eth < 0.001) return "<0.001 ETH";
                      if (eth >= 1000)
                        return `${eth.toLocaleString("en-US", { maximumFractionDigits: 0 })} ETH`;
                      return `${eth.toLocaleString("en-US", { maximumFractionDigits: 4 })} ETH`;
                    })()}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="inline-flex gap-1.5">
                      <a
                        href={`${EXPLORER}/token/${r.token}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-md border border-[#2a2a2a] px-2 py-1 font-mono text-[11px] text-[#8a8a8a] transition-colors hover:border-[#00ff66] hover:text-[#00ff66]"
                      >
                        TOKEN
                      </a>
                      <a
                        href={`${EXPLORER}/address/${r.curve}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-md border border-[#2a2a2a] px-2 py-1 font-mono text-[11px] text-[#8a8a8a] transition-colors hover:border-[#00ff66] hover:text-[#00ff66]"
                      >
                        CURVE
                      </a>
                    </div>
                  </td>
                </tr>
              );
            })}
            {loading && rows.length === 0 && !error && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center font-mono text-[12px] text-[#8a8a8a]">
                  INDEXING FACTORY EVENTS…
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && !error && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center font-mono text-[12px] text-[#8a8a8a]">
                  NO LAUNCHES FOUND IN RECENT BLOCKS.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="border-t border-[#2a2a2a] px-5 py-2.5 font-mono text-[10px] uppercase tracking-[1px] text-[#8a8a8a]">
        Factory: {FACTORY.slice(0, 10)}… // newest launches first // “Vurapad” = launched from this
        device // all data read onchain
      </div>
    </Card>
  );
}
