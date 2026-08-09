import { useState } from 'react'
import api from '../api'
import { Wrench } from 'lucide-react'

const INPUT  = { width: '100%', padding: '10px 12px', background: '#0A0A0A', border: '1px solid #333', borderRadius: '6px', color: '#fff', fontSize: '14px', boxSizing: 'border-box', marginTop: '6px' }
const LABEL  = { color: '#999', fontSize: '13px', display: 'block', marginBottom: '2px' }
const SELECT = { ...INPUT, cursor: 'pointer' }

const COMMON_SERVICES = [
  'Oil Change', 'Tire Rotation', 'Brake Job', 'Brake Pads', 'Brake Rotors',
  'Tire Replacement', 'Battery Replacement', 'Air Filter', 'Transmission Service',
  'Coolant Flush', 'Wheel Alignment', 'Suspension Repair', 'Engine Tune-Up',
  'AC Service', 'Check Engine Light', 'Oil Leak Repair', 'Exhaust Repair',
  'Belt Replacement', 'Spark Plugs', 'Diagnostic', 'Custom...'
]

export default function AddJob({ isMobile }) {
  const today = new Date().toISOString().slice(0, 10)
  const [loading, setLoading]   = useState(false)
  const [status, setStatus]     = useState(null)
  const [customService, setCustomService] = useState(false)

  const [form, setForm] = useState({
    date:          today,
    customer_name: '',
    customer_phone:'',
    vehicle_year:  '',
    vehicle_make:  '',
    vehicle_model: '',
    vehicle_vin:   '',
    service:       'Oil Change',
    custom_service:'',
    technician:    '',
    total_charged: '',
    parts_cost:    '',
    payment_type:  'Cash',
    notes:         '',
  })

  const update = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleServiceChange = (v) => {
    if (v === 'Custom...') {
      setCustomService(true)
      update('service', '')
    } else {
      setCustomService(false)
      update('service', v)
      update('custom_service', '')
    }
  }

  const laborGross = () => {
    const charged = parseFloat(form.total_charged) || 0
    const parts   = parseFloat(form.parts_cost) || 0
    return charged - parts
  }

  const handleSubmit = async () => {
    if (!form.customer_name || !form.total_charged || !form.technician) {
      setStatus({ type: 'error', msg: 'Customer name, technician, and total charged are required.' })
      return
    }
    const service = customService ? form.custom_service : form.service
    if (!service) {
      setStatus({ type: 'error', msg: 'Please enter a service description.' })
      return
    }

    setLoading(true)
    setStatus(null)

    const vehicle = [form.vehicle_year, form.vehicle_make, form.vehicle_model].filter(Boolean).join(' ') || 'Vehicle'
    const description = `${service} — ${vehicle} — ${form.customer_name}`

    try {
      await api.post('/sales/manual', {
        date:         form.date,
        description,
        sale_price:   parseFloat(form.total_charged),
        cost:         parseFloat(form.parts_cost) || 0,
        gross_profit: laborGross(),
        salesperson:  form.technician,
        payment_type: form.payment_type,
        lead_source:  'Walk-in',
        notes:        [
          form.vehicle_vin ? `VIN: ${form.vehicle_vin}` : '',
          form.customer_phone ? `Phone: ${form.customer_phone}` : '',
          form.notes || ''
        ].filter(Boolean).join(' | '),
        finance_reserve: 0,
        warranty:        0,
        gap_insurance:   0,
        addons:          0,
      })
      setStatus({ type: 'success', msg: `Job recorded — ${service} for ${form.customer_name}` })
      setForm({
        date: today, customer_name: '', customer_phone: '',
        vehicle_year: '', vehicle_make: '', vehicle_model: '', vehicle_vin: '',
        service: 'Oil Change', custom_service: '', technician: '',
        total_charged: '', parts_cost: '', payment_type: 'Cash', notes: '',
      })
      setCustomService(false)
    } catch {
      setStatus({ type: 'error', msg: 'Failed to save job. Please try again.' })
    }
    setLoading(false)
  }

  const gridCols = isMobile ? '1fr' : '1fr 1fr'

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '640px' }}>
      <h1 style={{ color: '#C0C0C0', margin: 0, fontSize: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}><Wrench size={22} /> Add Job</h1>
      <p style={{ color: '#555', marginBottom: '24px', fontSize: '13px' }}>Log a completed repair or service job</p>

      <div style={{ background: '#1A1A2E', border: '1px solid #333', borderRadius: '8px', padding: '24px' }}>

        {/* Date and Technician */}
        <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: '16px', marginBottom: '16px' }}>
          <div>
            <label style={LABEL}>Date</label>
            <input type="date" value={form.date} onChange={e => update('date', e.target.value)} style={INPUT} />
          </div>
          <div>
            <label style={LABEL}>Technician</label>
            <input type="text" value={form.technician} onChange={e => update('technician', e.target.value)} placeholder="e.g. Mike Johnson" style={INPUT} />
          </div>
        </div>

        {/* Customer */}
        <div style={{ background: '#0d0d1a', border: '1px solid #222', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
          <p style={{ color: '#4a9eff', fontSize: '13px', fontWeight: 'bold', margin: '0 0 12px' }}>👤 Customer</p>
          <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: '14px' }}>
            <div>
              <label style={LABEL}>Customer name *</label>
              <input type="text" value={form.customer_name} onChange={e => update('customer_name', e.target.value)} placeholder="John Smith" style={INPUT} />
            </div>
            <div>
              <label style={LABEL}>Phone <span style={{ color: '#555' }}>optional</span></label>
              <input type="text" value={form.customer_phone} onChange={e => update('customer_phone', e.target.value)} placeholder="(555) 123-4567" style={INPUT} />
            </div>
          </div>
        </div>

        {/* Vehicle */}
        <div style={{ background: '#0d0d1a', border: '1px solid #222', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
          <p style={{ color: '#4a9eff', fontSize: '13px', fontWeight: 'bold', margin: '0 0 12px' }}>🚗 Vehicle</p>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '14px', marginBottom: '14px' }}>
            <div>
              <label style={LABEL}>Year</label>
              <input type="text" value={form.vehicle_year} onChange={e => update('vehicle_year', e.target.value)} placeholder="2018" style={INPUT} />
            </div>
            <div>
              <label style={LABEL}>Make</label>
              <input type="text" value={form.vehicle_make} onChange={e => update('vehicle_make', e.target.value)} placeholder="Toyota" style={INPUT} />
            </div>
            <div>
              <label style={LABEL}>Model</label>
              <input type="text" value={form.vehicle_model} onChange={e => update('vehicle_model', e.target.value)} placeholder="Camry" style={INPUT} />
            </div>
          </div>
          <div>
            <label style={LABEL}>VIN <span style={{ color: '#555' }}>optional</span></label>
            <input type="text" value={form.vehicle_vin} onChange={e => update('vehicle_vin', e.target.value.toUpperCase())} placeholder="17-digit VIN" maxLength={17} style={{ ...INPUT, fontFamily: 'monospace' }} />
          </div>
        </div>

        {/* Service */}
        <div style={{ marginBottom: '16px' }}>
          <label style={LABEL}>Service performed *</label>
          <select
            value={customService ? 'Custom...' : form.service}
            onChange={e => handleServiceChange(e.target.value)}
            style={SELECT}
          >
            {COMMON_SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {customService && (
            <input
              type="text"
              value={form.custom_service}
              onChange={e => update('custom_service', e.target.value)}
              placeholder="Describe the service..."
              style={{ ...INPUT, marginTop: '8px' }}
              autoFocus
            />
          )}
        </div>

        {/* Pricing */}
        <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: '16px', marginBottom: '8px' }}>
          <div>
            <label style={LABEL}>Total charged ($) *</label>
            <input type="number" value={form.total_charged} onChange={e => update('total_charged', e.target.value)} placeholder="0.00" style={INPUT} />
          </div>
          <div>
            <label style={LABEL}>Parts cost ($) <span style={{ color: '#555' }}>optional</span></label>
            <input type="number" value={form.parts_cost} onChange={e => update('parts_cost', e.target.value)} placeholder="0.00" style={INPUT} />
          </div>
        </div>

        {/* Labor gross preview */}
        {form.total_charged && (
          <div style={{ background: laborGross() >= 0 ? '#0d2d15' : '#2d1515', border: `1px solid ${laborGross() >= 0 ? '#27ae60' : '#c0392b'}`, borderRadius: '6px', padding: '12px 14px', marginBottom: '16px', fontSize: '13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#666', marginBottom: '4px' }}>
              <span>Total charged:</span><span>${(parseFloat(form.total_charged) || 0).toLocaleString()}</span>
            </div>
            {form.parts_cost && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#666', marginBottom: '4px' }}>
                <span>Parts cost:</span><span>-${(parseFloat(form.parts_cost) || 0).toLocaleString()}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', color: laborGross() >= 0 ? '#2ecc71' : '#e74c3c', fontWeight: 'bold', borderTop: '1px solid #1a3a1a', paddingTop: '4px' }}>
              <span>Labor gross:</span><span>${laborGross().toLocaleString()}</span>
            </div>
          </div>
        )}

        {/* Payment type */}
        <div style={{ marginBottom: '16px' }}>
          <label style={LABEL}>Payment type</label>
          <select value={form.payment_type} onChange={e => update('payment_type', e.target.value)} style={SELECT}>
            {['Cash', 'Card', 'Check', 'Insurance', 'Bank Transfer', 'Other'].map(o => <option key={o}>{o}</option>)}
          </select>
        </div>

        {/* Notes */}
        <div style={{ marginBottom: '24px' }}>
          <label style={LABEL}>Notes <span style={{ color: '#555' }}>optional</span></label>
          <textarea value={form.notes} onChange={e => update('notes', e.target.value)} placeholder="Any additional details..." rows={2} style={{ ...INPUT, resize: 'vertical' }} />
        </div>

        {/* Status */}
        {status && (
          <div style={{ background: status.type === 'success' ? '#0d2d15' : '#2d1515', border: `1px solid ${status.type === 'success' ? '#27ae60' : '#c0392b'}`, borderRadius: '6px', padding: '10px 14px', marginBottom: '16px', color: status.type === 'success' ? '#2ecc71' : '#e74c3c', fontSize: '14px' }}>
            {status.type === 'success' ? '✅ ' : '❌ '}{status.msg}
          </div>
        )}

        <button onClick={handleSubmit} disabled={loading} style={{ width: '100%', padding: '14px', background: loading ? '#333' : '#C0C0C0', color: '#0A0A0A', border: 'none', borderRadius: '6px', fontSize: '15px', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer' }}>
          {loading ? 'Saving...' : 'Record Job'}
        </button>
      </div>
    </div>
  )
}
