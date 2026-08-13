import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Download, 
  Filter, 
  FileText, 
  UserCheck, 
  Clock, 
  Award, 
  CheckCircle2, 
  XCircle, 
  Trophy, 
  TrendingUp, 
  BarChart2, 
  Printer, 
  Share2, 
  Users, 
  MapPin,
  ChevronRight 
} from 'lucide-react';
import { Attempt, Test } from '../../types';
import { dataService } from '../../services/dataService';
import { exportAttemptsToCSV } from '../../utils/csv';
import { Modal } from '../common/Modal';

interface AttemptsListProps {
  initialTestId?: string;
  onToast?: (type: 'success' | 'error' | 'info', msg: string) => void;
}

export const AttemptsList: React.FC<AttemptsListProps> = ({ initialTestId = 'all', onToast }) => {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTestId, setSelectedTestId] = useState(initialTestId);
  const [selectedState, setSelectedState] = useState('all');
  const [sortBy, setSortBy] = useState<'rank' | 'date_desc' | 'date_asc' | 'name'>('rank');
  const [selectedAttempt, setSelectedAttempt] = useState<Attempt | null>(null);

  useEffect(() => {
    if (initialTestId) {
      setSelectedTestId(initialTestId);
    }
  }, [initialTestId]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const fetchedAttempts = await dataService.getAttempts();
    const fetchedTests = await dataService.getTests(true);
    setAttempts(fetchedAttempts);
    setTests(fetchedTests);
  };

  const states = Array.from(new Set(attempts.map(a => a.student_state))).filter(Boolean);

  // Map test_id to test object
  const testMap = new Map<string, Test>();
  tests.forEach(t => testMap.set(t.id, t));

  // Current selected test details (if specific test selected)
  const currentSelectedTest = selectedTestId !== 'all' ? testMap.get(selectedTestId) : null;

  // Filter attempts
  const filteredAttempts = attempts.filter((a) => {
    const matchesSearch = a.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          a.student_mobile.includes(searchQuery) ||
                          a.student_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          a.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTest = selectedTestId === 'all' || a.test_id === selectedTestId;
    const matchesState = selectedState === 'all' || a.student_state === selectedState;
    return matchesSearch && matchesTest && matchesState;
  });

  // Sort attempts
  const sortedAttempts = [...filteredAttempts].sort((a, b) => {
    if (sortBy === 'rank') {
      // Highest score first, then fastest time
      if (b.score !== a.score) return b.score - a.score;
      return a.time_taken_seconds - b.time_taken_seconds;
    } else if (sortBy === 'date_desc') {
      return new Date(b.submitted_at || 0).getTime() - new Date(a.submitted_at || 0).getTime();
    } else if (sortBy === 'date_asc') {
      return new Date(a.submitted_at || 0).getTime() - new Date(b.submitted_at || 0).getTime();
    } else if (sortBy === 'name') {
      return a.student_name.localeCompare(b.student_name);
    }
    return 0;
  });

  // Calculate Rank Map for selected test context or overall context
  // Sort all attempts of selected test to get true ranks
  const testAttemptsPool = selectedTestId === 'all' 
    ? attempts 
    : attempts.filter(a => a.test_id === selectedTestId);

  const rankSortedPool = [...testAttemptsPool].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.time_taken_seconds - b.time_taken_seconds;
  });

  const rankMap = new Map<string, number>();
  rankSortedPool.forEach((att, idx) => {
    rankMap.set(att.id, idx + 1);
  });

  // Statistics for selected test or overall
  const completedPool = testAttemptsPool.filter(a => a.status === 'completed');
  const totalCandidates = completedPool.length;
  const avgScore = totalCandidates > 0
    ? (completedPool.reduce((sum, a) => sum + (a.score || 0), 0) / totalCandidates).toFixed(1)
    : '0';
  const avgPercentage = totalCandidates > 0
    ? Math.round(completedPool.reduce((sum, a) => sum + (a.percentage || 0), 0) / totalCandidates)
    : 0;

  // Topper info
  const topperAttempt = rankSortedPool.length > 0 ? rankSortedPool[0] : null;

  // Pass rate (% with score >= 40%)
  const passedCount = completedPool.filter(a => (a.percentage || 0) >= 40).length;
  const passPercentage = totalCandidates > 0 ? Math.round((passedCount / totalCandidates) * 100) : 0;

  const handleExportCSV = () => {
    if (sortedAttempts.length === 0) {
      onToast?.('error', 'No student results found to export!');
      return;
    }
    const filename = currentSelectedTest 
      ? `Gradeup_${currentSelectedTest.title.replace(/[^a-zA-Z0-9]/g, '_')}_Results`
      : 'Gradeup_Study_All_Student_Results';
    exportAttemptsToCSV(sortedAttempts, filename);
    onToast?.('success', `Exported ${sortedAttempts.length} student results to CSV!`);
  };

  const handlePrintScorecard = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
              Mock Test Wise Results
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
            Student Performance & Results
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            View mock-test-wise candidate scores, leaderboards, rankings, accuracy rates, and export CSV scorecards.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV ({sortedAttempts.length})</span>
          </button>
        </div>
      </div>

      {/* QUICK MOCK TEST SELECTION PILLS */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <p className="text-xs font-bold uppercase text-slate-400 tracking-wider">Select Mock Test to Filter Results:</p>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedTestId('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              selectedTestId === 'all'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            All Mock Tests ({attempts.length})
          </button>
          {tests.map((test) => {
            const testAttemptsCount = attempts.filter(a => a.test_id === test.id).length;
            const isSelected = selectedTestId === test.id;
            return (
              <button
                key={test.id}
                onClick={() => setSelectedTestId(test.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>{test.title}</span>
                <span className={`px-1.5 py-0.2 text-[10px] rounded-md ${
                  isSelected ? 'bg-blue-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}>
                  {testAttemptsCount}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* MOCK TEST ANALYTICS SUMMARY BANNER */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-4 rounded-2xl shadow-md col-span-2 md:col-span-1">
          <p className="text-[11px] text-blue-200 font-semibold uppercase">Active Test Context</p>
          <p className="text-base font-black truncate mt-1">
            {currentSelectedTest ? currentSelectedTest.title : 'All Mock Tests'}
          </p>
          <p className="text-[11px] text-blue-100 mt-1">
            {currentSelectedTest ? `Code: ${currentSelectedTest.test_code} | Total Qs: ${currentSelectedTest.total_questions}` : `${tests.length} Total Tests`}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold uppercase">Total Students</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">{totalCandidates}</p>
          <p className="text-[10px] text-slate-400">Completed Attempts</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold uppercase">Average Score</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{avgScore} <span className="text-xs font-normal text-slate-400">({avgPercentage}%)</span></p>
          <p className="text-[10px] text-slate-400">Class Avg Performance</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold uppercase">Test Topper</span>
            <Trophy className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-lg font-black text-amber-600 dark:text-amber-400 truncate">
            {topperAttempt ? topperAttempt.student_name : 'N/A'}
          </p>
          <p className="text-[10px] text-slate-500 font-semibold truncate">
            {topperAttempt ? `High Mark: ${topperAttempt.score} pts (${topperAttempt.percentage}%)` : 'No attempts yet'}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold uppercase">Qualification Rate</span>
            <CheckCircle2 className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{passPercentage}%</p>
          <p className="text-[10px] text-slate-400">Scored ≥ 40% Marks</p>
        </div>

      </div>

      {/* FILTER & SEARCH CONTROL BAR */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        
        {/* Search */}
        <div className="relative col-span-1 sm:col-span-2 md:col-span-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search student, mobile, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 outline-hidden"
          />
        </div>

        {/* Test Dropdown Filter */}
        <select
          value={selectedTestId}
          onChange={(e) => setSelectedTestId(e.target.value)}
          className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-semibold outline-hidden"
        >
          <option value="all">📁 All Mock Tests</option>
          {tests.map(t => (
            <option key={t.id} value={t.id}>📝 {t.title}</option>
          ))}
        </select>

        {/* State Dropdown Filter */}
        <select
          value={selectedState}
          onChange={(e) => setSelectedState(e.target.value)}
          className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-semibold outline-hidden"
        >
          <option value="all">📍 All States</option>
          {states.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        {/* Sort Dropdown */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-bold text-blue-600 dark:text-blue-400 outline-hidden"
        >
          <option value="rank">🏆 Sort: Rank / High Score First</option>
          <option value="date_desc">📅 Sort: Submitted Date (Newest First)</option>
          <option value="date_asc">⏳ Sort: Submitted Date (Oldest First)</option>
          <option value="name">🔤 Sort: Student Name (A-Z)</option>
        </select>

      </div>

      {/* RESULTS TABLE */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold uppercase text-slate-400">
              <tr>
                <th className="py-3 px-4 text-center w-16">Rank</th>
                <th className="py-3 px-4">Student Info</th>
                <th className="py-3 px-4">Mock Test Name</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">District & State</th>
                <th className="py-3 px-4">Marks & %</th>
                <th className="py-3 px-4">Accuracy Breakdown</th>
                <th className="py-3 px-4">Time Taken</th>
                <th className="py-3 px-4 text-right">Scorecard</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {sortedAttempts.map((att) => {
                const testObj = testMap.get(att.test_id);
                const rankNum = rankMap.get(att.id) || 1;

                return (
                  <tr key={att.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    
                    {/* Rank Badge */}
                    <td className="py-3.5 px-4 text-center">
                      {rankNum === 1 && (
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 text-amber-800 font-black text-sm shadow-xs border border-amber-300" title="1st Rank / Topper">
                          🥇
                        </span>
                      )}
                      {rankNum === 2 && (
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-200 text-slate-800 font-black text-sm shadow-xs border border-slate-300" title="2nd Rank">
                          🥈
                        </span>
                      )}
                      {rankNum === 3 && (
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-orange-100 text-orange-800 font-black text-sm shadow-xs border border-orange-300" title="3rd Rank">
                          🥉
                        </span>
                      )}
                      {rankNum > 3 && (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs">
                          #{rankNum}
                        </span>
                      )}
                    </td>

                    {/* Student Info */}
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>{att.student_name}</span>
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {att.submitted_at ? new Date(att.submitted_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                      </p>
                    </td>

                    {/* Mock Test Title */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold text-xs rounded-lg inline-block truncate max-w-full">
                        {testObj ? testObj.title : 'Mock Test'}
                      </span>
                    </td>

                    {/* Contact */}
                    <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-300">
                      <p className="font-semibold">{att.student_mobile}</p>
                      <p className="text-slate-400 text-[11px] truncate max-w-[140px]">{att.student_email}</p>
                    </td>

                    {/* Location */}
                    <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-300">
                      <p className="font-semibold">{att.student_district || 'N/A'}</p>
                      <p className="text-slate-400 text-[11px]">{att.student_state || 'HP'}</p>
                    </td>

                    {/* Score / Percentage */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-baseline gap-1.5">
                        <span className="font-black text-emerald-600 dark:text-emerald-400 text-base">
                          {att.score}
                        </span>
                        <span className="text-xs text-slate-400">/ {testObj?.total_marks || 100}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        (att.percentage || 0) >= 60 
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : (att.percentage || 0) >= 40
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                      }`}>
                        {att.percentage}% Score
                      </span>
                    </td>

                    {/* Accuracy Breakdown */}
                    <td className="py-3.5 px-4 text-xs font-semibold">
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                          <CheckCircle2 className="w-3.5 h-3.5" /> {att.correct_answers}
                        </span>
                        <span className="text-rose-500 flex items-center gap-0.5">
                          <XCircle className="w-3.5 h-3.5" /> {att.wrong_answers}
                        </span>
                      </div>
                    </td>

                    {/* Time Taken */}
                    <td className="py-3.5 px-4 text-xs font-medium text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {Math.floor(att.time_taken_seconds / 60)}m {att.time_taken_seconds % 60}s
                      </span>
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedAttempt(att)}
                        className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 text-xs font-bold transition-colors inline-flex items-center gap-1"
                      >
                        <span>Scorecard</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {sortedAttempts.length === 0 && (
          <div className="py-12 text-center text-slate-500 text-sm space-y-2">
            <FileText className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="font-semibold text-slate-700 dark:text-slate-300">No student results found</p>
            <p className="text-xs text-slate-400">Try changing your search query or selecting a different mock test filter.</p>
          </div>
        )}
      </div>

      {/* STUDENT DETAILED SCORECARD MODAL */}
      <Modal
        isOpen={Boolean(selectedAttempt)}
        onClose={() => setSelectedAttempt(null)}
        title="Official Student Performance Scorecard"
        maxWidth="lg"
      >
        {selectedAttempt && (
          <div className="space-y-6 text-slate-900 dark:text-white">
            
            {/* Header info */}
            <div className="bg-gradient-to-r from-blue-900 to-indigo-900 p-5 rounded-2xl text-white shadow-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 bg-blue-500/20 text-blue-200 text-[10px] font-bold rounded-full border border-blue-400/30 uppercase">
                  Gradeup Study Library
                </span>
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
                  <Trophy className="w-3.5 h-3.5" />
                  Rank #{rankMap.get(selectedAttempt.id) || 1}
                </span>
              </div>
              <div>
                <h2 className="text-xl font-black">{selectedAttempt.student_name}</h2>
                <p className="text-xs text-slate-300 mt-0.5">
                  Mobile: {selectedAttempt.student_mobile} | Email: {selectedAttempt.student_email}
                </p>
                <p className="text-xs text-slate-300 mt-0.5 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-blue-300 inline" /> {selectedAttempt.student_district}, {selectedAttempt.student_state}
                </p>
              </div>
              <div className="pt-2 border-t border-white/10 text-xs text-blue-200 flex items-center justify-between">
                <span>Test: {testMap.get(selectedAttempt.test_id)?.title || 'Mock Test'}</span>
                <span>Date: {selectedAttempt.submitted_at ? new Date(selectedAttempt.submitted_at).toLocaleDateString() : 'N/A'}</span>
              </div>
            </div>

            {/* Metric KPI Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                <p className="font-black text-xl text-emerald-600 dark:text-emerald-400">{selectedAttempt.score}</p>
                <p className="text-slate-400 uppercase text-[10px] font-bold mt-0.5">Marks Obtained</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                <p className="font-black text-xl text-blue-600 dark:text-blue-400">{selectedAttempt.percentage}%</p>
                <p className="text-slate-400 uppercase text-[10px] font-bold mt-0.5">Percentage</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                <p className="font-black text-xl text-emerald-600 dark:text-emerald-400">{selectedAttempt.correct_answers}</p>
                <p className="text-slate-400 uppercase text-[10px] font-bold mt-0.5">Correct Answers</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                <p className="font-black text-xl text-rose-600 dark:text-rose-400">{selectedAttempt.wrong_answers}</p>
                <p className="text-slate-400 uppercase text-[10px] font-bold mt-0.5">Wrong Answers</p>
              </div>
            </div>

            {/* Further stats */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 font-medium">Attempt ID</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{selectedAttempt.id}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 font-medium">Time Taken</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {Math.floor(selectedAttempt.time_taken_seconds / 60)} mins {selectedAttempt.time_taken_seconds % 60} secs
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500 font-medium">Status</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                  {selectedAttempt.status}
                </span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={handlePrintScorecard}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" /> Print Scorecard
              </button>
            </div>

          </div>
        )}
      </Modal>

    </div>
  );
};
