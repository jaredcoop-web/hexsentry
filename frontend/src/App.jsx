import { useState, useEffect } from 'react'
import Login from './pages/Login'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Sales from './pages/Sales'
import Reviews from './pages/Reviews'
import AddSale from './pages/AddSale'
import Payments from './pages/Payments'
import Inventory from './pages/Inventory'
import AIChat from './pages/AIChat'
import EmailReport from './pages/EmailReport'
import Admin from './pages/Admin'
import Finances from './pages/Finances'

// Mobile warning component
const MobileWarning = () => (
  <div style={{
    minHeight: '100vh',
    background: '#0A0A0A',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px 24px',
    fontFamily: 'Arial, sans-serif',
    textAlign: 'center',
  }}>
    <img src="/logo.png" alt="HexGuard" style={{ width: '64px', height: '64px', borderRadius: '12px', marginBottom: '24px' }} />
    <h1 style={{ color: '#C0C0C0', margin: '0 0 12px', fontSize: '24px' }}>HexGuard</h1>
    <p style={{ color: '#666', margin: '0 0 32px', fontSize: '15px', lineHeight: '1.6', maxWidth: '300px' }}>
      HexGuard is optimized for desktop. Please open this on your computer for the best experience.
    </p>
    <p style={{ color: '#444', fontSize: '13px', margin: 0 }}>
      📧 Your weekly email report still works on any device
    </p>
  </div>
)

const Placeholder = ({ title }) => (
  <div style={{ fontFamily: 'Arial, sans-serif' }}>
    <h1 style={{ color: '#C0C0C0' }}>{title}</h1>
    <p style={{ color: '#666' }}>Coming soon — this page is being built.</p>
  </div>
)

export default function App() {
  const [user, setUser]        = useState(null)
  const [currentPage, setPage] = useState('dashboard')

  useEffect(() => {
    const stored = localStorage.getItem('user')
    if (stored) setUser(JSON.parse(stored))
    const params = new URLSearchParams(window.location.search)
    if (params.get('connected') || params.get('error')) setPage('reviews')
  }, [])

  const handleLogin = (userData) => { setUser(userData); setPage('dashboard') }
  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
    setPage('dashboard')
  }

  if (!user) return <Login onLogin={handleLogin} />
  // Show mobile warning for logged in users
  if (window.innerWidth < 768 && user) return <MobileWarning />

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard user={user} />
      case 'sales':     return <Sales />
      case 'add-sale':  return <AddSale user={user} />
      case 'reviews':   return <Reviews />
      case 'inventory': return <Inventory />
      case 'upload':    return <Placeholder title="📤 Upload Data" />
      case 'email': return <EmailReport user={user} />
      case 'ai': return <AIChat user={user} />
      case 'admin': return <Admin user={user} />
      case 'payments': return <Payments user={user} />
      case 'finances': return <Finances />
      default:          return <Dashboard user={user} />
    }
  }

  return (
    <div style={{ display: 'flex', background: '#0d0d1a', minHeight: '100vh' }}>
      <Sidebar user={user} currentPage={currentPage} setPage={setPage} onLogout={handleLogout} />
      <main style={{ marginLeft: '220px', flex: 1, padding: '32px', color: '#C0C0C0' }}>
        {renderPage()}
      </main>
    </div>
  )
}
