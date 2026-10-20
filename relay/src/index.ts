import { LINK_CODE_PATTERN, verifyMetaSignature } from './crypto'
import { AuthError, createJwksCache, verifyFirebaseIdToken } from './firebaseToken'
import {
  CODE_TTL_SECONDS,
  getLinkedNumber,
  getLinkedUid,
  isDuplicateMessage,
  issueCode,
  maskNumber,
  redeemCode,
  unlink,
} from './links'
import type { Deps, Env } from './types'
import { MESSAGES, extractTextMessages, sendText, type IncomingText } from './whatsapp'

const MAX_WEBHOOK_BYTES = 100_000
const LINK_COMMAND = /^link\s+(\S+)$/i

function allowedOrigin(request: Request, env: Env) {
  const origin = request.headers.get('origin')
  if (!origin) return null
  return env.ALLOWED_ORIGINS.split(',').map((item) => item.trim()).includes(origin) ? origin : null
}

function json(body: unknown, status: number, origin: string | null) {
  const headers = new Headers({ 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
  if (origin) {
    headers.set('Access-Control-Allow-Origin', origin)
    headers.set('Vary', 'Origin')
  }
  return new Response(JSON.stringify(body), { status, headers })
}

export function createHandler(overrides: Partial<Deps> = {}) {
  const deps: Deps = { fetch: overrides.fetch ?? fetch, now: overrides.now ?? Date.now }
  const jwks = createJwksCache()

  async function authenticate(request: Request, env: Env) {
    const header = request.headers.get('authorization') ?? ''
    if (!header.startsWith('Bearer ')) throw new AuthError('Missing token')
    return verifyFirebaseIdToken(header.slice(7), env.FIREBASE_PROJECT_ID, deps, jwks)
  }

  async function handleLink(request: Request, env: Env, path: string) {
    const origin = allowedOrigin(request, env)
    if (request.method === 'OPTIONS') {
      if (!origin) return new Response(null, { status: 403 })
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Headers': 'authorization, content-type',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Max-Age': '600',
          Vary: 'Origin',
        },
      })
    }

    let uid: string
    try {
      uid = await authenticate(request, env)
    } catch (error) {
      if (error instanceof AuthError) return json({ error: 'unauthorized' }, 401, origin)
      throw error
    }

    if (path === '/link/status' && request.method === 'GET') {
      const number = await getLinkedNumber(env.LINKS, uid)
      return json({ linked: Boolean(number), number: number ? maskNumber(number) : null }, 200, origin)
    }

    if (path === '/link/start' && request.method === 'POST') {
      const number = await getLinkedNumber(env.LINKS, uid)
      if (number) return json({ linked: true, number: maskNumber(number) }, 200, origin)
      const code = await issueCode(env.LINKS, uid)
      const text = encodeURIComponent(`LINK ${code}`)
      return json(
        { linked: false, code, expiresInSeconds: CODE_TTL_SECONDS, waLink: `https://wa.me/${env.WHATSAPP_BOT_NUMBER}?text=${text}` },
        200,
        origin,
      )
    }

    if (path === '/link/unlink' && request.method === 'POST') {
      await unlink(env.LINKS, uid)
      return json({ linked: false, number: null }, 200, origin)
    }

    return json({ error: 'not_found' }, 404, origin)
  }

  async function reply(env: Env, message: IncomingText, body: string) {
    await sendText(env, deps, message.from, body)
  }

  async function handleMessage(env: Env, message: IncomingText) {
    if (await isDuplicateMessage(env.LINKS, message.id)) return

    const command = LINK_COMMAND.exec(message.text.trim())
    if (command) {
      const code = command[1].toUpperCase()
      if (!LINK_CODE_PATTERN.test(code)) return reply(env, message, MESSAGES.invalidCode)
      const result = await redeemCode(env.LINKS, code, message.from)
      const texts = { linked: MESSAGES.welcome, invalid: MESSAGES.invalidCode, locked: MESSAGES.locked, taken: MESSAGES.taken }
      return reply(env, message, texts[result.status])
    }

    const linked = await getLinkedUid(env.LINKS, message.from)
    return reply(env, message, linked ? MESSAGES.linkedIdle : MESSAGES.notLinked)
  }

  async function handleWebhook(request: Request, env: Env) {
    const url = new URL(request.url)

    if (request.method === 'GET') {
      const matches =
        url.searchParams.get('hub.mode') === 'subscribe' &&
        Boolean(env.WHATSAPP_VERIFY_TOKEN) &&
        url.searchParams.get('hub.verify_token') === env.WHATSAPP_VERIFY_TOKEN
      return matches ? new Response(url.searchParams.get('hub.challenge') ?? '', { status: 200 }) : new Response('Forbidden', { status: 403 })
    }

    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 })

    const body = await request.text()
    if (body.length > MAX_WEBHOOK_BYTES) return new Response('Too large', { status: 413 })
    if (!(await verifyMetaSignature(env.WHATSAPP_APP_SECRET, body, request.headers.get('x-hub-signature-256')))) {
      return new Response('Unauthorized', { status: 401 })
    }

    let payload: unknown
    try {
      payload = JSON.parse(body)
    } catch {
      return new Response('Bad request', { status: 400 })
    }

    for (const message of extractTextMessages(payload, env.WHATSAPP_PHONE_NUMBER_ID)) {
      try {
        await handleMessage(env, message)
      } catch (error) {
        // Always acknowledge: a 5xx makes Meta retry the whole batch.
        console.error('Message handling failed', error instanceof Error ? error.message : 'unknown')
      }
    }
    return new Response('ok', { status: 200 })
  }

  return {
    async fetch(request: Request, env: Env) {
      const path = new URL(request.url).pathname
      if (path === '/webhook') return handleWebhook(request, env)
      if (path.startsWith('/link/')) return handleLink(request, env, path)
      return new Response('Not found', { status: 404 })
    },
  }
}

export default createHandler()
