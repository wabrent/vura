import { NextRequest, NextResponse } from 'next/server';
import { buildHmacSignature } from '@polymarket/client';

const COMBOS_RFQ_BASE = process.env.COMBOS_RFQ_BASE || 'https://combos-rfq-api.polymarket.com';
const COMBO_PRICE_PATH = '/v1/rfq/combo-price';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { legPositionIds, address, creds } = body;

    if (!legPositionIds || !Array.isArray(legPositionIds) || legPositionIds.length < 2) {
      return NextResponse.json({ error: 'At least 2 legs are required' }, { status: 400 });
    }
    
    if (!address || !creds?.key || !creds?.secret || !creds?.passphrase) {
      return NextResponse.json({ error: 'Missing required credentials' }, { status: 401 });
    }

    const priceBody = JSON.stringify({ 
      leg_position_ids: legPositionIds.map(String), 
      closed_okay: true 
    });
    
    const ts = Math.floor(Date.now() / 1000);
    const signature = await buildHmacSignature(
      creds.secret, 
      ts, 
      'POST', 
      COMBO_PRICE_PATH, 
      priceBody
    );

    const response = await fetch(`${COMBOS_RFQ_BASE}${COMBO_PRICE_PATH}`, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'poly_address': address,
        'poly_api_key': creds.key,
        'poly_passphrase': creds.passphrase,
        'poly_signature': signature,
        'poly_timestamp': String(ts),
      },
      body: priceBody,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ 
        error: `RFQ price failed: ${response.status}`, 
        details: errorText 
      }, { status: response.status });
    }

    const data = await response.json();
    
    return NextResponse.json({
      price: Number(data.price) / 1e6,
      traderCount: Number(data.trader_count || 0),
    });
    
  } catch (error: any) {
    console.error('Combo price error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}
