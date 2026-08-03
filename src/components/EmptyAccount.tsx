import React from 'react';
import { Loader2, PlugZap, RefreshCw, TriangleAlert } from 'lucide-react';

interface EmptyAccountProps {
  isSyncing: boolean;
  onTriggerSync: () => void;
  /** Last sync failure, if any — shown so the fix is visible, not guessed at. */
  lastError?: string | null;
}

/**
 * Shown when the user is signed in and the database genuinely holds no
 * campaigns.
 *
 * The app used to fall back to seed fixtures here, so a brand-new account
 * opened onto a full dashboard of invented campaigns and revenue. That is
 * indistinguishable from real data and is exactly the failure mode this
 * project exists to avoid.
 */
export const EmptyAccount: React.FC<EmptyAccountProps> = ({
  isSyncing,
  onTriggerSync,
  lastError,
}) => (
  <div className="max-w-xl mx-auto py-12 text-center space-y-6">
    <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center">
      <PlugZap className="w-8 h-8 text-emerald-400" aria-hidden="true" />
    </div>

    <div className="space-y-2">
      <h2 className="text-xl font-black text-slate-100">لسه مفيش بيانات</h2>
      <p className="text-sm text-slate-400 leading-relaxed">
        حسابك جاهز، بس الداتابيز فاضية. اضغط الزرار تحت عشان نسحب حملاتك من Meta — هيتعمل
        محفظة لكل حساب إعلاني عندك تلقائياً.
      </p>
    </div>

    {lastError && (
      <div
        role="alert"
        className="text-start flex items-start gap-2 text-xs font-bold text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-xl p-3"
      >
        <TriangleAlert className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
        <span>{lastError}</span>
      </div>
    )}

    <button
      onClick={onTriggerSync}
      disabled={isSyncing}
      className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-400 text-slate-950 font-bold px-5 h-11 rounded-xl shadow-lg shadow-emerald-500/20 transition-colors cursor-pointer disabled:cursor-wait"
    >
      {isSyncing ? (
        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
      ) : (
        <RefreshCw className="w-4 h-4" aria-hidden="true" />
      )}
      <span>{isSyncing ? 'جاري السحب من Meta...' : 'اسحب حملاتي من Meta'}</span>
    </button>

    <div className="text-start text-[11px] text-slate-400 bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-2">
      <p className="font-bold text-slate-300">لو ظهرلك خطأ، غالباً السبب واحد من دول:</p>
      <ul className="space-y-1.5 list-disc ps-4">
        <li>
          الـ Edge Function لسه مترفعتش —{' '}
          <code dir="ltr" className="font-mono text-slate-300">supabase functions deploy sync-meta</code>
        </li>
        <li>
          <code dir="ltr" className="font-mono text-slate-300">META_ACCESS_TOKEN</code> مش متظبط في
          Edge Function Secrets
        </li>
        <li>الـ System User مش متربط بالحسابات الإعلانية في Business Settings</li>
      </ul>
    </div>
  </div>
);
