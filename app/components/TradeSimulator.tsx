'use client';

import { useState, useMemo } from 'react';
import type { Market, SimulatedTrade } from '@/app/lib/types';

function formatVol(v: number) {
  if (v >= 1e6) return (v / 1e6).toFixed(1) + 'M';
  if (v >= 1e3) return (v / 1e3).toFixed(1) + 'K';
  return Math.round(v).toString();
}

export default function TradeSimulator({ markets }: { markets: Market[] }) {
  const [balance, setBalance] = useState(10000);
  const [trades, setTrades] = useState<SimulatedTrade[]>([]);
  const [selectedMarket, setSelectedMarket] = useState('');
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [outcome, setOutcome] = useState<'YES' | 'NO'>('YES');
  const [amount, setAmount] = useState(100);
  const [price, setPrice] = useState(50);
  const [activeOnly, setActiveOnly] = useState(false);

  const marketOptions = useMemo(() => {
    return markets.filter(m => m.volume > 1000).slice(0, 50);
  }, [markets]);

  const selectedMarketData = useMemo(() => {
    return marketOptions.find(m => m.id === selectedMarket);
  }, [selectedMarket, marketOptions]);

  const pnl = useMemo(() => {
    return trades.reduce((s, t) => s + t.pnl, 0);
  }, [trades]);

  const winRate = useMemo(() => {
    const closed = trades.filter(t => t.closed);
    if (closed.length === 0) return 0;
    return Math.round((closed.filter(t => t.pnl >= 0).length / closed.length) * 100);
  }, [trades]);

  const openTrades = useMemo(() => trades.filter(t => !t.closed), [trades]);
  const displayTrades = activeOnly ? openTrades : trades;

  const openTrade = () => {
    if (!selectedMarket || amount <= 0 || price <= 0) return;
    const m = marketOptions.find(m => m.id === selectedMarket);
    if (!m) return;
    if (amount > balance) return;
    setBalance(prev => prev - amount);
    const newTrade: SimulatedTrade = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      marketQuestion: m.question,
      side,
      outcome,
      entryPrice: price / 100,
      exitPrice: 0,
      amount,
      pnl: 0,
      closed: false,
    };
    setTrades(prev => [newTrade, ...prev]);
  };

  const closeTrade = (id: string) => {
    setTrades(prev => prev.map(t => {
      if (t.id !== id) return t;
      const exitPrice = t.entryPrice * (0.8 + Math.random() * 0.4);
      const shares = t.amount / t.entryPrice;
      const payout = shares * exitPrice;
      const pnl = payout - t.amount;
      setBalance(b => b + payout);
      return { ...t, exitPrice: parseFloat(exitPrice.toFixed(3)), pnl: parseFloat(pnl.toFixed(2)), closed: true };
    }));
  };

  const resetSimulator = () => {
    setBalance(10000);
    setTrades([]);
  };

  return (
    <div className="sim-container">
      <div className="sim-summary">
        <div className="sim-stat"><span className="sim-stat-label">BALANCE</span><span className={`sim-stat-val ${balance >= 10000 ? 'accent' : 'red'}`}>${formatVol(balance)}</span></div>
        <div className="sim-stat"><span className="sim-stat-label">P&L</span><span className={`sim-stat-val ${pnl >= 0 ? 'accent' : 'red'}`}>{pnl >= 0 ? '+' : ''}${formatVol(Math.abs(pnl))}</span></div>
        <div className="sim-stat"><span className="sim-stat-label">TRADES</span><span className="sim-stat-val">{trades.length}</span></div>
        <div className="sim-stat"><span className="sim-stat-label">WIN RATE</span><span className="sim-stat-val">{winRate}%</span></div>
        <div className="sim-stat"><span className="sim-stat-label">OPEN</span><span className="sim-stat-val">{openTrades.length}</span></div>
        <button className="sim-reset-btn" onClick={resetSimulator}>⟳ Reset</button>
      </div>

      <div className="sim-trade-form">
        <div className="sim-form-title">OPEN PAPER TRADE</div>
        <div className="sim-form-grid">
          <div className="sim-field">
            <span className="sim-label">Market</span>
            <select className="sim-input" value={selectedMarket} onChange={e => {
              setSelectedMarket(e.target.value);
              const m = marketOptions.find(m => m.id === e.target.value);
              if (m) setPrice(Math.round((outcome === 'YES' ? m.yesPrice : m.noPrice) * 100));
            }}>
              <option value="">Select market...</option>
              {marketOptions.map(m => (
                <option key={m.id} value={m.id}>{m.question.substring(0, 40)}</option>
              ))}
            </select>
          </div>
          <div className="sim-field">
            <span className="sim-label">Side</span>
            <select className="sim-input" value={side} onChange={e => setSide(e.target.value as 'BUY' | 'SELL')}>
              <option value="BUY">BUY</option>
              <option value="SELL">SELL</option>
            </select>
          </div>
          <div className="sim-field">
            <span className="sim-label">Outcome</span>
            <select className="sim-input" value={outcome} onChange={e => {
              setOutcome(e.target.value as 'YES' | 'NO');
              if (selectedMarketData) {
                setPrice(Math.round((e.target.value === 'YES' ? selectedMarketData.yesPrice : selectedMarketData.noPrice) * 100));
              }
            }}>
              <option value="YES">YES</option>
              <option value="NO">NO</option>
            </select>
          </div>
          <div className="sim-field">
            <span className="sim-label">Price (c)</span>
            <input type="number" className="sim-input" value={price} onChange={e => setPrice(Number(e.target.value))} min={1} max={99} />
          </div>
          <div className="sim-field">
            <span className="sim-label">Amount ($)</span>
            <input type="number" className="sim-input" value={amount} onChange={e => setAmount(Number(e.target.value))} min={1} max={balance} />
          </div>
          <div className="sim-field">
            <span className="sim-label">Shares</span>
            <div className="sim-input sim-input-display">{price > 0 ? (amount / (price / 100)).toFixed(2) : '0'}</div>
          </div>
        </div>
        <button className="sim-trade-btn" onClick={openTrade} disabled={!selectedMarket || amount > balance}>
          {!selectedMarket ? 'Select a Market' : amount > balance ? 'Insufficient Balance' : `Open ${side} ${outcome}`}
        </button>
      </div>

      <div className="sim-trades-list">
        <div className="sim-trades-header">
          <span className="panel-title">TRADE HISTORY</span>
          <div className="sim-trades-controls">
            <span className="panel-subtitle">{trades.length} trades</span>
            <label className="sim-toggle">
              <input type="checkbox" checked={activeOnly} onChange={e => setActiveOnly(e.target.checked)} />
              <span>Open only</span>
            </label>
          </div>
        </div>
        {displayTrades.length === 0 ? (
          <div className="sim-empty">No paper trades yet. Open your first position above.</div>
        ) : (
          displayTrades.map(t => (
            <div key={t.id} className={`sim-trade-row ${t.closed ? 'sim-trade-closed' : ''}`}>
              <div className="sim-trade-info">
                <span className="sim-trade-market">{t.marketQuestion.substring(0, 35)}</span>
                <span className="sim-trade-meta">{t.side} {t.outcome} @ {(t.entryPrice * 100).toFixed(1)}c · ${formatVol(t.amount)}</span>
              </div>
              <div className={`sim-trade-pnl ${t.pnl >= 0 ? 'accent' : 'red'}`}>
                {t.closed ? (
                  <>{t.pnl >= 0 ? '+' : ''}${formatVol(Math.abs(t.pnl))}</>
                ) : (
                  <span className="sim-trade-open-badge">OPEN</span>
                )}
              </div>
              {!t.closed && <button className="sim-close-btn" onClick={() => closeTrade(t.id)}>Close</button>}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
