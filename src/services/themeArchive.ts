import { loadConferenceRecords } from './conferenceRecordStore';
import { loadStickyNotes } from './stickyNoteStore';
import { loadState } from './storage';

export type ThemeStat = {
  keyword: string;
  score: number;
  recordCount: number;
  noteCount: number;
  messageCount: number;
  lastSeenAt: number;
};

export type ThemeArchive = {
  themes: ThemeStat[];
  recentRecords: ReturnType<typeof loadConferenceRecords>;
  recentNotes: ReturnType<typeof loadStickyNotes>;
  totals: {
    sessions: number;
    messages: number;
    records: number;
    notes: number;
  };
};

const STOP_WORDS = new Set([
  'これ', 'それ', 'あれ', 'ここ', 'そこ', 'こと', 'もの', 'ため', 'よう', 'さん', 'です', 'ます', 'する', 'した', 'して', 'ある', 'いる', 'ない', '思う', '感じ', '自分', '今日', '今', '一つ', '全部', '少し', 'かなり', 'ちゃんと', 'なんか', 'だけど', 'でも', 'そして', 'それで', 'この', 'その', 'あの', 'から', 'まで', 'より', 'ので', 'なら', 'には', 'では', 'とも', 'として', 'という', 'みたい', 'アプリ', 'AI', 'mock', 'あなた', 'わたし', '私', '僕', '俺', '会議', '心の鏡', 'OTHERS', '付箋', '会議録'
]);

const normalize = (text: string) => text.replace(/[\n\r\t]/g, ' ').replace(/[、。！？!?「」『』（）()\[\]{}.,:;・]/g, ' ').trim();

const tokenize = (text: string) => {
  return normalize(text)
    .split(/\s+/)
    .flatMap(token => token.split(/(?=[A-ZＡ-Ｚ])/))
    .map(token => token.trim())
    .filter(Boolean)
    .filter(token => token.length >= 2 && token.length <= 14)
    .filter(token => !STOP_WORDS.has(token));
};

const ensureTheme = (map: Map<string, ThemeStat>, keyword: string): ThemeStat => {
  const existing = map.get(keyword);
  if (existing) return existing;
  const next: ThemeStat = {
    keyword,
    score: 0,
    recordCount: 0,
    noteCount: 0,
    messageCount: 0,
    lastSeenAt: 0,
  };
  map.set(keyword, next);
  return next;
};

export const buildThemeArchive = (): ThemeArchive => {
  const state = loadState();
  const records = loadConferenceRecords();
  const notes = loadStickyNotes();
  const themes = new Map<string, ThemeStat>();

  for (const record of records) {
    const seenInRecord = new Set<string>();
    for (const keyword of record.keywords) {
      const theme = ensureTheme(themes, keyword);
      theme.score += 3;
      theme.lastSeenAt = Math.max(theme.lastSeenAt, record.updatedAt);
      if (!seenInRecord.has(keyword)) {
        theme.recordCount += 1;
        seenInRecord.add(keyword);
      }
    }

    for (const token of tokenize(`${record.topic} ${record.selfLine} ${record.returnQuestion}`)) {
      const theme = ensureTheme(themes, token);
      theme.score += 1.2;
      theme.lastSeenAt = Math.max(theme.lastSeenAt, record.updatedAt);
      if (!seenInRecord.has(token)) {
        theme.recordCount += 1;
        seenInRecord.add(token);
      }
    }
  }

  for (const note of notes) {
    const seenInNote = new Set<string>();
    const noteWeight = note.kind === 'important' || note.kind === 'truth' ? 2.2 : 1.4;
    for (const token of tokenize(`${note.label} ${note.content}`)) {
      const theme = ensureTheme(themes, token);
      theme.score += noteWeight;
      theme.lastSeenAt = Math.max(theme.lastSeenAt, note.updatedAt);
      if (!seenInNote.has(token)) {
        theme.noteCount += 1;
        seenInNote.add(token);
      }
    }
  }

  for (const message of state.messages) {
    const seenInMessage = new Set<string>();
    const messageWeight = message.role === 'user' ? 0.7 : 0.35;
    for (const token of tokenize(message.content)) {
      const theme = ensureTheme(themes, token);
      theme.score += messageWeight;
      theme.lastSeenAt = Math.max(theme.lastSeenAt, message.createdAt);
      if (!seenInMessage.has(token)) {
        theme.messageCount += 1;
        seenInMessage.add(token);
      }
    }
  }

  const sortedThemes = [...themes.values()]
    .filter(theme => theme.score >= 1.4)
    .sort((a, b) => b.score - a.score || b.lastSeenAt - a.lastSeenAt)
    .slice(0, 24);

  return {
    themes: sortedThemes,
    recentRecords: records.slice(0, 12),
    recentNotes: notes.slice(0, 12),
    totals: {
      sessions: state.sessions.length,
      messages: state.messages.length,
      records: records.length,
      notes: notes.length,
    },
  };
};
