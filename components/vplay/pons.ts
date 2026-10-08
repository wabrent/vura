// pons v2 integration — Robinhood Chain #4663
// Factory: 0x7eD598...EC7e (same as /vurapad). Bonding curve → Uniswap v4 pool.
import { parseAbi, parseAbiItem, createPublicClient, http, type Address } from "viem";
import { robinhood, rpcUrl } from "@/lib/web3/config";

export const FACTORY = "0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e" as Address;
export const EXPLORER = "https://robinhoodchain.blockscout.com";
export const PONS_APP = "https://www.ponsfamily.com/launchpad";

export const client = createPublicClient({ chain: robinhood, transport: http(rpcUrl()) });

export const factoryAbi = parseAbi([
  "struct Socials { string twitter; string telegram; string discord; string website; string farcaster; }",
  "struct TokenParams { string name; string symbol; string logo; string description; Socials socials; address creatorFeeRecipient; uint16 creatorTaxBps; bool buybackEnabled; bytes32 expectedEconomics; bytes32 salt; }",
  "struct LaunchConfig { uint256 supply; uint256 curveFeeBps; uint256 phantomQuote; uint256 graduationThreshold; uint24 poolFee; int24 tickSpacing; bool enabled; }",
  "struct LaunchedToken { address token; address curve; address deployer; address creatorFeeRecipient; address pairToken; uint256 graduationThreshold; uint24 poolFee; int24 tickSpacing; uint16 creatorTaxBps; bool buybackEnabled; uint8 phase; uint256 sweptQuote; uint256 sweptTokens; uint256 sweptAt; bool exists; }",
  "function launchConfigCount() view returns (uint256)",
  "function getLaunchConfig(uint256 id) view returns (LaunchConfig)",
  "function launchToken(TokenParams params, uint256 launchConfigId, address pairToken) payable returns (address token, address curve)",
  "function previewLaunchEconomics(uint256 launchConfigId, address pairToken) view returns (bytes32)",
  "function launchFee() view returns (uint256)",
  "function maxCreatorTaxBps() view returns (uint256)",
  "function canLaunch(address account) view returns (bool)",
  "function getLaunchedToken(address token) view returns (LaunchedToken launched)",
  "event TokenLaunched(address indexed token, address indexed curve, address indexed deployer, address pairToken, uint256 launchConfigId, uint256 graduationThreshold)",
]);

export const curveAbi = parseAbi([
  "function getReserves() view returns (uint256 quoteReserve, uint256 tokenReserve)",
  "function realQuoteReserve() view returns (uint256)",
  "function graduationThreshold() view returns (uint256)",
  "function sellableTokens() view returns (uint256)",
  "function readyToGraduate() view returns (bool)",
  "function graduated() view returns (bool)",
  "function feeBps() view returns (uint256)",
  "function creatorTaxBps() view returns (uint256)",
  "function currentSnipeTaxBps(address recipient) view returns (uint256)",
  "function buy(uint256 quoteIn, uint256 minTokensOut, address recipient) payable returns (uint256 tokensOut)",
  "function pairToken() view returns (address)",
  "function isNativeQuote() view returns (bool)",
]);

export const tokenAbi = parseAbi([
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function logo() view returns (string)",
  "function description() view returns (string)",
  "function balanceOf(address) view returns (uint256)",
]);

export const TOKEN_LAUNCHED = parseAbiItem(
  "event TokenLaunched(address indexed token, address indexed curve, address indexed deployer, address pairToken, uint256 launchConfigId, uint256 graduationThreshold)"
);

/* ---------- description format for vurafy tracks ----------
   VURAFY | {artist} | audio: {url}
----------------------------------------------------------- */
export function buildDescription(artist: string, audioUrl: string) {
  return `VURAFY | ${artist} | audio: ${audioUrl}`;
}
export function parseDescription(desc: string): { isVplay: boolean; artist: string; audio: string } {
  const parts = desc.split("|").map((p) => p.trim());
  if (parts[0] !== "VURAFY") return { isVplay: false, artist: "", audio: "" };
  return {
    isVplay: true,
    artist: parts[1] || "",
    audio: (parts[2] || "").replace(/^audio:\s*/i, ""),
  };
}

