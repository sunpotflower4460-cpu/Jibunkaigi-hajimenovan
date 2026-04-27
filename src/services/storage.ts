import type { Message, Session, UserSettings } from '../types';

const STORAGE_KEY = 'jibunkaigi_hajimenovan_v1';
const MAX_SESSIONS = 100;
const MAX_MESSAGES = 1000;

export type StoredState = {
  sessions: Session[];
  messages: Message[];
  settings: UserSettings;
};

const defaultState: StoredState = {
  sessions: [],
  messages: [],
  settings: {
    displayName: 'あなた',
    introSeen: false,
  },
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

const sanitizeMessage = (value: unknown, sessionIds: Set<string>): Message | null => {
  if (!isPlainObject(value)) return null;
  const id = toSafeString(value.id).trim();
  const sessionId = toSafeString(value.sessionId).trim();
  const role = value.role;
  const content = toSafeString(value.content).trim();
  if (!id || !sessionId || !sessionIds.has(sessionId) || !content) return null;
  if (role !== 'user' && role !== 'ai') return null;

  return {
    id,
    sessionId,
    role,
    content,
    agentId: toSafeString(value.agentId) as Message['agentId'],
    reactions: isPlainObject(value.reactions) ? (value.reactions as Message['reactions']) : undefined,
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
    const parsed = JSON.parse(raw) as Partial<StoredState>;
    const sessions = (Array.isArray(parsed.sessions) ? parsed.sessions : [])
      .map(sanitizeSession)
      .filter((session): session is Session => Boolean(session))
      .slice(0, MAX_SESSIONS);
    const sessionIds = new Set(sessions.map(session => session.id));
    const messages = (Array.isArray(parsed.messages) ? parsed.messages : [])
      .map(message => sanitizeMessage(message, sessionIds))
      .filter((message): message is Message => Boolean(message))
      .slice(-MAX_MESSAGES);

    return {
      sessions,
      messages,
      settings: sanitizeSettings(parsed.settings),
    };
  } catch (error) {
    console.warn('Failed to load local state', error);
    return defaultState;
  }
};

export const saveState = (state: StoredState) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('Failed to save local state', error);
  }
};
