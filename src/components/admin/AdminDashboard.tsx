import React, { useEffect, useState } from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  HelpCircle, 
  Users, 
  BarChart2, 
  Share2, 
  Settings, 
  LogOut, 
  Database,
  Plus, 
  TrendingUp, 
  Award, 
  CheckCircle2, 
  Clock, 
  Share2 as ShareIcon, 
  ArrowUpRight,
  Sparkles,
  Zap,
  FolderPlus,
  Flag,
  Cpu
} from 'lucide-react';
import { Test, Attempt, QuestionReport } from '../../types';
import { dataService } from '../../services/dataService';
import { TestManager } from './TestManager';
import { QuestionManager } from './QuestionManager';
import { QuestionBankView } from './QuestionBankView';
import { AttemptsList } from './AttemptsList';
import { TestAnalytics } from './TestAnalytics';
import { SocialGateManager } from './SocialGateManager';
import { AdminSettingsView } from './AdminSettingsView';
import { BulkImportModal } from './BulkImportModal';
import { ReportedMCQsManager } from './ReportedMCQsManager';
import { BulkAITestGeneratorModal } from './BulkAITestGeneratorModal';
import { SupabaseStorageIndicator } from './SupabaseStorageIndicator';
import { AIAutomationCenter } from './AIAutomationCenter/AIAutomationCenter';

export type AdminTab = 'dashboard' | 'ai_automation' | 'tests' | 'bank' | 'questions' | 'attempts' | 'analytics' | 'reports' | 'social' | 'settings';

