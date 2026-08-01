'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

const DATA = [
  { d: 'Jun 7', ai: 72, mkt: 58 },
  { d: 'Jun 8', ai: 74, mkt: 61 },
  { d: 'Jun 9', ai: 76, mkt: 63 },
  { d: 'Jun 10', ai: 73, mkt: 65 },
  { d: 'Jun 11', ai: 75, mkt: 66 },
  { d: 'Jun 12', ai: 77, mkt: 68 },
  { d: 'Jun 13', ai: 79, mkt: 70 },
  { d: 'Jun 14', ai: 82, mkt: 73 },
  { d: 'Jun 15', ai: 85, mkt: 76 },
  { d: 'Jun 16', ai: 88, mkt: 80 },
  { d: 'Jun 17', ai: 91, mkt: 84 },
  { d: 'Jun 18', ai: 94, mkt: 88 },
  { d: 'Jun 19', ai: 96, mkt: 92 },
  { d: 'Jun 20', ai: 99, mkt: 97 },
];

function CTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 4, padding: '8px 12px', fontSize: 12, fontFamily: 'var(--mono)' }}>
      <div style={{ color: 'var(--text-3)', marginBottom: 4, fontSize: 11 }}>{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, color: p.color }}>
          <span>{p.name === 'ai' ? 'VURA AI' : 'Market'}</span><span style={{ fontWeight: 700 }}>{p.value}%</span>
        </div>
      ))}
    </div>
  );
}

export default function TrackRecord() {
  return (
    <div style={{ maxWidth: 1100, margin: '40px auto 0', fontFamily: 'var(--mono)' }}>
      <div style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.08em', marginBottom: 10 }}>
        TRACK RECORD — Verified prediction
      </div>

      <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 4, padding: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#059669', marginBottom: 2 }}>✓ RESOLVED YES</div>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Will Bitcoin close above $70K on June 20, 2026?</div>
            <div style={{ fontSize: 9, color: 'var(--text-3)', display: 'flex', gap: 16 }}>
              <span>Started: 58% market price</span>
              <span style={{ color: '#7B61FF' }}>VURA day-1: 72% AI prediction</span>
              <span style={{ color: '#059669' }}>Resolved: YES at 100%</span>
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 8, color: 'var(--text-3)', marginBottom: 2 }}>AI EDGE AT START</div>
            <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--display)', color: '#059669' }}>+14%</div>
          </div>
        </div>

        <div style={{ height: 160 }}>
          <ResponsiveContainer>
            <LineChart data={DATA} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="d" tick={{ fill: 'var(--text-3)', fontSize: 8, fontFamily: 'var(--mono)' }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} interval="preserveStartEnd" />
              <YAxis domain={[50, 100]} tick={{ fill: 'var(--text-3)', fontSize: 8, fontFamily: 'var(--mono)' }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} width={24} />
              <Tooltip content={<CTooltip />} />
              <Line type="monotone" dataKey="ai" name="VURA AI" stroke="#7B61FF" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#7B61FF' }} />
              <Line type="monotone" dataKey="mkt" name="Market" stroke="#059669" strokeWidth={1.5} strokeDasharray="4 2" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(5,150,105,0.05)', border: '1px solid rgba(5,150,105,0.15)', borderRadius: 3 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 10, color: '#059669', fontWeight: 600 }}>VURA detected a +14% edge when the market was at 58%.</span>
            <span style={{ fontSize: 9, color: 'var(--text-3)' }}>
              Google Trends +72 · GNews coverage 65/100 · Reddit discussion 58/100 — all pointed up.
              Market converged to VURA&apos;s prediction over 14 days.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
