import { getApp, getApps, initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

import { env } from './env'

const firebaseConfig = {
  apiKey: env.firebaseApiKey,
  authDomain: env.firebaseAuthDomain,
  projectId: env.firebaseProjectId,
  appId: env.firebaseAppId,
  messagingSenderId: env.firebaseMessagingSenderId,
  storageBucket: env.firebaseStorageBucket,
}

export function hasFirebaseConfig() {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.authDomain &&
      firebaseConfig.projectId &&
      firebaseConfig.appId,
  )
}

export function getFirebaseApp() {
  if (!hasFirebaseConfig()) {
    throw new Error('Missing Firebase environment variables.')
  }

  return getApps().length ? getApp() : initializeApp(firebaseConfig)
}

export function getFirebaseAuth() {
  return getAuth(getFirebaseApp())
}

export function getFirebaseDb() {
  return getFirestore(getFirebaseApp())
}
