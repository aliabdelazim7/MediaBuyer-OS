/**
 * Runtime configuration.
 *
 * The app runs in one of two modes:
 *  - 'demo'  : no backend configured; all data comes from the in-memory store
 *              seeded with `src/mock/mediaBuyerData.ts`. Nothing is persisted.
 *  - 'live'  : Supabase credentials are present and reads are attempted
 *              against the database.
 *
 * Credentials are NEVER hardcoded. A missing/blank env var means demo mode,
 * which is explicit and visible in the UI rather than silently pointing at
 * somebody else's project.
 */
const url = import.meta.env.VITE_SUPABASE_URL?.trim() ?? '';
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? '';

export const supabaseConfig = url && anonKey ? { url, anonKey } : null;

export const isSupabaseConfigured = supabaseConfig !== null;

export const appMode: 'demo' | 'live' = isSupabaseConfigured ? 'live' : 'demo';
