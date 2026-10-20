import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'

import { BrandLogo } from '../../components/brand/BrandLogo'
import { OrmaMark } from '../../components/brand/OrmaMark'
import { hasFirebaseConfig } from '../../lib/firebaseClient'
import { isStandalone } from '../../lib/platform'
import {
  isDesktopApp,
  listenForDesktopSignIn,
  resetEmailPassword,
  signInWithEmailPassword,
  signInWithGoogle,
  signUpWithEmailPassword,
} from '../../services/auth/firebaseAuthService'

const QUIET_ERROR_CODES = new Set(['auth/popup-closed-by-user', 'auth/cancelled-popup-request'])

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48" className="google-mark">
      <path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.7c3.9-3.6 6-8.9 6-15Z" />
      <path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.8l-6.7-5.1c-1.8 1.2-4 1.9-6.8 1.9-5.3 0-9.9-3.6-11.5-8.4H5.6v5.3A20 20 0 0 0 24 44Z" />
      <path fill="#FBBC05" d="M12.5 27.6a12 12 0 0 1 0-7.2v-5.3H5.6a20 20 0 0 0 0 17.8l6.9-5.3Z" />
      <path fill="#EA4335" d="M24 12c3 0 5.7 1 7.8 3.1l5.9-5.9A19.7 19.7 0 0 0 24 4 20 20 0 0 0 5.6 15.1l6.9 5.3C14.1 15.6 18.7 12 24 12Z" />
    </svg>
  )
}

function friendlyError(error: unknown) {
  const code = (error as { code?: string } | null)?.code
  if (code && QUIET_ERROR_CODES.has(code)) return null
  if (code === 'auth/unauthorized-domain') {
    return 'This address is not authorised for Google sign-in yet. Add it in Firebase Authentication settings.'
  }
  if (code === 'auth/operation-not-allowed') {
    return 'This sign-in method is not enabled for this project yet.'
  }
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') return 'The email or password is incorrect.'
  if (code === 'auth/email-already-in-use') return 'This email already has an account. Sign in or reset your password.'
  if (code === 'auth/invalid-email') return 'Enter a valid email address.'
  if (code === 'auth/weak-password' || code === 'auth/password-does-not-meet-requirements') return 'Choose a stronger password with uppercase, lowercase, a number, and a symbol.'
  if (code === 'auth/too-many-requests') return 'Too many attempts. Please wait a few minutes and try again.'
  if (code === 'auth/network-request-failed') return 'You appear to be offline. Check your connection and try again.'
  if (error instanceof Error) return error.message.replace(/^Firebase:\s*/i, '')
  return 'We could not sign you in. Please try again.'
}

