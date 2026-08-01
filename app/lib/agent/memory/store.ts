import type { AgentState, AgentSignal } from '../types';

const IS_SERVER = typeof window === 'undefined';
const MEMORY_KEY = 'vura:agent:state';

/* ── In-memory fallback ── */
let memory: AgentState = emptyState();

function emptyState(): AgentState {
  return {
    lastRun: 0,
    runCount: 0,
    signals: [],
    history: { aiProbabilities: [], marketProbabilities: [], signalScores: [], confidence: [] },
  };
}

/* ── Redis client (lazy) ── */
function getRedis() {
  try {
    const { Redis } = require('@upstash/redis');
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (url && token) return new Redis({ url, token });
  } catch {}
  return null;
}

export async function loadState(): Promise<AgentState> {
  if (!IS_SERVER) return memory;
  const redis = getRedis();
  if (redis) {
    try {
      const raw = await redis.get(MEMORY_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
  }
  return memory;
}

export async function saveState(state: AgentState): Promise<void> {
  if (IS_SERVER) {
    const redis = getRedis();
    if (redis) {
      try { await redis.set(MEMORY_KEY, JSON.stringify(state), { ex: 86400 }); } catch {}
    }
  }
  memory = state;
}

export async function appendSignals(signals: AgentSignal[]): Promise<AgentState> {
  const state = await loadState();
  const now = Date.now();

  for (const s of signals) {
    const idx = state.signals.findIndex(x => x.eventId === s.eventId);
    if (idx >= 0) state.signals[idx] = s;
    else state.signals.push(s);
  }

  const avgAi = signals.length
    ? Math.round(signals.reduce((s, x) => s + x.aiProbability, 0) / signals.length)
    : 0;
  const avgMkt = signals.length
    ? Math.round(signals.reduce((s, x) => s + x.marketProbability, 0) / signals.length)
    : 0;
  const avgSig = signals.length
    ? Math.round(signals.reduce((s, x) => s + x.signalStrength, 0) / signals.length)
    : 0;
  const highCount = signals.filter(x => x.confidence === 'High').length;
  const overallConf = highCount > signals.length / 2 ? 'High' : highCount > 0 ? 'Medium' : 'Low';

  state.history.aiProbabilities.push({ ts: now, val: avgAi });
  state.history.marketProbabilities.push({ ts: now, val: avgMkt });
  state.history.signalScores.push({ ts: now, val: avgSig });
  state.history.confidence.push({ ts: now, val: overallConf });

  const max = 288; // 24h at 5min intervals
  for (const k of ['aiProbabilities', 'marketProbabilities', 'signalScores'] as const) {
    if (state.history[k].length > max) state.history[k] = state.history[k].slice(-max);
  }
  if (state.history.confidence.length > max) state.history.confidence = state.history.confidence.slice(-max);

  state.lastRun = now;
  state.runCount += 1;

  await saveState(state);
  return state;
}

export function getEmptyState(): AgentState {
  return emptyState();
}
