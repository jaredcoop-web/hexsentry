import { useState } from 'react'
import api from '../api'

const INPUT = { width: '100%', padding: '10px 12px', background: '#0A0A0A', border: '1px solid #333', borderRadius: '6px', color: '#fff', fontSize: '14px', boxSizing: 'border-box', marginTop: '6px' }
const LABEL = { color: '#999', fontSize: '13px', display: 'block', marginBottom: '2px' }
const CARD  = { background: '#1A1A2E', border: '1px solid #333', borderRadius: '8px', padding: '24px', marginBottom: '24px' }

export default function EmailReport({ user }) {
  const [form, setForm] = useState({
    sender_email:    '',
    sender_password: '',
    recipient_email: '',
    business_name:   user?.business_name || '',
  })
  const [sending, setSending] = useState(false)
  const [msg, setMsg]         = useState(null)

  const update = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleSend = async () => {
    if (!form.sender_email || !form.sender_password || !form.recipient_email) {
      setMsg({ type: 'error', text: 'Please fill in all required fields.' })
      return
    }
    setSending(true)
    setMsg(null)
    try {
      await api.post('/email/send', form)
      setMsg({ type: 'success', text: `Report sent to ${form.recipient_email}!` })
    } catch (e) {
      setMsg({ type: 'error', text: 'Failed to send. Check your Gmail address and app password.' })
    }
    setSending(false)
  }

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '600px' }}>
      <h1 style={{ color: '#C0C0C0', marginBottom: '8px', fontSize: '24px' }}>📧 Weekly Email Report</h1>
      <p style={{ color: '#555', marginBottom: '24px', fontSize: '13px' }}>
        Send a summary of your business performance every Friday
      </p>

      <div style={CARD}>
        <h2 style={{ color: '#C0C0C0', fontSize: '16px', marginBottom: '20px' }}>Email Settings</h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div>
            <label style={LABEL}>Your Gmail address *</label>
            <input type="email" value={form.sender_email} onChange={e => update('sender_email', e.target.value)} placeholder="you@gmail.com" style={INPUT} />
          </div>
          <div>
            <label style={LABEL}>Gmail App Password *</label>
            <input type="password" value={form.sender_password} onChange={e => update('sender_password', e.target.value)} placeholder="16 character app password" style={INPUT} />
          </div>
          <div>
            <label style={LABEL}>Send report to *</label>
            <input type="email" value={form.recipient_email} onChange={e => update('recipient_email', e.target.value)} placeholder="owner@business.com" style={INPUT} />
          </div>
          <div>
            <label style={LABEL}>Business name</label>
            <input type="text" value={form.business_name} onChange={e => update('business_name', e.target.value)} placeholder="Your business name" style={INPUT} />
          </div>
        </div>

        {msg && (
          <div style={{ background: msg.type === 'success' ? '#0d2d15' : '#2d1515', border: `1px solid ${msg.type === 'success' ? '#27ae60' : '#c0392b'}`, borderRadius: '6px', padding: '10px 14px', marginBottom: '16px', color: msg.type === 'success' ? '#2ecc71' : '#e74c3c', fontSize: '14px' }}>
            {msg.type === 'success' ? '✅ ' : '❌ '}{msg.text}
          </div>
        )}

        <button onClick={handleSend} disabled={sending} style={{ width: '100%', padding: '12px', background: sending ? '#333' : '#C0C0C0', color: '#0A0A0A', border: 'none', borderRadius: '6px', fontSize: '15px', fontWeight: 'bold', cursor: sending ? 'not-allowed' : 'pointer' }}>
          {sending ? 'Sending...' : 'Send Test Report Now'}
        </button>
      </div>

      <div style={CARD}>
        <h2 style={{ color: '#C0C0C0', fontSize: '16px', marginBottom: '16px' }}>What's included in the report:</h2>
        <div style={{ color: '#666', fontSize: '13px', lineHeight: '2' }}>
          <p style={{ margin: '4px 0' }}>📊 Total sales, gross profit, and average per deal this month</p>
          <p style={{ margin: '4px 0' }}>🏆 Top performing salesperson</p>
          <p style={{ margin: '4px 0' }}>⭐ Average customer review rating</p>
          <p style={{ margin: '4px 0' }}>⚠️ Stale inventory alerts</p>
          <p style={{ margin: '4px 0' }}>🔗 Direct link to your full dashboard</p>
        </div>
      </div>

      <div style={{ background: '#1a1a0d', border: '1px solid #444', borderRadius: '8px', padding: '16px 20px' }}>
        <p style={{ color: '#888', fontSize: '12px', margin: 0 }}>
          💡 <strong style={{ color: '#999' }}>Gmail App Password:</strong> Go to myaccount.google.com → Security → 2-Step Verification → App Passwords. Generate one for "Mail" and paste it above.
        </p>
      </div>
    </div>
  )
}
