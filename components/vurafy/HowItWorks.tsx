"use client";

import { useEffect, useState } from "react";

const MONO = { fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" };

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

  const go = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <div className="relative min-h-screen bg-black text-white" style={{ fontFamily: "Helvetica Neue, Arial, sans-serif" }}>
      <style>{`.hi-up{animation:hi-up .6s cubic-bezier(.16,1,.3,1) both}
        @keyframes hi-up{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
        .hi-glass{background:linear-gradient(165deg,rgba(255,255,255,.06),rgba(255,255,255,.015));border:1px solid rgba(255,255,255,.13);backdrop-filter:blur(16px);box-shadow:0 30px 70px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,255,255,.08);border-radius:10px;transition:border-color .3s}
        .hi-glass:hover{border-color:rgba(255,255,255,.3)}
        .hi-grad{background:linear-gradient(92deg,#fff 15%,#9b9b9b 50%,#fff 85%);-webkit-background-clip:text;background-clip:text;color:transparent}
        .hi-p{background:linear-gradient(180deg,#fff,#e2e2e2);color:#000;border-radius:6px;font-weight:700;box-shadow:0 10px 30px rgba(255,255,255,.15);transition:transform .25s,box-shadow .25s}
        .hi-p:hover{transform:translateY(-2px);box-shadow:0 16px 44px rgba(255,255,255,.3)}
        .hi-s{border:1px solid rgba(255,255,255,.38);border-radius:6px;background:rgba(255,255,255,.035);transition:background .25s,color .25s,transform .25s}
        .hi-s:hover{background:#fff;color:#000;transform:translateY(-2px)}
        .hi-nav{transition:background .25s,color .25s}
        .hi-card ul,.hi-card ol{margin:8px 0;padding-left:22px}
        .hi-card ul{list-style:disc}
        .hi-card ol{list-style:decimal}
        .hi-card li{margin:5px 0}
        .hi-card li::marker{color:#fff}
        .hi-card code{background:rgba(255,255,255,.1);padding:1px 6px;border-radius:4px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:#fff;font-size:.92em;white-space:nowrap}
        @media (max-width:767px){
          .hi-header{padding:0 14px!important}
          .hi-header .hi-logo{font-size:14px!important;letter-spacing:.26em!important}
          .hi-header nav{gap:10px!important;font-size:11px!important}
          .hi-optional{display:none}
          .hi-header .hi-p{padding:8px 12px!important}
          .hi-body{grid-template-columns:1fr!important;gap:18px!important}
          .hi-body aside{position:static!important;display:flex;gap:6px;overflow-x:auto;padding:8px!important}
          .hi-body aside button{width:auto!important;white-space:nowrap;flex:none}
        }`}</style>

      {/* ambient bg */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", top: "-18%", left: "50%", transform: "translateX(-50%)", width: "80vw", height: "50vh", background: "radial-gradient(ellipse at center, rgba(255,255,255,.10), transparent 70%)", filter: "blur(40px)" }} />
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.04) 1px, transparent 1px)", backgroundSize: "68px 68px", maskImage: "radial-gradient(ellipse 90% 60% at 50% 20%, #000 20%, transparent 75%)", WebkitMaskImage: "radial-gradient(ellipse 90% 60% at 50% 20%, #000 20%, transparent 75%)" }} />
      </div>

      {/* header */}
      <header className="flex items-center justify-between px-6 hi-header" style={{ height: 64, position: "sticky", top: 0, zIndex: 30, background: "rgba(0,0,0,.55)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderBottom: "1px solid rgba(255,255,255,.12)" }}>
        <a href="/vurafy" className="hi-grad hi-logo" style={{ letterSpacing: "0.5em", fontWeight: 300, fontSize: 18, paddingLeft: "0.5em", textDecoration: "none" }}>VURAFY</a>
        <nav className="flex items-center gap-4 uppercase" style={{ ...MONO, fontSize: 12 }}>
          <a href="/vurafy#gallery" className="hover:underline hi-optional" style={{ color: "inherit", textDecoration: "none" }}>Gallery</a>
          <a href="https://x.com/vurafy" target="_blank" rel="noreferrer" className="hover:underline" style={{ color: "inherit", textDecoration: "none" }}>X ↗</a>
          <a href="/vurafy" className="hi-p px-4 py-2" style={{ color: "#000", textDecoration: "none" }}>Launch a track</a>
        </nav>
      </header>

      <main style={{ position: "relative", zIndex: 1 }}>
        {/* hero */}
        <section className="mx-auto px-6" style={{ maxWidth: 1100, paddingTop: 72, paddingBottom: 40 }}>
          <div className="uppercase" style={{ ...MONO, fontSize: 12, letterSpacing: "0.24em", color: "#8f8f8f" }}>How it works</div>
          <h1 className="hi-grad hi-up" style={{ fontSize: "clamp(34px, 6vw, 64px)", fontWeight: 800, lineHeight: 1.05, margin: "14px 0 18px" }}>
            Launch a track.<br />Trade the curve.
          </h1>
          <p style={{ fontSize: 16, lineHeight: 1.7, color: "#b5b5b5", maxWidth: 640, margin: 0 }}>
            VURAFY is a music launchpad built on top of pons v2. The token, the curve and the pool are pons
            contracts on Robinhood Chain; the track carries its cover, artist name and audio link into them.
          </p>
          <div className="flex gap-3" style={{ marginTop: 26, flexWrap: "wrap" }}>
            <a href="/vurafy" className="hi-p px-5 py-3 uppercase" style={{ ...MONO, fontSize: 13, color: "#000", textDecoration: "none" }}>Launch a track</a>
            <a href="/vurafy#gallery" className="hi-s px-5 py-3 uppercase" style={{ ...MONO, fontSize: 13, color: "inherit", textDecoration: "none" }}>Explore gallery</a>
          </div>

          {/* steps */}
          <div className="grid gap-4" style={{ marginTop: 48, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
            {[
              { n: "01", t: "Connect", d: "Connect your wallet in the header — the site switches to Robinhood Chain for you, even if you don't have the network yet." },
              { n: "02", t: "Launch", d: "Upload a cover and audio, name your track — for 0.0005 ETH the token goes live on the curve." },
              { n: "03", t: "Trade", d: "Anyone can buy shares of the track on the curve; at 4.2 ETH the track graduates into the pool." },
            ].map((s, i) => (
              <div key={s.n} className="hi-glass hi-up p-5" style={{ animationDelay: `${i * 0.08}s` }}>
                <div style={{ ...MONO, fontSize: 12, color: "#8f8f8f" }}>{s.n}</div>
                <div className="hi-grad" style={{ fontSize: 22, fontWeight: 800, margin: "8px 0" }}>{s.t}</div>
                <div style={{ fontSize: 13.5, lineHeight: 1.65, color: "#b5b5b5" }}>{s.d}</div>
              </div>
            ))}
          </div>
        </section>

        {/* sidebar + content */}
        <section className="mx-auto px-6 pb-24 hi-body" style={{ maxWidth: 1100, display: "grid", gap: 28, gridTemplateColumns: "minmax(180px, 220px) 1fr", alignItems: "start" }}>
          <aside className="hi-glass" style={{ position: "sticky", top: 88, padding: 10 }}>
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => go(s.id)}
                className="hi-nav w-full text-left uppercase px-3 py-2"
                style={{
                  ...MONO, fontSize: 12, cursor: "pointer", border: "none", borderRadius: 6,
                  background: active === s.id ? "rgba(255,255,255,.12)" : "transparent",
                  color: active === s.id ? "#fff" : "#8f8f8f",
                }}
              >
                {s.label}
              </button>
            ))}
          </aside>

          <div className="flex flex-col gap-5" style={{ minWidth: 0 }}>
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
              <p>Progress to graduation is shown on the track card (the bar under the cover).</p>
            </Card>

            <Card id="trade" title="Buy & sell">
              <ol>
                <li>Connect your wallet (the site switches the network for you).</li>
                <li>Pick a track in the gallery, hit <b>Purchase Shares</b>.</li>
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

      <footer className="px-6 pb-8 text-center uppercase" style={{ ...MONO, fontSize: 11, color: "#6f6f6f", position: "relative", zIndex: 1, letterSpacing: "0.14em" }}>
        VURAFY // Track Tokenization Protocol // Robinhood Chain //{" "}
        <a href="https://x.com/vurafy" target="_blank" rel="noreferrer" className="hover:underline" style={{ color: "#fff", textDecoration: "none" }}>X ↗</a>
      </footer>
    </div>
  );
}

function Card({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <div id={id} className="hi-glass hi-card hi-up p-6" style={{ scrollMarginTop: 88 }}>
      <div className="hi-grad" style={{ fontSize: 22, fontWeight: 800, marginBottom: 12 }}>{title}</div>
      <div style={{ fontSize: 14.5, lineHeight: 1.7, color: "#b5b5b5" }}>
        {children}
      </div>
    </div>
  );
}

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ color: "#fff", fontWeight: 700, marginBottom: 4 }}>{q}</div>
      <div>{children}</div>
    </div>
  );
}
