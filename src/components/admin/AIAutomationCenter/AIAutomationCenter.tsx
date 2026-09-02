import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  ShieldCheck,
  Cpu,
  Layers,
  CheckCircle2,
  AlertTriangle,
  History,
  RotateCcw,
  ArrowRight,
  FileText,
  Sliders,
  Database,
  Send,
  Eye,
  Check
} from 'lucide-react';
import {
  AutomationState,
  AIAutomationConfig,
  AuditedMCQ,
  AuditReportSummary,
  AdminAuditConfirmation,
  FinalTestAuditReport,
  GeneratedTestSummary,
  AIAutomationSession
} from '../../../types/aiAutomation';
import { extractMCQsFromPDF, ExtractedPDFMCQ } from '../../../services/pdfOcrEngine';
import {
  perform360MCQAudit,
  calculateAuditSummary,
  recordAdminAuditConfirmation,
  generateMockTestsFromApprovedMCQs,
  batchPublishGeneratedTests
} from '../../../services/aiAutomationEngine';
import { dataService } from '../../../services/dataService';
import { AutomationConfigStep } from './AutomationConfigStep';
import { AutomationOcrProgress } from './AutomationOcrProgress';
import { AutomationAuditDashboard } from './AutomationAuditDashboard';
import { AutomationGenerationProgress } from './AutomationGenerationProgress';
import { AutomationFinalReview } from './AutomationFinalReview';
import { AutomationHistoryModal } from './AutomationHistoryModal';

const ACTIVE_SESSION_STORAGE_KEY = 'gradeup_ai_automation_current_session';

const DEFAULT_CONFIG: AIAutomationConfig = {
  fileName: '',
  fileSizeFormatted: '',
  pageRangeMode: 'all',
  startPage: 1,
  endPage: 50,
  totalPages: 0,
  category: 'Section / Subject Practice',
  practiceMode: 'subject_wise',
  subject: 'General Science',
  topic: '',
  mockTestNamePrefix: 'General Science Mock Test',
  startingTestNumber: 1,
  numberOfMockTests: 50,
  mcqsPerMockTest: 20,
  marksPerQuestion: 1,
  negativeMarking: 0,
  durationMinutes: 15,
  language: 'bilingual',
  questionReusePolicy: 'OFF',
  questionOrderingPreference: 'sequential'
};

interface AIAutomationCenterProps {
  adminUser?: { id: string; email: string };
  onToast?: (type: 'success' | 'error' | 'info', msg: string) => void;
  onNavigateToTests?: () => void;
}

