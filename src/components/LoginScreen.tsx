import React, { useState } from 'react';
import { signIn, signUp } from '../lib/auth';
import { AlertTriangle, CheckCircle2, Loader2, LogIn, Zap } from 'lucide-react';

const FIELD =
  'w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 h-11 text-slate-100 font-bold';

export const LoginScreen: React.FC = () => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === 'signup') {
        const { needsConfirmation } = await signUp(email.trim(), password);
        setNotice(
          needsConfirmation
            ? 'تم إنشاء الحساب. افتح إيميلك وأكّد التسجيل، وبعدين سجّل دخول.'
            : 'تم إنشاء الحساب وتسجيل الدخول.',
        );
      } else {
        await signIn(email.trim(), password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تسجيل الدخول.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-4">
      <div className="w-full max-w-sm space-y-6">

        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Zap className="w-7 h-7 text-slate-950" aria-hidden="true" />
          </div>
          <div>
            <h1 className="font-extrabold text-2xl tracking-tight bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              MediaBuyer OS
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              {mode === 'signin' ? 'سجّل دخول للوصول لبياناتك' : 'أنشئ حساب جديد'}
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 text-xs shadow-2xl"
        >
          {error && (
            <div role="alert" className="flex items-start gap-2 font-bold text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-xl p-3">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          {notice && (
            <div role="status" className="flex items-start gap-2 font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{notice}</span>
            </div>
          )}

          <div>
            <label htmlFor="auth-email" className="block font-bold text-slate-300 mb-1.5">
              البريد الإلكتروني
            </label>
            <input
              id="auth-email"
              type="email"
              dir="ltr"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`${FIELD} text-left`}
            />
          </div>

          <div>
            <label htmlFor="auth-password" className="block font-bold text-slate-300 mb-1.5">
              كلمة المرور
            </label>
            <input
              id="auth-password"
              type="password"
              dir="ltr"
              required
              minLength={6}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${FIELD} text-left`}
            />
            {mode === 'signup' && (
              <span className="mt-1 block text-[11px] text-slate-400">6 أحرف على الأقل</span>
            )}
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full h-11 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-400 text-slate-950 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:cursor-wait"
          >
            {busy ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            ) : (
              <LogIn className="w-4 h-4" aria-hidden="true" />
            )}
            <span>{mode === 'signin' ? 'تسجيل الدخول' : 'إنشاء الحساب'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin');
              setError(null);
              setNotice(null);
            }}
            className="w-full text-[11px] text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer min-h-9"
          >
            {mode === 'signin' ? 'معندكش حساب؟ أنشئ واحد' : 'عندك حساب؟ سجّل دخول'}
          </button>
        </form>

        <p className="text-center text-[11px] text-slate-400 leading-relaxed">
          بياناتك محمية بسياسات Row Level Security — كل مستخدم بيشوف بيانات مؤسسته بس.
        </p>
      </div>
    </div>
  );
};
