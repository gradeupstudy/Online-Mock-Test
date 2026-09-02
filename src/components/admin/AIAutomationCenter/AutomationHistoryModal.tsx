import React, { useState, useEffect } from 'react';
import { ShieldCheck, History, CheckCircle2, Clock, X, FileText, AlertCircle } from 'lucide-react';
import { AdminAuditConfirmation } from '../../../types/aiAutomation';
import { getAdminAuditHistory } from '../../../services/aiAutomationEngine';

interface AutomationHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AutomationHistoryModal: React.FC<AutomationHistoryModalProps> = ({
  isOpen,
  onClose
}) => {
  const [history, setHistory] = useState<AdminAuditConfirmation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      getAdminAuditHistory().then(logs => {
        setHistory(logs);
        setLoading(false);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
        
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                AI Automation Audit Receipts & History
              </h3>
              <p className="text-xs text-slate-500">
                Log of all mandatory human approval sign-offs
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">Loading audit receipts...</div>
        ) : history.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-2xl">
            No audit confirmations logged yet.
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((log) => (
              <div
                key={log.id}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                    {log.id}
                  </span>
                  <span className="text-[11px] text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-300">
                  <div>Signatory: <strong>{log.confirmed_by_email}</strong></div>
                  <div>Approved MCQs: <strong className="text-emerald-600 dark:text-emerald-400">{log.total_approved_questions}</strong></div>
                  <div>Test Series: <strong>{log.config_snapshot?.mockTestNamePrefix}</strong></div>
                  <div>Subject: <strong>{log.config_snapshot?.subject}</strong></div>
                </div>

                {log.notes && (
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-800 text-[11px] text-slate-500 italic">
                    "{log.notes}"
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
