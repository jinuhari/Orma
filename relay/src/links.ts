import { generateLinkCode } from './crypto'
import type { KVNamespace } from './types'

export const CODE_TTL_SECONDS = 600
const MAX_FAILED_ATTEMPTS = 5
const ATTEMPT_WINDOW_SECONDS = 3600
const DEDUPE_TTL_SECONDS = 86_400

export type RedeemResult =
  | { status: 'linked'; uid: string }
  | { status: 'invalid' }
  | { status: 'locked' }
  | { status: 'taken' }

export function maskNumber(waId: string) {
  return `\u2022\u2022\u2022\u2022 ${waId.slice(-4)}`
}

export function getLinkedNumber(kv: KVNamespace, uid: string) {
  return kv.get(`uid:${uid}`)
}

export function getLinkedUid(kv: KVNamespace, waId: string) {
  return kv.get(`wa:${waId}`)
}

// One active code per account; asking again replaces the previous one.
export async function issueCode(kv: KVNamespace, uid: string) {
  const previous = await kv.get(`codeof:${uid}`)
  if (previous) await kv.delete(`code:${previous}`)
  const code = generateLinkCode()
  await kv.put(`code:${code}`, uid, { expirationTtl: CODE_TTL_SECONDS })
  await kv.put(`codeof:${uid}`, code, { expirationTtl: CODE_TTL_SECONDS })
  return code
}

// Guessing codes would let someone link their number to another account, so wrong tries are limited per number.
export async function redeemCode(kv: KVNamespace, code: string, waId: string): Promise<RedeemResult> {
  const failed = Number((await kv.get(`attempts:${waId}`)) ?? 0)
  if (failed >= MAX_FAILED_ATTEMPTS) return { status: 'locked' }

  const uid = await kv.get(`code:${code}`)
  if (!uid) {
    await kv.put(`attempts:${waId}`, String(failed + 1), { expirationTtl: ATTEMPT_WINDOW_SECONDS })
    return { status: 'invalid' }
  }

  const existing = await kv.get(`wa:${waId}`)
  if (existing && existing !== uid) return { status: 'taken' }

  const previousNumber = await kv.get(`uid:${uid}`)
  if (previousNumber && previousNumber !== waId) await kv.delete(`wa:${previousNumber}`)

  await kv.put(`wa:${waId}`, uid)
  await kv.put(`uid:${uid}`, waId)
  await kv.delete(`code:${code}`)
  await kv.delete(`codeof:${uid}`)
  await kv.delete(`attempts:${waId}`)
  return { status: 'linked', uid }
}

export async function unlink(kv: KVNamespace, uid: string) {
  const waId = await kv.get(`uid:${uid}`)
  if (waId) await kv.delete(`wa:${waId}`)
  await kv.delete(`uid:${uid}`)
}

// Meta retries webhooks, so every message id is handled once.
export async function isDuplicateMessage(kv: KVNamespace, messageId: string) {
  if (await kv.get(`msg:${messageId}`)) return true
  await kv.put(`msg:${messageId}`, '1', { expirationTtl: DEDUPE_TTL_SECONDS })
  return false
}
