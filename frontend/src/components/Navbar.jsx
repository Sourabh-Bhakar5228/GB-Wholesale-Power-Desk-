import React from 'react';
import { Wind, Activity, Presentation, Code2, Database, ShieldCheck } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, onOpenPitch, onOpenTechLead, healthData }) {
  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 28px',
      borderBottom: '1px solid var(--border-subtle)',
      background: 'rgba(7, 10, 18, 0.85)',
      backdropFilter: 'blur(16px)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      marginBottom: '24px'
    }}>
      {/* Brand & Market Context */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{
          width: '42px',
          height: '42px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(99, 102, 241, 0.2) 100%)',
          border: '1px solid rgba(6, 182, 212, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 16px rgba(6, 182, 212, 0.25)'
        }}>
          <Wind size={22} color="#38bdf8" />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.02em', color: '#f8fafc' }}>
              GB Wholesale Power Desk
            </h1>
            <span className="badge badge-cyan" style={{ fontSize: '0.65rem', padding: '2px 8px' }}>
              Day-Ahead Portal
            </span>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            UK Wholesale Market Renewable Procurement & Quantitative Wind Forecast Error Analytics
          </p>
        </div>
      </div>

      {/* Center Tabs Navigation */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(13, 19, 35, 0.7)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
        <button
          className={`btn-tab ${activeTab === 'day-ahead' ? 'active' : ''}`}
          onClick={() => setActiveTab('day-ahead')}
        >
          <Activity size={16} />
          <span>Day-Ahead Cockpit</span>
        </button>
        <button
          className={`btn-tab ${activeTab === 'accuracy' ? 'active' : ''}`}
          onClick={() => setActiveTab('accuracy')}
        >
          <ShieldCheck size={16} />
          <span>Forecast Accuracy (Goal 2)</span>
        </button>
        <button
          className={`btn-tab ${activeTab === 'procurement' ? 'active' : ''}`}
          onClick={() => setActiveTab('procurement')}
        >
          <Wind size={16} />
          <span>Thermal Procurement Simulator</span>
        </button>
        <button
          className={`btn-tab ${activeTab === 'evolution' ? 'active' : ''}`}
          onClick={() => setActiveTab('evolution')}
        >
          <Presentation size={16} />
          <span>Lead-Time Evolution</span>
        </button>
        <button
          className={`btn-tab ${activeTab === 'raw-data' ? 'active' : ''}`}
          onClick={() => setActiveTab('raw-data')}
        >
          <Database size={16} />
          <span>Elexon Audit</span>
        </button>
      </nav>

      {/* Right Actions: Pitch Presentation & Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Status Indicator */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 12px',
          borderRadius: '8px',
          background: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          fontSize: '0.78rem',
          color: '#34d399'
        }}>
          <span className="pulse-dot"></span>
          <span className="mono" style={{ fontWeight: 600 }}>ELEXON BMRS: JAN 2026 LIVE</span>
        </div>

        {/* Pitch Video Deck */}
        <button
          className="btn btn-secondary"
          onClick={onOpenPitch}
          style={{ fontSize: '0.8rem', padding: '6px 14px', borderColor: 'rgba(6, 182, 212, 0.3)' }}
          title="Open 5-minute client pitch slide deck & talking points"
        >
          <Presentation size={15} color="#38bdf8" />
          <span>Client Pitch (5m)</span>
        </button>

        {/* Tech Walkthrough Deck */}
        <button
          className="btn btn-secondary"
          onClick={onOpenTechLead}
          style={{ fontSize: '0.8rem', padding: '6px 14px', borderColor: 'rgba(99, 102, 241, 0.3)' }}
          title="Open technical architecture & engineering review deck"
        >
          <Code2 size={15} color="#a5b4fc" />
          <span>Tech Review (5m)</span>
        </button>
      </div>
    </header>
  );
}
