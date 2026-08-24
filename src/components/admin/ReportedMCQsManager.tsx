import React, { useState, useEffect } from 'react';
import { 
  Flag, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Search, 
  Filter, 
  Trash2, 
  Check, 
  Sparkles, 
  RefreshCw, 
  Download, 
  Eye, 
  Edit3, 
  MessageSquare, 
  Calendar, 
  Phone, 
  User, 
  BookOpen, 
  HelpCircle,
  Clock,
  ShieldAlert,
  ChevronDown,
  Layers,
  FileSpreadsheet
} from 'lucide-react';
import { QuestionReport, ReportStatus, ReportIssueType, Question, Test } from '../../types';
import { dataService } from '../../services/dataService';
import { Modal } from '../common/Modal';
import { MCQInspectionModal } from './MCQInspectionModal';

interface ReportedMCQsManagerProps {
  onToast?: (type: 'success' | 'error' | 'info', msg: string) => void;
  onNavigateToQuestion?: (testId: string, questionId?: string) => void;
}

const ISSUE_LABELS: Record<ReportIssueType, { label: string; hindi: string; icon: string; color: string }> = {
  wrong_answer_key: {
    label: 'Wrong Answer Key',
    hindi: 'गलत उत्तर कुंजी',
    icon: '🎯',
    color: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800'
  },
  question_error: {
    label: 'Incomplete / Question Error',
    hindi: 'प्रश्न अधूरा / गलत',
    icon: '⚠️',
    color: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800'
  },
  typo_grammar: {
    label: 'Typo / Translation',
    hindi: 'वर्तनी या अनुवाद त्रुटि',
    icon: '📝',
    color: 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950/80 dark:text-indigo-300 dark:border-indigo-800'
  },
  ambiguous_options: {
    label: 'Ambiguous / Multiple Correct',
    hindi: 'विकल्प अस्पष्ट / एकाधिक',
    icon: '🔀',
    color: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/80 dark:text-purple-300 dark:border-purple-800'
  },
  out_of_syllabus: {
    label: 'Out of Syllabus',
    hindi: 'पाठ्यक्रम से बाहर',
    icon: '📚',
    color: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
  },
  other: {
    label: 'Other Problem',
    hindi: 'अन्य समस्या',
    icon: '💬',
    color: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
  }
};

const STATUS_BADGES: Record<ReportStatus, { label: string; color: string; icon: any }> = {
  pending: {
    label: 'Pending Review',
    color: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
    icon: Clock
  },
  reviewed: {
    label: 'Under Review',
    color: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30',
    icon: Eye
  },
  resolved: {
    label: 'Resolved / Fixed',
    color: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
    icon: CheckCircle2
  },
  dismissed: {
    label: 'Dismissed (Valid)',
    color: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30',
    icon: XCircle
  }
};

