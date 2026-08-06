import { useState, useEffect } from 'react'

const FEATURES = [
  { icon: '📊', title: 'Sales Tracking', desc: 'Log every deal instantly. See gross profit, top performers, and lead sources in real time.' },
  { icon: '💰', title: 'Cash Flow', desc: 'Track income and expenses. Know your real profit after every bill is paid.' },
  { icon: '📧', title: 'Weekly Reports', desc: 'Every Friday, HexGuard sends a business summary straight to your inbox. Automatic.' },
  { icon: '💳', title: 'Payment Sync', desc: 'Square and Stripe payments sync automatically. No manual entry needed.' },
  { icon: '⭐', title: 'Google Reviews', desc: 'Monitor your reputation automatically. Get alerted the moment a negative review appears.' },
  { icon: '📦', title: 'Inventory', desc: 'Track every unit on your lot or shelf. Get alerts before items sit too long.' },
  { icon: '🤖', title: 'AI Assistant', desc: 'Ask anything about your business in plain English and get instant answers.' },
  { icon: '💼', title: 'F&I Tracking', desc: 'Track backend income — finance reserve, warranty, GAP, and add-ons per deal.' },
  { icon: '🔍', title: 'Anomaly Alerts', desc: 'HexGuard detects unusual patterns and flags them before they become problems.' },
]

const PLANS = [
  {
    name:    'Core',
    price:   '$99.99',
    color:   '#4a9eff',
    desc:    'Everything you need to run your business smarter.',
    features: [
      'Dashboard with live KPIs',
      'Sales tracking and gross profit',
      'Manual sale entry',
      'Cash flow and expense tracking',
      'Square and Stripe payment sync',
      'Weekly automated email report',
      'Anomaly detection and alerts',
    ],
    cta: 'Request Free Trial',
    popular: false,
  },
  {
    name:    'Full',
    price:   '$199.99',
    color:   '#2ecc71',
    desc:    'Everything in Core plus the tools that give you the edge.',
    features: [
      'Everything in Core',
      'AI Chat — ask anything about your data',
      'Google Reviews monitoring and sync',
      'Inventory management with age alerts',
      'F&I tracking and analytics',
      'Priority support',
      'First access to new features',
    ],
    cta: 'Request Free Trial',
    popular: true,
  },
  {
    name:    'Custom',
    price:   'Custom',
    color:   '#C0C0C0',
    desc:    'Only pay for what you actually use.',
    features: [
      'Start with Core features',
      'Add individual modules à la carte',
      'Flexible monthly pricing',
      'Ideal for businesses with specific needs',
      'Dedicated onboarding support',
    ],
    cta: 'Contact Us',
    popular: false,
  },
]

const STEPS = [
  { number: '01', title: 'Request Access', desc: 'Fill out the form below. We set up your account and walk you through everything within 24 hours.' },
  { number: '02', title: 'Log Your Business', desc: 'Add sales, upload inventory, and connect Square or Stripe. Takes minutes to get started.' },
  { number: '03', title: 'HexGuard Takes Over', desc: 'Alerts, reports, and insights run automatically. You focus on the business.' },
]

