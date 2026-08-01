'use client';

import { useState } from 'react';

export default function EarlyAccess({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [email, setEmail] = useState('');
  const [handle, setHandle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!email.includes('@')) { setError('Valid email required'); return; }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, handle }),
      });
      const data = await res.json();
      if (data.ok !== undefined) {
        setStep('success');
        localStorage.setItem('vura_registered', '1');
      } else {
        setError(data.error || 'Try again');
      }
    } catch {
      setError('Network error');
    }
    setSubmitting(false);
  };

  return (
    <div className="modal-overlay animate-fade-in" onClick={e => { if ((e.target as HTMLElement).className === 'modal-overlay') onClose(); }}>
      <div className="modal animate-scale-in" style={{ maxWidth: '26rem' }}>
        <div className="modal-header" style={{ background: 'var(--bg-2)', borderBottom: '1px solid var(--border)' }}>
          <span className="modal-title" style={{ fontSize: 12, color: '#7B61FF' }}>VURA EARLY ACCESS</span>
          {step !== 'success' && <button className="modal-close" onClick={onClose}>x</button>}
        </div>
        <div className="modal-body" style={{ padding: '20px 24px' }}>
          {step === 'form' ? (
            <>
              <p style={{ fontSize: 11, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 16 }}>
                Be the first to access VURA — Bloomberg-terminal for Polymarket prediction markets.
                Real-time analytics, AI signals, whale tracking.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 8, color: 'var(--text-3)', letterSpacing: '0.06em', marginBottom: 4, textTransform: 'uppercase' }}>Email</div>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && submit()}
                    placeholder="you@example.com"
                    style={{ width: '100%', padding: '8px 12px', fontSize: 12, background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 4, fontFamily: 'inherit', outline: 'none' }} />
                </div>
                <div>
                  <div style={{ fontSize: 8, color: 'var(--text-3)', letterSpacing: '0.06em', marginBottom: 4, textTransform: 'uppercase' }}>Telegram / X handle (optional)</div>
                  <input type="text" value={handle} onChange={e => setHandle(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && submit()}
                    placeholder="@username"
                    style={{ width: '100%', padding: '8px 12px', fontSize: 12, background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 4, fontFamily: 'inherit', outline: 'none' }} />
                </div>
              </div>

              {error && <div style={{ fontSize: 10, color: '#dc2626', marginBottom: 8 }}>{error}</div>}

              <button onClick={submit} disabled={submitting}
                style={{ width: '100%', padding: '10px 0', fontSize: 12, fontWeight: 600, background: submitting ? '#555' : '#7B61FF', border: 'none', color: '#fff', borderRadius: 4, cursor: submitting ? 'wait' : 'pointer', fontFamily: 'inherit', letterSpacing: '0.05em' }}>
                {submitting ? 'REGISTERING...' : 'JOIN EARLY ACCESS'}
              </button>

              <div style={{ fontSize: 8, color: 'var(--text-3)', textAlign: 'center', marginTop: 10 }}>
                No spam. One email when we launch.
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>V</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#7B61FF', marginBottom: 6 }}>You&apos;re on the list.</div>
              <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 16 }}>
                We&apos;ll let you know when VURA opens.
              </div>
              <button onClick={onClose}
                style={{ fontSize: 11, padding: '6px 16px', background: '#7B61FF', border: 'none', color: '#fff', borderRadius: 3, cursor: 'pointer', fontFamily: 'inherit' }}>
                Continue to Terminal
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
