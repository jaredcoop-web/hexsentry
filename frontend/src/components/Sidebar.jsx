export default function Sidebar({ user, currentPage, setPage, onLogout }) {
  const pages = [
    { id: 'dashboard', label: '🏠 Dashboard' },
    { id: 'sales',     label: '🚗 Sales' },
    { id: 'add-sale',  label: '➕ Add Sale' },
    { id: 'reviews',   label: '⭐ Reviews' },
    { id: 'inventory', label: '🚙 Inventory' },
    { id: 'upload',    label: '📤 Upload Data' },
    { id: 'email',     label: '📧 Email Report' },
    { id: 'ai',        label: '🤖 AI Chat' },
    { id: 'payments', label: '💳 Payments' },
  ]
  if (user?.role === 'admin') pages.push({ id: 'admin', label: '⚙️ Admin' })
  return (
    <div style={{ width: '220px', minHeight: '100vh', background: '#0A0A0A', borderRight: '1px solid #222', display: 'flex', flexDirection: 'column', fontFamily: 'Arial, sans-serif', position: 'fixed', left: 0, top: 0 }}>
      <div style={{ padding: '24px 16px', borderBottom: '1px solid #222' }}>
        <h2 style={{ color: '#C0C0C0', margin: 0, fontSize: '20px' }}>🛡️ HexGuard</h2>
        <p style={{ color: '#555', margin: '4px 0 0', fontSize: '11px' }}>{user?.business_name || 'Business Intelligence'}</p>
      </div>
      <nav style={{ flex: 1, padding: '12px 0' }}>
        {pages.map(page => (
          <button key={page.id} onClick={() => setPage(page.id)} style={{ width: '100%', padding: '10px 16px', background: currentPage === page.id ? '#1A1A2E' : 'transparent', color: currentPage === page.id ? '#C0C0C0' : '#666', border: 'none', borderLeft: currentPage === page.id ? '3px solid #C0C0C0' : '3px solid transparent', textAlign: 'left', cursor: 'pointer', fontSize: '14px' }}>
            {page.label}
          </button>
        ))}
      </nav>
      <div style={{ padding: '16px', borderTop: '1px solid #222' }}>
        <p style={{ color: '#444', fontSize: '11px', margin: '0 0 8px' }}>{user?.sub}</p>
        <button onClick={onLogout} style={{ width: '100%', padding: '8px', background: 'transparent', color: '#666', border: '1px solid #333', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>Log out</button>
      </div>
    </div>
  )
}
