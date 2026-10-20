export const env = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL as string | undefined,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined,
  firebaseApiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  firebaseAuthDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  firebaseProjectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  firebaseAppId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
  firebaseMessagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as
    | string
    | undefined,
  firebaseStorageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  appEnv: (import.meta.env.VITE_APP_ENV as string | undefined) ?? 'development',
}

export function assertPublicEnv() {
  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    throw new Error('Missing public Supabase environment variables.')
  }
}
