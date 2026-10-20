import type { Deps, Env } from './types'

const GRAPH_VERSION = 'v23.0'

export const MESSAGES = {
  welcome: 'Now we can help you manage all your to-dos and all the things in the Orma app.',
  linkedIdle:
    "You're connected. Questions about your plan, tasks and expenses are coming soon, and I'll answer them here.",
  notLinked: 'To connect, open Orma, go to WhatsApp, and send me the LINK code shown there.',
  invalidCode: 'That code is invalid or has expired. Open Orma, go to WhatsApp, and get a new one.',
  locked: 'Too many wrong codes. Please try again in an hour.',
  taken: 'This WhatsApp number is already linked to an Orma account. Unlink it in the app first.',
} as const

export interface IncomingText {
  id: string
  from: string
  text: string
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null
}

// Pulls plain-text messages for our own number out of Meta's nested webhook payload.
export function extractTextMessages(payload: unknown, phoneNumberId: string) {
  const found: IncomingText[] = []
  const entries = asRecord(payload)?.entry
  if (!Array.isArray(entries)) return found
  for (const entry of entries) {
    const changes = asRecord(entry)?.changes
    if (!Array.isArray(changes)) continue
    for (const change of changes) {
      const value = asRecord(asRecord(change)?.value)
      if (!value || asRecord(value.metadata)?.phone_number_id !== phoneNumberId) continue
      const messages = value.messages
      if (!Array.isArray(messages)) continue
      for (const raw of messages) {
        const message = asRecord(raw)
        const text = asRecord(message?.text)
        if (message?.type !== 'text' || typeof message.id !== 'string' || typeof message.from !== 'string') continue
        if (typeof text?.body !== 'string') continue
        found.push({ id: message.id, from: message.from, text: text.body })
      }
    }
  }
  return found
}

export async function sendText(env: Env, deps: Deps, to: string, body: string) {
  const response = await deps.fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', to, type: 'text', text: { body } }),
  })
  if (!response.ok) console.error('WhatsApp send failed', response.status)
  return response.ok
}
