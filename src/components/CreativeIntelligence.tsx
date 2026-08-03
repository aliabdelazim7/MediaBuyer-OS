import React, { useMemo } from 'react';
import type { Creative, Portfolio, Currency } from '../types/mediaBuyer';
import { createCurrencyFormatter } from '../lib/format';
import { Video, AlertTriangle, Sparkles, Flame } from 'lucide-react';

interface CreativeIntelligenceProps {
  creatives: Creative[];
  portfolio: Portfolio;
  currency: Currency;
  baseCurrency: Currency;
}

export const CreativeIntelligence: React.FC<CreativeIntelligenceProps> = ({
  creatives,
  portfolio,
  currency,
  baseCurrency
}) => {
  const formatCurrency = useMemo(
    () => createCurrencyFormatter(currency, baseCurrency),
    [currency, baseCurrency]
  );

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-black text-slate-100">لوحة تحليل الفيديوهات والـ Hook Rate (Creative Asset Intelligence)</h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            ربط أدوات الرؤية بالذكاء الاصطناعي لتوقع تشبع الإعلان (Creative Fatigue) وتوصيات تحسين أول 3 ثوانٍ
          </p>
        </div>
        <span className="px-3 py-1 bg-amber-500/10 text-amber-300 border border-amber-500/30 text-xs font-bold rounded-lg whitespace-nowrap">
          {creatives.length} إعلانات مصنفة
        </span>
      </div>

      {creatives.length === 0 && (
        <div className="py-16 text-center text-sm text-slate-400 border border-dashed border-slate-800 rounded-2xl">
          لا توجد كريتيفات مرتبطة بحملات هذه المحفظة.
        </div>
      )}

      {/* Creatives Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {creatives.map(cr => {
          const isFatigued = cr.fatigueStatus === 'fatigued';

          return (
            <div 
              key={cr.id} 
              className={`bg-slate-900/90 border rounded-2xl overflow-hidden shadow-md transition-all ${
                isFatigued ? 'border-rose-500/50 shadow-rose-500/10' : 'border-slate-800 hover:border-emerald-500/40'
              }`}
            >
              {/* Media Thumbnail Container */}
              <div className="relative h-44 w-full bg-slate-950 overflow-hidden">
                <img
                  src={cr.thumbnailUrl}
                  alt={cr.title}
                  loading="lazy"
                  decoding="async"
                  width={300}
                  height={176}
                  className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity"
                />
                
                {/* Type Badge */}
                <div className="absolute top-3 start-3 px-2 py-1 bg-slate-950/80 backdrop-blur-md rounded-md text-[11px] font-bold text-slate-200 border border-slate-800 flex items-center gap-1">
                  <Video className="w-3 h-3 text-cyan-400" />
                  <span>{cr.type.toUpperCase()}</span>
                </div>

                {/* Fatigue Warning Banner */}
                {isFatigued && (
                  <div className="absolute bottom-0 inset-x-0 bg-rose-600/90 text-white text-[11px] font-bold py-1 px-3 flex items-center justify-between backdrop-blur-sm">
                    <span className="flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> Creative Fatigue متفاقم!
                    </span>
                    <span>Hook Rate {cr.hookRate}%</span>
                  </div>
                )}
              </div>

              {/* Content Details */}
              <div className="p-4 space-y-3">
                <h4 className="font-bold text-slate-100 text-xs line-clamp-1">{cr.title}</h4>
                <p className="text-[11px] text-slate-400">الحملة: {cr.campaignName}</p>

                {/* Performance Metrics Row */}
                <div className="grid grid-cols-3 gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 text-center">
                  <div>
                    <div className="text-[11px] text-slate-400">الإنفاق</div>
                    <div className="text-xs font-bold text-slate-200 mt-0.5">{formatCurrency(cr.spend)}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400">Hook Rate (3s)</div>
                    <div className={`text-xs font-extrabold mt-0.5 ${cr.hookRate >= portfolio.targetHookRate ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {cr.hookRate}%
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400">ROAS</div>
                    <div className={`text-xs font-extrabold mt-0.5 ${cr.roas >= portfolio.targetRoas ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {cr.roas}x
                    </div>
                  </div>
                </div>

                {/* AI Suggestion Box */}
                <div className={`p-3 rounded-xl border text-xs leading-relaxed ${
                  isFatigued 
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-300' 
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                }`}>
                  <div className="flex items-center gap-1.5 font-bold mb-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>توصية الذكاء الاصطناعي:</span>
                  </div>
                  <p className="text-[11px]">{cr.suggestion}</p>
                </div>

              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
