import { useState } from 'react'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

export default function Login({ onLogin }) {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

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

    } catch (err) {
      setError('Invalid email or password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: '#0A0A0A',
      fontFamily: 'Arial, sans-serif',
    }}>
      {/* Left side — login form */}
      <div style={{
        flex: '0 0 480px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '60px 48px',
        background: '#0A0A0A',
        zIndex: 1,
      }}>
        {/* Logo */}
        <div style={{ marginBottom: '48px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <img src="/logo.png" alt="HexGuard" style={{ width: '48px', height: '48px', borderRadius: '8px' }} />
            <h1 style={{ color: '#C0C0C0', margin: 0, fontSize: '28px', fontWeight: 'bold' }}>HexGuard</h1>
          </div>
          <p style={{ color: '#444', margin: 0, fontSize: '14px' }}>Business Intelligence Platform</p>
        </div>

        {/* Form */}
        <div>
          <h2 style={{ color: '#C0C0C0', margin: '0 0 8px', fontSize: '22px' }}>Welcome back</h2>
          <p style={{ color: '#555', margin: '0 0 32px', fontSize: '14px' }}>Sign in to your account</p>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ color: '#777', fontSize: '13px', display: 'block', marginBottom: '6px' }}>
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  background: '#111',
                  border: '1px solid #222',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ color: '#777', fontSize: '13px', display: 'block', marginBottom: '6px' }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  background: '#111',
                  border: '1px solid #222',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
            </div>

            {error && (
              <div style={{
                background: '#1a0808',
                border: '1px solid #c0392b',
                borderRadius: '8px',
                padding: '10px 14px',
                color: '#e74c3c',
                fontSize: '13px',
                marginBottom: '16px',
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '13px',
                background: loading ? '#222' : '#4a9eff',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: 'bold',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s',
              }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p style={{ color: '#333', fontSize: '12px', textAlign: 'center', marginTop: '24px' }}>
            Don't have an account? Contact HexGuard to get set up.
          </p>
        </div>
      </div>

      {/* Right side — image */}
      <div style={{
        flex: 1,
        backgroundImage: 'url(/login-bg.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        position: 'relative',
        minHeight: '100vh',
      }}>
        {/* Dark overlay */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to right, #0A0A0A 0%, transparent 30%)',
        }} />

        {/* Tagline */}
        <div style={{
          position: 'absolute',
          bottom: '60px',
          right: '48px',
          textAlign: 'right',
        }}>
          <p style={{
            color: 'rgba(255,255,255,0.9)',
            fontSize: '22px',
            fontWeight: 'bold',
            margin: '0 0 8px',
            textShadow: '0 2px 8px rgba(0,0,0,0.8)',
          }}>
            Guarding your business 24/7
          </p>
          <p style={{
            color: 'rgba(255,255,255,0.5)',
            fontSize: '14px',
            margin: 0,
            textShadow: '0 2px 8px rgba(0,0,0,0.8)',
          }}>
            Intelligence that never sleeps
          </p>
        </div>
      </div>
    </div>
  )
}
