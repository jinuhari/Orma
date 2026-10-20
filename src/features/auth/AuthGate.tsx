import { useEffect, useState, type ReactNode } from 'react'
import type { User } from 'firebase/auth'

import { env } from '../../lib/env'
import { hasFirebaseConfig } from '../../lib/firebaseClient'
import { onFirebaseAuthStateChanged } from '../../services/auth/firebaseAuthService'
import { startCloudSync } from '../../services/sync/cloudSync'
import { SignInScreen } from './SignInScreen'
import { SplashScreen } from './SplashScreen'

const MIN_SPLASH_MS = 1800
const SPLASH_FADE_MS = 480

export function AuthGate({ children }: { children: ReactNode }) {
  const firebaseReady = hasFirebaseConfig() && !env.demoMode
  const [user, setUser] = useState<User | null>(null)
  const [authResolved, setAuthResolved] = useState(!firebaseReady)
  const [syncedUid, setSyncedUid] = useState<string | null>(null)
  const [minElapsed, setMinElapsed] = useState(false)
  const [splashGone, setSplashGone] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setMinElapsed(true), MIN_SPLASH_MS)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!firebaseReady) return
    return onFirebaseAuthStateChanged((next) => {
      setUser(next)
      setAuthResolved(true)
    })
  }, [firebaseReady])

  const uid = user?.uid ?? null
  useEffect(() => {
    if (!uid) {
      setSyncedUid(null)
      return
    }
    // The app only renders once this account's cloud data is on the device.
    const session = startCloudSync(uid)
    let cancelled = false
    void session.ready.then(() => {
      if (!cancelled) setSyncedUid(uid)
    })
    return () => {
      cancelled = true
      session.stop()
    }
  }, [uid])

  const ready = minElapsed && authResolved && (!uid || syncedUid === uid)

  useEffect(() => {
    if (!ready) {
      setSplashGone(false)
      return
    }
    const timer = window.setTimeout(() => setSplashGone(true), SPLASH_FADE_MS)
    return () => window.clearTimeout(timer)
  }, [ready])

  return (
    <>
      {ready ? (uid || env.demoMode ? children : <SignInScreen />) : null}
      {splashGone ? null : <SplashScreen leaving={ready} />}
    </>
  )
}