export function SignInScreen() {
  const [pending, setPending] = useState<'google' | 'email' | null>(null)
  const [mode, setMode] = useState<'sign-in' | 'sign-up' | 'reset'>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [waitingForBrowser, setWaitingForBrowser] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const busy = pending !== null
  const firebaseReady = hasFirebaseConfig()
  const desktop = isDesktopApp()

  useEffect(() => {
    if (!desktop) return
    return listenForDesktopSignIn((message) => {
      setError(message)
      setWaitingForBrowser(false)
    })
  }, [desktop])

  async function continueWithGoogle() {
    setPending('google')
    setError(null)
    setNotice(null)
    try {
      await signInWithGoogle()
      if (desktop) setWaitingForBrowser(true)
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setPending(null)
    }
  }

  function changeMode(next: typeof mode) {
    setMode(next)
    setPassword('')
    setShowPassword(false)
    setError(null)
    setNotice(null)
    setWaitingForBrowser(false)
  }

  async function submitEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || !firebaseReady) return
    setPending('email')
    setError(null)
    setNotice(null)
    setWaitingForBrowser(false)
    try {
      if (mode === 'reset') {
        await resetEmailPassword(email)
        setNotice('If an account uses this email, a password reset link will arrive shortly. Check your inbox and spam folder.')
      } else if (mode === 'sign-up') {
        await signUpWithEmailPassword(email, password)
      } else {
        await signInWithEmailPassword(email, password)
      }
    } catch (err) {
      if (mode === 'reset' && (err as { code?: string })?.code === 'auth/user-not-found') {
        setNotice('If an account uses this email, a password reset link will arrive shortly. Check your inbox and spam folder.')
      } else {
        setError(friendlyError(err))
      }
    } finally {
      setPending(null)
    }
  }

  return (
    <main className="entry-screen">
      <BrandLogo />
      <section className="entry-stage" aria-hidden="true">
        <OrmaMark className="stage-map" />
      </section>

      <section className="entry-panel" aria-labelledby="signInTitle">
        <div className="entry-card">
          <span className="entry-eyebrow">WELCOME</span>
          <h1 id="signInTitle">{mode === 'reset' ? 'Reset your password' : mode === 'sign-up' ? 'Create your account' : 'Sign in to Orma'}</h1>
          <p className="entry-lede">
            Your life, in better balance.
          </p>

          <button
            className="google-button"
            type="button"
            disabled={busy || !firebaseReady}
            onClick={() => void continueWithGoogle()}
          >
            <span className="google-badge">
              <GoogleMark />
            </span>
            <span>{pending === 'google' ? 'Opening Google…' : 'Continue with Google'}</span>
          </button>

          <div className="auth-divider">or with email</div>
          <div className="auth-modes" role="group" aria-label="Email authentication">
            <button type="button" aria-pressed={mode === 'sign-in'} disabled={busy} onClick={() => changeMode('sign-in')}>Sign in</button>
            <button type="button" aria-pressed={mode === 'sign-up'} disabled={busy} onClick={() => changeMode('sign-up')}>Create account</button>
          </div>
          <form className="auth-form" onSubmit={(event) => void submitEmail(event)}>
            <label htmlFor="authEmail">Email</label>
            <input id="authEmail" name="email" type="email" autoComplete="email" required value={email} disabled={busy} onChange={(event) => setEmail(event.target.value)} />
            {mode !== 'reset' ? (
              <>
                <label htmlFor="authPassword">Password</label>
                <input id="authPassword" name="password" type={showPassword ? 'text' : 'password'} autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'} minLength={mode === 'sign-up' ? 6 : undefined} required value={password} disabled={busy} onChange={(event) => setPassword(event.target.value)} />
                <label className="auth-show-password"><input type="checkbox" checked={showPassword} onChange={(event) => setShowPassword(event.target.checked)} />Show password</label>
              </>
            ) : null}
            <button className="auth-submit" type="submit" disabled={busy || !firebaseReady}>
              {pending === 'email' ? 'Please wait...' : mode === 'reset' ? 'Send reset link' : mode === 'sign-up' ? 'Create account' : 'Sign in with email'}
            </button>
            {mode === 'sign-in' ? <button className="auth-reset" type="button" disabled={busy} onClick={() => changeMode('reset')}>Forgot password?</button> : null}
          </form>
          {notice ? <p className="entry-note" role="status">{notice}</p> : null}

          {waitingForBrowser ? (
            <p className="entry-note" role="status">
              Finish signing in in the browser window that just opened. Orma will unlock here
              automatically.
            </p>
          ) : null}
          {error ? (
            <p className="entry-error" role="alert">
              {error}
            </p>
          ) : null}

          {!firebaseReady ? (
            <div className="entry-setup" role="status">
              <strong>Connect Firebase to enable sign-in</strong>
              <p>Add your Firebase web app values to .env, then restart the dev server.</p>
              <code>VITE_FIREBASE_API_KEY · AUTH_DOMAIN · PROJECT_ID · APP_ID</code>
            </div>
          ) : null}

        </div>

        <div className="entry-foot">
          {desktop || isStandalone() ? <span>ORMA APP</span> : <Link to="/">Get the app</Link>}
          <span>YOUR LIFE IN VIEW</span>
        </div>
      </section>
    </main>
  )
}
