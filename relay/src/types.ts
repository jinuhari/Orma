export interface KVNamespace {
  get(key: string): Promise<string | null>
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>
  delete(key: string): Promise<void>
}

export interface Env {
  LINKS: KVNamespace
  FIREBASE_PROJECT_ID: string
  // Comma-separated browser origins allowed to call the /link endpoints.
  ALLOWED_ORIGINS: string
  WHATSAPP_VERIFY_TOKEN: string
  WHATSAPP_APP_SECRET: string
  WHATSAPP_TOKEN: string
  WHATSAPP_PHONE_NUMBER_ID: string
  // Bot number in international digits, used to build the wa.me link.
  WHATSAPP_BOT_NUMBER: string
}

export interface Deps {
  fetch: typeof fetch
  now: () => number
}
