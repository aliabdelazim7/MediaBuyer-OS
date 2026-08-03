import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  AuditLog,
  Campaign,
  Creative,
  Currency,
  Lead,
  LeadStatus,
  Platform,
  Portfolio,
} from './types/mediaBuyer';
import {
  INITIAL_CAMPAIGNS,
  INITIAL_CREATIVES,
  INITIAL_LEADS,
  INITIAL_PORTFOLIOS,
} from './mock/mediaBuyerData';
import { Header } from './components/Header';
import { KPIDashboard } from './components/KPIDashboard';
import { CampaignsTable } from './components/CampaignsTable';
import { CreativeIntelligence } from './components/CreativeIntelligence';
import { LeadPipelineKanban } from './components/LeadPipelineKanban';
import { AIRecommendations } from './components/AIRecommendations';
import { CommandPalette } from './components/CommandPalette';
import { ThresholdSettingsModal } from './components/ThresholdSettingsModal';
import { AddLeadModal } from './components/AddLeadModal';
import { AuditLogsModal } from './components/AuditLogsModal';
import { apiService } from './services/apiService';
import { CURRENCY_RATES, createCurrencyFormatter } from './lib/format';
import { evaluatePortfolio } from './services/recommendationEngine';
import {
  fixtureCollections,
  hasFixtureData,
  initialProvenance,
  isSupabaseConfigured,
} from './lib/config';
import type { Session } from '@supabase/supabase-js';
import { signOut } from './lib/auth';
import { AlertTriangle, Zap } from 'lucide-react';

/**
 * Recharts pulls in ~11 d3-* packages and dominated the initial bundle even
 * though charts only appear on the Overview tab. Loading it lazily keeps the
 * first paint independent of the charting library.
 */
const AnalyticsCharts = lazy(() =>
  import('./components/AnalyticsCharts').then((m) => ({ default: m.AnalyticsCharts })),
);

const ChartsFallback = () => (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" aria-busy="true">
    <div className="lg:col-span-2 h-96 bg-slate-900/90 border border-slate-800 rounded-2xl animate-pulse" />
    <div className="h-96 bg-slate-900/90 border border-slate-800 rounded-2xl animate-pulse" />
  </div>
);

export type TabId = 'overview' | 'campaigns' | 'creatives' | 'leads' | 'ai';

interface AppProps {
  /** Present only when a backend is configured and the user is signed in. */
  session?: Session | null;
}

