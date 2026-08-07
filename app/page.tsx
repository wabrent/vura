'use client';

import { useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import WeatherTerminal from '@/app/components/WeatherTerminal';
import HubTerminal from '@/app/components/HubTerminal';
import CopyTrading from '@/app/components/CopyTrading';

export default function Home() {
  const { ready, authenticated, login, logout, user } = usePrivy();
  const [view, setView] = useState<'hub' | 'weather' | 'wallets'>('hub');

  return (
    <>
      <nav>
        <div className="nav-inner">
          <a href="/" className="nav-logo" onClick={e => e.preventDefault()}>
            <span className="logo-mark">V</span>
            <span>VURA <span className="nav-sub">MARKETS</span></span>
          </a>
          <div className="nav-center">
            <button className={`nav-tab${view === 'hub' ? ' nav-tab-active' : ''}`} onClick={() => setView('hub')}>All Markets</button>
            <button className={`nav-tab${view === 'weather' ? ' nav-tab-active' : ''}`} onClick={() => setView('weather')}>Weather</button>
            <button className={`nav-tab${view === 'wallets' ? ' nav-tab-active' : ''}`} onClick={() => setView('wallets')}>Wallets</button>
          </div>
          <div className="nav-status">
            <span className="live-dot" />
            <span className="nav-live">Live</span>
            {!ready ? (
              <button className="privy-btn" disabled style={{ opacity: 0.5 }}>Loading...</button>
            ) : authenticated ? (
              <div className="nav-user">
                <span className="nav-email">
                  {user?.email?.address || user?.google?.email || user?.twitter?.username || (user?.id ? user.id.slice(0, 6) + '…' : 'User')}
                </span>
                <button className="privy-btn logout" onClick={logout}>Exit</button>
              </div>
            ) : (
              <button className="privy-btn" onClick={login}>Sign in</button>
            )}
          </div>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-left">
          <div className="hero-badge">● LIVE · PREDICTION INTELLIGENCE</div>
          <h2>REAL-TIME</h2>
          <h2><span className="grad">PREDICTION</span></h2>
          <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
              <span style={{ fontSize: '0.6rem', letterSpacing: '0.12em', color: 'var(--text-3)', textTransform: 'uppercase' }}>Markets</span>
              <span style={{ fontSize: '1.3rem', fontWeight: 700, fontFamily: 'var(--mono)' }}>—</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
              <span style={{ fontSize: '0.6rem', letterSpacing: '0.12em', color: 'var(--text-3)', textTransform: 'uppercase' }}>Categories</span>
              <span style={{ fontSize: '1.3rem', fontWeight: 700, fontFamily: 'var(--mono)' }}>4</span>
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
        {view === 'weather' ? <WeatherTerminal /> : view === 'wallets' ? <CopyTrading /> : <HubTerminal />}
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
