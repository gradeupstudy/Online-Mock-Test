import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import {
  Sparkles,
  RefreshCw,
  Zap,
  Check,
  ArrowRight,
  ShieldCheck,
  Layers,
  HelpCircle,
  X,
  Shuffle
} from 'lucide-react';
import { Question } from '../../types';
import {
  duxqeMutationEngine,
  DUXQEMutationStrategy,
  STRATEGY_DESCRIPTIONS,
} from '../../services/duxqeMutationEngine';

interface DUXQEMutateModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceQuestion: Question | null;
  onSuccess: (mutatedQuestion: Question, mode?: 'replace' | 'add_new') => void | Promise<void>;
  onToast?: (type: 'success' | 'error' | 'info', msg: string) => void;
}

export const DUXQEMutateModal: React.FC<DUXQEMutateModalProps> = ({
  isOpen,
  onClose,
  sourceQuestion,
  onSuccess,
  onToast,
}) => {
  const [selectedStrategy, setSelectedStrategy] = useState<DUXQEMutationStrategy>('angle_shift');
  const [customInstructions, setCustomInstructions] = useState('');
  const [targetDifficulty, setTargetDifficulty] = useState(sourceQuestion?.difficulty || 'Medium');
  const [isMutating, setIsMutating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [mutatedResult, setMutatedResult] = useState<Question | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  if (!isOpen || !sourceQuestion) return null;

  const handleGenerateMutation = async () => {
    try {
      setIsMutating(true);
      setLogs([]);
      setMutatedResult(null);

      const result = await duxqeMutationEngine.mutateQuestion(sourceQuestion, {
        strategy: selectedStrategy,
        customInstructions,
        targetDifficulty,
        onLog: (msg) => setLogs((prev) => [...prev, msg]),
      });

      setMutatedResult(result);
      onToast?.('success', `✨ DU-XQE Question Mutation Generated Successfully!`);
    } catch (err: any) {
      console.error('DU-XQE Mutation error:', err);
      onToast?.('error', err?.message || 'Failed to mutate question.');
      setLogs((prev) => [...prev, `❌ Error: ${err?.message || 'Mutation failed'}`]);
    } finally {
      setIsMutating(false);
    }
  };

  const handleApply = async (mode: 'replace' | 'add_new') => {
    if (!mutatedResult) return;
    try {
      setIsSaving(true);
      const questionToSave: Question = mode === 'replace'
        ? { ...mutatedResult, id: sourceQuestion.id, question_number: sourceQuestion.question_number }
        : mutatedResult;
      await onSuccess(questionToSave, mode);
      onClose();
    } catch (err: any) {
      console.error('Failed to save mutation:', err);
      onToast?.('error', 'Failed to save mutated question.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="DU-XQE MCQ Mutation & Concept Diversifier Engine"
      maxWidth="4xl"
    >
      <div className="space-y-6">
        {/* HEADER EXPLANATION */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-900/20 via-indigo-900/20 to-blue-900/20 border border-purple-500/30 text-xs space-y-1.5">
          <div className="flex items-center gap-2 text-purple-600 dark:text-purple-300 font-black text-sm">
            <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
            <span>DU-XQE (Diverse Unique Question & Concept Mutation)</span>
          </div>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            Transforms existing questions into brand new, conceptually unique variants with distinct framing (Inverted NOT, Scenario-based, Angle Shifts, Assertion-Reason, Entity alteration). Prevents AI repetition and guarantees 0 duplicate collisions.
          </p>
        </div>

        {/* STRATEGY PICKER */}
        <div className="space-y-3">
          <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Select Cognitive Mutation Strategy
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {(Object.keys(STRATEGY_DESCRIPTIONS) as DUXQEMutationStrategy[]).map((strat) => {
              const info = STRATEGY_DESCRIPTIONS[strat];
              const isSelected = selectedStrategy === strat;
              return (
                <button
                  key={strat}
                  type="button"
                  onClick={() => setSelectedStrategy(strat)}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer space-y-1 flex flex-col justify-between ${
                    isSelected
                      ? 'bg-purple-600 text-white border-purple-600 shadow-md ring-2 ring-purple-400/30'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-purple-300 dark:hover:border-purple-700'
                  }`}
                >
                  <div className="font-bold text-xs flex items-center justify-between gap-1">
                    <span>{info.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                  </div>
                  <p className={`text-[11px] leading-tight ${isSelected ? 'text-purple-100' : 'text-slate-500'}`}>
                    {info.desc}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* ADDITIONAL CUSTOMIZATION OPTIONS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Target Difficulty Level
            </label>
            <select
              value={targetDifficulty}
              onChange={(e) => setTargetDifficulty(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-purple-500"
            >
              <option value="Easy">Easy (Foundation / Basic Recall)</option>
              <option value="Medium">Medium (Standard Competitive Level)</option>
              <option value="Hard">Hard (Deep Analytical / Tricky Traps)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Optional Custom Instructions
            </label>
            <input
              type="text"
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              placeholder="e.g. Focus on Himachal Pradesh context, state laws, or recent amendments..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        {/* LOGS */}
        {logs.length > 0 && (
          <div className="p-3 bg-slate-950 text-slate-300 rounded-xl text-[11px] font-mono space-y-1 max-h-28 overflow-y-auto">
            {logs.map((log, idx) => (
              <div key={idx}>{log}</div>
            ))}
          </div>
        )}

        {/* MUTATION COMPARISON: ORIGINAL VS MUTATED */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* ORIGINAL SOURCE MCQ */}
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                Original MCQ
              </span>
              <span className="text-[10px] font-bold text-slate-500">
                Ans: Option {sourceQuestion.correct_answer}
              </span>
            </div>
            <p className="text-xs font-bold text-slate-900 dark:text-white leading-relaxed">
              {sourceQuestion.question_text}
            </p>
            <div className="space-y-1 text-xs">
              <div className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                A. {sourceQuestion.option_a}
              </div>
              <div className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                B. {sourceQuestion.option_b}
              </div>
              <div className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                C. {sourceQuestion.option_c}
              </div>
              <div className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                D. {sourceQuestion.option_d}
              </div>
            </div>
          </div>

          {/* MUTATED PREVIEW */}
          <div className={`p-4 rounded-2xl border flex flex-col justify-between ${
            mutatedResult
              ? 'border-purple-300 dark:border-purple-700 bg-purple-50/40 dark:bg-purple-950/20 shadow-sm'
              : 'border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-900/30'
          }`}>
            {mutatedResult ? (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-purple-600 text-white flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-300" />
                    <span>DU-XQE Mutated Variant</span>
                  </span>
                  <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300">
                    Ans: Option {mutatedResult.correct_answer} ✓
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-900 dark:text-white leading-relaxed">
                  {mutatedResult.question_text}
                </p>
                <div className="space-y-1 text-xs">
                  {['A', 'B', 'C', 'D'].map((key) => {
                    const optKey = `option_${key.toLowerCase()}` as keyof Question;
                    const optVal = mutatedResult[optKey] as string;
                    const isCorrect = mutatedResult.correct_answer === key;
                    return (
                      <div
                        key={key}
                        className={`p-1.5 rounded-lg border flex items-center justify-between ${
                          isCorrect
                            ? 'bg-emerald-100/60 dark:bg-emerald-950/60 border-emerald-300 text-emerald-950 dark:text-emerald-200 font-bold'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span>{key}. {optVal}</span>
                        {isCorrect && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                      </div>
                    );
                  })}
                </div>
                {mutatedResult.explanation && (
                  <div className="p-2 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300">
                    <strong className="text-purple-600 dark:text-purple-400">Explanation: </strong>
                    {mutatedResult.explanation}
                  </div>
                )}
              </div>
            ) : (
              <div className="my-auto py-10 text-center text-slate-400 space-y-2">
                <Zap className="w-8 h-8 mx-auto text-purple-400/50" />
                <p className="text-xs font-bold">
                  Click "Generate DU-XQE Mutation" below to create a mutated variant of this question.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* MODAL FOOTER CONTROLS */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleGenerateMutation}
              disabled={isMutating}
              className="px-5 py-2.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isMutating ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
              )}
              <span>{isMutating ? 'Mutating with DU-XQE...' : mutatedResult ? 'Re-Mutate / Try Another Angle' : 'Generate DU-XQE Mutation'}</span>
            </button>

            {mutatedResult && (
              <>
                <button
                  type="button"
                  onClick={() => handleApply('replace')}
                  disabled={isSaving}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Replace original MCQ with this mutated variant"
                >
                  {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Replace Original MCQ</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleApply('add_new')}
                  disabled={isSaving}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Save as a brand new distinct MCQ in bank/test"
                >
                  {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Layers className="w-3.5 h-3.5" />}
                  <span>Save as New Distinct MCQ</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
