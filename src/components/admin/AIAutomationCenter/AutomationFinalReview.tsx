import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  Eye,
  Send,
  FileCheck,
  Check,
  X,
  ExternalLink,
  BookOpen,
  Clock,
  Layers,
  Award,
  ChevronRight,
  Sliders,
  Download,
  AlertCircle
} from 'lucide-react';
import {
  FinalTestAuditReport,
  GeneratedTestSummary,
  AIAutomationConfig
} from '../../../types/aiAutomation';
import { Test, Question } from '../../../types';

interface AutomationFinalReviewProps {
  generatedTests: GeneratedTestSummary[];
  finalAudit: FinalTestAuditReport | null;
  config: AIAutomationConfig;
  onPublishAll: () => Promise<void>;
  onTogglePublishTest: (testId: string, currentStatus: boolean) => Promise<void>;
  onStartNewAutomation: () => void;
  isPublishing: boolean;
}

export const AutomationFinalReview: React.FC<AutomationFinalReviewProps> = ({
  generatedTests,
  finalAudit,
  config,
  onPublishAll,
  onTogglePublishTest,
  onStartNewAutomation,
  isPublishing
}) => {
  const [selectedTestToPreview, setSelectedTestToPreview] = useState<GeneratedTestSummary | null>(null);
  const [isAllPublished, setIsAllPublished] = useState(false);

  const publishedCount = generatedTests.filter(t => t.is_published).length;
  const totalCount = generatedTests.length;

  const handlePublishAll = async () => {
    await onPublishAll();
    setIsAllPublished(true);
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      
      {/* ========================================================================= */}
      {/* PHASE 2A: FINAL MOCK TEST AUDIT VERIFICATION REPORT */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xl space-y-6">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
          <div className="flex items-center gap-3.5">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white shadow-lg ${
              finalAudit?.passed
                ? 'bg-emerald-600 shadow-emerald-500/20'
                : 'bg-amber-600 shadow-amber-500/20'
            }`}>
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Phase 2A Verification
                </span>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                  finalAudit?.passed
                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                    : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                }`}>
                  {finalAudit?.passed ? 'Audit Passed (100% Verified)' : 'Audit Attention Needed'}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                Final Mock Test Series Integrity Audit
              </h2>
            </div>
          </div>

          <div className="text-xs text-slate-500 font-bold bg-slate-50 dark:bg-slate-800/80 px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700">
            Generated: <strong className="text-slate-900 dark:text-white">{totalCount} Mock Tests</strong> • <strong className="text-blue-600 dark:text-blue-400">{config.mcqsPerMockTest * totalCount} Questions</strong>
          </div>
        </div>

        {/* 6 INTEGRITY CHECKS GRID */}
        {finalAudit && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {finalAudit.checks.map(check => (
              <div
                key={check.id}
                className={`p-4 rounded-2xl border text-xs space-y-1.5 transition-all ${
                  check.passed
                    ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
                    : 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/60'
                }`}
              >
                <div className="flex items-center justify-between font-black">
                  <span className={check.passed ? 'text-emerald-900 dark:text-emerald-100' : 'text-amber-900 dark:text-amber-100'}>
                    {check.title}
                  </span>
                  {check.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  )}
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  {check.description}
                </p>
                {check.details && (
                  <p className="text-[10px] text-slate-500 font-mono pt-1 border-t border-slate-200/40 dark:border-slate-800/40">
                    {check.details}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* PHASE 2B: MANDATORY HUMAN APPROVAL GATE 2 (REVIEW & PUBLISH) */}
      {/* ========================================================================= */}
      <div className="p-6 rounded-3xl bg-linear-to-r from-emerald-600 via-teal-600 to-blue-600 text-white shadow-2xl space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-black uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-white" />
              <span>Phase 2B — Final Approval Gate 2</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black tracking-tight">
              Ready for Review: Publish Mock Test Series
            </h3>
            <p className="text-xs sm:text-sm text-emerald-100 max-w-2xl">
              All {totalCount} mock tests are currently in <strong>DRAFT status (Protected)</strong>.
              Review test questions below and click <strong>"PUBLISH ALL TESTS NOW"</strong> to make them live for students on the student practice portal.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              disabled={isPublishing || publishedCount === totalCount}
              onClick={handlePublishAll}
              className={`py-4 px-7 rounded-2xl font-black text-sm transition-all flex items-center gap-3 shadow-2xl cursor-pointer ${
                isPublishing || publishedCount === totalCount
                  ? 'bg-emerald-800 text-emerald-200 cursor-not-allowed opacity-90'
                  : 'bg-white text-emerald-950 hover:bg-emerald-50 shadow-white/20 hover:scale-[1.02]'
              }`}
            >
              <Send className="w-4 h-4 text-emerald-700" />
              <span>
                {publishedCount === totalCount
                  ? 'ALL TESTS PUBLISHED & LIVE'
                  : `PUBLISH ALL ${totalCount} TESTS NOW`}
              </span>
              <ArrowRight className="w-4 h-4 text-emerald-700" />
            </button>
          </div>
        </div>

        {/* PROGRESS MINI BAR */}
        <div className="pt-2 flex items-center justify-between text-xs font-bold text-emerald-100 border-t border-white/20">
          <span>Publishing Status:</span>
          <span>{publishedCount} of {totalCount} Tests Published ({Math.round((publishedCount / Math.max(1, totalCount)) * 100)}%)</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* GENERATED TESTS LIST TABLE / CARDS */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
        
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              Generated Mock Test Series ({totalCount} Tests)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Click "Preview Questions" on any test to inspect question text, options, and explanations.
            </p>
          </div>

          <button
            type="button"
            onClick={onStartNewAutomation}
            className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer shadow-xs transition-all"
          >
            Start New Automation
          </button>
        </div>

        {/* TEST CARDS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          {generatedTests.map((summary, idx) => {
            const isPub = summary.is_published;
            return (
              <div
                key={summary.test.id}
                className={`p-5 rounded-3xl border transition-all ${
                  isPub
                    ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/80 shadow-xs'
                    : 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/80'
                }`}
              >
                {/* CARD HEADER */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-slate-700/60">
                  <span className="font-mono text-xs font-black text-slate-500">
                    {summary.test.test_code || `TEST-${idx + 1}`}
                  </span>

                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    isPub
                      ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300'
                      : 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300'
                  }`}>
                    {isPub ? 'LIVE / PUBLISHED' : 'DRAFT (Review)'}
                  </span>
                </div>

                {/* TEST TITLE & DETAILS */}
                <div className="py-3 space-y-2">
                  <h4 className="text-sm font-black text-slate-900 dark:text-white line-clamp-1">
                    {summary.test.title}
                  </h4>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] font-bold text-slate-400 block">MCQs</span>
                      <span className="font-black text-slate-900 dark:text-white">
                        {summary.question_count} Questions
                      </span>
                    </div>

                    <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] font-bold text-slate-400 block">Marks</span>
                      <span className="font-black text-slate-900 dark:text-white">
                        {summary.total_marks} Total Marks
                      </span>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-500 space-y-0.5 pt-1">
                    <div>Category: <strong className="text-slate-700 dark:text-slate-300">{summary.test.category}</strong></div>
                    <div>Subject: <strong className="text-slate-700 dark:text-slate-300">{summary.test.subject}</strong></div>
                    <div>Duration: <strong className="text-slate-700 dark:text-slate-300">{summary.test.duration_minutes} Mins</strong></div>
                  </div>
                </div>

                {/* ACTIONS */}
                <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-200/60 dark:border-slate-700/60">
                  <button
                    type="button"
                    onClick={() => setSelectedTestToPreview(summary)}
                    className="px-3 py-2 text-xs font-bold rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer shadow-xs transition-all flex items-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Preview Questions</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onTogglePublishTest(summary.test.id, isPub)}
                    className={`px-3 py-2 text-xs font-black rounded-xl cursor-pointer shadow-xs transition-all flex items-center gap-1.5 ${
                      isPub
                        ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    <Send className="w-3 h-3" />
                    <span>{isPub ? 'Unpublish' : 'Publish'}</span>
                  </button>
                </div>

              </div>
            );
          })}
        </div>

      </div>

      {/* ========================================================================= */}
      {/* TEST QUESTIONS PREVIEW MODAL */}
      {/* ========================================================================= */}
      {selectedTestToPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-3xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  {selectedTestToPreview.test.title}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedTestToPreview.question_count} Questions • {selectedTestToPreview.total_marks} Marks • {selectedTestToPreview.test.duration_minutes} Mins
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTestToPreview(null)}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* QUESTIONS LIST */}
            <div className="space-y-4 pt-2">
              {selectedTestToPreview.questions.map((q, qIdx) => (
                <div key={q.id || qIdx} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-black text-blue-600 dark:text-blue-400">
                      Q{qIdx + 1}.
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                      Ans: {q.correct_answer}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <p className="font-bold text-slate-900 dark:text-white text-sm">
                      {q.question_text}
                    </p>

                    {q.question_hi && q.question_hi !== q.question_text && (
                      <div className="p-2 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-800/40">
                        <span className="inline-block px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 text-[10px] font-black uppercase tracking-wider mb-1">
                          हिन्दी अनुवाद
                        </span>
                        <p className="text-xs font-semibold text-purple-950 dark:text-purple-200">
                          {q.question_hi}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className={`p-2 rounded-xl border ${q.correct_answer === 'A' ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 font-bold text-emerald-800 dark:text-emerald-200' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                      <strong>A:</strong> {q.option_a}
                    </div>
                    <div className={`p-2 rounded-xl border ${q.correct_answer === 'B' ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 font-bold text-emerald-800 dark:text-emerald-200' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                      <strong>B:</strong> {q.option_b}
                    </div>
                    <div className={`p-2 rounded-xl border ${q.correct_answer === 'C' ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 font-bold text-emerald-800 dark:text-emerald-200' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                      <strong>C:</strong> {q.option_c}
                    </div>
                    <div className={`p-2 rounded-xl border ${q.correct_answer === 'D' ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 font-bold text-emerald-800 dark:text-emerald-200' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                      <strong>D:</strong> {q.option_d}
                    </div>
                  </div>

                  {q.explanation && (
                    <div className="p-2 rounded-xl bg-white/70 dark:bg-slate-800 text-[11px] text-slate-500">
                      <strong>Explanation:</strong> {q.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedTestToPreview(null)}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 cursor-pointer"
              >
                Close Preview
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
