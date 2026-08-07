
import { useState } from 'react'
import { Home, Car, Plus, Briefcase, Star, Package, Mail, Bot, CreditCard, DollarSign, Settings, LogOut, ChevronLeft, ChevronRight, Truck, Wrench} from 'lucide-react'

const PAGES = [
  { id: 'home',      label: 'Home',         icon: <Home size={18} /> },
  { id: 'add-sale',  label: 'Add Sale',     icon: <Plus size={18} /> },
  { id: 'sales',     label: 'Sales',        icon: <Car size={18} /> },
  { id: 'fi',        label: 'F&I',          icon: <Briefcase size={18} /> },
  { id: 'reviews',   label: 'Reviews',      icon: <Star size={18} /> },
  { id: 'inventory', label: 'Inventory',    icon: <Package size={18} /> },
  { id: 'dealer-inventory', icon: <Truck size={18} />, label: 'Lot Inventory' },
  { id: 'email',     label: 'Email Report', icon: <Mail size={18} /> },
  { id: 'ai',        label: 'AI Chat',      icon: <Bot size={18} /> },
  { id: 'payments',  label: 'Payments',     icon: <CreditCard size={18} /> },
  { id: 'finances',  label: 'Finances',     icon: <DollarSign size={18} /> },
  { id: 'add-job', icon: <Wrench size={18} />, label: 'Add Job' },
]

export default function Sidebar({ user, currentPage, setCurrentPage, onLogout }) {
  const [collapsed, setCollapsed] = useState(false)

  const pages = [...PAGES]
  if (user?.role === 'admin') pages.push({ id: 'admin', label: 'Admin', icon: <Settings size={18} /> })

  const width = collapsed ? '60px' : '220px'

  return (
    <>
      <div style={{
        width,
        minHeight: '100vh',
        background: '#0A0A0A',
        borderRight: '1px solid #222',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Arial, sans-serif',
        position: 'fixed',
        left: 0,
        top: 0,
        transition: 'width 0.2s ease',
        overflow: 'hidden',
        zIndex: 50,
      }}>

        {/* Logo + toggle */}
        <div style={{ padding: collapsed ? '20px 12px' : '20px 16px', borderBottom: '1px solid #222', display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between' }}>
          {!collapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <img src="/logo.png" alt="HexGuard" style={{ width: '32px', height: '32px', borderRadius: '6px', flexShrink: 0 }} />
              <div>
                <h2 style={{ color: '#C0C0C0', margin: 0, fontSize: '16px', whiteSpace: 'nowrap' }}>HexGuard</h2>
                <p style={{ color: '#555', margin: 0, fontSize: '10px', whiteSpace: 'nowrap' }}>{user?.business_name || 'Business Intelligence'}</p>
              </div>
            </div>
          )}
          {collapsed && (
            <img src="/logo.png" alt="HexGuard" style={{ width: '32px', height: '32px', borderRadius: '6px' }} />
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
              background: 'none',
              border: 'none',
              color: '#555',
              cursor: 'pointer',
              padding: '4px',
              marginLeft: collapsed ? '0' : '8px',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '8px 0' }}>
          {pages.map(page => (
            <button
              key={page.id}
              onClick={() => setCurrentPage(page.id)}
              title={collapsed ? page.label : ''}
              style={{
                width: '100%',
                padding: collapsed ? '12px 0' : '10px 16px',
                background: currentPage === page.id ? '#1A1A2E' : 'transparent',
                color: currentPage === page.id ? '#C0C0C0' : '#666',
                border: 'none',
                borderLeft: currentPage === page.id ? '3px solid #C0C0C0' : '3px solid transparent',
                textAlign: collapsed ? 'center' : 'left',
                cursor: 'pointer',
                fontSize: '13px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                justifyContent: collapsed ? 'center' : 'flex-start',
              }}
            >
              {page.icon}
              {!collapsed && <span>{page.label}</span>}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div style={{ padding: collapsed ? '12px 8px' : '16px', borderTop: '1px solid #222' }}>
          {!collapsed && (
            <p style={{ color: '#444', fontSize: '11px', margin: '0 0 8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.sub}</p>
          )}
          <button
            onClick={onLogout}
            title={collapsed ? 'Log out' : ''}
            style={{
              width: '100%',
              padding: '8px',
              background: 'transparent',
              color: '#666',
              border: '1px solid #333',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <LogOut size={16} />
            {!collapsed && <span>Log out</span>}
          </button>
        </div>
      </div>
    </>
  )
}