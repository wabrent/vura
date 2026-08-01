'use client';

import type { DriftScore } from '@/app/lib/drift';

export default function DriftBreakdown({ drift, marketTitle, onClose }: {
  drift: DriftScore;
  marketTitle: string;
  onClose: () => void;
}) {
  const s = drift.score;
  const { sentimentDelta, priceVelocity, volumeSpike } = drift.components;
  const color = s > 0 ? '#059669' : '#dc2626';

  const labelText = s > 30 ? 'Market is underpriced — price may rise soon'
    : s > 10 ? 'Slight bullish drift'
    : s < -30 ? 'Market is overpriced — expect correction'
    : s < -10 ? 'Slight bearish drift'
    : 'Price matches information flow';

  const bars = [
    { label: 'Sentiment', val: sentimentDelta, max: 30, color: '#7B61FF' },
    { label: 'Price Velocity', val: priceVelocity, max: 30, color: '#f59e0b' },
    { label: 'Volume Spike', val: volumeSpike, max: 20, color: '#3b82f6' },
  ];

  const absMax = Math.max(...bars.map(b => Math.abs(b.val)), 1);
  const barScale = 100 / Math.max(absMax, 1);

  return (
    <div className="modal-overlay animate-fade-in" onClick={e => { if ((e.target as HTMLElement).className === 'modal-overlay') onClose(); }}>
      <div className="modal animate-scale-in" style={{ maxWidth: '32rem' }}>
        <div className="modal-header">
          <span className="modal-title" style={{ fontSize: 11 }}>CONSENSUS DRIFT</span>
          <button className="modal-close" onClick={onClose}>x</button>
        </div>
        <div className="modal-body">
          <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 2 }}>{marketTitle.slice(0, 60)}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 16 }}>
            <span style={{ fontSize: 36, fontWeight: 700, fontFamily: 'var(--display)', color }}>{s > 0 ? '+' : ''}{s}</span>
            <span style={{ fontSize: 10, color: 'var(--text-3)', maxWidth: 180, lineHeight: 1.4 }}>{labelText}</span>
          </div>

          <div style={{ fontSize: 9, color: 'var(--text-3)', letterSpacing: '0.06em', marginBottom: 10 }}>COMPONENT BREAKDOWN</div>

          {bars.map((b, i) => {
            const barW = Math.min(100, Math.abs(b.val) * barScale);
            const isNeg = b.val < 0;
            return (
              <div key={i} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 3 }}>
                  <span style={{ color: 'var(--text-2)' }}>{b.label}</span>
                  <span style={{ color: b.color, fontWeight: 700 }}>{b.val > 0 ? '+' : ''}{Math.round(b.val)}</span>
                </div>
                <div style={{ height: 5, background: 'var(--bg)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 3,
                    width: `${barW}%`,
                    marginLeft: isNeg ? 'auto' : 0,
                    background: b.color, opacity: 0.7,
                  }} />
                </div>
              </div>
            );
          })}

          <div style={{ borderTop: '1px solid var(--border)', marginTop: 14, paddingTop: 10 }}>
            <div style={{ fontSize: 9, color: 'var(--text-3)', marginBottom: 6 }}>FORMULA</div>
            <div style={{ fontSize: 8, color: 'var(--text-3)', fontFamily: 'var(--mono)', lineHeight: 1.6 }}>
              Drift = (Sentiment &times;&nbsp;0.4) + (Velocity &times;&nbsp;0.35) + (Volume &times;&nbsp;0.25)<br />
              = ({sentimentDelta > 0 ? '+' : ''}{Math.round(sentimentDelta)} &times; 0.4) + ({priceVelocity > 0 ? '+' : ''}{Math.round(priceVelocity)} &times; 0.35) + ({volumeSpike > 0 ? '+' : ''}{Math.round(volumeSpike)} &times; 0.25)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
