// @vitest-environment node
import { createHmac, generateKeyPairSync, createSign } from 'node:crypto'
import { beforeEach, describe, expect, it } from 'vitest'

import { createHandler } from './index'
import { MESSAGES } from './whatsapp'
import type { Env, KVNamespace } from './types'

const PROJECT = 'test-project'
const APP_SECRET = 'app-secret'
const PHONE_ID = '1111'
const ORIGIN = 'https://app.example.com'
const NOW = 1_800_000_000_000

const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
const publicJwk = { ...publicKey.export({ format: 'jwk' }), kid: 'key-1' }

function b64url(value: Buffer | string) {
  return Buffer.from(value).toString('base64url')
}

function makeToken(claims: Record<string, unknown> = {}, options: { kid?: string; signWith?: typeof privateKey } = {}) {
  const header = b64url(JSON.stringify({ alg: 'RS256', kid: options.kid ?? 'key-1', typ: 'JWT' }))
  const payload = b64url(
    JSON.stringify({
      iss: `https://securetoken.google.com/${PROJECT}`,
      aud: PROJECT,
      sub: 'user-a',
      iat: NOW / 1000 - 10,
      exp: NOW / 1000 + 3000,
      ...claims,
    }),
  )
  const signature = createSign('RSA-SHA256').update(`${header}.${payload}`).sign(options.signWith ?? privateKey)
  return `${header}.${payload}.${b64url(signature)}`
}

function makeKv(): KVNamespace & { data: Map<string, string> } {
  const data = new Map<string, string>()
  return {
    data,
    async get(key) {
      return data.get(key) ?? null
    },
    async put(key, value) {
      data.set(key, value)
    },
    async delete(key) {
      data.delete(key)
    },
  }
}

let kv: ReturnType<typeof makeKv>
let sent: { to: string; body: string }[]
let env: Env
let handler: ReturnType<typeof createHandler>
let graphOk = true

beforeEach(() => {
  kv = makeKv()
  sent = []
  graphOk = true
  env = {
    LINKS: kv,
    FIREBASE_PROJECT_ID: PROJECT,
    ALLOWED_ORIGINS: ORIGIN,
    WHATSAPP_VERIFY_TOKEN: 'verify-me',
    WHATSAPP_APP_SECRET: APP_SECRET,
    WHATSAPP_TOKEN: 'graph-token',
    WHATSAPP_PHONE_NUMBER_ID: PHONE_ID,
    WHATSAPP_BOT_NUMBER: '15550001111',
  }
  handler = createHandler({
    now: () => NOW,
    fetch: (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.includes('securetoken@system.gserviceaccount.com')) {
        return new Response(JSON.stringify({ keys: [publicJwk] }), { headers: { 'cache-control': 'max-age=3600' } })
      }
      if (url.includes('graph.facebook.com')) {
        const body = JSON.parse(String(init?.body))
        sent.push({ to: body.to, body: body.text.body })
        return new Response('{}', { status: graphOk ? 200 : 500 })
      }
      throw new Error(`Unexpected fetch ${url}`)
    }) as typeof fetch,
  })
})

function api(path: string, init: RequestInit & { token?: string | null; origin?: string | null } = {}) {
  const headers = new Headers(init.headers)
  if (init.token !== null) headers.set('authorization', `Bearer ${init.token ?? makeToken()}`)
  if (init.origin !== null) headers.set('origin', init.origin ?? ORIGIN)
  return handler.fetch(new Request(`https://relay.test${path}`, { ...init, headers }), env)
}

function webhookBody(messages: { id: string; from: string; text: string }[], phoneId = PHONE_ID) {
  return JSON.stringify({
    object: 'whatsapp_business_account',
    entry: [
      {
        changes: [
          {
            field: 'messages',
            value: {
              metadata: { phone_number_id: phoneId },
              messages: messages.map((message) => ({ ...message, type: 'text', text: { body: message.text } })),
            },
          },
        ],
      },
    ],
  })
}

function sign(body: string) {
  return `sha256=${createHmac('sha256', APP_SECRET).update(body).digest('hex')}`
}

