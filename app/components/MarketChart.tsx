'use client';

import { useEffect, useRef, useState } from 'react';

export default function MarketChart({ tokenId }: { tokenId: string | null }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const seriesRef = useRef<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!tokenId || !containerRef.current) return;

    let destroyed = false;

    const init = async () => {
      const { createChart, ColorType } = await import('lightweight-charts');
      if (destroyed || !containerRef.current) return;

      const chart = createChart(containerRef.current, {
        width: containerRef.current.clientWidth,
        height: 220,
        layout: {
          background: { type: ColorType.Solid, color: 'transparent' },
          textColor: '#555',
          fontSize: 10,
          fontFamily: 'JetBrains Mono, monospace',
        },
        grid: {
          vertLines: { color: '#1a1a1a' },
          horzLines: { color: '#1a1a1a' },
        },
        crosshair: {
          vertLine: { color: '#059669', width: 1, style: 2 },
          horzLine: { color: '#059669', width: 1, style: 2 },
        },
        timeScale: {
          borderColor: '#222',
          timeVisible: true,
          secondsVisible: false,
        },
        rightPriceScale: {
          borderColor: '#222',
        },
      });
      chartRef.current = chart;

      const series = (chart as any).addCandlestickSeries({
        upColor: '#059669',
        downColor: '#dc2626',
        borderDownColor: '#dc2626',
        borderUpColor: '#059669',
        wickDownColor: '#dc2626',
        wickUpColor: '#059669',
      });
      seriesRef.current = series;

      try {
        const res = await fetch(`/api/polynode?path=/v1/candles/${tokenId}&query=resolution%3D1h%26limit%3D168`);
        const data = await res.json();
        if (destroyed) return;
        const candles = data.candles || data;
        if (!Array.isArray(candles) || candles.length < 2) {
          setError('Insufficient data');
          return;
        }
        const mapped = candles.map((c: any) => ({
          time: Math.floor((c.timestamp || c.t || Date.now() / 1000) / 1000),
          open: c.open || c.o,
          high: c.high || c.h,
          low: c.low || c.l,
          close: c.close || c.c,
        })).filter((c: any) => c.open != null && c.close != null);
        series.setData(mapped);
        chart.timeScale().fitContent();
      } catch { setError('Failed to load chart'); }

      const handleResize = () => {
        if (containerRef.current) {
          chart.applyOptions({ width: containerRef.current.clientWidth });
        }
      };
      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        chart.remove();
      };
    };
    init().catch(() => setError('Failed to load chart library'));

    return () => { destroyed = true; };
  }, [tokenId]);

  if (error) return <div style={{ padding: '1rem', textAlign: 'center', fontSize: '0.65rem', color: 'var(--text-3)' }}>{error}</div>;
  if (!tokenId) return <div style={{ padding: '1rem', textAlign: 'center', fontSize: '0.65rem', color: 'var(--text-3)' }}>No token data</div>;

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', padding: '0 0 0 0' }}>
      <div style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.6rem', letterSpacing: '0.1em', color: 'var(--accent)' }}>OHLCV · 7D · 1H</span>
        <span style={{ fontSize: '0.5rem', color: 'var(--text-3)' }}>PolyNode Candles</span>
      </div>
      <div ref={containerRef} style={{ width: '100%', height: 220 }} />
    </div>
  );
}
