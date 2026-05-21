import { useState, useEffect } from 'react'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

export default function Login({ onLogin }) {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const form = new URLSearchParams()
      form.append('username', email)
      form.append('password', password)
      const res = await axios.post(`${API_URL}/token`, form)
      const token = res.data.access_token
      localStorage.setItem('token', token)
      const me = await axios.get(`${API_URL}/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      localStorage.setItem('user', JSON.stringify(me.data))
      onLogin(me.data)
    } catch {
      setError('Invalid email or password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Arial, sans-serif',
      backgroundImage: 'url(/login-bg.png)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    }}>
      {/* Dark overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: isMobile
          ? 'rgba(0,0,0,0.75)'
          : 'linear-gradient(to right, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.15) 35%, rgba(0,0,0,0.15) 65%, rgba(0,0,0,0.5) 100%)',
      }} />

      {/* Tagline bottom left */}
      {!isMobile && (
        <div style={{
          position: 'absolute',
          bottom: '40px',
          left: '48px',
          zIndex: 2,
        }}>
          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '18px', fontWeight: 'bold', margin: '0 0 4px', textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
            Guarding your business 24/7
          </p>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px', margin: 0, textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
            Intelligence that never sleeps
          </p>
        </div>
      )}

      {/* Login card */}
      <div style={{
        position: 'relative',
        zIndex: 2,
        background: 'rgba(10,10,10,0.92)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '16px',
        padding: isMobile ? '32px 24px' : '48px 40px',
        width: '100%',
        maxWidth: isMobile ? '90vw' : '420px',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 25px 50px rgba(0,0,0,0.6)',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
          <img src="/logo.png" alt="HexGuard" style={{ width: '44px', height: '44px', borderRadius: '8px' }} />
          <div>
            <h1 style={{ color: '#C0C0C0', margin: 0, fontSize: '22px', fontWeight: 'bold' }}>HexGuard</h1>
            <p style={{ color: '#444', margin: 0, fontSize: '12px' }}>Business Intelligence Platform</p>
          </div>
        </div>

        <h2 style={{ color: '#fff', margin: '0 0 6px', fontSize: '20px' }}>Welcome back</h2>
        <p style={{ color: '#555', margin: '0 0 28px', fontSize: '13px' }}>Sign in to your account</p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ color: '#666', fontSize: '12px', display: 'block', marginBottom: '6px' }}>Email address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              style={{ width: '100%', padding: '11px 14px', background: '#111', border: '1px solid #222', borderRadius: '8px', color: '#fff', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ color: '#666', fontSize: '12px', display: 'block', marginBottom: '6px' }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{ width: '100%', padding: '11px 14px', background: '#111', border: '1px solid #222', borderRadius: '8px', color: '#fff', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }}
            />
          </div>

          {error && (
            <div style={{ background: '#1a0808', border: '1px solid #c0392b', borderRadius: '8px', padding: '10px 14px', color: '#e74c3c', fontSize: '13px', marginBottom: '16px' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: '13px', background: loading ? '#1a1a1a' : '#4a9eff', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p style={{ color: '#333', fontSize: '12px', textAlign: 'center', marginTop: '20px', marginBottom: 0 }}>
          Don't have an account? Contact HexGuard to get set up.
        </p>
      </div>
    </div>
  )
}
