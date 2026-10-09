"use client";
import { useMemo, useRef, useState } from "react";
import type { TradePoint } from "./pons";

type RangeKey = "1h" | "24h" | "all";

const LINE = "#cfcfda";
const GREEN = "#31d981";
const RED = "#ff5f56";
const W = 1000;
const H = 300;
const PAD_T = 18;
const PAD_B = 18;

function fmtGwei(p: number, dec?: number) {
  const g = p * 1e9;
  if (!isFinite(g) || g <= 0) return "—";
  if (dec !== undefined) return g.toFixed(dec);
  if (g >= 100) return g.toFixed(0);
  if (g >= 1) return g.toFixed(2);
  if (g >= 0.01) return g.toFixed(4);
  return g.toExponential(2);
}

function fmtTime(t: number, full?: boolean) {
  return new Date(t).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    ...(full ? { second: "2-digit" as const } : {}),
  });
}

export default function PriceChart({
  trades,
  priceEth,
  totalSupply,
}: {
  trades: TradePoint[];
  priceEth: number;
  totalSupply: bigint;
}) {
  const [range, setRange] = useState<RangeKey>("all");
  const [hover, setHover] = useState<number | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);

  const pts = useMemo(() => {
    const now = Date.now();
    const from =
      range === "1h" ? now - 3_600_000 : range === "24h" ? now - 86_400_000 : Number.NEGATIVE_INFINITY;
    return trades.filter((p) => p.t >= from);
  }, [trades, range]);

  const model = useMemo(() => {
    const values = pts.map((p) => p.price).filter((v) => v > 0);
    if (priceEth > 0) values.push(priceEth);
    if (values.length === 0) return null;
    let min = Math.min(...values);
    let max = Math.max(...values);
    if (min === max) {
      const pad = Math.max(min * 0.02, 1e-18);
      min = Math.max(0, min - pad);
      max += pad;
    } else {
      const pad = (max - min) * 0.1;
      min = Math.max(0, min - pad);
      max += pad;
    }
    const t0 = pts.length > 0 ? pts[0].t : Date.now() - 3_600_000;
    const t1 = pts.length > 0 ? pts[pts.length - 1].t : Date.now();
    const span = Math.max(t1 - t0, 1);
    const x = (t: number) => ((t - t0) / span) * W;
    const y = (p: number) => PAD_T + (1 - (p - min) / (max - min)) * (H - PAD_T - PAD_B);
    const line = pts.map((p) => `${x(p.t).toFixed(1)},${y(p.price).toFixed(1)}`).join(" ");
    const area =
      pts.length > 0
        ? `M ${x(pts[0].t).toFixed(1)} ${H} ` +
          pts.map((p) => `L ${x(p.t).toFixed(1)} ${y(p.price).toFixed(1)}`).join(" ") +
          ` L ${x(pts[pts.length - 1].t).toFixed(1)} ${H} Z`
        : "";
    const stepG = ((max - min) / 3) * 1e9;
    const dec = Math.min(6, Math.max(2, Math.ceil(-Math.log10(stepG)) + 1));
    const yTicks = [0, 1, 2, 3].map((i) => {
      const v = max - ((max - min) * i) / 3;
      return { v, y: y(v), label: fmtGwei(v, dec) };
    });
    const xTicks = [0, 1, 2, 3].map((i) => t0 + (span * i) / 3);
    const delta =
      pts.length >= 2 && pts[0].price > 0
        ? ((pts[pts.length - 1].price - pts[0].price) / pts[0].price) * 100
        : null;
    return { x, y, line, area, yTicks, xTicks, t0, span, delta, dec };
  }, [pts, priceEth]);

  const last = pts.length > 0 ? pts[pts.length - 1] : null;
  const curY = model ? (priceEth > 0 ? model.y(priceEth) : last ? model.y(last.price) : null) : null;
  const mcapEth = totalSupply > 0n && priceEth > 0 ? (priceEth * Number(totalSupply)) / 1e18 : 0;

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const box = boxRef.current;
    if (!box || !model || pts.length === 0) return;
    const r = box.getBoundingClientRect();
    const rel = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const t = model.t0 + rel * model.span;
    let best = 0;
    let bd = Infinity;
    pts.forEach((p, i) => {
      const d = Math.abs(p.t - t);
      if (d < bd) {
        bd = d;
        best = i;
      }
    });
    setHover(best);
  };

  const hp = hover !== null && hover < pts.length ? pts[hover] : null;

  return (
    <div className="panel pc">
      <style>{`
        .pc-head{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:14px}
        .pc-lab{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--mute);margin-bottom:5px}
        .pc-price{font:600 clamp(22px,3vw,30px)/1 var(--font-jb,"JetBrains Mono"),monospace;color:var(--ink)}
        .pc-price small{font-size:12px;color:var(--mute);font-weight:400;margin-left:5px}
        .pc-delta{display:inline-block;margin-left:10px;font:500 12px var(--font-jb,"JetBrains Mono"),monospace;padding:3px 8px;border-radius:6px;vertical-align:6px}
        .pc-plot{position:relative;height:300px;border-radius:12px;overflow:hidden;cursor:crosshair;background:rgba(255,255,255,.015)}
        .pc-plot svg{position:absolute;inset:0;width:100%;height:100%}
        .pc-yl{position:absolute;right:8px;transform:translateY(-50%);font:10px var(--font-jb,"JetBrains Mono"),monospace;color:var(--mute);background:color-mix(in srgb,var(--bg) 72%,transparent);padding:1px 5px;border-radius:4px;pointer-events:none}
        .pc-cur{position:absolute;right:6px;transform:translateY(-50%);background:${LINE};color:#040406;font:600 11px var(--font-jb,"JetBrains Mono"),monospace;padding:2px 8px;border-radius:6px;pointer-events:none;z-index:3}
        .pc-vline{position:absolute;top:0;bottom:0;width:1px;background:#ffffff2b;pointer-events:none;z-index:1}
        .pc-hdot{position:absolute;width:11px;height:11px;border-radius:50%;background:${GREEN};border:2px solid var(--bg);transform:translate(-50%,-50%);z-index:3;pointer-events:none}
        .pc-tip{position:absolute;z-index:4;pointer-events:none;background:#101018f5;border:1px solid var(--line);border-radius:10px;padding:8px 10px;font:11px/1.5 var(--font-jb,"JetBrains Mono"),monospace;white-space:nowrap;box-shadow:0 14px 34px -14px #000}
        .pc-tip .s-buy{color:${GREEN}}
        .pc-tip .s-sell{color:${RED}}
        .pc-x{display:flex;justify-content:space-between;margin-top:8px;font:10px var(--font-jb,"JetBrains Mono"),monospace;color:var(--mute)}
        .pc-empty{position:absolute;inset:0;display:grid;place-items:center;color:var(--mute);font-size:13px;letter-spacing:.04em}
        .pc-ranges{display:flex;gap:6px;margin:0}
        @media (max-width:760px){
          .pc-plot{height:210px}
          .pc-price{font-size:22px}
          .pc-delta{vertical-align:4px}
        }
      `}</style>

      <div className="pc-head">
        <div>
          <div className="pc-lab">Price</div>
          <span className="pc-price">
            {priceEth > 0 ? fmtGwei(priceEth) : "…"}
            <small>gwei</small>
            {model?.delta != null && (
              <span className="pc-delta" style={{ color: model.delta >= 0 ? GREEN : RED }}>
                {model.delta >= 0 ? "+" : ""}
                {model.delta.toFixed(2)}% {range}
              </span>
            )}
          </span>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="pc-lab">MCap</div>
          <span className="pc-price">
            {mcapEth > 0 ? (mcapEth >= 10 ? mcapEth.toFixed(1) : mcapEth.toFixed(3)) : "…"}
            <small>ETH</small>
          </span>
        </div>
        <div className="tabs pc-ranges">
          {(["1h", "24h", "all"] as RangeKey[]).map((r) => (
            <button key={r} className="tab" aria-pressed={range === r} onClick={() => setRange(r)}>
              {r === "all" ? "All" : r}
            </button>
          ))}
        </div>
      </div>

      <div className="pc-plot" ref={boxRef} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        {model && pts.length > 0 ? (
          <>
            <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden>
              <defs>
                <linearGradient id="pcGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={LINE} stopOpacity="0.28" />
                  <stop offset="100%" stopColor={LINE} stopOpacity="0" />
                </linearGradient>
              </defs>
              {model.yTicks.map((t, i) => (
                <line
                  key={i}
                  x1={0}
                  x2={W}
                  y1={t.y}
                  y2={t.y}
                  stroke="#24242e"
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              <path d={model.area} fill="url(#pcGrad)" />
              <polyline
                points={model.line}
                fill="none"
                stroke={LINE}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            {model.yTicks.map((t, i) => (
              <div key={i} className="pc-yl" style={{ top: `${(t.y / H) * 100}%` }}>
                {t.label}
              </div>
            ))}
            {last && curY != null && (
              <div className="pc-cur" style={{ top: `${(curY / H) * 100}%` }}>
                {fmtGwei(priceEth > 0 ? priceEth : last.price, model.dec)}
              </div>
            )}
            {hp && hover !== null && (
              <>
                <div className="pc-vline" style={{ left: `${(model.x(hp.t) / W) * 100}%` }} />
                <div
                  className="pc-hdot"
                  style={{
                    left: `${(model.x(hp.t) / W) * 100}%`,
                    top: `${(model.y(hp.price) / H) * 100}%`,
                    background: hp.side === "buy" ? GREEN : RED,
                  }}
                />
                <div
                  className="pc-tip"
                  style={{
                    left: `${(model.x(hp.t) / W) * 100}%`,
                    top: `${(model.y(hp.price) / H) * 100}%`,
                    transform:
                      model.x(hp.t) / W > 70
                        ? "translate(calc(-100% - 10px), -140%)"
                        : "translate(10px, -140%)",
                  }}
                >
                  <span className={hp.side === "buy" ? "s-buy" : "s-sell"}>
                    {hp.side === "buy" ? "BUY" : "SELL"}
                  </span>
                  {" · "}
                  {fmtGwei(hp.price)} gwei
                  <br />
                  {fmtTime(hp.t, true)}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="pc-empty">No trades yet</div>
        )}
      </div>

      <div className="pc-x">
        {(model?.xTicks ?? [0, 1, 2, 3].map((i) => Date.now() - 3_600_000 + i * 1_200_000)).map(
          (t, i) => (
            <span key={i}>{fmtTime(t)}</span>
          )
        )}
      </div>
    </div>
  );
}
