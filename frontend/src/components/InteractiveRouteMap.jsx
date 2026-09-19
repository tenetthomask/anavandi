import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { resolveFullRouteGeometry, createNumberedStopIcon } from '../utils/geocoding';

// Auto-Fit Map Viewport around plotted points
function AutoFitBounds({ markers }) {
  const map = useMap();

  useEffect(() => {
    if (markers && markers.length > 0) {
      const validCoords = markers.map(m => [m.lat, m.lng]);
      const bounds = L.latLngBounds(validCoords);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
    }
  }, [markers, map]);

  return null;
}

export default function InteractiveRouteMap({ mapStops = [], isGeocoding = false }) {
  if (mapStops.length === 0) {
    return (
      <div style={{ width: '100%', height: '500px', borderRadius: '1.5rem', border: '1px solid #D8DED7', backgroundColor: '#F4F6F4', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#5E666E' }}>
        <span style={{ fontSize: '2.25rem', marginBottom: '0.75rem' }}>🗺️</span>
        <h4 style={{ fontWeight: 700, fontSize: '1rem', color: '#121518', margin: 0 }}>Awaiting Route & Map Data</h4>
        <p style={{ fontSize: '0.75rem', color: '#5E666E', maxWidth: '20rem', textAlign: 'center', marginTop: '0.25rem' }}>
          Scan or upload a schedule to resolve locations and plot route points here.
        </p>
      </div>
    );
  }

  const polylinePositions = mapStops.map(s => [s.lat, s.lng]);
  const defaultCenter = [mapStops[0].lat, mapStops[0].lng];

  return (
    <div style={{ width: '100%', height: '520px', borderRadius: '1.5rem', border: '1px solid #D8DED7', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', position: 'relative', backgroundColor: '#FAFBF9' }}>
      {/* Geocoding Progress Badge */}
      {isGeocoding && (
        <div style={{ position: 'absolute', top: '1rem', right: '1rem', zIndex: 1000, padding: '0.5rem 1rem', backgroundColor: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, color: '#0C382B', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', border: '1px solid #D8DED7', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: '14px', height: '14px', border: '2px solid #0C382B', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <span>Plotting Locations on Map...</span>
        </div>
      )}

      <MapContainer center={defaultCenter} style={{ width: '100%', height: '100%' }} scrollWheelZoom={false} zoom={10}>
        {/* OpenStreetMap Tile Layer */}
        <TileLayer 
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <AutoFitBounds markers={mapStops}/>

        {/* Outer Glow Route Polyline */}
        <Polyline color="#D4E7DC" opacity={0.8} positions={polylinePositions} weight={8}/>

        {/* Inner Dark Route Polyline */}
        <Polyline color="#0C382B" dashArray="6, 6" opacity={0.95} positions={polylinePositions} weight={4}/>

        {/* Plotted Numbered Markers */}
        {mapStops.map((stop, idx) => {
          const stopNumber = idx + 1;
          const isTerminal = idx === 0 || idx === mapStops.length - 1;

          return (
            <Marker icon={createNumberedStopIcon(stopNumber, isTerminal)} key={idx} position={[stop.lat, stop.lng]}>
              <Popup>
                <div style={{ padding: '0.25rem', fontFamily: 'sans-serif' }}>
                  <span style={{ padding: '0.125rem 0.5rem', borderRadius: '9999px', backgroundColor: '#0C382B', color: 'white', fontWeight: 700, fontSize: '10px' }}>
                    Stop #{stopNumber}
                  </span>
                  <h5 style={{ fontWeight: 700, color: '#121518', fontSize: '0.875rem', marginTop: '0.25rem', marginBottom: 0 }}>{stop.name}</h5>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
