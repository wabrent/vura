"use client";

// ============================================================================
// TreatmentProtocol — "TREATMENT PROTOCOL" block shown under a scan result
// when the Degradation Score is >= 4.0.
// ============================================================================

const BUY_URL =
  "https://www.ponsfamily.com/launchpad/0xB8e73F3afc0B263f58770cA39DBf960FB0D587A9";
const RADAR_URL = "/terminal";

const BENEFITS = [
  "Zero-second pool detection feed",
  "Automated honeypot & tax bypass",
  "Access to Weekly Alpha Leaderboard rewards",
] as const;

export function TreatmentProtocol() {
  return (
    <div
      className="rounded-lg border border-[#ff7700]/60 bg-[#0d0b08] p-6 animate-fade-in"
      style={{ boxShadow: "0 0 30px #ff770022" }}
    >
      <div
        className="font-mono font-bold text-sm uppercase tracking-[0.2em] text-[#ff7700] mb-3"
        style={{ textShadow: "0 0 12px #ff770066" }}
      >
        [ PRESCRIPTION // PORTFOLIO RECOVERY ]
      </div>

      <p className="text-sm text-zinc-300 leading-relaxed mb-4 max-w-3xl">
        You are constantly bleeding liquidity because you enter after the
        dumpers. Stop feeding honeypots and front-run the crowd with VURA
        Liquidity Radar.
      </p>

      <ul className="space-y-1.5 mb-6">
        {BENEFITS.map((b) => (
          <li key={b} className="font-mono text-xs text-zinc-400">
            <span className="text-[#00ff66] mr-2">•</span>
            {b}
          </li>
        ))}
      </ul>

      <div className="flex flex-col sm:flex-row gap-3">
        <a
          href={BUY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 font-mono text-sm font-bold uppercase tracking-wider
                     px-6 py-3.5 rounded-lg bg-[#00ff66] text-black
                     hover:shadow-[0_0_28px_#00ff6688] active:translate-y-px transition-all"
        >
          BUY $VURA (GET VIP EDGE)
        </a>
        <a
          href={RADAR_URL}
          className="flex items-center justify-center gap-2 font-mono text-sm font-bold uppercase tracking-wider
                     px-6 py-3.5 rounded-lg border border-[#ff7700] text-[#ff7700]
                     hover:bg-[#ff7700]/10 hover:shadow-[0_0_28px_#ff770055] active:translate-y-px transition-all"
        >
          OPEN RADAR FEED
        </a>
      </div>
    </div>
  );
}
