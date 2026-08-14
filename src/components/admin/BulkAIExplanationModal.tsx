import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  BookOpen, 
  Check, 
  RefreshCw, 
  FileText, 
  Languages, 
  Zap, 
  CheckCircle2, 
  HelpCircle,
  Clock,
  ArrowRight,
  Info
} from 'lucide-react';
import { Question } from '../../types';
import { aiService } from '../../services/aiService';
import { Modal } from '../common/Modal';

interface BulkAIExplanationModalProps {
  isOpen: boolean;
  testTitle?: string;
  questions: Question[];
  onClose: () => void;
  onApplyExplanations: (updatedQuestions: Question[]) => Promise<void> | void;
  onToast?: (type: 'success' | 'error' | 'info', msg: string) => void;
}

export const BulkAIExplanationModal: React.FC<BulkAIExplanationModalProps> = ({
  isOpen,
  testTitle,
  questions,
  onClose,
  onApplyExplanations,
  onToast,
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'missing_only'>('missing_only');
  const [language, setLanguage] = useState<'bilingual' | 'english' | 'hindi'>('bilingual');
  const [style, setStyle] = useState<'step_by_step' | 'conceptual' | 'short_and_crisp'>('step_by_step');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressDone, setProgressDone] = useState(0);
  const [progressTotal, setProgressTotal] = useState(0);
  const [currentStatusLog, setCurrentStatusLog] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  
  const [results, setResults] = useState<Array<{ id: string; explanation: string; applied: boolean }>>([]);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsGenerating(false);
      setIsCompleted(false);
      setResults([]);
      setLogs([]);
      setProgressDone(0);
      setProgressTotal(0);
    }
  }, [isOpen]);

  const targetQuestions = questions.filter((q) => {
    if (filterMode === 'missing_only') {
      return !q.explanation || q.explanation.trim() === '' || q.explanation.length < 15;
    }
    return true;
  });

  const handleStartGeneration = async () => {
    if (targetQuestions.length === 0) {
      onToast?.('info', 'All questions already have detailed explanations!');
      return;
    }

    setIsGenerating(true);
    setIsCompleted(false);
    setResults([]);
    setLogs([]);
    setProgressDone(0);
    setProgressTotal(targetQuestions.length);

    try {
      const generated = await aiService.generateBulkExplanations(
        targetQuestions,
        { language, style },
        (done, total, logMsg) => {
          setProgressDone(done);
          setProgressTotal(total);
          setCurrentStatusLog(logMsg);
          setLogs((prev) => [...prev.slice(-20), logMsg]);
        }
      );

      const items = generated.map((g) => ({
        id: g.id,
        explanation: g.explanation,
        applied: true,
      }));

      setResults(items);
      setIsCompleted(true);
      onToast?.('success', `Generated AI explanations for ${items.length} MCQs!`);
    } catch (err: any) {
      console.error('Failed to generate bulk explanations', err);
      onToast?.('error', err?.message || 'Failed to generate bulk explanations.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleConfirmSave = async () => {
    const toApplyMap = new Map(results.filter((r) => r.applied).map((r) => [r.id, r.explanation]));
    if (toApplyMap.size === 0) {
      onToast?.('error', 'No explanations selected to apply!');
      return;
    }

    const finalQuestions = questions.map((orig) => {
      if (toApplyMap.has(orig.id)) {
        return {
          ...orig,
          explanation: toApplyMap.get(orig.id)!,
        };
      }
      return orig;
    });

    await onApplyExplanations(finalQuestions);
    onToast?.('success', `Saved AI explanations to ${toApplyMap.size} questions in test!`);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={isGenerating ? () => {} : onClose}
      title="Bulk AI Explanation Generator (All MCQs at Once)"
      maxWidth="3xl"
    >
      <div className="space-y-6">
        
        {/* Header Banner */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-300" /> 1-Click AI Solutions
              </span>
              <span className="text-xs font-medium text-blue-100">
                {testTitle || 'Mock Test'}
              </span>
            </div>
            <h3 className="text-lg font-black text-white">
              Generate Detailed Explanations for All MCQs
            </h3>
            <p className="text-xs text-blue-100 max-w-lg">
              Automatically creates pedagogical step-by-step solutions, key takeaways, and distractor breakdowns for all questions in one go.
            </p>
          </div>

          {!isGenerating && !isCompleted && (
            <button
              onClick={handleStartGeneration}
              disabled={targetQuestions.length === 0}
              className="px-6 py-3 bg-white text-blue-700 hover:bg-blue-50 font-black text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 shrink-0 cursor-pointer disabled:opacity-50"
            >
              <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span>Generate for {targetQuestions.length} MCQs</span>
            </button>
          )}
        </div>

        {/* STEP 1: OPTIONS CONFIGURATION */}
        {!isGenerating && !isCompleted && (
          <div className="space-y-4">
            
            {/* Filter scope */}
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-2">
                Which MCQs should be explained?
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label
                  onClick={() => setFilterMode('missing_only')}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${
                    filterMode === 'missing_only'
                      ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 text-blue-950 dark:text-blue-200'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="filterMode"
                    checked={filterMode === 'missing_only'}
                    onChange={() => setFilterMode('missing_only')}
                    className="text-blue-600"
                  />
                  <div>
                    <div className="text-xs font-bold">Only Missing / Empty Explanations</div>
                    <div className="text-[11px] text-slate-400">
                      {questions.filter((q) => !q.explanation || q.explanation.length < 15).length} of {questions.length} questions need solutions
                    </div>
                  </div>
                </label>

                <label
                  onClick={() => setFilterMode('all')}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${
                    filterMode === 'all'
                      ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 text-blue-950 dark:text-blue-200'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="filterMode"
                    checked={filterMode === 'all'}
                    onChange={() => setFilterMode('all')}
                    className="text-blue-600"
                  />
                  <div>
                    <div className="text-xs font-bold">Upgrade All {questions.length} MCQs</div>
                    <div className="text-[11px] text-slate-400">
                      Re-generate & enrich explanations across the entire test
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Language & Style */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
                  <Languages className="w-3.5 h-3.5 text-blue-500" /> Explanation Language
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 outline-hidden"
                >
                  <option value="bilingual">Bilingual (Hindi + English)</option>
                  <option value="english">English (Academic & Crisp)</option>
                  <option value="hindi">Hindi (हिंदी - Devanagari)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-500" /> Solution Style
                </label>
                <select
                  value={style}
                  onChange={(e) => setStyle(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 outline-hidden"
                >
                  <option value="step_by_step">Step-by-Step with Key Concept</option>
                  <option value="conceptual">Conceptual Deep Dive & Theory</option>
                  <option value="short_and_crisp">Crisp & Direct (2-3 Sentences)</option>
                </select>
              </div>
            </div>

            {/* Questions to be processed preview */}
            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-500 shrink-0" />
              <span>
                Ready to generate explanations for <b>{targetQuestions.length}</b> questions in batches using <b>Gemini 3.7 Flash</b>.
              </span>
            </div>

          </div>
        )}

        {/* STEP 2: GENERATION PROGRESS */}
        {isGenerating && (
          <div className="p-8 bg-slate-900 rounded-3xl border border-slate-800 text-white space-y-5 text-center">
            <div className="w-16 h-16 rounded-3xl bg-blue-500/20 border border-blue-500/30 text-blue-400 flex items-center justify-center mx-auto animate-pulse">
              <Zap className="w-8 h-8 text-amber-400 fill-amber-400 animate-bounce" />
            </div>

            <div className="space-y-1">
              <h4 className="text-lg font-black text-white">
                Generating AI Explanations in Bulk...
              </h4>
              <p className="text-xs text-slate-400">
                Processing {progressDone} of {progressTotal} MCQs
              </p>
            </div>

            {/* Progress Bar */}
            <div className="w-full max-w-md mx-auto space-y-1.5">
              <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 rounded-full transition-all duration-300 shadow-md"
                  style={{
                    width: `${progressTotal > 0 ? (progressDone / progressTotal) * 100 : 10}%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-bold text-slate-400">
                <span>{currentStatusLog || 'Generating solutions...'}</span>
                <span>{progressTotal > 0 ? Math.round((progressDone / progressTotal) * 100) : 0}%</span>
              </div>
            </div>

            {/* Terminal logs */}
            <div className="bg-black/50 p-3 rounded-xl border border-slate-800 text-left font-mono text-[10px] text-blue-300 h-24 overflow-y-auto space-y-1">
              {logs.map((l, i) => (
                <div key={i}>{l}</div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 3: RESULTS PREVIEW & SAVE */}
        {isCompleted && results.length > 0 && (
          <div className="space-y-4">
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs">
                  ✓
                </span>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  Generated {results.length} Explanations
                </h4>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const all = results.every((r) => r.applied);
                    setResults((prev) => prev.map((r) => ({ ...r, applied: !all })));
                  }}
                  className="text-xs text-blue-600 hover:underline font-bold"
                >
                  {results.every((r) => r.applied) ? 'Deselect All' : 'Select All'}
                </button>
              </div>
            </div>

            {/* List of Generated Explanations */}
            <div className="max-h-96 overflow-y-auto space-y-3 p-1">
              {results.map((res, idx) => {
                const orig = questions.find((q) => q.id === res.id);
                if (!orig) return null;

                return (
                  <div
                    key={res.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      res.applied
                        ? 'bg-white dark:bg-slate-900 border-blue-500/40 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-850 border-slate-200 dark:border-slate-800 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={res.applied}
                          onChange={() =>
                            setResults((prev) =>
                              prev.map((item) =>
                                item.id === res.id ? { ...item, applied: !item.applied } : item
                              )
                            )
                          }
                          className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                        />
                        <span className="w-6 h-6 rounded-lg bg-blue-600 text-white font-black text-xs flex items-center justify-center">
                          Q{orig.question_number}
                        </span>
                        <span className="font-bold text-xs text-slate-900 dark:text-white">
                          {orig.question_text}
                        </span>
                      </div>

                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 shrink-0">
                        Ans: Option {orig.correct_answer}
                      </span>
                    </div>

                    {/* Explanation content */}
                    <div className="mt-2.5 p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900/60 text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
                      <span className="font-bold text-blue-700 dark:text-blue-300 block mb-1">
                        AI Solution:
                      </span>
                      {res.explanation}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                Cancel
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleStartGeneration}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Re-generate
                </button>

                <button
                  type="button"
                  onClick={handleConfirmSave}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
                >
                  <Check className="w-4 h-4" /> Save {results.filter((r) => r.applied).length} Explanations to Test
                </button>
              </div>
            </div>

          </div>
        )}

      </div>
    </Modal>
  );
};
