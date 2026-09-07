import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';
import fallbackConfig from '../../firebase-applet-config.json';

// Resolves environment variables from Vercel / Vite env if provided, otherwise falls back to config file
const rawFallback = fallbackConfig as Record<string, any>;
const envProjectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
const projectId = envProjectId || rawFallback.projectId || '';

// Determine database ID: if custom project is set via env, only use (default) unless explicitly specified
const envDatabaseId = import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID;
let firestoreDatabaseId = '(default)';

if (envDatabaseId && envDatabaseId !== '(default)') {
  firestoreDatabaseId = envDatabaseId;
} else if (!envProjectId && rawFallback.firestoreDatabaseId && rawFallback.firestoreDatabaseId !== '(default)') {
  firestoreDatabaseId = rawFallback.firestoreDatabaseId;
}

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || rawFallback.apiKey || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || rawFallback.authDomain || '',
  projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || rawFallback.storageBucket || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || rawFallback.messagingSenderId || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || rawFallback.appId || '',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || rawFallback.measurementId || '',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Initialize Analytics when supported in browser environment
export let analytics: ReturnType<typeof getAnalytics> | null = null;
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported && firebaseConfig.measurementId) {
      analytics = getAnalytics(app);
    }
  }).catch(() => {
    // Analytics not supported in this environment
  });
}

// Initialize Firestore with robust multi-tab persistent offline caching
let firestoreDb;
try {
  firestoreDb = initializeFirestore(
    app,
    {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    },
    firestoreDatabaseId && firestoreDatabaseId !== '(default)' ? firestoreDatabaseId : undefined
  );
} catch {
  // If already initialized or running in an environment without IndexedDB
  firestoreDb =
    firestoreDatabaseId && firestoreDatabaseId !== '(default)'
      ? getFirestore(app, firestoreDatabaseId)
      : getFirestore(app);
}

export const db = firestoreDb;

export default app;

