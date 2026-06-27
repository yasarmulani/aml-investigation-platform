import React from 'react'

export default function Topbar({ portfolio, loading }) {
  return (
    <header style={{
      position: 'fixed', top: 0, left: 0, right: 0, height: 56,
      background: '#fff', borderBottom: '1px solid #f3f4f6',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 28px', zIndex: 200,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.04em', color: '#0a0a0a' }}>
          QL<span style={{ color: '#4f46e5' }}>ANTERN</span>
        </span>
        <span style={{
          fontSize: 11, fontWeight: 500, color: '#9ca3af',
          background: '#f3f4f6', borderRadius: 4, padding: '2px 7px',
          letterSpacing: '0.02em',
        }}>
          AML Investigation Portfolio
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%', background: '#4f46e5',
              animation: 'skeleton-pulse 1s ease-in-out infinite',
            }} />
            <span style={{ fontSize: 12, color: '#6b7280' }}>Optimising portfolio…</span>
          </div>
        )}
        {portfolio && !loading && (
          <span style={{ fontSize: 12, color: '#9ca3af' }}>
            Last updated {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: '#4f46e5', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 600,
          }}>QP</div>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>Quantum Pulse</span>
        </div>
      </div>
    </header>
  )
}
