import React, { useState, useEffect } from 'react';
import { scrollToTop } from './Navbar13';
import { useLanguage } from '../context/LanguageContext';

export default function BackToTopButton({ onResetScan }) {
  const [isVisible, setIsVisible] = useState(false);
  const { t } = useLanguage();

  // Show button only when scrolled past 400px (Slide 2+)
  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 400) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const handleReturnToTop = () => {
    // 1. Force custom easeInOut smooth scroll to absolute top
    scrollToTop();
    
    // 2. Optional: Trigger upload modal or reset file input after scrolling
    if (onResetScan) {
      setTimeout(() => {
        onResetScan();
      }, 650);
    }
  };

  if (!isVisible) return null;

  return (
    <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 50 }}>
      <button
        onClick={handleReturnToTop}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.875rem 1.25rem',
          borderRadius: '9999px',
          backgroundColor: '#0C382B',
          color: 'white',
          fontWeight: 700,
          fontSize: '0.875rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid rgba(212, 231, 220, 0.4)',
          transition: 'all 0.3s',
          cursor: 'pointer',
          backdropFilter: 'blur(12px)'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.backgroundColor = '#0F4D3A';
          e.currentTarget.style.transform = 'scale(1.05)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.backgroundColor = '#0C382B';
          e.currentTarget.style.transform = 'scale(1)';
        }}
        onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
        onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
        title={t('backToHome')}
      >
        <span style={{ fontSize: '1.125rem' }}>🏠</span>
        <span>{t('backToHome')}</span>
      </button>
    </div>
  );
}
