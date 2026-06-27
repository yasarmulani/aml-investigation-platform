import React, { useState } from 'react'
import { pct } from '../utils/design.js'

export default function AnalyticsPage({ analytics }) {
  const [section, setSection] = useState('orbit')

  if (!analytics) {
    return (
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '48px 40px' }}>
        <div className="skeleton" style={{ height: 20, width: 200, background: '#f3f4f6', borderRadius: 4 }} />
      </div>
    )
  }

  const SECTIONS = [
    { id: 'orbit',    label: 'ORBIT Results' },
    { id: 'pipeline', label: 'Pipeline Audit' },
    { id: 'typology', label: 'Typology Recovery' },
    { id: 'lambda',   label: 'Stability Tradeoff' },
  ]

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '48px 40px' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.03em', marginBottom: 6 }}>
          Analytics
        </h1>
        <p style={{ fontSize: 13, color: '#6b7280' }}>
          Stage 2 and Stage 3 research findings
        </p>
      </div>

      {/* Section tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #f3f4f6', marginBottom: 32 }}>
        {SECTIONS.map(s => (
          <button
            key={s.id}
            onClick={() => setSection(s.id)}
            style={{
              padding: '10px 18px', fontSize: 13, fontWeight: 500,
              border: 'none', background: 'none', cursor: 'pointer',
              color: section === s.id ? '#0a0a0a' : '#9ca3af',
              borderBottom: section === s.id ? '2px solid #0a0a0a' : '2px solid transparent',
              marginBottom: -1, transition: 'color 0.1s',
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {section === 'orbit'    && <ORBITSection analytics={analytics} />}
      {section === 'pipeline' && <PipelineSection analytics={analytics} />}
      {section === 'typology' && <TypologySection analytics={analytics} />}
      {section === 'lambda'   && <LambdaSection analytics={analytics} />}
    </div>
  )
}

function ORBITSection({ analytics }) {
  const rs  = analytics.run_summary || {}
  const s3r = analytics.stage3_results || []
  const s3b = analytics.stage3_robustness || []

  const METHOD_LABELS = {
    'exact_fixed_k_optimum':   'Exact fixed-K',
    'static_qubo_greedy':      'QUBO Greedy',
    'orbit_best_raw_feasible': 'ORBIT best raw',
    'orbit_energy_repaired':   'ORBIT repaired',
    'openjij_sa_100_reads':    'OpenJij SA (100 reads)',
    'risk_greedy':             'Risk Greedy',
    'overlap_aware_greedy':    'Overlap-Aware Greedy',
  }

  return (
    <div className="fade-up">
      <div style={{ background: '#fafafa', border: '1px solid #f3f4f6', borderRadius: 10, padding: '16px 20px', marginBottom: 24, fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>
        <strong style={{ color: '#0a0a0a' }}>ORBIT</strong> is the Quantum Dice probabilistic p-bit simulator.
        Stage 3 runs the exact same QUBO across 20 independent seeds with solver-aware normalisation (max|Q|=1.0).
        Per competition guidelines ORBIT cannot be deployed publicly — results shown are precomputed from
        <code style={{ background: '#f3f4f6', padding: '1px 5px', borderRadius: 3, fontSize: 11 }}> stage3_submission_EXECUTED.ipynb</code>.
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: '#f3f4f6', borderRadius: 10, overflow: 'hidden', marginBottom: 28 }}>
        {[
          { label: 'Raw K=5 feasibility', value: `${(rs.raw_feasibility_rate * 100).toFixed(0)}%`, note: 'across 20 seeds' },
          { label: 'Best gap above exact', value: '0.68%', note: '0.6977 / 102.07 energy' },
          { label: 'Best raw F1', value: '0.471', note: 'vs OpenJij SA 0.118' },
        ].map(({ label, value, note }) => (
          <div key={label} style={{ background: '#fff', padding: '18px 18px' }}>
            <div style={{ fontSize: 22, fontWeight: 600, color: '#0a0a0a', letterSpacing: '-0.03em' }}>{value}</div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 3 }}>{label}</div>
            <div style={{ fontSize: 11, color: '#d1d5db', marginTop: 2 }}>{note}</div>
          </div>
        ))}
      </div>

      {/* Results table */}
      <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
        Solver comparison — K=5, N=30
      </div>
      <div style={{ border: '1px solid #f3f4f6', borderRadius: 10, overflow: 'hidden', marginBottom: 28 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
              {['Method','Energy','Gap to exact','F1','Jaccard','Acct Jaccard','Overlap'].map(h => (
                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {s3r.map((r, i) => {
              const isOrbit = r.method?.includes('orbit')
              const isExact = r.method?.includes('exact')
              return (
                <tr key={i} style={{ borderBottom: '1px solid #fafafa', background: (isOrbit || isExact) ? '#fafafa' : '#fff' }}>
                  <td style={{ padding: '9px 12px', fontWeight: (isOrbit || isExact) ? 500 : 400, color: '#0a0a0a' }}>
                    {METHOD_LABELS[r.method] || r.method}
                  </td>
                  <td style={{ padding: '9px 12px', fontFamily: 'monospace', color: '#374151' }}>{r.energy?.toFixed(3)}</td>
                  <td style={{ padding: '9px 12px', color: '#374151' }}>{r.optimality_gap != null ? r.optimality_gap.toFixed(3) : '—'}</td>
                  <td style={{ padding: '9px 12px', fontWeight: 500, color: r.f1 > 0.4 ? '#166534' : '#374151' }}>{r.f1?.toFixed(3)}</td>
                  <td style={{ padding: '9px 12px', color: '#374151' }}>{r.jaccard?.toFixed(3)}</td>
                  <td style={{ padding: '9px 12px', color: '#374151' }}>{r.account_coverage?.toFixed(3)}</td>
                  <td style={{ padding: '9px 12px', color: r.overlap > 0 ? '#b91c1c' : '#374151' }}>{r.overlap?.toFixed(1)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Robustness */}
      <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
        95% confidence intervals — 20 seeds
      </div>
      <div style={{ border: '1px solid #f3f4f6', borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
              {['Metric','Mean','Std','95% CI'].map(h => (
                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {s3b.map((r, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #fafafa' }}>
                <td style={{ padding: '9px 12px', fontWeight: 500, color: '#374151' }}>{r.metric}</td>
                <td style={{ padding: '9px 12px', fontFamily: 'monospace', color: '#374151' }}>{r.mean?.toFixed(3)}</td>
                <td style={{ padding: '9px 12px', color: '#9ca3af' }}>{r.std?.toFixed(3)}</td>
                <td style={{ padding: '9px 12px', color: '#6b7280' }}>{r.ci95_low?.toFixed(3)} – {r.ci95_high?.toFixed(3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: 11, color: '#d1d5db', marginTop: 10 }}>
        Source: stage3_final_results.csv · stage3_statistical_robustness.csv · stage3_run_summary.json
      </p>
    </div>
  )
}

function PipelineSection({ analytics }) {
  const audit = analytics.audit || []
  return (
    <div className="fade-up">
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#0a0a0a', marginBottom: 6 }}>
          Candidate generator audit
        </div>
        <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>
          Quantifying how much of the detection quality comes from candidate generation vs QUBO optimisation.
          The full IBM AML graph has laundering density 0.10%. The top-30 candidate pool achieves 2.43% — a 23.8× enrichment before any optimisation.
        </p>
      </div>

      <div style={{ border: '1px solid #f3f4f6', borderRadius: 10, overflow: 'hidden', marginBottom: 24 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
              {['Stage','Regions','Relevant','Laund. Density','Enrichment vs Graph'].map(h => (
                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {audit.map((r, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #fafafa', background: i === 1 ? '#fafafa' : '#fff' }}>
                <td style={{ padding: '10px 12px', fontWeight: 500, color: '#0a0a0a' }}>{r.Stage}</td>
                <td style={{ padding: '10px 12px', color: '#374151' }}>{r.Regions_Considered || '—'}</td>
                <td style={{ padding: '10px 12px', color: '#374151' }}>{r.Relevant_Regions || '—'}</td>
                <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: '#374151' }}>
                  {r.Laundering_Density ? (r.Laundering_Density * 100).toFixed(3) + '%' : '—'}
                </td>
                <td style={{ padding: '10px 12px', fontWeight: 500, color: r.Density_Enrichment_vs_Full_Graph > 1 ? '#166534' : '#374151' }}>
                  {r.Density_Enrichment_vs_Full_Graph ? r.Density_Enrichment_vs_Full_Graph.toFixed(1) + '×' : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '16px 18px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#166534', marginBottom: 4 }}>Key finding</div>
        <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>
          Candidate generation creates the high-signal search space. QUBO optimisation then selects a constrained,
          diversified portfolio with even higher laundering density (6.4% at K=5, vs 2.4% in the full pool).
          The two stages are complementary — neither alone achieves the result.
        </p>
      </div>
    </div>
  )
}

function TypologySection({ analytics }) {
  const tr = analytics.typology_recovery || []
  const methods = [...new Set(tr.map(r => r.Method))]

  return (
    <div className="fade-up">
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#0a0a0a', marginBottom: 6 }}>
          Typology recovery by method
        </div>
        <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>
          Static QUBO at K=5 is the only method that recovers all three typology classes including SCATTER-GATHER,
          which risk-based methods consistently miss.
        </p>
      </div>
      <div style={{ border: '1px solid #f3f4f6', borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
              {['Method','Typology','Pool','Selected','TP','F1'].map(h => (
                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tr.map((r, i) => {
              const isQubo = r.Method?.includes('Static QUBO')
              return (
                <tr key={i} style={{ borderBottom: '1px solid #fafafa', background: isQubo ? '#fafafa' : '#fff' }}>
                  <td style={{ padding: '9px 12px', fontWeight: isQubo ? 500 : 400, color: '#0a0a0a', fontSize: 11 }}>{r.Method}</td>
                  <td style={{ padding: '9px 12px' }}>
                    <span style={{ fontSize: 11, background: '#f3f4f6', color: '#374151', borderRadius: 4, padding: '2px 7px', fontWeight: 500 }}>
                      {r.Typology}
                    </span>
                  </td>
                  <td style={{ padding: '9px 12px', color: '#6b7280' }}>{r.Relevant_Candidates_In_Pool}</td>
                  <td style={{ padding: '9px 12px', color: '#374151' }}>{r.Selected_Candidates}</td>
                  <td style={{ padding: '9px 12px', color: r.True_Positive_Candidates > 0 ? '#166534' : '#9ca3af', fontWeight: 500 }}>{r.True_Positive_Candidates}</td>
                  <td style={{ padding: '9px 12px', fontFamily: 'monospace', color: r.F1 > 0.5 ? '#166534' : '#374151', fontWeight: r.F1 > 0.5 ? 600 : 400 }}>
                    {r.F1?.toFixed(3)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function LambdaSection({ analytics }) {
  const la = analytics.k_baseline?.filter(r => r.K === 7) || []

  return (
    <div className="fade-up">
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#0a0a0a', marginBottom: 6 }}>
          K=7 headline result — QUBO vs greedy baselines
        </div>
        <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>
          At K=7, Static QUBO matches Risk Greedy on F1 (0.737) while achieving Jaccard=1.0, account
          coverage=1.0, and zero portfolio overlap — vs Jaccard=0.57 and overlap=4 for Risk Greedy.
          This is the core Stage 2 finding.
        </p>
      </div>

      {la.length > 0 && (
        <div style={{ border: '1px solid #f3f4f6', borderRadius: 10, overflow: 'hidden', marginBottom: 28 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                {['Method','F1','Jaccard','Acct Coverage','Overlap','Pattern IDs'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {la.map((r, i) => {
                const isQubo = r.Method?.includes('QUBO')
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #fafafa', background: isQubo ? '#fafafa' : '#fff' }}>
                    <td style={{ padding: '9px 12px', fontWeight: isQubo ? 600 : 400, color: '#0a0a0a' }}>{r.Method}</td>
                    <td style={{ padding: '9px 12px', fontWeight: 500, color: r.F1 > 0.7 ? '#166534' : '#374151' }}>{r.F1?.toFixed(3)}</td>
                    <td style={{ padding: '9px 12px', fontWeight: isQubo ? 600 : 400, color: r.Jaccard === 1 ? '#166534' : '#374151' }}>{r.Jaccard?.toFixed(3)}</td>
                    <td style={{ padding: '9px 12px', color: r.Account_Coverage === 1 ? '#166534' : '#374151' }}>{r.Account_Coverage?.toFixed(3)}</td>
                    <td style={{ padding: '9px 12px', color: r.Overlap > 0 ? '#b91c1c' : '#166534', fontWeight: 500 }}>{r.Overlap}</td>
                    <td style={{ padding: '9px 12px', fontFamily: 'monospace', color: '#9ca3af', fontSize: 11 }}>{r.Pattern_IDs}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 10, padding: '16px 18px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#4338ca', marginBottom: 4 }}>Why QUBO over greedy ranking?</div>
        <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>
          The value of QUBO is not raw F1 — a strong risk ranking baseline can match it on recovery.
          The value is multi-objective portfolio optimisation: same F1 as the best greedy method,
          but with full account coverage, zero case overlap, and complete typology coverage.
          Every investigation slot adds genuinely new information.
        </p>
      </div>
    </div>
  )
}
