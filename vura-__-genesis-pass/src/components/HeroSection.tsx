import React from 'react';
import { motion } from 'motion/react';

interface HeroSectionProps {
  onNavigate: (page: string) => void;
  onOpenMintModal: () => void;
  customEase: readonly [number, number, number, number];
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onNavigate,
  onOpenMintModal,
  customEase,
}) => {
  return (
    <>
      {/* ================================================================
          Background Video (Full Viewport)
          ================================================================ */}
      <div className="video-layer">
        <motion.div
          className="video-wrapper"
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.8, ease: customEase }}
        >
          <video
            className="bg-video"
            autoPlay
            muted
            loop
            playsInline
          >
            <source
              src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260809_012548_ef22562c-c0ae-4816-ad9d-f8922af4e6a7.mp4"
              type="video/mp4"
            />
          </video>
        </motion.div>
      </div>

      {/* Spacer to push footer to bottom */}
      <div style={{ flex: 1 }} />

      {/* ================================================================
          Footer Content (Bottom Pinned over Gradient)
          ================================================================ */}
      <motion.footer
        className="footer-section"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, duration: 1.0, ease: customEase }}
      >
        {/* Left Block */}
        <div className="footer-left">
          {/* Subtitle Line */}
          <motion.div
            className="subtitle-line"
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.8, ease: customEase }}
          >
            <span className="subtitle-dot" />
            <span>Robinhood Chain · 333 Deterministic Slots · vura.ink</span>
          </motion.div>

          {/* Heading: "One Pass, Zero / Limits. Worldwide." */}
          <motion.h1
            className="hero-heading"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.8, ease: customEase }}
          >
            <span className="hero-heading-line">One Pass, Zero</span>
            <span className="hero-heading-line">Limits. Worldwide.</span>
          </motion.h1>

          {/* CTA Buttons */}
          <motion.div
            className="cta-buttons"
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1.0, duration: 0.8, ease: customEase }}
          >
            <button
              className="btn-primary"
              onClick={onOpenMintModal}
            >
              Mint Genesis Pass
            </button>
            <button
              className="btn-secondary"
              onClick={() => onNavigate('trade')}
            >
              Launch Terminal
            </button>
          </motion.div>
        </div>

        {/* Right Block: Three Tag Pills */}
        <motion.div
          className="footer-right"
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.1, duration: 0.8, ease: customEase }}
        >
          <span className="tag-pill" onClick={() => onNavigate('passes')} style={{ cursor: 'pointer' }}>
            333 Slots
          </span>
          <span className="tag-pill" onClick={() => onNavigate('trade')} style={{ cursor: 'pointer' }}>
            Robinhood 4663
          </span>
          <span className="tag-pill" onClick={() => onNavigate('tokenomics')} style={{ cursor: 'pointer' }}>
            $VURA Engine
          </span>
        </motion.div>
      </motion.footer>
    </>
  );
};
