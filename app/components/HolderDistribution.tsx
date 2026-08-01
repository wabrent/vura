'use client';

import { useState, useEffect } from 'react';

interface Holder {
  proxyWallet: string;
  name: string;
  outcome: string;
  size: number;
  avgPrice: number;
  currPrice: number;
  currentValue: number;
  cashPnl: number;
  realizedPnl: number;
  totalPnl: number;
}

interface OutcomeGroup {
  token: string;
  positions: Holder[];
}

export default function HolderDistribution({ slug, conditionId, onClose }: {
  slug: string;
  conditionId?: string | null;
  onClose: () => void;
}) {
  const [outcomes, setOutcomes] = useState<OutcomeGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const id = conditionId || slug;

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError('');
    fetch(`/api/polynode?path=/v1/markets/${encodeURIComponent(id)}/positions&query=limit%3D10%26sortBy%3DTOTAL_PNL%26sortDirection%3DDESC`)
      .then(r => r.json())
      .then((data: any) => {
        if (data.error) { setError(data.error); return; }
        if (data.outcomes) setOutcomes(data.outcomes);
        else setError('No holder data');
      })
      .catch(() => setError('Failed to load'))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="modal-overlay animate-fade-in" onClick={e => { if ((e.target as HTMLElement).className === 'modal-overlay') onClose(); }}>
      <div className="modal animate-scale-in" style={{ maxWidth: '48rem' }}>
        <div className="modal-header">
          <span className="modal-title">HOLDER DISTRIBUTION</span>
          <button className="modal-close" onClick={onClose}>x</button>
        </div>
        <div className="modal-body">
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              {[1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{ height: '2rem', animationDelay: `${i*0.1}s` }} />)}
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-3)', fontSize: '0.75rem' }}>{error}</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {outcomes.map((og, oi) => (
                <div key={oi}>
                  <div style={{ fontSize: '0.6rem', letterSpacing: '0.1em', color: 'var(--accent)', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                    {og.positions[0]?.outcome || 'Outcome'} — Top {og.positions.length} Holders
                  </div>
                  <div className="lb-table">
                    <div className="lb-table-header" style={{ gridTemplateColumns: '2rem 1fr 5rem 5rem 5rem 5rem' }}>
                      <span>#</span>
                      <span>Holder</span>
                      <span style={{ textAlign: 'right' }}>Size</span>
                      <span style={{ textAlign: 'right' }}>Entry</span>
                      <span style={{ textAlign: 'right' }}>Value</span>
                      <span style={{ textAlign: 'right' }}>P&L</span>
                    </div>
                    {og.positions.map((h, i) => (
                      <div key={i} className="lb-row animate-slide-up" style={{ gridTemplateColumns: '2rem 1fr 5rem 5rem 5rem 5rem', animationDelay: `${i*0.05}s` }}>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-3)' }}>{i + 1}</span>
                        <span style={{ fontSize: '0.65rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {h.name || h.proxyWallet.slice(0, 8) + '...'}
                        </span>
                        <span style={{ fontSize: '0.6rem', textAlign: 'right' }}>{h.size.toFixed(0)}</span>
                        <span style={{ fontSize: '0.6rem', textAlign: 'right' }}>{(h.avgPrice * 100).toFixed(1)}c</span>
                        <span style={{ fontSize: '0.6rem', textAlign: 'right' }}>${(h.currentValue).toFixed(0)}</span>
                        <span style={{ fontSize: '0.6rem', textAlign: 'right', color: h.cashPnl >= 0 ? 'var(--accent)' : 'var(--red)' }}>
                          {h.cashPnl >= 0 ? '+' : ''}${Math.abs(h.cashPnl).toFixed(0)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
