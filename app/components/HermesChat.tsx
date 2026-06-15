'use client';
import { useState, useRef, useEffect } from 'react';

interface Msg { role: 'user' | 'assistant'; content: string; }

export default function HermesChat() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sid, setSid] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView(); }, [msgs]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const msg = input;
    setInput('');
    setMsgs(prev => [...prev, { role: 'user', content: msg }]);
    setLoading(true);
    try {
      const res = await fetch('/api/hermes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, session_id: sid })
      });
      const data = await res.json();
      setSid(data.session_id);
      setMsgs(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch {
      setMsgs(prev => [...prev, { role: 'assistant', content: '⚠️ Connection error. Try again.' }]);
    }
    setLoading(false);
  };

  return (
    <>
      {/* Toggle Button */}
      <button onClick={() => setOpen(!open)} style={{
        position: 'fixed', bottom: '1.25rem', right: '1.25rem', zIndex: 9999,
        width: '3.25rem', height: '3.25rem', borderRadius: '50%', border: 'none',
        background: 'linear-gradient(135deg, #6C63FF, #3F3D9E)',
        color: '#fff', fontSize: '1.5rem', cursor: 'pointer',
        boxShadow: '0 4px 20px rgba(108,99,255,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'transform 0.2s'
      }}>
        {open ? '✕' : '🤖'}
      </button>

      {/* Chat Panel */}
      {open && (
        <div style={{
          position: 'fixed', bottom: '5.5rem', right: '1.25rem', zIndex: 9999,
          width: '22rem', height: '32rem',
          background: '#0d0d1a', borderRadius: '0.75rem', border: '1px solid rgba(108,99,255,0.3)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)', fontFamily: "'Inter', sans-serif",
          fontSize: '0.85rem'
        }}>
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #6C63FF, #3F3D9E)',
            color: '#fff', padding: '0.85rem 1rem', display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', fontWeight: 600
          }}>
            <span>🤖 Hermes AI</span>
            <span style={{ fontSize: '0.65rem', opacity: 0.7, fontFamily: "'JetBrains Mono', monospace" }}>vura.ink</span>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {msgs.length === 0 && (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#666', fontSize: '0.8rem' }}>
                I'm Hermes — your AI on VURA.<br/>Ask about markets, alpha, or anything.
              </div>
            )}
            {msgs.map((m, i) => (
              <div key={i} style={{
                maxWidth: '88%', padding: '0.6rem 0.85rem', borderRadius: '0.6rem',
                fontSize: '0.8rem', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                ...(m.role === 'user'
                  ? { background: 'rgba(108,99,255,0.25)', color: '#eee', alignSelf: 'flex-end', borderBottomRightRadius: '0.2rem' }
                  : { background: 'rgba(108,99,255,0.08)', color: '#c0c0e0', alignSelf: 'flex-start', borderBottomLeftRadius: '0.2rem', border: '1px solid rgba(108,99,255,0.15)' })
              }}>
                {m.content}
              </div>
            ))}
            {loading && (
              <div style={{ padding: '0.6rem', color: '#6C63FF', fontStyle: 'italic', fontSize: '0.8rem', alignSelf: 'flex-start' }}>
                Thinking...
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ display: 'flex', padding: '0.65rem', gap: '0.4rem', borderTop: '1px solid rgba(108,99,255,0.2)' }}>
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="Ask me anything..."
              disabled={loading}
              style={{
                flex: 1, padding: '0.55rem 0.75rem', borderRadius: '0.4rem', border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.04)', color: '#eee', fontSize: '0.8rem', outline: 'none'
              }} />
            <button onClick={send} disabled={loading} style={{
              padding: '0.55rem 0.85rem', borderRadius: '0.4rem', border: 'none',
              background: loading ? '#444' : 'linear-gradient(135deg, #6C63FF, #3F3D9E)',
              color: '#fff', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '1rem'
            }}>➤</button>
          </div>
        </div>
      )}
    </>
  );
}
