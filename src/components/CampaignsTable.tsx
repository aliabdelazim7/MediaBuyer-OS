import React, { useState } from 'react';
import type { Campaign, Portfolio, Currency } from '../types/mediaBuyer';
import { 
  Play, 
  Pause, 
  Edit2, 
  Check 
} from 'lucide-react';

interface CampaignsTableProps {
  portfolio: Portfolio;
  campaigns: Campaign[];
  currency: Currency;
  currencyRate: number;
  onUpdateCampaignBudget: (campaignId: string, newBudget: number) => void;
  onToggleCampaignStatus: (campaignId: string) => void;
}

export const CampaignsTable: React.FC<CampaignsTableProps> = ({
  portfolio,
  campaigns,
  currency,
  currencyRate,
  onUpdateCampaignBudget,
  onToggleCampaignStatus
}) => {
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'warning'>('all');
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [tempBudget, setTempBudget] = useState<number>(0);

  const formatCurrency = (val: number) => {
    const converted = val * currencyRate;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency, maximumFractionDigits: 0 }).format(converted);
  };

  const filteredCampaigns = campaigns.filter(c => {
    if (filterStatus === 'active') return c.status === 'active';
    if (filterStatus === 'warning') return c.status === 'warning' || c.roas < portfolio.targetRoas || c.cpa > portfolio.targetCpa;
    return true;
  });

  const handleStartBudgetEdit = (c: Campaign) => {
    setEditingBudgetId(c.id);
    setTempBudget(c.dailyBudget);
  };

  const handleSaveBudget = (id: string) => {
    onUpdateCampaignBudget(id, tempBudget);
    setEditingBudgetId(null);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-md overflow-hidden space-y-4">
      
      {/* Header & Filter Tabs */}
      <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-extrabold text-slate-100 text-lg flex items-center gap-2">
            <span>🎯 جدول تحليل وسلوك الحملات (Campaign Performance Hub)</span>
            <span className="px-2 py-0.5 text-xs bg-slate-800 text-slate-300 rounded-full font-bold">
              {campaigns.length} حملة
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">تلوين الأرقام تلقائياً بناءً على شروط الـ ROAS والـ CPA المقبولة</p>
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center bg-slate-950 p-1 border border-slate-800 rounded-xl">
          {[
            { id: 'all', label: 'جميع الحملات' },
            { id: 'active', label: '🟢 النشطة' },
            { id: 'warning', label: '🔴 تحظى بتنبيه' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterStatus(f.id as any)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                filterStatus === f.id ? 'bg-slate-800 text-emerald-400 border border-slate-700' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-right text-xs">
          <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
            <tr>
              <th className="p-3.5 font-bold">الحملة والمنصة</th>
              <th className="p-3.5 font-bold">الحالة</th>
              <th className="p-3.5 font-bold">الميزانية اليومية</th>
              <th className="p-3.5 font-bold">الإنفاق</th>
              <th className="p-3.5 font-bold">الإيراد الحقيقي</th>
              <th className="p-3.5 font-bold">صافي الربح</th>
              <th className="p-3.5 font-bold">ROAS</th>
              <th className="p-3.5 font-bold">CPA</th>
              <th className="p-3.5 font-bold">CPL</th>
              <th className="p-3.5 font-bold">Hook Rate (3s)</th>
              <th className="p-3.5 font-bold">إجراء سريع</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-200">
            {filteredCampaigns.map(c => {
              const isRoasGood = c.roas >= portfolio.targetRoas;
              const isCpaGood = c.cpa <= portfolio.targetCpa;
              const isHookGood = c.hookRate >= portfolio.targetHookRate;

              return (
                <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                  
                  {/* Name & Platform */}
                  <td className="p-3.5">
                    <div className="font-bold text-slate-100 flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${c.platform === 'meta' ? 'bg-blue-500' : c.platform === 'tiktok' ? 'bg-pink-500' : 'bg-amber-500'}`} />
                      <span>{c.name}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      الحساب: <span className="text-slate-300">{c.accountName}</span>
                    </div>
                  </td>

                  {/* Status Badge */}
                  <td className="p-3.5">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                      c.status === 'active' 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    }`}>
                      {c.status === 'active' ? 'نشطة 🟢' : 'تحذير 🔴'}
                    </span>
                  </td>

                  {/* Daily Budget (Editable) */}
                  <td className="p-3.5">
                    {editingBudgetId === c.id ? (
                      <div className="flex items-center gap-1">
                        <input 
                          type="number" 
                          value={tempBudget} 
                          onChange={(e) => setTempBudget(Number(e.target.value))}
                          className="w-20 bg-slate-950 border border-emerald-500 rounded px-1.5 py-1 text-xs text-emerald-400 font-bold outline-none"
                        />
                        <button 
                          onClick={() => handleSaveBudget(c.id)}
                          className="p-1 bg-emerald-500 text-slate-950 rounded hover:bg-emerald-400"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 font-bold group cursor-pointer" onClick={() => handleStartBudgetEdit(c)}>
                        <span>{formatCurrency(c.dailyBudget)}/يوم</span>
                        <Edit2 className="w-3 h-3 text-slate-400 group-hover:text-emerald-400 transition-colors" />
                      </div>
                    )}
                  </td>

                  {/* Spend */}
                  <td className="p-3.5 text-slate-300 font-medium">
                    {formatCurrency(c.spend)}
                  </td>

                  {/* Revenue */}
                  <td className="p-3.5 text-slate-100 font-bold">
                    {formatCurrency(c.revenue)}
                  </td>

                  {/* Net Profit */}
                  <td className={`p-3.5 font-black ${c.netProfit > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {formatCurrency(c.netProfit)}
                  </td>

                  {/* ROAS (Green or Red) */}
                  <td className="p-3.5">
                    <span className={`px-2 py-0.5 font-black text-xs rounded border ${
                      isRoasGood 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    }`}>
                      {c.roas.toFixed(2)}x
                    </span>
                  </td>

                  {/* CPA (Green or Red) */}
                  <td className="p-3.5">
                    <span className={`px-2 py-0.5 font-bold text-xs rounded border ${
                      isCpaGood 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    }`}>
                      {formatCurrency(c.cpa)}
                    </span>
                  </td>

                  {/* CPL */}
                  <td className="p-3.5 text-slate-200">
                    {formatCurrency(c.cpl)} ({c.leadsCount} ليد)
                  </td>

                  {/* Hook Rate */}
                  <td className="p-3.5">
                    {c.hookRate > 0 ? (
                      <span className={`px-2 py-0.5 font-bold text-xs rounded border ${
                        isHookGood 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                      }`}>
                        {c.hookRate.toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[11px]">غير متاح (Search)</span>
                    )}
                  </td>

                  {/* Quick Action Button */}
                  <td className="p-3.5">
                    <button
                      onClick={() => onToggleCampaignStatus(c.id)}
                      className={`p-1.5 rounded-lg border text-xs font-bold flex items-center gap-1 transition-all ${
                        c.status === 'active'
                          ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-rose-500/20 hover:text-rose-400 hover:border-rose-500/40'
                          : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30'
                      }`}
                    >
                      {c.status === 'active' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      <span>{c.status === 'active' ? 'إيقاف' : 'تفعيل'}</span>
                    </button>
                  </td>

                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
