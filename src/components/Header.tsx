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
  History
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
    { id: 'overview', label: '📊 نظرة عامة (Dashboard)', badge: null },
    { id: 'campaigns', label: '🎯 الحملات والإعلانات', badge: `${currentPortfolio.accounts.length} حسابات` },
    { id: 'creatives', label: '🎥 الكريتيف والـ Hook Rate', badge: 'تحليل الفيديو' },
    { id: 'leads', label: '📋 تتبع الليدز (CRM)', badge: 'مباشر' },
    { id: 'ai', label: '🤖 اقتراحات الذكاء الاصطناعي', badge: recommendationCount > 0 ? `${recommendationCount} تنبيهات` : null },
  ];

  return (
    <header className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Brand Logo & Portfolio Switcher */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Zap className="w-5 h-5 text-slate-950 font-bold" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                    MediaBuyer OS
                  </span>
                  <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded">
                    PRO
                  </span>
                </div>
                <p className="text-xs text-slate-400">Enterprise Growth Engine</p>
              </div>
            </div>

            {/* Portfolio Dropdown */}
            <div className="relative flex items-center bg-slate-900 border border-slate-700/70 rounded-lg px-3 py-1.5 hover:border-emerald-500/50 transition-all">
              <Building2 className="w-4 h-4 text-emerald-400 mr-2" />
              <select 
                value={selectedPortfolioId}
                onChange={(e) => onSelectPortfolio(e.target.value)}
                className="bg-transparent text-sm font-medium text-slate-200 outline-none cursor-pointer pr-4"
              >
                {portfolios.map(p => (
                  <option key={p.id} value={p.id} className="bg-slate-900 text-slate-200">
                    {p.name} ({p.clientName})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Center Command Palette Search Trigger */}
          <div className="hidden md:flex items-center">
            <button
              onClick={onOpenCommandPalette}
              className="flex items-center gap-3 bg-slate-900/90 border border-slate-800 hover:border-slate-700 px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-slate-200 transition-all shadow-inner w-64 justify-between group"
            >
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-slate-400 group-hover:text-emerald-400 transition-colors" />
                <span>ابحث عن حساب، حملة، أو ليد...</span>
              </div>
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-800 text-slate-300 rounded border border-slate-700">
                Cmd+K
              </kbd>
            </button>
          </div>

          {/* Right Action Tools */}
          <div className="flex items-center gap-3">
            
            {/* Live Sync Status Button */}
            <button
              onClick={onTriggerSync}
              disabled={isSyncing}
              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all ${
                isSyncing 
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' 
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
              }`}
              title="مزامنة لحظية مع Meta Graph API & Webhooks"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-amber-400' : ''}`} />
              <span>{isSyncing ? 'جاري المزامنة...' : 'مزامنة حية'}</span>
            </button>

            {/* Currency Switcher */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-1">
              {CURRENCIES.map(curr => (
                <button
                  key={curr}
                  onClick={() => onChangeCurrency(curr)}
                  className={`px-2 py-1 text-xs font-bold rounded transition-all ${
                    currency === curr 
                      ? 'bg-emerald-500 text-slate-950 shadow' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {curr}
                </button>
              ))}
            </div>

            {/* Target Thresholds Settings Button */}
            <button
              onClick={onOpenThresholdModal}
              className="p-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-emerald-400 rounded-lg transition-colors"
              title="تعديل شروط وتصنيفات الأخضر/الأحمر (Target Thresholds)"
            >
              <Sliders className="w-4 h-4" />
            </button>

            {/* Audit Logs Button */}
            <button
              onClick={onOpenAuditLogsModal}
              className="p-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-cyan-400 rounded-lg transition-colors"
              title="سجل التغييرات المالية والأمان (Audit Trail)"
            >
              <History className="w-4 h-4" />
            </button>

            {/* Add Lead Button */}
            <button
              onClick={onOpenAddLeadModal}
              className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-bold px-3.5 py-2 rounded-lg shadow-lg shadow-emerald-500/20 transition-all"
            >
              <UserPlus className="w-4 h-4" />
              <span className="hidden sm:inline">إضافة ليد</span>
            </button>

          </div>
        </div>

        {/* Navigation Tabs */}
        <div role="tablist" className="flex items-center gap-1 border-t border-slate-800/60 pt-1 pb-2 overflow-x-auto text-sm scrollbar-none">
          {tabs.map(tab => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => onChangeTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-medium transition-all text-xs whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-slate-800 text-emerald-400 border border-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <span>{tab.label}</span>
              {tab.badge && (
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                  activeTab === tab.id ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
};
