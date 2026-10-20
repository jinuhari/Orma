import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
  type UserCredential,
} from 'firebase/auth'

import { env } from '../../lib/env'
import { getFirebaseAuth } from '../../lib/firebaseClient'
import { signOutCleanup } from '../sync/cloudSync'

export interface DesktopAuthPayload {
  state: string
  idToken: string
  accessToken: string | null
}

const REDIRECT_FALLBACK_CODES = new Set([
  'auth/popup-blocked',
  'auth/operation-not-supported-in-this-environment',
])

let pendingDesktopState: string | null = null

function googleProvider() {
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  return provider
}

export function isDesktopApp() {
  return typeof window !== 'undefined' && Boolean(window.ormaDesktop?.isDesktop)
}

export function publicAppUrl() {
  if (env.publicAppUrl) return env.publicAppUrl.replace(/\/+$/, '')
  return `https://${env.firebaseProjectId}.web.app`
}

export async function signInWithGoogle(): Promise<UserCredential | null> {
  if (isDesktopApp()) {
    // Google refuses embedded browsers, so sign-in happens in the user's real browser.
    pendingDesktopState = crypto.randomUUID()
    await window.ormaDesktop!.openExternal(
      `${publicAppUrl()}/desktop-sign-in?state=${pendingDesktopState}`,
    )
    return null
  }

  const auth = getFirebaseAuth()
  try {
    return await signInWithPopup(auth, googleProvider())
  } catch (error) {
    const code = (error as { code?: string } | null)?.code
    if (code && REDIRECT_FALLBACK_CODES.has(code)) {
      await signInWithRedirect(auth, googleProvider())
      return null
    }
    throw error
  }
}

// Used by the browser tab that finishes a desktop sign-in and hands the credential back.
export async function signInForDesktopHandoff() {
  const result = await signInWithPopup(getFirebaseAuth(), googleProvider())
  const credential = GoogleAuthProvider.credentialFromResult(result)
  if (!credential?.idToken) throw new Error('Google did not return a sign-in token.')
  return {
    idToken: credential.idToken,
    accessToken: credential.accessToken ?? null,
    email: result.user.email,
  }
}

export function listenForDesktopSignIn(onError: (message: string) => void) {
  const bridge = window.ormaDesktop
  if (!bridge) return () => {}

  return bridge.onAuthCallback(async (payload) => {
    if (!pendingDesktopState || payload.state !== pendingDesktopState) {
      onError('That sign-in link has expired. Please try again.')
      return
    }
    pendingDesktopState = null
    try {
      const credential = GoogleAuthProvider.credential(payload.idToken, payload.accessToken)
      await signInWithCredential(getFirebaseAuth(), credential)
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Sign-in could not be completed.')
    }
  })
}

export async function signOutFirebase() {
  await signOutCleanup()
  return signOut(getFirebaseAuth())
}

export function onFirebaseAuthStateChanged(callback: (user: User | null) => void) {
  return onAuthStateChanged(getFirebaseAuth(), callback)
}
