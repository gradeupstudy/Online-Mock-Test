import React from 'react';
import { Loader2, FileText, Sparkles, CheckCircle2, Globe, ShieldCheck } from 'lucide-react';

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
  const isPhase1A = progressPercentage <= 45;
  const isPhase1B = progressPercentage > 45 && progressPercentage <= 90;
  const isPhase1C = progressPercentage > 90;

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-8 animate-fadeIn">
      
      {/* PROCESSING CARD */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-xl text-center space-y-6">
        
        {/* Animated Spinner Icon */}
        <div className="relative w-20 h-20 mx-auto">
          <div className="absolute inset-0 rounded-3xl bg-blue-500/10 dark:bg-blue-500/20 animate-ping" />
          <div className="relative w-20 h-20 rounded-3xl bg-linear-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Loader2 className="w-10 h-10 animate-spin" />
          </div>
        </div>

        {/* 3-PHASE STEPPING INDICATOR */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 max-w-2xl mx-auto text-left">
          {/* Phase 1A */}
          <div className={`p-3 rounded-2xl border transition-all ${
            isPhase1A
              ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-400 text-blue-900 dark:text-blue-100 ring-2 ring-blue-500/20'
              : progressPercentage > 45
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-800 dark:text-emerald-200'
              : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-500'
          }`}>
            <div className="flex items-center gap-2">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                progressPercentage > 45 ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white'
              }`}>
                {progressPercentage > 45 ? '✓' : '1A'}
              </span>
              <span className="text-xs font-black truncate">PDF OCR Extraction</span>
            </div>
            <p className="text-[10px] opacity-75 mt-1">Layout analysis & text scan</p>
          </div>

          {/* Phase 1B */}
          <div className={`p-3 rounded-2xl border transition-all ${
            isPhase1B
              ? 'bg-purple-50 dark:bg-purple-950/60 border-purple-400 text-purple-900 dark:text-purple-100 ring-2 ring-purple-500/20'
              : progressPercentage > 90
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-800 dark:text-emerald-200'
              : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-500'
          }`}>
            <div className="flex items-center gap-2">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                progressPercentage > 90 ? 'bg-emerald-600 text-white' : 'bg-purple-600 text-white'
              }`}>
                {progressPercentage > 90 ? '✓' : '1B'}
              </span>
              <span className="text-xs font-black truncate">Dual Lang & Solutions</span>
            </div>
            <p className="text-[10px] opacity-75 mt-1">English + Hindi & explanations</p>
          </div>

          {/* Phase 1C */}
          <div className={`p-3 rounded-2xl border transition-all ${
            isPhase1C
              ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-400 text-indigo-900 dark:text-indigo-100 ring-2 ring-indigo-500/20'
              : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-500'
          }`}>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-black">
                1C
              </span>
              <span className="text-xs font-black truncate">360° AI MCQ Audit</span>
            </div>
            <p className="text-[10px] opacity-75 mt-1">Quality calibration & gate</p>
          </div>
        </div>

        {/* Status Text */}
        <div>
          <span className="px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[11px] font-black uppercase tracking-wider">
            {isPhase1A ? 'Phase 1A — PDF Layout & OCR Engine' : isPhase1B ? 'Phase 1B — Dual Language & Explanation Setup' : 'Phase 1C — 360° MCQ Quality Audit'}
          </span>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-2">
            {isPhase1A ? 'Extracting Questions from PDF' : isPhase1B ? 'Translating to Dual Language & Generating Explanations' : 'Executing 360° MCQ Comprehensive Quality Audit'}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-lg mx-auto">
            {currentStepMessage || 'Processing academic multiple-choice questions...'}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2 max-w-xl mx-auto">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400">
            <span>Overall Phase 1 Progress</span>
            <span className="text-blue-600 dark:text-blue-400 font-black">{Math.round(progressPercentage)}%</span>
          </div>
          <div className="w-full h-3.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 shadow-inner">
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
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Language Target</span>
            <div className="text-xs font-black text-purple-600 dark:text-purple-400 mt-1.5 flex items-center justify-center gap-1">
              <Globe className="w-3.5 h-3.5" />
              <span>English + हिन्दी</span>
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
