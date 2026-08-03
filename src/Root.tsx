import React from 'react';
import App from './App';
import { LoginScreen } from './components/LoginScreen';
import { useSession } from './lib/auth';
import { isSupabaseConfigured } from './lib/config';
import { Loader2 } from 'lucide-react';

/**
 * Decides between the demo dashboard, the login screen and the real app.
 *
 *  - No backend configured  -> render the dashboard on fixtures. The demo
 *    banner already says the numbers are not real, and gating a
 *    fixtures-only build behind a login nobody can pass would be absurd.
 *  - Backend configured, no session -> login. Not cosmetic: RLS resolves
 *    through auth.uid(), so an unauthenticated session reads zero rows from
 *    every table and the dashboard would look broken rather than logged out.
 *  - Backend configured, session present -> the app.
 */
export const Root: React.FC = () => {
  const { session, loading } = useSession();

  if (!isSupabaseConfigured) return <App />;

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400"
        role="status"
        aria-label="جاري التحميل"
      >
        <Loader2 className="w-6 h-6 animate-spin text-emerald-400" aria-hidden="true" />
      </div>
    );
  }

  return session ? <App session={session} /> : <LoginScreen />;
};
