import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Star, RefreshCw, Link, Link2Off } from 'lucide-react'
import api from '../api'

const DATE_RANGES = [
  { label: 'Last 30 Days', value: '30' },
  { label: 'Last 90 Days', value: '90' },
  { label: 'This Year',    value: '365' },
  { label: 'All Time',     value: 'all' },
]

export default function Reviews() {
  const [data, setData]           = useState(null)
  const [connected, setConnected] = useState(false)
  const [syncing, setSyncing]     = useState(false)
  const [syncMsg, setSyncMsg]     = useState('')
  const [loading, setLoading]     = useState(true)
  const [range, setRange]         = useState('all')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('connected') === 'true') {
      setSyncMsg('Google Business connected successfully!')
      window.history.replaceState({}, '', '/reviews')
    }
    if (params.get('error')) {
      setSyncMsg('Google connection failed. Please try again.')
      window.history.replaceState({}, '', '/reviews')
    }

    const load = async () => {
      try {
        const [reviewRes, statusRes] = await Promise.all([
          api.get('/reviews'),
          api.get('/auth/google/status'),
        ])
        setData(reviewRes.data)
        setConnected(statusRes.data.connected)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleConnect    = async () => { const res = await api.get('/auth/google'); window.location.href = res.data.url }
  const handleDisconnect = async () => { await api.delete('/auth/google'); setConnected(false); setSyncMsg('Google disconnected.') }
  const handleSync       = async () => {
    setSyncing(true); setSyncMsg('')
    try {
      const res = await api.post('/auth/google/sync')
      setSyncMsg(`Synced ${res.data.saved} new reviews!`)
      const reviewRes = await api.get('/reviews')
      setData(reviewRes.data)
    } catch { setSyncMsg('Sync failed. Try reconnecting Google.') }
    finally { setSyncing(false) }
  }

  // Filter reviews by date range
  const filterByRange = (items) => {
    if (range === 'all') return items
    const days = parseInt(range)
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    return items.filter(r => new Date(r.date) >= cutoff)
  }

  // Filter monthly data by range
  const filterMonthly = (monthly) => {
    if (range === 'all') return monthly
    const days = parseInt(range)
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    return monthly.filter(m => {
      const [year, month] = m.month.split('-')
      return new Date(parseInt(year), parseInt(month) - 1, 1) >= cutoff
    })
  }

  const filteredReviews = filterByRange(data?.recent || [])
  const filteredMonthly = filterMonthly(data?.monthly || [])

  // Recalculate stats from filtered reviews
  const filteredStats = {
    total:    filteredReviews.length,
    negative: filteredReviews.filter(r => r.sentiment === 'negative').length,
    avg_rating: filteredReviews.length
      ? (filteredReviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / filteredReviews.length).toFixed(1)
      : 'N/A'
  }

  const sentimentColor = (s) => s === 'positive' ? '#2ecc71' : s === 'negative' ? '#e74c3c' : '#f39c12'

  if (loading) return <p style={{ color: '#666', padding: '40px' }}>Loading reviews...</p>

  return (
    <div style={{ fontFamily: 'Arial, sans-serif' }}>

      {/* Header */}
      <h1 style={{ color: '#C0C0C0', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Star size={24} /> Customer Reviews
      </h1>
      <p style={{ color: '#555', marginBottom: '24px', fontSize: '13px' }}>
        Ratings, sentiment, and reputation tracking
      </p>

      {/* Google Connect Banner */}
      <div style={{
        background: connected ? '#0d2d15' : '#1A1A2E',
        border: `1px solid ${connected ? '#27ae60' : '#333'}`,
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <div>
          <p style={{ color: connected ? '#2ecc71' : '#C0C0C0', margin: '0 0 4px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
            {connected ? <><Link size={14} /> Google Business Connected</> : <><Link size={14} /> Connect Google Business</>}
          </p>
          <p style={{ color: '#666', margin: 0, fontSize: '13px' }}>
            {connected ? 'Reviews sync automatically every 2 hours' : 'Connect to auto-sync reviews — no manual uploads needed'}
          </p>
          {syncMsg && <p style={{ color: '#2ecc71', margin: '8px 0 0', fontSize: '13px' }}>{syncMsg}</p>}
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {connected ? (
            <>
              <button
                onClick={handleSync}
                disabled={syncing}
                style={{ padding: '8px 16px', background: '#C0C0C0', color: '#0A0A0A', border: 'none', borderRadius: '6px', cursor: syncing ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <RefreshCw size={14} /> {syncing ? 'Syncing...' : 'Sync Now'}
              </button>
              <button
                onClick={handleDisconnect}
                style={{ padding: '8px 16px', background: 'transparent', color: '#666', border: '1px solid #333', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Link2Off size={14} /> Disconnect
              </button>
            </>
          ) : (
            <button
              onClick={handleConnect}
              style={{ padding: '10px 20px', background: '#C0C0C0', color: '#0A0A0A', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}
            >
              Connect Google Business
            </button>
          )}
        </div>
      </div>

      {data && !data.error && (
        <>
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
          <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
            {[
              { label: 'Avg Rating',       value: filteredStats.avg_rating !== 'N/A' ? `${filteredStats.avg_rating} / 5` : 'N/A' },
              { label: 'Total Reviews',    value: filteredStats.total },
              { label: 'Negative Reviews', value: filteredStats.negative, color: '#e74c3c' },
            ].map((k, i) => (
              <div key={i} style={{ background: '#1A1A2E', border: '1px solid #333', borderRadius: '8px', padding: '20px', flex: 1, minWidth: '140px' }}>
                <p style={{ color: '#666', fontSize: '12px', margin: '0 0 8px', textTransform: 'uppercase' }}>{k.label}</p>
                <p style={{ color: k.color || '#C0C0C0', fontSize: '24px', fontWeight: 'bold', margin: 0 }}>{k.value}</p>
              </div>
            ))}
          </div>

          {/* Rating trend */}
          {filteredMonthly.length > 0 && (
            <div style={{ background: '#1A1A2E', border: '1px solid #333', borderRadius: '8px', padding: '24px', marginBottom: '24px' }}>
              <h2 style={{ color: '#C0C0C0', fontSize: '16px', marginBottom: '16px' }}>Monthly Average Rating</h2>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={filteredMonthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                  <XAxis dataKey="month" stroke="#666" tick={{ fontSize: 12 }} />
                  <YAxis domain={[1, 5]} stroke="#666" tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ background: '#1A1A2E', border: '1px solid #333', color: '#C0C0C0' }} />
                  <Line type="monotone" dataKey="avg_rating" stroke="#f39c12" strokeWidth={2} dot={{ fill: '#f39c12' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Recent reviews */}
          <div style={{ background: '#1A1A2E', border: '1px solid #333', borderRadius: '8px', padding: '24px' }}>
            <h2 style={{ color: '#C0C0C0', fontSize: '16px', marginBottom: '16px' }}>Recent Reviews</h2>
            {filteredReviews.length > 0 ? filteredReviews.map((r, i) => (
              <div key={i} style={{ borderBottom: '1px solid #222', padding: '14px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: sentimentColor(r.sentiment), fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Star size={13} fill={sentimentColor(r.sentiment)} />
                    {r.rating}/5 — {r.platform}
                  </span>
                  <span style={{ color: '#555', fontSize: '12px' }}>{r.date?.slice(0, 10)}</span>
                </div>
                <p style={{ color: '#999', margin: 0, fontSize: '13px' }}>{r.text || 'No comment left.'}</p>
              </div>
            )) : (
              <p style={{ color: '#555' }}>No reviews found for the selected period.</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}