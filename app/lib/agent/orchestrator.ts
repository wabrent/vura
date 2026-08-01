import { fetchMarkets } from './skills/markets';
import { analyzeSignal } from './signals/analyzer';
import { appendSignals, loadState, saveState, getEmptyState } from './memory/store';
import type { AgentSignal } from './types';

export async function runAgentCycle(): Promise<{
  success: boolean;
  signals: AgentSignal[];
  state: any;
  error?: string;
}> {
  try {
    const markets = await fetchMarkets();
    if (!markets.length) return { success: false, signals: [], state: null, error: 'No markets fetched' };

    const signals: AgentSignal[] = [];
    for (const m of markets) {
      const signal = await analyzeSignal(m);
      signals.push(signal);
    }

    const state = await appendSignals(signals);
    return { success: true, signals, state };
  } catch (e: any) {
    return { success: false, signals: [], state: null, error: e.message };
  }
}

export async function getAgentState() {
  return loadState();
}

export async function resetAgentState() {
  const empty = getEmptyState();
  await saveState(empty);
  return empty;
}