export const ReportedMCQsManager: React.FC<ReportedMCQsManagerProps> = ({
  onToast,
  onNavigateToQuestion
}) => {
  const [reports, setReports] = useState<QuestionReport[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'all'>('all');
  const [testFilter, setTestFilter] = useState<string>('all');
  const [issueFilter, setIssueFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Bulk Selection
  const [selectedReportIds, setSelectedReportIds] = useState<string[]>([]);

  // Modals & Action States
  const [inspectingQuestion, setInspectingQuestion] = useState<Question | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<{ report: QuestionReport; question: Question } | null>(null);
  const [resolvingReport, setResolvingReport] = useState<QuestionReport | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');

  useEffect(() => {
    loadData();

    const handleUpdated = () => {
      loadData();
    };

    window.addEventListener('gradeup_reports_updated', handleUpdated);
    return () => {
      window.removeEventListener('gradeup_reports_updated', handleUpdated);
    };
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [fetchedReports, fetchedTests] = await Promise.all([
      dataService.getQuestionReports(),
      dataService.getTests(true)
    ]);
    setReports(fetchedReports);
    setTests(fetchedTests);
    setLoading(false);
  };

  // Filter calculations
  const filteredReports = reports.filter((r) => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (testFilter !== 'all' && r.test_id !== testFilter) return false;
    if (issueFilter !== 'all' && r.issue_type !== issueFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchText = (r.question_text || '').toLowerCase();
      const matchComment = (r.student_comment || '').toLowerCase();
      const matchStudent = (r.student_name || '').toLowerCase();
      const matchMobile = (r.student_mobile || '').toLowerCase();
      const matchTest = (r.test_title || '').toLowerCase();
      if (
        !matchText.includes(q) &&
        !matchComment.includes(q) &&
        !matchStudent.includes(q) &&
        !matchMobile.includes(q) &&
        !matchTest.includes(q)
      ) {
        return false;
      }
    }
    return true;
  });

  // Metrics
  const totalCount = reports.length;
  const pendingCount = reports.filter((r) => r.status === 'pending').length;
  const underReviewCount = reports.filter((r) => r.status === 'reviewed').length;
  const resolvedCount = reports.filter((r) => r.status === 'resolved').length;
  const answerKeyIssuesCount = reports.filter((r) => r.issue_type === 'wrong_answer_key').length;

  // Actions
  const handleUpdateStatus = async (reportId: string, newStatus: ReportStatus, note?: string) => {
    try {
      await dataService.updateQuestionReportStatus(reportId, newStatus, note);
      setReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, status: newStatus, admin_notes: note ?? r.admin_notes } : r))
      );
      onToast?.('success', `Report marked as ${newStatus}`);
    } catch (err: any) {
      onToast?.('error', err?.message || 'Failed to update report status');
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!window.confirm('Are you sure you want to delete this question report?')) return;
    try {
      await dataService.deleteQuestionReport(reportId);
      setReports((prev) => prev.filter((r) => r.id !== reportId));
      setSelectedReportIds((prev) => prev.filter((id) => id !== reportId));
      onToast?.('success', 'Question report deleted');
    } catch (err: any) {
      onToast?.('error', err?.message || 'Failed to delete report');
    }
  };

  const handleBulkStatus = async (newStatus: ReportStatus) => {
    if (selectedReportIds.length === 0) return;
    try {
      await dataService.bulkUpdateQuestionReports(selectedReportIds, newStatus);
      setReports((prev) =>
        prev.map((r) => (selectedReportIds.includes(r.id) ? { ...r, status: newStatus } : r))
      );
      setSelectedReportIds([]);
      onToast?.('success', `Marked ${selectedReportIds.length} reports as ${newStatus}`);
    } catch (err: any) {
      onToast?.('error', err?.message || 'Failed bulk update');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedReportIds.length === 0) return;
    if (!window.confirm(`Delete ${selectedReportIds.length} selected reports?`)) return;
    try {
      await dataService.deleteQuestionReportsBulk(selectedReportIds);
      setReports((prev) => prev.filter((r) => !selectedReportIds.includes(r.id)));
      setSelectedReportIds([]);
      onToast?.('success', 'Selected reports deleted');
    } catch (err: any) {
      onToast?.('error', err?.message || 'Failed bulk deletion');
    }
  };

  const handleToggleSelectAll = () => {
    if (selectedReportIds.length === filteredReports.length) {
      setSelectedReportIds([]);
    } else {
      setSelectedReportIds(filteredReports.map((r) => r.id));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedReportIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Convert report to a temporary Question object for inspection/edit
  const getQuestionObjectFromReport = (report: QuestionReport): Question => {
    return {
      id: report.question_id,
      test_id: report.test_id,
      question_number: report.question_number || 1,
      question_text: report.question_text || '',
      option_a: report.option_a || '',
      option_b: report.option_b || '',
      option_c: report.option_c || '',
      option_d: report.option_d || '',
      correct_answer: report.correct_answer || 'A',
      explanation: report.explanation || '',
      marks: 1,
      negative_marks: 0,
      subject: 'General',
      chapter: 'General',
      created_at: report.created_at
    };
  };

  const handleStartInspection = (report: QuestionReport) => {
    const qObj = getQuestionObjectFromReport(report);
    setInspectingQuestion(qObj);
  };

  const handleOpenEditQuestion = async (report: QuestionReport) => {
    // Fetch latest question from database to ensure fresh state
    const allQuestions = await dataService.getQuestions(report.test_id, true);
    const existing = allQuestions.find((q) => q.id === report.question_id);
    const qToEdit = existing || getQuestionObjectFromReport(report);
    setEditingQuestion({ report, question: qToEdit });
  };

  const handleSaveEditedQuestion = async (updated: Question) => {
    if (!editingQuestion) return;
    try {
      await dataService.updateQuestion(updated);
      // Auto-resolve report
      await dataService.updateQuestionReportStatus(
        editingQuestion.report.id,
        'resolved',
        `Question updated by Admin (Correct answer: ${updated.correct_answer})`
      );

      // Update local report data
      setReports((prev) =>
        prev.map((r) =>
          r.id === editingQuestion.report.id
            ? {
                ...r,
                question_text: updated.question_text,
                option_a: updated.option_a,
                option_b: updated.option_b,
                option_c: updated.option_c,
                option_d: updated.option_d,
                correct_answer: updated.correct_answer,
                explanation: updated.explanation,
                status: 'resolved',
                admin_notes: `Question updated by Admin (Correct answer: ${updated.correct_answer})`
              }
            : r
        )
      );

      setEditingQuestion(null);
      onToast?.('success', 'Question updated and report resolved successfully!');
    } catch (err: any) {
      onToast?.('error', err?.message || 'Failed to update question');
    }
  };

  const handleExportCSV = () => {
    if (filteredReports.length === 0) {
      onToast?.('info', 'No reports to export');
      return;
    }

    const headers = [
      'Report ID',
      'Test Title',
      'Question #',
      'Issue Category',
      'Student Name',
      'Student Mobile',
      'Student Comment',
      'Correct Answer',
      'Status',
      'Admin Notes',
      'Reported Date'
    ];

    const rows = filteredReports.map((r) => [
      `"${r.id}"`,
      `"${(r.test_title || '').replace(/"/g, '""')}"`,
      r.question_number || 1,
      `"${r.issue_type}"`,
      `"${(r.student_name || '').replace(/"/g, '""')}"`,
      `"${r.student_mobile || ''}"`,
      `"${(r.student_comment || '').replace(/"/g, '""')}"`,
      `"${r.correct_answer || ''}"`,
      `"${r.status}"`,
      `"${(r.admin_notes || '').replace(/"/g, '""')}"`,
      `"${new Date(r.created_at).toLocaleString()}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Gradeup_Reported_MCQs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onToast?.('success', 'CSV export downloaded!');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-200 dark:border-rose-800">
            <Flag className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                Reported MCQs & Issue Tracker
              </h2>
              {pendingCount > 0 && (
                <span className="px-2.5 py-0.5 bg-rose-600 text-white font-black text-xs rounded-full animate-pulse">
                  {pendingCount} New
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Review and resolve errors, typos, or wrong answer keys reported by students during mock tests.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-blue-50 dark:bg-blue-950/80 hover:bg-blue-100 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* METRICS ROW */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Reports</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{totalCount}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">All student submissions</p>
        </div>

        <div className="p-4 bg-amber-50/50 dark:bg-amber-950/20 rounded-2xl border border-amber-200 dark:border-amber-900/60 shadow-xs">
          <p className="text-xs font-black text-amber-700 dark:text-amber-400 uppercase tracking-wider">Pending Action</p>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-300 mt-1">{pendingCount}</p>
          <p className="text-[11px] text-amber-600/80 mt-0.5">Requires academic verification</p>
        </div>

        <div className="p-4 bg-rose-50/50 dark:bg-rose-950/20 rounded-2xl border border-rose-200 dark:border-rose-900/60 shadow-xs">
          <p className="text-xs font-black text-rose-700 dark:text-rose-400 uppercase tracking-wider">Answer Key Issues</p>
          <p className="text-2xl font-black text-rose-600 dark:text-rose-300 mt-1">{answerKeyIssuesCount}</p>
          <p className="text-[11px] text-rose-600/80 mt-0.5">Disputed answer keys</p>
        </div>

        <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 shadow-xs">
          <p className="text-xs font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Resolved</p>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-300 mt-1">{resolvedCount}</p>
          <p className="text-[11px] text-emerald-600/80 mt-0.5">Corrected or verified</p>
        </div>
      </div>

      {/* FILTER CONTROLS */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {[
            { key: 'all', label: 'All Reports', count: totalCount },
            { key: 'pending', label: 'Pending', count: pendingCount },
            { key: 'reviewed', label: 'Under Review', count: underReviewCount },
            { key: 'resolved', label: 'Resolved', count: resolvedCount },
            { key: 'dismissed', label: 'Dismissed', count: reports.filter((r) => r.status === 'dismissed').length }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                statusFilter === tab.key
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                statusFilter === tab.key
                  ? 'bg-white/20 dark:bg-slate-900/20'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Dropdowns and Search */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by student, question, or comment..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={testFilter}
            onChange={(e) => setTestFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Mock Tests</option>
            {tests.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>

          <select
            value={issueFilter}
            onChange={(e) => setIssueFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Issue Categories</option>
            {Object.entries(ISSUE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.icon} {v.label} ({v.hindi})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* BULK ACTION BAR */}
      {selectedReportIds.length > 0 && (
        <div className="p-3 bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800 rounded-2xl flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-blue-900 dark:text-blue-200">
              {selectedReportIds.length} reports selected
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleBulkStatus('resolved')}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Mark Resolved</span>
            </button>

            <button
              onClick={() => handleBulkStatus('dismissed')}
              className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Dismiss</span>
            </button>

            <button
              onClick={handleBulkDelete}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>

            <button
              onClick={() => setSelectedReportIds([])}
              className="px-2.5 py-1.5 text-slate-500 hover:underline font-bold"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* REPORTS LIST */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 flex flex-col items-center gap-2">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
          <p className="text-xs font-bold">Loading reports from database...</p>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center space-y-3">
          <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
          </div>
          <h3 className="text-base font-black text-slate-800 dark:text-white">
            No MCQ reports found
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {reports.length === 0
              ? 'Great! There are no question reports submitted by students yet.'
              : 'No reports match your selected filters. Try changing or clearing filters.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1 text-xs text-slate-500 font-bold">
            <button
              onClick={handleToggleSelectAll}
              className="flex items-center gap-1.5 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selectedReportIds.length === filteredReports.length && filteredReports.length > 0}
                onChange={handleToggleSelectAll}
                className="rounded border-slate-300 text-blue-600 cursor-pointer"
              />
              <span>Select All ({filteredReports.length})</span>
            </button>
            <span>Showing {filteredReports.length} reports</span>
          </div>

          {filteredReports.map((report) => {
            const issueInfo = ISSUE_LABELS[report.issue_type] || ISSUE_LABELS.other;
            const statusInfo = STATUS_BADGES[report.status] || STATUS_BADGES.pending;
            const StatusIcon = statusInfo.icon;
            const isSelected = selectedReportIds.includes(report.id);

            return (
              <div
                key={report.id}
                className={`bg-white dark:bg-slate-900 rounded-3xl border transition-all p-5 sm:p-6 shadow-xs space-y-4 ${
                  isSelected
                    ? 'border-blue-500 ring-2 ring-blue-400/20'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {/* CARD HEADER */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSelectOne(report.id)}
                      className="rounded border-slate-300 text-blue-600 cursor-pointer"
                    />

                    {/* Issue Badge */}
                    <span className={`px-2.5 py-1 rounded-xl text-xs font-black border flex items-center gap-1.5 ${issueInfo.color}`}>
                      <span>{issueInfo.icon}</span>
                      <span>{issueInfo.label}</span>
                    </span>

                    {/* Status Badge */}
                    <span className={`px-2.5 py-1 rounded-xl text-xs font-black border flex items-center gap-1.5 ${statusInfo.color}`}>
                      <StatusIcon className="w-3.5 h-3.5" />
                      <span>{statusInfo.label}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{new Date(report.created_at).toLocaleString()}</span>
                  </div>
                </div>

                {/* TEST TITLE & STUDENT INFO ROW */}
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-blue-600" />
                    <span className="font-black text-slate-900 dark:text-white">
                      {report.test_title}
                    </span>
                    <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 rounded-md font-black text-[11px]">
                      Q#{report.question_number || 1}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300 font-medium">
                    <span className="flex items-center gap-1 font-bold text-slate-800 dark:text-slate-200">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      {report.student_name || 'Aspirant'}
                    </span>
                    {report.student_mobile && (
                      <span className="flex items-center gap-1 text-slate-500">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {report.student_mobile}
                      </span>
                    )}
                  </div>
                </div>

                {/* STUDENT'S COMMENT BLOCKQUOTE */}
                <div className="p-3.5 bg-rose-50/60 dark:bg-rose-950/30 rounded-2xl border border-rose-200/80 dark:border-rose-900/40 text-xs space-y-1">
                  <p className="font-black text-rose-900 dark:text-rose-200 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-rose-600" /> Aspirant's Feedback / रिपोर्ट का विवरण
                  </p>
                  <p className="text-slate-800 dark:text-slate-200 font-semibold leading-relaxed whitespace-pre-line text-xs sm:text-sm">
                    "{report.student_comment}"
                  </p>
                </div>

                {/* QUESTION PREVIEW */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-3">
                  <p className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm leading-relaxed">
                    {report.question_text || 'Question statement not available'}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-semibold">
                    {[
                      { key: 'A', text: report.option_a },
                      { key: 'B', text: report.option_b },
                      { key: 'C', text: report.option_c },
                      { key: 'D', text: report.option_d }
                    ].map(({ key, text }) => {
                      if (!text) return null;
                      const isCorrect = (report.correct_answer || '').toUpperCase() === key;
                      return (
                        <div
                          key={key}
                          className={`p-2.5 rounded-xl border flex items-center justify-between ${
                            isCorrect
                              ? 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-500 text-emerald-900 dark:text-emerald-200 font-bold ring-1 ring-emerald-500/40'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <span className="truncate pr-2">
                            <b>{key}.</b> {text}
                          </span>
                          {isCorrect && (
                            <span className="px-1.5 py-0.5 bg-emerald-600 text-white rounded text-[10px] font-black shrink-0">
                              Marked Key
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {report.explanation && (
                    <div className="p-3 bg-blue-50/50 dark:bg-blue-950/30 rounded-xl border border-blue-100 dark:border-blue-900/40 text-xs">
                      <p className="font-black text-blue-900 dark:text-blue-200 text-[10px] uppercase">
                        Current Explanation:
                      </p>
                      <p className="text-slate-700 dark:text-slate-300 mt-0.5 leading-relaxed">
                        {report.explanation}
                      </p>
                    </div>
                  )}
                </div>

                {/* ADMIN RESOLUTION NOTE (IF ANY) */}
                {report.admin_notes && (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-900 text-xs flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-black text-emerald-900 dark:text-emerald-200">Admin Resolution Note:</p>
                      <p className="text-slate-700 dark:text-slate-300 mt-0.5">{report.admin_notes}</p>
                    </div>
                  </div>
                )}

                {/* ACTION TOOLBAR */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  {/* Left: AI & Edit tools */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleStartInspection(report)}
                      className="px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                      title="Run 360° AI Fact Check & Verification on this question"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>360° AI Fact Check</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenEditQuestion(report)}
                      className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Question</span>
                    </button>
                  </div>

                  {/* Right: Status actions */}
                  <div className="flex items-center gap-2">
                    {report.status !== 'resolved' && (
                      <button
                        type="button"
                        onClick={() => {
                          setResolvingReport(report);
                          setResolutionNote('');
                        }}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Mark Resolved</span>
                      </button>
                    )}

                    {report.status === 'pending' && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(report.id, 'reviewed')}
                        className="px-3 py-2 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-700 dark:text-blue-300 font-bold text-xs rounded-xl border border-blue-200 dark:border-blue-800 transition-colors cursor-pointer"
                      >
                        Mark Reviewed
                      </button>
                    )}

                    {report.status !== 'dismissed' && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(report.id, 'dismissed', 'Question confirmed accurate and valid.')}
                        className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-400 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                      >
                        Dismiss (Valid)
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDeleteReport(report.id)}
                      className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
                      title="Delete Report"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* RESOLUTION MODAL */}
      <Modal
        isOpen={Boolean(resolvingReport)}
        onClose={() => setResolvingReport(null)}
        title="Resolve Question Report"
        maxWidth="md"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Mark this question report as resolved. You can add an optional explanation or note for tracking.
          </p>

          <textarea
            rows={3}
            value={resolutionNote}
            onChange={(e) => setResolutionNote(e.target.value)}
            placeholder="e.g. Corrected Answer Key from Option A to Option C / Fixed typo in Hindi statement"
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setResolvingReport(null)}
              className="px-3.5 py-2 text-xs font-bold text-slate-500 hover:underline"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                if (resolvingReport) {
                  handleUpdateStatus(resolvingReport.id, 'resolved', resolutionNote.trim() || 'Verified and resolved.');
                  setResolvingReport(null);
                }
              }}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md transition-colors"
            >
              Confirm Resolution
            </button>
          </div>
        </div>
      </Modal>

      {/* 360° AI INSPECTION MODAL */}
      {inspectingQuestion && (
        <MCQInspectionModal
          isOpen={Boolean(inspectingQuestion)}
          question={inspectingQuestion}
          onClose={() => setInspectingQuestion(null)}
          onApplyImprovement={(improved) => {
            handleSaveEditedQuestion(improved);
            setInspectingQuestion(null);
          }}
          onToast={onToast}
        />
      )}

      {/* QUICK QUESTION EDIT MODAL */}
      {editingQuestion && (
        <QuickEditQuestionModal
          isOpen={Boolean(editingQuestion)}
          question={editingQuestion.question}
          onClose={() => setEditingQuestion(null)}
          onSave={handleSaveEditedQuestion}
        />
      )}
    </div>
  );
};

// Sub-component: Quick Edit Question Modal
const QuickEditQuestionModal: React.FC<{
  isOpen: boolean;
  question: Question;
  onClose: () => void;
  onSave: (q: Question) => void;
}> = ({ isOpen, question, onClose, onSave }) => {
  const [form, setForm] = useState<Question>({ ...question });

  useEffect(() => {
    setForm({ ...question });
  }, [question]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit Question #${question.question_number}`} maxWidth="2xl">
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div>
          <label className="block font-black text-slate-700 dark:text-slate-300 mb-1">
            Question Statement <span className="text-rose-500">*</span>
          </label>
          <textarea
            required
            rows={3}
            value={form.question_text}
            onChange={(e) => setForm({ ...form, question_text: e.target.value })}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-black text-slate-700 dark:text-slate-300 mb-1">Option A</label>
            <input
              type="text"
              required
              value={form.option_a}
              onChange={(e) => setForm({ ...form, option_a: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block font-black text-slate-700 dark:text-slate-300 mb-1">Option B</label>
            <input
              type="text"
              required
              value={form.option_b}
              onChange={(e) => setForm({ ...form, option_b: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block font-black text-slate-700 dark:text-slate-300 mb-1">Option C</label>
            <input
              type="text"
              required
              value={form.option_c}
              onChange={(e) => setForm({ ...form, option_c: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block font-black text-slate-700 dark:text-slate-300 mb-1">Option D</label>
            <input
              type="text"
              required
              value={form.option_d}
              onChange={(e) => setForm({ ...form, option_d: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block font-black text-slate-700 dark:text-slate-300 mb-1">
            Correct Answer Key <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-4 gap-2">
            {['A', 'B', 'C', 'D'].map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setForm({ ...form, correct_answer: key })}
                className={`py-2 rounded-xl font-black text-xs transition-all cursor-pointer border ${
                  (form.correct_answer || '').toUpperCase() === key
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                Option {key}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block font-black text-slate-700 dark:text-slate-300 mb-1">
            Explanation / Solution Notes
          </label>
          <textarea
            rows={3}
            value={form.explanation || ''}
            onChange={(e) => setForm({ ...form, explanation: e.target.value })}
            placeholder="Provide a detailed explanation supporting the correct answer..."
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 font-bold text-slate-500 hover:underline"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-md transition-all cursor-pointer"
          >
            Save & Resolve Report
          </button>
        </div>
      </form>
    </Modal>
  );
};
