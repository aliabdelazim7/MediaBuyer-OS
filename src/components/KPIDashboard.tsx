import React, { useMemo, useState } from 'react';
import type { Portfolio, Campaign, Currency } from '../types/mediaBuyer';
import { createCurrencyFormatter, formatNumber } from '../lib/format';
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
  baseCurrency: Currency;
}

export const KPIDashboard: React.FC<KPIDashboardProps> = ({
  portfolio,
  campaigns,
  currency,
  baseCurrency
}) => {
  const [showAdvancedMetrics, setShowAdvancedMetrics] = useState(false);

  const formatCurrency = useMemo(
    () => createCurrencyFormatter(currency, baseCurrency),
    [currency, baseCurrency]
  );

  /**
   * All portfolio aggregates in a single pass. Previously this was ten separate
   * `.reduce()` / `.filter()` traversals recomputed on every parent render
   * (including every toast tick).
   *
   * Note these are *blended* figures computed from raw counters, not averages
   * of per-campaign ratios — averaging ratios would misweight small campaigns.
   * Hook/hold rate remain unweighted means over video campaigns only, matching
   * how media buyers read creative health per asset.
   */
  const stats = useMemo(() => {
    let spend = 0, revenue = 0, cogs = 0, conversions = 0, leads = 0;
    let impressions = 0, clicks = 0, hookSum = 0, holdSum = 0, videoCount = 0;

    for (const c of campaigns) {
      spend += c.spend;
      revenue += c.revenue;
      cogs += c.cogs;
      conversions += c.conversions;
      leads += c.leadsCount;
      impressions += c.impressions;
      clicks += c.clicks;
      if (c.video3sViews > 0) {
        hookSum += c.hookRate;
        holdSum += c.holdRate;
        videoCount++;
      }
    }

    const div = (a: number, b: number) => (b > 0 ? a / b : 0);
    return {
      totalSpend: spend,
      totalRevenue: revenue,
      netProfit: revenue - spend - cogs,
      blendedRoas: div(revenue, spend),
      totalConversions: conversions,
      trueCpa: div(spend, conversions),
      totalLeads: leads,
      trueCpl: div(spend, leads),
      totalImpressions: impressions,
      totalClicks: clicks,
      avgCtr: div(clicks, impressions) * 100,
      avgCpm: div(spend, impressions) * 1000,
      avgCpc: div(spend, clicks),
      avgHookRate: div(hookSum, videoCount),
      avgHoldRate: div(holdSum, videoCount),
      fatiguedCount: campaigns.filter(c => c.fatigueScore >= 70).length,
    };
  }, [campaigns]);

  const {
    totalSpend, totalRevenue, netProfit, blendedRoas, totalConversions, trueCpa,
    totalLeads, trueCpl, totalImpressions, totalClicks, avgCtr, avgCpm, avgCpc,
    avgHookRate, avgHoldRate, fatiguedCount,
  } = stats;

  const crmCloseRate = totalLeads > 0 ? (totalConversions / totalLeads) * 100 : 0;

  // Color Coding Evaluator functions based on Portfolio Target Thresholds
  const getRoasStatus = (roas: number) => {
    if (roas >= portfolio.targetRoas) return { color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', tag: 'ممتاز' };
    if (roas >= portfolio.targetRoas * 0.8) return { color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30', tag: 'مقبول' };
    return { color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/30', tag: 'سيئ' };
  };

  const getCpaStatus = (cpa: number) => {
    if (cpa <= portfolio.targetCpa) return { color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', tag: 'ممتاز' };
    if (cpa <= portfolio.targetCpa * 1.25) return { color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30', tag: 'تحذير' };
    return { color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/30', tag: 'مرتفع جداً' };
  };

  const getCplStatus = (cpl: number) => {
    if (cpl <= portfolio.targetCpl) return { color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', tag: 'ممتاز' };
    if (cpl <= portfolio.targetCpl * 1.3) return { color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30', tag: 'مقبول' };
    return { color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/30', tag: 'مرتفع' };
  };

  const getHookStatus = (hook: number) => {
    if (hook >= portfolio.targetHookRate) return { color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', tag: 'قوي' };
    return { color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/30', tag: 'ضعيف' };
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
            {/*
              dir="ltr" on the operator+value pairs: inside an RTL paragraph
              the bidi algorithm mirrors ≥ and ≤, so "CPA ≤ $22" rendered as
              "$22 ≥" — reversing the meaning of the target.
            */}
            الأهداف المعتمدة:{' '}
            <span dir="ltr" className="inline-block">
              ROAS ≥ <span className="text-emerald-400 font-bold">{portfolio.targetRoas}x</span>
            </span>{' '}
            |{' '}
            <span dir="ltr" className="inline-block">
              CPA ≤ <span className="text-emerald-400 font-bold">{formatCurrency(portfolio.targetCpa)}</span>
            </span>
          </p>
        </div>

        {/* Action button to expand metrics */}
        <button
          onClick={() => setShowAdvancedMetrics(!showAdvancedMetrics)}
          aria-expanded={showAdvancedMetrics}
          aria-controls="advanced-metrics"
          className="flex items-center gap-2 shrink-0 text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 px-3.5 h-11 rounded-xl border border-slate-700 transition-colors cursor-pointer"
        >
          <span>{showAdvancedMetrics ? 'إخفاء المتركس المتقدمة' : 'عرض المتركس المتقدمة (Hook/Hold/CPM)'}</span>
          {showAdvancedMetrics
            ? <ChevronUp className="w-4 h-4 text-emerald-400" aria-hidden="true" />
            : <ChevronDown className="w-4 h-4 text-emerald-400" aria-hidden="true" />}
        </button>
      </div>

      {/* Main KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* 1. Net Profit (True Cash Profit) */}
        <div className="bg-slate-900/90 border border-slate-800 hover:border-emerald-500/40 p-5 rounded-2xl shadow-md transition-all relative overflow-hidden group">
          {/* Logical `start` so the accent sits on the reading-start edge.
              `left-0` put it on the trailing edge in this RTL layout. */}
          <div className="absolute top-0 start-0 w-1.5 h-full bg-gradient-to-b from-emerald-400 to-teal-500" />
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
            {/*
              A hardcoded "+24% vs last week" used to sit here. There is no
              per-portfolio historical series to derive it from, so it was a
              fabricated figure shown beside real money. Replaced with the
              actual profit margin, which IS derivable from current data.
            */}
            <div className="flex items-center gap-2 mt-2 text-xs">
              <span className={`flex items-center font-bold ${netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                <TrendingUp className="w-3.5 h-3.5 ms-0.5" aria-hidden="true" />
                {totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : '0.0'}%
              </span>
              <span className="text-slate-400">هامش الربح الصافي من الإيراد</span>
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
            <span className="font-bold text-emerald-400">{crmCloseRate.toFixed(1)}% إلى Done</span>
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
              <span className="text-[11px] text-slate-400">
                الهدف:{' '}
                <span dir="ltr" className="inline-block">≥ {portfolio.targetHookRate}%</span>
              </span>
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
              <span className="text-[11px] text-slate-400">نسبة استكمال الفيديو</span>
            </div>

            {/* CTR */}
            <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl">
              <div className="text-xs text-slate-400">معدل النقرات CTR</div>
              <div className="text-lg font-extrabold text-slate-100 mt-1">
                {avgCtr.toFixed(2)}%
              </div>
              <span className="text-[11px] text-slate-400">{formatNumber(totalClicks)} نقرة</span>
            </div>

            {/* CPM */}
            <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl">
              <div className="text-xs text-slate-400">تكلفة الـ 1000 (CPM)</div>
              <div className="text-lg font-extrabold text-slate-100 mt-1">
                {formatCurrency(avgCpm)}
              </div>
              <span className="text-[11px] text-slate-400">{formatNumber(totalImpressions)} ظهورا</span>
            </div>

            {/* CPC */}
            <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl">
              <div className="text-xs text-slate-400">تكلفة النقرة (CPC)</div>
              <div className="text-lg font-extrabold text-slate-100 mt-1">
                {formatCurrency(avgCpc)}
              </div>
              <span className="text-[11px] text-slate-400">متوسط النقرة</span>
            </div>

            {/* Active Fatigue Alerts */}
            <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl">
              <div className="text-xs text-slate-400">تنبيهات الـ Fatigue</div>
              <div className={`text-lg font-extrabold mt-1 ${fatiguedCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {fatiguedCount} حملة
              </div>
              <span className="text-[11px] text-amber-400/80">
                {fatiguedCount > 0 ? 'تحتاج تغيير الـ Intro' : 'لا توجد تنبيهات إجهاد'}
              </span>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
