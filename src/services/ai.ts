import { AGENTS, MODES } from '../data/agents';
import type { AgentId, Message, ModeId, Reaction } from '../types';
import { buildInternalMirrorMap, getAgentMirrorHintText } from './internalMirrorMap';
import { callGeminiApi } from './geminiApiClient';
import { analyzeMirrorSafety, getMirrorReturnQuestion, getMirrorSafetyLine } from './mirrorSafety';
import { buildOthersReactions } from './othersReactions';

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const GEMINI_CHAT_MODEL = 'gemini-2.5-flash';
const GEMINI_REACTIONS_MODEL = 'gemini-2.5-flash';

const agentLead: Record<Exclude<AgentId, 'master'>, string[]> = {
  soul: [
    '今の言葉の奥に、本当は向かいたい方向が少し見えます。',
    'まだはっきり言葉にはならないけれど、どこかへ向いている気配があります。',
    '急がなくても、その奥の向きはもう静かに出ています。',
  ],
  creative: [
    'まだ消えてない火がある。そこはかなり大事だと思う。',
    'いいね、その奥に「進みたい」が残ってる。',
    '小さくても火は火だよ。そこから始められる。',
  ],
  strategist: [
    'いまは、気持ちと選択肢の間に少し矛盾がありそうです。',
    'ここは一度、望み・不安・前提を分けると矛盾の形が見えます。',
    '問題そのものより、前提が少し絡まっているように見えます。',
  ],
  empath: [
    'その言葉の奥には、まだ抱えられていない気持ちがありそうです。',
    'そこまで抱えてきた気持ち自体、ちゃんと意味があります。',
    '今は、無理に強くならなくても、その気持ちを置いて大丈夫です。',
  ],
  critic: [
    'ちょっと待て。そこ、自分でも見ないようにしてる部分がないか。',
    '甘く見ると苦しくなる。逃げてる場所と足場を分けた方がいい。',
    '勢いだけで進む前に、避けている現実を一度見た方がいい。',
  ],
};

const agentQuestion: Record<Exclude<AgentId, 'master'>, string> = {
  soul: '本当は、どちらへ向かいたい感じがしますか？',
  creative: 'その火を少しだけ外に出すなら、何から始めたい？',
  strategist: 'いま見えている矛盾をひとつ挙げるなら、何だと思いますか？',
  empath: 'その言葉の奥の気持ちに、名前をつけるなら何ですか？',
  critic: '今、自分でも少し避けているものがあるとしたら何だと思う？',
};

const mirrorReturnQuestions = [
  'この中で、今のあなたに一番近い声はどれですか？',
  'まだ見ていない本音があるとしたら、どの声の近くにありそうですか？',
  '今は、どの声を急いで結論にしないで置いておきたいですか？',
  'あなたは、どう思いますか？',
];

export const buildContextText = (messages: Message[], userName: string) => {
  return messages
    .slice(-8)
    .map(message => {
      if (message.role === 'user') return `${userName}: ${message.content}`;
      const agent = message.agentId === 'master'
        ? { name: '心の鏡' }
        : AGENTS.find(item => item.id === message.agentId);
      return `${agent?.name || 'AI'}: ${message.content}`;
    })
    .join('\n');
};

const pick = <T,>(items: T[], seed: string) => {
  const code = Array.from(seed).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return items[code % items.length];
};

const getLastUserText = (messages: Message[]) => {
  return [...messages].reverse().find(message => message.role === 'user')?.content || '今の気持ち';
};

const compactLines = (lines: string[]) => lines.filter(Boolean).join('\n\n');

const getRecentUserFragments = (messages: Message[]) => {
  return messages
    .filter(message => message.role === 'user')
    .slice(-3)
    .map(message => `「${message.content.slice(0, 24)}」`);
};

const getRecentAgentNames = (messages: Message[]) => {
  const names = messages
    .filter(message => message.role === 'ai' && message.agentId && message.agentId !== 'master')
    .slice(-4)
    .map(message => AGENTS.find(agent => agent.id === message.agentId)?.name)
    .filter((name): name is string => Boolean(name));
  return [...new Set(names)];
};

