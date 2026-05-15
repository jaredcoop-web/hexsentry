import { useState } from 'react'

export default function Payments({ user }) {
  const [squareCopied, setSquareCopied]     = useState(false)
  const [stripeCopied, setStripeCopied]     = useState(false)
  const [squareResult, setSquareResult]     = useState(null)
  const [stripeResult, setStripeResult]     = useState(null)
  const [squareTesting, setSquareTesting]   = useState(false)
  const [stripeTesting, setStripeTesting]   = useState(false)

  const clientId       = user?.client_id || 'admin'
  const squareUrl = `https://hexsentry-api.onrender.com/webhooks/square/${clientId}`
  const stripeUrl = `https://hexsentry-api.onrender.com/webhooks/stripe/${clientId}`
  const localSquareUrl = `https://hex-guard.onrender.com/webhooks/square/${clientId}`
  const localStripeUrl = `https://hex-guard.onrender.com/webhooks/stripe/${clientId}`

  const copy = (text, setter) => {
    navigator.clipboard.writeText(text)
    setter(true)
    setTimeout(() => setter(false), 2000)
  }

  const testSquare = async () => {
    setSquareTesting(true)
    setSquareResult(null)
    try {
      const res = await fetch(localSquareUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'payment.completed',
          data: {
            object: {
              payment: {
                id:           'sq_test_' + Date.now(),
                amount_money: { amount: 25000, currency: 'USD' },
                source_type:  'CARD',
                created_at:   new Date().toISOString(),
                note:         'Test Square Sale',
              }
            }
          }
        })
      })
      const data = await res.json()
      setSquareResult(data.status === 'success'
        ? { type: 'success', msg: '✅ $250.00 Square test sale recorded! Check your Sales page.' }
        : { type: 'error', msg: JSON.stringify(data) }
      )
    } catch (e) {
      setSquareResult({ type: 'error', msg: `Failed: ${e.message}` })
    } finally {
      setSquareTesting(false)
    }
  }

  const testStripe = async () => {
    setStripeTesting(true)
    setStripeResult(null)
    try {
      const res = await fetch(localStripeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'payment_intent.succeeded',
          data: {
            object: {
              id:                   'pi_test_' + Date.now(),
              amount:               18000,
              currency:             'usd',
              created:              Math.floor(Date.now() / 1000),
              description:          'Test Stripe Sale',
              payment_method_types: ['card'],
              status:               'succeeded',
            }
          }
        })
      })
      const data = await res.json()
      setStripeResult(data.status === 'success'
        ? { type: 'success', msg: '✅ $180.00 Stripe test sale recorded! Check your Sales page.' }
        : { type: 'error', msg: JSON.stringify(data) }
      )
    } catch (e) {
      setStripeResult({ type: 'error', msg: `Failed: ${e.message}` })
    } finally {
      setStripeTesting(false)
    }
  }

  const CARD = { background: '#1A1A2E', border: '1px solid #333', borderRadius: '8px', padding: '24px', marginBottom: '20px' }
  const CODE = { background: '#0A0A0A', border: '1px solid #333', borderRadius: '6px', padding: '10px 14px', color: '#2ecc71', fontSize: '12px', fontFamily: 'monospace', wordBreak: 'break-all', margin: '8px 0' }
  const BTN  = (bg) => ({ padding: '10px 20px', background: bg || '#C0C0C0', color: bg ? '#fff' : '#0A0A0A', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', marginRight: '10px' })

  const Result = ({ result }) => result ? (
    <div style={{ marginTop: '12px', background: result.type === 'success' ? '#0d2d15' : '#2d1515', border: `1px solid ${result.type === 'success' ? '#27ae60' : '#c0392b'}`, borderRadius: '6px', padding: '10px 14px', color: result.type === 'success' ? '#2ecc71' : '#e74c3c', fontSize: '13px' }}>
      {result.msg}
    </div>
  ) : null

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '700px' }}>
      <h1 style={{ color: '#C0C0C0', marginBottom: '8px' }}>💳 Payment Integrations</h1>
      <p style={{ color: '#555', marginBottom: '24px', fontSize: '13px' }}>
        Connect your payment systems — sales appear in HexGuard automatically
      </p>

      {/* Square */}
      <div style={CARD}>
        <h2 style={{ color: '#C0C0C0', margin: '0 0 4px', fontSize: '18px' }}>Square</h2>
        <p style={{ color: '#666', margin: '0 0 16px', fontSize: '13px' }}>Auto-sync every Square payment instantly</p>

        <p style={{ color: '#999', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>Your webhook URL:</p>
        <div style={CODE}>{squareUrl}</div>
        <button style={BTN('#333')} onClick={() => copy(squareUrl, setSquareCopied)}>
          {squareCopied ? '✅ Copied!' : 'Copy URL'}
        </button>

        <p style={{ color: '#666', fontSize: '12px', margin: '16px 0 8px' }}>
          Paste this URL in Square Developer Dashboard → Webhooks → Add Webhook → select <strong style={{ color: '#C0C0C0' }}>payment.completed</strong>
        </p>

        <button style={BTN()} onClick={testSquare} disabled={squareTesting}>
          {squareTesting ? 'Testing...' : '🧪 Send Test Sale ($250)'}
        </button>
        <Result result={squareResult} />
      </div>

      {/* Stripe */}
      <div style={CARD}>
        <h2 style={{ color: '#C0C0C0', margin: '0 0 4px', fontSize: '18px' }}>Stripe</h2>
        <p style={{ color: '#666', margin: '0 0 16px', fontSize: '13px' }}>Auto-sync every Stripe payment instantly</p>

        <p style={{ color: '#999', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>Your webhook URL:</p>
        <div style={CODE}>{stripeUrl}</div>
        <button style={BTN('#333')} onClick={() => copy(stripeUrl, setStripeCopied)}>
          {stripeCopied ? '✅ Copied!' : 'Copy URL'}
        </button>

        <p style={{ color: '#666', fontSize: '12px', margin: '16px 0 8px' }}>
          Paste this URL in Stripe Dashboard → Developers → Webhooks → Add endpoint → select <strong style={{ color: '#C0C0C0' }}>payment_intent.succeeded</strong>
        </p>

        <button style={BTN()} onClick={testStripe} disabled={stripeTesting}>
          {stripeTesting ? 'Testing...' : '🧪 Send Test Sale ($180)'}
        </button>
        <Result result={stripeResult} />
      </div>

      {/* Coming soon */}
      {['Shopify', 'PayPal', 'Generic Webhook'].map(name => (
        <div key={name} style={{ ...CARD, opacity: 0.4 }}>
          <h2 style={{ color: '#C0C0C0', margin: '0 0 4px', fontSize: '16px' }}>{name} <span style={{ color: '#555', fontSize: '12px' }}>Coming soon</span></h2>
        </div>
      ))}
    </div>
  )
}
