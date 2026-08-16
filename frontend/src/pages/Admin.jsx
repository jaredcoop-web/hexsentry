import { useEffect, useState } from 'react'
import api from '../api'

const INPUT  = { width: '100%', padding: '10px 12px', background: '#0A0A0A', border: '1px solid #333', borderRadius: '6px', color: '#fff', fontSize: '14px', boxSizing: 'border-box', marginTop: '6px' }
const LABEL  = { color: '#999', fontSize: '13px', display: 'block', marginBottom: '2px' }
const SELECT = { ...INPUT, cursor: 'pointer' }
const CARD   = { background: '#1A1A2E', border: '1px solid #333', borderRadius: '8px', padding: '24px', marginBottom: '24px' }

const BUSINESS_TYPES = {
  general:     'General Business',
  dealership:  'Auto Dealership',
  repair_shop: 'Repair Shop',
}

const PLANS = {
  core:   { label: 'Core — $99.99/mo',   color: '#4a9eff' },
  full:   { label: 'Full — $199.99/mo',  color: '#2ecc71' },
  custom: { label: 'Custom',             color: '#C0C0C0' },
}

const ALL_PAGES = [
  { id: 'dashboard',        label: '📊 Dashboard',      category: 'shared' },
  { id: 'finances',         label: '💰 Finances',        category: 'shared' },
  { id: 'email',            label: '📧 Email Report',    category: 'shared' },
  { id: 'ai',               label: '🤖 AI Chat',         category: 'shared' },
  { id: 'reviews',          label: '⭐ Reviews',          category: 'shared' },
  { id: 'payments',         label: '💳 Payments',        category: 'shared' },
  { id: 'sales',            label: '🚗 Sales',           category: 'dealership' },
  { id: 'add-sale',         label: '➕ Add Sale',        category: 'dealership' },
  { id: 'dealer-inventory', label: '🚙 Lot Inventory',   category: 'dealership' },
  { id: 'fi',               label: '💼 F&I',             category: 'dealership' },
  { id: 'jobs',             label: '🔧 Jobs',            category: 'repair_shop' },
  { id: 'add-job',          label: '🔩 Add Job',         category: 'repair_shop' },
  { id: 'inventory',        label: '📦 Inventory',       category: 'general' },
  { id: 'collections', label: '💰 Collections', category: 'dealership' },
]

const DEFAULT_PAGES = {
  general:     ['dashboard', 'sales', 'add-sale', 'finances', 'email', 'reviews', 'payments', 'inventory'],
  dealership:  ['dashboard', 'sales', 'add-sale', 'dealer-inventory', 'fi', 'finances', 'email', 'reviews', 'payments', 'ai'],
  repair_shop: ['dashboard', 'jobs', 'add-job', 'finances', 'email', 'reviews', 'payments', 'ai'],
}

