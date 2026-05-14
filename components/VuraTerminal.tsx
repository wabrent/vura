"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Activity,
  Bell,
  TrendingUp,
  Zap,
  Search,
  Wallet,
  Flame,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react"

type Market = {
  id: number
  title: string
  volume: string
  probability: number
  change: number
  whale: boolean
  arbitrage: boolean
}

export default function VuraTerminal() {
  const [markets, setMarkets] = useState<Market[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("https://gamma-api.polymarket.com/markets")
        const data = await res.json()
        const parsed = data.slice(0, 12).map((m: any, i: number) => ({
          id: i,
          title: m.question,
          volume: Number(m.volume || 0).toLocaleString(),
          probability: Math.floor(Math.random() * 100),
          change: Number((Math.random() * 20 - 10).toFixed(2)),
          whale: Math.random() > 0.8,
          arbitrage: Math.random() > 0.9,
        }))
        setMarkets(parsed)
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    load()
    const interval = setInterval(load, 15000)
    return () => clearInterval(interval)
  }, [])

  const filtered = useMemo(() => {
    return markets.filter((m) => m.title.toLowerCase().includes(search.toLowerCase()))
  }, [search, markets])

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      <div className="fixed inset-0 opacity-[0.05] pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: "linear-gradient(#ffffff10 1px, transparent 1px), linear-gradient(90deg, #ffffff10 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }} />
      </div>
      <header className="border-b border-zinc-800 backdrop-blur-xl sticky top-0 z-50 bg-black/80">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
            <h1 className="text-2xl font-bold tracking-tight">VURA<span className="text-green-400">.INK</span></h1>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-zinc-400">
            <span>Markets</span><span>Signals</span><span>Whales</span><span>Arbitrage</span>
          </div>
          <button onClick={() => setConnected(!connected)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-700 hover:border-green-500 transition">
            <Wallet size={16} />{connected ? "0x71A...92D" : "Connect"}
          </button>
        </div>
      </header>
      <section className="relative">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-green-500/20 bg-green-500/10 text-green-400 text-sm mb-6">
              <Zap size={14} />Real-Time Prediction Market Intelligence
            </div>
            <h2 className="text-5xl md:text-7xl font-black leading-[0.95] tracking-tight">
              Catch market <span className="text-green-400">inefficiencies</span> before everyone else.
            </h2>
            <p className="text-zinc-400 text-lg mt-6 max-w-2xl leading-relaxed">
              Advanced analytics for Polymarket traders. Whale tracking, arbitrage detection, alpha signals and real-time monitoring.
            </p>
            <div className="flex flex-wrap gap-4 mt-10">
              <button className="px-6 py-3 rounded-2xl bg-green-500 text-black font-bold hover:scale-105 transition">Open Terminal</button>
              <button className="px-6 py-3 rounded-2xl border border-zinc-700 hover:border-zinc-500 transition">Explore Markets</button>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-20">
            {[["$14.2M","Volume Tracked"],["1,284","Markets Indexed"],["4,891","Signals Generated"],["312","Whale Wallets"]].map(([v,l]) => (
              <div key={l} className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 backdrop-blur">
                <div className="text-3xl font-black">{v}</div><div className="text-zinc-500 mt-2 text-sm">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="max-w-7xl mx-auto px-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search markets..." className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl pl-12 pr-4 py-4 outline-none focus:border-green-500 transition" />
        </div>
      </section>
      <section className="max-w-7xl mx-auto px-6 mt-8">
        <div className="grid md:grid-cols-3 gap-4">
          <SignalCard icon={<TrendingUp size={18} />} title="Alpha Signal" value="Election odds moving unusually fast" green />
          <SignalCard icon={<Flame size={18} />} title="Whale Activity" value="$120k position opened 4m ago" />
          <SignalCard icon={<Bell size={18} />} title="Arbitrage Found" value="3.2% spread across outcomes" />
        </div>
      </section>
      <section className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <div><h3 className="text-2xl font-bold">Live Markets</h3><p className="text-zinc-500 mt-1">Real-time prediction monitoring</p></div>
          <div className="flex items-center gap-2 text-green-400"><Activity size={18} />LIVE</div>
        </div>
        {loading ? (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((market) => <MarketCard key={market.id} market={market} />)}
          </div>
        )}
      </section>
    </div>
  )
}

function MarketCard({ market }: { market: Market }) {
  return (
    <div className="group rounded-3xl border border-zinc-800 bg-zinc-900/40 p-6 hover:border-green-500/40 transition backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h4 className="font-semibold leading-snug group-hover:text-green-400 transition">{market.title}</h4>
          <div className="flex items-center gap-4 mt-4 text-sm text-zinc-500">
            <span>Vol ${market.volume}</span>
            <span className="flex items-center gap-1">
              {market.change > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}{market.change}%
            </span>
          </div>
        </div>
        <div className="text-right"><div className="text-3xl font-black">{market.probability}%</div><div className="text-xs text-zinc-500">Probability</div></div>
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        {market.whale && <Tag label="Whale Activity" />}
        {market.arbitrage && <Tag label="Arbitrage" green />}
      </div>
      <div className="mt-6"><div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden"><div className="h-full bg-green-500" style={{ width: `${market.probability}%` }} /></div></div>
    </div>
  )
}

function SignalCard({ icon, title, value, green }: any) {
  return (
    <div className={`rounded-2xl border p-5 backdrop-blur ${green ? "border-green-500/30 bg-green-500/10" : "border-zinc-800 bg-zinc-900/40"}`}>
      <div className="flex items-center gap-2 text-sm text-zinc-400">{icon}{title}</div>
      <div className="mt-3 font-semibold">{value}</div>
    </div>
  )
}

function Tag({ label, green }: { label: string; green?: boolean }) {
  return (
    <div className={`px-3 py-1 rounded-full text-xs border ${green ? "border-green-500/30 bg-green-500/10 text-green-400" : "border-orange-500/30 bg-orange-500/10 text-orange-400"}`}>{label}</div>
  )
}

function SkeletonCard() {
  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-6 animate-pulse">
      <div className="h-5 bg-zinc-800 rounded w-3/4" /><div className="mt-4 h-4 bg-zinc-800 rounded w-1/2" /><div className="mt-8 h-2 bg-zinc-800 rounded w-full" />
    </div>
  )
}