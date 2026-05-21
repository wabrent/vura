'use client';

import { useState } from 'react';
import type { Market } from '@/app/lib/types';

export default function TradeModal({
  market, authenticated, watchlist, onClose,
  onWatchlistToggle, onAlert, onShare
}: {
  market: Market;
  authenticated: boolean;
  watchlist: Set<string>;
  onClose: () => void;
  onWatchlistToggle: () => void;
  onAlert: () => void;
  onShare: () => void;
}) {
  const [side, setSide] = useState('BUY');
  const [outcome, setOutcome] = useState('YES');
  const [price, setPrice] = useState(Math.round(market.yesPrice * 100));
  const [amount, setAmount] = useState(10);
  const [trading, setTrading] = useState(false);
  const [msg, setMsg] = useState('');

  const shares = price > 0 ? (amount / (price / 100)).toFixed(2) : '0';

  const placeOrder = async () => {
    if (!authenticated) { setMsg('Connect first'); return; }
    setTrading(true); setMsg('');
    try {
      const res = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'trade',
          side, price: price / 100, size: parseFloat(shares)
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Order failed');
      setMsg('Order placed!');
      setTimeout(() => { setMsg(''); onClose(); }, 1500);
    } catch (e: any) {
      setMsg(e.message || 'Error');
    } finally { setTrading(false); }
  };

  const pnlStake = 100, pnlExit = 90;
  const entry = outcome === 'YES' ? market.yesPrice : market.noPrice;
  const exitP = pnlExit / 100;
  const pnlShares = pnlStake / entry;
  const pnlPayout = pnlShares * exitP;
  const pnlVal = pnlPayout - pnlStake;
  const roi = ((pnlVal / pnlStake) * 100).toFixed(1);

  return (
    <div className="modal-overlay" onClick={e => { if ((e.target as HTMLElement).className === 'modal-overlay') onClose(); }}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">{market.question}</span>
          <button className="modal-close" onClick={onClose}>x</button>
        </div>
        <div className="modal-body">
          <div className="modal-prices">
            <div className="modal-price-block"><span className="modal-price-label">YES</span><span className="modal-price-val accent">{Math.round(market.yesPrice * 100)}c</span></div>
            <div className="modal-price-block"><span className="modal-price-label">NO</span><span className="modal-price-val red">{Math.round(market.noPrice * 100)}c</span></div>
            <div className="modal-price-block"><span className="modal-price-label">VOLUME</span><span className="modal-price-val">${market.volDisplay}</span></div>
            <div className="modal-price-block"><span className="modal-price-label">ALPHA</span><span className="modal-price-val">{market.alpha}</span></div>
          </div>

          <div style={{ border: '1px solid var(--border)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ fontSize: '0.6rem', letterSpacing: '0.1em', color: 'var(--text-3)' }}>PLACE ORDER</div>
            <div className="pnl-row">
              <div className="pnl-field">
                <span className="pnl-label">SIDE</span>
                <select className="pnl-input" value={side} onChange={e => setSide(e.target.value)}>
                  <option value="BUY">BUY</option>
                  <option value="SELL">SELL</option>
                </select>
              </div>
              <div className="pnl-field">
                <span className="pnl-label">OUTCOME</span>
                <select className="pnl-input" value={outcome} onChange={e => { setOutcome(e.target.value); setPrice(Math.round(e.target.value === 'YES' ? market.yesPrice * 100 : market.noPrice * 100)); }}>
                  <option value="YES">YES</option>
                  <option value="NO">NO</option>
                </select>
              </div>
              <div className="pnl-field">
                <span className="pnl-label">PRICE (c)</span>
                <input type="number" className="pnl-input" value={price} onChange={e => setPrice(Number(e.target.value))} min={1} max={99} />
              </div>
            </div>
            <div className="pnl-row">
              <div className="pnl-field">
                <span className="pnl-label">AMOUNT ($)</span>
                <input type="number" className="pnl-input" value={amount} onChange={e => setAmount(Number(e.target.value))} min={1} />
              </div>
              <div className="pnl-field">
                <span className="pnl-label">SHARES</span>
                <div className="pnl-input" style={{ display: 'flex', alignItems: 'center' }}>{shares}</div>
              </div>
              <div className="pnl-field">
                <span className="pnl-label">TOTAL</span>
                <div className="pnl-input" style={{ display: 'flex', alignItems: 'center' }}>${amount}</div>
              </div>
            </div>
            {!authenticated ? (
              <div style={{ fontSize: '0.65rem', color: 'var(--text-3)', textAlign: 'center' }}>Connect to trade</div>
            ) : (
              <button className="btn-retry" style={{ width: '100%', background: side === 'BUY' ? 'var(--accent)' : 'var(--red)' }}
                onClick={placeOrder} disabled={trading}>
                {trading ? 'Placing...' : `${side} ${outcome} @ ${price}c | $${amount}`}
              </button>
            )}
            {msg && <div style={{ fontSize: '0.65rem', textAlign: 'center', color: msg.includes('placed') ? 'var(--accent)' : 'var(--red)' }}>{msg}</div>}
          </div>

          <div className="pnl-result">
            <div className="pnl-result-row"><span className="pnl-result-label">SHARES</span><span className="pnl-result-val">{pnlShares.toFixed(2)}</span></div>
            <div className="pnl-result-row"><span className="pnl-result-label">PAYOUT</span><span className="pnl-result-val">${pnlPayout.toFixed(2)}</span></div>
            <div className="pnl-result-row"><span className="pnl-result-label">P&L</span><span className="pnl-result-val" style={{ color: pnlVal >= 0 ? 'var(--accent)' : 'var(--red)' }}>{(pnlVal >= 0 ? '+' : '') + '$' + pnlVal.toFixed(2)}</span></div>
            <div className="pnl-result-row"><span className="pnl-result-label">ROI</span><span className="pnl-result-val">{(Number(roi) >= 0 ? '+' : '') + roi + '%'}</span></div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button className="btn-trade" onClick={onWatchlistToggle}>
              {watchlist.has(String(market.id)) ? 'Remove' : 'Watchlist'}
            </button>
            <button className="btn-trade" style={{ background: 'var(--accent)', borderColor: 'var(--accent)' }} onClick={onAlert}>Alert</button>
            <button className="btn-trade" style={{ background: '#3b82f6', borderColor: '#3b82f6' }} onClick={onShare}>Share</button>
          </div>
        </div>
      </div>
    </div>
  );
}
