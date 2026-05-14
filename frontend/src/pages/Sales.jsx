import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import api from '../api'

export default function Sales() {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/sales').then(res => {
      setData(res.data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  if (loading) return <p style={{ color: '#666', padding: '40px' }}>Loading sales data...</p>
  if (!data || data.error) return <p style={{ color: '#e74c3c', padding: '40px' }}>No sales data yet. Upload your sales report first.</p>

  return (
    <div style={{ fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ color: '#C0C0C0', marginBottom: '24px' }}>🚗 Sales Performance</h1>

      <div style={{ background: '#1A1A2E', border: '1px solid #333', borderRadius: '8px', padding: '24px', marginBottom: '24px' }}>
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

      <div style={{ background: '#1A1A2E', border: '1px solid #333', borderRadius: '8px', padding: '24px', marginBottom: '24px' }}>
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <div style={{ background: '#1A1A2E', border: '1px solid #333', borderRadius: '8px', padding: '24px' }}>
          <h2 style={{ color: '#C0C0C0', fontSize: '16px', marginBottom: '16px' }}>🏆 Top Salespeople</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Salesperson', 'Deals', 'Gross'].map(h => (
                  <th key={h} style={{ color: '#666', fontSize: '12px', textAlign: 'left', padding: '8px 0', borderBottom: '1px solid #333' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.top_salespeople.map((sp, i) => (
                <tr key={i}>
                  <td style={{ color: '#C0C0C0', padding: '10px 0', borderBottom: '1px solid #1a1a1a', fontSize: '14px' }}>{sp.salesperson}</td>
                  <td style={{ color: '#999', padding: '10px 0', borderBottom: '1px solid #1a1a1a', fontSize: '14px' }}>{sp.deals}</td>
                  <td style={{ color: '#2ecc71', padding: '10px 0', borderBottom: '1px solid #1a1a1a', fontSize: '14px' }}>${Number(sp.gross).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ background: '#1A1A2E', border: '1px solid #333', borderRadius: '8px', padding: '24px' }}>
          <h2 style={{ color: '#C0C0C0', fontSize: '16px', marginBottom: '16px' }}>🚗 Top Models</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Model', 'Units'].map(h => (
                  <th key={h} style={{ color: '#666', fontSize: '12px', textAlign: 'left', padding: '8px 0', borderBottom: '1px solid #333' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.top_models.map((m, i) => (
                <tr key={i}>
                  <td style={{ color: '#C0C0C0', padding: '10px 0', borderBottom: '1px solid #1a1a1a', fontSize: '14px' }}>{m.model}</td>
                  <td style={{ color: '#999', padding: '10px 0', borderBottom: '1px solid #1a1a1a', fontSize: '14px' }}>{m.units}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
