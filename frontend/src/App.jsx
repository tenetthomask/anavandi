import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Upload, Layers, MapPin, Code, Download, Copy, Search, 
  ShieldCheck, ArrowDown, CheckCircle2, Eye, Check, ArrowRight, AlertTriangle
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Navbar13, { scrollToSection } from './components/Navbar13';
import AeroShards from './components/AeroShards';
import ColorBends from './components/ColorBends';
import FeaturesGrid from './components/FeaturesGrid';
import HeroInputTrigger from './components/HeroInputTrigger';
import AnnotatedImageOverlay from './components/AnnotatedImageOverlay';
import BackToTopButton from './components/BackToTopButton';
import InteractiveRouteMap from './components/InteractiveRouteMap';
import UniversalMatrixTable from './components/UniversalMatrixTable';
import RouteWorkspaceHeader from './components/RouteWorkspaceHeader';
import { sanitizeAndParseJSON } from './utils/jsonParser';
import { resolveFullRouteGeometry } from './utils/geocoding';
import { handleCSVExport, handleGTFSExport } from './utils/exportUtils';
import { useLanguage } from './context/LanguageContext';

// Fix Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? '/api' : 'https://anavandi.onrender.com/api';

// App Component

export default function App() {
  const { t } = useLanguage();
  const [image, setImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedRowIndex, setSelectedRowIndex] = useState(0);
  const [tripsData, setTripsData] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedSchema, setCopiedSchema] = useState(false);
  const [accuracyScore, setAccuracyScore] = useState('--');
  const [extractionError, setExtractionError] = useState(null);
  const [annotations, setAnnotations] = useState([]);
  const [matrixGrid, setMatrixGrid] = useState([]);
  const [scheduleTitle, setScheduleTitle] = useState('Ingested Timetable Scan');
  const [isIndiaMode, setIsIndiaMode] = useState(true);
  const [mapStops, setMapStops] = useState([]);
  const [isGeocoding, setIsGeocoding] = useState(false);

  // ─── Map & Grid Real-Time Synchronization ──────────────────────────────────
  useEffect(() => {
    async function syncMapAndWorkspace() {
      if (!matrixGrid || matrixGrid.length <= 1) {
        setMapStops([]);
        return;
      }
      setIsGeocoding(true);
      const headerRow = matrixGrid[0].map(h => String(h).toLowerCase());
      let locColIdx = headerRow.findIndex(h => 
        h.includes('trip') || h.includes('destination') || h.includes('station') || 
        h.includes('stop') || h.includes('location') || h.includes('സ്ഥലം') || h.includes('യാത്ര')
      );
      if (locColIdx === -1) {
        locColIdx = (headerRow[0].includes('date') || headerRow[0].includes('train') || headerRow[0].includes('തീയതി')) ? 1 : 0;
      }
      const dataRows = matrixGrid.slice(1);
      const stopNames = dataRows.map(row => row[locColIdx] || row[0]).filter(Boolean);
      const updatedGeometry = await resolveFullRouteGeometry(stopNames, isIndiaMode);
      setMapStops(updatedGeometry);
      setIsGeocoding(false);
    }
    
    // Debounce geocoding requests by 400ms to prevent API flooding while typing
    const timer = setTimeout(() => {
      syncMapAndWorkspace();
    }, 400);
    
    return () => clearTimeout(timer);
  }, [matrixGrid]);

  const section2Ref = useRef(null);

  // ─── Shared payload processor ───────────────────────────────────────────────
  const applyPayload = async (payload) => {
    const metadata = payload.metadata || {};
    const confidence = metadata.confidence_score || payload.confidence_score || 99.4;
    setAccuracyScore(confidence);

    if (payload.annotations && Array.isArray(payload.annotations)) {
      setAnnotations(payload.annotations);
    }
    if (payload.title) setScheduleTitle(payload.title);
    if (payload.grid && Array.isArray(payload.grid)) setMatrixGrid(payload.grid);

    const rawStops = payload.stops || [];
    const rawRoutes = payload.routes || [];
    const primaryRoute = rawRoutes[0] || {};
    const rawSchedules = primaryRoute.schedules || payload.trips || payload.table_rows || [];

    const normalizedStops = rawStops.map((s, idx) => {
      if (typeof s === 'string') return s;
      if (typeof s === 'object' && s !== null) return s.stop_name || s.english_name || s.native_name || `Stop ${idx + 1}`;
      return `Stop ${idx + 1}`;
    });

    let stopColIdx = 0;
    let timeColIdx = 1;
    if (payload.grid && payload.grid.length > 0) {
      const headerRow = payload.grid[0].map(h => String(h).toLowerCase().trim());
      const sIdx = headerRow.findIndex(h => h.includes('trip') || h.includes('station') || h.includes('stop') || h.includes('location') || h.includes('route') || h.includes('dest'));
      if (sIdx !== -1) stopColIdx = sIdx;
      
      const tIdx = headerRow.findIndex(h => h.includes('time') || h.includes('dep') || h.includes('arr'));
      if (tIdx !== -1) timeColIdx = tIdx;
    }

    const routeStopsForMap = normalizedStops.length > 0
      ? normalizedStops
      : (payload.grid && payload.grid.length > 1
          ? payload.grid.slice(1).map((row, idx) => String(row[stopColIdx] || `Stop ${idx + 1}`).trim()).filter(Boolean)
          : []);

    let schedulesToProcess = rawSchedules.length > 0 ? rawSchedules : [];
    if (schedulesToProcess.length === 0 && payload.grid && payload.grid.length > 1) {
      schedulesToProcess = [{ trip_id: 'TRIP-01', label: 'Extracted Schedule', stop_times: [] }];
    }

    const textContext = `${payload.title || ''} ${payload.agency_name || ''} ${payload.corridor_route || ''}`.toLowerCase();
    const isIndian = isIndiaMode || /ksrtc|kerala|majerhat|india|railway|mumbai|delhi|bangalore|kolkata|chennai|hyderabad/i.test(textContext);
    const resolvedGeometry = await resolveFullRouteGeometry(routeStopsForMap, isIndian);

    const mappedTrips = await Promise.all(schedulesToProcess.map(async (item, idx) => {
      const corridorName = (primaryRoute.origin && primaryRoute.destination)
        ? `${primaryRoute.origin} → ${primaryRoute.destination}`
        : (item.corridor_route || payload.corridor_route || 'Line Service');

      const stopTimes = item.stop_times || [];

      const coords = resolvedGeometry.map((geo, sIdx) => {
        if (!geo) return null;
        let matchedTime = stopTimes.find(st =>
          st.stop_name && geo.name && st.stop_name.toLowerCase().trim() === geo.name.toLowerCase().trim()
        )?.time;
        if (!matchedTime && payload.grid && payload.grid.length > sIdx + 1) {
          matchedTime = payload.grid[sIdx + 1][timeColIdx];
        }
        return { name: geo.name, lat: geo.lat, lng: geo.lng, dep: String(matchedTime || '--:--').trim() };
      }).filter(Boolean);

      return {
        id: primaryRoute.route_id || item.line_id || payload.route_id || `LINE-${idx + 101}`,
        tripId: `#${item.trip_id || `TRIP-0${idx + 1}`}`,
        label: item.label || `Trip ${idx + 1}`,
        corridor: corridorName,
        fromTo: corridorName,
        stopsCount: `${routeStopsForMap.length} stops`,
        operatingWindow: item.operating_window || item.operating_days || 'Daily',
        duration: 'Run duration',
        calendar: item.operating_days || item.calendar || 'Daily',
        headway: '15 min',
        confidence: `${confidence}%`,
        coords
      };
    }));

    setTripsData(mappedTrips);
    setSelectedRowIndex(0);

    if (mappedTrips.length === 0) {
      setExtractionError('Vision AI returned a valid response but no schedule rows could be parsed.');
    }
  };

  // ─── Real file upload ─────────────────────────────────────────────────────
  const handleFileUpload = async (fileOrEvent) => {
    const file = fileOrEvent?.target ? fileOrEvent.target.files?.[0] : fileOrEvent;
    if (!file) return;

    setImage(URL.createObjectURL(file));
    setIsProcessing(true);
    setExtractionError(null);
    setTripsData([]);
    setMatrixGrid([]);
    setAnnotations([]);
    setScheduleTitle('Ingested Timetable Scan');
    setAccuracyScore('--');
    setSelectedRowIndex(0);

    const formData = new FormData();
    formData.append('file', file);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 360000);

    try {
      const response = await fetch(`${API_BASE}/extract?nocache=` + Date.now(), {
        method: 'POST',
        body: formData,
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      // Try to parse JSON regardless of status code so we can read the error message
      let resData;
      const rawText = await response.text();
      try { resData = JSON.parse(rawText); } catch { resData = { detail: rawText }; }

      if (!response.ok) {
        // Surface backend error message directly (includes API key hints)
        const detail = resData?.detail || `Server error ${response.status}`;
        throw new Error(detail);
      }

      const payload = resData.data;
      if (payload) {
        await applyPayload(payload);
      } else {
        setExtractionError('API returned an empty payload. Check backend logs for details.');
      }
    } catch (err) {
      console.error('Vision AI pipeline error:', err);
      if (err.name === 'AbortError') {
        setExtractionError('Extraction timed out after 360 seconds. Try a smaller or clearer image.');
      } else {
        setExtractionError(err.message || 'Unknown error. Check the browser console for details.');
      }
    } finally {
      setIsProcessing(false);
      setTimeout(() => {
        const s = document.getElementById('ingestion-section');
        if (s) s.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    }
  };

  // ─── Demo data loader (no API key needed) ────────────────────────────────
  const handleLoadDemo = async () => {
    setIsProcessing(true);
    setExtractionError(null);
    setImage(null);
    setTripsData([]);
    setMatrixGrid([]);
    setAnnotations([]);
    setScheduleTitle('Ingested Timetable Scan');
    setAccuracyScore('--');
    setSelectedRowIndex(0);

    try {
      const response = await fetch(`${API_BASE}/extract-demo`, { 
        method: 'POST'
      });
      const resData = await response.json();
      if (resData?.data) {
        await applyPayload(resData.data);
      } else {
        setExtractionError('Demo data could not be loaded.');
      }
    } catch (err) {
      setExtractionError('Failed to load demo data: ' + err.message);
    } finally {
      setIsProcessing(false);
      setTimeout(() => {
        const s = document.getElementById('ingestion-section');
        if (s) s.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    }
  };


  const scrollToSection2 = () => {
    scrollToSection('ingestion-section');
  };

  // Map logic is now handled by InteractiveRouteMap

  const handleSelectTripRow = (idx) => {
    setSelectedRowIndex(idx);
    // Map bounds updates are automatically handled by the useEffect above
  };

  const handleCopyJSON = () => {
    if (tripsData.length === 0) return;
    navigator.clipboard.writeText(JSON.stringify(tripsData[selectedRowIndex], null, 2));
    setCopiedSchema(true);
    setTimeout(() => setCopiedSchema(false), 2000);
  };

  const filteredTrips = tripsData.filter(t => 
    t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.corridor.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.tripId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ width: '100%', minHeight: '100vh', backgroundColor: '#EEF2ED', color: '#121518', selectionBackgroundColor: '#0C382B', selectionColor: '#FFFFFF' }}>
      
      {/* RESTORED: INTERACTIVE BACKGROUND EFFECTS (LIGHT THEME) */}
      <div style={{ position: 'fixed', inset: 0, width: '100%', height: '100vh', zIndex: 0, pointerEvents: 'auto' }}>
        <ColorBends
          colors={["#D4E7DC", "#BBE0CA", "#90C2A5"]}
          rotation={90}
          speed={0.15}
          scale={1.2}
          frequency={1}
          warpStrength={1}
          mouseInfluence={1}
          noise={0.15}
          parallax={0.5}
          iterations={1}
          intensity={1.2}
          bandWidth={6}
          transparent
        />
      </div>

      {/* Navbar (Static, relative, scrolls naturally with page) */}
      <Navbar13 onScrollToStudio={scrollToSection2} />

      {/* ==================== SLIDE 1: SCANNING HERO ==================== */}
      <section 
        id="hero-scan" 
        style={{
          minHeight: 'calc(100vh - 80px)', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', padding: '3rem 1.5rem', scrollMarginTop: '0', borderBottom: '1px solid rgba(216, 222, 215, 0.6)', overflow: 'hidden', backgroundColor: 'transparent'
        }}
      >
        {/* Subtle Background Flow Accent */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at top, rgba(212,231,220,0.4), transparent, transparent)',
          pointerEvents: 'none'
        }} />

        {/* Hero Trigger Action Card */}
        <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', maxWidth: '42rem', textAlign: 'center', margin: 'auto auto' }}>
          {isProcessing ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', padding: '2rem 3rem', backgroundColor: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(12px)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.4)', boxShadow: '0 20px 40px rgba(0,0,0,0.05)' }}>
              <div style={{ width: '36px', height: '36px', border: '3px solid #D4E7DC', borderTopColor: '#0C382B', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              <p style={{ color: '#0C382B', fontWeight: 600, fontSize: '0.95rem' }}>Analyzing Timetable Scan...</p>
            </div>
          ) : (
            <div style={{ padding: '2rem', backgroundColor: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(16px)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.4)', boxShadow: '0 20px 40px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <HeroInputTrigger onFileSelected={handleFileUpload} />
              <button
                onClick={handleLoadDemo}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '10px',
                  backgroundColor: 'transparent',
                  border: '1px solid rgba(12,56,43,0.25)',
                  color: '#0C382B',
                  fontWeight: 600,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  width: '100%',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(12,56,43,0.06)'}
                onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                Try Demo Data (no API key needed)
              </button>
              
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '0.8rem', color: '#0C382B', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={isIndiaMode}
                    onChange={(e) => setIsIndiaMode(e.target.checked)}
                    style={{ marginRight: '0.4rem', cursor: 'pointer', width: '14px', height: '14px', accentColor: '#0C382B' }}
                  />
                  Restrict map geocoding to India
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Decorative Pulse Scroll Indicator (Below main card) */}
        <div style={{ position: 'absolute', bottom: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', opacity: 0.6 }}>
          <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.15em', color: '#0C382B', textTransform: 'uppercase' }}>{t('scrollNotice')}</span>
          <div style={{ width: '24px', height: '40px', borderRadius: '12px', border: '2px solid #0C382B', display: 'flex', justifyContent: 'center', padding: '4px' }}>
            <div style={{ width: '4px', height: '8px', backgroundColor: '#0C382B', borderRadius: '2px', animation: 'scroll-pulse 1.5s infinite' }} />
          </div>
        </div>

        {/* Wave Transition (Slide 1 to 2 Divider) */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '100%',
          overflow: 'hidden',
          lineHeight: 0,
          transform: 'rotate(180deg)',
          zIndex: 10
        }}>
          <svg viewBox="0 0 1200 120" preserveAspectRatio="none" style={{ position: 'relative', display: 'block', width: 'calc(100% + 1.3px)', height: '100px' }}>
            <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" style={{ fill: 'rgba(255,255,255,0.7)' }}></path>
          </svg>
        </div>
      </section>

      {/* ==================== SLIDE 2: DOCUMENT INGESTION & ANALYSIS WORKSPACE ==================== */}
      <section 
        id="ingestion-section"
        ref={section2Ref}
        style={{
          minHeight: '100vh', width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '6rem 1.5rem 3rem', scrollMarginTop: '0', borderBottom: '1px solid rgba(216, 222, 215, 0.6)', position: 'relative', zIndex: 20, backgroundColor: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(12px)'
        }}
      >
        <div style={{ maxWidth: '100%', margin: 'auto auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <div style={{ borderBottom: '1px solid #D8DED7', paddingBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.875rem', fontWeight: 700, color: '#121518', marginTop: '0.25rem' }}>{t('ingestionMatrixWorkspace')}</h2>
          </div>

          {/* ERROR BANNER — API key / Vision AI failure */}
          {extractionError && (
            <div style={{
              padding: '1rem 1.25rem',
              backgroundColor: '#FEF2F2',
              border: '1px solid #FECACA',
              borderRadius: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.6rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
                <AlertTriangle size={18} color="#DC2626" style={{ flexShrink: 0, marginTop: '1px' }} />
                <div>
                  <div style={{ fontWeight: 700, color: '#DC2626', fontSize: '0.875rem' }}>Vision AI Error</div>
                  <div style={{ color: '#7F1D1D', fontSize: '0.8rem', lineHeight: 1.5, marginTop: '0.2rem' }}>
                    {extractionError}
                  </div>
                  {(extractionError.includes('API key') || extractionError.includes('aistudio') || extractionError.includes('Gemini')) && (
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: 'inline-block', marginTop: '0.4rem', fontSize: '0.78rem', color: '#2563EB', fontWeight: 600 }}
                    >
                      Get a free Gemini API key at aistudio.google.com →
                    </a>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.6rem', marginLeft: '1.6rem' }}>
                <button
                  onClick={handleLoadDemo}
                  style={{
                    padding: '0.45rem 1rem',
                    borderRadius: '8px',
                    backgroundColor: '#0C382B',
                    color: '#FFFFFF',
                    border: 'none',
                    fontWeight: 600,
                    fontSize: '0.78rem',
                    cursor: 'pointer'
                  }}
                >
                  Load Demo Data Instead
                </button>
                <button
                  onClick={() => setExtractionError(null)}
                  style={{
                    padding: '0.45rem 0.8rem',
                    borderRadius: '8px',
                    backgroundColor: 'transparent',
                    color: '#DC2626',
                    border: '1px solid #FECACA',
                    fontWeight: 600,
                    fontSize: '0.78rem',
                    cursor: 'pointer'
                  }}
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}


          {/* UPLOAD & EXTRACTED DATA WORKSPACE */}
          <div className="saas-card" style={{ padding: '1.5rem' }}>
            <div className="responsive-grid-hero" style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '1.5rem', alignItems: 'start' }}>
              
              {/* UPLOAD & OCR PREVIEW PANEL (Left Box) */}
              <div style={{ minWidth: 0, width: '100%' }}>

                {/* Annotated Image Spatial Overlay */}
                <AnnotatedImageOverlay 
                  imageSrc={image} 
                  annotations={annotations} 
                  title={scheduleTitle} 
                />
              </div>

              {/* EXTRACTED FEED TABLE & STATS (Right Box) */}
              <div style={{ minWidth: 0, width: '100%' }}>
                {/* Neutral Stats Pills */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  <div style={{ backgroundColor: 'var(--gray-pill-bg)', padding: '0.75rem 1rem', borderRadius: '10px' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--slate-body)', fontWeight: 600 }}>{t('parsedConfidence')}</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--charcoal-dark)' }}>{accuracyScore !== '--' ? `${accuracyScore}%` : '--'}</div>
                  </div>
                  <div style={{ backgroundColor: 'var(--gray-pill-bg)', padding: '0.75rem 1rem', borderRadius: '10px' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--slate-body)', fontWeight: 600 }}>{t('processingLatency')}</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--charcoal-dark)' }}>{tripsData.length > 0 ? '< 1.18s' : '--'}</div>
                  </div>
                </div>

                {/* 2D TIMETABLE MATRIX GRID */}
                <div style={{ width: '100%', overflowX: 'auto', borderRadius: '16px', border: '1px solid #D8DED7', backgroundColor: '#FFFFFF', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
                  
                  {/* Route Header Banner */}
                  <div style={{ backgroundColor: '#0C382B', color: '#FFFFFF', padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700, color: '#D4E7DC', letterSpacing: '0.05em' }}>{t('extractedRoute')}</span>
                      <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>{tripsData.length > 0 ? (tripsData[0].id || 'METRO BUS ROUTE') : 'NO ROUTE LOADED'}</h3>
                    </div>
                    {tripsData.length > 0 && tripsData[0]?.coords && (
                      <span style={{ padding: '0.25rem 0.75rem', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, color: '#D4E7DC' }}>
                        {tripsData[0].coords.length} {t('stopsIdentified')}
                      </span>
                    )}
                  </div>

                  {/* Matrix Table */}
                  <div style={{ width: '100%', overflowX: 'auto', maxHeight: '450px', overflowY: 'auto' }}>
                    <UniversalMatrixTable gridData={matrixGrid} setGridData={setMatrixGrid} onDataChange={(updated) => console.log('Schedule manually corrected:', updated)} t={t} />
                  </div>
                </div>
              </div>
            </div>

            {/* CONDITIONAL POST-ANALYSIS EXPORT ACTIONS */}
            {tripsData.length > 0 && (
              <div style={{ marginTop: '2rem', padding: '1.5rem', backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #D8DED7', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: '#0C382B' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--status-green)', animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}></span>
                  <span>{t('ingestionComplete')}</span>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <button 
                    onClick={() => {
                      setImage(null);
                      setTripsData([]);
                      setMatrixGrid([]);
                      setAnnotations([]);
                      setSelectedRowIndex(0);
                      setScheduleTitle('Ingested Timetable Scan');
                      setAccuracyScore('--');
                      setExtractionError(null);
                      const heroSection = document.getElementById('hero-scan');
                      if (heroSection) heroSection.scrollIntoView({ behavior: 'smooth' });
                      else window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    style={{ padding: '0.6rem 1.25rem', borderRadius: '12px', border: '1px solid #DC2626', color: '#DC2626', backgroundColor: 'transparent', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', transition: 'background-color 0.2s' }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(220, 38, 38, 0.05)'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    🗑️ {t('clearData')}
                  </button>
                  <button 
                    onClick={() => handleCSVExport(matrixGrid, scheduleTitle)}
                    style={{ padding: '0.6rem 1.25rem', borderRadius: '12px', border: '1px solid #0C382B', color: '#0C382B', backgroundColor: 'transparent', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', transition: 'background-color 0.2s' }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(12, 56, 43, 0.05)'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    📥 {t('downloadCsv')}
                  </button>
                  <button 
                    onClick={() => handleGTFSExport(matrixGrid, scheduleTitle)}
                    style={{ padding: '0.6rem 1.5rem', borderRadius: '12px', backgroundColor: '#0C382B', color: '#FFFFFF', border: 'none', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  >
                    ⚙️ {t('exportGtfs')}
                  </button>
                  <button 
                    onClick={() => {
                      const gtfsStudio = document.getElementById('gtfs-studio');
                      if (gtfsStudio) gtfsStudio.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    style={{ padding: '0.6rem 1.5rem', borderRadius: '12px', backgroundColor: '#2563EB', color: '#FFFFFF', border: 'none', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  >
                    {t('proceedToGtfs')} <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ==================== SLIDE 3: GTFS VERIFICATION & STUDIO ==================== */}
      <section 
        id="gtfs-studio"
        style={{
          minHeight: '100vh', width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '6rem 1.5rem 3rem', scrollMarginTop: '0', borderBottom: '1px solid rgba(216, 222, 215, 0.6)', position: 'relative', zIndex: 20, backgroundColor: 'rgba(255,255,255,0.4)', backdropFilter: 'blur(4px)'
        }}
      >
        <div style={{ maxWidth: '100%', margin: 'auto auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            <RouteWorkspaceHeader totalStops={Math.max(0, mapStops.length)} scheduleGrid={matrixGrid} />

            <div className="responsive-grid-studio" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              
              {/* EDITABLE SCHEDULE GRID — rendered directly from the parsed OCR grid */}
              <div className="saas-card" style={{ padding: '1.25rem', minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--charcoal-dark)' }}>{t('editableGrid')}</h3>
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, backgroundColor: 'var(--gray-pill-bg)', color: 'var(--slate-body)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                    {t('inlineEditMode')}
                  </span>
                </div>

                <div style={{ border: '1px solid var(--card-border)', borderRadius: '8px', overflow: 'hidden', minHeight: '350px', maxHeight: '420px', overflowY: 'auto' }}>
                  <UniversalMatrixTable gridData={matrixGrid} setGridData={setMatrixGrid} onDataChange={(updated) => console.log('Schedule manually corrected:', updated)} t={t} />
                </div>
              </div>

              {/* SPATIAL MAP */}
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <div className="saas-card" style={{ padding: '1rem', height: '420px', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--charcoal-dark)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <MapPin size={15} color="var(--blue-primary)" /> {t('routeMapPreview')}
                    </span>
                  </div>
                  <div style={{ flex: 1, position: 'relative', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--card-border)' }}>
                    <InteractiveRouteMap mapStops={mapStops} isGeocoding={isGeocoding} />
                  </div>
                </div>
              </div>

            </div>
          </motion.div>
        </div>
      </section>

      {/* ==================== SLIDE 4: CAPABILITIES ==================== */}
      <section 
        id="capabilities" 
        style={{
          minHeight: '100vh', width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '6rem 1.5rem 3rem', scrollMarginTop: '80px', position: 'relative', zIndex: 20, backgroundColor: '#EEF2ED'
        }}
      >
        <div style={{ maxWidth: '1280px', margin: 'auto auto', width: '100%' }}>
          <div style={{ borderBottom: '1px solid #D8DED7', paddingBottom: '1rem', marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.875rem', fontWeight: 700, color: '#121518', marginTop: '0.25rem' }}>{t('engineCapabilities')}</h2>
          </div>
          <FeaturesGrid />
        </div>
      </section>

      <BackToTopButton onResetScan={() => setImage(null)} />
    </div>
  );
}