const buildMirrorReply = ({ messages, userName, safetyReturnQuestion, shouldReturnQuestion }: {
  messages: Message[];
  userName: string;
  safetyReturnQuestion: string;
  shouldReturnQuestion: boolean;
}) => {
  const fragments = getRecentUserFragments(messages);
  const agentNames = getRecentAgentNames(messages);
  const fragmentText = fragments.length > 0 ? fragments.join('、') : 'まだ言葉になっていないもの';
  const voiceText = agentNames.length > 0
    ? `${agentNames.join('、')}の角度が、まだひとつに混ざらず残っています。`
    : 'まだ、いくつかの声がひとつに混ざらず残っています。';
  const returnQuestion = safetyReturnQuestion || pick(mirrorReturnQuestions, fragmentText);
  const safetyLine = shouldReturnQuestion
    ? '今は結論へ寄せすぎず、反対側の声や現実の足場も水面に残しておいてよさそうです。'
    : '今は、ひとつの答えにまとめきらなくて大丈夫です。';

  return compactLines([
    `${userName}さんのここまでの声を鏡に置くと、${fragmentText}の奥に、まだ分けて見た方がいい層があります。`,
    voiceText,
    safetyLine,
    returnQuestion,
  ]);
};

const generateLocalFallbackReply = async ({
  agentId,
  mode,
  messages,
  userName,
}: {
  agentId: AgentId;
  mode: ModeId;
  messages: Message[];
  userName: string;
}) => {
  await wait(mode === 'short' ? 220 : 340);
  const lastText = getLastUserText(messages);
  const safetySignal = analyzeMirrorSafety(messages);
  const safetyReturnQuestion = getMirrorReturnQuestion(safetySignal);
  const internalMap = buildInternalMirrorMap({
    sessionId: messages[0]?.sessionId || 'current-session',
    messages,
    centerQuestion: messages.find(message => message.role === 'user')?.content || lastText,
  });
  const internalHint = getAgentMirrorHintText(internalMap, agentId);

  if (agentId === 'master') {
    return buildMirrorReply({
      messages,
      userName,
      safetyReturnQuestion,
      shouldReturnQuestion: safetySignal.shouldReturnQuestion,
    });
  }

  const lead = pick(agentLead[agentId], `${lastText}-${internalHint}`);
  const question = safetyReturnQuestion || agentQuestion[agentId];
  const safetyLine = getMirrorSafetyLine(safetySignal, agentId);

  if (mode === 'short') {
    return compactLines([lead, safetyLine, question]);
  }

  if (mode === 'long') {
    return compactLines([
      lead,
      'その言葉は、ただの悩みというより、願い・不安・大切にしたいものが重なって出てきたものに見えます。',
      safetyLine || '今すぐ全部を決めなくても大丈夫です。まずは、その中で一番強く残っているものを見てみるのがよさそうです。',
      question,
    ]);
  }

  return compactLines([
    lead,
    safetyLine || '今は、全部を決めきるよりも、その奥にある本音を少しだけ見つける時間かもしれません。',
    question,
  ]);
};

const buildGeminiReplySystem = ({ agentId, mode, internalHint, safetyLine, safetyReturnQuestion }: {
  agentId: AgentId;
  mode: ModeId;
  internalHint: string;
  safetyLine: string;
  safetyReturnQuestion: string;
}) => {
  if (agentId === 'master') {
    return compactLines([
      'あなたは「じぶん会議」の心の鏡です。役割は、複数の声とユーザーの言葉を統合して結論を押し付けることではなく、今見えている配置を静かに映すことです。',
      '導かない。決めつけない。ユーザー自身がどう思うかへ返す。',
      '5人の声を総意としてまとめず、それぞれの角度が残っていることを尊重する。',
      '医療・診断・治療・緊急対応はしない。強い危険や自傷他害の可能性がある場合は、専門機関や身近な人への相談を促す。',
      `長さ: ${MODES[mode].constraint}`,
      safetyLine ? `安全上の鏡返し: ${safetyLine}` : '',
      safetyReturnQuestion ? `最後に使える問い: ${safetyReturnQuestion}` : '',
      '日本語で返す。前置きや箇条書きは必要な時だけ。',
    ]);
  }

  const agent = AGENTS.find(item => item.id === agentId);
  return compactLines([
    agent?.prompt || '',
    'このアプリのコンセプトは「慰める友達」ではなく「本当の自分を写す鏡」です。ユーザーの自己決定権を守り、結論を押し付けないでください。',
    '同調しすぎない。ユーザーの言葉をそのまま増幅せず、まだ見えていない側面・矛盾・安全上の足場も必要なら静かに映してください。',
    'キャラ口調を強くしすぎず、視点の違いとして自然に話してください。',
    '医療・診断・治療・緊急対応はしない。強い危険や自傷他害の可能性がある場合は、専門機関や身近な人への相談を促してください。',
    `長さ: ${MODES[mode].constraint}`,
    internalHint ? `内部の映し方メモ: ${internalHint}` : '',
    safetyLine ? `安全上の鏡返し: ${safetyLine}` : '',
    safetyReturnQuestion ? `最後に使える問い: ${safetyReturnQuestion}` : '',
    '日本語で返す。読みやすく、短めの段落で返す。最後は小さな問いか、余韻のある一文で終える。',
  ]);
};

