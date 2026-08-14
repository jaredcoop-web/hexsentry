import { useState, useEffect } from 'react'

const FEATURES = [
  { icon: '📊', title: 'Sales Tracking', desc: 'Every deal logged instantly. See who\'s performing, what\'s selling, and where your money is coming from.' },
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
    price:   '$199.99',
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
    price:   '$299.99',
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
  <div style={{ background: '#0A0A0A', minHeight: '100vh', fontFamily: 'Arial, sans-serif', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '20px' }}>
    <img src="/logo.png" alt="HexGuard" style={{ width: '64px', height: '64px', borderRadius: '12px', marginBottom: '24px' }} />
    <h1 style={{ color: '#C0C0C0', fontSize: '32px', fontWeight: 'bold', margin: '0 0 12px' }}>HexGuard</h1>
    <p style={{ color: '#4a9eff', fontSize: '16px', margin: '0 0 8px' }}>The Intelligence Platform for Dealers and Repair Shops.</p>
    <p style={{ color: '#444', fontSize: '14px', margin: '0 0 40px' }}>Coming soon — currently in private beta.</p>
    <button onClick={onGetStarted} style={{ background: 'transparent', border: '1px solid #333', color: '#666', padding: '10px 24px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}>
      Sign In
    </button>
  </div>
)