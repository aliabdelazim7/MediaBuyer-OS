import React, { useMemo } from 'react';
import { 
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { MOCK_DAILY_METRICS } from '../mock/mediaBuyerData';
import type { Campaign, Currency, Platform } from '../types/mediaBuyer';
import { TrendingUp, PieChart } from 'lucide-react';

interface AnalyticsChartsProps {
  campaigns: Campaign[];
  currency: Currency;
  currencyRate: number;
}

const PLATFORM_LABELS: { key: Platform; label: string }[] = [
  { key: 'meta', label: 'Meta Ads' },
  { key: 'tiktok', label: 'TikTok Ads' },
  { key: 'google', label: 'Google Ads' },
];

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({
  campaigns,
  currency,
  currencyRate
}) => {
  const formattedChartData = useMemo(() => {
    const convert = (val: number) => Math.round(val * currencyRate);
    return MOCK_DAILY_METRICS.map(item => ({
      ...item,
      spend: convert(item.spend),
      revenue: convert(item.revenue),
      netProfit: convert(item.netProfit),
    }));
  }, [currencyRate]);

  /**
   * Platform totals in one pass. The previous version ran nine
   * filter+reduce traversals (three per platform) on every render.
   */
  const platformData = useMemo(() => {
    const totals = new Map<Platform, { spend: number; revenue: number; profit: number }>(
      PLATFORM_LABELS.map(p => [p.key, { spend: 0, revenue: 0, profit: 0 }])
    );
    for (const c of campaigns) {
      const t = totals.get(c.platform);
      if (!t) continue;
      t.spend += c.spend;
      t.revenue += c.revenue;
      t.profit += c.netProfit;
    }
    return PLATFORM_LABELS.map(({ key, label }) => {
      const t = totals.get(key)!;
      return {
        platform: label,
        spend: Math.round(t.spend * currencyRate),
        revenue: Math.round(t.revenue * currencyRate),
        profit: Math.round(t.profit * currencyRate),
      };
    });
  }, [campaigns, currencyRate]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* 1. Spend vs Net Profit vs Revenue Area Chart (2 cols) */}
      <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            <h3 className="font-extrabold text-slate-100 text-sm">مسار الأرباح والإيرادات والإنفاق (7 أيام)</h3>
          </div>
          <span className="text-xs text-slate-400">العملة: {currency}</span>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={formattedChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
              <XAxis dataKey="date" stroke="#94A3B8" fontSize={11} />
              <YAxis stroke="#94A3B8" fontSize={11} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '12px', color: '#F8FAFC' }}
              />
              <Legend verticalAlign="top" height={36} />
              <Area type="monotone" dataKey="revenue" name="الإيراد الكلي" stroke="#06B6D4" fillOpacity={0} strokeWidth={2} />
              <Area type="monotone" dataKey="netProfit" name="صافي الربح" stroke="#10B981" fillOpacity={1} fill="url(#profitGrad)" strokeWidth={3} />
              <Area type="monotone" dataKey="spend" name="الإنفاق الإعلاني" stroke="#EF4444" fillOpacity={1} fill="url(#spendGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. Platform Attribution Breakdown Bar Chart (1 col) */}
      <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <PieChart className="w-5 h-5 text-cyan-400" />
            <h3 className="font-extrabold text-slate-100 text-sm">مقارنة المنصات (Attribution)</h3>
          </div>
          <span className="text-xs text-slate-400">الإنفاق vs الأرباح</span>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={platformData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
              <XAxis dataKey="platform" stroke="#94A3B8" fontSize={11} />
              <YAxis stroke="#94A3B8" fontSize={11} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '12px', color: '#F8FAFC' }}
              />
              <Legend verticalAlign="top" height={36} />
              <Bar dataKey="spend" name="الإنفاق" fill="#64748B" radius={[6, 6, 0, 0]} />
              <Bar dataKey="profit" name="صافي الربح" fill="#10B981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
};
