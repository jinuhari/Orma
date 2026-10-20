import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type Unsubscribe,
} from 'firebase/firestore'

import { getFirebaseDb } from '../../lib/firebaseClient'

// Everything the app persists locally that should follow the Google account.
export const SYNCED_KEYS = [
  'orma.tasks.v5',
  'orma.map.layout.v1',
  'orma.finance.entries.v1',
  'orma.settings.v1',
  'orma.profile.image.v2',
  'orma.whatsapp.bot-number.v1',
] as const

export const CLOUD_UPDATED_EVENT = 'orma:cloud-updated'

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'error'

export interface CloudSyncSession {
  ready: Promise<void>
  flush: () => Promise<boolean>
  stop: () => void
}

const OWNER_KEY = 'orma.sync.owner'
const DEVICE_KEY = 'orma.sync.device'
const READY_TIMEOUT_MS = 7000
const PUSH_INTERVAL_MS = 5000
const PUSH_DEBOUNCE_MS = 600
// Firestore documents max out at 1 MiB; the security rules cap values slightly lower.
const MAX_VALUE_LENGTH = 850_000

const syncedKeySet = new Set<string>(SYNCED_KEYS)

let status: SyncStatus = 'idle'
let statusDetail = ''
const statusListeners = new Set<() => void>()
let activeSession: CloudSyncSession | null = null

export function getSyncStatus() {
  return status
}

export function getSyncStatusDetail() {
  return statusDetail
}

export function subscribeSyncStatus(listener: () => void) {
  statusListeners.add(listener)
  return () => {
    statusListeners.delete(listener)
  }
}

function setStatus(next: SyncStatus, detail = '') {
  if (status === next && statusDetail === detail) return
  status = next
  statusDetail = detail
  statusListeners.forEach((listener) => listener())
}

function readLocal(key: string) {
  try {
    return localStorage.getItem(key) ?? ''
  } catch {
    return ''
  }
}

function writeLocal(key: string, value: string) {
  try {
    if (value) localStorage.setItem(key, value)
    else localStorage.removeItem(key)
  } catch {
    // Storage may be unavailable (private mode); the cloud copy still exists.
  }
}

function deviceId() {
  try {
    let id = localStorage.getItem(DEVICE_KEY)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(DEVICE_KEY, id)
    }
    return id
  } catch {
    return 'unknown-device'
  }
}

export function clearLocalOrmaData() {
  SYNCED_KEYS.forEach((key) => writeLocal(key, ''))
  try {
    localStorage.removeItem(OWNER_KEY)
  } catch {
    // ignore
  }
}

function errorDetail(error: unknown) {
  const code = (error as { code?: string } | null)?.code
  if (code === 'permission-denied') {
    return 'Cloud storage rejected the request. Check the Firestore rules.'
  }
  if (code === 'failed-precondition' || code === 'unavailable') {
    return 'Cloud storage is not reachable yet. Changes stay on this device until it is.'
  }
  return error instanceof Error ? error.message : 'Cloud sync failed.'
}

