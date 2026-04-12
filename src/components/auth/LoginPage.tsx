import { useState } from 'react'
import { supabase } from '../../lib/supabase'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) setError('Invalid email or password')
    setLoading(false)
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center', marginBottom: '6px' }}>
            <img
              src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRjZAWb8hk6yw7Dq2nfS6cC7PTS7qA0ewjuyQ&s"
              alt="Coversure"
              style={{ width: '34px', height: '34px', objectFit: 'contain', borderRadius: '8px' }}
            />
            <span style={{ fontSize: '22px', fontWeight: 800, color: '#1a1a1a' }}>Coversure</span>
          </div>
          <div style={{ fontSize: '13px', color: '#7a8fa0', textAlign: 'center' }}>Powered by Ivy</div>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-field">
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder=""
              required
              autoComplete="email"
            />
          </div>

          <div className="login-field">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder=""
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="login-error">
              <i className="fas fa-times-circle"></i> {error}
            </div>
          )}

          <button type="submit" className="login-btn" disabled={loading}>
            {loading
              ? <><i className="fas fa-spinner fa-spin"></i> Signing in…</>
              : 'Sign In'
            }
          </button>
        </form>
      </div>
    </div>
  )
}
