import React, { useEffect, useState } from 'react';
import type { Portfolio } from '../types/mediaBuyer';
import { Modal } from './Modal';
import { Sliders, Check } from 'lucide-react';

interface ThresholdSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  portfolio: Portfolio;
  onSaveThresholds: (targetRoas: number, targetCpa: number, targetCpl: number, targetHookRate: number) => void;
}

const FIELD =
  'w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 h-11 text-slate-100 font-bold';

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

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveThresholds(Number(roas), Number(cpa), Number(cpl), Number(hookRate));
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="تعديل شروط وتقييمات الأخضر/الأحمر"
      icon={<Sliders className="w-5 h-5 text-emerald-400 shrink-0" aria-hidden="true" />}
    >
      <p className="text-xs text-slate-400 leading-relaxed">
        تحديد الحدود الأدنى والأعلى لكل محفظة لبدء التلوين التلقائي والتنبيهات. الأهداف الحالية
        لمحفظة <strong className="text-slate-200">{portfolio.name}</strong>:
      </p>

      <form onSubmit={handleSave} className="space-y-4 text-xs">

        <div>
          <label htmlFor="target-roas" className="block font-bold text-slate-300 mb-1.5">
            الحد الأدنى للـ ROAS المقبول (Target ROAS):
          </label>
          <input
            id="target-roas"
            type="number"
            step="0.1"
            min="0.1"
            required
            value={roas}
            onChange={(e) => setRoas(Number(e.target.value))}
            aria-describedby="target-roas-hint"
            className={FIELD}
          />
          <span id="target-roas-hint" className="mt-1 block text-[11px] text-slate-400">
            أي ROAS أقل من هذا الرقم سيظهر باللون الأحمر
          </span>
        </div>

        <div>
          <label htmlFor="target-cpa" className="block font-bold text-slate-300 mb-1.5">
            الحد الأقصى لتكلفة المبيعة (Target CPA - USD):
          </label>
          <input
            id="target-cpa"
            type="number"
            step="1"
            min="1"
            required
            value={cpa}
            onChange={(e) => setCpa(Number(e.target.value))}
            className={FIELD}
          />
        </div>

        <div>
          <label htmlFor="target-cpl" className="block font-bold text-slate-300 mb-1.5">
            الحد الأقصى لتكلفة الليد (Target CPL - USD):
          </label>
          <input
            id="target-cpl"
            type="number"
            step="1"
            min="1"
            required
            value={cpl}
            onChange={(e) => setCpl(Number(e.target.value))}
            className={FIELD}
          />
        </div>

        <div>
          <label htmlFor="target-hook" className="block font-bold text-slate-300 mb-1.5">
            الحد الأدنى لـ Hook Rate للفيديو (%):
          </label>
          <input
            id="target-hook"
            type="number"
            step="1"
            min="0"
            max="100"
            required
            value={hookRate}
            onChange={(e) => setHookRate(Number(e.target.value))}
            className={FIELD}
          />
        </div>

        <div className="pt-4 border-t border-slate-800 flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-1/2 h-11 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            إلغاء
          </button>
          <button
            type="submit"
            className="w-1/2 h-11 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1 shadow-lg shadow-emerald-500/20 transition-colors cursor-pointer"
          >
            <Check className="w-4 h-4" aria-hidden="true" />
            <span>حفظ الشروط</span>
          </button>
        </div>

      </form>
    </Modal>
  );
};
