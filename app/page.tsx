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
