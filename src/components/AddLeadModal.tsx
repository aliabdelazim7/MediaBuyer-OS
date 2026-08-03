import React, { useEffect, useState } from 'react';
import type { Campaign, Platform } from '../types/mediaBuyer';
import { Modal } from './Modal';
import { UserPlus, Check, AlertTriangle } from 'lucide-react';
import { validateLeadFields } from '../services/webhookHandler';

interface AddLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Campaigns belonging to the currently selected portfolio. */
  campaigns: Campaign[];
  onAddLead: (newLead: {
    name: string;
    email: string;
    phone: string;
    campaignId: string;
    sourcePlatform: Platform;
    estimatedValue: number;
    notes: string;
  }) => void;
}

const EMPTY = {
  name: '',
  email: '',
  phone: '',
  platform: 'meta' as Platform,
  estimatedValue: 500,
  notes: '',
};

const FIELD =
  'w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 h-11 text-slate-100 font-bold';

export const AddLeadModal: React.FC<AddLeadModalProps> = ({
  isOpen,
  onClose,
  campaigns,
  onAddLead
}) => {
  const [form, setForm] = useState(EMPTY);
  const [campaignId, setCampaignId] = useState('');
  const [error, setError] = useState<string | null>(null);

  /**
   * The modal never unmounts, so state initialised at first render leaked
   * across opens: the form kept the previous submission's values, and
   * `campaignId` kept a campaign id from whichever portfolio was selected
   * first. Because that stale id matches no <option> in the new portfolio,
   * the browser displayed the first option while React still held the old id
   * — submitting attributed the lead to another portfolio's campaign.
   */
  useEffect(() => {
    if (!isOpen) return;
    setForm(EMPTY);
    setError(null);
    setCampaignId(campaigns[0]?.id ?? '');
  }, [isOpen, campaigns]);

  const set = <K extends keyof typeof EMPTY>(key: K, value: (typeof EMPTY)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const problems = validateLeadFields({
      name: form.name,
      email: form.email,
      campaignId,
      estimatedValue: Number(form.estimatedValue),
    });
    if (problems.length > 0) {
      setError(`تعذر حفظ الليد: ${problems.join('، ')}`);
      return;
    }

    onAddLead({
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || 'غير متاح',
      campaignId,
      sourcePlatform: form.platform,
      estimatedValue: Number(form.estimatedValue),
      notes: form.notes.trim()
    });

    onClose();
  };

  const noCampaigns = campaigns.length === 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="تسجيل Lead جديد في الـ CRM"
      icon={<UserPlus className="w-5 h-5 text-emerald-400 shrink-0" aria-hidden="true" />}
    >
      {noCampaigns && (
        <div className="flex items-start gap-2 text-xs font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
          <span>لا توجد حملات في هذه المحفظة. أضف حملة أولاً لربط الليد بها.</span>
        </div>
      )}

      {error && (
        <div role="alert" className="flex items-start gap-2 text-xs font-bold text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-xl p-3">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 text-xs">

        <div>
          <label htmlFor="lead-name" className="block font-bold text-slate-300 mb-1.5">الاسم الكامل:</label>
          <input
            id="lead-name"
            type="text"
            required
            placeholder="مثال: د. محمد الشريف"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            className={`${FIELD} placeholder:text-slate-500 placeholder:font-normal`}
          />
        </div>

        {/* Single column below sm — two 50% fields at 375px leave ~150px each. */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="lead-email" className="block font-bold text-slate-300 mb-1.5">البريد الإلكتروني:</label>
            <input
              id="lead-email"
              type="email"
              required
              placeholder="m.sharif@email.com"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              className={`${FIELD} placeholder:text-slate-500 placeholder:font-normal`}
            />
          </div>
          <div>
            <label htmlFor="lead-phone" className="block font-bold text-slate-300 mb-1.5">رقم الهاتف/واتساب:</label>
            <input
              id="lead-phone"
              type="tel"
              placeholder="+20 101 234 5678"
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
              className={`${FIELD} placeholder:text-slate-500 placeholder:font-normal`}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="lead-campaign" className="block font-bold text-slate-300 mb-1.5">الحملة المصدر:</label>
            <select
              id="lead-campaign"
              required
              value={campaignId}
              onChange={(e) => setCampaignId(e.target.value)}
              disabled={noCampaigns}
              className={`${FIELD} cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {campaigns.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="lead-platform" className="block font-bold text-slate-300 mb-1.5">المنصة:</label>
            <select
              id="lead-platform"
              value={form.platform}
              onChange={(e) => set('platform', e.target.value as Platform)}
              className={`${FIELD} cursor-pointer`}
            >
              <option value="meta">Meta Ads</option>
              <option value="tiktok">TikTok Ads</option>
              <option value="google">Google Ads</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="lead-value" className="block font-bold text-slate-300 mb-1.5">القيمة المادية المتوقعة ($):</label>
          <input
            id="lead-value"
            type="number"
            min="0"
            step="1"
            required
            value={form.estimatedValue}
            onChange={(e) => set('estimatedValue', Number(e.target.value))}
            className={FIELD}
          />
        </div>

        <div>
          <label htmlFor="lead-notes" className="block font-bold text-slate-300 mb-1.5">ملاحظات العميل:</label>
          <textarea
            id="lead-notes"
            rows={2}
            maxLength={500}
            placeholder="مثال: يفضل التواصل عبر الواتساب في الفترة المسائية..."
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            aria-describedby="lead-notes-count"
            className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2.5 text-slate-100 font-bold resize-none placeholder:text-slate-500 placeholder:font-normal"
          />
          <span id="lead-notes-count" className="mt-1 block text-[11px] text-slate-400">
            {form.notes.length}/500 حرف
          </span>
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
            disabled={noCampaigns}
            className="w-1/2 h-11 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-400 disabled:cursor-not-allowed text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1 shadow-lg shadow-emerald-500/20 transition-colors cursor-pointer"
          >
            <Check className="w-4 h-4" aria-hidden="true" />
            <span>إضافة الليد الآن</span>
          </button>
        </div>

      </form>
    </Modal>
  );
};
