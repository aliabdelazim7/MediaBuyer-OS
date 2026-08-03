import { describe, expect, it } from 'vitest';
import {
  RULE_IDS,
  breakEvenRoas,
  confidenceOf,
  evaluateCampaign,
  evaluatePortfolio,
} from './recommendationEngine';
import type { Campaign, Portfolio } from '../types/mediaBuyer';
import { INITIAL_CAMPAIGNS, INITIAL_PORTFOLIOS } from '../mock/mediaBuyerData';

/** Identity formatter keeps assertions readable and locale-independent. */
const money = (n: number) => `$${Math.round(n)}`;

const portfolio: Portfolio = {
  id: 'p1',
  name: 'Test',
  category: 'E-commerce',
  clientName: 'Client',
  accounts: [],
  targetRoas: 3,
  targetCpa: 20,
  targetCpl: 10,
  targetHookRate: 30,
};

/** A neutral campaign that fires no rule; each test perturbs one dimension. */
function campaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: 'c1',
    portfolioId: 'p1',
    accountId: 'a1',
    accountName: 'Acc',
    platform: 'meta',
    name: 'Test Campaign',
    status: 'active',
    dailyBudget: 100,
    spend: 1000,
    revenue: 4000,
    cogs: 1000,
    netProfit: 2000,
    roas: 4,
    impressions: 10000,
    clicks: 300,
    ctr: 3,
    cpm: 100,
    cpc: 3.33,
    conversions: 50,
    cpa: 20,
    leadsCount: 100,
    cpl: 10,
    video3sViews: 0,
    video15sViews: 0,
    hookRate: 0,
    holdRate: 0,
    fatigueScore: 10,
    ...overrides,
  };
}

const ruleFor = (c: Partial<Campaign>) => evaluateCampaign(campaign(c), portfolio, money)?.ruleId;

describe('breakEvenRoas', () => {
  it('is 1.0 when there is no cost of goods', () => {
    expect(breakEvenRoas(campaign({ revenue: 1000, cogs: 0 }))).toBe(1);
  });

  it('follows 1/(1-margin): 40% COGS means break-even is 1.67x', () => {
    // revenue 1000, cogs 400 -> ratio 0.4 -> 1/0.6 = 1.666...
    expect(breakEvenRoas(campaign({ revenue: 1000, cogs: 400 }))).toBeCloseTo(1.667, 2);
  });

  it('rises steeply as margin thins — 75% COGS needs 4x just to break even', () => {
    expect(breakEvenRoas(campaign({ revenue: 1000, cogs: 750 }))).toBeCloseTo(4, 2);
  });

  it('is unreachable when COGS meets or exceeds revenue', () => {
    expect(breakEvenRoas(campaign({ revenue: 1000, cogs: 1000 }))).toBe(Infinity);
  });

  it('does not divide by zero on a campaign with no revenue', () => {
    expect(Number.isFinite(breakEvenRoas(campaign({ revenue: 0, cogs: 0 })))).toBe(true);
  });
});

describe('confidenceOf', () => {
  it('is low until the campaign has spent one target CPA', () => {
    expect(confidenceOf(campaign({ spend: 15, conversions: 0 }), portfolio)).toBe('low');
  });

  it('is medium under ten conversions — one sale still swings the numbers', () => {
    expect(confidenceOf(campaign({ spend: 500, conversions: 9 }), portfolio)).toBe('medium');
  });

  it('is high at ten or more conversions', () => {
    expect(confidenceOf(campaign({ spend: 500, conversions: 10 }), portfolio)).toBe('high');
  });
});

