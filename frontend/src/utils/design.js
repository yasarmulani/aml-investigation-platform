export const TYPOLOGY_NAMES = {
  'GATHER-SCATTER': 'Gather-Scatter',
  'STACK':          'Stack',
  'SCATTER-GATHER': 'Scatter-Gather',
}

export const TYPOLOGY_DESC = {
  'GATHER-SCATTER': 'Funds pooled from multiple sources then dispersed through layered accounts to obscure origin.',
  'STACK':          'Value moved sequentially through a chain of transfer hubs to create distance from source.',
  'SCATTER-GATHER': 'Transactions fragmented across many accounts then re-consolidated at a collection point.',
}

export const TYPOLOGY_COLOR = {
  'GATHER-SCATTER': '#4f46e5',
  'STACK':          '#0891b2',
  'SCATTER-GATHER': '#7c3aed',
}

export function riskLevel(score) {
  if (score >= 50) return { label: 'High risk',   bg: '#fef2f2', fg: '#b91c1c' }
  if (score >= 20) return { label: 'Medium risk', bg: '#fefce8', fg: '#854d0e' }
  return              { label: 'Low risk',    bg: '#f0fdf4', fg: '#166534' }
}

export function fmt(n, dec = 0) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: dec }).format(n)
}

export function fmtUSD(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

export function fmtDate(s) {
  try { return new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) }
  catch { return s }
}

export function pct(n) { return (n * 100).toFixed(1) + '%' }
