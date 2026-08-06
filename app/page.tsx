'use client';

import { useState, useEffect, useCallback } from 'react';
import WeatherTerminal from '@/app/components/WeatherTerminal';

export default function Home() {
  return (
    <>
      <nav>
        <div className="nav-inner">
          <a href="/" className="nav-logo">
            <span className="logo-mark">V</span>
            <span>VURA <span style={{ color: 'var(--accent)', fontWeight: 400, fontSize: '0.75rem', letterSpacing: '0.08em' }}>WEATHER</span></span>
          </a>
          <div className="nav-status">
            <span className="live-dot" />
            <span>Live · Polymarket</span>
            <a className="btn-trade" href="https://polymarket.com/weather?via=vura" target="_blank">Polymarket Weather ↗</a>
          </div>
        </div>
      </nav>

      <div className="tape">
        <div className="tape-track">
          {['temperature', 'precipitation', 'snow', 'wind', 'hurricanes', 'earthquakes', 'tornadoes', 'global'].map((t, i) => (
            <span key={t} className="tape-item">
              <span style={{ color: 'var(--accent)' }}>◆</span>
              <span>{t.toUpperCase()}</span>
            </span>
          ))}
          {['temperature', 'precipitation', 'snow', 'wind', 'hurricanes', 'earthquakes', 'tornadoes', 'global'].map((t, i) => (
            <span key={t + 'b'} className="tape-item">
              <span style={{ color: 'var(--accent)' }}>◆</span>
              <span>{t.toUpperCase()}</span>
            </span>
          ))}
        </div>
      </div>

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
            <a href="https://polymarket.com/weather?via=vura" target="_blank">Trade on Polymarket ↗</a>
          </div>
        </div>
      </footer>
    </>
  );
}
