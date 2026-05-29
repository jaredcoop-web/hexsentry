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

  const ImagePanel = ({ position }) => (
    <div style={{
      flex: 1,
      backgroundImage: position === 'left' ? 'url(/molecule.png)' : 'url(/hexsentry_logo.png)',
      backgroundSize: 'cover',
      backgroundPosition: position === 'left' ? 'center 70%' : 'center 70%',
      minHeight: '100vh',
      position: 'relative',
    }}>
      <div style={{
        position: 'absolute',
        inset: 0,
        background: position === 'left'
          ? 'linear-gradient(to right, rgba(0,0,0,0.3), rgba(0,0,0,0.7))'
          : 'linear-gradient(to left, rgba(0,0,0,0.3), rgba(0,0,0,0.7))',
      }} />

      {/* Tagline on right panel */}
      {position === 'right' && (
        <div style={{
          position: 'absolute',
          bottom: '48px',
          right: '32px',
          textAlign: 'right',
          zIndex: 1,
        }}>
          <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '16px', fontWeight: 'bold', margin: '0 0 4px', textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}>
            24/7 Business monitor platform
          </p>
          
        </div>
      )}
    </div>
  )

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      width: '100vw',
      fontFamily: 'Arial, sans-serif',
      background: '#0A0A0A',
      position: 'fixed',
      top: 0,
      left: 0,
    }}>
      {/* Left image panel — hidden on mobile */}
      {!isMobile && <ImagePanel position="left" />}

      {/* Center login panel */}
      <div style={{
        width: isMobile ? '100%' : '600px',
        minWidth: isMobile ? 'unset' : '600px',
        minHeight: '100vh',
        background: '#0A0A0A',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: isMobile ? '40px 24px' : '48px 40px',
        boxSizing: 'border-box',
        zIndex: 1,
        borderLeft: isMobile ? 'none' : '1px solid #1a1a1a',
        borderRight: isMobile ? 'none' : '1px solid #1a1a1a',
        justifyContent: 'center',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '48px' }}>
          <img src="/logo.png" alt="HexGuard" style={{ width: '44px', height: '44px', borderRadius: '8px' }} />
          <div>
            <h1 style={{ color: '#C0C0C0', margin: 0, fontSize: '22px', fontWeight: 'bold' }}>HexGuard</h1>
            <p style={{ color: '#444', margin: 0, fontSize: '12px' }}>Business Intelligence Platform</p>
          </div>
        </div>

        <h2 style={{ color: '#fff', margin: '0 0 6px', fontSize: '22px' }}>Welcome back</h2>
        <p style={{ color: '#555', margin: '0 0 32px', fontSize: '13px' }}>Sign in to your account</p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ color: '#666', fontSize: '12px', display: 'block', marginBottom: '6px' }}>Email address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              style={{ width: '100%', padding: '12px 14px', background: '#111', border: '1px solid #222', borderRadius: '8px', color: '#fff', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ color: '#666', fontSize: '12px', display: 'block', marginBottom: '6px' }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{ width: '100%', padding: '12px 14px', background: '#111', border: '1px solid #222', borderRadius: '8px', color: '#fff', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }}
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

        <p style={{ color: '#333', fontSize: '12px', textAlign: 'center', marginTop: '24px' }}>
          Don't have an account? Contact HexGuard to get set up.
        </p>

        {/* Mobile tagline */}
        {isMobile && (
          <p style={{ color: '#333', fontSize: '12px', textAlign: 'center', marginTop: '48px' }}>
            Guarding your business 24/7
          </p>
        )}
      </div>

      {/* Right image panel — hidden on mobile */}
      {!isMobile && <ImagePanel position="right" />}
    </div>
  )
}
