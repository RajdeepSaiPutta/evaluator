import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { AuthShell } from './AuthShell'

export function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'request' | 'reset'>('request')
  const [email, setEmail] = useState('')
  const { sendPasswordReset, updatePassword } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const type = searchParams.get('type')
    if (type === 'recovery') setStep('reset')
  }, [searchParams])

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await sendPasswordReset(email)
      setError('Password reset link sent! Check your email.')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setError('')
    setLoading(true)
    try {
      await updatePassword(password)
      setError('Password updated! Redirecting...')
      setTimeout(() => navigate('/login'), 2000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (step === 'request') {
    const isSent = error.includes('sent')
    return (
      <AuthShell title="Reset password" subtitle="We'll email you a reset link">
        <form onSubmit={handleRequestReset} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {error && <div className={`banner ${isSent ? 'banner-success' : 'banner-error'}`} role={isSent ? 'status' : 'alert'}>{error}</div>}
          <div>
            <label htmlFor="email" className="label">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="you@example.com"
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%' }}>
            {loading ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
        <div className="text-center" style={{ marginTop: 20 }}>
          <p className="caption">
            <Link to="/login" style={{ color: 'var(--blue)', fontWeight: 600 }}>Back to sign in</Link>
          </p>
        </div>
      </AuthShell>
    )
  }

  const isUpdated = error.includes('updated')
  return (
    <AuthShell title="New password" subtitle="Choose something memorable">
      <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {error && <div className={`banner ${isUpdated ? 'banner-success' : 'banner-error'}`} role={isUpdated ? 'status' : 'alert'}>{error}</div>}
        <div>
          <label htmlFor="password" className="label">New password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
            placeholder="••••••••"
          />
        </div>
        <div>
          <label htmlFor="confirmPassword" className="label">Confirm new password</label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="input"
            placeholder="••••••••"
          />
        </div>
        <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%' }}>
          {loading ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </AuthShell>
  )
}
