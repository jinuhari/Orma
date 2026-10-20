const encoder = new TextEncoder()

// No I, L, O, 0 or 1 so codes survive being read aloud or retyped.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
export const LINK_CODE_LENGTH = 8
export const LINK_CODE_PATTERN = /^[A-HJKMNP-Z2-9]{8}$/

export function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let index = 0; index < a.length; index++) diff |= a.charCodeAt(index) ^ b.charCodeAt(index)
  return diff === 0
}

async function hmacSha256Hex(secret: string, body: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(body))
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

// Meta signs every webhook body with the app secret: "sha256=<hex hmac>".
export async function verifyMetaSignature(secret: string, body: string, header: string | null) {
  if (!secret || !header?.startsWith('sha256=')) return false
  return timingSafeEqual(await hmacSha256Hex(secret, body), header.slice(7).toLowerCase())
}

export function generateLinkCode() {
  // Reject bytes past the last full multiple so every character is equally likely.
  const limit = 256 - (256 % CODE_ALPHABET.length)
  let code = ''
  while (code.length < LINK_CODE_LENGTH) {
    for (const byte of crypto.getRandomValues(new Uint8Array(16))) {
      if (byte < limit && code.length < LINK_CODE_LENGTH) code += CODE_ALPHABET[byte % CODE_ALPHABET.length]
    }
  }
  return code
}
