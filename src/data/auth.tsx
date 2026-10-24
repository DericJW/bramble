import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  linkWithCredential,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  type User,
} from 'firebase/auth';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { firebaseConfigMissing } from '../config/firebase';
import { getAuthInstance } from '../lib/auth';

export type AuthUser = { uid: string; email: string | null; isAnonymous: boolean };

type AuthState = { status: 'loading' | 'signedOut' | 'signedIn'; user: AuthUser | null };

type AuthContextValue = AuthState & { refresh: () => void };

const AuthContext = createContext<AuthContextValue>({ status: 'loading', user: null, refresh: () => undefined });

function snapshotOf(u: User | null): AuthUser | null {
  return u ? { uid: u.uid, email: u.email, isAnonymous: u.isAnonymous } : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading', user: null });

  useEffect(() => {
    if (firebaseConfigMissing) {
      setState({ status: 'signedOut', user: null });
      return undefined;
    }
    const auth = getAuthInstance();
    return onAuthStateChanged(auth, (u) => {
      setState({ status: u ? 'signedIn' : 'signedOut', user: snapshotOf(u) });
    });
  }, []);

  const refresh = useCallback(() => {
    if (firebaseConfigMissing) return;
    const u = getAuthInstance().currentUser;
    setState({ status: u ? 'signedIn' : 'signedOut', user: snapshotOf(u) });
  }, []);

  const value = useMemo(() => ({ ...state, refresh }), [state, refresh]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}

export async function signIn(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(getAuthInstance(), email.trim(), password);
}

export async function signUp(email: string, password: string): Promise<void> {
  await createUserWithEmailAndPassword(getAuthInstance(), email.trim(), password);
}

export async function signInAsGuest(): Promise<void> {
  await signInAnonymously(getAuthInstance());
}

export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(getAuthInstance(), email.trim());
}

/** Turn a guest farm into a real account, keeping all its data. */
export async function upgradeGuest(email: string, password: string): Promise<void> {
  const auth = getAuthInstance();
  const user = auth.currentUser;
  if (!user) throw new Error('Not signed in');
  await linkWithCredential(user, EmailAuthProvider.credential(email.trim(), password));
}

export async function signOut(): Promise<void> {
  await fbSignOut(getAuthInstance());
}

/** Friendly words for the errors people actually hit. */
export function authErrorMessage(e: unknown): string {
  const code = typeof e === 'object' && e && 'code' in e ? String((e as { code: unknown }).code) : '';
  switch (code) {
    case 'auth/invalid-email':
      return 'That email address doesn’t look right.';
    case 'auth/missing-password':
      return 'Please type a password.';
    case 'auth/weak-password':
      return 'Pick a password with at least 6 characters.';
    case 'auth/email-already-in-use':
    case 'auth/credential-already-in-use':
      return 'There is already an account with that email. Try signing in instead.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-login-credentials':
      return 'Email or password is not right.';
    case 'auth/too-many-requests':
      return 'Too many tries. Wait a moment and try again.';
    case 'auth/network-request-failed':
      return 'Can’t reach the internet right now.';
    case 'auth/operation-not-allowed':
    case 'auth/admin-restricted-operation':
      return 'This sign-in method is switched off. Turn on Email/Password and Anonymous in Firebase → Authentication → Sign-in method.';
    case 'auth/requires-recent-login':
      return 'Please sign out and in again, then retry.';
    case 'auth/invalid-api-key':
    case 'auth/api-key-not-valid.-please-pass-a-valid-api-key.':
      return 'The Firebase config in src/config/firebase.ts isn’t valid.';
    default:
      return e instanceof Error && e.message ? e.message : 'Something went wrong. Please try again.';
  }
}
