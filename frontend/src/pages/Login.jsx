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
      minHeight: '100vh',
      background: '#0A0A0A',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{
        background: '#1A1A2E',
        padding: '40px',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '400px',
        border: '1px solid #333'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ color: '#C0C0C0', margin: 0, fontSize: '28px' }}>🛡️ HexGuard</h1>
          <p style={{ color: '#666', margin: '8px 0 0' }}>Business Intelligence Platform</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ color: '#999', fontSize: '14px', display: 'block', marginBottom: '6px' }}>
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
                padding: '10px 12px',
                background: '#0A0A0A',
                border: '1px solid #333',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ color: '#999', fontSize: '14px', display: 'block', marginBottom: '6px' }}>
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
                padding: '10px 12px',
                background: '#0A0A0A',
                border: '1px solid #333',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {error && (
            <div style={{
              background: '#2d1515',
              border: '1px solid #c0392b',
              borderRadius: '6px',
              padding: '10px 12px',
              color: '#e74c3c',
              fontSize: '14px',
              marginBottom: '16px'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              background: loading ? '#333' : '#C0C0C0',
              color: '#0A0A0A',
              border: 'none',
              borderRadius: '6px',
              fontSize: '15px',
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p style={{ color: '#555', fontSize: '12px', textAlign: 'center', marginTop: '24px' }}>
          Don't have an account? Contact HexGuard to get set up.
        </p>
      </div>
    </div>
  )
}
