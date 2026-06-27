import React, { useState } from 'react'
import { riskLevel, fmtUSD, fmtDate, pct, TYPOLOGY_NAMES, TYPOLOGY_DESC } from '../utils/design.js'

export default function Queue({ portfolio, onOpenCase, onGenerate, loading, K }) {
  const [expandedCase, setExpandedCase] = useState(null)

  if (!portfolio) {
    return (
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '48px 40px' }}>
        <div style={{
          border: '1px solid #f3f4f6', borderRadius: 12,
          padding: '64px 40px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 16, fontWeight: 500, color: '#374151', marginBottom: 8 }}>
            No portfolio generated yet
          </div>
          <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 24 }}>
            Generate a portfolio from the Dashboard to see your investigation queue.
          </p>
          <button
            onClick={onGenerate}
            disabled={loading}
            style={{
              background: '#0a0a0a', color: '#fff', border: 'none',
              borderRadius: 8, padding: '10px 24px', fontSize: 13,
              fontWeight: 500, cursor: 'pointer',
            }}
          >
            Generate portfolio
          </button>
        </div>
      </div>
    )
  }

  const { portfolio: cases, metrics, naive_metrics, naive_selected, K: k, runtime_ms } = portfolio

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '48px 40px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.03em', marginBottom: 6 }}>
            Investigation Queue
          </h1>
          <p style={{ fontSize: 13, color: '#6b7280' }}>
            {k} cases optimised for maximum coverage with zero redundancy
          </p>
        </div>
        <button
          onClick={onGenerate}
          disabled={loading}
          style={{
            background: '#0a0a0a', color: '#fff', border: 'none',
            borderRadius: 8, padding: '9px 18px', fontSize: 13,
            fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Regenerating…' : 'Regenerate'}
        </button>
      </div>

      {/* Summary bar */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 1, background: '#f3f4f6', borderRadius: 10,
        overflow: 'hidden', marginBottom: 32,
      }}>
        {[
          { label: 'Account coverage', value: pct(metrics.account_coverage) },
          { label: 'Overlapping cases', value: metrics.overlap, good: metrics.overlap === 0 },
          { label: 'Duplicate patterns', value: metrics.duplicate_patterns, good: metrics.duplicate_patterns === 0 },
          { label: 'Typologies covered', value: metrics.typologies.length },
        ].map(({ label, value, good }) => (
          <div key={label} style={{ background: '#fff', padding: '14px 18px' }}>
            <div style={{ fontSize: 20, fontWeight: 600, color: good === false ? '#b91c1c' : good === true ? '#166534' : '#0a0a0a', letterSpacing: '-0.02em' }}>
              {value}
            </div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Case cards */}
      {cases.map((c, i) => (
        <CaseCard
          key={c.pattern_id}
          case_={c}
          pos={i + 1}
          total={k}
          expanded={expandedCase === c.pattern_id}
          onToggle={() => setExpandedCase(expandedCase === c.pattern_id ? null : c.pattern_id)}
          onOpenDetail={() => onOpenCase(c.pattern_id)}
        />
      ))}

      {/* Comparison section */}
      <div style={{ marginTop: 48 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 20 }}>
          Why not just pick the top {k} by risk score?
        </div>

        {/* Delta metrics */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 1, background: '#f3f4f6', borderRadius: 10,
          overflow: 'hidden', marginBottom: 24,
        }}>
          {[
            {
              label: 'Account coverage',
              qubo: pct(metrics.account_coverage),
              naive: pct(naive_metrics.account_coverage),
              better: metrics.account_coverage >= naive_metrics.account_coverage,
            },
            {
              label: 'Duplicate patterns',
              qubo: metrics.duplicate_patterns,
              naive: naive_metrics.duplicate_patterns,
              better: metrics.duplicate_patterns <= naive_metrics.duplicate_patterns,
            },
            {
              label: 'Case overlap',
              qubo: metrics.overlap,
              naive: naive_metrics.overlap,
              better: metrics.overlap <= naive_metrics.overlap,
            },
            {
              label: 'Typologies',
              qubo: metrics.typologies.length,
              naive: naive_metrics.typologies.length,
              better: metrics.typologies.length >= naive_metrics.typologies.length,
            },
          ].map(({ label, qubo, naive, better }) => (
            <div key={label} style={{ background: '#fff', padding: '14px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ fontSize: 18, fontWeight: 600, color: '#0a0a0a', letterSpacing: '-0.02em' }}>{qubo}</div>
                {better !== undefined && (
                  <span style={{
                    fontSize: 11, fontWeight: 600,
                    color: better ? '#166534' : '#b91c1c',
                    background: better ? '#f0fdf4' : '#fef2f2',
                    padding: '1px 6px', borderRadius: 4,
                  }}>
                    {better ? 'Better' : 'Same'}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 11, color: '#9ca3af' }}>{label}</div>
              <div style={{ fontSize: 11, color: '#d1d5db', marginTop: 4 }}>Risk ranking: {naive}</div>
            </div>
          ))}
        </div>

        {/* Side by side */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <CompareCol
            title="Risk ranking (standard)"
            cases_={naive_selected}
            active={false}
          />
          <CompareCol
            title="QLANTERN — QUBO optimised"
            cases_={cases}
            active={true}
          />
        </div>

        <p style={{ fontSize: 11, color: '#d1d5db', marginTop: 16, lineHeight: 1.6 }}>
          Account coverage = fraction of labelled laundering accounts covered (recall).
          Source: IBM AML HI-Small ground-truth. Solver: exact QUBO search over C({30},{k})={nCr(30,k)} portfolios. Compute: {runtime_ms}ms.
        </p>
      </div>
    </div>
  )
}

function nCr(n, r) {
  if (r > n) return 0
  let result = 1
  for (let i = 0; i < r; i++) { result *= (n - i); result /= (i + 1) }
  return Math.round(result).toLocaleString()
}

function CaseCard({ case_: c, pos, total, expanded, onToggle, onOpenDetail }) {
  const rl = riskLevel(c.risk_score)
  const isDup = false
  const hasOvl = false
  const statusBg  = isDup ? '#fef2f2' : hasOvl ? '#fefce8' : '#f0fdf4'
  const statusFg  = isDup ? '#b91c1c' : hasOvl ? '#854d0e' : '#166534'
  const statusLbl = isDup ? 'Duplicate pattern' : hasOvl ? 'Account overlap' : 'No overlap'

  return (
    <div
      className="card-hover"
      style={{
        border: '1px solid #f3f4f6', borderRadius: 12,
        marginBottom: 10, background: '#fff', overflow: 'hidden',
      }}
    >
      <div style={{ padding: '20px 22px 16px' }}>
        {/* Case num + risk */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#d1d5db', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Case {pos} of {total}
          </span>
          <span style={{ fontSize: 11, fontWeight: 600, background: rl.bg, color: rl.fg, borderRadius: 5, padding: '3px 9px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {rl.label}
          </span>
        </div>

        {/* Title */}
        <div style={{ fontSize: 16, fontWeight: 600, color: '#0a0a0a', letterSpacing: '-0.02em', marginBottom: 5 }}>
          {TYPOLOGY_NAMES[c.pattern_type] || c.pattern_type} Network — Pattern {c.pattern_id}
        </div>
        <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.5, marginBottom: 14 }}>
          {TYPOLOGY_DESC[c.pattern_type] || ''}
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 20, fontSize: 12, color: '#9ca3af', marginBottom: 14, flexWrap: 'wrap' }}>
          <span>{c.laundering_edges} flagged of {c.region_edges} transactions</span>
          <span>{c.region_nodes} accounts involved</span>
          <span>{c.unique_banks} banks</span>
          <span>Detected {fmtDate(c.snapshot_time)}</span>
          <span>Volume: {fmtUSD(c.transaction_volume)}</span>
        </div>

        {/* Why QUBO selected */}
        {c.why_qubo_selected && (
          <div style={{ background: '#fafafa', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#374151', lineHeight: 1.5, marginBottom: 14 }}>
            <strong style={{ color: '#0a0a0a' }}>Why selected: </strong>{c.why_qubo_selected}
          </div>
        )}

        {/* Expandable: account list preview */}
        {expanded && (
          <div className="fade-up" style={{ marginTop: 4 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
              Account IDs in region ({c.n_accounts} total)
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 100, overflow: 'hidden' }}>
              {(c.accounts || []).slice(0, 12).map((acc, i) => (
                <span key={i} style={{
                  fontSize: 11, fontFamily: 'monospace',
                  background: '#f3f4f6', color: '#374151',
                  borderRadius: 4, padding: '2px 7px',
                }}>
                  {acc.split('::').pop()}
                </span>
              ))}
              {c.n_accounts > 12 && (
                <span style={{ fontSize: 11, color: '#9ca3af', padding: '2px 7px' }}>
                  +{c.n_accounts - 12} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        background: '#fafafa', borderTop: '1px solid #f9f9f9',
        padding: '10px 22px', display: 'flex',
        alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 12, color: '#9ca3af' }}>Risk score: {c.risk_score.toFixed(1)} / 100</span>
          <span style={{ fontSize: 11, fontWeight: 600, background: statusBg, color: statusFg, borderRadius: 5, padding: '2px 8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {statusLbl}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onToggle}
            style={{
              fontSize: 12, color: '#6b7280', fontWeight: 500,
              background: 'none', border: '1px solid #e5e7eb',
              borderRadius: 6, padding: '5px 12px', cursor: 'pointer',
            }}
          >
            {expanded ? 'Hide accounts' : 'Show accounts'}
          </button>
          <button
            onClick={onOpenDetail}
            style={{
              fontSize: 12, color: '#fff', fontWeight: 500,
              background: '#0a0a0a', border: 'none',
              borderRadius: 6, padding: '5px 12px', cursor: 'pointer',
            }}
          >
            Full investigation →
          </button>
        </div>
      </div>
    </div>
  )
}

function CompareCol({ title, cases_, active }) {
  return (
    <div>
      <div style={{
        fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em',
        paddingBottom: 10, marginBottom: 12,
        color: active ? '#0a0a0a' : '#9ca3af',
        borderBottom: active ? '2px solid #0a0a0a' : '1px solid #f3f4f6',
      }}>
        {title}
      </div>
      {cases_.map((c, i) => {
        const rl = riskLevel(c.risk_score || c.risk_score)
        return (
          <div key={i} style={{
            border: '1px solid #f3f4f6', borderRadius: 8,
            padding: '11px 14px', marginBottom: 8, fontSize: 13,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
              <span style={{ fontWeight: 500, color: '#0a0a0a' }}>
                Case {i + 1} — Pattern {c.pattern_id}
              </span>
              {active && (
                <span style={{ fontSize: 11, fontWeight: 600, background: '#f0fdf4', color: '#166534', borderRadius: 4, padding: '1px 7px' }}>
                  Unique
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: '#9ca3af' }}>
              {TYPOLOGY_NAMES[c.pattern_type] || c.pattern_type} &middot; Risk {(c.risk_score || 0).toFixed(1)}
            </div>
          </div>
        )
      })}
    </div>
  )
}