export const App: React.FC<AppProps> = ({ session = null }) => {
  const [portfolios, setPortfolios] = useState<Portfolio[]>(INITIAL_PORTFOLIOS);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string>('port-1');
  const [campaigns, setCampaigns] = useState<Campaign[]>(INITIAL_CAMPAIGNS);
  const [creatives] = useState<Creative[]>(INITIAL_CREATIVES);
  const [leads, setLeads] = useState<Lead[]>(INITIAL_LEADS);
  // Recommendations are derived, never stored. There is no state to go stale
  // and no `applied` flag, because the app does not execute anything.
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const [currency, setCurrency] = useState<Currency>('USD');
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isThresholdModalOpen, setIsThresholdModalOpen] = useState(false);
  const [isAddLeadModalOpen, setIsAddLeadModalOpen] = useState(false);
  const [isAuditLogsModalOpen, setIsAuditLogsModalOpen] = useState(false);

  /**
   * Where each collection's data actually came from. Only a successful
   * backend fetch may move a collection to 'live'.
   */
  const [provenance, setProvenance] = useState(initialProvenance);

  const [isSyncing, setIsSyncing] = useState(false);
  const [toast, setToast] = useState<{ text: string; tone: 'info' | 'error' } | null>(null);

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Replaces any in-flight toast instead of letting the previous timer clear
   * the newer message.
   */
  const notify = useCallback((text: string, tone: 'info' | 'error' = 'info') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ text, tone });
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }, []);

  // Clear the toast timer on unmount so it cannot setState on a dead tree.
  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );

  useEffect(() => {
    apiService.getAuditLogs().then(setAuditLogs).catch(() => setAuditLogs([]));
  }, []);

  /**
   * Attempt a real read on mount and record what actually came back.
   *
   * Three outcomes, all reported honestly:
   *   - no backend configured        -> stays 'demo'
   *   - configured but read failed   -> 'degraded' (creds exist, data does not)
   *   - real rows returned           -> 'live'
   *
   * The middle case is the one that used to lie: credentials alone were
   * enough to hide the demo banner even when the database was empty or the
   * schema had never been applied.
   */
  useEffect(() => {
    // Re-runs when a session appears: RLS returns nothing until auth.uid()
    // resolves, so a read attempted before sign-in always looks degraded.
    if (!isSupabaseConfigured || !session) return;
    let cancelled = false;

    apiService
      .hydrateFromBackend()
      .then((r) => {
        if (cancelled) return;
        setPortfolios(r.data.portfolios);
        setCampaigns(r.data.campaigns);
        setLeads(r.data.leads);
        setProvenance((p) => ({
          ...p,
          portfolios: r.portfolios,
          campaigns: r.campaigns,
          leads: r.leads,
        }));
      })
      .catch(() => {
        if (!cancelled) {
          setProvenance((p) => ({ ...p, portfolios: 'degraded', campaigns: 'degraded' }));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [session]);

  /**
   * Global Cmd/Ctrl+K. This lives here rather than inside CommandPalette so
   * the shortcut can *open* the palette — the palette's own listener could
   * only ever close it, which made the advertised shortcut a no-op.
   */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const currencyRate = CURRENCY_RATES[currency];

  /**
   * Keeps the selection valid when the portfolio list is replaced.
   *
   * The initial selection is the fixture id 'port-1'. Real portfolios carry
   * UUIDs, so after a sync that id matches nothing: `currentPortfolio` would
   * fall back to portfolios[0] while `portfolioCampaigns` still filtered on
   * 'port-1' and returned an empty list — a successful sync would have
   * rendered an empty dashboard.
   */
  useEffect(() => {
    if (portfolios.length > 0 && !portfolios.some((p) => p.id === selectedPortfolioId)) {
      setSelectedPortfolioId(portfolios[0].id);
    }
  }, [portfolios, selectedPortfolioId]);

  const currentPortfolio = useMemo(
    () => portfolios.find((p) => p.id === selectedPortfolioId) ?? portfolios[0],
    [portfolios, selectedPortfolioId],
  );

  const portfolioCampaigns = useMemo(
    () => campaigns.filter((c) => c.portfolioId === selectedPortfolioId),
    [campaigns, selectedPortfolioId],
  );

  const portfolioCreatives = useMemo(() => {
    const ids = new Set(portfolioCampaigns.map((c) => c.id));
    return creatives.filter((cr) => ids.has(cr.campaignId));
  }, [creatives, portfolioCampaigns]);

  const portfolioLeads = useMemo(
    () => leads.filter((l) => l.portfolioId === selectedPortfolioId),
    [leads, selectedPortfolioId],
  );

  /**
   * Computed from the campaigns actually on screen, against this portfolio's
   * thresholds. Money is formatted in the currently selected currency so the
   * explanation text matches the rest of the dashboard.
   */
  const portfolioRecommendations = useMemo(
    () =>
      evaluatePortfolio(
        portfolioCampaigns,
        currentPortfolio,
        createCurrencyFormatter(currency, currencyRate),
      ),
    [portfolioCampaigns, currentPortfolio, currency, currencyRate],
  );

  const refreshAuditLogs = useCallback(async () => {
    setAuditLogs(await apiService.getAuditLogs());
  }, []);

  /**
   * Wraps a mutation so a rejected promise surfaces as a toast instead of an
   * unhandled rejection that leaves the UI silently stale.
   */
  const run = useCallback(
    async (action: () => Promise<void>, fallbackMessage: string) => {
      try {
        await action();
      } catch (err) {
        notify(err instanceof Error ? err.message : fallbackMessage, 'error');
      }
    },
    [notify],
  );

  /**
   * Real Meta sync. This used to be a `setTimeout` that invented a lead and
   * added a fixed +$450 to a hardcoded campaign — a simulation that looked
   * identical to a real refresh.
   *
   * The work happens in the `sync-meta` Edge Function so the Meta token
   * stays server-side; the browser only ever sees campaign rows back.
   */
  const handleTriggerSync = useCallback(() => {
    if (isSyncing) return;

    if (!session) {
      notify('المزامنة محتاجة تسجيل دخول واتصال بقاعدة البيانات.', 'error');
      return;
    }

    setIsSyncing(true);
    notify('جاري السحب من Meta Marketing API...');

    void run(async () => {
      try {
        const result = await apiService.syncFromMeta();

        setPortfolios(result.hydrated.data.portfolios);
        setCampaigns(result.hydrated.data.campaigns);
        setLeads(result.hydrated.data.leads);
        setProvenance((p) => ({
          ...p,
          portfolios: result.hydrated.portfolios,
          campaigns: result.hydrated.campaigns,
          leads: result.hydrated.leads,
        }));
        await refreshAuditLogs();

        // Currency mismatches and per-account failures are reported rather
        // than swallowed — a partial sync that looks complete is worse than
        // a visible warning.
        if (result.warnings.length > 0) {
          notify(result.warnings[0], 'error');
        } else {
          notify(
            `تمت مزامنة ${result.campaignsSynced} حملة من ${result.accounts.length} حساب إعلاني.`,
          );
        }
      } finally {
        setIsSyncing(false);
      }
    }, 'فشلت المزامنة مع Meta.');
  }, [isSyncing, notify, refreshAuditLogs, run, session]);

  const handleUpdateCampaignBudget = useCallback(
    (campaignId: string, newBudget: number) =>
      run(async () => {
        setCampaigns(await apiService.updateCampaignBudget(campaignId, newBudget));
        await refreshAuditLogs();
        notify(`تحديث الميزانية اليومية للحملة إلى $${newBudget}/يوم بنجاح!`);
      }, 'تعذر تحديث الميزانية.'),
    [notify, refreshAuditLogs, run],
  );

  const handleUpdateCampaignCogs = useCallback(
    (campaignId: string, cogs: number) =>
      run(async () => {
        setCampaigns(await apiService.updateCampaignCogs(campaignId, cogs));
        await refreshAuditLogs();
        notify('تم تحديث تكلفة البضاعة وإعادة حساب صافي الربح ونقطة التعادل.');
      }, 'تعذر تحديث تكلفة البضاعة.'),
    [notify, refreshAuditLogs, run],
  );

  const handleToggleCampaignStatus = useCallback(
    (campaignId: string) =>
      run(async () => {
        setCampaigns(await apiService.toggleCampaignStatus(campaignId));
        await refreshAuditLogs();
        notify('تم تحديث حالة الحملة الإعلانية بنجاح.');
      }, 'تعذر تحديث حالة الحملة.'),
    [notify, refreshAuditLogs, run],
  );

  const handleUpdateLeadStatus = useCallback(
    (leadId: string, newStatus: LeadStatus, value?: number) =>
      run(async () => {
        setLeads(await apiService.updateLeadStatus(leadId, newStatus, value));
        await refreshAuditLogs();
        notify(
          newStatus === 'closed'
            ? 'مبروك! تم تأكيد مبيعة جديدة وتحديث أرباح الحملة في الـ Dashboard.'
            : 'تم تحديث مرحلة الليد في الـ CRM بنجاح.',
        );
      }, 'تعذر تحديث مرحلة الليد.'),
    [notify, refreshAuditLogs, run],
  );

  const handleAddLead = useCallback(
    (input: {
      name: string;
      email: string;
      phone: string;
      campaignId: string;
      sourcePlatform: Platform;
      estimatedValue: number;
      notes: string;
    }) =>
      run(async () => {
        const campaign = campaigns.find((c) => c.id === input.campaignId);
        if (!campaign) throw new Error('يجب اختيار حملة صالحة لربط الليد بها.');

        const result = await apiService.addLead({
          portfolioId: selectedPortfolioId,
          campaignId: campaign.id,
          campaignName: campaign.name,
          name: input.name,
          email: input.email,
          phone: input.phone,
          sourcePlatform: input.sourcePlatform,
          status: 'registered',
          estimatedValue: input.estimatedValue,
          notes: input.notes,
        });

        setLeads(result.leads);
        setCampaigns(result.campaigns);
        await refreshAuditLogs();
        notify(`تم تسجيل الليد (${input.name}) بنجاح وربطه بحملة ${campaign.name}!`);
      }, 'تعذر تسجيل الليد.'),
    [campaigns, notify, refreshAuditLogs, run, selectedPortfolioId],
  );

  /*
   * `handleApplyRecommendation` was deleted rather than repaired.
   *
   * It read a hardcoded fixture recommendation and really did mutate the
   * campaign's budget by +25%. Two problems, either one disqualifying:
   *   - the recommendation it acted on was invented, not computed;
   *   - the write never reached Meta, so once a real sync exists the change
   *     would silently revert and the dashboard would report a scale-up that
   *     never happened.
   * Execution belongs in Ads Manager. See CAN_WRITE_TO_AD_PLATFORM.
   */

  const handleSaveThresholds = useCallback(
    (targetRoas: number, targetCpa: number, targetCpl: number, targetHookRate: number) =>
      run(async () => {
        setPortfolios(
          await apiService.updatePortfolioThresholds(
            selectedPortfolioId,
            targetRoas,
            targetCpa,
            targetCpl,
            targetHookRate,
          ),
        );
        await refreshAuditLogs();
        notify('تم تحديث شروط وتقييمات الأخضر/الأحمر للمحفظة الحالية!');
      }, 'تعذر حفظ الشروط.'),
    [notify, refreshAuditLogs, run, selectedPortfolioId],
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* First tab stop: lets keyboard users bypass the header's ~15 controls. */}
      <a href="#main-content" className="skip-link">تخطي إلى المحتوى الرئيسي</a>

      {/*
        Driven by what the data layer actually returned, not by whether env
        vars exist. Previously two environment variables were enough to hide
        this banner while every number on screen remained a fixture.
      */}
      {hasFixtureData(provenance) && (
        <div
          role="status"
          className="bg-amber-500/10 border-b border-amber-500/30 text-amber-300 text-xs font-bold px-4 py-2 flex items-center justify-center gap-2 text-center"
        >
          <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>
            بيانات تجريبية — {fixtureCollections(provenance).join('، ')} مش متصلة بمصدر حقيقي.
            متاخدش قرار ميزانية بناءً على الأرقام دي.
          </span>
        </div>
      )}

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-5 start-5 z-50 bg-slate-900 border px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 max-w-[90vw] animate-in slide-in-from-bottom ${
            toast.tone === 'error'
              ? 'border-rose-500/50 text-rose-300'
              : 'border-emerald-500/50 text-emerald-300'
          }`}
        >
          {toast.tone === 'error' ? (
            <AlertTriangle className="w-5 h-5 text-rose-400" />
          ) : (
            <Zap className="w-5 h-5 text-emerald-400" />
          )}
          <span className="text-xs font-bold">{toast.text}</span>
        </div>
      )}

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
        recommendationCount={portfolioRecommendations.filter((r) => r.severity !== 'info').length}
        userEmail={session?.user.email}
        onSignOut={() => void signOut()}
      />

      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 focus:outline-none"
      >
        {activeTab === 'overview' && (
          <>
            <KPIDashboard
              portfolio={currentPortfolio}
              campaigns={portfolioCampaigns}
              currency={currency}
              currencyRate={currencyRate}
            />
            <Suspense fallback={<ChartsFallback />}>
              <AnalyticsCharts
                campaigns={portfolioCampaigns}
                currency={currency}
                currencyRate={currencyRate}
              />
            </Suspense>
            <CampaignsTable
              portfolio={currentPortfolio}
              campaigns={portfolioCampaigns}
              currency={currency}
              currencyRate={currencyRate}
              onUpdateCampaignBudget={handleUpdateCampaignBudget}
            onUpdateCampaignCogs={handleUpdateCampaignCogs}
              onToggleCampaignStatus={handleToggleCampaignStatus}
            />
          </>
        )}

        {activeTab === 'campaigns' && (
          <CampaignsTable
            portfolio={currentPortfolio}
            campaigns={portfolioCampaigns}
            currency={currency}
            currencyRate={currencyRate}
            onUpdateCampaignBudget={handleUpdateCampaignBudget}
            onUpdateCampaignCogs={handleUpdateCampaignCogs}
            onToggleCampaignStatus={handleToggleCampaignStatus}
          />
        )}

        {activeTab === 'creatives' && (
          <CreativeIntelligence
            creatives={portfolioCreatives}
            portfolio={currentPortfolio}
            currency={currency}
            currencyRate={currencyRate}
          />
        )}

        {activeTab === 'leads' && (
          <LeadPipelineKanban
            leads={portfolioLeads}
            currency={currency}
            currencyRate={currencyRate}
            onUpdateLeadStatus={handleUpdateLeadStatus}
            onOpenAddLeadModal={() => setIsAddLeadModalOpen(true)}
          />
        )}

        {activeTab === 'ai' && (
          <AIRecommendations recommendations={portfolioRecommendations} />
        )}
      </main>

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
      />

      <AddLeadModal
        isOpen={isAddLeadModalOpen}
        onClose={() => setIsAddLeadModalOpen(false)}
        campaigns={portfolioCampaigns}
        onAddLead={handleAddLead}
      />

      <AuditLogsModal
        isOpen={isAuditLogsModalOpen}
        onClose={() => setIsAuditLogsModalOpen(false)}
        logs={auditLogs}
        isPersisted={provenance.auditLogs === 'live'}
      />

      {/* text-slate-500 on slate-950 is 4.24:1 — below the 4.5:1 minimum. */}
      <footer className="bg-slate-950 border-t border-slate-900 py-4 text-center text-xs text-slate-400">
        <p>MediaBuyer OS © 2026 | Enterprise Growth Engine for Media Buyers &amp; Agencies</p>
      </footer>
    </div>
  );
};

export default App;
