import React, { useState, useEffect } from 'react';
import type { Portfolio, Campaign, Creative, Lead, AIRecommendation, Currency, LeadStatus } from './types/mediaBuyer';
import { 
  INITIAL_PORTFOLIOS, 
  INITIAL_CAMPAIGNS, 
  INITIAL_CREATIVES, 
  INITIAL_LEADS, 
  INITIAL_AI_RECOMMENDATIONS 
} from './mock/mediaBuyerData';
import { Header } from './components/Header';
import { KPIDashboard } from './components/KPIDashboard';
import { AnalyticsCharts } from './components/AnalyticsCharts';
import { CampaignsTable } from './components/CampaignsTable';
import { CreativeIntelligence } from './components/CreativeIntelligence';
import { LeadPipelineKanban } from './components/LeadPipelineKanban';
import { AIRecommendations } from './components/AIRecommendations';
import { CommandPalette } from './components/CommandPalette';
import { ThresholdSettingsModal } from './components/ThresholdSettingsModal';
import { AddLeadModal } from './components/AddLeadModal';
import { AuditLogsModal } from './components/AuditLogsModal';
import { apiService, type AuditLog } from './services/apiService';
import { webhookHandler } from './services/webhookHandler';
import { Zap } from 'lucide-react';

export const App: React.FC = () => {
  // State
  const [portfolios, setPortfolios] = useState<Portfolio[]>(INITIAL_PORTFOLIOS);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string>('port-1');
  const [campaigns, setCampaigns] = useState<Campaign[]>(INITIAL_CAMPAIGNS);
  const [creatives] = useState<Creative[]>(INITIAL_CREATIVES);
  const [leads, setLeads] = useState<Lead[]>(INITIAL_LEADS);
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>(INITIAL_AI_RECOMMENDATIONS);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  
  const [currency, setCurrency] = useState<Currency>('USD');
  const [activeTab, setActiveTab] = useState<'overview' | 'campaigns' | 'creatives' | 'leads' | 'ai'>('overview');
  
  // Modals state
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isThresholdModalOpen, setIsThresholdModalOpen] = useState(false);
  const [isAddLeadModalOpen, setIsAddLeadModalOpen] = useState(false);
  const [isAuditLogsModalOpen, setIsAuditLogsModalOpen] = useState(false);
  
  // Real-time sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load audit logs on mount
  useEffect(() => {
    apiService.getAuditLogs().then(logs => setAuditLogs(logs));
  }, []);

  // Currency Exchange Rates (Base USD)
  const currencyRates: Record<Currency, number> = {
    USD: 1.0,
    EGP: 48.5,
    SAR: 3.75,
    EUR: 0.92
  };

  const currentPortfolio = portfolios.find(p => p.id === selectedPortfolioId) || portfolios[0];
  const portfolioCampaigns = campaigns.filter(c => c.portfolioId === selectedPortfolioId);
  const portfolioCreatives = creatives.filter(cr => portfolioCampaigns.some(c => c.id === cr.campaignId));
  const portfolioLeads = leads.filter(l => l.portfolioId === selectedPortfolioId);
  const portfolioRecommendations = recommendations.filter(r => r.portfolioId === selectedPortfolioId);

  // Toast notifier helper
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Real-time Data Sync Simulator & Webhook Ingestion
  const handleTriggerSync = async () => {
    setIsSyncing(true);
    triggerToast('جاري الاتصال بـ Meta Graph API و Webhooks لتحديث الأرقام اللحظية...');

    // Simulate inbound lead via Webhook Handler
    await webhookHandler.processInboundLead({
      portfolioId: selectedPortfolioId,
      campaignId: portfolioCampaigns[0]?.id || 'camp-101',
      name: 'م. يوسف النجار',
      email: 'youssef.n@enterprise.sa',
      phone: '+966 54 321 9876',
      sourcePlatform: 'meta',
      estimatedValue: 850,
      notes: 'Inbound Webhook payload verified via HMAC signature'
    });

    setTimeout(async () => {
      setIsSyncing(false);
      // Simulate live campaign metrics update
      setCampaigns(prev => prev.map(c => {
        if (c.id === 'camp-101') {
          return {
            ...c,
            revenue: c.revenue + 450,
            spend: c.spend + 80,
            conversions: c.conversions + 2,
            netProfit: (c.revenue + 450) - (c.spend + 80) - c.cogs,
            roas: Number(((c.revenue + 450) / (c.spend + 80)).toFixed(2))
          };
        }
        return c;
      }));

      // Refresh leads and audit logs
      const updatedLeads = await apiService.getLeads(selectedPortfolioId);
      setLeads(updatedLeads);
      const updatedLogs = await apiService.getAuditLogs();
      setAuditLogs(updatedLogs);

      triggerToast('✅ تم استلام 1 ليد جديد عبر Webhook وتحديث الـ ROAS والـ Net Profit بنجاح!');
    }, 2000);
  };

  // Handlers
  const handleUpdateCampaignBudget = async (campaignId: string, newBudget: number) => {
    const updated = await apiService.updateCampaignBudget(campaignId, newBudget);
    setCampaigns(updated);
    const logs = await apiService.getAuditLogs();
    setAuditLogs(logs);
    triggerToast(`تحديث الميزانية اليومية للحملة إلى $${newBudget}/يوم بنجاح!`);
  };

  const handleToggleCampaignStatus = async (campaignId: string) => {
    const updated = await apiService.toggleCampaignStatus(campaignId);
    setCampaigns(updated);
    const logs = await apiService.getAuditLogs();
    setAuditLogs(logs);
    triggerToast(`تم تحديث حالة الحملة الإعلانية بنجاح.`);
  };

  const handleUpdateLeadStatus = async (leadId: string, newStatus: LeadStatus, value?: number) => {
    const updated = await apiService.updateLeadStatus(leadId, newStatus, value);
    setLeads(updated);
    const logs = await apiService.getAuditLogs();
    setAuditLogs(logs);

    if (newStatus === 'closed') {
      triggerToast('🎉 مبروك! تم تأكيد مبيعة جديدة وتحديث أرباح الحملة في الـ Dashboard.');
    } else {
      triggerToast('تم تحديث مرحلة الليد في الـ CRM بنجاح.');
    }
  };

  const handleAddLead = async (newLeadData: {
    name: string;
    email: string;
    phone: string;
    campaignId: string;
    sourcePlatform: any;
    estimatedValue: number;
    notes: string;
  }) => {
    const selectedCamp = campaigns.find(c => c.id === newLeadData.campaignId);

    const updatedLeads = await apiService.addLead({
      portfolioId: selectedPortfolioId,
      campaignId: newLeadData.campaignId,
      campaignName: selectedCamp?.name || 'حملة عامة',
      name: newLeadData.name,
      email: newLeadData.email,
      phone: newLeadData.phone,
      sourcePlatform: newLeadData.sourcePlatform,
      status: 'registered',
      estimatedValue: newLeadData.estimatedValue,
      notes: newLeadData.notes
    });

    setLeads(updatedLeads);
    const logs = await apiService.getAuditLogs();
    setAuditLogs(logs);

    triggerToast(`تم تسجيل الليد (${newLeadData.name}) بنجاح وربطه بحملة ${selectedCamp?.name}!`);
  };

  const handleApplyRecommendation = (recId: string) => {
    const rec = recommendations.find(r => r.id === recId);
    if (!rec) return;

    setRecommendations(prev => prev.map(r => r.id === recId ? { ...r, applied: true } : r));

    if (rec.type === 'scale') {
      handleUpdateCampaignBudget(rec.campaignId, 1000);
    } else if (rec.type === 'pause') {
      handleToggleCampaignStatus(rec.campaignId);
    }

    triggerToast(`تم تنفيذ اقتراح الذكاء الاصطناعي: ${rec.title} بنجاح!`);
  };

  const handleSaveThresholds = async (targetRoas: number, targetCpa: number, targetCpl: number, targetHookRate: number) => {
    const updatedPortfolios = await apiService.updatePortfolioThresholds(selectedPortfolioId, targetRoas, targetCpa, targetCpl, targetHookRate);
    setPortfolios(updatedPortfolios);
    const logs = await apiService.getAuditLogs();
    setAuditLogs(logs);
    triggerToast('تم تحديث شروط وتقييمات الأخضر/الأحمر للمحفظة الحالية!');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500 selection:text-slate-950">
      
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-5 left-5 z-50 bg-slate-900 border border-emerald-500/50 text-emerald-300 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom duration-300">
          <Zap className="w-5 h-5 text-emerald-400 animate-bounce" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Navigation Header */}
      <Header 
        portfolios={portfolios}
        selectedPortfolioId={selectedPortfolioId}
        onSelectPortfolio={setSelectedPortfolioId}
        currency={currency}
        onChangeCurrency={setCurrency}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onOpenThresholdModal={() => setIsThresholdModalOpen(true)}
        onOpenAddLeadModal={() => setIsAddLeadModalOpen(true)}
        onOpenAuditLogsModal={() => setIsAuditLogsModalOpen(true)}
        isSyncing={isSyncing}
        onTriggerSync={handleTriggerSync}
        activeTab={activeTab}
        onChangeTab={setActiveTab}
      />

      {/* Main Workspace Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        
        {/* Tab 1: Overview & KPI Dashboard */}
        {activeTab === 'overview' && (
          <>
            <KPIDashboard 
              portfolio={currentPortfolio}
              campaigns={portfolioCampaigns}
              currency={currency}
              currencyRate={currencyRates[currency]}
            />

            <AnalyticsCharts 
              portfolio={currentPortfolio}
              campaigns={portfolioCampaigns}
              currency={currency}
              currencyRate={currencyRates[currency]}
            />

            <CampaignsTable 
              portfolio={currentPortfolio}
              campaigns={portfolioCampaigns}
              currency={currency}
              currencyRate={currencyRates[currency]}
              onUpdateCampaignBudget={handleUpdateCampaignBudget}
              onToggleCampaignStatus={handleToggleCampaignStatus}
            />
          </>
        )}

        {/* Tab 2: Campaigns Details */}
        {activeTab === 'campaigns' && (
          <CampaignsTable 
            portfolio={currentPortfolio}
            campaigns={portfolioCampaigns}
            currency={currency}
            currencyRate={currencyRates[currency]}
            onUpdateCampaignBudget={handleUpdateCampaignBudget}
            onToggleCampaignStatus={handleToggleCampaignStatus}
          />
        )}

        {/* Tab 3: Creatives & Video Analytics */}
        {activeTab === 'creatives' && (
          <CreativeIntelligence 
            creatives={portfolioCreatives}
            portfolio={currentPortfolio}
            currency={currency}
            currencyRate={currencyRates[currency]}
          />
        )}

        {/* Tab 4: Leads CRM Pipeline */}
        {activeTab === 'leads' && (
          <LeadPipelineKanban 
            leads={portfolioLeads}
            portfolio={currentPortfolio}
            currency={currency}
            currencyRate={currencyRates[currency]}
            onUpdateLeadStatus={handleUpdateLeadStatus}
            onOpenAddLeadModal={() => setIsAddLeadModalOpen(true)}
          />
        )}

        {/* Tab 5: AI Recommendations */}
        {activeTab === 'ai' && (
          <AIRecommendations 
            recommendations={portfolioRecommendations}
            currency={currency}
            currencyRate={currencyRates[currency]}
            onApplyRecommendation={handleApplyRecommendation}
          />
        )}

      </main>

      {/* Modals */}
      <CommandPalette 
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        portfolios={portfolios}
        campaigns={campaigns}
        onSelectPortfolio={setSelectedPortfolioId}
      />

      <ThresholdSettingsModal 
        isOpen={isThresholdModalOpen}
        onClose={() => setIsThresholdModalOpen(false)}
        portfolio={currentPortfolio}
        onSaveThresholds={handleSaveThresholds}
        currency={currency}
        currencyRate={currencyRates[currency]}
      />

      <AddLeadModal 
        isOpen={isAddLeadModalOpen}
        onClose={() => setIsAddLeadModalOpen(false)}
        portfolio={currentPortfolio}
        campaigns={portfolioCampaigns}
        onAddLead={handleAddLead}
      />

      <AuditLogsModal 
        isOpen={isAuditLogsModalOpen}
        onClose={() => setIsAuditLogsModalOpen(false)}
        logs={auditLogs}
      />

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-900 py-4 text-center text-xs text-slate-500">
        <p>MediaBuyer OS © 2026 | Enterprise Growth Engine for Media Buyers & Agencies</p>
      </footer>

    </div>
  );
};

export default App;
