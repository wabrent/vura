import { NextRequest, NextResponse } from 'next/server';

const COMBOS_RFQ_BASE = process.env.COMBOS_RFQ_BASE || 'https://combos-rfq-api.polymarket.com';
const COMBO_MARKETS_PATH = '/v1/rfq/combo-markets';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const max = parseInt(searchParams.get('max') || '300');
    
    const legs = [];
    let cursor = null;
    let pages = 0;
    
    do {
      const url = `${COMBOS_RFQ_BASE}${COMBO_MARKETS_PATH}?limit=100`
        + (cursor ? `&cursor=${encodeURIComponent(cursor)}` : '');
      
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(10000),
      });
      
      if (!response.ok) {
        return NextResponse.json({ 
          error: `Failed to fetch combo legs: ${response.status}` 
        }, { status: response.status });
      }
      
      const { markets, next_cursor } = await response.json();
      
      for (const m of markets || []) {
        legs.push({
          id: m.id,
          conditionId: m.condition_id,
          positionIds: m.position_ids || [],
          slug: m.slug,
          title: m.title,
          outcomes: m.outcomes || ['Yes', 'No'],
          prices: (m.outcome_prices || []).map(Number),
          yesPrice: Number(m.outcome_prices?.[0]) || 0,
          noPrice: Number(m.outcome_prices?.[1]) || 0,
          image: m.image || null,
          volume: Number(m.volume || 0),
          tags: m.tags || [],
        });
      }
      
      cursor = next_cursor;
    } while (cursor && legs.length < max && ++pages < 10);
    
    return NextResponse.json({ legs });
    
  } catch (error: any) {
    console.error('Fetch combo legs error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}
