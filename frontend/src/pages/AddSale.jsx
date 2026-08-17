import { useState, useEffect, useRef } from 'react'
import { Plus } from 'lucide-react'
import api from '../api'

const INPUT  = { width: '100%', padding: '10px 12px', background: '#0A0A0A', border: '1px solid #333', borderRadius: '6px', color: '#fff', fontSize: '14px', boxSizing: 'border-box', marginTop: '6px' }
const LABEL  = { color: '#999', fontSize: '13px', display: 'block', marginBottom: '2px' }
const SELECT = { ...INPUT, cursor: 'pointer' }

export default function AddSale({ user, isMobile }) {
  const today = new Date().toISOString().slice(0, 10)
  const [showFI, setShowFI]               = useState(false)
  const [status, setStatus]               = useState(null)
  const [loading, setLoading]             = useState(false)
  const [searchResults, setSearchResults] = useState([])
  const [showDropdown, setShowDropdown]   = useState(false)
  const [fromInventory, setFromInventory] = useState(false)
  const [selectedInventoryId, setSelectedInventoryId] = useState(null)
  const searchRef   = useRef()
  const dropdownRef = useRef()

  const [form, setForm] = useState({
    date: today, description: '', sale_price: '', cost: '',
    salesperson: '', payment_type: 'Cash', lead_source: 'Walk-in', notes: '',
    finance_reserve: '', warranty: '', gap_insurance: '', addons: '',
    down_payment: '', interest_rate: '', term_months: '24',
    payment_frequency: 'Monthly', customer_name: '', customer_phone: '',
  })

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  const frontGross   = () => (parseFloat(form.sale_price) || 0) - (parseFloat(form.cost) || 0)
  const totalBackend = () => (parseFloat(form.finance_reserve) || 0) + (parseFloat(form.warranty) || 0) + (parseFloat(form.gap_insurance) || 0) + (parseFloat(form.addons) || 0)
  const totalProfit  = () => frontGross() + totalBackend()

  // BHPH calculations
  const getBHPHCalc = () => {
    const principal   = (parseFloat(form.sale_price) || 0) - (parseFloat(form.down_payment) || 0)
    const monthlyRate = (parseFloat(form.interest_rate) || 0) / 100 / 12
    const months      = parseInt(form.term_months) || 24
    const monthlyPmt  = monthlyRate > 0
      ? (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1)
      : principal / months
    const totalPaid     = monthlyPmt * months
    const totalInterest = totalPaid - principal
    let displayPayment  = monthlyPmt
    let frequencyLabel  = 'Monthly Payment'
    if (form.payment_frequency === 'Weekly')    { displayPayment = monthlyPmt * 12 / 52;  frequencyLabel = 'Weekly Payment' }
    if (form.payment_frequency === 'Bi-Weekly') { displayPayment = monthlyPmt * 12 / 26; frequencyLabel = 'Bi-Weekly Payment' }
    return { principal, monthlyPmt, totalPaid, totalInterest, displayPayment, frequencyLabel }
  }

  const handleDescriptionChange = async (value) => {
    update('description', value)
    if (fromInventory) return
    if (value.length < 2) { setSearchResults([]); setShowDropdown(false); return }
    try {
      const res = await api.get(`/inventory/search?term=${encodeURIComponent(value)}`)
      setSearchResults(res.data || [])
      setShowDropdown(true)
    } catch { setSearchResults([]) }
  }

  const handleSelectInventory = (item) => {
    setForm(prev => ({
      ...prev,
      description: item.name,
      sale_price:  item.asking_price ? String(item.asking_price) : '',
      cost:        item.cost ? String(item.cost) : '',
    }))
    setFromInventory(true)
    setSelectedInventoryId(item.id)
    setShowDropdown(false)
    setSearchResults([])
  }

  const handleNotInInventory = () => {
    setFromInventory(false)
    setSelectedInventoryId(null)
    setShowDropdown(false)
    setSearchResults([])
  }

  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target) &&
          searchRef.current && !searchRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleSubmit = async () => {
    if (!form.description || !form.sale_price || !form.salesperson) {
      setStatus({ type: 'error', msg: 'Please fill in Vehicle, Sale Price, and Salesperson.' })
      return
    }
    setLoading(true)
    setStatus(null)
    try {
      const bhph = form.payment_type === 'In-House / BHPH' ? getBHPHCalc() : null
      await api.post('/sales/manual', {
        date:            form.date,
        description:     form.description,
        sale_price:      parseFloat(form.sale_price),
        cost:            parseFloat(form.cost) || 0,
        gross_profit:    frontGross(),
        salesperson:     form.salesperson,
        payment_type:    form.payment_type,
        lead_source:     form.lead_source,
        notes:           [
          form.notes || '',
          bhph ? `Down: $${parseFloat(form.down_payment).toLocaleString()}` : '',
          bhph ? `Rate: ${form.interest_rate}%` : '',
          bhph ? `Term: ${form.term_months}mo` : '',
          bhph ? `${bhph.frequencyLabel}: $${bhph.displayPayment.toFixed(2)}` : '',
          bhph ? `Total Interest: $${bhph.totalInterest.toFixed(2)}` : '',
        ].filter(Boolean).join(' | '),
        finance_reserve: parseFloat(form.finance_reserve) || 0,
        warranty:        parseFloat(form.warranty) || 0,
        gap_insurance:   parseFloat(form.gap_insurance) || 0,
        addons:          parseFloat(form.addons) || 0,
        inventory_id:    selectedInventoryId,
      })
      // Auto-create BHPH contract
      if (form.payment_type === 'In-House / BHPH' && form.customer_name && bhph) {
         try {
          await api.post('/bhph/contracts', {
            sale_id:           null,
            customer_name:     form.customer_name,
            customer_phone:    form.customer_phone,
            vehicle:           form.description,
            sale_price:        parseFloat(form.sale_price),
            down_payment:      parseFloat(form.down_payment),
            amount_financed:   bhph.principal,
            interest_rate:     parseFloat(form.interest_rate) || 0,
            term_months:       parseInt(form.term_months),
            payment_frequency: form.payment_frequency,
            payment_amount:    bhph.displayPayment,
            total_interest:    bhph.totalInterest,
            start_date:        form.date,
            notes:             form.notes,
          })
        } catch {}
      }
      setStatus({ type: 'success', msg: 'Sale recorded successfully!' })
      setForm({
        date: today, description: '', sale_price: '', cost: '',
        salesperson: '', payment_type: 'Cash', lead_source: 'Walk-in', notes: '',
        finance_reserve: '', warranty: '', gap_insurance: '', addons: '',
        down_payment: '', interest_rate: '', term_months: '24', payment_frequency: 'Monthly',
        customer_name: '', customer_phone: '',
      })
      setFromInventory(false)
      setSelectedInventoryId(null)
      setShowFI(false)
    } catch {
      setStatus({ type: 'error', msg: 'Failed to save sale. Please try again.' })
    }
    setLoading(false)
  }

  const gridCols = isMobile ? '1fr' : '1fr 1fr'
  const isBHPH   = form.payment_type === 'In-House / BHPH'
  const bhph     = isBHPH && form.sale_price && form.down_payment && form.interest_rate ? getBHPHCalc() : null

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '640px' }}>
      <h1 style={{ color: '#C0C0C0', marginBottom: '8px', fontSize: isMobile ? '20px' : '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Plus size={22} /> Add Sale
      </h1>
      <p style={{ color: '#555', marginBottom: '24px', fontSize: '13px' }}>Log a sale — cash, financed, or in-house BHPH</p>

      <div style={{ background: '#1A1A2E', border: '1px solid #333', borderRadius: '8px', padding: '24px' }}>

        {/* Date and Salesperson */}
        <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: '16px', marginBottom: '16px' }}>
          <div>
            <label style={LABEL}>Date of sale</label>
            <input type="date" value={form.date} onChange={e => update('date', e.target.value)} style={INPUT} />
          </div>
          <div>
            <label style={LABEL}>Salesperson / Staff</label>
            <input type="text" value={form.salesperson} onChange={e => update('salesperson', e.target.value)} placeholder="e.g. James Carter" style={INPUT} />
          </div>
        </div>

        {/* Vehicle with autocomplete */}
        <div style={{ marginBottom: '16px', position: 'relative' }}>
          <label style={LABEL}>Vehicle</label>
          {fromInventory ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
                <div style={{ flex: 1, padding: '10px 12px', background: '#0d2d15', border: '1px solid #27ae60', borderRadius: '6px', color: '#2ecc71', fontSize: '14px' }}>
                  📦 {form.description}
                </div>
                <button onClick={() => { handleNotInInventory(); update('description', ''); update('sale_price', ''); update('cost', '') }} style={{ padding: '10px 12px', background: 'transparent', color: '#666', border: '1px solid #333', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', whiteSpace: 'nowrap' }}>
                  ✕ Change
                </button>
              </div>
              <p style={{ color: '#27ae60', fontSize: '11px', margin: '4px 0 0' }}>✅ From inventory — will be marked as sold on save</p>
            </div>
          ) : (
            <div ref={searchRef}>
              <input type="text" value={form.description} onChange={e => handleDescriptionChange(e.target.value)} placeholder="Type to search inventory or enter manually..." style={INPUT} />
              {showDropdown && (
                <div ref={dropdownRef} style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#0A0A0A', border: '1px solid #333', borderRadius: '6px', zIndex: 50, maxHeight: '280px', overflowY: 'auto', marginTop: '4px' }}>
                  {searchResults.length > 0 && (
                    <>
                      <div style={{ padding: '8px 12px', background: '#111', borderBottom: '1px solid #222' }}>
                        <span style={{ color: '#555', fontSize: '11px', textTransform: 'uppercase' }}>📦 From Inventory</span>
                      </div>
                      {searchResults.map((item, i) => (
                        <div key={i} onClick={() => handleSelectInventory(item)}
                          style={{ padding: '12px 14px', cursor: 'pointer', borderBottom: '1px solid #1a1a1a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#1A1A2E'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <div>
                            <p style={{ color: '#C0C0C0', margin: 0, fontSize: '14px' }}>{item.name}</p>
                            {item.sku && <p style={{ color: '#555', margin: 0, fontSize: '11px' }}>{item.sku}</p>}
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <p style={{ color: '#2ecc71', margin: 0, fontSize: '13px' }}>${Number(item.asking_price || 0).toLocaleString()}</p>
                            <p style={{ color: '#555', margin: 0, fontSize: '11px' }}>cost: ${Number(item.cost || 0).toLocaleString()}</p>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                  <div onClick={handleNotInInventory}
                    style={{ padding: '12px 14px', cursor: 'pointer', color: '#666', fontSize: '13px', borderTop: searchResults.length > 0 ? '1px solid #222' : 'none' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#1A1A2E'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    ➕ Not in inventory — enter manually
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Prices */}
        <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: '16px', marginBottom: '8px' }}>
          <div>
            <label style={LABEL}>Sale Price ($)</label>
            <input type="number" value={form.sale_price} onChange={e => update('sale_price', e.target.value)} placeholder="0.00" style={INPUT} />
          </div>
          <div>
            <label style={LABEL}>Invoice / True Cost ($)</label>
            <input type="number" value={form.cost} onChange={e => update('cost', e.target.value)} placeholder="0.00" style={INPUT} />
          </div>
        </div>

        {/* Gross preview */}
        {form.sale_price && (
          <div style={{ background: frontGross() >= 0 ? '#0d2d15' : '#2d1515', border: `1px solid ${frontGross() >= 0 ? '#27ae60' : '#c0392b'}`, borderRadius: '6px', padding: '12px 14px', marginBottom: '16px', fontSize: '13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: frontGross() >= 0 ? '#2ecc71' : '#e74c3c', fontWeight: 'bold' }}>
              <span>Front end gross:</span><span>${frontGross().toLocaleString()}</span>
            </div>
          </div>
        )}

        {/* Payment type */}
        <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: '16px', marginBottom: '16px' }}>
          <div>
            <label style={LABEL}>Payment type</label>
            <select value={form.payment_type} onChange={e => update('payment_type', e.target.value)} style={SELECT}>
              {['Cash','Card','Check','Financed','Bank Transfer','In-House / BHPH','Other'].map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label style={LABEL}>How did they find you?</label>
            <select value={form.lead_source} onChange={e => update('lead_source', e.target.value)} style={SELECT}>
              {['Walk-in','Website','Referral','Phone Call','Facebook Ad','Google Ad','Instagram','Other'].map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
        </div>

        {/* BHPH sub-form */}
        {isBHPH && (
          <div style={{ background: '#0d1a2d', border: '1px solid #1a3a5a', borderRadius: '8px', padding: '20px', marginBottom: '16px' }}>
            <p style={{ color: '#4a9eff', fontSize: '13px', fontWeight: 'bold', margin: '0 0 16px' }}>🏦 In-House Finance Details</p>
            <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={LABEL}>Customer name *</label>
                <input type="text" value={form.customer_name} onChange={e => update('customer_name', e.target.value)} placeholder="John Smith" style={INPUT} />
              </div>
              <div>
                <label style={LABEL}>Customer phone</label>
                <input type="text" value={form.customer_phone} onChange={e => update('customer_phone', e.target.value)} placeholder="(555) 123-4567" style={INPUT} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: '16px', marginBottom: '12px' }}>
              <div>
                <label style={LABEL}>Down Payment ($)</label>
                <input type="number" value={form.down_payment} onChange={e => update('down_payment', e.target.value)} placeholder="0.00" style={INPUT} />
              </div>
              <div>
                <label style={LABEL}>Interest Rate (%)</label>
                <input type="number" value={form.interest_rate} onChange={e => update('interest_rate', e.target.value)} placeholder="e.g. 18" style={INPUT} />
              </div>
              <div>
                <label style={LABEL}>Term (Months)</label>
                <select value={form.term_months} onChange={e => update('term_months', e.target.value)} style={SELECT}>
                  {['12','18','24','30','36','48','60'].map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label style={LABEL}>Payment Frequency</label>
                <select value={form.payment_frequency} onChange={e => update('payment_frequency', e.target.value)} style={SELECT}>
                  {['Weekly','Bi-Weekly','Monthly'].map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
            </div>

            {/* BHPH calculations */}
            {bhph && (
              <div style={{ background: '#0A0A0A', border: '1px solid #333', borderRadius: '6px', padding: '14px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: '#666' }}>Amount financed:</span>
                  <span style={{ color: '#C0C0C0' }}>${bhph.principal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: '#666' }}>{bhph.frequencyLabel}:</span>
                  <span style={{ color: '#4a9eff', fontWeight: 'bold' }}>${bhph.displayPayment.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: '#666' }}>Total paid over term:</span>
                  <span style={{ color: '#C0C0C0' }}>${bhph.totalPaid.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #222', paddingTop: '6px' }}>
                  <span style={{ color: '#666' }}>Total interest earned:</span>
                  <span style={{ color: '#2ecc71', fontWeight: 'bold' }}>${bhph.totalInterest.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        <div style={{ marginBottom: '20px' }}>
          <label style={LABEL}>Notes <span style={{ color: '#555' }}>optional</span></label>
          <textarea value={form.notes} onChange={e => update('notes', e.target.value)} placeholder="Any additional details..." rows={2} style={{ ...INPUT, resize: 'vertical' }} />
        </div>

        {/* F&I toggle */}
        <button onClick={() => setShowFI(!showFI)} style={{ width: '100%', padding: '10px', background: showFI ? '#1a2d1a' : '#0d0d0d', color: showFI ? '#2ecc71' : '#666', border: `1px solid ${showFI ? '#27ae60' : '#333'}`, borderRadius: '6px', cursor: 'pointer', fontSize: '13px', marginBottom: showFI ? '16px' : '24px', textAlign: 'left' }}>
          {showFI ? '▼' : '▶'} Finance & Insurance (F&I) — <span style={{ color: '#555' }}>optional backend income</span>
        </button>

        {/* F&I fields */}
        {showFI && (
          <div style={{ background: '#0d1a0d', border: '1px solid #1a3a1a', borderRadius: '8px', padding: '20px', marginBottom: '24px' }}>
            <p style={{ color: '#2ecc71', fontSize: '13px', margin: '0 0 16px', fontWeight: 'bold' }}>Backend / F&I Income</p>
            <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: '16px', marginBottom: '12px' }}>
              <div><label style={LABEL}>Finance reserve ($)</label><input type="number" value={form.finance_reserve} onChange={e => update('finance_reserve', e.target.value)} placeholder="0.00" style={INPUT} /></div>
              <div><label style={LABEL}>Warranty ($)</label><input type="number" value={form.warranty} onChange={e => update('warranty', e.target.value)} placeholder="0.00" style={INPUT} /></div>
              <div><label style={LABEL}>GAP insurance ($)</label><input type="number" value={form.gap_insurance} onChange={e => update('gap_insurance', e.target.value)} placeholder="0.00" style={INPUT} /></div>
              <div><label style={LABEL}>Add-ons ($)</label><input type="number" value={form.addons} onChange={e => update('addons', e.target.value)} placeholder="0.00" style={INPUT} /></div>
            </div>
            {(form.finance_reserve || form.warranty || form.gap_insurance || form.addons) && (
              <div style={{ background: '#0A0A0A', border: '1px solid #333', borderRadius: '6px', padding: '14px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}><span style={{ color: '#666' }}>Front end gross:</span><span style={{ color: '#C0C0C0' }}>${frontGross().toLocaleString()}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}><span style={{ color: '#666' }}>Total backend:</span><span style={{ color: '#2ecc71' }}>${totalBackend().toLocaleString()}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #222', paddingTop: '6px' }}><span style={{ color: '#fff', fontWeight: 'bold' }}>Total deal profit:</span><span style={{ color: '#2ecc71', fontWeight: 'bold', fontSize: '15px' }}>${totalProfit().toLocaleString()}</span></div>
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
