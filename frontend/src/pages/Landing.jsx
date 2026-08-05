import { useState } from 'react'

const FEATURES = [
  { icon: '📊', title: 'Sales Tracking', desc: 'Every deal logged instantly. See who\'s performing, what\'s selling, and where your money is coming from.' },
  { icon: '⭐', title: 'Review Monitoring', desc: 'Google Reviews synced automatically. Get alerted the moment a negative review appears.' },
  { icon: '🤖', title: 'AI Assistant', desc: 'Ask anything about your business in plain English. Get instant answers, no spreadsheets needed.' },
  { icon: '📦', title: 'Inventory Management', desc: 'Know exactly what\'s on your lot or shelf. Get alerts before items sit too long.' },
  { icon: '💰', title: 'Cash Flow Tracking', desc: 'See your real profit after expenses. Know exactly where your money is going every month.' },
  { icon: '📧', title: 'Weekly Email Report', desc: 'Every Friday, HexGuard sends you a summary of your week. No login required.' },
]

const STEPS = [
  { number: '01', title: 'Request Access', desc: 'Fill out a quick form. We set up your account within 24 hours.' },
  { number: '02', title: 'Add Your Data', desc: 'Log sales manually or connect Square and Stripe. Takes minutes to get started.' },
  { number: '03', title: 'Get Insights', desc: 'Your dashboard updates instantly. Every Friday, your report arrives automatically.' },
]

const PLANS = [
  {
    name: 'Starter',
    price: '$49',
    color: '#666',
    features: ['Dashboard & KPIs', 'Sales tracking', 'Manual sale entry', 'Weekly email report', 'Up to 3 months history'],
    cta: 'Request Free Trial',
  },
  {
    name: 'Business',
    price: '$99',
    color: '#4a9eff',
    popular: true,
    features: ['Everything in Starter', 'Inventory management', 'Google Reviews sync', 'Cash flow tracking', 'Square & Stripe webhooks', 'Unlimited history'],
    cta: 'Request Free Trial',
  },
  {
    name: 'Pro',
    price: '$199',
    color: '#2ecc71',
    features: ['Everything in Business', 'AI Chat assistant', 'F&I tracking', 'Advanced anomaly alerts', 'Priority support', 'First access to new features'],
    cta: 'Request Free Trial',
  },
]

