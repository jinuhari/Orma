import { useEffect, useState, useSyncExternalStore } from 'react'
import type { User } from 'firebase/auth'

import { onFirebaseAuthStateChanged, signOutFirebase } from '../../services/auth/firebaseAuthService'
import { getSyncStatus, getSyncStatusDetail, subscribeSyncStatus } from '../../services/sync/cloudSync'

export function AccountPage() {
  const [user, setUser] = useState<User | null>(null)
  const [busy, setBusy] = useState(false)
  const status = useSyncExternalStore(subscribeSyncStatus, getSyncStatus)
  const detail = useSyncExternalStore(subscribeSyncStatus, getSyncStatusDetail)

  useEffect(() => onFirebaseAuthStateChanged(setUser), [])

  async function handleSignOut() {
    setBusy(true)
    try {
      await signOutFirebase()
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="account-page" aria-labelledby="accountTitle">
      <header className="account-header">
        <h1 id="accountTitle">Account</h1>
        <p>Your map is saved to your Google account and follows you to every device.</p>
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
          {detail || (status === 'synced' ? 'All changes saved to your Google account.' : 'Syncing…')}
        </p>
        <div className="account-actions">
          <button type="button" onClick={() => void handleSignOut()} disabled={busy}>
            {busy ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </article>
    </section>
  )
}
