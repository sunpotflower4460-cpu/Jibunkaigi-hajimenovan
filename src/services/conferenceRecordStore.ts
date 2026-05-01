import type { ConferenceRecord } from '../types';

const RECORDS_STORAGE_KEY = 'jibunkaigi_conference_records_v1';
const MAX_RECORDS = 200;

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const toSafeString = (value: unknown, fallback = '') => typeof value === 'string' ? value : fallback;
const toSafeNumber = (value: unknown, fallback = Date.now()) => typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const sanitizeAgentNotes = (value: unknown): ConferenceRecord['agentNotes'] => {
  if (!isPlainObject(value)) return {};
  const notes: ConferenceRecord['agentNotes'] = {};
  for (const key of ['soul', 'creative', 'strategist', 'empath', 'critic', 'master'] as const) {
    const note = toSafeString(value[key]).trim();
    if (note) notes[key] = note.slice(0, 160);
  }
  return notes;
};

const sanitizeRecord = (value: unknown): ConferenceRecord | null => {
  if (!isPlainObject(value)) return null;
  const id = toSafeString(value.id).trim();
  const sessionId = toSafeString(value.sessionId).trim();
  if (!id || !sessionId) return null;

  const keywords = Array.isArray(value.keywords)
    ? value.keywords.map(keyword => toSafeString(keyword).trim()).filter(Boolean).slice(0, 12)
    : [];

  const createdAt = toSafeNumber(value.createdAt);
  const updatedAt = toSafeNumber(value.updatedAt, createdAt);

  return {
    id,
    sessionId,
    title: toSafeString(value.title, '会議録').trim().slice(0, 60) || '会議録',
    topic: toSafeString(value.topic, 'まだ言葉になりきらない問い').trim().slice(0, 120) || 'まだ言葉になりきらない問い',
    keywords,
    agentNotes: sanitizeAgentNotes(value.agentNotes),
    mirrorSummary: toSafeString(value.mirrorSummary).trim().slice(0, 800),
    selfLine: toSafeString(value.selfLine).trim().slice(0, 160),
    returnQuestion: toSafeString(value.returnQuestion).trim().slice(0, 160),
    createdAt,
    updatedAt,
  };
};

const sanitizeRecords = (records: unknown): ConferenceRecord[] => {
  if (!Array.isArray(records)) return [];
  return records
    .map(sanitizeRecord)
    .filter((record): record is ConferenceRecord => Boolean(record))
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, MAX_RECORDS);
};

export const loadConferenceRecords = (): ConferenceRecord[] => {
  try {
    const raw = localStorage.getItem(RECORDS_STORAGE_KEY);
    if (!raw) return [];
    return sanitizeRecords(JSON.parse(raw));
  } catch (error) {
    console.warn('Failed to load conference records', error);
    return [];
  }
};

export const saveConferenceRecords = (records: ConferenceRecord[]) => {
  const safeRecords = sanitizeRecords(records);
  try {
    localStorage.setItem(RECORDS_STORAGE_KEY, JSON.stringify(safeRecords));
    return loadConferenceRecords();
  } catch (error) {
    console.warn('Failed to save conference records', error);
    return safeRecords;
  }
};

export const upsertConferenceRecord = (record: ConferenceRecord) => {
  const records = loadConferenceRecords();
  return saveConferenceRecords([record, ...records.filter(item => item.id !== record.id)].slice(0, MAX_RECORDS));
};

export const deleteConferenceRecord = (recordId: string) => {
  return saveConferenceRecords(loadConferenceRecords().filter(record => record.id !== recordId));
};