export type Track = {
  token: Address;
  curve: Address;
  deployer: Address;
  name: string;
  symbol: string;
  logo: string;
  artist: string;
  audio: string;
  priceEth: number;        // ETH за 1 токен (маржинальная цена кривой)
  totalSupply: bigint;
  available: bigint;       // sellableTokens
  progress: number;        // 0..1 к graduation
  graduated: boolean;
  creatorTaxBps: number;
  isDemo?: boolean;
};

export type LaunchLog = {
  token: Address;
  curve: Address;
  deployer: Address;
  pairToken: Address;
  launchConfigId: bigint;
  graduationThreshold: bigint;
};

/* ---------- quote math (curve's own integer order, per docs) ---------- */
const BPS = 10_000n;
const ceilDiv = (a: bigint, b: bigint) => (a + b - 1n) / b;

function amountOut(inAmount: bigint, reserveIn: bigint, reserveOut: bigint) {
  return (inAmount * reserveOut) / (reserveIn + inAmount);
}

export type Quote = { tokensOut: bigint; spent: bigint; refund: bigint; feeBps: bigint; creatorTaxBps: bigint; snipeBps: bigint };

export async function quoteBuy(curve: Address, quoteIn: bigint, recipient: Address): Promise<Quote> {
  const read = <T extends string>(functionName: T, args?: readonly unknown[]) =>
    client.readContract({ address: curve, abi: curveAbi, functionName, args } as never);

  const [reserves, sellable, feeBps, creatorTaxBps, rawSnipeBps] = await Promise.all([
    read("getReserves"),
    read("sellableTokens"),
    read("feeBps"),
    read("creatorTaxBps"),
    read("currentSnipeTaxBps", [recipient]),
  ]);
  const [quoteReserve, tokenReserve] = reserves as readonly [bigint, bigint];
  let snipeBps = rawSnipeBps as bigint;
  const fee = feeBps as bigint;
  const cTax = creatorTaxBps as bigint;
  if (snipeBps > 0n) {
    const maxSnipeBps = BPS - fee - cTax - 100n;
    if (snipeBps > maxSnipeBps) snipeBps = maxSnipeBps > 0n ? maxSnipeBps : 0n;
  }

  let spent = quoteIn;
  const f = (spent * fee) / BPS;
  const tax = (spent * cTax) / BPS;
  const snipeTax = (spent * snipeBps) / BPS;
  let tokensOut = amountOut(spent - f - tax - snipeTax, quoteReserve, tokenReserve);

  const sellableAmt = sellable as bigint;
  if (tokensOut > sellableAmt) {
    tokensOut = sellableAmt;
    const net = amountIn(sellableAmt, quoteReserve, tokenReserve);
    const grossed = ceilDiv(net * BPS, BPS - fee - cTax - snipeBps);
    spent = grossed < quoteIn ? grossed : quoteIn;
  }
  return { tokensOut, spent, refund: quoteIn - spent, feeBps: fee, creatorTaxBps: cTax, snipeBps };
}

function amountIn(outAmount: bigint, reserveIn: bigint, reserveOut: bigint) {
  return (outAmount * reserveIn) / (reserveOut - outAmount) + 1n;
}

