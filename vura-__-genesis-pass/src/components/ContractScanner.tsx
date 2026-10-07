import React, { useState } from 'react';

interface TokenRow {
  contractAddress: string;
  chain: string;
  name: string;
  symbol: string;
  balance: number;
  priceUsd: number | null;
}

interface ScanResult {
  address: string;
  chain: string;
  total: number;
  returned: number;
  chainsScanned: number;
  chainsFailed: number;
  tokens: TokenRow[];
}

const CHAINS = [
  ['all', 'ALL CHAINS (35)'],
  ['robinhood', 'ROBINHOOD'],
  ['eth', 'ETHEREUM'],
  ['base', 'BASE'],
  ['arb', 'ARBITRUM'],
  ['op', 'OPTIMISM'],
  ['polygon', 'POLYGON'],
  ['bnb', 'BNB'],
  ['avax', 'AVALANCHE'],
];

const fmtUsd = (v: number) =>
  v.toLocaleString('en-US', { maximumFractionDigits: 2, style: 'currency', currency: 'USD' });

export const ContractScanner: React.FC<{ onShowToast: (msg: string) => void }> = ({ onShowToast }) => {
  const [address, setAddress] = useState('0xB8e73F3afc0B263f58770cA39DBf960FB0D587A9');
  const [chain, setChain] = useState('all');
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);

  const handleScan = async () => {
    const addr = address.trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) {
      setError('Invalid address - expected 0x + 40 hex characters');
      setResult(null);
      return;
    }
    setIsScanning(true);
    setError(null);
    setResult(null);
    try {
      const r = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: addr, chain }),
      });
      const j = await r.json().catch(() => null);
      if (!r.ok || j?.error) {
        setError(j?.error || `Scan failed (HTTP ${r.status})`);
      } else {
        setResult(j);
        onShowToast(`Live scan: ${j.total} tokens found across ${j.chainsScanned} chains`);
      }
    } catch {
      setError('Network error - please retry');
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="portal-page">
      <div className="portal-header">
        <div className="portal-title-block">
          <div className="subtitle-line">
            <span className="subtitle-dot" />
            <span>Real ERC-20 Balances via Alchemy Multi-Chain API</span>
          </div>
          <h1 className="portal-title">Wallet & Token Scanner</h1>
          <p className="portal-subtitle">
            Paste any wallet or token contract: real balances, real metadata and real USD prices, aggregated across 35 chains.
          </p>
        </div>
      </div>

      <div className="scanner-search-box">
        <div className="scanner-input-group">
          <input
            type="text"
            className="scanner-clean-input"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Paste wallet or contract address (0x...)"
            onKeyDown={(e) => e.key === 'Enter' && handleScan()}
          />
          <select
            className="scanner-clean-input"
            style={{ maxWidth: '190px' }}
            value={chain}
            onChange={(e) => setChain(e.target.value)}
          >
            {CHAINS.map(([id, label]) => (
              <option key={id} value={id}>{label}</option>
            ))}
          </select>
          <button className="btn-primary" onClick={handleScan} disabled={isScanning}>
            {isScanning ? 'Scanning...' : 'Scan Live'}
          </button>
        </div>
        <div style={{ fontSize: '11.5px', color: 'rgba(0,0,0,0.45)', paddingLeft: '8px' }}>
          Preset: $VURA token contract (0xB8e73F...587A9) - data is fetched live, not mocked
        </div>
      </div>

      {error && (
        <div className="scanner-results-row">
          <div className="scanner-stat-card">
            <span className="scanner-stat-label">Scan Error</span>
            <span className="scanner-stat-val" style={{ fontSize: '16px', color: '#dc2626' }}>{error}</span>
          </div>
        </div>
      )}

      {isScanning && (
        <div className="scanner-results-row">
          <div className="scanner-stat-card">
            <span className="scanner-stat-label">Status</span>
            <span className="scanner-stat-val" style={{ fontSize: '16px' }}>Querying 35 chains via Alchemy...</span>
            <span className="scanner-stat-sub">Usually 5-30 seconds</span>
          </div>
        </div>
      )}

      {result && (
        <>
          <div className="scanner-results-row">
            <div className="scanner-stat-card">
              <span className="scanner-stat-label">Tokens Found</span>
              <span className="scanner-stat-val">{result.total}</span>
              <span className="scanner-stat-sub">{result.returned} detailed below</span>
            </div>
            <div className="scanner-stat-card">
              <span className="scanner-stat-label">Chains Scanned</span>
              <span className="scanner-stat-val">{result.chainsScanned}</span>
              <span className="scanner-stat-sub">{result.chainsFailed} failed</span>
            </div>
            <div className="scanner-stat-card">
              <span className="scanner-stat-label">Address</span>
              <span className="scanner-stat-val" style={{ fontSize: '14px' }}>
                {result.address.slice(0, 10)}...{result.address.slice(-6)}
              </span>
              <span className="scanner-stat-sub">live via Alchemy</span>
            </div>
          </div>

          {result.tokens.length === 0 ? (
            <div className="scanner-results-row">
              <div className="scanner-stat-card">
                <span className="scanner-stat-label">Result</span>
                <span className="scanner-stat-val" style={{ fontSize: '16px' }}>
                  No ERC-20 balances on scanned chains
                </span>
              </div>
            </div>
          ) : (
            <div className="radar-card">
              <div className="clean-table-wrap">
                <table className="clean-table">
                  <thead>
                    <tr>
                      <th>Token</th>
                      <th>Chain</th>
                      <th>Balance</th>
                      <th>USD Value</th>
                      <th>Contract</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.tokens.map((t) => (
                      <tr key={t.chain + t.contractAddress}>
                        <td style={{ fontWeight: 600 }}>
                          {t.name} <span style={{ opacity: 0.55 }}>({t.symbol})</span>
                        </td>
                        <td>{t.chain}</td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>
                          {t.balance.toLocaleString('en-US', { maximumFractionDigits: 4 })}
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>
                          {t.priceUsd != null ? fmtUsd(t.balance * t.priceUsd) : 'n/a'}
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', opacity: 0.6 }}>
                          {t.contractAddress.slice(0, 10)}...{t.contractAddress.slice(-4)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
