# VURAFY // vura.ink

Track tokenization protocol — every track is a token on a pons v2 bonding curve, Robinhood Chain (chainId 4663).

- **`/`** → VURAFY main page (feed, cover gallery, player, launchpad)
- **`/vurafy/how`** — how it works
- Free Demo mode: add a track locally (cover + audio files, no wallet)
- On-chain launch: 0.0005 ETH via pons v2 factory
- Cover uploads stored on Vercel Blob (`/api/upload`), RPC proxied same-origin (`/api/rpc`)

## Develop

```bash
npm install --legacy-peer-deps
npm run dev
```

```bash
npm run typecheck   # tsc --noEmit
npm run build       # next build
npx vercel --prod --yes
```
