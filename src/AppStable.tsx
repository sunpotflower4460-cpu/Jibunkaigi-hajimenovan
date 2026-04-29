import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  Compass,
  Copy,
  Edit3,
  Feather,
  Flame,
  Heart,
  Info,
  LayoutDashboard,
  Menu,
  MessageSquare,
  Pin,
  Plus,
  Send,
  ShieldAlert,
  Sparkles,
  Star,
  Target,
  Trash2,
  UserCircle2,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { AGENTS, MODES, RELEASE_NOTICE } from './data/agents';
import { generateMockReactions, generateMockReply } from './services/ai';
import { loadState, makeId, saveState } from './services/storage';
import type { AgentId, Message, ModeId, Session, UserSettings } from './types';

const iconForAgent = (agentId: AgentId, size = 14) => {
  switch (agentId) {
    case 'soul':
      return <Star size={size} />;
    case 'creative':
      return <Flame size={size} />;
    case 'strategist':
      return <Target size={size} />;
    case 'empath':
      return <Heart size={size} />;
    case 'critic':
      return <ShieldAlert size={size} />;
    case 'master':
      return <Compass size={size} />;
    default:
      return <MessageSquare size={size} />;
  }
};

const modeIcon = (mode: ModeId) => {
  if (mode === 'short') return <Zap size={14} />;
  if (mode === 'long') return <LayoutDashboard size={14} />;
  return <MessageSquare size={14} />;
};

const getAgentName = (agentId?: AgentId) => {
  if (agentId === 'master') return '心の鏡';
  return AGENTS.find(agent => agent.id === agentId)?.name || 'AI';
};

const playSound = (type: 'send' | 'receive' | 'click' | 'intro' | 'delete') => {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;
    const frequency = type === 'delete' ? 220 : type === 'receive' ? 440 : type === 'intro' ? 659 : type === 'click' ? 800 : 523;
    osc.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(type === 'click' ? 0.025 : 0.045, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.start(now);
    osc.stop(now + 0.22);
    window.setTimeout(() => void ctx.close().catch(() => undefined), 300);
  } catch {
    // Sound is decorative. Ignore failures on iOS/browser restrictions.
  }
};

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

const modalBackdrop = 'fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/10 p-6 backdrop-blur-md';

