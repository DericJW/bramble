import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, initializeFirestore, type Firestore } from 'firebase/firestore';
import { Platform } from 'react-native';

import { firebaseConfig } from '../config/firebase';

let app: FirebaseApp | null = null;
let db: Firestore | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (!app) app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  return app;
}

/**
 * Firestore, set up for React Native: long polling is the most reliable connection from a
 * phone app, and undefined fields are ignored instead of throwing.
 */
export function getDb(): Firestore {
  if (db) return db;
  const a = getFirebaseApp();
  try {
    db = initializeFirestore(
      a,
      Platform.OS === 'web'
        ? { ignoreUndefinedProperties: true }
        : { ignoreUndefinedProperties: true, experimentalForceLongPolling: true },
    );
  } catch {
    // Already initialised (for example after a fast refresh while developing).
    db = getFirestore(a);
  }
  return db;
}
