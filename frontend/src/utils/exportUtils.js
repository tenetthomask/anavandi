// Utility 1: Export Timetable Matrix to Clean CSV
export const handleCSVExport = (matrixGrid, scheduleTitle) => {
  if (!matrixGrid || matrixGrid.length === 0) return;

  // Convert 2D grid array into standard CSV format
  const csvContent = matrixGrid
    .map(row => row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${(scheduleTitle || 'timetable').toLowerCase().replace(/\s+/g, '_')}_clean.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Utility 2: Export GTFS Feed Bundle (.zip / GTFS Text Files)
export const handleGTFSExport = (matrixGrid, scheduleTitle) => {
  if (!matrixGrid || matrixGrid.length === 0) return;

  const [headerRow, ...dataRows] = matrixGrid;

  // 1. Generate stops.txt content
  let stopsTxt = "stop_id,stop_name,stop_lat,stop_lon\n";
  dataRows.forEach((row, idx) => {
    const stopName = row[0] || `Stop ${idx + 1}`;
    stopsTxt += `STOP_${idx + 1},"${stopName}",10.${1000 + idx},76.${2000 + idx}\n`;
  });

  // 2. Generate routes.txt content
  const routeName = scheduleTitle || "Cypher Service";
  const routesTxt = `route_id,agency_id,route_short_name,route_long_name,route_type\nROUTE_01,AGENCY_01,R1,"${routeName}",3\n`;

  // 3. Generate agency.txt content
  const agencyTxt = `agency_id,agency_name,agency_url,agency_timezone\nAGENCY_01,"Cypher Transit","https://cypher.ai","Asia/Kolkata"\n`;

  // Combine GTFS files into downloadable package
  const gtfsPackageText = `=== AGENCY.TXT ===\n${agencyTxt}\n\n=== ROUTES.TXT ===\n${routesTxt}\n\n=== STOPS.TXT ===\n${stopsTxt}`;

  const blob = new Blob([gtfsPackageText], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `gtfs_feed_${Date.now()}.txt`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
