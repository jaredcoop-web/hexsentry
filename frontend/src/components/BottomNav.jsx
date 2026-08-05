import { useState } from 'react'

const MAIN_PAGES = [
  { id: 'home',     icon: '🏠', label: 'Home' },
  { id: 'sales',    icon: '🚗', label: 'Sales' },
  { id: 'add-sale', icon: '➕', label: 'Add' },
  { id: 'ai',       icon: '🤖', label: 'AI' },
  { id: 'more',     icon: '⋯',  label: 'More' },
]

const MORE_PAGES = [
  { id: 'dashboard',  icon: '📊', label: 'Dashboard' },
  { id: 'inventory',  icon: '📦', label: 'Inventory' },
  { id: 'reviews',    icon: '⭐', label: 'Reviews' },
  { id: 'finances',   icon: '💰', label: 'Finances' },
  { id: 'fi',         icon: '💼', label: 'F&I' },
  { id: 'email',      icon: '📧', label: 'Email Report' },
  { id: 'payments',   icon: '💳', label: 'Payments' },
]

export default function BottomNav({ currentPage, setCurrentPage, user, onLogout }) {
  const [showMore, setShowMore] = useState(false)

  const handleNav = (id) => {
    if (id === 'more') {
      setShowMore(!showMore)
      return
    }
    setCurrentPage(id)
    setShowMore(false)
  }

  return (
    <>
      {/* More menu overlay */}
      {showMore && (
        <div style={{
          position:   'fixed',
          bottom:     '60px',
          left:       0,
          right:      0,
          background: '#0A0A0A',
          border:     '1px solid #222',
          borderRadius: '16px 16px 0 0',
          padding:    '16px',
          zIndex:     200,
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '12px' }}>
            {MORE_PAGES.map(p => (
              <button
                key={p.id}
                onClick={() => handleNav(p.id)}
                style={{
                  background:   currentPage === p.id ? '#1A1A2E' : 'transparent',
                  border:       `1px solid ${currentPage === p.id ? '#4a9eff' : '#222'}`,
                  borderRadius: '8px',
                  padding:      '12px 8px',
                  cursor:       'pointer',
                  textAlign:    'center',
                  color:        '#C0C0C0',
                }}
              >
                <div style={{ fontSize: '22px', marginBottom: '4px' }}>{p.icon}</div>
                <div style={{ fontSize: '11px', color: '#999' }}>{p.label}</div>
              </button>
            ))}
          </div>
          {user?.role === 'admin' && (
            <button
              onClick={() => handleNav('admin')}
              style={{ width: '100%', padding: '10px', background: 'transparent', border: '1px solid #222', borderRadius: '8px', color: '#666', cursor: 'pointer', fontSize: '13px', marginBottom: '8px' }}
            >
              ⚙️ Admin Panel
            </button>
          )}
          <button
            onClick={() => { onLogout(); setShowMore(false) }}
            style={{ width: '100%', padding: '10px', background: 'transparent', border: '1px solid #333', borderRadius: '8px', color: '#e74c3c', cursor: 'pointer', fontSize: '13px' }}
          >
            Log out
          </button>
        </div>
      )}

      {/* Bottom nav bar */}
      <div style={{
        position:        'fixed',
        bottom:          0,
        left:            0,
        right:           0,
        background:      '#0A0A0A',
        borderTop:       '1px solid #222',
        display:         'flex',
        justifyContent:  'space-around',
        alignItems:      'center',
        padding:         '8px 0 12px',
        zIndex:          100,
      }}>
        {MAIN_PAGES.map(p => {
          const isActive = p.id === 'more' ? showMore : currentPage === p.id
          return (
            <button
              key={p.id}
              onClick={() => handleNav(p.id)}
              style={{
                background: 'none',
                border:     'none',
                cursor:     'pointer',
                textAlign:  'center',
                padding:    '4px 12px',
                flex:       1,
              }}
            >
              <div style={{ fontSize: '22px', marginBottom: '2px' }}>{p.icon}</div>
              <div style={{ fontSize: '10px', color: isActive ? '#4a9eff' : '#555' }}>{p.label}</div>
              {isActive && (
                <div style={{ width: '4px', height: '4px', background: '#4a9eff', borderRadius: '50%', margin: '2px auto 0' }} />
              )}
            </button>
          )
        })}
      </div>
    </>
  )
}
