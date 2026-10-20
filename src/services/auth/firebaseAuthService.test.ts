import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { signOutCleanup } from '../sync/cloudSync'
import { resetEmailPassword, signInWithEmailPassword, signOutFirebase, signUpWithEmailPassword } from './firebaseAuthService'

vi.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: vi.fn(),
  GoogleAuthProvider: vi.fn(),
  onAuthStateChanged: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signInWithCredential: vi.fn(),
  signInWithPopup: vi.fn(),
  signInWithRedirect: vi.fn(),
  signOut: vi.fn(),
}))
vi.mock('../../lib/firebaseClient', () => ({ getFirebaseAuth: () => 'auth-instance' }))
vi.mock('../sync/cloudSync', () => ({ signOutCleanup: vi.fn() }))

describe('Firebase account actions', () => {
  beforeEach(() => vi.resetAllMocks())

  it('trims the email but preserves the password on sign-in', async () => {
    await signInWithEmailPassword(' person@example.com ', ' password ')
    expect(signInWithEmailAndPassword).toHaveBeenCalledWith('auth-instance', 'person@example.com', ' password ')
  })

  it('creates email/password accounts with Firebase', async () => {
    await signUpWithEmailPassword(' person@example.com ', ' password ')
    expect(createUserWithEmailAndPassword).toHaveBeenCalledWith('auth-instance', 'person@example.com', ' password ')
  })

  it('sends password reset requests through Firebase', async () => {
    await resetEmailPassword(' person@example.com ')
    expect(sendPasswordResetEmail).toHaveBeenCalledWith('auth-instance', 'person@example.com')
  })

  it('waits for sync cleanup before signing out', async () => {
    let finishCleanup!: () => void
    vi.mocked(signOutCleanup).mockReturnValueOnce(new Promise((resolve) => { finishCleanup = resolve }))
    const logout = signOutFirebase()
    expect(signOut).not.toHaveBeenCalled()
    finishCleanup()
    await logout
    expect(signOut).toHaveBeenCalledWith('auth-instance')
  })

  it('does not sign out when cleanup throws', async () => {
    vi.mocked(signOutCleanup).mockRejectedValueOnce(new Error('Storage failed'))
    await expect(signOutFirebase()).rejects.toThrow('Storage failed')
    expect(signOut).not.toHaveBeenCalled()
  })
})