interface AdminDashboardProps {
  onNavigateTab?: (tab: AdminTab, testId?: string) => void;
  onToast?: (type: 'success' | 'error' | 'info', msg: string) => void;
  onLogout?: () => void;
  onOpenSupabaseModal?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  onNavigateTab, 
  onToast,
  onLogout,
  onOpenSupabaseModal
}) => {
  const safeToast = (type: 'success' | 'error' | 'info', msg: string) => {
    if (typeof onToast === 'function') {
      onToast(type, msg);
    }
  };
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [selectedTestIdForQuestions, setSelectedTestIdForQuestions] = useState<string>('');
  const [selectedTestIdForAttempts, setSelectedTestIdForAttempts] = useState<string>('all');
  
  // Bulk import state
  const [bulkImportTestId, setBulkImportTestId] = useState<string>('');
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [isBulkAIGeneratorOpen, setIsBulkAIGeneratorOpen] = useState(false);

  // Stats
  const [tests, setTests] = useState<Test[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [pendingReportsCount, setPendingReportsCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();

    const handleTestsUpdated = () => {
      loadDashboardData();
    };

    const handleReportsUpdated = () => {
      dataService.getQuestionReports({ status: 'pending' }).then((reps) => {
        setPendingReportsCount(reps.length);
      });
    };

    window.addEventListener('gradeup_tests_updated', handleTestsUpdated);
    window.addEventListener('gradeup_reports_updated', handleReportsUpdated);
    return () => {
      window.removeEventListener('gradeup_tests_updated', handleTestsUpdated);
      window.removeEventListener('gradeup_reports_updated', handleReportsUpdated);
    };
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    const [fetchedTests, fetchedAttempts, fetchedReports] = await Promise.all([
      dataService.getTests(true),
      dataService.getAttempts(),
      dataService.getQuestionReports({ status: 'pending' })
    ]);
    setTests(fetchedTests);
    setAttempts(fetchedAttempts);
    setPendingReportsCount(fetchedReports.length);
    if (fetchedTests.length > 0 && !selectedTestIdForQuestions) {
      setSelectedTestIdForQuestions(fetchedTests[0].id);
    }
    setLoading(false);
  };

  const publishedTestsCount = tests.filter(t => t.is_published).length;
  const totalAttemptsCount = attempts.length;
  
  // Calculate unique students
  const uniqueMobiles = new Set(attempts.map(a => a.student_mobile));
  const totalStudentsCount = uniqueMobiles.size;

  // Average & Highest Score calculation
  const completedAttempts = attempts.filter(a => a.status === 'completed');
  const avgPercentage = completedAttempts.length > 0
    ? Math.round(completedAttempts.reduce((acc, curr) => acc + (curr.percentage || 0), 0) / completedAttempts.length)
    : 0;
  
  const highestScore = completedAttempts.length > 0
    ? Math.max(...completedAttempts.map(a => a.score || 0))
    : 0;

  const handleTabChange = (tab: AdminTab, testId?: string) => {
    setActiveTab(tab);
    if (testId) {
      setSelectedTestIdForQuestions(testId);
      setSelectedTestIdForAttempts(testId);
    }
    if (typeof onNavigateTab === 'function') {
      onNavigateTab(tab, testId);
    }
  };

  const handleOpenQuestionsForTest = (testId: string) => {
    setSelectedTestIdForQuestions(testId);
    handleTabChange('questions', testId);
  };

  const handleOpenAttemptsForTest = (testId: string) => {
    setSelectedTestIdForAttempts(testId);
    handleTabChange('attempts', testId);
  };

  const handleOpenBulkImport = (testId: string) => {
    setBulkImportTestId(testId);
    setIsBulkImportOpen(true);
  };

  const handleCopyLink = (slug: string) => {
    const fullUrl = dataService.getPublicShareableUrl(slug);
    navigator.clipboard.writeText(fullUrl);
    safeToast('success', 'Public shareable test link copied to clipboard!');
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* ADMIN TOP NAVIGATION CONTROLS */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2 shadow-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 overflow-x-auto py-1 scrollbar-none max-w-full">
          <button
            onClick={() => handleTabChange('dashboard')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => handleTabChange('ai_automation')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'ai_automation'
                ? 'bg-linear-to-r from-purple-600 via-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-500/25'
                : 'text-indigo-700 dark:text-indigo-300 bg-indigo-50/70 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>AI Automation</span>
            <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 text-[9px] font-black uppercase">
              NEW
            </span>
          </button>

          <button
            onClick={() => handleTabChange('tests')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'tests'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Mock Tests</span>
          </button>

          <button
            onClick={() => handleTabChange('bank')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'bank' || activeTab === 'questions'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>Question Bank</span>
          </button>

          <button
            onClick={() => handleTabChange('attempts')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'attempts'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Student Attempts</span>
          </button>

          <button
            onClick={() => handleTabChange('analytics')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'analytics'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            <span>Analytics</span>
          </button>

          <button
            onClick={() => handleTabChange('reports')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer relative ${
              activeTab === 'reports'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Flag className="w-4 h-4 text-rose-500" />
            <span>Reported MCQs</span>
            {pendingReportsCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                activeTab === 'reports' ? 'bg-white text-rose-700' : 'bg-rose-600 text-white animate-pulse'
              }`}>
                {pendingReportsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => handleTabChange('social')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'social'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Share2 className="w-4 h-4" />
            <span>Social Gate</span>
          </button>

          <button
            onClick={() => handleTabChange('settings')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {onOpenSupabaseModal && (
            <button
              onClick={onOpenSupabaseModal}
              className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              title="Database Settings"
            >
              <Database className="w-4 h-4" />
            </button>
          )}

          {onLogout && (
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          )}
        </div>
      </div>

      {/* DASHBOARD TAB CONTENT */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          
          {/* SUPABASE LIVE STORAGE & DATABASE QUOTA INDICATOR */}
          <SupabaseStorageIndicator
            onOpenSupabaseModal={onOpenSupabaseModal}
            onToast={safeToast}
          />

          {/* PENDING REPORTS ALERT BANNER */}
          {pendingReportsCount > 0 && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <Flag className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-rose-900 dark:text-rose-200 flex items-center gap-2">
                    <span>{pendingReportsCount} MCQ Error {pendingReportsCount === 1 ? 'Report' : 'Reports'} Pending Review</span>
                    <span className="px-2 py-0.5 bg-rose-600 text-white rounded-full text-[10px] font-black uppercase">Action Needed</span>
                  </h4>
                  <p className="text-xs text-rose-700/80 dark:text-rose-300/80 mt-0.5">
                    Students have reported issues or disputed answer keys during mock test attempts. Review them now.
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleTabChange('reports')}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer self-start sm:self-center"
              >
                <span>Review Reports</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* STATS OVERVIEW CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Total Tests Card */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Mock Tests</span>
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                  <FileText className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900 dark:text-white">{tests.length}</span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  {publishedTestsCount} Published
                </span>
              </div>
              <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
                <span>Active & Ready</span>
                <button 
                  onClick={() => handleTabChange('tests')}
                  className="text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center gap-0.5"
                >
                  Manage <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Total Attempts Card */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Submissions</span>
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900 dark:text-white">{totalAttemptsCount}</span>
                <span className="text-xs font-bold text-slate-500">
                  {completedAttempts.length} Completed
                </span>
              </div>
              <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
                <span>Real-time test data</span>
                <button 
                  onClick={() => handleTabChange('attempts')}
                  className="text-emerald-600 dark:text-emerald-400 hover:underline font-semibold flex items-center gap-0.5"
                >
                  View <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Unique Students */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Unique Students</span>
                <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900 dark:text-white">{totalStudentsCount}</span>
                <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
                  Verified Mobiles
                </span>
              </div>
              <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
                <span>Lead Generation</span>
                <button 
                  onClick={() => handleTabChange('attempts')}
                  className="text-purple-600 dark:text-purple-400 hover:underline font-semibold flex items-center gap-0.5"
                >
                  Leads <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Performance Stats */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Avg Student Score</span>
                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                  <Award className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900 dark:text-white">{avgPercentage}%</span>
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                  High: {highestScore} pts
                </span>
              </div>
              <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
                <span>Passing Quality</span>
                <button 
                  onClick={() => handleTabChange('analytics')}
                  className="text-amber-600 dark:text-amber-400 hover:underline font-semibold flex items-center gap-0.5"
                >
                  Insights <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>
            </div>

          </div>

          {/* AI SUITE QUICK LAUNCH BANNER */}
          <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white border border-indigo-500/20 shadow-md">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3 fill-slate-950" /> Gemini 3.7 Flash AI Suite
                  </span>
                </div>
                <h3 className="text-xl font-black text-white">
                  Smart Question Bank & 360° AI Quality Engine
                </h3>
                <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                  Generate exam-targeted MCQs with distinct Subject, Section, Chapter, and Topic fields, audit grammar and factual accuracy with 360° MCQ Inspection, and build new Mock Tests in 1-click.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleTabChange('ai_automation')}
                  className="px-5 py-2.5 bg-linear-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer scale-100 hover:scale-[1.02]"
                >
                  <Cpu className="w-4 h-4 text-slate-950" />
                  <span>AI Automation Center (PDF → Test Series)</span>
                </button>

                <button
                  onClick={() => setIsBulkAIGeneratorOpen(true)}
                  className="px-4 py-2.5 bg-linear-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                  <span>Multi-Test AI MCQ Generator</span>
                </button>

                <button
                  onClick={() => handleTabChange('bank')}
                  className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/20 backdrop-blur-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  <HelpCircle className="w-4 h-4 text-blue-200" />
                  <span>Master Question Bank</span>
                </button>
              </div>
            </div>
          </div>

          {/* RECENT TESTS & QUICK ACTIONS ROW */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Recent Mock Tests List (2 cols) */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">Active Mock Tests</h3>
                  <p className="text-xs text-slate-500">Live tests available for students</p>
                </div>
                <button 
                  onClick={() => handleTabChange('tests')}
                  className="px-3.5 py-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 rounded-xl hover:bg-blue-100 transition-colors"
                >
                  View All ({tests.length})
                </button>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {tests.slice(0, 4).map((test) => (
                  <div key={test.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 first:pt-0 last:pb-0">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                          {test.category}
                        </span>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">{test.title}</h4>
                      </div>
                      <div className="text-xs text-slate-400 mt-1 flex items-center gap-3">
                        <span>Code: <b>{test.test_code}</b></span>
                        <span>•</span>
                        <span>{test.total_questions || 0} Questions</span>
                        <span>•</span>
                        <span>{test.duration_minutes} Mins</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopyLink(test.slug)}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5"
                        title="Copy Public Test Link"
                      >
                        <ShareIcon className="w-3.5 h-3.5" />
                        <span>Share</span>
                      </button>

                      <button
                        onClick={() => handleOpenQuestionsForTest(test.id)}
                        className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-xs font-bold hover:bg-blue-100 transition-colors"
                      >
                        Questions
                      </button>
                    </div>
                  </div>
                ))}

                {tests.length === 0 && (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    No mock tests created yet. Click "Mock Tests" tab to create your first test.
                  </div>
                )}
              </div>
            </div>

            {/* QUICK ACTIONS & SYSTEM STATUS (1 col) */}
            <div className="space-y-6">
              
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl p-6 shadow-md space-y-4">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-200">
                    GradeUp Engine
                  </span>
                  <h3 className="text-lg font-black mt-0.5">Quick Actions</h3>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => handleTabChange('tests')}
                    className="w-full p-3 bg-white/10 hover:bg-white/20 rounded-xl text-left text-xs font-bold transition-all flex items-center justify-between backdrop-blur-xs"
                  >
                    <span>+ Create New Mock Test</span>
                    <ArrowUpRight className="w-4 h-4 text-blue-200" />
                  </button>

                  <button
                    onClick={() => handleTabChange('bank')}
                    className="w-full p-3 bg-white/10 hover:bg-white/20 rounded-xl text-left text-xs font-bold transition-all flex items-center justify-between backdrop-blur-xs"
                  >
                    <span>✦ Question Bank & 360° AI QA</span>
                    <ArrowUpRight className="w-4 h-4 text-blue-200" />
                  </button>

                  <button
                    onClick={() => handleTabChange('attempts')}
                    className="w-full p-3 bg-white/10 hover:bg-white/20 rounded-xl text-left text-xs font-bold transition-all flex items-center justify-between backdrop-blur-xs"
                  >
                    <span>📊 View Recent Attempts & Leads</span>
                    <ArrowUpRight className="w-4 h-4 text-blue-200" />
                  </button>
                </div>
              </div>

              {/* QUICK LINKS */}
              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Admin Navigation
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                  <button
                    onClick={() => handleTabChange('social')}
                    className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-indigo-100 dark:border-slate-700 hover:border-blue-400 transition-colors text-left text-slate-800 dark:text-slate-200"
                  >
                    Social Follow Gate
                  </button>
                  <button
                    onClick={() => handleTabChange('analytics')}
                    className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-indigo-100 dark:border-slate-700 hover:border-blue-400 transition-colors text-left text-slate-800 dark:text-slate-200"
                  >
                    Detailed Analytics
                  </button>
                  <button
                    onClick={() => handleTabChange('attempts')}
                    className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-indigo-100 dark:border-slate-700 hover:border-blue-400 transition-colors text-left text-slate-800 dark:text-slate-200"
                  >
                    Export CSV Data
                  </button>
                  <button
                    onClick={() => handleTabChange('settings')}
                    className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-indigo-100 dark:border-slate-700 hover:border-blue-400 transition-colors text-left text-slate-800 dark:text-slate-200"
                  >
                    Platform Settings
                  </button>
                </div>
              </div>

            </div>

          </div>

        </div>
      )}

      {activeTab === 'ai_automation' && (
        <AIAutomationCenter
          onToast={safeToast}
          onNavigateToTests={() => handleTabChange('tests')}
        />
      )}

      {activeTab === 'tests' && (
        <TestManager
          onSelectTestQuestions={handleOpenQuestionsForTest}
          onViewTestResults={handleOpenAttemptsForTest}
          onPreviewTest={(slug) => {
            window.open(`/test/${slug}`, '_blank');
          }}
          onToast={safeToast}
        />
      )}

      {activeTab === 'bank' && (
        <QuestionBankView
          onNavigateToTest={(testId) => handleOpenQuestionsForTest(testId)}
          onToast={safeToast}
        />
      )}

      {activeTab === 'questions' && (
        <QuestionManager
          testId={selectedTestIdForQuestions || (tests[0]?.id || '')}
          onBackToTests={() => handleTabChange('tests')}
          onOpenBulkImport={handleOpenBulkImport}
          onToast={safeToast}
        />
      )}

      {activeTab === 'attempts' && (
        <AttemptsList initialTestId={selectedTestIdForAttempts} onToast={safeToast} />
      )}

      {activeTab === 'analytics' && (
        <TestAnalytics />
      )}

      {activeTab === 'reports' && (
        <ReportedMCQsManager
          onToast={safeToast}
          onNavigateToQuestion={(testId) => handleOpenQuestionsForTest(testId)}
        />
      )}

      {activeTab === 'social' && (
        <SocialGateManager onToast={safeToast} />
      )}

      {activeTab === 'settings' && (
        <AdminSettingsView onToast={safeToast} />
      )}

      {/* BULK IMPORT MODAL */}
      <BulkImportModal
        isOpen={isBulkImportOpen}
        testId={bulkImportTestId}
        onClose={() => setIsBulkImportOpen(false)}
        onSuccessImport={() => {
          setIsBulkImportOpen(false);
          loadDashboardData();
        }}
        onToast={safeToast}
      />

      {/* BULK AI TEST GENERATOR MODAL */}
      {isBulkAIGeneratorOpen && (
        <BulkAITestGeneratorModal
          isOpen={isBulkAIGeneratorOpen}
          onClose={() => setIsBulkAIGeneratorOpen(false)}
          selectedTests={tests.slice(0, 3)}
          allTests={tests}
          onSelectTestQuestions={(testId) => handleOpenQuestionsForTest(testId)}
          onToast={safeToast}
          onSuccess={() => {
            loadDashboardData();
          }}
        />
      )}

    </div>
  );
};
