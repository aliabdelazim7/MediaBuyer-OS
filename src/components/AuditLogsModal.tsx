import React from 'react';
import type { AuditLog } from '../services/apiService';
import { History, X, ShieldCheck, UserCheck } from 'lucide-react';

interface AuditLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: AuditLog[];
}

export const AuditLogsModal: React.FC<AuditLogsModalProps> = ({
  isOpen,
  onClose,
  logs
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden text-slate-100 p-6 space-y-5">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-emerald-400" />
            <h3 className="font-extrabold text-slate-100 text-base">سجل الأمان والتغييرات المالية (Audit Trail & Action Logs)</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-400">
          سجل غير قابل للتعديل لتتبع جميع تغييرات الميزانيات، الشروط، وتأكيدات المبيعات لضمان شفافة العمل داخل الآجنسي:
        </p>

        {/* Audit Log Table */}
        <div className="max-h-80 overflow-y-auto border border-slate-800 rounded-xl overflow-hidden text-xs">
          <table className="w-full text-right">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-3 font-bold">الوقت والتاريخ</th>
                <th className="p-3 font-bold">المستخدم / المصدر</th>
                <th className="p-3 font-bold">نوع الإجراء</th>
                <th className="p-3 font-bold">القيمة السابقة</th>
                <th className="p-3 font-bold">القيمة الجديدة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-slate-800/40">
                  <td className="p-3 font-mono text-[11px] text-slate-400">{log.createdAt}</td>
                  <td className="p-3 font-bold text-slate-100 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{log.userName}</span>
                  </td>
                  <td className="p-3 font-semibold text-cyan-400">{log.actionType}</td>
                  <td className="p-3 text-rose-400 font-mono">{log.oldValue}</td>
                  <td className="p-3 text-emerald-400 font-mono">{log.newValue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1 text-emerald-400 font-bold">
            <ShieldCheck className="w-4 h-4" /> محمي بتشفير Supabase RLS Policy
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
};
