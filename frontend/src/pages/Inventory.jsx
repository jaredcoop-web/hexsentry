import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import api from '../api'

const INPUT = { width: '100%', padding: '10px 12px', background: '#0A0A0A', border: '1px solid #333', borderRadius: '6px', color: '#fff', fontSize: '14px', boxSizing: 'border-box', marginTop: '6px' }
const LABEL = { color: '#999', fontSize: '13px', display: 'block', marginBottom: '2px' }
const SELECT = { ...INPUT, cursor: 'pointer' }
const CARD = { background: '#1A1A2E', border: '1px solid #333', borderRadius: '8px', padding: '24px', marginBottom: '24px' }

function dayColor(days) {
  if (days <= 30)  return '#2ecc71'
  if (days <= 60)  return '#f39c12'
  if (days <= 90)  return '#e67e22'
  return '#e74c3c'
}

function dayLabel(days) {
  if (days <= 30)  return '🟢'
  if (days <= 60)  return '🟡'
  if (days <= 90)  return '🟠'
  return '🔴'
}

export default function Inventory() {
  const [items, setItems]       = useState([])
  const [summary, setSummary]   = useState(null)
  const [loading, setLoading]   = useState(true)
  const [showAdd, setShowAdd]   = useState(false)
  const [msg, setMsg]           = useState(null)
  const [saving, setSaving]     = useState(false)
  const [filter, setFilter]     = useState('all')

  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState({
    name: '', category: 'General', sku: '', cost: '',
    asking_price: '', date_received: today, condition: 'Used', notes: ''
  })

  const update = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const load = async () => {
    setLoading(true)
    try {
      const [invRes, sumRes] = await Promise.all([
        api.get('/inventory/list'),
        api.get('/inventory'),
      ])
      setItems(invRes.data || [])
      setSummary(sumRes.data?.summary || null)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleAdd = async () => {
    if (!form.name) { setMsg({ type: 'error', text: 'Item name is required' }); return }
    setSaving(true)
    try {
      await api.post('/inventory/add', {
        ...form,
        cost:         parseFloat(form.cost) || 0,
        asking_price: parseFloat(form.asking_price) || 0,
      })
      setMsg({ type: 'success', text: 'Item added successfully!' })
      setForm({ name: '', category: 'General', sku: '', cost: '', asking_price: '', date_received: today, condition: 'Used', notes: '' })
      setShowAdd(false)
      load()
    } catch { setMsg({ type: 'error', text: 'Failed to add item' }) }
    setSaving(false)
  }

  const handleSell = async (id) => {
    try {
      await api.patch(`/inventory/${id}/sell`)
      setMsg({ type: 'success', text: 'Item marked as sold!' })
      load()
    } catch { setMsg({ type: 'error', text: 'Failed to update item' }) }
  }

  const handleDelete = async (id) => {
    try {
      await api.delete(`/inventory/${id}`)
      setMsg({ type: 'success', text: 'Item deleted' })
      load()
    } catch { setMsg({ type: 'error', text: 'Failed to delete item' }) }
  }

  const filtered = items.filter(i => {
    if (filter === 'available') return i.status === 'Available'
    if (filter === 'sold')      return i.status === 'Sold'
    if (filter === 'stale')     return i.days_in_stock > 60 && i.status === 'Available'
    return true
  })

  const available    = items.filter(i => i.status === 'Available')
  const stale        = items.filter(i => i.days_in_stock > 60 && i.status === 'Available')
  const totalValue   = available.reduce((s, i) => s + (i.asking_price || 0), 0)
  const avgDays      = available.length ? Math.round(available.reduce((s, i) => s + (i.days_in_stock || 0), 0) / available.length) : 0

  const ageBuckets = [
    { bucket: '0-30 days',  count: available.filter(i => i.days_in_stock <= 30).length },
    { bucket: '31-60 days', count: available.filter(i => i.days_in_stock > 30 && i.days_in_stock <= 60).length },
    { bucket: '61-90 days', count: available.filter(i => i.days_in_stock > 60 && i.days_in_stock <= 90).length },
    { bucket: '90+ days',   count: available.filter(i => i.days_in_stock > 90).length },
  ]

  if (loading) return <p style={{ color: '#666', padding: '40px' }}>Loading inventory...</p>

  return (
    <div style={{ fontFamily: 'Arial, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ color: '#C0C0C0', margin: '0 0 4px' }}>📦 Inventory</h1>
          <p style={{ color: '#555', margin: 0, fontSize: '13px' }}>Track stock, monitor age, and get alerts on slow-moving items</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} style={{ padding: '10px 20px', background: '#C0C0C0', color: '#0A0A0A', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>
          {showAdd ? 'Cancel' : '➕ Add Item'}
        </button>
      </div>

      {msg && (
        <div style={{ background: msg.type === 'success' ? '#0d2d15' : '#2d1515', border: `1px solid ${msg.type === 'success' ? '#27ae60' : '#c0392b'}`, borderRadius: '6px', padding: '10px 14px', marginBottom: '16px', color: msg.type === 'success' ? '#2ecc71' : '#e74c3c', fontSize: '14px' }}>
          {msg.text}
        </div>
      )}

      {/* Add Item Form */}
      {showAdd && (
        <div style={CARD}>
          <h2 style={{ color: '#C0C0C0', fontSize: '16px', marginBottom: '20px' }}>Add New Item</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={LABEL}>Item name *</label>
              <input type="text" value={form.name} onChange={e => update('name', e.target.value)} placeholder="e.g. 2022 Ford F-150 / Blue Hoodie / iPhone 15" style={INPUT} />
            </div>
            <div>
              <label style={LABEL}>Category</label>
              <select value={form.category} onChange={e => update('category', e.target.value)} style={SELECT}>
                {['General','Vehicle','Clothing','Electronics','Furniture','Food & Beverage','Other'].map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label style={LABEL}>SKU / VIN / Stock # <span style={{ color: '#555' }}>optional</span></label>
              <input type="text" value={form.sku} onChange={e => update('sku', e.target.value)} placeholder="e.g. VIN123 / SKU-001" style={INPUT} />
            </div>
            <div>
              <label style={LABEL}>Condition</label>
              <select value={form.condition} onChange={e => update('condition', e.target.value)} style={SELECT}>
                {['New','Used','Certified','Refurbished'].map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label style={LABEL}>Cost / purchase price ($)</label>
              <input type="number" value={form.cost} onChange={e => update('cost', e.target.value)} placeholder="0.00" style={INPUT} />
            </div>
            <div>
              <label style={LABEL}>Asking / selling price ($)</label>
              <input type="number" value={form.asking_price} onChange={e => update('asking_price', e.target.value)} placeholder="0.00" style={INPUT} />
            </div>
            <div>
              <label style={LABEL}>Date received</label>
              <input type="date" value={form.date_received} onChange={e => update('date_received', e.target.value)} style={INPUT} />
            </div>
            <div>
              <label style={LABEL}>Notes <span style={{ color: '#555' }}>optional</span></label>
              <input type="text" value={form.notes} onChange={e => update('notes', e.target.value)} placeholder="Any additional details" style={INPUT} />
            </div>
          </div>
          {form.asking_price && form.cost && (
            <div style={{ background: '#0d2d15', border: '1px solid #27ae60', borderRadius: '6px', padding: '10px 14px', marginBottom: '16px', color: '#2ecc71', fontSize: '13px' }}>
              Potential gross: <strong>${(parseFloat(form.asking_price) - parseFloat(form.cost)).toLocaleString()}</strong>
            </div>
          )}
          <button onClick={handleAdd} disabled={saving} style={{ padding: '12px 24px', background: saving ? '#333' : '#C0C0C0', color: '#0A0A0A', border: 'none', borderRadius: '6px', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '14px' }}>
            {saving ? 'Saving...' : 'Add to Inventory'}
          </button>
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px' }}>
        {[
          { label: 'In Stock',       value: available.length },
          { label: 'Total Value',    value: `$${totalValue.toLocaleString()}`, color: '#2ecc71' },
          { label: 'Avg Days',       value: `${avgDays} days` },
          { label: 'Stale (60d+)',   value: stale.length, color: stale.length > 0 ? '#e74c3c' : '#2ecc71' },
        ].map((k, i) => (
          <div key={i} style={{ background: '#1A1A2E', border: '1px solid #333', borderRadius: '8px', padding: '20px', flex: 1, minWidth: '140px' }}>
            <p style={{ color: '#666', fontSize: '12px', margin: '0 0 8px', textTransform: 'uppercase' }}>{k.label}</p>
            <p style={{ color: k.color || '#C0C0C0', fontSize: '24px', fontWeight: 'bold', margin: 0 }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Stale alerts */}
      {stale.length > 0 && (
        <div style={{ background: '#2d1515', border: '1px solid #c0392b', borderRadius: '8px', padding: '16px 20px', marginBottom: '24px' }}>
          <p style={{ color: '#e74c3c', margin: '0 0 8px', fontWeight: 'bold', fontSize: '14px' }}>
            🔴 {stale.length} item{stale.length > 1 ? 's' : ''} sitting 60+ days — consider price reduction or promotion
          </p>
          {stale.slice(0, 3).map((i, idx) => (
            <p key={idx} style={{ color: '#999', margin: '4px 0', fontSize: '13px' }}>
              • {i.name} — {i.days_in_stock} days — ${Number(i.asking_price).toLocaleString()}
            </p>
          ))}
          {stale.length > 3 && <p style={{ color: '#666', fontSize: '12px', margin: '4px 0' }}>+{stale.length - 3} more...</p>}
        </div>
      )}

      {/* Age chart */}
      {available.length > 0 && (
        <div style={CARD}>
          <h2 style={{ color: '#C0C0C0', fontSize: '16px', marginBottom: '16px' }}>Inventory Age Breakdown</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={ageBuckets}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222" />
              <XAxis dataKey="bucket" stroke="#666" tick={{ fontSize: 12 }} />
              <YAxis stroke="#666" tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ background: '#1A1A2E', border: '1px solid #333', color: '#C0C0C0' }} />
              <Bar dataKey="count" fill="#C0C0C0" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Inventory table */}
      <div style={CARD}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ color: '#C0C0C0', fontSize: '16px', margin: 0 }}>All Inventory</h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            {['all', 'available', 'sold', 'stale'].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{ padding: '6px 12px', background: filter === f ? '#C0C0C0' : 'transparent', color: filter === f ? '#0A0A0A' : '#666', border: '1px solid #333', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', textTransform: 'capitalize' }}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <p style={{ color: '#555', textAlign: 'center', padding: '40px 0' }}>
            {items.length === 0 ? 'No inventory yet. Add your first item above.' : 'No items match this filter.'}
          </p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Item', 'Category', 'Cost', 'Price', 'Days', 'Status', ''].map(h => (
                  <th key={h} style={{ color: '#666', fontSize: '12px', textAlign: 'left', padding: '8px 0', borderBottom: '1px solid #333' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, i) => (
                <tr key={i}>
                  <td style={{ color: '#C0C0C0', padding: '12px 0', borderBottom: '1px solid #1a1a1a', fontSize: '14px' }}>
                    {item.name}
                    {item.sku && <span style={{ color: '#555', fontSize: '11px', display: 'block' }}>{item.sku}</span>}
                  </td>
                  <td style={{ color: '#999', padding: '12px 0', borderBottom: '1px solid #1a1a1a', fontSize: '13px' }}>{item.category || '—'}</td>
                  <td style={{ color: '#999', padding: '12px 0', borderBottom: '1px solid #1a1a1a', fontSize: '13px' }}>${Number(item.cost || 0).toLocaleString()}</td>
                  <td style={{ color: '#C0C0C0', padding: '12px 0', borderBottom: '1px solid #1a1a1a', fontSize: '13px' }}>${Number(item.asking_price || 0).toLocaleString()}</td>
                  <td style={{ padding: '12px 0', borderBottom: '1px solid #1a1a1a', fontSize: '13px' }}>
                    <span style={{ color: dayColor(item.days_in_stock || 0) }}>
                      {dayLabel(item.days_in_stock || 0)} {item.days_in_stock || 0}d
                    </span>
                  </td>
                  <td style={{ padding: '12px 0', borderBottom: '1px solid #1a1a1a', fontSize: '13px' }}>
                    <span style={{ color: item.status === 'Sold' ? '#555' : '#2ecc71' }}>{item.status}</span>
                  </td>
                  <td style={{ padding: '12px 0', borderBottom: '1px solid #1a1a1a' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {item.status === 'Available' && (
                        <button onClick={() => handleSell(item.id)} style={{ padding: '4px 8px', background: '#0d2d15', color: '#2ecc71', border: '1px solid #27ae60', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>
                          Sold
                        </button>
                      )}
                      <button onClick={() => handleDelete(item.id)} style={{ padding: '4px 8px', background: 'transparent', color: '#e74c3c', border: '1px solid #e74c3c', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
