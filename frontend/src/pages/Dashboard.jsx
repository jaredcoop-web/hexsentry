import { useEffect, useState } from 'react'
import api from '../api'

function KPICard({ label, value, color }) {
  return (
    <div style={{
      background: '#1A1A2E',
      border: '1px solid #333',
      borderRadius: '8px',
      padding: '20px',
      flex: 1,
      minWidth: '140px',
    }}>
      <p style={{ color: '#666', fontSize: '12px', margin: '0 0 8px', textTransform: 'uppercase' }}>{label}</p>
      <p style={{ color: color || '#C0C0C0', fontSize: '24px', fontWeight: 'bold', margin: 0 }}>{value}</p>
    </div>
  )
}

function Alert({ alert }) {
  const colors = {
    critical: { bg: '#2d1515', border: '#c0392b', text: '#e74c3c', icon: '🔴' },
    warning:  { bg: '#2d2010', border: '#e67e22', text: '#f39c12', icon: '🟡' },
    positive: { bg: '#0d2d15', border: '#27ae60', text: '#2ecc71', icon: '🟢' },
  }
  const c = colors[alert.level] || colors.warning

  return (
    <div style={{
      background: c.bg,
      border: `1px solid ${c.border}`,
      borderRadius: '8px',
      padding: '14px 16px',
      marginBottom: '10px',
    }}>
      <p style={{ color: c.text, margin: '0 0 4px', fontWeight: 'bold', fontSize: '14px' }}>
        {c.icon} [{alert.category}] {alert.title}
      </p>
      <p style={{ color: '#999', margin: 0, fontSize: '13px' }}>{alert.detail}</p>
    </div>
  )
}

export default function Dashboard({ user }) {
  const [kpis, setKpis]       = useState(null)
  const [alerts, setAlerts]   = useState([])
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
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const fmt = (n) => n != null ? `$${Number(n).toLocaleString()}` : 'N/A'

  if (loading) return <p style={{ color: '#666', padding: '40px' }}>Loading your dashboard...</p>

  return (
    <div style={{ fontFamily: 'Arial, sans-serif' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ color: '#C0C0C0', margin: '0 0 4px', fontSize: '24px' }}>
          📍 {user?.business_name}
        </h1>
        <p style={{ color: '#555', margin: 0, fontSize: '13px' }}>
          Welcome back — here's your business at a glance
        </p>
      </div>

      {/* KPI Row */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '32px' }}>
        <KPICard label="Total Sales"      value={kpis?.sales?.total_sales || 0} />
        <KPICard label="Total Gross"      value={fmt(kpis?.sales?.total_gross)} color="#2ecc71" />
        <KPICard label="Avg Gross/Deal"   value={fmt(kpis?.sales?.avg_gross)} />
        <KPICard label="Stale Units"      value={kpis?.inventory?.stale || 0} color="#e74c3c" />
        <KPICard label="Avg Rating"       value={`⭐ ${kpis?.reviews?.avg_rating || 'N/A'}`} color="#f39c12" />
      </div>

      {/* Alerts */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ color: '#C0C0C0', fontSize: '18px', marginBottom: '16px' }}>
          🔍 HexGuard Alerts
        </h2>
        {alerts.length === 0 ? (
          <div style={{ background: '#0d2d15', border: '1px solid #27ae60', borderRadius: '8px', padding: '14px 16px' }}>
            <p style={{ color: '#2ecc71', margin: 0 }}>✅ All clear — no anomalies detected right now.</p>
          </div>
        ) : (
          alerts.map((a, i) => <Alert key={i} alert={a} />)
        )}
      </div>
    </div>
  )
}
