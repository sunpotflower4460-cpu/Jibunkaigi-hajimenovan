import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Cloud, CloudOff, CreditCard, Database, KeyRound, Loader2, Megaphone, Settings, ShieldCheck, X } from 'lucide-react';
import { getCloudSaveSnapshot, isCloudSaveConfigured, subscribeCloudSaveStatus, type CloudSaveSnapshot } from '../services/cloud/firebaseCloud';
import { callGeminiApi } from '../services/geminiApiClient';
import { subscribeCloseDivePanels, subscribeDiveTool } from '../utils/diveTools';

const statusLabel = (snapshot: CloudSaveSnapshot) => {
  switch (snapshot.status) {
    case 'disabled':
      return '端末内保存';
    case 'connecting':
      return 'クラウド準備中';
    case 'signed-in':
      return 'クラウド接続済み';
    case 'syncing':
      return 'クラウド保存中';
    case 'synced':
      return 'クラウド保存済み';
    case 'error':
      return 'クラウド接続エラー';
    default:
      return '端末内保存';
  }
};

type AiTestState =
  | { status: 'idle'; message: string }
  | { status: 'testing'; message: string }
  | { status: 'connected'; message: string }
  | { status: 'missing'; message: string }
  | { status: 'error'; message: string };

const aiBadgeLabel = (state: AiTestState) => {
  if (state.status === 'connected') return '接続OK';
  if (state.status === 'missing') return '未設定';
  if (state.status === 'error') return '要確認';
  if (state.status === 'testing') return '確認中';
  return '未確認';
};

const SettingRow = ({
  icon,
  title,
  description,
  badge,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: string;
  children?: React.ReactNode;
}) => (
  <div className="rounded-2xl border border-white/60 bg-white/55 p-4 shadow-sm">
    <div className="mb-2 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-slate-800">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/70 text-slate-500 shadow-sm">{icon}</span>
        <h4 className="text-sm font-black">{title}</h4>
      </div>
      {badge && <span className="shrink-0 rounded-full bg-slate-900 px-2.5 py-1 text-[9px] font-black text-white">{badge}</span>}
    </div>
    <p className="text-xs font-bold leading-relaxed text-slate-500">{description}</p>
    {children && <div className="mt-3">{children}</div>}
  </div>
);

