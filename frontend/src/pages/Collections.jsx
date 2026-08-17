import { useEffect, useState } from 'react'
import { DollarSign } from 'lucide-react'
import api from '../api'

const CARD = { background: '#1A1A2E', border: '1px solid #333', borderRadius: '8px', padding: '20px', marginBottom: '20px' }
const INPUT = { width: '100%', padding: '10px 12px', background: '#0A0A0A', border: '1px solid #333', borderRadius: '6px', color: '#fff', fontSize: '14px', boxSizing: 'border-box', marginTop: '6px' }
const LABEL = { color: '#999', fontSize: '13px', display: 'block', marginBottom: '2px' }
const SELECT = { ...INPUT, cursor: 'pointer' }

export default function Collections({ isMobile }) {
  const [contracts, setContracts]       = useState([])
  const [summary, setSummary]           = useState(null)
  const [loading, setLoading]           = useState(true)
  const [selectedContract, setSelectedContract] = useState(null)
  const [payments, setPayments]         = useState([])
  const [showNew, setShowNew]           = useState(false)
  const [saving, setSaving]             = useState(false)
  const [msg, setMsg]                   = useState(null)

  const today = new Date().toISOString().slice(0, 10)

  const [form, setForm] = useState({
    customer_name: '', customer_phone: '', vehicle: '',
    sale_price: '', down_payment: '', interest_rate: '',
    term_months: '24', payment_frequency: 'Monthly',
    start_date: today, notes: ''
  })

  const update = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const getCalc = () => {
    const principal   = (parseFloat(form.sale_price) || 0) - (parseFloat(form.down_payment) || 0)
    const monthlyRate = (parseFloat(form.interest_rate) || 0) / 100 / 12
    const months      = parseInt(form.term_months) || 24
    const monthlyPmt  = monthlyRate > 0
      ? (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1)
      : principal / months
    const totalPaid     = monthlyPmt * months
    const totalInterest = totalPaid - principal
    let paymentAmount   = monthlyPmt
    if (form.payment_frequency === 'Weekly')    paymentAmount = monthlyPmt * 12 / 52
    if (form.payment_frequency === 'Bi-Weekly') paymentAmount = monthlyPmt * 12 / 26
    return { principal, paymentAmount, totalInterest, monthlyPmt }
  }

  const load = async () => {
    setLoading(true)
    try {
      const [cRes, sRes] = await Promise.all([
        api.get('/bhph/contracts'),
        api.get('/bhph/summary'),
      ])
      setContracts(cRes.data || [])
      setSummary(sRes.data)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const loadPayments = async (contractId) => {
    try {
      const res = await api.get(`/bhph/contracts/${contractId}/payments`)
      setPayments(res.data || [])
    } catch {}
  }

  const handleSelectContract = (contract) => {
    setSelectedContract(contract)
    loadPayments(contract.id)
  }

  const handleMarkPaid = async (paymentId) => {
    try {
      await api.patch(`/bhph/payments/${paymentId}/pay`)
      setMsg({ type: 'success', text: 'Payment recorded!' })
      loadPayments(selectedContract.id)
      load()
    } catch { setMsg({ type: 'error', text: 'Failed to record payment' }) }
  }

  const handleMarkLate = async (paymentId) => {
    try {
      await api.patch(`/bhph/payments/${paymentId}/late`)
      setMsg({ type: 'success', text: 'Marked as late' })
      loadPayments(selectedContract.id)
      load()
    } catch { setMsg({ type: 'error', text: 'Failed' }) }
  }

  const handleCreate = async () => {
    if (!form.customer_name || !form.vehicle || !form.sale_price || !form.down_payment) {
      setMsg({ type: 'error', text: 'Please fill in all required fields.' })
      return
    }
    setSaving(true)
    const calc = getCalc()
    try {
      await api.post('/bhph/contracts', {
        sale_id:           null,
        customer_name:     form.customer_name,
        customer_phone:    form.customer_phone,
        vehicle:           form.vehicle,
        sale_price:        parseFloat(form.sale_price),
        down_payment:      parseFloat(form.down_payment),
        amount_financed:   calc.principal,
        interest_rate:     parseFloat(form.interest_rate) || 0,
        term_months:       parseInt(form.term_months),
        payment_frequency: form.payment_frequency,
        payment_amount:    calc.paymentAmount,
        total_interest:    calc.totalInterest,
        start_date:        form.start_date,
        notes:             form.notes,
      })
      setMsg({ type: 'success', text: `Contract created for ${form.customer_name}!` })
      setForm({ customer_name: '', customer_phone: '', vehicle: '', sale_price: '', down_payment: '', interest_rate: '', term_months: '24', payment_frequency: 'Monthly', start_date: today, notes: '' })
      setShowNew(false)
      load()
    } catch { setMsg({ type: 'error', text: 'Failed to create contract' }) }
    setSaving(false)
  }

  const calc = form.sale_price && form.down_payment && form.interest_rate ? getCalc() : null
  const gridCols = isMobile ? '1fr' : '1fr 1fr'

  if (loading) return <p style={{ color: '#666', padding: '40px' }}>Loading collections...</p>

  return (
    <div style={{ fontFamily: 'Arial, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h1 style={{ color: '#C0C0C0', margin: '0 0 4px', fontSize: isMobile ? '20px' : '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <DollarSign size={22} /> Collections
          </h1>
          <p style={{ color: '#555', margin: 0, fontSize: '13px' }}>Track in-house finance payments and collections</p>
        </div>
        <button onClick={() => setShowNew(!showNew)} style={{ padding: '10px 16px', background: '#C0C0C0', color: '#0A0A0A', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
          {showNew ? 'Cancel' : '➕ New Contract'}
        </button>
      </div>

      {msg && (
        <div style={{ background: msg.type === 'success' ? '#0d2d15' : '#2d1515', border: `1px solid ${msg.type === 'success' ? '#27ae60' : '#c0392b'}`, borderRadius: '6px', padding: '10px 14px', marginBottom: '16px', color: msg.type === 'success' ? '#2ecc71' : '#e74c3c', fontSize: '14px' }}>
          {msg.text}
        </div>
      )}

      {/* Summary KPIs */}
      {summary && (
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
          {[
            { label: 'Active Contracts',  value: summary.active_contracts || 0 },
            { label: 'Total Portfolio',   value: `$${Number(summary.total_portfolio || 0).toLocaleString()}`, color: '#4a9eff' },
            { label: 'Total Collected',   value: `$${Number(summary.total_collected || 0).toLocaleString()}`, color: '#2ecc71' },
            { label: 'Late Payments',     value: summary.late_payments || 0, color: (summary.late_payments || 0) > 0 ? '#e74c3c' : '#2ecc71' },
            { label: 'Due Today',         value: summary.due_today || 0, color: (summary.due_today || 0) > 0 ? '#f39c12' : '#2ecc71' },
          ].map((k, i) => (
            <div key={i} style={{ background: '#1A1A2E', border: '1px solid #333', borderRadius: '8px', padding: '14px 16px', flex: '1 1', minWidth: isMobile ? 'calc(50% - 10px)' : '120px' }}>
              <p style={{ color: '#666', fontSize: '11px', margin: '0 0 6px', textTransform: 'uppercase' }}>{k.label}</p>
              <p style={{ color: k.color || '#C0C0C0', fontSize: isMobile ? '18px' : '22px', fontWeight: 'bold', margin: 0 }}>{k.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* New Contract Form */}
      {showNew && (
        <div style={CARD}>
          <h2 style={{ color: '#C0C0C0', fontSize: '16px', marginBottom: '20px' }}>New BHPH Contract</h2>

          {/* Customer */}
          <div style={{ background: '#0d0d1a', border: '1px solid #222', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
            <p style={{ color: '#4a9eff', fontSize: '13px', fontWeight: 'bold', margin: '0 0 12px' }}>👤 Customer</p>
            <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: '14px' }}>
              <div><label style={LABEL}>Customer name *</label><input type="text" value={form.customer_name} onChange={e => update('customer_name', e.target.value)} placeholder="John Smith" style={INPUT} /></div>
              <div><label style={LABEL}>Phone</label><input type="text" value={form.customer_phone} onChange={e => update('customer_phone', e.target.value)} placeholder="(555) 123-4567" style={INPUT} /></div>
            </div>
          </div>

          {/* Vehicle */}
          <div style={{ marginBottom: '16px' }}>
            <label style={LABEL}>Vehicle *</label>
            <input type="text" value={form.vehicle} onChange={e => update('vehicle', e.target.value)} placeholder="2018 Honda Civic" style={INPUT} />
          </div>

          {/* Finance details */}
          <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: '14px', marginBottom: '16px' }}>
            <div><label style={LABEL}>Sale Price ($) *</label><input type="number" value={form.sale_price} onChange={e => update('sale_price', e.target.value)} placeholder="0.00" style={INPUT} /></div>
            <div><label style={LABEL}>Down Payment ($) *</label><input type="number" value={form.down_payment} onChange={e => update('down_payment', e.target.value)} placeholder="0.00" style={INPUT} /></div>
            <div><label style={LABEL}>Interest Rate (%)</label><input type="number" value={form.interest_rate} onChange={e => update('interest_rate', e.target.value)} placeholder="e.g. 18" style={INPUT} /></div>
            <div><label style={LABEL}>Term (Months)</label><select value={form.term_months} onChange={e => update('term_months', e.target.value)} style={SELECT}>{['12','18','24','30','36','48','60'].map(o => <option key={o}>{o}</option>)}</select></div>
            <div><label style={LABEL}>Payment Frequency</label><select value={form.payment_frequency} onChange={e => update('payment_frequency', e.target.value)} style={SELECT}>{['Weekly','Bi-Weekly','Monthly'].map(o => <option key={o}>{o}</option>)}</select></div>
            <div><label style={LABEL}>Start Date</label><input type="date" value={form.start_date} onChange={e => update('start_date', e.target.value)} style={INPUT} /></div>
          </div>

          {/* Calculations preview */}
          {calc && (
            <div style={{ background: '#0A0A0A', border: '1px solid #333', borderRadius: '6px', padding: '14px', marginBottom: '16px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}><span style={{ color: '#666' }}>Amount financed:</span><span style={{ color: '#C0C0C0' }}>${calc.principal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}><span style={{ color: '#666' }}>{form.payment_frequency} payment:</span><span style={{ color: '#4a9eff', fontWeight: 'bold' }}>${calc.paymentAmount.toFixed(2)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #222', paddingTop: '6px' }}><span style={{ color: '#666' }}>Total interest earned:</span><span style={{ color: '#2ecc71', fontWeight: 'bold' }}>${calc.totalInterest.toFixed(2)}</span></div>
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <label style={LABEL}>Notes</label>
            <textarea value={form.notes} onChange={e => update('notes', e.target.value)} placeholder="optional" rows={2} style={{ ...INPUT, resize: 'vertical' }} />
          </div>

          <button onClick={handleCreate} disabled={saving} style={{ padding: '12px 24px', background: saving ? '#333' : '#C0C0C0', color: '#0A0A0A', border: 'none', borderRadius: '6px', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '14px' }}>
            {saving ? 'Creating...' : 'Create Contract & Generate Schedule'}
          </button>
        </div>
      )}

      {/* Contract list + payment detail */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : selectedContract ? '1fr 1fr' : '1fr', gap: '20px' }}>

        {/* Contracts list */}
        <div style={CARD}>
          <h2 style={{ color: '#C0C0C0', fontSize: '15px', marginBottom: '16px' }}>Active Contracts</h2>
          {contracts.length === 0 ? (
            <p style={{ color: '#555', textAlign: 'center', padding: '20px' }}>No contracts yet. Create your first BHPH contract above.</p>
          ) : (
            contracts.map((c, i) => (
              <div key={i}
                onClick={() => handleSelectContract(c)}
                style={{ padding: '14px', background: selectedContract?.id === c.id ? '#0d1a2d' : '#0A0A0A', border: `1px solid ${selectedContract?.id === c.id ? '#4a9eff' : '#222'}`, borderRadius: '8px', marginBottom: '8px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ color: '#C0C0C0', margin: '0 0 4px', fontWeight: 'bold', fontSize: '14px' }}>{c.customer_name}</p>
                    <p style={{ color: '#666', margin: '0 0 4px', fontSize: '12px' }}>{c.vehicle}</p>
                    <p style={{ color: '#555', margin: 0, fontSize: '11px' }}>{c.payment_frequency} — ${Number(c.payment_amount).toFixed(2)}/payment</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {(c.late_count || 0) > 0 && (
                      <span style={{ background: '#2d1515', color: '#e74c3c', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', display: 'block', marginBottom: '4px' }}>
                        🔴 {c.late_count} late
                      </span>
                    )}
                    <p style={{ color: '#2ecc71', margin: 0, fontSize: '13px', fontWeight: 'bold' }}>${Number(c.total_collected || 0).toLocaleString()}</p>
                    <p style={{ color: '#555', margin: 0, fontSize: '11px' }}>collected</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Payment schedule */}
        {selectedContract && (
          <div style={CARD}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ color: '#C0C0C0', fontSize: '15px', margin: '0 0 4px' }}>{selectedContract.customer_name}</h2>
                <p style={{ color: '#666', margin: 0, fontSize: '12px' }}>{selectedContract.vehicle}</p>
              </div>
              <button onClick={() => setSelectedContract(null)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '18px' }}>✕</button>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <div style={{ background: '#0A0A0A', borderRadius: '6px', padding: '8px 12px', flex: 1 }}>
                <p style={{ color: '#555', fontSize: '10px', margin: '0 0 2px', textTransform: 'uppercase' }}>Financed</p>
                <p style={{ color: '#4a9eff', fontSize: '16px', fontWeight: 'bold', margin: 0 }}>${Number(selectedContract.amount_financed).toLocaleString()}</p>
              </div>
              <div style={{ background: '#0A0A0A', borderRadius: '6px', padding: '8px 12px', flex: 1 }}>
                <p style={{ color: '#555', fontSize: '10px', margin: '0 0 2px', textTransform: 'uppercase' }}>Collected</p>
                <p style={{ color: '#2ecc71', fontSize: '16px', fontWeight: 'bold', margin: 0 }}>${Number(selectedContract.total_collected || 0).toLocaleString()}</p>
              </div>
              <div style={{ background: '#0A0A0A', borderRadius: '6px', padding: '8px 12px', flex: 1 }}>
                <p style={{ color: '#555', fontSize: '10px', margin: '0 0 2px', textTransform: 'uppercase' }}>Remaining</p>
                <p style={{ color: '#C0C0C0', fontSize: '16px', fontWeight: 'bold', margin: 0 }}>${(Number(selectedContract.amount_financed) - Number(selectedContract.total_collected || 0)).toLocaleString()}</p>
              </div>
            </div>
            <h3 style={{ color: '#C0C0C0', fontSize: '13px', margin: '0 0 10px', textTransform: 'uppercase' }}>Payment Schedule</h3>
            <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
            <div style={{ maxHeight: '500px', overflowY: 'auto', marginTop: '16px' }}>
              {payments.map((p, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #1a1a1a' }}>
                  <div>
                    <p style={{ color: p.status === 'Paid' ? '#555' : p.status === 'Late' ? '#e74c3c' : '#C0C0C0', margin: '0 0 2px', fontSize: '13px', textDecoration: p.status === 'Paid' ? 'line-through' : 'none' }}>
                      {p.due_date}
                    </p>
                    <p style={{ color: p.status === 'Paid' ? '#2ecc71' : p.status === 'Late' ? '#e74c3c' : '#666', margin: 0, fontSize: '11px' }}>
                      {p.status === 'Paid' ? `✅ Paid ${p.paid_date}` : p.status === 'Late' ? '🔴 Late' : '⏳ Upcoming'}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#C0C0C0', fontSize: '13px' }}>${Number(p.amount_due).toFixed(2)}</span>
                    {p.status !== 'Paid' && (
                      <>
                        <button onClick={() => handleMarkPaid(p.id)} style={{ padding: '4px 8px', background: '#0d2d15', color: '#2ecc71', border: '1px solid #27ae60', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>
                          Paid
                        </button>
                        {p.status !== 'Late' && (
                          <button onClick={() => handleMarkLate(p.id)} style={{ padding: '4px 8px', background: 'transparent', color: '#e74c3c', border: '1px solid #e74c3c', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>
                            Late
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
