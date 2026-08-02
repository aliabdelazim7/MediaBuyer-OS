import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredPortfolios = portfolios.filter(p => p.name.toLowerCase().includes(query.toLowerCase()) || p.clientName.toLowerCase().includes(query.toLowerCase()));
  const filteredCampaigns = campaigns.filter(c => c.name.toLowerCase().includes(query.toLowerCase()) || c.accountName.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-start justify-center pt-20 px-4 animate-in fade-in duration-200">
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

        {/* Results */}
        <div className="max-h-80 overflow-y-auto p-3 space-y-4 text-xs">
          
          {/* Portfolios Section */}
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">المحافظ الإعلانية</div>
            <div className="space-y-1">
              {filteredPortfolios.map(p => (
                <div 
                  key={p.id}
                  onClick={() => {
                    onSelectPortfolio(p.id);
                    onClose();
                  }}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-800/80 cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <Building2 className="w-4 h-4 text-emerald-400" />
                    <div>
                      <div className="font-bold text-slate-200">{p.name}</div>
                      <div className="text-[11px] text-slate-400">{p.clientName} ({p.accounts.length} حسابات)</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </div>
              ))}
            </div>
          </div>

          {/* Campaigns Section */}
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">الحملات والمجموعات</div>
            <div className="space-y-1">
              {filteredCampaigns.map(c => (
                <div 
                  key={c.id}
                  onClick={() => onClose()}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-800/80 cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <Target className="w-4 h-4 text-cyan-400" />
                    <div>
                      <div className="font-bold text-slate-200">{c.name}</div>
                      <div className="text-[11px] text-slate-400">ROAS: {c.roas}x | CPA: ${c.cpa}</div>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 bg-slate-800 text-slate-300 rounded font-mono">
                    {c.platform.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          </div>

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
