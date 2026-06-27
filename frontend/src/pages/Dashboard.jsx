import React from 'react'
import { riskLevel, fmtUSD, pct, TYPOLOGY_NAMES } from '../utils/design.js'

const K_OPTIONS = [3, 5, 7, 10]

export default function Dashboard({ K, setK, onGenerate, loading, portfolio, analytics }) {
  const candidates = analytics?.candidates || []
  const relevant = candidates.filter(c => c.is_laundering_region)

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '48px 40px' }}>

      {/* Page header */}
      <div style={{ marginBottom: 40 }}>
        <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.03em', marginBottom: 6 }}>
          AML Investigation Dashboard
        </h1>
        <p style={{ fontSize: 13, color: '#6b7280' }}>
          QUBO-optimised suspicious region portfolio for compliance teams
        </p>
      </div>

      {/* Status banner if portfolio exists */}
      {portfolio && (
        <div style={{
          border: '1px solid #f3f4f6', borderRadius: 12, padding: '18px 22px',
          marginBottom: 32, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: '#fff',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#16a34a' }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#0a0a0a' }}>
                Portfolio ready — {portfolio.K} cases generated
              </div>
              <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
                {pct(portfolio.metrics.account_coverage)} account coverage &middot;&nbsp;
                {portfolio.metrics.overlap} overlap &middot;&nbsp;
                {portfolio.metrics.typologies.length} typologies &middot;&nbsp;
                {portfolio.runtime_ms}ms compute
              </div>
            </div>
          </div>
          <button
            onClick={() => {}}
            style={{
              fontSize: 12, color: '#4f46e5', fontWeight: 500,
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            }}
          >
            View queue →
          </button>
        </div>
      )}

      {/* Generate section */}
      <div style={{
        border: '1px solid #f3f4f6', borderRadius: 12,
        padding: '28px 28px', marginBottom: 32,
      }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14 }}>
          Investigation budget
        </div>
        <p style={{ fontSize: 14, color: '#374151', marginBottom: 20, lineHeight: 1.6 }}>
          How many cases can your compliance team investigate this period?
        </p>

        <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
          {K_OPTIONS.map(k => (
            <button
              key={k}
              onClick={() => setK(k)}
              style={{
                flex: 1, padding: '14px 0', textAlign: 'center',
                border: K === k ? '2px solid #4f46e5' : '1px solid #e5e7eb',
                borderRadius: 9, cursor: 'pointer',
                background: K === k ? '#eef2ff' : '#fff',
                color: K === k ? '#4f46e5' : '#374151',
                fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em',
                transition: 'all 0.1s',
              }}
            >
              {k}
              <div style={{ fontSize: 11, fontWeight: 400, color: K === k ? '#6366f1' : '#9ca3af', marginTop: 3 }}>
                {k === 3 ? 'Focused' : k === 5 ? 'Standard' : k === 7 ? 'Extended' : 'Full review'}
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={() => onGenerate(K)}
          disabled={loading}
          style={{
            width: '100%', height: 50, borderRadius: 9, border: 'none',
            background: loading ? '#374151' : '#0a0a0a',
            color: '#fff', fontSize: 14, fontWeight: 500,
            cursor: loading ? 'not-allowed' : 'pointer',
            letterSpacing: '-0.01em', transition: 'background 0.15s',
          }}
        >
          {loading ? 'Optimising portfolio…' : `Generate ${K} investigation cases`}
        </button>
        <p style={{ fontSize: 11, color: '#d1d5db', marginTop: 10, textAlign: 'center' }}>
          Exact QUBO optimisation · N=30 candidates · IBM AML ground-truth labels
        </p>
      </div>

      {/* Candidate pool overview */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 16 }}>
          Candidate pool
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: '#f3f4f6', borderRadius: 10, overflow: 'hidden' }}>
          {[
            { label: 'Candidate regions', value: candidates.length || 30 },
            { label: 'Laundering regions', value: relevant.length || 12 },
            { label: 'Pattern typologies', value: 3 },
            { label: 'Monitoring windows', value: 3 },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: '#fff', padding: '16px 18px' }}>
              <div style={{ fontSize: 22, fontWeight: 600, color: '#0a0a0a', letterSpacing: '-0.03em' }}>{value}</div>
              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 3 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Top candidates preview */}
      {candidates.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 16 }}>
            Highest-risk candidates
          </div>
          <div style={{ border: '1px solid #f3f4f6', borderRadius: 10, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                  {['Pattern', 'Typology', 'Risk Score', 'Flagged Txns', 'Accounts', 'Volume'].map(h => (
                    <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {candidates.slice(0, 8).map((c, i) => {
                  const rl = riskLevel(c.risk_score)
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid #fafafa' }}>
                      <td style={{ padding: '9px 14px', fontWeight: 500, color: '#0a0a0a' }}>#{c.pattern_id}</td>
                      <td style={{ padding: '9px 14px' }}>
                        <span style={{ background: '#f3f4f6', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 500, color: '#374151' }}>
                          {TYPOLOGY_NAMES[c.pattern_type] || c.pattern_type}
                        </span>
                      </td>
                      <td style={{ padding: '9px 14px' }}>
                        <span style={{ background: rl.bg, color: rl.fg, borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>
                          {c.risk_score.toFixed(1)}
                        </span>
                      </td>
                      <td style={{ padding: '9px 14px', color: c.laundering_edges > 0 ? '#b91c1c' : '#9ca3af', fontWeight: c.laundering_edges > 0 ? 500 : 400 }}>
                        {c.laundering_edges}
                      </td>
                      <td style={{ padding: '9px 14px', color: '#6b7280' }}>{c.region_nodes}</td>
                      <td style={{ padding: '9px 14px', color: '#6b7280' }}>{fmtUSD(c.transaction_volume)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
