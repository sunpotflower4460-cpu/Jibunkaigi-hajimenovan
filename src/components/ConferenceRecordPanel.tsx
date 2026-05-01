import { useMemo, useState } from 'react';
import { BookOpen, ChevronDown, FileText, MessageSquareQuote, Sparkles, Trash2, X } from 'lucide-react';
import { createConferenceRecord } from '../services/conferenceRecord';
import { deleteConferenceRecord, loadConferenceRecords, upsertConferenceRecord } from '../services/conferenceRecordStore';
import { loadState } from '../services/storage';
import { openSelfReturnNote } from '../utils/selfReturn';
import type { ConferenceRecord, Session } from '../types';

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

const RecordCard = ({ record, onDelete }: { record: ConferenceRecord; onDelete: (recordId: string) => void }) => (
  <article className="rounded-3xl border border-white/60 bg-white/60 p-5 shadow-sm">
    <div className="mb-3 flex items-start justify-between gap-3">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Conference Record</p>
        <h4 className="mt-1 text-base font-black text-slate-800">{record.title}</h4>
        <p className="mt-1 text-[10px] font-bold text-slate-400">{formatDate(record.createdAt)}</p>
      </div>
      <button type="button" onClick={() => onDelete(record.id)} className="rounded-full p-2 text-slate-300 hover:bg-white/70 hover:text-rose-500" aria-label="会議録を削除">
        <Trash2 size={15} />
      </button>
    </div>

    <div className="mb-4 flex flex-wrap gap-2">
      {record.keywords.length > 0 ? record.keywords.map(keyword => (
        <span key={keyword} className="rounded-full bg-slate-900/90 px-3 py-1 text-[10px] font-black text-white shadow-sm">{keyword}</span>
      )) : <span className="rounded-full bg-white/70 px-3 py-1 text-[10px] font-black text-slate-400">まだ重要語は少なめ</span>}
    </div>

    <div className="space-y-3 text-xs font-bold leading-relaxed text-slate-600">
      <section className="rounded-2xl bg-white/55 p-4">
        <p className="mb-1 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">心の鏡</p>
        <p className="whitespace-pre-wrap">{record.mirrorSummary}</p>
      </section>
      <section className="rounded-2xl bg-white/45 p-4">
        <p className="mb-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">今の自分に残った一文</p>
        <p>「{record.selfLine}」</p>
      </section>
      <section className="rounded-2xl bg-violet-50/70 p-4 text-violet-700">
        <p className="mb-1 text-[10px] font-black uppercase tracking-[0.2em] text-violet-400">次に戻る問い</p>
        <p>{record.returnQuestion}</p>
      </section>
    </div>

    <button
      type="button"
      onClick={() => openSelfReturnNote({
        sessionId: record.sessionId,
        kind: 'question',
        seedText: `私はどう思う？\n\n${record.returnQuestion}`,
      })}
      className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/70 bg-slate-900 px-4 py-3 text-xs font-black text-white shadow-lg shadow-slate-900/10 active:scale-[0.98]"
    >
      <MessageSquareQuote size={14} />
      この会議録に「どう思う？」を貼る
    </button>
  </article>
);

