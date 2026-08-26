import React, { useState, useEffect } from 'react';
import { 
  Award, 
  CheckCircle, 
  XCircle, 
  Clock, 
  BookOpen, 
  Share2, 
  Printer, 
  Trophy, 
  ArrowLeft, 
  HelpCircle, 
  Check, 
  AlertCircle, 
  FileText,
  MapPin,
  RefreshCw,
  Sparkles,
  Users,
  Target,
  BarChart3,
  Flag,
  Brain
} from 'lucide-react';
import { Attempt, Test, Question, PublicLeaderboardEntry, PersonalizedStudentAnalytics } from '../../types';
import { dataService } from '../../services/dataService';
import { analyticsService } from '../../services/analyticsService';
import { printOfficialScorecard } from '../../utils/printScorecard';
import { ReportMCQModal } from './ReportMCQModal';
import { ShareScorecardModal } from './ShareScorecardModal';
import { StudentPerformanceDashboard } from './analytics/StudentPerformanceDashboard';

interface TestResultProps {
  attempt: Attempt;
  onBackToHome: () => void;
  onToast?: (type: 'success' | 'error' | 'info', msg: string) => void;
}

export const TestResult: React.FC<TestResultProps> = ({ attempt, onBackToHome, onToast }) => {
  const [currentAttempt, setCurrentAttempt] = useState<Attempt>(attempt);
  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [leaderboard, setLeaderboard] = useState<PublicLeaderboardEntry[]>([]);
  const [totalAspirants, setTotalAspirants] = useState<number>(1);
  const [myRank, setMyRank] = useState<number>(1);
  const [analytics, setAnalytics] = useState<PersonalizedStudentAnalytics | null>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'analytics' | 'summary' | 'solutions' | 'leaderboard'>('analytics');
  const [solutionFilter, setSolutionFilter] = useState<'all' | 'correct' | 'wrong' | 'unattempted'>('all');
  const [isRefreshingBoard, setIsRefreshingBoard] = useState(false);
  const [reportingQuestion, setReportingQuestion] = useState<Question | null>(null);
  const [reportedQuestionIds, setReportedQuestionIds] = useState<Record<string, boolean>>({});
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  useEffect(() => {
    setCurrentAttempt(attempt);
    loadResultData();
  }, [attempt]);

  const loadResultData = async () => {
    setIsLoadingAnalytics(true);
    const t = await dataService.getTestById(attempt.test_id);
    const qList = await dataService.getQuestions(attempt.test_id, true);
    const topBoard = await dataService.getLeaderboard(attempt.test_id, 20);
    const rank = await dataService.getStudentRank(attempt.test_id, attempt.id);
    const allAttempts = await dataService.getAttempts(attempt.test_id);

    // Reconstruct attempt responses if missing
    let activeAttempt: Attempt = { ...attempt };
    if (!activeAttempt.responses || activeAttempt.responses.length === 0) {
      try {
        const answers = await dataService.getAttemptAnswers(attempt.id);
        if (answers && answers.length > 0 && qList.length > 0) {
          const reconstructedResponses = qList.map((q) => {
            const a = answers.find((ans) => ans.question_id === q.id);
            const userAns = a ? a.selected_answer : null;
            const isCorrect = a ? a.is_correct : (userAns ? userAns.toUpperCase() === (q.correct_answer || '').toUpperCase() : false);
            return {
              question_id: q.id,
              user_answer: userAns,
              correct_answer: q.correct_answer || '',
              status: !userAns ? ('unattempted' as const) : (isCorrect ? ('correct' as const) : ('wrong' as const)),
              marks_awarded: a ? Number(a.marks_obtained) : 0
            };
          });
          activeAttempt.responses = reconstructedResponses;
        }
      } catch (e) {
        console.warn('Could not load attempt responses:', e);
      }
    }

    // If still no responses array, generate default mapping from questions
    if (!activeAttempt.responses || activeAttempt.responses.length === 0) {
      activeAttempt.responses = qList.map((q) => ({
        question_id: q.id,
        user_answer: null,
        correct_answer: q.correct_answer || '',
        status: 'unattempted' as const,
        marks_awarded: 0
      }));
    }

    setCurrentAttempt(activeAttempt);
    setTest(t);
    setQuestions(qList);
    setLeaderboard(topBoard);
    setTotalAspirants(Math.max(1, allAttempts.length));
    setMyRank(rank || 1);

    // Compute deterministic personalized student analytics
    try {
      const calculatedAnalytics = await analyticsService.getStudentAttemptAnalytics(activeAttempt, t, qList);
      setAnalytics(calculatedAnalytics);
    } catch (e) {
      console.warn('Analytics calculation error:', e);
    } finally {
      setIsLoadingAnalytics(false);
    }
  };

  const handleRefreshLeaderboard = async () => {
    setIsRefreshingBoard(true);
    const topBoard = await dataService.getLeaderboard(currentAttempt.test_id, 20);
    const rank = await dataService.getStudentRank(currentAttempt.test_id, currentAttempt.id);
    const allAttempts = await dataService.getAttempts(currentAttempt.test_id);

    setLeaderboard(topBoard);
    setMyRank(rank || 1);
    setTotalAspirants(Math.max(1, allAttempts.length));
    setIsRefreshingBoard(false);
    onToast?.('success', 'Real-time Leaderboard updated!');
  };

  const handlePrint = () => {
    printOfficialScorecard({
      attempt: currentAttempt,
      test,
      rank: myRank,
      totalCandidates: totalAspirants
    });
  };

  const handleShare = () => {
    setIsShareModalOpen(true);
  };

  // Filter solutions
  const allResponses = (currentAttempt.responses && currentAttempt.responses.length > 0)
    ? currentAttempt.responses
    : questions.map((q) => ({
        question_id: q.id,
        user_answer: null,
        correct_answer: q.correct_answer || '',
        status: 'unattempted' as const,
        marks_awarded: 0
      }));

  const filteredResponses = allResponses.filter((resp) => {
    if (solutionFilter === 'correct') return resp.status === 'correct';
    if (solutionFilter === 'wrong') return resp.status === 'wrong';
    if (solutionFilter === 'unattempted') return resp.status === 'unattempted';
    return true;
  });

  const unattemptedCount = currentAttempt.unattempted_answers ?? 
    currentAttempt.skipped_questions ?? 
    (currentAttempt.total_questions ? Math.max(0, currentAttempt.total_questions - (currentAttempt.attempted_questions || 0)) : 0);

  // Top 3 Podium Rankers from real-time leaderboard
  const top1 = leaderboard[0];
  const top2 = leaderboard[1];
  const top3 = leaderboard[2];

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16 print:p-0">
      
      {/* TOP HEADER ACTIONS */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 print:hidden">
        <button
          onClick={onBackToHome}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Test Directory
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            className="flex-1 sm:flex-none px-3.5 py-2.5 sm:py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Share2 className="w-3.5 h-3.5" /> <span>Share Result</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 sm:flex-none px-3.5 py-2.5 sm:py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" /> <span>Print Scorecard / PDF</span>
          </button>
        </div>
      </div>

      {/* 🎯 SCORECARD HERO CARD (High Contrast, Rich Metrics) */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white rounded-3xl p-5 sm:p-7 shadow-xl border border-blue-900/50 relative overflow-hidden">
        <div className="relative z-10 space-y-5">
          
          {/* Header Title & Student Info */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-blue-900/60 pb-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[10px] sm:text-[11px] font-bold rounded-md uppercase">
                  Official Exam Scorecard
                </span>
                {analytics && (
                  <span className={`px-2.5 py-0.5 rounded-md text-[10px] sm:text-[11px] font-black border flex items-center gap-1 ${analytics.overall.status_info.badgeClass}`}>
                    <span>{analytics.overall.status_info.badgeEmoji}</span>
                    <span>Status: {analytics.overall.status_info.label}</span>
                  </span>
                )}
                {test?.category && (
                  <span className="px-2.5 py-0.5 bg-slate-800 text-blue-200 border border-blue-700/50 text-[10px] sm:text-[11px] font-bold rounded-md">
                    {test.category}
                  </span>
                )}
                {test?.subject && (
                  <span className="px-2.5 py-0.5 bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 text-[10px] sm:text-[11px] font-bold rounded-md">
                    Subject: {test.subject}
                  </span>
                )}
                <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Submitted Successfully
                </span>
              </div>
              <h1 className="text-lg sm:text-2xl font-black text-white mt-1">
                {test?.title || 'Mock Test'}
              </h1>
            </div>

            <div className="sm:text-right bg-blue-950/60 p-2.5 sm:p-0 rounded-xl sm:bg-transparent border border-blue-800/30 sm:border-none">
              <p className="text-sm text-white font-black">{currentAttempt.student_name}</p>
              <p className="text-xs text-slate-300 flex items-center sm:justify-end gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
                <span>{currentAttempt.student_district || 'District'}, {currentAttempt.student_state || 'HP'}</span>
              </p>
            </div>
          </div>

          {/* 4 CORE KPI METRICS: Score, Percentage, Live Rank, Time */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4 text-center">
            
            <div className="p-3 sm:p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15">
              <p className="text-[10px] sm:text-[11px] text-slate-300 font-bold uppercase">Marks Obtained</p>
              <p className="text-2xl sm:text-3xl font-black text-emerald-400 mt-1">
                {currentAttempt.score} <span className="text-xs text-slate-300 font-normal">/ {test?.total_marks || 10}</span>
              </p>
            </div>

            <div className="p-3 sm:p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15">
              <p className="text-[10px] sm:text-[11px] text-slate-300 font-bold uppercase">Accuracy Percentage</p>
              <p className="text-2xl sm:text-3xl font-black text-blue-400 mt-1">
                {currentAttempt.percentage}%
              </p>
            </div>

            <div className="p-3 sm:p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15">
              <p className="text-[10px] sm:text-[11px] text-slate-300 font-bold uppercase">Real-Time State Rank</p>
              <p className="text-2xl sm:text-3xl font-black text-amber-400 mt-1 flex items-center justify-center gap-1">
                <Trophy className="w-5 h-5 shrink-0 text-amber-400 fill-amber-400" /> #{myRank}
              </p>
              <p className="text-[10px] text-slate-300 mt-0.5 font-medium">Out of {totalAspirants} Aspirants</p>
            </div>

            <div className="p-3 sm:p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15">
              <p className="text-[10px] sm:text-[11px] text-slate-300 font-bold uppercase">Time Taken</p>
              <p className="text-xl sm:text-2xl font-black text-slate-100 mt-1">
                {Math.floor(currentAttempt.time_taken_seconds / 60)}m {currentAttempt.time_taken_seconds % 60}s
              </p>
              <p className="text-[10px] text-slate-300 mt-0.5 font-medium">Duration: {test?.duration_minutes || 60}m</p>
            </div>

          </div>

          {/* 3 PILL METRICS: Correct, Wrong, Unattempted (Detailed Breakdown) */}
          <div className="grid grid-cols-3 gap-2.5 p-3 bg-slate-950/80 rounded-2xl text-center text-xs font-bold border border-white/5">
            <div className="flex items-center justify-center gap-1.5 text-emerald-400 py-1">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{currentAttempt.correct_answers} Correct (+{(currentAttempt.correct_answers * (test?.marks_per_question || 1)).toFixed(2)} pts)</span>
            </div>
            <div className="flex items-center justify-center gap-1.5 text-rose-400 py-1 border-x border-slate-800">
              <XCircle className="w-4 h-4 shrink-0" />
              <span>{currentAttempt.wrong_answers} Wrong (-{(currentAttempt.wrong_answers * (test?.negative_marking || 0)).toFixed(2)} pts)</span>
            </div>
            <div className="flex items-center justify-center gap-1.5 text-slate-400 py-1">
              <HelpCircle className="w-4 h-4 shrink-0" />
              <span>{unattemptedCount} Unattempted</span>
            </div>
          </div>

        </div>
      </div>

      {/* RESULT TABS NAVIGATION BAR */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 print:hidden overflow-x-auto scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-4 sm:px-5 py-2.5 text-xs font-extrabold rounded-xl whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'analytics'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Brain className="w-3.5 h-3.5" />
          <span>Diagnostic Analytics & Topics</span>
        </button>

        <button
          onClick={() => setActiveTab('summary')}
          className={`px-4 sm:px-5 py-2.5 text-xs font-extrabold rounded-xl whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'summary'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Scorecard Summary</span>
        </button>

        <button
          onClick={() => setActiveTab('solutions')}
          className={`px-4 sm:px-5 py-2.5 text-xs font-extrabold rounded-xl whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'solutions'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Full Solutions & Keys ({questions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`px-4 sm:px-5 py-2.5 text-xs font-extrabold rounded-xl whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'leaderboard'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Trophy className="w-3.5 h-3.5 text-amber-500" />
          <span>Real-Time Top 20 Leaderboard</span>
        </button>
      </div>

      {/* TAB 0: PERSONALIZED DIAGNOSTIC ANALYTICS */}
      {activeTab === 'analytics' && (
        isLoadingAnalytics ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
            <h3 className="font-black text-slate-800 dark:text-white text-base">Generating Personalized Diagnostic Report...</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">Evaluating your topic mastery, speed trends, weak areas, and score breakdown.</p>
          </div>
        ) : analytics ? (
          <StudentPerformanceDashboard 
            analytics={analytics}
            onExploreTopic={() => setActiveTab('solutions')}
          />
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 text-center space-y-2">
            <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
            <h3 className="font-black text-slate-800 dark:text-white text-base">Diagnostic Analytics Overview</h3>
            <p className="text-xs text-slate-500">Check the Scorecard Summary or Full Solutions tabs for detailed question-by-question analysis.</p>
          </div>
        )
      )}

      {/* TAB 1: SUMMARY TAB */}
      {activeTab === 'summary' && (
        <div className="space-y-6">
          
          {/* Detailed Marking & Evaluation Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
              <span>Marking Scheme & Evaluation Breakdown</span>
              <span className="text-xs text-slate-400 font-normal">Auto-Calculated</span>
            </h3>

            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex justify-between items-center p-3.5 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-2xl border border-emerald-100 dark:border-emerald-900">
                <span className="font-semibold text-emerald-900 dark:text-emerald-300">
                  Positive Marks (+{test?.marks_per_question || 1} × {attempt.correct_answers} Correct Answers)
                </span>
                <span className="font-black text-sm text-emerald-600 dark:text-emerald-400">
                  +{(attempt.correct_answers * (test?.marks_per_question || 1)).toFixed(2)} Marks
                </span>
              </div>

              <div className="flex justify-between items-center p-3.5 bg-rose-50/70 dark:bg-rose-950/30 rounded-2xl border border-rose-100 dark:border-rose-900">
                <span className="font-semibold text-rose-900 dark:text-rose-300">
                  Negative Penalty (-{test?.negative_marking || 0.25} × {attempt.wrong_answers} Wrong Answers)
                </span>
                <span className="font-black text-sm text-rose-600 dark:text-rose-400">
                  -{(attempt.wrong_answers * (test?.negative_marking || 0)).toFixed(2)} Marks
                </span>
              </div>

              <div className="flex justify-between items-center p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/60 dark:to-indigo-950/60 rounded-2xl border border-blue-200 dark:border-blue-800 font-bold text-slate-900 dark:text-white">
                <div>
                  <p className="text-sm font-black text-blue-950 dark:text-blue-200">Final Evaluated Net Score</p>
                  <p className="text-[11px] text-slate-500 font-normal mt-0.5">Passing Marks: {test?.passing_marks || 4} Marks</p>
                </div>
                <div className="text-right">
                  <span className="text-xl font-black text-blue-600 dark:text-blue-400">{attempt.score} pts</span>
                  <p className="text-[10px] text-emerald-600 font-bold">
                    {attempt.score >= (test?.passing_marks || 4) ? '✓ Qualified' : 'Needs Practice'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Snapshot: Real-time Top 3 Podium on Summary */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Real-Time Top 3 State Podium
                </h3>
              </div>
              <button
                onClick={() => setActiveTab('leaderboard')}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
              >
                View Full Top 20 →
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Silver 2nd */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg">🥈</span>
                  <span className="text-[10px] font-black uppercase text-slate-500 bg-white dark:bg-slate-700 px-2 py-0.5 rounded">Rank 2</span>
                </div>
                <div>
                  <p className="font-black text-sm text-slate-900 dark:text-white truncate">
                    {top2 ? (top2.attempt_id === attempt.id ? `${top2.student_name} (You)` : top2.student_name) : 'Vacant'}
                  </p>
                  <p className="text-[11px] text-slate-400">{top2 ? `${top2.student_district || 'District'}, ${top2.student_state || 'HP'}` : '-'}</p>
                </div>
                <p className="font-black text-slate-800 dark:text-slate-200 text-sm mt-2 text-right">
                  {top2 ? `${top2.score} pts` : '-'}
                </p>
              </div>

              {/* Gold 1st */}
              <div className="p-4 bg-gradient-to-b from-amber-50 to-amber-100/50 dark:from-amber-950/40 dark:to-amber-900/20 rounded-2xl border-2 border-amber-400 flex flex-col justify-between shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xl">🥇</span>
                  <span className="text-[10px] font-black uppercase text-amber-900 bg-amber-300/80 px-2.5 py-0.5 rounded">Rank 1 (Topper)</span>
                </div>
                <div>
                  <p className="font-black text-base text-amber-950 dark:text-amber-200 truncate">
                    {top1 ? (top1.attempt_id === attempt.id ? `${top1.student_name} (You)` : top1.student_name) : 'Vacant'}
                  </p>
                  <p className="text-xs text-amber-800 dark:text-amber-400 font-semibold">{top1 ? `${top1.student_district || 'District'}, ${top1.student_state || 'HP'}` : '-'}</p>
                </div>
                <p className="font-black text-amber-900 dark:text-amber-300 text-base mt-2 text-right">
                  {top1 ? `${top1.score} pts (${top1.percentage}%)` : '-'}
                </p>
              </div>

              {/* Bronze 3rd */}
              <div className="p-3.5 bg-orange-50/50 dark:bg-amber-950/20 rounded-2xl border border-amber-200 dark:border-amber-900/60 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg">🥉</span>
                  <span className="text-[10px] font-black uppercase text-amber-800 bg-white dark:bg-slate-700 px-2 py-0.5 rounded">Rank 3</span>
                </div>
                <div>
                  <p className="font-black text-sm text-slate-900 dark:text-white truncate">
                    {top3 ? (top3.attempt_id === attempt.id ? `${top3.student_name} (You)` : top3.student_name) : 'Vacant'}
                  </p>
                  <p className="text-[11px] text-slate-400">{top3 ? `${top3.student_district || 'District'}, ${top3.student_state || 'HP'}` : '-'}</p>
                </div>
                <p className="font-black text-amber-900 dark:text-amber-300 text-sm mt-2 text-right">
                  {top3 ? `${top3.score} pts` : '-'}
                </p>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: DETAILED SOLUTIONS & EXPLANATIONS */}
      {(activeTab === 'solutions' || window.matchMedia('print').matches) && (
        <div className="space-y-6">
          
          {/* Solution Filter Pills */}
          <div className="flex items-center gap-2 print:hidden overflow-x-auto pb-1">
            {(['all', 'correct', 'wrong', 'unattempted'] as const).map((flt) => (
              <button
                key={flt}
                onClick={() => setSolutionFilter(flt)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer whitespace-nowrap ${
                  solutionFilter === flt
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {flt} ({
                  flt === 'all' ? (attempt.responses || []).length :
                  flt === 'correct' ? attempt.correct_answers :
                  flt === 'wrong' ? attempt.wrong_answers :
                  unattemptedCount
                })
              </button>
            ))}
          </div>

          {/* Question Solutions List */}
          <div className="space-y-5">
            {filteredResponses.map((resp, idx) => {
              const q = questions.find((item) => item.id === resp.question_id);
              if (!q) return null;

              return (
                <div
                  key={q.id}
                  className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-xs text-slate-500">Question #{q.question_number}</span>
                      {q.subject && (
                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-400 rounded-md">
                          {q.subject} {q.chapter ? `• ${q.chapter}` : ''}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {reportedQuestionIds[q.id] ? (
                        <span className="px-2 py-0.5 bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 font-bold text-[11px] rounded-lg border border-rose-200 dark:border-rose-800 flex items-center gap-1">
                          <Flag className="w-3 h-3 fill-rose-500 text-rose-500" />
                          <span>Reported</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setReportingQuestion(q)}
                          className="px-2 py-0.5 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 dark:bg-slate-800 dark:hover:bg-rose-950/50 dark:text-slate-400 dark:hover:text-rose-300 font-bold text-[11px] rounded-lg border border-slate-200 dark:border-slate-700 hover:border-rose-200 transition-colors flex items-center gap-1 cursor-pointer print:hidden"
                          title="Report mistake or dispute answer key in this question"
                        >
                          <Flag className="w-3 h-3" />
                          <span>Report</span>
                        </button>
                      )}

                      <span className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase flex items-center gap-1 ${
                        resp.status === 'correct'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : resp.status === 'wrong'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {resp.status === 'correct' && <CheckCircle className="w-3.5 h-3.5" />}
                        {resp.status === 'wrong' && <XCircle className="w-3.5 h-3.5" />}
                        {resp.status === 'unattempted' && <HelpCircle className="w-3.5 h-3.5" />}
                        <span>{resp.status} ({resp.marks_awarded > 0 ? `+${resp.marks_awarded}` : resp.marks_awarded})</span>
                      </span>
                    </div>
                  </div>

                  <p className="font-bold text-slate-900 dark:text-white text-base leading-relaxed">
                    {q.question_text}
                  </p>

                  {/* Options status */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs font-semibold">
                    {[
                      { key: 'A', text: q.option_a },
                      { key: 'B', text: q.option_b },
                      { key: 'C', text: q.option_c },
                      { key: 'D', text: q.option_d }
                    ].map(({ key, text }) => {
                      if (!text) return null;
                      const isCorrect = q.correct_answer?.toUpperCase() === key;
                      const isUserChoice = resp.user_answer?.toUpperCase() === key;

                      let borderStyle = 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300';
                      if (isCorrect) borderStyle = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 font-bold ring-1 ring-emerald-500';
                      if (isUserChoice && !isCorrect) borderStyle = 'border-rose-500 bg-rose-50 dark:bg-rose-950/60 text-rose-900 dark:text-rose-200 font-bold ring-1 ring-rose-500';

                      return (
                        <div key={key} className={`p-3 rounded-xl border flex items-center justify-between ${borderStyle}`}>
                          <span className="flex-1 pr-2"><b>{key}.</b> {text}</span>
                          {isCorrect && <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded font-bold shrink-0">Correct Answer</span>}
                          {isUserChoice && !isCorrect && <span className="text-[10px] bg-rose-600 text-white px-2 py-0.5 rounded font-bold shrink-0">Your Choice</span>}
                        </div>
                      );
                    })}
                  </div>

                  {/* Detailed Explanation Box */}
                  {q.explanation && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-950/40 rounded-2xl border border-blue-200 dark:border-blue-900 text-xs space-y-1.5">
                      <p className="font-black text-blue-900 dark:text-blue-200 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-blue-500" /> Detailed Explanation & Solution Notes
                      </p>
                      <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-normal">{q.explanation}</p>
                    </div>
                  )}

                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* TAB 3: REAL-TIME TOP 20 STATE LEADERBOARD */}
      {activeTab === 'leaderboard' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-5 shadow-xs">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  Real-Time Top 20 Candidates Leaderboard
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Current rankings with Candidate Name, District & State across {totalAspirants} candidates.
              </p>
            </div>

            <button
              onClick={handleRefreshLeaderboard}
              disabled={isRefreshingBoard}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 text-xs font-bold rounded-xl border border-blue-200 dark:border-blue-800 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingBoard ? 'animate-spin' : ''}`} />
              <span>{isRefreshingBoard ? 'Refreshing...' : '🔄 Live Refresh'}</span>
            </button>
          </div>

          {/* TOP 3 GOLD, SILVER, BRONZE VISUAL PODIUM */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {/* 🥈 Silver */}
            <div className="order-2 sm:order-1 rounded-2xl p-4 bg-slate-50 dark:bg-slate-800/80 border-2 border-slate-300 dark:border-slate-700 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg">🥈</span>
                <span className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-700 px-2 py-0.5 rounded">
                  Rank 2 (Silver)
                </span>
              </div>
              <div>
                <p className="font-black text-sm text-slate-900 dark:text-white truncate">
                  {top2 ? (top2.attempt_id === attempt.id ? `${top2.student_name} (You)` : top2.student_name) : 'Vacant'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  {top2 ? `${top2.student_district || 'District'}, ${top2.student_state || 'HP'}` : '-'}
                </p>
              </div>
              <p className="font-black text-slate-900 dark:text-white text-base mt-2 text-right">
                {top2 ? `${top2.score} pts` : '-'}
              </p>
            </div>

            {/* 🥇 Gold */}
            <div className="order-1 sm:order-2 rounded-2xl p-4 bg-gradient-to-b from-amber-50 to-amber-100/60 dark:from-amber-950/40 dark:to-amber-900/30 border-2 border-amber-400 flex flex-col justify-between shadow-md sm:-mt-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xl">🥇</span>
                <span className="text-[10px] font-black uppercase text-amber-900 bg-amber-300/90 px-2.5 py-0.5 rounded">
                  ★ Rank 1 (Gold) ★
                </span>
              </div>
              <div>
                <p className="font-black text-base text-amber-950 dark:text-amber-100 truncate">
                  {top1 ? (top1.attempt_id === attempt.id ? `${top1.student_name} (You)` : top1.student_name) : 'Vacant'}
                </p>
                <p className="text-xs text-amber-800 dark:text-amber-300 font-bold flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-600" />
                  {top1 ? `${top1.student_district || 'District'}, ${top1.student_state || 'HP'}` : '-'}
                </p>
              </div>
              <p className="font-black text-amber-900 dark:text-amber-300 text-lg mt-2 text-right">
                {top1 ? `${top1.score} pts (${top1.percentage}%)` : '-'}
              </p>
            </div>

            {/* 🥉 Bronze */}
            <div className="order-3 rounded-2xl p-4 bg-orange-50/60 dark:bg-amber-950/30 border-2 border-amber-300 dark:border-amber-900/60 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg">🥉</span>
                <span className="text-[10px] font-black uppercase text-amber-800 dark:text-amber-300 bg-white dark:bg-slate-700 px-2 py-0.5 rounded">
                  Rank 3 (Bronze)
                </span>
              </div>
              <div>
                <p className="font-black text-sm text-slate-900 dark:text-white truncate">
                  {top3 ? (top3.attempt_id === attempt.id ? `${top3.student_name} (You)` : top3.student_name) : 'Vacant'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3 text-amber-600" />
                  {top3 ? `${top3.student_district || 'District'}, ${top3.student_state || 'HP'}` : '-'}
                </p>
              </div>
              <p className="font-black text-amber-900 dark:text-amber-300 text-base mt-2 text-right">
                {top3 ? `${top3.score} pts` : '-'}
              </p>
            </div>
          </div>

          {/* TOP 20 FULL REAL-TIME LEADERBOARD TABLE */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-3 text-center w-14">Rank</th>
                  <th className="p-3">Candidate Name</th>
                  <th className="p-3">District & State</th>
                  <th className="p-3 text-center">Correct / Wrong</th>
                  <th className="p-3 text-center">Time Taken</th>
                  <th className="p-3 text-right">Score</th>
                  <th className="p-3 text-right">Percent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {leaderboard.map((item) => {
                  const isMe = item.attempt_id === attempt.id;
                  let rankIcon = `#${item.rank}`;
                  if (item.rank === 1) rankIcon = '🥇 #1';
                  if (item.rank === 2) rankIcon = '🥈 #2';
                  if (item.rank === 3) rankIcon = '🥉 #3';

                  return (
                    <tr 
                      key={item.attempt_id} 
                      className={
                        isMe 
                          ? 'bg-blue-50/90 dark:bg-blue-950 font-black border-l-4 border-blue-600' 
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors'
                      }
                    >
                      <td className="p-3 text-center font-black text-slate-800 dark:text-slate-200">
                        {rankIcon}
                      </td>
                      <td className="p-3 text-slate-900 dark:text-white font-bold">
                        <div className="flex items-center gap-1.5">
                          <span>{item.student_name || item.masked_name}</span>
                          {isMe && (
                            <span className="px-1.5 py-0.2 bg-blue-600 text-white rounded text-[10px] font-black">
                              YOU
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{item.student_district || 'District'}, {item.student_state || 'HP'}</span>
                        </span>
                      </td>
                      <td className="p-3 text-center font-semibold">
                        <span className="text-emerald-600">✓ {item.correct_answers}</span>
                        <span className="text-slate-300 mx-1">|</span>
                        <span className="text-rose-500">✗ {item.wrong_answers || 0}</span>
                      </td>
                      <td className="p-3 text-center text-slate-500 dark:text-slate-400">
                        {Math.floor(item.time_taken_seconds / 60)}m {item.time_taken_seconds % 60}s
                      </td>
                      <td className="p-3 text-right font-black text-slate-900 dark:text-white text-sm">
                        {item.score}
                      </td>
                      <td className="p-3 text-right font-black text-blue-600 dark:text-blue-400">
                        {item.percentage ? `${item.percentage}%` : '-'}
                      </td>
                    </tr>
                  );
                })}

                {/* If user is not in top 20, show their rank pinned at bottom */}
                {myRank > 20 && (
                  <tr className="bg-blue-50 dark:bg-blue-950 font-black border-t-2 border-blue-500">
                    <td className="p-3 text-center font-black text-blue-600 dark:text-blue-400">#{myRank}</td>
                    <td className="p-3 text-slate-900 dark:text-white">
                      {attempt.student_name} <span className="px-1.5 py-0.2 bg-blue-600 text-white rounded text-[10px]">YOU</span>
                    </td>
                    <td className="p-3 text-slate-600 dark:text-slate-400">{attempt.student_district}, {attempt.student_state}</td>
                    <td className="p-3 text-center font-semibold">
                      <span className="text-emerald-600">✓ {attempt.correct_answers}</span> | <span className="text-rose-500">✗ {attempt.wrong_answers}</span>
                    </td>
                    <td className="p-3 text-center text-slate-500">{Math.floor(attempt.time_taken_seconds / 60)}m {attempt.time_taken_seconds % 60}s</td>
                    <td className="p-3 text-right font-black text-slate-900 dark:text-white text-sm">{attempt.score}</td>
                    <td className="p-3 text-right font-black text-blue-600 dark:text-blue-400">{attempt.percentage}%</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* REPORT MCQ MODAL */}
      <ReportMCQModal
        isOpen={Boolean(reportingQuestion)}
        onClose={() => setReportingQuestion(null)}
        question={reportingQuestion}
        test={test}
        studentName={attempt.student_name}
        studentMobile={attempt.student_mobile}
        onReportSubmitted={(qId) => {
          setReportedQuestionIds((prev) => ({ ...prev, [qId]: true }));
        }}
        onToast={onToast}
      />

      {/* SHARE SCORECARD MODAL */}
      <ShareScorecardModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        attempt={attempt}
        test={test}
        rank={myRank}
        totalCandidates={totalAspirants}
        onToast={onToast}
      />

    </div>
  );
};
