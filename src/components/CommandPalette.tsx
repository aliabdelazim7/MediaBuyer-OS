import React, { useState, useEffect, useMemo } from 'react';
import type { Portfolio, Campaign } from '../types/mediaBuyer';
import { Search, Building2, Target, X, ChevronRight } from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  portfolios: Portfolio[];
  campaigns: Campaign[];
  onSelectPortfolio: (id: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  portfolios,
  campaigns,
  onSelectPortfolio
}) => {
  const [query, setQuery] = useState('');

  // Cmd/Ctrl+K is owned by App so the shortcut can also *open* the palette.
  // This listener only handles dismissal.
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset the query each time the palette opens.
  useEffect(() => {
    if (isOpen) setQuery('');
  }, [isOpen]);

  const needle = query.trim().toLowerCase();
  const filteredPortfolios = useMemo(
    () => portfolios.filter(p =>
      p.name.toLowerCase().includes(needle) || p.clientName.toLowerCase().includes(needle)),
    [portfolios, needle]
  );
  const filteredCampaigns = useMemo(
    () => campaigns.filter(c =>
      c.name.toLowerCase().includes(needle) || c.accountName.toLowerCase().includes(needle)),
    [campaigns, needle]
  );

  if (!isOpen) return null;

  const hasResults = filteredPortfolios.length > 0 || filteredCampaigns.length > 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="لوحة البحث السريع"
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-start justify-center pt-20 px-4 animate-in fade-in duration-200"
    >
      <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        
        {/* Input */}
        <div className="p-4 border-b border-slate-800 flex items-center gap-3">
          <Search className="w-5 h-5 text-emerald-400" />
          <input 
            type="text" 
            autoFocus
            placeholder="ابحث عن محفظة، حساب، أو اسم حملة..." 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm font-medium text-slate-100 outline-none placeholder:text-slate-500"
          />
          <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results — rendered as buttons so they are keyboard-reachable. */}
        <div className="max-h-80 overflow-y-auto p-3 space-y-4 text-xs">

          {!hasResults && (
            <div className="py-10 text-center text-slate-400">
              لا توجد نتائج مطابقة لـ "{query}"
            </div>
          )}

          {filteredPortfolios.length > 0 && (
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">المحافظ الإعلانية</div>
              <div className="space-y-1">
                {filteredPortfolios.map(p => (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => {
                      onSelectPortfolio(p.id);
                      onClose();
                    }}
                    className="w-full text-right flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-800/80 focus:bg-slate-800/80 focus:outline-none transition-all"
                  >
                    <div className="flex items-center gap-2.5">
                      <Building2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div>
                        <div className="font-bold text-slate-200">{p.name}</div>
                        <div className="text-[11px] text-slate-400">{p.clientName} ({p.accounts.length} حسابات)</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {filteredCampaigns.length > 0 && (
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">الحملات والمجموعات</div>
              <div className="space-y-1">
                {filteredCampaigns.map(c => (
                  <button
                    type="button"
                    key={c.id}
                    // Selecting a campaign now navigates to its portfolio.
                    // Previously this only closed the palette, so searching for
                    // a campaign in another portfolio did nothing at all.
                    onClick={() => {
                      onSelectPortfolio(c.portfolioId);
                      onClose();
                    }}
                    className="w-full text-right flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-800/80 focus:bg-slate-800/80 focus:outline-none transition-all"
                  >
                    <div className="flex items-center gap-2.5">
                      <Target className="w-4 h-4 text-cyan-400 shrink-0" />
                      <div>
                        <div className="font-bold text-slate-200">{c.name}</div>
                        <div className="text-[11px] text-slate-400">ROAS: {c.roas}x | CPA: ${c.cpa}</div>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 bg-slate-800 text-slate-300 rounded font-mono shrink-0">
                      {c.platform.toUpperCase()}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
          <span>استخدم <kbd className="px-1 py-0.5 bg-slate-800 rounded font-mono">Esc</kbd> للإغلاق</span>
          <span className="text-emerald-400 font-bold">MediaBuyer OS Fast Nav</span>
        </div>

      </div>
    </div>
  );
};
