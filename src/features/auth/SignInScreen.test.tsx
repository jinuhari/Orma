import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { SignInScreen } from './SignInScreen'
import { hasFirebaseConfig } from '../../lib/firebaseClient'
import { resetEmailPassword, signInWithEmailPassword, signInWithGoogle, signUpWithEmailPassword } from '../../services/auth/firebaseAuthService'

vi.mock('../../lib/firebaseClient', () => ({ hasFirebaseConfig: vi.fn(() => true) }))
vi.mock('../../services/auth/firebaseAuthService', () => ({
  isDesktopApp: () => false,
  listenForDesktopSignIn: vi.fn(),
  signInWithGoogle: vi.fn(),
  signInWithEmailPassword: vi.fn(),
  signUpWithEmailPassword: vi.fn(),
  resetEmailPassword: vi.fn(),
}))

function enterCredentials() {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'person@example.com' } })
  fireEvent.change(screen.getByLabelText('Password', { exact: true }), { target: { value: 'test-password' } })
}

describe('SignInScreen', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(hasFirebaseConfig).mockReturnValue(true)
    render(<MemoryRouter><SignInScreen /></MemoryRouter>)
  })
  afterEach(cleanup)

  it('signs in with email and password', async () => {
    enterCredentials()
    fireEvent.click(screen.getByRole('button', { name: 'Sign in with email' }))
    await waitFor(() => expect(signInWithEmailPassword).toHaveBeenCalledWith('person@example.com', 'test-password'))
  })

  it('registers an account and uses new-password autocomplete', async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))
    enterCredentials()
    expect(screen.getByLabelText('Password', { exact: true })).toHaveAttribute('autocomplete', 'new-password')
    fireEvent.click(screen.getAllByRole('button', { name: 'Create account' })[1])
    await waitFor(() => expect(signUpWithEmailPassword).toHaveBeenCalledWith('person@example.com', 'test-password'))
  })

  it('keeps Google sign-in available', async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }))
    await waitFor(() => expect(signInWithGoogle).toHaveBeenCalledOnce())
  })

  it('requests password reset without requiring a password', async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Forgot password?' }))
    expect(screen.queryByLabelText('Password', { exact: true })).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'person@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send reset link' }))
    await waitFor(() => expect(resetEmailPassword).toHaveBeenCalledWith('person@example.com'))
    expect(await screen.findByRole('status')).toHaveTextContent('If an account uses this email')
  })

  it('shows invalid-credential errors and allows retry', async () => {
    vi.mocked(signInWithEmailPassword).mockRejectedValueOnce({ code: 'auth/invalid-credential' })
    enterCredentials()
    fireEvent.click(screen.getByRole('button', { name: 'Sign in with email' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('The email or password is incorrect.')
    expect(screen.getByRole('button', { name: 'Sign in with email' })).toBeEnabled()
  })

  it('prevents competing submissions while signing in', async () => {
    let complete!: () => void
    vi.mocked(signInWithEmailPassword).mockReturnValueOnce(new Promise((resolve) => { complete = () => resolve({} as never) }))
    enterCredentials()
    fireEvent.click(screen.getByRole('button', { name: 'Sign in with email' }))
    expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Please wait...' })).toBeDisabled()
    complete()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Sign in with email' })).toBeEnabled())
  })
})