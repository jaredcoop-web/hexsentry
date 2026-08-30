import { useState } from 'react'

export default function ForgotPassword({ onBack }) {
  const [email, setEmail]     = useState('')
  const [status, setStatus]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [sent, setSent]       = useState(false)

  const handleSubmit = async () => {
    if (!email) return
    setLoading(true)
    try {
      await fetch('https://hex-guard.onrender.com/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      setSent(true)
    } catch {
      setStatus({ type: 'error', msg: 'Something went wrong. Please try again.' })
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

        {sent ? (
          <div style={{ background: '#0d2d15', border: '1px solid #27ae60', borderRadius: '12px', padding: '32px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📧</div>
            <h3 style={{ color: '#2ecc71', margin: '0 0 8px' }}>Check your email</h3>
            <p style={{ color: '#666', margin: '0 0 20px', fontSize: '14px' }}>If that email is registered, a reset link has been sent. Check your inbox.</p>
            <button onClick={onBack} style={{ background: 'transparent', border: '1px solid #333', color: '#C0C0C0', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }}>
              ← Back to Sign In
            </button>
          </div>
        ) : (
          <div>
            <h1 style={{ color: '#fff', fontSize: '24px', fontWeight: 'bold', margin: '0 0 8px' }}>Forgot password?</h1>
            <p style={{ color: '#666', fontSize: '14px', margin: '0 0 24px' }}>Enter your email and we'll send you a reset link.</p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ color: '#999', fontSize: '13px', display: 'block', marginBottom: '6px' }}>Email address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="you@yourbusiness.com"
                style={{ width: '100%', padding: '12px 14px', background: '#111', border: '1px solid #222', borderRadius: '8px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>

            {status && (
              <div style={{ background: '#2d1515', border: '1px solid #c0392b', borderRadius: '6px', padding: '10px 14px', marginBottom: '16px', color: '#e74c3c', fontSize: '14px' }}>
                {status.msg}
              </div>
            )}

            <button onClick={handleSubmit} disabled={loading || !email} style={{ width: '100%', padding: '14px', background: loading || !email ? '#333' : '#4a9eff', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 'bold', cursor: loading || !email ? 'not-allowed' : 'pointer', marginBottom: '16px' }}>
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>

            <p style={{ textAlign: 'center', margin: 0 }}>
              <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#4a9eff', cursor: 'pointer', fontSize: '13px' }}>
                ← Back to Sign In
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
