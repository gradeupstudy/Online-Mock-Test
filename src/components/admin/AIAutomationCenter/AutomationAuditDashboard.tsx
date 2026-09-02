import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  Layers,
  Sparkles,
  ArrowRight,
  Filter,
  Search,
  Edit3,
  Trash2,
  Check,
  X,
  RefreshCw,
  Eye,
  Sliders,
  AlertCircle,
  Clock,
  UserCheck,
  PauseCircle,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Info
} from 'lucide-react';
import {
  AuditedMCQ,
  AuditReportSummary,
  AIAutomationConfig,
  AuditStatus,
  AdminAuditConfirmation
} from '../../../types/aiAutomation';

interface AutomationAuditDashboardProps {
  questions: AuditedMCQ[];
  config: AIAutomationConfig;
  auditSummary: AuditReportSummary;
  adminUser: { id: string; email: string };
  onUpdateQuestion: (updatedQ: AuditedMCQ) => void;
  onBatchApproveValid: () => void;
  onBatchExcludeInvalid: () => void;
  onConfirmAuditGate1: (confirmation: AdminAuditConfirmation) => void;
  onPauseSession: () => void;
  onRejectAudit: () => void;
  isGenerating: boolean;
}

export const AutomationAuditDashboard: React.FC<AutomationAuditDashboardProps> = ({
  questions,
  config,
  auditSummary,
  adminUser,
  onUpdateQuestion,
  onBatchApproveValid,
  onBatchExcludeInvalid,
  onConfirmAuditGate1,
  onPauseSession,
  onRejectAudit,
  isGenerating
}) => {
  const [activeTab, setActiveTab] = useState<'ALL' | AuditStatus | 'APPROVED' | 'EXCLUDED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('ALL');
  
  // Edit Question Modal State
  const [editingQuestion, setEditingQuestion] = useState<AuditedMCQ | null>(null);

  // Approval Gate 1 Confirmation Modal State
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');

  // Filter questions
  const filteredQuestions = useMemo(() => {
    return questions.filter(q => {
      // Tab filter
      if (activeTab === 'APPROVED') {
        if (!q.is_approved_by_admin || q.is_excluded) return false;
      } else if (activeTab === 'EXCLUDED') {
        if (!q.is_excluded) return false;
      } else if (activeTab !== 'ALL') {
        if (q.audit_status !== activeTab) return false;
      }

      // Subject filter
      if (selectedSubjectFilter !== 'ALL' && q.subject !== selectedSubjectFilter) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const textMatch = q.question_text.toLowerCase().includes(query);
        const optMatch = [q.option_a, q.option_b, q.option_c, q.option_d].some(o => o.toLowerCase().includes(query));
        const numMatch = String(q.original_number).includes(query);
        const reasonMatch = q.audit_reasons.some(r => r.toLowerCase().includes(query));
        if (!textMatch && !optMatch && !numMatch && !reasonMatch) return false;
      }

      return true;
    });
  }, [questions, activeTab, selectedSubjectFilter, searchQuery]);

  // Unique subjects for filter
  const uniqueSubjects = useMemo(() => {
    const set = new Set(questions.map(q => q.subject).filter(Boolean));
    return Array.from(set);
  }, [questions]);

  // Handle single question approval toggle
  const toggleApprove = (q: AuditedMCQ) => {
    onUpdateQuestion({
      ...q,
      is_approved_by_admin: !q.is_approved_by_admin,
      is_excluded: false,
      audit_status: !q.is_approved_by_admin ? 'VALID' : q.audit_status
    });
  };

  // Handle single question exclude toggle
  const toggleExclude = (q: AuditedMCQ) => {
    onUpdateQuestion({
      ...q,
      is_excluded: !q.is_excluded,
      is_approved_by_admin: q.is_excluded ? q.is_approved_by_admin : false
    });
  };

  // Save edited question
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestion) return;

    // Re-verify status on edit
    const hasAllOptions = !!editingQuestion.option_a && !!editingQuestion.option_b && !!editingQuestion.option_c && !!editingQuestion.option_d;
    const hasText = !!editingQuestion.question_text && editingQuestion.question_text.length >= 5;
    const hasValidAns = ['A', 'B', 'C', 'D'].includes(editingQuestion.correct_answer.toUpperCase());

    const isNowValid = hasAllOptions && hasText && hasValidAns;
    const updated: AuditedMCQ = {
      ...editingQuestion,
      correct_answer: editingQuestion.correct_answer.toUpperCase() as any,
      audit_status: isNowValid ? 'VALID' : editingQuestion.audit_status,
      audit_reasons: isNowValid ? ['Manually verified and updated by Admin'] : editingQuestion.audit_reasons,
      is_approved_by_admin: isNowValid ? true : editingQuestion.is_approved_by_admin,
      is_excluded: false,
      last_edited_at: new Date().toISOString()
    };

    onUpdateQuestion(updated);
    setEditingQuestion(null);
  };

  // Execute Gate 1 Confirmation
  const handleConfirmGate1 = () => {
    const confirmation: AdminAuditConfirmation = {
      id: `audit-conf-${Date.now()}`,
      confirmed_by_admin_id: adminUser.id,
      confirmed_by_email: adminUser.email,
      timestamp: new Date().toISOString(),
      audit_version: 'v1.0-360-AUDIT',
      audit_summary: auditSummary,
      config_snapshot: config,
      total_approved_questions: auditSummary.approved_for_generation,
      action: 'APPROVED_AND_STARTED_GENERATION',
      notes: adminNotes.trim() || undefined
    };

    setShowConfirmModal(false);
    onConfirmAuditGate1(confirmation);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      
      {/* 360° AUDIT SUMMARY METRICS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        
        {/* Total Extracted */}
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Extracted</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {auditSummary.total_extracted}
          </div>
          <span className="text-[11px] text-slate-500">From {config.fileName}</span>
        </div>

        {/* Valid Questions */}
        <div className="p-4 rounded-3xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Valid MCQs</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1">
            {auditSummary.valid_count}
          </div>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400">100% complete & sound</span>
        </div>

        {/* Needs Review */}
        <div className="p-4 rounded-3xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300">Needs Review</span>
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-700 dark:text-amber-300 mt-1">
            {auditSummary.needs_review_count}
          </div>
          <span className="text-[11px] text-amber-600 dark:text-amber-400">Minor formatting/conflicts</span>
        </div>

        {/* Invalid Questions */}
        <div className="p-4 rounded-3xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-800/60 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 dark:text-rose-300">Invalid</span>
            <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-700 dark:text-rose-300 mt-1">
            {auditSummary.invalid_count}
          </div>
          <span className="text-[11px] text-rose-600 dark:text-rose-400">Missing options/answer</span>
        </div>

        {/* Duplicates */}
        <div className="p-4 rounded-3xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800/60 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 dark:text-purple-300">Duplicates</span>
            <Copy className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="text-2xl font-black text-purple-700 dark:text-purple-300 mt-1">
            {auditSummary.duplicate_count + auditSummary.near_duplicate_count}
          </div>
          <span className="text-[11px] text-purple-600 dark:text-purple-400">
            {auditSummary.duplicate_count} exact, {auditSummary.near_duplicate_count} near
          </span>
        </div>

        {/* Approved for Generation */}
        <div className="p-4 rounded-3xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 dark:text-blue-300">Approved</span>
            <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-2xl font-black text-blue-700 dark:text-blue-300 mt-1">
            {auditSummary.approved_for_generation}
          </div>
          <span className="text-[11px] text-blue-600 dark:text-blue-400">
            Req: {auditSummary.required_for_generation} MCQs
          </span>
        </div>

      </div>

      {/* REQUIREMENT & SUFFICIENCY STATUS BANNER */}
      <div className={`p-5 rounded-3xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm ${
        auditSummary.is_sufficient
          ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100'
          : 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-100'
      }`}>
        <div className="flex items-start gap-3.5">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 ${
            auditSummary.is_sufficient
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
              : 'bg-amber-600 text-white shadow-md shadow-amber-500/20'
          }`}>
            {auditSummary.is_sufficient ? <CheckCircle2 className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
          </div>
          <div>
            <h4 className="text-sm font-black tracking-tight">
              {auditSummary.is_sufficient
                ? `Ready for Mock Test Series Generation (${auditSummary.approved_for_generation} Approved / ${auditSummary.required_for_generation} Required)`
                : `Shortfall of ${auditSummary.deficit} Approved Questions for ${config.numberOfMockTests} Mock Tests`}
            </h4>
            <p className="text-xs mt-0.5 opacity-90 leading-relaxed">
              {auditSummary.is_sufficient ? (
                <>You have sufficient valid approved questions to generate <strong>{config.numberOfMockTests} Mock Tests</strong> ({config.mcqsPerMockTest} unique MCQs each) with 0 duplicates.</>
              ) : (
                <>You need <strong>{auditSummary.required_for_generation}</strong> approved MCQs ({config.numberOfMockTests} tests × {config.mcqsPerMockTest} MCQs), but currently have <strong>{auditSummary.approved_for_generation}</strong> approved. Review questions below, edit invalid items to approve them, or reduce test count in configuration.</>
              )}
            </p>
          </div>
        </div>

        {/* QUICK BATCH ACTIONS */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onBatchApproveValid}
            className="px-3.5 py-2 text-xs font-black rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer shadow-xs transition-all flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Approve All Valid ({auditSummary.valid_count})</span>
          </button>
          <button
            type="button"
            onClick={onBatchExcludeInvalid}
            className="px-3.5 py-2 text-xs font-black rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer shadow-xs transition-all flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Exclude Invalid ({auditSummary.invalid_count + auditSummary.duplicate_count})</span>
          </button>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3">
        
        {/* TOP ROW: TABS & COUNTERS */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('ALL')}
            className={`px-3.5 py-2 rounded-xl cursor-pointer transition-all whitespace-nowrap ${
              activeTab === 'ALL'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            All Questions ({questions.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('APPROVED')}
            className={`px-3.5 py-2 rounded-xl cursor-pointer transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'APPROVED'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Approved ({auditSummary.approved_for_generation})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('VALID')}
            className={`px-3.5 py-2 rounded-xl cursor-pointer transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'VALID'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Valid ({auditSummary.valid_count})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('NEEDS_REVIEW')}
            className={`px-3.5 py-2 rounded-xl cursor-pointer transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'NEEDS_REVIEW'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Needs Review ({auditSummary.needs_review_count})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('INVALID')}
            className={`px-3.5 py-2 rounded-xl cursor-pointer transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'INVALID'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Invalid ({auditSummary.invalid_count})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('DUPLICATE')}
            className={`px-3.5 py-2 rounded-xl cursor-pointer transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'DUPLICATE'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100'
            }`}
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Duplicates ({auditSummary.duplicate_count})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('NEAR_DUPLICATE')}
            className={`px-3.5 py-2 rounded-xl cursor-pointer transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'NEAR_DUPLICATE'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Near Duplicates ({auditSummary.near_duplicate_count})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('EXCLUDED')}
            className={`px-3.5 py-2 rounded-xl cursor-pointer transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'EXCLUDED'
                ? 'bg-slate-700 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'
            }`}
          >
            <span>Excluded</span>
          </button>
        </div>

        {/* SEARCH & SUBJECT FILTER ROW */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
          <div className="sm:col-span-8 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search question text, options, question # or audit issue..."
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
            />
          </div>

          <div className="sm:col-span-4">
            <select
              value={selectedSubjectFilter}
              onChange={(e) => setSelectedSubjectFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-200"
            >
              <option value="ALL">All Subjects ({uniqueSubjects.length})</option>
              {uniqueSubjects.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

      </div>

      {/* QUESTION INSPECTOR LIST */}
      <div className="space-y-4">
        {filteredQuestions.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
            <Info className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">No questions found matching criteria</h4>
            <p className="text-xs text-slate-400 mt-1">Try switching tabs or clearing your search filter</p>
          </div>
        ) : (
          filteredQuestions.map((q, idx) => {
            const statusConfig = {
              VALID: {
                bg: 'bg-emerald-50 dark:bg-emerald-950/40',
                border: 'border-emerald-200 dark:border-emerald-800/80',
                badge: 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300',
                icon: CheckCircle2,
                label: 'VALID'
              },
              NEEDS_REVIEW: {
                bg: 'bg-amber-50/50 dark:bg-amber-950/20',
                border: 'border-amber-200 dark:border-amber-800/80',
                badge: 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300',
                icon: AlertTriangle,
                label: 'NEEDS REVIEW'
              },
              INVALID: {
                bg: 'bg-rose-50/50 dark:bg-rose-950/20',
                border: 'border-rose-200 dark:border-rose-800/80',
                badge: 'bg-rose-100 dark:bg-rose-900 text-rose-700 dark:text-rose-300',
                icon: XCircle,
                label: 'INVALID'
              },
              DUPLICATE: {
                bg: 'bg-purple-50/50 dark:bg-purple-950/20',
                border: 'border-purple-200 dark:border-purple-800/80',
                badge: 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300',
                icon: Copy,
                label: 'DUPLICATE'
              },
              NEAR_DUPLICATE: {
                bg: 'bg-indigo-50/50 dark:bg-indigo-950/20',
                border: 'border-indigo-200 dark:border-indigo-800/80',
                badge: 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300',
                icon: Layers,
                label: 'NEAR DUPLICATE'
              }
            }[q.audit_status];

            const StatusIcon = statusConfig.icon;

            return (
              <div
                key={q.id}
                className={`p-5 rounded-3xl border transition-all ${
                  q.is_excluded
                    ? 'opacity-60 bg-slate-100 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800'
                    : `${statusConfig.bg} ${statusConfig.border} shadow-xs`
                }`}
              >
                {/* CARD HEADER */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/60 dark:border-slate-800/60">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="px-2.5 py-1 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-mono text-xs font-black">
                      Q#{q.original_number}
                    </span>

                    <span className={`px-2.5 py-1 rounded-xl text-[11px] font-black flex items-center gap-1.5 ${statusConfig.badge}`}>
                      <StatusIcon className="w-3.5 h-3.5" />
                      <span>{statusConfig.label}</span>
                    </span>

                    <span className="text-xs font-bold text-slate-500">
                      Score: <strong>{q.audit_score}/100</strong>
                    </span>

                    <span className="text-xs font-bold text-slate-500">
                      Page {q.source_page}
                    </span>

                    {q.is_approved_by_admin && !q.is_excluded && (
                      <span className="px-2 py-0.5 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-[10px] font-black uppercase tracking-wider">
                        Approved for Generation
                      </span>
                    )}

                    {q.is_excluded && (
                      <span className="px-2 py-0.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-black uppercase tracking-wider">
                        Excluded from Tests
                      </span>
                    )}
                  </div>

                  {/* ACTION BUTTONS */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setEditingQuestion(q)}
                      className="p-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 cursor-pointer shadow-xs transition-all text-xs font-bold flex items-center gap-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleApprove(q)}
                      className={`px-3 py-2 rounded-xl text-xs font-black cursor-pointer shadow-xs transition-all flex items-center gap-1.5 ${
                        q.is_approved_by_admin && !q.is_excluded
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                          : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{q.is_approved_by_admin && !q.is_excluded ? 'Approved' : 'Approve'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleExclude(q)}
                      className={`px-3 py-2 rounded-xl text-xs font-black cursor-pointer shadow-xs transition-all flex items-center gap-1.5 ${
                        q.is_excluded
                          ? 'bg-rose-600 text-white hover:bg-rose-700'
                          : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-rose-50'
                      }`}
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>{q.is_excluded ? 'Excluded' : 'Exclude'}</span>
                    </button>
                  </div>
                </div>

                {/* AUDIT REASONS / FLAGS */}
                {q.audit_reasons && q.audit_reasons.length > 0 && (
                  <div className="pt-3 pb-1 space-y-1">
                    {q.audit_reasons.map((r, rIdx) => (
                      <div key={rIdx} className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span>{r}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* QUESTION BODY */}
                <div className="pt-3 space-y-3">
                  <p className="text-sm font-black text-slate-900 dark:text-white leading-relaxed">
                    {q.question_text}
                  </p>

                  {q.question_hi && q.question_hi !== q.question_text && (
                    <p className="text-xs font-bold text-slate-600 dark:text-slate-300 italic">
                      {q.question_hi}
                    </p>
                  )}

                  {/* 4 OPTIONS GRID */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {[
                      { key: 'A', text: q.option_a },
                      { key: 'B', text: q.option_b },
                      { key: 'C', text: q.option_c },
                      { key: 'D', text: q.option_d },
                    ].map(opt => {
                      const isCorrect = q.correct_answer === opt.key;
                      return (
                        <div
                          key={opt.key}
                          className={`p-2.5 rounded-2xl border text-xs flex items-center gap-2.5 transition-all ${
                            isCorrect
                              ? 'bg-emerald-100/90 dark:bg-emerald-950/60 border-emerald-400 dark:border-emerald-700 font-black text-emerald-900 dark:text-emerald-100'
                              : 'bg-white/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <span className={`w-6 h-6 rounded-xl flex items-center justify-center font-mono text-xs font-black shrink-0 ${
                            isCorrect
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                          }`}>
                            {opt.key}
                          </span>
                          <span className="break-all flex-1">{opt.text || <span className="text-rose-500 italic">Missing option</span>}</span>
                          {isCorrect && (
                            <span className="text-[10px] uppercase font-black tracking-wider text-emerald-600 dark:text-emerald-400 shrink-0">
                              Correct Key
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* EXPLANATION */}
                  {q.explanation && (
                    <div className="p-3 rounded-2xl bg-white/70 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-400">
                      <strong>Explanation:</strong> {q.explanation}
                    </div>
                  )}
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* ========================================================================= */}
      {/* CRITICAL HUMAN APPROVAL GATE 1: CONFIRM AUDIT & START GENERATION */}
      {/* ========================================================================= */}
      <div className="p-6 rounded-3xl bg-linear-to-r from-blue-700 via-indigo-700 to-purple-700 text-white shadow-2xl space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-black uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-emerald-300" />
              <span>Mandatory Human Approval Gate 1</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black tracking-tight">
              Audit Complete: Confirm & Authorize Mock Test Generation
            </h3>
            <p className="text-xs sm:text-sm text-blue-100 max-w-2xl">
              AI will strictly use the <strong>{auditSummary.approved_for_generation} Approved MCQs</strong> to generate <strong>{config.numberOfMockTests} Mock Tests</strong> ({config.mcqsPerMockTest} questions each) under "{config.mockTestNamePrefix}".
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onPauseSession}
              className="px-4 py-3 bg-white/15 hover:bg-white/25 text-white rounded-2xl text-xs font-bold backdrop-blur-md border border-white/20 cursor-pointer transition-all flex items-center gap-2"
            >
              <PauseCircle className="w-4 h-4" />
              <span>Pause / Save State</span>
            </button>

            <button
              type="button"
              disabled={isGenerating}
              onClick={() => setShowConfirmModal(true)}
              className={`py-3.5 px-6 rounded-2xl font-black text-sm transition-all flex items-center gap-3 shadow-xl cursor-pointer ${
                isGenerating
                  ? 'bg-slate-400 text-slate-200 cursor-not-allowed'
                  : 'bg-white text-blue-900 hover:bg-blue-50 shadow-white/20 hover:scale-[1.02]'
              }`}
            >
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>CONFIRM AUDIT & START MOCK TEST GENERATION</span>
              <ArrowRight className="w-4 h-4 text-blue-600" />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* APPROVAL GATE 1 CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-xl w-full p-6 shadow-2xl space-y-6">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Confirm 360° MCQ Audit & Authorize Generation
                  </h3>
                  <p className="text-xs text-slate-500">
                    Mandatory Human Verification Gate 1
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* CONFIRMATION SUMMARY METRICS */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                <span className="text-slate-500">Admin Signatory:</span>
                <span className="font-bold text-slate-900 dark:text-white">{adminUser.email}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                <span className="text-slate-500">Total Approved MCQs:</span>
                <span className="font-black text-emerald-600 dark:text-emerald-400">
                  {auditSummary.approved_for_generation} Questions
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                <span className="text-slate-500">Target Mock Tests:</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  {config.numberOfMockTests} Tests ({config.mcqsPerMockTest} MCQs/test)
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Destination Subject:</span>
                <span className="font-bold text-slate-900 dark:text-white">{config.subject}</span>
              </div>
            </div>

            {/* DEFICIT WARNING IF NOT SUFFICIENT */}
            {!auditSummary.is_sufficient && config.questionReusePolicy === 'OFF' && (
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                <div className="font-black flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Warning: Insufficient Approved Questions</span>
                </div>
                <p>
                  You require {auditSummary.required_for_generation} MCQs but have {auditSummary.approved_for_generation} approved (deficit of {auditSummary.deficit}).
                  Generation will halt unless you approve more questions or reduce test count.
                </p>
              </div>
            )}

            {/* ADMIN NOTES */}
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                Audit Sign-off Notes (Optional)
              </label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="e.g. Reviewed 35 questions, approved 980 valid items, verified answer keys."
                rows={2}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium text-slate-900 dark:text-white"
              />
            </div>

            {/* ACTIONS */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmGate1}
                className="px-5 py-2.5 text-xs font-black rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 cursor-pointer transition-all flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>AUTHORIZE & START GENERATION</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* EDIT QUESTION MODAL */}
      {/* ========================================================================= */}
      {editingQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-blue-600" />
                <span>Edit Question #{editingQuestion.original_number}</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingQuestion(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              
              {/* Question Text */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Question Text <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={editingQuestion.question_text}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, question_text: e.target.value })}
                  rows={3}
                  required
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white"
                />
              </div>

              {/* Hindi Question Text */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Hindi Question Text (Optional)
                </label>
                <textarea
                  value={editingQuestion.question_hi || ''}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, question_hi: e.target.value })}
                  rows={2}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white"
                />
              </div>

              {/* Options A, B, C, D */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Option A <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editingQuestion.option_a}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, option_a: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Option B <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editingQuestion.option_b}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, option_b: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Option C <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editingQuestion.option_c}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, option_c: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Option D <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editingQuestion.option_d}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, option_d: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Correct Answer & Subject */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Correct Answer <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={editingQuestion.correct_answer}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, correct_answer: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-black text-emerald-600 dark:text-emerald-400"
                  >
                    <option value="A">Option A</option>
                    <option value="B">Option B</option>
                    <option value="C">Option C</option>
                    <option value="D">Option D</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={editingQuestion.subject}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, subject: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Explanation */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Explanation (Optional)
                </label>
                <textarea
                  value={editingQuestion.explanation || ''}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, explanation: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium text-slate-900 dark:text-white"
                />
              </div>

              {/* ACTIONS */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingQuestion(null)}
                  className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-black rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 cursor-pointer"
                >
                  Save & Validate Question
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
