import React, { useMemo } from 'react';
import type { Lead, LeadStatus, Currency } from '../types/mediaBuyer';
import { createCurrencyFormatter } from '../lib/format';
import { UserCheck, CheckCircle2, Phone, Mail, UserPlus, Inbox, MessageSquare, type LucideIcon } from 'lucide-react';

interface LeadPipelineKanbanProps {
  leads: Lead[];
  currency: Currency;
  currencyRate: number;
  onUpdateLeadStatus: (leadId: string, newStatus: LeadStatus, value?: number) => void;
  onOpenAddLeadModal: () => void;
}

// Lucide icons rather than emoji: they inherit the column's colour, render
// identically across platforms, and are hidden from screen readers.
const COLUMNS: { id: LeadStatus; title: string; icon: LucideIcon; badgeColor: string; bg: string }[] = [
  { id: 'registered', title: 'مسجل جديد (Registered)', icon: Inbox, badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30', bg: 'bg-blue-500/5' },
  { id: 'qualified', title: 'تم التأهيل (Qualified)', icon: MessageSquare, badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30', bg: 'bg-amber-500/5' },
  { id: 'closed', title: 'تم البيع (Closed)', icon: CheckCircle2, badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', bg: 'bg-emerald-500/5' },
];

export const LeadPipelineKanban: React.FC<LeadPipelineKanbanProps> = ({
  leads,
  currency,
  currencyRate,
  onUpdateLeadStatus,
  onOpenAddLeadModal
}) => {
  const formatCurrency = useMemo(
    () => createCurrencyFormatter(currency, currencyRate),
    [currency, currencyRate]
  );

  // Single pass instead of one filter per column.
  const byStatus = useMemo(() => {
    const groups: Record<LeadStatus, Lead[]> = { registered: [], qualified: [], closed: [] };
    for (const lead of leads) groups[lead.status]?.push(lead);
    return groups;
  }, [leads]);

  const totalClosedRevenue = useMemo(
    () => byStatus.closed.reduce((acc, l) => acc + (l.closedValue ?? l.estimatedValue ?? 0), 0),
    [byStatus]
  );

  return (
    <div className="space-y-6">
      
      {/* Lead Pipeline Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="text-lg font-black text-slate-100">نظام تتبع الـ Leads وتحويلات المبيعات (CRM Lead Pipeline)</h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            ربط الليدز مباشرة بالحملات الإعلانية ومتابعة تحول التسجيل (Registered) إلى إغلاق الصفقة (Done)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-start">
            <div className="text-[11px] text-slate-400">إجمالي المبيعات المحققة من الليدز</div>
            <div className="text-lg font-black text-emerald-400">{formatCurrency(totalClosedRevenue)}</div>
          </div>

          <button
            onClick={onOpenAddLeadModal}
            className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold px-3.5 h-11 rounded-xl transition-colors shadow-lg shadow-emerald-500/20 cursor-pointer shrink-0"
          >
            <UserPlus className="w-4 h-4" aria-hidden="true" />
            <span>تسجيل ليد جديد</span>
          </button>
        </div>
      </div>

      {/* Kanban Board Columns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {COLUMNS.map(col => {
          const colLeads = byStatus[col.id];
          const Icon = col.icon;

          return (
            <section
              key={col.id}
              aria-label={`${col.title} — ${colLeads.length} ليد`}
              className={`bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3 ${col.bg}`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border min-w-0 ${col.badgeColor}`}>
                  <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span className="truncate">{col.title}</span>
                </span>
                <span className="w-6 h-6 shrink-0 rounded-full bg-slate-800 text-slate-200 text-xs font-bold flex items-center justify-center">
                  {colLeads.length}
                </span>
              </div>

              {/*
                The fixed 400px floor was fine side-by-side on desktop but
                stacked on mobile it produced 1200px of mostly-empty scroll.
              */}
              <div className="space-y-3 md:min-h-[400px]">
                {colLeads.length === 0 ? (
                  <div className="h-40 flex items-center justify-center text-xs text-slate-400 border border-dashed border-slate-800 rounded-xl">
                    لا توجد ليدز في هذه المرحلة حالياً
                  </div>
                ) : (
                  colLeads.map(lead => (
                    <div 
                      key={lead.id} 
                      className="bg-slate-950/90 border border-slate-800 hover:border-slate-700 p-4 rounded-xl shadow-sm space-y-3 transition-all group"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-bold text-slate-100 text-sm">{lead.name}</h4>
                          <span className="text-[11px] text-slate-400">الحملة: {lead.campaignName}</span>
                        </div>
                        <span className="text-[11px] px-2 py-0.5 bg-slate-800 text-slate-300 rounded font-mono">
                          {lead.sourcePlatform.toUpperCase()}
                        </span>
                      </div>

                      {/* Contact Info */}
                      <div className="space-y-1 text-xs text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{lead.phone}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-cyan-400" />
                          <span>{lead.email}</span>
                        </div>
                      </div>

                      {/* Notes if available */}
                      {lead.notes && (
                        <p className="text-[11px] bg-slate-900 p-2 rounded border border-slate-800 text-slate-300 italic">
                          "{lead.notes}"
                        </p>
                      )}

                      {/* Estimated or Closed Value */}
                      <div className="flex items-center justify-between border-t border-slate-800/80 pt-2 text-xs">
                        <span className="text-slate-400">القيمة المالية:</span>
                        <span className="font-bold text-emerald-400">
                          {formatCurrency(lead.closedValue ?? lead.estimatedValue)}
                        </span>
                      </div>

                      {/* Stage Move Action Buttons */}
                      <div className="flex items-center gap-2 pt-1">
                        {lead.status === 'registered' && (
                          <button
                            onClick={() => onUpdateLeadStatus(lead.id, 'qualified')}
                            aria-label={`نقل ${lead.name} إلى مرحلة التأهيل`}
                            className="w-full min-h-11 bg-amber-500/15 border border-amber-500/30 text-amber-300 hover:bg-amber-500/30 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>نقل إلى Qualified</span>
                          </button>
                        )}

                        {lead.status === 'qualified' && (
                          <button
                            onClick={() => onUpdateLeadStatus(lead.id, 'closed', lead.estimatedValue)}
                            aria-label={`تأكيد بيع ${lead.name}`}
                            className="w-full min-h-11 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>تأكيد البيع (Closed)</span>
                          </button>
                        )}

                        {lead.status === 'closed' && (
                          <span className="w-full py-2 bg-emerald-500/10 text-emerald-400 rounded-lg text-[11px] font-bold text-center border border-emerald-500/30 flex items-center justify-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" /> صفقة مغلقة ومحققة
                          </span>
                        )}
                      </div>

                    </div>
                  ))
                )}
              </div>

            </section>
          );
        })}
      </div>

    </div>
  );
};
