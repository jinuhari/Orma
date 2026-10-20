import type { DesktopAuthPayload } from '../services/auth/firebaseAuthService'

declare global {
  interface Window {
    ormaDesktop?: {
      isDesktop: true
      platform: string
      openExternal: (url: string) => Promise<void>
      onAuthCallback: (handler: (payload: DesktopAuthPayload) => void) => () => void
    }
    ormaHost?: {
      email: string | null
      getStatus: () => { status: string; label: string; detail: string }
      subscribe: (listener: () => void) => () => void
      signOut: () => Promise<void>
      whatsapp?: {
        available: boolean
        getStatus: () => Promise<{ linked: boolean; number: string | null }>
        start: () => Promise<{
          linked: boolean
          number?: string
          code?: string
          expiresInSeconds?: number
          waLink?: string
        }>
        unlink: () => Promise<{ linked: boolean; number: string | null }>
      }
    }
  }
}

export {}
