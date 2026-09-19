import React from 'react';
import { Download } from 'lucide-react';

export default function RouteWorkspaceHeader({ totalStops, scheduleGrid }) {
  // Export updated data to clean CSV
  const handleExportCSV = () => {
    if (!scheduleGrid || scheduleGrid.length === 0) return;
    const csvContent = "data:text/csv;charset=utf-8," + scheduleGrid.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "corrected_schedule.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ 
      width: '100%', 
      backgroundColor: '#FFFFFF', 
      border: '1px solid #D8DED7', 
      borderRadius: '16px', 
      padding: '1.25rem 1.5rem', 
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', 
      display: 'flex', 
      flexDirection: 'row', 
      alignItems: 'center', 
      justifyContent: 'space-between', 
      gap: '1rem',
      flexWrap: 'wrap',
      marginBottom: '1.5rem'
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#121518', margin: 0 }}>Route Workspace & Studio</h2>
          <span style={{ 
            padding: '0.25rem 0.75rem', 
            backgroundColor: '#EEF2ED', 
            border: '1px solid #D8DED7', 
            borderRadius: '9999px', 
            fontSize: '0.75rem', 
            fontWeight: 800, 
            color: '#0C382B' 
          }}>
            {totalStops} Stops Identified
          </span>
        </div>
        <p style={{ fontSize: '0.75rem', color: '#5E666E', margin: 0 }}>
          Edits made in the schedule table automatically re-plot route pins and update GTFS export files.
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <button
          onClick={handleExportCSV}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '12px',
            border: '1px solid #D8DED7',
            backgroundColor: '#FFFFFF',
            color: '#121518',
            fontSize: '0.75rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            transition: 'background-color 0.2s'
          }}
          onMouseOver={e => e.currentTarget.style.backgroundColor = '#F8FAFC'}
          onMouseOut={e => e.currentTarget.style.backgroundColor = '#FFFFFF'}
        >
          <Download size={14} />
          <span>Download Clean CSV</span>
        </button>
      </div>
    </div>
  );
}
