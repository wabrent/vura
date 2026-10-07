"use client";

// ============================================================================
// Launch — native token launch via the pons v2 factory on Robinhood Chain.
// All reads/writes are onchain; terms are pinned via previewLaunchEconomics.
// ============================================================================

import { useEffect, useRef, useState } from "react";
import {
  useAccount,
  usePublicClient,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { decodeEventLog, formatEther, parseAbi, toHex, zeroAddress } from "viem";
import type { RepoSource } from "./DiscoverPanel";
import { robinhood } from "@/lib/web3/config";
import { Card, Field, inputCls, btnPrimary, btnAccent, alertCls } from "./ui";
import { recordDeviceLaunch } from "./TokensPanel";

const FACTORY = "0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e" as const;
const EXPLORER = "https://robinhoodchain.blockscout.com";

const factoryAbi = parseAbi([
  "struct Socials { string twitter; string telegram; string discord; string website; string farcaster; }",
  "struct TokenParams { string name; string symbol; string logo; string description; Socials socials; address creatorFeeRecipient; uint16 creatorTaxBps; bool buybackEnabled; bytes32 expectedEconomics; bytes32 salt; }",
  "struct LaunchConfig { uint256 supply; uint256 curveFeeBps; uint256 phantomQuote; uint256 graduationThreshold; uint24 poolFee; int24 tickSpacing; bool enabled; }",
  "function launchConfigCount() view returns (uint256)",
  "function getLaunchConfig(uint256 id) view returns (LaunchConfig)",
  "function launchToken(TokenParams params, uint256 launchConfigId, address pairToken) payable returns (address token, address curve)",
  "function previewLaunchEconomics(uint256 launchConfigId, address pairToken) view returns (bytes32)",
  "function launchFee() view returns (uint256)",
  "function maxCreatorTaxBps() view returns (uint256)",
  "function canLaunch(address account) view returns (bool)",
  "event TokenLaunched(address indexed token, address indexed curve, address indexed deployer, address pairToken, uint256 launchConfigId, uint256 graduationThreshold)",
]);

type LaunchConfig = {
  id: bigint;
  supply: bigint;
  curveFeeBps: bigint;
  graduationThreshold: bigint;
  enabled: boolean;
};

type Phase = "idle" | "pinning" | "signing" | "mining" | "done";

function deriveSymbol(name: string): string {
  const alpha = name.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  return (alpha || "TOKEN").slice(0, 6);
}

export function LaunchPanel({
  source,
  discoverOpen,
  onToggleDiscover,
  onClearSource,
}: {
  source: RepoSource | null;
  discoverOpen: boolean;
  onToggleDiscover: () => void;
  onClearSource: () => void;
}) {
  const { address, chainId, isConnected } = useAccount();
  const publicClient = usePublicClient({ chainId: robinhood.id });
  const { switchChain } = useSwitchChain();
  const {
    writeContract,
    data: txHash,
    isPending: isSigning,
    error: writeError,
    reset: resetWrite,
  } = useWriteContract();
  const { data: receipt, isLoading: isMining } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // form
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [logo, setLogo] = useState("");
  const [description, setDescription] = useState("");
  const [twitter, setTwitter] = useState("");
  const [telegram, setTelegram] = useState("");
  const [website, setWebsite] = useState("");
  const [creatorTaxBps, setCreatorTaxBps] = useState("0");
  const [buybackEnabled, setBuybackEnabled] = useState(false);
  const [configId, setConfigId] = useState("0");
  const [feeRecipient, setFeeRecipient] = useState("");

  // chain state
  const [configs, setConfigs] = useState<LaunchConfig[]>([]);
  const [launchFee, setLaunchFee] = useState<bigint | null>(null);
  const [maxTaxBps, setMaxTaxBps] = useState<number | null>(null);
  const [gateOpen, setGateOpen] = useState<boolean | null>(null);
  const [chainError, setChainError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [launched, setLaunched] = useState<{ token: string; curve: string } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([
    "> VURAPAD LAUNCH TERMINAL // PONS V2 FACTORY",
  ]);
  const logRef = useRef<HTMLDivElement>(null);

  function pushLog(line: string) {
    setLog((l) => [...l.slice(-60), line]);
  }

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [log]);

  // read factory state
  useEffect(() => {
    if (!publicClient) return;
    let alive = true;
    (async () => {
      try {
        const count = await publicClient.readContract({
          address: FACTORY,
          abi: factoryAbi,
          functionName: "launchConfigCount",
        });
        const rows = await Promise.all(
          Array.from({ length: Number(count) }, (_, id) =>
            publicClient.readContract({
              address: FACTORY,
              abi: factoryAbi,
              functionName: "getLaunchConfig",
              args: [BigInt(id)],
            }).then((c) => ({ id: BigInt(id), ...c }))
          )
        );
        if (!alive) return;
        const open = rows.filter((r) => r.enabled);
        setConfigs(open);
        if (open.length > 0) setConfigId(String(open[0].id));
        pushLog(`> CONFIGS LOADED: ${open.length} OPEN / ${Number(count)} TOTAL`);
      } catch {
        if (alive) {
          setChainError("FACTORY READ FAILED — RPC DEGRADED, RETRY LATER");
          pushLog("! FACTORY READ FAILED");
        }
      }
      try {
        const [fee, maxTax] = await Promise.all([
          publicClient.readContract({
            address: FACTORY,
            abi: factoryAbi,
            functionName: "launchFee",
          }),
          publicClient.readContract({
            address: FACTORY,
            abi: factoryAbi,
            functionName: "maxCreatorTaxBps",
          }),
        ]);
        if (!alive) return;
        setLaunchFee(fee);
        setMaxTaxBps(Number(maxTax));
        pushLog(`> LAUNCH FEE: ${formatEther(fee)} ETH // MAX TAX: ${Number(maxTax) / 100}%`);
      } catch {
        /* keep null */
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicClient]);

  // gate check per wallet
  useEffect(() => {
    if (!publicClient || !address) {
      setGateOpen(null);
      return;
    }
    let alive = true;
    publicClient
      .readContract({
        address: FACTORY,
        abi: factoryAbi,
        functionName: "canLaunch",
        args: [address],
      })
      .then((ok) => alive && setGateOpen(ok))
      .catch(() => alive && setGateOpen(null));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicClient, address]);

  // auto-fill from adopted source
  useEffect(() => {
    if (!source) return;
    const clean = source.full_name.split("/").pop() || source.full_name;
    const pretty = clean.replace(/[-_]/g, " ").trim();
    setName(pretty.slice(0, 32));
    setSymbol(deriveSymbol(pretty));
    if (!twitter) setTwitter("");
    generateBrief();
    pushLog(`> SOURCE ADOPTED: ${source.full_name}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

  function generateBrief() {
    if (!source) return;
    const parts = [
      `${source.description || source.full_name}.`,
      `Open-source ${source.language || "multi-language"} project ★ ${source.stargazers_count} on GitHub (${source.full_name}).`,
      source.topics.length ? `Themes: ${source.topics.slice(0, 5).join(", ")}.` : "",
      "Native launch on Robinhood Chain via pons v2 — curve trading, graduated into a permanently locked Uniswap v4 pool.",
    ].filter(Boolean);
    const brief = parts.join(" ").replace(/https?:\/\/\S+/g, "").slice(0, 500);
    setDescription(brief);
    pushLog("> AI BRIEF GENERATED LOCALLY");
  }

  const onWrongChain = isConnected && chainId !== robinhood.id;
  const numTax = Number(creatorTaxBps) || 0;
  const symbolOk = /^[A-Za-z0-9]{2,10}$/.test(symbol);
  const nameOk = name.trim().length > 0 && name.length <= 32;
  const taxOk = maxTaxBps === null || numTax <= maxTaxBps;
  const canSubmit =
    isConnected &&
    !onWrongChain &&
    gateOpen !== false &&
    nameOk &&
    symbolOk &&
    taxOk &&
    configs.length > 0 &&
    (phase === "idle" || phase === "done");

  async function launch() {
    if (!publicClient) return;
    setFormError(null);
    if (!nameOk) return setFormError("NAME: 1–32 CHARS REQUIRED");
    if (!symbolOk) return setFormError("SYMBOL: 2–10 ALPHANUMERIC CHARS");
    if (!taxOk) return setFormError(`CREATOR TAX EXCEEDS PROTOCOL CAP (${maxTaxBps} BPS)`);
    if (description.length > 500) return setFormError("BRIEF TOO LONG (MAX 500)");

    try {
      setPhase("pinning");
      resetWrite();
      setLaunched(null);
      const pairToken = zeroAddress;
      const salt = toHex(crypto.getRandomValues(new Uint8Array(32)));
      const [expectedEconomics, fee] = await Promise.all([
        publicClient.readContract({
          address: FACTORY,
          abi: factoryAbi,
          functionName: "previewLaunchEconomics",
          args: [BigInt(configId), pairToken],
        }),
        launchFee !== null
          ? Promise.resolve(launchFee)
          : publicClient.readContract({
              address: FACTORY,
              abi: factoryAbi,
              functionName: "launchFee",
            }),
      ]);
      pushLog(`> ECONOMICS PINNED: ${expectedEconomics.slice(0, 10)}…`);

      setPhase("signing");
      pushLog(`> AWAITING SIGNATURE // SALT ${salt.slice(0, 10)}…`);
      writeContract(
        {
          address: FACTORY,
          abi: factoryAbi,
          functionName: "launchToken",
          args: [
            {
              name: name.trim(),
              symbol: symbol.toUpperCase(),
              logo: logo.trim(),
              description,
              socials: {
                twitter: twitter.trim(),
                telegram: telegram.trim(),
                discord: "",
                website: website.trim(),
                farcaster: "",
              },
              creatorFeeRecipient:
                feeRecipient.trim() && /^0x[a-fA-F0-9]{40}$/.test(feeRecipient.trim())
                  ? (feeRecipient.trim() as `0x${string}`)
                  : zeroAddress,
              creatorTaxBps: numTax,
              buybackEnabled,
              expectedEconomics,
              salt,
            } as const,
            BigInt(configId),
            pairToken,
          ],
          value: fee,
          chainId: robinhood.id,
        },
        {
          onError: (err) => {
            setPhase("idle");
            pushLog(`! ${err.message.split("\n")[0].slice(0, 140)}`);
          },
        }
      );
    } catch (err) {
      setPhase("idle");
      pushLog(`! ${(err as Error).message.slice(0, 140)}`);
    }
  }

  // signature accepted → mining
  useEffect(() => {
    if (txHash && phase === "signing") {
      setPhase("mining");
      pushLog(`> TX SENT: ${txHash.slice(0, 18)}…`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txHash]);

  // receipt → decode TokenLaunched
  useEffect(() => {
    if (!receipt || phase !== "mining") return;
    if (receipt.status !== "success") {
      setPhase("idle");
      pushLog("! TX REVERTED");
      return;
    }
    for (const logItem of receipt.logs) {
      if (logItem.address.toLowerCase() !== FACTORY.toLowerCase()) continue;
      try {
        const decoded = decodeEventLog({
          abi: factoryAbi,
          data: logItem.data,
          topics: logItem.topics,
        });
        if (decoded.eventName === "TokenLaunched") {
          const args = decoded.args as { token: `0x${string}`; curve: `0x${string}` };
          setLaunched({ token: args.token, curve: args.curve });
          recordDeviceLaunch({
            token: args.token,
            curve: args.curve,
            tx: receipt.transactionHash,
            ts: Date.now(),
          });
          setPhase("done");
          pushLog(`> TOKEN LIVE: ${args.token}`);
          pushLog(`> CURVE: ${args.curve}`);
          return;
        }
      } catch {
        /* not our event */
      }
    }
    setPhase("done");
    pushLog("> TX CONFIRMED (EVENT NOT DECODED — RESOLVE VIA getLaunchedToken)");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receipt]);

  useEffect(() => {
    if (writeError) {
      pushLog(`! ${writeError.message.split("\n")[0].slice(0, 140)}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [writeError]);

  const busy = phase === "pinning" || phase === "signing" || phase === "mining" || isSigning || isMining;

  const label = !isConnected
    ? "CONNECT WALLET (HEADER)"
    : onWrongChain
      ? "SWITCH TO ROBINHOOD CHAIN"
      : gateOpen === false
        ? "LAUNCH GATE CLOSED — NOT WHITELISTED"
        : phase === "pinning"
          ? "PINNING ECONOMICS…"
          : phase === "signing"
            ? "AWAITING WALLET…"
            : phase === "mining"
              ? "MINING…"
              : phase === "done"
                ? "LAUNCH ANOTHER"
                : "🚀 LAUNCH TOKEN";

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      {/* FORM */}
      <Card
        title="Create // Pons V2 Factory"
        meta={
          <span className="rounded-md border border-[#00ff66]/40 bg-[#00ff66]/10 px-2 py-1 font-mono text-[10px] uppercase tracking-[1px] text-[#00ff66]">
            Robinhood 4663
          </span>
        }
      >
        <div className="space-y-4 p-5">
          {chainError && <div className={alertCls}>! {chainError}</div>}

          {/* source bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#2a2a2a] bg-[#0a0a0a] px-4 py-3">
            {source ? (
              <div className="flex min-w-0 flex-wrap items-center gap-2.5">
                <span className="font-mono text-[10px] uppercase tracking-[1.5px] text-[#8a8a8a]">Source</span>
                <a
                  href={source.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate font-mono text-[13px] font-semibold text-[#00ff66] hover:underline"
                >
                  {source.full_name}
                </a>
                <span className="rounded-md border border-[#2a2a2a] bg-[#161616] px-2 py-0.5 font-mono text-[10px] text-[#8a8a8a]">
                  ★ {source.stargazers_count}
                </span>
                {source.language && (
                  <span className="rounded-md border border-[#2a2a2a] bg-[#161616] px-2 py-0.5 font-mono text-[10px] text-[#8a8a8a]">
                    {source.language}
                  </span>
                )}
                <button
                  onClick={onClearSource}
                  className="rounded-md px-2 py-0.5 font-mono text-[12px] text-[#8a8a8a] transition-colors hover:bg-[#ff7700]/10 hover:text-[#ff7700]"
                  title="Clear source"
                >
                  [X]
                </button>
              </div>
            ) : (
              <span className="text-[13px] text-[#8a8a8a]">
                Fill the form manually — or connect a GitHub repo as the token source.
              </span>
            )}
            <button onClick={onToggleDiscover} className={btnAccent + " shrink-0"}>
              {discoverOpen ? "✕ Close search" : source ? "⌥ Change source" : "⌥ Connect source (GitHub)"}
            </button>
          </div>
          {/* identity */}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="TOKEN NAME *">
              <input value={name} onChange={(e) => setName(e.target.value.slice(0, 32))}
                className={inputCls} placeholder="Polyedge" />
            </Field>
            <Field label="SYMBOL *">
              <input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase().slice(0, 10))}
                className={inputCls} placeholder="PLDG" />
            </Field>
          </div>

          <Field label="LOGO URL (HTTPS / IPFS)">
            <input value={logo} onChange={(e) => setLogo(e.target.value)}
              className={inputCls} placeholder="ipfs://… or https://…" />
          </Field>

          {/* brief */}
          <Field label={`Brief // Description (max 500, no links)`} right={
            source ? (
              <button onClick={generateBrief}
                className="rounded-md border border-[#00ff66]/40 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[1px] text-[#00ff66] transition-colors hover:bg-[#00ff66] hover:text-[#06110a]">
                ⚡ Generate brief
              </button>
            ) : (
              <button onClick={onToggleDiscover} className="rounded-md border border-[#00ff66]/40 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[1px] text-[#00ff66] transition-colors hover:bg-[#00ff66] hover:text-[#06110a]">
                ⌥ Connect source
              </button>
            )
          }>
            <textarea value={description} onChange={(e) => setDescription(e.target.value.slice(0, 500))}
              rows={4} className={inputCls + " resize-none"} placeholder="What is this token…" />
            <div className="mt-1 text-right font-mono text-[10px] text-[#8a8a8a]">{description.length}/500</div>
          </Field>

          {/* socials */}
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="TWITTER/X">
              <input value={twitter} onChange={(e) => setTwitter(e.target.value)} className={inputCls} placeholder="@handle" />
            </Field>
            <Field label="TELEGRAM">
              <input value={telegram} onChange={(e) => setTelegram(e.target.value)} className={inputCls} placeholder="@channel" />
            </Field>
            <Field label="WEBSITE">
              <input value={website} onChange={(e) => setWebsite(e.target.value)} className={inputCls} placeholder="https://…" />
            </Field>
          </div>

          {/* economics */}
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="LAUNCH CONFIG *">
              <select value={configId} onChange={(e) => setConfigId(e.target.value)} className={inputCls}>
                {configs.length === 0 && <option className="bg-[#111] text-white" value="">— NO CONFIGS —</option>}
                {configs.map((c) => (
                  <option key={String(c.id)} value={String(c.id)} className="bg-[#111] text-white">
                    #{String(c.id)} — {(Number(c.supply) / 1e18).toLocaleString()} SUPPLY
                  </option>
                ))}
              </select>
            </Field>
            <Field label={`CREATOR TAX (BPS, CAP ${maxTaxBps ?? "…"} = ${((maxTaxBps ?? 0) / 100)}%)`}>
              <input value={creatorTaxBps} inputMode="numeric"
                onChange={(e) => setCreatorTaxBps(e.target.value.replace(/\D/g, "").slice(0, 5))}
                className={inputCls} placeholder="0" />
            </Field>
            <Field label="FEE RECIPIENT (EMPTY = WALLET)">
              <input value={feeRecipient} onChange={(e) => setFeeRecipient(e.target.value)}
                className={inputCls} placeholder="0x…" />
            </Field>
          </div>

          <label className="flex cursor-pointer select-none items-center gap-2.5 text-[13px] text-[#8a8a8a] transition-colors hover:text-white">
            <input type="checkbox" checked={buybackEnabled} onChange={(e) => setBuybackEnabled(e.target.checked)}
              className="h-4 w-4 accent-[#00ff66]" />
            Buyback enabled — route part of creator fees into buybacks (5y vesting)
          </label>

          {/* config detail */}
          {configs.length > 0 && (() => {
            const c = configs.find((x) => String(x.id) === configId) || configs[0];
            return (
              <div className="space-y-1 rounded-lg border border-[#2a2a2a] bg-[#0a0a0a] p-3.5 font-mono text-[11px] leading-relaxed text-[#8a8a8a]">
                <div>
                  SUPPLY: <span className="text-white">{(Number(c.supply) / 1e18).toLocaleString()}</span> {"//"} CURVE FEE:{" "}
                  <span className="text-white">{Number(c.curveFeeBps) / 100}%</span>
                </div>
                <div>
                  GRADUATION: <span className="text-[#00ff66]">{formatEther(c.graduationThreshold)} ETH</span> PAIR {"//"} POOL: UNISWAP
                  V4, LIQ LOCKED FOREVER
                </div>
                <div>
                  LAUNCH FEE:{" "}
                  <span className="text-[#00ff66]">{launchFee !== null ? `${formatEther(launchFee)} ETH` : "…"}</span> {"//"} GATE:{" "}
                  <span className={gateOpen === false ? "text-[#ff7700]" : "text-[#00ff66]"}>
                    {gateOpen === null ? (isConnected ? "…" : "N/A") : gateOpen ? "OPEN" : "CLOSED"}
                  </span>
                </div>
              </div>
            );
          })()}

          {formError && <div className={alertCls}>! {formError}</div>}

          <button
            onClick={() => {
              if (onWrongChain) switchChain({ chainId: robinhood.id });
              else if (canSubmit) launch();
            }}
            disabled={busy || (!onWrongChain && !canSubmit)}
            className={btnPrimary + " w-full py-3.5 text-sm"}
          >
            {label}
          </button>

          {/* success */}
          {launched && (
            <div className="space-y-2 rounded-xl border border-[#00ff66] bg-[#00ff66]/10 p-4">
              <div className="font-mono text-[13px] font-bold uppercase tracking-[1.5px] text-[#00ff66]">
                ✔ Launch confirmed — {symbol}
              </div>
              <div className="break-all font-mono text-[12px] text-white">
                TOKEN:{" "}
                <a className="text-[#00ff66] underline underline-offset-2 hover:text-[#33ff88]" target="_blank" rel="noopener noreferrer"
                  href={`${EXPLORER}/token/${launched.token}`}>{launched.token}</a>
              </div>
              <div className="break-all font-mono text-[12px] text-white">
                CURVE:{" "}
                <a className="text-[#00ff66] underline underline-offset-2 hover:text-[#33ff88]" target="_blank" rel="noopener noreferrer"
                  href={`${EXPLORER}/address/${launched.curve}`}>{launched.curve}</a>
              </div>
              <div className="text-[13px] text-[#8a8a8a]">
                Buy/sell live on the curve — graduates automatically into a locked v4 pool.
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* LOG */}
      <Card
        title="TX Log // Signed Onchain"
        meta={
          <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[1px] text-[#00ff66]">
            <span className="vp-blink">●</span> Live
          </span>
        }
        bodyClass="flex flex-col"
      >
        <div
          ref={logRef}
          className="max-h-[520px] min-h-[240px] flex-1 space-y-1 overflow-y-auto bg-[#050505] p-4 font-mono text-[11px] leading-relaxed"
        >
          {log.map((line, i) => (
            <div key={i} className={line.startsWith("!") ? "text-[#ff7700]" : "text-[#00ff66]/80"}>
              {line}
            </div>
          ))}
        </div>
        <div className="border-t border-[#2a2a2a] px-4 py-2.5 font-mono text-[10px] uppercase tracking-[1px] text-[#8a8a8a]">
          Every step is your wallet signing onchain. Pons never custodies funds.
        </div>
      </Card>
    </div>
  );
}
