import { useEffect, useState, useRef } from 'react'
import { Users } from 'lucide-react'
import api from '../api'

const INPUT  = { width: '100%', padding: '10px 12px', background: '#0A0A0A', border: '1px solid #333', borderRadius: '6px', color: '#fff', fontSize: '14px', boxSizing: 'border-box', marginTop: '6px' }
const LABEL  = { color: '#999', fontSize: '13px', display: 'block', marginBottom: '2px' }
const CARD   = { background: '#1A1A2E', border: '1px solid #333', borderRadius: '8px', padding: '20px', marginBottom: '20px' }
const SECTION = { background: '#0d0d1a', border: '1px solid #222', borderRadius: '8px', padding: '16px', marginBottom: '16px' }
const fmt    = (n) => n != null ? `$${Number(n).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : '$0.00'

const EMPTY_FORM = {
  first_name: '', last_name: '', phone: '', email: '',
  address: '', city: '', state: '', zip: '',
  id_number: '', employer: '', monthly_income: '', notes: ''
}

const EMPTY_APP = {
  dob: '', ssn_last4: '', address_years: '',
  job_title: '', employer_address: '', employment_years: '',
  ref1_name: '', ref1_phone: '', ref1_relationship: '', ref1_years: '',
  ref2_name: '', ref2_phone: '', ref2_relationship: '', ref2_years: '',
  ref3_name: '', ref3_phone: '', ref3_relationship: '', ref3_years: '',
  desired_vehicle: '', desired_down_payment: '', desired_monthly_payment: '',
  credit_score: '', signed: false, signed_date: '', signature_data: '', notes: ''
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
      <div style={SECTION}>
        <p style={{ color: '#4a9eff', fontSize: '12px', fontWeight: 'bold', margin: '0 0 10px', textTransform: 'uppercase' }}>Address</p>
        <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: '14px' }}>
          <div style={{ gridColumn: isMobile ? '1' : '1 / -1' }}><label style={LABEL}>Street address</label><input type="text" value={form.address} onChange={e => update('address', e.target.value)} placeholder="123 Main St" style={INPUT} /></div>
          <div><label style={LABEL}>City</label><input type="text" value={form.city} onChange={e => update('city', e.target.value)} placeholder="Houston" style={INPUT} /></div>
          <div><label style={LABEL}>State</label><input type="text" value={form.state} onChange={e => update('state', e.target.value)} placeholder="TX" style={INPUT} /></div>
          <div><label style={LABEL}>Zip</label><input type="text" value={form.zip} onChange={e => update('zip', e.target.value)} placeholder="77001" style={INPUT} /></div>
        </div>
      </div>
      <div style={SECTION}>
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
        <button onClick={onCancel} style={{ padding: '10px 20px', background: 'transparent', color: '#666', border: '1px solid #333', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }}>Cancel</button>
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
  const [showCreditApp, setShowCreditApp]   = useState(false)
  const [loading, setLoading]               = useState(true)
  const [saving, setSaving]                 = useState(false)
  const [savingApp, setSavingApp]           = useState(false)
  const [msg, setMsg]                       = useState(null)
  const [search, setSearch]                 = useState('')
  const [form, setForm]                     = useState(EMPTY_FORM)
  const [creditApp, setCreditApp]           = useState(EMPTY_APP)
  const [existingAppId, setExistingAppId]   = useState(null)
  const canvasRef                           = useRef(null)
  const [isDrawing, setIsDrawing]           = useState(false)
  const [hasSig, setHasSig]                 = useState(false)

  const update    = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const updateApp = (k, v) => setCreditApp(p => ({ ...p, [k]: v }))

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

  const loadCreditApp = async (id) => {
    try {
      const res = await api.get(`/credit-application/${id}`)
      if (res.data) {
        setCreditApp({ ...EMPTY_APP, ...res.data })
        setExistingAppId(res.data.id)
        if (res.data.signature_data) setHasSig(true)
      } else {
        setCreditApp(EMPTY_APP)
        setExistingAppId(null)
        setHasSig(false)
      }
    } catch {
      setCreditApp(EMPTY_APP)
      setExistingAppId(null)
    }
  }

  const handleSelect = (customer) => {
    setSelected(customer)
    loadDetail(customer.id)
    setShowNew(false)
    setShowEdit(false)
    setShowCreditApp(false)
  }

  const handleCreditAppOpen = () => {
    loadCreditApp(selected.id)
    setShowCreditApp(true)
  }

  const handleCreate = async () => {
    if (!form.first_name || !form.last_name) { setMsg({ type: 'error', text: 'First and last name are required.' }); return }
    setSaving(true)
    try {
      await api.post('/customers', { ...form, monthly_income: parseFloat(form.monthly_income) || 0 })
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
      await api.patch(`/customers/${selected.id}`, { ...form, monthly_income: parseFloat(form.monthly_income) || 0 })
      setMsg({ type: 'success', text: 'Customer updated!' })
      setShowEdit(false)
      loadDetail(selected.id)
      load()
    } catch { setMsg({ type: 'error', text: 'Failed to update' }) }
    setSaving(false)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this customer?')) return
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

  const handleSaveCreditApp = async () => {
    setSavingApp(true)
    const sigData = hasSig && canvasRef.current ? canvasRef.current.toDataURL() : creditApp.signature_data || ''
    const payload = {
      customer_id:              selected.id,
      dob:                      creditApp.dob || '',
      ssn_last4:                creditApp.ssn_last4 || '',
      address_years:            creditApp.address_years || '',
      job_title:                creditApp.job_title || '',
      employer_address:         creditApp.employer_address || '',
      employment_years:         creditApp.employment_years || '',
      ref1_name:                creditApp.ref1_name || '',
      ref1_phone:               creditApp.ref1_phone || '',
      ref1_relationship:        creditApp.ref1_relationship || '',
      ref1_years:               creditApp.ref1_years || '',
      ref2_name:                creditApp.ref2_name || '',
      ref2_phone:               creditApp.ref2_phone || '',
      ref2_relationship:        creditApp.ref2_relationship || '',
      ref2_years:               creditApp.ref2_years || '',
      ref3_name:                creditApp.ref3_name || '',
      ref3_phone:               creditApp.ref3_phone || '',
      ref3_relationship:        creditApp.ref3_relationship || '',
      ref3_years:               creditApp.ref3_years || '',
      desired_vehicle:          creditApp.desired_vehicle || '',
      desired_down_payment:     parseFloat(creditApp.desired_down_payment) || 0,
      desired_monthly_payment:  parseFloat(creditApp.desired_monthly_payment) || 0,
      credit_score:             creditApp.credit_score ? parseInt(creditApp.credit_score) : null,
      signed:                   creditApp.signed || false,
      signed_date:              creditApp.signed ? new Date().toISOString().slice(0, 10) : '',
      signature_data:           sigData,
      notes:                    creditApp.notes || '',
    }
    try {
      if (existingAppId) {
        await api.patch(`/credit-application/${existingAppId}`, payload)
      } else {
        await api.post('/credit-application', payload)
      }
      setMsg({ type: 'success', text: 'Credit application saved!' })
      setShowCreditApp(false)
    } catch { setMsg({ type: 'error', text: 'Failed to save credit application' }) }
    setSavingApp(false)
  }

  // Signature canvas
  const startDraw = (e) => {
    setIsDrawing(true)
    const canvas = canvasRef.current
    const rect   = canvas.getBoundingClientRect()
    const ctx    = canvas.getContext('2d')
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const draw = (e) => {
    if (!isDrawing) return
    e.preventDefault()
    const canvas = canvasRef.current
    const rect   = canvas.getBoundingClientRect()
    const ctx    = canvas.getContext('2d')
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top
    ctx.lineTo(x, y)
    ctx.strokeStyle = '#C0C0C0'
    ctx.lineWidth   = 2
    ctx.stroke()
    setHasSig(true)
  }

  const stopDraw = () => setIsDrawing(false)

  const clearSig = () => {
    const canvas = canvasRef.current
    const ctx    = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasSig(false)
  }

  const filtered = customers.filter(c =>
    `${c.first_name} ${c.last_name} ${c.phone} ${c.email}`.toLowerCase().includes(search.toLowerCase())
  )

  const gridCols = isMobile ? '1fr' : '1fr 1fr'

  if (loading) return <p style={{ color: '#666', padding: '40px' }}>Loading customers...</p>

  return (
    <div style={{ fontFamily: 'Arial, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h1 style={{ color: '#C0C0C0', margin: '0 0 4px', fontSize: isMobile ? '20px' : '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users size={22} /> Customers
          </h1>
          <p style={{ color: '#555', margin: 0, fontSize: '13px' }}>Customer profiles, credit applications, and deal history</p>
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

      {/* Credit Application Form */}
      {showCreditApp && selected && (
        <div style={CARD}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ color: '#C0C0C0', margin: 0, fontSize: '16px' }}>📋 Credit Application — {selected.first_name} {selected.last_name}</h2>
            <button onClick={() => setShowCreditApp(false)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '18px' }}>✕</button>
          </div>

          {/* Personal */}
          <div style={SECTION}>
            <p style={{ color: '#4a9eff', fontSize: '12px', fontWeight: 'bold', margin: '0 0 12px', textTransform: 'uppercase' }}>Personal Information</p>
            <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: '14px' }}>
              <div><label style={LABEL}>Date of Birth</label><input type="date" value={creditApp.dob} onChange={e => updateApp('dob', e.target.value)} style={INPUT} /></div>
              <div><label style={LABEL}>SSN Last 4 digits</label><input type="text" maxLength={4} value={creditApp.ssn_last4} onChange={e => updateApp('ssn_last4', e.target.value)} placeholder="####" style={INPUT} /></div>
              <div><label style={LABEL}>Years at current address</label><input type="text" value={creditApp.address_years} onChange={e => updateApp('address_years', e.target.value)} placeholder="e.g. 2 years" style={INPUT} /></div>
              <div><label style={LABEL}>Credit Score <span style={{ color: '#555' }}>(optional)</span></label><input type="number" value={creditApp.credit_score} onChange={e => updateApp('credit_score', e.target.value)} placeholder="e.g. 620" style={INPUT} /></div>
            </div>
          </div>

          {/* Employment */}
          <div style={SECTION}>
            <p style={{ color: '#2ecc71', fontSize: '12px', fontWeight: 'bold', margin: '0 0 12px', textTransform: 'uppercase' }}>Employment</p>
            <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: '14px' }}>
              <div><label style={LABEL}>Job Title</label><input type="text" value={creditApp.job_title} onChange={e => updateApp('job_title', e.target.value)} placeholder="e.g. Warehouse Worker" style={INPUT} /></div>
              <div><label style={LABEL}>Years employed</label><input type="text" value={creditApp.employment_years} onChange={e => updateApp('employment_years', e.target.value)} placeholder="e.g. 3 years" style={INPUT} /></div>
              <div style={{ gridColumn: isMobile ? '1' : '1 / -1' }}><label style={LABEL}>Employer address</label><input type="text" value={creditApp.employer_address} onChange={e => updateApp('employer_address', e.target.value)} placeholder="123 Business Ave, Houston TX" style={INPUT} /></div>
            </div>
          </div>

          {/* References */}
          <div style={SECTION}>
            <p style={{ color: '#f39c12', fontSize: '12px', fontWeight: 'bold', margin: '0 0 12px', textTransform: 'uppercase' }}>References</p>
            {[1, 2, 3].map(n => (
              <div key={n} style={{ marginBottom: n < 3 ? '14px' : 0 }}>
                <p style={{ color: '#666', fontSize: '12px', margin: '0 0 8px' }}>Reference {n}</p>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: '10px' }}>
                  <div><label style={LABEL}>Name</label><input type="text" value={creditApp[`ref${n}_name`]} onChange={e => updateApp(`ref${n}_name`, e.target.value)} placeholder="Full name" style={INPUT} /></div>
                  <div><label style={LABEL}>Phone</label><input type="text" value={creditApp[`ref${n}_phone`]} onChange={e => updateApp(`ref${n}_phone`, e.target.value)} placeholder="(555) 000-0000" style={INPUT} /></div>
                  <div><label style={LABEL}>Relationship</label><input type="text" value={creditApp[`ref${n}_relationship`]} onChange={e => updateApp(`ref${n}_relationship`, e.target.value)} placeholder="Friend, Family..." style={INPUT} /></div>
                  <div><label style={LABEL}>Years known</label><input type="text" value={creditApp[`ref${n}_years`]} onChange={e => updateApp(`ref${n}_years`, e.target.value)} placeholder="e.g. 5 years" style={INPUT} /></div>
                </div>
              </div>
            ))}
          </div>

          {/* Vehicle interest */}
          <div style={SECTION}>
            <p style={{ color: '#C0C0C0', fontSize: '12px', fontWeight: 'bold', margin: '0 0 12px', textTransform: 'uppercase' }}>Vehicle Interest</p>
            <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: '14px' }}>
              <div style={{ gridColumn: isMobile ? '1' : '1 / -1' }}><label style={LABEL}>Desired vehicle</label><input type="text" value={creditApp.desired_vehicle} onChange={e => updateApp('desired_vehicle', e.target.value)} placeholder="e.g. 2018 Honda Civic" style={INPUT} /></div>
              <div><label style={LABEL}>Down payment ($)</label><input type="number" value={creditApp.desired_down_payment} onChange={e => updateApp('desired_down_payment', e.target.value)} placeholder="0.00" style={INPUT} /></div>
              <div><label style={LABEL}>Desired monthly payment ($)</label><input type="number" value={creditApp.desired_monthly_payment} onChange={e => updateApp('desired_monthly_payment', e.target.value)} placeholder="0.00" style={INPUT} /></div>
            </div>
          </div>

          {/* Signature */}
          <div style={SECTION}>
            <p style={{ color: '#C0C0C0', fontSize: '12px', fontWeight: 'bold', margin: '0 0 12px', textTransform: 'uppercase' }}>Signature</p>
            <p style={{ color: '#555', fontSize: '12px', margin: '0 0 10px' }}>Customer signs below to certify the information is accurate</p>
            {creditApp.signature_data && !hasSig ? (
              <div>
                <img src={creditApp.signature_data} alt="Signature" style={{ background: '#0A0A0A', border: '1px solid #333', borderRadius: '6px', maxWidth: '100%' }} />
                <button onClick={() => { setCreditApp(p => ({ ...p, signature_data: '' })); setHasSig(false) }} style={{ marginTop: '8px', padding: '6px 12px', background: 'transparent', color: '#e74c3c', border: '1px solid #e74c3c', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                  Clear & Re-sign
                </button>
              </div>
            ) : (
              <div>
                <canvas
                  ref={canvasRef}
                  width={400}
                  height={120}
                  onMouseDown={startDraw}
                  onMouseMove={draw}
                  onMouseUp={stopDraw}
                  onMouseLeave={stopDraw}
                  onTouchStart={startDraw}
                  onTouchMove={draw}
                  onTouchEnd={stopDraw}
                  style={{ background: '#0A0A0A', border: '1px solid #333', borderRadius: '6px', cursor: 'crosshair', touchAction: 'none', maxWidth: '100%' }}
                />
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px', alignItems: 'center' }}>
                  <button onClick={clearSig} style={{ padding: '6px 12px', background: 'transparent', color: '#666', border: '1px solid #333', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Clear</button>
                  {hasSig && <span style={{ color: '#2ecc71', fontSize: '12px' }}>✅ Signature captured</span>}
                </div>
              </div>
            )}
            <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="checkbox" checked={creditApp.signed} onChange={e => updateApp('signed', e.target.checked)} id="signed" />
              <label htmlFor="signed" style={{ color: '#999', fontSize: '13px', cursor: 'pointer' }}>Customer acknowledges this information is accurate</label>
            </div>
          </div>

          {/* Notes */}
          <div style={{ marginBottom: '16px' }}>
            <label style={LABEL}>Notes</label>
            <textarea value={creditApp.notes} onChange={e => updateApp('notes', e.target.value)} placeholder="Additional notes..." rows={2} style={{ ...INPUT, resize: 'vertical' }} />
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handleSaveCreditApp} disabled={savingApp} style={{ padding: '12px 24px', background: savingApp ? '#333' : '#C0C0C0', color: '#0A0A0A', border: 'none', borderRadius: '6px', cursor: savingApp ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '14px' }}>
              {savingApp ? 'Saving...' : existingAppId ? 'Update Application' : 'Save Application'}
            </button>
            <button onClick={() => setShowCreditApp(false)} style={{ padding: '12px 20px', background: 'transparent', color: '#666', border: '1px solid #333', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : selected ? '1fr 1.5fr' : '1fr', gap: '20px' }}>
        {/* Customer list */}
        <div style={CARD}>
          <div style={{ marginBottom: '14px' }}>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, phone, or email..." style={{ ...INPUT, marginTop: 0 }} />
          </div>
          <p style={{ color: '#555', fontSize: '12px', margin: '0 0 10px' }}>{filtered.length} customer{filtered.length !== 1 ? 's' : ''}</p>
          {filtered.length === 0 ? (
            <p style={{ color: '#555', textAlign: 'center', padding: '20px' }}>
              {customers.length === 0 ? 'No customers yet.' : 'No results found.'}
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
        {selected && customerDetail && !showCreditApp && (
          <div>
            <div style={CARD}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <h2 style={{ color: '#C0C0C0', margin: '0 0 4px', fontSize: '18px' }}>{customerDetail.customer.first_name} {customerDetail.customer.last_name}</h2>
                  <p style={{ color: '#666', margin: 0, fontSize: '13px' }}>Customer since {new Date(customerDetail.customer.created_at).toLocaleDateString()}</p>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <button onClick={handleCreditAppOpen} style={{ padding: '6px 12px', background: '#0d1a2d', color: '#4a9eff', border: '1px solid #4a9eff', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>📋 Credit App</button>
                  <button onClick={handleEdit} style={{ padding: '6px 12px', background: 'transparent', color: '#C0C0C0', border: '1px solid #333', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>Edit</button>
                  <button onClick={() => handleDelete(selected.id)} style={{ padding: '6px 12px', background: 'transparent', color: '#e74c3c', border: '1px solid #e74c3c', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>Delete</button>
                  <button onClick={() => { setSelected(null); setCustomerDetail(null) }} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '18px' }}>✕</button>
                </div>
              </div>

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

            {customerDetail.contracts?.length > 0 && (
              <div style={CARD}>
                <h3 style={{ color: '#C0C0C0', fontSize: '14px', margin: '0 0 12px' }}>BHPH Contracts</h3>
                {customerDetail.contracts.map((c, i) => (
                  <div key={i} style={{ background: '#0A0A0A', borderRadius: '6px', padding: '12px', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <p style={{ color: '#C0C0C0', margin: 0, fontSize: '13px', fontWeight: 'bold' }}>{c.vehicle}</p>
                      <span style={{ color: c.status === 'Active' ? '#2ecc71' : '#555', fontSize: '11px', padding: '2px 8px', border: `1px solid ${c.status === 'Active' ? '#27ae60' : '#333'}`, borderRadius: '10px' }}>{c.status}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '16px', fontSize: '12px', flexWrap: 'wrap' }}>
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
