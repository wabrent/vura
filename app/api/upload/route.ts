import { put } from "@vercel/blob";

export const runtime = "nodejs";

// Vercel serverless body limit is ~4.5MB
const MAX_BYTES = 4.4 * 1024 * 1024;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

type HostResult = { url: string; host: string; ipfsHash?: string };

async function toPinata(file: File): Promise<HostResult> {
  const jwt = process.env.PINATA_JWT;
  if (!jwt) throw new Error("pinata: no JWT");
  const fd = new FormData();
  fd.append("file", new Blob([await file.arrayBuffer()], { type: file.type }), file.name || "file");
  const r = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: { Authorization: `Bearer ${jwt}` },
    body: fd,
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`pinata ${r.status}: ${text.slice(0, 120)}`);
  const j = JSON.parse(text) as { IpfsHash?: string };
  if (!j.IpfsHash) throw new Error("pinata: no IpfsHash");
  const gateway = process.env.NEXT_PUBLIC_GATEWAY_URL || "https://gateway.pinata.cloud/ipfs/";
  return { url: `${gateway.replace(/\/?$/, "/")}${j.IpfsHash}`, host: "pinata", ipfsHash: j.IpfsHash };
}

async function toVercelBlob(file: File): Promise<HostResult> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) throw new Error("blob: no token");
  const ext = (file.name.match(/\.[a-z0-9]{2,5}$/i)?.[0] || ".png").toLowerCase();
  const name = `covers/${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
  const blob = await put(name, await file.arrayBuffer(), { access: "public", token });
  return { url: blob.url, host: "vercel-blob" };
}

async function toCatbox(file: File): Promise<HostResult> {
  const fd = new FormData();
  fd.append("reqtype", "fileupload");
  fd.append("fileToUpload", new Blob([await file.arrayBuffer()], { type: file.type }), file.name || "cover.png");
  const r = await fetch("https://catbox.moe/user/api.php", { method: "POST", body: fd, headers: { "user-agent": UA } });
  const text = (await r.text()).trim();
  if (r.ok && /^https:\/\/files\.catbox\.moe\/\S+$/.test(text)) return { url: text, host: "catbox" };
  throw new Error(`catbox: ${text.slice(0, 80) || r.status}`);
}

async function toUguu(file: File): Promise<HostResult> {
  const fd = new FormData();
  fd.append("files[]", new Blob([await file.arrayBuffer()], { type: file.type }), file.name || "cover.png");
  const r = await fetch("https://uguu.se/upload.php", { method: "POST", body: fd, headers: { "user-agent": UA } });
  const j = (await r.json()) as { files?: { url?: string }[] };
  const url = j.files?.[0]?.url;
  if (r.ok && url) return { url, host: "uguu" };
  throw new Error(`uguu: ${JSON.stringify(j).slice(0, 80) || r.status}`);
}

const AUDIO_EXT = /\.(mp3|wav|m4a|aac|ogg|flac)$/i;
const IMAGE_EXT = /\.(png|jpe?g|webp|gif|avif)$/i;

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return Response.json({ error: "no file" }, { status: 400 });
    if (file.size > MAX_BYTES)
      return Response.json({ error: "file too large — max 4MB (Vercel limit)" }, { status: 400 });
    const isAudio = file.type.startsWith("audio/") || AUDIO_EXT.test(file.name);
    const isImage = file.type.startsWith("image/") || IMAGE_EXT.test(file.name);
    if (!isAudio && !isImage)
      return Response.json({ error: "audio or image files only" }, { status: 400 });

    const attempts: string[] = [];
    try {
      return Response.json(await toPinata(file));
    } catch (e) {
      attempts.push(String((e as Error).message));
    }

    // fallbacks (images only — audio must stay on IPFS)
    if (isImage) {
      for (const fn of [toVercelBlob, toCatbox, toUguu]) {
        try {
          return Response.json(await fn(file));
        } catch (e) {
          attempts.push(String((e as Error).message));
        }
      }
    }
    return Response.json({ error: attempts.join(" | ").slice(0, 300) }, { status: 502 });
  } catch (e) {
    return Response.json({ error: String(e).slice(0, 160) }, { status: 500 });
  }
}
