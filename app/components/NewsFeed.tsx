'use client';

import { useState, useEffect, useMemo } from 'react';

interface NewsItem {
  id: string;
  title: string;
  source: string;
  url: string;
  date: string;
  summary: string;
  category: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  relevance: number;
}

export default function NewsFeed() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  useEffect(() => {
    fetch('/api/news')
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d)) setItems(d);
        else if (d.error) setError(d.error);
        else setItems([]);
      })
      .catch(() => setError('Failed to load news'))
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => {
    const cats = new Set(items.map(n => n.category));
    return ['all', ...cats];
  }, [items]);

  const filtered = useMemo(() => {
    if (filterCategory === 'all') return items;
    return items.filter(n => n.category === filterCategory);
  }, [items, filterCategory]);

  if (loading) return <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
    {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: '5rem', animationDelay: `${i * 0.1}s` }} />)}
  </div>;

  if (error) return <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-3)' }}>
    <div style={{ fontSize: '0.8rem', marginBottom: '0.5rem' }}>{error}</div>
    <div style={{ fontSize: '0.6rem', color: 'var(--text-3)' }}>Add NEWSAPI_KEY to .env.local to enable news</div>
  </div>;

  if (items.length === 0) return <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-3)' }}>No news available</div>;

  return (
    <div className="news-container">
      <div className="news-header">
        <div className="news-stats-row">
          <div className="news-stat"><span className="news-stat-label">STORIES</span><span className="news-stat-val">{items.length}</span></div>
          <div className="news-stat"><span className="news-stat-label">BULLISH</span><span className="news-stat-val accent">{items.filter(n => n.sentiment === 'bullish').length}</span></div>
          <div className="news-stat"><span className="news-stat-label">BEARISH</span><span className="news-stat-val red">{items.filter(n => n.sentiment === 'bearish').length}</span></div>
        </div>
        <div className="news-categories">
          {categories.map(c => (
            <button key={c} className={`news-cat-btn ${filterCategory === c ? 'news-cat-active' : ''}`} onClick={() => setFilterCategory(c)}>
              {c === 'all' ? 'All' : c.charAt(0).toUpperCase() + c.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="news-list">
        {filtered.map(item => (
          <div key={item.id} className="news-card" onClick={() => window.open(item.url, '_blank')}>
            <div className="news-card-top">
              <span className="news-source">{item.source}</span>
              <span className="news-category-tag">{item.category.toUpperCase()}</span>
              <span className={`news-sentiment news-sentiment-${item.sentiment}`}>
                {item.sentiment === 'bullish' ? '▲' : item.sentiment === 'bearish' ? '▼' : '◆'} {item.sentiment.toUpperCase()}
              </span>
            </div>
            <div className="news-title">{item.title}</div>
            <div className="news-summary">{item.summary}</div>
            <div className="news-card-bottom">
              <span className="news-date">{new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              <div className="news-relevance-bar">
                <div className="news-relevance-fill" style={{ width: `${item.relevance}%` }} />
              </div>
              <span className="news-relevance-label">{item.relevance}% relevance</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
