import type { Deps } from './types'

const JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'
const CLOCK_SKEW_SECONDS = 60
const MIN_REFETCH_MS = 60_000
const DEFAULT_CACHE_MS = 3_600_000

interface Jwk {
  kid: string
  kty: string
  n: string
  e: string
}

export interface JwksCache {
  keys: Jwk[]
  fetchedAt: number
  expiresAt: number
}

export class AuthError extends Error {}

const encoder = new TextEncoder()

function base64UrlToBytes(value: string) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (value.length % 4)) % 4)
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0))
}

function decodeJson(value: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(new TextDecoder().decode(base64UrlToBytes(value)))
    if (parsed && typeof parsed === 'object') return parsed as Record<string, unknown>
  } catch {
    // fall through
  }
  throw new AuthError('Malformed token')
}

async function loadKeys(deps: Deps, cache: JwksCache) {
  const response = await deps.fetch(JWKS_URL)
  if (!response.ok) throw new AuthError('Could not load signing keys')
  const body = (await response.json()) as { keys?: Jwk[] }
  const maxAge = /max-age=(\d+)/.exec(response.headers.get('cache-control') ?? '')
  const now = deps.now()
  cache.keys = Array.isArray(body.keys) ? body.keys : []
  cache.fetchedAt = now
  cache.expiresAt = now + (maxAge ? Number(maxAge[1]) * 1000 : DEFAULT_CACHE_MS)
}

async function findKey(kid: string, deps: Deps, cache: JwksCache) {
  const now = deps.now()
  if (now >= cache.expiresAt) await loadKeys(deps, cache)
  let key = cache.keys.find((candidate) => candidate.kid === kid)
  // A new key id usually means a key rotation; refetch, but never hammer Google.
  if (!key && now - cache.fetchedAt >= MIN_REFETCH_MS) {
    await loadKeys(deps, cache)
    key = cache.keys.find((candidate) => candidate.kid === kid)
  }
  if (!key) throw new AuthError('Unknown signing key')
  return key
}

export function createJwksCache(): JwksCache {
  return { keys: [], fetchedAt: 0, expiresAt: 0 }
}

// Verifies a Firebase Auth ID token and returns the account uid.
export async function verifyFirebaseIdToken(token: string, projectId: string, deps: Deps, cache: JwksCache) {
  const parts = token.split('.')
  if (parts.length !== 3 || parts.some((part) => !part)) throw new AuthError('Malformed token')
  const [encodedHeader, encodedPayload, encodedSignature] = parts

  const header = decodeJson(encodedHeader)
  if (header.alg !== 'RS256' || typeof header.kid !== 'string') throw new AuthError('Unsupported token')

  const jwk = await findKey(header.kid, deps, cache)
  const key = await crypto.subtle.importKey(
    'jwk',
    { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: 'RS256', ext: true },
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  )
  const valid = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    key,
    base64UrlToBytes(encodedSignature),
    encoder.encode(`${encodedHeader}.${encodedPayload}`),
  )
  if (!valid) throw new AuthError('Bad signature')

  const claims = decodeJson(encodedPayload)
  const nowSeconds = Math.floor(deps.now() / 1000)
  if (typeof claims.exp !== 'number' || claims.exp <= nowSeconds) throw new AuthError('Token expired')
  if (typeof claims.iat !== 'number' || claims.iat > nowSeconds + CLOCK_SKEW_SECONDS) throw new AuthError('Token not yet valid')
  if (claims.aud !== projectId) throw new AuthError('Wrong audience')
  if (claims.iss !== `https://securetoken.google.com/${projectId}`) throw new AuthError('Wrong issuer')
  if (typeof claims.sub !== 'string' || !claims.sub) throw new AuthError('No subject')
  return claims.sub
}
