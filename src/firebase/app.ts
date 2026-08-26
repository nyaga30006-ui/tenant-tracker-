import { getApp, getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from "firebase/app";
import { connectFirestoreEmulator, getFirestore, type Firestore } from "firebase/firestore";
import { allowsLiveFirebaseFromLocalhost, isLocalDevelopmentHost, usesFirebaseEmulators } from "../config/dataBackend";

declare global {
  interface Window {
    NYAGA_FIREBASE_CONFIG?: FirebaseOptions;
  }
}

const environmentConfig: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
};

const emulatorConfig: FirebaseOptions = {
  apiKey: "demo-api-key",
  appId: "1:1234567890:web:demo-myproperty",
  authDomain: "demo-myproperty.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "demo-myproperty",
};

let firestoreEmulatorConnected = false;

export function getFirebaseConfig(): FirebaseOptions {
  if (window.NYAGA_FIREBASE_CONFIG?.projectId) return window.NYAGA_FIREBASE_CONFIG;
  if (usesFirebaseEmulators() && !environmentConfig.projectId) return emulatorConfig;
  return environmentConfig;
}

export function isFirebaseConfigured(): boolean {
  const config = getFirebaseConfig();
  return Boolean(config.apiKey && config.appId && config.authDomain && config.projectId);
}

export function getFirebaseApp(): FirebaseApp {
  assertFirebaseConnectionIsSafe();
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is selected, but its project configuration has not been added.");
  }
  return getApps().length ? getApp() : initializeApp(getFirebaseConfig());
}

export function getFirebaseDatabase(): Firestore {
  const database = getFirestore(getFirebaseApp());
  if (usesFirebaseEmulators() && !firestoreEmulatorConnected) {
    const host = import.meta.env.VITE_FIREBASE_EMULATOR_HOST || "127.0.0.1";
    const port = Number(import.meta.env.VITE_FIRESTORE_EMULATOR_PORT || 8080);
    connectFirestoreEmulator(database, host, port);
    firestoreEmulatorConnected = true;
  }
  return database;
}

export function assertFirebaseConnectionIsSafe(): void {
  const projectId = String(getFirebaseConfig().projectId ?? "");
  if (usesFirebaseEmulators() && !projectId.startsWith("demo-")) {
    throw new Error("Local Firebase testing requires a demo- project ID so it cannot reach a real Firebase project.");
  }
  if (isLocalDevelopmentHost() && !usesFirebaseEmulators() && !allowsLiveFirebaseFromLocalhost()) {
    throw new Error("Live Firebase access from localhost is blocked. Use the Firebase emulators or explicitly allow live access after reviewing the project ID.");
  }
}
