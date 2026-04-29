import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { clearLocalState } from '../services/storage';

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Application crashed:', error, info);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetLocalData = () => {
    void clearLocalState().finally(() => {
      window.location.reload();
    });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="lake-bg flex min-h-[100dvh] items-center justify-center p-6 text-slate-700">
        <section className="glass-card w-full max-w-md rounded-[2rem] p-8 text-center shadow-2xl">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
            <AlertCircle size={26} />
          </div>
          <h1 className="mb-3 text-xl font-black text-slate-800">一時的に読み込みに失敗しました</h1>
          <p className="mb-6 text-sm font-bold leading-relaxed text-slate-500">
            アプリの表示中に問題が起きました。まずは再読み込みをお試しください。直らない場合は、端末内の保存データ（会話・設定）をリセットして開き直せます。
          </p>
          <div className="grid gap-3">
            <button onClick={this.handleReload} className="rounded-2xl bg-slate-900 py-4 text-xs font-black text-white shadow-lg active:scale-[0.98]">
              再読み込みする
            </button>
            <button onClick={this.handleResetLocalData} className="rounded-2xl py-4 text-xs font-black text-rose-500 transition hover:bg-white/50 active:scale-[0.98]">
              端末内の保存データをリセットして開く
            </button>
          </div>
        </section>
      </main>
    );
  }
}
