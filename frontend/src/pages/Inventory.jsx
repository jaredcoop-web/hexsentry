import { useEffect, useState, useRef } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import api from '../api'

const INPUT  = { width: '100%', padding: '10px 12px', background: '#0A0A0A', border: '1px solid #333', borderRadius: '6px', color: '#fff', fontSize: '14px', boxSizing: 'border-box', marginTop: '6px' }
const LABEL  = { color: '#999', fontSize: '13px', display: 'block', marginBottom: '2px' }
const SELECT = { ...INPUT, cursor: 'pointer' }
const CARD   = { background: '#1A1A2E', border: '1px solid #333', borderRadius: '8px', padding: '20px', marginBottom: '20px' }

const FIELD_KEYWORDS = {
  name:         ['model','vehicle','description','item','name','unit','car','make','stock_desc'],
  sku:          ['vin','stock','stocknumber','stock_num','sku','unit_no'],
  cost:         ['cost','invoice','invoicecost','net_cost','purchase'],
  asking_price: ['price','retail','list','msrp','asking','saleprice'],
  date_received:['arrival','arrived','received','instock','in_stock','date_in','date'],
  status:       ['status','available','sold'],
  condition:    ['condition','type'],
  category:     ['category','type','class'],
}

function autoDetect(columns) {
  const detected = {}
  for (const col of columns) {
    const clean = col.toLowerCase().replace(/[\s_\-]/g, '')
    for (const [field, keywords] of Object.entries(FIELD_KEYWORDS)) {
      if (detected[field]) continue
      if (keywords.some(kw => clean.includes(kw.replace(/_/g,'')) || kw.replace(/_/g,'').includes(clean))) {
        detected[field] = col
        break
      }
    }
  }
  return detected
}

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

