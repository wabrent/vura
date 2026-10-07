"use client";

// Site-wide top nav (same as home) — shared by standalone pages
// (scanner, vurapad) so users can always navigate back.

import { ConnectWallet } from "@/components/rugscan/ConnectWallet";

const LINKS: { href: string; key: string; label: string }[] = [
  { href: "/", key: "launch", label: "Launch" },
  { href: "/#tokenomics", key: "tokenomics", label: "Tokenomics" },
  { href: "/#roadmap", key: "roadmap", label: "Roadmap" },
  { href: "/terminal", key: "radar", label: "Radar" },
  { href: "/gallery", key: "gallery", label: "Gallery" },
  { href: "/mint", key: "mint", label: "Mint" },
  { href: "/scanner", key: "scanner", label: "Scanner" },
  { href: "/vurapad", key: "vurapad", label: "VuraPad" },
  { href: "/perps", key: "perps", label: "Perps" },
];

export function SiteNav({ active }: { active: string }) {
  return (
    <nav className="sticky top-0 z-50 flex items-center gap-2 border-b border-[#2a2a2a] bg-[#0a0a0a]/95 px-7 py-3.5 backdrop-blur">
      <a
        href="/"
        className="mr-6 flex items-baseline gap-0.5 whitespace-nowrap font-mono text-[22px] font-bold tracking-[2px] text-white [text-shadow:0_0_16px_rgba(0,255,102,0.25)]"
      >
        VURA<span className="text-[13px] font-normal tracking-[1px] text-[#8a8a8a] [text-shadow:none]">.genesis</span>
      </a>
      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
        {LINKS.map((l) => (
          <a
            key={l.key}
            href={l.href}
            className={
              "whitespace-nowrap rounded-lg px-4 py-[9px] text-[13px] font-semibold uppercase tracking-[1.5px] transition-colors " +
              (active === l.key
                ? "bg-[#161616] text-white shadow-[inset_0_0_0_1px_#2a2a2a]"
                : "text-[#8a8a8a] hover:bg-[#161616] hover:text-white")
            }
          >
            {l.label}
          </a>
        ))}
      </div>
      <ConnectWallet />
    </nav>
  );
}
