"use client';

import { useState, useEffect, useCallback } from 'react';

const COMBOS_RFQ_BASE = process.env.NEXT_PUBLIC_COMBOS_RFQ_BASE || 'https://combos-rfq-api.polymarket.com';
const GAMMA_BASE = process.env.NEXT_PUBLIC_GAMMA_BASE || 'https://gamma-api.polymarket.com';
const DATA_BASE = process.env.NEXT_PUBLIC_DATA_BASE || 'https://data-api.polymarket.com';

export interface ComboLeg {
  id: string;
  conditionId: string;
  positionIds: string[];
  slug: string;
  title: string;
  outcomes: string[];
  prices: number[];
  yesPrice: number;
  noPrice: number;
  image: string | null;
  volume: number;
  tags: string[];
}

export interface ComboPosition {
  conditionId: string;
  title: string;
  legCount: number;
  totalStake: number;
  currentValue: number;
  pnl: number;
  redeemable: boolean;
  claimed?: boolean;
}

export function usePolymarketCombos() {
  const [legs, setLegs] = useState<ComboLeg[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchComboLegs = useCallback(async (max = 300) => {
    try {
      setLoading(true);
      setError(null);
      
      const legsList: ComboLeg[] = [];
      let cursor = null;
      let pages = 0;
      
      do {
        const url = `${COMBOS_RFQ_BASE}/v1/rfq/combo-markets?limit=100`
          + (cursor ? `&cursor=${encodeURIComponent(cursor)}` : '');
        
        const response = await fetch(url, {
          headers: { 'Accept': 'application/json' }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch combo legs: ${response.status}`);
        }
        
        const { markets, next_cursor } = await response.json();
        
        for (const m of markets || []) {
          legsList.push({
            id: m.id,
            conditionId: m.condition_id,
            positionIds: m.position_ids || [],
            slug: m.slug,
            title: m.title,
            outcomes: m.outcomes || ['Yes', 'No'],
            prices: (m.outcome_prices || []).map(Number),
            yesPrice: Number(m.outcome_prices?.[0]) || 0,
            noPrice: Number(m.outcome_prices?.[1]) || 0,
            image: m.image || null,
            volume: Number(m.volume || 0),
            tags: m.tags || [],
          });
        }
        
        cursor = next_cursor;
      } while (cursor && legsList.length < max && ++pages < 10);
      
      setLegs(legsList);
      return legsList;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const computeComboQuote = useCallback((legPrices: number[], stake = 1) => {
    const valid = legPrices.map(Number).filter(p => p > 0 && p <= 1);
    if (valid.length < 2) return null;
    
    const combinedPrice = valid.reduce((a, p) => a * p, 1);
    const multiplier = combinedPrice > 0 ? 1 / combinedPrice : 0;
    
    return {
      combinedPrice,
      multiplier,
      potentialPayout: (Number(stake) || 0) * multiplier,
    };
  }, []);

  return {
    legs,
    loading,
    error,
    fetchComboLegs,
    computeComboQuote,
  };
}
