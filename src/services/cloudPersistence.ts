import { onAuthStateChanged, signInAnonymously, type User } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getFirebaseClient, isFirebaseConfigured } from './firebaseClient';
import type { StoredState } from './storage';

export type CloudStatus = 'disabled' | 'connecting' | 'ready' | 'error';

export type CloudSnapshot = {
  state: StoredState;
  savedAt: number;
};

const COLLECTION_NAME = 'users';
const SNAPSHOT_COLLECTION = 'snapshots';
const SNAPSHOT_ID = 'app-state';

let authPromise: Promise<User | null> | null = null;

export const getCloudStatusReason = () => {
  if (!isFirebaseConfigured()) {
    return 'Firebase環境変数が未設定のため、端末内保存で動作しています。';
  }
  return 'Firebase匿名ログインでクラウド保存を利用できます。';
};

export const ensureAnonymousUser = async (): Promise<User | null> => {
  const client = getFirebaseClient();
  if (!client) return null;
  if (client.auth.currentUser) return client.auth.currentUser;
  if (authPromise) return authPromise;

  authPromise = new Promise<User | null>((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(client.auth, user => {
      if (user) {
        unsubscribe();
        resolve(user);
      }
    }, error => {
      unsubscribe();
      reject(error);
    });

    void signInAnonymously(client.auth).catch(error => {
      unsubscribe();
      reject(error);
    });
  }).finally(() => {
    authPromise = null;
  });

  return authPromise;
};

export const readCloudSnapshot = async (): Promise<CloudSnapshot | null> => {
  const client = getFirebaseClient();
  if (!client) return null;

  const user = await ensureAnonymousUser();
  if (!user) return null;

  const snapshotRef = doc(client.db, COLLECTION_NAME, user.uid, SNAPSHOT_COLLECTION, SNAPSHOT_ID);
  const snapshot = await getDoc(snapshotRef);
  if (!snapshot.exists()) return null;

  const data = snapshot.data() as Partial<CloudSnapshot>;
  if (!data.state || typeof data.savedAt !== 'number') return null;

  return {
    state: data.state,
    savedAt: data.savedAt,
  };
};

export const writeCloudSnapshot = async (state: StoredState) => {
  const client = getFirebaseClient();
  if (!client) return;

  const user = await ensureAnonymousUser();
  if (!user) return;

  const snapshotRef = doc(client.db, COLLECTION_NAME, user.uid, SNAPSHOT_COLLECTION, SNAPSHOT_ID);
  await setDoc(snapshotRef, {
    state,
    savedAt: state.savedAt,
    updatedAt: serverTimestamp(),
  }, { merge: true });
};
