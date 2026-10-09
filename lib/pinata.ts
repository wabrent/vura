export type HostResult = { url: string; host: string; ipfsHash?: string };

export async function pinToPinata(file: Blob, name: string): Promise<HostResult> {
  const jwt = process.env.PINATA_JWT;
  if (!jwt) throw new Error("pinata: no JWT");
  const fd = new FormData();
  fd.append("file", file, name);
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

export const UPLOAD_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const AUDIO_EXT = /\.(mp3|wav|m4a|aac|ogg|flac)$/i;
export const IMAGE_EXT = /\.(png|jpe?g|webp|gif|avif)$/i;
