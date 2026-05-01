import type { AgentId, InternalMirrorMap, Message, MirrorAgentHint, MirrorMapNode, MirrorMapNodeKind } from '../types';

const KIND_LABELS: Record<MirrorMapNodeKind, string> = {
  passion: 'まだ消えてない情熱',
  feeling: '言葉の奥にある気持ち',
  direction: '本当は向かいたい方向',
  contradiction: '矛盾している部分',
  avoidance: '逃げている部分',
  theme: 'くり返すテーマ',
  grounding: '現実へ戻る足場',
};

const KIND_KEYWORDS: Record<MirrorMapNodeKind, string[]> = {
  passion: ['やりたい', '作りたい', '好き', '情熱', '夢', '進みたい', '諦め', '火', '創りたい', '挑戦'],
  feeling: ['つらい', '怖い', '寂しい', '疲れ', '安心', '不安', '恥', '泣き', '苦しい', '嬉しい'],
  direction: ['向かいたい', 'なりたい', '未来', '本当は', '理想', '方向', '選びたい', '望む', '行きたい'],
  contradiction: ['でも', 'だけど', '一方で', '矛盾', '迷う', '分からない', 'したいけど', 'なのに'],
  avoidance: ['逃げたい', '見たくない', '避け', '後回し', 'やめたい', '無理', '怖くて', 'できない'],
  theme: ['自分', '仕事', '音楽', 'アプリ', '人', '愛', '現実', 'お金', '創造', 'AI'],
  grounding: ['今日', '一つ', '小さく', '現実', '連絡', '休む', '歩く', '寝る', '相談', '試す'],
};

const AGENT_FOCUS: Record<AgentId, { kind: MirrorMapNodeKind; focus: string; caution?: string }> = {
  creative: { kind: 'passion', focus: 'まだ消えてない情熱' },
  empath: { kind: 'feeling', focus: '言葉の奥にある気持ち' },
  soul: { kind: 'direction', focus: '本当は向かいたい方向' },
  strategist: { kind: 'contradiction', focus: '矛盾している部分' },
  critic: { kind: 'avoidance', focus: '逃げている部分', caution: '責めるためではなく、現実の足場を守るために映す。' },
  master: { kind: 'theme', focus: '複数の声の配置' },
};

const normalize = (text: string) => text.replace(/[\n\r\t]/g, ' ').trim();

const makeNodeId = (kind: MirrorMapNodeKind, label: string) => `${kind}:${label}`;

const addEvidence = (node: MirrorMapNode, evidence: string) => {
  const trimmed = evidence.trim();
  if (!trimmed) return;
  if (!node.evidence.includes(trimmed)) node.evidence.push(trimmed.slice(0, 80));
  node.evidence = node.evidence.slice(0, 3);
};

const createOrUpdateNode = ({
  nodes,
  kind,
  label,
  evidence,
  weight,
}: {
  nodes: Map<string, MirrorMapNode>;
  kind: MirrorMapNodeKind;
  label: string;
  evidence: string;
  weight: number;
}) => {
  const safeLabel = label.trim().slice(0, 24) || KIND_LABELS[kind];
  const id = makeNodeId(kind, safeLabel);
  const existing = nodes.get(id);
  if (existing) {
    existing.weight += weight;
    addEvidence(existing, evidence);
    return;
  }

  nodes.set(id, {
    id,
    kind,
    label: safeLabel,
    weight,
    evidence: [evidence.trim().slice(0, 80)].filter(Boolean),
  });
};

const extractMatchingNodes = (messages: Message[]) => {
  const nodes = new Map<string, MirrorMapNode>();

  for (const message of messages.slice(-12)) {
    const text = normalize(message.content);
    if (!text) continue;
    const roleWeight = message.role === 'user' ? 1.2 : 0.45;

    for (const [kind, keywords] of Object.entries(KIND_KEYWORDS) as Array<[MirrorMapNodeKind, string[]]>) {
      for (const keyword of keywords) {
        if (!text.includes(keyword)) continue;
        createOrUpdateNode({
          nodes,
          kind,
          label: keyword,
          evidence: text,
          weight: roleWeight,
        });
      }
    }
  }

  return [...nodes.values()].sort((a, b) => b.weight - a.weight).slice(0, 18);
};

const makeFallbackNode = (kind: MirrorMapNodeKind): MirrorMapNode => ({
  id: makeNodeId(kind, KIND_LABELS[kind]),
  kind,
  label: KIND_LABELS[kind],
  weight: 0.5,
  evidence: [],
});

const buildAgentHint = (agentId: AgentId, nodes: MirrorMapNode[]): MirrorAgentHint => {
  const config = AGENT_FOCUS[agentId];
  const focusedNodes = nodes.filter(node => node.kind === config.kind).slice(0, 3);
  return {
    agentId,
    focus: config.focus,
    nodes: focusedNodes.length > 0 ? focusedNodes : [makeFallbackNode(config.kind)],
    caution: config.caution,
  };
};

export const buildInternalMirrorMap = ({
  sessionId,
  messages,
  centerQuestion,
}: {
  sessionId: string;
  messages: Message[];
  centerQuestion: string;
}): InternalMirrorMap => {
  const nodes = extractMatchingNodes(messages);
  const agentIds: AgentId[] = ['creative', 'empath', 'soul', 'strategist', 'critic', 'master'];
  const agentHints = Object.fromEntries(agentIds.map(agentId => [agentId, buildAgentHint(agentId, nodes)])) as InternalMirrorMap['agentHints'];

  return {
    sessionId,
    centerQuestion: centerQuestion.trim().slice(0, 80) || '今の問い',
    nodes,
    agentHints,
    updatedAt: Date.now(),
  };
};

export const getAgentMirrorHintText = (map: InternalMirrorMap, agentId: AgentId) => {
  const hint = map.agentHints[agentId];
  if (!hint) return '';
  const labels = hint.nodes.map(node => node.label).join(' / ');
  const caution = hint.caution ? ` 注意: ${hint.caution}` : '';
  return `内部マップ焦点: ${hint.focus}${labels ? ` (${labels})` : ''}.${caution}`;
};
