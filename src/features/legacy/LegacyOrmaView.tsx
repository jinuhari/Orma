import { useEffect, useState } from 'react'

import { env } from '../../lib/env'
import { onFirebaseAuthStateChanged, signOutFirebase } from '../../services/auth/firebaseAuthService'
import { getLinkStatus, relayConfigured, startLink, unlinkWhatsApp } from '../../services/whatsapp/relayClient'
import {
  CLOUD_UPDATED_EVENT,
  getSyncStatus,
  getSyncStatusDetail,
  subscribeSyncStatus,
  type SyncStatus,
} from '../../services/sync/cloudSync'

const FRAME_SAFE_KEYS = new Set(['orma.tasks.v5', 'orma.profile.image.v2'])

const STATUS_LABEL: Record<SyncStatus, string> = {
  idle: 'Not syncing',
  syncing: 'Syncing…',
  synced: 'Saved to your Orma account',
  offline: 'Offline · changes sync when you reconnect',
  error: 'Sync paused',
}

// The classic map UI lives in an iframe; it reads account info and signs out through this bridge.
function publishHost(email: string | null) {
  window.ormaHost = {
    email,
    getStatus: () => ({
      status: getSyncStatus(),
      label: STATUS_LABEL[getSyncStatus()],
      detail: getSyncStatusDetail(),
    }),
    subscribe: subscribeSyncStatus,
    signOut: () => signOutFirebase(),
    whatsapp: {
      available: Boolean(email) && relayConfigured(),
      getStatus: getLinkStatus,
      start: startLink,
      unlink: unlinkWhatsApp,
    },
  }
}

export function LegacyOrmaView() {
  const [hostReady, setHostReady] = useState(env.demoMode)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (env.demoMode) return
    const unsubscribe = onFirebaseAuthStateChanged((user) => {
      publishHost(user?.email ?? null)
      setHostReady(true)
    })
    return () => {
      unsubscribe()
      delete window.ormaHost
    }
  }, [])

  useEffect(() => {
    const onCloudUpdate = (event: Event) => {
      const keys = (event as CustomEvent<{ keys: string[] }>).detail?.keys ?? []
      // Tasks and the photo refresh live through the map's own storage listener.
      if (keys.some((key) => !FRAME_SAFE_KEYS.has(key))) setReloadKey((value) => value + 1)
    }
    window.addEventListener(CLOUD_UPDATED_EVENT, onCloudUpdate)
    return () => window.removeEventListener(CLOUD_UPDATED_EVENT, onCloudUpdate)
  }, [])

  return (
    <section className="legacy-view" aria-label="Orma map view">
      {hostReady ? <iframe
        key={reloadKey}
        className="legacy-frame"
        title="Orma Legacy Application"
        src="/legacy/index.html"
      /> : null}
    </section>
  )
}
