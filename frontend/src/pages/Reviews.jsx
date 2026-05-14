import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import api from '../api'

export default function Reviews() {
  const [data, setData]           = useState(null)
  const [connected, setConnected] = useState(false)
  const [syncing, setSyncing]     = useState(false)
  const [syncMsg, setSyncMsg]     = useState('')
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    // Check if Google redirected back with connected=true
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

  const handleConnect = async () => {
    const res = await api.get('/auth/google')
    window.location.href = res.data.url
  }

  const handleSync = async () => {
    setSyncing(true)
    setSyncMsg('')
    try {
      const res = await api.post('/auth/google/sync')
      setSyncMsg(`✅ Synced ${res.data.saved} new reviews!`)
      const reviewRes = await api.get('/reviews')
      setData(reviewRes.data)
    } catch (e) {
      setSyncMsg('Sync failed. Try reconnecting Google.')
    } finally {
      setSyncing(false)
    }
  }

  const handleDisconnect = async () => {
    await api.delete('/auth/google')
    setConnected(false)
    setSyncMsg('Google disconnected.')
  }

  const sentimentColor = (s) => s === 'positive' ? '#2ecc71' : s === 'negative' ? '#e74c3c' : '#f39c12'

  if (loading) return <p style={{ color: '#666', padding: '40px' }}>Loading reviews...</p>

  return (
    <div style={{ fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ color: '#C0C0C0', marginBottom: '8px' }}>⭐ Customer Reviews</h1>
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
          <p style={{ color: connected ? '#2ecc71' : '#C0C0C0', margin: '0 0 4px', fontWeight: 'bold' }}>
            {connected ? '✅ Google Business Connected' : '🔗 Connect Google Business'}
          </p>
          <p style={{ color: '#666', margin: 0, fontSize: '13px' }}>
            {connected
              ? 'Reviews sync automatically every 2 hours'
              : 'Connect to auto-sync reviews — no manual uploads needed'}
          </p>
          {syncMsg && <p style={{ color: '#2ecc71', margin: '8px 0 0', fontSize: '13px' }}>{syncMsg}</p>}
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {connected ? (
            <>
              <button
                onClick={handleSync}
                disabled={syncing}
                style={{
                  padding: '8px 16px',
                  background: '#C0C0C0',
                  color: '#0A0A0A',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: syncing ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  fontSize: '13px',
                }}
              >
                {syncing ? 'Syncing...' : '🔄 Sync Now'}
              </button>
              <button
                onClick={handleDisconnect}
                style={{
                  padding: '8px 16px',
                  background: 'transparent',
                  color: '#666',
                  border: '1px solid #333',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                Disconnect
              </button>
            </>
          ) : (
            <button
              onClick={handleConnect}
              style={{
                padding: '10px 20px',
                background: '#C0C0C0',
                color: '#0A0A0A',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '14px',
              }}
            >
              Connect Google Business
            </button>
          )}
        </div>
      </div>

      {/* KPIs */}
      {data && !data.error && (
        <>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
            {[
              { label: 'Avg Rating',       value: `⭐ ${data.summary?.avg_rating || 'N/A'}` },
              { label: 'Total Reviews',    value: data.summary?.total || 0 },
              { label: 'Negative Reviews', value: data.summary?.negative || 0, color: '#e74c3c' },
            ].map((k, i) => (
              <div key={i} style={{
                background: '#1A1A2E', border: '1px solid #333', borderRadius: '8px',
                padding: '20px', flex: 1, minWidth: '140px',
              }}>
                <p style={{ color: '#666', fontSize: '12px', margin: '0 0 8px', textTransform: 'uppercase' }}>{k.label}</p>
                <p style={{ color: k.color || '#C0C0C0', fontSize: '24px', fontWeight: 'bold', margin: 0 }}>{k.value}</p>
              </div>
            ))}
          </div>

          {/* Rating trend */}
          {data.monthly?.length > 0 && (
            <div style={{ background: '#1A1A2E', border: '1px solid #333', borderRadius: '8px', padding: '24px', marginBottom: '24px' }}>
              <h2 style={{ color: '#C0C0C0', fontSize: '16px', marginBottom: '16px' }}>Monthly Average Rating</h2>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={data.monthly}>
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
            {data.recent?.length > 0 ? data.recent.map((r, i) => (
              <div key={i} style={{
                borderBottom: '1px solid #222',
                padding: '14px 0',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: sentimentColor(r.sentiment), fontSize: '13px', fontWeight: 'bold' }}>
                    {'⭐'.repeat(r.rating)} {r.platform}
                  </span>
                  <span style={{ color: '#555', fontSize: '12px' }}>{r.date?.slice(0, 10)}</span>
                </div>
                <p style={{ color: '#999', margin: 0, fontSize: '13px' }}>{r.text || 'No comment left.'}</p>
              </div>
            )) : (
              <p style={{ color: '#555' }}>No reviews yet. Connect Google Business to start syncing.</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
