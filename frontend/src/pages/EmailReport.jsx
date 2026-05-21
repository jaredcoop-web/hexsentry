import { useState } from 'react'
import api from '../api'

const INPUT = { width: '100%', padding: '10px 12px', background: '#0A0A0A', border: '1px solid #333', borderRadius: '6px', color: '#fff', fontSize: '14px', boxSizing: 'border-box', marginTop: '6px' }
const LABEL = { color: '#999', fontSize: '13px', display: 'block', marginBottom: '2px' }
const CARD  = { background: '#1A1A2E', border: '1px solid #333', borderRadius: '8px', padding: '24px', marginBottom: '24px' }

export default function EmailReport({ user }) {
  const [recipient, setRecipient] = useState('')
  const [sending, setSending]     = useState(false)
  const [msg, setMsg]             = useState(null)

  const handleSend = async () => {
    if (!recipient) {
      setMsg({ type: 'error', text: 'Please enter a recipient email address.' })
      return
    }
    setSending(true)
    setMsg(null)
    try {
      await api.post('/email/send', {
        recipient_email: recipient,
        business_name:   user?.business_name || '',
      })
      setMsg({ type: 'success', text: `Report sent to ${recipient}!` })
    } catch (e) {
      setMsg({ type: 'error', text: 'Failed to send report. Please try again.' })
    }
    setSending(false)
  }

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '600px' }}>
      <h1 style={{ color: '#C0C0C0', marginBottom: '8px', fontSize: '24px' }}>📧 Weekly Email Report</h1>
      <p style={{ color: '#555', marginBottom: '24px', fontSize: '13px' }}>
        HexGuard automatically sends your business summary every Friday at 5pm
      </p>

      <div style={CARD}>
        <h2 style={{ color: '#C0C0C0', fontSize: '16px', marginBottom: '20px' }}>Send Report</h2>

        <div style={{ marginBottom: '20px' }}>
          <label style={LABEL}>Send report to</label>
          <input
            type="email"
            value={recipient}
            onChange={e => setRecipient(e.target.value)}
            placeholder="owner@yourbusiness.com"
            style={INPUT}
          />
        </div>

        {msg && (
          <div style={{ background: msg.type === 'success' ? '#0d2d15' : '#2d1515', border: `1px solid ${msg.type === 'success' ? '#27ae60' : '#c0392b'}`, borderRadius: '6px', padding: '10px 14px', marginBottom: '16px', color: msg.type === 'success' ? '#2ecc71' : '#e74c3c', fontSize: '14px' }}>
            {msg.type === 'success' ? '✅ ' : '❌ '}{msg.text}
          </div>
        )}

        <button
          onClick={handleSend}
          disabled={sending}
          style={{ width: '100%', padding: '12px', background: sending ? '#333' : '#C0C0C0', color: '#0A0A0A', border: 'none', borderRadius: '6px', fontSize: '15px', fontWeight: 'bold', cursor: sending ? 'not-allowed' : 'pointer' }}
        >
          {sending ? 'Sending...' : 'Send Report Now'}
        </button>
      </div>

      <div style={CARD}>
        <h2 style={{ color: '#C0C0C0', fontSize: '16px', marginBottom: '16px' }}>What's included:</h2>
        <div style={{ color: '#666', fontSize: '13px', lineHeight: '2' }}>
          <p style={{ margin: '4px 0' }}>📊 Total sales, gross profit, and average per deal this month</p>
          <p style={{ margin: '4px 0' }}>🏆 Top performing salesperson</p>
          <p style={{ margin: '4px 0' }}>⭐ Average customer review rating</p>
          <p style={{ margin: '4px 0' }}>⚠️ Stale inventory alerts</p>
          <p style={{ margin: '4px 0' }}>🔗 Direct link to your full dashboard</p>
        </div>
      </div>

      <div style={{ background: '#0d0d1a', border: '1px solid #222', borderRadius: '8px', padding: '16px 20px' }}>
        <p style={{ color: '#555', fontSize: '12px', margin: 0 }}>
          📅 Reports send automatically every <strong style={{ color: '#666' }}>Friday at 5pm</strong>. Use the button above to send a test report anytime.
        </p>
      </div>
    </div>
  )
}
