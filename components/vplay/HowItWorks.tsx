"use client";

import { useEffect, useState } from "react";
import { FACTORY, EXPLORER } from "./pons";

const MONO = { fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" };

const SECTIONS = [
  { id: "what", label: "What this is" },
  { id: "token", label: "Track token" },
  { id: "launch", label: "Launch" },
  { id: "fees", label: "Fees" },
  { id: "grad", label: "Graduation" },
  { id: "trade", label: "Buy & sell" },
  { id: "faq", label: "FAQ" },
  { id: "contract", label: "Contract" },
];

export default function HowItWorks() {
  const [active, setActive] = useState("what");
  const [copied, setCopied] = useState(false);

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

  const copyFactory = async () => {
    try {
      await navigator.clipboard.writeText(FACTORY);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch { /* noop */ }
  };

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
        .hi-card code{background:rgba(255,255,255,.1);padding:1px 6px;border-radius:4px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:#fff;font-size:.92em;white-space:nowrap}`}</style>

      {/* ambient bg */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", top: "-18%", left: "50%", transform: "translateX(-50%)", width: "80vw", height: "50vh", background: "radial-gradient(ellipse at center, rgba(255,255,255,.10), transparent 70%)", filter: "blur(40px)" }} />
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.04) 1px, transparent 1px)", backgroundSize: "68px 68px", maskImage: "radial-gradient(ellipse 90% 60% at 50% 20%, #000 20%, transparent 75%)", WebkitMaskImage: "radial-gradient(ellipse 90% 60% at 50% 20%, #000 20%, transparent 75%)" }} />
      </div>

      {/* header */}
      <header className="flex items-center justify-between px-6" style={{ height: 64, position: "sticky", top: 0, zIndex: 30, background: "rgba(0,0,0,.55)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderBottom: "1px solid rgba(255,255,255,.12)" }}>
        <a href="/vurafy" className="hi-grad" style={{ letterSpacing: "0.5em", fontWeight: 300, fontSize: 18, paddingLeft: "0.5em", textDecoration: "none" }}>VURAFY</a>
        <nav className="flex items-center gap-4 uppercase" style={{ ...MONO, fontSize: 12 }}>
          <a href="/vurafy#gallery" className="hover:underline" style={{ color: "inherit", textDecoration: "none" }}>Gallery</a>
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
            VURAFY — это launchpad для музыки поверх pons v2. Токен, кривая и пул — контракты pons на Robinhood Chain;
            трек несёт в них обложку, имя артиста и ссылку на аудио.
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
        <section className="mx-auto px-6 pb-24" style={{ maxWidth: 1100, display: "grid", gap: 28, gridTemplateColumns: "minmax(180px, 220px) 1fr", alignItems: "start" }}>
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
              <p>VURAFY не изобретает свой блокчейн: каждый запуск вызывает живую фабрику pons v2 на Robinhood Chain. Токен, bonding-curve и выпуск в Uniswap v4 pool — это pons.</p>
              <p>Что добавляет VURAFY — <b>смысл трека</b>: в описание токена on-chain пишется <code>VURAFY | artist | audio: url</code>, а обложка и имя попадают в ленту и галерею сайта. Любой может зайти и запустить свой трек.</p>
            </Card>

            <Card id="token" title="Track token">
              <p>Каждый трек — отдельный ERC-20 с фиксированным supply <b>1,000,000,000</b>. Покупая, ты берёшь долю трека на кривой; цена растёт с каждым покупателем.</p>
              <p>Артист может взять creator tax (в %, bps) — процент с каждой сделки автоматически идёт ему. Символ токена — короткий тикер трека (CSMIC, ECLPS…).</p>
            </Card>

            <Card id="launch" title="Launch">
              <p>Открой <b>Launchpad</b> в шапке сайта и заполни:</p>
              <ul>
                <li>имя трека и артиста (символ подставится сам);</li>
                <li>обложку — URL или файл прямо с диска (грузится на хостинг сайта);</li>
                <li>ссылку на аудио (mp3) — плеер сайта будет её играть;</li>
                <li>creator tax — сколько % получать с каждой сделки.</li>
              </ul>
              <p>Одна транзакция: <b>0.0005 ETH</b> launch fee + газ. Сразу после подтверждения трек появляется в ленте и торгуется.</p>
            </Card>

            <Card id="fees" title="Fees">
              <ul>
                <li><b>Launch fee — 0.0005 ETH</b> при создании (идёт протоколу pons).</li>
                <li><b>Curve fee</b> — комиссия кривой на каждую покупку/продажу.</li>
                <li><b>Creator tax</b> — твой процент с каждой сделки (до максимума конфига).</li>
                <li><b>Snipe tax</b> — повышенный налог на первых покупателей сразу после лаунча.</li>
              </ul>
            </Card>

            <Card id="grad" title="Graduation">
              <p>Когда на кривой собрано <b>4.2 ETH</b>, трек градуируется: ликвидность переносится в Uniswap v4 pool, кривая закрывается, трек начинает торговаться как обычный токен.</p>
              <p>Прогресс до градуации виден на карточке трека (полоска под обложкой).</p>
            </Card>

            <Card id="trade" title="Buy & sell">
              <ol>
                <li>Connect wallet (сайт сам переключит сеть).</li>
                <li>Выбери трек в галерее, жми <b>Purchase Shares</b>.</li>
                <li>Введи сумму ETH — котировка покажет, сколько токенов получишь.</li>
                <li>Подтверди в кошельке: защита от проскальзывания 10%.</li>
              </ol>
              <p>Продажа — через <b>My Portfolio</b> или на ponsfamily, если трек уже градуировался.</p>
            </Card>

            <Card id="faq" title="FAQ">
              <Faq q="Нужен ли криптокошелёк?">Да, обычный инжект-кошелёк (MetaMask, Rabby и т.п.).</Faq>
              <Faq q="В какой сети всё работает?">Robinhood Chain, chainId 4663. Кнопка в шапке добавит сеть в кошелёк одним кликом.</Faq>
              <Faq q="Где видно мои токены?">В кошельке и в разделе My Portfolio на сайте.</Faq>
              <Faq q="Кто контролирует контракты?">Никакой «админ» не нужен: фабрика и кривые — публичные контракты pons v2, всё проверяется в обозревателе.</Faq>
              <Faq q="Что происходит с музыкой?">Ссылка на mp3 лежит в описании токена on-chain — плеер сайта про неё и играет. Хостинг аудио выбирает артист.</Faq>
            </Card>

            <Card id="contract" title="Contract">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <span className="uppercase" style={{ ...MONO, fontSize: 12, color: "#8f8f8f" }}>pons v2 factory</span>
                <a href={`${EXPLORER}/address/${FACTORY}`} target="_blank" rel="noreferrer" className="uppercase" style={{ ...MONO, fontSize: 12, color: "#fff" }}>Explorer ↗</a>
              </div>
              <button onClick={copyFactory} className="hi-s mt-3 w-full text-left px-3 py-3" style={{ ...MONO, fontSize: 12.5, cursor: "pointer", color: "inherit", wordBreak: "break-all" }}>
                {copied ? "copied ✓" : FACTORY}
              </button>
              <p style={{ marginBottom: 0 }}>Это единственный контракт, через который идут все запуски. Проверяй адрес здесь, прежде чем доверять зеркалу сайта.</p>
            </Card>
          </div>
        </section>
      </main>

      <footer className="px-6 pb-8 text-center uppercase" style={{ ...MONO, fontSize: 11, color: "#6f6f6f", position: "relative", zIndex: 1, letterSpacing: "0.14em" }}>
        VURAFY // Track Tokenization Protocol // Robinhood Chain
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
