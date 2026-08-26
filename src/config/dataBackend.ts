export type DataBackend = "firebase" | "local";

function booleanEnvironmentValue(value: unknown): boolean {
  return String(value ?? "").trim().toLowerCase() === "true";
}

export function getDataBackend(): DataBackend {
  return import.meta.env.VITE_DATA_BACKEND === "firebase" ? "firebase" : "local";
}

export function usesFirebaseBackend(): boolean {
  return getDataBackend() === "firebase";
}

export function usesFirebaseEmulators(): boolean {
  return booleanEnvironmentValue(import.meta.env.VITE_FIREBASE_USE_EMULATORS);
}

export function allowsLiveFirebaseFromLocalhost(): boolean {
  return booleanEnvironmentValue(import.meta.env.VITE_FIREBASE_ALLOW_LIVE);
}

export function isLocalDevelopmentHost(hostname = window.location.hostname): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

