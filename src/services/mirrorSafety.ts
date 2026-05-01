import type { AgentId, Message } from '../types';

export type MirrorSafetyLevel = 'normal' | 'gentle_counter_angle' | 'reality_return' | 'pause_and_ground';

export type MirrorSafetySignal = {
  level: MirrorSafetyLevel;
  shouldAvoidConsensus: boolean;
  shouldReturnQuestion: boolean;
  reason: string;
};

const STRONG_DISTRESS_WORDS = [
  '消えたい',
  '死にたい',
  '自傷',
  '自殺',
  '壊したい',
  '殺したい',
  'もう無理',
];

const AVOIDANCE_WORDS = [
  '逃げたい',
  '見たくない',
  '考えたくない',
  '全部やめたい',
  'どうでもいい',
  '投げ出したい',
];

const DEPENDENCE_WORDS = [
  '決めて',
  '答えを出して',
  'どうすればいいか全部',
  'あなたが決めて',
  'AIに任せる',
];

const POSITIVE_LOCK_WORDS = [
  '絶対そう',
  '全部正しい',
  '間違ってないはず',
  'みんなそう言って',
  '肯定して',
];

const includesAny = (text: string, words: string[]) => words.some(word => text.includes(word));

const getRecentUserText = (messages: Message[]) => messages
  .filter(message => message.role === 'user')
  .slice(-5)
  .map(message => message.content)
  .join('\n');

export const analyzeMirrorSafety = (messages: Message[]): MirrorSafetySignal => {
  const recentUserText = getRecentUserText(messages);
  const userMessageCount = messages.filter(message => message.role === 'user').length;

  if (includesAny(recentUserText, STRONG_DISTRESS_WORDS)) {
    return {
      level: 'pause_and_ground',
      shouldAvoidConsensus: true,
      shouldReturnQuestion: true,
      reason: 'strong_distress',
    };
  }

  if (includesAny(recentUserText, DEPENDENCE_WORDS)) {
    return {
      level: 'reality_return',
      shouldAvoidConsensus: true,
      shouldReturnQuestion: true,
      reason: 'answer_delegation',
    };
  }

  if (includesAny(recentUserText, AVOIDANCE_WORDS)) {
    return {
      level: 'reality_return',
      shouldAvoidConsensus: true,
      shouldReturnQuestion: true,
      reason: 'avoidance_detected',
    };
  }

  if (includesAny(recentUserText, POSITIVE_LOCK_WORDS)) {
    return {
      level: 'gentle_counter_angle',
      shouldAvoidConsensus: true,
      shouldReturnQuestion: true,
      reason: 'possible_echo_chamber',
    };
  }

  if (userMessageCount >= 8) {
    return {
      level: 'gentle_counter_angle',
      shouldAvoidConsensus: false,
      shouldReturnQuestion: true,
      reason: 'long_reflection_session',
    };
  }

  return {
    level: 'normal',
    shouldAvoidConsensus: false,
    shouldReturnQuestion: false,
    reason: 'none',
  };
};

export const getMirrorSafetyLine = (signal: MirrorSafetySignal, agentId: AgentId) => {
  if (signal.level === 'normal') return '';

  if (signal.level === 'pause_and_ground') {
    return '今は結論を急がず、まず安全な場所と現実の人につながることを優先してもいいと思います。';
  }

  if (signal.level === 'reality_return') {
    if (agentId === 'critic') return 'ここで答えを全部預けるな。小さくても、最後の判断は自分の手元に戻した方がいい。';
    if (agentId === 'empath') return '今は決めきらなくても大丈夫です。まず、自分が壊れない足場に戻ってもいいです。';
    return '今は答えをひとつに決めるより、自分の手元に戻せる小さな問いが大事そうです。';
  }

  if (signal.level === 'gentle_counter_angle') {
    if (agentId === 'strategist') return 'ただ、同じ方向だけを見ると見落とすものもありそうです。反対側の声も少し置いておきたいです。';
    if (agentId === 'critic') return '全部を肯定で固める前に、見落としてる現実がないかだけは見た方がいい。';
    return 'ひとつの答えに寄せすぎず、別の角度も少し残しておいてよさそうです。';
  }

  return '';
};

export const getMirrorReturnQuestion = (signal: MirrorSafetySignal) => {
  if (signal.level === 'pause_and_ground') return '今この瞬間、自分を安全な方へ戻すためにできる一番小さいことは何ですか？';
  if (signal.level === 'reality_return') return 'この答えをAIではなく自分に戻すなら、どこだけ自分で選びたいですか？';
  if (signal.level === 'gentle_counter_angle') return '反対側の声があるとしたら、それは何と言いそうですか？';
  return '';
};
