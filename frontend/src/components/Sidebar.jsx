import { useState } from 'react'

const PAGES = [
  { id: 'home',      label: '🏠 Home' },
  { id: 'sales',     label: '🚗 Sales' },
  { id: 'add-sale',  label: '➕ Add Sale' },
  { id: 'fi',        label: '💼 F&I' },
  { id: 'reviews',   label: '⭐ Reviews' },
  { id: 'inventory', label: '📦 Inventory' },
  { id: 'email',     label: '📧 Email Report' },
  { id: 'ai',        label: '🤖 AI Chat' },
  { id: 'payments',  label: '💳 Payments' },
  { id: 'finances',  label: '💰 Finances' },
]

export default function Sidebar({ user, currentPage, setCurrentPage, onLogout }) {
  const [collapsed, setCollapsed] = useState(false)

  const pages = [...PAGES]
  if (user?.role === 'admin') pages.push({ id: 'admin', label: '⚙️ Admin' })

  const width = collapsed ? '60px' : '220px'

  return (
    <>
      {/* Sidebar */}
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
              fontSize: '16px',
              padding: '4px',
              marginLeft: collapsed ? '0' : '8px',
              flexShrink: 0,
            }}
          >
            {collapsed ? '→' : '←'}
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
                fontSize: collapsed ? '18px' : '13px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
              }}
            >
              {collapsed ? page.label.split(' ')[0] : page.label}
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
              fontSize: collapsed ? '14px' : '13px',
            }}
          >
            {collapsed ? '↩' : 'Log out'}
          </button>
        </div>
      </div>

    
    </>
  )
}
