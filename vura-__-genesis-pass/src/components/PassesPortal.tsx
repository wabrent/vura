import React from 'react';
import { motion } from 'motion/react';

const OPENSEA = 'https://opensea.io/collection/vura-genesis-pass';
const MINT_PAGE = '/mint.html';

interface PassesPortalProps {
  onShowToast: (msg: string) => void;
}

export const PassesPortal: React.FC<PassesPortalProps> = () => {
  const passes = [
    { id: 42, rarity: 'Legendary (1-bit)' },
    { id: 43, rarity: 'Matrix Prime' },
    { id: 44, rarity: 'Deterministic' },
    { id: 45, rarity: 'Entropy Core' },
    { id: 18, rarity: 'Genesis Pioneer' },
    { id: 99, rarity: 'Quantum Binary' },
  ];

  return (
    <div className="portal-page">
      <div className="portal-header">
        <div className="portal-title-block">
          <div className="subtitle-line">
            <span className="subtitle-dot" />
            <span>Deterministic Cryptography · 333 Slots Total</span>
          </div>
          <h1 className="portal-title">333 Genesis Passes</h1>
          <p className="portal-subtitle">
            Unique 1-bit generative cryptographic passes on Robinhood Chain. Every slot confers lifetime
            zero-fee DEX trading, alpha scanner access, and protocol revenue share.
          </p>
        </div>

        <div className="tag-pill" style={{ padding: '8px 16px' }}>
          Supply: <strong>333 Fixed</strong> · Mint on OpenSea
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '18px', flexWrap: 'wrap' }}>
        <a className="btn-primary" href={MINT_PAGE} style={{ padding: '12px 22px' }}>
          Mint Page ↗
        </a>
        <a className="btn" href={OPENSEA} target="_blank" rel="noopener" style={{ padding: '12px 22px' }}>
          View Collection on OpenSea ↗
        </a>
      </div>

      <div className="passes-grid">
        {passes.map((p) => (
          <motion.a
            key={p.id}
            className="pass-card"
            href={OPENSEA}
            target="_blank"
            rel="noopener"
            whileHover={{ y: -3 }}
          >
            <div className="pass-matrix-preview">
              <div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', marginBottom: '4px' }}>
                  SLOT #{String(p.id).padStart(3, '0')} // 1-BIT MATRIX
                </div>
                <div>█ █ ░ █ ░ ░ █ █</div>
                <div>░ █ █ ░ █ █ ░ ░</div>
                <div>█ ░ █ █ ░ █ █ █</div>
                <div>░ ░ █ ░ ░ █ ░ █</div>
              </div>
            </div>

            <div className="pass-meta">
              <div className="pass-id">Slot #{String(p.id).padStart(3, '0')}</div>
              <div className="pass-rarity">{p.rarity}</div>
              <div className="pass-footer">
                <span className="pass-cost">0.05 ETH</span>
                <span className="btn-primary" style={{ padding: '6px 14px', fontSize: '12px' }}>
                  View on OpenSea
                </span>
              </div>
            </div>
          </motion.a>
        ))}
      </div>

      <div className="passes-benefits-row">
        <div className="benefit-card">
          <div className="benefit-title">Zero Trading Fees</div>
          <p className="benefit-desc">
            Pass holders pay 0.00% fees on all spot stock tokens and perpetual contracts on Robinhood Chain.
          </p>
        </div>
        <div className="benefit-card">
          <div className="benefit-title">Alpha Radar Priority</div>
          <p className="benefit-desc">
            Sub-second early mempool alerts across 9 EVM and non-EVM chains before public sequencer broadcast.
          </p>
        </div>
        <div className="benefit-card">
          <div className="benefit-title">Sequencer Revenue Share</div>
          <p className="benefit-desc">
            Direct daily USDG rewards from protocol sequencer fees and Season 1 $VURA allocations.
          </p>
        </div>
      </div>
    </div>
  );
};
