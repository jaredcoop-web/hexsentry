import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import api from '../api'

const INPUT  = { width: '100%', padding: '10px 12px', background: '#0A0A0A', border: '1px solid #333', borderRadius: '6px', color: '#fff', fontSize: '14px', boxSizing: 'border-box', marginTop: '6px' }
const LABEL  = { color: '#999', fontSize: '13px', display: 'block', marginBottom: '2px' }
const SELECT = { ...INPUT, cursor: 'pointer' }
const CARD   = { background: '#1A1A2E', border: '1px solid #333', borderRadius: '8px', padding: '24px', marginBottom: '24px' }

const CATEGORIES = ['Rent', 'Payroll', 'Marketing', 'Utilities', 'Insurance', 'Supplies', 'Equipment', 'Software', 'Taxes', 'Other']

const SUGGESTIONS = (data) => {
  const suggestions = []
  if (!data) return suggestions

  const { summary, cashflow } = data
  const thisMonth = cashflow?.cashflow?.slice(-1)[0]

  if (thisMonth) {
    const { income, expenses, net } = thisMonth
    if (net < 0) {
      suggestions.push({ type: 'critical', text: `Your expenses exceeded income by $${Math.abs(net).toLocaleString()} this month. Review your largest expense categories immediately.` })
    } else if (net > 0) {
      suggestions.push({ type: 'positive', text: `Positive cash flow of $${net.toLocaleString()} this month. Consider reinvesting in marketing or building a cash reserve.` })
    }
    if (income > 0 && expenses / income > 0.8) {
      suggestions.push({ type: 'warning', text: `Your expenses are ${Math.round(expenses/income*100)}% of revenue. Aim to keep total expenses below 70% of revenue for a healthy margin.` })
    }
  }

  if (summary?.total_expenses > 0) {
    suggestions.push({ type: 'info', text: `You have spent $${Number(summary.total_expenses).toLocaleString()} this month across ${summary.total_count} expense entries.` })
  }

  return suggestions
}

