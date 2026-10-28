import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import DayAheadCockpit from './components/DayAheadCockpit';
import AccuracyEvaluation from './components/AccuracyEvaluation';
import ThermalProcurement from './components/ThermalProcurement';
import ForecastEvolution from './components/ForecastEvolution';
import RawDataViewer from './components/RawDataViewer';
import PitchModal from './components/PitchModal';
import { fetchHealth, fetchAvailableDates } from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('day-ahead');
  const [pitchModalOpen, setPitchModalOpen] = useState(false);
  const [pitchMode, setPitchMode] = useState('pitch'); // 'pitch' or 'tech'
  const [availableDates, setAvailableDates] = useState({ deliveryDates: [], decisionDates: [] });
  const [healthData, setHealthData] = useState(null);

  useEffect(() => {
    async function init() {
      try {
        const [health, dates] = await Promise.all([
          fetchHealth().catch(() => null),
          fetchAvailableDates().catch(() => ({ deliveryDates: [], decisionDates: [] }))
        ]);
        setHealthData(health);
        setAvailableDates(dates);
      } catch (e) {
        console.error('Initialization error:', e);
      }
    }
    init();
  }, []);

  const handleOpenPitch = () => {
    setPitchMode('pitch');
    setPitchModalOpen(true);
  };

  const handleOpenTechLead = () => {
    setPitchMode('tech');
    setPitchModalOpen(true);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenPitch={handleOpenPitch}
        onOpenTechLead={handleOpenTechLead}
        healthData={healthData}
      />

      <main className="app-container" style={{ flex: 1 }}>
        {activeTab === 'day-ahead' && (
          <DayAheadCockpit availableDates={availableDates} />
        )}
        {activeTab === 'accuracy' && (
          <AccuracyEvaluation />
        )}
        {activeTab === 'procurement' && (
          <ThermalProcurement availableDates={availableDates} />
        )}
        {activeTab === 'evolution' && (
          <ForecastEvolution availableDates={availableDates} />
        )}
        {activeTab === 'raw-data' && (
          <RawDataViewer />
        )}
      </main>

      {/* Presentation Deck Modal */}
      <PitchModal
        isOpen={pitchModalOpen}
        onClose={() => setPitchModalOpen(false)}
        mode={pitchMode}
      />

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border-subtle)',
        padding: '24px',
        textAlign: 'center',
        fontSize: '0.78rem',
        color: 'var(--text-muted)',
        background: 'rgba(7, 10, 18, 0.95)'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <span>Data Source: </span>
            <a
              href="https://bmrs.elexon.co.uk"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#38bdf8', textDecoration: 'none' }}
            >
              Elexon BMRS Insights Solution
            </a>
            <span> (Datasets: FUELHH fuelType=WIND, WINDFOR) | Target: January 2026</span>
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>GB Electricity Wholesale Day-Ahead Desk</span>
            <span>•</span>
            <span style={{ color: '#34d399' }}>FastAPI + React Production Suite</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
