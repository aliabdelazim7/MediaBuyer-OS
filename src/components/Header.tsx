import React from 'react';
import type { TabId } from '../App';
import type { Portfolio, Currency } from '../types/mediaBuyer';
import { CURRENCY_RATES } from '../lib/format';
import {
  Building2,
  Search,
  RefreshCw,
  Sliders,
  UserPlus,
  Zap,
  History,
  LayoutDashboard,
  Target,
  Video,
  Users,
  Sparkles,
  type LucideIcon
} from 'lucide-react';

interface HeaderProps {
  portfolios: Portfolio[];
  selectedPortfolioId: string;
  onSelectPortfolio: (id: string) => void;
  currency: Currency;
  onChangeCurrency: (curr: Currency) => void;
  onOpenCommandPalette: () => void;
  onOpenThresholdModal: () => void;
  onOpenAddLeadModal: () => void;
  onOpenAuditLogsModal: () => void;
  isSyncing: boolean;
  onTriggerSync: () => void;
  activeTab: TabId;
  onChangeTab: (tab: TabId) => void;
  /** Number of un-applied AI recommendations for the selected portfolio. */
  recommendationCount: number;
}

const CURRENCIES = Object.keys(CURRENCY_RATES) as Currency[];

/**
 * Tab labels use Lucide icons rather than emoji. Emoji render differently on
 * every OS, cannot inherit the active/inactive colour, and are read aloud by
 * screen readers ("bar chart", "clapper board") as if they carried meaning.
 */
const TAB_ICONS: Record<TabId, LucideIcon> = {
  overview: LayoutDashboard,
  campaigns: Target,
  creatives: Video,
  leads: Users,
  ai: Sparkles,
};

// 44px minimum touch target (WCAG 2.5.5 / platform HIG). The icon buttons were
// `p-1` around a 16px icon — a 24px target.
const ICON_BUTTON =
  'inline-flex items-center justify-center min-w-11 min-h-11 rounded-lg border transition-colors';

