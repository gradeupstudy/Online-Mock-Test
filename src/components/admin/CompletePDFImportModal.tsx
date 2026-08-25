import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import {
  FileText,
  Upload,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  BookOpen,
  Layers,
  ArrowRight,
  Download,
  Trash2,
  Edit3,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Zap,
  ShieldCheck,
  Filter,
  CheckSquare,
  Square,
  HelpCircle,
  Clock,
  Eye,
  Sliders
} from 'lucide-react';
import {
  pdfOcrEngine,
  ExtractedPDFMCQ,
  PDFExtractionSummary,
  PDFProcessProgress,
  normalizeOptionLetter
} from '../../services/pdfOcrEngine';
import { dataService, parseSafeNumber } from '../../services/dataService';
import { aiService } from '../../services/aiService';
import { Test, Question } from '../../types';

interface CompletePDFImportModalProps {
  isOpen: boolean;
  testId?: string;
  testTitle?: string;
  testNegativeMarking?: number;
  testMarksPerQuestion?: number;
  availableTests?: Test[];
  onClose: () => void;
  onSuccessImport: (importedCount: number) => void;
  onToast?: (type: 'success' | 'error' | 'info', msg: string) => void;
}

export const CompletePDFImportModal: React.FC<CompletePDFImportModalProps> = ({
  isOpen,
  testId,
  testTitle,
  testNegativeMarking,
  testMarksPerQuestion,
  availableTests = [],
  onClose,
  onSuccessImport,
  onToast,
}) => {
  const notify = (type: 'success' | 'error' | 'info', msg: string) => {
    if (typeof onToast === 'function') {
      onToast(type, msg);
    }
  };

  // Step 1: Upload & Config State
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [fileTotalPages, setFileTotalPages] = useState<number | null>(null);
  const [isDetectingPages, setIsDetectingPages] = useState(false);
  const [pageRangeMode, setPageRangeMode] = useState<'all' | 'custom'>('all');
  const [startPageInput, setStartPageInput] = useState<number>(1);
  const [endPageInput, setEndPageInput] = useState<number>(50);
  const [defaultSubject, setDefaultSubject] = useState<string>('General Studies');
  const [defaultChapter, setDefaultChapter] = useState<string>('General');
  const [defaultTopic, setDefaultTopic] = useState<string>('General Topic');
  const [languageMode, setLanguageMode] = useState<'auto' | 'bilingual' | 'english' | 'hindi'>('auto');

  // Destination Target
  const [targetDestination, setTargetDestination] = useState<string>(testId || 'bank');

  // Step 2: Processing State
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<PDFProcessProgress | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [showLogTerminal, setShowLogTerminal] = useState(true);

  // Step 3: Extracted Results & Review State
  const [extractedQuestions, setExtractedQuestions] = useState<ExtractedPDFMCQ[]>([]);
  const [summary, setSummary] = useState<PDFExtractionSummary | null>(null);
  const [activeFilterTab, setActiveFilterTab] = useState<'all' | 'valid' | 'needs_review' | 'conflict' | 'duplicate'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingDraft, setEditingDraft] = useState<ExtractedPDFMCQ | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // When file is selected, pre-inspect page count
  const handleFileSelect = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      notify('error', 'Please select a valid .pdf document.');
      return;
    }
    setPdfFile(file);
    setIsDetectingPages(true);
    try {
      const buffer = await file.arrayBuffer();
      // Using pdfjs to get quick page count
      const pdf = await (await import('pdfjs-dist')).getDocument({ data: buffer }).promise;
      setFileTotalPages(pdf.numPages);
      setEndPageInput(pdf.numPages);
    } catch (err) {
      console.warn('Could not pre-read page count:', err);
    } finally {
      setIsDetectingPages(false);
    }
  };

  const handleStartExtraction = async () => {
    if (!pdfFile) {
      notify('error', 'Please select a PDF file to process.');
      return;
    }

    setIsProcessing(true);
    setLogs([]);
    setProgress(null);
    setExtractedQuestions([]);
    setSummary(null);

    const fromP = pageRangeMode === 'all' ? 1 : Math.max(1, startPageInput);
    const toP = pageRangeMode === 'all' ? undefined : Math.max(fromP, endPageInput);

    try {
      const result = await pdfOcrEngine.processCompletePDF({
        file: pdfFile,
        startPage: fromP,
        endPage: toP,
        defaultSubject,
        defaultChapter,
        defaultTopic,
        languageMode,
        testId: targetDestination,
        onProgress: (p) => setProgress(p),
        onLog: (msg) => setLogs((prev) => [...prev, msg]),
      });

      setExtractedQuestions(result.questions);
      setSummary(result.summary);
      notify(
        'success',
        `Extracted ${result.questions.length} MCQs! (${result.summary.valid} Valid, ${result.summary.needs_review} Needs Review)`
      );
    } catch (err: any) {
      console.error('PDF OCR Processing Failed:', err);
      notify('error', err?.message || 'Failed to process PDF. Please check API keys.');
      setLogs((prev) => [...prev, `❌ Error: ${err?.message || err}`]);
    } finally {
      setIsProcessing(false);
    }
  };

  // Question Card Toggles & Edits
  const toggleSelectQuestion = (idx: number) => {
    setExtractedQuestions((prev) =>
      prev.map((q, i) => (i === idx ? { ...q, selected: !q.selected } : q))
    );
  };

  const handleSelectAllFiltered = (selectAll: boolean) => {
    const visibleIndices = new Set(filteredQuestions.map((fq) => fq.originalIndex));
    setExtractedQuestions((prev) =>
      prev.map((q, i) => (visibleIndices.has(i) ? { ...q, selected: selectAll } : q))
    );
  };

  const handleStartEdit = (q: ExtractedPDFMCQ, idx: number) => {
    setEditingIndex(idx);
    setEditingDraft({ ...q });
  };

  const handleSaveEdit = (idx: number) => {
    if (!editingDraft) return;
    setExtractedQuestions((prev) =>
      prev.map((q, i) => (i === idx ? { ...editingDraft, validation_status: 'valid', validation_issues: [] } : q))
    );
    setEditingIndex(null);
    setEditingDraft(null);
    notify('success', `Saved edits for Question #${editingDraft.question_number}`);
  };

  // 1-Click AI Auto Fix for any ambiguous question
  const handleAutoFixQuestion = async (q: ExtractedPDFMCQ, idx: number) => {
    try {
      notify('info', `AI is re-verifying Q${q.question_number}...`);
      const converted: Question = {
        id: 'temp-' + idx,
        test_id: 'temp',
        question_number: q.question_number,
        question_text: q.question_text,
        option_a: q.option_a,
        option_b: q.option_b,
        option_c: q.option_c,
        option_d: q.option_d,
        correct_answer: q.correct_answer,
        explanation: q.explanation || '',
        subject: q.subject,
        chapter: q.chapter,
        marks: 1,
        negative_marks: 0,
      };

      const audit = await aiService.inspectMCQ(converted);
      if (audit?.improvedVersion) {
        const imp = audit.improvedVersion;
        setExtractedQuestions((prev) =>
          prev.map((item, i) =>
            i === idx
              ? {
                  ...item,
                  question_text: imp.question_text || item.question_text,
                  option_a: imp.option_a || item.option_a,
                  option_b: imp.option_b || item.option_b,
                  option_c: imp.option_c || item.option_c,
                  option_d: imp.option_d || item.option_d,
                  correct_answer: imp.correct_answer || item.correct_answer,
                  explanation: imp.explanation || item.explanation,
                  subject: imp.subject || item.subject,
                  chapter: imp.chapter || item.chapter,
                  topic: imp.topic || item.topic,
                  answer_source: 'ai_determined',
                  answer_status: 'verified',
                  validation_status: 'valid',
                  validation_issues: [],
                  confidence: 98,
                }
              : item
          )
        );
        notify('success', `Auto-fixed & verified Q${q.question_number} with AI!`);
      }
    } catch (err: any) {
      notify('error', 'Auto-fix failed: ' + (err?.message || err));
    }
  };

  // Download Valid JSON format matching user specifications
  const handleDownloadJSON = () => {
    const exportData = {
      questions: extractedQuestions.map((q) => ({
        question_number: q.question_number,
        question_text: q.question_text,
        question_hi: q.question_hi || null,
        option_a: q.option_a,
        option_b: q.option_b,
        option_c: q.option_c,
        option_d: q.option_d,
        correct_answer: q.correct_answer,
        answer_source: q.answer_source,
        answer_status: q.answer_status,
        explanation: q.explanation || null,
        subject: q.subject,
        chapter: q.chapter,
        topic: q.topic,
        difficulty: q.difficulty,
        source_page: q.source_page,
        validation_status: q.validation_status,
        validation_issues: q.validation_issues,
        duplicate_status: q.duplicate_status,
        confidence: q.confidence,
      })),
      summary: summary || {
        total_questions_found: extractedQuestions.length,
        valid: extractedQuestions.filter((q) => q.validation_status === 'valid').length,
        needs_review: extractedQuestions.filter((q) => q.validation_status === 'needs_review').length,
        invalid: extractedQuestions.filter((q) => q.validation_status === 'invalid').length,
        duplicates: extractedQuestions.filter((q) => q.duplicate_status !== 'unique').length,
      },
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Extracted_MCQs_${pdfFile?.name.replace(/\.pdf$/i, '') || 'Document'}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Confirm Import into Database
  const handleConfirmImport = async () => {
    const selectedList = extractedQuestions.filter((q) => q.selected);
    if (selectedList.length === 0) {
      notify('error', 'Please select at least one question to import.');
      return;
    }

    setIsSaving(true);
    try {
      let targetNeg = 0;
      let targetMarks = 1;

      if (targetDestination !== 'bank') {
        const testObj = await dataService.getTestBySlugOrId(targetDestination);
        if (testObj) {
          targetNeg = parseSafeNumber(testObj.negative_marking, 0);
          targetMarks = parseSafeNumber(testObj.marks_per_question, 1);
        }
      }

      // Existing questions for numbering
      const existing = await dataService.getQuestions(targetDestination);
      const startNum = existing.length + 1;

      const convertedQuestions = pdfOcrEngine.convertToGradeUpQuestions(
        selectedList,
        targetDestination,
        targetMarks,
        targetNeg,
        startNum
      );

      const combined = [...existing, ...convertedQuestions];
      await dataService.saveQuestions(targetDestination, combined);

      notify('success', `Successfully imported ${convertedQuestions.length} MCQs into ${targetDestination === 'bank' ? 'Question Bank' : 'Mock Test'}!`);
      onSuccessImport(convertedQuestions.length);
      onClose();
    } catch (err: any) {
      console.error('Import save failed:', err);
      notify('error', 'Failed to save questions: ' + (err?.message || err));
    } finally {
      setIsSaving(false);
    }
  };

  // Filtered Questions list
  const filteredQuestions = extractedQuestions
    .map((q, originalIndex) => ({ ...q, originalIndex }))
    .filter((q) => {
      // Tab filter
      if (activeFilterTab === 'valid' && q.validation_status !== 'valid') return false;
      if (activeFilterTab === 'needs_review' && q.validation_status !== 'needs_review') return false;
      if (activeFilterTab === 'conflict' && q.answer_status !== 'conflict') return false;
      if (activeFilterTab === 'duplicate' && q.duplicate_status === 'unique') return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const textMatch = q.question_text.toLowerCase().includes(query);
        const hiMatch = q.question_hi?.toLowerCase().includes(query);
        const subjMatch = q.subject.toLowerCase().includes(query);
        const chaptMatch = q.chapter.toLowerCase().includes(query);
        const numMatch = String(q.question_number).includes(query);
        return textMatch || hiMatch || subjMatch || chaptMatch || numMatch;
      }
      return true;
    });

  const selectedCount = extractedQuestions.filter((q) => q.selected).length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Complete PDF MCQ OCR & Document Understanding Engine"
      maxWidth="5xl"
    >
      <div className="space-y-6">

        {/* STEP 1: INITIAL UPLOAD & CONFIGURATION (When no questions extracted yet and not processing) */}
        {!isProcessing && extractedQuestions.length === 0 && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* Header info banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-900/10 via-indigo-900/10 to-blue-900/10 dark:from-purple-950/40 dark:to-blue-950/40 border border-purple-200 dark:border-purple-800 text-xs flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-purple-600 text-white shrink-0 shadow-md">
                <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-slate-900 dark:text-white text-sm">
                  Full-Document Question Paper & Book OCR Extraction
                </p>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  Upload any question paper, scanned PDF, or book. The engine processes the <strong>COMPLETE PDF from page 1 to the last page</strong>, extracts all bilingual/Hindi/English MCQs, parses answer tables/keys at the back, reconciles conflicts, and structures clean question records.
                </p>
              </div>
            </div>

            {/* Drag and Drop Zone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleFileSelect(e.dataTransfer.files[0]);
                }
              }}
              className={`border-2 border-dashed rounded-3xl p-8 text-center transition-all cursor-pointer ${
                pdfFile
                  ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20'
                  : 'border-slate-300 dark:border-slate-700 hover:border-purple-500 bg-slate-50/50 dark:bg-slate-800/40'
              }`}
            >
              {pdfFile ? (
                <div className="space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-inner">
                    <FileText className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-base font-black text-slate-900 dark:text-white truncate max-w-md mx-auto">
                      {pdfFile.name}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {(pdfFile.size / (1024 * 1024)).toFixed(2)} MB • {fileTotalPages ? `${fileTotalPages} Total Pages Detected` : 'PDF Document Ready'}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setPdfFile(null);
                      setFileTotalPages(null);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-rose-100 hover:text-rose-700 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Change PDF File
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 mx-auto flex items-center justify-center shadow-inner">
                    <Upload className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-base font-black text-slate-900 dark:text-white">
                      Drop Question Paper / Exam PDF Here
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Supports Scanned & Digital PDFs, Bilingual English/Hindi question papers, Books & Answer Keys
                    </p>
                  </div>
                  <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-xs rounded-xl shadow-md cursor-pointer transition-all">
                    <Upload className="w-4 h-4" /> Browse PDF File
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={(e) => {
                        if (e.dataTransfer?.files?.[0]) handleFileSelect(e.dataTransfer.files[0]);
                        else if (e.target?.files?.[0]) handleFileSelect(e.target.files[0]);
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>

            {/* CONFIGURATION GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              
              {/* Destination Target */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-blue-500" />
                  <span>Import Destination</span>
                </label>
                <select
                  value={targetDestination}
                  onChange={(e) => setTargetDestination(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                >
                  <option value="bank">📚 Master Question Bank (All Tests)</option>
                  {availableTests.map((t) => (
                    <option key={t.id} value={t.id}>
                      📝 Test: {t.title} ({t.category})
                    </option>
                  ))}
                </select>
              </div>

              {/* Language / Script Mode */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <LanguagesIcon className="w-3.5 h-3.5 text-purple-500" />
                  <span>Language / Script Mode</span>
                </label>
                <select
                  value={languageMode}
                  onChange={(e) => setLanguageMode(e.target.value as any)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                >
                  <option value="auto">✨ Auto-Detect (Bilingual / Hindi / English)</option>
                  <option value="bilingual">🇮🇳 Bilingual (Hindi + English)</option>
                  <option value="hindi">🇮🇳 Pure Hindi (हिन्दी केवल)</option>
                  <option value="english">🇬🇧 Pure English</option>
                </select>
              </div>

              {/* Default Subject Fallback */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Default Subject</span>
                </label>
                <input
                  type="text"
                  value={defaultSubject}
                  onChange={(e) => setDefaultSubject(e.target.value)}
                  placeholder="e.g. HP GK, History, Polity..."
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                />
              </div>

              {/* Page Range Selector */}
              <div className="sm:col-span-2 lg:col-span-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-indigo-500" />
                    <span>Page Range to Process</span>
                  </span>
                  <div className="flex items-center gap-4 text-xs font-semibold">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="pageRange"
                        checked={pageRangeMode === 'all'}
                        onChange={() => setPageRangeMode('all')}
                        className="text-purple-600"
                      />
                      <span>Complete Document ({fileTotalPages ? `All ${fileTotalPages} Pages` : '100% of Pages'})</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="pageRange"
                        checked={pageRangeMode === 'custom'}
                        onChange={() => setPageRangeMode('custom')}
                        className="text-purple-600"
                      />
                      <span>Custom Range</span>
                    </label>
                  </div>
                </div>

                {pageRangeMode === 'custom' && (
                  <div className="flex items-center gap-3 pt-2 border-t border-slate-200 dark:border-slate-700 animate-fadeIn">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">From Page:</span>
                      <input
                        type="number"
                        min={1}
                        max={fileTotalPages || 1000}
                        value={startPageInput}
                        onChange={(e) => setStartPageInput(parseInt(e.target.value, 10) || 1)}
                        className="w-20 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-bold text-center"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">To Page:</span>
                      <input
                        type="number"
                        min={startPageInput}
                        max={fileTotalPages || 1000}
                        value={endPageInput}
                        onChange={(e) => setEndPageInput(parseInt(e.target.value, 10) || startPageInput)}
                        className="w-20 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-bold text-center"
                      />
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* Launch Button */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleStartExtraction}
                disabled={!pdfFile || isDetectingPages}
                className="px-6 py-2.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                <span>Start Complete PDF OCR & Document Extraction</span>
              </button>
            </div>

          </div>
        )}

        {/* STEP 2: LIVE PROGRESS & TERMINAL (While processing) */}
        {isProcessing && (
          <div className="space-y-6 py-4 animate-fadeIn">
            
            {/* Visual Progress Header */}
            <div className="p-6 rounded-3xl bg-slate-900 text-white shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black tracking-wide">
                      Processing Complete PDF Document...
                    </h3>
                    <p className="text-xs text-slate-400">
                      {progress?.statusMessage || 'Analyzing pages and cross-referencing answer keys...'}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-2xl font-black text-purple-400">
                    {progress?.percentage || 10}%
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-3 rounded-full bg-slate-800 p-0.5 overflow-hidden border border-slate-700">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-purple-500 via-indigo-500 to-emerald-400 transition-all duration-500"
                  style={{ width: `${progress?.percentage || 10}%` }}
                />
              </div>

              {/* Step Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-2 border-t border-slate-800">
                <div className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>1. Full-Page Loading</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                  <span>2. Answer Key Mapping</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                  <span>3. Multimodal OCR</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <span>4. Quality Audit</span>
                </div>
              </div>
            </div>

            {/* Live Terminal Log */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-950 p-4 font-mono text-xs text-slate-300 space-y-2">
              <div className="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800">
                <span className="flex items-center gap-2 font-bold text-[11px] uppercase tracking-wider text-purple-400">
                  <Zap className="w-3.5 h-3.5" /> Real-Time Engine Feed
                </span>
                <span className="text-[11px]">
                  {logs.length} operations logged
                </span>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1 scrollbar-thin">
                {logs.map((msg, i) => (
                  <div key={i} className="text-slate-300 text-[11px] leading-relaxed">
                    {msg}
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* STEP 3: RESULTS REVIEW & VERIFICATION DASHBOARD */}
        {!isProcessing && extractedQuestions.length > 0 && (
          <div className="space-y-5 animate-fadeIn">
            
            {/* SUMMARY STATS BAR */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              
              {/* Total Found */}
              <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60">
                <span className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 block tracking-wider">
                  Total MCQs
                </span>
                <span className="text-xl font-black text-slate-900 dark:text-white">
                  {summary?.total_questions_found || extractedQuestions.length}
                </span>
              </div>

              {/* Valid */}
              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60">
                <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block tracking-wider">
                  Verified Valid
                </span>
                <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                  {summary?.valid || 0}
                </span>
              </div>

              {/* Needs Review */}
              <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60">
                <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 block tracking-wider">
                  Needs Review
                </span>
                <span className="text-xl font-black text-amber-600 dark:text-amber-400">
                  {summary?.needs_review || 0}
                </span>
              </div>

              {/* Conflicts */}
              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60">
                <span className="text-[10px] uppercase font-bold text-rose-600 dark:text-rose-400 block tracking-wider">
                  Answer Conflicts
                </span>
                <span className="text-xl font-black text-rose-600 dark:text-rose-400">
                  {summary?.answer_conflicts || 0}
                </span>
              </div>

              {/* Duplicates */}
              <div className="p-3.5 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/60">
                <span className="text-[10px] uppercase font-bold text-purple-600 dark:text-purple-400 block tracking-wider">
                  Duplicates
                </span>
                <span className="text-xl font-black text-purple-600 dark:text-purple-400">
                  {summary?.duplicates || 0}
                </span>
              </div>

            </div>

            {/* ACTION TOOLBAR & FILTER TABS */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
              
              {/* Filter Tabs */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <button
                  onClick={() => setActiveFilterTab('all')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer ${
                    activeFilterTab === 'all'
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  All ({extractedQuestions.length})
                </button>

                <button
                  onClick={() => setActiveFilterTab('valid')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer ${
                    activeFilterTab === 'valid'
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  Valid ({summary?.valid || 0})
                </button>

                <button
                  onClick={() => setActiveFilterTab('needs_review')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer ${
                    activeFilterTab === 'needs_review'
                      ? 'bg-amber-600 text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  Review ({summary?.needs_review || 0})
                </button>

                {(summary?.answer_conflicts || 0) > 0 && (
                  <button
                    onClick={() => setActiveFilterTab('conflict')}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer ${
                      activeFilterTab === 'conflict'
                        ? 'bg-rose-600 text-white'
                        : 'text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/50'
                    }`}
                  >
                    Conflicts ({summary?.answer_conflicts})
                  </button>
                )}

                {(summary?.duplicates || 0) > 0 && (
                  <button
                    onClick={() => setActiveFilterTab('duplicate')}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer ${
                      activeFilterTab === 'duplicate'
                        ? 'bg-purple-600 text-white'
                        : 'text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-950/50'
                    }`}
                  >
                    Duplicates ({summary?.duplicates})
                  </button>
                )}
              </div>

              {/* Search & Export */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search extracted MCQs..."
                    className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs w-44 sm:w-56"
                  />
                </div>

                <button
                  onClick={handleDownloadJSON}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-xs cursor-pointer"
                  title="Download valid JSON export matching schema"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>JSON</span>
                </button>
              </div>

            </div>

            {/* SELECTION BAR */}
            <div className="flex items-center justify-between text-xs px-1 text-slate-500">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSelectAllFiltered(true)}
                  className="font-bold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
                >
                  Select All Filtered
                </button>
                <span>•</span>
                <button
                  onClick={() => handleSelectAllFiltered(false)}
                  className="text-slate-500 hover:underline cursor-pointer"
                >
                  Deselect All
                </button>
              </div>

              <div>
                <strong className="text-slate-800 dark:text-slate-200">{selectedCount}</strong> of{' '}
                {extractedQuestions.length} questions selected for import
              </div>
            </div>

            {/* QUESTIONS LIST */}
            <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1 scrollbar-thin">
              {filteredQuestions.map((q) => {
                const idx = q.originalIndex;
                const isEditing = editingIndex === idx;

                return (
                  <div
                    key={idx}
                    className={`p-4 rounded-2xl border transition-all ${
                      q.selected
                        ? 'border-purple-200 dark:border-purple-800/80 bg-white dark:bg-slate-900 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 opacity-75'
                    }`}
                  >
                    {isEditing && editingDraft ? (
                      /* INLINE EDIT FORM */
                      <div className="space-y-3 text-xs">
                        <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                          <span>Editing Question #{editingDraft.question_number}</span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleSaveEdit(idx)}
                              className="px-3 py-1 bg-emerald-600 text-white rounded-lg font-bold flex items-center gap-1"
                            >
                              <Check className="w-3.5 h-3.5" /> Save
                            </button>
                            <button
                              onClick={() => {
                                setEditingIndex(null);
                                setEditingDraft(null);
                              }}
                              className="px-3 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg font-bold"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-slate-500">Question Text (English)</label>
                          <textarea
                            value={editingDraft.question_text}
                            onChange={(e) => setEditingDraft({ ...editingDraft, question_text: e.target.value })}
                            rows={2}
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-slate-500">Hindi Text (Optional)</label>
                          <textarea
                            value={editingDraft.question_hi || ''}
                            onChange={(e) => setEditingDraft({ ...editingDraft, question_hi: e.target.value })}
                            rows={2}
                            placeholder="हिन्दी अनुवाद (यदि उपलब्ध हो)..."
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          {(['a', 'b', 'c', 'd'] as const).map((opt) => (
                            <div key={opt}>
                              <label className="text-[11px] font-bold text-slate-500 uppercase">Option {opt}</label>
                              <input
                                type="text"
                                value={(editingDraft as any)[`option_${opt}`]}
                                onChange={(e) =>
                                  setEditingDraft({ ...editingDraft, [`option_${opt}`]: e.target.value } as any)
                                }
                                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium"
                              />
                            </div>
                          ))}
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-[11px] font-bold text-slate-500">Correct Answer</label>
                            <select
                              value={editingDraft.correct_answer}
                              onChange={(e) => setEditingDraft({ ...editingDraft, correct_answer: e.target.value as any })}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-emerald-600"
                            >
                              <option value="A">Option A</option>
                              <option value="B">Option B</option>
                              <option value="C">Option C</option>
                              <option value="D">Option D</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-slate-500">Subject</label>
                            <input
                              type="text"
                              value={editingDraft.subject}
                              onChange={(e) => setEditingDraft({ ...editingDraft, subject: e.target.value })}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-slate-500">Chapter</label>
                            <input
                              type="text"
                              value={editingDraft.chapter}
                              onChange={(e) => setEditingDraft({ ...editingDraft, chapter: e.target.value })}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* QUESTION DISPLAY CARD */
                      <div className="space-y-3">
                        
                        {/* Top Meta Line */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={q.selected || false}
                              onChange={() => toggleSelectQuestion(idx)}
                              className="w-4 h-4 rounded text-purple-600 cursor-pointer"
                            />
                            <span className="font-black text-sm text-slate-900 dark:text-white">
                              Q{q.question_number}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-semibold">
                              📄 Page {q.source_page}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[10px] font-bold">
                              {q.subject} • {q.chapter}
                            </span>
                          </div>

                          {/* Badges & Actions */}
                          <div className="flex items-center gap-2">
                            {/* Answer Source badge */}
                            {q.answer_source === 'pdf_answer_key' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[10px] font-bold border border-blue-200 dark:border-blue-800">
                                📄 PDF Key ({q.correct_answer})
                              </span>
                            )}
                            {q.answer_source === 'pdf_inline' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold border border-emerald-200 dark:border-emerald-800">
                                📌 Inline Ans ({q.correct_answer})
                              </span>
                            )}
                            {q.answer_source === 'ai_determined' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 text-[10px] font-bold border border-purple-200 dark:border-purple-800">
                                🤖 AI Verified ({q.correct_answer})
                              </span>
                            )}
                            {q.answer_status === 'conflict' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-[10px] font-black border border-rose-200 dark:border-rose-800">
                                ⚠️ Answer Conflict
                              </span>
                            )}
                            {q.answer_status === 'needs_review' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-[10px] font-bold border border-amber-200 dark:border-amber-800">
                                ⚠️ Needs Review
                              </span>
                            )}

                            {/* Edit Button */}
                            <button
                              onClick={() => handleStartEdit(q, idx)}
                              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                              title="Edit Question"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {/* Auto Fix Button */}
                            <button
                              onClick={() => handleAutoFixQuestion(q, idx)}
                              className="p-1.5 text-purple-500 hover:text-purple-700 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-950/50 cursor-pointer"
                              title="Auto-Fix & Verify with AI"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Question Text (English & Hindi) */}
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-relaxed">
                            {q.question_text}
                          </p>
                          {q.question_hi && (
                            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                              {q.question_hi}
                            </p>
                          )}
                        </div>

                        {/* Options Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {(['A', 'B', 'C', 'D'] as const).map((letter) => {
                            const optKey = `option_${letter.toLowerCase()}` as keyof ExtractedPDFMCQ;
                            const optVal = String(q[optKey] || '');
                            const isCorrect = q.correct_answer === letter;

                            return (
                              <div
                                key={letter}
                                className={`px-3 py-2 rounded-xl flex items-start gap-2 border ${
                                  isCorrect
                                    ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-bold'
                                    : 'border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                                }`}
                              >
                                <span
                                  className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0 ${
                                    isCorrect
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                                  }`}
                                >
                                  {letter}
                                </span>
                                <span className="flex-1 break-words">{optVal || <em className="text-rose-500 font-normal">Missing choice</em>}</span>
                              </div>
                            );
                          })}
                        </div>

                        {/* Validation Issues / Conflict Notes */}
                        {q.validation_issues && q.validation_issues.length > 0 && (
                          <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-[11px] text-amber-800 dark:text-amber-300 space-y-0.5">
                            {q.validation_issues.map((iss, i) => (
                              <div key={i} className="flex items-center gap-1.5">
                                <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                                <span>{iss}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Explanation snippet if present */}
                        {q.explanation && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-2 rounded-xl">
                            <strong>Explanation:</strong> {q.explanation}
                          </div>
                        )}

                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* CONFIRM / CANCEL BUTTON BAR */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setExtractedQuestions([]);
                  setSummary(null);
                }}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                ← Extract Another PDF
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Close
                </button>

                <button
                  type="button"
                  onClick={handleConfirmImport}
                  disabled={selectedCount === 0 || isSaving}
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {isSaving
                      ? 'Saving into Database...'
                      : `Confirm & Import ${selectedCount} MCQs into ${targetDestination === 'bank' ? 'Question Bank' : 'Mock Test'}`}
                  </span>
                </button>
              </div>
            </div>

          </div>
        )}

      </div>
    </Modal>
  );
};

function LanguagesIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m5 8 6 6" />
      <path d="m4 14 6-6 2-3" />
      <path d="M2 5h12" />
      <path d="M7 2h1" />
      <path d="m22 22-5-10-5 10" />
      <path d="M14 18h6" />
    </svg>
  );
}
