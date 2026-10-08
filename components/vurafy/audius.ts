import { zeroAddress, type Address } from "viem";
import type { Track } from "./pons";

/**
 * Audius Discovery API — динамический каталог треков для VURAFY.
 * Тренды Electronic: обложки, названия, артисты и stream-URL (HTML5 audio).
 * Формат Track полностью совместим с галереей и плеером.
 */
const AUDIUS_HOST = "https://discoveryprovider.audius.co";
const AUDIUS_KEY = process.env.NEXT_PUBLIC_AUDIUS_API_KEY || "391a781d85069f0c1b6428839cbb59b41f68dbc2";

type AudiusTrack = {
  id: string;
  title: string;
  artwork?: { "480x480"?: string; "150x150"?: string };
  user?: { name?: string };
  play_count?: number;
};

function toTrack(t: AudiusTrack): Track | null {
  if (!t?.id || !t.title) return null;
  const symbol = (t.title.slice(0, 4).replace(/[^a-zA-Z]/g, "") || "VURA").toUpperCase();
  return {
    token: zeroAddress,
    curve: zeroAddress,
    deployer: zeroAddress as Address,
    name: t.title.toUpperCase(),
    symbol,
    logo: t.artwork?.["480x480"] || t.artwork?.["150x150"] || "",
    artist: (t.user?.name || "AUDIUS").toUpperCase(),
    audio: `${AUDIUS_HOST}/v1/tracks/${t.id}/stream?api_key=${AUDIUS_KEY}`,
    priceEth: 0.1,
    totalSupply: 1_000_000_000n * 10n ** 18n,
    available: 580_000_000n * 10n ** 18n,
    progress: 0,
    graduated: false,
    creatorTaxBps: 0,
    isDemo: true,
    plays: t.play_count || 0,
  };
}

export async function fetchAudiusTracks(limit = 6): Promise<Track[]> {
  const res = await fetch(`${AUDIUS_HOST}/v1/tracks/trending?genre=Electronic&limit=${limit}`, {
    headers: { "x-api-key": AUDIUS_KEY },
  });
  if (!res.ok) throw new Error(`audius http ${res.status}`);
  const json = (await res.json()) as { data?: AudiusTrack[] };
  const items = Array.isArray(json.data) ? json.data : [];
  return items.map(toTrack).filter((t): t is Track => t !== null);
}
