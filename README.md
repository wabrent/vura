# VURA | PREDICTION ENGINE

Vura is a high-precision, minimalist interface for Polymarket, built via the Polymarket Builder Program. It leverages the CLOB (Central Limit Order Book) to provide a professional-grade trading environment focused on data clarity and execution speed.

## VISION

To transform raw prediction market data into actionable intelligence through a "Data-Heavy Minimalist" interface. Vura removes the noise of traditional betting platforms, offering a terminal-like experience for quantitative traders.

## KEY FEATURES

- **CLOB Integration:** Direct routing to Polymarket's Central Limit Order Book using the builderCode for volume attribution.
- **Gasless Execution:** Integrated with Polymarket's Relayer for seamless, non-custodial trading.
- **Quantitative UI:** A Swiss-style minimalist dashboard featuring micro-sparklines for instant trend recognition.
- **Smart Attribution:** Every trade processed through Vura supports the ecosystem via the official Builder Program.

## TECHNICAL STACK

- **Framework:** Next.js 14+ (App Router)
- **Styling:** Tailwind CSS (Brutalist/Minimalist config)
- **State Management:** Wagmi / Viem
- **Polymarket Integration:** Polymarket CLOB SDK (TypeScript)
- **Animations:** Framer Motion (Linear, high-frequency transitions)

## BRAND ASSETS (CSS CONFIG)

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
        sans: ['Inter', 'sans-serif'],
        display: ['Saira Extra Condensed', 'sans-serif'],
      },
      colors: {
        background: '#000000', // Dark Mode
        foreground: '#ffffff',
        accent: '#39FF14', // Neon Green for growth metrics
        border: '#333333',
      },
      letterSpacing: {
        tighter: '-0.05em',
      }
    },
  },
}
```

## REPOSITORY STRUCTURE

```
vura/
├── index.html      # Terminal UI
├── app.js        # Core logic (real-time data)
├── styles.css    # Minimalist styling
├── api/
│   └── proxy.js  # Serverless CORS proxy
└── vercel.json  # Vercel config
```

## GETTING STARTED

1. **Clone the repo**
   ```bash
   git clone https://github.com/wabrent/vura.git
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment**
   Create a `.env` file with your `BUILDER_CODE` and `API_KEY` from the Polymarket Builder Profile.

## ARCHITECTURE

Vura uses the [Polymarket CLOB SDK](https://docs.polymarket.com/) to interact with the order book.

- **Connect:** Privy/Magic Link integration for Safe Wallets.
- **Analyze:** Custom hooks for fetching real-time market probability shifts.
- **Execute:** Builder-attributed order placement.

## LICENSE

MIT

---

**VURA: THE PREDICTION ENGINE.**

VURA: Minimalist Liquidity Interfaces for Polymarket.

VURA: Trade the future with Swiss precision.