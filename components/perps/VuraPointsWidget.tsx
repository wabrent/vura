"use client";

// ============================================================================
// VuraPointsWidget — points leaderboard card (Season 1).
// Data source: NEXT_PUBLIC_LEADERBOARD_URL (JSON array served by the points
// backend — see backend/pointsService.js). Without it the widget shows an
// honest "awaiting first snapshot" state instead of fabricated rows.
// ============================================================================

import { useEffect, useState } from "react";

export interface LeaderboardRow {
  address: string;
  points: number;
  volumeUsd?: number;
}

/** Next weekly season reset: Monday 00:00 UTC. */
function nextReset(): number {
  const now = new Date();
  const d = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + ((8 - now.getUTCDay()) % 7 || 7),
    0, 0, 0, 0
  );
  return d;
}

function shortAddr(a: string): string {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export function VuraPointsWidget({
  title = "points leaderboard",
}: {
  title?: string;
  resetTimer?: string;
}) {
  const [rows, setRows] = useState<LeaderboardRow[] | null>(null);
  const [left, setLeft] = useState("--:--:--");

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_LEADERBOARD_URL;
    if (url) {
      fetch(url)
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => {
          if (Array.isArray(j)) setRows(j.slice(0, 10));
        })
        .catch(() => setRows(null));
    }

    const tick = () => {
      const ms = nextReset() - Date.now();
      const d = Math.floor(ms / 86400000);
      const h = Math.floor((ms % 86400000) / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      setLeft(`${d}d ${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m`);
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);

  return (
    <aside className="rounded-xl border border-[#2a2a2a] bg-[#111] p-5">
      <div className="mb-4 flex items-baseline justify-between gap-2 border-b border-[#2a2a2a] pb-3">
        <span className="font-mono text-[11px] uppercase tracking-[2px] text-[#8a8a8a]">
          ▲ {title}
        </span>
        <span className="font-mono text-[11px] text-[#00ff66]">reset {left}</span>
      </div>

      <div className="space-y-2">
        {rows && rows.length > 0 ? (
          rows.map((r, i) => (
            <div
              key={r.address}
              className="flex items-center justify-between rounded-lg border border-[#2a2a2a] bg-[#0d0d0d] px-3 py-2.5"
            >
              <span className="w-7 font-mono text-[12px] text-[#8a8a8a]">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="flex-1 font-mono text-[12px] text-white">
                {shortAddr(r.address)}
              </span>
              {typeof r.volumeUsd === "number" && (
                <span className="mr-3 font-mono text-[11px] text-[#8a8a8a]">
                  ${r.volumeUsd.toLocaleString("en-US")}
                </span>
              )}
              <span className="font-mono text-[12px] font-bold text-[#00ff66]">
                {r.points.toLocaleString("en-US")} pts
              </span>
            </div>
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-[#2a2a2a] px-3 py-6 text-center">
            <div className="font-mono text-[11px] uppercase tracking-[1.5px] text-[#8a8a8a]">
              awaiting first snapshot
            </div>
            <div className="mt-2 font-mono text-[11px] leading-relaxed text-[#5a5a5a]">
              +10 pts per $1 of volume · ×1.5 for holders
              <br />
              of 50,000+ $VURA · hourly sync from the backend
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 border-t border-[#2a2a2a] pt-3 font-mono text-[10px] uppercase tracking-[1px] text-[#5a5a5a]">
        season 1 // points reset every monday 00:00 utc // volume-based
      </div>
    </aside>
  );
}
