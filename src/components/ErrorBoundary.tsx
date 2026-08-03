import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Catches render-time exceptions so a single bad component cannot blank the
 * whole dashboard. Without this, any thrown error unmounts the entire React
 * tree and leaves the user staring at an empty page with no explanation.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Replace with a real reporter (Sentry/OTel) once one is wired up.
    console.error('[MediaBuyer OS] Unhandled render error', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-6">
        <div className="max-w-md w-full bg-slate-900 border border-rose-500/40 rounded-2xl p-6 space-y-4 text-center">
          <h1 className="text-lg font-black text-rose-400">حدث خطأ غير متوقع</h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            تعذر عرض لوحة التحكم. تم تسجيل تفاصيل الخطأ في الـ console.
          </p>
          {/* Error messages are English/LTR; forcing them into the page's RTL
              flow mangles punctuation and bracket order. */}
          <pre dir="ltr" className="text-[11px] text-left text-rose-300 bg-slate-950 border border-slate-800 rounded-xl p-3 overflow-x-auto">
            {this.state.error.message}
          </pre>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs"
          >
            إعادة تحميل الصفحة
          </button>
        </div>
      </div>
    );
  }
}
