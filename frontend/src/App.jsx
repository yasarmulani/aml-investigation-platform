import React, { useState, useEffect } from 'react'
import Topbar from './components/Topbar.jsx'
import Sidebar from './components/Sidebar.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Queue from './pages/Queue.jsx'
import AnalyticsPage from './pages/Analytics.jsx'
import CasePanel from './components/CasePanel.jsx'
import { api } from './utils/api.js'

export default function App() {
  const [view, setView]             = useState('dashboard')
  const [portfolio, setPortfolio]   = useState(null)
  const [loading, setLoading]       = useState(false)
  const [progress, setProgress]     = useState(false)
  const [openCase, setOpenCase]     = useState(null)
  const [caseDetail, setCaseDetail] = useState(null)
  const [caseLoading, setCaseLoading] = useState(false)
  const [K, setK]                   = useState(5)
  const [analytics, setAnalytics]   = useState(null)

  // Load analytics once
  useEffect(() => {
    api.get('/api/analytics').then(d => setAnalytics(d)).catch(() => {})
  }, [])

  const generatePortfolio = async (k = K) => {
    setLoading(true)
    setProgress(true)
    try {
      const data = await api.post('/api/portfolio', { K: k, lambda_risk: 1.0, lambda_overlap: 2.0, lambda_budget: 4.0 })
      setPortfolio(data)
      setView('queue')
    } finally {
      setLoading(false)
      setTimeout(() => setProgress(false), 300)
    }
  }

  const openCaseDetail = async (patternId) => {
    setOpenCase(patternId)
    setCaseDetail(null)
    setCaseLoading(true)
    try {
      const data = await api.get(`/api/case/${patternId}`)
      setCaseDetail(data)
    } finally {
      setCaseLoading(false)
    }
  }

  const closeCase = () => { setOpenCase(null); setCaseDetail(null) }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#fff' }}>
      {/* Top progress bar */}
      {progress && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 2, background: '#eef2ff', zIndex: 9999, overflow: 'hidden' }}>
          <div className="progress-shimmer" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '100%', background: '#4f46e5', opacity: 0.8 }} />
        </div>
      )}

      {/* Topbar */}
      <Topbar portfolio={portfolio} loading={loading} />

      <div style={{ display: 'flex', flex: 1, paddingTop: 56 }}>
        {/* Sidebar */}
        <Sidebar view={view} setView={setView} portfolio={portfolio} />

        {/* Main content */}
        <main style={{ flex: 1, marginLeft: 240, minHeight: 'calc(100vh - 56px)', overflowY: 'auto' }}>
          {view === 'dashboard' && (
            <Dashboard
              K={K} setK={setK}
              onGenerate={generatePortfolio}
              loading={loading}
              portfolio={portfolio}
              analytics={analytics}
            />
          )}
          {view === 'queue' && (
            <Queue
              portfolio={portfolio}
              onOpenCase={openCaseDetail}
              onGenerate={() => generatePortfolio(K)}
              loading={loading}
              K={K}
            />
          )}
          {view === 'analytics' && (
            <AnalyticsPage analytics={analytics} />
          )}
        </main>
      </div>

      {/* Case detail panel overlay */}
      {openCase && (
        <CasePanel
          patternId={openCase}
          detail={caseDetail}
          loading={caseLoading}
          onClose={closeCase}
        />
      )}
    </div>
  )
}
