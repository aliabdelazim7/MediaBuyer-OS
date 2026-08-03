import React from 'react';
import type { AIRecommendation } from '../types/mediaBuyer';
import { Sparkles, Zap, CheckCircle2 } from 'lucide-react';

interface AIRecommendationsProps {
  recommendations: AIRecommendation[];
  onApplyRecommendation: (id: string) => void;
}

export const AIRecommendations: React.FC<AIRecommendationsProps> = ({
  recommendations,
  onApplyRecommendation
}) => {
  return (
    <div className="space-y-6">
      
      {/* Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-400 animate-pulse" />
            <h3 className="text-lg font-black text-slate-100">محرك توصيات وتنبيهات الذكاء الاصطناعي (AI Decision Engine)</h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            اقتراحات قائمة على تحليل البيانات اللحظية والفرق بين الأرقام المحققة والشروط المعتمدة (1-Click Binary Actions)
          </p>
        </div>
      </div>

      {recommendations.length === 0 && (
        <div className="py-16 text-center text-sm text-slate-400 border border-dashed border-slate-800 rounded-2xl">
          لا توجد اقتراحات لهذه المحفظة حالياً — كل الحملات ضمن الحدود المعتمدة. ✅
        </div>
      )}

      {/* Recommendations Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {recommendations.map(rec => (
          <div 
            key={rec.id}
            className={`bg-slate-900/90 border rounded-2xl p-5 shadow-md flex flex-col justify-between transition-all ${
              rec.applied 
                ? 'border-slate-800 opacity-60' 
                : rec.type === 'scale' 
                ? 'border-emerald-500/40 bg-emerald-500/5' 
                : 'border-amber-500/40 bg-amber-500/5'
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                  rec.type === 'scale' 
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                }`}>
                  {rec.title}
                </span>
                {rec.applied && (
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> تم التطبيق
                  </span>
                )}
              </div>

              <h4 className="font-bold text-slate-100 text-sm">الحملة: {rec.campaignName}</h4>

              <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                {rec.description}
              </p>

              {/* Projected Impact */}
              <div className="flex items-center justify-between p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs">
                <span className="text-slate-400 font-medium">الأثر المالي المتوقع:</span>
                <span className="font-extrabold text-emerald-400">{rec.projectedImpact}</span>
              </div>
            </div>

            {/* Action Button */}
            <div className="mt-5 pt-3 border-t border-slate-800/80">
              <button
                onClick={() => onApplyRecommendation(rec.id)}
                disabled={rec.applied}
                className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  rec.applied
                    ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/20'
                }`}
              >
                {rec.applied ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>تم تنفيذ الإجراء بنجاح</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>{rec.actionText}</span>
                  </>
                )}
              </button>
            </div>

          </div>
        ))}
      </div>

    </div>
  );
};
