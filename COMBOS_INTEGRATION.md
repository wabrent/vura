# Polymarket Combos Integration

This implementation provides a complete solution for integrating Polymarket Combo markets into your trading platform. Combos allow users to bet on 2+ binary market legs simultaneously - all legs must win for the combo to pay out.

## Overview

The integration has four main components:
1. **List legs** - Discover combo-eligible binary markets
2. **Quote price** - Get real combined odds with maker spread
3. **Place combo** - Request a quote and place the taker order
4. **Read positions** - Show a user's open/settled combos

## Key Features

- **BETA labeling** - All combo surfaces are clearly marked as BETA
- **Layered auth** - Browser WebSocket for placement, backend for price
- **5-second quote window handling** - Re-quotes on expiry, 120s signing timeout
- **Production-ready fallback** - Zero-deps compute quote when unauthenticated
- **SDK integration** - Optional use of @polymarket/client for auth/reads
- **Error handling** - Friendly error messages and retry logic

## Quick Start

### 1. Install dependencies

```bash
pnpm add @polymarket/client @polymarket/builder-signing-sdk viem
```

### 2. Environment variables

```env
# Combo RFQ API (overrides default)
COMBOS_RFQ_BASE=https://combos-rfq-api.polymarket.com
RFQ_WS_URL=wss://combos-rfq-gateway-requester.polymarket.sh/ws
COMBO_EXCHANGE=0xe3333700ca9d93003f00f0f71f8515005f6c00aa
DATA_BASE=https://data-api.polymarket.com
GAMMA_BASE=https://gamma-api.polymarket.com
```

### 3. Initialize the hook

```tsx
import { usePolymarketCombosAPI } from '@/hooks/usePolymarketCombos';

function ComboTrading() {
  const {
    legs,
    loading,
    error,
    fetchComboLegs,
    fetchComboPrice,
    placeCombo,
    fetchComboPositions,
  } = usePolymarketCombosAPI();

  useEffect(() => {
    fetchComboLegs();
  }, [fetchComboLegs]);

  return (
    <div>
      {loading && 'Loading combo legs...'}
      {error && <div>Error: {error}</div>}
      
      {legs.map(leg => (
        <div key={leg.id}>
          <h3>{leg.title}</h3>
          <p>Yes: {leg.yesPrice.toFixed(3)} | No: {leg.noPrice.toFixed(3)}</p>
        </div>
      ))}
    </div>
  );
}
```

### 4. Build a combo slip

```tsx
function ComboSlip({ selectedLegs, stake, direction, side }) {
  const { computeComboQuote } = usePolymarketCombosAPI();
  
  const legPrices = selectedLegs.map(leg => 
    direction === 'BUY' ? leg.yesPrice : leg.noPrice
  );
  
  const quote = computeComboQuote(legPrices, stake);
  
  if (!quote) return null;
  
  return (
    <div>
      <h3>Combo Quote</h3>
      <p>Combined Price: {(quote.combinedPrice * 100).toFixed(2)}%</p>
      <p>Multiplier: {quote.multiplier.toFixed(2)}x</p>
      <p>Potential Payout: ${quote.potentialPayout.toFixed(2)}</p>
      <button 
        disabled={!stake || selectedLegs.length < 2}
        onClick={() => fetchPriceAndPlace()}
      >
        Place Combo
      </button>
    </div>
  );
}
```

### 5. Place a combo order

```tsx
async function placeComboOrder() {
  const {
    legs,
    fetchComboPrice,
    placeCombo,
  } = usePolymarketCombosAPI();
  
  // Get user's signer (MetaMask, etc.)
  const signer = await getSigner();
  const address = await signer.getAddress();
  const funderAddress = '0x...' // Your Polymarket proxy/Safe
  const creds = {
    key: process.env.POLYMARKET_API_KEY!,
    secret: process.env.POLYMARKET_SECRET!,
    passphrase: process.env.POLYMARKET_PASSPHRASE!,
  };
  
  const selectedLegs = [...]; // Selected legs with chosen side
  const legPositionIds = selectedLegs.map(leg => 
    side === 'YES' ? leg.positionIds[0] : leg.positionIds[1]
  );
  
  try {
    const { price, traderCount } = await fetchComboPrice({
      legPositionIds,
      address,
      creds,
    });
    
    const sizeUsdcE6 = Math.round(stake * 1e6);
    
    const result = await placeCombo({
      signer,
      address,
      funderAddress,
      creds,
      legPositionIds,
      direction: 'BUY',
      side: 'YES',
      sizeUsdcE6,
      onStatus: (status) => {
        console.log('Combo status:', status);
      },
    });
    
    console.log('Combo placed!', result);
  } catch (error) {
    console.error('Failed to place combo:', error);
  }
}
```

## API Endpoints

### 1. GET `/api/combos/legs`

Public endpoint to list combo-eligible legs.

**Parameters:**
- `max` - Maximum number of legs to return (default: 300)

**Response:**
```json
{
  "legs": [
    {
      "id": "leg_id",
      "conditionId": "condition_id",
      "positionIds": ["yes_token_id", "no_token_id"],
      "slug": "event-leg-type-line",
      "title": "Event Title",
      "outcomes": ["Yes", "No"],
      "prices": [0.5, 0.5],
      "yesPrice": 0.5,
      "noPrice": 0.5,
      "image": "url_or_null",
      "volume": 1000000,
      "tags": ["moneyline", "fifwc-bra-cro-2026-06-18-bra"]
    }
  ]
}
```

### 2. POST `/api/combos/price`

Authenticated endpoint to get real combined odds for selected legs.

