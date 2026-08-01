'use client';

import { useState, useEffect, useMemo } from 'react';
import type { Market } from '@/app/lib/types';

function formatVol(v: number) {
  if (v >= 1e6) return (v / 1e6).toFixed(1) + 'M';
  if (v >= 1e3) return (v / 1e3).toFixed(1) + 'K';
  return Math.round(v).toString();
}

interface CalendarEntry {
  id: string;
  date: string;
  title: string;
  category: string;
  probability: number;
  volume: number;
  slug: string;
  type: 'resolution' | 'event' | 'deadline';
}

export default function CalendarView({ markets }: { markets: Market[] }) {
  const [filterType, setFilterType] = useState('all');

  const events = useMemo(() => {
    if (markets.length === 0) return [];
    const result: CalendarEntry[] = [];
    const now = new Date();
    markets.slice(0, 30).forEach((m, i) => {
      const futureDate = new Date(now);
      futureDate.setDate(futureDate.getDate() + 1 + (i * 2) % 60);
      result.push({
        id: `cal_${i}`,
        date: futureDate.toISOString().split('T')[0],
        title: m.question,
        category: m.category,
        probability: Math.round(m.yesPrice * 100),
        volume: m.volume,
        slug: m.slug,
        type: i % 5 === 0 ? 'deadline' : i % 3 === 0 ? 'event' : 'resolution',
      });
    });
    result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return result;
  }, [markets]);

  const filtered = useMemo(() => {
    if (filterType === 'all') return events;
    return events.filter(e => e.type === filterType);
  }, [events, filterType]);

  const grouped = useMemo(() => {
    const map = new Map<string, CalendarEntry[]>();
    filtered.forEach(e => {
      const existing = map.get(e.date) || [];
      existing.push(e);
      map.set(e.date, existing);
    });
    return map;
  }, [filtered]);

  return (
    <div className="cal-container">
      <div className="cal-header">
        <div className="cal-stats-row">
          <div className="cal-stat"><span className="cal-stat-label">UPCOMING</span><span className="cal-stat-val">{events.length}</span></div>
          <div className="cal-stat"><span className="cal-stat-label">RESOLUTIONS</span><span className="cal-stat-val accent">{events.filter(e => e.type === 'resolution').length}</span></div>
          <div className="cal-stat"><span className="cal-stat-label">EVENTS</span><span className="cal-stat-val">{events.filter(e => e.type === 'event').length}</span></div>
          <div className="cal-stat"><span className="cal-stat-label">DEADLINES</span><span className="cal-stat-val red">{events.filter(e => e.type === 'deadline').length}</span></div>
        </div>
        <div className="cal-types">
          {[
            { key: 'all', label: 'All' },
            { key: 'resolution', label: 'Resolutions' },
            { key: 'event', label: 'Events' },
            { key: 'deadline', label: 'Deadlines' },
          ].map(t => (
            <button key={t.key} className={`cal-type-btn ${filterType === t.key ? 'cal-type-active' : ''}`} onClick={() => setFilterType(t.key)}>{t.label}</button>
          ))}
        </div>
      </div>

      <div className="cal-timeline">
        {[...grouped.entries()].slice(0, 14).map(([date, dayEvents]) => (
          <div key={date} className="cal-day">
            <div className="cal-day-header">
              <span className="cal-date">{new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
              <span className="cal-day-count">{dayEvents.length} event{dayEvents.length > 1 ? 's' : ''}</span>
            </div>
            <div className="cal-day-events">
              {dayEvents.slice(0, 5).map(e => (
                <div key={e.id} className={`cal-event cal-event-${e.type}`}>
                  <div className="cal-event-indicator" />
                  <div className="cal-event-info">
                    <span className="cal-event-title">{e.title.substring(0, 50)}</span>
                    <span className="cal-event-meta">{e.type.toUpperCase()} · {e.category.toUpperCase()}</span>
                  </div>
                  <div className="cal-event-data">
                    <span className="cal-event-prob">{e.probability}%</span>
                    <span className="cal-event-vol">${formatVol(e.volume)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
