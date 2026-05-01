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
  'これ', 'それ', 'あれ', 'ここ', 'そこ', 'こと', 'もの', 'ため', 'よう', 'さん', 'です', 'ます', 'する', 'した', 'して', 'ある', 'いる', 'ない', '思う', '感じ', '自分', '今日', '今', '一つ', '全部', '少し', 'かなり', 'ちゃんと', 'なんか', 'だけど', 'でも', 'そして', 'それで', 'この', 'その', 'あの', 'から', 'まで', 'より', 'ので', 'なら', 'には', 'では', 'とも', 'として', 'という', 'みたい', 'アプリ', 'AI', 'mock', 'あなた', 'わたし', '私', '僕', '俺', '会議', '心の鏡', 'OTHERS', '言葉にならない', 'ずっと胸にある', '言葉にならないけど'
]);

const PARTICLE_WORDS = new Set([
  'は', 'が', 'を', 'に', 'で', 'と', 'の', 'へ', 'も', 'や', 'か', 'ね', 'よ', 'な', 'だ', 'て', 'た', 'し', 'ん', 'から', 'まで', 'より', 'ので', 'なら', 'には', 'では', 'とも', 'けど', 'でも'
]);

const IMPORTANT_COMPOUNDS = [
  '違和感', '情熱', '安心', '不安', '本音', '方向', '構造', '前提', '盲点', '現実', '火', '夢', '胸', '声', '言葉', '疲れ', '怖い', '好き', '創造', '迷い', '願い', '水面', '鏡', '感情'
];

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

const isValidShortWord = (token: string) => {
  if (STOP_WORDS.has(token) || PARTICLE_WORDS.has(token)) return false;
  if (/^[ぁ-ん]{1,2}$/.test(token)) return false;
  if (/^[a-zA-Z0-9_\-]+$/.test(token) && token.length < 3) return false;
  return token.length >= 2 && token.length <= 6;
};

const splitJapaneseChunk = (chunk: string) => {
  const found = new Set<string>();
  for (const word of IMPORTANT_COMPOUNDS) {
    if (chunk.includes(word) && isValidShortWord(word)) found.add(word);
  }

  const cleaned = chunk
    .replace(/(にならない|ならない|している|してる|したい|だった|です|ます|けれど|けど|ずっと|ちゃんと|すごく|とても|かなり|少し|小さな|大きな)/g, ' ')
    .replace(/[ぁ-んー]{3,}/g, ' ')
    .trim();

  for (const part of cleaned.split(/\s+/)) {
    if (isValidShortWord(part)) found.add(part);
  }

  return [...found];
};

const tokenize = (text: string) => {
  const normalized = normalize(text);
  const tokens = new Set<string>();

  for (const rawToken of normalized.split(/\s+/)) {
    const token = rawToken.trim();
    if (!token) continue;

    if (isValidShortWord(token)) {
      tokens.add(token);
      continue;
    }

    for (const split of splitJapaneseChunk(token)) {
      tokens.add(split);
    }
  }

  return [...tokens];
};

const rectsOverlap = (a: PlacedRect, b: PlacedRect) => {
  const gap = 10;
  return !(a.right + gap < b.left || a.left - gap > b.right || a.bottom + gap < b.top || a.top - gap > b.bottom);
};

const makeRect = (x: number, y: number, text: string, size: number): PlacedRect => {
  const width = clamp(text.length * size * 0.78 + 34, 56, 142);
  const height = clamp(size * 1.45 + 18, 36, 62);
  return {
    left: x - width / 2,
    right: x + width / 2,
    top: y - height / 2,
    bottom: y + height / 2,
  };
};

const isInsideSurface = (rect: PlacedRect) => {
  const padding = 8;
  return rect.left >= padding && rect.right <= 100 - padding && rect.top >= padding && rect.bottom <= 100 - padding;
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
  const radiusBase = index < 2 ? 10 : index < 5 ? 22 : 31;
  const centerBias = normalized * 6;
  const maxAttempts = 72;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const hash = hashString(`${targetSessionId}:${text}:${index}:${attempt}`);
    const angle = (hash % 6283) / 1000;
    const radius = radiusBase + ((hash >>> 8) % 16) - centerBias + attempt * 0.18;
    const x = clamp(50 + Math.cos(angle) * radius, 17, 83);
    const y = clamp(50 + Math.sin(angle) * radius * 0.62, 18, 82);
    const rect = makeRect(x, y, text, size);
    const hasOverlap = placed.some(existing => rectsOverlap(existing, rect));

    if (!hasOverlap && isInsideSurface(rect)) {
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
    if (!isValidShortWord(safe)) return;
    counts.set(safe, (counts.get(safe) || 0) + weight);
  };

  for (const message of messages) {
    const weight = message.role === 'user' ? 1.4 : 1;
    for (const token of tokenize(message.content)) add(token, weight);
  }

  for (const record of records.filter(item => item.sessionId === targetSessionId)) {
    for (const keyword of record.keywords) {
      for (const token of tokenize(keyword)) add(token, 2.2);
    }
    for (const token of tokenize(`${record.topic} ${record.selfLine} ${record.returnQuestion}`)) add(token, 0.8);
  }

  const entries = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].length - b[0].length)
    .slice(0, 8);

  const maxScore = Math.max(...entries.map(([, score]) => score), 1);
  const placed: PlacedRect[] = [];
  const results: FloatingKeyword[] = [];

  for (const [index, [text, score]] of entries.entries()) {
    const normalized = score / maxScore;
    const size = Math.round(14 + normalized * 13);
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
      opacity: 0.62 + normalized * 0.3,
      delay: (hash % 900) / 1000,
    });
  }

  return results;
};

export const getSessionMessageCount = (sessionId: string): number => {
  const state = loadState();
  return state.messages.filter((message: Message) => message.sessionId === sessionId).length;
};
