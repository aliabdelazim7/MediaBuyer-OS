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

export interface AIRecommendation {
  id: string;
  portfolioId: string;
  campaignId: string;
  campaignName: string;
  type: 'scale' | 'pause' | 'refresh_creative' | 'bid_adjust';
  severity: 'high' | 'medium' | 'info';
  title: string;
  description: string;
  projectedImpact: string;
  applied: boolean;
  actionText: string;
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
