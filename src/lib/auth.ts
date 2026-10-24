import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FirebaseAuth from 'firebase/auth';
import { getAuth, initializeAuth, type Auth, type Persistence } from 'firebase/auth';

import { getFirebaseApp } from './firebase';

let auth: Auth | null = null;

/**
 * Firebase Auth for the phone app, remembering the signed-in user between launches with
 * AsyncStorage. getReactNativePersistence only exists in Firebase's React Native build,
 * which is what Metro loads on phones, so it is looked up at runtime.
 */
export function getAuthInstance(): Auth {
  if (auth) return auth;
  const app = getFirebaseApp();
  const withRN = FirebaseAuth as unknown as {
    getReactNativePersistence?: (storage: typeof AsyncStorage) => Persistence;
  };
  try {
    auth = withRN.getReactNativePersistence
      ? initializeAuth(app, { persistence: withRN.getReactNativePersistence(AsyncStorage) })
      : getAuth(app);
  } catch {
    auth = getAuth(app);
  }
  return auth;
}
