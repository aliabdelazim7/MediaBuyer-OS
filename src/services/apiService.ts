import { getSupabase } from '../lib/supabaseClient';
import { fetchCampaigns, fetchLeads, fetchPortfolios, invokeMetaSync } from './supabaseRepo';
import type { AuditLog, Campaign, Lead, LeadStatus, Portfolio } from '../types/mediaBuyer';
import {
  INITIAL_AUDIT_LOGS,
  INITIAL_CAMPAIGNS,
  INITIAL_LEADS,
  INITIAL_PORTFOLIOS,
} from '../mock/mediaBuyerData';

export type { AuditLog };

/**
 * In-memory store.
 *
 * This is the single source of truth for the UI. Components must never keep a
 * second, independently-mutated copy of these collections — every mutator
 * below returns the FULL collection so React state stays an exact mirror of
 * the store. (Returning a filtered subset here previously caused rows from
 * other portfolios to be dropped from state.)
 */
let campaigns: Campaign[] = INITIAL_CAMPAIGNS.map((c) => ({ ...c }));
let leads: Lead[] = INITIAL_LEADS.map((l) => ({ ...l }));
let portfolios: Portfolio[] = INITIAL_PORTFOLIOS.map((p) => ({ ...p }));
let auditLogs: AuditLog[] = INITIAL_AUDIT_LOGS.map((l) => ({ ...l }));

let logSeq = 0;
const nextId = (prefix: string) => `${prefix}-${Date.now()}-${logSeq++}`;

/** `YYYY-MM-DD HH:mm` in UTC — matches the format used by the seed data. */
const timestamp = () => new Date().toISOString().replace('T', ' ').slice(0, 16);

/**
 * Recomputes every derived metric from the raw counters.
 *
 * Derived values (roas/cpa/cpl/netProfit/ctr/cpm/cpc/hookRate/holdRate) must
 * never be updated piecemeal — doing so lets them drift out of agreement with
 * each other and with the totals shown on the dashboard.
 */
function recompute(c: Campaign): Campaign {
  const div = (a: number, b: number) => (b > 0 ? a / b : 0);
  return {
    ...c,
    netProfit: c.revenue - c.spend - c.cogs,
    roas: Number(div(c.revenue, c.spend).toFixed(2)),
    cpa: Number(div(c.spend, c.conversions).toFixed(2)),
    cpl: Number(div(c.spend, c.leadsCount).toFixed(2)),
    ctr: Number((div(c.clicks, c.impressions) * 100).toFixed(2)),
    cpm: Number((div(c.spend, c.impressions) * 1000).toFixed(2)),
    cpc: Number(div(c.spend, c.clicks).toFixed(2)),
    hookRate: Number((div(c.video3sViews, c.impressions) * 100).toFixed(1)),
    holdRate: Number((div(c.video15sViews, c.video3sViews) * 100).toFixed(1)),
  };
}

function addAuditLog(
  userName: string,
  actionType: string,
  targetEntity: string,
  entityId: string,
  oldValue: string,
  newValue: string,
): void {
  auditLogs = [
    {
      id: nextId('log'),
      userName,
      actionType,
      targetEntity,
      entityId,
      oldValue,
      newValue,
      createdAt: timestamp(),
    },
    ...auditLogs,
  ];
}