export default function Landing({ onGetStarted }) {
  const [form, setForm]           = useState({ name: '', email: '', business: '', type: '' })
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name || !form.email || !form.business) return
    setSubmitting(true)
    try {
      await fetch('https://hexguardapp.com/trial-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
    } catch {}
    setSubmitted(true)
    setSubmitting(false)
  }

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

  return (
    <div style={{ background: '#0A0A0A', minHeight: '100vh', fontFamily: 'Arial, sans-serif', color: '#fff' }}>

      {/* Nav */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 48px', borderBottom: '1px solid #1a1a1a', position: 'sticky', top: 0, background: 'rgba(10,10,10,0.95)', backdropFilter: 'blur(10px)', zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="/logo.png" alt="HexGuard" style={{ width: '36px', height: '36px', borderRadius: '6px' }} />
          <span style={{ color: '#C0C0C0', fontSize: '18px', fontWeight: 'bold' }}>HexGuard</span>
        </div>
        <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
          <button onClick={() => scrollTo('features')} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '14px' }}>Features</button>
          <button onClick={() => scrollTo('how-it-works')} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '14px' }}>How it works</button>
          <button onClick={() => scrollTo('pricing')} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '14px' }}>Pricing</button>
          <button onClick={onGetStarted} style={{ background: 'transparent', border: '1px solid #333', color: '#C0C0C0', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }}>Sign In</button>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ padding: '120px 48px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(74,158,255,0.08) 0%, transparent 70%)' }} />
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'inline-block', background: 'rgba(74,158,255,0.1)', border: '1px solid rgba(74,158,255,0.3)', borderRadius: '20px', padding: '6px 16px', marginBottom: '24px' }}>
            <span style={{ color: '#4a9eff', fontSize: '13px' }}>Now in beta — limited spots available</span>
          </div>
          <h1 style={{ fontSize: '64px', fontWeight: 'bold', margin: '0 0 24px', lineHeight: '1.1', color: '#fff' }}>
            Your business,<br />
            <span style={{ color: '#4a9eff' }}>simplified.</span>
          </h1>
          <p style={{ color: '#666', fontSize: '20px', maxWidth: '540px', margin: '0 auto 48px', lineHeight: '1.6' }}>
            HexGuard watches your sales, reviews, inventory, and cash flow — then tells you what matters every Friday morning.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => scrollTo('trial')} style={{ padding: '16px 32px', background: '#4a9eff', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}>
              Request Free Trial
            </button>
            <button onClick={() => scrollTo('features')} style={{ padding: '16px 32px', background: 'transparent', color: '#C0C0C0', border: '1px solid #333', borderRadius: '8px', fontSize: '16px', cursor: 'pointer' }}>
              See Features →
            </button>
          </div>
          <p style={{ color: '#444', fontSize: '13px', marginTop: '16px' }}>1 week free • No credit card required • Setup in 24 hours</p>
        </div>
      </section>

      {/* Features */}
      <section id="features" style={{ padding: '80px 48px', borderTop: '1px solid #1a1a1a' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: '36px', color: '#fff', margin: '0 0 12px' }}>Everything your business needs</h2>
          <p style={{ textAlign: 'center', color: '#555', fontSize: '16px', margin: '0 0 64px' }}>One platform. All your business intelligence. Finally simple.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
            {FEATURES.map((f, i) => (
              <div key={i} style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '12px', padding: '28px' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>{f.icon}</div>
                <h3 style={{ color: '#C0C0C0', fontSize: '18px', margin: '0 0 8px' }}>{f.title}</h3>
                <p style={{ color: '#555', fontSize: '14px', margin: 0, lineHeight: '1.6' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" style={{ padding: '80px 48px', borderTop: '1px solid #1a1a1a' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: '36px', color: '#fff', margin: '0 0 12px' }}>Up and running in 24 hours</h2>
          <p style={{ textAlign: 'center', color: '#555', fontSize: '16px', margin: '0 0 64px' }}>No technical setup. No complicated onboarding. We handle everything.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '40px' }}>
            {STEPS.map((s, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#1a1a1a', marginBottom: '16px', WebkitTextStroke: '1px #333' }}>{s.number}</div>
                <h3 style={{ color: '#C0C0C0', fontSize: '18px', margin: '0 0 8px' }}>{s.title}</h3>
                <p style={{ color: '#555', fontSize: '14px', margin: 0, lineHeight: '1.6' }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" style={{ padding: '80px 48px', borderTop: '1px solid #1a1a1a' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: '36px', color: '#fff', margin: '0 0 12px' }}>Simple pricing</h2>
          <p style={{ textAlign: 'center', color: '#555', fontSize: '16px', margin: '0 0 64px' }}>No hidden fees. Cancel anytime. Start free for 1 week.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
            {PLANS.map((p, i) => (
              <div key={i} style={{ background: p.popular ? '#0d1a2d' : '#111', border: `1px solid ${p.popular ? '#4a9eff' : '#1a1a1a'}`, borderRadius: '12px', padding: '32px', position: 'relative' }}>
                {p.popular && (
                  <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: '#4a9eff', color: '#fff', padding: '4px 16px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>
                    MOST POPULAR
                  </div>
                )}
                <h3 style={{ color: p.color, fontSize: '16px', margin: '0 0 8px' }}>{p.name}</h3>
                <div style={{ marginBottom: '24px' }}>
                  <span style={{ color: '#fff', fontSize: '40px', fontWeight: 'bold' }}>{p.price}</span>
                  <span style={{ color: '#555', fontSize: '14px' }}>/month</span>
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px' }}>
                  {p.features.map((f, j) => (
                    <li key={j} style={{ color: '#999', fontSize: '14px', padding: '6px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: p.color }}>✓</span> {f}
                    </li>
                  ))}
                </ul>
                <button onClick={() => scrollTo('trial')} style={{ width: '100%', padding: '12px', background: p.popular ? '#4a9eff' : 'transparent', color: p.popular ? '#fff' : '#C0C0C0', border: `1px solid ${p.popular ? '#4a9eff' : '#333'}`, borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}>
                  {p.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trial form */}
      <section id="trial" style={{ padding: '80px 48px', borderTop: '1px solid #1a1a1a' }}>
        <div style={{ maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '36px', color: '#fff', margin: '0 0 12px' }}>Start your free trial</h2>
          <p style={{ color: '#555', fontSize: '16px', margin: '0 0 40px' }}>1 week free. We set everything up for you within 24 hours.</p>
          {submitted ? (
            <div style={{ background: '#0d2d15', border: '1px solid #27ae60', borderRadius: '12px', padding: '40px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
              <h3 style={{ color: '#2ecc71', margin: '0 0 8px' }}>Request received!</h3>
              <p style={{ color: '#666', margin: 0 }}>We'll have your account ready within 24 hours. Check your email for login details.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '12px', padding: '32px', textAlign: 'left' }}>
              {[
                { key: 'name',     label: 'Your name',        placeholder: 'John Smith' },
                { key: 'email',    label: 'Email address',    placeholder: 'john@yourbusiness.com' },
                { key: 'business', label: 'Business name',    placeholder: 'Smith Auto Repair' },
                { key: 'type',     label: 'Type of business', placeholder: 'Auto repair, dealership, retail...' },
              ].map(f => (
                <div key={f.key} style={{ marginBottom: '16px' }}>
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
      <footer style={{ padding: '40px 48px', borderTop: '1px solid #1a1a1a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="/logo.png" alt="HexGuard" style={{ width: '28px', height: '28px', borderRadius: '4px' }} />
          <span style={{ color: '#444', fontSize: '14px' }}>HexGuard — Your business, simplified.</span>
        </div>
        <div style={{ display: 'flex', gap: '24px' }}>
          <button onClick={onGetStarted} style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', fontSize: '13px' }}>Sign In</button>
          <span style={{ color: '#333', fontSize: '13px' }}>© 2026 HexGuard</span>
        </div>
      </footer>

    </div>
  )
}
