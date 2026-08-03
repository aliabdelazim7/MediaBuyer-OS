export type Platform = 'meta' | 'tiktok' | 'google';

export type Currency = 'USD' | 'EGP' | 'SAR' | 'EUR';

export interface AdAccount {
  id: string;
  name: string;
  platform: Platform;
  currency: Currency;
  status: 'active' | 'paused' | 'warning';
  spendToday: number;
  revenueToday: number;
  roasToday: number;
  cpaToday: number;
}

export interface Portfolio {
  id: string;
  name: string;
  category: 'E-commerce' | 'Lead Generation' | 'SaaS Growth' | 'Real Estate';
  clientName: string;
  accounts: AdAccount[];
  targetRoas: number;
  targetCpa: number;
  targetCpl: number;
  targetHookRate: number; // percentage e.g. 25%
  /** Currency the stored amounts are denominated in (the ad account's own). */
  baseCurrency: Currency;
}

export interface Campaign {
  id: string;
  portfolioId: string;
  accountId: string;
  accountName: string;
  platform: Platform;
  name: string;
  status: 'active' | 'paused' | 'warning';
  dailyBudget: number;
  spend: number;
  revenue: number;
  cogs: number; // Cost of goods sold
  netProfit: number;
  roas: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpm: number;
  cpc: number;
  conversions: number;
  cpa: number;
  leadsCount: number;
  cpl: number;
  video3sViews: number;
  video15sViews: number;
  hookRate: number; // (3s views / impressions) * 100
  holdRate: number; // (15s views / 3s views) * 100
  fatigueScore: number; // 0 - 100
}

export interface Creative {
  id: string;
  campaignId: string;
  campaignName: string;
  title: string;
  type: 'video' | 'image' | 'carousel';
  thumbnailUrl: string;
  spend: number;
  conversions: number;
  roas: number;
  hookRate: number;
  holdRate: number;
  fatigueStatus: 'healthy' | 'warning' | 'fatigued';
  suggestion: string;
}

export type LeadStatus = 'registered' | 'qualified' | 'closed';

export interface Lead {
  id: string;
  portfolioId: string;
  campaignId: string;
  campaignName: string;
  name: string;
  email: string;
  phone: string;
  sourcePlatform: Platform;
  status: LeadStatus;
  createdAt: string;
  updatedAt: string;
  estimatedValue: number;
  closedValue?: number;
  notes?: string;
}

/**
 * What the media buyer should go and do in Ads Manager. The app never
 * performs these itself — see CAN_WRITE_TO_AD_PLATFORM in lib/config.ts.
 */
export type RecommendationAction =
  | 'wait'
  | 'pause'
  | 'reduce_budget'
  | 'review_targeting'
  | 'refresh_creative'
  | 'hold'
  | 'scale';

/** One threshold check, shown so the reasoning is auditable rather than magic. */
export interface RecommendationEvidence {
  label: string;
  /** The campaign's actual value, pre-formatted for display. */
  actual: string;
  /** What it was compared against. */
  target: string;
  ok: boolean;
}

/**
 * A recommendation COMPUTED from campaign data against the portfolio's
 * thresholds.
 *
 * The previous `AIRecommendation` was a hardcoded fixture with invented
 * impact figures ("+$850/day") and an `applied` flag whose button really did
 * mutate campaign budgets. Every field here is derived, and every rule
 * carries its evidence and its confidence so a junior can check the working
 * rather than trusting a verdict.
 */
export interface Recommendation {
  id: string;
  /** Which rule fired — makes the output auditable and testable. */
  ruleId: string;
  portfolioId: string;
  campaignId: string;
  campaignName: string;
  action: RecommendationAction;
  severity: 'high' | 'medium' | 'info';
  title: string;
  /** What was observed, with the real numbers in it. */
  whatWeSaw: string;
  /** Why it matters — the part that teaches, not just instructs. */
  whyItMatters: string;
  /** The concrete next step, performed in Ads Manager. */
  whatToDo: string;
  evidence: RecommendationEvidence[];
  /**
   * How much to trust this. Driven by spend and conversion volume — a
   * campaign with 3 conversions cannot support a scale decision no matter
   * how good its ROAS looks.
   */
  confidence: 'high' | 'medium' | 'low';
}

export interface AuditLog {
  id: string;
  userName: string;
  actionType: string;
  targetEntity: string;
  entityId: string;
  oldValue: string;
  newValue: string;
  createdAt: string;
}

export interface DailyMetrics {
  date: string;
  spend: number;
  revenue: number;
  netProfit: number;
  roas: number;
  cpa: number;
  cpl: number;
  leads: number;
}
