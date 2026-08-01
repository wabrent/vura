'use client';

import { useEffect, useRef, useState } from 'react';

const EXCHANGES = ['MEXC', 'Bitget', 'KuCoin', 'Gate.io', 'Bybit', 'OKX', 'HTX', 'BingX', 'LBank', 'Uniswap'];

const FAQ = [
  { q: 'What are listing signals?', a: 'We detect upcoming token listings on CEX exchanges before they’re publicly announced — giving you early entry at the lowest price.' },
  { q: 'How often do signals arrive?', a: '1–3 signals per day on average. Weekends are slower, weekdays peak during Asian and European trading sessions.' },
  { q: 'How much can I earn?', a: 'Returns vary. Our tracked average is +85% ROI per signal. But remember: not every signal wins. Risk management is key.' },
  { q: 'Is it free?', a: 'We are in early access. Join the waitlist now to get first access when we launch. No payment required yet.' },
  { q: 'How do I connect?', a: 'Connect your wallet via Privy, then receive signals directly in your dashboard. Join our Telegram for live updates.' },
];

function CountUp({ target, suffix, prefix }: { target: number; suffix?: string; prefix?: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        let start = 0;
        const duration = 1500;
        const step = () => {
          start += 40;
          const progress = Math.min(start / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setVal(Math.round(eased * target));
          if (progress < 1) requestAnimationFrame(step);
        };
        step();
        observer.disconnect();
      }
    }, { threshold: 0.3 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [target]);

  return <span ref={ref}>{prefix}{val.toLocaleString()}{suffix}</span>;
}

