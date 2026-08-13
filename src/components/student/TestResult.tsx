import React, { useState, useEffect } from 'react';
import { Award, CheckCircle, XCircle, Clock, BookOpen, Share2, Printer, Trophy, ArrowLeft, HelpCircle, Check, AlertCircle, FileText } from 'lucide-react';
import { Attempt, Test, Question, PublicLeaderboardEntry } from '../../types';
import { dataService } from '../../services/dataService';

interface TestResultProps {
  attempt: Attempt;
  onBackToHome: () => void;
  onToast?: (type: 'success' | 'error' | 'info', msg: string) => void;
}

export const TestResult: React.FC<TestResultProps> = ({ attempt, onBackToHome, onToast }) => {
  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [leaderboard, setLeaderboard] = useState<PublicLeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<'solutions' | 'leaderboard' | 'summary'>('summary');
  const [solutionFilter, setSolutionFilter] = useState<'all' | 'correct' | 'wrong' | 'unattempted'>('all');

  useEffect(() => {
    loadResultData();
  }, [attempt]);

  const loadResultData = async () => {
    const t = await dataService.getTestById(attempt.test_id);
    const qList = await dataService.getQuestions(attempt.test_id, true);
    const topBoard = await dataService.getLeaderboard(attempt.test_id, 30);
    const rank = await dataService.getStudentRank(attempt.test_id, attempt.id);

    setTest(t);
    setQuestions(qList);
    setLeaderboard(topBoard);
    setMyRank(rank || 1);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    const shareUrl = dataService.getPublicShareableUrl(test?.slug || attempt.test_id);
    if (navigator.share) {
      navigator.share({
        title: `Gradeup Study Mock Test Scorecard`,
        text: `I scored ${attempt.score} marks (${attempt.percentage}%) on ${test?.title || 'Mock Test'}!`,
        url: shareUrl
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareUrl);
      onToast?.('success', 'Public test link copied to clipboard!');
    }
  };

  // Filter solutions
  const filteredResponses = (attempt.responses || []).filter((resp) => {
    if (solutionFilter === 'correct') return resp.status === 'correct';
    if (solutionFilter === 'wrong') return resp.status === 'wrong';
    if (solutionFilter === 'unattempted') return resp.status === 'unattempted';
    return true;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16 print:p-0">
      
      {/* Top Header Actions */}
      <div className="flex items-center justify-between gap-4 print:hidden">
        <button
          onClick={onBackToHome}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Test Directory
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-200 transition-colors flex items-center gap-1.5"
          >
            <Share2 className="w-3.5 h-3.5" /> Share Scorecard
          </button>
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" /> Print Scorecard
          </button>
        </div>
      </div>

      {/* SCORECARD HERO CARD */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-blue-900/40 relative overflow-hidden">
        <div className="relative z-10 space-y-6">
          
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-900/60 pb-4">
            <div>
              <span className="px-2.5 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[11px] font-bold rounded-md uppercase">
                Official Exam Scorecard
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-white mt-1">
                {test?.title || 'Mock Test'}
              </h1>
            </div>

            <div className="text-right">
              <p className="text-xs text-slate-300 font-semibold">{attempt.student_name}</p>
              <p className="text-[11px] text-slate-400">{attempt.student_district}, {attempt.student_state}</p>
            </div>
          </div>

          {/* Core Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            
            <div className="p-4 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10">
              <p className="text-[10px] text-slate-400 font-bold uppercase">Marks Obtained</p>
              <p className="text-2xl sm:text-3xl font-black text-emerald-400 mt-1">
                {attempt.score} <span className="text-xs text-slate-400 font-normal">/ {test?.total_marks || 10}</span>
              </p>
            </div>

            <div className="p-4 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10">
              <p className="text-[10px] text-slate-400 font-bold uppercase">Percentage Score</p>
              <p className="text-2xl sm:text-3xl font-black text-blue-400 mt-1">
                {attempt.percentage}%
              </p>
            </div>

            <div className="p-4 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10">
              <p className="text-[10px] text-slate-400 font-bold uppercase">State Rank</p>
              <p className="text-2xl sm:text-3xl font-black text-amber-400 mt-1 flex items-center justify-center gap-1">
                <Trophy className="w-5 h-5" /> #{myRank || 1}
              </p>
            </div>

            <div className="p-4 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10">
              <p className="text-[10px] text-slate-400 font-bold uppercase">Time Taken</p>
              <p className="text-xl sm:text-2xl font-black text-slate-200 mt-1">
                {Math.floor(attempt.time_taken_seconds / 60)}m {attempt.time_taken_seconds % 60}s
              </p>
            </div>

          </div>

          {/* Attempt Accuracy Stats Pill */}
          <div className="flex flex-wrap items-center justify-around gap-4 p-3 bg-slate-900/80 rounded-xl text-xs font-bold text-slate-300">
            <span className="text-emerald-400 flex items-center gap-1">
              <CheckCircle className="w-4 h-4" /> {attempt.correct_answers} Correct
            </span>
            <span className="text-rose-400 flex items-center gap-1">
              <XCircle className="w-4 h-4" /> {attempt.wrong_answers} Incorrect
            </span>
            <span className="text-slate-400 flex items-center gap-1">
              <HelpCircle className="w-4 h-4" /> {attempt.unattempted_answers} Unattempted
            </span>
          </div>

        </div>
      </div>

      {/* RESULT TABS NAVIGATION */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 print:hidden">
        <button
          onClick={() => setActiveTab('summary')}
          className={`px-5 py-2.5 text-xs font-extrabold rounded-xl transition-all ${
            activeTab === 'summary'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
          }`}
        >
          Performance Summary
        </button>

        <button
          onClick={() => setActiveTab('solutions')}
          className={`px-5 py-2.5 text-xs font-extrabold rounded-xl transition-all ${
            activeTab === 'solutions'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
          }`}
        >
          Detailed Solutions & Answer Key
        </button>

        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`px-5 py-2.5 text-xs font-extrabold rounded-xl transition-all ${
            activeTab === 'leaderboard'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
          }`}
        >
          State Leaderboard
        </button>
      </div>

      {/* TAB 1: SUMMARY */}
      {activeTab === 'summary' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
              Marking & Accuracy Analysis
            </h3>

            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                <span>Positive Score (+{test?.marks_per_question} per right answer)</span>
                <span className="font-bold text-emerald-600">+{attempt.correct_answers * (test?.marks_per_question || 1)} Marks</span>
              </div>

              <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                <span>Negative Marks Deduction (-{test?.negative_marking} per wrong answer)</span>
                <span className="font-bold text-rose-600">-{attempt.wrong_answers * (test?.negative_marking || 0)} Marks</span>
              </div>

              <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-950/60 rounded-xl font-bold text-slate-900 dark:text-white">
                <span>Final Evaluated Score</span>
                <span className="text-base text-blue-600">{attempt.score} Marks</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DETAILED SOLUTIONS & EXPLANATIONS */}
      {(activeTab === 'solutions' || window.matchMedia('print').matches) && (
        <div className="space-y-6">
          
          {/* Solution Filter Pills */}
          <div className="flex items-center gap-2 print:hidden">
            {(['all', 'correct', 'wrong', 'unattempted'] as const).map((flt) => (
              <button
                key={flt}
                onClick={() => setSolutionFilter(flt)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${
                  solutionFilter === flt
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500'
                }`}
              >
                {flt} Questions
              </button>
            ))}
          </div>

          {/* Question Solutions List */}
          <div className="space-y-6">
            {filteredResponses.map((resp, idx) => {
              const q = questions.find((item) => item.id === resp.question_id);
              if (!q) return null;

              return (
                <div
                  key={q.id}
                  className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <span className="font-bold text-xs text-slate-500">Question #{q.question_number}</span>
                    <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold uppercase ${
                      resp.status === 'correct'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950'
                        : resp.status === 'wrong'
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800'
                    }`}>
                      {resp.status} ({resp.marks_awarded > 0 ? `+${resp.marks_awarded}` : resp.marks_awarded})
                    </span>
                  </div>

                  <p className="font-bold text-slate-900 dark:text-white text-base">
                    {q.question_text}
                  </p>

                  {/* Options status */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-semibold">
                    {[
                      { key: 'A', text: q.option_a },
                      { key: 'B', text: q.option_b },
                      { key: 'C', text: q.option_c },
                      { key: 'D', text: q.option_d }
                    ].map(({ key, text }) => {
                      if (!text) return null;
                      const isCorrect = q.correct_answer.toUpperCase() === key;
                      const isUserChoice = resp.user_answer?.toUpperCase() === key;

                      let borderStyle = 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300';
                      if (isCorrect) borderStyle = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 font-bold';
                      if (isUserChoice && !isCorrect) borderStyle = 'border-rose-500 bg-rose-50 dark:bg-rose-950/60 text-rose-900 dark:text-rose-200 font-bold';

                      return (
                        <div key={key} className={`p-3 rounded-xl border flex items-center justify-between ${borderStyle}`}>
                          <span>{key}: {text}</span>
                          {isCorrect && <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.5 rounded">Correct Answer</span>}
                          {isUserChoice && !isCorrect && <span className="text-[10px] bg-rose-600 text-white px-1.5 py-0.5 rounded">Your Choice</span>}
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanation box */}
                  {q.explanation && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-950/40 rounded-2xl border border-blue-200 dark:border-blue-900 text-xs space-y-1">
                      <p className="font-bold text-blue-900 dark:text-blue-200 uppercase tracking-wider text-[10px]">Detailed Explanation</p>
                      <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{q.explanation}</p>
                    </div>
                  )}

                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* TAB 3: STATE LEADERBOARD */}
      {activeTab === 'leaderboard' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Trophy className="w-5 h-5 text-amber-500" /> State Mock Test Leaderboard
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-400 font-semibold uppercase">
                <tr>
                  <th className="p-3">Rank</th>
                  <th className="p-3">Candidate</th>
                  <th className="p-3">District & State</th>
                  <th className="p-3">Score</th>
                  <th className="p-3">Time Taken</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {leaderboard.map((item) => {
                  const isMe = item.attempt_id === attempt.id;
                  return (
                    <tr key={item.attempt_id} className={isMe ? 'bg-blue-50 dark:bg-blue-950/80 font-bold' : ''}>
                      <td className="p-3 font-black text-slate-500">#{item.rank}</td>
                      <td className="p-3 text-slate-900 dark:text-white font-bold">{isMe ? attempt.student_name + ' (You)' : item.masked_name}</td>
                      <td className="p-3 text-slate-500">{isMe ? `${attempt.student_district}, ${attempt.student_state}` : 'Verified Candidate'}</td>
                      <td className="p-3 text-emerald-600 font-black text-sm">{item.score} pts</td>
                      <td className="p-3 text-slate-500">{Math.floor(item.time_taken_seconds / 60)}m {item.time_taken_seconds % 60}s</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
