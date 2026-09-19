import React from 'react';
import { Plus, Trash2, Code } from 'lucide-react';

export default function UniversalMatrixTable({ gridData, setGridData, onDataChange, t }) {
  if (!gridData || gridData.length <= 1) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '350px', gap: '0.5rem', color: 'var(--slate-body)' }}>
        <Code size={22} color="#94A3B8" />
        <span style={{ fontWeight: 600 }}>{t ? t('awaitingInput') : 'Awaiting Input'}</span>
        <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>{t ? t('noScheduleLoaded') : 'No schedule loaded'}</span>
      </div>
    );
  }

  const headerRow = gridData[0] || [];
  const dataRows = gridData.slice(1) || [];

  // Update specific cell value
  const handleCellChange = (rowIndex, colIndex, newValue) => {
    const updatedGrid = gridData.map((row, rIdx) => {
      if (rIdx === rowIndex + 1) { // +1 to account for header row at index 0
        const updatedRow = [...row];
        updatedRow[colIndex] = newValue;
        return updatedRow;
      }
      return row;
    });

    if (setGridData) setGridData(updatedGrid);
    if (onDataChange) onDataChange(updatedGrid);
  };

  // Add a new row below current row
  const handleAddRow = (rowIndex) => {
    const emptyRow = new Array(headerRow.length).fill('');
    const updatedGrid = [...gridData];
    // Insert after the specified row (which is rowIndex + 1 in the overall grid)
    updatedGrid.splice(rowIndex + 2, 0, emptyRow);
    
    if (setGridData) setGridData(updatedGrid);
    if (onDataChange) onDataChange(updatedGrid);
  };

  // Delete a row
  const handleDeleteRow = (rowIndex) => {
    const updatedGrid = gridData.filter((_, idx) => idx !== rowIndex + 1);
    
    if (setGridData) setGridData(updatedGrid);
    if (onDataChange) onDataChange(updatedGrid);
  };

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
      <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--gray-pill-bg)', color: 'var(--slate-body)', zIndex: 10 }}>
        <tr>
          {headerRow.map((header, idx) => (
            <th key={idx} style={{ padding: '0.6rem 0.85rem', fontWeight: 600, borderRight: idx < headerRow.length - 1 ? '1px solid var(--card-border)' : 'none' }}>
              {String(header).trim()}
            </th>
          ))}
          <th style={{ padding: '0.6rem 0.85rem', fontWeight: 600, textAlign: 'center', width: '80px' }}>{t ? t('status') : 'Actions'}</th>
        </tr>
      </thead>
      <tbody>
        {dataRows.map((row, rIdx) => (
          <tr key={rIdx} style={{ borderBottom: '1px solid var(--gray-pill-bg)' }}>
            {headerRow.map((_, cIdx) => {
              const cellValue = row[cIdx] !== undefined ? String(row[cIdx]).trim() : '';
              const isTimeCol = String(headerRow[cIdx]).toLowerCase().includes('time');
              return (
                <td key={cIdx} style={{
                  padding: '0.3rem',
                  borderRight: cIdx < headerRow.length - 1 ? '1px solid var(--card-border)' : 'none'
                }}>
                  <input
                    type="text"
                    value={cellValue}
                    onChange={(e) => handleCellChange(rIdx, cIdx, e.target.value)}
                    style={{ 
                      border: '1px solid transparent',
                      background: 'transparent',
                      fontWeight: cIdx === 0 ? 600 : 400,
                      color: isTimeCol ? '#0C382B' : 'var(--charcoal-dark)',
                      width: '100%',
                      fontSize: '0.8rem',
                      fontFamily: isTimeCol ? 'var(--font-mono)' : 'inherit',
                      padding: '0.35rem 0.5rem',
                      borderRadius: '4px',
                      outline: 'none',
                      transition: 'border-color 0.2s',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => e.target.style.border = '1px solid #94A3B8'}
                    onBlur={(e) => e.target.style.border = '1px solid transparent'}
                  />
                </td>
              );
            })}
            <td style={{ padding: '0.3rem', textAlign: 'center' }}>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                <button 
                  onClick={() => handleAddRow(rIdx)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#16A34A', padding: '0.2rem' }}
                  title="Add Row"
                >
                  <Plus size={16} />
                </button>
                <button 
                  onClick={() => handleDeleteRow(rIdx)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#EF4444', padding: '0.2rem' }}
                  title="Delete Row"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