async function receive(messages: { id: string; from: string; text: string }[], phoneId?: string) {
  const body = webhookBody(messages, phoneId)
  return handler.fetch(
    new Request('https://relay.test/webhook', { method: 'POST', body, headers: { 'x-hub-signature-256': sign(body) } }),
    env,
  )
}

async function startLink(token?: string) {
  const response = await api('/link/start', { method: 'POST', token })
  return (await response.json()) as { code: string; waLink: string; expiresInSeconds: number; linked: boolean }
}

describe('webhook verification handshake', () => {
  it('echoes the challenge when the verify token matches', async () => {
    const response = await handler.fetch(
      new Request('https://relay.test/webhook?hub.mode=subscribe&hub.verify_token=verify-me&hub.challenge=abc123'),
      env,
    )
    expect(response.status).toBe(200)
    expect(await response.text()).toBe('abc123')
  })

  it('rejects a wrong verify token', async () => {
    const response = await handler.fetch(
      new Request('https://relay.test/webhook?hub.mode=subscribe&hub.verify_token=nope&hub.challenge=abc'),
      env,
    )
    expect(response.status).toBe(403)
  })
})

describe('webhook signature', () => {
  it('rejects missing and wrong signatures without replying', async () => {
    const body = webhookBody([{ id: 'm1', from: '911', text: 'hello' }])
    const missing = await handler.fetch(new Request('https://relay.test/webhook', { method: 'POST', body }), env)
    const wrong = await handler.fetch(
      new Request('https://relay.test/webhook', { method: 'POST', body, headers: { 'x-hub-signature-256': 'sha256=deadbeef' } }),
      env,
    )
    expect([missing.status, wrong.status]).toEqual([401, 401])
    expect(sent).toHaveLength(0)
  })

  it('ignores messages addressed to a different phone number id', async () => {
    const response = await receive([{ id: 'm1', from: '911', text: 'hello' }], '9999')
    expect(response.status).toBe(200)
    expect(sent).toHaveLength(0)
  })
})

describe('linking a WhatsApp number', () => {
  it('links after the user sends the code and sends the welcome message', async () => {
    const start = await startLink()
    expect(start.code).toMatch(/^[A-HJKMNP-Z2-9]{8}$/)
    expect(start.waLink).toBe(`https://wa.me/15550001111?text=${encodeURIComponent(`LINK ${start.code}`)}`)

    await receive([{ id: 'm1', from: '919800001234', text: `link ${start.code.toLowerCase()}` }])
    expect(sent).toEqual([{ to: '919800001234', body: MESSAGES.welcome }])
    expect(MESSAGES.welcome).toBe('Now we can help you manage all your to-dos and all the things in the Orma app.')

    const status = await (await api('/link/status')).json()
    expect(status).toEqual({ linked: true, number: '\u2022\u2022\u2022\u2022 1234' })
  })

  it('codes are single use', async () => {
    const { code } = await startLink()
    await receive([{ id: 'm1', from: '911', text: `LINK ${code}` }])
    await receive([{ id: 'm2', from: '922', text: `LINK ${code}` }])
    expect(sent.map((message) => message.body)).toEqual([MESSAGES.welcome, MESSAGES.invalidCode])
  })

  it('a new code replaces the previous one', async () => {
    const first = await startLink()
    const second = await startLink()
    await receive([{ id: 'm1', from: '911', text: `LINK ${first.code}` }])
    expect(sent[0].body).toBe(MESSAGES.invalidCode)
    await receive([{ id: 'm2', from: '911', text: `LINK ${second.code}` }])
    expect(sent[1].body).toBe(MESSAGES.welcome)
  })

  it('locks a number out after repeated wrong codes, even for a valid code', async () => {
    const { code } = await startLink()
    for (let attempt = 0; attempt < 5; attempt++) {
      await receive([{ id: `bad${attempt}`, from: '933', text: 'LINK AAAAAAAA' }])
    }
    await receive([{ id: 'good', from: '933', text: `LINK ${code}` }])
    expect(sent.at(-1)?.body).toBe(MESSAGES.locked)
    expect(await (await api('/link/status')).json()).toEqual({ linked: false, number: null })
  })

  it('refuses a number that is already linked to another account', async () => {
    const owner = await startLink(makeToken({ sub: 'user-a' }))
    await receive([{ id: 'm1', from: '911', text: `LINK ${owner.code}` }])
    const other = await startLink(makeToken({ sub: 'user-b' }))
    await receive([{ id: 'm2', from: '911', text: `LINK ${other.code}` }])
    expect(sent.at(-1)?.body).toBe(MESSAGES.taken)
    expect(await (await api('/link/status', { token: makeToken({ sub: 'user-b' }) })).json()).toEqual({ linked: false, number: null })
  })

  it('reports an already linked account instead of issuing a new code', async () => {
    const { code } = await startLink()
    await receive([{ id: 'm1', from: '911', text: `LINK ${code}` }])
    const again = (await (await api('/link/start', { method: 'POST' })).json()) as { linked: boolean; code?: string }
    expect(again.linked).toBe(true)
    expect(again.code).toBeUndefined()
  })

  it('unlinking stops the number being recognised', async () => {
    const { code } = await startLink()
    await receive([{ id: 'm1', from: '911', text: `LINK ${code}` }])
    await receive([{ id: 'm2', from: '911', text: 'what is planned today' }])
    expect(sent.at(-1)?.body).toBe(MESSAGES.linkedIdle)

    await api('/link/unlink', { method: 'POST' })
    await receive([{ id: 'm3', from: '911', text: 'what is planned today' }])
    expect(sent.at(-1)?.body).toBe(MESSAGES.notLinked)
  })
})

