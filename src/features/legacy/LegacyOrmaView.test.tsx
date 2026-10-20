import '@testing-library/jest-dom/vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import type { User } from 'firebase/auth'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { LegacyOrmaView } from './LegacyOrmaView'
import { onFirebaseAuthStateChanged, signOutFirebase } from '../../services/auth/firebaseAuthService'

vi.mock('../../lib/env', () => ({ env: { demoMode: false } }))
vi.mock('../../services/auth/firebaseAuthService', () => ({
  onFirebaseAuthStateChanged: vi.fn(),
  signOutFirebase: vi.fn(),
}))
vi.mock('../../services/sync/cloudSync', () => ({
  CLOUD_UPDATED_EVENT: 'orma-cloud-updated',
  getSyncStatus: () => 'synced',
  getSyncStatusDetail: () => '',
  subscribeSyncStatus: vi.fn(),
}))

describe('Legacy Settings account bridge', () => {
  afterEach(cleanup)

  it('publishes the account and logout action before loading the iframe', async () => {
    let notifyAuth!: (user: User | null) => void
    const unsubscribe = vi.fn()
    vi.mocked(onFirebaseAuthStateChanged).mockImplementation((callback) => {
      notifyAuth = callback
      return unsubscribe
    })
    const { unmount } = render(<LegacyOrmaView />)
    expect(screen.queryByTitle('Orma Legacy Application')).not.toBeInTheDocument()
    act(() => notifyAuth({ email: 'person@example.com' } as User))
    expect(screen.getByTitle('Orma Legacy Application')).toBeInTheDocument()
    expect(window.ormaHost?.email).toBe('person@example.com')
    expect(window.ormaHost?.getStatus().label).toBe('Saved to your Orma account')
    await window.ormaHost?.signOut()
    expect(signOutFirebase).toHaveBeenCalledOnce()
    unmount()
    expect(window.ormaHost).toBeUndefined()
    expect(unsubscribe).toHaveBeenCalledOnce()
  })
})