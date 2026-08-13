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
  ArrowUpRight 
} from 'lucide-react';
import { Test, Attempt } from '../../types';
import { dataService } from '../../services/dataService';
import { TestManager } from './TestManager';
import { QuestionManager } from './QuestionManager';
import { AttemptsList } from './AttemptsList';
import { TestAnalytics } from './TestAnalytics';
import { SocialGateManager } from './SocialGateManager';
import { AdminSettingsView } from './AdminSettingsView';
import { BulkImportModal } from './BulkImportModal';

type AdminTab = 'dashboard' | 'tests' | 'questions' | 'attempts' | 'analytics' | 'social' | 'settings';

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

  // Stats
  const [tests, setTests] = useState<Test[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    const fetchedTests = await dataService.getTests(true);
    const fetchedAttempts = await dataService.getAttempts();
    setTests(fetchedTests);
    setAttempts(fetchedAttempts);
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
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'dashboard'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => handleTabChange('tests')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'tests'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Mock Tests</span>
          </button>

          <button
            onClick={() => handleTabChange('questions')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'questions'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>Question Bank</span>
          </button>

          <button
            onClick={() => handleTabChange('attempts')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
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
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'analytics'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            <span>Analytics</span>
          </button>

          <button
            onClick={() => handleTabChange('social')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
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
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
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
              className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              title="Database Settings"
            >
              <Database className="w-4 h-4" />
            </button>
          )}

          {onLogout && (
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          )}
        </div>
      </div>

      {/* RENDER VIEW ACCORDING TO ACTIVE TAB */}
      {activeTab === 'dashboard' && (
        <div className="space-y-8">
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-6 sm:p-8 rounded-2xl text-white shadow-xl">
            <div>
              <span className="px-3 py-1 bg-blue-500/20 text-blue-300 text-xs font-semibold rounded-full border border-blue-400/30 uppercase tracking-wider">
                Gradeup Study Admin
              </span>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-2">
                Exam Control & Analytics
              </h1>
              <p className="text-sm text-slate-300 mt-1 max-w-xl">
                Create unlimited mock tests, generate custom test share links, manage question banks, and track student results in real-time.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleTabChange('tests')}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-lg transition-all"
              >
                <Plus className="w-5 h-5" />
                <span>Create New Mock Test</span>
              </button>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
                <FileText className="w-5 h-5" />
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{tests.length}</p>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Total Mock Tests</p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{publishedTestsCount}</p>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Published Live</p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
                <Users className="w-5 h-5" />
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{totalStudentsCount}</p>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Total Students</p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3">
                <Clock className="w-5 h-5" />
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{totalAttemptsCount}</p>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Total Test Attempts</p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-3">
                <TrendingUp className="w-5 h-5" />
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{avgPercentage}%</p>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Avg Score Rate</p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-3">
                <Award className="w-5 h-5" />
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{highestScore}</p>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Highest Mark</p>
            </div>

          </div>

          {/* Tests Overview Table & Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Main Tests Table */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Active Mock Tests</h2>
                  <p className="text-xs text-slate-500">Manage questions, share links, and status</p>
                </div>
                <button
                  onClick={() => handleTabChange('tests')}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1"
                >
                  View All Tests <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold uppercase text-slate-400">
                      <th className="py-3 px-3">Test Title</th>
                      <th className="py-3 px-3">Questions</th>
                      <th className="py-3 px-3">Duration</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {tests.slice(0, 5).map((test) => (
                      <tr key={test.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-3">
                          <p className="font-bold text-slate-900 dark:text-white line-clamp-1">{test.title}</p>
                          <span className="text-[11px] text-slate-400">Code: {test.test_code}</span>
                        </td>
                        <td className="py-3.5 px-3 font-semibold text-slate-700 dark:text-slate-300">
                          {test.total_questions} Qs
                        </td>
                        <td className="py-3.5 px-3 text-slate-600 dark:text-slate-400">
                          {test.duration_minutes} mins
                        </td>
                        <td className="py-3.5 px-3">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            test.is_published
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}>
                            {test.is_published ? 'Published' : 'Draft'}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-right space-x-1">
                          <button
                            onClick={() => handleOpenAttemptsForTest(test.id)}
                            className="px-2 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-semibold transition-colors"
                            title="View Student Results for this Mock Test"
                          >
                            Results
                          </button>
                          <button
                            onClick={() => handleOpenQuestionsForTest(test.id)}
                            className="px-2 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 text-xs font-semibold transition-colors"
                            title="Manage Questions"
                          >
                            Questions
                          </button>
                          <button
                            onClick={() => handleCopyLink(test.slug)}
                            className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 text-xs font-semibold transition-colors"
                            title="Copy Share Link"
                          >
                            <ShareIcon className="w-3.5 h-3.5 inline" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Side Panel: Recent Student Attempts & Quick Tools */}
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">Recent Attempts</h3>
                  <button
                    onClick={() => handleTabChange('attempts')}
                    className="text-xs font-semibold text-blue-600 hover:underline"
                  >
                    View All
                  </button>
                </div>

                <div className="space-y-3">
                  {attempts.slice(0, 5).map((att) => (
                    <div key={att.id} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-sm text-slate-900 dark:text-white">{att.student_name}</p>
                        <p className="text-xs text-slate-500">{att.student_district}, {att.student_state}</p>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-sm text-emerald-600 dark:text-emerald-400">
                          {att.score} pts
                        </span>
                        <p className="text-[10px] text-slate-400">{att.percentage}% Score</p>
                      </div>
                    </div>
                  ))}
                  {attempts.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-4">No student attempts recorded yet.</p>
                  )}
                </div>
              </div>

              {/* Quick Shortcuts */}
              <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-slate-800 dark:to-slate-900 p-6 rounded-2xl border border-indigo-100 dark:border-slate-800">
                <h3 className="font-bold text-slate-900 dark:text-white mb-3 text-sm">Quick Admin Shortcuts</h3>
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

    </div>
  );
};