const buildGeminiReplyPrompt = ({ messages, userName }: { messages: Message[]; userName: string }) => {
  const context = buildContextText(messages, userName);
  const lastText = getLastUserText(messages);
  return compactLines([
    '以下は「じぶん会議」の会話履歴です。最新のユーザーの言葉へ、指定された鏡の視点で返してください。',
    context ? `会話履歴:\n${context}` : '',
    `最新のユーザーの言葉:\n${lastText}`,
  ]);
};

export const generateMockReply = async ({
  agentId,
  mode,
  messages,
  userName,
}: {
  agentId: AgentId;
  mode: ModeId;
  messages: Message[];
  userName: string;
}) => {
  const lastText = getLastUserText(messages);
  const safetySignal = analyzeMirrorSafety(messages);
  const safetyReturnQuestion = getMirrorReturnQuestion(safetySignal);
  const internalMap = buildInternalMirrorMap({
    sessionId: messages[0]?.sessionId || 'current-session',
    messages,
    centerQuestion: messages.find(message => message.role === 'user')?.content || lastText,
  });
  const internalHint = getAgentMirrorHintText(internalMap, agentId);
  const safetyLine = agentId === 'master'
    ? safetySignal.shouldReturnQuestion ? '今は結論へ寄せすぎず、反対側の声や現実の足場も水面に残す。' : ''
    : getMirrorSafetyLine(safetySignal, agentId);

  const gemini = await callGeminiApi({
    model: GEMINI_CHAT_MODEL,
    prompt: buildGeminiReplyPrompt({ messages, userName }),
    systemInstruction: buildGeminiReplySystem({
      agentId,
      mode,
      internalHint,
      safetyLine,
      safetyReturnQuestion,
    }),
  });

  if (gemini.ok && gemini.text.trim()) {
    return gemini.text.trim();
  }

  return generateLocalFallbackReply({ agentId, mode, messages, userName });
};

const extractJsonObject = (text: string) => {
  const trimmed = text.trim().replace(/^```json/i, '').replace(/^```/, '').replace(/```$/g, '').trim();
  const first = trimmed.indexOf('{');
  const last = trimmed.lastIndexOf('}');
  if (first < 0 || last < first) return trimmed;
  return trimmed.slice(first, last + 1);
};

const parseGeminiReactions = (text: string, selectedAgentId: AgentId): Partial<Record<AgentId, Reaction>> => {
  try {
    const parsed = JSON.parse(extractJsonObject(text)) as Partial<Record<AgentId, Reaction>>;
    const valid: Partial<Record<AgentId, Reaction>> = {};
    for (const agent of AGENTS) {
      if (agent.id === selectedAgentId) continue;
      const reaction = parsed[agent.id];
      if (!reaction) continue;
      const posture = typeof reaction.posture === 'string' ? reaction.posture.trim().slice(0, 10) : '';
      const comment = typeof reaction.comment === 'string' ? reaction.comment.trim().slice(0, 40) : '';
      if (posture && comment) valid[agent.id] = { posture, comment };
    }
    return valid;
  } catch {
    return {};
  }
};

export const generateMockReactions = async (selectedAgentId: AgentId): Promise<Partial<Record<AgentId, Reaction>>> => {
  const otherAgents = AGENTS.filter(agent => agent.id !== selectedAgentId);
  const gemini = await callGeminiApi({
    model: GEMINI_REACTIONS_MODEL,
    jsonMode: true,
    systemInstruction: compactLines([
      'あなたは「じぶん会議」のOTHERS生成器です。選ばれなかった4人の短い反応だけをJSONで返してください。',
      '選ばれた本人は含めない。master/心の鏡も含めない。',
      '各値は posture と comment を持つ。postureは5文字程度、commentは15〜25文字程度。',
      '余計な説明やMarkdownを出さず、JSONオブジェクトのみ返す。',
    ]),
    prompt: compactLines([
      `選ばれたエージェント: ${selectedAgentId}`,
      `出力対象: ${otherAgents.map(agent => `${agent.id}:${agent.name}:${agent.role}`).join(' / ')}`,
      '形式例: {"soul":{"posture":"静観","comment":"まだ奥に声がある"}}',
    ]),
  });

  if (gemini.ok) {
    const parsed = parseGeminiReactions(gemini.text, selectedAgentId);
    if (Object.keys(parsed).length > 0) return parsed;
  }

  await wait(120);
  return buildOthersReactions(selectedAgentId, `${selectedAgentId}-${Date.now()}`);
};
