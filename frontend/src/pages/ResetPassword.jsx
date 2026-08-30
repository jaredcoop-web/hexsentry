import { useState, useEffect } from 'react'

export default function ResetPassword() {
  const [token, setToken]     = useState('')
  const [form, setForm]       = useState({ password: '', confirm: '' })
  const [status, setStatus]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const t = params.get('token')
    if (t) setToken(t)
    else setStatus({ type: 'error', msg: 'Invalid reset link.' })
  }, [])

  const handleSubmit = async () => {
    if (!form.password || !form.confirm) { setStatus({ type: 'error', msg: 'Please fill in all fields.' }); return }
    if (form.password !== form.confirm) { setStatus({ type: 'error', msg: 'Passwords do not match.' }); return }
    if (form.password.length < 6) { setStatus({ type: 'error', msg: 'Password must be at least 6 characters.' }); return }
    setLoading(true)
    try {
      const res = await fetch('https://hex-guard.onrender.com/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: form.password })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Failed')
      setSuccess(true)
    } catch (e) {
      setStatus({ type: 'error', msg: e.message || 'Failed to reset password.' })
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Arial, sans-serif', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '380px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px' }}>
          <img src="/logo.png" alt="HexGuard" style={{ width: '40px', height: '40px', borderRadius: '8px' }} />
          <div>
            <h2 style={{ color: '#C0C0C0', margin: 0, fontSize: '18px' }}>HexGuard</h2>
            <p style={{ color: '#555', margin: 0, fontSize: '11px' }}>Business Intelligence Platform</p>
          </div>
        </div>

        {success ? (
          <div style={{ background: '#0d2d15', border: '1px solid #27ae60', borderRadius: '12px', padding: '32px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
            <h3 style={{ color: '#2ecc71', margin: '0 0 8px' }}>Password reset!</h3>
            <p style={{ color: '#666', margin: '0 0 20px', fontSize: '14px' }}>Your password has been updated. You can now sign in.</p>
            <button onClick={() => window.location.href = 'https://hexguardapp.com'} style={{ background: '#4a9eff', border: 'none', color: '#fff', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }}>
              Go to Sign In
            </button>
          </div>
        ) : (
          <div>
            <h1 style={{ color: '#fff', fontSize: '24px', fontWeight: 'bold', margin: '0 0 8px' }}>Reset password</h1>
            <p style={{ color: '#666', fontSize: '14px', margin: '0 0 24px' }}>Enter your new password below.</p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ color: '#999', fontSize: '13px', display: 'block', marginBottom: '6px' }}>New password</label>
              <input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder="••••••••" style={{ width: '100%', padding: '12px 14px', background: '#111', border: '1px solid #222', borderRadius: '8px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ color: '#999', fontSize: '13px', display: 'block', marginBottom: '6px' }}>Confirm new password</label>
              <input type="password" value={form.confirm} onChange={e => setForm(p => ({ ...p, confirm: e.target.value }))} placeholder="••••••••" style={{ width: '100%', padding: '12px 14px', background: '#111', border: '1px solid #222', borderRadius: '8px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }} />
            </div>

            {status && (
              <div style={{ background: '#2d1515', border: '1px solid #c0392b', borderRadius: '6px', padding: '10px 14px', marginBottom: '16px', color: '#e74c3c', fontSize: '14px' }}>
                {status.msg}
              </div>
            )}

            <button onClick={handleSubmit} disabled={loading} style={{ width: '100%', padding: '14px', background: loading ? '#333' : '#4a9eff', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
