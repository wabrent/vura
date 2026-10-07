import React from 'react';

export const VuraPad: React.FC<{ onShowToast: (msg: string) => void }> = () => {
  return (
    <div className="portal-page">
      <div className="portal-header">
        <div className="portal-title-block">
          <div className="subtitle-line">
            <span className="subtitle-dot" />
            <span>Autonomous Token Factory · Real Deployer</span>
          </div>
          <h1 className="portal-title">VuraPad Token Deployer</h1>
          <p className="portal-subtitle">
            The live VuraPad: deploy audited contracts to Robinhood Chain (#4663) with automated Pons V2 liquidity pairing.
          </p>
        </div>
        <a className="tag-pill" style={{ padding: '8px 16px' }} href="/vurapad" target="_blank" rel="noopener">
          Open VuraPad ↗
        </a>
      </div>

      <div className="embed-frame">
        <iframe src="/vurapad" title="VuraPad Token Deployer" />
      </div>
    </div>
  );
};
