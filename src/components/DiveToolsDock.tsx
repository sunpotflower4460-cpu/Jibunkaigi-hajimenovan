import { useEffect, useState } from 'react';
import { Archive, BookOpen, ChevronUp, Settings, Sparkles, StickyNote, Waves, X } from 'lucide-react';
import { openDiveTool, type DiveToolId } from '../utils/diveTools';

const TOOLS: Array<{
  id: DiveToolId;
  label: string;
  description: string;
  icon: React.ReactNode;
}> = [
  { id: 'outline', label: '輪郭', description: 'くり返すテーマを見る', icon: <Archive size={14} /> },
  { id: 'records', label: '会議録', description: '潜った記録を残す', icon: <BookOpen size={14} /> },
  { id: 'words', label: '言葉', description: '浮かぶ重要語を見る', icon: <Waves size={14} /> },
  { id: 'notes', label: '付箋', description: 'どう思う？を残す', icon: <StickyNote size={14} /> },
  { id: 'settings', label: '設定', description: '保存や注意を見る', icon: <Settings size={14} /> },
];

const LEGACY_BUTTON_LABELS = ['設定を開く', '会議録を開く', '言葉の水面を開く', 'どう思う？付箋を開く', '輪郭を開く'];

const isIntroScreenVisible = () => {
  const bodyText = document.body.innerText || '';
  return bodyText.includes('会議をはじめる') && bodyText.includes('利用規約');
};

const markLegacyButtons = () => {
  for (const label of LEGACY_BUTTON_LABELS) {
    const buttons = document.querySelectorAll<HTMLButtonElement>(`button[aria-label="${label}"]`);
    buttons.forEach(button => {
      button.dataset.legacyDiveTool = 'true';
      button.setAttribute('aria-hidden', 'true');
      button.tabIndex = -1;
    });
  }
};

export const DiveToolsDock = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isIntroVisible, setIsIntroVisible] = useState(() => {
    if (typeof document === 'undefined') return false;
    return isIntroScreenVisible();
  });

  useEffect(() => {
    const syncIntroVisibility = () => {
      const nextVisible = isIntroScreenVisible();
      setIsIntroVisible(nextVisible);
      if (nextVisible) setIsOpen(false);
    };

    syncIntroVisibility();
    const observer = new MutationObserver(syncIntroVisibility);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    markLegacyButtons();
    const observer = new MutationObserver(markLegacyButtons);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  const handleOpenTool = (toolId: DiveToolId) => {
    setIsOpen(false);
    window.setTimeout(() => openDiveTool(toolId), 80);
  };

  if (isIntroVisible) return null;

  return (
    <div className="dive-tools-dock fixed bottom-[calc(3.3rem+env(safe-area-inset-bottom))] right-3 z-[120] flex flex-col items-end gap-2">
      {isOpen && (
        <div className="dive-tools-panel glass-card w-[min(18rem,calc(100vw-1.5rem))] rounded-[1.5rem] p-3 shadow-2xl">
          <div className="mb-2 flex items-center justify-between px-1">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400">Dive Tools</p>
              <p className="text-sm font-black text-slate-800">深く潜る</p>
            </div>
            <button type="button" onClick={() => setIsOpen(false)} className="rounded-full p-2 text-slate-400 hover:bg-white/60 hover:text-slate-700" aria-label="潜るメニューを閉じる">
              <X size={16} />
            </button>
          </div>
          <div className="grid gap-2">
            {TOOLS.map(tool => (
              <button
                key={tool.id}
                type="button"
                onClick={() => handleOpenTool(tool.id)}
                className="flex items-center gap-3 rounded-2xl border border-white/60 bg-white/58 p-3 text-left shadow-sm hover:bg-white/80"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg">{tool.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-black text-slate-800">{tool.label}</span>
                  <span className="block truncate text-[10px] font-bold text-slate-400">{tool.description}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen(value => !value)}
        className="flex items-center gap-2 rounded-full border border-white/70 bg-slate-900 px-4 py-3 text-xs font-black text-white shadow-2xl shadow-slate-900/20 backdrop-blur-xl hover:bg-slate-800"
        aria-expanded={isOpen}
        aria-label="潜るメニューを開く"
      >
        {isOpen ? <ChevronUp size={16} /> : <Sparkles size={16} />}
        潜る
      </button>
    </div>
  );
};
