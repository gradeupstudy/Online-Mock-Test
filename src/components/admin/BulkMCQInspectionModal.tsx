import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  Check, 
  ArrowRight, 
  RefreshCw, 
  Layers, 
  FileText, 
  BookOpen, 
  TrendingUp, 
  Award, 
  X,
  ChevronDown,
  ChevronUp,
  Eye,
  Wrench,
  Edit3,
  HelpCircle,
  Zap
} from 'lucide-react';
import { Question } from '../../types';
import { aiService, MCQ360InspectionReport, normalizeAnswerKey, normalizeQualityScore } from '../../services/aiService';
import { Modal } from '../common/Modal';

interface BulkMCQInspectionModalProps {
  isOpen: boolean;
  testTitle?: string;
  questions: Question[];
  onClose: () => void;
  onApplyAllImprovements: (improvedQuestions: Question[]) => Promise<void> | void;
  onToast?: (type: 'success' | 'error' | 'info', msg: string) => void;
}

interface InspectionItemResult {
  id: string;
  original: Question;
  report: MCQ360InspectionReport;
  improved: Question;
  applied: boolean;
  isRepaired?: boolean;
}

export const BulkMCQInspectionModal: React.FC<BulkMCQInspectionModalProps> = ({
  isOpen,
  testTitle,
  questions,
  onClose,
  onApplyAllImprovements,
  onToast,
}) => {
  const [scope, setScope] = useState<'all' | 'uninspected' | 'selected'>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [targetExam, setTargetExam] = useState<string>('General Competitive Mock Test');
  
  const [isAuditing, setIsAuditing] = useState(false);
  const [progressDone, setProgressDone] = useState(0);
  const [progressTotal, setProgressTotal] = useState(0);
  const [currentStatusLog, setCurrentStatusLog] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  
  const [auditResults, setAuditResults] = useState<InspectionItemResult[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [activeTabFilter, setActiveTabFilter] = useState<'all' | 'faulty' | 'excellent' | 'disputed'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Single and bulk repair states
  const [repairingId, setRepairingId] = useState<string | null>(null);
  const [isBulkRepairing, setIsBulkRepairing] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Question> | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Reset state on open only
      setSelectedIds(new Set(questions.map((q) => q.id)));
      setIsAuditing(false);
      setIsCompleted(false);
      setAuditResults([]);
      setLogs([]);
      setProgressDone(0);
      setProgressTotal(questions.length);
      setActiveTabFilter('all');
      setExpandedId(null);
      setRepairingId(null);
      setIsBulkRepairing(false);
      setEditingItemId(null);
      setEditForm(null);
    }
  }, [isOpen]);

  const targetQuestions = questions.filter((q) => {
    if (scope === 'uninspected') {
      return !q.quality_score || q.quality_score === 0;
    }
    if (scope === 'selected') {
      return selectedIds.has(q.id);
    }
    return true;
  });

  const handleStartAudit = async () => {
    if (targetQuestions.length === 0) {
      onToast?.('error', 'No questions match the selected audit scope!');
      return;
    }

    setIsAuditing(true);
    setIsCompleted(false);
    setAuditResults([]);
    setLogs([]);
    setProgressDone(0);
    setProgressTotal(targetQuestions.length);

    try {
      const results = await aiService.bulkInspectMCQs(
        targetQuestions,
        (done, total, logMsg) => {
          setProgressDone(done);
          setProgressTotal(total);
          setCurrentStatusLog(logMsg);
          setLogs((prev) => [...prev.slice(-20), logMsg]);
        },
        {
          targetExam,
        }
      );

      const items: InspectionItemResult[] = results.map((r) => ({
        id: r.id,
        original: r.original,
        report: r.report,
        improved: r.improved,
        applied: true, // Default to true so user can apply all with 1 click
      }));

      setAuditResults(items);
      setIsCompleted(true);
      onToast?.('success', `Successfully completed 360° AI audit of ${items.length} MCQs!`);
    } catch (err: any) {
      console.error('Bulk 360 audit failed', err);
      onToast?.('error', err?.message || 'Failed to complete 360° audit with AI.');
    } finally {
      setIsAuditing(false);
    }
  };

  const handleToggleApplyItem = (id: string) => {
    setAuditResults((prev) =>
      prev.map((item) => (item.id === id ? { ...item, applied: !item.applied } : item))
    );
  };

  // 1-Click Repair Single Item with AI
  const handleRepairSingleItem = async (itemId: string) => {
    const item = auditResults.find((r) => r.id === itemId);
    if (!item) return;

    setRepairingId(itemId);
    try {
      const { repairedQuestion, report } = await aiService.repairSingleMCQ(
        item.original,
        item.report,
        targetExam
      );

      setAuditResults((prev) =>
        prev.map((r) =>
          r.id === itemId
            ? {
                ...r,
                improved: repairedQuestion,
                report: report,
                applied: true,
                isRepaired: true,
              }
            : r
        )
      );
      onToast?.('success', `⚡ Question #${item.original.question_number || ''} auto-repaired successfully!`);
    } catch (err: any) {
      console.error('Error repairing single question', err);
      onToast?.('error', err?.message || 'Failed to repair question with AI.');
    } finally {
      setRepairingId(null);
    }
  };

  // 1-Click Bulk Repair for ALL Faulty Questions
  const handleRepairAllFaulty = async () => {
    const faultyItems = auditResults.filter((r) => {
      const score = r.report?.overallQualityScore || 0;
      const isDisputed =
        r.report?.factualAccuracy?.status === 'Potentially Inaccurate' ||
        r.report?.factualAccuracy?.status === 'Needs Correction' ||
        r.report?.factualAccuracy?.confirmedAnswer !== r.original.correct_answer;
      return score < 75 || isDisputed;
    });

    if (faultyItems.length === 0) {
      onToast?.('info', 'No faulty MCQs found! All questions meet quality standards.');
      return;
    }

    setIsBulkRepairing(true);
    try {
      const repairItems = faultyItems.map((f) => ({
        question: f.original,
        report: f.report,
      }));

      const repairedResults = await aiService.repairFaultyMCQs(
        repairItems,
        targetExam,
        (done, total, logMsg) => {
          setCurrentStatusLog(logMsg);
        }
      );

      const repairedMap = new Map(repairedResults.map((r) => [r.id, r]));

      setAuditResults((prev) =>
        prev.map((r) => {
          if (repairedMap.has(r.id)) {
            const repData = repairedMap.get(r.id)!;
            return {
              ...r,
              improved: repData.repairedQuestion,
              report: repData.report,
              applied: true,
              isRepaired: true,
            };
          }
          return r;
        })
      );

      onToast?.('success', `🎉 Successfully auto-repaired ${faultyItems.length} faulty MCQs with AI!`);
    } catch (err: any) {
      console.error('Error bulk repairing faulty questions', err);
      onToast?.('error', err?.message || 'Failed to bulk repair faulty MCQs.');
    } finally {
      setIsBulkRepairing(false);
    }
  };

  // Instant Correct Answer Switcher for single question
  const handleChangeAnswerKey = (itemId: string, newKey: 'A' | 'B' | 'C' | 'D') => {
    setAuditResults((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const updatedImproved = { ...item.improved, correct_answer: newKey };
          return {
            ...item,
            improved: updatedImproved,
            applied: true,
            isRepaired: true,
          };
        }
        return item;
      })
    );
    onToast?.('info', `Switched Answer Key to Option ${newKey}`);
  };

  // Start Inline Edit
  const handleStartEdit = (item: InspectionItemResult) => {
    setEditingItemId(item.id);
    setEditForm({ ...item.improved });
  };

  // Save Inline Edit
  const handleSaveEdit = (itemId: string) => {
    if (!editForm) return;

    setAuditResults((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const updatedImproved: Question = {
            ...item.improved,
            question_text: editForm.question_text || item.improved.question_text,
            option_a: editForm.option_a || item.improved.option_a,
            option_b: editForm.option_b || item.improved.option_b,
            option_c: editForm.option_c || item.improved.option_c,
            option_d: editForm.option_d || item.improved.option_d,
            correct_answer: (editForm.correct_answer || item.improved.correct_answer) as 'A' | 'B' | 'C' | 'D',
            explanation: editForm.explanation !== undefined ? editForm.explanation : item.improved.explanation,
            quality_score: 95,
            inspection_status: 'verified',
          };
          return {
            ...item,
            improved: updatedImproved,
            applied: true,
            isRepaired: true,
          };
        }
        return item;
      })
    );

    setEditingItemId(null);
    setEditForm(null);
    onToast?.('success', 'Saved question manual fixes!');
  };

  const handleCancelEdit = () => {
    setEditingItemId(null);
    setEditForm(null);
  };

  const handleConfirmApplyAll = async () => {
    const toApply = auditResults.filter((r) => r.applied).map((r) => r.improved);
    if (toApply.length === 0) {
      onToast?.('error', 'No improved questions selected to apply!');
      return;
    }

    // Merge improved questions into full test question list
    const improvedMap = new Map(toApply.map((q) => [q.id, q]));
    const finalQuestionList = questions.map((orig) => {
      if (improvedMap.has(orig.id)) {
        return improvedMap.get(orig.id)!;
      }
      return orig;
    });

    await onApplyAllImprovements(finalQuestionList);
    onToast?.('success', `Applied 360° AI Quality Improvements to ${toApply.length} questions!`);
    onClose();
  };

  // Calculations for summary card
  const avgQualityScore =
    auditResults.length > 0
      ? Math.round(
          auditResults.reduce(
            (acc, curr) => acc + normalizeQualityScore(curr.report?.overallQualityScore, 85),
            0
          ) / auditResults.length
        )
      : 0;

  const countExcellent = auditResults.filter(
    (r) => normalizeQualityScore(r.report?.overallQualityScore, 85) >= 85
  ).length;

  const countGood = auditResults.filter((r) => {
    const s = normalizeQualityScore(r.report?.overallQualityScore, 85);
    return s >= 70 && s < 85;
  }).length;

  const countDisputed = auditResults.filter((r) => {
    const origKey = normalizeAnswerKey(r.original.correct_answer, 'A');
    const confKey = normalizeAnswerKey(
      r.report?.factualAccuracy?.confirmedAnswer || r.improved.correct_answer,
      origKey
    );
    const status = r.report?.factualAccuracy?.status;
    const isStatusInaccurate = status === 'Potentially Inaccurate' || status === 'Needs Correction';
    return isStatusInaccurate || confKey !== origKey;
  }).length;

  const countFaulty = auditResults.filter((r) => {
    const origKey = normalizeAnswerKey(r.original.correct_answer, 'A');
    const confKey = normalizeAnswerKey(
      r.report?.factualAccuracy?.confirmedAnswer || r.improved.correct_answer,
      origKey
    );
    const status = r.report?.factualAccuracy?.status;
    const isStatusInaccurate = status === 'Potentially Inaccurate' || status === 'Needs Correction';
    const score = normalizeQualityScore(r.report?.overallQualityScore, 85);
    return score < 75 || isStatusInaccurate || confKey !== origKey;
  }).length;

  const filteredDisplayResults = auditResults.filter((r) => {
    const origKey = normalizeAnswerKey(r.original.correct_answer, 'A');
    const confKey = normalizeAnswerKey(
      r.report?.factualAccuracy?.confirmedAnswer || r.improved.correct_answer,
      origKey
    );
    const status = r.report?.factualAccuracy?.status;
    const isStatusInaccurate = status === 'Potentially Inaccurate' || status === 'Needs Correction';
    const isDisputed = isStatusInaccurate || confKey !== origKey;
    const score = normalizeQualityScore(r.report?.overallQualityScore, 85);

    if (activeTabFilter === 'faulty') {
      return score < 75 || isDisputed;
    }
    if (activeTabFilter === 'excellent') return score >= 85;
    if (activeTabFilter === 'disputed') {
      return isDisputed;
    }
    return true;
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={isAuditing || isBulkRepairing ? () => {} : onClose}
      title="360° AI MCQ Inspection & Auto-Fix Engine"
      maxWidth="5xl"
    >
      <div className="space-y-6">
        
        {/* Header Hero */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-indigo-700 text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-slate-950/80 text-amber-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-300" /> 360° QA Inspection & Repair
              </span>
              <span className="text-xs font-semibold text-white/90">
                {testTitle || 'Mock Test Questions'}
              </span>
            </div>
            <h3 className="text-lg font-black text-white">
              Instant Exam-Wide Quality, Error Detection & 1-Click Fix
            </h3>
            <p className="text-xs text-white/80 max-w-xl">
              Inspects all {questions.length} MCQs for factual accuracy, wrong answer keys, bad distractors, and grammar errors — with instant 1-click AI auto-repair.
            </p>
          </div>

          {!isAuditing && !isCompleted && (
            <button
              onClick={handleStartAudit}
              disabled={targetQuestions.length === 0}
              className="px-6 py-3 bg-slate-950 hover:bg-slate-900 text-amber-300 font-black text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 shrink-0 cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Inspect All {targetQuestions.length} MCQs Now</span>
            </button>
          )}

          {isCompleted && auditResults.length > 0 && (
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <button
                type="button"
                onClick={() => setIsCompleted(false)}
                className="px-3.5 py-2 bg-slate-950/70 hover:bg-slate-950 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Reconfigure
              </button>
              <button
                onClick={handleConfirmApplyAll}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-2 shrink-0 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Save All ({auditResults.filter((r) => r.applied).length}) Improved MCQs</span>
              </button>
            </div>
          )}
        </div>

        {/* STEP 1: PRE-AUDIT CONFIGURATION */}
        {!isAuditing && !isCompleted && (
          <div className="space-y-4">
            {/* Exam Target & Precision Mode */}
            <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300">
                  🎯 Target Exam Benchmark (for Exact Syllabus & Difficulty):
                </label>
                <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-900">
                  ⚡ Turbo Parallel Mode (5 MCQs/batch)
                </span>
              </div>
              <select
                value={targetExam}
                onChange={(e) => setTargetExam(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
              >
                <option value="General Competitive Mock Test">General Competitive Mock Test (Standard)</option>
                <option value="SSC CGL / CHSL / MTS / CPO (Staff Selection Commission)">SSC CGL / CHSL / MTS / CPO (Staff Selection Commission)</option>
                <option value="UPSC Civil Services / State PSC (Prelims GS & CSAT)">UPSC Civil Services / State PSC (Prelims GS & CSAT)</option>
                <option value="Banking & Insurance (IBPS PO, Clerk, SBI, RBI)">Banking & Insurance (IBPS PO, Clerk, SBI, RBI)</option>
                <option value="Railways RRB (NTPC, Group D, ALP)">Railways RRB (NTPC, Group D, ALP)</option>
                <option value="Teaching Exams (CTET, State TET, DSSSB, KVS)">Teaching Exams (CTET, State TET, DSSSB, KVS)</option>
                <option value="Police & Defense (Sub-Inspector, Constable, NDA, CDS)">Police & Defense (Sub-Inspector, Constable, NDA, CDS)</option>
                <option value="State Police / HP Police / Patwari / Forest Guard">State Police / HP Police / Patwari / Forest Guard</option>
                <option value="NEET / JEE / Science & Medical Foundation">NEET / JEE / Science & Medical Foundation</option>
              </select>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
              <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400">
                Select Audit Scope:
              </label>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label
                  onClick={() => setScope('all')}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${
                    scope === 'all'
                      ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-950 dark:text-amber-200'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="scope"
                    checked={scope === 'all'}
                    onChange={() => setScope('all')}
                    className="text-amber-600"
                  />
                  <div>
                    <div className="text-xs font-bold">All MCQs in Test</div>
                    <div className="text-[11px] text-slate-400">
                      Audit all {questions.length} questions
                    </div>
                  </div>
                </label>

                <label
                  onClick={() => setScope('uninspected')}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${
                    scope === 'uninspected'
                      ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-950 dark:text-amber-200'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="scope"
                    checked={scope === 'uninspected'}
                    onChange={() => setScope('uninspected')}
                    className="text-amber-600"
                  />
                  <div>
                    <div className="text-xs font-bold">Only Unaudited MCQs</div>
                    <div className="text-[11px] text-slate-400">
                      {questions.filter((q) => !q.quality_score).length} pending audit
                    </div>
                  </div>
                </label>

                <label
                  onClick={() => setScope('selected')}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${
                    scope === 'selected'
                      ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-950 dark:text-amber-200'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="scope"
                    checked={scope === 'selected'}
                    onChange={() => setScope('selected')}
                    className="text-amber-600"
                  />
                  <div>
                    <div className="text-xs font-bold">Custom Selected</div>
                    <div className="text-[11px] text-slate-400">
                      {selectedIds.size} of {questions.length} selected
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Scope question preview checklist if custom selected */}
            {scope === 'selected' && (
              <div className="max-h-60 overflow-y-auto space-y-2 p-2 border border-slate-200 dark:border-slate-800 rounded-2xl">
                <div className="flex items-center justify-between px-2 text-xs">
                  <span className="font-bold text-slate-500">Select MCQs to inspect:</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedIds(new Set(questions.map((q) => q.id)))}
                      className="text-blue-600 hover:underline font-semibold"
                    >
                      Select All
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => setSelectedIds(new Set())}
                      className="text-slate-500 hover:underline"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                {questions.map((q) => (
                  <label
                    key={q.id}
                    className="flex items-start gap-2 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer text-xs"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(q.id)}
                      onChange={() => {
                        const next = new Set(selectedIds);
                        if (next.has(q.id)) next.delete(q.id);
                        else next.add(q.id);
                        setSelectedIds(next);
                      }}
                      className="mt-0.5 rounded text-amber-600"
                    />
                    <div className="flex-1">
                      <span className="font-bold text-blue-600 mr-1.5">Q{q.question_number}.</span>
                      <span className="text-slate-900 dark:text-slate-100 font-medium">
                        {q.question_text}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            )}

            {/* What AI Audits */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                <div className="font-bold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Factual Verification
                </div>
                <p className="text-[11px] text-slate-500">
                  Verifies marked answer key against academic syllabus facts.
                </p>
              </div>

              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                <div className="font-bold text-blue-600 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" /> Grammar & Phrasing
                </div>
                <p className="text-[11px] text-slate-500">
                  Polishes phrasing, punctuation, and removes linguistic ambiguity.
                </p>
              </div>

              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                <div className="font-bold text-purple-600 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5" /> Distractor Balance
                </div>
                <p className="text-[11px] text-slate-500">
                  Ensures wrong options are plausible and competitive.
                </p>
              </div>

              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                <div className="font-bold text-amber-600 flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5" /> 1-Click Fix & Repair
                </div>
                <p className="text-[11px] text-slate-500">
                  Instantly auto-fixes disputed answer keys and faulty distractors.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: LIVE AUDIT PROGRESS */}
        {isAuditing && (
          <div className="p-8 bg-slate-900 rounded-3xl border border-slate-800 text-white space-y-5 text-center">
            <div className="w-16 h-16 rounded-3xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto animate-pulse">
              <Sparkles className="w-8 h-8 animate-spin" />
            </div>

            <div className="space-y-1">
              <h4 className="text-lg font-black text-white">
                360° AI Quality Inspection in Progress...
              </h4>
              <p className="text-xs text-slate-400">
                Auditing {progressDone} of {progressTotal} MCQs using Gemini 3.7 Flash
              </p>
            </div>

            {/* Progress Bar */}
            <div className="w-full max-w-md mx-auto space-y-1.5">
              <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 via-amber-500 to-emerald-400 rounded-full transition-all duration-300 shadow-md"
                  style={{
                    width: `${progressTotal > 0 ? (progressDone / progressTotal) * 100 : 10}%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-bold text-slate-400">
                <span>{currentStatusLog || 'Auditing questions...'}</span>
                <span>{progressTotal > 0 ? Math.round((progressDone / progressTotal) * 100) : 0}%</span>
              </div>
            </div>

            {/* Terminal logs */}
            <div className="bg-black/50 p-3 rounded-xl border border-slate-800 text-left font-mono text-[10px] text-emerald-400 h-24 overflow-y-auto space-y-1">
              {logs.map((l, i) => (
                <div key={i}>{l}</div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 3: AUDIT RESULTS DASHBOARD & AUTO-APPLY */}
        {isCompleted && auditResults.length > 0 && (
          <div className="space-y-5">
            
            {/* Scorecard Overview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-900 to-slate-900 text-white border border-indigo-500/30 space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-300">
                  Overall Health Score
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-amber-400">{avgQualityScore}</span>
                  <span className="text-xs font-bold text-slate-300">/ 100</span>
                </div>
                <div className="text-[10px] text-indigo-200">
                  {avgQualityScore >= 85 ? '🌟 Exam Ready (Grade A)' : '⚡ Good (Fixes Applied)'}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  High Quality (85-100)
                </span>
                <div className="text-3xl font-black text-emerald-700 dark:text-emerald-300">
                  {countExcellent}
                </div>
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400">
                  Verified & Ready
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  Polished & Upgraded
                </span>
                <div className="text-3xl font-black text-amber-700 dark:text-amber-300">
                  {countGood}
                </div>
                <div className="text-[10px] text-amber-600 dark:text-amber-400">
                  Enhanced Distractors / Explanations
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">
                  Disputed Answer Keys
                </span>
                <div className="text-3xl font-black text-rose-700 dark:text-rose-300">
                  {countDisputed}
                </div>
                <div className="text-[10px] text-rose-600 dark:text-rose-400">
                  Corrected Marked Answer
                </div>
              </div>
            </div>

            {/* ACTION BANNER: AUTO-FIX FAULTY MCQS */}
            {countFaulty > 0 && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-600 via-amber-600 to-indigo-600 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider">
                      {countFaulty} Faulty MCQs / Answer Key Disputes Detected
                    </h4>
                    <p className="text-[11px] text-white/90">
                      You can auto-repair all {countFaulty} faulty questions simultaneously with 1 click.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRepairAllFaulty}
                  disabled={isBulkRepairing}
                  className="px-5 py-2.5 bg-slate-950 hover:bg-slate-900 text-amber-300 font-black text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 shrink-0 cursor-pointer disabled:opacity-50"
                >
                  {isBulkRepairing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-amber-300" />
                      <span>Auto-Repairing All {countFaulty} MCQs...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                      <span>⚡ Auto-Repair All {countFaulty} Faulty MCQs (1-Click)</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Filter Tabs & Bulk Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                <button
                  onClick={() => setActiveTabFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTabFilter === 'all'
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  All Audited ({auditResults.length})
                </button>
                {countFaulty > 0 && (
                  <button
                    onClick={() => setActiveTabFilter('faulty')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1 cursor-pointer ${
                      activeTabFilter === 'faulty'
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 hover:bg-rose-200'
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Faulty / Errors ({countFaulty})
                  </button>
                )}
                {countDisputed > 0 && (
                  <button
                    onClick={() => setActiveTabFilter('disputed')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeTabFilter === 'disputed'
                        ? 'bg-amber-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-amber-600 hover:bg-amber-50'
                    }`}
                  >
                    Disputed Keys ({countDisputed})
                  </button>
                )}
                <button
                  onClick={() => setActiveTabFilter('excellent')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTabFilter === 'excellent'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  Excellent ({countExcellent})
                </button>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => {
                    const allApplied = auditResults.every((r) => r.applied);
                    setAuditResults((prev) => prev.map((r) => ({ ...r, applied: !allApplied })));
                  }}
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                >
                  {auditResults.every((r) => r.applied) ? 'Deselect All' : 'Select All'}
                </button>

                <button
                  onClick={handleConfirmApplyAll}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>
                    Apply All AI Improvements ({auditResults.filter((r) => r.applied).length} MCQs)
                  </span>
                </button>
              </div>
            </div>

            {/* Questions Inspection List */}
            <div className="max-h-[500px] overflow-y-auto space-y-3 p-1">
              {filteredDisplayResults.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-500">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="text-sm font-bold">No questions found in this filter category.</p>
                </div>
              ) : (
                filteredDisplayResults.map((item, idx) => {
                  const rep = item.report;
                  const isExpanded = expandedId === item.id;
                  const isEditing = editingItemId === item.id;
                  const isRepairing = repairingId === item.id;
                  const score = normalizeQualityScore(item.improved.quality_score || rep?.overallQualityScore, 85);
                  
                  const origKey = normalizeAnswerKey(item.original.correct_answer, 'A');
                  const confKey = normalizeAnswerKey(
                    rep?.factualAccuracy?.confirmedAnswer || item.improved.correct_answer,
                    origKey
                  );
                  const isKeyDisputed = origKey !== confKey;
                  const isStatusInaccurate =
                    rep?.factualAccuracy?.status === 'Potentially Inaccurate' ||
                    rep?.factualAccuracy?.status === 'Needs Correction';
                  const isDisputed = isKeyDisputed || isStatusInaccurate;

                  return (
                    <div
                      key={item.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        isDisputed && !item.isRepaired
                          ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800 shadow-xs'
                          : item.applied
                          ? 'bg-white dark:bg-slate-900 border-emerald-500/40 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-850/60 border-slate-200 dark:border-slate-800 opacity-60'
                      }`}
                    >
                      {/* Top Header Line */}
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <input
                            type="checkbox"
                            checked={item.applied}
                            onChange={() => handleToggleApplyItem(item.id)}
                            className="w-4 h-4 rounded text-emerald-600 cursor-pointer"
                          />
                          <span className="w-6 h-6 rounded-lg bg-blue-600 text-white font-black text-xs flex items-center justify-center">
                            Q{item.original.question_number || idx + 1}
                          </span>

                          <span
                            className={`px-2 py-0.5 rounded text-xs font-black flex items-center gap-1 ${
                              score >= 85
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                : score >= 70
                                ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                                : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                            }`}
                          >
                            <ShieldCheck className="w-3 h-3" /> QA {score}/100
                          </span>

                          <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-xs font-bold">
                            {rep?.factualAccuracy?.status || 'Verified'}
                          </span>

                          {item.isRepaired && (
                            <span className="px-2 py-0.5 bg-emerald-600 text-white rounded text-xs font-black flex items-center gap-1">
                              <Check className="w-3 h-3" /> Repaired & Verified
                            </span>
                          )}

                          {isKeyDisputed && !item.isRepaired && (
                            <span className="px-2 py-0.5 bg-rose-500 text-white rounded text-xs font-black animate-pulse flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Key Fixed: Option {origKey} ➔ Option {confKey}
                            </span>
                          )}

                          {!isKeyDisputed && isStatusInaccurate && !item.isRepaired && (
                            <span className="px-2 py-0.5 bg-amber-500 text-white rounded text-xs font-black flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Needs Content Fix
                            </span>
                          )}
                        </div>

                        {/* Action Buttons for this question */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleRepairSingleItem(item.id)}
                            disabled={isRepairing}
                            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            title="Run Targeted 1-Click AI Auto-Repair on this question"
                          >
                            {isRepairing ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Zap className="w-3.5 h-3.5 fill-slate-950" />
                            )}
                            <span>{isRepairing ? 'Repairing...' : 'Fix with AI'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => (isEditing ? handleCancelEdit() : handleStartEdit(item))}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>{isEditing ? 'Cancel' : 'Edit / Manual Fix'}</span>
                          </button>

                          <button
                            onClick={() => setExpandedId(isExpanded ? null : item.id)}
                            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 cursor-pointer px-1"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* INLINE EDIT MODE */}
                      {isEditing && editForm ? (
                        <div className="mt-3 p-4 bg-slate-50 dark:bg-slate-850 rounded-xl border border-indigo-400/40 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                              <Edit3 className="w-3.5 h-3.5" /> Manual Fix & Correction Form
                            </span>
                            <div className="flex items-center gap-1 text-xs">
                              <span className="font-bold text-slate-500">Correct Key:</span>
                              {(['A', 'B', 'C', 'D'] as const).map((key) => (
                                <button
                                  key={key}
                                  type="button"
                                  onClick={() => setEditForm((prev) => prev ? { ...prev, correct_answer: key } : null)}
                                  className={`w-7 h-7 rounded-lg font-black text-xs transition-all ${
                                    editForm.correct_answer === key
                                      ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-400'
                                      : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600'
                                  }`}
                                >
                                  {key}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                              Question Text:
                            </label>
                            <textarea
                              value={editForm.question_text || ''}
                              onChange={(e) => setEditForm((prev) => prev ? { ...prev, question_text: e.target.value } : null)}
                              className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                              rows={2}
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {(['A', 'B', 'C', 'D'] as const).map((optKey) => {
                              const field = `option_${optKey.toLowerCase()}` as keyof Question;
                              const isSelectedAns = editForm.correct_answer === optKey;
                              return (
                                <div key={optKey} className="space-y-1">
                                  <div className="flex items-center justify-between text-[11px]">
                                    <span className="font-bold text-slate-600 dark:text-slate-400">
                                      Option {optKey}:
                                    </span>
                                    {isSelectedAns && (
                                      <span className="text-emerald-600 font-bold text-[10px]">
                                        ✓ Marked Correct
                                      </span>
                                    )}
                                  </div>
                                  <input
                                    type="text"
                                    value={String(editForm[field] || '')}
                                    onChange={(e) => setEditForm((prev) => prev ? { ...prev, [field]: e.target.value } : null)}
                                    className={`w-full p-2 rounded-lg border text-xs bg-white dark:bg-slate-900 focus:outline-none ${
                                      isSelectedAns
                                        ? 'border-emerald-500 ring-1 ring-emerald-500 font-bold text-slate-900 dark:text-white'
                                        : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                                    }`}
                                  />
                                </div>
                              );
                            })}
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                              Explanation & Solution:
                            </label>
                            <textarea
                              value={editForm.explanation || ''}
                              onChange={(e) => setEditForm((prev) => prev ? { ...prev, explanation: e.target.value } : null)}
                              className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                              rows={2}
                              placeholder="Add comprehensive pedagogical explanation..."
                            />
                          </div>

                          <div className="flex justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={handleCancelEdit}
                              className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-lg"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(item.id)}
                              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg flex items-center gap-1 shadow-sm"
                            >
                              <Check className="w-3.5 h-3.5" /> Save Changes
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* Question Summary Text */}
                          <div className="mt-2 text-xs font-semibold text-slate-900 dark:text-white leading-relaxed">
                            {item.improved.question_text}
                          </div>

                          {/* Quick Interactive Answer Key & Options Preview */}
                          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
                            {(['A', 'B', 'C', 'D'] as const).map((opt) => {
                              const optKey = `option_${opt.toLowerCase()}` as keyof Question;
                              const isCorrect = item.improved.correct_answer === opt;
                              return (
                                <div
                                  key={opt}
                                  onClick={() => handleChangeAnswerKey(item.id, opt)}
                                  title={`Click to set Option ${opt} as Correct Answer`}
                                  className={`p-2 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                                    isCorrect
                                      ? 'bg-emerald-100 dark:bg-emerald-950/80 border-emerald-500 text-emerald-950 dark:text-emerald-200 font-bold shadow-xs'
                                      : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-amber-400'
                                  }`}
                                >
                                  <div className="truncate flex items-center gap-1.5 flex-1 pr-1">
                                    <span className={`w-5 h-5 rounded-md flex items-center justify-center font-black text-[10px] ${
                                      isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                                    }`}>
                                      {opt}
                                    </span>
                                    <span className="truncate">{String(item.improved[optKey] || '')}</span>
                                  </div>
                                  {isCorrect && (
                                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {item.improved.explanation && (
                            <div className="mt-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-700 dark:text-slate-300">
                              <b className="text-indigo-600 dark:text-indigo-400">Explanation: </b>
                              {item.improved.explanation}
                            </div>
                          )}
                        </>
                      )}

                      {/* Expanded Detail Diff View */}
                      {isExpanded && !isEditing && (
                        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3 text-xs">
                          
                          {/* Recommendations & Reasoning */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {rep?.keyRecommendations && rep.keyRecommendations.length > 0 && (
                              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200 space-y-1">
                                <span className="font-bold block">💡 AI Audit Findings & Suggestions:</span>
                                <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                                  {rep.keyRecommendations.map((rec, rIdx) => (
                                    <li key={rIdx}>{rec}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {rep?.factualAccuracy?.verificationReasoning && (
                              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-200 space-y-1">
                                <span className="font-bold block">🔍 Fact Verification Proof:</span>
                                <p className="text-[11px] leading-relaxed">
                                  {rep.factualAccuracy.verificationReasoning}
                                </p>
                                {rep.linguisticQuality?.bilingualConsistency && (
                                  <p className="text-[10px] text-blue-700 dark:text-blue-300 font-semibold mt-1">
                                    Bilingual Parity: {rep.linguisticQuality.bilingualConsistency}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Side by side diff */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                              <span className="text-[10px] font-black uppercase text-slate-400">
                                Original Question in Test
                              </span>
                              <p className="font-medium text-slate-800 dark:text-slate-200">
                                {item.original.question_text}
                              </p>
                              <p className="text-[11px] text-slate-500 font-bold">
                                Marked Ans: Option {item.original.correct_answer}
                              </p>
                              <p className="text-[11px] text-slate-500 italic">
                                Explanation: {item.original.explanation || 'None'}
                              </p>
                            </div>

                            <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/40 rounded-xl border border-emerald-300 dark:border-emerald-800 space-y-1">
                              <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400">
                                AI Enhanced / Repaired Version
                              </span>
                              <p className="font-bold text-emerald-950 dark:text-emerald-100">
                                {item.improved.question_text}
                              </p>
                              <p className="text-[11px] text-emerald-700 dark:text-emerald-300 font-bold">
                                Verified Ans: Option {item.improved.correct_answer}
                              </p>
                              <p className="text-[11px] text-emerald-800 dark:text-emerald-200">
                                Explanation: {item.improved.explanation}
                              </p>
                            </div>
                          </div>

                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Final Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800 flex-wrap gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
              >
                Close
              </button>

              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleStartAudit}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Re-run Audit
                </button>

                <button
                  type="button"
                  onClick={handleConfirmApplyAll}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4" /> Save {auditResults.filter((r) => r.applied).length} Improved MCQs to Test
                </button>
              </div>
            </div>

          </div>
        )}

      </div>
    </Modal>
  );
};
