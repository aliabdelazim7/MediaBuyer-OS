import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Portfolio, Campaign } from '../types/mediaBuyer';
import { Search, Building2, Target, X, ChevronLeft } from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  portfolios: Portfolio[];
  campaigns: Campaign[];
  onSelectPortfolio: (id: string) => void;
}

type Row =
  | { kind: 'portfolio'; id: string; portfolio: Portfolio }
  | { kind: 'campaign'; id: string; campaign: Campaign };

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  portfolios,
  campaigns,
  onSelectPortfolio
}) => {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const needle = query.trim().toLowerCase();

  const portfolioRows = useMemo<Row[]>(
    () => portfolios
      .filter(p => p.name.toLowerCase().includes(needle) || p.clientName.toLowerCase().includes(needle))
      .map(p => ({ kind: 'portfolio', id: p.id, portfolio: p })),
    [portfolios, needle]
  );

  const campaignRows = useMemo<Row[]>(
    () => campaigns
      .filter(c => c.name.toLowerCase().includes(needle) || c.accountName.toLowerCase().includes(needle))
      .map(c => ({ kind: 'campaign', id: c.id, campaign: c })),
    [campaigns, needle]
  );

  // Flat list backing keyboard navigation across both sections.
  const rows = useMemo(() => [...portfolioRows, ...campaignRows], [portfolioRows, campaignRows]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActiveIndex(0);
    }
  }, [isOpen]);

  // Clamp the cursor when filtering shrinks the list under it.
  useEffect(() => {
    setActiveIndex(i => Math.min(i, Math.max(rows.length - 1, 0)));
  }, [rows.length]);

  const select = (row: Row) => {
    // Both row types navigate to a portfolio; selecting a campaign used to
    // only close the palette, so searching for a campaign did nothing.
    onSelectPortfolio(row.kind === 'portfolio' ? row.portfolio.id : row.campaign.portfolioId);
    onClose();
  };

  // Cmd/Ctrl+K is owned by App so the shortcut can also *open* the palette.
  // This handles dismissal and in-list navigation only.
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex(i => (rows.length ? (i + 1) % rows.length : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex(i => (rows.length ? (i - 1 + rows.length) % rows.length : 0));
      } else if (e.key === 'Enter' && rows[activeIndex]) {
        e.preventDefault();
        select(rows[activeIndex]);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // `rows`/`activeIndex` are read inside the handler, so the listener is
    // re-bound when they change rather than closing over stale values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, onClose, rows, activeIndex]);

  // Keep the highlighted row inside the scroll viewport.
  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [isOpen]);

  if (!isOpen) return null;

  const rowClass = (index: number) =>
    `w-full text-start flex items-center justify-between gap-3 p-3 min-h-11 rounded-xl transition-colors cursor-pointer ${
      index === activeIndex ? 'bg-slate-800' : 'hover:bg-slate-800/60'
    }`;

  return (
    <div
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-start justify-center pt-16 sm:pt-20 px-4 animate-in fade-in"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="لوحة البحث السريع"
        className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-2xl shadow-2xl text-slate-100 flex flex-col max-h-[calc(100dvh-6rem)]"
      >
        <div className="p-3 border-b border-slate-800 flex items-center gap-3 shrink-0">
          <Search className="w-5 h-5 text-emerald-400 shrink-0" aria-hidden="true" />
          <label htmlFor="palette-input" className="sr-only">ابحث عن محفظة أو حملة</label>
          <input
            id="palette-input"
            type="text"
            autoFocus
            placeholder="ابحث عن محفظة، حساب، أو اسم حملة..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm font-medium text-slate-100 placeholder:text-slate-400"
          />
          <button
            onClick={onClose}
            aria-label="إغلاق"
            className="inline-flex items-center justify-center min-w-11 min-h-11 shrink-0 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div ref={listRef} className="overflow-y-auto p-3 space-y-4 text-xs">
          {rows.length === 0 && (
            <p className="py-10 text-center text-slate-400">
              لا توجد نتائج مطابقة لـ "{query}"
            </p>
          )}

          {portfolioRows.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">المحافظ الإعلانية</div>
              <div className="space-y-1">
                {portfolioRows.map((row, i) => {
                  const p = row.kind === 'portfolio' ? row.portfolio : null;
                  if (!p) return null;
                  return (
                    <button
                      type="button"
                      key={p.id}
                      data-index={i}
                      onMouseEnter={() => setActiveIndex(i)}
                      onClick={() => select(row)}
                      className={rowClass(i)}
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <Building2 className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
                        <span className="min-w-0">
                          <span className="block font-bold text-slate-200 truncate">{p.name}</span>
                          <span className="block text-[11px] text-slate-400 truncate">{p.clientName} ({p.accounts.length} حسابات)</span>
                        </span>
                      </span>
                      <ChevronLeft className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {campaignRows.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">الحملات والمجموعات</div>
              <div className="space-y-1">
                {campaignRows.map((row, i) => {
                  const c = row.kind === 'campaign' ? row.campaign : null;
                  if (!c) return null;
                  const index = portfolioRows.length + i;
                  return (
                    <button
                      type="button"
                      key={c.id}
                      data-index={index}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => select(row)}
                      className={rowClass(index)}
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <Target className="w-4 h-4 text-cyan-400 shrink-0" aria-hidden="true" />
                        <span className="min-w-0">
                          <span className="block font-bold text-slate-200 truncate">{c.name}</span>
                          <span className="block text-[11px] text-slate-400">ROAS: {c.roas}x | CPA: ${c.cpa}</span>
                        </span>
                      </span>
                      <span className="text-[11px] px-2 py-0.5 bg-slate-800 text-slate-300 rounded font-mono shrink-0">
                        {c.platform.toUpperCase()}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="p-3 bg-slate-950 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between gap-2 shrink-0 rounded-b-2xl">
          <span className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono">↑↓</kbd> للتنقل
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono">Enter</kbd> للاختيار
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono">Esc</kbd> للإغلاق
          </span>
        </div>
      </div>
    </div>
  );
};
