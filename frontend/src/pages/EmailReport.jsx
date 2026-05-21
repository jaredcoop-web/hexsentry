import { useState, useEffect } from 'react'
import api from '../api'

const INPUT = { width: '100%', padding: '10px 12px', background: '#0A0A0A', border: '1px solid #333', borderRadius: '6px', color: '#fff', fontSize: '14px', boxSizing: 'border-box', marginTop: '6px' }
const LABEL = { color: '#999', fontSize: '13px', display: 'block', marginBottom: '2px' }
const CARD  = { background: '#1A1A2E', border: '1px solid #333', borderRadius: '8px', padding: '24px', marginBottom: '24px' }

export default function EmailReport({ user }) {
  const [reportEmail, setReportEmail] = useState('')
  const [testEmail, setTestEmail]     = useState('')
  const [saving, setSaving]           = useState(false)
  const [sending, setSending]         = useState(false)
  const [msg, setMsg]                 = useState(null)

  const handleSaveEmail = async () => {
    if (!reportEmail) {
      setMsg({ type: 'error', text: 'Please enter an email address.' })
      return
    }
    setSaving(true)
    setMsg(null)
    try {
      await api.post('/settings/report-email', { report_email: reportEmail })
      setMsg({ type: 'success', text: `Weekly reports will be sent to ${reportEmail} every Friday at 5pm.` })
    } catch {
      setMsg({ type: 'error', text: 'Failed to save email. Please try again.' })
    }
    setSaving(false)
  }

  const handleSendTest = async () => {
    const recipient = testEmail || reportEmail
    if (!recipient) {
      setMsg({ type: 'error', text: 'Please enter an email address to send the test to.' })
      return
    }
    setSending(true)
    setMsg(null)
    try {
      await api.post('/email/send', {
        recipient_email: recipient,
        business_name:   user?.business_name || '',
      })
      setMsg({ type: 'success', text: `Test report sent to ${recipient}!` })
    } catch {
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

      {msg && (
        <div style={{ background: msg.type === 'success' ? '#0d2d15' : '#2d1515', border: `1px solid ${msg.type === 'success' ? '#27ae60' : '#c0392b'}`, borderRadius: '6px', padding: '10px 14px', marginBottom: '16px', color: msg.type === 'success' ? '#2ecc71' : '#e74c3c', fontSize: '14px' }}>
          {msg.type === 'success' ? '✅ ' : '❌ '}{msg.text}
        </div>
      )}

      {/* Save report email */}
      <div style={CARD}>
        <h2 style={{ color: '#C0C0C0', fontSize: '16px', marginBottom: '8px' }}>📅 Automated Weekly Report</h2>
        <p style={{ color: '#666', fontSize: '13px', marginBottom: '20px' }}>
          Enter the email address where you want to receive your Friday report. HexGuard sends it automatically — no action needed from you.
        </p>
        <div style={{ marginBottom: '16px' }}>
          <label style={LABEL}>Send weekly report to</label>
          <input
            type="email"
            value={reportEmail}
            onChange={e => setReportEmail(e.target.value)}
            placeholder="owner@yourbusiness.com"
            style={INPUT}
          />
        </div>
        <button
          onClick={handleSaveEmail}
          disabled={saving}
          style={{ width: '100%', padding: '12px', background: saving ? '#333' : '#C0C0C0', color: '#0A0A0A', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 'bold', cursor: saving ? 'not-allowed' : 'pointer' }}
        >
          {saving ? 'Saving...' : 'Save & Activate'}
        </button>
      </div>

      {/* Send test report */}
      <div style={CARD}>
        <h2 style={{ color: '#C0C0C0', fontSize: '16px', marginBottom: '8px' }}>🧪 Send Test Report</h2>
        <p style={{ color: '#666', fontSize: '13px', marginBottom: '20px' }}>
          Send a test report right now to verify everything looks correct.
        </p>
        <div style={{ marginBottom: '16px' }}>
          <label style={LABEL}>Send test to <span style={{ color: '#555' }}>optional — leave blank to use saved email above</span></label>
          <input
            type="email"
            value={testEmail}
            onChange={e => setTestEmail(e.target.value)}
            placeholder={reportEmail || "owner@yourbusiness.com"}
            style={INPUT}
          />
        </div>
        <button
          onClick={handleSendTest}
          disabled={sending}
          style={{ width: '100%', padding: '12px', background: sending ? '#333' : '#1A1A2E', color: '#C0C0C0', border: '1px solid #333', borderRadius: '6px', fontSize: '14px', fontWeight: 'bold', cursor: sending ? 'not-allowed' : 'pointer' }}
        >
          {sending ? 'Sending...' : 'Send Test Report Now'}
        </button>
      </div>

      {/* What's included */}
      <div style={CARD}>
        <h2 style={{ color: '#C0C0C0', fontSize: '16px', marginBottom: '16px' }}>What's included every Friday:</h2>
        <div style={{ color: '#666', fontSize: '13px', lineHeight: '2' }}>
          <p style={{ margin: '4px 0' }}>📊 Total sales, gross profit, and average per deal this month</p>
          <p style={{ margin: '4px 0' }}>🏆 Top performing salesperson</p>
          <p style={{ margin: '4px 0' }}>⭐ Average customer review rating</p>
          <p style={{ margin: '4px 0' }}>⚠️ Stale inventory alerts</p>
          <p style={{ margin: '4px 0' }}>🔗 Direct link to your full dashboard</p>
        </div>
      </div>
    </div>
  )
}
