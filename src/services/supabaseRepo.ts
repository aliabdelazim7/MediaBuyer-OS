import type { SupabaseClient } from '@supabase/supabase-js';
import type { Campaign, Lead, Portfolio } from '../types/mediaBuyer';

/**
 * Maps database rows onto the app's domain types.
 *
 * The database stores raw counters and computes every ratio as a GENERATED
 * column (see schema.sql), so nothing is recalculated here — doing so would
 * reintroduce the drift between ROAS, CPA and CPL that the generated columns
 * exist to prevent. This layer only renames and defaults.
 */

/** Postgres NUMERIC arrives as a string over PostgREST when precision matters. */
const n = (v: unknown): number => {
  const parsed = typeof v === 'string' ? Number(v) : (v as number);
  return Number.isFinite(parsed) ? parsed : 0;
};

interface CampaignRow {
  id: string;
  portfolio_id: string;
  ad_account_id: string;
  name: string;
  platform: string;
  status: string;
  daily_budget: unknown;
  spend: unknown;
  revenue: unknown;
  cogs: unknown;
  net_profit: unknown;
  roas: unknown;
  impressions: unknown;
  clicks: unknown;
  ctr: unknown;
  cpm: unknown;
  cpc: unknown;
  conversions: unknown;
  cpa: unknown;
  leads_count: unknown;
  cpl: unknown;
  video_3s_views: unknown;
  video_15s_views: unknown;
  hook_rate: unknown;
  hold_rate: unknown;
  fatigue_score: unknown;
  ad_accounts?: { name: string } | { name: string }[] | null;
}

const accountName = (row: CampaignRow): string => {
  const a = row.ad_accounts;
  if (!a) return '';
  return Array.isArray(a) ? (a[0]?.name ?? '') : a.name;
};

export function toCampaign(row: CampaignRow): Campaign {
  return {
    id: row.id,
    portfolioId: row.portfolio_id,
    accountId: row.ad_account_id,
    accountName: accountName(row),
    platform: (row.platform as Campaign['platform']) ?? 'meta',
    name: row.name,
    status: (row.status as Campaign['status']) ?? 'active',
    dailyBudget: n(row.daily_budget),
    spend: n(row.spend),
    revenue: n(row.revenue),
    cogs: n(row.cogs),
    netProfit: n(row.net_profit),
    roas: n(row.roas),
    impressions: n(row.impressions),
    clicks: n(row.clicks),
    ctr: n(row.ctr),
    cpm: n(row.cpm),
    cpc: n(row.cpc),
    conversions: n(row.conversions),
    cpa: n(row.cpa),
    leadsCount: n(row.leads_count),
    cpl: n(row.cpl),
    video3sViews: n(row.video_3s_views),
    video15sViews: n(row.video_15s_views),
    hookRate: n(row.hook_rate),
    holdRate: n(row.hold_rate),
    fatigueScore: n(row.fatigue_score),
  };
}

interface PortfolioRow {
  id: string;
  name: string;
  category: string;
  client_name: string;
  target_roas: unknown;
  target_cpa: unknown;
  target_cpl: unknown;
  target_hook_rate: unknown;
  base_currency?: string;
  ad_accounts?: { id: string; name: string; platform: string; currency: string; status: string }[];
}

export function toPortfolio(row: PortfolioRow): Portfolio {
  return {
    id: row.id,
    name: row.name,
    category: (row.category as Portfolio['category']) ?? 'E-commerce',
    clientName: row.client_name,
    targetRoas: n(row.target_roas),
    targetCpa: n(row.target_cpa),
    targetCpl: n(row.target_cpl),
    targetHookRate: n(row.target_hook_rate),
    baseCurrency: (row.base_currency as Portfolio['baseCurrency']) ?? 'USD',
    accounts: (row.ad_accounts ?? []).map((a) => ({
      id: a.id,
      name: a.name,
      platform: (a.platform as Portfolio['accounts'][number]['platform']) ?? 'meta',
      currency: (a.currency as Portfolio['accounts'][number]['currency']) ?? 'USD',
      status: (a.status as Portfolio['accounts'][number]['status']) ?? 'active',
      // Per-account daily figures are not synced yet; the dashboard reads
      // campaign-level data. Zeroes here are honest placeholders, not a
      // fabricated summary.
      spendToday: 0,
      revenueToday: 0,
      roasToday: 0,
      cpaToday: 0,
    })),
  };
}

interface LeadRow {
  id: string;
  portfolio_id: string;
  campaign_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  source_platform: string;
  status: string;
  estimated_value: unknown;
  closed_value: unknown;
  notes: string | null;
  created_at: string;
  updated_at: string;
  campaigns?: { name: string } | { name: string }[] | null;
}

export function toLead(row: LeadRow): Lead {
  const c = row.campaigns;
  const campaignName = !c ? '' : Array.isArray(c) ? (c[0]?.name ?? '') : c.name;
  return {
    id: row.id,
    portfolioId: row.portfolio_id,
    campaignId: row.campaign_id ?? '',
    campaignName,
    name: row.name,
    email: row.email,
    phone: row.phone ?? '',
    sourcePlatform: (row.source_platform as Lead['sourcePlatform']) ?? 'meta',
    status: (row.status as Lead['status']) ?? 'registered',
    createdAt: row.created_at?.replace('T', ' ').slice(0, 16) ?? '',
    updatedAt: row.updated_at?.replace('T', ' ').slice(0, 16) ?? '',
    estimatedValue: n(row.estimated_value),
    closedValue: row.closed_value == null ? undefined : n(row.closed_value),
    notes: row.notes ?? undefined,
  };
}

// ---------------------------------------------------------------------
// Reads. Each returns null when the table is empty so the caller can tell
// "no backend data" apart from "backend returned an empty set" and report
// provenance honestly.
// ---------------------------------------------------------------------

export async function fetchPortfolios(supabase: SupabaseClient): Promise<Portfolio[] | null> {
  const { data, error } = await supabase
    .from('portfolios')
    .select('*, ad_accounts(id, name, platform, currency, status)')
    .order('name');
  if (error || !data?.length) return null;
  return (data as PortfolioRow[]).map(toPortfolio);
}

export async function fetchCampaigns(supabase: SupabaseClient): Promise<Campaign[] | null> {
  const { data, error } = await supabase
    .from('campaigns')
    .select('*, ad_accounts(name)')
    .order('spend', { ascending: false });
  if (error || !data?.length) return null;
  return (data as CampaignRow[]).map(toCampaign);
}

export async function fetchLeads(supabase: SupabaseClient): Promise<Lead[] | null> {
  const { data, error } = await supabase
    .from('leads')
    .select('*, campaigns(name)')
    .order('created_at', { ascending: false });
  if (error || !data?.length) return null;
  return (data as LeadRow[]).map(toLead);
}

/** Invokes the server-side Meta sync. The token never reaches the browser. */
export async function invokeMetaSync(
  supabase: SupabaseClient,
  datePreset = 'last_30d',
): Promise<{ campaignsSynced: number; accounts: { account: string; campaigns: number }[]; warnings: string[] }> {
  const { data, error } = await supabase.functions.invoke('sync-meta', {
    body: { datePreset },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.hint ? `${data.error} — ${data.hint}` : data.error);
  return {
    campaignsSynced: data?.campaignsSynced ?? 0,
    accounts: data?.accounts ?? [],
    warnings: data?.warnings ?? [],
  };
}
