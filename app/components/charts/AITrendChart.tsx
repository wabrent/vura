'use client';

import { useMemo, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

interface DataPoint {
  ts: string;
  ai: number;
  market: number;
}

interface Props {
  data: DataPoint[];
  aiAvg: number;
  marketAvg: number;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 4, padding: '8px 10px',
      fontSize: 12, fontFamily: 'var(--mono)', boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
    }}>
      <div style={{ color: 'var(--text-3)', marginBottom: 4, fontSize: 11 }}>{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, color: p.color, lineHeight: 1.6, fontSize: 12 }}>
          <span>{p.name === 'ai' ? 'AI' : 'Market'}</span>
          <span style={{ fontWeight: 700 }}>{p.value}%</span>
        </div>
      ))}
    </div>
  );
}

export default function AITrendChart({ data, aiAvg, marketAvg }: Props) {
  const edge = aiAvg - marketAvg;
  const edgeColor = edge > 0 ? '#059669' : edge < 0 ? '#dc2626' : '#737373';
  const [hovered, setHovered] = useState(false);

  if (!data.length) return null;

  return (
      <div style={{ background: 'var(--bg-2)', border: '1px solid #222', borderRadius: 3, padding: 14, fontSize: 11,
      transition: 'border-color 0.2s',
      ...(hovered ? { borderColor: 'var(--text-3)' } : {}),
    }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 9, color: '#666', letterSpacing: '0.06em', marginBottom: 2 }}>AI vs MARKET TREND</div>
          <div style={{ fontSize: 8, color: 'var(--text-3)', letterSpacing: '0.04em' }}>Real-time VURA Agent signal evolution</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#059669', animation: 'pulse 2s ease-in-out infinite' }} />
          <span style={{ fontSize: 8, color: 'var(--text-3)' }}>Live</span>
        </div>
      </div>

      <div style={{ height: 140, width: '100%' }}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" vertical={false} />
            <XAxis
              dataKey="ts"
              tick={{ fill: '#666', fontSize: 9, fontFamily: 'var(--mono)' }}
              axisLine={{ stroke: 'var(--border)' }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: '#666', fontSize: 9, fontFamily: 'var(--mono)' }}
              axisLine={{ stroke: 'var(--border)' }}
              tickLine={false}
              width={28}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="ai"
              stroke="#7B61FF"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#7B61FF', stroke: 'var(--bg-2)', strokeWidth: 2 }}
              isAnimationActive={true}
              animationDuration={800}
              animationEasing="ease-out"
            />
            <Line
              type="monotone"
              dataKey="market"
              stroke="#059669"
              strokeWidth={1.5}
              strokeDasharray="4 2"
              dot={false}
              activeDot={{ r: 4, fill: '#059669', stroke: 'var(--bg-2)', strokeWidth: 2 }}
              isAnimationActive={true}
              animationDuration={800}
              animationEasing="ease-out"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 10, paddingTop: 10, borderTop: '1px solid #1a1a1a' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 10, height: 2, borderRadius: 1, background: '#7B61FF' }} />
          <span style={{ fontSize: 9, color: '#666' }}>AI {aiAvg}%</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 10, height: 1.5, borderRadius: 1, background: '#059669' }} />
          <span style={{ fontSize: 9, color: '#666' }}>Market {marketAvg}%</span>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <span style={{ fontSize: 9, color: '#666' }}>Edge </span>
          <span style={{ fontSize: 12, fontWeight: 700, color: edgeColor }}>
            {edge > 0 ? '+' : ''}{edge}%
          </span>
        </div>
      </div>

      {data.length > 0 && (
        <div style={{ fontSize: 8, color: 'var(--text-3)', marginTop: 4, textAlign: 'right' }}>
          Updated {data[data.length - 1]?.ts || '—'}
        </div>
      )}
    </div>
  );
}
