import React from 'react';
import type { Recommendation, RecommendationAction } from '../types/mediaBuyer';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Clock,
  TrendingUp,
  TrendingDown,
  PauseCircle,
  Target,
  RefreshCw,
  ExternalLink,
  type LucideIcon,
} from 'lucide-react';

interface AIRecommendationsProps {
  recommendations: Recommendation[];
}

/** Visual treatment per action. Colour reinforces urgency, never carries it alone. */
const ACTION_STYLE: Record<
  RecommendationAction,
  { icon: LucideIcon; label: string; card: string; chip: string }
> = {
  wait: {
    icon: Clock,
    label: 'انتظار',
    card: 'border-slate-700',
    chip: 'bg-slate-800 text-slate-300 border-slate-700',
  },
  pause: {
    icon: PauseCircle,
    label: 'إيقاف',
    card: 'border-rose-500/50 bg-rose-500/5',
    chip: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  },
  reduce_budget: {
    icon: TrendingDown,
    label: 'تقليل الميزانية',
    card: 'border-amber-500/50 bg-amber-500/5',
    chip: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  },
  review_targeting: {
    icon: Target,
    label: 'مراجعة الاستهداف',
    card: 'border-amber-500/40 bg-amber-500/5',
    chip: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  },
  refresh_creative: {
    icon: RefreshCw,
    label: 'تجديد الكرياتيف',
    card: 'border-cyan-500/40 bg-cyan-500/5',
    chip: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
  },
  hold: {
    icon: CheckCircle2,
    label: 'استمرار',
    card: 'border-slate-700',
    chip: 'bg-slate-800 text-slate-300 border-slate-700',
  },
  scale: {
    icon: TrendingUp,
    label: 'توسيع',
    card: 'border-emerald-500/50 bg-emerald-500/5',
    chip: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  },
};

const CONFIDENCE: Record<Recommendation['confidence'], { label: string; className: string }> = {
  high: { label: 'ثقة عالية', className: 'text-emerald-400' },
  medium: { label: 'ثقة متوسطة', className: 'text-amber-400' },
  low: { label: 'بيانات قليلة', className: 'text-rose-400' },
};

export const AIRecommendations: React.FC<AIRecommendationsProps> = ({ recommendations }) => (
  <div className="space-y-6">

    <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800">
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-emerald-400" aria-hidden="true" />
        <h3 className="text-lg font-black text-slate-100">محرك القرارات</h3>
      </div>
      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
        كل توصية هنا <strong className="text-slate-200">محسوبة</strong> من أرقام الحملة مقارنةً
        بأهداف المحفظة — مش مكتوبة مسبقاً. تحت كل توصية هتلاقي الأرقام اللي بنيت عليها عشان تقدر
        تتأكد بنفسك من Ads Manager.
      </p>
      {/*
        The app is read-only against Meta by design. A local "apply" would
        show a budget change Meta never received, and the next sync would
        silently revert it — reporting a scale-up that never happened.
      */}
      <p className="mt-3 flex items-start gap-2 text-[11px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-xl p-2.5">
        <ExternalLink className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
        <span>
          التنفيذ بيتم من Ads Manager. التطبيق ده بيحلّل بس ومش بيعدّل أي حاجة على Meta — عشان
          ميوريكش تغيير ما وصلش فعلاً.
        </span>
      </p>
    </div>

    {recommendations.length === 0 && (
      <div className="py-16 px-6 text-center border border-dashed border-slate-800 rounded-2xl">
        <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-3" aria-hidden="true" />
        <p className="text-sm text-slate-300 font-bold">مفيش أي إجراء مطلوب دلوقتي</p>
        <p className="text-xs text-slate-400 mt-1">
          كل حملات المحفظة دي ضمن الأهداف المعتمدة ومفيش مشاكل في الكرياتيف.
        </p>
      </div>
    )}

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {recommendations.map((rec) => {
        const style = ACTION_STYLE[rec.action];
        const Icon = style.icon;
        const conf = CONFIDENCE[rec.confidence];

        return (
          <article
            key={rec.id}
            className={`bg-slate-900/90 border rounded-2xl p-5 shadow-md space-y-4 ${style.card}`}
          >
            <header className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${style.chip}`}>
                  <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  {style.label}
                </span>
                <h4 className="font-bold text-slate-100 text-sm mt-2">{rec.title}</h4>
                <p className="text-[11px] text-slate-400 mt-0.5 truncate" title={rec.campaignName}>
                  {rec.campaignName}
                </p>
              </div>
              <span className={`text-[11px] font-bold shrink-0 ${conf.className}`}>
                {conf.label}
              </span>
            </header>

            <dl className="space-y-3 text-xs">
              <div>
                <dt className="font-bold text-slate-300 mb-1">اللي شفناه:</dt>
                <dd className="text-slate-300 leading-relaxed bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                  {rec.whatWeSaw}
                </dd>
              </div>
              <div>
                <dt className="font-bold text-slate-300 mb-1">ليه ده مهم:</dt>
                <dd className="text-slate-400 leading-relaxed">{rec.whyItMatters}</dd>
              </div>
              <div>
                <dt className="font-bold text-emerald-400 mb-1">اعمل إيه:</dt>
                <dd className="text-slate-200 leading-relaxed font-medium">{rec.whatToDo}</dd>
              </div>
            </dl>

            {/* The working, shown so the verdict can be checked by hand. */}
            <div className="pt-3 border-t border-slate-800/80">
              <p className="text-[11px] font-bold text-slate-400 mb-2">الأرقام اللي بنينا عليها:</p>
              <ul className="space-y-1.5">
                {rec.evidence.map((e) => (
                  <li key={e.label} className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="flex items-center gap-1.5 text-slate-400">
                      {e.ok ? (
                        <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" aria-hidden="true" />
                      ) : (
                        <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" aria-hidden="true" />
                      )}
                      {e.label}
                    </span>
                    {/*
                      dir="ltr" is load-bearing, not cosmetic. These strings
                      mix a comparison operator with a number inside an RTL
                      paragraph, and the bidi algorithm mirrors the operator:
                      a target of "≤ $22" rendered as "$22 ≥", inverting the
                      meaning of every threshold on screen.
                    */}
                    <span dir="ltr" className="font-mono text-slate-300 text-left">
                      <span className={e.ok ? 'text-emerald-400' : 'text-rose-400'}>{e.actual}</span>
                      {e.target !== '—' && <span className="text-slate-400"> / {e.target}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </article>
        );
      })}
    </div>
  </div>
);
