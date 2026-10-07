// ============================================================================
// VURA Rug Scanner — /api/scan
// Real ERC20 balances + metadata via Alchemy Enhanced API (no mocks).
//
// POST { address: "0x…", chain?: "<network id>" | "all" }
//   chain="all" (default) → scan every enabled EVM mainnet and aggregate.
//   chain="eth"|"base"|…   → scan a single network (15 tokens max).
// → { address, chain, total, returned, chainsScanned, chainsFailed, tokens }
// ============================================================================

import { NextResponse } from "next/server";
import { ALL_CHAINS, resolveChainParam } from "@/lib/rugscan/networks";
import type { NetworkDef } from "@/lib/rugscan/networks";
import type { TokenRisk } from "@/lib/rugscan/types";

export const dynamic = "force-dynamic";

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const SINGLE_CHAIN_MAX = 15; // detailed tokens for a one-chain scan
const ALL_PER_CHAIN_MAX = 5; // detailed tokens per chain in "all" mode
const ALL_GLOBAL_MAX = 75; // total detailed tokens in "all" mode
const BALANCE_CONCURRENCY = 10;
const METADATA_CONCURRENCY = 12;
const PRICE_CHUNK = 20;

interface AlchemyBalance {
  contractAddress: string;
  tokenBalance: string | null;
}

interface AlchemyMetadata {
  name?: string | null;
  symbol?: string | null;
  decimals?: number | null;
  logo?: string | null;
}

interface AggEntry {
  network: NetworkDef;
  contractAddress: string;
  tokenBalance: string;
}

/** Minimal JSON-RPC call helper (throws on HTTP or RPC-level errors). */
async function rpc(url: string, method: string, params: unknown[]): Promise<unknown> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => null)) as {
    result?: unknown;
    error?: { message?: string };
  } | null;
  if (!res.ok) {
    throw new Error(json?.error?.message || `Alchemy HTTP ${res.status}`);
  }
  if (json?.error) throw new Error(json.error.message || "Alchemy RPC error");
  return json?.result;
}

/** Run fn over items with a bounded number of parallel workers. */
async function pool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return results;
}

/** Convert a hex balance to a human number using the token's decimals. */
function hexToNumber(hex: string, decimals: number): number {
  try {
    const raw = BigInt(hex);
    const base = BigInt(10) ** BigInt(Math.max(0, Math.min(77, decimals)));
    if (base === BigInt(0)) return 0;
    const whole = raw / base;
    const frac = raw % base;
    return Number(whole) + Number(frac) / Number(base);
  } catch {
    return 0;
  }
}

/** Filter out zero / unparsable balances. */
function nonZeroBalances(all: AlchemyBalance[]): AlchemyBalance[] {
  const out: AlchemyBalance[] = [];
  for (const b of all) {
    if (!b?.contractAddress || !b.tokenBalance) continue;
    try {
      if (BigInt(b.tokenBalance) > BigInt(0)) out.push(b);
    } catch {
      /* unparsable hex → skip */
    }
  }
  return out;
}

/** Fetch USD prices for mixed-network entries (chunked, tolerant). */
async function fetchPrices(
  apiKey: string,
  entries: AggEntry[]
): Promise<Map<string, number>> {
  const priceMap = new Map<string, number>();
  for (let i = 0; i < entries.length; i += PRICE_CHUNK) {
    const chunk = entries.slice(i, i + PRICE_CHUNK);
    try {
      const res = await fetch(
        `https://api.g.alchemy.com/prices/v1/${apiKey}/tokens/by-address`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            addresses: chunk.map((e) => ({
              network: e.network.host,
              address: e.contractAddress,
            })),
          }),
          cache: "no-store",
        }
      );
      if (!res.ok) continue;
      const json = (await res.json()) as {
        data?: Array<{ address?: string; prices?: Array<{ value?: string }> }>;
      };
      for (const row of json.data ?? []) {
        if (!row?.address || !row.prices?.length) continue;
        const v = parseFloat(row.prices[0]?.value ?? "");
        if (isFinite(v)) priceMap.set(row.address.toLowerCase(), v);
      }
    } catch {
      /* chunk failed → those tokens keep priceUsd = null */
    }
  }
  return priceMap;
}

