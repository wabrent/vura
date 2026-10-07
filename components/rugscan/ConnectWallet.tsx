"use client";

// Wagmi-powered connect button (injected browser wallet: MetaMask, Rabby…)
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { Wallet, LogOut } from "lucide-react";

export function ConnectWallet() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs text-[#00ff66] border border-[#00ff66]/40 bg-[#00ff66]/5 px-3 py-2 rounded">
          {address.slice(0, 6)}…{address.slice(-4)}
        </span>
        <button
          onClick={() => disconnect()}
          className="p-2 rounded border border-[#2a2a2a] text-zinc-400 hover:text-[#ff7700] hover:border-[#ff7700]/50 transition-colors"
          title="Disconnect"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => {
        const c = connectors[0];
        if (c) {
          connect({ connector: c });
          // account address is picked up by the form via useAccount in parent
        }
      }}
      disabled={isPending}
      className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider px-4 py-2 rounded
                 border border-[#00ff66]/50 text-[#00ff66] hover:bg-[#00ff66]/10
                 transition-colors disabled:opacity-50"
    >
      <Wallet className="w-4 h-4" />
      {isPending ? "Connecting…" : "Connect Wallet"}
    </button>
  );
}
