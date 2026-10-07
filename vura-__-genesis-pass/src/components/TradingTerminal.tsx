import React from 'react';

export const TradingTerminal: React.FC<{ onShowToast: (msg: string) => void }> = () => {
  return (
    <div className="portal-page">
      <div className="portal-header">
        <div className="portal-title-block">
          <div className="subtitle-line">
            <span className="subtitle-dot" />
            <span>Live CLOB Terminal on Robinhood Chain</span>
          </div>
          <h1 className="portal-title">Trading Terminal</h1>
          <p className="portal-subtitle">
            Real charts, real order flow: $VURA and Robinhood-chain pairs with live candles, order book and on-chain swap routing.
          </p>
        </div>
        <a className="tag-pill" style={{ padding: '8px 16px' }} href="/trade.html" target="_blank" rel="noopener">
          Open full terminal ↗
        </a>
      </div>

      <div className="embed-frame">
        <iframe src="/trade.html" title="VURA Trading Terminal" allow="clipboard-write" />
      </div>
    </div>
  );
};