**Request body:**
```json
{
  "legPositionIds": ["yes_token_id_1", "yes_token_id_2"],
  "address": "0x...",
  "creds": {
    "key": "poly_api_key",
    "secret": "poly_secret",
    "passphrase": "poly_passphrase"
  }
}
```

**Response:**
```json
{
  "price": 0.123456,
  "traderCount": 42
}
```

### 3. POST `/api/combos/place`

Server-side combo placement with WebSocket handling.

**Request body:**
```json
{
  "signer": viem/ethers signer,
  "address": "0x...",
  "funderAddress": "0x...", // Polymarket proxy/Safe
  "creds": {
    "key": "poly_api_key",
    "secret": "poly_secret",
    "passphrase": "poly_passphrase"
  },
  "legPositionIds": ["yes_token_id_1", "yes_token_id_2"],
  "direction": "BUY",
  "side": "YES",
  "sizeUsdcE6": 1000000,
  "onStatus": "optional_callback",
  "maxRetries": 2
}
```

**Response:**
```json
{
  "txHash": "0x...",
  "status": "CONFIRMED"
}
```

### 4. GET `/api/combos/positions/:address`

Read user's combo positions.

**Response:**
```json
{
  "positions": [
    {
      "id": "position_id",
      "conditionId": "condition_id",
      "title": "Event AND Another Event",
      "legCount": 2,
      "totalStake": 1000000,
      "currentValue": 1200000,
      "pnl": 200000,
      "redeemable": false,
      "claimed": false
    }
  ]
}
```

### 5. GET `/api/combos/activity/:address`

Get raw combo activity feed for position reconstruction.

**Response:**
```json
{
  "activity": [
    {
      "id": "activity_id",
      "type": "TRADE",
      "side": "BUY",
      "size": 1000000,
      "price": 0.123456,
      "title": "Event AND Another Event",
      "conditionId": "condition_id",
      "isCombo": true,
      "timestamp": 1719331200
    }
  ]
}
```

## Technical Details

### WebSocket Lifecycle

The placement WebSocket follows this critical flow:

1. **Auth** → Send auth + identity
2. **RFQ_CREATE** → Request quote
3. **RFQ_QUOTE_READY** → Receive quote (valid for ~5s)
4. **Sign order** → EIP-712 signature with 120s timeout
5. **RFQ_ACCEPT** → Submit signed order
6. **RFQ_EXECUTION_UPDATE** → Track execution (MATCHED→MINED→CONFIRMED)

### Important Notes

1. **~5-second quote window**: The RFQ_QUOTE_READY response is valid for ~5 seconds only. A wallet popup can easily exceed this.

2. **Re-quote on expiry**: On EXPIRED while signing, the system re-quotes without creating new wallet popups.

3. **Browser WebSocket Origin**: The gateway may check WebSocket Origin. If running from a non-polymarket.com origin, proxy through your backend.

4. **BETA labeling**: Treat all combo surfaces as BETA. The integration is reverse-engineered and protocols may change.

5. **Layered approach**: 
   - Price calculations use server-side L2 auth
   - Placement uses browser WebSocket
   - This keeps L2 secrets off the client

### Error Handling

- **EXPIRED_RFQ**: Retry up to maxRetries
- **request timed out**: 120s signing timeout (not 20s)
- **WS Origin rejected**: Proxy WebSocket via backend with Origin: https://polymarket.com
- **Auth failed**: Re-derive L2 credentials or check signer_address vs maker_address

## Production Checklist

- [ ] Label all combo surfaces as BETA
- [ ] L2 secret never reaches browser
- [ ] Min-$1 stake guard before enabling "Place"
- [ ] 120s signing timeout at RFQ_QUOTE_READY
- [ ] Re-quote on EXPIRED with maxRetries
- [ ] No stacked wallet popups
- [ ] WS Origin validated for your deployment
- [ ] encodeURI() all Polymarket image URLs
- [ ] Positions show staked + entry odds only
- [ ] No live P&L / Claim until on-chain resolution detection
- [ ] All hosts/paths env-overridable
- [ ] Verify EIP-712 domain before going live

## Integration with Official Polymarket Client

For a cleaner integration, use the hybrid approach:

1. Keep hand-rolled taker WebSocket (§6 in full guide)
2. Swap auth/signing/reads for the SDK:
   - `createSecureClient` for L2 credentials
   - `signerFrom` for browser wallet signing
   - `client.listComboMarkets()` for legs
   - `client.listComboPositions()` for positions
   - SDK redeem calls for claim flow

## Files Created

- `app/lib/combos.ts` - Core combo logic and hooks
- `app/api/combos/legs/route.ts` - Combo legs endpoint
- `app/api/combos/price/route.ts` - Combo price endpoint
- `app/api/combos/place/route.ts` - Combo placement endpoint
- `app/api/combos/positions/[...address]/route.ts` - User positions endpoint
- `app/api/combos/activity/[...address]/route.ts` - Combo activity endpoint
- `app/hooks/usePolymarketCombos.ts` - React hook for combo integration

## Next Steps

1. Add UI components for combo leg selection and slip
2. Implement wallet connection and signer setup
3. Add combo positions display in portfolio
4. Set up error handling and user notifications
5. Test with real wallet on Polygon mainnet
6. Consider the hybrid SDK approach for production

## References

- Full guide: https://gist.github.com/oswy-cpu/21899229ccfe888ec0237c2502ab400a
- Official SDK: https://www.npmjs.com/package/@polymarket/client

This integration is based on reverse-engineering the current Polymarket combo protocol. Treat all combo features as BETA until verified against production APIs.
