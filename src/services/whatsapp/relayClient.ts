import { env } from '../../lib/env'
import { getFirebaseAuth } from '../../lib/firebaseClient'

export interface LinkStatus {
  linked: boolean
  number: string | null
}

export interface LinkStart {
  linked: boolean
  number?: string
  code?: string
  expiresInSeconds?: number
  waLink?: string
}

export function relayConfigured() {
  return Boolean(env.relayUrl)
}

async function callRelay<T>(path: string, method: 'GET' | 'POST'): Promise<T> {
  const user = getFirebaseAuth().currentUser
  if (!env.relayUrl || !user) throw new Error('Sign in to link WhatsApp.')

  const token = await user.getIdToken()
  let response: Response
  try {
    response = await fetch(`${env.relayUrl.replace(/\/+$/, '')}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}` },
    })
  } catch {
    throw new Error('Could not reach the WhatsApp service. Check your connection and try again.')
  }
  if (response.status === 401) throw new Error('Your session expired. Sign in again.')
  if (!response.ok) throw new Error('The WhatsApp service is unavailable. Please try again shortly.')
  return (await response.json()) as T
}

export const getLinkStatus = () => callRelay<LinkStatus>('/link/status', 'GET')
export const startLink = () => callRelay<LinkStart>('/link/start', 'POST')
export const unlinkWhatsApp = () => callRelay<LinkStatus>('/link/unlink', 'POST')
