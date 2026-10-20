import { createClient } from '@supabase/supabase-js'

import { assertPublicEnv, env } from './env'

let cachedClient: ReturnType<typeof createClient> | null = null

export function getSupabaseClient() {
  if (cachedClient) return cachedClient
  assertPublicEnv()
  cachedClient = createClient(env.supabaseUrl!, env.supabaseAnonKey!)
  return cachedClient
}
