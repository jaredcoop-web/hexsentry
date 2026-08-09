
import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Briefcase } from 'lucide-react'
import api from '../api'
import { BriefCase } from 'lucide-react'

const CARD = { background: '#1A1A2E', border: '1px solid #333', borderRadius: '8px', padding: '24px', marginBottom: '24px' }

const DATE_RANGES = [
  { label: 'Last 30 Days', value: '30' },
  { label: 'Last 90 Days', value: '90' },
  { label: 'This Year',    value: '365' },
  { label: 'All Time',     value: 'all' },
]

export default function FI() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [range, setRange]     = useState('all')

  useEffect(() => {
    api.get('/fi').then(res => {
      setData(res.data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const handleClear = async () => {
    if (!window.confirm('Clear all F&I data?')) return
    try {
      await api.delete('/fi')
      window.location.reload()
    } catch {}
  }

  if (loading) return <p style={{ color: '#666', padding: '40px' }}>Loading F&I data...</p>
  if (!data || data.error) return (
    <div style={{ fontFamily: 'Arial, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ color: '#C0C0C0', margin: 0, fontSize: '24px' }}>💼 Finance & Insurance</h1>
        <button onClick={handleClear} style={{ padding: '8px 14px', background: 'transparent', color: '#e74c3c', border: '1px solid #e74c3c', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>Clear All</button>
      </div>
      <p style={{ color: '#555' }}>No F&I data yet. Add sales with F&I details using the Add Sale page.</p>
    </div>
  )

  // Filter monthly data by range
  const filterMonthly = (monthly) => {
    if (range === 'all') return monthly
    const days = parseInt(range)
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    return monthly.filter(m => {
      const [year, month] = m.month.split('-')
      const monthDate = new Date(parseInt(year), parseInt(month) - 1, 1)
      return monthDate >= cutoff
    })
  }

  const filteredMonthly = filterMonthly(data.monthly || [])

  // Recalculate summary from filtered monthly data
  const filteredSummary = {
    total_backend:  filteredMonthly.reduce((sum, m) => sum + Number(m.total_backend || 0), 0),
    total_finance:  filteredMonthly.reduce((sum, m) => sum + Number(m.total_finance || 0), 0),
    total_warranty: filteredMonthly.reduce((sum, m) => sum + Number(m.total_warranty || 0), 0),
    total_gap:      filteredMonthly.reduce((sum, m) => sum + Number(m.total_gap || 0), 0),
    total_addons:   filteredMonthly.reduce((sum, m) => sum + Number(m.total_addons || 0), 0),
    fi_deals:       filteredMonthly.reduce((sum, m) => sum + Number(m.deals || 0), 0),
  }

  const avgBPU = filteredSummary.fi_deals
    ? Math.round(filteredSummary.total_backend / filteredSummary.fi_deals)
    : 0

  const s = range === 'all' ? (data.summary || {}) : filteredSummary
  const penetration = range === 'all' ? (data.penetration || 0) : data.penetration || 0

  return (
    <div style={{ fontFamily: 'Arial, sans-serif' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ color: '#C0C0C0', margin: 0, fontSize: isMobile ? '20px' : '24px', display: 'flex', alignItems: 'center', gap: '10px' }}><BriefCase size={22} /> FI</h1>
          <p style={{ color: '#555', margin: 0, fontSize: '13px' }}>Backend income, product penetration, and F&I performance</p>
        </div>
        <button onClick={handleClear} style={{ padding: '8px 14px', background: 'transparent', color: '#e74c3c', border: '1px solid #e74c3c', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>Clear All</button>
      </div>

      {/* Date Range Filter */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        {DATE_RANGES.map(r => (
          <button
            key={r.value}
            onClick={() => setRange(r.value)}
            style={{
              padding: '6px 14px',
              background: range === r.value ? '#C0C0C0' : 'transparent',
              color: range === r.value ? '#0A0A0A' : '#666',
              border: '1px solid',
              borderColor: range === r.value ? '#C0C0C0' : '#333',
              borderRadius: '20px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: range === r.value ? 'bold' : 'normal',
            }}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* KPIs */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px' }}>
        {[
          { label: 'Total Backend', value: `$${Number(s.total_backend || 0).toLocaleString()}`, color: '#2ecc71' },
          { label: 'Avg BPU',       value: `$${(range === 'all' ? Number(data.summary?.avg_backend || 0) : avgBPU).toLocaleString()}`, color: '#3498db' },
          { label: 'F&I Deals',     value: s.fi_deals || 0 },
          { label: 'Penetration',   value: `${penetration}%`, color: penetration > 50 ? '#2ecc71' : '#e74c3c' },
        ].map((k, i) => (
          <div key={i} style={{ background: '#1A1A2E', border: '1px solid #333', borderRadius: '8px', padding: '20px', flex: 1, minWidth: '140px' }}>
            <p style={{ color: '#666', fontSize: '12px', margin: '0 0 8px', textTransform: 'uppercase' }}>{k.label}</p>
            <p style={{ color: k.color || '#C0C0C0', fontSize: '24px', fontWeight: 'bold', margin: 0 }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Product breakdown */}
      <div style={CARD}>
        <h2 style={{ color: '#C0C0C0', fontSize: '16px', marginBottom: '16px' }}>Product Breakdown</h2>
        {[
          { label: 'Finance Reserve', value: s.total_finance  || 0, color: '#3498db' },
          { label: 'Warranty',        value: s.total_warranty || 0, color: '#2ecc71' },
          { label: 'GAP Insurance',   value: s.total_gap      || 0, color: '#f39c12' },
          { label: 'Add-ons',         value: s.total_addons   || 0, color: '#9b59b6' },
        ].map((p, i) => {
          const total = Number(s.total_backend || 1)
          const pct   = Math.round(Number(p.value) / total * 100)
          return (
            <div key={i} style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: '#999', fontSize: '13px' }}>{p.label}</span>
                <span style={{ color: p.color, fontSize: '13px', fontWeight: 'bold' }}>${Number(p.value).toLocaleString()} ({pct}%)</span>
              </div>
              <div style={{ background: '#0A0A0A', borderRadius: '4px', height: '6px' }}>
                <div style={{ background: p.color, borderRadius: '4px', height: '6px', width: `${pct}%` }} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Monthly chart */}
      {filteredMonthly.length > 0 && (
        <div style={CARD}>
          <h2 style={{ color: '#C0C0C0', fontSize: '16px', marginBottom: '16px' }}>Monthly Backend Income</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={filteredMonthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222" />
              <XAxis dataKey="month" stroke="#666" tick={{ fontSize: 12 }} />
              <YAxis stroke="#666" tick={{ fontSize: 12 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ background: '#1A1A2E', border: '1px solid #333', color: '#C0C0C0' }} formatter={v => [`$${Number(v).toLocaleString()}`, 'Backend']} />
              <Bar dataKey="total_backend" fill="#2ecc71" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* By salesperson */}
      {data.by_salesperson?.length > 0 && (
        <div style={CARD}>
          <h2 style={{ color: '#C0C0C0', fontSize: '16px', marginBottom: '16px' }}>F&I by Salesperson</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Salesperson', 'Deals', 'Total Backend', 'Avg BPU'].map(h => (
                  <th key={h} style={{ color: '#666', fontSize: '12px', textAlign: 'left', padding: '8px 0', borderBottom: '1px solid #333' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.by_salesperson.map((sp, i) => (
                <tr key={i}>
                  <td style={{ color: '#C0C0C0', padding: '12px 0', borderBottom: '1px solid #1a1a1a', fontSize: '14px' }}>{sp.salesperson}</td>
                  <td style={{ color: '#999', padding: '12px 0', borderBottom: '1px solid #1a1a1a', fontSize: '13px' }}>{sp.deals}</td>
                  <td style={{ color: '#2ecc71', padding: '12px 0', borderBottom: '1px solid #1a1a1a', fontSize: '13px' }}>${Number(sp.total).toLocaleString()}</td>
                  <td style={{ color: sp.avg_bpu >= 1500 ? '#2ecc71' : sp.avg_bpu >= 800 ? '#f39c12' : '#e74c3c', padding: '12px 0', borderBottom: '1px solid #1a1a1a', fontSize: '13px', fontWeight: 'bold' }}>${Number(sp.avg_bpu).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ color: '#444', fontSize: '11px', margin: '12px 0 0' }}>Industry average BPU: $1,200 — $1,800. Green = above average, Red = below average.</p>
        </div>
      )}
    </div>
  )
}