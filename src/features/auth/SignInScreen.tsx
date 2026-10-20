import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { BrandLogo } from '../../components/brand/BrandLogo'
import { OrmaMark } from '../../components/brand/OrmaMark'
import { hasFirebaseConfig } from '../../lib/firebaseClient'
import { isStandalone } from '../../lib/platform'
import {
  isDesktopApp,
  listenForDesktopSignIn,
  signInWithGoogle,
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
    return 'Google sign-in is not switched on for this project yet.'
  }
  if (code === 'auth/network-request-failed') return 'You appear to be offline. Check your connection and try again.'
  if (error instanceof Error) return error.message.replace(/^Firebase:\s*/i, '')
  return 'We could not sign you in. Please try again.'
}

export function SignInScreen() {
  const [busy, setBusy] = useState(false)
  const [waitingForBrowser, setWaitingForBrowser] = useState(false)
  const [error, setError] = useState<string | null>(null)
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
    setBusy(true)
    setError(null)
    try {
      await signInWithGoogle()
      if (desktop) setWaitingForBrowser(true)
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setBusy(false)
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
          <h1 id="signInTitle">
            Your life,
            <br />
            <em>in better balance.</em>
          </h1>
          <p className="entry-lede">
            Sign in with Google and your map, tasks and finances follow you to every device you use.
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
            <span>{busy ? 'Opening Google…' : 'Continue with Google'}</span>
          </button>

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

          <ul className="entry-points">
            <li>Saved to your Google account, not to one device</li>
            <li>Same map on Mac, Windows, iPhone, iPad and Android</li>
          </ul>
        </div>

        <div className="entry-foot">
          {desktop || isStandalone() ? <span>ORMA APP</span> : <Link to="/">Get the app</Link>}
          <span>YOUR LIFE IN VIEW</span>
        </div>
      </section>
    </main>
  )
}
