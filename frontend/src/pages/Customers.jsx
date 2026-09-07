import { useEffect, useState, useRef } from 'react'
import { Users } from 'lucide-react'
import api from '../api'

const INPUT  = { width: '100%', padding: '10px 12px', background: '#0A0A0A', border: '1px solid #333', borderRadius: '6px', color: '#fff', fontSize: '14px', boxSizing: 'border-box', marginTop: '6px' }
const LABEL  = { color: '#999', fontSize: '13px', display: 'block', marginBottom: '2px' }
const CARD   = { background: '#1A1A2E', border: '1px solid #333', borderRadius: '8px', padding: '20px', marginBottom: '20px' }
const fmt    = (n) => n != null ? `$${Number(n).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : '$0.00'

const EMPTY_FORM = {
  first_name: '', last_name: '', phone: '', email: '',
  address: '', city: '', state: '', zip: '',
  id_number: '', employer: '', monthly_income: '', notes: ''
}

const CustomerForm = ({ form, update, saving, onSave, onCancel, saveLabel, isMobile }) => {
  const gridCols = isMobile ? '1fr' : '1fr 1fr'
  return (
    <div style={CARD}>
      <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: '14px', marginBottom: '14px' }}>
        <div><label style={LABEL}>First name *</label><input type="text" value={form.first_name} onChange={e => update('first_name', e.target.value)} placeholder="John" style={INPUT} /></div>
        <div><label style={LABEL}>Last name *</label><input type="text" value={form.last_name} onChange={e => update('last_name', e.target.value)} placeholder="Smith" style={INPUT} /></div>
        <div><label style={LABEL}>Phone</label><input type="text" value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="(555) 123-4567" style={INPUT} /></div>
        <div><label style={LABEL}>Email</label><input type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder="john@email.com" style={INPUT} /></div>
      </div>
      <div style={{ background: '#0d0d1a', border: '1px solid #222', borderRadius: '8px', padding: '14px', marginBottom: '14px' }}>
        <p style={{ color: '#4a9eff', fontSize: '12px', fontWeight: 'bold', margin: '0 0 10px', textTransform: 'uppercase' }}>Address</p>
        <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: '14px' }}>
          <div style={{ gridColumn: isMobile ? '1' : '1 / -1' }}><label style={LABEL}>Street address</label><input type="text" value={form.address} onChange={e => update('address', e.target.value)} placeholder="123 Main St" style={INPUT} /></div>
          <div><label style={LABEL}>City</label><input type="text" value={form.city} onChange={e => update('city', e.target.value)} placeholder="Houston" style={INPUT} /></div>
          <div><label style={LABEL}>State</label><input type="text" value={form.state} onChange={e => update('state', e.target.value)} placeholder="TX" style={INPUT} /></div>
          <div><label style={LABEL}>Zip</label><input type="text" value={form.zip} onChange={e => update('zip', e.target.value)} placeholder="77001" style={INPUT} /></div>
        </div>
      </div>
      <div style={{ background: '#0d0d1a', border: '1px solid #222', borderRadius: '8px', padding: '14px', marginBottom: '14px' }}>
        <p style={{ color: '#2ecc71', fontSize: '12px', fontWeight: 'bold', margin: '0 0 10px', textTransform: 'uppercase' }}>Employment & ID</p>
        <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: '14px' }}>
          <div><label style={LABEL}>ID / License #</label><input type="text" value={form.id_number} onChange={e => update('id_number', e.target.value)} placeholder="DL123456" style={INPUT} /></div>
          <div><label style={LABEL}>Employer</label><input type="text" value={form.employer} onChange={e => update('employer', e.target.value)} placeholder="Company name" style={INPUT} /></div>
          <div><label style={LABEL}>Monthly income ($)</label><input type="number" value={form.monthly_income} onChange={e => update('monthly_income', e.target.value)} placeholder="0.00" style={INPUT} /></div>
        </div>
      </div>
      <div style={{ marginBottom: '16px' }}>
        <label style={LABEL}>Notes</label>
        <textarea value={form.notes} onChange={e => update('notes', e.target.value)} placeholder="Any additional notes..." rows={2} style={{ ...INPUT, resize: 'vertical' }} />
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={onSave} disabled={saving} style={{ padding: '10px 20px', background: saving ? '#333' : '#C0C0C0', color: '#0A0A0A', border: 'none', borderRadius: '6px', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '14px' }}>
          {saving ? 'Saving...' : saveLabel}
        </button>
        <button onClick={onCancel} style={{ padding: '10px 20px', background: 'transparent', color: '#666', border: '1px solid #333', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }}>
          Cancel
        </button>
      </div>
    </div>
  )
}

export default function Customers({ isMobile }) {
  const [customers, setCustomers]           = useState([])
  const [selected, setSelected]             = useState(null)
  const [customerDetail, setCustomerDetail] = useState(null)
  const [showNew, setShowNew]               = useState(false)
  const [showEdit, setShowEdit]             = useState(false)
  const [loading, setLoading]               = useState(true)
  const [saving, setSaving]                 = useState(false)
  const [msg, setMsg]                       = useState(null)
  const [search, setSearch]                 = useState('')
  const [form, setForm]                     = useState(EMPTY_FORM)

  const update = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.get('/customers')
      setCustomers(res.data || [])
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const loadDetail = async (id) => {
    try {
      const res = await api.get(`/customers/${id}`)
      setCustomerDetail(res.data)
    } catch {}
  }

  const handleSelect = (customer) => {
    setSelected(customer)
    loadDetail(customer.id)
    setShowNew(false)
    setShowEdit(false)
  }

  const handleCreate = async () => {
    if (!form.first_name || !form.last_name) {
      setMsg({ type: 'error', text: 'First and last name are required.' })
      return
    }
    setSaving(true)
    try {
      const res = await api.post('/customers', {
        ...form,
        monthly_income: parseFloat(form.monthly_income) || 0
      })
      setMsg({ type: 'success', text: `${form.first_name} ${form.last_name} added!` })
      setForm(EMPTY_FORM)
      setShowNew(false)
      load()
    } catch { setMsg({ type: 'error', text: 'Failed to create customer' }) }
    setSaving(false)
  }

  const handleUpdate = async () => {
    setSaving(true)
    try {
      await api.patch(`/customers/${selected.id}`, {
        ...form,
        monthly_income: parseFloat(form.monthly_income) || 0
      })
      setMsg({ type: 'success', text: 'Customer updated!' })
      setShowEdit(false)
      loadDetail(selected.id)
      load()
    } catch { setMsg({ type: 'error', text: 'Failed to update' }) }
    setSaving(false)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this customer? This cannot be undone.')) return
    try {
      await api.delete(`/customers/${id}`)
      setMsg({ type: 'success', text: 'Customer deleted' })
      setSelected(null)
      setCustomerDetail(null)
      load()
    } catch { setMsg({ type: 'error', text: 'Failed to delete' }) }
  }

  const handleEdit = () => {
    if (!customerDetail) return
    setForm({
      first_name:     customerDetail.customer.first_name || '',
      last_name:      customerDetail.customer.last_name || '',
      phone:          customerDetail.customer.phone || '',
      email:          customerDetail.customer.email || '',
      address:        customerDetail.customer.address || '',
      city:           customerDetail.customer.city || '',
      state:          customerDetail.customer.state || '',
      zip:            customerDetail.customer.zip || '',
      id_number:      customerDetail.customer.id_number || '',
      employer:       customerDetail.customer.employer || '',
      monthly_income: customerDetail.customer.monthly_income || '',
      notes:          customerDetail.customer.notes || '',
    })
    setShowEdit(true)
  }

  const filtered = customers.filter(c =>
    `${c.first_name} ${c.last_name} ${c.phone} ${c.email}`.toLowerCase().includes(search.toLowerCase())
  )

  const gridCols = isMobile ? '1fr' : '1fr 1fr'

  const CustomerForm = ({ form, update, saving, onSave, onCancel, saveLabel, isMobile }) => (
    <div style={CARD}>
      <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: '14px', marginBottom: '14px' }}>
        <div><label style={LABEL}>First name *</label><input type="text" value={form.first_name} onChange={e => update('first_name', e.target.value)} placeholder="John" style={INPUT} /></div>
        <div><label style={LABEL}>Last name *</label><input type="text" value={form.last_name} onChange={e => update('last_name', e.target.value)} placeholder="Smith" style={INPUT} /></div>
        <div><label style={LABEL}>Phone</label><input type="text" value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="(555) 123-4567" style={INPUT} /></div>
        <div><label style={LABEL}>Email</label><input type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder="john@email.com" style={INPUT} /></div>
      </div>

      <div style={{ background: '#0d0d1a', border: '1px solid #222', borderRadius: '8px', padding: '14px', marginBottom: '14px' }}>
        <p style={{ color: '#4a9eff', fontSize: '12px', fontWeight: 'bold', margin: '0 0 10px', textTransform: 'uppercase' }}>Address</p>
        <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: '14px' }}>
          <div style={{ gridColumn: isMobile ? '1' : '1 / -1' }}><label style={LABEL}>Street address</label><input type="text" value={form.address} onChange={e => update('address', e.target.value)} placeholder="123 Main St" style={INPUT} /></div>
          <div><label style={LABEL}>City</label><input type="text" value={form.city} onChange={e => update('city', e.target.value)} placeholder="Houston" style={INPUT} /></div>
          <div><label style={LABEL}>State</label><input type="text" value={form.state} onChange={e => update('state', e.target.value)} placeholder="TX" style={INPUT} /></div>
          <div><label style={LABEL}>Zip</label><input type="text" value={form.zip} onChange={e => update('zip', e.target.value)} placeholder="77001" style={INPUT} /></div>
        </div>
      </div>

      <div style={{ background: '#0d0d1a', border: '1px solid #222', borderRadius: '8px', padding: '14px', marginBottom: '14px' }}>
        <p style={{ color: '#2ecc71', fontSize: '12px', fontWeight: 'bold', margin: '0 0 10px', textTransform: 'uppercase' }}>Employment & ID</p>
        <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: '14px' }}>
          <div><label style={LABEL}>ID / License #</label><input type="text" value={form.id_number} onChange={e => update('id_number', e.target.value)} placeholder="DL123456" style={INPUT} /></div>
          <div><label style={LABEL}>Employer</label><input type="text" value={form.employer} onChange={e => update('employer', e.target.value)} placeholder="Company name" style={INPUT} /></div>
          <div><label style={LABEL}>Monthly income ($)</label><input type="number" value={form.monthly_income} onChange={e => update('monthly_income', e.target.value)} placeholder="0.00" style={INPUT} /></div>
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={LABEL}>Notes</label>
        <textarea value={form.notes} onChange={e => update('notes', e.target.value)} placeholder="Any additional notes..." rows={2} style={{ ...INPUT, resize: 'vertical' }} />
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={onSave} disabled={saving} style={{ padding: '10px 20px', background: saving ? '#333' : '#C0C0C0', color: '#0A0A0A', border: 'none', borderRadius: '6px', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '14px' }}>
          {saving ? 'Saving...' : saveLabel}
        </button>
        <button onClick={onCancel} style={{ padding: '10px 20px', background: 'transparent', color: '#666', border: '1px solid #333', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }}>
          Cancel
        </button>
      </div>
    </div>
  )

  if (loading) return <p style={{ color: '#666', padding: '40px' }}>Loading customers...</p>

  return (
    <div style={{ fontFamily: 'Arial, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h1 style={{ color: '#C0C0C0', margin: '0 0 4px', fontSize: isMobile ? '20px' : '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users size={22} /> Customers
          </h1>
          <p style={{ color: '#555', margin: 0, fontSize: '13px' }}>Customer profiles, deal history, and contact info</p>
        </div>
        <button onClick={() => { setShowNew(!showNew); setShowEdit(false); setForm(EMPTY_FORM) }} style={{ padding: '10px 16px', background: '#C0C0C0', color: '#0A0A0A', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
          {showNew ? 'Cancel' : '➕ New Customer'}
        </button>
      </div>

      {msg && (
        <div style={{ background: msg.type === 'success' ? '#0d2d15' : '#2d1515', border: `1px solid ${msg.type === 'success' ? '#27ae60' : '#c0392b'}`, borderRadius: '6px', padding: '10px 14px', marginBottom: '16px', color: msg.type === 'success' ? '#2ecc71' : '#e74c3c', fontSize: '14px' }}>
          {msg.text}
        </div>
      )}

      {showNew && <CustomerForm form={form} update={update} saving={saving} isMobile={isMobile} onSave={handleCreate} onCancel={() => setShowNew(false)} saveLabel="Add Customer" />}
      {showEdit && <CustomerForm form={form} update={update} saving={saving} isMobile={isMobile} onSave={handleUpdate} onCancel={() => setShowEdit(false)} saveLabel="Save Changes" />}

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : selected ? '1fr 1.5fr' : '1fr', gap: '20px' }}>

        {/* Customer list */}
        <div style={CARD}>
          <div style={{ marginBottom: '14px' }}>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, phone, or email..."
              style={{ ...INPUT, marginTop: 0 }}
            />
          </div>
          <p style={{ color: '#555', fontSize: '12px', margin: '0 0 10px' }}>{filtered.length} customer{filtered.length !== 1 ? 's' : ''}</p>
          {filtered.length === 0 ? (
            <p style={{ color: '#555', textAlign: 'center', padding: '20px' }}>
              {customers.length === 0 ? 'No customers yet. Add your first customer above.' : 'No results found.'}
            </p>
          ) : (
            filtered.map((c, i) => (
              <div key={i} onClick={() => handleSelect(c)}
                style={{ padding: '12px', background: selected?.id === c.id ? '#0d1a2d' : '#0A0A0A', border: `1px solid ${selected?.id === c.id ? '#4a9eff' : '#222'}`, borderRadius: '8px', marginBottom: '6px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ color: '#C0C0C0', margin: '0 0 2px', fontWeight: 'bold', fontSize: '14px' }}>{c.first_name} {c.last_name}</p>
                    <p style={{ color: '#666', margin: 0, fontSize: '12px' }}>{c.phone || c.email || '—'}</p>
                  </div>
                  <p style={{ color: '#555', margin: 0, fontSize: '11px' }}>{c.city ? `${c.city}, ${c.state}` : '—'}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Customer detail */}
        {selected && customerDetail && (
          <div>
            <div style={CARD}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <h2 style={{ color: '#C0C0C0', margin: '0 0 4px', fontSize: '18px' }}>{customerDetail.customer.first_name} {customerDetail.customer.last_name}</h2>
                  <p style={{ color: '#666', margin: 0, fontSize: '13px' }}>Customer since {new Date(customerDetail.customer.created_at).toLocaleDateString()}</p>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={handleEdit} style={{ padding: '6px 12px', background: 'transparent', color: '#4a9eff', border: '1px solid #4a9eff', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>Edit</button>
                  <button onClick={() => handleDelete(selected.id)} style={{ padding: '6px 12px', background: 'transparent', color: '#e74c3c', border: '1px solid #e74c3c', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>Delete</button>
                  <button onClick={() => { setSelected(null); setCustomerDetail(null) }} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '18px' }}>✕</button>
                </div>
              </div>

              {/* Contact info */}
              <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: '10px', marginBottom: '16px' }}>
                {[
                  { label: 'Phone',    value: customerDetail.customer.phone },
                  { label: 'Email',    value: customerDetail.customer.email },
                  { label: 'Address',  value: [customerDetail.customer.address, customerDetail.customer.city, customerDetail.customer.state, customerDetail.customer.zip].filter(Boolean).join(', ') },
                  { label: 'Employer', value: customerDetail.customer.employer },
                  { label: 'Income',   value: customerDetail.customer.monthly_income ? fmt(customerDetail.customer.monthly_income) + '/mo' : null },
                  { label: 'ID #',     value: customerDetail.customer.id_number },
                ].filter(item => item.value).map((item, i) => (
                  <div key={i} style={{ background: '#0A0A0A', borderRadius: '6px', padding: '10px 12px' }}>
                    <p style={{ color: '#555', fontSize: '10px', margin: '0 0 2px', textTransform: 'uppercase' }}>{item.label}</p>
                    <p style={{ color: '#C0C0C0', fontSize: '13px', margin: 0 }}>{item.value}</p>
                  </div>
                ))}
              </div>

              {customerDetail.customer.notes && (
                <div style={{ background: '#0A0A0A', borderRadius: '6px', padding: '10px 12px', marginBottom: '16px' }}>
                  <p style={{ color: '#555', fontSize: '10px', margin: '0 0 4px', textTransform: 'uppercase' }}>Notes</p>
                  <p style={{ color: '#999', fontSize: '13px', margin: 0 }}>{customerDetail.customer.notes}</p>
                </div>
              )}
            </div>

            {/* Purchase history */}
            {customerDetail.sales?.length > 0 && (
              <div style={CARD}>
                <h3 style={{ color: '#C0C0C0', fontSize: '14px', margin: '0 0 12px' }}>Purchase History</h3>
                {customerDetail.sales.map((s, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #1a1a1a' }}>
                    <div>
                      <p style={{ color: '#C0C0C0', margin: '0 0 2px', fontSize: '13px' }}>{s.model}</p>
                      <p style={{ color: '#666', margin: 0, fontSize: '11px' }}>{s.date} · {s.payment_type}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ color: '#C0C0C0', margin: '0 0 2px', fontSize: '13px' }}>{fmt(s.sale_price)}</p>
                      <p style={{ color: '#2ecc71', margin: 0, fontSize: '11px' }}>{fmt(s.gross_profit)} gross</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* BHPH contracts */}
            {customerDetail.contracts?.length > 0 && (
              <div style={CARD}>
                <h3 style={{ color: '#C0C0C0', fontSize: '14px', margin: '0 0 12px' }}>BHPH Contracts</h3>
                {customerDetail.contracts.map((c, i) => (
                  <div key={i} style={{ background: '#0A0A0A', borderRadius: '6px', padding: '12px', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <p style={{ color: '#C0C0C0', margin: 0, fontSize: '13px', fontWeight: 'bold' }}>{c.vehicle}</p>
                      <span style={{ color: c.status === 'Active' ? '#2ecc71' : '#555', fontSize: '11px', padding: '2px 8px', border: `1px solid ${c.status === 'Active' ? '#27ae60' : '#333'}`, borderRadius: '10px' }}>{c.status}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '16px', fontSize: '12px' }}>
                      <span style={{ color: '#666' }}>Financed: <strong style={{ color: '#4a9eff' }}>{fmt(c.amount_financed)}</strong></span>
                      <span style={{ color: '#666' }}>Collected: <strong style={{ color: '#2ecc71' }}>{fmt(c.total_collected)}</strong></span>
                      <span style={{ color: '#666' }}>{c.payment_frequency}: <strong style={{ color: '#C0C0C0' }}>{fmt(c.payment_amount)}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
