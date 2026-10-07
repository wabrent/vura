import React from 'react';

export const LiquidityRadar: React.FC<{ onShowToast: (msg: string) => void }> = () => {
  return (
    <div className="portal-page">
      <div className="portal-header">
        <div className="portal-title-block">
          <div className="subtitle-line">
            <span className="subtitle-dot" />
            <span>Multi-Chain Algorithmic Surveillance · Live</span>
          </div>
          <h1 className="portal-title">Liquidity Radar</h1>
          <p className="portal-subtitle">
            The real radar terminal: pool depth, safety checks and cross-chain monitoring — running live from this page.
          </p>
        </div>
        <a className="tag-pill" style={{ padding: '8px 16px' }} href="/terminal" target="_blank" rel="noopener">
          Open standalone radar ↗
        </a>
      </div>

      <div className="embed-frame">
        <iframe src="/terminal" title="VURA Liquidity Radar" />
      </div>
    </div>
  );
};