describe('rule: guards fire before any verdict', () => {
  it('says wait when spend is below the kill threshold and there are no sales', () => {
    expect(ruleFor({ spend: 10, conversions: 0, leadsCount: 0 })).toBe('insufficient-data');
  });

  it('still says wait between 1x and 2x target CPA — no dead zone', () => {
    // Regression: this range previously matched no rule at all, so a campaign
    // burning money with no sales was given no guidance whatsoever.
    expect(ruleFor({ spend: 30, conversions: 0, leadsCount: 0 })).toBe('insufficient-data');
  });

  it('never recommends scaling on low-confidence data', () => {
    const rec = evaluateCampaign(
      campaign({ spend: 10, conversions: 1, revenue: 100, cogs: 0, roas: 10, cpa: 10 }),
      portfolio,
      money,
    );
    expect(rec?.action).not.toBe('scale');
  });
});

describe('rule: money-losing states', () => {
  it('recommends pausing after 2x target CPA with zero conversions', () => {
    expect(ruleFor({ spend: 41, conversions: 0, leadsCount: 0 })).toBe('zero-conversion-bleed');
  });

  it('recommends pausing when ROAS sits below break-even', () => {
    // 60% COGS -> break-even 2.5x. A 2.0x ROAS looks acceptable next to a
    // 3.0x target but is actually loss-making.
    const id = ruleFor({ spend: 1000, revenue: 2000, cogs: 1200, roas: 2, conversions: 50, cpa: 20 });
    expect(id).toBe('below-breakeven');
  });

  it('treats a sub-target but above-break-even ROAS as a tuning issue, not a kill', () => {
    // 25% COGS -> break-even 1.33x. ROAS 2.0 is under the 3.0 target but
    // still profitable, so it must not be told to pause.
    const rec = evaluateCampaign(
      campaign({ spend: 1000, revenue: 2000, cogs: 500, roas: 2, conversions: 40, cpa: 25 }),
      portfolio,
      money,
    );
    expect(rec?.action).not.toBe('pause');
  });
});

describe('rule: cost problems', () => {
  it('flags a CPA more than 50% over target as a budget cut', () => {
    expect(ruleFor({ cpa: 31, conversions: 50 })).toBe('cpa-far-over');
  });

  it('treats a mild CPA overshoot as a watch item, not a cut', () => {
    expect(ruleFor({ cpa: 22, conversions: 50 })).toBe('cpa-drifting');
  });

  it('flags cost per lead over target', () => {
    expect(ruleFor({ cpa: 20, cpl: 14, leadsCount: 50 })).toBe('cpl-over-target');
  });
});

describe('rule: creative problems', () => {
  it('flags a burnt creative on a video campaign', () => {
    expect(ruleFor({ fatigueScore: 75, video3sViews: 4000, hookRate: 20 })).toBe('creative-fatigue');
  });

  it('does not give video advice to a Search campaign, whatever its fatigue score', () => {
    // A fatigue score on a non-video campaign means something different, and
    // "rewrite the first 3 seconds" would be nonsense advice there.
    expect(ruleFor({ fatigueScore: 95, video3sViews: 0 })).not.toBe('creative-fatigue');
  });

  it('leads with the burnt creative rather than the CPA it caused', () => {
    // Rising CPA is usually the symptom; the fatigued creative is the cause.
    // Recommending a budget cut first would hide the actual fix.
    const id = ruleFor({
      fatigueScore: 78,
      video3sViews: 5000,
      hookRate: 18,
      cpa: 32,
      conversions: 21,
    });
    expect(id).toBe('creative-fatigue');
  });

  it('flags a weak hook when 3s view rate is under target', () => {
    expect(ruleFor({ video3sViews: 1000, hookRate: 12, holdRate: 40 })).toBe('weak-hook');
  });

  it('distinguishes a good hook with a weak body from a weak hook', () => {
    const id = ruleFor({ video3sViews: 5000, hookRate: 45, holdRate: 15 });
    expect(id).toBe('weak-hold');
  });

  it('does not raise video advice for a campaign with no video', () => {
    const rec = evaluateCampaign(campaign({ video3sViews: 0, hookRate: 0 }), portfolio, money);
    expect(rec?.ruleId).not.toBe('weak-hook');
  });
});

