import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import api from '../api'

const INPUT  = { width: '100%', padding: '10px 12px', background: '#0A0A0A', border: '1px solid #333', borderRadius: '6px', color: '#fff', fontSize: '14px', boxSizing: 'border-box', marginTop: '6px' }
const LABEL  = { color: '#999', fontSize: '13px', display: 'block', marginBottom: '2px' }
const SELECT = { ...INPUT, cursor: 'pointer' }
const CARD   = { background: '#1A1A2E', border: '1px solid #333', borderRadius: '8px', padding: '24px', marginBottom: '24px' }

function dayColor(days) {
  if (days <= 30) return '#2ecc71'
  if (days <= 60) return '#f39c12'
  if (days <= 90) return '#e67e22'
  return '#e74c3c'
}

function dayLabel(days) {
  if (days <= 30) return '🟢'
  if (days <= 60) return '🟡'
  if (days <= 90) return '🟠'
  return '🔴'
}

const EMPTY_FORM = {
  vin: '', stock_number: '', year: '', make: '', model: '', trim: '',
  color: '', mileage: '', cost: '', asking_price: '',
  date_received: new Date().toISOString().slice(0, 10),
  condition: 'Used', notes: ''
}

export default function DealerInventory({ isMobile }) {
  const [items, setItems]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [showAdd, setShowAdd]       = useState(false)
  const [msg, setMsg]               = useState(null)
  const [saving, setSaving]         = useState(false)
  const [deleting, setDeleting]     = useState(false)
  const [filter, setFilter]         = useState('available')
  const [vinLoading, setVinLoading] = useState(false)
  const [vinError, setVinError]     = useState(null)
  const [form, setForm]             = useState(EMPTY_FORM)

  const update = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.get('/inventory/list')
      setItems(res.data || [])
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const decodeVIN = async () => {
    const vin = form.vin.trim().toUpperCase()
    if (vin.length !== 17) { setVinError('VIN must be exactly 17 characters'); return }
    setVinLoading(true)
    setVinError(null)
    try {
      const res  = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/${vin}?format=json`)
      const data = await res.json()
      const results = data.Results
      const getValue = (variable) => {
        const found = results.find(r => r.Variable === variable)
        return found && found.Value && found.Value !== 'Not Applicable' ? found.Value : ''
      }
      const year  = getValue('Model Year')
      const make  = getValue('Make')
      const model = getValue('Model')
      const trim  = getValue('Series') || getValue('Trim') || ''
      const body  = getValue('Body Class') || ''
      const engine = getValue('Displacement (L)') ? `${getValue('Displacement (L)')}L` : ''
      const drive  = getValue('Drive Type') || ''
      if (!year && !make && !model) {
        setVinError('Could not decode VIN — please check and try again')
        setVinLoading(false)
        return
      }
      setForm(p => ({...p,year, make, model: `${model}${trim ? ' ' + trim : ''}`.trim(),trim,}))
      setVinError(null)
    } catch {
      setVinError('Failed to decode VIN — check your connection')
    }
    setVinLoading(false)
  }

  const handleAdd = async () => {
    if (!form.asking_price) { setMsg({ type: 'error', text: 'Asking price is required.' }); return }
    if (!form.make && !form.vin) { setMsg({ type: 'error', text: 'Please enter a VIN or vehicle details.' }); return }
    setSaving(true)
    try {
      const vehicleName = `${form.year} ${form.make} ${form.model}`.trim()
      await api.post('/inventory/add', {
        name:          vehicleName,
        sku:           form.vin || form.stock_number,
        cost:          parseFloat(form.cost) || 0,
        asking_price:  parseFloat(form.asking_price) || 0,
        date_received: form.date_received,
        condition:     form.condition,
        category:      'Vehicle',
        notes:         [
          form.stock_number ? `Stock: ${form.stock_number}` : '',
          form.color ? `Color: ${form.color}` : '',
          form.mileage ? `Miles: ${parseInt(form.mileage).toLocaleString()}` : '',
          form.notes || ''
        ].filter(Boolean).join(' | '),
      })
      setMsg({ type: 'success', text: `${vehicleName} added to lot!` })
      setForm(EMPTY_FORM)
      setShowAdd(false)
      load()
    } catch { setMsg({ type: 'error', text: 'Failed to add vehicle' }) }
    setSaving(false)
  }

  const handleSell = async (id) => {
    try { await api.patch(`/inventory/${id}/sell`); setMsg({ type: 'success', text: 'Marked as sold!' }); load() }
    catch { setMsg({ type: 'error', text: 'Failed' }) }
  }

  const handleDelete = async (id) => {
    try { await api.delete(`/inventory/${id}`); load() }
    catch { setMsg({ type: 'error', text: 'Failed to delete' }) }
  }

  const handleDeleteAll = async () => {
    if (!window.confirm('Delete ALL vehicles from lot inventory? This cannot be undone.')) return
    setDeleting(true)
    try {
      await api.delete('/inventory')
      setMsg({ type: 'success', text: 'All inventory cleared' })
      load()
    } catch { setMsg({ type: 'error', text: 'Failed to clear inventory' }) }
    setDeleting(false)
  }

  const available  = items.filter(i => i.status === 'Available')
  const stale      = items.filter(i => i.days_in_stock > 60 && i.status === 'Available')
  const totalValue = available.reduce((s, i) => s + (i.asking_price || 0), 0)
  const avgDays    = available.length ? Math.round(available.reduce((s, i) => s + (i.days_in_stock || 0), 0) / available.length) : 0

  const ageBuckets = [
    { bucket: '0-30d',  count: available.filter(i => i.days_in_stock <= 30).length },
    { bucket: '31-60d', count: available.filter(i => i.days_in_stock > 30 && i.days_in_stock <= 60).length },
    { bucket: '61-90d', count: available.filter(i => i.days_in_stock > 60 && i.days_in_stock <= 90).length },
    { bucket: '90+d',   count: available.filter(i => i.days_in_stock > 90).length },
  ]

  const filtered = items.filter(i => {
    if (filter === 'available') return i.status === 'Available'
    if (filter === 'sold')      return i.status === 'Sold'
    if (filter === 'stale')     return i.days_in_stock > 60 && i.status === 'Available'
    return true
  })

  // Parse notes to extract stock, color, mileage
  const parseNotes = (notes) => {
    const result = { stock: '', color: '', mileage: '' }
    if (!notes) return result
    const parts = notes.split(' | ')
    parts.forEach(p => {
      if (p.startsWith('Stock:')) result.stock = p.replace('Stock: ', '').replace('Stock:', '').trim()
      if (p.startsWith('Color:')) result.color = p.replace('Color: ', '').replace('Color:', '').trim()
      if (p.startsWith('Miles:')) result.mileage = p.replace('Miles: ', '').replace('Miles:', '').trim()
    })
    return result
  }

  const gridCols = isMobile ? '1fr' : '1fr 1fr'

  if (loading) return <p style={{ color: '#666', padding: '40px' }}>Loading lot inventory...</p>

  return (
    <div style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h1 style={{ color: '#C0C0C0', margin: '0 0 4px', fontSize: isMobile ? '20px' : '24px' }}>🚗 Lot Inventory</h1>
          <p style={{ color: '#555', margin: 0, fontSize: '13px' }}>Track vehicles on your lot — age, value, and status</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={handleDeleteAll} disabled={deleting} style={{ padding: '8px 14px', background: 'transparent', color: '#e74c3c', border: '1px solid #e74c3c', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
            {deleting ? 'Clearing...' : 'Clear All'}
          </button>
          <button onClick={() => setShowAdd(!showAdd)} style={{ padding: '10px 16px', background: '#C0C0C0', color: '#0A0A0A', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
            {showAdd ? 'Cancel' : '➕ Add Vehicle'}
          </button>
        </div>
      </div>

      {msg && (
        <div style={{ background: msg.type === 'success' ? '#0d2d15' : '#2d1515', border: `1px solid ${msg.type === 'success' ? '#27ae60' : '#c0392b'}`, borderRadius: '6px', padding: '10px 14px', marginBottom: '16px', color: msg.type === 'success' ? '#2ecc71' : '#e74c3c', fontSize: '14px' }}>
          {msg.text}
        </div>
      )}

      {/* Add Vehicle Form */}
      {showAdd && (
        <div style={CARD}>
          <h2 style={{ color: '#C0C0C0', fontSize: '16px', marginBottom: '20px' }}>Add Vehicle</h2>

          {/* VIN Decode */}
          <div style={{ background: '#0d1a2d', border: '1px solid #1a3a5a', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
            <p style={{ color: '#4a9eff', fontSize: '13px', fontWeight: 'bold', margin: '0 0 12px' }}>🔍 VIN Lookup — Auto-fill vehicle details</p>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label style={LABEL}>VIN (17 characters)</label>
                <input
                  type="text"
                  value={form.vin}
                  onChange={e => update('vin', e.target.value.toUpperCase())}
                  placeholder="e.g. 1HGBH41JXMN109186"
                  maxLength={17}
                  style={{ ...INPUT, fontFamily: 'monospace', letterSpacing: '2px' }}
                />
                <p style={{ color: form.vin.length === 17 ? '#2ecc71' : '#555', fontSize: '11px', margin: '4px 0 0' }}>
                  {form.vin.length}/17 characters
                </p>
              </div>
              <button
                onClick={decodeVIN}
                disabled={vinLoading || form.vin.length !== 17}
                style={{ padding: '10px 16px', background: form.vin.length === 17 ? '#4a9eff' : '#333', color: '#fff', border: 'none', borderRadius: '6px', cursor: form.vin.length === 17 ? 'pointer' : 'not-allowed', fontSize: '13px', fontWeight: 'bold', whiteSpace: 'nowrap', marginTop: '6px' }}
              >
                {vinLoading ? 'Decoding...' : 'Decode VIN'}
              </button>
            </div>
            {vinError && <p style={{ color: '#e74c3c', fontSize: '12px', margin: '6px 0 0' }}>❌ {vinError}</p>}
            {form.year && form.make && (
              <div style={{ background: '#0d2d15', border: '1px solid #27ae60', borderRadius: '6px', padding: '10px 12px', marginTop: '10px' }}>
                <p style={{ color: '#2ecc71', fontSize: '13px', margin: 0 }}>
                  ✅ Decoded: <strong>{form.year} {form.make} {form.model}</strong>
                </p>
              </div>
            )}
            <p style={{ color: '#555', fontSize: '11px', margin: '8px 0 0' }}>No VIN? Fill in details manually below.</p>
          </div>

          {/* Vehicle fields */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '14px', marginBottom: '16px' }}>
            <div><label style={LABEL}>Year</label><input type="text" value={form.year} onChange={e => update('year', e.target.value)} placeholder="2022" style={INPUT} /></div>
            <div><label style={LABEL}>Make</label><input type="text" value={form.make} onChange={e => update('make', e.target.value)} placeholder="Ford" style={INPUT} /></div>
            <div><label style={LABEL}>Model / Trim</label><input type="text" value={form.model} onChange={e => update('model', e.target.value)} placeholder="F-150 XLT" style={INPUT} /></div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: '14px', marginBottom: '16px' }}>
            <div><label style={LABEL}>Stock #</label><input type="text" value={form.stock_number} onChange={e => update('stock_number', e.target.value)} placeholder="ST001" style={INPUT} /></div>
            <div><label style={LABEL}>Color</label><input type="text" value={form.color} onChange={e => update('color', e.target.value)} placeholder="Silver" style={INPUT} /></div>
            <div><label style={LABEL}>Mileage</label><input type="number" value={form.mileage} onChange={e => update('mileage', e.target.value)} placeholder="0" style={INPUT} /></div>
            <div><label style={LABEL}>Condition</label><select value={form.condition} onChange={e => update('condition', e.target.value)} style={SELECT}>{['New','Used','Certified Pre-Owned'].map(o => <option key={o}>{o}</option>)}</select></div>
            <div><label style={LABEL}>Invoice / Cost ($)</label><input type="number" value={form.cost} onChange={e => update('cost', e.target.value)} placeholder="0.00" style={INPUT} /></div>
            <div><label style={LABEL}>Asking Price ($) *</label><input type="number" value={form.asking_price} onChange={e => update('asking_price', e.target.value)} placeholder="0.00" style={INPUT} /></div>
            <div><label style={LABEL}>Date Acquired</label><input type="date" value={form.date_received} onChange={e => update('date_received', e.target.value)} style={INPUT} /></div>
            <div><label style={LABEL}>Notes</label><input type="text" value={form.notes} onChange={e => update('notes', e.target.value)} placeholder="optional" style={INPUT} /></div>
          </div>

          {form.asking_price && form.cost && (
            <div style={{ background: '#0d2d15', border: '1px solid #27ae60', borderRadius: '6px', padding: '10px 14px', marginBottom: '16px', color: '#2ecc71', fontSize: '13px' }}>
              Potential front end gross: <strong>${(parseFloat(form.asking_price) - parseFloat(form.cost)).toLocaleString()}</strong>
            </div>
          )}

          <button onClick={handleAdd} disabled={saving} style={{ padding: '12px 24px', background: saving ? '#333' : '#C0C0C0', color: '#0A0A0A', border: 'none', borderRadius: '6px', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '14px' }}>
            {saving ? 'Saving...' : 'Add to Lot'}
          </button>
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
        {[
          { label: 'Units on Lot',    value: available.length },
          { label: 'Total Lot Value', value: `$${totalValue.toLocaleString()}`, color: '#2ecc71' },
          { label: 'Avg Days on Lot', value: `${avgDays}d` },
          { label: 'Stale (60d+)',    value: stale.length, color: stale.length > 0 ? '#e74c3c' : '#2ecc71' },
        ].map((k, i) => (
          <div key={i} style={{ background: '#1A1A2E', border: '1px solid #333', borderRadius: '8px', padding: '14px 16px', flex: '1 1', minWidth: isMobile ? 'calc(50% - 10px)' : '120px' }}>
            <p style={{ color: '#666', fontSize: '11px', margin: '0 0 6px', textTransform: 'uppercase' }}>{k.label}</p>
            <p style={{ color: k.color || '#C0C0C0', fontSize: isMobile ? '18px' : '22px', fontWeight: 'bold', margin: 0 }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Stale alerts */}
      {stale.length > 0 && (
        <div style={{ background: '#2d1515', border: '1px solid #c0392b', borderRadius: '8px', padding: '14px 16px', marginBottom: '20px' }}>
          <p style={{ color: '#e74c3c', margin: '0 0 8px', fontWeight: 'bold', fontSize: '13px' }}>
            🔴 {stale.length} vehicle{stale.length > 1 ? 's' : ''} sitting 60+ days — consider price reduction
          </p>
          {stale.slice(0, 3).map((i, idx) => (
            <p key={idx} style={{ color: '#999', margin: '3px 0', fontSize: '12px' }}>
              • {i.name} — {i.days_in_stock} days — ${Number(i.asking_price).toLocaleString()}
            </p>
          ))}
          {stale.length > 3 && <p style={{ color: '#666', fontSize: '11px', margin: '4px 0 0' }}>+{stale.length - 3} more...</p>}
        </div>
      )}

      {/* Age chart */}
      {available.length > 0 && (
        <div style={CARD}>
          <h2 style={{ color: '#C0C0C0', fontSize: '15px', marginBottom: '14px' }}>Days on Lot</h2>
          <ResponsiveContainer width="100%" height={isMobile ? 160 : 200}>
            <BarChart data={ageBuckets}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222" />
              <XAxis dataKey="bucket" stroke="#666" tick={{ fontSize: 11 }} />
              <YAxis stroke="#666" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#1A1A2E', border: '1px solid #333', color: '#C0C0C0' }} />
              <Bar dataKey="count" fill="#4a9eff" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Lot table */}
      <div style={CARD}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <h2 style={{ color: '#C0C0C0', fontSize: '15px', margin: 0 }}>Lot Vehicles</h2>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {['available', 'sold', 'stale', 'all'].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{ padding: '4px 10px', background: filter === f ? '#4a9eff' : 'transparent', color: filter === f ? '#fff' : '#666', border: `1px solid ${filter === f ? '#4a9eff' : '#333'}`, borderRadius: '6px', cursor: 'pointer', fontSize: '11px', textTransform: 'capitalize' }}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <p style={{ color: '#555', textAlign: 'center', padding: '20px' }}>
            {items.length === 0 ? 'No vehicles yet. Add your first vehicle above.' : 'No vehicles match this filter.'}
          </p>
        ) : (
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ minWidth: '750px', width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Stock #', 'Year', 'Make', 'Model', 'VIN', 'Color', 'Mileage', 'Price', 'Days', 'Status', ''].map(h => (
                    <th key={h} style={{ color: '#666', fontSize: '11px', textAlign: 'left', padding: '8px 6px', borderBottom: '1px solid #333', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, i) => {
                  const parsed = parseNotes(item.notes)
                  const nameParts = (item.name || '').split(' ')
                  const year  = nameParts[0] || ''
                  const make  = nameParts[1] || ''
                  const model = nameParts.slice(2).join(' ') || ''
                  return (
                    <tr key={i}>
                      <td style={{ color: '#4a9eff', padding: '10px 6px', borderBottom: '1px solid #1a1a1a', fontSize: '12px', fontFamily: 'monospace' }}>{parsed.stock || item.sku?.substring(0, 8) || '—'}</td>
                      <td style={{ color: '#C0C0C0', padding: '10px 6px', borderBottom: '1px solid #1a1a1a', fontSize: '13px' }}>{year}</td>
                      <td style={{ color: '#C0C0C0', padding: '10px 6px', borderBottom: '1px solid #1a1a1a', fontSize: '13px' }}>{make}</td>
                      <td style={{ color: '#C0C0C0', padding: '10px 6px', borderBottom: '1px solid #1a1a1a', fontSize: '13px' }}>{model}</td>
                      <td style={{ color: '#555', padding: '10px 6px', borderBottom: '1px solid #1a1a1a', fontSize: '11px', fontFamily: 'monospace' }}>{item.sku || '—'}</td>
                      <td style={{ color: '#999', padding: '10px 6px', borderBottom: '1px solid #1a1a1a', fontSize: '12px' }}>{parsed.color || '—'}</td>
                      <td style={{ color: '#999', padding: '10px 6px', borderBottom: '1px solid #1a1a1a', fontSize: '12px' }}>{parsed.mileage || '—'}</td>
                      <td style={{ color: '#2ecc71', padding: '10px 6px', borderBottom: '1px solid #1a1a1a', fontSize: '12px' }}>${Number(item.asking_price || 0).toLocaleString()}</td>
                      <td style={{ padding: '10px 6px', borderBottom: '1px solid #1a1a1a', fontSize: '12px' }}>
                        <span style={{ color: dayColor(item.days_in_stock || 0) }}>
                          {dayLabel(item.days_in_stock || 0)} {item.days_in_stock || 0}d
                        </span>
                      </td>
                      <td style={{ padding: '10px 6px', borderBottom: '1px solid #1a1a1a', fontSize: '12px' }}>
                        <span style={{ color: item.status === 'Sold' ? '#555' : '#2ecc71' }}>{item.status}</span>
                      </td>
                      <td style={{ padding: '10px 6px', borderBottom: '1px solid #1a1a1a' }}>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {item.status === 'Available' && (
                            <button onClick={() => handleSell(item.id)} style={{ padding: '3px 7px', background: '#0d2d15', color: '#2ecc71', border: '1px solid #27ae60', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>Sold</button>
                          )}
                          <button onClick={() => handleDelete(item.id)} style={{ padding: '3px 7px', background: 'transparent', color: '#e74c3c', border: '1px solid #e74c3c', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>Del</button>
                        </div>
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
