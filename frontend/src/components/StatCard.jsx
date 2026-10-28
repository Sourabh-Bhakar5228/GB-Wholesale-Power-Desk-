import React from 'react';

export default function StatCard({ title, value, unit, subtext, badgeText, badgeColor = 'cyan', icon: Icon, glowColor }) {
  const getBadgeClass = (color) => {
    switch (color) {
      case 'emerald': return 'badge-emerald';
      case 'amber': return 'badge-amber';
      case 'rose': return 'badge-rose';
      case 'indigo': return 'badge-indigo';
      default: return 'badge-cyan';
    }
  };

  return (
    <div className={`glass-card ${glowColor ? `glow-${glowColor}` : ''}`} style={{
      padding: '20px 24px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Subtle top color line */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '2px',
        background: glowColor === 'emerald'
          ? 'linear-gradient(90deg, #10b981 0%, transparent 100%)'
          : glowColor === 'rose'
          ? 'linear-gradient(90deg, #f43f5e 0%, transparent 100%)'
          : glowColor === 'amber'
          ? 'linear-gradient(90deg, #f59e0b 0%, transparent 100%)'
          : 'linear-gradient(90deg, #06b6d4 0%, transparent 100%)'
      }} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {title}
        </span>
        {badgeText && (
          <span className={`badge ${getBadgeClass(badgeColor)}`}>
            {badgeText}
          </span>
        )}
        {Icon && !badgeText && (
          <div style={{ color: 'var(--text-muted)' }}>
            <Icon size={18} />
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
        <span className="mono" style={{ fontSize: '1.9rem', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.02em' }}>
          {value}
        </span>
        {unit && (
          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            {unit}
          </span>
        )}
      </div>

      {subtext && (
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '8px' }}>
          {subtext}
        </p>
      )}
    </div>
  );
}
