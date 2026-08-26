import { createContext, useContext, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import type { User } from "firebase/auth";
import { observeAuthenticatedUser, signInToExistingFirebase, signOutOfExistingFirebase } from "./auth";
import { userRepository } from "../repositories/userRepository";
import type { AppUser } from "../types/domain";
import { BrandMark } from "../components/ui/BrandMark";
import { Icon } from "../components/ui/Icon";

interface FirebaseSessionValue {
  authUser: User | null;
  profile: AppUser | null;
  status: "loading" | "signed-out" | "ready" | "error";
  error: string;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const FirebaseSessionContext = createContext<FirebaseSessionValue | null>(null);

function messageFromError(error: unknown): string {
  return error instanceof Error ? error.message : "Firebase could not complete this request.";
}

export function FirebaseSessionProvider({ children }: { children: ReactNode }) {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [status, setStatus] = useState<FirebaseSessionValue["status"]>("loading");
  const [error, setError] = useState("");

  useEffect(() => observeAuthenticatedUser((user) => {
    setAuthUser(user);
    setProfile(null);
    setError("");
    setStatus(user ? "loading" : "signed-out");
  }), []);

  useEffect(() => {
    if (!authUser) return;
    return userRepository.subscribeCurrent(authUser.uid, (nextProfile) => {
      setProfile(nextProfile);
      setStatus("ready");
    }, (nextError) => {
      setError(messageFromError(nextError));
      setStatus("error");
    });
  }, [authUser]);

  const value = useMemo<FirebaseSessionValue>(() => ({
    authUser,
    error,
    profile,
    status,
    signIn: async (email, password) => {
      setError("");
      setStatus("loading");
      try {
        await signInToExistingFirebase(email, password);
      } catch (signInError) {
        setStatus("signed-out");
        setError(messageFromError(signInError));
        throw signInError;
      }
    },
    signOut: async () => {
      await signOutOfExistingFirebase();
      setProfile(null);
    },
  }), [authUser, error, profile, status]);

  return <FirebaseSessionContext.Provider value={value}>{children}</FirebaseSessionContext.Provider>;
}

export function useFirebaseSession() {
  const context = useContext(FirebaseSessionContext);
  if (!context) throw new Error("useFirebaseSession must be used inside FirebaseSessionProvider.");
  return context;
}

export function FirebaseAuthBoundary({ children }: { children: ReactNode }) {
  const { authUser, error, profile, signIn, status } = useFirebaseSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
    } catch {
      // The session context exposes a safe user-facing error.
    } finally {
      setSubmitting(false);
    }
  }

  if (status === "loading") {
    return <FirebaseGateStatus title="Connecting securely…">Checking Firebase Authentication and your property access.</FirebaseGateStatus>;
  }

  if (!authUser) {
    return (
      <main className="firebase-gate firebase-gate--signin">
        <div className="firebase-gate__frame">
          <form className="firebase-gate__form login-box" onSubmit={submit}>
            <FirebaseGateBrand />
            <h1 className="visually-hidden">Sign in to MyProperty</h1>
            <div className="firebase-gate__welcome welcome-msg">Welcome to MyProperty</div>
            <label className="field">
              <span>Email</span>
              <input autoComplete="username" onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" required type="email" value={email} />
            </label>
            <label className="field">
              <span>Password</span>
              <input autoComplete="current-password" onChange={(event) => setPassword(event.target.value)} placeholder="Your password" required type="password" value={password} />
            </label>
            {error && <div className="firebase-gate__error" role="alert"><Icon name="warning" size={17} /><span>{error}</span></div>}
            <button className="firebase-gate__submit login-submit" disabled={submitting} type="submit">
              <span>{submitting ? "Signing in…" : "Sign In"}</span>
            </button>
          </form>
          <p className="firebase-gate__credit firebase-gate__mobile-credit login-footer">Made by <strong>Ian Murimi Nyaga</strong></p>
        </div>
      </main>
    );
  }

  if (status === "error") return <FirebaseGateStatus title="Firebase access could not be verified.">{error}</FirebaseGateStatus>;
  if (!profile) return <FirebaseGateStatus title="Your login exists, but no MyProperty profile has been assigned.">An administrator must create a users/{authUser.uid} profile before this account can enter the app.</FirebaseGateStatus>;
  if (profile.disabled) return <FirebaseGateStatus title="This MyProperty account is disabled.">Contact the administrator if access should be restored.</FirebaseGateStatus>;

  return children;
}

function FirebaseGateBrand() {
  return (
    <div className="firebase-gate__logo login-logo">
      <span className="logo-mark"><BrandMark /></span>
      <div><strong className="logo-word">My<span>Property</span></strong></div>
    </div>
  );
}

function FirebaseGateStatus({ children, title }: { children: ReactNode; title: string }) {
  return (
    <main className="firebase-gate firebase-gate--status">
      <section className="firebase-gate__status-card">
        <FirebaseGateBrand />
        <span className="firebase-gate__status-icon"><Icon name="security" size={22} /></span>
        <strong>{title}</strong>
        <p>{children}</p>
        <small>Created by Ian Murimi Nyaga</small>
      </section>
    </main>
  );
}
