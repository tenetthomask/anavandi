import React from 'react';
import { Eye, ShieldCheck, Zap, MapPin, ArrowRight } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function FeaturesGrid() {
  const { t } = useLanguage();

  const features = [
    {
      icon: <Eye size={20} color="var(--blue-primary)" />,
      title: t('feature1Title'),
      description: t('feature1Desc')
    },
    {
      icon: <ShieldCheck size={20} color="var(--status-green)" />,
      title: t('feature2Title'),
      description: t('feature2Desc')
    },
    {
      icon: <Zap size={20} color="#EAB308" />,
      title: t('feature3Title'),
      description: t('feature3Desc')
    },
    {
      icon: <MapPin size={20} color="#EC4899" />,
      title: t('feature4Title'),
      description: t('feature4Desc')
    }
  ];

  return (
    <section style={{ maxWidth: '1280px', margin: '0 auto', padding: '3.5rem 1.5rem', position: 'relative', zIndex: 10 }}>
      <div className="saas-card" style={{ padding: '2.5rem 2rem' }}>
        
        {/* Header Title */}
        <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 2.5rem' }}>
          <div style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '0.4rem', 
            padding: '0.25rem 0.75rem', 
            borderRadius: '99px', 
            backgroundColor: 'var(--gray-pill-bg)', 
            color: 'var(--slate-body)', 
            fontSize: '0.78rem', 
            fontWeight: 600,
            marginBottom: '0.85rem'
          }}>
            {t('systemCapabilitiesLabel')}
          </div>
          <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--charcoal-dark)', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
            {t('featuresTitle')}
          </h2>
          <p style={{ color: 'var(--slate-body)', fontSize: '0.95rem', lineHeight: '1.5' }}>
            {t('featuresSubtitle')}
          </p>
        </div>

        {/* 4-Column Minimal SaaS Feature Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.25rem' }}>
          {features.map((item, index) => (
            <div 
              key={index} 
              style={{
                backgroundColor: 'var(--gray-pill-bg)',
                border: '1px solid var(--card-border)',
                borderRadius: '12px',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#FFFFFF';
                e.currentTarget.style.borderColor = '#CBD5E1';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--gray-pill-bg)';
                e.currentTarget.style.borderColor = 'var(--card-border)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div>
                <div style={{ 
                  width: '38px', 
                  height: '38px', 
                  borderRadius: '8px', 
                  backgroundColor: '#FFFFFF', 
                  border: '1px solid var(--card-border)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  marginBottom: '1rem' 
                }}>
                  {item.icon}
                </div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--charcoal-dark)', marginBottom: '0.4rem' }}>
                  {item.title}
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--slate-body)', lineHeight: '1.5', marginBottom: '1rem' }}>
                  {item.description}
                </p>
              </div>

            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
