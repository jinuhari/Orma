import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  relayUrl: 'https://relay.example/' as string | undefined,
  currentUser: { getIdToken: vi.fn(async () => 'id-token') } as { getIdToken: () => Promise<string> } | null,
}))

vi.mock('../../lib/env', () => ({
  env: {
    get relayUrl() {
      return state.relayUrl
    },
  },
}))
vi.mock('../../lib/firebaseClient', () => ({ getFirebaseAuth: () => ({ currentUser: state.currentUser }) }))

import { getLinkStatus, relayConfigured, startLink, unlinkWhatsApp } from './relayClient'

const fetchMock = vi.fn()

beforeEach(() => {
  state.relayUrl = 'https://relay.example/'
  state.currentUser = { getIdToken: vi.fn(async () => 'id-token') }
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => vi.unstubAllGlobals())

describe('relay client', () => {
  it('is only configured when a relay URL is set', () => {
    expect(relayConfigured()).toBe(true)
    state.relayUrl = undefined
    expect(relayConfigured()).toBe(false)
  })

  it('sends the Firebase ID token and normalises the base URL', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ linked: false, code: 'ABCD2345' })))
    await startLink()
    expect(fetchMock).toHaveBeenCalledWith('https://relay.example/link/start', {
      method: 'POST',
      headers: { Authorization: 'Bearer id-token' },
    })
  })

  it('reads status and unlinks with the right methods', async () => {
    fetchMock.mockImplementation(async () => new Response(JSON.stringify({ linked: false, number: null })))
    await getLinkStatus()
    await unlinkWhatsApp()
    expect(fetchMock.mock.calls.map(([url, init]) => [url, init.method])).toEqual([
      ['https://relay.example/link/status', 'GET'],
      ['https://relay.example/link/unlink', 'POST'],
    ])
  })

  it('refuses to call the relay without a signed-in user or relay URL', async () => {
    state.currentUser = null
    await expect(getLinkStatus()).rejects.toThrow('Sign in')
    state.currentUser = { getIdToken: async () => 'id-token' }
    state.relayUrl = undefined
    await expect(getLinkStatus()).rejects.toThrow('Sign in')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('turns failures into readable errors', async () => {
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 401 }))
    await expect(getLinkStatus()).rejects.toThrow('session expired')
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 500 }))
    await expect(getLinkStatus()).rejects.toThrow('unavailable')
    fetchMock.mockRejectedValueOnce(new TypeError('network'))
    await expect(getLinkStatus()).rejects.toThrow('Could not reach')
  })
})
