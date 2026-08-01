'use client';

import type { DriftScore } from '@/app/lib/drift';

export default function DriftBadge({ drift, onClick }: { drift: DriftScore; onClick: () => void }) {
  const s = drift.score;
  const abs = Math.abs(s);

  if (abs < 5) return null;

  const color = s > 0 ? '#059669' : '#dc2626';
  const bg = s > 0 ? 'rgba(5,150,105,0.1)' : 'rgba(220,38,38,0.08)';
  const border = s > 0 ? 'rgba(5,150,105,0.3)' : 'rgba(220,38,38,0.25)';

  return (
    <span
      onClick={e => { e.stopPropagation(); onClick(); }}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 2,
        fontSize: '0.55rem', fontWeight: 600,
        padding: '1px 6px', borderRadius: 3,
        background: bg, border: `1px solid ${border}`,
        color, cursor: 'pointer',
        fontFamily: 'var(--mono)',
        whiteSpace: 'nowrap',
      }}
      title={`Drift ${s > 0 ? '+' : ''}${s}`}>
      {s > 0 ? '+' : ''}{s}
    </span>
  );
}