export const AIAutomationCenter: React.FC<AIAutomationCenterProps> = ({
  adminUser = { id: 'admin-master', email: 'admin@gradeupstudy.com' },
  onToast,
  onNavigateToTests
}) => {
  // Main State Machine
  const [state, setState] = useState<AutomationState>('CONFIGURED');
  const [config, setConfig] = useState<AIAutomationConfig>(DEFAULT_CONFIG);
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  // Phase 1A OCR State
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrStepMsg, setOcrStepMsg] = useState('');
  const [ocrCurrentPage, setOcrCurrentPage] = useState(1);
  const [ocrTotalPages, setOcrTotalPages] = useState(0);
  const [ocrExtractedCount, setOcrExtractedCount] = useState(0);
  const [ocrLogs, setOcrLogs] = useState<string[]>([]);

  // Phase 1B & 1C 360° Audit State
  const [auditedQuestions, setAuditedQuestions] = useState<AuditedMCQ[]>([]);
  const [auditSummary, setAuditSummary] = useState<AuditReportSummary>({
    total_extracted: 0,
    valid_count: 0,
    needs_review_count: 0,
    invalid_count: 0,
    duplicate_count: 0,
    near_duplicate_count: 0,
    approved_for_generation: 0,
    required_for_generation: 1000,
    is_sufficient: false,
    deficit: 1000
  });

  // Phase 2 Generation & Review State
  const [genProgress, setGenProgress] = useState(0);
  const [genStepMsg, setGenStepMsg] = useState('');
  const [generatedTests, setGeneratedTests] = useState<GeneratedTestSummary[]>([]);
  const [finalAuditReport, setFinalAuditReport] = useState<FinalTestAuditReport | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  // History Modal
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Restore saved session on mount if available
  useEffect(() => {
    try {
      const savedRaw = localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY);
      if (savedRaw) {
        const session: AIAutomationSession = JSON.parse(savedRaw);
        if (session && session.config && session.state) {
          setConfig(session.config);
          setState(session.state);
          setAuditedQuestions(session.extractedQuestions || []);
          setAuditSummary(session.auditSummary || calculateAuditSummary(session.extractedQuestions || [], session.config));
          setGeneratedTests(session.generatedTests || []);
          setFinalAuditReport(session.finalAuditReport || null);
        }
      }
    } catch (e) {
      console.warn('Could not restore past automation session', e);
    }
  }, []);

  // Sync session state to storage for recovery
  const persistSession = (
    newState: AutomationState,
    newConfig: AIAutomationConfig,
    newQuestions: AuditedMCQ[],
    newSummary: AuditReportSummary,
    newGenerated: GeneratedTestSummary[],
    newAudit: FinalTestAuditReport | null
  ) => {
    try {
      const session: AIAutomationSession = {
        id: `session-${Date.now()}`,
        state: newState,
        config: newConfig,
        extractedQuestions: newQuestions,
        auditSummary: newSummary,
        generatedTests: newGenerated,
        finalAuditReport: newAudit,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, JSON.stringify(session));
    } catch {}
  };

  // Update Config Handler
  const handleConfigChange = (partial: Partial<AIAutomationConfig>) => {
    const updated = { ...config, ...partial };
    setConfig(updated);
    if (auditedQuestions.length > 0) {
      const newSummary = calculateAuditSummary(auditedQuestions, updated);
      setAuditSummary(newSummary);
    }
  };

  // =========================================================================
  // PHASE 1A & 1B: START OCR PROCESSING + 360° MCQ AUDIT
  // =========================================================================
  const handleStartProcessingAndAudit = async () => {
    if (!pdfFile) {
      onToast?.('error', 'Please upload a source PDF file first.');
      return;
    }

    setState('OCR_PROCESSING');
    setOcrProgress(5);
    setOcrStepMsg('Initializing PDF.js engine and document parser...');
    setOcrLogs(['Starting PDF document extraction pipeline...']);

    try {
      // 1. Fetch existing question bank for duplicate comparison
      const existingBankQuestions = await dataService.getAllQuestionBank();

      // 2. Perform OCR Extraction using existing robust engine
      const extractionResult = await extractMCQsFromPDF({
        file: pdfFile,
        pageRangeMode: config.pageRangeMode,
        startPage: config.startPage,
        endPage: config.endPage,
        onProgress: (pct, msg, page, total, extracted) => {
          setOcrProgress(pct);
          setOcrStepMsg(msg);
          if (page) setOcrCurrentPage(page);
          if (total) setOcrTotalPages(total);
          if (extracted !== undefined) setOcrExtractedCount(extracted);
          setOcrLogs(prev => [...prev.slice(-40), msg]);
        }
      });

      if (!extractionResult.success || extractionResult.questions.length === 0) {
        onToast?.('error', extractionResult.error || 'No MCQs could be extracted from this PDF. Please check the file formatting.');
        setState('CONFIGURED');
        return;
      }

      setOcrStepMsg('Executing 360° MCQ Audit & Quality Analysis...');
      setState('AUDITING');

      // 3. Execute 360° MCQ Comprehensive Audit
      const audited = perform360MCQAudit(
        extractionResult.questions,
        existingBankQuestions,
        config
      );

      const summary = calculateAuditSummary(audited, config);

      setAuditedQuestions(audited);
      setAuditSummary(summary);
      setState('AUDIT_READY');

      persistSession('AUDIT_READY', config, audited, summary, [], null);

      onToast?.('success', `360° Audit completed: ${audited.length} questions inspected (${summary.valid_count} Valid, ${summary.needs_review_count} Needs Review).`);
    } catch (err: any) {
      console.error('PDF Extraction/Audit failure:', err);
      onToast?.('error', `Extraction failed: ${err.message || 'Unknown error'}`);
      setState('CONFIGURED');
    }
  };

  // =========================================================================
  // AUDIT QUESTION ACTIONS (Edit / Approve / Exclude)
  // =========================================================================
  const handleUpdateQuestion = (updatedQ: AuditedMCQ) => {
    const updatedList = auditedQuestions.map(q => q.id === updatedQ.id ? updatedQ : q);
    const newSummary = calculateAuditSummary(updatedList, config);
    setAuditedQuestions(updatedList);
    setAuditSummary(newSummary);
    persistSession(state, config, updatedList, newSummary, generatedTests, finalAuditReport);
  };

  const handleBatchApproveValid = () => {
    const updatedList = auditedQuestions.map(q => {
      if (q.audit_status === 'VALID') {
        return { ...q, is_approved_by_admin: true, is_excluded: false };
      }
      return q;
    });
    const newSummary = calculateAuditSummary(updatedList, config);
    setAuditedQuestions(updatedList);
    setAuditSummary(newSummary);
    persistSession(state, config, updatedList, newSummary, generatedTests, finalAuditReport);
    onToast?.('success', `Approved all ${newSummary.valid_count} Valid questions.`);
  };

  const handleBatchExcludeInvalid = () => {
    const updatedList = auditedQuestions.map(q => {
      if (q.audit_status === 'INVALID' || q.audit_status === 'DUPLICATE') {
        return { ...q, is_excluded: true, is_approved_by_admin: false };
      }
      return q;
    });
    const newSummary = calculateAuditSummary(updatedList, config);
    setAuditedQuestions(updatedList);
    setAuditSummary(newSummary);
    persistSession(state, config, updatedList, newSummary, generatedTests, finalAuditReport);
    onToast?.('info', `Excluded all invalid and duplicate questions.`);
  };

  // =========================================================================
  // CRITICAL APPROVAL GATE 1: CONFIRM AUDIT & START PHASE 2 GENERATION
  // =========================================================================
  const handleConfirmGate1 = async (confirmation: AdminAuditConfirmation) => {
    // 1. Record confirmation receipt
    await recordAdminAuditConfirmation(confirmation);

    // 2. Transition state to GENERATING_TESTS
    setState('GENERATING_TESTS');
    setGenProgress(10);
    setGenStepMsg('Initializing test partitioner...');

    // 3. Execute generation
    const currentSession: AIAutomationSession = {
      id: confirmation.id,
      state: 'GENERATING_TESTS',
      config,
      extractedQuestions: auditedQuestions,
      auditSummary,
      adminConfirmation: confirmation,
      generatedTests: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const genResult = await generateMockTestsFromApprovedMCQs(
      currentSession,
      adminUser,
      (stepText, pct) => {
        setGenStepMsg(stepText);
        setGenProgress(pct);
      }
    );

    if (!genResult.success) {
      onToast?.('error', genResult.error || 'Failed to generate mock tests.');
      setState('AUDIT_READY');
      return;
    }

    setGeneratedTests(genResult.generatedSummaries);
    setFinalAuditReport(genResult.finalAudit);
    setState('READY_FOR_ADMIN_REVIEW');

    persistSession(
      'READY_FOR_ADMIN_REVIEW',
      config,
      auditedQuestions,
      auditSummary,
      genResult.generatedSummaries,
      genResult.finalAudit
    );

    onToast?.('success', `Generated ${genResult.generatedSummaries.length} mock tests! Phase 2A audit passed.`);
  };

  // =========================================================================
  // CRITICAL APPROVAL GATE 2: PUBLISH ALL GENERATED TESTS
  // =========================================================================
  const handlePublishAllGeneratedTests = async () => {
    setIsPublishing(true);
    try {
      const testIds = generatedTests.map(g => g.test.id);
      const count = await batchPublishGeneratedTests(testIds);

      const updated = generatedTests.map(g => ({
        ...g,
        is_published: true,
        test: { ...g.test, is_published: true, status: 'published' }
      }));

      setGeneratedTests(updated);
      setState('PUBLISHED');
      persistSession('PUBLISHED', config, auditedQuestions, auditSummary, updated, finalAuditReport);

      onToast?.('success', `Successfully published all ${count} mock tests! They are now live on the student practice portal.`);
    } catch (e: any) {
      onToast?.('error', `Failed to publish tests: ${e.message || 'Unknown error'}`);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleTogglePublishSingle = async (testId: string, currentStatus: boolean) => {
    try {
      await dataService.bulkUpdateTestStatus([testId], !currentStatus);

      const updated = generatedTests.map(g => {
        if (g.test.id === testId) {
          return {
            ...g,
            is_published: !currentStatus,
            test: { ...g.test, is_published: !currentStatus, status: !currentStatus ? 'published' : 'draft' }
          };
        }
        return g;
      });

      setGeneratedTests(updated);
      persistSession(state, config, auditedQuestions, auditSummary, updated, finalAuditReport);
      onToast?.('success', `Test ${!currentStatus ? 'published' : 'unpublished'}.`);
    } catch (e: any) {
      onToast?.('error', `Failed to update test status: ${e.message}`);
    }
  };

  // Reset / Start New Automation
  const handleStartNewAutomation = () => {
    if (window.confirm('Are you sure you want to start a new automation? All unsaved staged configurations will be reset.')) {
      localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
      setConfig(DEFAULT_CONFIG);
      setPdfFile(null);
      setAuditedQuestions([]);
      setGeneratedTests([]);
      setFinalAuditReport(null);
      setState('CONFIGURED');
      onToast?.('info', 'Started new AI Automation session.');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* TOP WORKSPACE NAV & STATUS BAR */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* TITLE & IDENTITY */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-linear-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  AI Automation Center
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[10px] font-black uppercase tracking-wider">
                  2-Phase Pipeline
                </span>
              </div>
              <p className="text-xs text-slate-500">
                PDF Extraction • 360° MCQ Audit • Test Series Generator • 2 Human Approval Gates
              </p>
            </div>
          </div>

          {/* WORKSPACE ACTIONS */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowHistoryModal(true)}
              className="px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer transition-all flex items-center gap-1.5"
            >
              <History className="w-3.5 h-3.5" />
              <span>Audit Log Receipts</span>
            </button>

            {state !== 'CONFIGURED' && (
              <button
                type="button"
                onClick={handleStartNewAutomation}
                className="px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 cursor-pointer transition-all flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>New Session</span>
              </button>
            )}
          </div>

        </div>

        {/* 2-PHASE STEPPING WIDGET */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 text-xs font-black">
          
          {/* STEP 1 */}
          <div className={`p-2.5 rounded-2xl border flex items-center gap-2.5 transition-all ${
            state === 'CONFIGURED' || state === 'OCR_PROCESSING'
              ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-400 text-blue-800 dark:text-blue-200 ring-2 ring-blue-500/20'
              : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
          }`}>
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[11px]">1</span>
            <span className="truncate">Upload & Config</span>
          </div>

          {/* STEP 2 */}
          <div className={`p-2.5 rounded-2xl border flex items-center gap-2.5 transition-all ${
            state === 'AUDITING' || state === 'AUDIT_READY' || state === 'WAITING_FOR_ADMIN_CONFIRMATION'
              ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-400 text-purple-800 dark:text-purple-200 ring-2 ring-purple-500/20'
              : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
          }`}>
            <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[11px]">2</span>
            <span className="truncate">360° Audit (Gate 1)</span>
          </div>

          {/* STEP 3 */}
          <div className={`p-2.5 rounded-2xl border flex items-center gap-2.5 transition-all ${
            state === 'GENERATING_TESTS'
              ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-400 text-indigo-800 dark:text-indigo-200 ring-2 ring-indigo-500/20'
              : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
          }`}>
            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[11px]">3</span>
            <span className="truncate">Test Generation</span>
          </div>

          {/* STEP 4 */}
          <div className={`p-2.5 rounded-2xl border flex items-center gap-2.5 transition-all ${
            state === 'READY_FOR_ADMIN_REVIEW' || state === 'PUBLISHED'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 text-emerald-800 dark:text-emerald-200 ring-2 ring-emerald-500/20'
              : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
          }`}>
            <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[11px]">4</span>
            <span className="truncate">Review & Publish (Gate 2)</span>
          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* ACTIVE VIEW SWITCHER BASED ON STATE MACHINE */}
      {/* ========================================================================= */}
      {state === 'CONFIGURED' && (
        <AutomationConfigStep
          config={config}
          pdfFile={pdfFile}
          onPdfFileChange={setPdfFile}
          onChangeConfig={handleConfigChange}
          onConfirmAndStart={handleStartProcessingAndAudit}
          isProcessing={false}
          onToast={onToast}
        />
      )}

      {(state === 'OCR_PROCESSING' || state === 'AUDITING') && (
        <AutomationOcrProgress
          progressPercentage={ocrProgress}
          currentStepMessage={ocrStepMsg}
          currentPage={ocrCurrentPage}
          totalPages={ocrTotalPages}
          extractedCount={ocrExtractedCount}
          logs={ocrLogs}
          onCancel={() => setState('CONFIGURED')}
        />
      )}

      {(state === 'AUDIT_READY' || state === 'WAITING_FOR_ADMIN_CONFIRMATION') && (
        <AutomationAuditDashboard
          questions={auditedQuestions}
          config={config}
          auditSummary={auditSummary}
          adminUser={adminUser}
          onUpdateQuestion={handleUpdateQuestion}
          onBatchApproveValid={handleBatchApproveValid}
          onBatchExcludeInvalid={handleBatchExcludeInvalid}
          onConfirmAuditGate1={handleConfirmGate1}
          onPauseSession={() => onToast?.('info', 'Session state saved in local browser storage.')}
          onRejectAudit={() => {
            if (window.confirm('Reject this audit and return to configuration?')) {
              setState('CONFIGURED');
            }
          }}
          isGenerating={false}
        />
      )}

      {state === 'GENERATING_TESTS' && (
        <AutomationGenerationProgress
          progressPercentage={genProgress}
          currentStepMessage={genStepMsg}
          config={config}
        />
      )}

      {(state === 'READY_FOR_ADMIN_REVIEW' || state === 'PUBLISHED') && (
        <AutomationFinalReview
          generatedTests={generatedTests}
          finalAudit={finalAuditReport}
          config={config}
          onPublishAll={handlePublishAllGeneratedTests}
          onTogglePublishTest={handleTogglePublishSingle}
          onStartNewAutomation={handleStartNewAutomation}
          isPublishing={isPublishing}
        />
      )}

      {/* Audit History Receipt Modal */}
      <AutomationHistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
      />

    </div>
  );
};
