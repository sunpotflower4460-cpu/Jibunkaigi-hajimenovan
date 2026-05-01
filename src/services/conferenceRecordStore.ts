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

  return {
    id,
    sessionId,
    title: toSafeString(value.title, '会議録').trim() || '会議録',
    topic: toSafeString(value.topic, 'まだ言葉になりきらない問い').trim() || 'まだ言葉になりきらない問い',
    keywords,
    agentNotes: sanitizeAgentNotes(value.agentNotes),
    mirrorSummary: toSafeString(value.mirrorSummary).trim().slice(0, 800),
    selfLine: toSafeString(value.selfLine).trim().slice(0, 160),
    returnQuestion: toSafeString(value.returnQuestion).trim().slice(0, 160),
    createdAt: toSafeNumber(value.createdAt),
    updatedAt: toSafeNumber(value.updatedAt),
  };
};

export const loadConferenceRecords = (): ConferenceRecord[] => {
  try {
    const raw = localStorage.getItem(RECORDS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(sanitizeRecord)
      .filter((record): record is ConferenceRecord => Boolean(record))
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, MAX_RECORDS);
  } catch (error) {
    console.warn('Failed to load conference records', error);
    return [];
  }
};

export const saveConferenceRecords = (records: ConferenceRecord[]) => {
  try {
    const safeRecords = records
      .map(sanitizeRecord)
      .filter((record): record is ConferenceRecord => Boolean(record))
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, MAX_RECORDS);
    localStorage.setItem(RECORDS_STORAGE_KEY, JSON.stringify(safeRecords));
  } catch (error) {
    console.warn('Failed to save conference records', error);
  }
};

export const upsertConferenceRecord = (record: ConferenceRecord) => {
  const records = loadConferenceRecords();
  const nextRecords = [record, ...records.filter(item => item.id !== record.id)].slice(0, MAX_RECORDS);
  saveConferenceRecords(nextRecords);
  return nextRecords;
};

export const deleteConferenceRecord = (recordId: string) => {
  const records = loadConferenceRecords().filter(record => record.id !== recordId);
  saveConferenceRecords(records);
  return records;
};
