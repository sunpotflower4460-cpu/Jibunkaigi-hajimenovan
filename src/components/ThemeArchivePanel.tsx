import { useMemo, useState } from 'react';
import { Archive, BookOpen, RefreshCw, Sparkles, StickyNote, X } from 'lucide-react';
import { buildThemeArchive, type ThemeStat } from '../services/themeArchive';

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

const getThemeSizeClass = (index: number) => {
  if (index < 3) return 'text-lg px-4 py-2';
  if (index < 8) return 'text-sm px-3.5 py-1.5';
  return 'text-xs px-3 py-1.5';
};

const ThemeChip = ({ theme, index }: { theme: ThemeStat; index: number }) => (
  <div className={`rounded-full border border-white/70 bg-white/65 font-black text-slate-700 shadow-sm backdrop-blur-md ${getThemeSizeClass(index)}`}>
    <span>{theme.keyword}</span>
    <span className="ml-2 text-[10px] text-slate-400">{Math.round(theme.score)}</span>
  </div>
);

export const ThemeArchivePanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const archive = useMemo(() => buildThemeArchive(), [isOpen, refreshKey]);

  const openPanel = () => {
    setRefreshKey(key => key + 1);
    setIsOpen(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={openPanel}
        className="fixed bottom-[calc(13.75rem+env(safe-area-inset-bottom))] right-3 z-[90] flex items-center gap-1.5 rounded-full border border-white/60 bg-white/65 px-3 py-1.5 text-[10px] font-black text-slate-500 shadow-lg backdrop-blur-xl transition hover:bg-white/85"
        aria-label="輪郭を開く"
      >
        <Archive size={12} />
        輪郭
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[180] flex items-end justify-center bg-slate-900/15 p-3 backdrop-blur-xl sm:items-center sm:p-6" onClick={() => setIsOpen(false)}>
          <section
            className="glass-card max-h-[92dvh] w-full max-w-4xl overflow-hidden rounded-[2rem] shadow-2xl"
            onClick={event => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="自分の輪郭"
          >
            <header className="flex items-center justify-between border-b border-white/25 p-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Inner Outline</p>
                <h3 className="text-xl font-black text-slate-800">自分の輪郭</h3>
                <p className="mt-1 text-xs font-bold text-slate-400">会議録・付箋・会話から、くり返し浮かぶテーマを見ます。</p>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setRefreshKey(key => key + 1)} className="rounded-full p-2 text-slate-400 hover:bg-white/60 hover:text-slate-700" aria-label="更新">
                  <RefreshCw size={18} />
                </button>
                <button type="button" onClick={() => setIsOpen(false)} className="rounded-full p-2 text-slate-400 hover:bg-white/60 hover:text-slate-700" aria-label="閉じる">
                  <X size={20} />
                </button>
              </div>
            </header>

            <div className="no-scrollbar max-h-[calc(92dvh-6rem)] overflow-y-auto p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
              <div className="mb-4 grid gap-3 sm:grid-cols-4">
                <div className="rounded-3xl border border-white/60 bg-white/45 p-4 text-center">
                  <p className="text-2xl font-black text-slate-800">{archive.totals.sessions}</p>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">問い</p>
                </div>
                <div className="rounded-3xl border border-white/60 bg-white/45 p-4 text-center">
                  <p className="text-2xl font-black text-slate-800">{archive.totals.messages}</p>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">声</p>
                </div>
                <div className="rounded-3xl border border-white/60 bg-white/45 p-4 text-center">
                  <p className="text-2xl font-black text-slate-800">{archive.totals.records}</p>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">会議録</p>
                </div>
                <div className="rounded-3xl border border-white/60 bg-white/45 p-4 text-center">
                  <p className="text-2xl font-black text-slate-800">{archive.totals.notes}</p>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">付箋</p>
                </div>
              </div>

              <section className="mb-4 rounded-[2rem] border border-white/60 bg-gradient-to-br from-white/60 via-indigo-50/45 to-sky-50/45 p-5 shadow-inner">
                <div className="mb-4 flex items-center gap-2 text-slate-700">
                  <Sparkles size={16} />
                  <h4 className="text-sm font-black">くり返し浮かぶテーマ</h4>
                </div>
                {archive.themes.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-white/70 bg-white/35 p-8 text-center">
                    <Archive size={30} className="mx-auto mb-3 text-slate-300" />
                    <p className="text-sm font-black text-slate-600">まだテーマは見えていません</p>
                    <p className="mt-2 text-xs font-bold leading-relaxed text-slate-400">会議録や付箋が増えるほど、ここに自分の輪郭が浮かびます。</p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2.5">
                    {archive.themes.map((theme, index) => (
                      <ThemeChip key={theme.keyword} theme={theme} index={index} />
                    ))}
                  </div>
                )}
              </section>

              <div className="grid gap-4 lg:grid-cols-2">
                <section className="rounded-[2rem] border border-white/60 bg-white/45 p-5">
                  <div className="mb-4 flex items-center gap-2 text-slate-700">
                    <BookOpen size={16} />
                    <h4 className="text-sm font-black">最近の会議録</h4>
                  </div>
                  <div className="space-y-3">
                    {archive.recentRecords.length === 0 ? (
                      <p className="rounded-2xl bg-white/45 p-4 text-xs font-bold leading-relaxed text-slate-400">会議録を作ると、ここに蓄積されます。</p>
                    ) : archive.recentRecords.map(record => (
                      <article key={record.id} className="rounded-2xl border border-white/60 bg-white/55 p-4">
                        <div className="mb-2 flex items-start justify-between gap-3">
                          <h5 className="text-sm font-black text-slate-700">{record.title}</h5>
                          <span className="shrink-0 text-[10px] font-bold text-slate-400">{formatDate(record.updatedAt)}</span>
                        </div>
                        <p className="text-xs font-bold leading-relaxed text-slate-500">{record.selfLine}</p>
                      </article>
                    ))}
                  </div>
                </section>

                <section className="rounded-[2rem] border border-white/60 bg-white/45 p-5">
                  <div className="mb-4 flex items-center gap-2 text-slate-700">
                    <StickyNote size={16} />
                    <h4 className="text-sm font-black">最近の付箋</h4>
                  </div>
                  <div className="space-y-3">
                    {archive.recentNotes.length === 0 ? (
                      <p className="rounded-2xl bg-white/45 p-4 text-xs font-bold leading-relaxed text-slate-400">付箋を貼ると、ここに自分の反応が残ります。</p>
                    ) : archive.recentNotes.map(note => (
                      <article key={note.id} className="rounded-2xl border border-white/60 bg-white/55 p-4">
                        <div className="mb-2 flex items-start justify-between gap-3">
                          <h5 className="text-sm font-black text-slate-700">{note.label}</h5>
                          <span className="shrink-0 text-[10px] font-bold text-slate-400">{formatDate(note.updatedAt)}</span>
                        </div>
                        <p className="whitespace-pre-wrap text-xs font-bold leading-relaxed text-slate-500">{note.content}</p>
                      </article>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
};