export const ConferenceRecordPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [records, setRecords] = useState<ConferenceRecord[]>(() => loadConferenceRecords());
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const state = useMemo(() => loadState(), [isOpen, records.length]);

  const sortedSessions = useMemo(() => {
    return [...state.sessions].sort((a, b) => b.updatedAt - a.updatedAt);
  }, [state.sessions]);

  const activeSessionId = selectedSessionId || sortedSessions[0]?.id || '';
  const activeSession = sortedSessions.find(session => session.id === activeSessionId);
  const activeRecordCount = records.filter(record => record.sessionId === activeSessionId).length;

  const openPanel = () => {
    setRecords(loadConferenceRecords());
    setSelectedSessionId('');
    setErrorMessage(null);
    setIsOpen(true);
  };

  const createRecord = () => {
    const freshState = loadState();
    const session: Session | undefined = freshState.sessions.find(item => item.id === activeSessionId) || [...freshState.sessions].sort((a, b) => b.updatedAt - a.updatedAt)[0];
    if (!session) {
      setErrorMessage('まずは問いをひとつ作ってから、会議録を残せます。');
      return;
    }

    const sessionMessages = freshState.messages.filter(message => message.sessionId === session.id);
    if (sessionMessages.length === 0) {
      setErrorMessage('この問いにはまだ会話がありません。言葉を置いてから会議録を作れます。');
      return;
    }

    const record = createConferenceRecord({ session, messages: freshState.messages });
    const nextRecords = upsertConferenceRecord(record);
    setRecords(nextRecords);
    setSelectedSessionId(session.id);
    setErrorMessage(null);
  };

  const handleDeleteRecord = (recordId: string) => {
    setRecords(deleteConferenceRecord(recordId));
  };

  const visibleRecords = records
    .filter(record => !activeSessionId || record.sessionId === activeSessionId)
    .slice(0, 8);

  return (
    <>
      <button
        type="button"
        onClick={openPanel}
        className="fixed bottom-[calc(5.95rem+env(safe-area-inset-bottom))] right-3 z-[90] flex items-center gap-1.5 rounded-full border border-white/60 bg-white/65 px-3 py-1.5 text-[10px] font-black text-slate-500 shadow-lg backdrop-blur-xl transition hover:bg-white/85"
        aria-label="会議録を開く"
      >
        <BookOpen size={12} />
        会議録
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[165] flex items-end justify-center bg-slate-900/15 p-3 backdrop-blur-xl sm:items-center sm:p-6" onClick={() => setIsOpen(false)}>
          <section
            className="glass-card max-h-[90dvh] w-full max-w-2xl overflow-hidden rounded-[2rem] shadow-2xl"
            onClick={event => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="会議録"
          >
            <header className="flex items-center justify-between border-b border-white/25 p-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Dive Record</p>
                <h3 className="text-xl font-black text-slate-800">会議録</h3>
                <p className="mt-1 text-xs font-bold text-slate-400">自分に深く潜った記録を、1枚に残します。</p>
              </div>
              <button type="button" onClick={() => setIsOpen(false)} className="rounded-full p-2 text-slate-400 hover:bg-white/60 hover:text-slate-700" aria-label="閉じる">
                <X size={20} />
              </button>
            </header>

            <div className="no-scrollbar max-h-[calc(90dvh-6rem)] overflow-y-auto p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
              <div className="mb-4 rounded-3xl border border-white/60 bg-white/45 p-4">
                <div className="mb-3 flex items-center gap-2 text-slate-700">
                  <FileText size={16} />
                  <span className="text-sm font-black">会議録を作る</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                  <label className="relative block">
                    <select
                      value={activeSessionId}
                      onChange={event => setSelectedSessionId(event.target.value)}
                      className="w-full appearance-none rounded-2xl border border-white/70 bg-white/70 px-4 py-3 pr-9 text-xs font-black text-slate-700 outline-none"
                    >
                      {sortedSessions.length === 0 && <option value="">問いがありません</option>}
                      {sortedSessions.map(session => (
                        <option key={session.id} value={session.id}>{session.title}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  </label>
                  <button
                    type="button"
                    onClick={createRecord}
                    className="flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-xs font-black text-white shadow-lg active:scale-[0.98]"
                  >
                    <Sparkles size={14} />
                    作成
                  </button>
                </div>
                <p className="mt-3 text-[11px] font-bold leading-relaxed text-slate-400">
                  現在はローカル生成です。Gemini API接続後は、より深い要約に差し替えられます。
                  {activeSession && ` 選択中: ${activeSession.title} / 会議録 ${activeRecordCount}件`}
                </p>
                {errorMessage && <p className="mt-3 rounded-2xl bg-rose-50 p-3 text-xs font-black text-rose-500">{errorMessage}</p>}
              </div>

              <div className="space-y-4">
                {visibleRecords.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-white/70 bg-white/35 p-8 text-center">
                    <BookOpen size={28} className="mx-auto mb-3 text-slate-300" />
                    <p className="text-sm font-black text-slate-600">まだ会議録はありません</p>
                    <p className="mt-2 text-xs font-bold leading-relaxed text-slate-400">問いを置き、声を聞いたあと、「作成」を押すと会議録が残ります。</p>
                  </div>
                ) : visibleRecords.map(record => (
                  <RecordCard key={record.id} record={record} onDelete={handleDeleteRecord} />
                ))}
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
};
