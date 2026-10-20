import { useState } from 'react'

import { BrandLogo } from '../../components/brand/BrandLogo'
import { OrmaMark } from '../../components/brand/OrmaMark'
import { hasFirebaseConfig } from '../../lib/firebaseClient'
import { signInForDesktopHandoff } from '../../services/auth/firebaseAuthService'

const STATE_PATTERN = /^[0-9a-f-]{36}$/i

// Opened in the user's normal browser by the desktop app; passes the Google credential back via orma://.
export function DesktopSignInPage() {
  const state = new URLSearchParams(window.location.search).get('state') ?? ''
  const validState = STATE_PATTERN.test(state)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [returnUrl, setReturnUrl] = useState<string | null>(null)

  async function continueWithGoogle() {
    setBusy(true)
    setError(null)
    try {
      const result = await signInForDesktopHandoff()
      const params = new URLSearchParams({ state, idToken: result.idToken })
      if (result.accessToken) params.set('accessToken', result.accessToken)
      const url = `orma://auth?${params.toString()}`
      setReturnUrl(url)
      setDone(result.email ?? 'your Google account')
      window.location.assign(url)
    } catch (err) {
      const code = (err as { code?: string } | null)?.code
      if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
        setError(err instanceof Error ? err.message.replace(/^Firebase:\s*/i, '') : 'Sign-in failed.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="entry-screen entry-solo">
      <BrandLogo />
      <section className="entry-card handoff-card" aria-labelledby="handoffTitle">
        <OrmaMark className="handoff-map" />
        <span className="entry-eyebrow">ORMA FOR DESKTOP</span>
        <h1 id="handoffTitle">{done ? 'You are signed in.' : 'Finish signing in.'}</h1>
        <p className="entry-lede">
          {done
            ? `Switch back to the Orma app. It will unlock with ${done}.`
            : 'Choose your Google account to unlock the Orma desktop app.'}
        </p>

        {!validState ? (
          <p className="entry-error" role="alert">
            This page must be opened from the Orma desktop app.
          </p>
        ) : done ? (
          returnUrl ? (
            <a className="google-button" href={returnUrl}>
              <span>Return to Orma</span>
            </a>
          ) : null
        ) : (
          <button
            className="google-button"
            type="button"
            disabled={busy || !hasFirebaseConfig()}
            onClick={() => void continueWithGoogle()}
          >
            <span>{busy ? 'Opening Google…' : 'Continue with Google'}</span>
          </button>
        )}
        {error ? (
          <p className="entry-error" role="alert">
            {error}
          </p>
        ) : null}
      </section>
    </main>
  )
}
