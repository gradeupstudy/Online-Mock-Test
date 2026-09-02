import React from 'react';
import { Loader2, FileText, Sparkles, CheckCircle2, ShieldAlert } from 'lucide-react';

interface AutomationOcrProgressProps {
  progressPercentage: number;
  currentStepMessage: string;
  currentPage: number;
  totalPages: number;
  extractedCount: number;
  logs: string[];
  onCancel?: () => void;
}

export const AutomationOcrProgress: React.FC<AutomationOcrProgressProps> = ({
  progressPercentage,
  currentStepMessage,
  currentPage,
  totalPages,
  extractedCount,
  logs,
  onCancel
}) => {
  return (
    <div className="max-w-4xl mx-auto space-y-6 py-8 animate-fadeIn">
      
      {/* PROCESSING CARD */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-xl text-center space-y-6">
        
        {/* Animated Spinner Icon */}
        <div className="relative w-20 h-20 mx-auto">
          <div className="absolute inset-0 rounded-3xl bg-blue-500/10 dark:bg-blue-500/20 animate-ping" />
          <div className="relative w-20 h-20 rounded-3xl bg-linear-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Loader2 className="w-10 h-10 animate-spin" />
          </div>
        </div>

        {/* Status Text */}
        <div>
          <span className="text-[11px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Phase 1A — OCR & Vision Processing
          </span>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            Extracting MCQs & Parsing Answer Keys
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-lg mx-auto">
            {currentStepMessage || 'Reading PDF pages with high-resolution layout analysis and OCR extraction...'}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2 max-w-xl mx-auto">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400">
            <span>Progress</span>
            <span className="text-blue-600 dark:text-blue-400">{Math.round(progressPercentage)}%</span>
          </div>
          <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
            <div
              className="h-full bg-linear-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(5, progressPercentage))}%` }}
            />
          </div>
        </div>

        {/* Live Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-xl mx-auto pt-2">
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pages Read</span>
            <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
              {currentPage} <span className="text-xs font-normal text-slate-400">/ {totalPages || '...'}</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">MCQs Extracted</span>
            <div className="text-xl font-black text-blue-600 dark:text-blue-400 mt-0.5">
              {extractedCount}
            </div>
          </div>

          <div className="col-span-2 sm:col-span-1 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Next Step</span>
            <div className="text-xs font-black text-purple-600 dark:text-purple-400 mt-1.5 flex items-center justify-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>360° AI Audit</span>
            </div>
          </div>
        </div>

        {/* Activity Log Terminal */}
        <div className="text-left max-w-xl mx-auto">
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Real-time Pipeline Stream:
          </label>
          <div className="p-3.5 rounded-2xl bg-slate-950 text-slate-300 font-mono text-[11px] h-32 overflow-y-auto space-y-1 shadow-inner border border-slate-800">
            {logs.length === 0 ? (
              <div className="text-slate-500 italic">Initializing OCR engine and document parser...</div>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="leading-relaxed flex items-start gap-2">
                  <span className="text-blue-400 shrink-0">›</span>
                  <span className="break-all">{log}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Cancel Button */}
        {onCancel && (
          <div>
            <button
              type="button"
              onClick={onCancel}
              className="text-xs font-bold text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition-all cursor-pointer"
            >
              Cancel Extraction
            </button>
          </div>
        )}

      </div>

    </div>
  );
};
