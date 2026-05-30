import { useEffect, useState } from 'react'
import api from '../api'

const PAGES = [
  { id: 'dashboard',  icon: '📊', label: 'Dashboard',     desc: 'KPIs and alerts' },
  { id: 'sales',      icon: '🚗', label: 'Sales',         desc: 'Track your deals' },
  { id: 'add-sale',   icon: '➕', label: 'Add Sale',      desc: 'Log a new sale' },
  { id: 'inventory',  icon: '📦', label: 'Inventory',     desc: 'Stock and age tracking' },
  { id: 'reviews',    icon: '⭐', label: 'Reviews',       desc: 'Google reputation' },
  { id: 'finances',   icon: '💰', label: 'Finances',      desc: 'Cash flow tracking' },
  { id: 'fi',         icon: '💼', label: 'F&I',           desc: 'Backend income' },
  { id: 'ai',         icon: '🤖', label: 'AI Chat',       desc: 'Ask anything' },
  { id: 'email',      icon: '📧', label: 'Email Report',  desc: 'Weekly summary' },
  { id: 'payments',   icon: '💳', label: 'Payments',      desc: 'Square & Stripe' },
]

export default function Home({ user, setPage }) {
  const [kpis, setKpis]     = useState(null)
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [kpiRes, alertRes] = await Promise.all([
          api.get('/kpis'),
          api.get('/anomalies'),
        ])
        setKpis(kpiRes.data)
        setAlerts(alertRes.data.alerts || [])
      } catch {}
      setLoading(false)
    }
    load()
  }, [])

  const fmt = (n) => n != null ? `$${Number(n).toLocaleString()}` : 'N/A'

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div style={{ fontFamily: 'Arial, sans-serif' }}>

      {/* Greeting */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ color: '#C0C0C0', margin: '0 0 4px', fontSize: '28px' }}>
          {greeting}, {user?.business_name} 👋
        </h1>
        <p style={{ color: '#555', margin: 0, fontSize: '14px' }}>
          Here's your business at a glance
        </p>
      </div>

      {/* KPI Row */}
      {!loading && kpis && (
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '32px' }}>
          {[
            { label: 'Total Sales',    value: kpis?.sales?.total_sales || 0 },
            { label: 'Total Gross',    value: fmt(kpis?.sales?.total_gross), color: '#2ecc71' },
            { label: 'Avg Gross/Deal', value: fmt(kpis?.sales?.avg_gross) },
            { label: 'Stale Units',    value: kpis?.inventory?.stale || 0, color: kpis?.inventory?.stale > 0 ? '#e74c3c' : '#2ecc71' },
            { label: 'Avg Rating',     value: `⭐ ${kpis?.reviews?.avg_rating || 'N/A'}`, color: '#f39c12' },
          ].map((k, i) => (
            <div key={i} style={{ background: '#1A1A2E', border: '1px solid #333', borderRadius: '8px', padding: '16px 20px', flex: 1, minWidth: '120px' }}>
              <p style={{ color: '#666', fontSize: '11px', margin: '0 0 6px', textTransform: 'uppercase' }}>{k.label}</p>
              <p style={{ color: k.color || '#C0C0C0', fontSize: '22px', fontWeight: 'bold', margin: 0 }}>{k.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Quick Access */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ color: '#C0C0C0', fontSize: '16px', marginBottom: '16px' }}>Quick Access</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
          {PAGES.map((p, i) => (
            <button
              key={i}
              onClick={() => setPage(p.id)}
              style={{
                background: '#1A1A2E',
                border: '1px solid #333',
                borderRadius: '10px',
                padding: '20px 12px',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'border-color 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#4a9eff'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#333'}
            >
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>{p.icon}</div>
              <p style={{ color: '#C0C0C0', fontSize: '13px', fontWeight: 'bold', margin: '0 0 4px' }}>{p.label}</p>
              <p style={{ color: '#555', fontSize: '11px', margin: 0 }}>{p.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Alerts */}
      <div>
        <h2 style={{ color: '#C0C0C0', fontSize: '16px', marginBottom: '16px' }}>🔍 Latest Alerts</h2>
        {alerts.length === 0 ? (
          <div style={{ background: '#0d2d15', border: '1px solid #27ae60', borderRadius: '8px', padding: '14px 16px' }}>
            <p style={{ color: '#2ecc71', margin: 0 }}>✅ All clear — no anomalies detected.</p>
          </div>
        ) : (
          alerts.slice(0, 3).map((a, i) => {
            const colors = {
              critical: { bg: '#2d1515', border: '#c0392b', text: '#e74c3c', icon: '🔴' },
              warning:  { bg: '#2d2010', border: '#e67e22', text: '#f39c12', icon: '🟡' },
              positive: { bg: '#0d2d15', border: '#27ae60', text: '#2ecc71', icon: '🟢' },
            }
            const c = colors[a.level] || colors.warning
            return (
              <div key={i} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: '8px', padding: '14px 16px', marginBottom: '10px' }}>
                <p style={{ color: c.text, margin: '0 0 4px', fontWeight: 'bold', fontSize: '14px' }}>
                  {c.icon} [{a.category}] {a.title}
                </p>
                <p style={{ color: '#999', margin: 0, fontSize: '13px' }}>{a.detail}</p>
              </div>
            )
          })
        )}
      </div>

    </div>
  )
}
