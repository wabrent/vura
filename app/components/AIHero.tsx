'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import Hls from 'hls.js';
import { ArrowRight, ChevronDown } from 'lucide-react';

const VIDEO_SRC = 'https://stream.mux.com/T6oQJQ02cQ6N01TR6iHwZkKFkbepS34dkkIc9iukgy400g.m3u8';
const POSTER = 'https://images.unsplash.com/photo-1647356191320-d7a1f80ca777?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhYnN0cmFjdCUyMGRhcmslMjB0ZWNobm9sb2d5JTIwbmV1cmFsJTIwbmV0d29ya3xlbnwxfHx8fDE3Njg5NzIyNTV8MA&ixlib=rb-4.1.0&q=80&w=1080';

export default function AIHero({ showNav = true }: { showNav?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(VIDEO_SRC);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch((e) => console.log('Auto-play prevented:', e));
      });
      return () => {
        hls.destroy();
      };
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = VIDEO_SRC;
      video.addEventListener('loadedmetadata', () => {
        video.play().catch((e) => console.log('Auto-play prevented:', e));
      });
    }
  }, []);

  return (
    <>
      {showNav && (
        <nav className="ai-nav">
          <div className="ai-nav-inner">
            <a href="/" className="ai-nav-logo">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="2" fill="white" />
                <circle cx="12" cy="12" r="9" stroke="white" strokeWidth="1.5" opacity="0.4" />
                <path d="M12 1C5.9 1 1 5.9 1 12" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
                <path d="M23 12C23 5.9 18.1 1 12 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
                <path d="M12 23C18.1 23 23 18.1 23 12" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
                <path d="M1 12C1 18.1 5.9 23 12 23" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
              </svg>
              <span>VURA</span>
            </a>
            <div className="ai-nav-links">
              <a href="#">Products <ChevronDown size={14} /></a>
              <a href="#">Customer Stories</a>
              <a href="#">Resources</a>
              <a href="#">Pricing</a>
            </div>
            <div className="ai-nav-right">
              <a href="#" className="ai-nav-demo">Book A Demo</a>
              <button className="ai-nav-cta">Get Started</button>
            </div>
          </div>
        </nav>
      )}

      {/* ── HERO ── */}
      <section className="ai-hero">
        {/* Video */}
        <div className="ai-hero-video">
          <video
            ref={videoRef}
            muted
            loop
            playsInline
            poster={POSTER}
            style={{ objectFit: 'cover', opacity: 0.6 }}
          />
          <div className="ai-hero-video-overlay" />
        </div>

        {/* Decorative gradients */}
        <div className="ai-hero-grad-g1" />
        <div className="ai-hero-grad-g2" />

        {/* Content */}
        <div className="ai-hero-content">
          <motion.p
            className="ai-hero-pre"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            Design at the speed of thought
          </motion.p>

          <motion.h1
            className="ai-hero-title"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            Build Faster
          </motion.h1>

          <motion.p
            className="ai-hero-sub"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.7 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            Create fully functional, SEO-optimized websites in seconds with our advanced AI engine.
          </motion.p>

          <motion.div
            className="ai-hero-ctas"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            <button className="ai-cta-primary">
              <span>Start Building Free</span>
              <span className="ai-cta-primary-circle">
                <ArrowRight size={20} />
              </span>
            </button>
            <button className="ai-cta-secondary">
              See Examples
              <ArrowRight size={16} className="ai-cta-sec-arrow" />
            </button>
          </motion.div>
        </div>
      </section>
    </>
  );
}
