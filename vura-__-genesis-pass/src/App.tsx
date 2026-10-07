import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus } from 'lucide-react';
import './App.css';

// Components for each page
import { HeroSection } from './components/HeroSection';
import { TradingTerminal } from './components/TradingTerminal';
import { PassesPortal } from './components/PassesPortal';
import { LiquidityRadar } from './components/LiquidityRadar';
import { ContractScanner } from './components/ContractScanner';
import { VuraPad } from './components/VuraPad';
import { Tokenomics } from './components/Tokenomics';

const customEase = [0.16, 1, 0.3, 1] as const;

export type PageId = 'hero' | 'trade' | 'passes' | 'radar' | 'scanner' | 'vurapad' | 'tokenomics';

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageId>('hero');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  const navigateTo = (page: PageId) => {
    setCurrentPage(page);
    setIsMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className={`app-shell ${currentPage === 'trade' ? 'dark-theme' : ''}`}>
      {/* ================================================================
          1. FIXED TOP NAVBAR
          ================================================================ */}
      <motion.header
        className="navbar"
        initial={{ y: -16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: customEase }}
      >
        {/* Left Side */}
        <div className="nav-left">
          {/* Logo / Brand Link */}
          <button
            className="brand-link"
            style={{ background: 'transparent', border: 'none' }}
            onClick={() => navigateTo('hero')}
            aria-label="vura.ink Home"
          >
            <span className="brand-icon">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <g transform="rotate(-35 12 12)">
                  <rect x="5.5" y="4" width="5" height="16" rx="2.5" fill="#000000" />
                  <rect x="13.5" y="4" width="5" height="16" rx="2.5" fill="#000000" />
                </g>
              </svg>
            </span>
            <span className="brand-name">vura.ink</span>
          </button>

          {/* Menu Button: Black Pill with Plus Icon */}
          <motion.button
            className="menu-btn"
            onClick={() => setIsMenuOpen(true)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            aria-label="Open Navigation Menu"
          >
            <span className="menu-circle">
              <Plus size={12} strokeWidth={3} />
            </span>
            <span className="menu-label">Menu</span>
          </motion.button>

          {/* Direct Desktop Page Navigation Tabs */}
          <nav className="nav-pages-row" aria-label="Page Tabs">
            <button
              className={`nav-page-btn ${currentPage === 'hero' ? 'active' : ''}`}
              onClick={() => navigateTo('hero')}
            >
              Overview
            </button>
            <button
              className={`nav-page-btn ${currentPage === 'trade' ? 'active' : ''}`}
              onClick={() => navigateTo('trade')}
            >
              Trade (DEX)
            </button>
            <button
              className={`nav-page-btn ${currentPage === 'passes' ? 'active' : ''}`}
              onClick={() => navigateTo('passes')}
            >
              333 Passes
            </button>
            <button
              className={`nav-page-btn ${currentPage === 'radar' ? 'active' : ''}`}
              onClick={() => navigateTo('radar')}
            >
              Radar
            </button>
            <button
              className={`nav-page-btn ${currentPage === 'scanner' ? 'active' : ''}`}
              onClick={() => navigateTo('scanner')}
            >
              Scanner
            </button>
            <button
              className={`nav-page-btn ${currentPage === 'vurapad' ? 'active' : ''}`}
              onClick={() => navigateTo('vurapad')}
            >
              VuraPad
            </button>
            <button
              className={`nav-page-btn ${currentPage === 'tokenomics' ? 'active' : ''}`}
              onClick={() => navigateTo('tokenomics')}
            >
              Tokenomics
            </button>
          </nav>
        </div>

        {/* Right Side */}
        <div className="nav-right">
          <motion.button
            className="adaptive-pill"
            onClick={() => navigateTo('trade')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            aria-label="Alpha Terminal"
          >
            <span className="adaptive-circle">
              <svg
                width="10"
                height="10"
                viewBox="0 0 10 10"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle cx="2.5" cy="2.5" r="1.25" fill="#ffffff" />
                <circle cx="7.5" cy="2.5" r="1.25" fill="#ffffff" />
                <circle cx="2.5" cy="7.5" r="1.25" fill="#ffffff" />
                <circle cx="7.5" cy="7.5" r="1.25" fill="#ffffff" />
              </svg>
            </span>
            <span className="adaptive-label">
              {currentPage === 'trade' ? 'Robinhood #4663' : 'Alpha Terminal'}
            </span>
          </motion.button>
        </div>
      </motion.header>

      {/* ================================================================
          2. PAGE ROUTING & VIEW CONTAINER
          ================================================================ */}
      <main className="content-container">
        {currentPage === 'hero' && (
          <div className="hero-container">
            <HeroSection
              onNavigate={(page) => navigateTo(page as PageId)}
              onOpenMintModal={() => {
                window.location.href = '/mint.html';
              }}
              customEase={customEase}
            />
          </div>
        )}

        {currentPage === 'trade' && <TradingTerminal onShowToast={showToast} />}

        {currentPage === 'passes' && <PassesPortal onShowToast={showToast} />}

        {currentPage === 'radar' && <LiquidityRadar onShowToast={showToast} />}

        {currentPage === 'scanner' && <ContractScanner onShowToast={showToast} />}

        {currentPage === 'vurapad' && <VuraPad onShowToast={showToast} />}

        {currentPage === 'tokenomics' && <Tokenomics onShowToast={showToast} />}
      </main>

      {/* ================================================================
          3. FULL PROTOCOL MENU DRAWER
          ================================================================ */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            className="menu-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMenuOpen(false)}
          >
            <motion.div
              className="menu-modal-card"
              initial={{ scale: 0.95, y: 10, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 10, opacity: 0 }}
              transition={{ duration: 0.25, ease: customEase }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="menu-modal-header">
                <div>
                  <div className="menu-modal-title">vura.ink Protocol Suite</div>
                  <div style={{ fontSize: '12px', color: 'rgba(0,0,0,0.5)', marginTop: '2px' }}>
                    Robinhood Chain ID: #4663 · Settlement Layer
                  </div>
                </div>
                <button
                  className="menu-modal-close"
                  onClick={() => setIsMenuOpen(false)}
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              <div className="menu-modal-links">
                <button
                  className="menu-modal-item"
                  onClick={() => navigateTo('hero')}
                >
                  <span>1. Overview (Hero Video)</span>
                  <span style={{ color: 'rgba(0,0,0,0.4)', fontSize: '12px' }}>Landing ↗</span>
                </button>
                <button
                  className="menu-modal-item"
                  onClick={() => navigateTo('trade')}
                >
                  <span>2. Perpetuals & Stock DEX (Arcus)</span>
                  <span style={{ color: '#16a34a', fontSize: '12px', fontWeight: 600 }}>Live Terminal ↗</span>
                </button>
                <button
                  className="menu-modal-item"
                  onClick={() => navigateTo('passes')}
                >
                  <span>3. 333 Genesis Passes</span>
                  <span style={{ color: 'rgba(0,0,0,0.4)', fontSize: '12px' }}>0.05 ETH ↗</span>
                </button>
                <button
                  className="menu-modal-item"
                  onClick={() => navigateTo('radar')}
                >
                  <span>4. Multi-Chain Liquidity Radar</span>
                  <span style={{ color: 'rgba(0,0,0,0.4)', fontSize: '12px' }}>9 Chains ↗</span>
                </button>
                <button
                  className="menu-modal-item"
                  onClick={() => navigateTo('scanner')}
                >
                  <span>5. Contract Security Scanner</span>
                  <span style={{ color: '#16a34a', fontSize: '12px' }}>98/100 Safe ↗</span>
                </button>
                <button
                  className="menu-modal-item"
                  onClick={() => navigateTo('vurapad')}
                >
                  <span>6. VuraPad Token Deployer</span>
                  <span style={{ color: 'rgba(0,0,0,0.4)', fontSize: '12px' }}>Robinhood 4663 ↗</span>
                </button>
                <button
                  className="menu-modal-item"
                  onClick={() => navigateTo('tokenomics')}
                >
                  <span>7. $VURA Tokenomics & Staking</span>
                  <span style={{ color: 'rgba(0,0,0,0.4)', fontSize: '12px' }}>38.5% APR ↗</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            style={{
              position: 'fixed',
              bottom: '24px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 999,
              backgroundColor: '#000000',
              color: '#ffffff',
              padding: '10px 22px',
              borderRadius: '9999px',
              fontSize: '12.5px',
              fontWeight: 500,
              boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
              pointerEvents: 'none',
              letterSpacing: '-0.01em',
            }}
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