const AppStable = () => {
  const initialState = useMemo(() => loadState(), []);
  const [sessions, setSessions] = useState<Session[]>(initialState.sessions);
  const [messages, setMessages] = useState<Message[]>(initialState.messages);
  const [settings, setSettings] = useState<UserSettings>(initialState.settings);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(initialState.sessions[0]?.id ?? null);
  const [userInput, setUserInput] = useState('');
  const [selectedMode, setSelectedMode] = useState<ModeId>('medium');
  const [showInput, setShowInput] = useState(true);
  const [showIntro, setShowIntro] = useState(!initialState.settings.introSeen);
  const [showBeliefs, setShowBeliefs] = useState(false);
  const [showNotice, setShowNotice] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingAgent, setGeneratingAgent] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editSessionTitle, setEditSessionTitle] = useState('');
  const [isEditingUserName, setIsEditingUserName] = useState(false);
  const [tempName, setTempName] = useState(settings.displayName);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [openToolbarMsgId, setOpenToolbarMsgId] = useState<string | null>(null);
  const [expandedReactionsMsgId, setExpandedReactionsMsgId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const sessionsRef = useRef(sessions);
  const currentSessionIdRef = useRef(currentSessionId);
  const generationTokenRef = useRef<string | null>(null);

  useEffect(() => {
    sessionsRef.current = sessions;
  }, [sessions]);

  useEffect(() => {
    currentSessionIdRef.current = currentSessionId;
  }, [currentSessionId]);

  useEffect(() => {
    saveState({ sessions, messages, settings });
  }, [sessions, messages, settings]);

  const sortedSessions = useMemo(() => {
    return [...sessions].sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return b.updatedAt - a.updatedAt;
    });
  }, [sessions]);

  const currentMessages = useMemo(() => {
    if (!currentSessionId) return [];
    return messages
      .filter(message => message.sessionId === currentSessionId)
      .sort((a, b) => a.createdAt - b.createdAt);
  }, [currentSessionId, messages]);

  const currentSession = sessions.find(session => session.id === currentSessionId);
  const userMessageCount = currentMessages.filter(message => message.role === 'user').length;

  useEffect(() => {
    if (!scrollRef.current) return;
    const timeout = window.setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, 90);
    return () => window.clearTimeout(timeout);
  }, [currentMessages.length, isGenerating, expandedReactionsMsgId]);

  const autoResize = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
  };

  const showBusyMessage = () => {
    setErrorMessage('いま応答を生成しています。終わってから操作してください。');
  };

  const resetSessionUi = () => {
    setShowInput(true);
    setOpenToolbarMsgId(null);
    setExpandedReactionsMsgId(null);
    setErrorMessage(null);
  };

  const startNewSession = () => {
    if (isGenerating) return showBusyMessage();
    setCurrentSessionId(null);
    setIsSidebarOpen(false);
    resetSessionUi();
  };

  const selectSession = (sessionId: string) => {
    if (isGenerating) return showBusyMessage();
    setCurrentSessionId(sessionId);
    setIsSidebarOpen(false);
    resetSessionUi();
  };

  const handleStartIntro = () => {
    playSound('intro');
    setSettings(prev => ({ ...prev, introSeen: true }));
    setShowIntro(false);
  };

  const upsertSession = (session: Session) => {
    setSessions(prev => {
      const exists = prev.some(item => item.id === session.id);
      if (exists) return prev.map(item => (item.id === session.id ? session : item));
      return [session, ...prev];
    });
  };

  const updateSession = (sessionId: string, patch: Partial<Session>) => {
    setSessions(prev => prev.map(session => (session.id === sessionId ? { ...session, ...patch } : session)));
  };

  const handleSend = () => {
    const text = userInput.trim();
    if (!text || isGenerating) return;
    playSound('send');

    const now = Date.now();
    const sessionId = currentSessionId || makeId();
    if (!currentSessionId) {
      upsertSession({
        id: sessionId,
        title: text.slice(0, 18) || '無題の問い',
        createdAt: now,
        updatedAt: now,
        isPinned: false,
      });
      setCurrentSessionId(sessionId);
    } else {
      updateSession(sessionId, { updatedAt: now });
    }

    setMessages(prev => [
      ...prev,
      {
        id: makeId(),
        sessionId,
        role: 'user',
        content: text,
        createdAt: now,
      },
    ]);
    setUserInput('');
    setShowInput(false);
    setExpandedReactionsMsgId(null);
    setOpenToolbarMsgId(null);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleAgentResponse = async (agentId: AgentId) => {
    const sessionId = currentSessionIdRef.current;
    if (!sessionId || isGenerating) return;

    const generationToken = makeId();
    generationTokenRef.current = generationToken;
    const agentName = getAgentName(agentId);
    const sessionMessages = messages
      .filter(message => message.sessionId === sessionId)
      .sort((a, b) => a.createdAt - b.createdAt);

    playSound('click');
    setIsGenerating(true);
    setGeneratingAgent(agentName);
    setShowInput(false);
    setErrorMessage(null);
    setOpenToolbarMsgId(null);

    try {
      const content = await generateMockReply({
        agentId,
        mode: selectedMode,
        messages: sessionMessages,
        userName: settings.displayName,
      });

      if (generationTokenRef.current !== generationToken) return;
      if (!sessionsRef.current.some(session => session.id === sessionId)) {
        setErrorMessage('対象の問いが削除されたため、応答を保存しませんでした。');
        return;
      }

      const aiMessage: Message = {
        id: makeId(),
        sessionId,
        role: 'ai',
        content,
        agentId,
        createdAt: Date.now(),
      };

      if (agentId !== 'master') {
        aiMessage.reactions = await generateMockReactions(agentId);
      }

      if (generationTokenRef.current !== generationToken) return;
      if (!sessionsRef.current.some(session => session.id === sessionId)) {
        setErrorMessage('対象の問いが削除されたため、応答を保存しませんでした。');
        return;
      }
      setMessages(prev => [...prev, aiMessage]);
      updateSession(sessionId, { updatedAt: Date.now() });
      if (currentSessionIdRef.current === sessionId) {
        setExpandedReactionsMsgId(agentId !== 'master' ? aiMessage.id : null);
      }
      playSound('receive');
    } catch (error) {
      console.error(error);
      setErrorMessage('応答の生成に失敗しました。もう一度お試しください。');
      setShowInput(true);
    } finally {
      if (generationTokenRef.current === generationToken) {
        generationTokenRef.current = null;
        setIsGenerating(false);
        setGeneratingAgent(null);
      }
    }
  };

  const handleRandomResponse = () => {
    if (isGenerating) return;
    const randomAgent = AGENTS[Math.floor(Math.random() * AGENTS.length)];
    void handleAgentResponse(randomAgent.id);
  };

  const handleDeleteMessage = (messageId: string) => {
    if (isGenerating) return showBusyMessage();
    playSound('delete');
    setMessages(prev => prev.filter(message => message.id !== messageId));
    setOpenToolbarMsgId(null);
    if (expandedReactionsMsgId === messageId) setExpandedReactionsMsgId(null);
  };

  const handleDeleteSession = (sessionId: string) => {
    if (isGenerating) return showBusyMessage();
    playSound('delete');
    setMessages(prev => prev.filter(message => message.sessionId !== sessionId));
    setSessions(prev => prev.filter(session => session.id !== sessionId));
    if (currentSessionIdRef.current === sessionId) {
      setCurrentSessionId(null);
      resetSessionUi();
    }
    setDeleteTargetId(null);
  };

  const handleCopyMessage = async (messageId: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = content;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopiedMsgId(messageId);
    window.setTimeout(() => setCopiedMsgId(null), 1500);
  };

  const saveUserName = () => {
    const nextName = tempName.trim().slice(0, 30);
    if (!nextName) return;
    setSettings(prev => ({ ...prev, displayName: nextName }));
    setIsEditingUserName(false);
  };

  const applyHint = (hint: string) => {
    setUserInput(hint);
    setShowInput(true);
    window.setTimeout(() => {
      textareaRef.current?.focus();
      autoResize();
    }, 50);
  };

  return (
    <div className="lake-bg relative flex min-h-[100dvh] overflow-hidden font-sans text-slate-700">
      <div className="water-shimmer" />
      {isSidebarOpen && <button aria-label="メニューを閉じる" className="fixed inset-0 z-50 bg-slate-900/10 backdrop-blur-sm md:hidden" onClick={() => setIsSidebarOpen(false)} />}

      <aside className={`fixed inset-y-0 left-0 z-[60] flex w-72 flex-col border-r border-white/20 bg-slate-100/60 p-6 backdrop-blur-xl transition-transform duration-300 md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="mb-8 flex cursor-pointer items-center gap-3" onClick={() => setShowBeliefs(true)}>
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg"><Users size={18} /></div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-slate-900">じぶん会議</h1>
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">First Edition</p>
          </div>
        </div>

        <button onClick={() => { setTempName(settings.displayName); setIsEditingUserName(true); }} className="mb-6 flex w-full items-center gap-3 rounded-2xl p-4 text-left transition hover:bg-white/40">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/60 bg-white/50 text-slate-400"><UserCircle2 size={20} /></div>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Client</p>
            <p className="truncate text-sm font-black text-slate-700">{settings.displayName}</p>
          </div>
          <Edit3 size={13} className="text-slate-400" />
        </button>

        <button onClick={startNewSession} disabled={isGenerating} className="mb-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 py-4 text-xs font-black text-white shadow-xl shadow-slate-900/10 transition active:scale-[0.98] disabled:opacity-40"><Plus size={16} /> 新しい問い</button>

        <div className="no-scrollbar flex-1 space-y-1 overflow-y-auto">
          {sortedSessions.length === 0 && <p className="mt-4 px-4 text-center text-[11px] font-bold text-slate-400">過去の問いはありません</p>}
          {sortedSessions.map(session => (
            <button key={session.id} disabled={isGenerating} onClick={() => selectSession(session.id)} className={`group w-full rounded-2xl px-4 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${currentSessionId === session.id ? 'neu-pressed text-indigo-700' : 'cursor-pointer text-slate-500 hover:bg-white/30'}`}>
              <div className="flex items-center gap-2">
                {session.isPinned && <Pin size={11} className="shrink-0 fill-amber-500 text-amber-500" />}
                {editingSessionId === session.id ? (
                  <input
                    autoFocus
                    value={editSessionTitle}
                    maxLength={40}
                    onChange={event => setEditSessionTitle(event.target.value)}
                    onBlur={() => {
                      const title = editSessionTitle.trim().slice(0, 40);
                      if (title) updateSession(session.id, { title });
                      setEditingSessionId(null);
                    }}
                    onKeyDown={event => {
                      if (event.key === 'Enter') event.currentTarget.blur();
                    }}
                    className="min-w-0 flex-1 rounded-lg border border-indigo-100 bg-white px-2 py-1 text-xs font-bold outline-none"
                    onClick={event => event.stopPropagation()}
                  />
                ) : (
                  <span className="min-w-0 flex-1 truncate text-xs font-black">{session.title}</span>
                )}
                <div className="flex items-center gap-1 opacity-100 transition md:opacity-0 md:group-hover:opacity-100">
                  <span role="button" tabIndex={0} className="p-1 hover:text-indigo-600" onClick={event => { event.stopPropagation(); if (!isGenerating) { setEditingSessionId(session.id); setEditSessionTitle(session.title); } }} aria-label="タイトル編集"><Edit3 size={11} /></span>
                  <span role="button" tabIndex={0} className="p-1 hover:text-amber-500" onClick={event => { event.stopPropagation(); if (!isGenerating) updateSession(session.id, { isPinned: !session.isPinned }); }} aria-label="ピン留め"><Pin size={11} /></span>
                  <span role="button" tabIndex={0} className="p-1 hover:text-rose-500" onClick={event => { event.stopPropagation(); if (!isGenerating) setDeleteTargetId(session.id); }} aria-label="削除"><Trash2 size={11} /></span>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-5 border-t border-white/30 pt-4">
          <button onClick={() => setShowBeliefs(true)} className="flex w-full items-center justify-center gap-2 rounded-xl p-2 text-[11px] font-black text-slate-500 transition hover:bg-white/40 hover:text-slate-800"><Info size={14} /> エージェントの役割</button>
          <button onClick={() => setShowNotice(true)} className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl p-2 text-[11px] font-black text-slate-400 transition hover:bg-white/40 hover:text-slate-700"><AlertCircle size={14} /> ご利用について</button>
        </div>
      </aside>

      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <header className="neu-convex-sm z-20 flex items-center justify-between gap-2 rounded-b-2xl px-4 py-3 sm:px-5 sm:py-4">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <button onClick={() => setIsSidebarOpen(true)} className="-ml-2 p-2 text-slate-500 md:hidden" aria-label="メニュー"><Menu size={19} /></button>
            <h2 className="truncate text-sm font-black text-slate-800">{currentSession?.title || '思考の領域'}</h2>
          </div>
          <div className="neu-concave flex shrink-0 rounded-xl p-1">
            {(Object.keys(MODES) as ModeId[]).map(mode => (
              <button key={mode} onClick={() => setSelectedMode(mode)} disabled={isGenerating} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-black transition disabled:opacity-40 ${selectedMode === mode ? 'bg-white/70 text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                {modeIcon(mode)} <span className="hidden sm:inline">{MODES[mode].label}</span>
              </button>
            ))}
          </div>
        </header>

        {errorMessage && (
          <div className="mx-4 mt-4 flex items-center justify-between rounded-2xl border border-rose-200/60 bg-white/70 p-3 text-xs font-bold text-rose-600 shadow-lg backdrop-blur md:mx-6">
            <span className="flex items-center gap-2"><AlertCircle size={14} /> {errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="rounded-full p-1 hover:bg-rose-50"><X size={14} /></button>
          </div>
        )}

        <section className="relative z-20 px-4 pb-4 pt-4 md:p-6">
          <div className="mx-auto flex min-h-[76px] max-w-4xl flex-col justify-center">
            {showInput && !isGenerating ? (
              <div className="flex w-full gap-3">
                <div className="relative flex-1">
                  <textarea
                    ref={textareaRef}
                    rows={1}
                    value={userInput}
                    onChange={event => { setUserInput(event.target.value); autoResize(); }}
                    onKeyDown={event => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="魂の声、あるいは迷いを綴る"
                    className="neu-concave w-full resize-none rounded-2xl px-5 py-4 pr-14 text-base font-medium text-slate-800 outline-none transition focus:ring-2 focus:ring-indigo-200/60"
                  />
                  <button onClick={handleSend} disabled={!userInput.trim()} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl bg-slate-900 p-2.5 text-white shadow-lg transition active:scale-95 disabled:opacity-30" aria-label="送信"><Send size={18} /></button>
                </div>
                {currentMessages.length > 0 && <button onClick={() => setShowInput(false)} className="self-center p-2 text-slate-400 hover:text-slate-700" aria-label="入力を閉じる"><X size={20} /></button>}
              </div>
            ) : !isGenerating ? (
              <div className="no-scrollbar flex w-full items-center gap-2 overflow-x-auto py-2">
                <button onClick={() => void handleAgentResponse('master')} className="flex shrink-0 items-center gap-3 rounded-xl bg-slate-900 px-4 py-3 text-left text-white shadow-xl shadow-slate-900/10 active:scale-[0.98]"><Compass size={15} className="text-indigo-300" /><span className="text-[10px] font-black">心の鏡</span></button>
                <button onClick={handleRandomResponse} className="flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 px-4 py-3 text-[10px] font-black text-white shadow-lg active:scale-[0.98]"><Sparkles size={14} /> 委ねる</button>
                <button onClick={() => setShowInput(true)} className="neu-convex-sm flex shrink-0 items-center gap-2 rounded-xl px-4 py-3 text-[10px] font-black text-slate-600 active:scale-[0.98]"><Feather size={14} /> 綴る</button>
                {AGENTS.map(agent => (
                  <button key={agent.id} onClick={() => void handleAgentResponse(agent.id)} className={`neu-convex-sm flex shrink-0 items-center gap-3 rounded-xl px-4 py-2.5 text-left active:scale-[0.98] ${agent.color} ${agent.accentColor}`}>
                    {iconForAgent(agent.id)}
                    <span className="flex flex-col"><span className="text-[10px] font-black">{agent.name}</span><span className="text-[8px] font-bold opacity-50">{agent.role}</span></span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-3 p-4 text-slate-400">
                <div className="flex gap-1.5"><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400" /><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:0.15s]" /><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:0.3s]" /></div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em]">{generatingAgent} が思考中...</p>
              </div>
            )}
          </div>
        </section>

        <main ref={scrollRef} className="no-scrollbar relative z-10 flex-1 overflow-y-auto px-5 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-2 md:px-10">
          <div className="mx-auto max-w-2xl">
            {currentMessages.length === 0 && !isGenerating && showInput && (
              <div className="flex min-h-[52vh] flex-col items-center justify-center py-16 text-center">
                <div className="glass-card mb-6 flex h-16 w-16 items-center justify-center rounded-3xl text-slate-400"><Feather size={30} /></div>
                <h3 className="mb-2 text-lg font-black text-slate-800">思考の部屋へようこそ</h3>
                <p className="mb-8 text-xs font-bold leading-relaxed text-slate-500">心の欠片を、自由に置いてみてください。</p>
                <div className="grid w-full max-w-sm gap-3">
                  {['言葉にならないけど、ずっと胸にあるもの', '誰にも言っていない、小さな違和感', '理由はないけど、心が動いたこと'].map(hint => (
                    <button key={hint} onClick={() => applyHint(hint)} className="glass-card rounded-2xl px-5 py-4 text-left text-xs font-bold text-slate-600 transition hover:bg-white/70">{hint}</button>
                  ))}
                </div>
              </div>
            )}

            {currentMessages.map(message => {
              const isUser = message.role === 'user';
              return (
                <article key={message.id} className={`mb-10 flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                  {!isUser && <div className="mb-2 ml-1 text-[9px] font-black uppercase tracking-widest text-slate-400">{getAgentName(message.agentId)}</div>}
                  <div onClick={() => setOpenToolbarMsgId(openToolbarMsgId === message.id ? null : message.id)} className={`relative max-w-full cursor-pointer whitespace-pre-wrap break-words rounded-2xl px-5 py-4 text-[15px] leading-relaxed shadow-sm ${isUser ? 'bg-slate-900 text-slate-50 shadow-slate-900/10' : 'mirror-reflection neu-convex-sm text-slate-700'}`}>
                    {message.content}
                    <div className={`absolute right-2 top-2 flex items-center gap-1 rounded-lg p-1 transition-opacity ${isUser ? 'bg-slate-700/70' : 'bg-white/70'} ${openToolbarMsgId === message.id ? 'opacity-100' : 'opacity-0 md:group-hover:opacity-100'}`} onClick={event => event.stopPropagation()}>
                      <button onClick={() => void handleCopyMessage(message.id, message.content)} className="p-1 text-slate-400 hover:text-indigo-500" aria-label="コピー">{copiedMsgId === message.id ? <Check size={13} /> : <Copy size={13} />}</button>
                      <button onClick={() => handleDeleteMessage(message.id)} className="p-1 text-slate-400 hover:text-rose-500" aria-label="削除"><Trash2 size={13} /></button>
                    </div>
                  </div>

                  {!isUser && message.reactions && Object.keys(message.reactions).length > 0 && (
                    <div className="mt-3 w-full max-w-md">
                      <button onClick={() => setExpandedReactionsMsgId(expandedReactionsMsgId === message.id ? null : message.id)} className="mb-2 flex items-center gap-2 rounded-full border border-white/70 bg-white/50 px-3 py-1 text-[9px] font-black text-slate-500 shadow-sm"><Users size={11} /> OTHERS</button>
                      {expandedReactionsMsgId === message.id && (
                        <div className="glass-card grid gap-2 rounded-2xl p-3">
                          {Object.entries(message.reactions).map(([agentId, reaction]) => {
                            const agent = AGENTS.find(item => item.id === agentId);
                            if (!agent || !reaction) return null;
                            return (
                              <div key={agentId} className="flex gap-3 rounded-xl bg-white/60 p-3">
                                <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${agent.color} ${agent.accentColor} ${agent.borderColor}`}>{iconForAgent(agent.id, 13)}</div>
                                <div className="min-w-0 flex-1"><div className="mb-1 flex items-center gap-2"><span className="text-[10px] font-black text-slate-700">{agent.name}</span><span className="rounded bg-white/80 px-1.5 py-0.5 text-[8px] font-bold italic text-slate-500">{reaction.posture}</span></div><p className="text-[12px] font-medium leading-relaxed text-slate-600">「{reaction.comment}」</p></div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            })}

            {!isGenerating && currentMessages.length > 0 && currentMessages[currentMessages.length - 1]?.role === 'ai' && currentMessages[currentMessages.length - 1]?.agentId !== 'master' && userMessageCount >= 3 && (
              <div className="mb-8 mt-10 flex justify-center"><button onClick={() => void handleAgentResponse('master')} className="glass-card flex items-center gap-4 rounded-2xl px-5 py-4 text-left transition active:scale-[0.98]"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-indigo-500"><Compass size={18} /></div><div><p className="text-sm font-black text-slate-700">ここまでの声を映してみますか？</p><p className="text-[10px] font-bold text-slate-400">心の鏡が、散らばった思考を総括します</p></div></button></div>
            )}
          </div>
        </main>
      </div>

      {showIntro && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-100 p-6"><div className="water-shimmer" /><div className="glass-card relative z-10 w-full max-w-md rounded-[2.5rem] p-8 text-center shadow-2xl"><div className="mb-7 inline-flex h-20 w-20 items-center justify-center rounded-[2rem] bg-slate-900 text-white shadow-2xl"><Users size={36} /></div><p className="mb-2 text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Inner Conference Room</p><h1 className="mb-2 text-4xl font-black tracking-tight text-slate-800">じぶん会議</h1><p className="mb-8 text-sm font-bold text-slate-500">5つの視点で、じぶんに潜る</p><div className="mb-8 rounded-[2rem] border border-white/60 bg-white/30 p-6 text-center text-lg font-bold leading-loose tracking-widest text-slate-700">導かない。照らすだけ。<br />歩くのは、あなた自身。</div><button onClick={handleStartIntro} className="w-full rounded-2xl bg-slate-900 py-5 text-sm font-black text-white shadow-xl active:scale-[0.98]">会議をはじめる</button></div></div>
      )}

      {isEditingUserName && (
        <div className={modalBackdrop} onClick={() => setIsEditingUserName(false)}><div className="glass-card w-full max-w-sm rounded-[2rem] p-8 text-center" onClick={event => event.stopPropagation()}><h3 className="mb-6 text-lg font-black text-slate-800">お名前を教えてください</h3><input autoFocus value={tempName} maxLength={30} onChange={event => setTempName(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') saveUserName(); }} className="neu-concave mb-6 w-full rounded-2xl bg-transparent p-4 text-center text-xl font-black outline-none" /><button onClick={saveUserName} className="w-full rounded-2xl bg-slate-900 py-4 text-xs font-black text-white shadow-lg">変更を適用</button></div></div>
      )}

      {deleteTargetId && (
        <div className={modalBackdrop} onClick={() => !isGenerating && setDeleteTargetId(null)}><div className="glass-card w-full max-w-sm rounded-[2rem] p-8 text-center" onClick={event => event.stopPropagation()}><h3 className="mb-6 text-lg font-black text-slate-800">この思考を消去しますか？</h3><div className="grid gap-2"><button onClick={() => handleDeleteSession(deleteTargetId)} disabled={isGenerating} className="w-full rounded-2xl bg-rose-600 py-4 text-xs font-black text-white disabled:opacity-40">消去する</button><button onClick={() => setDeleteTargetId(null)} disabled={isGenerating} className="w-full rounded-2xl py-4 text-xs font-black text-slate-500 hover:bg-white/50 disabled:opacity-40">キャンセル</button></div></div></div>
      )}

      {(showBeliefs || showNotice) && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/10 p-6 backdrop-blur-xl" onClick={() => { setShowBeliefs(false); setShowNotice(false); }}><div className="glass-card flex max-h-[82dvh] w-full max-w-2xl flex-col overflow-hidden rounded-[2rem]" onClick={event => event.stopPropagation()}><div className="flex items-center justify-between border-b border-white/20 p-6"><h3 className="text-xl font-black text-slate-800">{showNotice ? 'ご利用について' : '会議メンバーの魂'}</h3><button onClick={() => { setShowBeliefs(false); setShowNotice(false); }} className="rounded-full p-2 hover:bg-white/50"><X size={20} /></button></div><div className="no-scrollbar flex-1 space-y-4 overflow-y-auto p-6">{showNotice ? (<div className="rounded-2xl bg-white/50 p-5 text-sm font-bold leading-relaxed text-slate-600">{RELEASE_NOTICE}</div>) : (AGENTS.map(agent => (<div key={agent.id} className={`neu-convex-sm rounded-2xl p-5 ${agent.color}`}><div className={`mb-3 flex items-center gap-3 text-xs font-black ${agent.accentColor}`}>{iconForAgent(agent.id)} {agent.name} — {agent.title}</div><p className="text-xs font-bold italic leading-relaxed text-slate-600">{agent.belief}</p></div>)))}</div></div></div>
      )}
    </div>
  );
};

export default AppStable;
