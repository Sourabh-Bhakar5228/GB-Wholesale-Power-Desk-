import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, Clock, AlertTriangle, CheckCircle2, TrendingUp, Info, HelpCircle } from 'lucide-react';
import StatCard from './StatCard';
import { fetchDayAheadSchedule } from '../services/api';

export default function DayAheadCockpit({ availableDates }) {
  const [decisionDate, setDecisionDate] = useState('2026-01-05');
  const [gateClosureTime, setGateClosureTime] = useState('11:00');
  const [resolution, setResolution] = useState('hourly');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hoveredIndex, setHoveredIndex] = useState(null);

  useEffect(() => {
    async function loadSchedule() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchDayAheadSchedule({
          decisionDate,
          gateClosureTime,
          resolution
        });
        setData(res);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadSchedule();
  }, [decisionDate, gateClosureTime, resolution]);

  // Quick scenario presets
  const applyPreset = (decDate) => {
    setDecisionDate(decDate);
  };

  // SVG Chart Dimensions & Math
  const chartWidth = 900;
  const chartHeight = 320;
  const padding = { top: 20, right: 30, bottom: 40, left: 60 };

  const chartData = useMemo(() => {
    if (!data || !data.points || data.points.length === 0) return null;
    const pts = data.points;
    const maxVal = Math.max(
      ...pts.map(p => Math.max(p.forecastGenerationMW || 0, p.actualGenerationMW || 0)),
      1000
    ) * 1.15;

    const innerWidth = chartWidth - padding.left - padding.right;
    const innerHeight = chartHeight - padding.top - padding.bottom;

    const getX = (idx) => padding.left + (idx / (pts.length - 1 || 1)) * innerWidth;
    const getY = (val) => padding.top + innerHeight - (val / maxVal) * innerHeight;

    // Generate SVG path for forecast
    const fcPoints = pts.map((p, i) => `${getX(i)},${getY(p.forecastGenerationMW || 0)}`).join(' ');
    // Generate SVG path for actual
    const actPoints = pts.map((p, i) => `${getX(i)},${getY(p.actualGenerationMW || 0)}`).join(' ');

    return {
      pts,
      maxVal,
      innerWidth,
      innerHeight,
      getX,
      getY,
      fcPoints,
      actPoints
    };
  }, [data]);

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Filter & Gate Closure Control Bar */}
      <div className="glass-card" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          {/* Left: Decision Date & Gate Closure */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <Calendar size={14} color="#38bdf8" />
                <span>Decision Date (D-1)</span>
              </label>
              <select
                value={decisionDate}
                onChange={(e) => setDecisionDate(e.target.value)}
                style={{ minWidth: '150px' }}
              >
                {availableDates.decisionDates && availableDates.decisionDates.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <Clock size={14} color="#38bdf8" />
                <span>Gate Closure Cutoff (GMT)</span>
              </label>
              <select
                value={gateClosureTime}
                onChange={(e) => setGateClosureTime(e.target.value)}
                style={{ minWidth: '140px' }}
              >
                <option value="09:00">09:00 GMT (Early Prep)</option>
                <option value="11:00">11:00 GMT (EPEX / NordPool Auction)</option>
                <option value="12:00">12:00 GMT (Midday Auction)</option>
                <option value="14:00">14:00 GMT (Post-Auction)</option>
                <option value="17:00">17:00 GMT (ESO Day-Ahead Freeze)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <span>Resolution</span>
              </label>
              <div style={{ display: 'flex', background: 'rgba(13, 19, 34, 0.9)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-medium)' }}>
                <button
                  onClick={() => setResolution('hourly')}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    background: resolution === 'hourly' ? 'rgba(6, 182, 212, 0.25)' : 'transparent',
                    color: resolution === 'hourly' ? '#38bdf8' : 'var(--text-secondary)',
                    fontWeight: 600,
                    fontSize: '0.78rem',
                    cursor: 'pointer'
                  }}
                >
                  Hourly (Auction)
                </button>
                <button
                  onClick={() => setResolution('half-hourly')}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    background: resolution === 'half-hourly' ? 'rgba(6, 182, 212, 0.25)' : 'transparent',
                    color: resolution === 'half-hourly' ? '#38bdf8' : 'var(--text-secondary)',
                    fontWeight: 600,
                    fontSize: '0.78rem',
                    cursor: 'pointer'
                  }}
                >
                  Half-Hourly (48 SP)
                </button>
              </div>
            </div>
          </div>

          {/* Right: Quick Scenario Preset Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Quick Scenarios:</span>
            <button
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem', padding: '6px 10px' }}
              onClick={() => applyPreset('2025-12-31')}
              title="Jan 1 Delivery: Massive +4.6 GW over-forecasting day"
            >
              Jan 1 (Shortfall Risk)
            </button>
            <button
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem', padding: '6px 10px' }}
              onClick={() => applyPreset('2026-01-09')}
              title="Jan 10 Delivery: Storm ramp transition"
            >
              Jan 10 (Storm Ramp)
            </button>
            <button
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem', padding: '6px 10px' }}
              onClick={() => applyPreset('2026-01-17')}
              title="Jan 18 Delivery: Calm wind benchmark"
            >
              Jan 18 (Calm Baseline)
            </button>
          </div>
        </div>

        {/* Informative Subtitle Banner */}
        {data && (
          <div style={{
            marginTop: '16px',
            padding: '10px 16px',
            borderRadius: '8px',
            background: 'rgba(6, 182, 212, 0.06)',
            border: '1px solid rgba(6, 182, 212, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.82rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Info size={16} color="#38bdf8" />
              <span>
                Evaluating Day-Ahead Decision made on <strong>{data.decisionDate}</strong> before <strong>{data.gateClosureTime} GMT</strong> for Delivery Day: <strong style={{ color: '#38bdf8' }}>{data.deliveryDate}</strong>
              </span>
            </div>
            <span className="mono" style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
              Cutoff Freeze: {data.decisionCutoffTimestamp}
            </span>
          </div>
        )}
      </div>

      {loading && (
        <div className="glass-card" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <div className="pulse-dot" style={{ margin: '0 auto 16px auto', width: '16px', height: '16px' }} />
          <p>Matching latest day-ahead forecasts with Elexon FUELHH actuals...</p>
        </div>
      )}

      {error && (
        <div className="glass-card" style={{ padding: '30px', borderColor: 'var(--rose-primary)', color: '#fb7185' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <AlertTriangle size={20} />
            <h4 style={{ color: '#fb7185' }}>Error Loading Day-Ahead Schedule</h4>
          </div>
          <p>{error}</p>
        </div>
      )}

      {data && !loading && (
        <>
          {/* Key KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <StatCard
              title="Mean Day-Ahead Forecast"
              value={data.meanForecastMW.toLocaleString()}
              unit="MW"
              subtext="Latest forecast published before 11:00 GMT"
              badgeText="WINDFOR"
              badgeColor="cyan"
              glowColor="cyan"
            />
            <StatCard
              title="Mean Realized Generation"
              value={data.meanActualMW.toLocaleString()}
              unit="MW"
              subtext="Actual wind delivered to GB transmission grid"
              badgeText="FUELHH"
              badgeColor="emerald"
              glowColor="emerald"
            />
            <StatCard
              title="Day Mean Absolute Error"
              value={data.maeMW.toLocaleString()}
              unit="MW"
              subtext={`WMAPE: ${data.wmapePercent}% of actual delivery`}
              badgeText={`RMSE: ${data.rmseMW} MW`}
              badgeColor="amber"
              glowColor="amber"
            />
            <StatCard
              title="Net Systemic Bias"
              value={(data.meanBiasMW > 0 ? `+${data.meanBiasMW}` : data.meanBiasMW).toLocaleString()}
              unit="MW"
              subtext={data.meanBiasMW > 0 ? 'Over-forecast: Utility exposed to thermal deficit' : 'Under-forecast: Surplus wind spill'}
              badgeText={data.meanBiasMW > 0 ? 'OVER-FORECAST' : 'UNDER-FORECAST'}
              badgeColor={data.meanBiasMW > 0 ? 'rose' : 'emerald'}
              glowColor={data.meanBiasMW > 0 ? 'rose' : 'emerald'}
            />
            <StatCard
              title="Peak Over-Forecast Gap"
              value={`+${data.maxOverForecastMW.toLocaleString()}`}
              unit="MW"
              subtext="Worst single-period short position"
              badgeText="MAX SHORTFALL"
              badgeColor="rose"
            />
          </div>

          {/* Interactive Chart Container */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>
                  Day-Ahead Wind Forecast vs Realized Generation Profile
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Delivery Date: {data.deliveryDate} (Freeze Cutoff: {data.gateClosureTime} GMT)
                </p>
              </div>

              {/* Chart Legend */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '16px', height: '3px', background: '#06b6d4', borderRadius: '2px' }} />
                  <span style={{ color: '#38bdf8', fontWeight: 600 }}>Day-Ahead Forecast (WINDFOR)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '16px', height: '3px', background: '#10b981', borderRadius: '2px' }} />
                  <span style={{ color: '#34d399', fontWeight: 600 }}>Realized Actual (FUELHH)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '10px', height: '10px', background: '#f43f5e', borderRadius: '2px' }} />
                  <span style={{ color: '#fb7185' }}>Over-Forecast (Deficit)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '10px', height: '10px', background: '#10b981', borderRadius: '2px' }} />
                  <span style={{ color: '#34d399' }}>Under-Forecast (Surplus)</span>
                </div>
              </div>
            </div>

            {/* SVG Visualizer */}
            {chartData && (
              <div style={{ position: 'relative', width: '100%', overflowX: 'auto' }}>
                <svg
                  viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                  style={{ width: '100%', height: 'auto', display: 'block' }}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  <defs>
                    <linearGradient id="fcGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                    </linearGradient>
                    <linearGradient id="actGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Grid Lines (Horizontal) */}
                  {[0, 0.25, 0.5, 0.75, 1.0].map((ratio) => {
                    const yVal = padding.top + chartData.innerHeight * (1 - ratio);
                    const labelVal = Math.round((chartData.maxVal * ratio) / 1000);
                    return (
                      <g key={ratio}>
                        <line
                          x1={padding.left}
                          y1={yVal}
                          x2={chartWidth - padding.right}
                          y2={yVal}
                          stroke="rgba(255, 255, 255, 0.06)"
                          strokeDasharray="4 4"
                        />
                        <text
                          x={padding.left - 10}
                          y={yVal + 4}
                          fill="var(--text-muted)"
                          fontSize="10"
                          textAnchor="end"
                          className="mono"
                        >
                          {labelVal} GW
                        </text>
                      </g>
                    );
                  })}

                  {/* Forecast Line */}
                  <polyline
                    fill="none"
                    stroke="#06b6d4"
                    strokeWidth="2.5"
                    points={chartData.fcPoints}
                  />

                  {/* Actual Generation Line */}
                  <polyline
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2.5"
                    points={chartData.actPoints}
                  />

                  {/* Data Points and Error Bars */}
                  {chartData.pts.map((p, idx) => {
                    const x = chartData.getX(idx);
                    const yFc = chartData.getY(p.forecastGenerationMW || 0);
                    const yAct = chartData.getY(p.actualGenerationMW || 0);
                    const isHovered = hoveredIndex === idx;

                    return (
                      <g
                        key={idx}
                        onMouseEnter={() => setHoveredIndex(idx)}
                        style={{ cursor: 'pointer' }}
                      >
                        {/* Hover vertical crosshair */}
                        {isHovered && (
                          <line
                            x1={x}
                            y1={padding.top}
                            x2={x}
                            y2={chartHeight - padding.bottom}
                            stroke="rgba(255, 255, 255, 0.3)"
                            strokeWidth="1"
                            strokeDasharray="3 3"
                          />
                        )}

                        {/* Forecast circle */}
                        <circle
                          cx={x}
                          cy={yFc}
                          r={isHovered ? 5 : 3}
                          fill="#06b6d4"
                          stroke="#ffffff"
                          strokeWidth={isHovered ? 2 : 1}
                        />

                        {/* Actual circle */}
                        <circle
                          cx={x}
                          cy={yAct}
                          r={isHovered ? 5 : 3}
                          fill="#10b981"
                          stroke="#ffffff"
                          strokeWidth={isHovered ? 2 : 1}
                        />

                        {/* X-axis time label */}
                        {idx % (resolution === 'hourly' ? 3 : 6) === 0 && (
                          <text
                            x={x}
                            y={chartHeight - 12}
                            fill="var(--text-muted)"
                            fontSize="10"
                            textAnchor="middle"
                            className="mono"
                          >
                            {p.startTime.slice(11, 16)}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>

                {/* Floating Tooltip */}
                {hoveredIndex !== null && chartData.pts[hoveredIndex] && (
                  <div style={{
                    position: 'absolute',
                    top: '20px',
                    right: '30px',
                    background: 'rgba(13, 19, 36, 0.95)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: '10px',
                    padding: '12px 16px',
                    boxShadow: 'var(--shadow-lg)',
                    minWidth: '240px',
                    pointerEvents: 'none',
                    zIndex: 20
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px', marginBottom: '8px' }}>
                      <span className="mono" style={{ fontWeight: 700, color: '#f8fafc' }}>
                        Time: {chartData.pts[hoveredIndex].startTime.slice(11, 16)} GMT
                      </span>
                      <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>
                        SP {chartData.pts[hoveredIndex].settlementPeriod}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.82rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#38bdf8' }}>Forecast:</span>
                        <span className="mono" style={{ fontWeight: 600 }}>{chartData.pts[hoveredIndex].forecastGenerationMW?.toLocaleString()} MW</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#34d399' }}>Actual:</span>
                        <span className="mono" style={{ fontWeight: 600 }}>{chartData.pts[hoveredIndex].actualGenerationMW?.toLocaleString()} MW</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '4px' }}>
                        <span style={{ color: chartData.pts[hoveredIndex].errorMW > 0 ? '#fb7185' : '#34d399' }}>
                          Error (F - A):
                        </span>
                        <span className="mono" style={{ fontWeight: 700, color: chartData.pts[hoveredIndex].errorMW > 0 ? '#fb7185' : '#34d399' }}>
                          {chartData.pts[hoveredIndex].errorMW > 0 ? `+${chartData.pts[hoveredIndex].errorMW}` : chartData.pts[hoveredIndex].errorMW} MW
                          ({chartData.pts[hoveredIndex].percentageError}%)
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        <span>Published:</span>
                        <span className="mono">{chartData.pts[hoveredIndex].forecastPublishTime?.slice(11, 16)} GMT ({chartData.pts[hoveredIndex].leadTimeHours}h lead)</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Commercial Trading Guidance Panel */}
          <div className="glass-card" style={{
            padding: '24px',
            borderLeft: data.meanBiasMW > 0 ? '4px solid var(--rose-primary)' : '4px solid var(--emerald-primary)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
              <TrendingUp size={22} color={data.meanBiasMW > 0 ? '#fb7185' : '#34d399'} />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>
                Wholesale Day-Ahead Procurement Guidance for Delivery Day: {data.deliveryDate}
              </h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginTop: '14px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <div>
                <p style={{ fontWeight: 600, color: '#f8fafc', marginBottom: '4px' }}>
                  1. Imbalance Risk Assessment:
                </p>
                <p>
                  {data.meanBiasMW > 0 ? (
                    <>
                      The day-ahead wind forecast had a <strong style={{ color: '#fb7185' }}>systemic over-forecast bias of +{data.meanBiasMW} MW</strong>.
                      If the utility desk procured thermal power assuming full wind availability, the utility would have faced an average shortfall of {data.meanBiasMW} MW every hour, resulting in severe exposure to System Buy Cashout penalties.
                    </>
                  ) : (
                    <>
                      Wind generation outperformed the day-ahead forecast by <strong style={{ color: '#34d399' }}>{Math.abs(data.meanBiasMW)} MW</strong>. Over-procuring thermal plants would have led to spill power sold back at depressed system prices.
                    </>
                  )}
                </p>
              </div>

              <div>
                <p style={{ fontWeight: 600, color: '#f8fafc', marginBottom: '4px' }}>
                  2. Peak Hour Strategy (17:00 - 20:00 GMT):
                </p>
                <p>
                  Peak evening demand requires strict adherence to quantile risk buffers. We recommend applying a <strong>P90 derating margin of ~{Math.round(data.maeMW * 1.2)} MW</strong> on the wind credit when clearing the Day-Ahead Auction.
                </p>
              </div>

              <div>
                <p style={{ fontWeight: 600, color: '#f8fafc', marginBottom: '4px' }}>
                  3. Lead-Time Decay:
                </p>
                <p>
                  Forecasts were locked {data.points[0]?.leadTimeHours}h before start of delivery. In our <em>Lead-Time Evolution</em> tab, track how intra-day runs improved closer to real-time gate closure.
                </p>
              </div>
            </div>
          </div>

          {/* Tabular Schedule View */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '16px' }}>
              Full Settlement Period Breakdown ({data.totalPeriods} Intervals)
            </h3>
            <div style={{ overflowX: 'auto', maxHeight: '380px' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Start Time (UTC)</th>
                    <th>SP</th>
                    <th>Forecast (MW)</th>
                    <th>Actual (MW)</th>
                    <th>Error (MW)</th>
                    <th>Error %</th>
                    <th>Lead Time</th>
                    <th>Imbalance Type</th>
                  </tr>
                </thead>
                <tbody>
                  {data.points.map((p, i) => (
                    <tr key={i}>
                      <td className="mono">{p.startTime.replace('T', ' ').replace('Z', '')}</td>
                      <td className="mono">{p.settlementPeriod}</td>
                      <td className="mono" style={{ color: '#38bdf8', fontWeight: 600 }}>
                        {p.forecastGenerationMW?.toLocaleString() || '-'}
                      </td>
                      <td className="mono" style={{ color: '#34d399', fontWeight: 600 }}>
                        {p.actualGenerationMW?.toLocaleString() || '-'}
                      </td>
                      <td className="mono" style={{
                        color: p.errorMW > 0 ? '#fb7185' : p.errorMW < 0 ? '#34d399' : 'inherit',
                        fontWeight: 700
                      }}>
                        {p.errorMW !== null ? (p.errorMW > 0 ? `+${p.errorMW}` : p.errorMW) : '-'}
                      </td>
                      <td className="mono">
                        {p.percentageError !== null ? `${p.percentageError > 0 ? `+` : ''}${p.percentageError}%` : '-'}
                      </td>
                      <td className="mono">{p.leadTimeHours ? `${p.leadTimeHours}h` : '-'}</td>
                      <td>
                        {p.errorMW > 0 ? (
                          <span className="badge badge-rose" style={{ fontSize: '0.65rem' }}>Shortfall Risk</span>
                        ) : p.errorMW < 0 ? (
                          <span className="badge badge-emerald" style={{ fontSize: '0.65rem' }}>Surplus Spill</span>
                        ) : (
                          <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>Balanced</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
