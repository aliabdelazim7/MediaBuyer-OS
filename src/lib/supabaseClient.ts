import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseConfig } from './config';

let clientPromise: Promise<SupabaseClient> | null = null;

/**
 * Resolves the Supabase client, or `null` when no credentials are configured
 * (demo mode).
 *
 * The SDK is imported dynamically so its ~200 kB never enters the initial
 * bundle for the demo/unconfigured path, and is fetched at most once.
 *
 * Note: the anon key is public by design. It is only safe because Row Level
 * Security is enforced on every table — see `src/lib/schema.sql`.
 */
export function getSupabase(): Promise<SupabaseClient> | null {
  const config = supabaseConfig;
  if (!config) return null;

  clientPromise ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    }),
  );

  return clientPromise;
}
