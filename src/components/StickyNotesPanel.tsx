import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, MessageSquareQuote, Plus, StickyNote, Trash2, X } from 'lucide-react';
import { createStickyNote, deleteStickyNote, loadStickyNotes, STICKY_NOTE_TEMPLATES } from '../services/stickyNoteStore';
import { loadState } from '../services/storage';
import { subscribeSelfReturnNote } from '../utils/selfReturn';
import type { StickyNote as StickyNoteType, StickyNoteKind } from '../types';

const formatDate = (timestamp: number) => {
  try {
    return new Intl.DateTimeFormat('ja-JP', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(timestamp));
  } catch {
    return '';
  }
};

const getKindTone = (kind: StickyNoteKind) => {
  switch (kind) {
    case 'question':
      return 'bg-indigo-50/80 text-indigo-600 border-indigo-100';
    case 'truth':
      return 'bg-amber-50/80 text-amber-700 border-amber-100';
    case 'notYet':
      return 'bg-slate-100/80 text-slate-600 border-slate-200';
    case 'later':
      return 'bg-sky-50/80 text-sky-600 border-sky-100';
    case 'important':
      return 'bg-rose-50/80 text-rose-600 border-rose-100';
    default:
      return 'bg-white/70 text-slate-600 border-white/70';
  }
};

const NoteCard = ({ note, onDelete }: { note: StickyNoteType; onDelete: (noteId: string) => void }) => (
  <article className={`rounded-3xl border p-4 shadow-sm ${getKindTone(note.kind)}`}>
    <div className="mb-2 flex items-start justify-between gap-3">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.22em] opacity-60">Sticky Note</p>
        <h4 className="mt-1 text-sm font-black">{note.label}</h4>
        <p className="mt-1 text-[10px] font-bold opacity-55">{formatDate(note.createdAt)}</p>
      </div>
      <button type="button" onClick={() => onDelete(note.id)} className="rounded-full p-2 opacity-55 hover:bg-white/60 hover:opacity-100" aria-label="付箋を削除">
        <Trash2 size={14} />
      </button>
    </div>
    <p className="whitespace-pre-wrap text-xs font-bold leading-relaxed">{note.content}</p>
  </article>
);

