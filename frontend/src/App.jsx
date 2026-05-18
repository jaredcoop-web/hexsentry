import { useState, useEffect } from 'react'
import Login from './pages/Login'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Sales from './pages/Sales'
import Reviews from './pages/Reviews'
import AddSale from './pages/AddSale'
import Payments from './pages/Payments'
import Inventory from './pages/Inventory'

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

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard user={user} />
      case 'sales':     return <Sales />
      case 'add-sale':  return <AddSale user={user} />
      case 'reviews':   return <Reviews />
      case 'inventory': return <Inventory />
      case 'upload':    return <Placeholder title="📤 Upload Data" />
      case 'email':     return <Placeholder title="📧 Email Report" />
      case 'ai':        return <Placeholder title="🤖 AI Chat" />
      case 'admin':     return <Placeholder title="⚙️ Admin" />
      case 'payments': return <Payments user={user} />
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
