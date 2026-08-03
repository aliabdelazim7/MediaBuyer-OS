import React, { useMemo, useState } from 'react';
import type { Campaign, Portfolio, Currency } from '../types/mediaBuyer';
import { createCurrencyFormatter } from '../lib/format';
import {
  Play,
  Pause,
  Edit2,
  Check,
  X,
  Target
} from 'lucide-react';

// No emoji: the badge already carries meaning via its Arabic label AND its
// colour, so the glyph was a third redundant channel that screen readers
// announce ("green circle") and that renders differently per platform.
const STATUS_LABEL: Record<Campaign['status'], string> = {
  active: 'نشطة',
  paused: 'متوقفة',
  warning: 'تحذير',
};

const STATUS_STYLE: Record<Campaign['status'], string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  paused: 'bg-slate-500/10 text-slate-300 border-slate-500/30',
  warning: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
};

const FILTERS: { id: 'all' | 'active' | 'warning'; label: string }[] = [
  { id: 'all', label: 'جميع الحملات' },
  { id: 'active', label: 'النشطة' },
  { id: 'warning', label: 'تحتاج انتباه' },
];

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

  const formatCurrency = useMemo(
    () => createCurrencyFormatter(currency, currencyRate),
    [currency, currencyRate]
  );

  const filteredCampaigns = useMemo(
    () => campaigns.filter(c => {
      if (filterStatus === 'active') return c.status === 'active';
      if (filterStatus === 'warning') return c.status === 'warning' || c.roas < portfolio.targetRoas || c.cpa > portfolio.targetCpa;
      return true;
    }),
    [campaigns, filterStatus, portfolio.targetRoas, portfolio.targetCpa]
  );

  const handleStartBudgetEdit = (c: Campaign) => {
    setEditingBudgetId(c.id);
    setTempBudget(c.dailyBudget);
  };

  // Guards against submitting 0 / negative / NaN budgets, which the store
  // rejects anyway — catching it here avoids a pointless error toast.
  const isBudgetValid = Number.isFinite(tempBudget) && tempBudget > 0;

  const handleSaveBudget = (id: string) => {
    if (!isBudgetValid) return;
    onUpdateCampaignBudget(id, tempBudget);
    setEditingBudgetId(null);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-md overflow-hidden space-y-4">
      
      {/* Header & Filter Tabs */}
      <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-extrabold text-slate-100 text-lg flex items-center gap-2 flex-wrap">
            <Target className="w-5 h-5 text-emerald-400 shrink-0" aria-hidden="true" />
            <span>جدول تحليل وسلوك الحملات</span>
            <span className="px-2 py-0.5 text-xs bg-slate-800 text-slate-300 rounded-full font-bold">
              {campaigns.length} حملة
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">تلوين الأرقام تلقائياً بناءً على شروط الـ ROAS والـ CPA المقبولة</p>
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center bg-slate-950 p-1 border border-slate-800 rounded-xl">
          {FILTERS.map(f => (
            <button
              key={f.id}
              aria-pressed={filterStatus === f.id}
              onClick={() => setFilterStatus(f.id)}
              className={`px-3 h-9 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                filterStatus === f.id
                  ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-start text-xs">
          <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
            <tr>
              <th scope="col" className="p-3.5 font-bold">الحملة والمنصة</th>
              <th scope="col" className="p-3.5 font-bold">الحالة</th>
              <th scope="col" className="p-3.5 font-bold">الميزانية اليومية</th>
              <th scope="col" className="p-3.5 font-bold">الإنفاق</th>
              <th scope="col" className="p-3.5 font-bold">الإيراد الحقيقي</th>
              <th scope="col" className="p-3.5 font-bold">صافي الربح</th>
              <th scope="col" className="p-3.5 font-bold">ROAS</th>
              <th scope="col" className="p-3.5 font-bold">CPA</th>
              <th scope="col" className="p-3.5 font-bold">CPL</th>
              <th scope="col" className="p-3.5 font-bold">Hook Rate (3s)</th>
              <th scope="col" className="p-3.5 font-bold">إجراء سريع</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-200">
            {filteredCampaigns.length === 0 && (
              <tr>
                <td colSpan={11} className="p-10 text-center text-slate-400">
                  {campaigns.length === 0
                    ? 'لا توجد حملات في هذه المحفظة بعد.'
                    : 'لا توجد حملات مطابقة لهذا الفلتر.'}
                </td>
              </tr>
            )}
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

                  {/* Status Badge — all three states. A paused campaign used to
                      render as "تحذير 🔴", conflating a deliberate pause with a
                      performance alert. */}
                  <td className="p-3.5">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border whitespace-nowrap ${STATUS_STYLE[c.status]}`}>
                      {STATUS_LABEL[c.status]}
                    </span>
                  </td>

                  {/* Daily Budget (Editable) */}
                  <td className="p-3.5">
                    {editingBudgetId === c.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          autoFocus
                          aria-label={`الميزانية اليومية للحملة ${c.name}`}
                          value={tempBudget}
                          onChange={(e) => setTempBudget(Number(e.target.value))}
                          aria-invalid={!isBudgetValid}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveBudget(c.id);
                            if (e.key === 'Escape') setEditingBudgetId(null);
                          }}
                          className={`w-20 h-9 bg-slate-950 border rounded-lg px-2 text-xs font-bold ${
                            isBudgetValid ? 'border-emerald-500 text-emerald-400' : 'border-rose-500 text-rose-400'
                          }`}
                        />
                        <button
                          onClick={() => handleSaveBudget(c.id)}
                          disabled={!isBudgetValid}
                          aria-label="حفظ الميزانية"
                          className="inline-flex items-center justify-center w-9 h-9 shrink-0 bg-emerald-500 text-slate-950 rounded-lg hover:bg-emerald-400 disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors cursor-pointer"
                        >
                          <Check className="w-4 h-4" aria-hidden="true" />
                        </button>
                        <button
                          onClick={() => setEditingBudgetId(null)}
                          aria-label="إلغاء التعديل"
                          className="inline-flex items-center justify-center w-9 h-9 shrink-0 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors cursor-pointer"
                        >
                          <X className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        aria-label={`تعديل ميزانية الحملة ${c.name}`}
                        className="flex items-center gap-1.5 font-bold group min-h-9 cursor-pointer hover:text-emerald-400 transition-colors"
                        onClick={() => handleStartBudgetEdit(c)}
                      >
                        <span>{formatCurrency(c.dailyBudget)}/يوم</span>
                        <Edit2 className="w-3 h-3 text-slate-400 group-hover:text-emerald-400 transition-colors" />
                      </button>
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
                      aria-label={`${c.status === 'active' ? 'إيقاف' : 'تفعيل'} حملة ${c.name}`}
                      className={`px-2.5 h-9 rounded-lg border text-xs font-bold inline-flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap ${
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
