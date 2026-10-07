"use client";

// Shared VuraPad UI atoms — styled to match the vura.ink home design language
// (dark surfaces #0a0a0a/#111/#161616, line #2a2a2a, white fg, green accent).

import type { ReactNode } from "react";

export const inputCls =
  "w-full rounded-lg border border-[#2a2a2a] bg-[#0a0a0a] px-3 py-2.5 text-sm text-white " +
  "font-mono placeholder:text-[#8a8a8a]/50 focus:outline-none focus:border-[#00ff66] transition-colors";

export const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-[10px] border border-[#00ff66] bg-[#00ff66] " +
  "px-5 py-2.5 font-mono text-[13px] font-bold uppercase tracking-[1.5px] text-[#06110a] " +
  "transition-all hover:bg-[#33ff88] hover:border-[#33ff88] hover:shadow-[0_0_22px_rgba(0,255,102,0.35)] " +
  "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:bg-[#00ff66]";

export const btnGhost =
  "inline-flex items-center justify-center gap-2 rounded-[10px] border border-[#2a2a2a] bg-[#111] " +
  "px-4 py-2 font-mono text-[12px] font-bold uppercase tracking-[1.5px] text-white " +
  "transition-colors hover:border-[#444] hover:bg-[#161616] disabled:opacity-40";

export const btnAccent =
  "inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#00ff66]/50 bg-[#00ff66]/10 " +
  "px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[1.5px] text-[#00ff66] " +
  "transition-colors hover:bg-[#00ff66] hover:text-[#06110a] disabled:opacity-40";

export const pillCls =
  "inline-flex items-center gap-1.5 rounded-lg border border-[#2a2a2a] bg-[#161616] px-3 py-1.5 " +
  "font-mono text-[11px] uppercase tracking-[1px] text-[#8a8a8a]";

export const pillGreenCls =
  "inline-flex items-center gap-1.5 rounded-lg border border-[#00ff66] bg-[#00ff66]/10 px-3 py-1.5 " +
  "font-mono text-[11px] uppercase tracking-[1px] text-[#00ff66]";

export const alertCls =
  "rounded-lg border border-[#ff7700]/50 bg-[#ff7700]/10 px-3 py-2 font-mono text-[12px] text-[#ff7700]";

export function Card({
  title,
  meta,
  children,
  bodyClass = "",
}: {
  title: string;
  meta?: ReactNode;
  children: ReactNode;
  bodyClass?: string;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-[#2a2a2a] bg-[#111]">
      <header className="flex items-center justify-between gap-3 border-b border-[#2a2a2a] px-5 py-3">
        <h2 className="font-mono text-[12px] uppercase tracking-[2px] text-[#8a8a8a]">
          <span className="mr-2 text-[#00ff66]">▸</span>
          {title}
        </h2>
        {meta && <div className="flex items-center gap-2">{meta}</div>}
      </header>
      <div className={bodyClass}>{children}</div>
    </section>
  );
}

export function Field({
  label,
  right,
  children,
}: {
  label: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[1.5px] text-[#8a8a8a]">{label}</span>
        {right}
      </div>
      {children}
    </div>
  );
}
