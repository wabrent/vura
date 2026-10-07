import React, { useEffect, useState } from 'react';

const VURA = '0xB8e73F3afc0B263f58770cA39DBf960FB0D587A9';
const RPC = 'https://rpc.mainnet.chain.robinhood.com';
const PONS = 'https://www.ponsfamily.com/launchpad/0xB8e73F3afc0B263f58770cA39DBf960FB0D587A9';

async function rpcCall(method: string, params: unknown[]): Promise<string> {
  const r = await fetch(RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const j = await r.json();
  if (j.error) throw new Error(j.error.message);
  return j.result;
}

export const Tokenomics: React.FC<{ onShowToast: (msg: string) => void }> = () => {
  const [chainId, setChainId] = useState<number | null>(null);
  const [supply, setSupply] = useState<string | null>(null);
  const [live, setLive] = useState<'loading' | 'ok' | 'fail'>('loading');

  useEffect(() => {
    (async () => {
      try {
        const cid = parseInt(await rpcCall('eth_chainId', []), 16);
        const raw = await rpcCall('eth_call', [{ to: VURA, data: '0x18160ddd' }, 'latest']);
        setChainId(cid);
        setSupply((Number(BigInt(raw)) / 1e18).toLocaleString('en-US'));
        setLive('ok');
      } catch {
        setLive('fail');
      }
    })();
  }, []);

  return (
    <div className="portal-page">
      <div className="portal-header">
        <div className="portal-title-block">
          <div className="subtitle-line">
            <span className="subtitle-dot" />
            <span>Robinhood Chain Ecosystem Asset · Live On-Chain Data</span>
          </div>
          <h1 className="portal-title">$VURA Tokenomics</h1>
          <p className="portal-subtitle">
            Figures below are read live from the Robinhood Chain RPC - totalSupply() straight from the token contract.
          </p>
        </div>
        <div className="tag-pill" style={{ padding: '8px 16px' }}>
          RPC:{' '}
          <strong>
            {live === 'loading' ? 'connecting...' : live === 'ok' ? 'LIVE' : 'offline'}
          </strong>
        </div>
      </div>

      <div className="tokenomics-stats-grid">
        <div className="tokenomics-card">
          <span className="scanner-stat-label">Total Supply (on-chain)</span>
          <span className="scanner-stat-val" style={{ fontSize: '22px' }}>
            {supply ?? (live === 'fail' ? 'RPC unreachable' : 'loading...')}
          </span>
          <span className="scanner-stat-sub">totalSupply() call, fixed & immutable</span>
        </div>

        <div className="tokenomics-card">
          <span className="scanner-stat-label">Chain ID (live)</span>
          <span className="scanner-stat-val" style={{ fontSize: '22px' }}>
            {chainId != null ? `#${chainId}` : '...'}
          </span>
          <span className="scanner-stat-sub">Robinhood mainnet, confirmed via eth_chainId</span>
        </div>

        <div className="tokenomics-card">
          <span className="scanner-stat-label">Token Contract</span>
          <span className="scanner-stat-val" style={{ fontSize: '15px', fontFamily: 'var(--font-mono)' }}>
            0xB8e73F...587A9
          </span>
          <span className="scanner-stat-sub">ERC-20, deployer-locked</span>
        </div>
      </div>

      <div className="staking-clean-card">
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '6px' }}>Trade $VURA</h2>
          <p style={{ fontSize: '13px', color: 'rgba(0,0,0,0.55)' }}>
            $VURA trades on the Pons bonding curve (ETH pair). The link opens the live launchpad page for this exact contract.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <a className="btn-primary" href={PONS} target="_blank" rel="noopener" style={{ padding: '12px 22px' }}>
            Trade on Pons ↗
          </a>
          <a
            className="btn"
            href="https://vura.ink/trade.html"
            target="_blank"
            rel="noopener"
            style={{ padding: '12px 22px' }}
          >
            Open Charts ↗
          </a>
        </div>
      </div>
    </div>
  );
};
