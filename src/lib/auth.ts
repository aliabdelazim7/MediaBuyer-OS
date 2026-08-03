import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getSupabase } from './supabaseClient';
import { isSupabaseConfigured } from './config';

export interface AuthState {
  session: Session | null;
  /** True until the initial session lookup settles. */
  loading: boolean;
}

/**
 * Tracks the Supabase session.
 *
 * Authentication is not optional decoration here: every RLS policy in
 * schema.sql resolves through `auth.uid()`. Without a session the anon role
 * sees zero rows on every table — verified against the live project — so an
 * unauthenticated "live" mode would render an empty dashboard that looks
 * broken rather than logged out.
 */
export function useSession(): AuthState {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    const pending = getSupabase();
    if (!pending) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    void pending.then(async (supabase) => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      setSession(data.session);
      setLoading(false);

      // Keeps the UI in step with token refreshes, sign-out in another tab,
      // and expiry — not just the initial load.
      const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
        if (!cancelled) setSession(next);
      });
      unsubscribe = () => sub.subscription.unsubscribe();
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  return { session, loading };
}

export async function signIn(email: string, password: string): Promise<void> {
  const pending = getSupabase();
  if (!pending) throw new Error('لا يوجد اتصال بقاعدة البيانات.');
  const supabase = await pending;
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(translateAuthError(error.message));
}

export async function signUp(email: string, password: string): Promise<{ needsConfirmation: boolean }> {
  const pending = getSupabase();
  if (!pending) throw new Error('لا يوجد اتصال بقاعدة البيانات.');
  const supabase = await pending;
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw new Error(translateAuthError(error.message));
  // With email confirmation enabled Supabase returns a user but no session.
  return { needsConfirmation: !data.session };
}

export async function signOut(): Promise<void> {
  const pending = getSupabase();
  if (!pending) return;
  (await pending).auth.signOut();
}

/** Supabase returns English error strings; the UI is Arabic. */
function translateAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
  if (m.includes('email not confirmed')) return 'لازم تأكيد البريد الإلكتروني الأول — شوف رسالة التأكيد في إيميلك.';
  if (m.includes('user already registered')) return 'الحساب ده موجود بالفعل. سجّل دخول بدل ما تعمل حساب جديد.';
  if (m.includes('password should be at least')) return 'كلمة المرور قصيرة — الحد الأدنى 6 أحرف.';
  if (m.includes('rate limit') || m.includes('too many')) return 'محاولات كتير في وقت قصير. استنى شوية وحاول تاني.';
  return message;
}
