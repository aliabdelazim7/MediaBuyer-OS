import { supabase } from '../lib/supabaseClient';
import type { Portfolio, Campaign, Lead, LeadStatus } from '../types/mediaBuyer';
import { 
  INITIAL_PORTFOLIOS, 
  INITIAL_CAMPAIGNS, 
  INITIAL_LEADS, 
} from '../mock/mediaBuyerData';

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

// In-memory store for instant reactive reactivity (fallback & real-time sync)
let localPortfolios = [...INITIAL_PORTFOLIOS];
let localCampaigns = [...INITIAL_CAMPAIGNS];
let localLeads = [...INITIAL_LEADS];
let localAuditLogs: AuditLog[] = [
  {
    id: 'log-1',
    userName: 'Ali Abdelazim (Media Buyer)',
    actionType: 'UPDATE_BUDGET',
    targetEntity: 'Campaign',
    entityId: 'camp-101',
    oldValue: '$600/day',
    newValue: '$800/day',
    createdAt: '2026-08-02 08:30'
  },
  {
    id: 'log-2',
    userName: 'AI Copilot Engine',
    actionType: 'FATIGUE_ALERT',
    targetEntity: 'Creative',
    entityId: 'cr-3',
    oldValue: 'Healthy',
    newValue: 'Fatigued (Hook Rate 18%)',
    createdAt: '2026-08-02 09:15'
  }
];

export const apiService = {
  // Fetch All Portfolios
  async getPortfolios(): Promise<Portfolio[]> {
    try {
      const { data, error } = await supabase.from('portfolios').select('*');
      if (error || !data || data.length === 0) {
        return localPortfolios;
      }
      return data as any;
    } catch {
      return localPortfolios;
    }
  },

  // Update Portfolio Target Thresholds
  async updatePortfolioThresholds(
    portfolioId: string, 
    targetRoas: number, 
    targetCpa: number, 
    targetCpl: number, 
    targetHookRate: number
  ): Promise<Portfolio[]> {
    localPortfolios = localPortfolios.map(p => {
      if (p.id === portfolioId) {
        return { ...p, targetRoas, targetCpa, targetCpl, targetHookRate };
      }
      return p;
    });

    this.addAuditLog('Ali Abdelazim', 'UPDATE_THRESHOLDS', 'Portfolio', portfolioId, 'Old Targets', `ROAS ${targetRoas}x, CPA $${targetCpa}`);

    try {
      await supabase.from('portfolios').update({
        target_roas: targetRoas,
        target_cpa: targetCpa,
        target_cpl: targetCpl,
        target_hook_rate: targetHookRate
      }).eq('id', portfolioId);
    } catch {
      // Ignored in offline fallback mode
    }

    return localPortfolios;
  },

  // Fetch Campaigns
  async getCampaigns(portfolioId: string): Promise<Campaign[]> {
    return localCampaigns.filter(c => c.portfolioId === portfolioId);
  },

  // Update Campaign Budget with Audit Trail
  async updateCampaignBudget(campaignId: string, newBudget: number): Promise<Campaign[]> {
    const campaign = localCampaigns.find(c => c.id === campaignId);
    const oldBudget = campaign ? `$${campaign.dailyBudget}/day` : 'N/A';

    localCampaigns = localCampaigns.map(c => c.id === campaignId ? { ...c, dailyBudget: newBudget } : c);

    this.addAuditLog('Ali Abdelazim', 'UPDATE_BUDGET', 'Campaign', campaignId, oldBudget, `$${newBudget}/day`);

    return localCampaigns;
  },

  // Toggle Campaign Status
  async toggleCampaignStatus(campaignId: string): Promise<Campaign[]> {
    let nextStatus: 'active' | 'paused' = 'active';

    localCampaigns = localCampaigns.map(c => {
      if (c.id === campaignId) {
        nextStatus = c.status === 'active' ? 'paused' : 'active';
        return { ...c, status: nextStatus };
      }
      return c;
    });

    this.addAuditLog('Ali Abdelazim', 'TOGGLE_STATUS', 'Campaign', campaignId, 'Status', nextStatus);

    return localCampaigns;
  },

  // Fetch Leads
  async getLeads(portfolioId: string): Promise<Lead[]> {
    return localLeads.filter(l => l.portfolioId === portfolioId);
  },

  // Add New Lead (Webhook / Manual)
  async addLead(leadData: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>): Promise<Lead[]> {
    const newLead: Lead = {
      ...leadData,
      id: `lead-${Date.now()}`,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };

    localLeads = [newLead, ...localLeads];

    // Increment campaign leads count
    localCampaigns = localCampaigns.map(c => c.id === leadData.campaignId ? { ...c, leadsCount: c.leadsCount + 1 } : c);

    this.addAuditLog('Meta Lead Webhook', 'INBOUND_LEAD', 'Lead', newLead.id, 'New Lead', `${newLead.name} (${newLead.email})`);

    return localLeads;
  },

  // Update Lead Status in CRM Kanban
  async updateLeadStatus(leadId: string, newStatus: LeadStatus, value?: number): Promise<Lead[]> {
    localLeads = localLeads.map(l => {
      if (l.id === leadId) {
        return {
          ...l,
          status: newStatus,
          closedValue: value !== undefined ? value : l.closedValue,
          updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
        };
      }
      return l;
    });

    this.addAuditLog('Media Buyer', 'CRM_STAGE_CHANGE', 'Lead', leadId, 'Status', newStatus);

    return localLeads;
  },

  // Fetch Audit Logs
  async getAuditLogs(): Promise<AuditLog[]> {
    return localAuditLogs;
  },

  // Internal Audit Logger
  addAuditLog(userName: string, actionType: string, targetEntity: string, entityId: string, oldValue: string, newValue: string) {
    const log: AuditLog = {
      id: `log-${Date.now()}`,
      userName,
      actionType,
      targetEntity,
      entityId,
      oldValue,
      newValue,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };
    localAuditLogs = [log, ...localAuditLogs];
  }
};
