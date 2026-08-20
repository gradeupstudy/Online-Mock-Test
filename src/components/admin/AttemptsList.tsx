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
  ChevronRight,
  RefreshCw,
  Database,
  Copy,
  Check,
  Zap,
  Target,
  AlertCircle
} from 'lucide-react';
import { Attempt, Test } from '../../types';
import { dataService } from '../../services/dataService';
import { exportAttemptsToCSV } from '../../utils/csv';
import { printOfficialScorecard } from '../../utils/printScorecard';
import { Modal } from '../common/Modal';
import { ToppersMeritListModal } from './ToppersMeritListModal';

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
  const [isToppersModalOpen, setIsToppersModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedScorecardId, setCopiedScorecardId] = useState<string | null>(null);

  useEffect(() => {
    if (initialTestId) {
      setSelectedTestId(initialTestId);
    }
  }, [initialTestId]);

  useEffect(() => {
    loadData();
    // Auto-refresh every 20 seconds
    const interval = setInterval(() => {
      loadData(false);
    }, 20000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async (showToast = false) => {
    if (showToast) setIsRefreshing(true);
    const fetchedAttempts = await dataService.getAttempts();
    const fetchedTests = await dataService.getTests(true);
    setAttempts(fetchedAttempts);
    setTests(fetchedTests);
    if (showToast) {
      setIsRefreshing(false);
      onToast?.('success', `Refreshed! Loaded ${fetchedAttempts.length} total attempts from database.`);
    }
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

  const handlePrintScorecard = (attemptToPrint?: Attempt) => {
    const targetAttempt = attemptToPrint || selectedAttempt;
    if (!targetAttempt) return;
    const currentTest = testMap.get(targetAttempt.test_id);
    const calculatedRank = rankMap.get(targetAttempt.id) || 1;
    const testTotalCandidates = attempts.filter(a => a.test_id === targetAttempt.test_id).length || attempts.length;
    
    printOfficialScorecard({
      attempt: targetAttempt,
      test: currentTest,
      rank: calculatedRank,
      totalCandidates: testTotalCandidates
    });
  };

  const handleCopyScorecardSummary = (att: Attempt) => {
    const currentTest = testMap.get(att.test_id);
    const calculatedRank = rankMap.get(att.id) || 1;
    const totalQ = att.total_questions || currentTest?.total_questions || ((att.correct_answers || 0) + (att.wrong_answers || 0) + (att.unattempted_answers || att.skipped_questions || 0)) || 1;
    const maxMarks = currentTest?.total_marks || totalQ;
    const timeM = Math.floor(att.time_taken_seconds / 60);
    const timeS = att.time_taken_seconds % 60;
    
    const summaryText = `🎓 *GRADEUP STUDY - OFFICIAL SCORECARD* 🎓\n` +
      `👤 *Candidate:* ${att.student_name}\n` +
      `📝 *Mock Test:* ${currentTest?.title || 'Mock Test'}\n` +
      `🏆 *Rank:* #${calculatedRank}\n` +
      `🎯 *Score:* ${att.score} / ${maxMarks} (${att.percentage}%)\n` +
      `✅ *Correct:* ${att.correct_answers} | ❌ *Wrong:* ${att.wrong_answers}\n` +
      `⏱️ *Time Taken:* ${timeM}m ${timeS}s\n` +
      `📍 *Location:* ${att.student_district ? `${att.student_district}, ` : ''}${att.student_state}\n` +
      `──────────────────────\n` +
      `🌐 *Gradeup Study Online Assessment System*`;

    navigator.clipboard.writeText(summaryText);
    setCopiedScorecardId(att.id);
    onToast?.('success', 'Candidate Scorecard Summary copied to clipboard!');
    setTimeout(() => {
      setCopiedScorecardId(null);
    }, 2500);
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

        <div className="flex items-center flex-wrap gap-2 shrink-0">
          <button
            onClick={() => loadData(true)}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 shadow-xs transition-all cursor-pointer disabled:opacity-50"
            title="Fetch latest student results from Supabase database"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Refresh Results'}</span>
          </button>

          <button
            onClick={() => setIsToppersModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-md transition-all cursor-pointer border border-amber-400"
          >
            <Trophy className="w-4 h-4 fill-slate-950" />
            <span>Generate Top 5/10/20 PDF Merit List</span>
          </button>
          
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all cursor-pointer"
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

      {/* RESULTS LIST - Responsive Desktop Table + Mobile Cards */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        
        {/* Mobile View: Cards */}
        <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {sortedAttempts.map((att) => {
            const testObj = testMap.get(att.test_id);
            const rankNum = rankMap.get(att.id) || 1;

            return (
              <div key={att.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black text-xs shrink-0">
                      {rankNum === 1 ? '🥇' : rankNum === 2 ? '🥈' : rankNum === 3 ? '🥉' : `#${rankNum}`}
                    </span>
                    <div>
                      <p className="font-bold text-sm text-slate-900 dark:text-white leading-tight">{att.student_name}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {att.student_district || 'N/A'}, {att.student_state || 'HP'} • {att.student_mobile}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-black text-emerald-600 dark:text-emerald-400 text-base">
                      {att.score} pts
                    </span>
                    <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400">{att.percentage}% Score</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl text-xs">
                  <span className="text-slate-600 dark:text-slate-300 font-medium truncate max-w-[200px]">
                    📝 {testObj ? testObj.title : 'Mock Test'}
                  </span>
                  <div className="flex items-center gap-2 text-[11px] font-bold">
                    <span className="text-emerald-600">✓ {att.correct_answers}</span>
                    <span className="text-rose-500">✗ {att.wrong_answers}</span>
                    <span className="text-slate-400">⏱ {Math.floor(att.time_taken_seconds / 60)}m</span>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    onClick={() => setSelectedAttempt(att)}
                    className="w-full py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 active:bg-blue-200 dark:bg-blue-950 dark:text-blue-300 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>View Official Scorecard</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden md:block overflow-x-auto">
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
        title={
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span>Official Candidate Scorecard</span>
          </div>
        }
        maxWidth="2xl"
      >
        {selectedAttempt && (() => {
          const currentTest = testMap.get(selectedAttempt.test_id);
          const calculatedRank = rankMap.get(selectedAttempt.id) || 1;
          const totalQ = selectedAttempt.total_questions || currentTest?.total_questions || ((selectedAttempt.correct_answers || 0) + (selectedAttempt.wrong_answers || 0) + (selectedAttempt.unattempted_answers || selectedAttempt.skipped_questions || 0)) || 1;
          const maxMarks = currentTest?.total_marks || (totalQ * (currentTest?.marks_per_question || 1));
          const marksPerQ = currentTest?.marks_per_question || 1;
          const negMarks = currentTest?.negative_marking ?? 0.25;
          const attemptedCount = selectedAttempt.attempted_questions ?? ((selectedAttempt.correct_answers || 0) + (selectedAttempt.wrong_answers || 0));
          const unattemptedCount = selectedAttempt.unattempted_answers ?? selectedAttempt.skipped_questions ?? Math.max(0, totalQ - attemptedCount);
          const accuracy = attemptedCount > 0 ? ((selectedAttempt.correct_answers / attemptedCount) * 100).toFixed(1) : '0';
          const avgSpeed = attemptedCount > 0 ? (selectedAttempt.time_taken_seconds / attemptedCount).toFixed(1) : '0';
          const isPassed = Number(selectedAttempt.percentage || 0) >= (currentTest?.passing_marks ? (currentTest.passing_marks / maxMarks) * 100 : 40);

          return (
            <div className="space-y-5 text-slate-900 dark:text-slate-100">
              
              {/* Official Gradeup Study Header Card */}
              <div className="relative overflow-hidden bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-5 rounded-2xl text-white shadow-lg border border-blue-800/40 space-y-4">
                
                {/* Top Badge & Rank */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-white/10 backdrop-blur-xs text-blue-200 text-[11px] font-black rounded-lg border border-white/20 uppercase tracking-wider">
                      Gradeup Study
                    </span>
                    <span className="text-[10px] text-blue-300 font-semibold uppercase tracking-wider hidden sm:inline">
                      Official Assessment Report
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-400/20 text-amber-300 text-xs font-black rounded-xl border border-amber-400/30 shadow-xs">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    <span>Rank #{calculatedRank}</span>
                  </div>
                </div>

                {/* Candidate Name & Contact Particulars */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">{selectedAttempt.student_name}</h2>
                    <div className="mt-1 space-y-0.5 text-xs text-blue-200/90 font-medium">
                      <p>📱 Mobile: <span className="text-white font-semibold">{selectedAttempt.student_mobile}</span></p>
                      {selectedAttempt.student_email && (
                        <p className="truncate">✉️ Email: <span className="text-white font-semibold">{selectedAttempt.student_email}</span></p>
                      )}
                      {(selectedAttempt.student_district || selectedAttempt.student_state) && (
                        <p className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-blue-300 shrink-0" />
                          <span>{selectedAttempt.student_district ? `${selectedAttempt.student_district}, ` : ''}{selectedAttempt.student_state}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Exam Details Box */}
                  <div className="bg-white/5 backdrop-blur-xs p-3 rounded-xl border border-white/10 text-xs space-y-1 self-center">
                    <div className="text-[10px] uppercase tracking-wider font-bold text-blue-300">Examination Metadata</div>
                    <div className="font-bold text-white text-sm line-clamp-1">{currentTest?.title || 'Mock Test'}</div>
                    <div className="text-blue-200 text-xs flex items-center justify-between">
                      <span>Subject: <strong className="text-white">{currentTest?.subject || currentTest?.category || 'General'}</strong></span>
                      <span>Date: <strong className="text-white">{selectedAttempt.submitted_at ? new Date(selectedAttempt.submitted_at).toLocaleDateString('en-IN') : 'N/A'}</strong></span>
                    </div>
                  </div>
                </div>

              </div>

              {/* 4 Metric KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 text-center">
                <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 shadow-xs">
                  <p className="font-black text-2xl text-emerald-700 dark:text-emerald-400">
                    {selectedAttempt.score} <span className="text-xs font-normal text-emerald-600/70 dark:text-emerald-500">/ {maxMarks}</span>
                  </p>
                  <p className="text-slate-600 dark:text-slate-400 uppercase text-[10px] font-extrabold mt-1 tracking-wide">Marks Obtained</p>
                </div>

                <div className="p-3.5 bg-blue-50 dark:bg-blue-950/30 rounded-2xl border border-blue-200 dark:border-blue-900/60 shadow-xs">
                  <p className="font-black text-2xl text-blue-700 dark:text-blue-400">{selectedAttempt.percentage}%</p>
                  <p className="text-slate-600 dark:text-slate-400 uppercase text-[10px] font-extrabold mt-1 tracking-wide">Percentage Score</p>
                </div>

                <div className="p-3.5 bg-teal-50 dark:bg-teal-950/30 rounded-2xl border border-teal-200 dark:border-teal-900/60 shadow-xs">
                  <p className="font-black text-2xl text-teal-700 dark:text-teal-400">{selectedAttempt.correct_answers}</p>
                  <p className="text-slate-600 dark:text-slate-400 uppercase text-[10px] font-extrabold mt-1 tracking-wide">Correct Answers</p>
                </div>

                <div className="p-3.5 bg-rose-50 dark:bg-rose-950/30 rounded-2xl border border-rose-200 dark:border-rose-900/60 shadow-xs">
                  <p className="font-black text-2xl text-rose-700 dark:text-rose-400">{selectedAttempt.wrong_answers}</p>
                  <p className="text-slate-600 dark:text-slate-400 uppercase text-[10px] font-extrabold mt-1 tracking-wide">Wrong Answers</p>
                </div>
              </div>

              {/* Accuracy & Speed Secondary Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 text-xs">
                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-bold block">Net Accuracy</span>
                  <span className="font-black text-sm text-slate-800 dark:text-slate-200">{accuracy}%</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-bold block">Total Time</span>
                  <span className="font-bold text-sm text-slate-800 dark:text-slate-200">
                    {Math.floor(selectedAttempt.time_taken_seconds / 60)}m {selectedAttempt.time_taken_seconds % 60}s
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-bold block">Avg Speed</span>
                  <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{avgSpeed}s / Q</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-bold block">Result Status</span>
                  <span className={`font-black text-xs uppercase px-2 py-0.5 rounded-md inline-block mt-0.5 ${
                    isPassed 
                      ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300' 
                      : 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300'
                  }`}>
                    {isPassed ? 'QUALIFIED' : 'COMPLETED'}
                  </span>
                </div>
              </div>

              {/* Question & Mark Breakdown Details Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                <div className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Question & Marks Breakdown</span>
                  <span className="text-[11px] text-slate-500">Attempt ID: <code className="font-mono">{selectedAttempt.id.slice(0, 8)}</code></span>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs bg-white dark:bg-slate-900">
                  <div className="grid grid-cols-3 px-4 py-2 text-slate-600 dark:text-slate-400">
                    <span>Total Questions: <strong>{totalQ}</strong></span>
                    <span>Attempted: <strong>{attemptedCount}</strong></span>
                    <span>Skipped: <strong>{unattemptedCount}</strong></span>
                  </div>
                  <div className="grid grid-cols-2 px-4 py-2 text-slate-600 dark:text-slate-400">
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                      Correct Points Added: <strong>+{(selectedAttempt.correct_answers * marksPerQ).toFixed(2)}</strong> (+{marksPerQ}/Q)
                    </span>
                    <span className="text-rose-600 dark:text-rose-400 font-medium">
                      Negative Penalty Deducted: <strong>-{(selectedAttempt.wrong_answers * negMarks).toFixed(2)}</strong> (-{negMarks}/Q)
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                <button
                  onClick={() => handleCopyScorecardSummary(selectedAttempt)}
                  className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  {copiedScorecardId === selectedAttempt.id ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400">Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-slate-500" />
                      <span>Copy Scorecard Text</span>
                    </>
                  )}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedAttempt(null)}
                    className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Close
                  </button>

                  <button
                    onClick={() => handlePrintScorecard(selectedAttempt)}
                    className="flex-1 sm:flex-none px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Official Scorecard</span>
                  </button>
                </div>
              </div>

            </div>
          );
        })()}
      </Modal>

      {/* TOPPERS MERIT LIST PDF GENERATOR MODAL */}
      <ToppersMeritListModal
        isOpen={isToppersModalOpen}
        onClose={() => setIsToppersModalOpen(false)}
        tests={tests}
        attempts={attempts}
        initialTestId={selectedTestId}
        onToast={onToast}
      />

    </div>
  );
};
