# VURA | Prediction Terminal

Minimalist analytics terminal for Polymarket. Real-time market data, Alpha scoring, Smart Money signals, arbitrage detection, and multi-watchlist management.

## Stack

- **Next.js 14** (App Router)
- **React 18** + TypeScript
- **Privy SDK** — Google, Twitter, Email, Wallet auth
- **Polymarket CLOB SDK** — order book data
- **CSS** — custom dark/light theme, no Tailwind
- **Vercel** — serverless deployment (Dublin region)

## Features

- **Alpha Scoring** — volume-weighted composite 0-10
- **Smart Money BULL/BEAR** — volume-weighted momentum
- **Correlation Matrix** — Jaccard similarity across markets
- **Arbitrage Detection** — internal spread gaps
- **Multiple Watchlists** — create, name, share via link
- **Advanced Screener** — filter by price, volume, 24h change
- **Price Alerts** — Telegram webhook support
- **P&L Calculator** — built into every market card
- **CSV Export** — any filtered view
- **Real Price History** — CLOB /prices-history sparklines
- **Stats Tab** — volume, top movers, maker rebates
- **Keyboard Shortcuts** — 1-9 tabs, / search, Esc close

## Getting Started

```bash
npm install --legacy-peer-deps
npm run dev
```

## Environment Variables

Create `.env.local`:

```
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id
PRIVY_APP_SECRET=your_privy_app_secret
POLYMARKET_API_KEY=your_builder_api_key
POLYMARKET_SECRET=your_builder_secret
POLYMARKET_PASSPHRASE=your_builder_passphrase
```

## Repository Structure

```
app/
├── layout.tsx              # PrivyProvider, auth config
├── page.tsx                # Main terminal (all tabs, state, logic)
├── globals.css             # Styling
├── icon.svg                # Favicon
├── lib/types.ts            # TypeScript types
├── components/
│   └── TradeModal.tsx      # Trade form + P&L calculator
└── api/
    ├── proxy/route.ts      # CORS proxy + CLOB endpoint
    └── twitter/route.ts    # Polymarket tweet counter
```

## License

MIT
