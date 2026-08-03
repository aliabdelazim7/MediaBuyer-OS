import React from 'react';
import type { AuditLog } from '../types/mediaBuyer';
import { appMode } from '../lib/config';
import { Modal } from './Modal';
import { History, ShieldCheck, ShieldAlert, UserCheck } from 'lucide-react';

interface AuditLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: AuditLog[];
}

export const AuditLogsModal: React.FC<AuditLogsModalProps> = ({
  isOpen,
  onClose,
  logs
}) => (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    size="lg"
    title="سجل الأمان والتغييرات المالية"
    icon={<History className="w-5 h-5 text-emerald-400 shrink-0" aria-hidden="true" />}
  >
    <p className="text-xs text-slate-400 leading-relaxed">
      سجل غير قابل للتعديل لتتبع جميع تغييرات الميزانيات، الشروط، وتأكيدات المبيعات لضمان شفافية
      العمل داخل الوكالة:
    </p>

    <div className="border border-slate-800 rounded-xl overflow-x-auto text-xs">
      <table className="w-full text-start min-w-[36rem]">
        <caption className="sr-only">
          سجل الإجراءات: الوقت، المستخدم، نوع الإجراء، القيمة السابقة والجديدة
        </caption>
        <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
          <tr>
            <th scope="col" className="p-3 font-bold">الوقت والتاريخ</th>
            <th scope="col" className="p-3 font-bold">المستخدم / المصدر</th>
            <th scope="col" className="p-3 font-bold">نوع الإجراء</th>
            <th scope="col" className="p-3 font-bold">القيمة السابقة</th>
            <th scope="col" className="p-3 font-bold">القيمة الجديدة</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60 text-slate-200">
          {logs.length === 0 && (
            <tr>
              <td colSpan={5} className="p-10 text-center text-slate-400">
                لا توجد إجراءات مسجلة بعد.
              </td>
            </tr>
          )}
          {logs.map(log => (
            <tr key={log.id} className="hover:bg-slate-800/40">
              <td className="p-3 font-mono text-[11px] text-slate-400 whitespace-nowrap">{log.createdAt}</td>
              <td className="p-3 font-bold text-slate-100">
                <span className="flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" aria-hidden="true" />
                  <span>{log.userName}</span>
                </span>
              </td>
              <td className="p-3 font-semibold text-cyan-400">{log.actionType}</td>
              <td className="p-3 text-rose-400 font-mono">{log.oldValue}</td>
              <td className="p-3 text-emerald-400 font-mono">{log.newValue}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
      {/* The old footer unconditionally claimed RLS protection even with no
          database attached. It now reflects the actual runtime mode. */}
      {appMode === 'live' ? (
        <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
          <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" /> محمي بسياسات Supabase RLS
        </span>
      ) : (
        <span className="flex items-center gap-1.5 text-amber-400 font-bold">
          <ShieldAlert className="w-4 h-4 shrink-0" aria-hidden="true" /> سجل محلي مؤقت (Demo) — غير محفوظ
        </span>
      )}
      <button
        onClick={onClose}
        className="px-4 h-11 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl transition-colors cursor-pointer"
      >
        إغلاق
      </button>
    </div>
  </Modal>
);