export default function Landing({ onGetStarted }) {
  const [form, setForm]             = useState({ name: '', email: '', business: '', type: '' })
  const [submitted, setSubmitted]   = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [isMobile, setIsMobile]     = useState(window.innerWidth < 768)
  const [menuOpen, setMenuOpen]     = useState(false)

  useEffect(() => {
    const handle = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handle)
    return () => window.removeEventListener('resize', handle)
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name || !form.email || !form.business) return
    setSubmitting(true)
    try {
      await fetch('https://hex-guard.onrender.com/trial-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
    } catch {}
    setSubmitted(true)
    setSubmitting(false)
  }

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    setMenuOpen(false)
  }

  return (
    <div style={{ background: '#0A0A0A', minHeight: '100vh', fontFamily: 'Arial, sans-serif', color: '#fff', overflowX: 'hidden' }}>

      {/* Nav */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: isMobile ? '16px 20px' : '20px 48px', borderBottom: '1px solid #1a1a1a', position: 'sticky', top: 0, background: 'rgba(10,10,10,0.95)', backdropFilter: 'blur(10px)', zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="/logo.png" alt="HexGuard" style={{ width: '32px', height: '32px', borderRadius: '6px' }} />
          <span style={{ color: '#C0C0C0', fontSize: '16px', fontWeight: 'bold' }}>HexGuard</span>
        </div>
        {isMobile ? (
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button onClick={onGetStarted} style={{ background: 'transparent', border: '1px solid #333', color: '#C0C0C0', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>Sign In</button>
            <button onClick={() => setMenuOpen(!menuOpen)} style={{ background: 'none', border: 'none', color: '#C0C0C0', cursor: 'pointer', fontSize: '20px' }}>☰</button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
            <button onClick={() => scrollTo('features')} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '14px' }}>Features</button>
            <button onClick={() => scrollTo('how-it-works')} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '14px' }}>How it works</button>
            <button onClick={() => scrollTo('pricing')} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '14px' }}>Pricing</button>
            <button onClick={onGetStarted} style={{ background: 'transparent', border: '1px solid #333', color: '#C0C0C0', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }}>Sign In</button>
          </div>
        )}
      </nav>

      {/* Mobile menu */}
      {isMobile && menuOpen && (
        <div style={{ background: '#0A0A0A', borderBottom: '1px solid #1a1a1a', padding: '16px 20px' }}>
          {['features', 'how-it-works', 'pricing', 'trial'].map(id => (
            <button key={id} onClick={() => scrollTo(id)} style={{ display: 'block', width: '100%', background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '14px', padding: '10px 0', textAlign: 'left', textTransform: 'capitalize' }}>
              {id.replace('-', ' ')}
            </button>
          ))}
        </div>
      )}

      {/* Hero */}
      <section style={{ padding: isMobile ? '60px 20px' : '120px 48px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(74,158,255,0.08) 0%, transparent 70%)' }} />
        <div style={{ position: 'relative', maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ display: 'inline-block', background: 'rgba(74,158,255,0.1)', border: '1px solid rgba(74,158,255,0.3)', borderRadius: '20px', padding: '6px 16px', marginBottom: '24px' }}>
            <span style={{ color: '#4a9eff', fontSize: '13px' }}>Now in beta — limited spots available</span>
          </div>
          <h1 style={{ fontSize: isMobile ? '32px' : '58px', fontWeight: 'bold', margin: '0 0 20px', lineHeight: '1.15', color: '#fff' }}>
            The Intelligence Platform for<br />
            <span style={{ color: '#4a9eff' }}>Dealers and Repair Shops.</span>
          </h1>
          <p style={{ color: '#666', fontSize: isMobile ? '15px' : '18px', maxWidth: '560px', margin: '0 auto 40px', lineHeight: '1.7' }}>
            Sales, inventory, reviews, and cash flow — monitored, analyzed, and delivered to your inbox every Friday.
