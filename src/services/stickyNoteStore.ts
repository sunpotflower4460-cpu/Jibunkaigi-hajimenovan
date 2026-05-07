import type { StickyNote, StickyNoteKind } from '../types';
import { makeId } from './storage';

const STICKY_NOTES_STORAGE_KEY = 'jibunkaigi_sticky_notes_v1';
const MAX_NOTES = 300;

export const STICKY_NOTE_TEMPLATES: Array<{ kind: StickyNoteKind; label: string; placeholder: string }> = [
  { kind: 'question', label: 'どう思う？', placeholder: 'この言葉に、今の私はどう思う？' },
  { kind: 'truth', label: 'これは本音かも', placeholder: '本音かもしれない理由を一言で残す' },
  { kind: 'notYet', label: 'まだ違う', placeholder: 'どこが違うと感じた？' },
  { kind: 'later', label: '後で見る', placeholder: '後で戻ってきたい理由' },
  { kind: 'important', label: '大事', placeholder: '何が大事だと感じた？' },
  { kind: 'free', label: '自由入力', placeholder: '自分だけの付箋を書く' },
];

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const toSafeString = (value: unknown, fallback = '') => typeof value === 'string' ? value : fallback;
const toSafeNumber = (value: unknown, fallback = Date.now()) => typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const isStickyKind = (value: unknown): value is StickyNoteKind => {
  return typeof value === 'string' && ['question', 'truth', 'notYet', 'later', 'important', 'free'].includes(value);
};

const sanitizeNote = (value: unknown): StickyNote | null => {
  if (!isPlainObject(value)) return null;
  const id = toSafeString(value.id).trim();
  const sessionId = toSafeString(value.sessionId).trim();
  const kind = isStickyKind(value.kind) ? value.kind : 'free';
  const template = STICKY_NOTE_TEMPLATES.find(item => item.kind === kind) || STICKY_NOTE_TEMPLATES[0];
  const content = toSafeString(value.content).trim();
  if (!id || !sessionId || !content) return null;

  const createdAt = toSafeNumber(value.createdAt);
  const updatedAt = toSafeNumber(value.updatedAt, createdAt);

  return {
    id,
    sessionId,
    kind,
    label: toSafeString(value.label, template.label).trim().slice(0, 30) || template.label,
    content: content.slice(0, 220),
    createdAt,
    updatedAt,
  };
};

const sanitizeNotes = (notes: unknown): StickyNote[] => {
  if (!Array.isArray(notes)) return [];
  return notes
    .map(sanitizeNote)
    .filter((note): note is StickyNote => Boolean(note))
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, MAX_NOTES);
};

export const loadStickyNotes = (): StickyNote[] => {
  try {
    const raw = localStorage.getItem(STICKY_NOTES_STORAGE_KEY);
    if (!raw) return [];
    return sanitizeNotes(JSON.parse(raw));
  } catch (error) {
    console.warn('Failed to load sticky notes', error);
    return [];
  }
};

export const saveStickyNotes = (notes: StickyNote[]) => {
  const safeNotes = sanitizeNotes(notes);
  try {
    localStorage.setItem(STICKY_NOTES_STORAGE_KEY, JSON.stringify(safeNotes));
    return loadStickyNotes();
  } catch (error) {
    console.warn('Failed to save sticky notes', error);
    return safeNotes;
  }
};

export const clearStickyNotes = () => {
  try {
    localStorage.removeItem(STICKY_NOTES_STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear sticky notes', error);
  }
};

export const createStickyNote = ({
  sessionId,
  kind,
  content,
}: {
  sessionId: string;
  kind: StickyNoteKind;
  content: string;
}) => {
  const safeSessionId = sessionId.trim();
  const safeContent = content.trim().slice(0, 220);
  if (!safeSessionId || !safeContent) return loadStickyNotes();

  const template = STICKY_NOTE_TEMPLATES.find(item => item.kind === kind) || STICKY_NOTE_TEMPLATES[0];
  const now = Date.now();
  const note: StickyNote = {
    id: makeId(),
    sessionId: safeSessionId,
    kind,
    label: template.label,
    content: safeContent,
    createdAt: now,
    updatedAt: now,
  };
  return saveStickyNotes([note, ...loadStickyNotes()].slice(0, MAX_NOTES));
};

export const deleteStickyNote = (noteId: string) => {
  return saveStickyNotes(loadStickyNotes().filter(note => note.id !== noteId));
};
