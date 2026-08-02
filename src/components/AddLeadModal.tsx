import React, { useState } from 'react';
import type { Portfolio, Campaign, Platform } from '../types/mediaBuyer';
import { UserPlus, X, Check } from 'lucide-react';

interface AddLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  portfolio: Portfolio;
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

export const AddLeadModal: React.FC<AddLeadModalProps> = ({
  isOpen,
  onClose,
  campaigns,
  onAddLead
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [campaignId, setCampaignId] = useState(campaigns[0]?.id || '');
  const [platform, setPlatform] = useState<Platform>('meta');
  const [estimatedValue, setEstimatedValue] = useState<number>(500);
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;

    onAddLead({
      name,
      email,
      phone: phone || '+20 100 000 0000',
      campaignId,
      sourcePlatform: platform,
      estimatedValue: Number(estimatedValue),
      notes
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden text-slate-100 p-6 space-y-5">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-emerald-400" />
            <h3 className="font-extrabold text-slate-100 text-base">تسجيل Lead جديد في الـ CRM</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          
          <div>
            <label className="block font-bold text-slate-300 mb-1">الاسم الكامل:</label>
            <input 
              type="text" 
              required
              placeholder="مثال: د. محمد الشريف"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-slate-100 font-bold outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-300 mb-1">البريد الإلكتروني:</label>
              <input 
                type="email" 
                required
                placeholder="m.sharif@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-slate-100 font-bold outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-300 mb-1">رقم الهاتف/واتساب:</label>
              <input 
                type="text" 
                placeholder="+20 101 234 5678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-slate-100 font-bold outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-300 mb-1">الحملة المصدر:</label>
              <select 
                value={campaignId}
                onChange={(e) => setCampaignId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-slate-100 font-bold outline-none cursor-pointer"
              >
                {campaigns.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-300 mb-1">المنصة:</label>
              <select 
                value={platform}
                onChange={(e) => setPlatform(e.target.value as Platform)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-slate-100 font-bold outline-none cursor-pointer"
              >
                <option value="meta">Meta Ads</option>
                <option value="tiktok">TikTok Ads</option>
                <option value="google">Google Ads</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-300 mb-1">القيمة المادية المتوقعة ($):</label>
            <input 
              type="number" 
              value={estimatedValue}
              onChange={(e) => setEstimatedValue(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-slate-100 font-bold outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-300 mb-1">ملاحظات العميل:</label>
            <textarea 
              rows={2}
              placeholder="مثال: يفضل التواصل عبر الواتساب في الفترة المسائية..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-slate-100 font-bold outline-none resize-none"
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
              <span>إضافة الليد الآن</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