export const SettingsPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [snapshot, setSnapshot] = useState<CloudSaveSnapshot>(() => getCloudSaveSnapshot());
  const [aiTest, setAiTest] = useState<AiTestState>({
    status: 'idle',
    message: 'まだ接続確認をしていません。',
  });

  useEffect(() => subscribeCloudSaveStatus(setSnapshot), []);
  useEffect(() => subscribeDiveTool('settings', () => setIsOpen(true)), []);
  useEffect(() => subscribeCloseDivePanels(() => setIsOpen(false)), []);
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  const cloudConfigured = isCloudSaveConfigured();
  const cloudDescription = cloudConfigured
    ? 'Firebase設定が見つかっています。匿名ログイン後、Firestoreへのクラウド保存を試みます。'
    : 'Firebase環境変数が未設定のため、現在は端末内保存のみです。設定後にクラウド保存へ切り替わります。';

  const testAiConnection = async () => {
    setAiTest({ status: 'testing', message: 'Gemini APIへの接続を確認しています。' });
    const result = await callGeminiApi({
      prompt: '接続確認です。日本語で短く「接続できています」と返してください。',
      systemInstruction: 'あなたは接続確認用の応答だけを返します。説明は不要です。',
    });

    if (result.ok) {
      setAiTest({
        status: 'connected',
        message: `接続できています。応答: ${result.text.slice(0, 60)}`,
      });
      return;
    }

    if (result.code === 'GEMINI_API_KEY_MISSING') {
      setAiTest({
        status: 'missing',
        message: 'サーバー側の GEMINI_API_KEY が未設定です。未設定でもローカル応答に戻るため、アプリ自体は動きます。',
      });
      return;
    }

    setAiTest({
      status: 'error',
      message: `接続確認に失敗しました。${result.code}${result.status ? ` / status ${result.status}` : ''}`,
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-[calc(3.35rem+env(safe-area-inset-bottom))] right-3 z-[90] flex items-center gap-1.5 rounded-full border border-white/60 bg-white/65 px-3 py-1.5 text-[10px] font-black text-slate-500 shadow-lg backdrop-blur-xl transition hover:bg-white/85"
        aria-label="設定を開く"
      >
        <Settings size={12} />
        設定
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[160] flex items-end justify-center bg-slate-900/15 p-3 backdrop-blur-xl sm:items-center sm:p-6" onClick={() => setIsOpen(false)}>
          <section
            className="glass-card max-h-[88dvh] w-full max-w-xl overflow-hidden rounded-[2rem] shadow-2xl"
            onClick={event => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="設定"
          >
            <header className="flex items-center justify-between border-b border-white/25 p-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Settings</p>
                <h3 className="text-xl font-black text-slate-800">設定</h3>
              </div>
              <button type="button" onClick={() => setIsOpen(false)} className="rounded-full p-2 text-slate-400 hover:bg-white/60 hover:text-slate-700" aria-label="閉じる">
                <X size={20} />
              </button>
            </header>

            <div className="no-scrollbar max-h-[calc(88dvh-5.5rem)] space-y-3 overflow-y-auto p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
              <SettingRow
                icon={snapshot.status === 'disabled' || snapshot.status === 'error' ? <CloudOff size={16} /> : <Cloud size={16} />}
                title="保存状態"
                description={`現在の状態: ${statusLabel(snapshot)}。会話は端末内に保存され、Firebase設定済みの場合だけクラウド同期も行います。`}
                badge={statusLabel(snapshot)}
              />

              <SettingRow
                icon={<Database size={16} />}
                title="端末内保存"
                description="localStorage と IndexedDB の二重保存です。同じ端末・同じブラウザでは残りやすくなっています。サイトデータを削除すると消える可能性があります。"
                badge="有効"
              />

              <SettingRow
                icon={<ShieldCheck size={16} />}
                title="クラウド保存"
                description={cloudDescription}
                badge={cloudConfigured ? '設定あり' : '未設定'}
              />

              <SettingRow
                icon={aiTest.status === 'connected' ? <CheckCircle2 size={16} /> : aiTest.status === 'testing' ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
                title="AI API接続"
                description="APIキーをアプリ内へ直接入れず、サーバー経由で安全に接続します。未設定時はローカル応答に戻ります。"
                badge={aiBadgeLabel(aiTest)}
              >
                <div className="rounded-2xl bg-white/55 p-3">
                  <p className="mb-3 text-[11px] font-bold leading-relaxed text-slate-500">{aiTest.message}</p>
                  <button
                    type="button"
                    onClick={() => void testAiConnection()}
                    disabled={aiTest.status === 'testing'}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-[11px] font-black text-white shadow-lg transition active:scale-[0.98] disabled:opacity-45"
                  >
                    {aiTest.status === 'testing' ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
                    AI接続を確認する
                  </button>
                </div>
              </SettingRow>

              <SettingRow
                icon={<Megaphone size={16} />}
                title="広告"
                description="初期版では広告SDKを入れていません。導入する場合は、App Storeのプライバシー項目や表示位置を別Phaseで検討します。"
                badge="未導入"
              />

              <SettingRow
                icon={<CreditCard size={16} />}
                title="課金"
                description="初期版では課金はありません。将来的に深い応答やクラウド機能を有料化する場合は、App Storeのサブスク設定が必要です。"
                badge="未導入"
              />

              <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4 text-amber-800">
                <div className="mb-2 flex items-center gap-2 text-sm font-black">
                  <AlertCircle size={16} />
                  ご利用について
                </div>
                <p className="text-xs font-bold leading-relaxed">
                  このアプリは自己対話と内省を助けるためのツールです。医療・診断・治療・緊急対応を目的としたものではありません。強い苦痛や危険を感じる場合は、身近な人や専門機関へ相談してください。
                </p>
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
};
