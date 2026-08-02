

import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Car, Trash2, Trophy, ClipboardList } from 'lucide-react'
import api from '../api'

const DATE_RANGES = [
  { label: 'Last 30 days', value: '30' },
  { label: 'Last 90 days', value: '90' },
  { label: 'This Year', value: '365' },
  { label: 'All Time', value: 'all' },
]

export default function Sales() {
  const [data, setData]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const [allSales, setAllSales] = useState([])
  const [confirm, setConfirm]   = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [msg, setMsg]           = useState(null)
  const [range, setRange]       = useState('all')

  const load = async () => {
    setLoading(true)
    try {
      const [salesRes, rawRes] = await Promise.all([
        api.get('/sales'),
        api.get("/sales/list"),
      ])
      setData(salesRes.data)
      setAllSales(rawRes.data || [])
    } catch {
      try {
        const salesRes = await api.get('/sales')
        setData(salesRes.data)
      } catch {}
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // Filter sales by date range
  const filterByRange = (sales) => {
    if (range === 'all') return sales
    const days = parseInt(range)
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    return sales.filter(s => new Date(s.date) >= cutoff)
  }

  const filteredSales = filterByRange(allSales)

  // Recalculate stats from filtered sales
  const filteredStats = {
    total_sales: filteredSales.length,
    total_gross: filteredSales.reduce((sum, s) => sum + Number(s.gross_profit || 0), 0),
    avg_gross: filteredSales.length ? filteredSales.reduce((sum, s) => sum + Number(s.gross_profit || 0), 0) / filteredSales.length : 0,
  }

  const deleteSale = async (id) => {
    try {
      await api.delete(`/sales/${id}`)
      setMsg({ type: 'success', text: 'Sale deleted' })
      load()
    } catch {
      setMsg({ type: 'error', text: 'Failed to delete sale' })
    }
  }

  const clearAll = async () => {
    setDeleting(true)
    try {
      await api.delete('/sales')
      setMsg({ type: 'success', text: 'All sales cleared' })
      setConfirm(false)
      load()
    } catch {
      setMsg({ type: 'error', text: 'Failed to clear sales' })
    }
    setDeleting(false)
  }

  if (loading) return <p style={{ color: '#666', padding: '40px' }}>Loading sales data...</p>
  if (!data || data.error) return <p style={{ color: '#e74c3c', padding: '40px' }}>No sales data yet. Add a sale using the Add Sale page.</p>

  const CARD = { background: '#1A1A2E', border: '1px solid #333', borderRadius: '8px', padding: '24px', marginBottom: '24px' }

  return (
    <div style={{ fontFamily: 'Arial, sans-serif' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ color: '#C0C0C0', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Car size={24} /> Sales Performance
        </h1>
        <button
          onClick={() => setConfirm(true)}
          style={{ padding: '8px 16px', background: 'transparent', color: '#e74c3c', border: '1px solid #e74c3c', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Trash2 size={14} /> Clear All Sales
        </button>
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

      {/* Quick stats for filtered range */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Total Sales', value: filteredStats.total_sales },
          { label: 'Total Gross', value: `$${filteredStats.total_gross.toLocaleString()}`, color: '#2ecc71' },
          { label: 'Avg Gross/Deal', value: `$${Math.round(filteredStats.avg_gross).toLocaleString()}` },
        ].map(stat => (
          <div key={stat.label} style={{ background: '#1A1A2E', border: '1px solid #333', borderRadius: '8px', padding: '16px' }}>
            <p style={{ color: '#666', fontSize: '11px', margin: '0 0 4px', textTransform: 'uppercase' }}>{stat.label}</p>
            <p style={{ color: stat.color || '#C0C0C0', fontSize: '22px', fontWeight: 'bold', margin: 0 }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {msg && (
        <div style={{ background: msg.type === 'success' ? '#0d2d15' : '#2d1515', border: `1px solid ${msg.type === 'success' ? '#27ae60' : '#c0392b'}`, borderRadius: '6px', padding: '10px 14px', marginBottom: '16px', color: msg.type === 'success' ? '#2ecc71' : '#e74c3c', fontSize: '14px' }}>
          {msg.text}
        </div>
      )}

      {confirm && (
        <div style={{ background: '#2d1515', border: '1px solid #c0392b', borderRadius: '8px', padding: '20px', marginBottom: '24px' }}>
          <p style={{ color: '#e74c3c', margin: '0 0 16px', fontWeight: 'bold' }}>Are you sure you want to delete ALL sales data? This cannot be undone.</p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={clearAll} disabled={deleting} style={{ padding: '8px 16px', background: '#c0392b', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
              {deleting ? 'Clearing...' : 'Yes, delete everything'}
            </button>
            <button onClick={() => setConfirm(false)} style={{ padding: '8px 16px', background: 'transparent', color: '#666', border: '1px solid #333', borderRadius: '6px', cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Monthly chart */}
      <div style={CARD}>
        <h2 style={{ color: '#C0C0C0', fontSize: '16px', marginBottom: '16px' }}>Monthly Sales Volume</h2>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data.monthly}>
            <CartesianGrid strokeDasharray="3 3" stroke="#222" />
            <XAxis dataKey="month" stroke="#666" tick={{ fontSize: 12 }} />
            <YAxis stroke="#666" tick={{ fontSize: 12 }} />
            <Tooltip contentStyle={{ background: '#1A1A2E', border: '1px solid #333', color: '#C0C0C0' }} />
            <Bar dataKey="units" fill="#C0C0C0" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Monthly gross */}
      <div style={CARD}>
        <h2 style={{ color: '#C0C0C0', fontSize: '16px', marginBottom: '16px' }}>Monthly Gross Profit</h2>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data.monthly}>
            <CartesianGrid strokeDasharray="3 3" stroke="#222" />
            <XAxis dataKey="month" stroke="#666" tick={{ fontSize: 12 }} />
            <YAxis stroke="#666" tick={{ fontSize: 12 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
            <Tooltip contentStyle={{ background: '#1A1A2E', border: '1px solid #333', color: '#C0C0C0' }} formatter={v => [`$${Number(v).toLocaleString()}`, 'Gross']} />
            <Bar dataKey="gross" fill="#2ecc71" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top salespeople + models */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
        <div style={CARD}>
          <h2 style={{ color: '#C0C0C0', fontSize: '16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Trophy size={16} /> Top Salespeople
          </h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Salesperson', 'Deals', 'Gross'].map(h => (
                  <th key={h} style={{ color: '#666', fontSize: '12px', textAlign: 'left', padding: '8px 0', borderBottom: '1px solid #333' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.top_salespeople?.map((sp, i) => (
                <tr key={i}>
                  <td style={{ color: '#C0C0C0', padding: '10px 0', borderBottom: '1px solid #1a1a1a', fontSize: '14px' }}>{sp.salesperson}</td>
                  <td style={{ color: '#999', padding: '10px 0', borderBottom: '1px solid #1a1a1a', fontSize: '14px' }}>{sp.deals}</td>
                  <td style={{ color: '#2ecc71', padding: '10px 0', borderBottom: '1px solid #1a1a1a', fontSize: '14px' }}>${Number(sp.gross).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={CARD}>
          <h2 style={{ color: '#C0C0C0', fontSize: '16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Car size={16} /> Top Models
          </h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Model', 'Units'].map(h => (
                  <th key={h} style={{ color: '#666', fontSize: '12px', textAlign: 'left', padding: '8px 0', borderBottom: '1px solid #333' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.top_models?.map((m, i) => (
                <tr key={i}>
                  <td style={{ color: '#C0C0C0', padding: '10px 0', borderBottom: '1px solid #1a1a1a', fontSize: '14px' }}>{m.model}</td>
                  <td style={{ color: '#999', padding: '10px 0', borderBottom: '1px solid #1a1a1a', fontSize: '14px' }}>{m.units}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* All sales table */}
      {filteredSales.length > 0 && (
        <div style={CARD}>
          <h2 style={{ color: '#C0C0C0', fontSize: '16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ClipboardList size={16} /> All Sales
          </h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Date', 'Item', 'Salesperson', 'Sale Price', 'Gross', ''].map(h => (
                  <th key={h} style={{ color: '#666', fontSize: '12px', textAlign: 'left', padding: '8px 0', borderBottom: '1px solid #333' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredSales.map((s, i) => (
                <tr key={i}>
                  <td style={{ color: '#999', padding: '10px 0', borderBottom: '1px solid #1a1a1a', fontSize: '13px' }}>{s.date}</td>
                  <td style={{ color: '#C0C0C0', padding: '10px 0', borderBottom: '1px solid #1a1a1a', fontSize: '13px' }}>{s.model}</td>
                  <td style={{ color: '#999', padding: '10px 0', borderBottom: '1px solid #1a1a1a', fontSize: '13px' }}>{s.salesperson}</td>
                  <td style={{ color: '#C0C0C0', padding: '10px 0', borderBottom: '1px solid #1a1a1a', fontSize: '13px' }}>${Number(s.sale_price).toLocaleString()}</td>
                  <td style={{ color: '#2ecc71', padding: '10px 0', borderBottom: '1px solid #1a1a1a', fontSize: '13px' }}>${Number(s.gross_profit).toLocaleString()}</td>
                  <td style={{ padding: '10px 0', borderBottom: '1px solid #1a1a1a' }}>
                    <button
                      onClick={() => deleteSale(s.id)}
                      style={{ padding: '4px 10px', background: 'transparent', color: '#e74c3c', border: '1px solid #e74c3c', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filteredSales.length === 0 && (
        <div style={{ ...CARD, textAlign: 'center', color: '#666', padding: '40px' }}>
          No sales found for the selected time period.
        </div>
      )}

    </div>
  )
}