</p>
<p style={{ color: '#4a9eff', fontSize: isMobile ? '13px' : '14px', maxWidth: '560px', margin: '0 auto 40px', lineHeight: '1.6', opacity: 0.8 }}>
  🔧 More automation integrations coming soon — Square, Tekmetric, and direct DMS connections.
          </p>
          <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => scrollTo('trial')} style={{ padding: isMobile ? '12px 24px' : '14px 32px', background: '#4a9eff', color: '#fff', border: 'none', borderRadius: '8px', fontSize: isMobile ? '14px' : '15px', fontWeight: 'bold', cursor: 'pointer', width: isMobile ? '100%' : 'auto' }}>
              Request Free Trial
            </button>
            <button onClick={() => scrollTo('features')} style={{ padding: isMobile ? '12px 24px' : '14px 32px', background: 'transparent', color: '#C0C0C0', border: '1px solid #333', borderRadius: '8px', fontSize: isMobile ? '14px' : '15px', cursor: 'pointer', width: isMobile ? '100%' : 'auto' }}>
              See Current Features →
            </button>
          </div>
          <p style={{ color: '#444', fontSize: '12px', marginTop: '16px' }}>1 week free • No credit card required • Setup in 24 hours</p>
        </div>
      </section>

      {/* Features */}
      <section id="features" style={{ padding: isMobile ? '48px 20px' : '80px 48px', borderTop: '1px solid #1a1a1a' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: isMobile ? '26px' : '34px', color: '#fff', margin: '0 0 10px' }}>Built for how you actually run your business</h2>
          <p style={{ textAlign: 'center', color: '#555', fontSize: '15px', margin: '0 0 48px' }}>Every feature built for independent dealers and repair shops — nothing you don't need.</p>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '16px' }}>
            {FEATURES.map((f, i) => (
              <div key={i} style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '12px', padding: '24px' }}>
                <div style={{ fontSize: '28px', marginBottom: '10px' }}>{f.icon}</div>
                <h3 style={{ color: '#C0C0C0', fontSize: '16px', margin: '0 0 8px' }}>{f.title}</h3>
                <p style={{ color: '#555', fontSize: '13px', margin: 0, lineHeight: '1.6' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" style={{ padding: isMobile ? '48px 20px' : '80px 48px', borderTop: '1px solid #1a1a1a' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: isMobile ? '26px' : '34px', color: '#fff', margin: '0 0 10px' }}>Up and running in 24 hours</h2>
          <p style={{ textAlign: 'center', color: '#555', fontSize: '15px', margin: '0 0 48px' }}>No technical setup. No complicated onboarding. We handle everything.</p>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '32px' }}>
            {STEPS.map((s, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '40px', fontWeight: 'bold', color: '#1a1a1a', marginBottom: '12px', WebkitTextStroke: '1px #333' }}>{s.number}</div>
                <h3 style={{ color: '#C0C0C0', fontSize: '17px', margin: '0 0 8px' }}>{s.title}</h3>
                <p style={{ color: '#555', fontSize: '13px', margin: 0, lineHeight: '1.6' }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" style={{ padding: isMobile ? '48px 20px' : '80px 48px', borderTop: '1px solid #1a1a1a' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: isMobile ? '26px' : '34px', color: '#fff', margin: '0 0 10px' }}>Simple pricing</h2>
          <p style={{ textAlign: 'center', color: '#555', fontSize: '15px', margin: '0 0 48px' }}>No hidden fees. Cancel anytime. Start free for 1 week.</p>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '20px' }}>
            {PLANS.map((p, i) => (
              <div key={i} style={{ background: p.popular ? '#0d1a2d' : '#111', border: `1px solid ${p.popular ? '#4a9eff' : '#1a1a1a'}`, borderRadius: '12px', padding: '28px', position: 'relative' }}>
                {p.popular && (
                  <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: '#4a9eff', color: '#fff', padding: '4px 16px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                    MOST POPULAR
                  </div>
                )}
                <h3 style={{ color: p.color, fontSize: '15px', margin: '0 0 6px' }}>{p.name}</h3>
                <div style={{ marginBottom: '8px' }}>
                  <span style={{ color: '#fff', fontSize: '34px', fontWeight: 'bold' }}>{p.price}</span>
                  {p.price !== 'Custom' && <span style={{ color: '#555', fontSize: '13px' }}>/month</span>}
                </div>
                <p style={{ color: '#555', fontSize: '13px', margin: '0 0 20px', lineHeight: '1.5' }}>{p.desc}</p>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px' }}>
                  {p.features.map((f, j) => (
                    <li key={j} style={{ color: '#999', fontSize: '13px', padding: '5px 0', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <span style={{ color: p.color, flexShrink: 0 }}>✓</span> {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => p.cta === 'Contact Us' ? window.location.href = 'mailto:support@hexguardapp.com' : scrollTo('trial')}
                  style={{ width: '100%', padding: '12px', background: p.popular ? '#4a9eff' : 'transparent', color: p.popular ? '#fff' : '#C0C0C0', border: `1px solid ${p.popular ? '#4a9eff' : '#333'}`, borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}
                >
                  {p.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trial form */}
      <section id="trial" style={{ padding: isMobile ? '48px 20px' : '80px 48px', borderTop: '1px solid #1a1a1a' }}>
        <div style={{ maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: isMobile ? '26px' : '34px', color: '#fff', margin: '0 0 10px' }}>Start your free trial</h2>
          <p style={{ color: '#555', fontSize: '15px', margin: '0 0 32px' }}>1 week free. We set everything up for you within 24 hours.</p>
          {submitted ? (
            <div style={{ background: '#0d2d15', border: '1px solid #27ae60', borderRadius: '12px', padding: '32px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
              <h3 style={{ color: '#2ecc71', margin: '0 0 8px' }}>Request received!</h3>
              <p style={{ color: '#666', margin: 0 }}>We'll have your account ready within 24 hours. Check your email for login details.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '12px', padding: '28px', textAlign: 'left' }}>
              {[
                { key: 'name',     label: 'Your name',        placeholder: 'John Smith' },
                { key: 'email',    label: 'Email address',    placeholder: 'john@yourbusiness.com' },
                { key: 'business', label: 'Business name',    placeholder: 'Smith Auto Repair' },
                { key: 'type',     label: 'Type of business', placeholder: 'Dealership, repair shop, other...' },
              ].map(f => (
                <div key={f.key} style={{ marginBottom: '14px' }}>
                  <label style={{ color: '#666', fontSize: '13px', display: 'block', marginBottom: '6px' }}>{f.label}</label>
                  <input
                    type={f.key === 'email' ? 'email' : 'text'}
                    value={form[f.key]}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    style={{ width: '100%', padding: '11px 14px', background: '#0A0A0A', border: '1px solid #222', borderRadius: '8px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                </div>
              ))}
              <button type="submit" disabled={submitting} style={{ width: '100%', padding: '14px', background: submitting ? '#333' : '#4a9eff', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 'bold', cursor: submitting ? 'not-allowed' : 'pointer', marginTop: '8px' }}>
                {submitting ? 'Submitting...' : 'Request Free Trial →'}
              </button>
              <p style={{ color: '#444', fontSize: '12px', textAlign: 'center', margin: '12px 0 0' }}>No credit card required</p>
            </form>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: isMobile ? '24px 20px' : '40px 48px', borderTop: '1px solid #1a1a1a', display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="/logo.png" alt="HexGuard" style={{ width: '28px', height: '28px', borderRadius: '4px' }} />
          <span style={{ color: '#444', fontSize: '13px' }}>HexGuard — The Intelligence Platform for Dealers and Repair Shops.</span>
        </div>
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          <a href="mailto:support@hexguardapp.com" style={{ color: '#444', fontSize: '13px', textDecoration: 'none' }}>Contact</a>
          <button onClick={onGetStarted} style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', fontSize: '13px' }}>Sign In</button>
          <span style={{ color: '#333', fontSize: '13px' }}>© 2026 HexGuard</span>
        </div>
      </footer>

    </div>
  )
}