export default function Admin({ user }) {
  const [clients, setClients]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [msg, setMsg]           = useState(null)
  const [creating, setCreating] = useState(false)
  const [confirm, setConfirm]   = useState(null)

  const [form, setForm] = useState({
    email: '', password: '', business_name: '', client_id: '',
    plan: 'core', business_type: 'general',
    pages: DEFAULT_PAGES['general'],
  })

  const update = (k, v) => {
    setForm(p => {
      const next = { ...p, [k]: v }
      if (k === 'business_name') {
        next.client_id = v.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_')
      }
      if (k === 'business_type') {
        next.pages = DEFAULT_PAGES[v] || DEFAULT_PAGES['general']
      }
      return next
    })
  }

  const togglePage = (pageId) => {
    setForm(p => ({
      ...p,
      pages: p.pages.includes(pageId)
        ? p.pages.filter(id => id !== pageId)
        : [...p.pages, pageId]
    }))
  }

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/clients')
      setClients(res.data || [])
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    if (!form.email || !form.password || !form.business_name || !form.client_id) {
      setMsg({ type: 'error', text: 'Please fill in all fields.' })
      return
    }
    if (form.pages.length === 0) {
      setMsg({ type: 'error', text: 'Please select at least one page.' })
      return
    }
    setCreating(true)
    setMsg(null)
    try {
      console.log('pages being sent:', form.pages.join(','))
      await api.post('/admin/clients', {
        ...form,
        pages: form.pages.join(',')
      })
      setMsg({ type: 'success', text: `Account created for ${form.business_name}!` })
      setForm({ email: '', password: '', business_name: '', client_id: '', plan: 'core', business_type: 'general', pages: DEFAULT_PAGES['general'] })
      load()
    } catch (e) {
      setMsg({ type: 'error', text: e.response?.data?.detail || 'Failed to create account' })
    }
    setCreating(false)
  }

  const handleDelete = async (email) => {
    try {
      await api.delete(`/admin/clients/${encodeURIComponent(email)}`)
      setMsg({ type: 'success', text: 'Account deleted' })
      setConfirm(null)
      load()
    } catch {
      setMsg({ type: 'error', text: 'Failed to delete account' })
    }
  }

  if (user?.role !== 'admin') {
    return <p style={{ color: '#e74c3c', padding: '40px' }}>Access denied — admin only.</p>
  }

  const sharedPages     = ALL_PAGES.filter(p => p.category === 'shared')
  const dealerPages     = ALL_PAGES.filter(p => p.category === 'dealership')
  const shopPages       = ALL_PAGES.filter(p => p.category === 'repair_shop')
  const generalPages    = ALL_PAGES.filter(p => p.category === 'general')

  return (
    <div style={{ fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ color: '#C0C0C0', marginBottom: '8px', fontSize: '24px' }}>⚙️ Admin Panel</h1>
      <p style={{ color: '#555', marginBottom: '24px', fontSize: '13px' }}>Create and manage client accounts</p>

      {msg && (
        <div style={{ background: msg.type === 'success' ? '#0d2d15' : '#2d1515', border: `1px solid ${msg.type === 'success' ? '#27ae60' : '#c0392b'}`, borderRadius: '6px', padding: '10px 14px', marginBottom: '16px', color: msg.type === 'success' ? '#2ecc71' : '#e74c3c', fontSize: '14px' }}>
          {msg.type === 'success' ? '✅ ' : '❌ '}{msg.text}
        </div>
      )}

      {/* Create new client */}
      <div style={CARD}>
        <h2 style={{ color: '#C0C0C0', fontSize: '16px', marginBottom: '20px' }}>Create New Client Account</h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div>
            <label style={LABEL}>Business name</label>
            <input type="text" value={form.business_name} onChange={e => update('business_name', e.target.value)} placeholder="e.g. Johnson Motors" style={INPUT} />
          </div>
          <div>
            <label style={LABEL}>Client ID (auto-generated)</label>
            <input type="text" value={form.client_id} onChange={e => update('client_id', e.target.value)} placeholder="e.g. johnson_motors" style={INPUT} />
          </div>
          <div>
            <label style={LABEL}>Client email</label>
            <input type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder="owner@business.com" style={INPUT} />
          </div>
          <div>
            <label style={LABEL}>Temporary password</label>
            <input type="text" value={form.password} onChange={e => update('password', e.target.value)} placeholder="they can change this later" style={INPUT} />
          </div>
          <div>
            <label style={LABEL}>Business Type</label>
            <select value={form.business_type} onChange={e => update('business_type', e.target.value)} style={SELECT}>
              <option value="general">General Business</option>
              <option value="dealership">Auto Dealership</option>
              <option value="repair_shop">Repair Shop</option>
            </select>
          </div>
          <div>
            <label style={LABEL}>Plan</label>
            <select value={form.plan} onChange={e => update('plan', e.target.value)} style={SELECT}>
              <option value="core">Core — $99.99/mo</option>
              <option value="full">Full — $199.99/mo</option>
              <option value="custom">Custom</option>
            </select>
          </div>
        </div>

        {/* Page selection */}
        <div style={{ background: '#0A0A0A', border: '1px solid #222', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
          <p style={{ color: '#C0C0C0', fontSize: '13px', fontWeight: 'bold', margin: '0 0 12px' }}>
            Pages — select what this client can access
          </p>
          <p style={{ color: '#555', fontSize: '11px', margin: '0 0 14px' }}>
            Auto-selected based on business type. Customize as needed.
          </p>

          {/* Shared pages */}
          <p style={{ color: '#4a9eff', fontSize: '11px', textTransform: 'uppercase', margin: '0 0 8px' }}>Shared — all business types</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
            {sharedPages.map(p => (
              <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: '6px 10px', background: form.pages.includes(p.id) ? '#0d1a2d' : '#111', border: `1px solid ${form.pages.includes(p.id) ? '#4a9eff' : '#222'}`, borderRadius: '6px' }}>
                <input type="checkbox" checked={form.pages.includes(p.id)} onChange={() => togglePage(p.id)} style={{ cursor: 'pointer' }} />
                <span style={{ color: form.pages.includes(p.id) ? '#C0C0C0' : '#555', fontSize: '12px' }}>{p.label}</span>
              </label>
            ))}
          </div>

          {/* Dealership pages */}
          <p style={{ color: '#f39c12', fontSize: '11px', textTransform: 'uppercase', margin: '0 0 8px' }}>Dealership</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
            {dealerPages.map(p => (
              <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: '6px 10px', background: form.pages.includes(p.id) ? '#1a1a0d' : '#111', border: `1px solid ${form.pages.includes(p.id) ? '#f39c12' : '#222'}`, borderRadius: '6px' }}>
                <input type="checkbox" checked={form.pages.includes(p.id)} onChange={() => togglePage(p.id)} style={{ cursor: 'pointer' }} />
                <span style={{ color: form.pages.includes(p.id) ? '#C0C0C0' : '#555', fontSize: '12px' }}>{p.label}</span>
              </label>
            ))}
          </div>

          {/* Repair shop pages */}
          <p style={{ color: '#2ecc71', fontSize: '11px', textTransform: 'uppercase', margin: '0 0 8px' }}>Repair Shop</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
            {shopPages.map(p => (
              <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: '6px 10px', background: form.pages.includes(p.id) ? '#0d2d15' : '#111', border: `1px solid ${form.pages.includes(p.id) ? '#27ae60' : '#222'}`, borderRadius: '6px' }}>
                <input type="checkbox" checked={form.pages.includes(p.id)} onChange={() => togglePage(p.id)} style={{ cursor: 'pointer' }} />
                <span style={{ color: form.pages.includes(p.id) ? '#C0C0C0' : '#555', fontSize: '12px' }}>{p.label}</span>
              </label>
            ))}
          </div>

          {/* General pages */}
          <p style={{ color: '#666', fontSize: '11px', textTransform: 'uppercase', margin: '0 0 8px' }}>General</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {generalPages.map(p => (
              <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: '6px 10px', background: form.pages.includes(p.id) ? '#1a1a1a' : '#111', border: `1px solid ${form.pages.includes(p.id) ? '#666' : '#222'}`, borderRadius: '6px' }}>
                <input type="checkbox" checked={form.pages.includes(p.id)} onChange={() => togglePage(p.id)} style={{ cursor: 'pointer' }} />
                <span style={{ color: form.pages.includes(p.id) ? '#C0C0C0' : '#555', fontSize: '12px' }}>{p.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ color: '#555', fontSize: '12px', margin: 0 }}>
            {form.pages.length} page{form.pages.length !== 1 ? 's' : ''} selected
          </p>
          <button onClick={handleCreate} disabled={creating} style={{ padding: '12px 24px', background: creating ? '#333' : '#C0C0C0', color: '#0A0A0A', border: 'none', borderRadius: '6px', cursor: creating ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '14px' }}>
            {creating ? 'Creating...' : 'Create Account'}
          </button>
        </div>
      </div>

      {/* Client list */}
      <div style={CARD}>
        <h2 style={{ color: '#C0C0C0', fontSize: '16px', marginBottom: '20px' }}>
          All Clients ({clients.length})
        </h2>
        {loading ? (
          <p style={{ color: '#666' }}>Loading...</p>
        ) : clients.length === 0 ? (
          <p style={{ color: '#555', textAlign: 'center', padding: '20px' }}>No clients yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ minWidth: '700px', width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Business', 'Email', 'Client ID', 'Type', 'Plan', 'Pages', ''].map(h => (
                    <th key={h} style={{ color: '#666', fontSize: '12px', textAlign: 'left', padding: '8px 0', borderBottom: '1px solid #333' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clients.map((c, i) => (
                  <tr key={i}>
                    <td style={{ color: '#C0C0C0', padding: '12px 0', borderBottom: '1px solid #1a1a1a', fontSize: '14px' }}>{c.business_name}</td>
                    <td style={{ color: '#999', padding: '12px 0', borderBottom: '1px solid #1a1a1a', fontSize: '13px' }}>{c.email}</td>
                    <td style={{ color: '#555', padding: '12px 0', borderBottom: '1px solid #1a1a1a', fontSize: '12px', fontFamily: 'monospace' }}>{c.client_id}</td>
                    <td style={{ color: '#999', padding: '12px 0', borderBottom: '1px solid #1a1a1a', fontSize: '12px' }}>
                      {BUSINESS_TYPES[c.business_type] || 'General'}
                    </td>
                    <td style={{ padding: '12px 0', borderBottom: '1px solid #1a1a1a' }}>
                      <span style={{ color: PLANS[c.plan]?.color || '#666', fontSize: '12px', padding: '3px 8px', border: `1px solid ${PLANS[c.plan]?.color || '#666'}`, borderRadius: '12px' }}>
                        {c.plan || 'core'}
                      </span>
                    </td>
                    <td style={{ color: '#555', padding: '12px 0', borderBottom: '1px solid #1a1a1a', fontSize: '11px' }}>
                      {c.pages ? `${c.pages.split(',').length} pages` : 'all'}
                    </td>
                    <td style={{ padding: '12px 0', borderBottom: '1px solid #1a1a1a' }}>
                      {confirm === c.email ? (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={() => handleDelete(c.email)} style={{ padding: '4px 10px', background: '#c0392b', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Confirm</button>
                          <button onClick={() => setConfirm(null)} style={{ padding: '4px 10px', background: 'transparent', color: '#666', border: '1px solid #333', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirm(c.email)} style={{ padding: '4px 10px', background: 'transparent', color: '#e74c3c', border: '1px solid #e74c3c', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Delete</button>
                      )}
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
