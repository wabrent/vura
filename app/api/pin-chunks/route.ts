import { list, del } from "@vercel/blob";
import { pinToPinata, UPLOAD_ID_RE, AUDIO_EXT, IMAGE_EXT } from "@/lib/pinata";

export const runtime = "nodejs";

// assembled file cap — well under Pinata single-pin comfort and node memory
const MAX_BYTES = 50 * 1024 * 1024;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { uploadId?: string; filename?: string; mime?: string };
    const uploadId = String(body.uploadId || "");
    if (!UPLOAD_ID_RE.test(uploadId)) return Response.json({ error: "bad uploadId" }, { status: 400 });
    const filename = String(body.filename || "file").replace(/[^\w.\- ()]/g, "_").slice(0, 80) || "file";
    const isAudio = AUDIO_EXT.test(filename) || /^audio\//.test(String(body.mime || ""));
    const isImage = IMAGE_EXT.test(filename) || /^image\//.test(String(body.mime || ""));
    if (!isAudio && !isImage) return Response.json({ error: "audio or image files only" }, { status: 400 });
    const mime = /^audio\//.test(String(body.mime || "")) || /^image\//.test(String(body.mime || ""))
      ? String(body.mime) : isAudio ? "audio/mpeg" : "application/octet-stream";
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) return Response.json({ error: "blob: no token" }, { status: 500 });

    const listed = await list({ prefix: `chunks/${uploadId}/`, token });
    const sorted = [...listed.blobs].sort((a, b) => a.pathname.localeCompare(b.pathname));
    if (!sorted.length) return Response.json({ error: "no chunks found" }, { status: 400 });

    const parts: Uint8Array[] = [];
    let total = 0;
    for (const b of sorted) {
      const r = await fetch(b.url);
      if (!r.ok) return Response.json({ error: `chunk fetch ${r.status}` }, { status: 502 });
      const buf = new Uint8Array(await r.arrayBuffer());
      total += buf.length;
      if (total > MAX_BYTES) return Response.json({ error: "file too large — max 50MB" }, { status: 413 });
      parts.push(buf);
    }
    const merged = new Uint8Array(total);
    let off = 0;
    for (const p of parts) { merged.set(p, off); off += p.length; }

    const result = await pinToPinata(new Blob([merged], { type: mime }), filename);
    try { await del(sorted.map((b) => b.url), { token }); } catch { /* orphan chunks are harmless */ }
    return Response.json(result);
  } catch (e) {
    return Response.json({ error: String(e).slice(0, 160) }, { status: 500 });
  }
}
