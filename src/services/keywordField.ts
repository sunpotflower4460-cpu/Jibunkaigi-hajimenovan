import { loadConferenceRecords } from './conferenceRecordStore';
import { loadState } from './storage';
import type { Message, Session } from '../types';

export type FloatingKeyword = {
  text: string;
  score: number;
  size: number;
  x: number;
  y: number;
  opacity: number;
  delay: number;
};

type PlacedRect = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

const STOP_WORDS = new Set([
  'これ', 'それ', 'あれ', 'ここ', 'そこ', 'こと', 'もの', 'ため', 'よう', 'さん', 'です', 'ます', 'する', 'した', 'して', 'ある', 'いる', 'ない', '思う', '感じ', '自分', '今日', '今', '一つ', '全部', '少し', 'かなり', 'ちゃんと', 'なんか', 'だけど', 'でも', 'そして', 'それで', 'この', 'その', 'あの', 'から', 'まで', 'より', 'ので', 'なら', 'には', 'では', 'とも', 'として', 'という', 'みたい', 'アプリ', 'AI', 'mock', 'あなた', 'わたし', '私', '僕', '俺', '会議', '心の鏡', 'OTHERS'
]);

const normalize = (text: string) => {
  return text
    .replace(/[\n\r\t]/g, ' ')
    .replace(/[、。！？!?「」『』（）()\[\]{}.,:;・]/g, ' ')
    .trim();
};

const hashString = (text: string) => {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return hash;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const tokenize = (text: string) => {
  return normalize(text)
    .split(/\s+/)
    .flatMap(token => token.split(/(?=[A-ZＡ-Ｚ])/))
    .map(token => token.trim())
    .filter(Boolean)
    .filter(token => token.length >= 2 && token.length <= 10)
    .filter(token => !STOP_WORDS.has(token));
};

const rectsOverlap = (a: PlacedRect, b: PlacedRect) => {
  return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
};

const makeRect = (x: number, y: number, text: string, size: number): PlacedRect => {
  const width = clamp(text.length * size * 0.72 + 24, 48, 180);
  const height = clamp(size * 1.7 + 14, 34, 76);
  return {
    left: x - width / 2,
    right: x + width / 2,
    top: y - height / 2,
    bottom: y + height / 2,
  };
};

const findKeywordPosition = ({
  targetSessionId,
  text,
  index,
  size,
  normalized,
  placed,
}: {
  targetSessionId: string;
  text: string;
  index: number;
  size: number;
  normalized: number;
  placed: PlacedRect[];
}) => {
  const radiusBase = index < 3 ? 18 : index < 8 ? 28 : 36;
  const centerBias = normalized * 9;
  const maxAttempts = 52;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const hash = hashString(`${targetSessionId}:${text}:${index}:${attempt}`);
    const angle = ((hash % 6283) / 1000);
    const radius = radiusBase + ((hash >>> 8) % 18) - centerBias + attempt * 0.45;
    const x = clamp(50 + Math.cos(angle) * radius, 14, 86);
    const y = clamp(50 + Math.sin(angle) * radius * 0.72, 16, 84);
    const rect = makeRect(x, y, text, size);
    const hasOverlap = placed.some(existing => rectsOverlap(existing, rect));

    if (!hasOverlap) {
      placed.push(rect);
      return { x, y };
    }
  }

  return null;
};

export const getRecentSessions = (): Session[] => {
  const state = loadState();
  return [...state.sessions].sort((a, b) => b.updatedAt - a.updatedAt);
};

export const buildFloatingKeywords = (sessionId?: string): FloatingKeyword[] => {
  const state = loadState();
  const records = loadConferenceRecords();
  const targetSessionId = sessionId || [...state.sessions].sort((a, b) => b.updatedAt - a.updatedAt)[0]?.id;
  if (!targetSessionId) return [];

  const messages = state.messages.filter(message => message.sessionId === targetSessionId);
  const counts = new Map<string, number>();

  const add = (keyword: string, weight: number) => {
    const safe = keyword.trim();
    if (!safe || STOP_WORDS.has(safe)) return;
    counts.set(safe, (counts.get(safe) || 0) + weight);
  };

  for (const message of messages) {
    const weight = message.role === 'user' ? 1.4 : 1;
    for (const token of tokenize(message.content)) add(token, weight);
  }

  for (const record of records.filter(item => item.sessionId === targetSessionId)) {
    for (const keyword of record.keywords) add(keyword, 2.2);
    for (const token of tokenize(`${record.topic} ${record.selfLine} ${record.returnQuestion}`)) add(token, 0.8);
  }

  const entries = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .slice(0, 12);

  const maxScore = Math.max(...entries.map(([, score]) => score), 1);
  const placed: PlacedRect[] = [];
  const results: FloatingKeyword[] = [];

  for (const [index, [text, score]] of entries.entries()) {
    const normalized = score / maxScore;
    const size = Math.round(15 + normalized * 17);
    const position = findKeywordPosition({
      targetSessionId,
      text,
      index,
      size,
      normalized,
      placed,
    });

    if (!position) continue;

    const hash = hashString(`${targetSessionId}:${text}:${index}`);
    results.push({
      text,
      score,
      size,
      x: position.x,
      y: position.y,
      opacity: 0.58 + normalized * 0.34,
      delay: (hash % 900) / 1000,
    });
  }

  return results;
};

export const getSessionMessageCount = (sessionId: string): number => {
  const state = loadState();
  return state.messages.filter((message: Message) => message.sessionId === sessionId).length;
};
