'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import HubTerminal from '@/app/components/HubTerminal';
import CopyTrading from '@/app/components/CopyTrading';
import TickerTape from '@/app/components/TickerTape';

export default function Home() {
  const { address, isConnected } = useAccount();
  const [view, setView] = useState<'hub' | 'wallets'>('hub');
  const [marketCount, setMarketCount] = useState<number | null>(null);
  const [totalVol, setTotalVol] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/hub?limit=30');
        if (res.ok) {
          const data = await res.json();
          const cats = data.categories || [];
          const all = cats.flatMap((c: any) => c.markets || []);
          setMarketCount(all.length);
          setTotalVol(all.reduce((s: number, m: any) => s + (m.volume || 0), 0));
        }
      } catch {}
    })();
  }, []);

  const fmtVol = (v: number) => v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : v >= 1e3 ? (v / 1e3).toFixed(0) + 'K' : Math.round(v).toString();

  return (
    <>
      <nav>
        <div className="nav-inner">
          <a href="/" className="nav-logo" onClick={e => e.preventDefault()}>
            <span className="logo-mark">V</span>
            <span>VURA <span className="nav-sub">MARKETS</span></span>
          </a>
          <div className="nav-center">
            <button className={`nav-tab${view === 'hub' ? ' nav-tab-active' : ''}`} onClick={() => setView('hub')}>Markets</button>
            <button className={`nav-tab${view === 'wallets' ? ' nav-tab-active' : ''}`} onClick={() => setView('wallets')}>Wallets</button>
          </div>
          <div className="nav-status">
            <span className="live-dot" />
            <span className="nav-live">Live</span>
            <ConnectButton showBalance={false} chainStatus="icon" accountStatus="address" />
          </div>
        </div>
      </nav>

      <TickerTape />

      <section className="hero">
        <div className="hero-left">
          <div className="hero-badge">● LIVE · PREDICTION INTELLIGENCE</div>
          <h2>REAL-TIME</h2>
          <h2><span className="grad">PREDICTION</span></h2>
          <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
              <span style={{ fontSize: '0.6rem', letterSpacing: '0.12em', color: 'var(--text-3)', textTransform: 'uppercase' }}>Markets</span>
              <span style={{ fontSize: '1.3rem', fontWeight: 700, fontFamily: 'var(--mono)' }}>{marketCount !== null ? marketCount : '—'}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
              <span style={{ fontSize: '0.6rem', letterSpacing: '0.12em', color: 'var(--text-3)', textTransform: 'uppercase' }}>24H Volume</span>
              <span style={{ fontSize: '1.3rem', fontWeight: 700, fontFamily: 'var(--mono)', color: 'var(--accent)' }}>{totalVol !== null ? '$' + fmtVol(totalVol) : '—'}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
              <span style={{ fontSize: '0.6rem', letterSpacing: '0.12em', color: 'var(--text-3)', textTransform: 'uppercase' }}>Weather Cities</span>
              <span style={{ fontSize: '1.3rem', fontWeight: 700, fontFamily: 'var(--mono)', color: 'var(--accent)' }}>48</span>
            </div>
          </div>
        </div>
        <div className="hero-right">
          <p>Track Polymarket markets, weather temperature ladders, and top trader wallets — all in one terminal.</p>
          <div className="hero-divider" />
          <div className="hero-contact">
            <span>Powered by Polymarket CLOB · Open-Meteo</span>
            <a href="https://docs.polymarket.com" target="_blank">API Docs ↗</a>
          </div>
        </div>
      </section>

      <main style={{ maxWidth: '84rem' }}>
        {view === 'wallets' ? <CopyTrading /> : <HubTerminal />}
      </main>

      <footer>
        <div className="footer-line" />
        <div className="footer-inner">
          <span>© 2026 VURA Markets</span>
          <div className="footer-links">
            <a href="https://docs.polymarket.com" target="_blank">Polymarket Docs ↗</a>
            <a href="https://open-meteo.com" target="_blank">Open-Meteo ↗</a>
            <a href="https://polymarket.com/?via=vura" target="_blank">Polymarket ↗</a>
          </div>
        </div>
      </footer>
    </>
  );
}
