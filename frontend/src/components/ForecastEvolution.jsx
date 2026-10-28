import React, { useState, useEffect } from 'react';
import { Clock, TrendingUp, Layers, HelpCircle } from 'lucide-react';
import { fetchForecastEvolution } from '../services/api';

export default function ForecastEvolution({ availableDates }) {
  const [deliveryDate, setDeliveryDate] = useState('2026-01-10');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadEvolution() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchForecastEvolution(deliveryDate);
        setData(res);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadEvolution();
  }, [deliveryDate]);

  const palette = ['#6366f1', '#8b5cf6', '#06b6d4', '#38bdf8', '#f59e0b', '#ec4899'];

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header & Controls */}
      <div className="glass-card" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={22} color="#38bdf8" />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                Forecast Evolution & Multi-Horizon Lead-Time Decay
              </h2>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Observe how renewable generation forecasts updated across successive publication runs as gate closure approached.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Select Delivery Date:</span>
            <select
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              style={{ minWidth: '160px' }}
            >
              {availableDates.deliveryDates && availableDates.deliveryDates.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading && (
        <div className="glass-card" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <div className="pulse-dot" style={{ margin: '0 auto 16px auto', width: '16px', height: '16px' }} />
          <p>Extracting historical publication runs from WINDFOR stream...</p>
        </div>
      )}

      {error && (
        <div className="glass-card" style={{ padding: '30px', borderColor: 'var(--rose-primary)', color: '#fb7185' }}>
          <p>{error}</p>
        </div>
      )}

      {data && !loading && (
        <>
          {/* Chart & Legend Card */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>
                  Evolution of Wind Forecast Curves vs Actual Delivered
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Target Delivery: {data.deliveryDate} (24-Hour Horizon)
                </p>
              </div>

              {/* Dynamic Legend */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', fontSize: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '14px', height: '3px', background: '#10b981', borderRadius: '2px' }} />
                  <span style={{ color: '#34d399', fontWeight: 700 }}>Realized Actual (FUELHH)</span>
                </div>
                {data.runs.map((r, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '14px', height: '2px', background: palette[i % palette.length], borderRadius: '2px' }} />
                    <span style={{ color: palette[i % palette.length] }}>
                      Pub {r.publishTime.slice(5, 16).replace('T', ' ')} ({r.leadTimeHours}h lead)
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* SVG Visualizer */}
            <div style={{ width: '100%', overflowX: 'auto' }}>
              <svg viewBox="0 0 900 320" style={{ width: '100%', height: 'auto', display: 'block' }}>
                {/* Horizontal Grid */}
                {[0, 0.25, 0.5, 0.75, 1.0].map((ratio) => {
                  const maxGen = 25000;
                  const yVal = 20 + 260 * (1 - ratio);
                  return (
                    <g key={ratio}>
                      <line x1={60} y1={yVal} x2={870} y2={yVal} stroke="rgba(255, 255, 255, 0.06)" strokeDasharray="4 4" />
                      <text x={50} y={yVal + 4} fill="var(--text-muted)" fontSize="10" textAnchor="end" className="mono">
                        {Math.round((maxGen * ratio) / 1000)} GW
                      </text>
                    </g>
                  );
                })}

                {/* Multiple Forecast Run Polylines */}
                {data.runs.map((r, idx) => {
                  const maxGen = 25000;
                  const ptsStr = r.points.map((p, i) => {
                    const x = 60 + (i / 23) * 810;
                    const y = 20 + 260 - ((p.forecastMW || 0) / maxGen) * 260;
                    return `${x},${y}`;
                  }).join(' ');

                  return (
                    <polyline
                      key={idx}
                      fill="none"
                      stroke={palette[idx % palette.length]}
                      strokeWidth={1.8}
                      strokeOpacity={0.8}
                      points={ptsStr}
                    />
                  );
                })}

                {/* Actual Realized Generation Line (Bold Emerald) */}
                {(() => {
                  const maxGen = 25000;
                  const actStr = data.actuals.map((a, i) => {
                    const x = 60 + (i / 23) * 810;
                    const y = 20 + 260 - ((a.actualMW || 0) / maxGen) * 260;
                    return `${x},${y}`;
                  }).join(' ');

                  return (
                    <polyline
                      fill="none"
                      stroke="#10b981"
                      strokeWidth={3}
                      points={actStr}
                    />
                  );
                })()}

                {/* X-axis labels */}
                {[0, 3, 6, 9, 12, 15, 18, 21].map((h) => {
                  const x = 60 + (h / 23) * 810;
                  return (
                    <text key={h} x={x} y={305} fill="var(--text-muted)" fontSize="10" textAnchor="middle" className="mono">
                      {h}:00
                    </text>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Technical Takeaways */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '12px' }}>
              Wholesale Trading Desk Insights on Lead-Time Decay
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <div>
                <p style={{ fontWeight: 600, color: '#f8fafc', marginBottom: '4px' }}>
                  Intra-day Ramping Precision:
                </p>
                <p>
                  As lead time drops below 12 hours, high-resolution numerical weather prediction (NWP) model updates incorporate local radar and satellite observations, significantly tightening the forecast error bands.
                </p>
              </div>
              <div>
                <p style={{ fontWeight: 600, color: '#f8fafc', marginBottom: '4px' }}>
                  Intra-Day (BM) Adjustment:
                </p>
                <p>
                  While Day-Ahead auction positions are frozen at 11:00 GMT on D-1, utilities can actively trade within the UK Intra-Day Continuous Market (EPEX/NordPool) to square off deviations as newer WINDFOR runs emerge.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
