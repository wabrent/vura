"use client";

import { useEffect, useState } from "react";

const SECTIONS = [
  { id: "what", label: "What this is" },
  { id: "token", label: "Track token" },
  { id: "launch", label: "Launch" },
  { id: "fees", label: "Fees" },
  { id: "grad", label: "Graduation" },
  { id: "trade", label: "Buy & sell" },
  { id: "faq", label: "FAQ" },
];

export default function HowItWorks() {
  const [active, setActive] = useState("what");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (vis) setActive(vis.target.id);
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: 0 },
    );
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, []);

  const go = (id: string) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div style={{ position: "relative", zIndex: 0, minHeight: "100vh", paddingBottom: 40 }}>
      <div className="aur" aria-hidden><i /><i /><i /></div>
      <div className="grain" aria-hidden />

      <header className="site-head">
        <a href="/vurafy" className="disp logo" style={{ textDecoration: "none", color: "var(--ink)" }}>VURAFY</a>
        <nav className="nav-main">
          <a href="/vurafy#tracks">Discover</a>
          <a href="/vurafy#artists">Artists</a>
          <a href="https://x.com/vurafy" target="_blank" rel="noreferrer">X ↗</a>
          <a href="/vurafy" className="btn" style={{ textDecoration: "none" }}>Launch a track</a>
        </nav>
        <button
          className="burger"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          onClick={() => setMenuOpen((o) => !o)}
        >
          {menuOpen ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 5l14 14M19 5L5 19" /></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
          )}
        </button>
      </header>
      {menuOpen && (
        <div className="mnav">
          <a href="/vurafy#tracks" onClick={() => setMenuOpen(false)}>Discover</a>
          <a href="/vurafy#artists" onClick={() => setMenuOpen(false)}>Artists</a>
          <a href="https://x.com/vurafy" target="_blank" rel="noreferrer" onClick={() => setMenuOpen(false)}>X ↗</a>
          <a href="/vurafy" onClick={() => setMenuOpen(false)}>Launch a track</a>
        </div>
      )}

      <main className="wrap" style={{ position: "relative", zIndex: 1 }}>
        {/* hero */}
        <section style={{ paddingTop: 48 }}>
          <div className="note" style={{ letterSpacing: "0.24em", textTransform: "uppercase" }}>How it works</div>
          <h1 className="disp" style={{ fontSize: "clamp(40px, 7vw, 84px)", lineHeight: 0.92, margin: "14px 0 18px" }}>
            LAUNCH A TRACK.<br />
            <span style={{ color: "transparent", WebkitTextStroke: "1.5px var(--ink)" }}>TRADE THE CURVE.</span>
          </h1>
          <p className="lead" style={{ maxWidth: 640 }}>
            VURAFY is a music launchpad built on top of pons v2. The token, the curve and the pool are
            pons contracts on Robinhood Chain; the track carries its cover, artist name and audio link
            into them.
          </p>
          <div className="cta">
            <a href="/vurafy" className="btn" style={{ textDecoration: "none" }}>Launch a track</a>
            <a href="/vurafy#tracks" className="btn out" style={{ textDecoration: "none" }}>Explore tracks</a>
          </div>

          {/* steps */}
          <div className="steps" style={{ marginTop: 44 }}>
            {[
              { n: "1", t: "CONNECT", d: "Connect your wallet — the site switches to Robinhood Chain for you, even if you don't have the network yet." },
              { n: "2", t: "LAUNCH", d: "Upload a cover and audio, name your track — for 0.0005 ETH the token goes live on the curve." },
              { n: "3", t: "TRADE", d: "Anyone can buy shares of the track on the curve; at 4.2 ETH the track graduates into the pool." },
            ].map((s) => (
              <div className="panel" key={s.n}>
                <div className="n">{s.n}</div>
                <b>{s.t}</b>
                <p>{s.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* sidebar + content */}
        <section className="hi-body" style={{ display: "grid", gap: 28, gridTemplateColumns: "minmax(180px, 220px) 1fr", alignItems: "start", paddingBottom: 60 }}>
          <aside className="panel" style={{ position: "sticky", top: 88, padding: 10 }}>
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => go(s.id)}
                className="tab w-full text-left"
                aria-pressed={active === s.id}
                style={{ width: "100%", textAlign: "left", border: "none", borderRadius: 6, marginBottom: 4, background: active === s.id ? "var(--ink)" : "transparent", color: active === s.id ? "var(--bg)" : "var(--mute)" }}
              >
                {s.label}
              </button>
            ))}
          </aside>

          <div className="flex flex-col gap-5" style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 18 }}>
            <Card id="what" title="What this is">
              <p>VURAFY does not run its own blockchain: every launch calls the live pons v2 factory on Robinhood Chain. The token, the bonding curve and the Uniswap v4 pool — all of it is pons.</p>
              <p>What VURAFY adds is the <b>meaning of a track</b>: the token description on-chain stores <code>VURAFY | artist | audio: url</code>, and the cover and name show up in the site feed and gallery. Anyone can connect and launch their own track.</p>
            </Card>

            <Card id="token" title="Track token">
              <p>Each track is its own ERC-20 with a fixed supply of <b>1,000,000,000</b>. By buying in, you take a share of the track on the curve; the price rises with every buyer.</p>
              <p>An artist can set a creator tax (%, bps) — a cut of every trade that goes to them automatically. The token symbol is the track&apos;s short ticker (CSMIC, ECLPS…).</p>
            </Card>

            <Card id="launch" title="Launch">
              <p>Open <b>Launchpad</b> in the header and fill in:</p>
              <ul>
                <li>track title and artist (the symbol is generated for you);</li>
                <li>cover art — a URL or a file straight from your disk (uploaded to the site&apos;s host);</li>
                <li>audio link (mp3) — the site player will play it;</li>
                <li>creator tax — the % you earn on every trade.</li>
              </ul>
              <p>One transaction: <b>0.0005 ETH</b> launch fee + gas. As soon as it confirms, the track appears in the feed and starts trading.</p>
            </Card>

            <Card id="fees" title="Fees">
              <ul>
                <li><b>Launch fee — 0.0005 ETH</b> at creation (goes to the pons protocol).</li>
                <li><b>Curve fee</b> — the curve&apos;s fee on every buy and sell.</li>
                <li><b>Creator tax</b> — your cut of every trade (up to the config maximum).</li>
                <li><b>Snipe tax</b> — an extra tax on the first buyers right after launch.</li>
              </ul>
            </Card>

            <Card id="grad" title="Graduation">
              <p>When <b>4.2 ETH</b> has been raised on the curve, the track graduates: liquidity moves into a Uniswap v4 pool, the curve closes, and the track trades like a regular token.</p>
              <p>Progress to graduation is shown on the track card and in the now-playing panel.</p>
            </Card>

            <Card id="trade" title="Buy & sell">
              <ol>
                <li>Connect your wallet (the site switches the network for you).</li>
                <li>Pick a track, hit <b>Purchase Shares</b>.</li>
                <li>Enter an ETH amount — the quote shows how many tokens you get.</li>
                <li>Confirm in your wallet: 10% slippage protection.</li>
              </ol>
              <p>Selling goes through <b>My Portfolio</b>, or on ponsfamily if the track already graduated.</p>
            </Card>

            <Card id="faq" title="FAQ">
              <Faq q="Do I need a crypto wallet?">Yes — MetaMask, Rabby or any wallet. On desktop the site connects to your extension (or shows a QR code); on a phone it opens the wallet via WalletConnect deep-link.</Faq>
              <Faq q="Which network is this on?">Robinhood Chain, chainId 4663. The button in the header adds the network to your wallet in one click.</Faq>
              <Faq q="Where do I see my tokens?">In your wallet and in the My Portfolio section of the site.</Faq>
              <Faq q="Who controls the contracts?">No admin is needed: the factory and the curves are public pons v2 contracts, everything is verifiable in the explorer.</Faq>
              <Faq q="What happens to the music?">The mp3 link lives in the token description on-chain — the site player plays it. The artist picks the audio host.</Faq>
            </Card>
          </div>
        </section>
      </main>

      <footer className="wrap site-foot">
        <span className="disp" style={{ letterSpacing: ".4em" }}>VURAFY</span>
        <span className="note">
          Track tokenization protocol // Robinhood Chain //{" "}
          <a href="https://x.com/vurafy" target="_blank" rel="noreferrer" style={{ color: "var(--ink)" }}>X ↗</a>
        </span>
      </footer>

      <style>{`@media (max-width: 860px){
          .hi-body{grid-template-columns:1fr!important}
          .hi-body aside{position:static!important;display:flex;gap:6px;overflow-x:auto;padding:8px!important;flex-wrap:wrap}
          .hi-body aside button{width:auto!important;white-space:nowrap;flex:none;margin-bottom:0!important}
        }`}</style>
    </div>
  );
}

function Card({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <div id={id} className="panel" style={{ scrollMarginTop: 88, padding: 24 }}>
      <div className="disp" style={{ fontSize: 22, marginBottom: 12 }}>{title}</div>
      <div className="prose" style={{ fontSize: 14.5, lineHeight: 1.7, color: "var(--mute)" }}>
        {children}
      </div>
    </div>
  );
}

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ color: "var(--ink)", fontWeight: 700, marginBottom: 4 }}>{q}</div>
      <div>{children}</div>
    </div>
  );
}