export const Header: React.FC<HeaderProps> = ({
  portfolios,
  selectedPortfolioId,
  onSelectPortfolio,
  currency,
  onChangeCurrency,
  onOpenCommandPalette,
  onOpenThresholdModal,
  onOpenAddLeadModal,
  onOpenAuditLogsModal,
  isSyncing,
  onTriggerSync,
  activeTab,
  onChangeTab,
  recommendationCount
}) => {
  const currentPortfolio = portfolios.find(p => p.id === selectedPortfolioId) || portfolios[0];

  const tabs: { id: TabId; label: string; badge: string | null }[] = [
    { id: 'overview', label: 'نظرة عامة', badge: null },
    { id: 'campaigns', label: 'الحملات والإعلانات', badge: `${currentPortfolio.accounts.length} حسابات` },
    { id: 'creatives', label: 'الكريتيف والـ Hook Rate', badge: 'تحليل الفيديو' },
    { id: 'leads', label: 'تتبع الليدز (CRM)', badge: 'مباشر' },
    { id: 'ai', label: 'اقتراحات الذكاء الاصطناعي', badge: recommendationCount > 0 ? `${recommendationCount} تنبيهات` : null },
  ];

  return (
    <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/*
          Width budget inside the max-w-7xl container is ~1216px. The three
          blocks below are sized so their total can never exceed it:
          brand (~230, fixed) + portfolio (max 208) + actions (~590, fixed).
          `min-h-16` rather than `h-16` so the row grows instead of clipping,
          and actions are pushed over with `ms-auto` — `justify-between`
          combined with wrapping was what scattered them out of order.
        */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2 lg:min-h-16 lg:flex-nowrap lg:py-0">

          {/* Brand + portfolio switcher */}
          <div className="flex items-center gap-3 min-w-0 flex-1 lg:flex-none lg:shrink">
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Zap className="w-5 h-5 text-slate-950" aria-hidden="true" />
              </div>
              {/*
                Below sm only the gradient mark shows. At 375px the wordmark
                and PRO badge eat ~180px, which left the portfolio switcher
                about 100px — narrow enough that it rendered as bare "...".
              */}
              <div className="hidden sm:block">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent whitespace-nowrap">
                    MediaBuyer OS
                  </span>
                  <span className="px-1.5 py-0.5 text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded">
                    PRO
                  </span>
                </div>
                <p className="hidden md:block text-xs text-slate-400">Enterprise Growth Engine</p>
              </div>
            </div>

            {/*
              A native <select> sizes itself to its LONGEST option. Left
              unbounded (`sm:max-w-none`) the "Scale E-Commerce Portfolio
              (Apex Fashion Group)" option stretched this to ~400px and blew
              the row's width budget. The cap applies at every breakpoint.
            */}
            <div className="relative flex items-center flex-1 bg-slate-900 border border-slate-700/70 rounded-lg ps-3 pe-2 h-11 hover:border-emerald-500/50 transition-colors min-w-0">
              <Building2 className="w-4 h-4 text-emerald-400 shrink-0 me-2" aria-hidden="true" />
              <label htmlFor="portfolio-switcher" className="sr-only">اختر المحفظة الإعلانية</label>
              <select
                id="portfolio-switcher"
                // Portfolio names are Latin inside an RTL page. Without
                // dir="auto" the bidi algorithm reordered them and truncation
                // showed the tail ("...io (Apex Fashion Group)") instead of
                // the identifying start of the name.
                dir="auto"
                value={selectedPortfolioId}
                onChange={(e) => onSelectPortfolio(e.target.value)}
                title={`${currentPortfolio.name} (${currentPortfolio.clientName})`}
                // h-full so the clickable box fills the 44px shell rather than
                // being a 21px strip inside it.
                className="bg-transparent text-sm font-medium text-slate-200 cursor-pointer w-full h-full sm:max-w-[13rem] truncate"
              >
                {portfolios.map(p => (
                  <option key={p.id} value={p.id} dir="auto" className="bg-slate-900 text-slate-200">
                    {p.name} ({p.clientName})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/*
            Rigid from lg up — that is what stops the row overlapping on
            desktop. Below lg it wraps instead, because these controls total
            ~440px and cannot fit a 375px viewport in one line.
            The wide "search…" trigger that used to sit between the brand and
            these was a fixed 256px that fit no breakpoint's budget; search is
            now the icon button below.
          */}
          <div className="flex items-center gap-2 flex-wrap justify-end ms-auto lg:flex-nowrap lg:shrink-0">

            <button
              onClick={onTriggerSync}
              disabled={isSyncing}
              className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 h-11 rounded-lg border transition-colors cursor-pointer disabled:cursor-wait ${
                isSyncing
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
              }`}
              title="مزامنة لحظية مع Meta Graph API & Webhooks"
            >
              <RefreshCw className={`w-4 h-4 shrink-0 ${isSyncing ? 'animate-spin' : ''}`} aria-hidden="true" />
              {/* Label drops below md; aria-live still announces state flips. */}
              <span aria-live="polite" className="hidden md:inline whitespace-nowrap">
                {isSyncing ? 'جاري المزامنة...' : 'مزامنة حية'}
              </span>
              <span className="sr-only md:hidden" aria-live="polite">
                {isSyncing ? 'جاري المزامنة' : 'مزامنة حية'}
              </span>
            </button>

            <div
              role="group"
              aria-label="عملة العرض"
              className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-1 h-11"
            >
              {CURRENCIES.map(curr => (
                <button
                  key={curr}
                  onClick={() => onChangeCurrency(curr)}
                  aria-pressed={currency === curr}
                  className={`px-2.5 h-9 text-xs font-bold rounded transition-colors cursor-pointer ${
                    currency === curr
                      ? 'bg-emerald-500 text-slate-950 shadow'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {curr}
                </button>
              ))}
            </div>

            <button
              onClick={onOpenCommandPalette}
              aria-label="بحث سريع"
              title="بحث سريع (Ctrl+K)"
              className={`${ICON_BUTTON} bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300 hover:text-emerald-400 cursor-pointer`}
            >
              <Search className="w-4 h-4" aria-hidden="true" />
            </button>

            <button
              onClick={onOpenThresholdModal}
              aria-label="تعديل شروط وتصنيفات الأداء"
              title="تعديل شروط وتصنيفات الأخضر/الأحمر"
              className={`${ICON_BUTTON} bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300 hover:text-emerald-400 cursor-pointer`}
            >
              <Sliders className="w-4 h-4" aria-hidden="true" />
            </button>

            <button
              onClick={onOpenAuditLogsModal}
              aria-label="سجل التغييرات المالية والأمان"
              title="سجل التغييرات المالية والأمان"
              className={`${ICON_BUTTON} bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300 hover:text-cyan-400 cursor-pointer`}
            >
              <History className="w-4 h-4" aria-hidden="true" />
            </button>

            <button
              onClick={onOpenAddLeadModal}
              className="inline-flex items-center gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-bold px-3.5 h-11 rounded-lg shadow-lg shadow-emerald-500/20 transition-colors cursor-pointer"
            >
              <UserPlus className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">إضافة ليد</span>
            </button>

          </div>
        </div>

        {/* Tabs */}
        <div
          role="tablist"
          aria-label="أقسام لوحة التحكم"
          className="flex items-center gap-1 border-t border-slate-800/60 pt-1.5 pb-2 overflow-x-auto text-sm scrollbar-none"
        >
          {tabs.map(tab => {
            const Icon = TAB_ICONS[tab.id];
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => onChangeTab(tab.id)}
                className={`inline-flex items-center gap-2 px-3.5 h-10 rounded-lg font-medium transition-colors text-xs whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-slate-800 text-emerald-400 border border-slate-700 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className={`px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                    isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
