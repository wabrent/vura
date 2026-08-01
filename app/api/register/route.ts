import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const FILE = join('/tmp', 'registrations.json');

function load(): { email: string; handle: string; ts: number }[] {
  try {
    if (existsSync(FILE)) return JSON.parse(readFileSync(FILE, 'utf-8'));
  } catch {}
  return [];
}

function save(regs: { email: string; handle: string; ts: number }[]) {
  writeFileSync(FILE, JSON.stringify(regs));
}

export async function POST(req: NextRequest) {
  try {
    const { email, handle } = await req.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    }

    const registrations = load();
    const exists = registrations.find(r => r.email === email);
    if (exists) {
      return NextResponse.json({ ok: true, message: 'Already registered', count: registrations.length });
    }

    registrations.push({ email, handle: handle || '', ts: Date.now() });
    save(registrations);

    return NextResponse.json({ ok: true, count: registrations.length });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function GET() {
  const registrations = load();
  const list = registrations.map(r => ({ email: r.email, handle: r.handle, ts: r.ts }));
  return NextResponse.json({ count: registrations.length, list });
}
