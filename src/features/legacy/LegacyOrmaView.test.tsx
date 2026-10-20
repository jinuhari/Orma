/// <reference types="node" />
import '@testing-library/jest-dom/vitest'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { act, cleanup, render, screen } from '@testing-library/react'
import type { User } from 'firebase/auth'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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

describe('Legacy first-use tasks', () => {
  const html = readFileSync('public/legacy/index.html', 'utf8')
  const script = new DOMParser().parseFromString(html, 'text/html').querySelector('body > script')!.textContent!
  const initialization = script.slice(0, script.indexOf('    let activeArea'))

  function loadTasks() {
    return runInNewContext(`${initialization}\nstore.tasks`, { localStorage, crypto }) as { id: string; title: string }[]
  }

  beforeEach(() => localStorage.clear())

  it('starts without sample tasks when storage is new', () => {
    expect(loadTasks()).toHaveLength(0)
  })

  it('preserves an existing saved task', () => {
    localStorage.setItem('orma.tasks.v5', JSON.stringify({ version: 5, tasks: [{ id: 'saved', title: 'My task', area: 'career' }] }))
    expect(loadTasks()).toMatchObject([{ id: 'saved', title: 'My task' }])
  })

  it('keeps a saved empty map empty even with older task data', () => {
    localStorage.setItem('orma.tasks.v5', JSON.stringify({ version: 5, tasks: [] }))
    localStorage.setItem('orma.tasks.v4', JSON.stringify({ tasks: [{ id: 'old', title: 'Older task', area: 'health' }] }))
    expect(loadTasks()).toHaveLength(0)
  })

  it('preserves migration of existing legacy tasks', () => {
    localStorage.setItem('orma.tasks.v4', JSON.stringify({ tasks: [{ id: 'old', title: 'Older task', area: 'health' }] }))
    expect(loadTasks()).toMatchObject([{ id: 'old', title: 'Older task' }])
  })
})