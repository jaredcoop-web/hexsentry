import { useState, useEffect } from 'react'
import Login from './pages/Login'
import Landing from './pages/Landing'
import Sidebar from './components/Sidebar'
import BottomNav from './components/BottomNav'
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
import FI from './pages/FI'
import Home from './pages/Home'
import DealerInventory from './pages/DealerInventory'
import AddJob from './pages/AddJob'
import Jobs from './pages/Jobs'
import Collections from './pages/Collections'
import ChangePassword from './pages/ChangePassword'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'


const Placeholder = ({ title }) => (
  <div style={{ fontFamily: 'Arial, sans-serif' }}>
    <h1 style={{ color: '#C0C0C0' }}>{title}</h1>
    <p style={{ color: '#666' }}>Coming soon.</p>
  </div>
)

export default function App() {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user')
    return stored ? JSON.parse(stored) : null
  })
  const [currentPage, setCurrentPage] = useState('home')
  const [showLogin, setShowLogin]     = useState(false)
  const [isMobile, setIsMobile]       = useState(window.innerWidth < 768)
  const [showForgot, setShowForgot] = useState(false)

  useEffect(() => {
    const handle = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handle)
    return () => window.removeEventListener('resize', handle)
  }, [])


  const handleLogin  = (userData) => { setUser(userData); setCurrentPage('home') }
  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
    setShowLogin(false)
  }

  // Check for password reset token in URL
  const params = new URLSearchParams(window.location.search)
  if (params.get('token')) return <ResetPassword />

  if (!user && !showLogin && !showForgot) return <Landing onGetStarted={() => setShowLogin(true)} />
  if (!user && showForgot) return <ForgotPassword onBack={() => setShowForgot(false)} />
  if (!user && showLogin)  return <Login onLogin={handleLogin} onBack={() => setShowLogin(false)} onForgotPassword={() => { setShowLogin(false); setShowForgot(true) }} />

  const renderPage = () => {
    switch (currentPage) {
      case 'home':      return <Home user={user} setCurrentPage={setCurrentPage} isMobile={isMobile} />
      case 'dashboard': return <Dashboard user={user} isMobile={isMobile} />
      case 'sales':     return <Sales isMobile={isMobile} />
      case 'add-sale':  return <AddSale user={user} isMobile={isMobile} />
      case 'reviews':   return <Reviews isMobile={isMobile} />
      case 'inventory': return <Inventory isMobile={isMobile} />
      case 'email':     return <EmailReport user={user} />
      case 'ai':        return <AIChat user={user} />
      case 'admin':     return <Admin user={user} />
      case 'payments':  return <Payments user={user} />
      case 'finances':  return <Finances isMobile={isMobile} />
      case 'fi':        return <FI isMobile={isMobile} />
      case 'dealer-inventory': return <DealerInventory isMobile={isMobile} />
      case 'add-job': return <AddJob isMobile={isMobile} />
      case 'jobs': return <Jobs isMobile={isMobile} />
      case 'collections': return <Collections isMobile={isMobile} />
      case 'change-password': return <ChangePassword />
      default:          return <Home user={user} setCurrentPage={setCurrentPage} isMobile={isMobile} />
    }
  }

  return (
    <div style={{ display: 'flex', background: '#0d0d1a', minHeight: '100vh', width: '100vw', overflowX: 'hidden' }}>
      {/* Sidebar — desktop only */}
      {!isMobile && (
        <Sidebar
          user={user}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          onLogout={handleLogout}
        />
      )}

      {/* Main content */}
      <main style={{
        marginLeft:   isMobile ? '0' : '220px',
        flex:         1,
        padding:      isMobile ? '16px 12px 80px 12px' : '32px',
        color:        '#C0C0C0',
        minHeight:    '100vh',
        boxSizing:    'border-box',
        width:        isMobile ? '100%' : 'calc(100vw - 220px)',
        overflowX:    'hidden',
      }}>
        {renderPage()}
      </main>

      {/* Bottom nav — mobile only */}
      {isMobile && (
        <BottomNav
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          user={user}
          onLogout={handleLogout}
        />
      )}
    </div>
  )
}
