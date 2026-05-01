import { AGENTS } from '../data/agents';
import type { AgentId, Message, ModeId, Reaction } from '../types';
import { analyzeMirrorSafety, getMirrorReturnQuestion, getMirrorSafetyLine } from './mirrorSafety';

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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

const reactionTemplates: Record<Exclude<AgentId, 'master'>, Reaction[]> = {
  soul: [
    { posture: '静観', comment: '向かいたい先を見ている' },
    { posture: '反射', comment: 'まだ見えない方向を映している' },
    { posture: '余白', comment: '急がず気配を見ている' },
  ],
  creative: [
    { posture: '点火', comment: '残っている火に反応している' },
    { posture: '前進', comment: '小さく動ける場所を見ている' },
    { posture: '光', comment: '可能性の方を向いている' },
  ],
  strategist: [
    { posture: '整理', comment: '矛盾の形を見ている' },
    { posture: '設計', comment: '前提のズレを探している' },
    { posture: '分析', comment: '絡まりの位置を見ている' },
  ],
  empath: [
    { posture: '抱擁', comment: '奥の気持ちを受け止めている' },
    { posture: '泉', comment: '疲れをほどこうとしている' },
    { posture: '共感', comment: '小さな本音を守っている' },
  ],
  critic: [
    { posture: '警戒', comment: '逃げている場所を見ている' },
    { posture: '防御', comment: '削られない道を探している' },
    { posture: '現実', comment: '足場を確認している' },
  ],
};

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
  await wait(mode === 'short' ? 220 : 340);
  const lastText = getLastUserText(messages);
  const safetySignal = analyzeMirrorSafety(messages);
  const safetyReturnQuestion = getMirrorReturnQuestion(safetySignal);

  if (agentId === 'master') {
    return buildMirrorReply({
      messages,
      userName,
      safetyReturnQuestion,
      shouldReturnQuestion: safetySignal.shouldReturnQuestion,
    });
  }

  const lead = pick(agentLead[agentId], lastText);
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

export const generateMockReactions = async (selectedAgentId: AgentId): Promise<Partial<Record<AgentId, Reaction>>> => {
  await wait(120);
  const reactions: Partial<Record<AgentId, Reaction>> = {};
  const seed = `${selectedAgentId}-${Date.now()}`;

  for (const agent of AGENTS) {
    if (agent.id === selectedAgentId) continue;
    reactions[agent.id] = pick(reactionTemplates[agent.id], `${seed}-${agent.id}`);
  }

  return reactions;
};