describe('rule: scaling', () => {
  it('recommends scaling a proven winner', () => {
    expect(ruleFor({ roas: 4, cpa: 15, conversions: 40 })).toBe('scale-winner');
  });

  it('holds a winner that has not yet reached ten conversions', () => {
    expect(ruleFor({ roas: 4, cpa: 15, conversions: 5, spend: 500 })).toBe('healthy-hold');
  });

  it('suggests a 20-25% step, not a doubling', () => {
    const rec = evaluateCampaign(
      campaign({ roas: 4, cpa: 15, conversions: 40, dailyBudget: 100 }),
      portfolio,
      money,
    );
    // 100 * 1.22 = 122 — deliberately modest to avoid resetting the
    // learning phase.
    expect(rec?.whatToDo).toContain('$122');
  });

  it('never scales a campaign that is below break-even, however high its ROAS target looks', () => {
    const rec = evaluateCampaign(
      campaign({ roas: 3.2, cpa: 15, conversions: 40, revenue: 3200, cogs: 2400, spend: 1000 }),
      portfolio,
      money,
    );
    expect(rec?.action).not.toBe('scale');
  });
});

describe('output contract', () => {
  it('every recommendation carries evidence and an action', () => {
    for (const c of INITIAL_CAMPAIGNS) {
      const p = INITIAL_PORTFOLIOS.find((x) => x.id === c.portfolioId)!;
      const rec = evaluateCampaign(c, p, money);
      if (!rec) continue;
      expect(rec.evidence.length).toBeGreaterThan(0);
      expect(rec.whatWeSaw.length).toBeGreaterThan(0);
      expect(rec.whyItMatters.length).toBeGreaterThan(0);
      expect(rec.whatToDo.length).toBeGreaterThan(0);
      expect(RULE_IDS).toContain(rec.ruleId);
    }
  });

  it('quotes no number that is not derivable from the campaign', () => {
    // The old fixture promised "+$850/day extra net profit" with nothing
    // behind it. Projections are gone; text may only cite observed figures.
    for (const c of INITIAL_CAMPAIGNS) {
      const p = INITIAL_PORTFOLIOS.find((x) => x.id === c.portfolioId)!;
      const rec = evaluateCampaign(c, p, money);
      expect(rec?.whatWeSaw ?? '').not.toMatch(/متوقع|projected/i);
    }
  });

  it('orders a portfolio most-urgent-first', () => {
    const recs = evaluatePortfolio(
      [
        campaign({ id: 'ok', roas: 4, cpa: 15, conversions: 40 }),
        campaign({ id: 'bleeding', spend: 500, conversions: 0, leadsCount: 0 }),
      ],
      portfolio,
      money,
    );
    expect(recs[0].severity).toBe('high');
    expect(recs[0].campaignId).toBe('bleeding');
  });

  it('gives at most one recommendation per campaign', () => {
    const recs = evaluatePortfolio(INITIAL_CAMPAIGNS, INITIAL_PORTFOLIOS[0], money);
    expect(new Set(recs.map((r) => r.campaignId)).size).toBe(recs.length);
  });
});

describe('against the seeded portfolios', () => {
  it('tells the losing Google campaign to stop rather than to scale', () => {
    // camp-202: spend 1200, revenue 2100, 18 conversions -> CPA $66.66 against
    // a $45 target.
    const p2 = INITIAL_PORTFOLIOS.find((p) => p.id === 'port-2')!;
    const losing = INITIAL_CAMPAIGNS.find((c) => c.id === 'camp-202')!;
    const rec = evaluateCampaign(losing, p2, money)!;
    expect(['pause', 'reduce_budget']).toContain(rec.action);
    expect(rec.severity).toBe('high');
  });

  it('flags the fatigued retargeting creative', () => {
    // camp-102 carries a fatigue score of 78.
    const p1 = INITIAL_PORTFOLIOS[0];
    const fatigued = INITIAL_CAMPAIGNS.find((c) => c.id === 'camp-102')!;
    expect(evaluateCampaign(fatigued, p1, money)?.action).toBe('refresh_creative');
  });
});
