const RPC = "https://rpc.mainnet.chain.robinhood.com/";

export async function POST(req: Request) {
  try {
    const body = await req.text();
    if (body.length > 1_000_000) return new Response("payload too large", { status: 413, headers: { "access-control-allow-origin": "*" } });
    const r = await fetch(RPC, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      cache: "no-store",
    });
    const text = await r.text();
    return new Response(text, {
      status: r.status,
      headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ jsonrpc: "2.0", id: null, error: { message: String(e) } }), {
      status: 502,
      headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
    });
  }
}

export function GET() {
  return new Response("POST only", { status: 405, headers: { "access-control-allow-origin": "*" } });
}
