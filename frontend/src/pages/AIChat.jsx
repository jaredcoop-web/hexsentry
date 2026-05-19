import { useState, useRef, useEffect } from 'react'
import api from '../api'

const SUGGESTIONS = [
  "Who is my best salesperson?",
  "Which items have been sitting longest?",
  "What is my average gross profit per deal?",
  "What are customers saying in reviews?",
  "How did this month compare to last month?",
  "Which lead source converts best?",
  "What should I focus on this week?",
]

export default function AIChat({ user }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: `Hi! I'm your HexGuard AI assistant. Ask me anything about ${user?.business_name || 'your business'} — sales performance, inventory, reviews, or what to focus on next.`
    }
  ])
  const [input, setInput]     = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef             = useRef()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async (text) => {
    const question = text || input.trim()
    if (!question) return

    setMessages(prev => [...prev, { role: 'user', text: question }])
    setInput('')
    setLoading(true)

    try {
      const res = await api.post('/chat', { message: question })
      setMessages(prev => [...prev, { role: 'assistant', text: res.data.response }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Sorry, I had trouble connecting. Please try again.' }])
    }
    setLoading(false)
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: '16px' }}>
        <h1 style={{ color: '#C0C0C0', margin: '0 0 4px', fontSize: '24px' }}>🤖 AI Assistant</h1>
        <p style={{ color: '#555', margin: 0, fontSize: '13px' }}>Ask anything about your business in plain English</p>
      </div>

      {/* Suggestion chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
        {SUGGESTIONS.map((s, i) => (
          <button key={i} onClick={() => send(s)} style={{ padding: '6px 12px', background: 'transparent', color: '#666', border: '1px solid #333', borderRadius: '20px', cursor: 'pointer', fontSize: '12px', whiteSpace: 'nowrap' }}>
            {s}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', background: '#0d0d1a', borderRadius: '8px', border: '1px solid #222', padding: '16px', marginBottom: '16px' }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: '16px' }}>
            <div style={{
              maxWidth: '75%',
              padding: '12px 16px',
              borderRadius: m.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
              background: m.role === 'user' ? '#1A1A2E' : '#0f1923',
              border: `1px solid ${m.role === 'user' ? '#333' : '#1a2940'}`,
              color: m.role === 'user' ? '#C0C0C0' : '#a0c4e8',
              fontSize: '14px',
              lineHeight: '1.6',
              whiteSpace: 'pre-wrap',
            }}>
              {m.role === 'assistant' && (
                <span style={{ fontSize: '11px', color: '#555', display: 'block', marginBottom: '6px' }}>🛡️ HexGuard AI</span>
              )}
              {m.text}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '16px' }}>
            <div style={{ padding: '12px 16px', borderRadius: '18px 18px 18px 4px', background: '#0f1923', border: '1px solid #1a2940', color: '#555', fontSize: '14px' }}>
              🛡️ HexGuard AI is thinking...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ask anything about your business... (Enter to send)"
          rows={2}
          style={{ flex: 1, padding: '12px 14px', background: '#1A1A2E', border: '1px solid #333', borderRadius: '8px', color: '#fff', fontSize: '14px', resize: 'none', fontFamily: 'Arial, sans-serif' }}
        />
        <button
          onClick={() => send()}
          disabled={loading || !input.trim()}
          style={{ padding: '0 20px', background: loading || !input.trim() ? '#333' : '#C0C0C0', color: '#0A0A0A', border: 'none', borderRadius: '8px', cursor: loading || !input.trim() ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '14px', minWidth: '80px' }}
        >
          Send
        </button>
      </div>
    </div>
  )
}
