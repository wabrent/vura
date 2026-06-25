"use client';

import { useState, useEffect, useCallback } from 'react';

const API_BASE = '/api/combos';

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

export interface ComboQuote {
  price: number;
  multiplier: number;
  potentialPayout: number;
  traderCount?: number;
}

export interface ComboPosition {
  id: string;
  conditionId: string;
  title: string;
  legs: ComboLeg[];
  side: 'YES' | 'NO';
  size: number;
  entryPrice: number;
  currentValue: number;
  pnl: number;
  timestamp: number;
  status: 'OPEN' | 'CLOSED' | 'FAILED';
  txHash?: string;
}

export function usePolymarketCombosAPI() {
  const [legs, setLegs] = useState<ComboLeg[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchComboLegs = useCallback(async (max = 300) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_BASE}/legs?max=${max}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch combo legs');
      }
      
      const data = await response.json();
      setLegs(data.legs);
      return data.legs;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchComboPrice = useCallback(async ({ legPositionIds, address, creds }: {
    legPositionIds: string[];
    address: string;
    creds: { key: string; secret: string; passphrase: string };
  }) => {
    try {
      setError(null);
      
      const response = await fetch(`${API_BASE}/price`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ legPositionIds, address, creds }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch combo price');
      }
      
      return await response.json();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    }
  }, []);

  const placeCombo = useCallback(async ({
    signer,
    address,
    funderAddress,
    creds,
    legPositionIds,
    direction = 'BUY',
    side = 'YES',
    sizeUsdcE6,
    onStatus,
    maxRetries = 2
  }: {
    signer: any;
    address: string;
    funderAddress: string;
    creds: { key: string; secret: string; passphrase: string };
    legPositionIds: string[];
    direction?: 'BUY' | 'SELL';
    side?: 'YES' | 'NO';
    sizeUsdcE6: number;
    onStatus?: (status: string) => void;
    maxRetries?: number;
  }) => {
    try {
      setError(null);
      
      const response = await fetch(`${API_BASE}/place`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signer,
          address,
          funderAddress,
          creds,
          legPositionIds,
          direction,
          side,
          sizeUsdcE6,
          onStatus,
          maxRetries,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to place combo');
      }
      
      return await response.json();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    }
  }, []);

  const fetchComboPositions = useCallback(async (address: string) => {
    try {
      setError(null);
      
      const response = await fetch(`${API_BASE}/positions/${address}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch combo positions');
      }
      
      return await response.json();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    }
  }, []);

  const fetchComboActivity = useCallback(async (address: string) => {
    try {
      setError(null);
      
      const response = await fetch(`${API_BASE}/activity/${address}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch combo activity');
      }
      
      return await response.json();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    }
  }, []);

  return {
    legs,
    loading,
    error,
    fetchComboLegs,
    fetchComboPrice,
    placeCombo,
    fetchComboPositions,
    fetchComboActivity,
  };
}
