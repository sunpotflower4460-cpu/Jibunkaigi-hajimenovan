import { AGENTS } from '../data/agents';
import type { AgentId, Message, ModeId, Reaction } from '../types';

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const agentLead: Record<Exclude<AgentId, 'master'>, string[]> = {
  soul: ['今、言葉の奥に静かな波があります。', 'その違和感は、まだ名前を持たない声かもしれません。'],
  creative: ['まだ消えてない火がある。俺にはそこが見える。', 'いいね、その奥にまだ進みたい熱が残ってる。'],
  strategist: ['今見えている論点は、感情ではなく前提のもつれです。', 'ここは一度、望み・不安・次の一手に分けると見通しが出ます。'],
  empath: ['うん、そのまま置いて大丈夫です。急いで答えにしなくていい。', 'そこまで抱えてきたこと自体、ちゃんと意味があります。'],
  critic: ['ちょっと待て。そこ、自分を削ってまで進もうとしてないか。', '甘く見ると苦しくなる。だから今、足場を確認した方がいい。'],
};

const agentQuestion: Record<Exclude<AgentId, 'master'>, string> = {
  soul: 'その声に、まだ名前をつけないなら、どんな気配ですか？',
  creative: 'その火を、今日ほんの少しだけ外に出すなら何になる？',
  strategist: 'いま一番ほどくべき前提は、どれだと思いますか？',
  empath: '今の自分に、いちばん優しく言ってあげたい言葉は何ですか？',
  critic: '守るべきものを一つだけ選ぶなら、何だ？',
};

const reactionPostures: Record<Exclude<AgentId, 'master'>, string> = {
  soul: '静観',
  creative: '点火',
  strategist: '整理',
  empath: '抱擁',
  critic: '警戒',
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
  await wait(550);
  const lastUserMessage = [...messages].reverse().find(message => message.role === 'user');
  const lastText = lastUserMessage?.content || '今の気持ち';

  if (agentId === 'master') {
    const userMessages = messages.filter(message => message.role === 'user').slice(-3);
    const fragments = userMessages.map(message => `「${message.content.slice(0, 24)}」`).join('、');
    return `${userName}さんのここまでの声を映すと、${fragments || 'まだ言葉になっていないもの'}の奥に、同じ問いが流れているように見えます。\n\n答えを急ぐより、今は「何を守りながら進みたいのか」を見てもよさそうです。`;
  }

  const lead = pick(agentLead[agentId], lastText);
  const question = agentQuestion[agentId];

  if (mode === 'short') {
    return `${lead}\n\n${question}`;
  }

  if (mode === 'long') {
    return `${lead}\n\n${lastText.length > 40 ? 'その言葉は、ただの悩みというより、いくつかの願いが重なって生まれた結び目に見えます。' : 'まだ小さな言葉でも、そこにはちゃんと重さがあります。'}\n\n今すぐ正解にしなくていい。けれど、ここで見ないふりをすると、同じ場所で何度も立ち止まるかもしれません。\n\n${question}`;
  }

  return `${lead}\n\n今は、全部を決めきるよりも、その奥にある本音を少しだけ見つける時間かもしれません。\n\n${question}`;
};

export const generateMockReactions = async (selectedAgentId: AgentId): Promise<Partial<Record<AgentId, Reaction>>> => {
  await wait(250);
  const reactions: Partial<Record<AgentId, Reaction>> = {};
  for (const agent of AGENTS) {
    if (agent.id === selectedAgentId) continue;
    reactions[agent.id] = {
      posture: reactionPostures[agent.id],
      comment: `${agent.name}も静かに反応している`,
    };
  }
  return reactions;
};
