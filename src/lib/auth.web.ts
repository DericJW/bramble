import { getAuth, type Auth } from 'firebase/auth';

import { getFirebaseApp } from './firebase';

/** In the browser Firebase remembers the signed-in user in IndexedDB by itself. */
export function getAuthInstance(): Auth {
  return getAuth(getFirebaseApp());
}
