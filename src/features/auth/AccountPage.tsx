import { useEffect, useState, useSyncExternalStore } from 'react'
import type { User } from 'firebase/auth'

import { onFirebaseAuthStateChanged, signOutFirebase } from '../../services/auth/firebaseAuthService'
import { getSyncStatus, getSyncStatusDetail, subscribeSyncStatus } from '../../services/sync/cloudSync'

export function AccountPage() {
  const [user, setUser] = useState<User | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const status = useSyncExternalStore(subscribeSyncStatus, getSyncStatus)
  const detail = useSyncExternalStore(subscribeSyncStatus, getSyncStatusDetail)

  useEffect(() => onFirebaseAuthStateChanged(setUser), [])

  async function handleSignOut() {
    setBusy(true)
    setError(null)
    try {
      await signOutFirebase()
    } catch {
      setError('Could not log out. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="account-page" aria-labelledby="accountTitle">
      <header className="account-header">
        <h1 id="accountTitle">Account</h1>
        <p>Your Orma account</p>
      </header>

      <article className="account-card">
        <div className="account-identity">
          {user?.photoURL ? (
            <img src={user.photoURL} alt="" referrerPolicy="no-referrer" />
          ) : (
            <span className="account-avatar">{(user?.email ?? 'o').slice(0, 1).toUpperCase()}</span>
          )}
          <div>
            <strong>{user?.displayName ?? 'Signed in'}</strong>
            <span className="muted">{user?.email}</span>
          </div>
        </div>
        <p className={status === 'error' ? 'error' : 'ok account-status'}>
          {detail || (status === 'synced' ? 'All changes saved to your Orma account.' : 'Syncing…')}
        </p>
        <div className="account-actions">
          <button type="button" onClick={() => void handleSignOut()} disabled={busy}>
            {busy ? 'Logging out...' : 'Log out'}
          </button>
        </div>
        {error ? <p className="error" role="alert">{error}</p> : null}
      </article>
    </section>
  )
}
