import { NextRequest, NextResponse } from 'next/server';
import { ClobClient } from '@polymarket/clob-client-v2';
import { Wallet } from 'ethers';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { signedOrder } = body;
    if (!signedOrder?.signature) {
      return NextResponse.json({ error: 'No signed order' }, { status: 400 });
    }

    // Post-order doesn't need credentials for signed orders via CLOB
    const wallet = Wallet.createRandom();
    const client = new ClobClient({
      host: 'https://clob.polymarket.com',
      chain: 137,
      signer: wallet as any,
      creds: { key: '', secret: '', passphrase: '' },
      signatureType: 1,
      funderAddress: signedOrder.maker || wallet.address,
    });

    const res = await client.postOrder(signedOrder);
    return NextResponse.json(res);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Order failed', details: String(e) }, { status: 500 });
  }
}
