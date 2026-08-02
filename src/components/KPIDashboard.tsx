import React, { useState } from 'react';
import type { Portfolio, Campaign, Currency } from '../types/mediaBuyer';
import { 
  TrendingUp, 
  DollarSign, 
  Eye, 
  Video, 
  AlertCircle, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  Zap 
} from 'lucide-react';

interface KPIDashboardProps {
  portfolio: Portfolio;
  campaigns: Campaign[];
  currency: Currency;
  currencyRate: number;
}

export const KPIDashboard: React.FC<KPIDashboardProps> = ({
  portfolio,
  campaigns,
  currency,
  currencyRate
}) => {
  const [showAdvancedMetrics, setShowAdvancedMetrics] = useState(false);

  // Aggregate values
  const totalSpend = campaigns.reduce((acc, c) => acc + c.spend, 0);
  const totalRevenue = campaigns.reduce((acc, c) => acc + c.revenue, 0);
  const totalCogs = campaigns.reduce((acc, c) => acc + c.cogs, 0);
  const netProfit = totalRevenue - totalSpend - totalCogs;
  const blendedRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
  
  const totalConversions = campaigns.reduce((acc, c) => acc + c.conversions, 0);
  const trueCpa = totalConversions > 0 ? totalSpend / totalConversions : 0;
  
  const totalLeads = campaigns.reduce((acc, c) => acc + c.leadsCount, 0);
  const trueCpl = totalLeads > 0 ? totalSpend / totalLeads : 0;

  const totalImpressions = campaigns.reduce((acc, c) => acc + c.impressions, 0);
  const totalClicks = campaigns.reduce((acc, c) => acc + c.clicks, 0);
  const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const avgCpm = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;

  const videoCampaigns = campaigns.filter(c => c.video3sViews > 0);
  const avgHookRate = videoCampaigns.length > 0 
    ? videoCampaigns.reduce((acc, c) => acc + c.hookRate, 0) / videoCampaigns.length 
    : 0;
  const avgHoldRate = videoCampaigns.length > 0 
    ? videoCampaigns.reduce((acc, c) => acc + c.holdRate, 0) / videoCampaigns.length 
    : 0;

  // Currency Formatter
  const formatCurrency = (val: number) => {
    const converted = val * currencyRate;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0
    }).format(converted);
  };

  // Color Coding Evaluator functions based on Portfolio Target Thresholds
  const getRoasStatus = (roas: number) => {
    if (roas >= portfolio.targetRoas) return { color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', tag: 'ممتاز 🟢' };
    if (roas >= portfolio.targetRoas * 0.8) return { color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30', tag: 'مقبول 🟡' };
    return { color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/30', tag: 'سيئ 🔴' };
  };

  const getCpaStatus = (cpa: number) => {
    if (cpa <= portfolio.targetCpa) return { color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', tag: 'ممتاز 🟢' };
    if (cpa <= portfolio.targetCpa * 1.25) return { color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30', tag: 'تحذير 🟡' };
    return { color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/30', tag: 'مرتفع جداً 🔴' };
  };

  const getCplStatus = (cpl: number) => {
    if (cpl <= portfolio.targetCpl) return { color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', tag: 'ممتاز 🟢' };
    if (cpl <= portfolio.targetCpl * 1.3) return { color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30', tag: 'مقبول 🟡' };
    return { color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/30', tag: 'مرتفع 🔴' };
  };

  const getHookStatus = (hook: number) => {
    if (hook >= portfolio.targetHookRate) return { color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', tag: 'قوي 🟢' };
    return { color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/30', tag: 'ضعيف 🔴' };
  };

  const roasStat = getRoasStatus(blendedRoas);
  const cpaStat = getCpaStatus(trueCpa);
  const cplStat = getCplStatus(trueCpl);
  const hookStat = getHookStatus(avgHookRate);

  return (
    <div className="space-y-6">
      
      {/* Portfolio Headline Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-slate-100">{portfolio.name}</h2>
            <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 rounded-full">
              {portfolio.category}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            العميل: <span className="text-slate-200 font-medium">{portfolio.clientName}</span> | 
            الأهداف المعتمدة: ROAS ≥ <span className="text-emerald-400 font-bold">{portfolio.targetRoas}x</span> | 
            CPA ≤ <span className="text-emerald-400 font-bold">{formatCurrency(portfolio.targetCpa)}</span>
          </p>
        </div>

        {/* Action button to expand metrics */}
        <button
          onClick={() => setShowAdvancedMetrics(!showAdvancedMetrics)}
          className="flex items-center gap-2 text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 px-3.5 py-2 rounded-xl border border-slate-700 transition-all"
        >
          <span>{showAdvancedMetrics ? 'إخفاء المتركس المتقدمة' : 'عرض المتركس المتقدمة (Hook/Hold/CPM)'}</span>
          {showAdvancedMetrics ? <ChevronUp className="w-4 h-4 text-emerald-400" /> : <ChevronDown className="w-4 h-4 text-emerald-400" />}
        </button>
      </div>

      {/* Main KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* 1. Net Profit (True Cash Profit) */}
        <div className="bg-slate-900/90 border border-slate-800 hover:border-emerald-500/40 p-5 rounded-2xl shadow-md transition-all relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-emerald-400 to-teal-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">صافي الربح الحقيقي</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-100">
              {formatCurrency(netProfit)}
            </div>
            <div className="flex items-center gap-2 mt-2 text-xs">
              <span className="flex items-center text-emerald-400 font-bold">
                <TrendingUp className="w-3.5 h-3.5 ml-0.5" /> +24%
              </span>
              <span className="text-slate-400">مقارنة بالأسبوع الماضي</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>الإيراد: <strong className="text-slate-200">{formatCurrency(totalRevenue)}</strong></span>
            <span>الإنفاق: <strong className="text-slate-200">{formatCurrency(totalSpend)}</strong></span>
          </div>
        </div>

        {/* 2. Blended ROAS (Color Coded) */}
        <div className={`bg-slate-900/90 border p-5 rounded-2xl shadow-md transition-all relative ${roasStat.bg}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">عائد الإعلانات (ROAS)</span>
            <span className={`px-2 py-0.5 text-xs font-bold rounded-full border ${roasStat.bg} ${roasStat.color}`}>
              {roasStat.tag}
            </span>
          </div>
          <div className="mt-3">
            <div className={`text-2xl font-black ${roasStat.color}`}>
              {blendedRoas.toFixed(2)}x
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-xs">
              <span className="text-slate-400">الهدف المعتمد:</span>
              <span className="font-bold text-slate-200">{portfolio.targetRoas}x</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
            {blendedRoas >= portfolio.targetRoas ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> أداء ممتاز، متاح زيادة الميزانية
              </span>
            ) : (
              <span className="text-rose-400 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> أقل من الهدف! يجب مراجعة الزوايا الإعلانية
              </span>
            )}
          </div>
        </div>

        {/* 3. True CPA (Cost Per Acquisition) */}
        <div className={`bg-slate-900/90 border p-5 rounded-2xl shadow-md transition-all relative ${cpaStat.bg}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">تكلفة الشراء (True CPA)</span>
            <span className={`px-2 py-0.5 text-xs font-bold rounded-full border ${cpaStat.bg} ${cpaStat.color}`}>
              {cpaStat.tag}
            </span>
          </div>
          <div className="mt-3">
            <div className={`text-2xl font-black ${cpaStat.color}`}>
              {formatCurrency(trueCpa)}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-xs">
              <span className="text-slate-400">العدد الحقيقي:</span>
              <span className="font-bold text-slate-200">{totalConversions} مبيعة</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
            <span>الحد الأقصى للـ CPA:</span>
            <span className="font-bold text-slate-200">{formatCurrency(portfolio.targetCpa)}</span>
          </div>
        </div>

        {/* 4. True CPL & Lead Generation Pipeline */}
        <div className={`bg-slate-900/90 border p-5 rounded-2xl shadow-md transition-all relative ${cplStat.bg}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">تكلفة الليد (True CPL)</span>
            <span className={`px-2 py-0.5 text-xs font-bold rounded-full border ${cplStat.bg} ${cplStat.color}`}>
              {cplStat.tag}
            </span>
          </div>
          <div className="mt-3">
            <div className={`text-2xl font-black ${cplStat.color}`}>
              {formatCurrency(trueCpl)}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-xs">
              <span className="text-slate-400">إجمالي الليدز المسجلة:</span>
              <span className="font-bold text-slate-200">{totalLeads} ليد</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
            <span>معدل تحويل CRM:</span>
            <span className="font-bold text-emerald-400">38% إلى Done</span>
          </div>
        </div>

      </div>

      {/* Progressive Disclosure: Advanced Media Buying Metrics */}
      {showAdvancedMetrics && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4 animate-in fade-in duration-300">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              <h3 className="font-extrabold text-slate-100 text-sm">المتركس المتقدمة وتحليل الفيديوهات (Creative Engine)</h3>
            </div>
            <span className="text-xs text-slate-400">تحديث تلقائي من Meta & TikTok Video APIs</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            
            {/* Hook Rate */}
            <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Hook Rate (3s)</span>
                <Video className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <div className={`text-lg font-extrabold mt-1 ${hookStat.color}`}>
                {avgHookRate.toFixed(1)}%
              </div>
              <span className="text-[10px] text-slate-400">الهدف: ≥ {portfolio.targetHookRate}%</span>
            </div>

            {/* Hold Rate */}
            <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Hold Rate (15s)</span>
                <Eye className="w-3.5 h-3.5 text-teal-400" />
              </div>
              <div className="text-lg font-extrabold text-teal-400 mt-1">
                {avgHoldRate.toFixed(1)}%
              </div>
              <span className="text-[10px] text-slate-400">نسبة استكمال الفيديو</span>
            </div>

            {/* CTR */}
            <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl">
              <div className="text-xs text-slate-400">معدل النقرات CTR</div>
              <div className="text-lg font-extrabold text-slate-100 mt-1">
                {avgCtr.toFixed(2)}%
              </div>
              <span className="text-[10px] text-slate-400">{totalClicks.toLocaleString()} نقرة</span>
            </div>

            {/* CPM */}
            <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl">
              <div className="text-xs text-slate-400">تكلفة الـ 1000 (CPM)</div>
              <div className="text-lg font-extrabold text-slate-100 mt-1">
                {formatCurrency(avgCpm)}
              </div>
              <span className="text-[10px] text-slate-400">{totalImpressions.toLocaleString()} ظهورا</span>
            </div>

            {/* CPC */}
            <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl">
              <div className="text-xs text-slate-400">تكلفة النقرة (CPC)</div>
              <div className="text-lg font-extrabold text-slate-100 mt-1">
                {formatCurrency(totalClicks > 0 ? totalSpend / totalClicks : 0)}
              </div>
              <span className="text-[10px] text-slate-400">متوسط النقرة</span>
            </div>

            {/* Active Fatigue Alerts */}
            <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl">
              <div className="text-xs text-slate-400">تنبيهات الـ Fatigue</div>
              <div className="text-lg font-extrabold text-amber-400 mt-1">
                1 كريتيف
              </div>
              <span className="text-[10px] text-amber-400/80">يحتاج تغيير الـ Intro</span>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
