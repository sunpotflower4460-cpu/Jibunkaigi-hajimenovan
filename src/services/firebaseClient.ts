import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

export type FirebaseClient = {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
};

const requiredConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const optionalConfig = {
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const hasRequiredFirebaseConfig = Object.values(requiredConfig).every(value => typeof value === 'string' && value.length > 0);

let cachedClient: FirebaseClient | null = null;

export const isFirebaseConfigured = () => hasRequiredFirebaseConfig;

export const getFirebaseClient = (): FirebaseClient | null => {
  if (!hasRequiredFirebaseConfig) return null;
  if (cachedClient) return cachedClient;

  const app = initializeApp({
    ...requiredConfig,
    ...Object.fromEntries(Object.entries(optionalConfig).filter(([, value]) => Boolean(value))),
  });

  cachedClient = {
    app,
    auth: getAuth(app),
    db: getFirestore(app),
  };

  return cachedClient;
};
