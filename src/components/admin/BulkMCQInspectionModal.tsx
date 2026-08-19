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
  Eye
} from 'lucide-react';
import { Question } from '../../types';
import { aiService, MCQ360InspectionReport } from '../../services/aiService';
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
  const [activeTabFilter, setActiveTabFilter] = useState<'all' | 'excellent' | 'needs_work' | 'disputed'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Reset state on open
      setSelectedIds(new Set(questions.map((q) => q.id)));
      setIsAuditing(false);
      setIsCompleted(false);
      setAuditResults([]);
      setLogs([]);
      setProgressDone(0);
      setProgressTotal(questions.length);
    }
  }, [isOpen, questions]);

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
          auditResults.reduce((acc, curr) => acc + (curr.report?.overallQualityScore || 80), 0) /
            auditResults.length
        )
      : 0;

  const countExcellent = auditResults.filter(
    (r) => (r.report?.overallQualityScore || 0) >= 85
  ).length;
  const countGood = auditResults.filter(
    (r) =>
      (r.report?.overallQualityScore || 0) >= 70 && (r.report?.overallQualityScore || 0) < 85
  ).length;
  const countNeedsWork = auditResults.filter(
    (r) => (r.report?.overallQualityScore || 0) < 70
  ).length;
  const countDisputed = auditResults.filter(
    (r) =>
      r.report?.factualAccuracy?.status === 'Potentially Inaccurate' ||
      r.report?.factualAccuracy?.status === 'Needs Correction'
  ).length;

  const filteredDisplayResults = auditResults.filter((r) => {
    if (activeTabFilter === 'excellent') return (r.report?.overallQualityScore || 0) >= 85;
    if (activeTabFilter === 'needs_work') return (r.report?.overallQualityScore || 0) < 70;
    if (activeTabFilter === 'disputed')
      return (
        r.report?.factualAccuracy?.status === 'Potentially Inaccurate' ||
        r.report?.factualAccuracy?.status === 'Needs Correction'
      );
    return true;
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={isAuditing ? () => {} : onClose}
      title="360° AI MCQ Inspection Engine (All MCQs at Once)"
      maxWidth="4xl"
    >
      <div className="space-y-6">
        
        {/* Header Hero */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-indigo-700 text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-slate-950/80 text-amber-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-300" /> Batch 360° QA Audit
              </span>
              <span className="text-xs font-semibold text-white/90">
                {testTitle || 'Mock Test Questions'}
              </span>
            </div>
            <h3 className="text-lg font-black text-white">
              Instant Exam-Wide Quality & Key Verification
            </h3>
            <p className="text-xs text-white/80 max-w-xl">
              Audits all {questions.length} MCQs simultaneously for factual accuracy, distractor quality, grammatical precision, difficulty calibration, and detailed explanations.
            </p>
          </div>

          {!isAuditing && !isCompleted && (
            <button
              onClick={handleStartAudit}
              disabled={targetQuestions.length === 0}
              className="px-6 py-3 bg-slate-950 hover:bg-slate-900 text-amber-300 font-black text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 shrink-0 cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
              <span>Inspect All {targetQuestions.length} MCQs Now</span>
            </button>
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
                  <CheckCircle2 className="w-3.5 h-3.5" /> Factual Check
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
                  <BookOpen className="w-3.5 h-3.5" /> Explanations
                </div>
                <p className="text-[11px] text-slate-500">
                  Enriches step-by-step solutions and key memory takeaways.
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
                  {avgQualityScore >= 85 ? '🌟 Exam Ready (Grade A)' : '⚡ Good (Minor Polish Applied)'}
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
                  Fixed Disputed Keys
                </span>
                <div className="text-3xl font-black text-rose-700 dark:text-rose-300">
                  {countDisputed}
                </div>
                <div className="text-[10px] text-rose-600 dark:text-rose-400">
                  Corrected Marked Answer
                </div>
              </div>
            </div>

            {/* Filter Tabs & Bulk Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-1 overflow-x-auto pb-1">
                <button
                  onClick={() => setActiveTabFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    activeTabFilter === 'all'
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  All Audited ({auditResults.length})
                </button>
                <button
                  onClick={() => setActiveTabFilter('excellent')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    activeTabFilter === 'excellent'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Excellent ({countExcellent})
                </button>
                {countDisputed > 0 && (
                  <button
                    onClick={() => setActiveTabFilter('disputed')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      activeTabFilter === 'disputed'
                        ? 'bg-rose-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-rose-600'
                    }`}
                  >
                    Disputed Keys ({countDisputed})
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const allApplied = auditResults.every((r) => r.applied);
                    setAuditResults((prev) => prev.map((r) => ({ ...r, applied: !allApplied })));
                  }}
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
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
            <div className="max-h-96 overflow-y-auto space-y-3 p-1">
              {filteredDisplayResults.map((item, idx) => {
                const rep = item.report;
                const isExpanded = expandedId === item.id;
                const score = rep?.overallQualityScore || 80;

                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      item.applied
                        ? 'bg-white dark:bg-slate-900 border-emerald-500/40 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-850/60 border-slate-200 dark:border-slate-800 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
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
                          {rep?.factualAccuracy?.status}
                        </span>

                        {rep?.factualAccuracy?.confirmedAnswer !== item.original.correct_answer && (
                          <span className="px-2 py-0.5 bg-rose-500 text-white rounded text-xs font-black animate-pulse">
                            Key Fixed: Option {item.original.correct_answer} ➔ Option {rep?.factualAccuracy?.confirmedAnswer}
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => setExpandedId(isExpanded ? null : item.id)}
                        className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        {isExpanded ? (
                          <>
                            <span>Hide Details</span>
                            <ChevronUp className="w-3.5 h-3.5" />
                          </>
                        ) : (
                          <>
                            <span>View Comparison & Recommendations</span>
                            <ChevronDown className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    </div>

                    {/* Question Summary Text */}
                    <div className="mt-2 text-xs font-semibold text-slate-900 dark:text-white">
                      {item.improved.question_text}
                    </div>

                    {/* Brief Options Preview */}
                    <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px]">
                      {['A', 'B', 'C', 'D'].map((opt) => {
                        const optKey = `option_${opt.toLowerCase()}` as keyof Question;
                        const isCorrect = item.improved.correct_answer === opt;
                        return (
                          <div
                            key={opt}
                            className={`px-2 py-1 rounded-lg border truncate ${
                              isCorrect
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-400 text-emerald-800 dark:text-emerald-200 font-bold'
                                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            <span className="font-bold">{opt}.</span> {String(item.improved[optKey] || '')}
                          </div>
                        );
                      })}
                    </div>

                    {/* Expanded Detail Diff View */}
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3 text-xs">
                        
                        {/* Recommendations & Reasoning */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {rep?.keyRecommendations && rep.keyRecommendations.length > 0 && (
                            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200 space-y-1">
                              <span className="font-bold block">💡 AI Findings & Recommendations:</span>
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
                              Original Question
                            </span>
                            <p className="font-medium text-slate-800 dark:text-slate-200">
                              {item.original.question_text}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              Ans: Option {item.original.correct_answer}
                            </p>
                            <p className="text-[11px] text-slate-500 italic">
                              Explanation: {item.original.explanation || 'None'}
                            </p>
                          </div>

                          <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/40 rounded-xl border border-emerald-300 dark:border-emerald-800 space-y-1">
                            <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400">
                              AI Enhanced Version (Applied)
                            </span>
                            <p className="font-bold text-emerald-950 dark:text-emerald-100">
                              {item.improved.question_text}
                            </p>
                            <p className="text-[11px] text-emerald-700 dark:text-emerald-300 font-bold">
                              Ans: Option {item.improved.correct_answer}
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
              })}
            </div>

            {/* Bottom Final Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                Close
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleStartAudit}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Re-run Audit
                </button>

                <button
                  type="button"
                  onClick={handleConfirmApplyAll}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
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