export async function POST(request: Request) {
  const apiKey = process.env.ALCHEMY_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ALCHEMY_API_KEY is not configured on the server" },
      { status: 500 }
    );
  }

  let payload: { address?: string; chain?: string } = {};
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const address = (payload.address ?? "").trim();
  const chain = (payload.chain ?? ALL_CHAINS).toLowerCase();

  if (!ADDRESS_RE.test(address)) {
    return NextResponse.json(
      { error: "Invalid address — expected 0x + 40 hex chars" },
      { status: 400 }
    );
  }

  const targets = resolveChainParam(chain);
  if (!targets) {
    return NextResponse.json({ error: `Unknown chain: ${chain}` }, { status: 400 });
  }

  const isAll = chain === ALL_CHAINS;
  const perChainMax = isAll ? ALL_PER_CHAIN_MAX : SINGLE_CHAIN_MAX;
  const globalMax = isAll ? ALL_GLOBAL_MAX : SINGLE_CHAIN_MAX;
  const rpcUrl = (host: string) => `https://${host}.g.alchemy.com/v2/${apiKey}`;

  try {
    // 1) Balances across all target chains (bounded concurrency).
    const collected: AggEntry[] = [];
    const failedChains: string[] = [];
    const chainErrors = new Map<string, string>();
    let totalNonZero = 0;

    await pool(targets, BALANCE_CONCURRENCY, async (network) => {
      try {
        const res = (await rpc(rpcUrl(network.host), "alchemy_getTokenBalances", [
          address,
          "erc20",
        ])) as { tokenBalances?: AlchemyBalance[] };
        const nonZero = nonZeroBalances(res?.tokenBalances ?? []);
        totalNonZero += nonZero.length;
        for (const b of nonZero.slice(0, perChainMax)) {
          collected.push({
            network,
            contractAddress: b.contractAddress,
            tokenBalance: b.tokenBalance as string,
          });
        }
      } catch (err) {
        failedChains.push(network.id);
        chainErrors.set(
          network.id,
          err instanceof Error ? err.message : "Alchemy RPC error"
        );
      }
    });

    // Single-chain scan of an unsupported network → explicit error,
    // NOT a fake "empty portfolio".
    if (!isAll && failedChains.length > 0) {
      return NextResponse.json(
        { error: chainErrors.get(failedChains[0]) || "Chain not supported" },
        { status: 502 }
      );
    }

    // 2) Detailed metadata for a bounded subset
    const detailed = collected.slice(0, globalMax);

    // 3) USD prices (mixed networks allowed in one batch)
    const priceMap = await fetchPrices(apiKey, detailed);

    // 4) Metadata + human balances + chain labels
    const tokens: TokenRisk[] = await pool(detailed, METADATA_CONCURRENCY, async (e) => {
      let meta: AlchemyMetadata = {};
      try {
        meta =
          ((await rpc(rpcUrl(e.network.host), "alchemy_getTokenMetadata", [
            e.contractAddress,
          ])) as AlchemyMetadata) ?? {};
      } catch {
        /* metadata failure → placeholder fields */
      }
      const decimals =
        typeof meta.decimals === "number" && meta.decimals >= 0 ? meta.decimals : 18;
      return {
        contractAddress: e.contractAddress,
        chain: e.network.label,
        name: (meta.name ?? "").trim() || "Unknown Token",
        symbol: (meta.symbol ?? "").trim() || "???",
        decimals,
        logo: meta.logo ?? null,
        balance: hexToNumber(e.tokenBalance, decimals),
        priceUsd: priceMap.get(e.contractAddress.toLowerCase()) ?? null,
      };
    });

    return NextResponse.json({
      address,
      chain,
      total: totalNonZero,
      returned: tokens.length,
      chainsScanned: targets.length - failedChains.length,
      chainsFailed: failedChains.length,
      failed: failedChains,
      tokens,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Alchemy request failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
