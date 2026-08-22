import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import api from '../api'
import { Car } from 'lucide-react'

export default function Sales({ isMobile }) {
  const [summary, setSummary]   = useState(null)
  const [sales, setSales]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [msg, setMsg]           = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const [sumRes, listRes] = await Promise.all([
        api.get('/sales'),
        api.get('/sales/list'),
      ])
      setSummary(sumRes.data)
      setSales(listRes.data || [])
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (id) => {
    try {
      const res = await api.delete(`/sales/${id}`)
      if (res.status === 200) {
        setMsg({ type: 'success', text: 'Sale deleted' })
        load()
      }
    } catch {
      setMsg({ type: 'error', text: 'Failed to delete' })
    }
  }

  const handleDeleteAll = async () => {
    if (!window.confirm('Delete ALL sales? This cannot be undone.')) return
    try {
      await api.delete('/sales')
      setMsg({ type: 'success', text: 'All sales cleared' })
      load()
    } catch { setMsg({ type: 'error', text: 'Failed to clear sales' }) }
  }

  const fmt = (n) => n != null ? `$${Number(n).toLocaleString()}` : 'N/A'

  if (loading) return <p style={{ color: '#666', padding: '40px' }}>Loading sales...</p>

  const monthlyData = summary?.monthly || []
  const leaderboard = summary?.leaderboard || []

  return (
    <div style={{ fontFamily: 'Arial, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '10px' }}>
        <h1 style={{ color: '#C0C0C0', margin: 0, fontSize: isMobile ? '20px' : '24px', display: 'flex', alignItems: 'center', gap: '10px' }}><Car size={22} /> Sales</h1>
        <button onClick={handleDeleteAll} style={{ padding: '8px 14px', background: 'transparent', color: '#e74c3c', border: '1px solid #e74c3c', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
          Clear All
        </button>
      </div>

      {msg && (
        <div style={{ background: msg.type === 'success' ? '#0d2d15' : '#2d1515', border: `1px solid ${msg.type === 'success' ? '#27ae60' : '#c0392b'}`, borderRadius: '6px', padding: '10px 14px', marginBottom: '16px', color: msg.type === 'success' ? '#2ecc71' : '#e74c3c', fontSize: '14px' }}>
          {msg.text}
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '24px' }}>
        {[
          { label: 'Total Sales',    value: summary?.total_sales || 0 },
          { label: 'Total Gross',    value: fmt(summary?.total_gross), color: '#2ecc71' },
          { label: 'BHPH Collected', value: fmt(summary?.bhph_collected), color: '#4a9eff' },
          { label: 'This Month',     value: summary?.this_month || 0 },
        ].map((k, i) => (
          <div key={i} style={{ background: '#1A1A2E', border: '1px solid #333', borderRadius: '8px', padding: '16px', flex: '1 1', minWidth: isMobile ? 'calc(50% - 10px)' : '120px' }}>
            <p style={{ color: '#666', fontSize: '11px', margin: '0 0 6px', textTransform: 'uppercase' }}>{k.label}</p>
            <p style={{ color: k.color || '#C0C0C0', fontSize: isMobile ? '18px' : '22px', fontWeight: 'bold', margin: 0 }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      {monthlyData.length > 0 && (
        <div style={{ background: '#1A1A2E', border: '1px solid #333', borderRadius: '8px', padding: '20px', marginBottom: '24px' }}>
          <h2 style={{ color: '#C0C0C0', fontSize: '15px', marginBottom: '16px' }}>Monthly Gross Profit</h2>
          <ResponsiveContainer width="100%" height={isMobile ? 180 : 220}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222" />
              <XAxis dataKey="month" stroke="#666" tick={{ fontSize: 11 }} />
              <YAxis stroke="#666" tick={{ fontSize: 11 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ background: '#1A1A2E', border: '1px solid #333', color: '#C0C0C0' }} formatter={v => [`$${Number(v).toLocaleString()}`, 'Gross']} />
              <Bar dataKey="gross" fill="#C0C0C0" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Leaderboard */}
      {leaderboard.length > 0 && (
        <div style={{ background: '#1A1A2E', border: '1px solid #333', borderRadius: '8px', padding: '20px', marginBottom: '24px' }}>
          <h2 style={{ color: '#C0C0C0', fontSize: '15px', marginBottom: '16px' }}>🏆 Leaderboard</h2>
          {leaderboard.map((sp, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #1a1a1a' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '16px' }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
                <span style={{ color: '#C0C0C0', fontSize: '14px' }}>{sp.salesperson}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ color: '#2ecc71', margin: 0, fontSize: '14px', fontWeight: 'bold' }}>{fmt(sp.gross)}</p>
                <p style={{ color: '#666', margin: 0, fontSize: '11px' }}>{sp.deals} deals</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sales table */}
      <div style={{ background: '#1A1A2E', border: '1px solid #333', borderRadius: '8px', padding: '20px' }}>
        <h2 style={{ color: '#C0C0C0', fontSize: '15px', marginBottom: '16px' }}>All Sales</h2>
        {sales.length === 0 ? (
          <p style={{ color: '#555', textAlign: 'center', padding: '20px' }}>No sales yet.</p>
        ) : (
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ minWidth: '650px', width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Date', 'Vehicle', 'Sale Price', 'Gross', 'Margin %', 'Salesperson', 'Lead Source', ''].map(h => (
                    <th key={h} style={{ color: '#666', fontSize: '11px', textAlign: 'left', padding: '8px 6px', borderBottom: '1px solid #333' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sales.map((s, i) => (
                  <tr key={i}>
                    <td style={{ color: '#999', padding: '10px 6px', borderBottom: '1px solid #1a1a1a', fontSize: '12px' }}>{s.date}</td>
                    <td style={{ color: '#C0C0C0', padding: '10px 6px', borderBottom: '1px solid #1a1a1a', fontSize: '13px' }}>{s.model}</td>
                    <td style={{ color: '#C0C0C0', padding: '10px 6px', borderBottom: '1px solid #1a1a1a', fontSize: '13px' }}>{fmt(s.sale_price)}</td>
                    <td style={{ color: '#2ecc71', padding: '10px 6px', borderBottom: '1px solid #1a1a1a', fontSize: '13px' }}>{fmt(s.gross_profit)}</td>
                    <td style={{ color: '#f39c12', padding: '10px 6px', borderBottom: '1px solid #1a1a1a', fontSize: '12px' }}>{s.gross_margin_pct || 0}%</td>
                    <td style={{ color: '#999', padding: '10px 6px', borderBottom: '1px solid #1a1a1a', fontSize: '12px' }}>{s.salesperson}</td>
                    <td style={{ color: '#999', padding: '10px 6px', borderBottom: '1px solid #1a1a1a', fontSize: '12px' }}>{s.lead_source || '—'}</td>
                    <td style={{ padding: '10px 6px', borderBottom: '1px solid #1a1a1a' }}>
                      <button onClick={() => handleDelete(s.id)} style={{ padding: '3px 8px', background: 'transparent', color: '#e74c3c', border: '1px solid #e74c3c', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
