import React, { useState, useMemo } from 'react';

const DataViewer = ({ data, loading, error }) => {
  const [filter, setFilter] = useState('');

  const filteredData = useMemo(() => {
    if (!data) return null;
    if (!filter) return data;
    
    const lowerFilter = filter.toLowerCase();
    return data.filter(row => {
      return Object.values(row).some(val => 
        String(val).toLowerCase().includes(lowerFilter)
      );
    });
  }, [data, filter]);

  const downloadCSV = () => {
    if (!data || data.length === 0) return;
    
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => 
      Object.values(row).map(val => `"${val}"`).join(',')
    ).join('\n');
    
    const csvContent = `${headers}\n${rows}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'timetable.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadJSON = () => {
    if (!data) return;
    
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'timetable.json');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="empty-state">
        <div className="loading-spinner"></div>
        <p>Extracting timetable data...</p>
        <p style={{ fontSize: '0.8rem', opacity: 0.6, marginTop: '0.5rem' }}>This might take a few moments</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="empty-state" style={{ color: '#ff6b6b' }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '1rem' }}>
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <p>Error extracting data:</p>
        <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '1rem', opacity: 0.3 }}>
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="3" y1="9" x2="21" y2="9"></line>
          <line x1="9" y1="21" x2="9" y2="9"></line>
        </svg>
        <p>Upload an image to see extracted data here</p>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="controls">
        <input 
          type="text" 
          placeholder="Filter by route, stop, time..." 
          className="filter-input"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <div className="export-btns">
          <button className="btn" onClick={downloadCSV}>CSV</button>
          <button className="btn" onClick={downloadJSON}>JSON</button>
        </div>
      </div>
      
      <div className="data-table-wrapper" style={{ flex: 1 }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Route ID</th>
              <th>Stop Name</th>
              <th>Departure Time</th>
              <th>Days Active</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length > 0 ? (
              filteredData.map((row, i) => (
                <tr key={i}>
                  <td>{row.route_id}</td>
                  <td>{row.stop_name}</td>
                  <td>{row.departure_time}</td>
                  <td>{row.days_active}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                  No matching data found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataViewer;
