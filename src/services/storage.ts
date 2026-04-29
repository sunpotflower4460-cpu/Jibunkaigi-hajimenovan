import { scheduleCloudStateSave } from './cloud/firebaseCloud';
import type { AgentId, Message, Reaction, Session, UserSettings } from '../types';

export const STORAGE_KEY = 'jibunkaigi_hajimenovan_v1';
const DB_NAME = 'jibunkaigi_hajimenovan_db';
const DB_VERSION = 1;
const STORE_NAME = 'snapshots';
const APP_STATE_ID = 'app-state';
const MAX_SESSIONS = 100;
const MAX_MESSAGES = 1000;

const AGENT_IDS: Exclude<AgentId, 'master'>[] = ['soul', 'creative', 'strategist', 'empath', 'critic'];

const FALLBACK_REACTIONS: Record<Exclude<AgentId, 'master'>, Reaction> = {
  soul: { posture: '静観', comment: '静かに映している' },
  creative: { posture: '点火', comment: 'まだ熱を見ている' },
  strategist: { posture: '整理', comment: '構造を見ている' },
  empath: { posture: '抱擁', comment: 'そっと受け止めている' },
  critic: { posture: '警戒', comment: '足場を見ている' },
};

export type StoredState = {
  sessions: Session[];
  messages: Message[];
  settings: UserSettings;
  savedAt: number;
};

type IndexedDbRecord = {
  id: string;
  state: StoredState;
  savedAt: number;
};

const defaultState: StoredState = {
  sessions: [],
  messages: [],
  settings: {
    displayName: 'あなた',
    introSeen: false,
  },
  savedAt: 0,
};

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const toSafeString = (value: unknown, fallback = '') => {
  return typeof value === 'string' ? value : fallback;
};

const toSafeNumber = (value: unknown, fallback = Date.now()) => {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
};

const sanitizeSession = (value: unknown): Session | null => {
  if (!isPlainObject(value)) return null;
  const id = toSafeString(value.id).trim();
  if (!id) return null;
  const now = Date.now();
  return {
    id,
    title: toSafeString(value.title, '無題の問い').trim() || '無題の問い',
    createdAt: toSafeNumber(value.createdAt, now),
    updatedAt: toSafeNumber(value.updatedAt, now),
    isPinned: Boolean(value.isPinned),
  };
};

const sanitizeReactions = (value: unknown, ownAgentId?: AgentId): Message['reactions'] | undefined => {
  const reactions: Partial<Record<AgentId, Reaction>> = {};

  if (isPlainObject(value)) {
    for (const agentId of AGENT_IDS) {
      const rawReaction = value[agentId];
      if (!isPlainObject(rawReaction)) continue;
      const posture = toSafeString(rawReaction.posture).trim();
      const comment = toSafeString(rawReaction.comment).trim();
      if (posture && comment) {
        reactions[agentId] = {
          posture: posture.slice(0, 12),
          comment: comment.slice(0, 40),
        };
      }
    }
  }

  if (ownAgentId && ownAgentId !== 'master') {
    for (const agentId of AGENT_IDS) {
      if (agentId !== ownAgentId && !reactions[agentId]) {
        reactions[agentId] = FALLBACK_REACTIONS[agentId];
      }
    }
  }

  return Object.keys(reactions).length > 0 ? reactions : undefined;
};

const sanitizeMessage = (value: unknown, sessionIds: Set<string>): Message | null => {
  if (!isPlainObject(value)) return null;
  const id = toSafeString(value.id).trim();
  const sessionId = toSafeString(value.sessionId).trim();
  const role = value.role;
  const content = toSafeString(value.content).trim();
  if (!id || !sessionId || !sessionIds.has(sessionId) || !content) return null;
  if (role !== 'user' && role !== 'ai') return null;

  const VALID_AGENT_IDS: AgentId[] = ['soul', 'creative', 'strategist', 'empath', 'critic', 'master'];
  const rawAgentId = toSafeString(value.agentId);
  const agentId = (VALID_AGENT_IDS as string[]).includes(rawAgentId) ? (rawAgentId as AgentId) : undefined;

  return {
    id,
    sessionId,
    role,
    content,
    agentId,
    reactions: role === 'ai' ? sanitizeReactions(value.reactions, agentId) : undefined,
    createdAt: toSafeNumber(value.createdAt),
  };
};

