/**
 * Runtime configuration and data-provenance signalling.
 *
 * Credentials are NEVER hardcoded, and only VITE_-prefixed variables reach the
 * browser — which is exactly why no ad-platform token may ever be placed in
 * one. A Meta System User token belongs in a Supabase Edge Function secret,
 * never in this file's reach.
 */
const url = import.meta.env.VITE_SUPABASE_URL?.trim() ?? '';
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? '';

export const supabaseConfig = url && anonKey ? { url, anonKey } : null;

/** Credentials are present. Says nothing about whether data actually arrived. */
export const isSupabaseConfigured = supabaseConfig !== null;

/**
 * Where the numbers currently on screen actually came from.
 *
 *   'demo'      — seeded fixtures. Nothing shown is real.
 *   'degraded'  — a backend is configured but the last fetch failed or was
 *                 empty, so fixtures are being displayed instead.
 *   'live'      — the data on screen was returned by the backend.
 *
 * This used to be derived from `isSupabaseConfigured` alone, which meant
 * setting two environment variables hid the demo banner and made the audit
 * log claim "protected by Supabase RLS" while every campaign, lead and audit
 * row on screen was still a hardcoded fixture. Provenance is now reported by
 * the data layer after a fetch, never inferred from configuration.
 */
export type DataMode = 'demo' | 'degraded' | 'live';

/**
 * Per-collection provenance. A collection only reads 'live' once a real
 * backend response has populated it.
 */
export interface DataProvenance {
  portfolios: DataMode;
  campaigns: DataMode;
  leads: DataMode;
  auditLogs: DataMode;
}

export const initialProvenance: DataProvenance = {
  portfolios: 'demo',
  campaigns: 'demo',
  leads: 'demo',
  auditLogs: 'demo',
};

/** True when ANY collection on screen is still fixture data. */
export const hasFixtureData = (p: DataProvenance): boolean =>
  Object.values(p).some((m) => m !== 'live');

/** Collections still showing fixtures, for the banner copy. */
export const fixtureCollections = (p: DataProvenance): string[] => {
  const label: Record<keyof DataProvenance, string> = {
    portfolios: 'المحافظ',
    campaigns: 'الحملات',
    leads: 'الليدز',
    auditLogs: 'سجل التغييرات',
  };
  return (Object.keys(p) as (keyof DataProvenance)[])
    .filter((k) => p[k] !== 'live')
    .map((k) => label[k]);
};

/**
 * The app never writes to an ad platform. Budget and status changes are
 * recorded locally for planning; the campaign itself must be edited in Meta
 * Ads Manager.
 *
 * This is deliberate, not a gap. A local "apply" that Meta never receives
 * would show a budget change that silently reverts on the next sync — the
 * dashboard would report a scale-up that never happened.
 */
export const CAN_WRITE_TO_AD_PLATFORM = false;
