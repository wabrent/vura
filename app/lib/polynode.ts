'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface FillEvent {
  side: string;
  price: number;
  shares_normalized: number;
  token_label: string;
  title: string;
  user: string;
  taker: string;
  order_hash: string;
  tx_hash: string;
  market_slug: string;
  condition_id: string;
  token_id: string;
  shares: number;
  timestamp: number;
}

interface WhaleEvent {
  side: string;
  price: number;
  shares_normalized: number;
  token_label: string;
  title: string;
  user: string;
  market_slug: string;
  token_id: string;
  timestamp: number;
}

interface OracleEvent {
  type: string;
  market: string;
  outcome: string;
  condition_id: string;
  timestamp: number;
}

interface BlockEvent {
  block_number: number;
  trade_count: number;
  volume: number;
  timestamp: number;
}

export interface LiveTrade {
  side: string;
  price: number;
  size: number;
  token: string;
  title: string;
  user: string;
  ts: number;
}

export interface WhaleAlert {
  side: string;
  price: number;
  size: number;
  token: string;
  title: string;
  user: string;
  slug: string;
  ts: number;
}

export interface OracleUpdate {
  type: string;
  market: string;
  outcome: string;
  conditionId: string;
  ts: number;
}

export interface BlockUpdate {
  blockNumber: number;
  tradeCount: number;
  volume: number;
  ts: number;
}

export function usePolyNodeWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout>>();
  const pingRef = useRef<ReturnType<typeof setInterval>>();
  const retryCount = useRef(0);
  const [liveTrades, setLiveTrades] = useState<LiveTrade[]>([]);
  const [whaleAlerts, setWhaleAlerts] = useState<WhaleAlert[]>([]);
  const [oracleUpdates, setOracleUpdates] = useState<OracleUpdate[]>([]);
  const [blockUpdates, setBlockUpdates] = useState<BlockUpdate[]>([]);
  const [connected, setConnected] = useState(false);

  const maxItems = 50;

  const connect = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    if (retryCount.current >= 10) return;

    const apiKey = process.env.NEXT_PUBLIC_POLYNODE_KEY || '';
    if (!apiKey) return;

    retryCount.current += 1;

    const ws = new WebSocket(`wss://ws.polynode.dev/ws?key=${apiKey}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      retryCount.current = 0;
      ws.send(JSON.stringify({ action: 'subscribe', type: 'fills' }));
      ws.send(JSON.stringify({ action: 'subscribe', type: 'large_trades' }));
      ws.send(JSON.stringify({ action: 'subscribe', type: 'oracle' }));
      ws.send(JSON.stringify({ action: 'subscribe', type: 'blocks' }));
      if (pingRef.current) clearInterval(pingRef.current);
      pingRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ action: 'ping' }));
      }, 30000);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'pong' || msg.type === 'heartbeat') return;

        if (msg.type === 'event' && msg.data) {
          const d = msg.data;
          const streamType = msg.stream || 'fills';

          if (streamType === 'fills') {
            const trade: LiveTrade = {
              side: d.side,
              price: d.price,
              size: d.shares_normalized || 0,
              token: d.token_label || '?',
              title: d.title || '',
              user: d.user ? d.user.slice(0, 6) + '...' + d.user.slice(-4) : '',
              ts: d.timestamp * 1000,
            };
            setLiveTrades(prev => [trade, ...prev].slice(0, maxItems));
          }

          if (streamType === 'large_trades') {
            const alert: WhaleAlert = {
              side: d.side,
              price: d.price,
              size: d.shares_normalized || 0,
              token: d.token_label || '?',
              title: d.title || '',
              user: d.user ? d.user.slice(0, 6) + '...' + d.user.slice(-4) : '',
              slug: d.market_slug || '',
              ts: d.timestamp * 1000,
            };
            setWhaleAlerts(prev => [alert, ...prev].slice(0, maxItems));
          }
        }

        if (msg.type === 'oracle') {
          const upd: OracleUpdate = {
            type: msg.data?.type || msg.event || 'resolution',
            market: msg.data?.market || msg.data?.title || '',
            outcome: msg.data?.outcome || '',
            conditionId: msg.data?.condition_id || '',
            ts: msg.timestamp || Date.now(),
          };
          setOracleUpdates(prev => [upd, ...prev].slice(0, maxItems));
        }

        if (msg.type === 'block') {
          const blk: BlockUpdate = {
            blockNumber: msg.data?.block_number || msg.block_number || 0,
            tradeCount: msg.data?.trade_count || 0,
            volume: msg.data?.volume || 0,
            ts: msg.timestamp || Date.now(),
          };
          setBlockUpdates(prev => [blk, ...prev].slice(0, 10));
        }
      } catch {}
    };

    ws.onclose = () => {
      setConnected(false);
      if (pingRef.current) clearInterval(pingRef.current);
      reconnectRef.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => ws.close();
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      if (pingRef.current) clearInterval(pingRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { liveTrades, whaleAlerts, oracleUpdates, blockUpdates, connected };
}
