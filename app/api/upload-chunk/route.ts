import { put } from "@vercel/blob";
import { UPLOAD_ID_RE } from "@/lib/pinata";

export const runtime = "nodejs";

// Vercel serverless body limit is ~4.5MB — one chunk fits with headroom
const MAX_CHUNK = 4.4 * 1024 * 1024;
const MAX_CHUNKS = 64;

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const chunk = form.get("chunk");
    const uploadId = String(form.get("uploadId") || "");
    const index = Number(form.get("index"));
    if (!(chunk instanceof File)) return Response.json({ error: "no chunk" }, { status: 400 });
    if (!UPLOAD_ID_RE.test(uploadId)) return Response.json({ error: "bad uploadId" }, { status: 400 });
    if (!Number.isInteger(index) || index < 0 || index >= MAX_CHUNKS)
      return Response.json({ error: "bad index" }, { status: 400 });
    if (chunk.size > MAX_CHUNK) return Response.json({ error: "chunk too large" }, { status: 400 });
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) return Response.json({ error: "blob: no token" }, { status: 500 });
    const pathname = `chunks/${uploadId}/${String(index).padStart(4, "0")}`;
    const blob = await put(pathname, await chunk.arrayBuffer(), { access: "public", token, allowOverwrite: true });
    return Response.json({ ok: true, url: blob.url });
  } catch (e) {
    return Response.json({ error: String(e).slice(0, 160) }, { status: 500 });
  }
}
