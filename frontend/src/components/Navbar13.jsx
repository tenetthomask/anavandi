import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ArrowRight } from 'lucide-react';
import LogoMark from './LogoMark';
import { useLanguage } from '../context/LanguageContext';

// Utility: Reliable Cross-Browser Smooth Scroll to absolute top (600ms)
export const scrollToTop = () => {
  const startPosition = window.scrollY;
  if (startPosition === 0) return;
  const distance = -startPosition;
  const duration = 600;
  let start = null;

  window.requestAnimationFrame(function step(timestamp) {
    if (!start) start = timestamp;
    const progress = timestamp - start;
    const fraction = Math.min(progress / duration, 1);
    
    // easeInOutCubic easing function
    const ease = fraction < 0.5 
      ? 4 * fraction * fraction * fraction 
      : 1 - Math.pow(-2 * fraction + 2, 3) / 2;

    window.scrollTo(0, startPosition + distance * ease);

    if (progress < duration) {
      window.requestAnimationFrame(step);
    }
  });
};

// Utility: Reliable Cross-Browser Smooth Scroll (500ms custom animation)
export const scrollToSection = (sectionId) => {
  const element = document.getElementById(sectionId);
  if (!element) {
    console.warn(`Target section #${sectionId} not found in DOM.`);
    return;
  }

  const targetPosition = element.getBoundingClientRect().top + window.scrollY;
  const startPosition = window.scrollY;
  const distance = targetPosition - startPosition;
  const duration = 600; // Updated to 600ms per user snippet
  let start = null;

  window.requestAnimationFrame(function step(timestamp) {
    if (!start) start = timestamp;
    const progress = timestamp - start;
    const fraction = Math.min(progress / duration, 1);
    
    // easeInOutCubic easing function
    const ease = fraction < 0.5 
      ? 4 * fraction * fraction * fraction 
      : 1 - Math.pow(-2 * fraction + 2, 3) / 2;

    window.scrollTo(0, startPosition + distance * ease);

    if (progress < duration) {
      window.requestAnimationFrame(step);
    }
  });
};

const NavLink = ({ targetId, children }) => {
  const handleScroll = (e) => {
    e.preventDefault();
    scrollToSection(targetId);
  };

  return (
    <a 
      href={`#${targetId}`} 
      onClick={handleScroll}
      style={{ color: 'var(--slate-body)', textDecoration: 'none', fontSize: '0.95rem', fontWeight: 500, transition: 'color 0.2s' }}
      onMouseOver={(e) => e.currentTarget.style.color = 'var(--charcoal-dark)'}
      onMouseOut={(e) => e.currentTarget.style.color = 'var(--slate-body)'}
    >
      {children}
    </a>
  );
};

// Animated EN | ML language toggle pill
function LangToggle() {
  const { lang, toggleLang } = useLanguage();
  const isML = lang === 'ml';

  return (
    <button
      onClick={toggleLang}
      title={isML ? 'Switch to English' : 'മലയാളത്തിലേക്ക് മാറ്റുക'}
      aria-label="Toggle language"
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 0,
        padding: '4px',
        borderRadius: '9999px',
        backgroundColor: 'rgba(12, 56, 43, 0.07)',
        border: '1px solid rgba(12, 56, 43, 0.18)',
        cursor: 'pointer',
        overflow: 'hidden',
        height: '34px',
        minWidth: '82px',
        transition: 'border-color 0.2s',
        flexShrink: 0,
      }}
      onMouseOver={(e) => e.currentTarget.style.borderColor = 'rgba(12, 56, 43, 0.4)'}
      onMouseOut={(e) => e.currentTarget.style.borderColor = 'rgba(12, 56, 43, 0.18)'}
    >
      {/* Sliding highlight pill */}
      <motion.div
        layout
        animate={{ x: isML ? 39 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 38 }}
        style={{
          position: 'absolute',
          left: 4,
          width: 37,
          height: 26,
          borderRadius: '9999px',
          backgroundColor: '#0C382B',
          boxShadow: '0 2px 6px rgba(12,56,43,0.35)',
        }}
      />
      {/* EN label */}
      <span style={{
        position: 'relative',
        zIndex: 1,
        width: 37,
        textAlign: 'center',
        fontSize: '0.75rem',
        fontWeight: 700,
        letterSpacing: '0.04em',
        color: isML ? '#6B7280' : '#FFFFFF',
        transition: 'color 0.2s',
        userSelect: 'none',
      }}>EN</span>
      {/* ML label */}
      <span style={{
        position: 'relative',
        zIndex: 1,
        width: 37,
        textAlign: 'center',
        fontSize: '0.75rem',
        fontWeight: 700,
        letterSpacing: '0.04em',
        color: isML ? '#FFFFFF' : '#6B7280',
        transition: 'color 0.2s',
        userSelect: 'none',
      }}>ML</span>
    </button>
  );
}

