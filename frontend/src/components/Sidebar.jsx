import React from 'react'

const NAV = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'queue',     label: 'Investigation Queue' },
  { id: 'analytics', label: 'Analytics' },
]

export default function Sidebar({ view, setView, portfolio }) {
  return (
    <nav style={{
      position: 'fixed', left: 0, top: 56, bottom: 0, width: 240,
      background: '#fafafa', borderRight: '1px solid #f3f4f6',
      padding: '24px 16px', display: 'flex', flexDirection: 'column', zIndex: 100,
    }}>
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.07em', padding: '0 12px', marginBottom: 6 }}>
          Navigation
        </div>
        {NAV.map(item => (
          <NavItem
            key={item.id}
            label={item.label}
            active={view === item.id}
            badge={item.id === 'queue' && portfolio ? portfolio.K : null}
            onClick={() => setView(item.id)}
          />
        ))}
      </div>

      <div style={{ marginTop: 'auto', padding: '16px 12px', borderTop: '1px solid #f3f4f6' }}>
        <div style={{ fontSize: 11, color: '#d1d5db', lineHeight: 1.6 }}>
          IBM AML HI-Small Dataset<br />
          30 candidate regions<br />
          Quantum Dice Trinity Challenge 2026
        </div>
      </div>
    </nav>
  )
}

function NavItem({ label, active, badge, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', textAlign: 'left',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 12px', borderRadius: 7, border: 'none', cursor: 'pointer',
        fontSize: 13, fontWeight: active ? 500 : 400,
        color: active ? '#0a0a0a' : '#6b7280',
        background: active ? '#fff' : 'transparent',
        boxShadow: active ? '0 0 0 1px #f3f4f6' : 'none',
        marginBottom: 2, transition: 'all 0.1s',
      }}
    >
      <span>{label}</span>
      {badge && (
        <span style={{
          background: '#4f46e5', color: '#fff',
          borderRadius: 10, fontSize: 11, fontWeight: 600,
          padding: '1px 7px',
        }}>{badge}</span>
      )}
    </button>
  )
}
