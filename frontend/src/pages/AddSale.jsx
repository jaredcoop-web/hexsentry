import { useState } from 'react'
import api from '../api'

const INPUT = { width: '100%', padding: '10px 12px', background: '#0A0A0A', border: '1px solid #333', borderRadius: '6px', color: '#fff', fontSize: '14px', boxSizing: 'border-box', marginTop: '6px' }
const LABEL = { color: '#999', fontSize: '13px', display: 'block', marginBottom: '2px' }
const SELECT = { ...INPUT, cursor: 'pointer' }

export default function AddSale({ user }) {
  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState({ date: today, description: '', sale_price: '', cost: '', salesperson: '', payment_type: 'Cash', lead_source: 'Walk-in', notes: '' })
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }))
  const gross = () => (parseFloat(form.sale_price) || 0) - (parseFloat(form.cost) || 0)

  const handleSubmit = async () => {
    if (!form.description || !form.sale_price || !form.salesperson) {
      setStatus({ type: 'error', msg: 'Please fill in Description, Sale Amount, and Salesperson.' })
      return
    }
    setLoading(true)
    setStatus(null)
    try {
      await api.post('/sales/manual', {
        date: form.date, description: form.description,
        sale_price: parseFloat(form.sale_price), cost: parseFloat(form.cost) || 0,
        gross_profit: gross(), salesperson: form.salesperson,
        payment_type: form.payment_type, lead_source: form.lead_source, notes: form.notes,
      })
      setStatus({ type: 'success', msg: 'Sale recorded successfully!' })
      setForm({ date: today, description: '', sale_price: '', cost: '', salesperson: '', payment_type: 'Cash', lead_source: 'Walk-in', notes: '' })
    } catch (e) {
      setStatus({ type: 'error', msg: 'Failed to save sale. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '600px' }}>
      <h1 style={{ color: '#C0C0C0', marginBottom: '8px' }}>Add Sale</h1>
      <p style={{ color: '#555', marginBottom: '24px', fontSize: '13px' }}>Log a sale manually — cash, check, financed, or any payment type</p>
      <div style={{ background: '#1A1A2E', border: '1px solid #333', borderRadius: '8px', padding: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div>
            <label style={LABEL}>Date of sale</label>
            <input type="date" value={form.date} onChange={e => update('date', e.target.value)} style={INPUT} />
          </div>
          <div>
            <label style={LABEL}>Salesperson / Staff</label>
            <input type="text" value={form.salesperson} onChange={e => update('salesperson', e.target.value)} placeholder="e.g. James Carter" style={INPUT} />
          </div>
        </div>
        <div style={{ marginBottom: '16px' }}>
          <label style={LABEL}>What was sold?</label>
          <input type="text" value={form.description} onChange={e => update('description', e.target.value)} placeholder="e.g. 2022 Ford F-150 / Haircut / Catering Order" style={INPUT} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '8px' }}>
          <div>
            <label style={LABEL}>Sale amount ($)</label>
            <input type="number" value={form.sale_price} onChange={e => update('sale_price', e.target.value)} placeholder="0.00" style={INPUT} />
          </div>
          <div>
            <label style={LABEL}>Cost / expense ($) <span style={{ color: '#555' }}>optional</span></label>
            <input type="number" value={form.cost} onChange={e => update('cost', e.target.value)} placeholder="0.00" style={INPUT} />
          </div>
        </div>
        {form.sale_price && (
          <div style={{ background: gross() >= 0 ? '#0d2d15' : '#2d1515', border: `1px solid ${gross() >= 0 ? '#27ae60' : '#c0392b'}`, borderRadius: '6px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: gross() >= 0 ? '#2ecc71' : '#e74c3c' }}>
            Gross profit: <strong>${gross().toLocaleString()}</strong>
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div>
            <label style={LABEL}>Payment type</label>
            <select value={form.payment_type} onChange={e => update('payment_type', e.target.value)} style={SELECT}>
              {['Cash','Card','Check','Financed','Bank Transfer','Other'].map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label style={LABEL}>How did they find you?</label>
            <select value={form.lead_source} onChange={e => update('lead_source', e.target.value)} style={SELECT}>
              {['Walk-in','Website','Referral','Phone Call','Facebook Ad','Google Ad','Instagram','Other'].map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
        </div>
        <div style={{ marginBottom: '24px' }}>
          <label style={LABEL}>Notes <span style={{ color: '#555' }}>optional</span></label>
          <textarea value={form.notes} onChange={e => update('notes', e.target.value)} placeholder="Any additional details..." rows={3} style={{ ...INPUT, resize: 'vertical' }} />
        </div>
        {status && (
          <div style={{ background: status.type === 'success' ? '#0d2d15' : '#2d1515', border: `1px solid ${status.type === 'success' ? '#27ae60' : '#c0392b'}`, borderRadius: '6px', padding: '10px 14px', marginBottom: '16px', color: status.type === 'success' ? '#2ecc71' : '#e74c3c', fontSize: '14px' }}>
            {status.type === 'success' ? '✅ ' : '❌ '}{status.msg}
          </div>
        )}
        <button onClick={handleSubmit} disabled={loading} style={{ width: '100%', padding: '14px', background: loading ? '#333' : '#C0C0C0', color: '#0A0A0A', border: 'none', borderRadius: '6px', fontSize: '15px', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer' }}>
          {loading ? 'Saving...' : 'Record Sale'}
        </button>
      </div>
    </div>
  )
}
