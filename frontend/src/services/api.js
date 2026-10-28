/**
 * API Client for UK Day-Ahead Renewable Procurement Desk
 */

const API_BASE = '/api';

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('Health check failed');
  return res.json();
}

export async function fetchAvailableDates() {
  const res = await fetch(`${API_BASE}/dates`);
  if (!res.ok) throw new Error('Failed to fetch available dates');
  return res.json();
}

export async function fetchDayAheadSchedule({ decisionDate, deliveryDate, gateClosureTime, resolution }) {
  const params = new URLSearchParams();
  if (decisionDate) params.append('decision_date', decisionDate);
  if (deliveryDate) params.append('delivery_date', deliveryDate);
  if (gateClosureTime) params.append('gate_closure_time', gateClosureTime);
  if (resolution) params.append('resolution', resolution);

  const res = await fetch(`${API_BASE}/day-ahead?${params.toString()}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to load day-ahead schedule' }));
    throw new Error(err.detail || 'Failed to load day-ahead schedule');
  }
  return res.json();
}

export async function fetchAccuracyMetrics(gateClosureTime = '11:00') {
  const res = await fetch(`${API_BASE}/accuracy-metrics?gate_closure_time=${encodeURIComponent(gateClosureTime)}`);
  if (!res.ok) throw new Error('Failed to load accuracy metrics');
  return res.json();
}

export async function fetchForecastEvolution(deliveryDate) {
  const res = await fetch(`${API_BASE}/forecast-evolution?delivery_date=${encodeURIComponent(deliveryDate)}`);
  if (!res.ok) throw new Error('Failed to load forecast evolution');
  return res.json();
}

export async function runProcurementSimulation(payload) {
  const res = await fetch(`${API_BASE}/procurement-simulation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Simulation failed');
  return res.json();
}

export async function fetchRawData({ dataset = 'actuals', searchDate, limit = 50, offset = 0, exportCsv = false }) {
  const params = new URLSearchParams({ dataset, limit, offset });
  if (searchDate) params.append('search_date', searchDate);
  if (exportCsv) params.append('export_csv', 'true');

  if (exportCsv) {
    window.location.href = `${API_BASE}/raw-data?${params.toString()}`;
    return;
  }

  const res = await fetch(`${API_BASE}/raw-data?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch raw data');
  return res.json();
}
