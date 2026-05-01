import { AGENTS } from '../data/agents';
import type { AgentId, Message, ModeId, Reaction } from '../types';

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

  if (agentId === 'master') {
    const userMessages = messages.filter(message => message.role === 'user').slice(-3);
    const fragments = userMessages.map(message => `「${message.content.slice(0, 24)}」`).join('、');
    return `${userName}さんのここまでの声を映すと、${fragments || 'まだ言葉になっていないもの'}の奥に、いくつかの声が並んでいるように見えます。\n\n今はひとつにまとめきらなくて大丈夫です。\n\nこの中で、今のあなたに一番近い声はどれですか？`;
  }

  const lead = pick(agentLead[agentId], lastText);
  const question = agentQuestion[agentId];

  if (mode === 'short') {
    return `${lead}\n\n${question}`;
  }

  if (mode === 'long') {
    return `${lead}\n\nその言葉は、ただの悩みというより、願い・不安・大切にしたいものが重なって出てきたものに見えます。\n\n今すぐ全部を決めなくても大丈夫です。まずは、その中で一番強く残っているものを見てみるのがよさそうです。\n\n${question}`;
  }

  return `${lead}\n\n今は、全部を決めきるよりも、その奥にある本音を少しだけ見つける時間かもしれません。\n\n${question}`;
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
