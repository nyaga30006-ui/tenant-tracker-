import {
  connectAuthEmulator,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type Auth,
  type User,
  type Unsubscribe,
} from "firebase/auth";
import { usesFirebaseEmulators } from "../config/dataBackend";
import { getFirebaseApp } from "./app";

let authEmulatorConnected = false;

export function getExistingFirebaseAuth(): Auth {
  const auth = getAuth(getFirebaseApp());
  if (usesFirebaseEmulators() && !authEmulatorConnected) {
    const host = import.meta.env.VITE_FIREBASE_EMULATOR_HOST || "127.0.0.1";
    const port = Number(import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_PORT || 9099);
    connectAuthEmulator(auth, `http://${host}:${port}`, { disableWarnings: true });
    authEmulatorConnected = true;
  }
  return auth;
}

export function observeAuthenticatedUser(onUser: (user: User | null) => void): Unsubscribe {
  return onAuthStateChanged(getExistingFirebaseAuth(), onUser);
}

export async function signInToExistingFirebase(email: string, password: string): Promise<User> {
  const credential = await signInWithEmailAndPassword(getExistingFirebaseAuth(), email, password);
  return credential.user;
}

export function signOutOfExistingFirebase(): Promise<void> {
  return signOut(getExistingFirebaseAuth());
}
