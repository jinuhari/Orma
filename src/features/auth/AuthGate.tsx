import { useEffect, useState, type FormEvent, type ReactNode } from 'react'

import { hasFirebaseConfig } from '../../lib/firebaseClient'
import {
  onFirebaseAuthStateChanged,
  signInWithEmailPassword,
  signInWithGoogle,
  signUpWithEmailPassword,
} from '../../services/auth/firebaseAuthService'

type AuthMode = 'sign-in' | 'sign-up'

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message.replace(/^Firebase:\s*/i, '')
  return 'We could not sign you in. Please try again.'
}

function SplashScreen() {
  return (
    <main className="orma-splash" aria-label="Loading Orma">
      <div className="splash-mark" aria-hidden="true"><span /><span /><span /></div>
      <p>orma</p>
      <span className="splash-caption">A little space to find your way</span>
    </main>
  )
}

function GoogleMark() {
  return <svg aria-hidden="true" viewBox="0 0 48 48" className="google-mark"><path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.7c3.9-3.6 6-8.9 6-15Z"/><path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.8l-6.7-5.1c-1.8 1.2-4 1.9-6.8 1.9-5.3 0-9.9-3.6-11.5-8.4H5.6v5.3A20 20 0 0 0 24 44Z"/><path fill="#FBBC05" d="M12.5 27.6a12 12 0 0 1 0-7.2v-5.3H5.6a20 20 0 0 0 0 17.8l6.9-5.3Z"/><path fill="#EA4335" d="M24 12c3 0 5.7 1 7.8 3.1l5.9-5.9A19.7 19.7 0 0 0 24 4 20 20 0 0 0 5.6 15.1l6.9 5.3C14.1 15.6 18.7 12 24 12Z"/></svg>
}

function SignInScreen() {
  const [mode, setMode] = useState<AuthMode>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const firebaseReady = hasFirebaseConfig()

  async function runAuth(action: () => Promise<unknown>) {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void runAuth(() => mode === 'sign-up'
      ? signUpWithEmailPassword(email.trim(), password)
      : signInWithEmailPassword(email.trim(), password))
  }

  return (
    <main className="auth-screen">
      <section className="auth-story" aria-label="Welcome to Orma">
        <div className="auth-brand"><span className="brand-glyph" aria-hidden="true">o</span> orma</div>
        <div className="story-copy">
          <span className="eyebrow">MAKE ROOM FOR WHAT MATTERS</span>
          <h1>Your life,<br /><em>in better balance.</em></h1>
          <p>A calmer place to bring your plans, priorities, and the people you care about into focus.</p>
        </div>
        <div className="orbit-art" aria-hidden="true">
          <div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="orbit orbit-three" />
          <span className="orbit-dot dot-one" /><span className="orbit-dot dot-two" /><span className="orbit-dot dot-three" />
          <span className="orbit-center">O</span>
          <span className="orbit-label label-career">CAREER</span><span className="orbit-label label-health">HEALTH</span>
          <span className="orbit-label label-money">MONEY</span><span className="orbit-label label-family">FAMILY</span>
        </div>
        <div className="story-foot"><span>01 / YOUR PERSONAL SPACE</span><span>DESIGNED FOR REAL LIFE</span></div>
      </section>

      <section className="auth-panel">
        <div className="auth-panel-top"><span>Already have a space?</span><button type="button" onClick={() => setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')}>{mode === 'sign-in' ? 'Create account' : 'Sign in'}</button></div>
        <div className="auth-form-wrap">
          <div className="mobile-brand"><span className="brand-glyph" aria-hidden="true">o</span> orma</div>
          <span className="eyebrow form-eyebrow">WELCOME TO ORMA</span>
          <h2>{mode === 'sign-in' ? 'Come on in.' : 'Start your space.'}</h2>
          <p className="auth-intro">{mode === 'sign-in' ? 'Sign in to pick up where you left off.' : 'Create an account and make room for what matters.'}</p>

          <button className="google-signin" type="button" disabled={busy || !firebaseReady} onClick={() => void runAuth(signInWithGoogle)}>
            <GoogleMark />{busy ? 'Please wait…' : 'Continue with Google'}
          </button>
          <div className="auth-divider"><span />or continue with email<span /></div>
          <form className="signin-form" onSubmit={submit}>
            <label>Email address<input disabled={!firebaseReady || busy} type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label>
            <label>Password<input disabled={!firebaseReady || busy} type="password" autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'} minLength={6} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" /></label>
            <button className="email-submit" type="submit" disabled={busy || !firebaseReady}>{busy ? 'Please wait…' : mode === 'sign-in' ? 'Sign in' : 'Create account'}<span aria-hidden="true">↗</span></button>
          </form>
          {error ? <p className="auth-error" role="alert">{error}</p> : null}
          {!firebaseReady ? (
            <div className="firebase-setup" role="status">
              <strong>Connect Firebase to enable sign-in</strong>
              <p>Add your Firebase web app values to <code>.env</code>, then restart the dev server.</p>
              <ul><li>VITE_FIREBASE_API_KEY</li><li>VITE_FIREBASE_AUTH_DOMAIN</li><li>VITE_FIREBASE_PROJECT_ID</li><li>VITE_FIREBASE_APP_ID</li></ul>
            </div>
          ) : null}
          <p className="auth-terms">By continuing, you agree to keep this space kind, useful, and yours.</p>
        </div>
        <div className="auth-panel-foot"><span>© ORMA</span><span>YOUR LIFE IN VIEW</span></div>
      </section>
    </main>
  )
}

export function AuthGate({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<unknown>(null)
  const [authResolved, setAuthResolved] = useState(false)
  const [splashResolved, setSplashResolved] = useState(false)
  const firebaseReady = hasFirebaseConfig()

  useEffect(() => {
    const splashTimer = window.setTimeout(() => setSplashResolved(true), 850)
    if (!firebaseReady) {
      setAuthResolved(true)
      return () => window.clearTimeout(splashTimer)
    }
    const unsubscribe = onFirebaseAuthStateChanged((nextUser) => {
      setUser(nextUser)
      setAuthResolved(true)
    })
    return () => {
      window.clearTimeout(splashTimer)
      unsubscribe()
    }
  }, [firebaseReady])

  if (!splashResolved || !authResolved) return <SplashScreen />
  return user ? <>{children}</> : <SignInScreen />
}
