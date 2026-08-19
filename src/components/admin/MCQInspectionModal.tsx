import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { 
  Sparkles, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  BookOpen, 
  Check, 
  RefreshCw, 
  Zap, 
  Layers, 
  Target, 
  FileText,
  HelpCircle,
  TrendingUp,
  ArrowRight
} from 'lucide-react';
import { Question } from '../../types';
import { aiService, MCQ360InspectionReport } from '../../services/aiService';

interface MCQInspectionModalProps {
  isOpen: boolean;
  question: Question | null;
  onClose: () => void;
  onApplyImprovement?: (updatedQuestion: Question) => void;
  onToast?: (type: 'success' | 'error' | 'info', msg: string) => void;
}

export const MCQInspectionModal: React.FC<MCQInspectionModalProps> = ({
  isOpen,
  question,
  onClose,
  onApplyImprovement,
  onToast,
}) => {
  const [inspecting, setInspecting] = useState(false);
  const [targetExam, setTargetExam] = useState<string>('General Competitive Mock Test');
  const [logs, setLogs] = useState<string[]>([]);
  const [report, setReport] = useState<MCQ360InspectionReport | null>(null);

  if (!question) return null;

  const handleRunInspection = async () => {
    setInspecting(true);
    setLogs([]);
    setReport(null);

    try {
      const res = await aiService.inspectMCQ(
        question,
        (msg) => {
          setLogs((prev) => [...prev, msg]);
        },
        {
          targetExam,
        }
      );
      setReport(res);
      onToast?.('success', `360° Inspection complete! Quality Score: ${res.overallQualityScore}/100`);
    } catch (err: any) {
      const msg = err?.message || 'Inspection failed';
      onToast?.('error', msg);
      setLogs((prev) => [...prev, `❌ Error: ${msg}`]);
    } finally {
      setInspecting(false);
    }
  };

  const handleApplyUpdates = () => {
    if (!report || !onApplyImprovement) return;

    const imp = report.improvedVersion;
    const updated: Question = {
      ...question,
      question_text: imp.question_text || question.question_text,
      option_a: imp.option_a || question.option_a,
      option_b: imp.option_b || question.option_b,
      option_c: imp.option_c || question.option_c,
      option_d: imp.option_d || question.option_d,
      correct_answer: imp.correct_answer || question.correct_answer,
      explanation: imp.explanation || question.explanation,
      subject: imp.subject || report.syllabusTaxonomy?.recommendedSubject || question.subject,
      chapter: imp.chapter || report.syllabusTaxonomy?.recommendedChapter || question.chapter,
      topic: imp.topic || report.syllabusTaxonomy?.recommendedTopic || question.topic,
      difficulty: imp.difficulty || report.difficultyCalibration?.assessedDifficulty || question.difficulty,
      quality_score: report.overallQualityScore,
      inspection_status: 'verified',
      inspection_notes: report.factualAccuracy?.remarks || 'Inspected & Approved by AI 360° QA',
    };

    onApplyImprovement(updated);
    onToast?.('success', 'Applied AI 360° improvements to question!');
    onClose();
  };

  const getScoreBadgeColor = (score: number) => {
    if (score >= 85) return 'bg-emerald-500 text-white';
    if (score >= 70) return 'bg-blue-500 text-white';
    if (score >= 50) return 'bg-amber-500 text-white';
    return 'bg-rose-500 text-white';
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="360° AI MCQ Inspection & Quality Audit" maxWidth="5xl">
      <div className="space-y-6">

        {/* HERO BANNER & BENCHMARK SELECTOR */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white p-5 rounded-2xl border border-indigo-500/30 shadow-md space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                  <Zap className="w-3 h-3 fill-slate-950" /> Gemini 3.7 Flash QA Engine
                </span>
                <span className="text-xs text-blue-200">
                  Question #{question.question_number || 1}
                </span>
              </div>
              <h3 className="text-lg font-black mt-1">360° Multi-Angle MCQ Inspection</h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Evaluates factual accuracy, option distractors, linguistic clarity, syllabus classification, and generates an optimized version.
              </p>
            </div>

            <button
              onClick={handleRunInspection}
              disabled={inspecting}
              className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 shrink-0 disabled:opacity-50 cursor-pointer"
            >
              {inspecting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Auditing 360°...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-slate-950" />
                  <span>{report ? 'Re-Audit Question' : 'Run 360° Inspection'}</span>
                </>
              )}
            </button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-2 border-t border-indigo-500/20 text-xs">
            <span className="font-bold text-amber-300">🎯 Target Exam Syllabus Benchmark:</span>
            <select
              value={targetExam}
              onChange={(e) => setTargetExam(e.target.value)}
              disabled={inspecting}
              className="flex-1 px-3 py-1.5 rounded-lg bg-slate-800/90 text-white text-xs border border-indigo-500/40 focus:outline-none focus:ring-1 focus:ring-amber-400 font-medium"
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
        </div>

        {/* CURRENT QUESTION SUMMARY BOX */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Current Question in Test/Bank
            </span>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold rounded-md">
                {question.subject || 'General'}
              </span>
              {question.section && (
                <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold rounded-md">
                  {question.section}
                </span>
              )}
              {question.chapter && (
                <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold rounded-md">
                  {question.chapter}
                </span>
              )}
              {question.topic && (
                <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold rounded-md">
                  {question.topic}
                </span>
              )}
            </div>
          </div>

          <p className="text-sm font-bold text-slate-900 dark:text-white leading-relaxed">
            {question.question_text}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className={`p-2 rounded-lg border ${question.correct_answer === 'A' ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-700 font-bold text-emerald-900 dark:text-emerald-300' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'}`}>
              A. {question.option_a} {question.correct_answer === 'A' && '✓ (Current Key)'}
            </div>
            <div className={`p-2 rounded-lg border ${question.correct_answer === 'B' ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-700 font-bold text-emerald-900 dark:text-emerald-300' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'}`}>
              B. {question.option_b} {question.correct_answer === 'B' && '✓ (Current Key)'}
            </div>
            <div className={`p-2 rounded-lg border ${question.correct_answer === 'C' ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-700 font-bold text-emerald-900 dark:text-emerald-300' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'}`}>
              C. {question.option_c} {question.correct_answer === 'C' && '✓ (Current Key)'}
            </div>
            <div className={`p-2 rounded-lg border ${question.correct_answer === 'D' ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-700 font-bold text-emerald-900 dark:text-emerald-300' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'}`}>
              D. {question.option_d} {question.correct_answer === 'D' && '✓ (Current Key)'}
            </div>
          </div>

          {question.explanation && (
            <p className="text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <b className="text-indigo-600 dark:text-indigo-400">Current Explanation:</b> {question.explanation}
            </p>
          )}
        </div>

        {/* LOGS BOX IF RUNNING */}
        {logs.length > 0 && !report && (
          <div className="p-3 bg-slate-900 rounded-xl font-mono text-xs text-slate-300 space-y-1">
            {logs.map((log, i) => (
              <div key={i}>{log}</div>
            ))}
          </div>
        )}

        {/* 360 DEGREE AUDIT REPORT RESULTS */}
        {report && (
          <div className="space-y-6">

            {/* AUDIT SCORE & METRIC GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between shadow-xs">
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Quality Score</span>
                  <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                    {report.overallQualityScore}/100
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-xl text-xs font-black uppercase ${getScoreBadgeColor(report.overallQualityScore)}`}>
                  {report.qualityRating}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Factual Accuracy</span>
                <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4" /> {report.factualAccuracy?.status || 'Verified'}
                </div>
                <div className="text-[11px] font-bold text-slate-700 dark:text-slate-200 mt-0.5">
                  Confirmed: Option {report.factualAccuracy?.confirmedAnswer}
                </div>
                {report.factualAccuracy?.verificationReasoning && (
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                    {report.factualAccuracy.verificationReasoning}
                  </p>
                )}
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Grammar & Clarity</span>
                <div className="text-sm font-bold text-blue-600 dark:text-blue-400 mt-1">
                  {report.linguisticQuality?.score || 9}/10 ({report.linguisticQuality?.clarity || 'Clear'})
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  {report.linguisticQuality?.grammarFeedback}
                </div>
                {report.linguisticQuality?.bilingualConsistency && (
                  <span className="inline-block text-[10px] text-blue-600 dark:text-blue-400 font-bold mt-1 bg-blue-50 dark:bg-blue-950/50 px-1.5 py-0.5 rounded">
                    Bilingual: {report.linguisticQuality.bilingualConsistency}
                  </span>
                )}
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Calibrated Level</span>
                <div className="text-sm font-bold text-purple-600 dark:text-purple-400 mt-1">
                  {report.difficultyCalibration?.assessedDifficulty || 'Medium'}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                  {report.difficultyCalibration?.targetExamSuitability || 'State & National Exams'}
                </div>
              </div>
            </div>

            {/* DEEP AUDIT PERSPECTIVES */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* DISTRACTORS & OPTIONS AUDIT */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  <Target className="w-4 h-4" /> Distractor & Options Analysis
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300">
                  <b>Quality:</b> {report.distractorAnalysis?.quality}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {report.distractorAnalysis?.remarks}
                </p>
                {report.distractorAnalysis?.suggestions && (
                  <p className="text-[11px] text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-2 rounded-lg">
                    💡 {report.distractorAnalysis.suggestions}
                  </p>
                )}
              </div>

              {/* EXPLANATION & PEDAGOGICAL DEPTH */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  <BookOpen className="w-4 h-4" /> Explanation & Clarity Audit
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300">
                  <b>Depth:</b> {report.explanationDepth?.quality}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {report.explanationDepth?.remarks}
                </p>
                <div className="text-[11px] text-indigo-800 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 p-2 rounded-lg">
                  <b>Subject & Chapter:</b> {report.syllabusTaxonomy?.recommendedSubject} → {report.syllabusTaxonomy?.recommendedChapter || report.syllabusTaxonomy?.recommendedTopic || 'General'}
                </div>
              </div>

            </div>

            {/* RECOMMENDATIONS */}
            {report.keyRecommendations && report.keyRecommendations.length > 0 && (
              <div className="p-4 bg-blue-50 dark:bg-blue-950/40 rounded-2xl border border-blue-200 dark:border-blue-800 space-y-2">
                <h4 className="text-xs font-bold text-blue-900 dark:text-blue-200 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" /> Key QA Recommendations
                </h4>
                <ul className="text-xs text-blue-800 dark:text-blue-300 space-y-1 list-disc list-inside">
                  {report.keyRecommendations.map((rec, idx) => (
                    <li key={idx}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* IMPROVED VERSION PREVIEW */}
            {report.improvedVersion && (
              <div className="p-5 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 rounded-2xl border-2 border-emerald-500/40 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-emerald-600" />
                    <h4 className="font-bold text-sm text-emerald-900 dark:text-emerald-200">
                      AI Polished & Improved Version
                    </h4>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-900 px-2.5 py-0.5 rounded-md">
                    Ready to Apply
                  </span>
                </div>

                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  {report.improvedVersion.question_text}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className={`p-2 rounded-lg border ${report.improvedVersion.correct_answer === 'A' ? 'bg-emerald-100 dark:bg-emerald-900 border-emerald-400 font-bold text-emerald-900 dark:text-emerald-200' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}>
                    A. {report.improvedVersion.option_a} {report.improvedVersion.correct_answer === 'A' && '✓ (Correct)'}
                  </div>
                  <div className={`p-2 rounded-lg border ${report.improvedVersion.correct_answer === 'B' ? 'bg-emerald-100 dark:bg-emerald-900 border-emerald-400 font-bold text-emerald-900 dark:text-emerald-200' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}>
                    B. {report.improvedVersion.option_b} {report.improvedVersion.correct_answer === 'B' && '✓ (Correct)'}
                  </div>
                  <div className={`p-2 rounded-lg border ${report.improvedVersion.correct_answer === 'C' ? 'bg-emerald-100 dark:bg-emerald-900 border-emerald-400 font-bold text-emerald-900 dark:text-emerald-200' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}>
                    C. {report.improvedVersion.option_c} {report.improvedVersion.correct_answer === 'C' && '✓ (Correct)'}
                  </div>
                  <div className={`p-2 rounded-lg border ${report.improvedVersion.correct_answer === 'D' ? 'bg-emerald-100 dark:bg-emerald-900 border-emerald-400 font-bold text-emerald-900 dark:text-emerald-200' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}>
                    D. {report.improvedVersion.option_d} {report.improvedVersion.correct_answer === 'D' && '✓ (Correct)'}
                  </div>
                </div>

                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-emerald-200 dark:border-emerald-800 text-xs">
                  <b className="text-emerald-700 dark:text-emerald-400">Improved Explanation:</b> {report.improvedVersion.explanation}
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    onClick={handleApplyUpdates}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" /> Apply AI Improvements to Question
                  </button>
                </div>
              </div>
            )}

          </div>
        )}

      </div>
    </Modal>
  );
};
