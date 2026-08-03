import React, { useEffect, useState } from 'react';
import type { Portfolio } from '../types/mediaBuyer';
import { Sliders, X, Check } from 'lucide-react';

interface ThresholdSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  portfolio: Portfolio;
  onSaveThresholds: (targetRoas: number, targetCpa: number, targetCpl: number, targetHookRate: number) => void;
}

export const ThresholdSettingsModal: React.FC<ThresholdSettingsModalProps> = ({
  isOpen,
  onClose,
  portfolio,
  onSaveThresholds
}) => {
  const [roas, setRoas] = useState(portfolio.targetRoas);
  const [cpa, setCpa] = useState(portfolio.targetCpa);
  const [cpl, setCpl] = useState(portfolio.targetCpl);
  const [hookRate, setHookRate] = useState(portfolio.targetHookRate);

  /**
   * The modal stays mounted while closed, so the initial `useState` values are
   * only ever the FIRST portfolio's. Without this resync, opening the modal
   * after switching portfolios showed the wrong targets and saving them
   * overwrote the current portfolio with another portfolio's thresholds.
   */
  useEffect(() => {
    if (!isOpen) return;
    setRoas(portfolio.targetRoas);
    setCpa(portfolio.targetCpa);
    setCpl(portfolio.targetCpl);
    setHookRate(portfolio.targetHookRate);
  }, [isOpen, portfolio]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveThresholds(Number(roas), Number(cpa), Number(cpl), Number(hookRate));
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="تعديل شروط وتقييمات الأداء"
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden text-slate-100 p-6 space-y-5">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-emerald-400" />
            <h3 className="font-extrabold text-slate-100 text-base">تعديل شروط وتقييمات الأخضر/الأحمر</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-400">
          تحديد الحدود الأدنى والأعلى لكل محفظة لبدء التلوين التلقائي (الأخضر/الأحمر) والتنبيهات:
        </p>

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          
          {/* Target ROAS */}
          <div>
            <label className="block font-bold text-slate-300 mb-1">الحد الأدنى للـ ROAS المقبول (Target ROAS):</label>
            <input 
              type="number" 
              step="0.1"
              min="0.1"
              required
              value={roas}
              onChange={(e) => setRoas(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-slate-100 font-bold outline-none"
            />
            <span className="text-[10px] text-slate-500">أي ROAS أقل من هذا الرقم سيظهر باللون الأحمر 🔴</span>
          </div>

          {/* Target CPA */}
          <div>
            <label className="block font-bold text-slate-300 mb-1">الحد الأقصى لتكلفة المبيعة (Target CPA - USD):</label>
            <input 
              type="number" 
              step="1"
              min="1"
              required
              value={cpa}
              onChange={(e) => setCpa(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-slate-100 font-bold outline-none"
            />
          </div>

          {/* Target CPL */}
          <div>
            <label className="block font-bold text-slate-300 mb-1">الحد الأقصى لتكلفة الليد (Target CPL - USD):</label>
            <input 
              type="number" 
              step="1"
              min="1"
              required
              value={cpl}
              onChange={(e) => setCpl(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-slate-100 font-bold outline-none"
            />
          </div>

          {/* Target Hook Rate */}
          <div>
            <label className="block font-bold text-slate-300 mb-1">الحد الأدنى لـ Hook Rate للفيديو (%):</label>
            <input 
              type="number" 
              step="1"
              min="0"
              max="100"
              required
              value={hookRate}
              onChange={(e) => setHookRate(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-slate-100 font-bold outline-none"
            />
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="w-1/2 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1 shadow-lg shadow-emerald-500/20"
            >
              <Check className="w-4 h-4" />
              <span>حفظ الشروط</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
