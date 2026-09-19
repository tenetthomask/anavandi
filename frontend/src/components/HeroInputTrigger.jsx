import React, { useState, useRef } from 'react';
import { Plus, Upload, Camera, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function HeroInputTrigger({ onFileSelected }) {
  const [showModal, setShowModal] = useState(false);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const { t } = useLanguage();

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelected(file);
      setShowModal(false);
    }
  };

  return (
    <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'auto' }}>
      {/* Hidden File Inputs */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="image/*,.pdf" 
        style={{ display: 'none' }} 
      />
      <input 
        type="file" 
        ref={cameraInputRef} 
        onChange={handleFileChange} 
        accept="image/*" 
        capture="environment" 
        style={{ display: 'none' }} 
      />

      {/* Main Single Action Button */}
      <button 
        onClick={() => setShowModal(true)}
        style={{
          padding: '1rem 2rem',
          fontSize: '1.1rem',
          fontWeight: 700,
          color: '#FFFFFF',
          borderRadius: '16px',
          backgroundColor: '#0C382B',
          border: '1px solid rgba(212, 231, 220, 0.3)',
          boxShadow: '0 10px 25px -5px rgba(12, 56, 43, 0.5)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          transition: 'all 0.2s ease'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.backgroundColor = '#0F4D3A';
          e.currentTarget.style.transform = 'scale(1.03)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.backgroundColor = '#0C382B';
          e.currentTarget.style.transform = 'scale(1.0)';
        }}
      >
        <Plus size={24} />
        {t('scanUploadBtn')}
      </button>

      {/* Input Selector Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 60,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(8px)'
        }}>
          <div style={{
            backgroundColor: '#120F17',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '20px',
            padding: '1.5rem',
            maxWidth: '380px',
            width: '100%',
            margin: '0 1rem',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#FFFFFF' }}>{t('selectInputMethod')}</h3>
              <button 
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '0.2rem' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {/* Option A — Upload File */}
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '1rem',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.borderColor = '#059669';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                }}
              >
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#0C382B', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34D399' }}>
                  <Upload size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>{t('uploadFile')}</div>
                  <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>{t('uploadFileDesc')}</div>
                </div>
              </button>

              {/* Option B — Open Camera */}
              <button
                onClick={() => cameraInputRef.current?.click()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '1rem',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.borderColor = '#2563EB';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                }}
              >
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#1E3A8A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60A5FA' }}>
                  <Camera size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>{t('openCamera')}</div>
                  <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>{t('openCameraDesc')}</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
