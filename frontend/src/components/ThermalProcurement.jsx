import React, { useState, useEffect } from 'react';
import { Flame, ShieldAlert, DollarSign, Zap, CheckCircle2, Sliders, RefreshCw } from 'lucide-react';
import StatCard from './StatCard';
import { runProcurementSimulation } from '../services/api';

export default function ThermalProcurement({ availableDates }) {
  const [deliveryDate, setDeliveryDate] = useState('2026-01-06');
  const [customerDemandMW, setCustomerDemandMW] = useState(25000);
  const [riskTolerance, setRiskTolerance] = useState(90);
  const [cashoutPrice, setCashoutPrice] = useState(95);
  const [thermalCost, setThermalCost] = useState(75);
  
  const [simulation, setSimulation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const runSim = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await runProcurementSimulation({
        deliveryDate,
        customerDemandMW: parseFloat(customerDemandMW),
        riskTolerancePercentile: parseInt(riskTolerance),
        imbalanceCashOutGBP: parseFloat(cashoutPrice),
        thermalSRMCGBP: parseFloat(thermalCost)
      });
      setSimulation(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runSim();
  }, [deliveryDate, riskTolerance]);

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Parameter Control Panel */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Flame size={22} color="#f59e0b" />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                Utility Thermal Procurement & Risk-Adjusted Decision Simulator
              </h2>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Demonstrates how the quantified wind forecast error is used by wholesale traders to calibrate thermal hedges and protect consumer demand against cashout imbalance spikes.
            </p>
          </div>

          <button
            className="btn btn-primary"
            onClick={runSim}
            style={{ fontSize: '0.85rem' }}
          >
            <RefreshCw size={14} />
            <span>Recalculate Hedge</span>
          </button>
        </div>

        {/* Form Inputs Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Delivery Date
            </label>
            <select
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              style={{ width: '100%' }}
            >
              {availableDates.deliveryDates && availableDates.deliveryDates.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Customer Demand (Base MW): <strong className="mono" style={{ color: '#38bdf8' }}>{customerDemandMW.toLocaleString()} MW</strong>
            </label>
            <input
              type="range"
              min="15000"
              max="40000"
              step="1000"
              value={customerDemandMW}
              onChange={(e) => setCustomerDemandMW(e.target.value)}
              style={{ width: '100%', accentColor: 'var(--cyan-primary)' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Risk Tolerance Margin
            </label>
            <select
              value={riskTolerance}
              onChange={(e) => setRiskTolerance(e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="50">P50 (Median - Unhedged / Aggressive)</option>
              <option value="75">P75 (Moderate - Standard Utility)</option>
              <option value="90">P90 (Prudent Conservative - Recommended)</option>
              <option value="95">P95 (Extreme Downside Protection)</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Cashout Imbalance (£/MWh)
            </label>
            <input
              type="number"
              value={cashoutPrice}
              onChange={(e) => setCashoutPrice(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Thermal SRMC (£/MWh)
            </label>
            <input
              type="number"
              value={thermalCost}
              onChange={(e) => setThermalCost(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
        </div>
      </div>

      {loading && (
        <div className="glass-card" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <div className="pulse-dot" style={{ margin: '0 auto 16px auto', width: '16px', height: '16px' }} />
          <p>Running wholesale dispatch and imbalance risk simulation...</p>
        </div>
      )}

      {error && (
        <div className="glass-card" style={{ padding: '30px', borderColor: 'var(--rose-primary)', color: '#fb7185' }}>
          <p>{error}</p>
        </div>
      )}

      {simulation && !loading && (
        <>
          {/* Simulation Output KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '16px' }}>
            <StatCard
              title="Recommended Thermal Purchase"
              value={Math.round(simulation.recommendedDailyThermalMWh).toLocaleString()}
              unit="MWh/day"
              subtext={`Nominal unhedged: ${Math.round(simulation.nominalDailyThermalMWh).toLocaleString()} MWh`}
              badgeText={`P${simulation.riskTolerancePercentile} HEDGE`}
              badgeColor="amber"
              glowColor="amber"
            />
            <StatCard
              title="Unhedged Imbalance Exposure"
              value={Math.round(simulation.unhedgedImbalanceExposureRiskMWh).toLocaleString()}
              unit="MWh Short"
              subtext="Volume exposed to expensive cashout buy price"
              badgeText="EXPOSURE"
              badgeColor="rose"
              glowColor="rose"
            />
            <StatCard
              title="Avoided Imbalance Volume"
              value={Math.round(simulation.imbalanceReductionMWh).toLocaleString()}
              unit="MWh Saved"
              subtext="Imbalance volume eliminated by risk buffer"
              badgeText="PROTECTED"
              badgeColor="emerald"
              glowColor="emerald"
            />
            <StatCard
              title="Estimated Financial Saving"
              value={`£${Math.max(0, Math.round(simulation.estimatedFinancialSavingGBP)).toLocaleString()}`}
              unit="GBP / Day"
              subtext="Net avoided penalty minus Day-Ahead hedge cost"
              badgeText="COST SAVINGS"
              badgeColor="emerald"
            />
          </div>

          {/* 24-Hour Energy Balance Stack Visualization */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>
                  24-Hour Wholesale Portfolio Stack: Meeting Consumer Demand
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Delivery Date: {simulation.deliveryDate} | Risk Buffer Applied: {simulation.bufferFactorMW} MW (P{simulation.riskTolerancePercentile})
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.78rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '12px', height: '12px', background: '#06b6d4', borderRadius: '2px' }} />
                  <span>Wind Generation Credit</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '12px', height: '12px', background: '#f59e0b', borderRadius: '2px' }} />
                  <span>Recommended Thermal Procurement</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '12px', height: '2px', background: '#ffffff' }} />
                  <span>Consumer Demand Target</span>
                </div>
              </div>
            </div>

            {/* Visual Hourly Stack Bar */}
            <div style={{ overflowX: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', height: '220px', gap: '10px', minWidth: '700px', paddingBottom: '24px', borderBottom: '1px solid var(--border-subtle)' }}>
                {simulation.hourlySchedule.map((h, i) => {
                  const maxH = 40000;
                  const windH = (Math.max(0, h.demandMW - h.recommendedThermalProcurementMW) / maxH) * 180;
                  const thermH = (h.recommendedThermalProcurementMW / maxH) * 180;

                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                      <div style={{ width: '100%', display: 'flex', flexDirection: 'column-reverse' }}>
                        {/* Wind Credit (Bottom Stack) */}
                        <div
                          style={{
                            width: '100%',
                            height: `${Math.max(4, windH)}px`,
                            background: 'linear-gradient(180deg, #06b6d4 0%, rgba(6, 182, 212, 0.4) 100%)',
                            borderRadius: '0 0 2px 2px'
                          }}
                          title={`Hour ${h.hour} | Wind Credit: ${Math.round(h.demandMW - h.recommendedThermalProcurementMW)} MW`}
                        />
                        {/* Thermal Procurement (Top Stack) */}
                        <div
                          style={{
                            width: '100%',
                            height: `${Math.max(4, thermH)}px`,
                            background: 'linear-gradient(180deg, #f59e0b 0%, rgba(245, 158, 11, 0.5) 100%)',
                            borderRadius: '3px 3px 0 0'
                          }}
                          title={`Hour ${h.hour} | Thermal Buy: ${h.recommendedThermalProcurementMW} MW | Safety Buffer: ${h.riskBufferMW} MW`}
                        />
                      </div>
                      <span className="mono" style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                        {h.hour}h
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Schedule Breakdown Table */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '16px' }}>
              Hourly Thermal Procurement & Imbalance Position Schedule
            </h3>
            <div style={{ overflowX: 'auto', maxHeight: '350px' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Hour (GMT)</th>
                    <th>Demand Target (MW)</th>
                    <th>Wind Forecast (MW)</th>
                    <th>Risk Buffer (MW)</th>
                    <th>Recommended Thermal Buy (MW)</th>
                    <th>Actual Wind (MW)</th>
                    <th>Unhedged Net (MW)</th>
                    <th>Hedged Net (MW)</th>
                    <th>Hour Saving (£)</th>
                  </tr>
                </thead>
                <tbody>
                  {simulation.hourlySchedule.map((h, i) => (
                    <tr key={i}>
                      <td className="mono">{h.hour}:00</td>
                      <td className="mono">{h.demandMW.toLocaleString()}</td>
                      <td className="mono" style={{ color: '#38bdf8' }}>{h.windForecastMW.toLocaleString()}</td>
                      <td className="mono" style={{ color: '#fbbf24' }}>+{h.riskBufferMW}</td>
                      <td className="mono" style={{ color: '#f59e0b', fontWeight: 700 }}>{h.recommendedThermalProcurementMW.toLocaleString()}</td>
                      <td className="mono" style={{ color: '#34d399' }}>{h.actualWindMW?.toLocaleString() || '-'}</td>
                      <td className="mono" style={{ color: h.netImbalanceUnhedgedMW < 0 ? '#fb7185' : 'inherit' }}>
                        {h.netImbalanceUnhedgedMW !== null ? `${h.netImbalanceUnhedgedMW > 0 ? '+' : ''}${h.netImbalanceUnhedgedMW}` : '-'}
                      </td>
                      <td className="mono" style={{ color: h.netImbalanceHedgedMW < 0 ? '#fb7185' : '#34d399', fontWeight: 600 }}>
                        {h.netImbalanceHedgedMW !== null ? `${h.netImbalanceHedgedMW > 0 ? '+' : ''}${h.netImbalanceHedgedMW}` : '-'}
                      </td>
                      <td className="mono" style={{ color: h.hourlyCostSavingGBP > 0 ? '#34d399' : 'inherit', fontWeight: 700 }}>
                        {h.hourlyCostSavingGBP !== null ? `£${h.hourlyCostSavingGBP.toLocaleString()}` : '-'}
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
