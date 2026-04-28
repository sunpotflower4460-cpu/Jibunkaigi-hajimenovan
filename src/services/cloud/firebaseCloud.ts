import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInAnonymously, type User } from 'firebase/auth';
import { doc, getDoc, getFirestore, setDoc, type Firestore } from 'firebase/firestore';
import type { StoredState } from '../storage';

export type CloudSaveStatus =
  | 'disabled'
  | 'connecting'
  | 'signed-in'
  | 'syncing'
  | 'synced'
  | 'error';

export type CloudSaveSnapshot = {
  status: CloudSaveStatus;
  uid: string | null;
  lastSyncedAt: number | null;
  errorMessage: string | null;
};

type CloudStateRecord = {
  state: StoredState;
  savedAt: number;
  updatedAt: number;
};

const listeners = new Set<(snapshot: CloudSaveSnapshot) => void>();
let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let currentUser: User | null = null;
let latestSnapshot: CloudSaveSnapshot = {
  status: 'disabled',
  uid: null,
  lastSyncedAt: null,
  errorMessage: null,
};
let initPromise: Promise<CloudSaveSnapshot> | null = null;
let syncTimer: number | null = null;
let queuedState: StoredState | null = null;

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const isCloudSaveConfigured = () => {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId && firebaseConfig.appId);
};

const emit = (patch: Partial<CloudSaveSnapshot>) => {
  latestSnapshot = { ...latestSnapshot, ...patch };
  for (const listener of listeners) listener(latestSnapshot);
};

export const getCloudSaveSnapshot = () => latestSnapshot;

export const subscribeCloudSaveStatus = (listener: (snapshot: CloudSaveSnapshot) => void) => {
  listeners.add(listener);
  listener(latestSnapshot);
  return () => {
    listeners.delete(listener);
  };
};

const getStateDocRef = () => {
  if (!db || !currentUser) return null;
  return doc(db, 'users', currentUser.uid, 'snapshots', 'app-state');
};

export const initCloudSave = async (): Promise<CloudSaveSnapshot> => {
  if (!isCloudSaveConfigured()) {
    emit({ status: 'disabled', uid: null, errorMessage: null });
    return latestSnapshot;
  }

  if (initPromise) return initPromise;

  initPromise = new Promise<CloudSaveSnapshot>((resolve) => {
    try {
      emit({ status: 'connecting', errorMessage: null });
      app = app || initializeApp(firebaseConfig);
      db = db || getFirestore(app);
      const auth = getAuth(app);

      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
          currentUser = user;
          emit({ status: 'signed-in', uid: user.uid, errorMessage: null });
          unsubscribe();
          resolve(latestSnapshot);
          return;
        }

        try {
          await signInAnonymously(auth);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          emit({ status: 'error', uid: null, errorMessage: message });
          unsubscribe();
          resolve(latestSnapshot);
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      emit({ status: 'error', uid: null, errorMessage: message });
      resolve(latestSnapshot);
    }
  });

  return initPromise;
};

export const fetchCloudState = async (): Promise<StoredState | null> => {
  const snapshot = await initCloudSave();
  if (snapshot.status === 'disabled' || snapshot.status === 'error') return null;

  const ref = getStateDocRef();
  if (!ref) return null;

  try {
    const documentSnapshot = await getDoc(ref);
    if (!documentSnapshot.exists()) return null;
    const data = documentSnapshot.data() as Partial<CloudStateRecord>;
    return data.state || null;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    emit({ status: 'error', errorMessage: message });
    return null;
  }
};

export const saveCloudStateNow = async (state: StoredState) => {
  const snapshot = await initCloudSave();
  if (snapshot.status === 'disabled' || snapshot.status === 'error') return;

  const ref = getStateDocRef();
  if (!ref) return;

  try {
    emit({ status: 'syncing', errorMessage: null });
    const now = Date.now();
    await setDoc(ref, {
      state,
      savedAt: state.savedAt,
      updatedAt: now,
    } satisfies CloudStateRecord, { merge: true });
    emit({ status: 'synced', lastSyncedAt: now, errorMessage: null });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    emit({ status: 'error', errorMessage: message });
  }
};

export const scheduleCloudStateSave = (state: StoredState) => {
  if (!isCloudSaveConfigured()) return;
  queuedState = state;

  if (syncTimer !== null) {
    window.clearTimeout(syncTimer);
  }

  syncTimer = window.setTimeout(() => {
    syncTimer = null;
    if (!queuedState) return;
    const stateToSave = queuedState;
    queuedState = null;
    void saveCloudStateNow(stateToSave);
  }, 900);
};
