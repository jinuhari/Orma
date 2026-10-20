import { beforeEach, describe, expect, it, vi } from 'vitest'

const cloud = vi.hoisted(() => ({ docs: new Map<string, string>() }))

vi.mock('firebase/firestore', () => ({
  collection: () => ({}),
  doc: (_store: unknown, key: string) => ({ key }),
  serverTimestamp: () => 'server-time',
  setDoc: async (ref: { key: string }, data: { value: string }) => {
    cloud.docs.set(ref.key, data.value)
  },
  onSnapshot: (_store: unknown, _options: unknown, next: (snapshot: unknown) => void) => {
    queueMicrotask(() =>
      next({
        metadata: { fromCache: false },
        forEach: (visit: (item: { id: string; data: () => { value: string } }) => void) =>
          cloud.docs.forEach((value, id) => visit({ id, data: () => ({ value }) })),
      }),
    )
    return () => {}
  },
}))

vi.mock('../../lib/firebaseClient', () => ({ getFirebaseDb: () => ({}) }))

import { signOutCleanup, startCloudSync } from './cloudSync'

const TASKS = 'orma.tasks.v5'

describe('cloud sync', () => {
  beforeEach(() => {
    cloud.docs.clear()
    localStorage.clear()
  })

  it('loads the account data from the cloud before the app renders', async () => {
    cloud.docs.set(TASKS, '{"cloud":true}')
    localStorage.setItem(TASKS, '{"stale":true}')

    const session = startCloudSync('uid-1')
    await session.ready

    expect(localStorage.getItem(TASKS)).toBe('{"cloud":true}')
    session.stop()
  })

  it('uploads existing device data when the account has nothing saved yet', async () => {
    localStorage.setItem(TASKS, '{"local":true}')

    const session = startCloudSync('uid-1')
    await session.ready
    await session.flush()

    expect(cloud.docs.get(TASKS)).toBe('{"local":true}')
    session.stop()
  })

  it('uploads later edits made on this device', async () => {
    const session = startCloudSync('uid-1')
    await session.ready

    localStorage.setItem(TASKS, '{"edited":true}')
    await session.flush()

    expect(cloud.docs.get(TASKS)).toBe('{"edited":true}')
    session.stop()
  })

  it('never mixes data between two accounts on the same device', async () => {
    localStorage.setItem(TASKS, '{"alice":true}')
    localStorage.setItem('orma.sync.owner', 'alice')

    const session = startCloudSync('bob')
    await session.ready
    await session.flush()

    expect(localStorage.getItem(TASKS)).toBeNull()
    expect(cloud.docs.has(TASKS)).toBe(false)
    session.stop()
  })

  it('wipes this device after a successful sign-out upload', async () => {
    const session = startCloudSync('uid-1')
    await session.ready
    localStorage.setItem(TASKS, '{"mine":true}')

    await signOutCleanup()

    expect(cloud.docs.get(TASKS)).toBe('{"mine":true}')
    expect(localStorage.getItem(TASKS)).toBeNull()
  })
})
