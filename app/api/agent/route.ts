import { NextRequest, NextResponse } from 'next/server';
import { runAgentCycle, getAgentState, resetAgentState } from '@/app/lib/agent/orchestrator';

export async function GET(req: NextRequest) {
  const action = req.nextUrl.searchParams.get('action') || 'state';

  if (action === 'run') {
    const result = await runAgentCycle();
    return NextResponse.json(result);
  }

  if (action === 'reset') {
    const state = await resetAgentState();
    return NextResponse.json({ success: true, state });
  }

  const state = await getAgentState();
  return NextResponse.json({ success: true, state });
}

export async function POST() {
  const result = await runAgentCycle();
  return NextResponse.json(result);
}
