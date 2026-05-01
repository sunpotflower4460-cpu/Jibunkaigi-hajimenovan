import { AGENTS } from '../data/agents';
import type { AgentId, Reaction } from '../types';

export type NonMasterAgentId = Exclude<AgentId, 'master'>;

export const OTHER_AGENT_IDS = AGENTS.map(agent => agent.id) as NonMasterAgentId[];

const reactionTemplates: Record<NonMasterAgentId, Reaction[]> = {
  soul: [
    { posture: '静観', comment: '向かいたい方向を見ている' },
    { posture: '反射', comment: 'まだ言葉にならない気配を映している' },
    { posture: '余白', comment: '急がず奥の向きを見ている' },
  ],
  creative: [
    { posture: '点火', comment: 'まだ消えてない火を見ている' },
    { posture: '前進', comment: '小さく動ける場所を見ている' },
    { posture: '光', comment: '残っている情熱に反応している' },
  ],
  strategist: [
    { posture: '整理', comment: '矛盾の形を見ている' },
    { posture: '設計', comment: '前提のズレを探している' },
    { posture: '分析', comment: '絡まりの位置を見ている' },
  ],
  empath: [
    { posture: '抱擁', comment: '奥の気持ちを受け止めている' },
    { posture: '泉', comment: '言葉の奥の疲れを見ている' },
    { posture: '共感', comment: '小さな本音を守っている' },
  ],
  critic: [
    { posture: '警戒', comment: '逃げている場所を見ている' },
    { posture: '防御', comment: '削られない足場を探している' },
    { posture: '現実', comment: '見落としたコストを見ている' },
  ],
};

const pick = <T,>(items: T[], seed: string) => {
  const code = Array.from(seed).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return items[code % items.length];
};

const isValidReaction = (value: unknown): value is Reaction => {
  if (!value || typeof value !== 'object') return false;
  const reaction = value as Reaction;
  return typeof reaction.posture === 'string' && reaction.posture.trim().length > 0
    && typeof reaction.comment === 'string' && reaction.comment.trim().length > 0;
};

export const getOtherAgentIds = (selectedAgentId: AgentId): NonMasterAgentId[] => {
  if (selectedAgentId === 'master') return [];
  return OTHER_AGENT_IDS.filter(agentId => agentId !== selectedAgentId);
};

export const buildOthersReactions = (selectedAgentId: AgentId, seed = ''): Partial<Record<AgentId, Reaction>> => {
  const reactions: Partial<Record<AgentId, Reaction>> = {};
  for (const otherAgentId of getOtherAgentIds(selectedAgentId)) {
    reactions[otherAgentId] = pick(reactionTemplates[otherAgentId], `${selectedAgentId}-${otherAgentId}-${seed}`);
  }
  return reactions;
};

export const normalizeOthersReactions = (
  selectedAgentId: AgentId,
  reactions?: Partial<Record<AgentId, Reaction>> | null,
  seed = 'fallback',
): Partial<Record<AgentId, Reaction>> => {
  const normalized: Partial<Record<AgentId, Reaction>> = {};
  const fallback = buildOthersReactions(selectedAgentId, seed);

  for (const otherAgentId of getOtherAgentIds(selectedAgentId)) {
    const candidate = reactions?.[otherAgentId];
    normalized[otherAgentId] = isValidReaction(candidate) ? candidate : fallback[otherAgentId];
  }

  return normalized;
};

export const getExpectedOthersCount = (selectedAgentId: AgentId) => getOtherAgentIds(selectedAgentId).length;
