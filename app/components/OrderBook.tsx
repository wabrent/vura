'use client';

import { useState, useEffect, useMemo } from 'react';

interface PriceLevel {
  price: string;
  size: string;
}

export default function OrderBook({ tokenId, onClose }: { tokenId: string; onClose?: () => void }) {
  const [bids, setBids] = useState<PriceLevel[]>([]);
  const [asks, setAsks] = useState<PriceLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [metadata, setMetadata] = useState<any>(null);

  useEffect(() => {
    if (!tokenId) return;
    setLoading(true);
    setError('');
    fetch(`/api/polynode?path=/v1/orderbook/${tokenId}`)
      .then(r => r.json())
      .then((data: any) => {
        if (data.error) { setError(data.error); return; }
        setBids(data.bids || []);
        setAsks(data.asks || []);
        setMetadata(data.metadata || data);
      })
      .catch(() => setError('Failed to fetch order book'))
      .finally(() => setLoading(false));
  }, [tokenId]);

  const { maxBidSize, maxAskSize, bidDepth, askDepth } = useMemo(() => {
    const maxB = Math.max(...(bids.map((b: any) => parseFloat(b.size))), 1);
    const maxA = Math.max(...(asks.map((a: any) => parseFloat(a.size))), 1);
    let bd = 0, ad = 0;
    bids.forEach((b: any) => bd += parseFloat(b.size));
    asks.forEach((a: any) => ad += parseFloat(a.size));
    return { maxBidSize: maxB, maxAskSize: maxA, bidDepth: bd, askDepth: ad };
  }, [bids, asks]);

  const stackedBids = [...bids].reverse();
  const stackedAsks = [...asks];

  if (loading) return <div style={{ padding: '1rem', fontSize: '0.7rem', color: 'var(--text-3)' }}>Loading order book...</div>;
  if (error) return <div style={{ padding: '1rem', fontSize: '0.7rem', color: 'var(--red)' }}>{error}</div>;

  return (
    <div style={{ border: '1px solid var(--border)', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.6rem', letterSpacing: '0.1em', color: 'var(--text-3)' }}>ORDER BOOK</span>
        <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.55rem', color: 'var(--text-3)' }}>
          <span>Bid depth: {bidDepth.toFixed(0)}</span>
          <span>Ask depth: {askDepth.toFixed(0)}</span>
        </div>
      </div>
      {metadata?.image && <img src={metadata.image} alt="" style={{ width: '100%', height: 48, objectFit: 'cover', borderRadius: 2 }} />}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.25rem', fontSize: '0.55rem' }}>
        <span style={{ color: 'var(--text-3)', textAlign: 'left' }}>Bid Size</span>
        <span style={{ color: 'var(--text-3)', textAlign: 'center' }}>Price</span>
        <span style={{ color: 'var(--text-3)', textAlign: 'right' }}>Ask Size</span>
      </div>
      <div style={{ maxHeight: 240, overflow: 'hidden' }}>
        {Array.from({ length: Math.max(stackedBids.length, stackedAsks.length) }).map((_, i) => {
          const b = stackedBids[i];
          const a = stackedAsks[i];
          const bSize = b ? parseFloat(b.size) : 0;
          const aSize = a ? parseFloat(a.size) : 0;
          return (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.25rem', fontSize: '0.6rem', height: 18, alignItems: 'center' }}>
              <div style={{ position: 'relative', textAlign: 'right' }}>
                <div style={{ position: 'absolute', right: 0, top: 0, height: '100%', width: `${(bSize / maxBidSize) * 100}%`, background: 'rgba(5,150,105,0.08)', transition: 'width 0.3s' }} />
                <span style={{ position: 'relative', zIndex: 1, color: 'var(--text-3)', paddingRight: 4 }}>{b ? parseFloat(b.size).toFixed(0) : ''}</span>
              </div>
              <span style={{ textAlign: 'center', color: b ? 'var(--accent)' : a ? 'var(--red)' : 'var(--text-3)', fontWeight: 500 }}>
                {b ? parseFloat(b.price).toFixed(3) : a ? parseFloat(a.price).toFixed(3) : ''}
              </span>
              <div style={{ position: 'relative', textAlign: 'left' }}>
                <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${(aSize / maxAskSize) * 100}%`, background: 'rgba(220,38,38,0.08)', transition: 'width 0.3s' }} />
                <span style={{ position: 'relative', zIndex: 1, color: 'var(--text-3)', paddingLeft: 4 }}>{a ? parseFloat(a.size).toFixed(0) : ''}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
