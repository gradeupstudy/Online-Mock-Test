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
  Check,
  Key,
  X,
  Plus,
  Trash2
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
  batchPublishGeneratedTests,
  enrichRawMCQsWithDualLanguageAndExplanations,
  resolveQuestionLanguageMode
} from '../../../services/aiAutomationEngine';
import { aiService, sanitizeBilingualQuestionFields } from '../../../services/aiService';
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

  // Gemini API Key Manager Modal
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [geminiKeys, setGeminiKeys] = useState<string[]>([]);
  const [apiKeyInputText, setApiKeyInputText] = useState('');

  useEffect(() => {
    const keys = aiService.getStoredApiKeys();
    setGeminiKeys(keys);
    setApiKeyInputText(keys.join('\n'));
  }, [showApiKeyModal]);

  const handleSaveGeminiKeys = () => {
    const splitKeys = apiKeyInputText
      .split(/[\n,]+/)
      .map((k) => k.trim())
      .filter((k) => k.length > 0);
    aiService.saveApiKeys(splitKeys);
    setGeminiKeys(splitKeys);
    setShowApiKeyModal(false);
    onToast?.('success', `Saved ${splitKeys.length} Gemini API Key(s) for AI Rotation & Cascading!`);
  };

  // Dual Language Batch & Single Processing State
  const [isEnrichingDualLanguage, setIsEnrichingDualLanguage] = useState(false);
  const [enrichDualLanguageProgress, setEnrichDualLanguageProgress] = useState<{
    current: number;
    total: number;
    message: string;
    percent: number;
  } | null>(null);
  const [singleEnrichingId, setSingleEnrichingId] = useState<string | null>(null);

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
  // PHASE 1: START OCR PROCESSING + DUAL LANGUAGE SETUP + 360° MCQ AUDIT
  // =========================================================================
  const handleStartProcessingAndAudit = async () => {
    if (!pdfFile) {
      onToast?.('error', 'Please upload a source PDF file first.');
      return;
    }

    setState('OCR_PROCESSING');
    setOcrProgress(5);
    setOcrStepMsg('Phase 1A: Initializing PDF.js engine and document parser...');
    setOcrLogs(['Starting PDF document extraction pipeline...']);

    try {
      // 1. Fetch existing question bank for duplicate comparison
      const existingBankQuestions = await dataService.getAllQuestionBank();

      // 2. Phase 1A: Perform OCR Extraction using sliding window engine with cross-page option recovery
      const resolvedLangMode = resolveQuestionLanguageMode(config);
      const extractionResult = await extractMCQsFromPDF({
        file: pdfFile,
        pageRangeMode: config.pageRangeMode,
        startPage: config.startPage,
        endPage: config.endPage,
        languageMode: resolvedLangMode,
        onProgress: (pct, msg, page, total, extracted) => {
          setOcrProgress(Math.min(45, Math.round(pct * 0.45)));
          setOcrStepMsg(`Phase 1A: ${msg}`);
          if (page) setOcrCurrentPage(page);
          if (total) setOcrTotalPages(total);
          if (extracted !== undefined) setOcrExtractedCount(extracted);
          setOcrLogs(prev => [...prev.slice(-40), `[Phase 1A] ${msg}`]);
        }
      });

      if (!extractionResult.success || extractionResult.questions.length === 0) {
        onToast?.('error', extractionResult.error || 'No MCQs could be extracted from this PDF. Please check the file formatting.');
        setState('CONFIGURED');
        return;
      }

      // 3. Phase 1B: Pre-Audit Dual Language (English + Hindi) & Bilingual Explanation Setup
      setState('BILINGUAL_ENRICHING');
      setOcrStepMsg(`Phase 1B: Setting up Dual Language (English + Hindi) & Explanations for ${extractionResult.questions.length} MCQs...`);
      setOcrLogs(prev => [
        ...prev,
        `[Phase 1B] Beginning Dual Language (EN + HI) verification & bilingual explanation setup before 360° audit...`
      ]);

      let enrichedQuestions = extractionResult.questions;
      if (config.autoEnrichDualLanguageAndExplanations !== false) {
        enrichedQuestions = await enrichRawMCQsWithDualLanguageAndExplanations(
          extractionResult.questions,
          config,
          (done, total, logMsg) => {
            const enrichPct = 45 + Math.round((done / (total || 1)) * 45);
            setOcrProgress(Math.min(90, enrichPct));
            setOcrStepMsg(`Phase 1B: ${logMsg}`);
            setOcrLogs(prev => [...prev.slice(-40), `[Phase 1B] ${logMsg}`]);
          }
        );
      }

      // 4. Phase 1C: Execute 360° MCQ Comprehensive Audit on the enriched Dual-Language MCQs
      setState('AUDITING');
      setOcrProgress(95);
      setOcrStepMsg('Phase 1C: Executing 360° MCQ Audit & Quality Analysis on Dual Language MCQs...');
      setOcrLogs(prev => [...prev, '[Phase 1C] Running structural, linguistic, answer key & duplicate audit checks...']);

      const audited = perform360MCQAudit(
        enrichedQuestions,
        existingBankQuestions,
        config
      );

      const summary = calculateAuditSummary(audited, config);

      setAuditedQuestions(audited);
      setAuditSummary(summary);
      setState('AUDIT_READY');

      persistSession('AUDIT_READY', config, audited, summary, [], null);

      onToast?.('success', `360° Audit completed: ${audited.length} Dual Language questions verified (${summary.valid_count} Valid, ${summary.needs_review_count} Needs Review).`);
    } catch (err: any) {
      console.error('PDF Extraction/Audit failure:', err);
      onToast?.('error', `Extraction failed: ${err.message || 'Unknown error'}`);
      setState('CONFIGURED');
    }
  };

  // =========================================================================
  // ON-DEMAND BILINGUAL ENRICHMENT / AI REPAIR FROM AUDIT DASHBOARD
  // =========================================================================
  const handleReEnrichAllDualLanguage = async () => {
    if (auditedQuestions.length === 0 || isEnrichingDualLanguage) return;

    setIsEnrichingDualLanguage(true);
    setEnrichDualLanguageProgress({
      current: 0,
      total: auditedQuestions.length,
      message: `Initializing Dual Language & Explanation conversion for ${auditedQuestions.length} questions...`,
      percent: 0,
    });

    try {
      onToast?.('info', 'Starting Dual Language & Explanation conversion for all questions...');
      const langMode = resolveQuestionLanguageMode(config);
      const questionsToEnrich = auditedQuestions.map((q, idx) => {
        const sanitized = sanitizeBilingualQuestionFields(q.question_text, q.question_hi, langMode);
        return {
          question_number: q.original_number || q.question_number || idx + 1,
          question_text: sanitized.question_text,
          question_hi: sanitized.question_hi || '',
          option_a: q.option_a,
          option_b: q.option_b,
          option_c: q.option_c,
          option_d: q.option_d,
          correct_answer: q.correct_answer,
          explanation: q.explanation || '',
          subject: q.subject || config.subject,
          chapter: q.chapter,
          topic: q.topic || config.topic,
        };
      });

      const converted = await aiService.bulkConvertToDualLanguageMCQs(
        questionsToEnrich,
        langMode,
        (done, total, logMsg) => {
          const pct = total > 0 ? Math.round((done / total) * 100) : 0;
          setEnrichDualLanguageProgress({
            current: done,
            total,
            message: logMsg,
            percent: pct,
          });
        }
      );

      const updatedList: AuditedMCQ[] = auditedQuestions.map((orig, i) => {
        const conv = converted[i];
        if (!conv) return orig;
        const sanitized = sanitizeBilingualQuestionFields(
          conv.question_text || orig.question_text,
          conv.question_hi,
          langMode
        );
        return {
          ...orig,
          question_text: sanitized.question_text,
          question_hi: langMode === 'english' ? null : (sanitized.question_hi || null),
          option_a: conv.option_a,
          option_b: conv.option_b,
          option_c: conv.option_c,
          option_d: conv.option_d,
          correct_answer: (conv.correct_answer || orig.correct_answer).toUpperCase() as any,
          explanation: conv.explanation || orig.explanation,
          audit_status: 'VALID',
          quality_score: Math.max(orig.quality_score, 95),
          reasons: orig.reasons.filter(r => !r.toLowerCase().includes('hindi') && !r.toLowerCase().includes('translation') && !r.toLowerCase().includes('ocr')),
        };
      });

      const newSummary = calculateAuditSummary(updatedList, config);
      setAuditedQuestions(updatedList);
      setAuditSummary(newSummary);
      persistSession(state, config, updatedList, newSummary, generatedTests, finalAuditReport);
      onToast?.('success', `All ${updatedList.length} questions successfully enriched with Dual Language (English + Hindi) & Explanations!`);
    } catch (err: any) {
      console.error('Bulk Dual Language conversion failed:', err);
      onToast?.('error', `Failed to convert: ${err.message || 'Unknown error'}`);
    } finally {
      setIsEnrichingDualLanguage(false);
      setEnrichDualLanguageProgress(null);
    }
  };

  const handleConvertSingleDualLanguage = async (questionId: string) => {
    const targetQ = auditedQuestions.find(q => q.id === questionId);
    if (!targetQ || singleEnrichingId) return;

    setSingleEnrichingId(questionId);
    try {
      const langMode = resolveQuestionLanguageMode(config, targetQ.subject);
      const sanitizedInput = sanitizeBilingualQuestionFields(targetQ.question_text, targetQ.question_hi, langMode);
      onToast?.('info', `Converting Question #${targetQ.original_number || targetQ.question_number} to Dual Language...`);
      const converted = await aiService.convertSingleToDualLanguage({
        question_number: targetQ.original_number || targetQ.question_number,
        question_text: sanitizedInput.question_text,
        question_hi: sanitizedInput.question_hi || '',
        option_a: targetQ.option_a,
        option_b: targetQ.option_b,
        option_c: targetQ.option_c,
        option_d: targetQ.option_d,
        correct_answer: targetQ.correct_answer,
        explanation: targetQ.explanation || '',
        subject: targetQ.subject || config.subject,
        chapter: targetQ.chapter,
        topic: targetQ.topic || config.topic,
      }, langMode);

      const sanitizedResult = sanitizeBilingualQuestionFields(
        converted.question_text || targetQ.question_text,
        converted.question_hi,
        langMode
      );

      const updatedList = auditedQuestions.map(q => {
        if (q.id === questionId) {
          return {
            ...q,
            question_text: sanitizedResult.question_text,
            question_hi: langMode === 'english' ? null : (sanitizedResult.question_hi || null),
            option_a: converted.option_a,
            option_b: converted.option_b,
            option_c: converted.option_c,
            option_d: converted.option_d,
            correct_answer: converted.correct_answer,
            explanation: converted.explanation,
            audit_status: 'VALID' as const,
            quality_score: 96,
            reasons: [],
          };
        }
        return q;
      });

      const newSummary = calculateAuditSummary(updatedList, config);
      setAuditedQuestions(updatedList);
      setAuditSummary(newSummary);
      persistSession(state, config, updatedList, newSummary, generatedTests, finalAuditReport);
      onToast?.('success', `Question #${targetQ.original_number || targetQ.question_number} converted to Dual Language & verified!`);
    } catch (err: any) {
      console.error('Single dual language conversion failed:', err);
      onToast?.('error', `Conversion failed: ${err.message}`);
    } finally {
      setSingleEnrichingId(null);
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
              onClick={() => setShowApiKeyModal(true)}
              className="px-3.5 py-2 text-xs font-bold rounded-xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700/60 cursor-pointer transition-all flex items-center gap-1.5 shadow-2xs"
              title="Manage and configure multiple Gemini API Keys for rotation & failover"
            >
              <Key className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Gemini Keys ({geminiKeys.length})</span>
            </button>

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

      {(state === 'OCR_PROCESSING' || state === 'BILINGUAL_ENRICHING' || state === 'AUDITING') && (
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
          onReEnrichAllDualLanguage={handleReEnrichAllDualLanguage}
          isEnrichingDualLanguage={isEnrichingDualLanguage}
          enrichDualLanguageProgress={enrichDualLanguageProgress}
          onConvertSingleDualLanguage={handleConvertSingleDualLanguage}
          singleEnrichingId={singleEnrichingId}
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

      {/* Gemini API Key Manager Modal */}
      {showApiKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-scaleUp">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Gemini API Keys Manager
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Configure one or multiple API keys for multi-key rotation & failover
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowApiKeyModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 text-xs text-indigo-900 dark:text-indigo-200 font-medium space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300">
                  <Sparkles className="w-3.5 h-3.5" />
                  Auto-Cascade & Load Balancing Active
                </p>
                <p>
                  Paste your Google Gemini API Keys below (one key per line or separated by comma). The system prioritizes <strong>Gemini 3.7 Flash</strong> and automatically cascades to backup models and rotates through your keys if quota or rate limits occur.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Gemini API Keys ({geminiKeys.length} currently saved)
                </label>
                <textarea
                  rows={6}
                  value={apiKeyInputText}
                  onChange={(e) => setApiKeyInputText(e.target.value)}
                  placeholder="Paste your Gemini API Keys here:&#10;AIzaSyA...&#10;AIzaSyB...&#10;AIzaSyC..."
                  className="w-full px-3.5 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-xs font-mono text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-amber-500 outline-hidden resize-y"
                />
              </div>

              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                <span>Keys are securely saved in your browser's local storage.</span>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 dark:text-blue-400 font-bold hover:underline"
                >
                  Get Gemini API Key ↗
                </a>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5 bg-slate-50/50 dark:bg-slate-950/50">
              <button
                type="button"
                onClick={() => setShowApiKeyModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveGeminiKeys}
                className="px-5 py-2 rounded-xl text-xs font-black bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-md shadow-amber-500/20 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save API Keys</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
