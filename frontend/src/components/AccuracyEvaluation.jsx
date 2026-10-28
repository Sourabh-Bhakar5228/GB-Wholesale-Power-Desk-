import React, { useState, useEffect } from 'react';
import { ShieldCheck, BarChart2, PieChart, Activity, AlertCircle, ArrowUpRight, ArrowDownRight, Layers } from 'lucide-react';
import StatCard from './StatCard';
import { fetchAccuracyMetrics } from '../services/api';

export default function AccuracyEvaluation() {
  const [gateClosureTime, setGateClosureTime] = useState('11:00');
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dailyFilter, setDailyFilter] = useState('');

  useEffect(() => {
    async function loadMetrics() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchAccuracyMetrics(gateClosureTime);
        setMetrics(res);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadMetrics();
  }, [gateClosureTime]);

  const filteredDays = metrics?.dailyBreakdown?.filter(d =>
    d.deliveryDate.includes(dailyFilter) || d.decisionDate.includes(dailyFilter)
  ) || [];

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header & Gate Closure Selector */}
      <div className="glass-card" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={22} color="#38bdf8" />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                Quantitative Renewable Forecast Accuracy Engine
              </h2>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Rigorous statistical evaluation of National Wind Generation forecasts across all day-ahead decisions in <strong>January 2026</strong>.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Gate Closure Cutoff:</span>
            <select
              value={gateClosureTime}
              onChange={(e) => setGateClosureTime(e.target.value)}
              style={{ minWidth: '150px' }}
            >
              <option value="09:00">09:00 GMT</option>
              <option value="11:00">11:00 GMT (EPEX Auction)</option>
              <option value="12:00">12:00 GMT</option>
              <option value="17:00">17:00 GMT (ESO Freeze)</option>
            </select>
          </div>
        </div>
      </div>

      {loading && (
        <div className="glass-card" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <div className="pulse-dot" style={{ margin: '0 auto 16px auto', width: '16px', height: '16px' }} />
          <p>Evaluating 744 hourly settlement periods across January 2026...</p>
        </div>
      )}

      {error && (
        <div className="glass-card" style={{ padding: '30px', borderColor: 'var(--rose-primary)', color: '#fb7185' }}>
          <p>{error}</p>
        </div>
      )}

      {metrics && !loading && (
        <>
          {/* Executive Quantitative Scorecard */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <StatCard
              title="Mean Absolute Error (MAE)"
              value={metrics.overallMAE.toLocaleString()}
              unit="MW"
              subtext="Average magnitude of hourly forecast error"
              badgeText="ACCURACY"
              badgeColor="cyan"
              glowColor="cyan"
            />
            <StatCard
              title="Root Mean Squared (RMSE)"
              value={metrics.overallRMSE.toLocaleString()}
              unit="MW"
              subtext="Penalizes large extreme ramp misses"
              badgeText="VOLATILITY"
              badgeColor="amber"
              glowColor="amber"
            />
            <StatCard
              title="Weighted MAPE (WMAPE)"
              value={`${metrics.overallWMAPE}%`}
              unit="of Generation"
              subtext={`Standard MAPE: ${metrics.overallMAPE}% (non-weighted)`}
              badgeText="GOLD STANDARD"
              badgeColor="indigo"
              glowColor="indigo"
            />
            <StatCard
              title="Systemic Forecast Bias"
              value={(metrics.overallBiasMW > 0 ? `+${metrics.overallBiasMW}` : metrics.overallBiasMW).toLocaleString()}
              unit="MW"
              subtext={metrics.overallBiasMW > 0 ? 'Persistent over-forecasting tendency' : 'Under-forecasting tendency'}
              badgeText={metrics.overallBiasMW > 0 ? 'OVER-FORECAST' : 'UNDER-FORECAST'}
              badgeColor={metrics.overallBiasMW > 0 ? 'rose' : 'emerald'}
              glowColor={metrics.overallBiasMW > 0 ? 'rose' : 'emerald'}
            />
            <StatCard
              title="Goodness of Fit (R²)"
              value={metrics.correlationR2.toFixed(3)}
              unit="Score"
              subtext={`Pearson r = ${metrics.correlationR.toFixed(3)}`}
              badgeText="CORRELATION"
              badgeColor="emerald"
            />
          </div>

          {/* Directional Distribution Banner */}
          <div className="glass-card" style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PieChart size={18} color="#38bdf8" />
                <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Directional Error Frequency</h3>
              </div>
              <span className="mono" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Total Evaluated: {metrics.totalEvaluatedHours} Hours
              </span>
            </div>

            {/* Visual Ratio Bar */}
            <div style={{ display: 'flex', height: '28px', borderRadius: '8px', overflow: 'hidden', background: '#0d1322' }}>
              <div style={{
                width: `${metrics.overForecastPercentage}%`,
                background: 'linear-gradient(90deg, #e11d48, #f43f5e)',
                display: 'flex',
                alignItems: 'center',
                paddingLeft: '12px',
                color: '#ffffff',
                fontSize: '0.75rem',
                fontWeight: 700
              }}>
                Over-Forecast: {metrics.overForecastPercentage}% (Thermal Deficit Risk)
              </div>
              <div style={{
                width: `${metrics.underForecastPercentage}%`,
                background: 'linear-gradient(90deg, #10b981, #059669)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                paddingRight: '12px',
                color: '#ffffff',
                fontSize: '0.75rem',
                fontWeight: 700
              }}>
                Under-Forecast: {metrics.underForecastPercentage}% (Spill)
              </div>
            </div>
          </div>

          {/* Row 2: Quantile Risk Bands & Error Distribution Histogram */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '20px' }}>
            {/* Quantile Risk Bands Table */}
            <div className="glass-card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>
                  Quantile Error Risk Bands (Procurement Margins)
                </h3>
                <span className="badge badge-amber" style={{ fontSize: '0.65rem' }}>
                  Risk Margins
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                Used by wholesale traders to calibrate thermal safety buffers to avoid extreme cashout buy prices.
              </p>

              <table className="data-table">
                <thead>
                  <tr>
                    <th>Percentile</th>
                    <th>Error (MW)</th>
                    <th>Trading Desk Interpretation</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><span className="badge badge-rose" style={{ fontSize: '0.65rem' }}>P95 (Worst 5%)</span></td>
                    <td className="mono" style={{ color: '#fb7185', fontWeight: 700 }}>+{metrics.p95ErrorMW.toLocaleString()} MW</td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Stress-test shortfall buffer for extreme cold snaps</td>
                  </tr>
                  <tr>
                    <td><span className="badge badge-amber" style={{ fontSize: '0.65rem' }}>P90 (Prudent)</span></td>
                    <td className="mono" style={{ color: '#fbbf24', fontWeight: 700 }}>+{metrics.p90ErrorMW.toLocaleString()} MW</td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Recommended standard thermal hedge buffer</td>
                  </tr>
                  <tr>
                    <td><span className="badge badge-indigo" style={{ fontSize: '0.65rem' }}>P75 (Moderate)</span></td>
                    <td className="mono" style={{ color: '#a5b4fc', fontWeight: 600 }}>+{metrics.p75ErrorMW.toLocaleString()} MW</td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Balanced risk posture</td>
                  </tr>
                  <tr>
                    <td><span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>P50 (Median)</span></td>
                    <td className="mono" style={{ color: '#38bdf8', fontWeight: 600 }}>{metrics.p50ErrorMW > 0 ? `+${metrics.p50ErrorMW}` : metrics.p50ErrorMW} MW</td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>50/50 median expectation</td>
                  </tr>
                  <tr>
                    <td><span className="badge badge-emerald" style={{ fontSize: '0.65rem' }}>P10 (Upside)</span></td>
                    <td className="mono" style={{ color: '#34d399', fontWeight: 600 }}>{metrics.p10ErrorMW.toLocaleString()} MW</td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Wind generation significantly exceeded forecast</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Error Distribution Histogram */}
            <div className="glass-card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>
                  Forecast Error Frequency Distribution (MW)
                </h3>
                <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>
                  Histogram
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                Visualizes the spread of forecast errors (MW = Forecast - Actual).
              </p>

              {/* Histogram Bars */}
              <div style={{ display: 'flex', alignItems: 'flex-end', height: '180px', gap: '4px', paddingBottom: '24px', borderBottom: '1px solid var(--border-subtle)', position: 'relative' }}>
                {metrics.histogram?.map((bin, i) => {
                  const maxCount = Math.max(...metrics.histogram.map(b => b.count), 1);
                  const heightPct = (bin.count / maxCount) * 100;
                  const isPositive = bin.binCenter >= 0;

                  return (
                    <div
                      key={i}
                      style={{
                        flex: 1,
                        height: `${Math.max(4, heightPct)}%`,
                        background: isPositive
                          ? 'linear-gradient(180deg, #f43f5e 0%, rgba(244, 63, 94, 0.4) 100%)'
                          : 'linear-gradient(180deg, #10b981 0%, rgba(16, 185, 129, 0.4) 100%)',
                        borderRadius: '3px 3px 0 0',
                        position: 'relative',
                        transition: 'transform 0.2s',
                        cursor: 'pointer'
                      }}
                      title={`Range: ${bin.binStart} to ${bin.binEnd} MW | Count: ${bin.count} (${(bin.frequency * 100).toFixed(1)}%)`}
                    />
                  );
                })}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                <span>Under-Forecast (Surplus)</span>
                <span className="mono" style={{ color: 'var(--text-primary)' }}>0 MW Balanced</span>
                <span>Over-Forecast (Deficit)</span>
              </div>
            </div>
          </div>

          {/* Diurnal Profile (Hourly Accuracy Across the 24-Hour Cycle) */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>
                  Diurnal Error Profile (Settlement Periods 1 - 48 / Hours 00:00 - 23:00 GMT)
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Identifies specific hours of the day where forecast errors and balancing costs spike.
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.78rem' }}>
                <span style={{ color: '#fbbf24', fontWeight: 600 }}>■ Hourly MAE (MW)</span>
                <span style={{ color: '#38bdf8', fontWeight: 600 }}>■ Hourly Mean Actual (MW)</span>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', height: '180px', gap: '8px', minWidth: '700px', paddingBottom: '20px', borderBottom: '1px solid var(--border-subtle)' }}>
                {metrics.diurnalProfile?.map((dp, i) => {
                  const maxMae = Math.max(...metrics.diurnalProfile.map(d => d.maeMW), 1000);
                  const barH = (dp.maeMW / maxMae) * 140;

                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                      <div
                        style={{
                          width: '100%',
                          height: `${Math.max(6, barH)}px`,
                          background: 'linear-gradient(180deg, #f59e0b 0%, rgba(245, 158, 11, 0.3) 100%)',
                          borderRadius: '4px 4px 0 0'
                        }}
                        title={`Hour ${dp.hour}:00 GMT | MAE: ${dp.maeMW} MW | Bias: ${dp.biasMW > 0 ? `+${dp.biasMW}` : dp.biasMW} MW`}
                      />
                      <span className="mono" style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                        {dp.hour}h
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Wind Generation Regimes Breakdown */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <Layers size={18} color="#38bdf8" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>
                Accuracy by Wind Generation Regime
              </h3>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Forecast performance varies drastically between low wind baseload and high wind ramp/storm conditions.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              {metrics.regimes?.map((r, i) => (
                <div key={i} style={{
                  padding: '16px',
                  borderRadius: '10px',
                  background: 'rgba(13, 19, 35, 0.8)',
                  border: '1px solid var(--border-subtle)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#f8fafc' }}>{r.regimeName}</span>
                    <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>{r.generationRangeMW}</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.82rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Samples:</span>
                      <span className="mono">{r.sampleCount} hours</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>MAE:</span>
                      <span className="mono" style={{ fontWeight: 600, color: '#fbbf24' }}>{r.maeMW} MW</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>WMAPE:</span>
                      <span className="mono" style={{ fontWeight: 600, color: '#a5b4fc' }}>{r.wmapePercent}%</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Systemic Bias:</span>
                      <span className="mono" style={{ fontWeight: 600, color: r.biasMW > 0 ? '#fb7185' : '#34d399' }}>
                        {r.biasMW > 0 ? `+${r.biasMW}` : r.biasMW} MW
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* January 2026 Daily Leaderboard */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>
                  January 2026 Daily Performance Leaderboard (31 Days)
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Filter and inspect individual daily day-ahead decision accuracy.
                </p>
              </div>

              <input
                type="text"
                placeholder="Filter date (e.g. 2026-01-10)..."
                value={dailyFilter}
                onChange={(e) => setDailyFilter(e.target.value)}
                style={{ width: '220px' }}
              />
            </div>

            <div style={{ overflowX: 'auto', maxHeight: '350px' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Decision Date (D-1)</th>
                    <th>Delivery Date (D)</th>
                    <th>Mean Forecast (MW)</th>
                    <th>Mean Actual (MW)</th>
                    <th>MAE (MW)</th>
                    <th>RMSE (MW)</th>
                    <th>WMAPE %</th>
                    <th>Bias (MW)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDays.map((d, i) => (
                    <tr key={i}>
                      <td className="mono">{d.decisionDate}</td>
                      <td className="mono" style={{ fontWeight: 600, color: '#38bdf8' }}>{d.deliveryDate}</td>
                      <td className="mono">{d.meanForecastMW?.toLocaleString()}</td>
                      <td className="mono">{d.meanActualMW?.toLocaleString()}</td>
                      <td className="mono" style={{ color: '#fbbf24', fontWeight: 600 }}>{d.maeMW?.toLocaleString()}</td>
                      <td className="mono">{d.rmseMW?.toLocaleString()}</td>
                      <td className="mono">{d.wmapePercent}%</td>
                      <td className="mono" style={{ color: d.meanBiasMW > 0 ? '#fb7185' : '#34d399', fontWeight: 700 }}>
                        {d.meanBiasMW > 0 ? `+${d.meanBiasMW}` : d.meanBiasMW}
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
