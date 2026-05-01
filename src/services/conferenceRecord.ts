import { AGENTS } from '../data/agents';
import type { AgentId, ConferenceRecord, Message, Session } from '../types';
import { makeId } from './storage';

const STOP_WORDS = new Set([
  'これ', 'それ', 'あれ', 'ここ', 'そこ', 'こと', 'もの', 'ため', 'よう', 'さん', 'です', 'ます', 'する', 'した', 'して', 'ある', 'いる', 'ない', '思う', '感じ', '自分', '今日', '今', '一つ', '全部', '少し', 'かなり', 'ちゃんと', 'なんか', 'だけど', 'でも', 'そして', 'それで', 'この', 'その', 'あの', 'から', 'まで', 'より', 'ので', 'なら', 'には', 'では', 'とも', 'として', 'という', 'みたい', 'アプリ', 'AI', 'mock'
]);

const AGENT_FALLBACK: Partial<Record<AgentId, string>> = {
  soul: '言葉になる前の気配を静かに映している。',
  creative: 'まだ残っている熱や可能性を見ている。',
  strategist: '気持ちと選択肢を分けて見ようとしている。',
  empath: '急がず、そのまま受け止めようとしている。',
  critic: '無理をしすぎない足場を確認している。',
  master: '散らばった声をひとつの流れとして映している。',
};

const normalize = (text: string) => text.replace(/[\n\r\t]/g, ' ').replace(/[、。！？!?「」『』（）()\[\]{}.,:;・]/g, ' ').trim();

const extractKeywords = (messages: Message[]) => {
  const source = messages
    .map(message => message.content)
    .join(' ');
  const tokens = normalize(source)
    .split(/\s+/)
    .flatMap(token => token.split(/(?=[A-ZＡ-Ｚ])/))
    .map(token => token.trim())
    .filter(Boolean)
    .filter(token => token.length >= 2 && token.length <= 14)
    .filter(token => !STOP_WORDS.has(token));

  const counts = new Map<string, number>();
  for (const token of tokens) {
    counts.set(token, (counts.get(token) || 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .slice(0, 8)
    .map(([keyword]) => keyword);
};

const firstSentence = (text: string, max = 54) => {
  const sentence = text.split(/[。！？!?\n]/).find(item => item.trim())?.trim() || text.trim();
  return sentence.length > max ? `${sentence.slice(0, max)}…` : sentence;
};

const getSessionMessages = (sessionId: string, messages: Message[]) => {
  return messages
    .filter(message => message.sessionId === sessionId)
    .sort((a, b) => a.createdAt - b.createdAt);
};

const getAgentName = (agentId?: AgentId) => {
  if (agentId === 'master') return '心の鏡';
  return AGENTS.find(agent => agent.id === agentId)?.name || 'AI';
};

const buildAgentNotes = (messages: Message[]) => {
  const notes: Partial<Record<AgentId, string>> = {};
  for (const message of messages) {
    if (message.role !== 'ai' || !message.agentId || notes[message.agentId]) continue;
    notes[message.agentId] = `${getAgentName(message.agentId)}: ${firstSentence(message.content, 46)}`;
  }

  for (const agent of AGENTS) {
    if (!notes[agent.id]) notes[agent.id] = `${agent.name}: ${AGENT_FALLBACK[agent.id]}`;
  }

  return notes;
};

const buildTopic = (session: Session, userMessages: Message[], keywords: string[]) => {
  const first = userMessages[0]?.content;
  if (session.title && session.title !== '無題の問い') return session.title;
  if (keywords[0]) return `${keywords[0]}について`;
  if (first) return firstSentence(first, 28);
  return 'まだ言葉になりきらない問い';
};

const buildMirrorSummary = (userMessages: Message[], keywords: string[]) => {
  const first = userMessages[0]?.content;
  const last = userMessages[userMessages.length - 1]?.content;
  const keyLine = keywords.length > 0 ? `「${keywords.slice(0, 3).join(' / ')}」が、今回の水面に浮かんでいます。` : 'まだ名前のつかない気配が、今回の水面に浮かんでいます。';

  if (!first && !last) {
    return `${keyLine}\nまだ会議は始まったばかりです。ひとつ言葉を置くところから、自分に潜れます。`;
  }

  return `${keyLine}\n最初の声は「${firstSentence(first || '', 36)}」。今は、その奥にあるものを静かに見つめる会議録として残します。`;
};

const buildSelfLine = (userMessages: Message[], keywords: string[]) => {
  const last = userMessages[userMessages.length - 1]?.content;
  if (last) return firstSentence(last, 46);
  if (keywords[0]) return `${keywords[0]}について、もう少し深く潜りたい。`;
  return 'まだ言葉にならないものを、ここに置いてみた。';
};

const buildReturnQuestion = (keywords: string[]) => {
  if (keywords[0]) return `次に「${keywords[0]}」へ戻るなら、私は何を見たい？`;
  return '次にここへ戻るなら、私は何を見たい？';
};

export const createConferenceRecord = ({
  session,
  messages,
}: {
  session: Session;
  messages: Message[];
}): ConferenceRecord => {
  const sessionMessages = getSessionMessages(session.id, messages);
  const userMessages = sessionMessages.filter(message => message.role === 'user');
  const keywords = extractKeywords(sessionMessages);
  const now = Date.now();

  return {
    id: makeId(),
    sessionId: session.id,
    title: `${buildTopic(session, userMessages, keywords)}の会議録`,
    topic: buildTopic(session, userMessages, keywords),
    keywords,
    agentNotes: buildAgentNotes(sessionMessages),
    mirrorSummary: buildMirrorSummary(userMessages, keywords),
    selfLine: buildSelfLine(userMessages, keywords),
    returnQuestion: buildReturnQuestion(keywords),
    createdAt: now,
    updatedAt: now,
  };
};
