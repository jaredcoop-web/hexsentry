import { useState } from 'react'
import api from '../api'

const INPUT  = { width: '100%', padding: '10px 12px', background: '#0A0A0A', border: '1px solid #333', borderRadius: '6px', color: '#fff', fontSize: '14px', boxSizing: 'border-box', marginTop: '6px' }
const LABEL  = { color: '#999', fontSize: '13px', display: 'block', marginBottom: '2px' }
const SELECT = { ...INPUT, cursor: 'pointer' }

export default function AddSale({ user }) {
  const today = new Date().toISOString().slice(0, 10)
  const [showFI, setShowFI] = useState(false)
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
  date: today, description: '', sale_price: '', cost: '',
  recon: '', pack: '',
  salesperson: '', payment_type: 'Cash', lead_source: 'Walk-in', notes: '',
  finance_reserve: '', warranty: '', gap_insurance: '', addons: '',
})

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  const totalCost    = () => (parseFloat(form.cost) || 0) + (parseFloat(form.recon) || 0) + (parseFloat(form.pack) || 0)
  const frontGross   = () => (parseFloat(form.sale_price) || 0) - totalCost()
  const totalBackend = () => (parseFloat(form.finance_reserve) || 0) + (parseFloat(form.warranty) || 0) + (parseFloat(form.gap_insurance) || 0) + (parseFloat(form.addons) || 0)
  const totalProfit  = () => frontGross() + totalBackend()

  const handleSubmit = async () => {
    if (!form.description || !form.sale_price || !form.salesperson) {
      setStatus({ type: 'error', msg: 'Please fill in Description, Sale Amount, and Salesperson.' })
      return
    }
    setLoading(true)
    setStatus(null)
    try {
      await api.post('/sales/manual', {
        date:            form.date,
        description:     form.description,
        sale_price:      parseFloat(form.sale_price),
        gross_profit: frontGross(),
        cost:         totalCost(),
        salesperson:     form.salesperson,
        payment_type:    form.payment_type,
        lead_source:     form.lead_source,
        notes:           form.notes,
        finance_reserve: parseFloat(form.finance_reserve) || 0,
        warranty:        parseFloat(form.warranty) || 0,
        gap_insurance:   parseFloat(form.gap_insurance) || 0,
        addons:          parseFloat(form.addons) || 0,
      })
      setStatus({ type: 'success', msg: 'Sale recorded successfully!' })
      setForm({ 
        date: today, 
        description: '', 
        sale_price: '', 
        cost: '', 
        recon: '', 
        pack: '', 
        salesperson: '', 
        payment_type: 'Cash', 
        lead_source: 'Walk-in', 
        notes: '', 
        finance_reserve: '', 
        warranty: '', 
        gap_insurance: '', 
        addons: '' 
      })
      setShowFI(false)
    } catch {
      setStatus({ type: 'error', msg: 'Failed to save sale. Please try again.' })
    }
    setLoading(false)
  }

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '640px' }}>
      <h1 style={{ color: '#C0C0C0', marginBottom: '8px' }}>➕ Add Sale</h1>
      <p style={{ color: '#555', marginBottom: '24px', fontSize: '13px' }}>Log a sale manually — cash, check, financed, or any payment type</p>

      <div style={{ background: '#1A1A2E', border: '1px solid #333', borderRadius: '8px', padding: '24px' }}>

        {/* Core fields */}
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
            <label style={LABEL}>Acquisition cost ($)</label>
            <input type="number" value={form.cost} onChange={e => update('cost', e.target.value)} placeholder="0.00" style={INPUT} />
          </div>
          <div>
            <label style={LABEL}>Reconditioning / Recon ($) <span style={{ color: '#555' }}>optional</span></label>
            <input type="number" value={form.recon} onChange={e => update('recon', e.target.value)} placeholder="0.00" style={INPUT} />
          </div>
          <div>
            <label style={LABEL}>Pack ($) <span style={{ color: '#555' }}>optional</span></label>
            <input type="number" value={form.pack} onChange={e => update('pack', e.target.value)} placeholder="e.g. 600" style={INPUT} />
          </div>
        </div>

        {/* Front end gross preview */}
        {form.sale_price && (
          <div style={{ background: frontGross() >= 0 ? '#0d2d15' : '#2d1515', border: `1px solid ${frontGross() >= 0 ? '#27ae60' : '#c0392b'}`, borderRadius: '6px', padding: '12px 14px', marginBottom: '16px', fontSize: '13px' }}>
           {(form.recon || form.pack) && (
              <div style={{ marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid #1a3a1a' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#666', marginBottom: '4px' }}>
                  <span>Acquisition cost:</span><span>${(parseFloat(form.cost) || 0).toLocaleString()}</span>
                </div>
                {form.recon && <div style={{ display: 'flex', justifyContent: 'space-between', color: '#666', marginBottom: '4px' }}>
                  <span>Reconditioning:</span><span>${(parseFloat(form.recon) || 0).toLocaleString()}</span>
                </div>}
                {form.pack && <div style={{ display: 'flex', justifyContent: 'space-between', color: '#666', marginBottom: '4px' }}>
                  <span>Pack:</span><span>${(parseFloat(form.pack) || 0).toLocaleString()}</span>
                </div>}
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#999' }}>
                  <span>Total cost:</span><span>${totalCost().toLocaleString()}</span>
                </div>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', color: frontGross() >= 0 ? '#2ecc71' : '#e74c3c', fontWeight: 'bold' }}>
              <span>Front end gross:</span><span>${frontGross().toLocaleString()}</span>
            </div>
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

        <div style={{ marginBottom: '20px' }}>
          <label style={LABEL}>Notes <span style={{ color: '#555' }}>optional</span></label>
          <textarea value={form.notes} onChange={e => update('notes', e.target.value)} placeholder="Any additional details..." rows={2} style={{ ...INPUT, resize: 'vertical' }} />
        </div>

        {/* F&I toggle */}
        <button
          onClick={() => setShowFI(!showFI)}
          style={{ width: '100%', padding: '10px', background: showFI ? '#1a2d1a' : '#0d0d0d', color: showFI ? '#2ecc71' : '#666', border: `1px solid ${showFI ? '#27ae60' : '#333'}`, borderRadius: '6px', cursor: 'pointer', fontSize: '13px', marginBottom: showFI ? '16px' : '24px', textAlign: 'left' }}
        >
          {showFI ? '▼' : '▶'} Finance & Insurance (F&I) — <span style={{ color: '#555' }}>optional, for dealerships</span>
        </button>

        {/* F&I fields */}
        {showFI && (
          <div style={{ background: '#0d1a0d', border: '1px solid #1a3a1a', borderRadius: '8px', padding: '20px', marginBottom: '24px' }}>
            <p style={{ color: '#2ecc71', fontSize: '13px', margin: '0 0 16px', fontWeight: 'bold' }}>Backend / F&I Income</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '12px' }}>
              <div>
                <label style={LABEL}>Finance reserve ($)</label>
                <input type="number" value={form.finance_reserve} onChange={e => update('finance_reserve', e.target.value)} placeholder="0.00" style={INPUT} />
              </div>
              <div>
                <label style={LABEL}>Warranty ($)</label>
                <input type="number" value={form.warranty} onChange={e => update('warranty', e.target.value)} placeholder="0.00" style={INPUT} />
              </div>
              <div>
                <label style={LABEL}>GAP insurance ($)</label>
                <input type="number" value={form.gap_insurance} onChange={e => update('gap_insurance', e.target.value)} placeholder="0.00" style={INPUT} />
              </div>
              <div>
                <label style={LABEL}>Add-ons ($)</label>
                <input type="number" value={form.addons} onChange={e => update('addons', e.target.value)} placeholder="0.00" style={INPUT} />
              </div>
            </div>

            {/* Deal summary */}
            {(form.finance_reserve || form.warranty || form.gap_insurance || form.addons) && (
              <div style={{ background: '#0A0A0A', border: '1px solid #333', borderRadius: '6px', padding: '14px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: '#666' }}>Front end gross:</span>
                  <span style={{ color: '#C0C0C0' }}>${frontGross().toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: '#666' }}>Total backend:</span>
                  <span style={{ color: '#2ecc71' }}>${totalBackend().toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #222', paddingTop: '6px' }}>
                  <span style={{ color: '#fff', fontWeight: 'bold' }}>Total deal profit:</span>
                  <span style={{ color: '#2ecc71', fontWeight: 'bold', fontSize: '15px' }}>${totalProfit().toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Status */}
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