export default function LandingSections() {
  return (
    <>
      {/* ═══════════ HOW IT WORKS ═══════════ */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 0 32px', fontFamily: 'var(--mono)' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 10, color: '#7B61FF', letterSpacing: '0.1em', marginBottom: 8 }}>HOW IT WORKS</div>
          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--display)', marginBottom: 8 }}>3 steps to your first listing trade</div>
          <div style={{ fontSize: 11, color: 'var(--text-3)' }}>No complex tools. No prior experience needed.</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {[
            { icon: '01', num: '01', title: 'Connect Wallet', desc: 'Link your wallet via Privy — read-only access, no signatures needed. Your keys stay yours.' },
            { icon: '02', num: '02', title: 'Receive Signals', desc: 'Get instant alerts when our AI detects a new listing opportunity on top CEX exchanges.' },
            { icon: '03', num: '03', title: 'Trade & Profit', desc: 'Enter early, ride the listing pump, exit at your target. Average ROI: +85% per signal.' },
          ].map((step, i) => (
            <div key={i} className="step-card" style={{
              background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 4, padding: '24px 20px',
              textAlign: 'center', transition: 'transform 0.2s, border-color 0.2s',
            }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>{step.icon}</div>
              <div style={{ fontSize: 9, color: '#7B61FF', marginBottom: 4, letterSpacing: '0.08em' }}>{step.num}</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, fontFamily: 'var(--display)' }}>{step.title}</div>
              <div style={{ fontSize: 10, color: 'var(--text-3)', lineHeight: 1.6 }}>{step.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════ STATS ═══════════ */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 0', fontFamily: 'var(--mono)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
          {[
            { label: 'SUBSCRIBERS', target: 2894, suffix: '+' },
            { label: 'SIGNALS SENT', target: 347, suffix: '' },
            { label: 'AVG ROI', target: 85, suffix: '%' },
            { label: 'WIN RATE', target: 82, suffix: '%' },
          ].map((s, i) => (
            <div key={i} style={{ background: 'var(--bg-2)', padding: '20px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 8, color: 'var(--text-3)', letterSpacing: '0.08em', marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--display)', color: i >= 2 ? '#059669' : 'var(--text)' }}>
                <CountUp target={s.target} suffix={s.suffix} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════ LIVE SIGNAL ═══════════ */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 0', fontFamily: 'var(--mono)' }}>
        <div style={{ background: 'var(--bg-2)', border: '1px solid rgba(5,150,105,0.2)', borderRadius: 4, padding: 24, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 2, background: 'linear-gradient(90deg, transparent, #059669, transparent)', animation: 'shimmer 3s infinite' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#059669', animation: 'pulse 1.5s infinite' }} />
                <span style={{ fontSize: 9, color: '#059669', letterSpacing: '0.06em', fontWeight: 600 }}>LIVE SIGNAL · ACTIVE</span>
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>$VIRTUAL — Listing on MEXC in ~48h</div>
              <div style={{ fontSize: 10, color: 'var(--text-3)', display: 'flex', gap: 20 }}>
                <span>Entry: <span style={{ color: 'var(--text)' }}>$0.012</span></span>
                <span>Current: <span style={{ color: '#059669' }}>$0.045</span></span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 9, color: 'var(--text-3)', marginBottom: 2 }}>PROFIT</div>
              <div style={{ fontSize: 36, fontWeight: 700, fontFamily: 'var(--display)', color: '#059669' }}>+275%</div>
            </div>
          </div>
          <div style={{ height: 4, background: 'var(--bg)', borderRadius: 2, overflow: 'hidden', marginBottom: 10 }}>
            <div style={{ width: '78%', height: '100%', background: 'linear-gradient(90deg, #7B61FF, #059669)', borderRadius: 2, transition: 'width 0.6s ease' }} />
          </div>
          <div style={{ fontSize: 9, color: 'var(--text-3)', display: 'flex', gap: 16 }}>
            <span>Liquidity: $2.4M</span>
            <span>Volume 24h: $890K</span>
            <span>Holders: 12.4K</span>
          </div>
        </div>
      </section>

      {/* ═══════════ EXCHANGES ═══════════ */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 0', fontFamily: 'var(--mono)', textAlign: 'center' }}>
        <div style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.08em', marginBottom: 16 }}>EXCHANGES WE MONITOR</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 12 }}>
          {EXCHANGES.map(e => (
            <span key={e} style={{
              padding: '8px 16px', fontSize: 10, fontWeight: 600,
              background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 3,
              color: 'var(--text-2)', letterSpacing: '0.04em',
            }}>{e}</span>
          ))}
        </div>
      </section>

      {/* ═══════════ TELEGRAM PREVIEW ═══════════ */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 0', fontFamily: 'var(--mono)' }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 10, color: '#7B61FF', letterSpacing: '0.1em', marginBottom: 8 }}>TELEGRAM SIGNALS</div>
          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--display)', marginBottom: 8 }}>Instant alerts. Zero delay.</div>
          <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Every signal lands in your Telegram the moment we detect it.</div>
        </div>
        <div style={{ maxWidth: 500, margin: '0 auto', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#229ED9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>V</div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#229ED9' }}>VURA Signals</div>
              <div style={{ fontSize: 8, color: 'var(--text-3)' }}>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          </div>
          <div style={{ background: 'var(--bg)', borderRadius: 6, padding: 12, fontSize: 10, lineHeight: 1.7 }}>
            <div style={{ color: '#7B61FF', fontWeight: 600, marginBottom: 4 }}>NEW LISTING DETECTED</div>
            <div style={{ color: 'var(--text-2)' }}>
              <span style={{ fontWeight: 600 }}>Token:</span> $VIRTUAL<br />
              <span style={{ fontWeight: 600 }}>Exchange:</span> MEXC<br />
              <span style={{ fontWeight: 600 }}>Est. listing:</span> ~48 hours<br />
              <span style={{ fontWeight: 600 }}>Entry range:</span> $0.011 — $0.014<br />
              <span style={{ fontWeight: 600 }}>Target:</span> +200-400%
            </div>
          </div>
          <div style={{ borderTop: '1px solid var(--border)', marginTop: 10, paddingTop: 10 }}>
            <a href="https://t.me" target="_blank" style={{ display: 'block', textAlign: 'center', padding: '6px 12px', background: '#229ED9', color: '#fff', borderRadius: 4, fontSize: 10, fontWeight: 600, textDecoration: 'none' }}>
              Join Telegram Channel →
            </a>
          </div>
        </div>
      </section>

      {/* ═══════════ FAQ ═══════════ */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 0 20px', fontFamily: 'var(--mono)' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 10, color: '#7B61FF', letterSpacing: '0.1em', marginBottom: 8 }}>FAQ</div>
          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--display)' }}>Everything you need to know</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {FAQ.map((item, i) => (
            <details key={i} style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden' }}>
              <summary style={{ padding: '14px 18px', fontSize: 11, fontWeight: 500, cursor: 'pointer', listStyle: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {item.q}
                <span style={{ fontSize: 8, color: 'var(--text-3)' }}>▼</span>
              </summary>
              <div style={{ padding: '0 18px 14px', fontSize: 10, color: 'var(--text-3)', lineHeight: 1.6 }}>{item.a}</div>
            </details>
          ))}
        </div>
      </section>

      {/* ═══════════ CTA ═══════════ */}
      <section style={{ maxWidth: 1100, margin: '32px auto 0', fontFamily: 'var(--mono)', textAlign: 'center', padding: '32px 24px', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 4 }}>
        <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--display)', marginBottom: 8 }}>Ready to front-run the market?</div>
        <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 20 }}>Join early access. No spam. One signal can change everything.</div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="https://t.me" target="_blank"
            style={{ padding: '12px 28px', fontSize: 11, fontWeight: 600, background: '#229ED9', color: '#fff', borderRadius: 4, textDecoration: 'none', letterSpacing: '0.04em' }}>
            Join Telegram Channel
          </a>
          <button onClick={() => { const early = document.querySelector<HTMLElement>('[data-early-access]'); early?.click?.(); }}
            style={{ padding: '12px 28px', fontSize: 11, fontWeight: 600, background: '#7B61FF', border: 'none', color: '#fff', borderRadius: 4, cursor: 'pointer', fontFamily: 'var(--mono)', letterSpacing: '0.04em' }}>
            Get Early Access
          </button>
        </div>
      </section>
    </>
  );
}