export const StickyNotesPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notes, setNotes] = useState<StickyNoteType[]>(() => loadStickyNotes());
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [selectedKind, setSelectedKind] = useState<StickyNoteKind>('question');
  const [content, setContent] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const state = useMemo(() => loadState(), [isOpen, notes.length]);
  const sessions = useMemo(() => [...state.sessions].sort((a, b) => b.updatedAt - a.updatedAt), [state.sessions]);
  const activeSessionId = selectedSessionId || sessions[0]?.id || '';
  const activeSession = sessions.find(session => session.id === activeSessionId);
  const activeTemplate = STICKY_NOTE_TEMPLATES.find(template => template.kind === selectedKind) || STICKY_NOTE_TEMPLATES[0];

  const openPanel = () => {
    setNotes(loadStickyNotes());
    setSelectedSessionId('');
    setSelectedKind('question');
    setContent('');
    setErrorMessage(null);
    setIsOpen(true);
  };

  useEffect(() => {
    return subscribeSelfReturnNote(payload => {
      setNotes(loadStickyNotes());
      setSelectedSessionId(payload.sessionId || '');
      setSelectedKind(payload.kind || 'question');
      setContent((payload.seedText || '私はどう思う？').slice(0, 220));
      setErrorMessage(null);
      setIsOpen(true);
    });
  }, []);

  const addNote = () => {
    const text = content.trim();
    if (!activeSessionId) {
      setErrorMessage('まずは問いをひとつ作ってから、付箋を貼れます。');
      return;
    }
    if (!text) {
      setErrorMessage('付箋に残したい言葉を少しだけ書いてください。');
      return;
    }

    const nextNotes = createStickyNote({
      sessionId: activeSessionId,
      kind: selectedKind,
      content: text,
    });
    setNotes(nextNotes);
    setContent('');
    setErrorMessage(null);
  };

  const handleDelete = (noteId: string) => {
    setNotes(deleteStickyNote(noteId));
  };

  const visibleNotes = notes
    .filter(note => !activeSessionId || note.sessionId === activeSessionId)
    .slice(0, 12);

  return (
    <>
      <button
        type="button"
        onClick={openPanel}
        className="fixed bottom-[calc(11.15rem+env(safe-area-inset-bottom))] right-3 z-[90] flex items-center gap-1.5 rounded-full border border-white/60 bg-white/65 px-3 py-1.5 text-[10px] font-black text-slate-500 shadow-lg backdrop-blur-xl transition hover:bg-white/85"
        aria-label="どう思う？付箋を開く"
      >
        <StickyNote size={12} />
        付箋
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[175] flex items-end justify-center bg-slate-900/15 p-3 backdrop-blur-xl sm:items-center sm:p-6" onClick={() => setIsOpen(false)}>
          <section
            className="glass-card max-h-[90dvh] w-full max-w-2xl overflow-hidden rounded-[2rem] shadow-2xl"
            onClick={event => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="どう思う？付箋"
          >
            <header className="flex items-center justify-between border-b border-white/25 p-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Self Sticky Notes</p>
                <h3 className="text-xl font-black text-slate-800">どう思う？付箋</h3>
                <p className="mt-1 text-xs font-bold text-slate-400">AIの答えではなく、今の自分の反応を残します。</p>
              </div>
              <button type="button" onClick={() => setIsOpen(false)} className="rounded-full p-2 text-slate-400 hover:bg-white/60 hover:text-slate-700" aria-label="閉じる">
                <X size={20} />
              </button>
            </header>

            <div className="no-scrollbar max-h-[calc(90dvh-6rem)] overflow-y-auto p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
              <div className="mb-4 rounded-3xl border border-white/60 bg-white/45 p-4">
                <div className="mb-3 flex items-center gap-2 text-slate-700">
                  <MessageSquareQuote size={16} />
                  <span className="text-sm font-black">自分に付箋を貼る</span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="relative block">
                    <select
                      value={activeSessionId}
                      onChange={event => setSelectedSessionId(event.target.value)}
                      className="w-full appearance-none rounded-2xl border border-white/70 bg-white/70 px-4 py-3 pr-9 text-xs font-black text-slate-700 outline-none"
                    >
                      {sessions.length === 0 && <option value="">問いがありません</option>}
                      {sessions.map(session => (
                        <option key={session.id} value={session.id}>{session.title}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  </label>

                  <label className="relative block">
                    <select
                      value={selectedKind}
                      onChange={event => setSelectedKind(event.target.value as StickyNoteKind)}
                      className="w-full appearance-none rounded-2xl border border-white/70 bg-white/70 px-4 py-3 pr-9 text-xs font-black text-slate-700 outline-none"
                    >
                      {STICKY_NOTE_TEMPLATES.map(template => (
                        <option key={template.kind} value={template.kind}>{template.label}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  </label>
                </div>

                <textarea
                  value={content}
                  onChange={event => setContent(event.target.value.slice(0, 220))}
                  placeholder={activeTemplate.placeholder}
                  rows={3}
                  className="mt-3 w-full resize-none rounded-2xl border border-white/70 bg-white/70 px-4 py-3 text-sm font-bold leading-relaxed text-slate-700 outline-none focus:ring-2 focus:ring-indigo-200/60"
                />

                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-[11px] font-bold leading-relaxed text-slate-400">
                    {activeSession ? `選択中: ${activeSession.title}` : '問いを作ると、ここに付箋を残せます。'}
                  </p>
                  <button
                    type="button"
                    onClick={addNote}
                    className="flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-xs font-black text-white shadow-lg active:scale-[0.98]"
                  >
                    <Plus size={14} />
                    貼る
                  </button>
                </div>

                {errorMessage && <p className="mt-3 rounded-2xl bg-rose-50 p-3 text-xs font-black text-rose-500">{errorMessage}</p>}
              </div>

              <div className="space-y-3">
                {visibleNotes.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-white/70 bg-white/35 p-8 text-center">
                    <StickyNote size={28} className="mx-auto mb-3 text-slate-300" />
                    <p className="text-sm font-black text-slate-600">まだ付箋はありません</p>
                    <p className="mt-2 text-xs font-bold leading-relaxed text-slate-400">「どう思う？」を、自分に返すための小さな印として残せます。</p>
                  </div>
                ) : visibleNotes.map(note => (
                  <NoteCard key={note.id} note={note} onDelete={handleDelete} />
                ))}
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
};