export function startCloudSync(uid: string): CloudSyncSession {
  activeSession?.stop()

  // Never let one account's data bleed into another on a shared device.
  try {
    const owner = localStorage.getItem(OWNER_KEY)
    if (owner && owner !== uid) clearLocalOrmaData()
    localStorage.setItem(OWNER_KEY, uid)
  } catch {
    // ignore
  }

  setStatus('syncing')

  const store = collection(getFirebaseDb(), 'users', uid, 'store')
  const device = deviceId()
  const known = new Map<string, string>()
  let hydrated = false
  let readyResolved = false
  let stopped = false
  let chain: Promise<boolean> = Promise.resolve(true)
  let debounce: number | undefined
  let resolveReady: () => void = () => {}
  const ready = new Promise<void>((resolve) => {
    resolveReady = resolve
  })

  function markReady() {
    if (readyResolved) return
    readyResolved = true
    resolveReady()
  }

  async function pushOnce() {
    if (!hydrated || stopped) return hydrated
    let ok = true
    for (const key of SYNCED_KEYS) {
      const local = readLocal(key)
      const previous = known.get(key)
      if (local === (previous ?? '')) continue
      if (local.length > MAX_VALUE_LENGTH) {
        known.set(key, local)
        console.warn(`[orma sync] ${key} is too large to sync and was kept on this device.`)
        continue
      }
      known.set(key, local)
      try {
        await setDoc(doc(store, key), { value: local, updatedAt: serverTimestamp(), device })
      } catch (error) {
        if (previous === undefined) known.delete(key)
        else known.set(key, previous)
        setStatus('error', errorDetail(error))
        ok = false
      }
    }
    if (ok) setStatus('synced')
    return ok
  }

  function flush() {
    chain = chain.then(pushOnce, pushOnce)
    return chain
  }

  function schedulePush() {
    window.clearTimeout(debounce)
    debounce = window.setTimeout(() => void flush(), PUSH_DEBOUNCE_MS)
  }

  const onStorage = (event: StorageEvent) => {
    if (event.key === null || syncedKeySet.has(event.key)) schedulePush()
  }
  const onHide = () => {
    if (document.visibilityState === 'hidden') void flush()
  }
  const interval = window.setInterval(() => void flush(), PUSH_INTERVAL_MS)
  window.addEventListener('storage', onStorage)
  window.addEventListener('pagehide', onHide)
  document.addEventListener('visibilitychange', onHide)

  const readyTimer = window.setTimeout(() => {
    if (!hydrated) setStatus('offline', 'Working offline. Changes sync when you reconnect.')
    markReady()
  }, READY_TIMEOUT_MS)

  const unsubscribe: Unsubscribe = onSnapshot(
    store,
    { includeMetadataChanges: true },
    (snapshot) => {
      if (stopped) return
      if (snapshot.metadata.fromCache && !hydrated) return

      const remote = new Map<string, string>()
      snapshot.forEach((item) => {
        const value = item.data().value
        if (syncedKeySet.has(item.id) && typeof value === 'string') remote.set(item.id, value)
      })

      const changedKeys: string[] = []
      for (const key of SYNCED_KEYS) {
        const remoteValue = remote.get(key)
        const local = readLocal(key)

        if (!hydrated) {
          if (remoteValue === undefined) {
            known.set(key, '')
          } else {
            known.set(key, remoteValue)
            if (local !== remoteValue) {
              writeLocal(key, remoteValue)
              changedKeys.push(key)
            }
          }
        } else if (remoteValue !== undefined && remoteValue !== known.get(key)) {
          const untouchedLocally = local === (known.get(key) ?? '')
          known.set(key, remoteValue)
          if (untouchedLocally && local !== remoteValue) {
            writeLocal(key, remoteValue)
            changedKeys.push(key)
          }
        }
      }

      // The UI already rendered from local data, so it must reload to show cloud changes.
      const alreadyRendered = readyResolved
      hydrated = true
      window.clearTimeout(readyTimer)
      setStatus('synced')
      markReady()

      if (changedKeys.length && alreadyRendered) {
        window.dispatchEvent(new CustomEvent(CLOUD_UPDATED_EVENT, { detail: { keys: changedKeys } }))
      }
      // Upload anything local that the cloud does not have yet.
      void flush()
    },
    (error) => {
      setStatus('error', errorDetail(error))
      window.clearTimeout(readyTimer)
      markReady()
    },
  )

  const session: CloudSyncSession = {
    ready,
    flush,
    stop() {
      if (stopped) return
      stopped = true
      window.clearInterval(interval)
      window.clearTimeout(debounce)
      window.clearTimeout(readyTimer)
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('pagehide', onHide)
      document.removeEventListener('visibilitychange', onHide)
      unsubscribe()
      if (activeSession === session) activeSession = null
      setStatus('idle')
    },
  }

  activeSession = session
  return session
}

// Uploads pending changes, then wipes this device so the next person starts clean.
export async function signOutCleanup() {
  const session = activeSession
  if (!session) return
  const flushed = await Promise.race([
    session.flush(),
    new Promise<boolean>((resolve) => window.setTimeout(() => resolve(false), 4000)),
  ])
  session.stop()
  if (flushed) clearLocalOrmaData()
}
