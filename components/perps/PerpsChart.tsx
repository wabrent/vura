"use client";

// ============================================================================
// PerpsChart — full-width ETH price banner above the Orderly widget.
// The SDK's own TradingView panel is a license placeholder unless you host
// charting_library yourself, so we hide it and render this instead.
// Feed: CoinGecko OHLC (1D, ~30m bars) + live price poll (ETH ≈ ETH-PERP
// mark). Fail-soft: offline state instead of a broken canvas.
// ============================================================================

import { useEffect, useRef, useState } from "react";
import {
  ColorType,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";

const OHLC_URL = "https://api.coingecko.com/api/v3/coins/ethereum/ohlc?vs_currency=usd&days=1";
const PRICE_URL =
  "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd&include_24hr_change=true";

const UP = "#00ff66";
const DOWN = "#ff4d26";
const GRID = "#131a15";
const AXIS = "#2a2f2c";

interface Bar {
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
}

function toSec(ts: number): number {
  return ts > 1e12 ? Math.floor(ts / 1000) : Math.floor(ts);
}

export function PerpsChart() {
  const boxRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const lastBarRef = useRef<Bar | null>(null);
  const [price, setPrice] = useState<number | null>(null);
  const [change, setChange] = useState<number | null>(null);
  const [status, setStatus] = useState<"loading" | "live" | "offline">("loading");

  // Chart bootstrap + OHLC load
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;

    const chart = createChart(box, {
      width: box.clientWidth,
      height: box.clientHeight,
      layout: {
        background: { type: ColorType.Solid, color: "#0e120f" },
        textColor: "#8a8a8a",
        fontFamily: "'SF Mono', 'Fira Code', ui-monospace, monospace",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: GRID },
        horzLines: { color: GRID },
      },
      crosshair: {
        vertLine: { color: AXIS, width: 1, style: 3, labelBackgroundColor: "#00ff66" },
        horzLine: { color: AXIS, width: 1, style: 3, labelBackgroundColor: "#00ff66" },
      },
      rightPriceScale: { borderColor: AXIS },
      timeScale: { borderColor: AXIS, timeVisible: true, secondsVisible: false },
    });
    const series = chart.addCandlestickSeries({
      upColor: UP,
      downColor: DOWN,
      borderUpColor: UP,
      borderDownColor: DOWN,
      wickUpColor: UP,
      wickDownColor: DOWN,
    });
    chartRef.current = chart;
    seriesRef.current = series;

    const ro = new ResizeObserver(() => {
      chart.applyOptions({ width: box.clientWidth, height: box.clientHeight });
    });
    ro.observe(box);

    let alive = true;
    fetch(OHLC_URL)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("ohlc http"))))
      .then((rows: number[][]) => {
        if (!alive || !Array.isArray(rows)) return;
        const bars: Bar[] = rows.map(([t, o, h, l, c]) => ({
          time: toSec(t) as UTCTimestamp,
          open: o,
          high: h,
          low: l,
          close: c,
        }));
        series.setData(bars);
        lastBarRef.current = bars[bars.length - 1] ?? null;
        setStatus("live");
        chart.timeScale().fitContent();
      })
      .catch(() => alive && setStatus("offline"));

    return () => {
      alive = false;
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  // Live price: header + update of the current bar
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const r = await fetch(PRICE_URL);
        if (!r.ok) throw new Error("price http");
        const j = await r.json();
        const p: number | undefined = j?.ethereum?.usd;
        const ch: number | undefined = j?.ethereum?.usd_24h_change;
        if (!alive || typeof p !== "number") return;
        setPrice(p);
        if (typeof ch === "number") setChange(ch);
        setStatus((s) => (s === "loading" ? "live" : s));

        const series = seriesRef.current;
        const last = lastBarRef.current;
        if (series && last) {
          const now = Math.floor(Date.now() / 1000);
          if (now >= last.time + 1800) {
            const fresh: Bar = {
              time: now as UTCTimestamp,
              open: last.close,
              high: Math.max(last.close, p),
              low: Math.min(last.close, p),
              close: p,
            };
            series.update(fresh);
            lastBarRef.current = fresh;
          } else {
            const upd: Bar = {
              ...last,
              high: Math.max(last.high, p),
              low: Math.min(last.low, p),
              close: p,
            };
            series.update(upd);
            lastBarRef.current = upd;
          }
        }
      } catch {
        if (alive) setStatus((s) => (s === "loading" ? s : "offline"));
      }
    };
    tick();
    const id = setInterval(tick, 20000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const up = (change ?? 0) >= 0;

  return (
    <section className="rounded-xl border border-[#2a2a2a] bg-[#111]">
      <div className="flex flex-wrap items-baseline justify-between gap-x-5 gap-y-2 border-b border-[#2a2a2a] px-5 py-3.5">
        <div className="flex flex-wrap items-baseline gap-4">
          <span className="font-mono text-sm font-bold uppercase tracking-[1px] text-white">
            ETH-PERP
          </span>
          <span
            className="font-mono text-2xl font-bold tabular-nums"
            style={{ color: price == null ? "#8a8a8a" : up ? UP : DOWN }}
          >
            {price == null ? "———" : `$${price.toLocaleString("en-US", { maximumFractionDigits: 2 })}`}
          </span>
          {change != null && (
            <span
              className="rounded-md border px-2 py-0.5 font-mono text-[11px] font-bold tabular-nums"
              style={{
                color: up ? UP : DOWN,
                borderColor: up ? UP : DOWN,
                background: up ? "rgba(0,255,102,.08)" : "rgba(255,77,38,.08)",
              }}
            >
              {up ? "▲" : "▼"} {Math.abs(change).toFixed(2)}% 24h
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[1.5px] text-[#5a5a5a]">
          <span>1d · 30m</span>
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{
              background: status === "live" ? UP : status === "offline" ? "#ff4d26" : "#8a8a8a",
            }}
          />
          <span>{status === "loading" ? "sync…" : status === "live" ? "live · eth spot" : "feed offline"}</span>
        </div>
      </div>
      <div ref={boxRef} className="relative h-[300px] w-full">
        {status === "loading" && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center font-mono text-[11px] uppercase tracking-[3px] text-[#5a5a5a]">
            loading chart…
          </div>
        )}
      </div>
    </section>
  );
}
