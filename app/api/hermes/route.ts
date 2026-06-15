import { NextRequest, NextResponse } from 'next/server';

const VPS_API = 'http://144.91.113.94:8081';

export async function POST(req: NextRequest) {
  try {
    const { message, session_id } = await req.json();

    const res = await fetch(`${VPS_API}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, session_id }),
      signal: AbortSignal.timeout(35000)
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: err }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message, response: '⚠️ AI service unavailable. Try again later.', session_id: null }, { status: 200 });
  }
}
