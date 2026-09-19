import React, { useState, useRef, useCallback } from 'react';
import { Eye, EyeOff, ZoomIn, ZoomOut, Layers, Maximize2 } from 'lucide-react';

/**
 * AnnotatedImageOverlay Component
 * Renders an uploaded timetable image with interactive bounding box overlays
 * based on normalized [ymin, xmin, ymax, xmax] (0-1000 scale) spatial coordinates.
 * 
 * FIXED: Bounding boxes now correctly align to the actual rendered image pixel bounds
 * by measuring the img element's rendered dimensions via onLoad.
 */
export default function AnnotatedImageOverlay({ imageSrc, annotations = [], title = "Ingested Timetable Scan" }) {
  const [showOverlays, setShowOverlays] = useState(true);
  const [activeLabel, setActiveLabel] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState('ALL');
  const [zoomLevel, setZoomLevel] = useState(1);
  // Track the rendered image size so overlays align perfectly to the image
  const [imgRect, setImgRect] = useState(null);
  const imgRef = useRef(null);
  const containerRef = useRef(null);

  // Measure the rendered image offset + size within the container
  const handleImageLoad = useCallback(() => {
    if (imgRef.current && containerRef.current) {
      const imgEl = imgRef.current;
      const containerEl = containerRef.current;
      const containerBounds = containerEl.getBoundingClientRect();
      const imgBounds = imgEl.getBoundingClientRect();

      setImgRect({
        top: imgBounds.top - containerBounds.top,
        left: imgBounds.left - containerBounds.left,
        width: imgBounds.width,
        height: imgBounds.height,
      });
    }
  }, []);

  // Re-measure when zoom changes
  const handleZoomIn = () => {
    setZoomLevel(prev => {
      const next = Math.min(prev + 0.2, 2.0);
      // Defer measurement until after transform is applied
      setTimeout(handleImageLoad, 250);
      return next;
    });
  };
  const handleZoomOut = () => {
    setZoomLevel(prev => {
      const next = Math.max(prev - 0.2, 0.8);
      setTimeout(handleImageLoad, 250);
      return next;
    });
  };
  const handleZoomReset = () => {
    setZoomLevel(1);
    setTimeout(handleImageLoad, 250);
  };

  // Extract unique labels for category filter pills
  const availableLabels = ['ALL', ...Array.from(new Set(annotations.map(a => a.label)))];

  const filteredAnnotations = annotations.filter(ann => {
    if (selectedFilter === 'ALL') return true;
    return ann.label === selectedFilter;
  });

  return (
    <div style={{ 
      backgroundColor: '#0F172A', 
      borderRadius: '12px', 
      border: '1px solid rgba(255, 255, 255, 0.12)', 
      overflow: 'hidden', 
      display: 'flex', 
      flexDirection: 'column',
      color: '#FFFFFF'
    }}>
      {/* Control Header Bar */}
      <div style={{ 
        padding: '0.6rem 0.85rem', 
        backgroundColor: '#1E293B', 
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        fontSize: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
          <Layers size={14} color="#38BDF8" />
          <span style={{ color: '#F8FAFC' }}>{title || 'Spatial Document View'}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {/* Zoom controls */}
          <button 
            onClick={handleZoomIn}
            title="Zoom In"
            style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <ZoomIn size={14} />
          </button>
          <button 
            onClick={handleZoomReset}
            title="Reset Zoom"
            style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <Maximize2 size={13} />
          </button>
          <button 
            onClick={handleZoomOut}
            title="Zoom Out"
            style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <ZoomOut size={14} />
          </button>

          <span style={{ color: '#475569' }}>|</span>

          {/* Overlay Toggle Button */}
          <button 
            onClick={() => setShowOverlays(!showOverlays)}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.35rem', 
              padding: '0.25rem 0.55rem', 
              borderRadius: '6px', 
              backgroundColor: showOverlays ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.05)', 
              border: `1px solid ${showOverlays ? 'rgba(56, 189, 248, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`, 
              color: showOverlays ? '#38BDF8' : '#94A3B8', 
              fontSize: '0.7rem', 
              fontWeight: 600, 
              cursor: 'pointer' 
            }}
          >
            {showOverlays ? <Eye size={12} /> : <EyeOff size={12} />}
            <span>{showOverlays ? 'Overlays On' : 'Overlays Off'}</span>
          </button>
        </div>
      </div>

      {/* Category Filter Pills */}
      {availableLabels.length > 1 && (
        <div style={{ 
          padding: '0.4rem 0.75rem', 
          backgroundColor: '#0F172A', 
          borderBottom: '1px solid rgba(255,255,255,0.05)', 
          display: 'flex', 
          gap: '0.4rem', 
          overflowX: 'auto' 
        }}>
          {availableLabels.map(lbl => {
            const matchAnn = annotations.find(a => a.label === lbl);
            const pillColor = matchAnn?.color || '#38BDF8';
            const isSelected = selectedFilter === lbl;

            return (
              <button
                key={lbl}
                onClick={() => setSelectedFilter(lbl)}
                style={{
                  padding: '0.15rem 0.5rem',
                  borderRadius: '99px',
                  border: `1px solid ${isSelected ? pillColor : 'rgba(255,255,255,0.1)'}`,
                  backgroundColor: isSelected ? `${pillColor}22` : 'transparent',
                  color: isSelected ? pillColor : '#94A3B8',
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease'
                }}
              >
                {lbl === 'ALL' ? 'All Regions' : lbl}
              </button>
            );
          })}
        </div>
      )}

      {/* Main Visual Viewport */}
      <div
        ref={containerRef}
        style={{ 
          position: 'relative', 
          width: '100%', 
          maxHeight: '360px', 
          overflow: 'auto', 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'flex-start',
          padding: '0.5rem',
          backgroundColor: '#020617'
        }}
      >
        <div style={{ 
          position: 'relative', 
          display: 'inline-block', 
          transform: `scale(${zoomLevel})`, 
          transformOrigin: 'top center',
          transition: 'transform 0.2s ease-out',
          maxWidth: '100%'
        }}>
          {/* Base Ingested Image */}
          {imageSrc ? (
            <img 
              ref={imgRef}
              src={imageSrc} 
              alt="Timetable Document" 
              onLoad={handleImageLoad}
              style={{ 
                maxWidth: '100%', 
                height: 'auto', 
                display: 'block', 
                borderRadius: '6px',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }} 
            />
          ) : (
            <div style={{ padding: '3rem 2rem', color: '#64748B', fontSize: '0.8rem', textAlign: 'center' }}>
              No document image loaded
            </div>
          )}

          {/* Interactive Bounding Box Overlays — positioned relative to rendered image */}
          {showOverlays && imageSrc && imgRect && filteredAnnotations.map((ann, idx) => {
            const [ymin, xmin, ymax, xmax] = ann.box_2d || [0, 0, 0, 0];

            // Convert 0-1000 normalized coords to pixel positions relative to rendered image
            const topPx = (ymin / 1000) * imgRect.height;
            const leftPx = (xmin / 1000) * imgRect.width;
            const heightPx = ((ymax - ymin) / 1000) * imgRect.height;
            const widthPx = ((xmax - xmin) / 1000) * imgRect.width;

            const boxColor = ann.color || '#0284C7';
            const isActive = activeLabel === ann.label;

            return (
              <div
                key={ann.label + idx}
                onMouseEnter={() => setActiveLabel(ann.label)}
                onMouseLeave={() => setActiveLabel(null)}
                style={{
                  position: 'absolute',
                  top: `${topPx}px`,
                  left: `${leftPx}px`,
                  height: `${heightPx}px`,
                  width: `${widthPx}px`,
                  border: `2px solid ${boxColor}`,
                  backgroundColor: isActive ? `${boxColor}33` : `${boxColor}15`,
                  boxShadow: isActive ? `0 0 12px ${boxColor}` : 'none',
                  borderRadius: '4px',
                  pointerEvents: 'auto',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  zIndex: isActive ? 20 : 10
                }}
              >
                {/* Bounding Label Badge */}
                <div style={{
                  position: 'absolute',
                  top: '-18px',
                  left: '0px',
                  backgroundColor: boxColor,
                  color: '#FFFFFF',
                  fontSize: '0.62rem',
                  fontWeight: 700,
                  padding: '1px 5px',
                  borderRadius: '3px',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                  letterSpacing: '0.02em'
                }}>
                  {ann.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
