import React, { useState, useEffect } from 'react';
import { Database, Download, Search, Filter } from 'lucide-react';
import { fetchRawData } from '../services/api';

export default function RawDataViewer() {
  const [dataset, setDataset] = useState('actuals');
  const [searchDate, setSearchDate] = useState('2026-01-05');
  const [records, setRecords] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchRawData({
          dataset,
          searchDate: searchDate || undefined,
          limit: 100
        });
        setRecords(res.records || []);
        setTotalCount(res.totalRecords || 0);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [dataset, searchDate]);

  const handleExport = () => {
    fetchRawData({ dataset, searchDate, exportCsv: true });
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Control Bar */}
      <div className="glass-card" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Database size={22} color="#38bdf8" />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                Elexon BMRS Stream Audit Trail & Raw Records
              </h2>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Inspect and export unmodified records from Elexon BMRS stream endpoints: <strong>FUELHH (fuelType=WIND)</strong> and <strong>WINDFOR</strong>.
            </p>
          </div>

          <button
            className="btn btn-secondary"
            onClick={handleExport}
            style={{ fontSize: '0.85rem' }}
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>
        </div>

        {/* Filter Inputs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '18px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', background: 'rgba(13, 19, 34, 0.9)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-medium)' }}>
            <button
              onClick={() => setDataset('actuals')}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                background: dataset === 'actuals' ? 'rgba(16, 185, 129, 0.25)' : 'transparent',
                color: dataset === 'actuals' ? '#34d399' : 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              Actuals (FUELHH WIND)
            </button>
            <button
              onClick={() => setDataset('forecasts')}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                background: dataset === 'forecasts' ? 'rgba(6, 182, 212, 0.25)' : 'transparent',
                color: dataset === 'forecasts' ? '#38bdf8' : 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              Forecasts (WINDFOR)
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Search size={14} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Filter by date (YYYY-MM-DD)..."
              value={searchDate}
              onChange={(e) => setSearchDate(e.target.value)}
              style={{ width: '220px' }}
            />
          </div>

          <span className="mono" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Showing {records.length} of {totalCount} records
          </span>
        </div>
      </div>

      {loading && (
        <div className="glass-card" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <div className="pulse-dot" style={{ margin: '0 auto 16px auto', width: '16px', height: '16px' }} />
          <p>Querying Elexon records...</p>
        </div>
      )}

      {error && (
        <div className="glass-card" style={{ padding: '30px', borderColor: 'var(--rose-primary)', color: '#fb7185' }}>
          <p>{error}</p>
        </div>
      )}

      {!loading && (
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ overflowX: 'auto', maxHeight: '500px' }}>
            <table className="data-table">
              <thead>
                <tr>
                  {records.length > 0 && Object.keys(records[0]).map(key => (
                    <th key={key} style={{ textTransform: 'uppercase' }}>{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.map((r, i) => (
                  <tr key={i}>
                    {Object.entries(r).map(([k, v], j) => (
                      <td key={j} className="mono" style={{
                        color: k === 'generation' ? '#38bdf8' : 'inherit',
                        fontWeight: k === 'generation' ? 600 : 'normal'
                      }}>
                        {v !== null && v !== undefined ? String(v) : '-'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
