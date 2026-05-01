export type AgentId = 'soul' | 'creative' | 'strategist' | 'empath' | 'critic' | 'master';

export type ModeId = 'short' | 'medium' | 'long';

export type Session = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  isPinned: boolean;
};

export type Reaction = {
  posture: string;
  comment: string;
};

export type Message = {
  id: string;
  sessionId: string;
  role: 'user' | 'ai';
  content: string;
  agentId?: AgentId;
  reactions?: Partial<Record<AgentId, Reaction>>;
  createdAt: number;
};

export type ConferenceRecord = {
  id: string;
  sessionId: string;
  title: string;
  topic: string;
  keywords: string[];
  agentNotes: Partial<Record<AgentId, string>>;
  mirrorSummary: string;
  selfLine: string;
  returnQuestion: string;
  createdAt: number;
  updatedAt: number;
};

export type StickyNoteKind = 'question' | 'truth' | 'notYet' | 'later' | 'important' | 'free';

export type StickyNote = {
  id: string;
  sessionId: string;
  kind: StickyNoteKind;
  label: string;
  content: string;
  createdAt: number;
  updatedAt: number;
};

export type UserSettings = {
  displayName: string;
  introSeen: boolean;
  termsAccepted: boolean;
};

export type Agent = {
  id: Exclude<AgentId, 'master'>;
  name: string;
  role: string;
  title: string;
  color: string;
  accentColor: string;
  borderColor: string;
  belief: string;
  prompt: string;
};