const sanitizeSettings = (value: unknown): UserSettings => {
  if (!isPlainObject(value)) return defaultState.settings;
  const displayName = toSafeString(value.displayName, 'あなた').trim();
  return {
    displayName: displayName.slice(0, 30) || 'あなた',
    introSeen: Boolean(value.introSeen),
  };
};

export const sanitizeStoredState = (value: unknown): StoredState => {
  if (!isPlainObject(value)) return defaultState;
  const sessions = (Array.isArray(value.sessions) ? value.sessions : [])
    .map(sanitizeSession)
    .filter((session): session is Session => Boolean(session))
    .slice(0, MAX_SESSIONS);
  const sessionIds = new Set(sessions.map(session => session.id));
  const messages = (Array.isArray(value.messages) ? value.messages : [])
    .map(message => sanitizeMessage(message, sessionIds))
    .filter((message): message is Message => Boolean(message))
    .slice(-MAX_MESSAGES);

  return {
    sessions,
    messages,
    settings: sanitizeSettings(value.settings),
    savedAt: toSafeNumber(value.savedAt, 0),
  };
};

const openDatabase = () => new Promise<IDBDatabase>((resolve, reject) => {
  if (typeof indexedDB === 'undefined') {
    reject(new Error('IndexedDB is not available'));
    return;
  }

  const request = indexedDB.open(DB_NAME, DB_VERSION);

  request.onupgradeneeded = () => {
    const db = request.result;
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      db.createObjectStore(STORE_NAME, { keyPath: 'id' });
    }
  };

  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB'));
});

const readIndexedDbState = async (): Promise<StoredState | null> => {
  try {
    const db = await openDatabase();
    return await new Promise<StoredState | null>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(APP_STATE_ID);

      request.onsuccess = () => {
        const record = request.result as IndexedDbRecord | undefined;
        resolve(record?.state ? sanitizeStoredState(record.state) : null);
      };
      request.onerror = () => reject(request.error || new Error('Failed to read IndexedDB'));
      transaction.oncomplete = () => db.close();
      transaction.onerror = () => {
        db.close();
        reject(transaction.error || new Error('IndexedDB read transaction failed'));
      };
    });
  } catch (error) {
    console.warn('Failed to read IndexedDB state', error);
    return null;
  }
};

const writeIndexedDbState = async (state: StoredState) => {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      store.put({ id: APP_STATE_ID, state, savedAt: state.savedAt } satisfies IndexedDbRecord);

      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
      transaction.onerror = () => {
        db.close();
        reject(transaction.error || new Error('IndexedDB write transaction failed'));
      };
    });
  } catch (error) {
    console.warn('Failed to save IndexedDB state', error);
  }
};

const writeLocalStorageState = (state: StoredState) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export const makeId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

export const loadState = (): StoredState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    return sanitizeStoredState(JSON.parse(raw));
  } catch (error) {
    console.warn('Failed to load local state', error);
    return defaultState;
  }
};

export const restoreStateToLocalStores = (state: StoredState) => {
  const nextState = sanitizeStoredState(state);
  try {
    writeLocalStorageState(nextState);
  } catch (error) {
    console.warn('Failed to restore localStorage state', error);
  }
  void writeIndexedDbState(nextState);
};

export const hydrateLocalStorageFromIndexedDb = async () => {
  const localState = loadState();
  const indexedDbState = await readIndexedDbState();

  if (!indexedDbState || indexedDbState.savedAt <= localState.savedAt) return;

  restoreStateToLocalStores(indexedDbState);
};

export const saveState = (state: Omit<StoredState, 'savedAt'> | StoredState) => {
  const nextState: StoredState = {
    sessions: state.sessions,
    messages: state.messages,
    settings: state.settings,
    savedAt: Date.now(),
  };

  try {
    writeLocalStorageState(nextState);
  } catch (error) {
    console.warn('Failed to save local state', error);
  }

  void writeIndexedDbState(nextState);
  scheduleCloudStateSave(nextState);
};
