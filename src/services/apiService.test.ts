import { describe, expect, it, vi } from 'vitest';

/**
 * The store is module-level mutable state, so every test resets the module
 * registry to get a fresh copy seeded from the mock data.
 */
async function freshStore() {
  vi.resetModules();
  return (await import('./apiService')).apiService;
}

describe('apiService — collection contracts', () => {
  it('getLeads returns every lead, not just one portfolio', async () => {
    const api = await freshStore();
    const leads = await api.getLeads();
    const portfolioIds = new Set(leads.map((l) => l.portfolioId));

    // Regression: getLeads used to take a portfolioId and return a filtered
    // subset. Callers assigned that subset to global state, silently dropping
    // every other portfolio's leads until a full reload.
    expect(portfolioIds.size).toBeGreaterThan(1);
  });

  it('mutators return the full collection so state stays a complete mirror', async () => {
    const api = await freshStore();
    const before = await api.getLeads();
    const after = await api.updateLeadStatus(before[0].id, 'qualified');
    expect(after).toHaveLength(before.length);
  });
});

describe('apiService — derived metric integrity', () => {
  it('recomputes every dependent metric when counters change', async () => {
    const api = await freshStore();
    const [before] = (await api.getCampaigns()).filter((c) => c.id === 'camp-101');

    const updated = await api.applyMetricsDelta('camp-101', {
      revenue: 450,
      spend: 80,
      conversions: 2,
    });
    const after = updated.find((c) => c.id === 'camp-101')!;

    const spend = before.spend + 80;
    const revenue = before.revenue + 450;

    expect(after.revenue).toBe(revenue);
    expect(after.spend).toBe(spend);
    // Regression: the sync path used to update revenue/spend/roas but leave
    // cpa and cpl stale, so the dashboard showed a ROAS and a CPA that could
    // not both be true of the same campaign.
    expect(after.roas).toBeCloseTo(revenue / spend, 2);
    expect(after.cpa).toBeCloseTo(spend / after.conversions, 2);
    expect(after.cpl).toBeCloseTo(spend / after.leadsCount, 2);
    expect(after.netProfit).toBeCloseTo(revenue - spend - after.cogs, 2);
  });

  it('never divides by zero when a counter is empty', async () => {
    const api = await freshStore();
    // camp-104 is a Google search campaign with no video views.
    const camp = (await api.getCampaigns()).find((c) => c.id === 'camp-104')!;
    expect(camp.hookRate).toBe(0);
    expect(camp.holdRate).toBe(0);
    expect(Number.isFinite(camp.hookRate)).toBe(true);
  });
});

describe('apiService — campaign status', () => {
  it('setCampaignStatus is idempotent and does not resume a paused campaign', async () => {
    const api = await freshStore();
    await api.setCampaignStatus('camp-101', 'paused');
    const after = (await api.setCampaignStatus('camp-101', 'paused')).find(
      (c) => c.id === 'camp-101',
    )!;

    // Regression: applying a "pause this campaign" recommendation used to call
    // a toggle, which reactivated an already-paused campaign and resumed spend.
    expect(after.status).toBe('paused');
  });

  it('toggleCampaignStatus still flips state for the manual button', async () => {
    const api = await freshStore();
    const before = (await api.getCampaigns()).find((c) => c.id === 'camp-101')!;
    const after = (await api.toggleCampaignStatus('camp-101')).find((c) => c.id === 'camp-101')!;
    expect(after.status).not.toBe(before.status);
  });

  it('rejects unknown campaign ids instead of silently no-opping', async () => {
    const api = await freshStore();
    await expect(api.setCampaignStatus('camp-does-not-exist', 'paused')).rejects.toThrow();
  });
});

describe('apiService — budget validation', () => {
  it.each([0, -100, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects a daily budget of %p',
    async (budget) => {
      const api = await freshStore();
      await expect(api.updateCampaignBudget('camp-101', budget)).rejects.toThrow();
    },
  );

  it('accepts a positive budget and records the previous value in the audit log', async () => {
    const api = await freshStore();
    const before = (await api.getCampaigns()).find((c) => c.id === 'camp-101')!;
    await api.updateCampaignBudget('camp-101', 1000);

    const [latest] = await api.getAuditLogs();
    expect(latest.actionType).toBe('UPDATE_BUDGET');
    expect(latest.oldValue).toBe(`$${before.dailyBudget}/day`);
    expect(latest.newValue).toBe('$1000/day');
  });
});

describe('apiService — lead ingestion', () => {
  it('increments the campaign lead count and recomputes CPL atomically', async () => {
    const api = await freshStore();
    const before = (await api.getCampaigns()).find((c) => c.id === 'camp-101')!;

    const { campaigns } = await api.addLead({
      portfolioId: 'port-1',
      campaignId: 'camp-101',
      campaignName: before.name,
      name: 'Test Lead',
      email: 'test@example.com',
      phone: '+20 100 000 0000',
      sourcePlatform: 'meta',
      status: 'registered',
      estimatedValue: 500,
    });

    const after = campaigns.find((c) => c.id === 'camp-101')!;
    expect(after.leadsCount).toBe(before.leadsCount + 1);
    expect(after.cpl).toBeCloseTo(after.spend / after.leadsCount, 2);
  });

  it('generates unique ids for leads created in the same millisecond', async () => {
    const api = await freshStore();
    const base = {
      portfolioId: 'port-1',
      campaignId: 'camp-101',
      campaignName: 'x',
      phone: '',
      sourcePlatform: 'meta' as const,
      status: 'registered' as const,
      estimatedValue: 1,
    };

    // Regression: ids were `lead-${Date.now()}`, so two leads ingested in the
    // same tick collided and React rendered duplicate keys.
    await api.addLead({ ...base, name: 'A', email: 'a@example.com' });
    const { leads } = await api.addLead({ ...base, name: 'B', email: 'b@example.com' });

    const ids = leads.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('apiService — audit trail', () => {
  it('records an entry for every state-changing action, newest first', async () => {
    const api = await freshStore();
    const seeded = (await api.getAuditLogs()).length;

    await api.updateCampaignBudget('camp-101', 900);
    await api.setCampaignStatus('camp-102', 'paused');

    const logs = await api.getAuditLogs();
    expect(logs).toHaveLength(seeded + 2);
    expect(logs[0].actionType).toBe('SET_STATUS');
    expect(logs[1].actionType).toBe('UPDATE_BUDGET');
  });
});
