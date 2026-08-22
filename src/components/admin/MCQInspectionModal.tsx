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
  ArrowRight,
  Edit3,
  Wrench
} from 'lucide-react';
import { Question } from '../../types';
import { aiService, MCQ360InspectionReport, normalizeAnswerKey, normalizeQualityScore } from '../../services/aiService';

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
  const [isRepairing, setIsRepairing] = useState(false);
  const [targetExam, setTargetExam] = useState<string>('General Competitive Mock Test');
  const [logs, setLogs] = useState<string[]>([]);
  const [report, setReport] = useState<MCQ360InspectionReport | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editableQuestion, setEditableQuestion] = useState<Question | null>(null);

  if (!question) return null;

  const currentWorkingQuestion = editableQuestion || question;

  const handleRunInspection = async () => {
    setInspecting(true);
    setLogs([]);
    setReport(null);

    try {
      const res = await aiService.inspectMCQ(
        currentWorkingQuestion,
        (msg) => {
          setLogs((prev) => [...prev, msg]);
        },
        {
          targetExam,
        }
      );
      setReport(res);

      // Pre-fill working question with improved values if available
      const imp = res.improvedVersion;
      const verifiedKey = (['A', 'B', 'C', 'D'].includes(res.factualAccuracy?.confirmedAnswer?.toUpperCase())
        ? res.factualAccuracy.confirmedAnswer.toUpperCase()
        : (['A', 'B', 'C', 'D'].includes(imp?.correct_answer?.toUpperCase())
          ? imp.correct_answer.toUpperCase()
          : currentWorkingQuestion.correct_answer || 'A')) as 'A' | 'B' | 'C' | 'D';

      setEditableQuestion({
        ...currentWorkingQuestion,
        question_text: imp?.question_text || currentWorkingQuestion.question_text,
        option_a: imp?.option_a || currentWorkingQuestion.option_a,
        option_b: imp?.option_b || currentWorkingQuestion.option_b,
        option_c: imp?.option_c || currentWorkingQuestion.option_c,
        option_d: imp?.option_d || currentWorkingQuestion.option_d,
        correct_answer: verifiedKey,
        explanation: imp?.explanation || currentWorkingQuestion.explanation || '',
        subject: imp?.subject || res.syllabusTaxonomy?.recommendedSubject || currentWorkingQuestion.subject,
        chapter: imp?.chapter || res.syllabusTaxonomy?.recommendedChapter || currentWorkingQuestion.chapter,
        topic: imp?.topic || res.syllabusTaxonomy?.recommendedTopic || currentWorkingQuestion.topic,
        difficulty: (imp?.difficulty || res.difficultyCalibration?.assessedDifficulty || currentWorkingQuestion.difficulty || 'Medium') as any,
        quality_score: res.overallQualityScore,
        inspection_status: 'verified',
        inspection_notes: res.factualAccuracy?.remarks || 'Inspected & Approved by AI 360° QA',
      });

      onToast?.('success', `360° Inspection complete! Quality Score: ${res.overallQualityScore}/100`);
    } catch (err: any) {
      const msg = err?.message || 'Inspection failed';
      onToast?.('error', msg);
      setLogs((prev) => [...prev, `❌ Error: ${msg}`]);
    } finally {
      setInspecting(false);
    }
  };

  // 1-Click AI Auto-Repair & Fix
  const handleAutoRepair = async () => {
    setIsRepairing(true);
    try {
      const { repairedQuestion, report: newReport } = await aiService.repairSingleMCQ(
        currentWorkingQuestion,
        report,
        targetExam
      );
      setEditableQuestion(repairedQuestion);
      setReport(newReport);
      onToast?.('success', '⚡ Question 100% repaired and fixed with AI!');
    } catch (err: any) {
      console.error('Auto-repair failed', err);
      onToast?.('error', err?.message || 'Failed to auto-repair question.');
    } finally {
      setIsRepairing(false);
    }
  };

  const handleApplyUpdates = () => {
    if (!onApplyImprovement) return;

    const toSave: Question = editableQuestion || {
      ...question,
      quality_score: report?.overallQualityScore || 90,
      inspection_status: 'verified',
    };

    onApplyImprovement(toSave);
    onToast?.('success', 'Applied AI 360° improvements to question!');
    onClose();
  };

  const getScoreBadgeColor = (score: number) => {
    if (score >= 85) return 'bg-emerald-500 text-white';
    if (score >= 70) return 'bg-blue-500 text-white';
    if (score >= 50) return 'bg-amber-500 text-white';
    return 'bg-rose-500 text-white';
  };

  const origKey = normalizeAnswerKey(question.correct_answer, 'A');
  const confKey = report?.factualAccuracy?.confirmedAnswer
    ? normalizeAnswerKey(report.factualAccuracy.confirmedAnswer, origKey)
    : origKey;
  const isKeyDisputed = Boolean(report && origKey !== confKey);
  const isStatusInaccurate = Boolean(
    report &&
      (report.factualAccuracy?.status === 'Potentially Inaccurate' ||
        report.factualAccuracy?.status === 'Needs Correction')
  );
  const isDisputed = isKeyDisputed || isStatusInaccurate;

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
              <h3 className="text-lg font-black mt-1">360° Multi-Angle MCQ Inspection & Fix Engine</h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Evaluates factual accuracy, option distractors, linguistic clarity, syllabus classification, and generates an optimized version with 1-click repair.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleRunInspection}
                disabled={inspecting || isRepairing}
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

              {report && (
                <button
                  type="button"
                  onClick={handleAutoRepair}
                  disabled={isRepairing || inspecting}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 shrink-0 cursor-pointer disabled:opacity-50"
                >
                  {isRepairing ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4 fill-white" />
                  )}
                  <span>1-Click AI Auto-Repair</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-2 border-t border-indigo-500/20 text-xs">
            <span className="font-bold text-amber-300">🎯 Target Exam Syllabus Benchmark:</span>
            <select
              value={targetExam}
              onChange={(e) => setTargetExam(e.target.value)}
              disabled={inspecting || isRepairing}
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

        {/* DISPUTED ANSWER KEY OR ISSUE WARNING BANNER */}
        {isDisputed && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-rose-900 dark:text-rose-200">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0" />
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider">
                  {isKeyDisputed ? '⚠️ Answer Key Dispute Detected!' : '⚠️ Question Quality Issue Detected!'}
                </h4>
                {isKeyDisputed ? (
                  <p className="text-xs">
                    Marked in test: <b>Option {origKey}</b> ➔ Confirmed by AI Syllabus Fact-Check: <b>Option {confKey}</b>
                  </p>
                ) : (
                  <p className="text-xs">
                    Status: <b>{report?.factualAccuracy?.status}</b> (Answer confirmed as <b>Option {confKey}</b>)
                  </p>
                )}
                {report?.factualAccuracy?.remarks && (
                  <p className="text-[11px] text-rose-700 dark:text-rose-300 mt-0.5">
                    {report.factualAccuracy.remarks}
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleAutoRepair}
              disabled={isRepairing}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl shadow-md flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 fill-white" />
              <span>{isKeyDisputed ? 'Fix Disputed Key Now' : 'Auto-Fix Question Now'}</span>
            </button>
          </div>
        )}

        {/* CURRENT / WORKING QUESTION SUMMARY BOX */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Working Question State
              </span>
              {editableQuestion?.quality_score && (
                <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold rounded-md flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> QA {editableQuestion.quality_score}/100
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                className="px-3 py-1 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-lg font-bold text-xs flex items-center gap-1 cursor-pointer"
              >
                <Edit3 className="w-3 h-3" />
                <span>{isEditing ? 'Done Editing' : 'Manual Edit & Fix'}</span>
              </button>
            </div>
          </div>

          {isEditing ? (
            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Question Stem:</label>
                <textarea
                  value={currentWorkingQuestion.question_text || ''}
                  onChange={(e) => setEditableQuestion({ ...currentWorkingQuestion, question_text: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(['A', 'B', 'C', 'D'] as const).map((key) => {
                  const field = `option_${key.toLowerCase()}` as keyof Question;
                  const isCorrect = currentWorkingQuestion.correct_answer === key;
                  return (
                    <div key={key} className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold">Option {key}:</span>
                        <button
                          type="button"
                          onClick={() => setEditableQuestion({ ...currentWorkingQuestion, correct_answer: key })}
                          className={`text-[10px] font-black px-2 py-0.5 rounded cursor-pointer ${
                            isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600'
                          }`}
                        >
                          {isCorrect ? '✓ Correct Answer' : 'Set as Correct'}
                        </button>
                      </div>
                      <input
                        type="text"
                        value={String(currentWorkingQuestion[field] || '')}
                        onChange={(e) => setEditableQuestion({ ...currentWorkingQuestion, [field]: e.target.value })}
                        className={`w-full p-2 rounded-lg border text-xs bg-white dark:bg-slate-900 ${
                          isCorrect ? 'border-emerald-500 ring-1 ring-emerald-500 font-bold' : 'border-slate-300 dark:border-slate-700'
                        }`}
                      />
                    </div>
                  );
                })}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Explanation:</label>
                <textarea
                  value={currentWorkingQuestion.explanation || ''}
                  onChange={(e) => setEditableQuestion({ ...currentWorkingQuestion, explanation: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
                  rows={2}
                />
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm font-bold text-slate-900 dark:text-white leading-relaxed">
                {currentWorkingQuestion.question_text}
              </p>

              {/* Quick Interactive Answer Key Switcher */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {(['A', 'B', 'C', 'D'] as const).map((key) => {
                  const optField = `option_${key.toLowerCase()}` as keyof Question;
                  const isCorrect = currentWorkingQuestion.correct_answer === key;
                  return (
                    <div
                      key={key}
                      onClick={() => setEditableQuestion({ ...currentWorkingQuestion, correct_answer: key })}
                      title={`Click to set Option ${key} as Correct Answer`}
                      className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        isCorrect
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-400 font-bold text-emerald-900 dark:text-emerald-300 shadow-xs'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-amber-400'
                      }`}
                    >
                      <div className="truncate flex items-center gap-2">
                        <span className={`w-5 h-5 rounded-md flex items-center justify-center font-black text-[10px] ${
                          isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'
                        }`}>
                          {key}
                        </span>
                        <span className="truncate">{String(currentWorkingQuestion[optField] || '')}</span>
                      </div>
                      {isCorrect && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                    </div>
                  );
                })}
              </div>

              {currentWorkingQuestion.explanation && (
                <p className="text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                  <b className="text-indigo-600 dark:text-indigo-400">Explanation: </b>
                  {currentWorkingQuestion.explanation}
                </p>
              )}
            </>
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

            {/* FINAL APPLY ACTION BUTTON */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                Close
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleAutoRepair}
                  disabled={isRepairing}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
                >
                  <Zap className="w-4 h-4 fill-slate-950" />
                  <span>{isRepairing ? 'Repairing...' : '1-Click AI Auto-Repair'}</span>
                </button>

                <button
                  onClick={handleApplyUpdates}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
                >
                  <Check className="w-4 h-4" /> Save Improvements to Test
                </button>
              </div>
            </div>

          </div>
        )}

      </div>
    </Modal>
  );
};
