'use client';

import { usePrivy } from '@privy-io/react-auth';
import WeatherTerminal from '@/app/components/WeatherTerminal';

export default function Home() {
  const { ready, authenticated, login, logout, user } = usePrivy();

  return (
    <>
      <nav>
        <div className="nav-inner">
          <a href="/" className="nav-logo">
            <span className="logo-mark">V</span>
            <span>VURA <span className="nav-sub">WEATHER</span></span>
          </a>
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

      <section className="hero-slim">
        <div className="hero-slim-title">
          <span className="hero-badge"><span className="hero-badge-dot" /> WEATHER EDGE SCANNER</span>
          <h1>Weather markets move <span className="grad">slower than the weather.</span></h1>
          <p>
            Polymarket prices are set by people. When a city's forecast changes, the market often lags.
            VURA compares <b>market price</b> vs <b>real Open-Meteo forecast</b> and flags the gaps.
          </p>
        </div>
        <div className="hero-decor" aria-hidden="true">
          <span className="orb orb-1" />
          <span className="orb orb-2" />
          <span className="orb orb-3" />
        </div>
        <div className="how-steps">
          <div className="how-step">
            <span className="how-num">1</span>
            <span>Find a city with a <b>big multiplier</b> — the market price is likely wrong.</span>
          </div>
          <div className="how-step">
            <span className="how-num">2</span>
            <span>Press <b>Buy now</b> — it opens the market on Polymarket.</span>
          </div>
          <div className="how-step">
            <span className="how-num">3</span>
            <span>Profit if your call beats the crowd. Small edge, repeated daily.</span>
          </div>
        </div>
      </section>

      <main>
        <WeatherTerminal />
      </main>

      <footer>
        <div className="footer-line" />
        <div className="footer-inner">
          <span>© 2026 VURA Weather</span>
          <div className="footer-links">
            <a href="https://docs.polymarket.com" target="_blank">Polymarket Docs ↗</a>
            <a href="https://open-meteo.com" target="_blank">Open-Meteo ↗</a>
            <a href="https://polymarket.com/weather?via=vura" target="_blank">All weather markets ↗</a>
          </div>
        </div>
      </footer>
    </>
  );
}