export default function Navbar13({ onScrollToStudio }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { t } = useLanguage();

  const menuLinks = [
    { labelKey: 'ingestionMatrix', href: '#ingestion-section', onClick: () => scrollToSection('ingestion-section') },
    { labelKey: 'gtfsStudio', href: '#gtfs-studio', onClick: () => scrollToSection('gtfs-studio') },
    { labelKey: 'capabilities', href: '#capabilities', onClick: () => scrollToSection('capabilities') }
  ];

  const menuVariants = {
    closed: {
      opacity: 0,
      clipPath: 'circle(30px at calc(100% - 40px) 40px)',
      transition: {
        type: 'spring',
        stiffness: 400,
        damping: 40
      }
    },
    open: {
      opacity: 1,
      clipPath: 'circle(150% at calc(100% - 40px) 40px)',
      transition: {
        type: 'spring',
        stiffness: 20,
        restDelta: 2
      }
    }
  };

  const navItemVariants = {
    closed: { y: 20, opacity: 0 },
    open: (i) => ({
      y: 0,
      opacity: 1,
      transition: {
        delay: 0.1 + i * 0.08,
        ease: [0.16, 1, 0.3, 1]
      }
    })
  };

  return (
    <>
      {/* COMPLETELY TRANSPARENT FLOATING NAVBAR */}
      <header 
        style={{
          position: 'relative',
          width: '100%',
          zIndex: 10,
          height: '80px',
          padding: '0 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid #D8DED7',
          pointerEvents: 'auto',
          transition: 'all 0.3s'
        }}
      >
        <div style={{
          maxWidth: '1440px',
          width: '100%',
          margin: '0 auto',
          height: '100%',
          padding: '0 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem'
        }}>
          
          {/* LEFT: BRAND LOGO MARK */}
          <div 
            onClick={scrollToTop}
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, cursor: 'pointer', minWidth: 'max-content' }}
          >
            <LogoMark size={40} color="var(--charcoal-dark)" />
            <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.25rem', color: 'var(--charcoal-dark)', letterSpacing: '-0.025em', whiteSpace: 'nowrap' }}>
              Cypher <span style={{ fontWeight: 500, color: 'var(--slate-body)', fontSize: '1rem' }}>Digitizer</span>
            </span>
          </div>

          {/* CENTER: NAV LINKS */}
          <div className="hide-on-mobile" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2rem', flexShrink: 1, overflow: 'hidden' }}>
            <NavLink targetId="ingestion-section">{t('ingestionMatrix')}</NavLink>
            <NavLink targetId="gtfs-studio">{t('gtfsStudio')}</NavLink>
            <NavLink targetId="capabilities">{t('capabilities')}</NavLink>
          </div>

          {/* RIGHT: LANG TOGGLE + CTA + HAMBURGER */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.875rem', flex: 1, minWidth: 'max-content' }}>
            
            {/* LANGUAGE TOGGLE PILL */}
            <LangToggle />

            <button 
              onClick={onScrollToStudio}
              style={{
                backgroundColor: 'var(--charcoal-dark)',
                color: '#FFFFFF',
                fontSize: '0.875rem',
                fontWeight: 600,
                padding: '0.6rem 1.25rem',
                borderRadius: '999px',
                border: 'none',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
                whiteSpace: 'nowrap',
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#1e293b'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--charcoal-dark)'}
            >
              {t('exportGtfs')}
            </button>

            {/* OVERLAY MENU TOGGLE BUTTON */}
            <button 
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle Fullscreen Navigation Menu"
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: 'rgba(15, 23, 42, 0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(15, 23, 42, 0.1)',
                cursor: 'pointer',
                zIndex: 60,
                transition: 'all 0.2s',
                flexShrink: 0,
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(15, 23, 42, 0.1)'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(15, 23, 42, 0.05)'}
            >
              {menuOpen ? <X size={20} color="var(--charcoal-dark)" /> : <Menu size={20} color="var(--charcoal-dark)" />}
            </button>
          </div>

        </div>
      </header>

      {/* STAGGERED FULL-SCREEN OVERLAY MENU */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial="closed"
            animate="open"
            exit="closed"
            variants={menuVariants}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(18, 15, 23, 0.98)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              zIndex: 55,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              padding: '5rem 2rem'
            }}
          >
            <button 
              onClick={() => setMenuOpen(false)}
              aria-label="Close menu"
              style={{
                position: 'absolute',
                top: '2rem',
                right: '2rem',
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                cursor: 'pointer',
                zIndex: 60,
              }}
            >
              <X size={24} color="#FFFFFF" />
            </button>
            <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--blue-primary)', letterSpacing: '0.1em', marginBottom: '2rem', textTransform: 'uppercase' }}>
                {t('navigationIndex')}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                {menuLinks.map((link, idx) => (
                  <motion.div key={link.labelKey} custom={idx} variants={navItemVariants}>
                    <a
                      href={link.href}
                      onClick={(e) => {
                        if (link.onClick) {
                          e.preventDefault();
                          link.onClick();
                        }
                        setMenuOpen(false);
                      }}
                      style={{
                        fontFamily: 'var(--font-heading)',
                        fontSize: '2.5rem',
                        fontWeight: 700,
                        color: '#FFFFFF',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '1rem',
                        transition: 'transform 0.2s ease, color 0.2s ease'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.color = '#60A5FA';
                        e.currentTarget.style.transform = 'translateX(10px)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.color = '#FFFFFF';
                        e.currentTarget.style.transform = 'translateX(0px)';
                      }}
                    >
                      {t(link.labelKey)} <ArrowRight size={24} style={{ opacity: 0.6 }} />
                    </a>
                  </motion.div>
                ))}
              </div>

              <div style={{ marginTop: '4rem', paddingTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', color: '#94A3B8', fontSize: '0.85rem' }}>
                <span>Cypher SC-04 Digitizer Engine</span>
                <span>WebAssembly Local Processing</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}


