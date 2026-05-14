"use client"

import { useEffect, useState } from "react"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import { TrendingUp, DollarSign, Activity, Zap } from "lucide-react"
import { useAccount, useWalletClient } from "wagmi"
import { ClobClient, Side, OrderType } from "@polymarket/clob-client"
import { ethers } from "ethers"

interface Market {
  conditionId: string
  question: string
  volume: number
  outcomes: string[]
  outcomePrices: string[]
  clobTokenIds: string
  slug: string
}

export default function VuraTradingTerminal() {
  const [markets, setMarkets] = useState<Market[]>([])
  const [loading, setLoading] = useState(true)
  const [tradeStatus, setTradeStatus] = useState("")
  const { address } = useAccount()
  const { data: walletClient } = useWalletClient()

  useEffect(() => {
    async function loadMarkets() {
      try {
        const res = await fetch("/api/proxy?url=" + encodeURIComponent(
          "https://gamma-api.polymarket.com/events?closed=false&limit=12"
        ))
        const data = await res.json()
        const active = data.filter((m: any) => m.active).slice(0, 12)
        setMarkets(active)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadMarkets()
    const interval = setInterval(loadMarkets, 20000)
    return () => clearInterval(interval)
  }, [])

  async function tradeMarket(market: Market, outcome: string, price: number) {
    if (!walletClient || !address) {
      setTradeStatus("Connect wallet first")
      return
    }

    setTradeStatus("Preparing order...")

    try {
      const tokenIds = JSON.parse(market.clobTokenIds || "[]")
      const tokenId = outcome === "YES" ? tokenIds[0] : tokenIds[1]
      if (!tokenId) throw new Error("Missing token ID")

      const provider = new ethers.providers.Web3Provider(window.ethereum as any)
      const signer = provider.getSigner()
      await provider.send("eth_requestAccounts", [])

      // Switch to Polygon
      try {
        await (window as any).ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0x89" }],
        })
      } catch (e: any) {
        if (e.code === 4902) {
          await (window as any).ethereum.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId: "0x89", chainName: "Polygon",
              nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
              rpcUrls: ["https://polygon-rpc.com"],
              blockExplorerUrls: ["https://polygonscan.com"],
            }],
          })
        }
      }

      // USDC approval
      const USDC = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174"
      const USDC_ABI = [
        "function approve(address spender, uint256 amount) public returns (bool)",
        "function allowance(address owner, address spender) view returns (uint256)",
      ]
      const usdc = new ethers.Contract(USDC, USDC_ABI, signer)

      const client = new ClobClient("https://clob.polymarket.com", 137, signer)
      const allowance = await usdc.allowance(address, client.exchangeAddress)
      const amount = ethers.utils.parseUnits("10", 6)

      if (allowance.lt(amount)) {
        setTradeStatus("Approving USDC...")
        const tx = await usdc.approve(address, ethers.constants.MaxUint256)
        await tx.wait()
      }

      // Place order
      setTradeStatus("Placing order...")
      const order = await client.createOrder({
        tokenID: tokenId,
        price,
        size: 10 / price,
        side: Side.BUY,
      })

      const result = await client.postOrder(order)
      console.log("Order placed:", result)
      setTradeStatus("Order executed!")
      setTimeout(() => setTradeStatus(""), 3000)
    } catch (err: any) {
      console.error(err)
      setTradeStatus(err.message || "Trade failed")
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-zinc-800 bg-black/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
            <h1 className="text-2xl font-black tracking-tight">VURA<span className="text-green-400">.INK</span></h1>
          </div>
          <ConnectButton />
        </div>
      </header>

      <section className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-5xl font-black leading-none">Embedded Prediction Trading</h2>
            <p className="text-zinc-400 mt-4 text-lg max-w-2xl">Trade prediction markets directly inside VURA.</p>
          </div>
          <div className="flex items-center gap-2 text-green-400"><Activity size={18} />LIVE</div>
        </div>

        {tradeStatus && (
          <div className="mb-6 px-4 py-3 rounded-2xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm">{tradeStatus}</div>
        )}

        {loading ? (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-6 animate-pulse">
                <div className="h-6 bg-zinc-800 rounded w-3/4" />
                <div className="h-4 bg-zinc-800 rounded w-1/2 mt-4" />
                <div className="h-10 bg-zinc-800 rounded mt-8" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {markets.map((m) => {
              const yesPrice = Number(m.outcomePrices?.[0] || 0.5)
              const noPrice = Number(m.outcomePrices?.[1] || 0.5)
              return (
                <div key={m.conditionId} className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-6 hover:border-green-500/40 transition">
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="font-semibold leading-snug">{m.question}</h3>
                    <div className="text-right">
                      <div className="text-green-400 text-2xl font-black">{Math.round(yesPrice * 100)}c</div>
                      <div className="text-xs text-zinc-500">YES</div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-sm text-zinc-500">
                    <div className="flex items-center gap-2"><DollarSign size={14} />Vol ${Number(m.volume || 0).toLocaleString()}</div>
                    <div className="flex items-center gap-1 text-green-400"><Zap size={14} />Trade</div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-6">
                    <button onClick={() => tradeMarket(m, "YES", yesPrice)} className="bg-green-500 hover:bg-green-400 text-black font-bold py-3 rounded-2xl transition">Buy YES {Math.round(yesPrice * 100)}c</button>
                    <button onClick={() => tradeMarket(m, "NO", noPrice)} className="bg-red-500 hover:bg-red-400 text-white font-bold py-3 rounded-2xl transition">Buy NO {Math.round(noPrice * 100)}c</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}