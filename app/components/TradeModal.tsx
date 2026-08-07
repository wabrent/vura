'use client';

import { useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useTrading } from '@/app/hooks/useTrading';

interface TradeRec {
  category?: string;
  title?: string;
  buyYesPrice: number;
  slug: string;
  eventSlug: string;
  tokenId: string | null;
  side?: string;
  thresholdC?: number;
  city?: string;
  price?: number;
}

export default function TradeModal({ rec, onClose }: { rec: TradeRec; onClose: () => void }) {
  const privy = usePrivy() as any;
  const login = privy.login;
  const authenticated = privy.authenticated;
  const { address, approveUSDC, placeOrder } = useTrading();
  const [amount, setAmount] = useState(20);
  const [status, setStatus] = useState<string>('');
  const [busy, setBusy] = useState(false);

  const priceC = Math.round((rec.price || rec.buyYesPrice) * 100);
  const shares = priceC > 0 ? Math.floor(amount / (rec.price || rec.buyYesPrice)) : 0;

  const run = async () => {
    setBusy(true);
    try {
      if (!rec.tokenId) {
        setStatus('Error: market token not found. Open on Polymarket instead.');
        setBusy(false);
        return;
      }
      setStatus('Step 1/3: Approving USDC...');
      await approveUSDC();
      setStatus('Step 2/3: Placing order...');
      const result = await placeOrder(rec.tokenId, priceC / 100, shares, 'BUY');
      setStatus(JSON.stringify(result));
    } catch (e: any) {
      setStatus('Error: ' + e.message);
    }
    setBusy(false);
  };

  return (
    <div className="modal-overlay" onClick={e => { if ((e.target as HTMLElement).className === 'modal-overlay') onClose(); }}>
      <div className="modal modal-sm">
        <div className="modal-header">
          <span className="modal-title">Buy YES @ {priceC}¢{rec.title ? ' · ' + rec.title.substring(0, 40) : ''}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="pnl-result">
            <div className="pnl-result-row">
              <span className="pnl-result-label">Price</span>
              <span className="pnl-result-val">{priceC}¢</span>
            </div>
            <div className="pnl-result-row">
              <span className="pnl-result-label">Shares you get</span>
              <span className="pnl-result-val">{shares}</span>
            </div>
            <div className="pnl-result-row">
              <span className="pnl-result-label">Pays if right</span>
              <span className="pnl-result-val" style={{ color: 'var(--accent)' }}>${shares.toFixed(0)}</span>
            </div>
          </div>

          <div className="pnl-field">
            <span className="pnl-label">AMOUNT (USD)</span>
            <input type="number" className="pnl-input" value={amount} onChange={e => setAmount(Number(e.target.value))} min={5} />
          </div>

          {!authenticated ? (
            <button className="btn-retry" style={{ width: '100%' }} onClick={login}>Connect wallet</button>
          ) : !address ? (
            <button className="btn-retry" style={{ width: '100%' }} onClick={login}>Connect wallet</button>
          ) : (
            <button className="btn-retry" style={{ width: '100%' }} onClick={run} disabled={busy}>
              {busy ? 'Trading...' : `Buy ${shares} shares`}
            </button>
          )}

          {status && (
            <div style={{ fontSize: '0.68rem', color: 'var(--text-2)', fontFamily: 'var(--mono)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: 'var(--bg)', padding: '0.6rem', borderRadius: 8 }}>
              {status}
            </div>
          )}

          <div style={{ fontSize: '0.58rem', color: 'var(--text-3)', lineHeight: 1.6 }}>
            Connect your own wallet (MetaMask etc). Switch to Polygon network. Trades execute on Polymarket CLOB from your wallet — approve USDC once, then VURA signs and submits the order. Needs USDC.e and POL for gas.
          </div>
        </div>
      </div>
    </div>
  );
}
