import type { AuthChangeEvent, Session } from '@supabase/supabase-js'

import { getSupabaseClient } from '../../lib/supabaseClient'

export async function signInWithPassword(email: string, password: string) {
  return getSupabaseClient().auth.signInWithPassword({ email, password })
}

export async function signUp(email: string, password: string) {
  return getSupabaseClient().auth.signUp({ email, password })
}

export async function signOut() {
  return getSupabaseClient().auth.signOut()
}

export async function requestPasswordReset(email: string) {
  return getSupabaseClient().auth.resetPasswordForEmail(email)
}

export function onAuthStateChanged(
  callback: (event: AuthChangeEvent, session: Session | null) => void,
) {
  return getSupabaseClient().auth.onAuthStateChange(callback)
}