/* ---------- track loading ---------- */
export async function loadTrack(l: LaunchLog): Promise<Track | null> {
  try {
    const [name, symbol, logo, desc, totalSupply, reserves, sellable, raised, threshold, graduated, launched] =
      await Promise.all([
        client.readContract({ address: l.token, abi: tokenAbi, functionName: "name" }),
        client.readContract({ address: l.token, abi: tokenAbi, functionName: "symbol" }),
        client.readContract({ address: l.token, abi: tokenAbi, functionName: "logo" }).catch(() => ""),
        client.readContract({ address: l.token, abi: tokenAbi, functionName: "description" }),
        client.readContract({ address: l.token, abi: tokenAbi, functionName: "totalSupply" }),
        client.readContract({ address: l.curve, abi: curveAbi, functionName: "getReserves" }),
        client.readContract({ address: l.curve, abi: curveAbi, functionName: "sellableTokens" }),
        client.readContract({ address: l.curve, abi: curveAbi, functionName: "realQuoteReserve" }),
        client.readContract({ address: l.curve, abi: curveAbi, functionName: "graduationThreshold" }),
        client.readContract({ address: l.curve, abi: curveAbi, functionName: "graduated" }).catch(() => false),
        client.readContract({ address: FACTORY, abi: factoryAbi, functionName: "getLaunchedToken", args: [l.token] }).catch(() => null),
      ]);
    const parsed = parseDescription(desc as string);
    if (!parsed.isVplay) return null;
    const [qRes, tRes] = reserves as readonly [bigint, bigint];
    const priceEth = tRes > 0n ? Number(qRes) / Number(tRes) : 0;
    const thr = threshold as bigint;
    const prog = thr > 0n ? Math.min(1, Number(raised as bigint) / Number(thr)) : 0;
    const lt = launched as { creatorTaxBps: number; phase: number } | null;
    return {
      token: l.token,
      curve: l.curve,
      deployer: l.deployer,
      name: name as string,
      symbol: symbol as string,
      logo: logo as string,
      artist: parsed.artist,
      audio: parsed.audio,
      priceEth,
      totalSupply: totalSupply as bigint,
      available: sellable as bigint,
      progress: prog,
      graduated: (graduated as boolean) || (lt ? lt.phase >= 2 : false),
      creatorTaxBps: lt ? Number(lt.creatorTaxBps) : 0,
    };
  } catch {
    return null;
  }
}

const CHUNK = 1_000_000n;
const MAX_CHUNKS = 15;
const TARGET_LOGS = 60;

export async function discoverLaunches(): Promise<LaunchLog[]> {
  const latest = await client.getBlockNumber();
  const collected: LaunchLog[] = [];
  let to = latest;
  let emptyStreak = 0;
  for (let i = 0; i < MAX_CHUNKS && collected.length < TARGET_LOGS; i++) {
    const from = to - CHUNK < BigInt(0) ? BigInt(0) : to - CHUNK;
    const logs = await client.getLogs({ address: FACTORY, event: TOKEN_LAUNCHED, fromBlock: from, toBlock: to });
    if (logs.length === 0) {
      emptyStreak += 1;
      if (emptyStreak >= 2) break;
    } else {
      emptyStreak = 0;
      for (const lg of logs) {
        const a = lg.args as { token?: Address; curve?: Address; deployer?: Address; pairToken?: Address; launchConfigId?: bigint; graduationThreshold?: bigint };
        if (a.token && a.curve) {
          collected.push({ token: a.token, curve: a.curve, deployer: a.deployer ?? "0x", pairToken: a.pairToken ?? "0x", launchConfigId: a.launchConfigId ?? 0n, graduationThreshold: a.graduationThreshold ?? 0n });
        }
      }
    }
    if (from === BigInt(0)) break;
    to = from - BigInt(1);
  }
  collected.reverse(); // старые → новые
  return collected;
}

export async function discoverVplayTracks(): Promise<Track[]> {
  const logs = await discoverLaunches();
  const tracks: Track[] = [];
  for (const l of logs) {
    const t = await loadTrack(l);
    if (t) tracks.push(t);
    if (tracks.length >= 30) break;
  }
  return tracks;
}

export async function walletBalances(tokens: Address[], who: Address): Promise<Record<string, bigint>> {
  const out: Record<string, bigint> = {};
  await Promise.all(
    tokens.map(async (t) => {
      try {
        out[t.toLowerCase()] = await client.readContract({ address: t, abi: tokenAbi, functionName: "balanceOf", args: [who] });
      } catch {
        out[t.toLowerCase()] = 0n;
      }
    })
  );
  return out;
}

export const VPLAY_SOCIALS = { twitter: "", telegram: "", discord: "", website: "", farcaster: "" };
