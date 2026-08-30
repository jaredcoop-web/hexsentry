import { useState } from 'react'
import { KeyRound } from 'lucide-react'
import api from '../api'

const INPUT = { width: '100%', padding: '10px 12px', background: '#0A0A0A', border: '1px solid #333', borderRadius: '6px', color: '#fff', fontSize: '14px', boxSizing: 'border-box', marginTop: '6px' }
const LABEL = { color: '#999', fontSize: '13px', display: 'block', marginBottom: '2px' }

export default function ChangePassword() {
  const [form, setForm]     = useState({ current: '', newPass: '', confirm: '' })
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)

  const update = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async () => {
    if (!form.current || !form.newPass || !form.confirm) {
      setStatus({ type: 'error', msg: 'Please fill in all fields.' })
      return
    }
    if (form.newPass !== form.confirm) {
      setStatus({ type: 'error', msg: 'New passwords do not match.' })
      return
    }
    if (form.newPass.length < 6) {
      setStatus({ type: 'error', msg: 'Password must be at least 6 characters.' })
      return
    }
    setLoading(true)
    setStatus(null)
    try {
      await api.post('/change-password', {
        current_password: form.current,
        new_password:     form.newPass,
      })
      setStatus({ type: 'success', msg: 'Password changed successfully!' })
      setForm({ current: '', newPass: '', confirm: '' })
    } catch (e) {
      setStatus({ type: 'error', msg: e.response?.data?.detail || 'Failed to change password.' })
    }
    setLoading(false)
  }

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '400px' }}>
      <h1 style={{ color: '#C0C0C0', marginBottom: '8px', fontSize: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <KeyRound size={22} /> Change Password
      </h1>
      <p style={{ color: '#555', marginBottom: '24px', fontSize: '13px' }}>Update your account password</p>

      <div style={{ background: '#1A1A2E', border: '1px solid #333', borderRadius: '8px', padding: '24px' }}>
        <div style={{ marginBottom: '16px' }}>
          <label style={LABEL}>Current password</label>
          <input type="password" value={form.current} onChange={e => update('current', e.target.value)} placeholder="••••••••" style={INPUT} />
        </div>
        <div style={{ marginBottom: '16px' }}>
          <label style={LABEL}>New password</label>
          <input type="password" value={form.newPass} onChange={e => update('newPass', e.target.value)} placeholder="••••••••" style={INPUT} />
        </div>
        <div style={{ marginBottom: '20px' }}>
          <label style={LABEL}>Confirm new password</label>
          <input type="password" value={form.confirm} onChange={e => update('confirm', e.target.value)} placeholder="••••••••" style={INPUT} />
        </div>

        {status && (
          <div style={{ background: status.type === 'success' ? '#0d2d15' : '#2d1515', border: `1px solid ${status.type === 'success' ? '#27ae60' : '#c0392b'}`, borderRadius: '6px', padding: '10px 14px', marginBottom: '16px', color: status.type === 'success' ? '#2ecc71' : '#e74c3c', fontSize: '14px' }}>
            {status.type === 'success' ? '✅ ' : '❌ '}{status.msg}
          </div>
        )}

        <button onClick={handleSubmit} disabled={loading} style={{ width: '100%', padding: '12px', background: loading ? '#333' : '#C0C0C0', color: '#0A0A0A', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer' }}>
          {loading ? 'Updating...' : 'Update Password'}
        </button>
      </div>
    </div>
  )
}
