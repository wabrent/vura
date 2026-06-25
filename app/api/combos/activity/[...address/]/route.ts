import { NextRequest, NextResponse } from 'next/server';

const DATA_BASE = process.env.DATA_BASE || 'https://data-api.polymarket.com';

export async function GET(req: NextRequest, { params }: { params: { address: string } }) {
  try {
    const address = params.address;
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '500');
    
    if (!address) {
      return NextResponse.json({ error: 'Missing address parameter' }, { status: 400 });
    }
    
    const url = `${DATA_BASE}/activity?user=${encodeURIComponent(address)}&limit=${limit}`;
    
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(15000),
    });
    
    if (!response.ok) {
      return NextResponse.json({
        error: `Failed to fetch combo activity: ${response.status}`
      }, { status: response.status });
    }
    
    const data = await response.json();
    
    const comboActivity = data.activity?.filter((item: any) => item.isCombo) || [];
    
    return NextResponse.json({ activity: comboActivity });
    
  } catch (error: any) {
    console.error('Fetch combo activity error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}
