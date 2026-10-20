import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth'

import { getFirebaseAuth } from '../../lib/firebaseClient'

export async function signInWithEmailPassword(email: string, password: string) {
  return signInWithEmailAndPassword(getFirebaseAuth(), email, password)
}

export async function signInWithGoogle() {
  return signInWithPopup(getFirebaseAuth(), new GoogleAuthProvider())
}

export async function signUpWithEmailPassword(email: string, password: string) {
  return createUserWithEmailAndPassword(getFirebaseAuth(), email, password)
}

export async function signOutFirebase() {
  return signOut(getFirebaseAuth())
}

export function onFirebaseAuthStateChanged(callback: (user: User | null) => void) {
  return onAuthStateChanged(getFirebaseAuth(), callback)
}
