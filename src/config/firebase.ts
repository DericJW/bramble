/**
 * Paste your Firebase web app config here.
 *
 * Firebase console → Project settings → General → Your apps → Web app → "SDK setup and
 * configuration" → Config. Copy the values into the object below.
 *
 * These values identify your Firebase project; they are not secret passwords. What keeps
 * your data private is the Firestore security rules in firestore.rules, which only let a
 * signed-in user read and write their own documents. Publish those rules before using the app.
 */
export const firebaseConfig = {
  apiKey: 'PASTE_YOUR_API_KEY',
  authDomain: 'your-project-id.firebaseapp.com',
  projectId: 'your-project-id',
  storageBucket: 'your-project-id.firebasestorage.app',
  messagingSenderId: '000000000000',
  appId: '1:000000000000:web:0000000000000000000000',
};

/** True until the placeholder values above have been replaced. */
export const firebaseConfigMissing =
  firebaseConfig.apiKey.startsWith('PASTE_') || firebaseConfig.projectId === 'your-project-id';
