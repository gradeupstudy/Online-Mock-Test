import React, { useState, useEffect } from 'react';
import { BarChart2, TrendingUp, PieChart, Users, AlertCircle, CheckCircle2, MapPin, Trophy, Award } from 'lucide-react';
import { Test, Question, Attempt } from '../../types';
import { dataService } from '../../services/dataService';

export const TestAnalytics: React.FC = () => {
  const [tests, setTests] = useState<Test[]>([]);
  const [selectedTestId, setSelectedTestId] = useState<string>('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);

  useEffect(() => {
    loadTests();
  }, []);

  useEffect(() => {
    if (selectedTestId) {
      loadAnalyticsData(selectedTestId);
    }
  }, [selectedTestId]);

  const loadTests = async () => {
    const fetchedTests = await dataService.getTests(true);
    setTests(fetchedTests);
    if (fetchedTests.length > 0) {
      setSelectedTestId(fetchedTests[0].id);
    }
  };

  const loadAnalyticsData = async (tId: string) => {
    const qList = await dataService.getQuestions(tId);
    const attList = await dataService.getAttempts(tId);
    setQuestions(qList);
    setAttempts(attList.filter(a => a.status === 'completed'));
  };

  const currentTest = tests.find(t => t.id === selectedTestId);
  const totalAttempts = attempts.length;

  const avgScore = totalAttempts > 0
    ? (attempts.reduce((sum, a) => sum + a.score, 0) / totalAttempts).toFixed(1)
    : '0';

  const highestScore = totalAttempts > 0 ? Math.max(...attempts.map(a => a.score)) : 0;
  const lowestScore = totalAttempts > 0 ? Math.min(...attempts.map(a => a.score)) : 0;

  // District breakdown
  const districtCounts: Record<string, number> = {};
  attempts.forEach(a => {
    if (a.student_district) {
      districtCounts[a.student_district] = (districtCounts[a.student_district] || 0) + 1;
    }
  });

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Exam Analytics & Insights</h1>
          <p className="text-xs text-slate-500">Question difficulty analysis, average score distribution, district participation</p>
        </div>

        <select
          value={selectedTestId}
          onChange={(e) => setSelectedTestId(e.target.value)}
          className="px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-hidden"
        >
          {tests.map(t => (
            <option key={t.id} value={t.id}>{t.title}</option>
          ))}
        </select>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
          <p className="text-xs text-slate-400 font-semibold uppercase">Total Attempts</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{totalAttempts}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
          <p className="text-xs text-slate-400 font-semibold uppercase">Average Score</p>
          <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">{avgScore} / {currentTest?.total_marks || 10}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
          <p className="text-xs text-slate-400 font-semibold uppercase">Highest Mark</p>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{highestScore}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
          <p className="text-xs text-slate-400 font-semibold uppercase">Lowest Mark</p>
          <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">{lowestScore}</p>
        </div>
      </div>

      {/* Top Performers Leaderboard */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500" /> Mock Test Top Performers Leaderboard
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold uppercase text-slate-400">
                <th className="py-2.5 px-3 text-center">Rank</th>
                <th className="py-2.5 px-3">Student Name</th>
                <th className="py-2.5 px-3">District</th>
                <th className="py-2.5 px-3">Score & %</th>
                <th className="py-2.5 px-3">Accuracy</th>
                <th className="py-2.5 px-3">Time Taken</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {[...attempts]
                .sort((a, b) => b.score - a.score || a.time_taken_seconds - b.time_taken_seconds)
                .slice(0, 5)
                .map((att, idx) => (
                  <tr key={att.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 text-center font-bold">
                      {idx === 0 ? '🥇 #1' : idx === 1 ? '🥈 #2' : idx === 2 ? '🥉 #3' : `#${idx + 1}`}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">{att.student_name}</td>
                    <td className="py-2.5 px-3 text-slate-500">{att.student_district || 'N/A'}, {att.student_state}</td>
                    <td className="py-2.5 px-3">
                      <span className="font-bold text-emerald-600">{att.score} pts</span> ({att.percentage}%)
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                      {att.correct_answers} Correct / {att.wrong_answers} Wrong
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">
                      {Math.floor(att.time_taken_seconds / 60)}m {att.time_taken_seconds % 60}s
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          {attempts.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-6">No completed attempts for this mock test yet.</p>
          )}
        </div>
      </div>

      {/* District Participation List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-600" /> District-Wise Student Participation
          </h3>

          <div className="space-y-3 max-h-60 overflow-y-auto">
            {Object.entries(districtCounts).map(([dist, count]) => {
              const pct = totalAttempts > 0 ? Math.round((count / totalAttempts) * 100) : 0;
              return (
                <div key={dist} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-800 dark:text-slate-200">{dist}</span>
                    <span className="text-slate-500">{count} students ({pct}%)</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            {Object.keys(districtCounts).length === 0 && (
              <p className="text-xs text-slate-400 text-center py-6">No district participation data yet.</p>
            )}
          </div>
        </div>

        {/* Question Performance Breakdown */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-indigo-600" /> Question Bank Breakdown
          </h3>

          <div className="space-y-3 text-xs">
            {questions.map((q) => (
              <div key={q.id} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">
                    Q{q.question_number}: {q.question_text.slice(0, 45)}...
                  </p>
                  <p className="text-[10px] text-slate-400">{q.subject} | {q.chapter}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 text-[11px] font-bold rounded-md">
                    Correct: Option {q.correct_answer}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
