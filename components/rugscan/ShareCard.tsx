"use client";

// ============================================================================
// ShareCard — the sleek neon "degradation report" card.
// This exact node is converted to a PNG via html-to-image on share.
// ============================================================================
import { forwardRef } from "react";
import type { ScanResult } from "@/lib/rugscan/types";
import { scoreColor } from "@/lib/rugscan/score";

interface ShareCardProps {
  result: ScanResult;
}

export const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(
  function ShareCard({ result }, ref) {
    const { score, verdict, tokens, address, scannedAt } = result;
    const unidentified = tokens.filter((t) => !t.logo && t.priceUsd == null).length;
    const color = scoreColor(score);

    return (
      <div
        ref={ref}
        style={{ backgroundColor: "#0a0a0a", fontFamily: '"Courier New", Courier, monospace' }}
        className="relative w-full max-w-[640px] overflow-hidden rounded-lg
                   border-2 p-6 select-none"
        // glow frame follows the score severity
        data-card="share"
      >
        {/* neon frame color set inline so html-to-image captures it */}
        <div
          className="pointer-events-none absolute inset-0 rounded-lg"
          style={{ boxShadow: `inset 0 0 40px ${color}22, 0 0 30px ${color}33`, borderColor: color }}
        />
        {/* CRT scanlines */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "repeating-linear-gradient(0deg, transparent 0 2px, rgba(0,0,0,0.35) 2px 3px)",
          }}
        />

        {/* Header bar */}
        <div className="relative flex items-center justify-between text-[11px] tracking-[0.25em] uppercase mb-5">
          <span style={{ color }} className="font-bold">
            VURA // Rug Scanner
          </span>
          <span className="text-zinc-500">Degradation Report</span>
        </div>

        {/* Address */}
        <div className="relative text-[11px] text-zinc-500 mb-4 break-all">
          TARGET: <span className="text-zinc-300">{address}</span>
        </div>

        {/* Score + verdict */}
        <div className="relative flex items-end gap-5 mb-4">
          <div
            className="font-bold leading-none"
            style={{ color, fontSize: 96, textShadow: `0 0 24px ${color}99` }}
          >
            {score}
          </div>
          <div className="pb-2">
            <div className="text-zinc-600 text-sm font-bold">/10</div>
            <div
              className="text-xl font-bold uppercase tracking-widest"
              style={{ color, textShadow: `0 0 14px ${color}77` }}
            >
              {verdict.title}
            </div>
          </div>
          {/* VURA emblem (Genesis Pass #001) */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/genesis/1.png"
            alt="VURA emblem"
            width={104}
            height={104}
            className="ml-auto w-[104px] h-[104px] rounded-md border shrink-0"
            style={{ borderColor: `${color}55`, boxShadow: `0 0 18px ${color}33` }}
          />
        </div>

        {/* Brutal one-liner */}
        <p className="relative text-zinc-300 text-sm italic leading-relaxed mb-6 border-l-2 pl-3"
           style={{ borderColor: `${color}66` }}>
          “{verdict.oneLiner}”
        </p>

        {/* Footer stats */}
        <div className="relative flex justify-between text-[10px] uppercase tracking-widest text-zinc-500 border-t border-[#2a2a2a] pt-3">
          <span>Tokens scanned: <span className="text-zinc-300">{tokens.length}</span></span>
          <span>No price/logo: <span style={{ color: unidentified ? "#ff7700" : "#00ff66" }}>{unidentified}</span></span>
          <span>{new Date(scannedAt).toISOString().slice(0, 10)}</span>
        </div>
      </div>
    );
  }
);