export default function Finances() {
  const [data, setData]         = useState(null)
  const [cashflow, setCashflow] = useState(null)
  const [loading, setLoading]   = useState(true)
  const [showAdd, setShowAdd]   = useState(false)
  const [saving, setSaving]     = useState(false)
  const [msg, setMsg]           = useState(null)

  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState({
    date: today, category: 'Rent', description: '', amount: '',
    recurring: false, frequency: 'one-time', notes: ''
  })

  const update = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const load = async () => {
    setLoading(true)
    try {
      const [expRes, cfRes] = await Promise.all([
        api.get('/expenses'),
        api.get('/cashflow'),
      ])
      setData(expRes.data)
      setCashflow(cfRes.data)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleAdd = async () => {
    if (!form.description || !form.amount) {
      setMsg({ type: 'error', text: 'Description and amount are required.' })
      return
    }
    setSaving(true)
    try {
      await api.post('/expenses/add', { ...form, amount: parseFloat(form.amount) })
      setMsg({ type: 'success', text: 'Expense added!' })
      setForm({ date: today, category: 'Rent', description: '', amount: '', recurring: false, frequency: 'one-time', notes: '' })
      setShowAdd(false)
      load()
    } catch { setMsg({ type: 'error', text: 'Failed to add expense' }) }
    setSaving(false)
  }

  const handleDelete = async (id) => {
    try {
      await api.delete(`/expenses/${id}`)
      setMsg({ type: 'success', text: 'Expense deleted' })
      load()
    } catch { setMsg({ type: 'error', text: 'Failed to delete' }) }
  }

  const suggestions = SUGGESTIONS({ summary: data?.summary, cashflow })

  const thisMonth = cashflow?.cashflow?.slice(-1)[0]
  const totalIncome   = thisMonth?.income || 0
  const totalExpenses = parseInt(data?.summary?.total_expenses || 0)
  const netCashflow   = totalIncome - totalExpenses

  if (loading) return <p style={{ color: '#666', padding: '40px' }}>Loading finances...</p>

  return (
    <div style={{ fontFamily: 'Arial, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ color: '#C0C0C0', margin: '0 0 4px', fontSize: '24px' }}>💰 Finances</h1>
          <p style={{ color: '#555', margin: 0, fontSize: '13px' }}>Track income, expenses, and real cash flow</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} style={{ padding: '10px 20px', background: '#C0C0C0', color: '#0A0A0A', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>
          {showAdd ? 'Cancel' : '➕ Add Expense'}
        </button>
      </div>

      {msg && (
        <div style={{ background: msg.type === 'success' ? '#0d2d15' : '#2d1515', border: `1px solid ${msg.type === 'success' ? '#27ae60' : '#c0392b'}`, borderRadius: '6px', padding: '10px 14px', marginBottom: '16px', color: msg.type === 'success' ? '#2ecc71' : '#e74c3c', fontSize: '14px' }}>
          {msg.text}
        </div>
      )}

      {/* Add Expense Form */}
      {showAdd && (
        <div style={CARD}>
          <h2 style={{ color: '#C0C0C0', fontSize: '16px', marginBottom: '20px' }}>Add Expense</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={LABEL}>Date</label>
              <input type="date" value={form.date} onChange={e => update('date', e.target.value)} style={INPUT} />
            </div>
            <div>
              <label style={LABEL}>Category</label>
              <select value={form.category} onChange={e => update('category', e.target.value)} style={SELECT}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={LABEL}>Description *</label>
              <input type="text" value={form.description} onChange={e => update('description', e.target.value)} placeholder="e.g. Monthly rent payment" style={INPUT} />
            </div>
            <div>
              <label style={LABEL}>Amount ($) *</label>
              <input type="number" value={form.amount} onChange={e => update('amount', e.target.value)} placeholder="0.00" style={INPUT} />
            </div>
            <div>
              <label style={LABEL}>Recurring?</label>
              <select value={form.recurring ? 'yes' : 'no'} onChange={e => update('recurring', e.target.value === 'yes')} style={SELECT}>
                <option value="no">One-time</option>
                <option value="yes">Recurring</option>
              </select>
            </div>
            {form.recurring && (
              <div>
                <label style={LABEL}>Frequency</label>
                <select value={form.frequency} onChange={e => update('frequency', e.target.value)} style={SELECT}>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
            )}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={LABEL}>Notes <span style={{ color: '#555' }}>optional</span></label>
              <input type="text" value={form.notes} onChange={e => update('notes', e.target.value)} placeholder="Any additional details" style={INPUT} />
            </div>
          </div>
          <button onClick={handleAdd} disabled={saving} style={{ padding: '12px 24px', background: saving ? '#333' : '#C0C0C0', color: '#0A0A0A', border: 'none', borderRadius: '6px', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '14px' }}>
            {saving ? 'Saving...' : 'Add Expense'}
          </button>
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px' }}>
        {[
          { label: 'Total Income',    value: `$${totalIncome.toLocaleString()}`,   color: '#2ecc71' },
          { label: 'Total Expenses',  value: `$${totalExpenses.toLocaleString()}`, color: '#e74c3c' },
          { label: 'Net Cash Flow',   value: `$${netCashflow.toLocaleString()}`,   color: netCashflow >= 0 ? '#2ecc71' : '#e74c3c' },
          { label: 'Expense Entries', value: data?.summary?.total_count || 0 },
        ].map((k, i) => (
          <div key={i} style={{ background: '#1A1A2E', border: '1px solid #333', borderRadius: '8px', padding: '20px', flex: 1, minWidth: '140px' }}>
            <p style={{ color: '#666', fontSize: '12px', margin: '0 0 8px', textTransform: 'uppercase' }}>{k.label}</p>
            <p style={{ color: k.color || '#C0C0C0', fontSize: '24px', fontWeight: 'bold', margin: 0 }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* HexGuard Suggestions */}
      {suggestions.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ color: '#C0C0C0', fontSize: '16px', marginBottom: '12px' }}>🤖 HexGuard Suggestions</h2>
          {suggestions.map((s, i) => {
            const colors = {
              critical: { bg: '#2d1515', border: '#c0392b', text: '#e74c3c', icon: '🔴' },
              warning:  { bg: '#2d2010', border: '#e67e22', text: '#f39c12', icon: '🟡' },
              positive: { bg: '#0d2d15', border: '#27ae60', text: '#2ecc71', icon: '🟢' },
              info:     { bg: '#0d1a2d', border: '#2980b9', text: '#3498db', icon: '💡' },
            }
            const c = colors[s.type]
            return (
              <div key={i} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: '8px', padding: '12px 16px', marginBottom: '8px' }}>
                <p style={{ color: c.text, margin: 0, fontSize: '13px' }}>{c.icon} {s.text}</p>
              </div>
            )
          })}
        </div>
      )}

      {/* Cash Flow Chart */}
      {cashflow?.cashflow?.length > 0 && (
        <div style={CARD}>
          <h2 style={{ color: '#C0C0C0', fontSize: '16px', marginBottom: '16px' }}>Income vs Expenses by Month</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={cashflow.cashflow}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222" />
              <XAxis dataKey="month" stroke="#666" tick={{ fontSize: 12 }} />
              <YAxis stroke="#666" tick={{ fontSize: 12 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ background: '#1A1A2E', border: '1px solid #333', color: '#C0C0C0' }} formatter={v => [`$${Number(v).toLocaleString()}`]} />
              <Legend />
              <Bar dataKey="income"   name="Income"   fill="#2ecc71" radius={[4,4,0,0]} />
              <Bar dataKey="expenses" name="Expenses" fill="#e74c3c" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Expenses by category */}
      {data?.by_category?.length > 0 && (
        <div style={CARD}>
          <h2 style={{ color: '#C0C0C0', fontSize: '16px', marginBottom: '16px' }}>Expenses by Category This Month</h2>
          {data.by_category.map((c, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #1a1a1a' }}>
              <span style={{ color: '#999', fontSize: '14px' }}>{c.category}</span>
              <span style={{ color: '#e74c3c', fontSize: '14px', fontWeight: 'bold' }}>${Number(c.total).toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}

      {/* Recent expenses table */}
      <div style={CARD}>
        <h2 style={{ color: '#C0C0C0', fontSize: '16px', marginBottom: '16px' }}>Recent Expenses</h2>
        {!data?.recent?.length ? (
          <p style={{ color: '#555', textAlign: 'center', padding: '20px' }}>No expenses yet. Add your first expense above.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Date', 'Category', 'Description', 'Amount', 'Recurring', ''].map(h => (
                  <th key={h} style={{ color: '#666', fontSize: '12px', textAlign: 'left', padding: '8px 0', borderBottom: '1px solid #333' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.recent.map((e, i) => (
                <tr key={i}>
                  <td style={{ color: '#999', padding: '12px 0', borderBottom: '1px solid #1a1a1a', fontSize: '13px' }}>{e.date}</td>
                  <td style={{ color: '#999', padding: '12px 0', borderBottom: '1px solid #1a1a1a', fontSize: '13px' }}>{e.category}</td>
                  <td style={{ color: '#C0C0C0', padding: '12px 0', borderBottom: '1px solid #1a1a1a', fontSize: '13px' }}>{e.description}</td>
                  <td style={{ color: '#e74c3c', padding: '12px 0', borderBottom: '1px solid #1a1a1a', fontSize: '13px' }}>${Number(e.amount).toLocaleString()}</td>
                  <td style={{ color: '#555', padding: '12px 0', borderBottom: '1px solid #1a1a1a', fontSize: '13px' }}>{e.recurring ? `Yes (${e.frequency})` : 'No'}</td>
                  <td style={{ padding: '12px 0', borderBottom: '1px solid #1a1a1a' }}>
                    <button onClick={() => handleDelete(e.id)} style={{ padding: '4px 10px', background: 'transparent', color: '#e74c3c', border: '1px solid #e74c3c', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                      Delete
                    </button>
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
