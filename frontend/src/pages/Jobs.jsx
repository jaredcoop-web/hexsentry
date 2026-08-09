import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import api from '../api'
import { ClipboardList } from 'lucide-react'

export default function Jobs({ isMobile }) {
  const [summary, setSummary]   = useState(null)
  const [jobs, setJobs]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [msg, setMsg]           = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const [sumRes, listRes] = await Promise.all([
        api.get('/sales'),
        api.get('/sales/list'),
      ])
      setSummary(sumRes.data)
      setJobs(listRes.data || [])
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (id) => {
    try {
      await api.delete(`/sales/${id}`)
      setMsg({ type: 'success', text: 'Job deleted' })
      load()
    } catch { setMsg({ type: 'error', text: 'Failed to delete' }) }
  }

  const handleDeleteAll = async () => {
    if (!window.confirm('Delete ALL jobs? This cannot be undone.')) return
    setDeleting(true)
    try {
      await api.delete('/sales')
      setMsg({ type: 'success', text: 'All jobs cleared' })
      load()
    } catch { setMsg({ type: 'error', text: 'Failed to clear' }) }
    setDeleting(false)
  }

  const fmt = (n) => n != null ? `$${Number(n).toLocaleString()}` : 'N/A'

  // Parse job description format: "Service — Vehicle — Customer"
  const parseJob = (description) => {
    if (!description) return { service: '—', vehicle: '—', customer: '—' }
    const parts = description.split(' — ')
    return {
      service:  parts[0] || description,
      vehicle:  parts[1] || '—',
      customer: parts[2] || '—',
    }
  }

  if (loading) return <p style={{ color: '#666', padding: '40px' }}>Loading jobs...</p>

  const monthlyData  = summary?.monthly || []
  const leaderboard  = summary?.leaderboard || []

  return (
    <div style={{ fontFamily: 'Arial, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '10px' }}>
        <h1 style={{ color: '#C0C0C0', margin: 0, fontSize: isMobile ? '20px' : '24px', display: 'flex', alignItems: 'center', gap: '10px' }}><ClipboardList size={22} /> Jobs</h1>
        <button onClick={handleDeleteAll} disabled={deleting} style={{ padding: '8px 14px', background: 'transparent', color: '#e74c3c', border: '1px solid #e74c3c', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
          {deleting ? 'Clearing...' : 'Clear All'}
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
          { label: 'Total Jobs',      value: summary?.total_sales || 0 },
          { label: 'Total Revenue',   value: fmt(summary?.total_gross), color: '#2ecc71' },
          { label: 'Avg Job Value',   value: fmt(summary?.avg_gross) },
          { label: 'This Month',      value: summary?.this_month || 0 },
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
          <h2 style={{ color: '#C0C0C0', fontSize: '15px', marginBottom: '16px' }}>Monthly Revenue</h2>
          <ResponsiveContainer width="100%" height={isMobile ? 180 : 220}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222" />
              <XAxis dataKey="month" stroke="#666" tick={{ fontSize: 11 }} />
              <YAxis stroke="#666" tick={{ fontSize: 11 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ background: '#1A1A2E', border: '1px solid #333', color: '#C0C0C0' }} formatter={v => [`$${Number(v).toLocaleString()}`, 'Revenue']} />
              <Bar dataKey="gross" fill="#4a9eff" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Technician Leaderboard */}
      {leaderboard.length > 0 && (
        <div style={{ background: '#1A1A2E', border: '1px solid #333', borderRadius: '8px', padding: '20px', marginBottom: '24px' }}>
          <h2 style={{ color: '#C0C0C0', fontSize: '15px', marginBottom: '16px' }}>🏆 Technician Leaderboard</h2>
          {leaderboard.map((sp, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #1a1a1a' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '16px' }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
                <span style={{ color: '#C0C0C0', fontSize: '14px' }}>{sp.salesperson}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ color: '#2ecc71', margin: 0, fontSize: '14px', fontWeight: 'bold' }}>{fmt(sp.gross)}</p>
                <p style={{ color: '#666', margin: 0, fontSize: '11px' }}>{sp.deals} jobs</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Jobs table */}
      <div style={{ background: '#1A1A2E', border: '1px solid #333', borderRadius: '8px', padding: '20px' }}>
        <h2 style={{ color: '#C0C0C0', fontSize: '15px', marginBottom: '16px' }}>All Jobs</h2>
        {jobs.length === 0 ? (
          <p style={{ color: '#555', textAlign: 'center', padding: '20px' }}>No jobs yet. Add your first job.</p>
        ) : (
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ minWidth: '650px', width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Date', 'Customer', 'Service', 'Vehicle', 'Technician', 'Charged', 'Labor Gross', ''].map(h => (
                    <th key={h} style={{ color: '#666', fontSize: '11px', textAlign: 'left', padding: '8px 6px', borderBottom: '1px solid #333', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {jobs.map((job, i) => {
                  const parsed = parseJob(job.model)
                  const laborGross = (job.gross_profit || 0)
                  return (
                    <tr key={i}>
                      <td style={{ color: '#999', padding: '10px 6px', borderBottom: '1px solid #1a1a1a', fontSize: '12px' }}>{job.date}</td>
                      <td style={{ color: '#C0C0C0', padding: '10px 6px', borderBottom: '1px solid #1a1a1a', fontSize: '13px' }}>{parsed.customer}</td>
                      <td style={{ color: '#4a9eff', padding: '10px 6px', borderBottom: '1px solid #1a1a1a', fontSize: '13px' }}>{parsed.service}</td>
                      <td style={{ color: '#999', padding: '10px 6px', borderBottom: '1px solid #1a1a1a', fontSize: '12px' }}>{parsed.vehicle}</td>
                      <td style={{ color: '#999', padding: '10px 6px', borderBottom: '1px solid #1a1a1a', fontSize: '12px' }}>{job.salesperson}</td>
                      <td style={{ color: '#C0C0C0', padding: '10px 6px', borderBottom: '1px solid #1a1a1a', fontSize: '13px' }}>{fmt(job.sale_price)}</td>
                      <td style={{ color: laborGross >= 0 ? '#2ecc71' : '#e74c3c', padding: '10px 6px', borderBottom: '1px solid #1a1a1a', fontSize: '13px', fontWeight: 'bold' }}>{fmt(laborGross)}</td>
                      <td style={{ padding: '10px 6px', borderBottom: '1px solid #1a1a1a' }}>
                        <button onClick={() => handleDelete(job.id)} style={{ padding: '3px 8px', background: 'transparent', color: '#e74c3c', border: '1px solid #e74c3c', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
