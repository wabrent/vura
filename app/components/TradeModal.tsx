'use client';

import { useState } from 'react';
import { useWallets, usePrivy } from '@privy-io/react-auth';
import type { Market } from '@/app/lib/types';

const CTF_EXCHANGE = '0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E';

export default function TradeModal({
  market, watchlist, onClose,
  onWatchlistToggle, onAlert, onShare
}: {
  market: Market;
  watchlist: Set<string>;
  onClose: () => void;
  onWatchlistToggle: () => void;
  onAlert: () => void;
  onShare: () => void;
}) {
  const { wallets } = useWallets();
  const { user } = usePrivy();
  const [side, setSide] = useState('BUY');
  const [outcome, setOutcome] = useState('YES');
  const [price, setPrice] = useState(Math.round(market.yesPrice * 100));
  const [amount, setAmount] = useState(10);
  const [status, setStatus] = useState('');
  const [trading, setTrading] = useState(false);

  const shares = price > 0 ? (amount / (price / 100)).toFixed(2) : '0';
  const anyWallet = wallets[0];
  const walletAddress = anyWallet?.address || user?.wallet?.address;

  const placeOrder = async () => {
    const maker = walletAddress;
    if (!maker) { setStatus('No wallet connected'); return; }
    const wallet = anyWallet;
    if (!wallet) { setStatus('Reload page and try again'); return; }
    setTrading(true); setStatus('Signing...');

    try {
      const provider = await wallet.getEthereumProvider();
      const now = Math.floor(Date.now() / 1000);
      const priceNum = price / 100;
      const sizeNum = parseFloat(shares);

      const domain = {
        name: 'CTF Exchange',
        version: '1',
        chainId: 137,
        verifyingContract: CTF_EXCHANGE
      };

      const message = {
        salt: String(Math.floor(Math.random() * 1e12)),
        maker,
        signer: maker,
        taker: '0x0000000000000000000000000000000000000000',
        tokenId: String(outcome === 'YES' ? market.yesTokenId : market.noTokenId),
        makerAmount: String(Math.floor(priceNum * 1e6 * sizeNum)),
        takerAmount: String(Math.floor((1 - priceNum) * 1e6 * sizeNum)),
        expiration: String(now + 3600),
        nonce: '0',
        feeRateBps: '0',
        side: side === 'BUY' ? '0' : '1',
        signatureType: '0'
      };

      const eip712 = {
        types: {
          EIP712Domain: [
            { name: 'name', type: 'string' },
            { name: 'version', type: 'string' },
            { name: 'chainId', type: 'uint256' },
            { name: 'verifyingContract', type: 'address' }
          ],
          Order: [
            { name: 'salt', type: 'uint256' },
            { name: 'maker', type: 'address' },
            { name: 'signer', type: 'address' },
            { name: 'taker', type: 'address' },
            { name: 'tokenId', type: 'uint256' },
            { name: 'makerAmount', type: 'uint256' },
            { name: 'takerAmount', type: 'uint256' },
            { name: 'expiration', type: 'uint256' },
            { name: 'nonce', type: 'uint256' },
            { name: 'feeRateBps', type: 'uint256' },
            { name: 'side', type: 'uint8' },
            { name: 'signatureType', type: 'uint8' }
          ]
        },
        domain,
        primaryType: 'Order' as const,
        message
      };

      setStatus('Check wallet...');

      const signature = await provider.request({
        method: 'eth_signTypedData_v4',
        params: [maker, JSON.stringify(eip712)]
      });

      setStatus('Submitting...');

      const res = await fetch('/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit',
          signedOrder: {
            salt: Number(message.salt),
            maker: message.maker,
            signer: message.signer,
            taker: message.taker,
            tokenId: message.tokenId,
            makerAmount: Number(message.makerAmount),
            takerAmount: Number(message.takerAmount),
            expiration: Number(message.expiration),
            nonce: Number(message.nonce),
            feeRateBps: Number(message.feeRateBps),
            side: message.side,
            signatureType: Number(message.signatureType),
            signature
          }
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      
      setStatus('Order placed!');
      setTimeout(() => { setStatus(''); onClose(); }, 1500);
    } catch (e: any) {
      setStatus(e.message || 'Error');
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
            {!walletAddress ? (
              <div style={{ fontSize: '0.65rem', color: 'var(--text-3)', textAlign: 'center' }}>Connect wallet to trade</div>
            ) : (
              <button className="btn-retry" style={{ width: '100%', background: side === 'BUY' ? 'var(--accent)' : 'var(--red)' }}
                onClick={placeOrder} disabled={trading || !walletAddress}>
                {trading ? status : `${side} ${outcome} @ ${price}c | $${amount}`}
              </button>
            )}
            {status && !trading && <div style={{ fontSize: '0.65rem', textAlign: 'center', color: status.includes('placed') ? 'var(--accent)' : 'var(--red)' }}>{status}</div>}
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
