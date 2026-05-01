import { useMemo, useState } from 'react';
import { ChevronDown, Sparkles, Waves, X } from 'lucide-react';
import { buildFloatingKeywords, getRecentSessions, getSessionMessageCount } from '../services/keywordField';

const EmptyState = () => (
  <div className="flex h-80 flex-col items-center justify-center rounded-[2rem] border border-dashed border-white/70 bg-white/35 p-8 text-center">
    <Waves size={32} className="mb-3 text-slate-300" />
    <p className="text-sm font-black text-slate-600">まだ言葉は浮かんでいません</p>
    <p className="mt-2 text-xs font-bold leading-relaxed text-slate-400">問いを置いて会話すると、今回出てきた言葉が水面に浮かびます。</p>
  </div>
);

export const FloatingKeywordsPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const sessions = useMemo(() => getRecentSessions(), [isOpen, refreshKey]);
  const activeSessionId = selectedSessionId || sessions[0]?.id || '';
  const activeSession = sessions.find(session => session.id === activeSessionId);
  const keywords = useMemo(() => buildFloatingKeywords(activeSessionId), [activeSessionId, isOpen, refreshKey]);
  const messageCount = activeSessionId ? getSessionMessageCount(activeSessionId) : 0;

  const openPanel = () => {
    setRefreshKey(key => key + 1);
    setSelectedSessionId('');
    setIsOpen(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={openPanel}
        className="fixed bottom-[calc(8.55rem+env(safe-area-inset-bottom))] right-3 z-[90] flex items-center gap-1.5 rounded-full border border-white/60 bg-white/65 px-3 py-1.5 text-[10px] font-black text-slate-500 shadow-lg backdrop-blur-xl transition hover:bg-white/85"
        aria-label="言葉の水面を開く"
      >
        <Waves size={12} />
        言葉
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[170] flex items-end justify-center bg-slate-900/15 p-3 backdrop-blur-xl sm:items-center sm:p-6" onClick={() => setIsOpen(false)}>
          <section
            className="glass-card max-h-[90dvh] w-full max-w-3xl overflow-hidden rounded-[2rem] shadow-2xl"
            onClick={event => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="言葉の水面"
          >
            <header className="flex items-center justify-between border-b border-white/25 p-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Word Surface</p>
                <h3 className="text-xl font-black text-slate-800">言葉の水面</h3>
                <p className="mt-1 text-xs font-bold text-slate-400">今回出てきた言葉が、重要なものほど大きく浮かびます。</p>
              </div>
              <button type="button" onClick={() => setIsOpen(false)} className="rounded-full p-2 text-slate-400 hover:bg-white/60 hover:text-slate-700" aria-label="閉じる">
                <X size={20} />
              </button>
            </header>

            <div className="no-scrollbar max-h-[calc(90dvh-6rem)] overflow-y-auto p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
              <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_auto]">
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
                <button
                  type="button"
                  onClick={() => setRefreshKey(key => key + 1)}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-xs font-black text-white shadow-lg active:scale-[0.98]"
                >
                  <Sparkles size={14} />
                  更新
                </button>
              </div>

              <div className="mb-4 rounded-2xl border border-white/60 bg-white/40 p-4 text-xs font-bold leading-relaxed text-slate-500">
                {activeSession ? `選択中: ${activeSession.title} / メッセージ ${messageCount}件 / 浮上語 ${keywords.length}個` : '問いを作ると、ここに言葉が浮かびます。'}
              </div>

              {keywords.length === 0 ? <EmptyState /> : (
                <div className="relative h-[420px] overflow-hidden rounded-[2rem] border border-white/60 bg-gradient-to-br from-white/60 via-indigo-50/40 to-sky-50/45 shadow-inner">
                  <div className="absolute inset-0 opacity-60" style={{ background: 'radial-gradient(circle at 25% 30%, rgba(99,102,241,0.12), transparent 28%), radial-gradient(circle at 78% 62%, rgba(14,165,233,0.13), transparent 30%)' }} />
                  <div className="absolute inset-x-8 top-1/2 h-px bg-white/50 blur-[1px]" />
                  {keywords.map(keyword => (
                    <button
                      key={keyword.text}
                      type="button"
                      className="floating-keyword absolute rounded-full border border-white/60 bg-white/55 px-3 py-1.5 font-black text-slate-700 shadow-lg backdrop-blur-md transition hover:scale-110 hover:bg-white/80"
                      style={{
                        left: `${keyword.x}%`,
                        top: `${keyword.y}%`,
                        transform: 'translate(-50%, -50%)',
                        fontSize: `${keyword.size}px`,
                        opacity: keyword.opacity,
                        animationDelay: `${keyword.delay}s`,
                      }}
                      title={`重要度: ${keyword.score.toFixed(1)}`}
                    >
                      {keyword.text}
                    </button>
                  ))}
                </div>
              )}

              <p className="mt-4 text-[11px] font-bold leading-relaxed text-slate-400">
                現在はローカル抽出です。会議録で保存された重要語は強めに反映されます。次のPhaseで、タップした言葉から元の発言へ戻る導線を追加できます。
              </p>
            </div>
          </section>
        </div>
      )}
    </>
  );
};
