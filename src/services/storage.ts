import type { Message, Session, UserSettings } from '../types';

const STORAGE_KEY = 'jibunkaigi_hajimenovan_v1';

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
    return {
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
      messages: Array.isArray(parsed.messages) ? parsed.messages : [],
      settings: {
        displayName: parsed.settings?.displayName || 'あなた',
        introSeen: Boolean(parsed.settings?.introSeen),
      },
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