export default function Inventory({ isMobile }) {
  const [items, setItems]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [showAdd, setShowAdd]       = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [msg, setMsg]               = useState(null)
  const [saving, setSaving]         = useState(false)
  const [filter, setFilter]         = useState('all')
  const [csvData, setCsvData]       = useState(null)
  const [mapping, setMapping]       = useState({})
  const [uploading, setUploading]   = useState(false)
  const fileRef = useRef()

  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState({ name: '', category: 'General', sku: '', cost: '', asking_price: '', date_received: today, condition: 'Used', notes: '' })

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

  const handleAdd = async () => {
    if (!form.name) { setMsg({ type: 'error', text: 'Item name is required' }); return }
    setSaving(true)
    try {
      await api.post('/inventory/add', { ...form, cost: parseFloat(form.cost) || 0, asking_price: parseFloat(form.asking_price) || 0 })
      setMsg({ type: 'success', text: 'Item added!' })
      setForm({ name: '', category: 'General', sku: '', cost: '', asking_price: '', date_received: today, condition: 'Used', notes: '' })
      setShowAdd(false)
      load()
    } catch { setMsg({ type: 'error', text: 'Failed to add item' }) }
    setSaving(false)
  }

  const handleSell   = async (id) => { try { await api.patch(`/inventory/${id}/sell`); setMsg({ type: 'success', text: 'Marked as sold!' }); load() } catch { setMsg({ type: 'error', text: 'Failed' }) } }
  const handleDelete = async (id) => { try { await api.delete(`/inventory/${id}`); setMsg({ type: 'success', text: 'Deleted' }); load() } catch { setMsg({ type: 'error', text: 'Failed' }) } }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const lines   = ev.target.result.split('\n').filter(l => l.trim())
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
      const rows    = lines.slice(1).map(line => { const vals = line.split(',').map(v => v.trim().replace(/"/g, '')); const obj = {}; headers.forEach((h, i) => obj[h] = vals[i] || ''); return obj })
      setCsvData({ headers, rows })
      setMapping(autoDetect(headers))
    }
    reader.readAsText(file)
  }

  const handleUpload = async () => {
    if (!csvData) return
    setUploading(true)
    let saved = 0, failed = 0
    for (const row of csvData.rows) {
      try {
        const item = {
          name:          mapping.name          ? row[mapping.name] || 'Unknown' : 'Unknown',
          sku:           mapping.sku           ? row[mapping.sku] || '' : '',
          cost:          mapping.cost          ? parseFloat(row[mapping.cost]) || 0 : 0,
          asking_price:  mapping.asking_price  ? parseFloat(row[mapping.asking_price]) || 0 : 0,
          date_received: mapping.date_received ? row[mapping.date_received] || today : today,
          condition:     mapping.condition     ? row[mapping.condition] || 'Used' : 'Used',
          category:      mapping.category      ? row[mapping.category] || 'General' : 'General',
          notes: '',
        }
        if (!item.name || item.name === 'Unknown') { failed++; continue }
        await api.post('/inventory/add', item)
        saved++
      } catch { failed++ }
    }
    setMsg({ type: 'success', text: `Uploaded ${saved} items${failed > 0 ? ` (${failed} skipped)` : ''}` })
    setCsvData(null); setMapping({}); setShowUpload(false); load()
    setUploading(false)
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

  const gridCols = isMobile ? '1fr' : '1fr 1fr'

  if (loading) return <p style={{ color: '#666', padding: '40px' }}>Loading inventory...</p>

  return (
    <div style={{ fontFamily: 'Arial, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h1 style={{ color: '#C0C0C0', margin: '0 0 4px', fontSize: isMobile ? '20px' : '24px' }}>📦 Inventory</h1>
          <p style={{ color: '#555', margin: 0, fontSize: '13px' }}>Track stock, monitor age, stale alerts</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => { setShowUpload(!showUpload); setShowAdd(false) }} style={{ padding: '8px 12px', background: 'transparent', color: '#C0C0C0', border: '1px solid #333', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
            📤 Upload
          </button>
          <button onClick={() => { setShowAdd(!showAdd); setShowUpload(false) }} style={{ padding: '8px 12px', background: '#C0C0C0', color: '#0A0A0A', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
            {showAdd ? 'Cancel' : '➕ Add'}
          </button>
        </div>
      </div>

      {msg && (
        <div style={{ background: msg.type === 'success' ? '#0d2d15' : '#2d1515', border: `1px solid ${msg.type === 'success' ? '#27ae60' : '#c0392b'}`, borderRadius: '6px', padding: '10px 14px', marginBottom: '14px', color: msg.type === 'success' ? '#2ecc71' : '#e74c3c', fontSize: '14px' }}>
          {msg.text}
        </div>
      )}

      {/* CSV Upload */}
      {showUpload && (
        <div style={CARD}>
          <h2 style={{ color: '#C0C0C0', fontSize: '15px', marginBottom: '14px' }}>📤 Upload CSV</h2>
          <input ref={fileRef} type="file" accept=".csv" onChange={handleFileChange} style={{ display: 'none' }} />
          <button onClick={() => fileRef.current.click()} style={{ padding: '8px 16px', background: '#333', color: '#C0C0C0', border: '1px solid #444', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', marginBottom: '14px' }}>
            Choose CSV File
          </button>
          {csvData && (
            <>
              <p style={{ color: '#2ecc71', fontSize: '13px', marginBottom: '12px' }}>✅ {csvData.rows.length} rows detected</p>
              <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: '10px', marginBottom: '16px' }}>
                {[
                  { key: 'name', label: 'Item name *' }, { key: 'sku', label: 'SKU / VIN' },
                  { key: 'cost', label: 'Cost' }, { key: 'asking_price', label: 'Asking price' },
                  { key: 'date_received', label: 'Date received' }, { key: 'condition', label: 'Condition' },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label style={LABEL}>{label}</label>
                    <select value={mapping[key] || ''} onChange={e => setMapping(p => ({ ...p, [key]: e.target.value }))} style={SELECT}>
                      <option value="">— skip —</option>
                      {csvData.headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              <button onClick={handleUpload} disabled={uploading} style={{ padding: '10px 20px', background: uploading ? '#333' : '#C0C0C0', color: '#0A0A0A', border: 'none', borderRadius: '6px', cursor: uploading ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '14px' }}>
                {uploading ? 'Uploading...' : `Import ${csvData.rows.length} Items`}
              </button>
            </>
          )}
        </div>
      )}

      {/* Add Item Form */}
      {showAdd && (
        <div style={CARD}>
          <h2 style={{ color: '#C0C0C0', fontSize: '15px', marginBottom: '16px' }}>Add New Item</h2>
          <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: '14px', marginBottom: '14px' }}>
            <div><label style={LABEL}>Item name *</label><input type="text" value={form.name} onChange={e => update('name', e.target.value)} placeholder="e.g. 2022 Ford F-150" style={INPUT} /></div>
            <div><label style={LABEL}>Category</label><select value={form.category} onChange={e => update('category', e.target.value)} style={SELECT}>{['General','Vehicle','Clothing','Electronics','Furniture','Other'].map(o => <option key={o}>{o}</option>)}</select></div>
            <div><label style={LABEL}>SKU / VIN</label><input type="text" value={form.sku} onChange={e => update('sku', e.target.value)} placeholder="optional" style={INPUT} /></div>
            <div><label style={LABEL}>Condition</label><select value={form.condition} onChange={e => update('condition', e.target.value)} style={SELECT}>{['New','Used','Certified','Refurbished'].map(o => <option key={o}>{o}</option>)}</select></div>
            <div><label style={LABEL}>Cost ($)</label><input type="number" value={form.cost} onChange={e => update('cost', e.target.value)} placeholder="0.00" style={INPUT} /></div>
            <div><label style={LABEL}>Asking price ($)</label><input type="number" value={form.asking_price} onChange={e => update('asking_price', e.target.value)} placeholder="0.00" style={INPUT} /></div>
            <div><label style={LABEL}>Date received</label><input type="date" value={form.date_received} onChange={e => update('date_received', e.target.value)} style={INPUT} /></div>
            <div><label style={LABEL}>Notes</label><input type="text" value={form.notes} onChange={e => update('notes', e.target.value)} placeholder="optional" style={INPUT} /></div>
          </div>
          {form.asking_price && form.cost && (
            <div style={{ background: '#0d2d15', border: '1px solid #27ae60', borderRadius: '6px', padding: '8px 12px', marginBottom: '12px', color: '#2ecc71', fontSize: '13px' }}>
              Potential gross: <strong>${(parseFloat(form.asking_price) - parseFloat(form.cost)).toLocaleString()}</strong>
            </div>
          )}
          <button onClick={handleAdd} disabled={saving} style={{ padding: '10px 20px', background: saving ? '#333' : '#C0C0C0', color: '#0A0A0A', border: 'none', borderRadius: '6px', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '14px' }}>
            {saving ? 'Saving...' : 'Add to Inventory'}
          </button>
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
        {[
          { label: 'In Stock',     value: available.length },
          { label: 'Total Value',  value: `$${totalValue.toLocaleString()}`, color: '#2ecc71' },
          { label: 'Avg Days',     value: `${avgDays}d` },
          { label: 'Stale (60d+)', value: stale.length, color: stale.length > 0 ? '#e74c3c' : '#2ecc71' },
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
            🔴 {stale.length} item{stale.length > 1 ? 's' : ''} sitting 60+ days
          </p>
          {stale.slice(0, 3).map((i, idx) => (
            <p key={idx} style={{ color: '#999', margin: '3px 0', fontSize: '12px' }}>
              • {i.name} — {i.days_in_stock} days — ${Number(i.asking_price).toLocaleString()}
            </p>
          ))}
        </div>
      )}

      {/* Age chart */}
      {available.length > 0 && (
        <div style={CARD}>
          <h2 style={{ color: '#C0C0C0', fontSize: '15px', marginBottom: '14px' }}>Age Breakdown</h2>
          <ResponsiveContainer width="100%" height={isMobile ? 160 : 200}>
            <BarChart data={ageBuckets}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222" />
              <XAxis dataKey="bucket" stroke="#666" tick={{ fontSize: 11 }} />
              <YAxis stroke="#666" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#1A1A2E', border: '1px solid #333', color: '#C0C0C0' }} />
              <Bar dataKey="count" fill="#C0C0C0" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Inventory table */}
      <div style={CARD}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <h2 style={{ color: '#C0C0C0', fontSize: '15px', margin: 0 }}>All Inventory</h2>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {['all','available','sold','stale'].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{ padding: '4px 10px', background: filter === f ? '#C0C0C0' : 'transparent', color: filter === f ? '#0A0A0A' : '#666', border: '1px solid #333', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', textTransform: 'capitalize' }}>
                {f}
              </button>
            ))}
          </div>
        </div>
        {filtered.length === 0 ? (
          <p style={{ color: '#555', textAlign: 'center', padding: '20px' }}>
            {items.length === 0 ? 'No inventory yet. Add an item or upload a CSV.' : 'No items match this filter.'}
          </p>
        ) : (
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ minWidth: '550px', width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Item','Category','Cost','Price','Days','Status',''].map(h => (
                    <th key={h} style={{ color: '#666', fontSize: '11px', textAlign: 'left', padding: '8px 0', borderBottom: '1px solid #333' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, i) => (
                  <tr key={i}>
                    <td style={{ color: '#C0C0C0', padding: '10px 0', borderBottom: '1px solid #1a1a1a', fontSize: '13px' }}>
                      {item.name}
                      {item.sku && <span style={{ color: '#555', fontSize: '10px', display: 'block' }}>{item.sku}</span>}
                    </td>
                    <td style={{ color: '#999', padding: '10px 0', borderBottom: '1px solid #1a1a1a', fontSize: '12px' }}>{item.category || '—'}</td>
                    <td style={{ color: '#999', padding: '10px 0', borderBottom: '1px solid #1a1a1a', fontSize: '12px' }}>${Number(item.cost || 0).toLocaleString()}</td>
                    <td style={{ color: '#C0C0C0', padding: '10px 0', borderBottom: '1px solid #1a1a1a', fontSize: '12px' }}>${Number(item.asking_price || 0).toLocaleString()}</td>
                    <td style={{ padding: '10px 0', borderBottom: '1px solid #1a1a1a', fontSize: '12px' }}>
                      <span style={{ color: dayColor(item.days_in_stock || 0) }}>
                        {dayLabel(item.days_in_stock || 0)} {item.days_in_stock || 0}d
                      </span>
                    </td>
                    <td style={{ padding: '10px 0', borderBottom: '1px solid #1a1a1a', fontSize: '12px' }}>
                      <span style={{ color: item.status === 'Sold' ? '#555' : '#2ecc71' }}>{item.status}</span>
                    </td>
                    <td style={{ padding: '10px 0', borderBottom: '1px solid #1a1a1a' }}>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {item.status === 'Available' && (
                          <button onClick={() => handleSell(item.id)} style={{ padding: '3px 7px', background: '#0d2d15', color: '#2ecc71', border: '1px solid #27ae60', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>Sold</button>
                        )}
                        <button onClick={() => handleDelete(item.id)} style={{ padding: '3px 7px', background: 'transparent', color: '#e74c3c', border: '1px solid #e74c3c', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>Del</button>
                      </div>
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
