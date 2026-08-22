import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import api from '../api'
import { DollarSign } from 'lucide-react'

const INPUT  = { width: '100%', padding: '10px 12px', background: '#0A0A0A', border: '1px solid #333', borderRadius: '6px', color: '#fff', fontSize: '14px', boxSizing: 'border-box', marginTop: '6px' }
const LABEL  = { color: '#999', fontSize: '13px', display: 'block', marginBottom: '2px' }
const SELECT = { ...INPUT, cursor: 'pointer' }
const CARD   = { background: '#1A1A2E', border: '1px solid #333', borderRadius: '8px', padding: '20px', marginBottom: '20px' }

const EXPENSE_CATEGORIES = ['Rent', 'Payroll', 'Marketing', 'Utilities', 'Insurance', 'Supplies', 'Equipment', 'Software', 'Taxes', 'Other']
const INCOME_CATEGORIES  = ['Owner Contribution', 'Business Loan', 'Tax Refund', 'Insurance Payout', 'Grant', 'Investment', 'Other Income']

export default function Finances({ isMobile }) {
  const [data, setData]         = useState(null)
  const [cashflow, setCashflow] = useState(null)
  const [loading, setLoading]   = useState(true)
  const [showAdd, setShowAdd]   = useState(null)
  const [saving, setSaving]     = useState(false)
  const [msg, setMsg]           = useState(null)

  const today = new Date().toISOString().slice(0, 10)
  const [expenseForm, setExpenseForm] = useState({ date: today, category: 'Rent', description: '', amount: '', recurring: false, frequency: 'one-time', notes: '' })
  const [incomeForm, setIncomeForm]   = useState({ date: today, category: 'Owner Contribution', description: '', amount: '', notes: '' })

  const updateExpense = (k, v) => setExpenseForm(p => ({ ...p, [k]: v }))
  const updateIncome  = (k, v) => setIncomeForm(p => ({ ...p, [k]: v }))

  const load = async () => {
    setLoading(true)
    try {
      const [expRes, cfRes] = await Promise.all([api.get('/expenses'), api.get('/cashflow')])
      setData(expRes.data)
      setCashflow(cfRes.data)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleAddExpense = async () => {
    if (!expenseForm.description || !expenseForm.amount) { setMsg({ type: 'error', text: 'Description and amount are required.' }); return }
    setSaving(true)
    try {
      await api.post('/expenses/add', { ...expenseForm, amount: parseFloat(expenseForm.amount) })
      setMsg({ type: 'success', text: 'Expense added!' })
      setExpenseForm({ date: today, category: 'Rent', description: '', amount: '', recurring: false, frequency: 'one-time', notes: '' })
      setShowAdd(null)
      load()
    } catch { setMsg({ type: 'error', text: 'Failed to add expense' }) }
    setSaving(false)
  }

  const handleAddIncome = async () => {
    if (!incomeForm.description || !incomeForm.amount) { setMsg({ type: 'error', text: 'Description and amount are required.' }); return }
    setSaving(true)
    try {
      await api.post('/income/add', { ...incomeForm, amount: parseFloat(incomeForm.amount) })
      setMsg({ type: 'success', text: 'Income added!' })
      setIncomeForm({ date: today, category: 'Owner Contribution', description: '', amount: '', notes: '' })
      setShowAdd(null)
      load()
    } catch { setMsg({ type: 'error', text: 'Failed to add income' }) }
    setSaving(false)
  }

  const handleDeleteExpense = async (id) => {
    try { await api.delete(`/expenses/${id}`); setMsg({ type: 'success', text: 'Deleted' }); load() }
    catch { setMsg({ type: 'error', text: 'Failed to delete' }) }
  }

  const handleDeleteIncome = async (id) => {
    try { await api.delete(`/income/${id}`); setMsg({ type: 'success', text: 'Deleted' }); load() }
    catch { setMsg({ type: 'error', text: 'Failed to delete' }) }
  }

  const thisMonth     = cashflow?.cashflow?.slice(-1)[0]
  const totalIncome   = thisMonth?.income || 0
  const totalExpenses = parseInt(data?.summary?.total_expenses || 0)
  const totalOtherInc = parseInt(data?.summary?.total_other_income || 0)
  const totalSaleInc  = parseInt(data?.summary?.total_sale_income || 0)
  const netCashflow   = (totalIncome + totalOtherInc + totalSaleInc) - totalExpenses

  const gridCols = isMobile ? '1fr' : '1fr 1fr'

  if (loading) return <p style={{ color: '#666', padding: '40px' }}>Loading finances...</p>

  return (
    <div style={{ fontFamily: 'Arial, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h1 style={{ color: '#C0C0C0', margin: 0, fontSize: isMobile ? '20px' : '24px', display: 'flex', alignItems: 'center', gap: '10px' }}><DollarSign size={22} /> Finances</h1>
          <p style={{ color: '#555', margin: 0, fontSize: '13px' }}>Track income, expenses, and cash flow</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setShowAdd(showAdd === 'income' ? null : 'income')} style={{ padding: '8px 14px', background: showAdd === 'income' ? '#27ae60' : 'transparent', color: showAdd === 'income' ? '#fff' : '#2ecc71', border: '1px solid #27ae60', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
            ➕ Income
          </button>
          <button onClick={() => setShowAdd(showAdd === 'expense' ? null : 'expense')} style={{ padding: '8px 14px', background: showAdd === 'expense' ? '#c0392b' : 'transparent', color: showAdd === 'expense' ? '#fff' : '#e74c3c', border: '1px solid #c0392b', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
            ➖ Expense
          </button>
        </div>
      </div>

      {msg && (
        <div style={{ background: msg.type === 'success' ? '#0d2d15' : '#2d1515', border: `1px solid ${msg.type === 'success' ? '#27ae60' : '#c0392b'}`, borderRadius: '6px', padding: '10px 14px', marginBottom: '16px', color: msg.type === 'success' ? '#2ecc71' : '#e74c3c', fontSize: '14px' }}>
          {msg.text}
        </div>
      )}

      {/* Add Income Form */}
      {showAdd === 'income' && (
        <div style={{ ...CARD, border: '1px solid #27ae60', marginBottom: '20px' }}>
          <h2 style={{ color: '#2ecc71', fontSize: '15px', marginBottom: '16px' }}>Add Income</h2>
          <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: '14px', marginBottom: '14px' }}>
            <div><label style={LABEL}>Date</label><input type="date" value={incomeForm.date} onChange={e => updateIncome('date', e.target.value)} style={INPUT} /></div>
            <div><label style={LABEL}>Category</label><select value={incomeForm.category} onChange={e => updateIncome('category', e.target.value)} style={SELECT}>{INCOME_CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
            <div><label style={LABEL}>Description *</label><input type="text" value={incomeForm.description} onChange={e => updateIncome('description', e.target.value)} placeholder="e.g. Owner contribution" style={INPUT} /></div>
            <div><label style={LABEL}>Amount ($) *</label><input type="number" value={incomeForm.amount} onChange={e => updateIncome('amount', e.target.value)} placeholder="0.00" style={INPUT} /></div>
          </div>
          <button onClick={handleAddIncome} disabled={saving} style={{ padding: '10px 20px', background: saving ? '#333' : '#27ae60', color: '#fff', border: 'none', borderRadius: '6px', cursor: saving ? 'not-allowed' : 'pointer', fontSize: '14px' }}>
            {saving ? 'Saving...' : 'Add Income'}
          </button>
        </div>
      )}

      {/* Add Expense Form */}
      {showAdd === 'expense' && (
        <div style={{ ...CARD, border: '1px solid #c0392b', marginBottom: '20px' }}>
          <h2 style={{ color: '#e74c3c', fontSize: '15px', marginBottom: '16px' }}>Add Expense</h2>
          <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: '14px', marginBottom: '14px' }}>
            <div><label style={LABEL}>Date</label><input type="date" value={expenseForm.date} onChange={e => updateExpense('date', e.target.value)} style={INPUT} /></div>
            <div><label style={LABEL}>Category</label><select value={expenseForm.category} onChange={e => updateExpense('category', e.target.value)} style={SELECT}>{EXPENSE_CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
            <div><label style={LABEL}>Description *</label><input type="text" value={expenseForm.description} onChange={e => updateExpense('description', e.target.value)} placeholder="e.g. Monthly rent" style={INPUT} /></div>
            <div><label style={LABEL}>Amount ($) *</label><input type="number" value={expenseForm.amount} onChange={e => updateExpense('amount', e.target.value)} placeholder="0.00" style={INPUT} /></div>
            <div><label style={LABEL}>Recurring?</label><select value={expenseForm.recurring ? 'yes' : 'no'} onChange={e => updateExpense('recurring', e.target.value === 'yes')} style={SELECT}><option value="no">One-time</option><option value="yes">Recurring</option></select></div>
            {expenseForm.recurring && <div><label style={LABEL}>Frequency</label><select value={expenseForm.frequency} onChange={e => updateExpense('frequency', e.target.value)} style={SELECT}><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="yearly">Yearly</option></select></div>}
          </div>
          <button onClick={handleAddExpense} disabled={saving} style={{ padding: '10px 20px', background: saving ? '#333' : '#c0392b', color: '#fff', border: 'none', borderRadius: '6px', cursor: saving ? 'not-allowed' : 'pointer', fontSize: '14px' }}>
            {saving ? 'Saving...' : 'Add Expense'}
          </button>
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
        {[
          { label: 'Sales Income',   value: `$${totalSaleInc.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`,    color: '#2ecc71' },
          { label: 'Other Income',   value: `$${totalOtherInc.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`,   color: '#3498db' },
          { label: 'Total Expenses', value: `$${totalExpenses..toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`,   color: '#e74c3c' },
          { label: 'Net Cash Flow',  value: `$${netCashflow.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`,     color: netCashflow >= 0 ? '#2ecc71' : '#e74c3c' },
        ].map((k, i) => (
          <div key={i} style={{ background: '#1A1A2E', border: '1px solid #333', borderRadius: '8px', padding: '14px 16px', flex: '1 1', minWidth: isMobile ? 'calc(50% - 10px)' : '120px' }}>
            <p style={{ color: '#666', fontSize: '11px', margin: '0 0 6px', textTransform: 'uppercase' }}>{k.label}</p>
            <p style={{ color: k.color || '#C0C0C0', fontSize: isMobile ? '16px' : '20px', fontWeight: 'bold', margin: 0 }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      {cashflow?.cashflow?.length > 0 && (
        <div style={CARD}>
          <h2 style={{ color: '#C0C0C0', fontSize: '15px', marginBottom: '16px' }}>Income vs Expenses</h2>
          <ResponsiveContainer width="100%" height={isMobile ? 180 : 240}>
            <BarChart data={cashflow.cashflow}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222" />
              <XAxis dataKey="month" stroke="#666" tick={{ fontSize: 10 }} />
              <YAxis stroke="#666" tick={{ fontSize: 10 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ background: '#1A1A2E', border: '1px solid #333', color: '#C0C0C0' }} formatter={v => [`$${Number(v).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`]} />
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
          <h2 style={{ color: '#C0C0C0', fontSize: '15px', marginBottom: '14px' }}>Expenses by Category</h2>
          {data.by_category.map((c, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #1a1a1a' }}>
              <span style={{ color: '#999', fontSize: '13px' }}>{c.category}</span>
              <span style={{ color: '#e74c3c', fontSize: '13px', fontWeight: 'bold' }}>${Number(c.total).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
            </div>
          ))}
        </div>
      )}

      {/* Transactions table */}
      <div style={CARD}>
        <h2 style={{ color: '#C0C0C0', fontSize: '15px', marginBottom: '14px' }}>Recent Transactions</h2>
        {!data?.recent?.length && !data?.recent_income?.length ? (
          <p style={{ color: '#555', textAlign: 'center', padding: '20px' }}>No transactions yet.</p>
        ) : (
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ minWidth: '550px', width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Date', 'Type', 'Category', 'Description', 'Amount', ''].map(h => (
                    <th key={h} style={{ color: '#666', fontSize: '11px', textAlign: 'left', padding: '8px 0', borderBottom: '1px solid #333' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ...(data?.recent_income || []).map(i => ({ ...i, type: 'income' })),
                  ...(data?.recent || []).map(e => ({ ...e, type: 'expense' })),
                ].sort((a, b) => b.date.localeCompare(a.date)).map((t, i) => (
                  <tr key={i}>
                    <td style={{ color: '#999', padding: '10px 0', borderBottom: '1px solid #1a1a1a', fontSize: '12px' }}>{t.date}</td>
                    <td style={{ padding: '10px 0', borderBottom: '1px solid #1a1a1a', fontSize: '11px' }}>
                      <span style={{ color: t.type === 'income' ? '#2ecc71' : '#e74c3c', border: `1px solid ${t.type === 'income' ? '#27ae60' : '#c0392b'}`, borderRadius: '10px', padding: '2px 6px' }}>
                        {t.type === 'income' ? '↑' : '↓'}
                      </span>
                    </td>
                    <td style={{ color: '#999', padding: '10px 0', borderBottom: '1px solid #1a1a1a', fontSize: '12px' }}>{t.category}</td>
                    <td style={{ color: '#C0C0C0', padding: '10px 0', borderBottom: '1px solid #1a1a1a', fontSize: '13px' }}>{t.description}</td>
                    <td style={{ color: t.type === 'income' ? '#2ecc71' : '#e74c3c', padding: '10px 0', borderBottom: '1px solid #1a1a1a', fontSize: '13px', fontWeight: 'bold' }}>
                      {t.type === 'income' ? '+' : '-'}${Number(t.amount).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                    </td>
                    <td style={{ padding: '10px 0', borderBottom: '1px solid #1a1a1a' }}>
                      <button onClick={() => t.type === 'income' ? handleDeleteIncome(t.id) : handleDeleteExpense(t.id)} style={{ padding: '3px 8px', background: 'transparent', color: '#e74c3c', border: '1px solid #e74c3c', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>
                        Delete
                      </button>
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
