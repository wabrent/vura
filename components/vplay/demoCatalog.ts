import { zeroAddress, type Address } from "viem";
import type { Track } from "./pons";

/**
 * ДЕМО-КАТАЛОГ ТРЕКОВ (не в блокчейне, только для показа на сайте).
 *
 * Как добавить своего трека:
 *   1. Положи обложку в public/ (или бери внешний URL)  -> cover: "/genesis/42.png"
 *   2. Вставь ссылку на mp3 (свой хостинг, ipfs и т.д.)  -> audio: "https://.../track.mp3"
 *      (если audio: "" — вместо песни играет встроенный демо-синтезатор)
 *   3. Добавь объект ниже — он сразу появится в ленте и галерее обложек.
 */
export type DemoEntry = {
  name: string;
  symbol: string;
  artist: string;
  cover: string;   // URL обложки
  audio: string;   // URL песни (mp3), пусто = синтезатор
  priceEth: number;
  progress: number; // 0..1 прогресс к graduation
};

export const DEMO_CATALOG: DemoEntry[] = [
  { name: "Cosmic Echo",   symbol: "CSMIC", artist: "Vura",  cover: "/genesis/42.png",  audio: "", priceEth: 0.1,  progress: 0.42 },
  { name: "Eclipse",       symbol: "ECLPS", artist: "Kora",  cover: "/genesis/77.png",  audio: "", priceEth: 0.05, progress: 0.12 },
  { name: "Galactic Soul", symbol: "GSL",   artist: "Orion", cover: "/genesis/142.png", audio: "", priceEth: 0.08, progress: 0.66 },
  { name: "Gold Skull",    symbol: "SKUL",  artist: "Vura",  cover: "/genesis/1.png",   audio: "", priceEth: 0.04, progress: 0.31 },
  { name: "Dead Signal",   symbol: "DSIG",  artist: "Nova",  cover: "/genesis/277.png", audio: "", priceEth: 0.06, progress: 0.55 },
  { name: "Blockout",      symbol: "BLKO",  artist: "Rune",  cover: "/genesis/333.png", audio: "", priceEth: 0.03, progress: 0.18 },
];

export function buildDemoTracks(): Track[] {
  return DEMO_CATALOG.map((e) => ({
    token: zeroAddress,
    curve: zeroAddress,
    deployer: zeroAddress as Address,
    name: e.name,
    symbol: e.symbol,
    logo: e.cover,
    artist: e.artist,
    audio: e.audio,
    priceEth: e.priceEth,
    totalSupply: 1_000_000_000n * 10n ** 18n,
    available: BigInt(Math.max(0, Math.round((1 - e.progress) * 1e9))) * 10n ** 18n,
    progress: e.progress,
    graduated: false,
    creatorTaxBps: 0,
    isDemo: true,
  }));
}
