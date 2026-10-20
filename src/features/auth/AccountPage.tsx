import { useEffect, useMemo, useState } from 'react'

import { hasFirebaseConfig } from '../../lib/firebaseClient'
import {
  onFirebaseAuthStateChanged,
  signInWithEmailPassword,
  signOutFirebase,
  signUpWithEmailPassword,
} from '../../services/auth/firebaseAuthService'

type AuthMode = 'sign-in' | 'sign-up'

function formatError(error: unknown) {
  if (error instanceof Error) {
    return error.message.replace(/^Firebase:\s*/i, '')
  }

  return 'Authentication request failed. Please try again.'
}

export function AccountPage() {
  const [mode, setMode] = useState<AuthMode>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [currentEmail, setCurrentEmail] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const firebaseReady = useMemo(() => hasFirebaseConfig(), [])

  useEffect(() => {
    if (!firebaseReady) return

    const unsubscribe = onFirebaseAuthStateChanged((user) => {
      setCurrentEmail(user?.email ?? null)
    })

    return unsubscribe
  }, [firebaseReady])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setError(null)
    setNotice(null)

    try {
      if (mode === 'sign-up') {
        const credential = await signUpWithEmailPassword(email.trim(), password)
        setCurrentEmail(credential.user.email)
        setNotice('Account created. You are now signed in with email/password.')
      } else {
        const credential = await signInWithEmailPassword(email.trim(), password)
        setCurrentEmail(credential.user.email)
        setNotice('Signed in successfully.')
      }

      setPassword('')
    } catch (submitError) {
      setError(formatError(submitError))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleSignOut() {
    setIsSubmitting(true)
    setError(null)
    setNotice(null)

    try {
      await signOutFirebase()
      setCurrentEmail(null)
      setNotice('Signed out successfully.')
    } catch (signOutError) {
      setError(formatError(signOutError))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!firebaseReady) {
    return (
      <section className="account-page" aria-labelledby="accountTitle">
        <header className="account-header">
          <h1 id="accountTitle">Account</h1>
          <p>Firebase Authentication is not configured yet.</p>
        </header>
        <article className="account-card">
          <h2>Required environment variables</h2>
          <p className="muted">
            Add Firebase public keys in your <code>.env</code> file and restart the app.
          </p>
          <ul className="account-env-list">
            <li>VITE_FIREBASE_API_KEY</li>
            <li>VITE_FIREBASE_AUTH_DOMAIN</li>
            <li>VITE_FIREBASE_PROJECT_ID</li>
            <li>VITE_FIREBASE_APP_ID</li>
          </ul>
        </article>
      </section>
    )
  }

  return (
    <section className="account-page" aria-labelledby="accountTitle">
      <header className="account-header">
        <h1 id="accountTitle">Account</h1>
        <p>Email/password authentication powered by Firebase Auth.</p>
      </header>

      <article className="account-card">
        <div className="account-mode-row" role="tablist" aria-label="Authentication mode">
          <button
            type="button"
            className={mode === 'sign-in' ? 'active' : ''}
            onClick={() => setMode('sign-in')}
            aria-pressed={mode === 'sign-in'}
          >
            Sign in
          </button>
          <button
            type="button"
            className={mode === 'sign-up' ? 'active' : ''}
            onClick={() => setMode('sign-up')}
            aria-pressed={mode === 'sign-up'}
          >
            Create account
          </button>
        </div>

        {currentEmail ? (
          <p className="ok account-status">Signed in as {currentEmail}</p>
        ) : (
          <p className="account-status muted">You are currently signed out.</p>
        )}

        <form className="account-form" onSubmit={(event) => void handleSubmit(event)}>
          <label>
            Email
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              required
              minLength={6}
              autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Minimum 6 characters"
            />
          </label>
          <div className="account-actions">
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Working...' : mode === 'sign-up' ? 'Create account' : 'Sign in'}
            </button>
            <button type="button" onClick={() => void handleSignOut()} disabled={isSubmitting || !currentEmail}>
              Sign out
            </button>
          </div>
        </form>

        {error ? <p className="error">{error}</p> : null}
        {notice ? <p className="ok">{notice}</p> : null}
      </article>
    </section>
  )
}
