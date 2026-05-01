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
    .filter(token => token.length >= 2 && token.length <= 14)
    .filter(token => !STOP_WORDS.has(token));
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
    .slice(0, 18);

  const maxScore = Math.max(...entries.map(([, score]) => score), 1);

  return entries.map(([text, score], index) => {
    const hash = hashString(`${targetSessionId}:${text}:${index}`);
    const normalized = score / maxScore;
    const centerPull = normalized * 10;
    const x = clamp(12 + (hash % 74) - centerPull / 2, 6, 86);
    const y = clamp(14 + ((hash >>> 8) % 66) - centerPull / 3, 8, 82);

    return {
      text,
      score,
      size: Math.round(13 + normalized * 19),
      x,
      y,
      opacity: 0.48 + normalized * 0.44,
      delay: (hash % 900) / 1000,
    };
  });
};

export const getSessionMessageCount = (sessionId: string): number => {
  const state = loadState();
  return state.messages.filter((message: Message) => message.sessionId === sessionId).length;
};
