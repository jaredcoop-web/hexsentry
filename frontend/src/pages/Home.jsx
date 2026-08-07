import { useEffect, useState } from 'react'
import api from '../api'

const PAGES = [
  { id: 'dashboard',        icon: '📊', label: 'Dashboard' },
  { id: 'sales',            icon: '🚗', label: 'Sales' },
  { id: 'add-sale',         icon: '➕', label: 'Add Sale' },
  { id: 'jobs',             icon: '🔧', label: 'Jobs' },
  { id: 'add-job',          icon: '🔩', label: 'Add Job' },
  { id: 'inventory',        icon: '📦', label: 'Inventory' },
  { id: 'dealer-inventory', icon: '🚙', label: 'Lot' },
  { id: 'reviews',          icon: '⭐', label: 'Reviews' },
  { id: 'finances',         icon: '💰', label: 'Finances' },
  { id: 'fi',               icon: '💼', label: 'F&I' },
  { id: 'ai',               icon: '🤖', label: 'AI Chat' },
  { id: 'email',            icon: '📧', label: 'Email' },
  { id: 'payments',         icon: '💳', label: 'Payments' },
]

export default function Home({ user, setCurrentPage, isMobile }) {
  const [kpis, setKpis]     = useState(null)
  const [alerts, setAlerts] = useState([])
  const [sales, setSales]   = useState(null)
  const [stats, setStats]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [kpiRes, alertRes, salesRes, statsRes] = await Promise.all([
          api.get('/kpis'),
          api.get('/anomalies'),
          api.get('/sales'),
          api.get('/stats'),
        ])
        setKpis(kpiRes.data)
        setAlerts(alertRes.data.alerts || [])
        setSales(salesRes.data)
        setStats(statsRes.data)
      } catch {}
      setLoading(false)
    }
    load()
  }, [])

  const fmt = (n) => n != null ? `$${Number(n).toLocaleString()}` : 'N/A'

  const hour     = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const topPerformer = sales?.leaderboard?.[0]

  return (
    <div style={{ fontFamily: 'Arial, sans-serif' }}>

      {/* Greeting */}
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ color: '#C0C0C0', margin: '0 0 4px', fontSize: isMobile ? '20px' : '26px' }}>
          {greeting}, {user?.business_name} 👋
        </h1>
        <p style={{ color: '#555', margin: 0, fontSize: '13px' }}>Here's your business at a glance</p>
      </div>

      {/* KPI Row */}
      {!loading && kpis && (
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
          {[
            { label: 'Total Sales',    value: kpis?.sales?.total_sales || 0 },
            { label: 'Total Gross',    value: fmt(kpis?.sales?.total_gross), color: '#2ecc71' },
            { label: 'Avg Gross/Deal', value: fmt(kpis?.sales?.avg_gross) },
            { label: 'Stale Units',    value: kpis?.inventory?.stale || 0, color: kpis?.inventory?.stale > 0 ? '#e74c3c' : '#2ecc71' },
            { label: 'Avg Rating',     value: `⭐ ${kpis?.reviews?.avg_rating || 'N/A'}`, color: '#f39c12' },
          ].map((k, i) => (
            <div key={i} style={{ background: '#1A1A2E', border: '1px solid #333', borderRadius: '8px', padding: '14px 16px', flex: '1 1', minWidth: isMobile ? 'calc(50% - 10px)' : '120px' }}>
              <p style={{ color: '#666', fontSize: '11px', margin: '0 0 6px', textTransform: 'uppercase' }}>{k.label}</p>
              <p style={{ color: k.color || '#C0C0C0', fontSize: isMobile ? '18px' : '22px', fontWeight: 'bold', margin: 0 }}>{k.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Quick Access — compact */}
      <div style={{ marginBottom: '20px' }}>
        <p style={{ color: '#444', fontSize: '11px', textTransform: 'uppercase', margin: '0 0 8px' }}>Quick Access</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {PAGES.map((p, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(p.id)}
              style={{ background: '#1A1A2E', border: '1px solid #222', borderRadius: '8px', padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#4a9eff'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#222'}
            >
              <span style={{ fontSize: '14px' }}>{p.icon}</span>
              <span style={{ color: '#999', fontSize: '12px' }}>{p.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Quick Stats */}
      {!loading && stats && !stats.error && (
        <div style={{ background: '#1A1A2E', border: '1px solid #333', borderRadius: '8px', padding: '16px 20px', marginBottom: '20px' }}>
          <p style={{ color: '#444', fontSize: '11px', textTransform: 'uppercase', margin: '0 0 12px' }}>📈 This Month at a Glance</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {topPerformer && (
              <p style={{ color: '#C0C0C0', fontSize: '14px', margin: 0 }}>
                🏆 <span style={{ color: '#666' }}>Top performer:</span> <strong>{topPerformer.salesperson}</strong> — {fmt(topPerformer.gross)} ({topPerformer.deals} {topPerformer.deals === 1 ? 'deal' : 'deals'})
              </p>
            )}
            {stats.mom_change !== null && stats.mom_change !== undefined && (
              <p style={{ color: '#C0C0C0', fontSize: '14px', margin: 0 }}>
                {stats.mom_change >= 0 ? '📈' : '📉'} <span style={{ color: '#666' }}>vs last month:</span> <strong style={{ color: stats.mom_change >= 0 ? '#2ecc71' : '#e74c3c' }}>{stats.mom_change >= 0 ? '+' : ''}{stats.mom_change}%</strong> revenue change
              </p>
            )}
            {stats.best_source && (
              <p style={{ color: '#C0C0C0', fontSize: '14px', margin: 0 }}>
                📍 <span style={{ color: '#666' }}>Best lead source:</span> <strong>{stats.best_source.lead_source}</strong> — {stats.best_source.deals} deals, {fmt(stats.best_source.gross)}
              </p>
            )}
            {stats.best_day && (
              <p style={{ color: '#C0C0C0', fontSize: '14px', margin: 0 }}>
                📅 <span style={{ color: '#666' }}>Busiest day:</span> <strong>{stats.best_day.day_name?.trim()}</strong> — {stats.best_day.deals} deals
              </p>
            )}
            {kpis?.inventory?.stale > 0 && (
              <p style={{ color: '#e74c3c', fontSize: '14px', margin: 0 }}>
                ⚠️ <strong>{kpis.inventory.stale} items</strong> sitting 60+ days — consider price reductions
              </p>
            )}
          </div>
        </div>
      )}

      {/* Latest Alerts */}
      <div>
        <p style={{ color: '#444', fontSize: '11px', textTransform: 'uppercase', margin: '0 0 10px' }}>🔍 Latest Alerts</p>
        {alerts.length === 0 ? (
          <div style={{ background: '#0d2d15', border: '1px solid #27ae60', borderRadius: '8px', padding: '14px 16px' }}>
            <p style={{ color: '#2ecc71', margin: 0, fontSize: '14px' }}>✅ All clear — no anomalies detected.</p>
          </div>
        ) : (
          alerts.slice(0, 4).map((a, i) => {
            const colors = {
              critical: { bg: '#2d1515', border: '#c0392b', text: '#e74c3c', icon: '🔴' },
              warning:  { bg: '#2d2010', border: '#e67e22', text: '#f39c12', icon: '🟡' },
              positive: { bg: '#0d2d15', border: '#27ae60', text: '#2ecc71', icon: '🟢' },
            }
            const c = colors[a.level] || colors.warning
            return (
              <div key={i} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: '8px', padding: '12px 14px', marginBottom: '8px' }}>
                <p style={{ color: c.text, margin: '0 0 4px', fontWeight: 'bold', fontSize: '13px' }}>
                  {c.icon} [{a.category}] {a.title}
                </p>
                <p style={{ color: '#999', margin: 0, fontSize: '12px' }}>{a.detail}</p>
              </div>
            )
          })
        )}
      </div>

    </div>
  )
}
