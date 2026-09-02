import React from 'react';
import { Loader2, Sparkles, CheckCircle2, ShieldCheck, Database, Layers } from 'lucide-react';
import { AIAutomationConfig } from '../../../types/aiAutomation';

interface AutomationGenerationProgressProps {
  progressPercentage: number;
  currentStepMessage: string;
  config: AIAutomationConfig;
  onCancel?: () => void;
}

export const AutomationGenerationProgress: React.FC<AutomationGenerationProgressProps> = ({
  progressPercentage,
  currentStepMessage,
  config,
  onCancel
}) => {
  const [showCancelFallback, setShowCancelFallback] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setShowCancelFallback(true);
    }, 8000); // If taking over 8s, offer a fallback escape hatch
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="max-w-3xl mx-auto py-12 space-y-6 animate-fadeIn text-center">
      
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-2xl space-y-6">
        
        {/* Animated Generator Icon */}
        <div className="relative w-20 h-20 mx-auto">
          <div className="absolute inset-0 rounded-3xl bg-indigo-500/10 dark:bg-indigo-500/20 animate-ping" />
          <div className="relative w-20 h-20 rounded-3xl bg-linear-to-tr from-indigo-600 via-purple-600 to-blue-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Loader2 className="w-10 h-10 animate-spin" />
          </div>
        </div>

        <div>
          <span className="text-[11px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Phase 2 — Mock Test Instantiation
          </span>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            Generating {config.numberOfMockTests} Mock Tests ({config.mcqsPerMockTest} MCQs each)
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-md mx-auto">
            {currentStepMessage || 'Partitioning approved questions, assigning test series IDs, and syncing with database...'}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2 max-w-lg mx-auto">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400">
            <span>Generation Pipeline</span>
            <span className="text-indigo-600 dark:text-indigo-400">{Math.round(progressPercentage)}%</span>
          </div>
          <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
            <div
              className="h-full bg-linear-to-r from-indigo-600 via-purple-600 to-blue-600 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(8, progressPercentage))}%` }}
            />
          </div>
        </div>

        {/* Steps Check list */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-xl mx-auto pt-2 text-left text-xs font-bold">
          <div className={`p-3 rounded-2xl border flex items-center gap-2 transition-all ${
            progressPercentage >= 30 
              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
              : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-500'
          }`}>
            <CheckCircle2 className={`w-4 h-4 shrink-0 ${progressPercentage >= 30 ? 'text-emerald-600' : 'text-slate-400'}`} />
            <span>Questions Partitioned</span>
          </div>

          <div className={`p-3 rounded-2xl border flex items-center gap-2 transition-all ${
            progressPercentage >= 75 
              ? 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-300'
              : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-500'
          }`}>
            <Database className={`w-4 h-4 shrink-0 ${progressPercentage >= 75 ? 'text-indigo-600' : 'text-slate-400'}`} />
            <span>Database Synced</span>
          </div>

          <div className={`p-3 rounded-2xl border flex items-center gap-2 transition-all ${
            progressPercentage >= 95 
              ? 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-300'
              : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-500'
          }`}>
            <ShieldCheck className={`w-4 h-4 shrink-0 ${progressPercentage >= 95 ? 'text-purple-600' : 'text-slate-400'}`} />
            <span>Phase 2A Audit</span>
          </div>
        </div>

        {/* Failsafe Escape Action */}
        {showCancelFallback && onCancel && (
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 animate-fadeIn">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
            >
              Cancel & Return to Audit Dashboard
            </button>
          </div>
        )}

      </div>

    </div>
  );
};
