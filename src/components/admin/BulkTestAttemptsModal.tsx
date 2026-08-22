import React, { useState } from 'react';
import {
  Users,
  ShieldCheck,
  Zap,
  CheckCircle2,
  AlertCircle,
  X,
  Layers,
  Lock,
  Sparkles,
  HelpCircle
} from 'lucide-react';
import { Test } from '../../types';
import { dataService } from '../../services/dataService';
import { Modal } from '../common/Modal';

interface BulkTestAttemptsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTests: Test[];
  allTests?: Test[];
  onUpdateSelection?: (testIds: string[]) => void;
  onRefreshData?: () => Promise<void>;
  onSuccess?: () => void;
  onToast?: (type: 'success' | 'error' | 'info', msg: string) => void;
}

export const BulkTestAttemptsModal: React.FC<BulkTestAttemptsModalProps> = ({
  isOpen,
  onClose,
  selectedTests,
  allTests = [],
  onUpdateSelection,
  onRefreshData,
  onSuccess,
  onToast
}) => {
  const [selectedPolicy, setSelectedPolicy] = useState<number>(0);
  const [customAttemptsInput, setCustomAttemptsInput] = useState<number>(5);
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [filterQuery, setFilterQuery] = useState<string>('');

  if (!isOpen) return null;

  const targetAttempts = isCustomMode ? Math.max(1, customAttemptsInput || 1) : selectedPolicy;

  const handleSelectPolicy = (attempts: number) => {
    setSelectedPolicy(attempts);
    setIsCustomMode(false);
  };

  const handleSelectCustom = () => {
    setIsCustomMode(true);
  };

  const handleRemoveTest = (idToRemove: string) => {
    const updated = selectedTests.filter((t) => t.id !== idToRemove).map((t) => t.id);
    onUpdateSelection?.(updated);
  };

  const handleSelectAll = () => {
    onUpdateSelection?.(allTests.map((t) => t.id));
  };

  const handleApply = async () => {
    if (selectedTests.length === 0) {
      onToast?.('error', 'Please select at least one mock test to update.');
      return;
    }

    setIsProcessing(true);
    try {
      const testIds = selectedTests.map((t) => t.id);
      const res = await dataService.bulkUpdateTestAttempts(testIds, targetAttempts);

      if (onRefreshData) {
        await onRefreshData();
      }
      onSuccess?.();

      const policyLabel =
        targetAttempts === 0
          ? 'Unlimited (∞)'
          : `${targetAttempts} Attempt${targetAttempts > 1 ? 's' : ''}`;

      onToast?.(
        'success',
        `Successfully updated attempt limit to "${policyLabel}" for ${res.count} mock test(s)!`
      );
      onClose();
    } catch (err: any) {
      console.error('Bulk update attempts error:', err);
      onToast?.('error', `Failed to update attempts: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredSelectedTests = selectedTests.filter((t) => {
    if (!filterQuery.trim()) return true;
    const q = filterQuery.toLowerCase();
    return (
      t.title.toLowerCase().includes(q) ||
      (t.test_code || '').toLowerCase().includes(q) ||
      (t.category || '').toLowerCase().includes(q)
    );
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Bulk Control Student Attempt Limits"
      maxWidth="max-w-3xl"
    >
      <div className="space-y-6">
        
        {/* Header Info Banner */}
        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 rounded-2xl border border-blue-200 dark:border-blue-800/80 flex items-start gap-3.5 shadow-2xs">
          <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black shrink-0 shadow-xs">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-black text-slate-900 dark:text-white">
              Configure Student Attempt Limits Across Multiple Mock Tests
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
              Select a standardized attempt policy below. The chosen limit will be automatically applied to all selected mock tests simultaneously.
            </p>
          </div>
        </div>

        {/* Selected Tests Summary / Pills */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Selected Mock Tests ({selectedTests.length})
              </span>
              {selectedTests.length < allTests.length && (
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  Select All ({allTests.length} Total)
                </button>
              )}
            </div>
            {selectedTests.length > 5 && (
              <input
                type="text"
                placeholder="Search selected tests..."
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                className="px-2.5 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-hidden focus:ring-1 focus:ring-blue-500 w-44"
              />
            )}
          </div>

          {selectedTests.length === 0 ? (
            <div className="p-6 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-center space-y-2">
              <AlertCircle className="w-6 h-6 text-amber-500 mx-auto" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                No mock tests selected!
              </p>
              <button
                type="button"
                onClick={handleSelectAll}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
              >
                Select All {allTests.length} Mock Tests
              </button>
            </div>
          ) : (
            <div className="max-h-36 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/80 flex flex-wrap gap-1.5">
              {filteredSelectedTests.map((t) => (
                <span
                  key={t.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-bold shadow-2xs group"
                >
                  <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400">
                    {t.test_code || 'TEST'}:
                  </span>
                  <span className="max-w-[180px] truncate">{t.title}</span>
                  <span className="text-[10px] px-1 py-0.2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded">
                    {(!t.max_attempts_per_student || t.max_attempts_per_student === 0) ? '∞' : `${t.max_attempts_per_student} att`}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTest(t.id)}
                    className="p-0.5 hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                    title="Remove from selection"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Attempt Limit Policy Options */}
        <div className="space-y-3">
          <label className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider block">
            Choose Attempt Policy to Apply
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            
            {/* Option 0: Unlimited */}
            <div
              onClick={() => handleSelectPolicy(0)}
              className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 relative ${
                !isCustomMode && selectedPolicy === 0
                  ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 shadow-xs ring-2 ring-emerald-500/20'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black shrink-0 ${
                !isCustomMode && selectedPolicy === 0
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}>
                ∞
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-1">
                  <h5 className="text-xs font-black text-slate-900 dark:text-white">
                    Unlimited Attempts
                  </h5>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
                    Practice Mode
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Students can take the mock test any number of times for continuous practice and revision.
                </p>
              </div>
            </div>

            {/* Option 1: Single Attempt (Strict) */}
            <div
              onClick={() => handleSelectPolicy(1)}
              className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 relative ${
                !isCustomMode && selectedPolicy === 1
                  ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/40 shadow-xs ring-2 ring-amber-500/20'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black shrink-0 ${
                !isCustomMode && selectedPolicy === 1
                  ? 'bg-amber-500 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}>
                <Lock className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-1">
                  <h5 className="text-xs font-black text-slate-900 dark:text-white">
                    1 Attempt Only
                  </h5>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200">
                    Strict Exam
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Strict exam simulation. Once submitted, re-attempts are blocked for that mobile number.
                </p>
              </div>
            </div>

            {/* Option 2: 2 Attempts */}
            <div
              onClick={() => handleSelectPolicy(2)}
              className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 relative ${
                !isCustomMode && selectedPolicy === 2
                  ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 shadow-xs ring-2 ring-indigo-500/20'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black shrink-0 ${
                !isCustomMode && selectedPolicy === 2
                  ? 'bg-indigo-500 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}>
                2
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-1">
                  <h5 className="text-xs font-black text-slate-900 dark:text-white">
                    2 Attempts
                  </h5>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200">
                    1 Retake
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Students get one extra chance to re-attempt and improve their marks.
                </p>
              </div>
            </div>

            {/* Option 3: 3 Attempts */}
            <div
              onClick={() => handleSelectPolicy(3)}
              className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 relative ${
                !isCustomMode && selectedPolicy === 3
                  ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 shadow-xs ring-2 ring-blue-500/20'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black shrink-0 ${
                !isCustomMode && selectedPolicy === 3
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}>
                3
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-1">
                  <h5 className="text-xs font-black text-slate-900 dark:text-white">
                    3 Attempts
                  </h5>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                    3 Submissions
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Allows up to 3 total test submissions per registered student.
                </p>
              </div>
            </div>

            {/* Option 4: Custom Attempts */}
            <div
              onClick={handleSelectCustom}
              className={`p-4 sm:col-span-2 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 relative ${
                isCustomMode
                  ? 'border-purple-500 bg-purple-50/70 dark:bg-purple-950/40 shadow-xs ring-2 ring-purple-500/20'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black shrink-0 ${
                  isCustomMode
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}>
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="text-xs font-black text-slate-900 dark:text-white">
                    Custom Number of Attempts
                  </h5>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Specify any exact attempt limit (e.g. 4, 5, 10, 20)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={customAttemptsInput}
                  onChange={(e) => {
                    setCustomAttemptsInput(Math.max(1, parseInt(e.target.value) || 1));
                    setIsCustomMode(true);
                  }}
                  onFocus={() => setIsCustomMode(true)}
                  className="w-20 px-3 py-1.5 bg-white dark:bg-slate-800 border-2 border-purple-300 dark:border-purple-700 rounded-xl text-sm font-black text-center text-slate-900 dark:text-white outline-hidden focus:border-purple-500 shadow-2xs"
                />
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  Attempts
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* Live Action Preview Banner */}
        <div className="p-4 bg-slate-900 text-white rounded-2xl flex items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div className="text-xs">
              <span className="text-slate-400">Action Plan: </span>
              <strong className="text-white font-extrabold">
                {targetAttempts === 0
                  ? 'Set Unlimited (∞) Attempts'
                  : `Set ${targetAttempts} Attempt${targetAttempts > 1 ? 's' : ''} Limit`}
              </strong>
              <span className="text-slate-400"> for </span>
              <strong className="text-amber-300 font-extrabold">{selectedTests.length} Mock Tests</strong>
            </div>
          </div>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-white/10 text-slate-300 shrink-0">
            Instant Sync
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            disabled={isProcessing}
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isProcessing || selectedTests.length === 0}
            onClick={handleApply}
            className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Applying to {selectedTests.length} Tests...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Apply Attempt Policy ({selectedTests.length} Tests)</span>
              </>
            )}
          </button>
        </div>

      </div>
    </Modal>
  );
};