export const apiService = {
  /**
   * Replaces the in-memory store with whatever the backend actually holds,
   * and reports per-collection provenance so the UI can say which numbers
   * are real. A collection that comes back empty keeps its fixtures and is
   * reported as 'degraded' rather than silently shown as live.
   */
  async hydrateFromBackend(): Promise<{
    portfolios: 'live' | 'degraded';
    campaigns: 'live' | 'degraded';
    leads: 'live' | 'degraded';
    data: { portfolios: Portfolio[]; campaigns: Campaign[]; leads: Lead[] };
  }> {
    const pending = getSupabase();
    if (!pending) {
      return {
        portfolios: 'degraded',
        campaigns: 'degraded',
        leads: 'degraded',
        data: { portfolios, campaigns, leads },
      };
    }

    const supabase = await pending;
    const [p, c, l] = await Promise.all([
      fetchPortfolios(supabase).catch(() => null),
      fetchCampaigns(supabase).catch(() => null),
      fetchLeads(supabase).catch(() => null),
    ]);

    // Signed in against a real backend: what the database holds IS the
    // truth, including when it holds nothing. Falling back to fixtures here
    // was the wrong call — it filled an empty account with invented
    // campaigns that looked entirely real, which is the one thing this app
    // must never do. An empty database now renders as empty.
    portfolios = p ?? [];
    campaigns = c ?? [];
    leads = l ?? [];
    auditLogs = [];

    return {
      portfolios: 'live',
      campaigns: 'live',
      leads: 'live',
      data: { portfolios, campaigns, leads },
    };
  },

  /**
   * Runs the server-side Meta sync, then re-reads. The Meta token lives in an
   * Edge Function secret and is never exposed to this process.
   */
  async syncFromMeta(datePreset = 'last_30d') {
    const pending = getSupabase();
    if (!pending) throw new Error('لا يوجد اتصال بقاعدة البيانات — المزامنة تحتاج Supabase.');
    const result = await invokeMetaSync(await pending, datePreset);
    const hydrated = await this.hydrateFromBackend();
    return { ...result, hydrated };
  },

  /**
   * Portfolios are the only entity currently read from Supabase. Reads are
   * best-effort: a configuration or network failure falls back to the local
   * store so the dashboard still renders, but the failure is surfaced to the
   * caller rather than swallowed.
   */
  async getPortfolios(): Promise<{ data: Portfolio[]; degraded: boolean }> {
    const pending = getSupabase();
    if (!pending) return { data: portfolios, degraded: false };
    try {
      const { data, error } = await (await pending).from('portfolios').select('*');
      if (error || !data?.length) return { data: portfolios, degraded: true };
      return { data: data as unknown as Portfolio[], degraded: false };
    } catch {
      return { data: portfolios, degraded: true };
    }
  },

  async updatePortfolioThresholds(
    portfolioId: string,
    targetRoas: number,
    targetCpa: number,
    targetCpl: number,
    targetHookRate: number,
  ): Promise<Portfolio[]> {
    const previous = portfolios.find((p) => p.id === portfolioId);
    portfolios = portfolios.map((p) =>
      p.id === portfolioId ? { ...p, targetRoas, targetCpa, targetCpl, targetHookRate } : p,
    );

    addAuditLog(
      'Ali Abdelazim',
      'UPDATE_THRESHOLDS',
      'Portfolio',
      portfolioId,
      previous ? `ROAS ${previous.targetRoas}x, CPA $${previous.targetCpa}` : 'N/A',
      `ROAS ${targetRoas}x, CPA $${targetCpa}`,
    );

    const pending = getSupabase();
    if (pending) {
      const { error } = await (await pending)
        .from('portfolios')
        .update({
          target_roas: targetRoas,
          target_cpa: targetCpa,
          target_cpl: targetCpl,
          target_hook_rate: targetHookRate,
        })
        .eq('id', portfolioId);
      // Surfaced rather than silently ignored: the local store has already
      // been updated, so the UI would otherwise show a persisted value that
      // does not exist in the database.
      if (error) throw new Error(`Failed to persist thresholds: ${error.message}`);
    }

    return portfolios;
  },

  async getCampaigns(): Promise<Campaign[]> {
    return campaigns;
  },

  async updateCampaignBudget(campaignId: string, newBudget: number): Promise<Campaign[]> {
    if (!Number.isFinite(newBudget) || newBudget <= 0) {
      throw new Error('Daily budget must be a positive number');
    }

    const campaign = campaigns.find((c) => c.id === campaignId);
    if (!campaign) throw new Error(`Unknown campaign: ${campaignId}`);

    campaigns = campaigns.map((c) => (c.id === campaignId ? { ...c, dailyBudget: newBudget } : c));

    addAuditLog(
      'Ali Abdelazim',
      'UPDATE_BUDGET',
      'Campaign',
      campaignId,
      `$${campaign.dailyBudget}/day`,
      `$${newBudget}/day`,
    );

    return campaigns;
  },

  /**
   * Cost of goods for a campaign.
   *
   * This is the one input no ad platform can supply — Meta does not know what
   * the product costs — and it is what turns reported ROAS into actual
   * profit. Entered by hand, so every change is written to the audit trail:
   * a silent typo here quietly falsifies every margin downstream.
   */
  async updateCampaignCogs(campaignId: string, cogs: number): Promise<Campaign[]> {
    if (!Number.isFinite(cogs) || cogs < 0) {
      throw new Error('تكلفة البضاعة لازم تكون رقم موجب أو صفر');
    }

    const campaign = campaigns.find((c) => c.id === campaignId);
    if (!campaign) throw new Error(`Unknown campaign: ${campaignId}`);

    campaigns = campaigns.map((c) => (c.id === campaignId ? recompute({ ...c, cogs }) : c));

    addAuditLog(
      'Ali Abdelazim',
      'UPDATE_COGS',
      'Campaign',
      campaignId,
      `$${campaign.cogs}`,
      `$${cogs}`,
    );

    return campaigns;
  },

  /**
   * Sets an explicit status. The previous implementation only toggled, which
   * meant applying a "pause this campaign" recommendation to an already-paused
   * campaign silently reactivated it and resumed spend.
   */
  async setCampaignStatus(campaignId: string, status: Campaign['status']): Promise<Campaign[]> {
    const campaign = campaigns.find((c) => c.id === campaignId);
    if (!campaign) throw new Error(`Unknown campaign: ${campaignId}`);
    if (campaign.status === status) return campaigns;

    campaigns = campaigns.map((c) => (c.id === campaignId ? { ...c, status } : c));
    addAuditLog('Ali Abdelazim', 'SET_STATUS', 'Campaign', campaignId, campaign.status, status);

    return campaigns;
  },

  async toggleCampaignStatus(campaignId: string): Promise<Campaign[]> {
    const campaign = campaigns.find((c) => c.id === campaignId);
    if (!campaign) throw new Error(`Unknown campaign: ${campaignId}`);
    return this.setCampaignStatus(campaignId, campaign.status === 'active' ? 'paused' : 'active');
  },

  /**
   * Applies a batch of raw counter deltas and recomputes derived metrics.
   * Used by the live-sync simulation so that synced numbers go through the
   * store instead of being patched directly into React state (which used to
   * be reverted by the next unrelated mutation).
   */
  async applyMetricsDelta(
    campaignId: string,
    delta: Partial<Pick<Campaign, 'spend' | 'revenue' | 'conversions' | 'impressions' | 'clicks'>>,
  ): Promise<Campaign[]> {
    campaigns = campaigns.map((c) =>
      c.id === campaignId
        ? recompute({
            ...c,
            spend: c.spend + (delta.spend ?? 0),
            revenue: c.revenue + (delta.revenue ?? 0),
            conversions: c.conversions + (delta.conversions ?? 0),
            impressions: c.impressions + (delta.impressions ?? 0),
            clicks: c.clicks + (delta.clicks ?? 0),
          })
        : c,
    );
    return campaigns;
  },

  /** Returns ALL leads. Filtering by portfolio is a view concern. */
  async getLeads(): Promise<Lead[]> {
    return leads;
  },

  async addLead(leadData: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>): Promise<{
    leads: Lead[];
    campaigns: Campaign[];
  }> {
    const now = timestamp();
    const newLead: Lead = { ...leadData, id: nextId('lead'), createdAt: now, updatedAt: now };

    leads = [newLead, ...leads];

    // Bump the campaign's lead counter and recompute CPL so the campaigns
    // table and the CRM board never disagree about how many leads exist.
    campaigns = campaigns.map((c) =>
      c.id === leadData.campaignId ? recompute({ ...c, leadsCount: c.leadsCount + 1 }) : c,
    );

    addAuditLog(
      'Meta Lead Webhook',
      'INBOUND_LEAD',
      'Lead',
      newLead.id,
      'New Lead',
      `${newLead.name} (${newLead.email})`,
    );

    return { leads, campaigns };
  },

  async updateLeadStatus(leadId: string, newStatus: LeadStatus, value?: number): Promise<Lead[]> {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) throw new Error(`Unknown lead: ${leadId}`);

    leads = leads.map((l) =>
      l.id === leadId
        ? {
            ...l,
            status: newStatus,
            closedValue: value ?? l.closedValue,
            updatedAt: timestamp(),
          }
        : l,
    );

    addAuditLog('Media Buyer', 'CRM_STAGE_CHANGE', 'Lead', leadId, lead.status, newStatus);

    return leads;
  },

  async getAuditLogs(): Promise<AuditLog[]> {
    return auditLogs;
  },
};