describe('message handling', () => {
  it('tells unlinked numbers how to connect', async () => {
    await receive([{ id: 'm1', from: '944', text: 'hi' }])
    expect(sent).toEqual([{ to: '944', body: MESSAGES.notLinked }])
  })

  it('handles each message id only once when Meta retries', async () => {
    await receive([{ id: 'same', from: '944', text: 'hi' }])
    await receive([{ id: 'same', from: '944', text: 'hi' }])
    expect(sent).toHaveLength(1)
  })

  it('acknowledges the webhook even when sending fails', async () => {
    graphOk = false
    const response = await receive([{ id: 'm1', from: '944', text: 'hi' }])
    expect(response.status).toBe(200)
  })
})

describe('account authentication and CORS', () => {
  it('requires a valid Firebase ID token', async () => {
    const attacker = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey
    const cases = [
      api('/link/status', { token: null }),
      api('/link/status', { token: 'garbage' }),
      api('/link/status', { token: makeToken({ exp: NOW / 1000 - 5 }) }),
      api('/link/status', { token: makeToken({ aud: 'other-project' }) }),
      api('/link/status', { token: makeToken({ iss: 'https://evil.example' }) }),
      api('/link/status', { token: makeToken({ sub: '' }) }),
      api('/link/status', { token: makeToken({}, { signWith: attacker }) }),
      api('/link/status', { token: makeToken({}, { kid: 'unknown-key' }) }),
    ]
    expect((await Promise.all(cases)).map((response) => response.status)).toEqual(Array(8).fill(401))
  })

  it('only grants CORS to configured origins', async () => {
    const allowed = await api('/link/status')
    const blocked = await api('/link/status', { origin: 'https://evil.example' })
    expect(allowed.headers.get('access-control-allow-origin')).toBe(ORIGIN)
    expect(blocked.headers.get('access-control-allow-origin')).toBeNull()
  })

  it('answers preflight only for configured origins', async () => {
    const ok = await api('/link/start', { method: 'OPTIONS', token: null })
    const denied = await api('/link/start', { method: 'OPTIONS', token: null, origin: 'https://evil.example' })
    expect(ok.status).toBe(204)
    expect(ok.headers.get('access-control-allow-headers')).toContain('authorization')
    expect(denied.status).toBe(403)
  })
})
