import React, { useState, useEffect } from 'react';
import { 
  HelpCircle, 
  Search, 
  Plus, 
  Sparkles, 
  FileText, 
  Trash2, 
  Edit3, 
  Check, 
  ShieldCheck, 
  Filter, 
  Layers, 
  BookOpen, 
  Target, 
  ArrowRight, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  Award,
  Zap,
  Eye,
  Copy,
  ChevronDown
} from 'lucide-react';
import { Question, Test } from '../../types';
import { dataService } from '../../services/dataService';
import { aiService } from '../../services/aiService';
import { Modal } from '../common/Modal';
import { MCQInspectionModal } from './MCQInspectionModal';
import { AISmartParseModal } from './AISmartParseModal';
import { AIQuestionGeneratorModal } from './AIQuestionGeneratorModal';
import { BulkMCQInspectionModal } from './BulkMCQInspectionModal';
import { BulkAIExplanationModal } from './BulkAIExplanationModal';

interface QuestionBankViewProps {
  onNavigateToTest?: (testId: string) => void;
  onToast?: (type: 'success' | 'error' | 'info', msg: string) => void;
}

export const QuestionBankView: React.FC<QuestionBankViewProps> = ({
  onNavigateToTest,
  onToast,
}) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedChapter, setSelectedChapter] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [selectedInspectionStatus, setSelectedInspectionStatus] = useState('all');

  // Selected Questions for Batch Operations
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(new Set());
  const [isGeneratingExplanationId, setIsGeneratingExplanationId] = useState<string | null>(null);
  const [isGeneratingEditExplanation, setIsGeneratingEditExplanation] = useState(false);

  // Modals
  const [isAiGenModalOpen, setIsAiGenModalOpen] = useState(false);
  const [isSmartParseModalOpen, setIsSmartParseModalOpen] = useState(false);
  const [isBulkInspectOpen, setIsBulkInspectOpen] = useState(false);
  const [isBulkExplanationOpen, setIsBulkExplanationOpen] = useState(false);
  const [inspectingQuestion, setInspectingQuestion] = useState<Question | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<Partial<Question> | null>(null);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isCreateTestModalOpen, setIsCreateTestModalOpen] = useState(false);
  const [isAddToTestModalOpen, setIsAddToTestModalOpen] = useState(false);

  // New Test Form State
  const [newTestForm, setNewTestForm] = useState({
    title: '',
    category: 'Police / HP Exams',
    duration_minutes: 30,
    marks_per_question: 1,
    negative_marking: 0.25,
    passing_marks: 12,
    instructions: '1. Read all questions carefully.\n2. Negative marking is applicable for incorrect answers.',
    social_gate_enabled: true,
    anti_cheating_enabled: true,
  });

  // Target Test for adding
  const [targetTestId, setTargetTestId] = useState('');

  useEffect(() => {
    loadBankData();
  }, []);

  const loadBankData = async () => {
    setLoading(true);
    const [allQ, allTests] = await Promise.all([
      dataService.getAllQuestionBank(),
      dataService.getTests(true),
    ]);
    setQuestions(allQ);
    setTests(allTests);
    if (allTests.length > 0 && !targetTestId) {
      setTargetTestId(allTests[0].id);
    }
    setLoading(false);
  };

  // Distinct Filter options
  const distinctSubjects = Array.from(new Set(questions.map((q) => q.subject).filter(Boolean)));
  const distinctChapters = Array.from(
    new Set(
      questions
        .filter((q) => selectedSubject === 'all' || q.subject === selectedSubject)
        .map((q) => q.chapter)
        .filter(Boolean)
    )
  );

  // Filtered Questions List
  const filteredQuestions = questions.filter((q) => {
    const textMatch =
      !searchQuery ||
      q.question_text?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.chapter?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.topic?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.option_a?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.option_b?.toLowerCase().includes(searchQuery.toLowerCase());

    const subjectMatch = selectedSubject === 'all' || q.subject === selectedSubject;
    const chapterMatch = selectedChapter === 'all' || q.chapter === selectedChapter;
    const difficultyMatch = selectedDifficulty === 'all' || q.difficulty === selectedDifficulty;
    const inspectMatch =
      selectedInspectionStatus === 'all' ||
      (selectedInspectionStatus === 'verified' && q.inspection_status === 'verified') ||
      (selectedInspectionStatus === 'pending' && q.inspection_status !== 'verified');

    return textMatch && subjectMatch && chapterMatch && difficultyMatch && inspectMatch;
  });

  // Batch Selection Handlers
  const toggleSelectQuestion = (id: string) => {
    const next = new Set(selectedQuestionIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedQuestionIds(next);
  };

  const handleSelectAllFiltered = () => {
    if (selectedQuestionIds.size === filteredQuestions.length) {
      setSelectedQuestionIds(new Set());
    } else {
      setSelectedQuestionIds(new Set(filteredQuestions.map((q) => q.id)));
    }
  };

  // Manual Question Save
  const handleSaveManualQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestion?.question_text || !editingQuestion.option_a || !editingQuestion.option_b) {
      onToast?.('error', 'Please fill in question text and at least options A & B!');
      return;
    }

    const qToSave: Question = {
      id: editingQuestion.id || 'q-' + Date.now(),
      test_id: editingQuestion.test_id || 'bank',
      question_number: editingQuestion.question_number || questions.length + 1,
      question_text: editingQuestion.question_text,
      option_a: editingQuestion.option_a,
      option_b: editingQuestion.option_b,
      option_c: editingQuestion.option_c || '',
      option_d: editingQuestion.option_d || '',
      correct_answer: editingQuestion.correct_answer || 'A',
      explanation: editingQuestion.explanation || '',
      subject: editingQuestion.subject || 'General Studies',
      section: editingQuestion.subject || 'General',
      chapter: editingQuestion.chapter || 'General',
      topic: editingQuestion.chapter || 'General',
      difficulty: editingQuestion.difficulty || 'Medium',
      marks: editingQuestion.marks || 1,
      negative_marks: editingQuestion.negative_marks || 0.25,
      inspection_status: editingQuestion.inspection_status || 'pending',
    };

    await dataService.saveQuestionToBank(qToSave);
    onToast?.('success', 'Question saved to Question Bank!');
    setIsManualModalOpen(false);
    loadBankData();
  };

  // Delete Question
  const handleDeleteQuestion = async (qId: string) => {
    if (window.confirm('Are you sure you want to delete this question from Question Bank?')) {
      await dataService.deleteQuestionFromBank(qId);
      onToast?.('info', 'Question removed from Bank');
      setSelectedQuestionIds((prev) => {
        const next = new Set(prev);
        next.delete(qId);
        return next;
      });
      loadBankData();
    }
  };

  // Batch Delete
  const handleDeleteSelected = async () => {
    if (selectedQuestionIds.size === 0) return;
    if (
      window.confirm(`Are you sure you want to delete ${selectedQuestionIds.size} selected questions?`)
    ) {
      const idsToDelete: string[] = Array.from(selectedQuestionIds);
      for (const id of idsToDelete) {
        await dataService.deleteQuestionFromBank(id);
      }
      onToast?.('info', `Deleted ${selectedQuestionIds.size} questions from Bank`);
      setSelectedQuestionIds(new Set());
      loadBankData();
    }
  };

  // Create Mock Test from Selected Questions
  const handleConfirmCreateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTestForm.title.trim()) {
      onToast?.('error', 'Please enter a test title!');
      return;
    }

    const selectedList = questions.filter((q) => selectedQuestionIds.has(q.id));
    if (selectedList.length === 0) {
      onToast?.('error', 'Please select at least 1 question!');
      return;
    }

    const createdTest = await dataService.createTestFromQuestions(
      {
        ...newTestForm,
        total_questions: selectedList.length,
      },
      selectedList
    );

    onToast?.('success', `Created Mock Test "${createdTest.title}" with ${selectedList.length} questions!`);
    setIsCreateTestModalOpen(false);
    setSelectedQuestionIds(new Set());
    loadBankData();

    if (onNavigateToTest) {
      onNavigateToTest(createdTest.id);
    }
  };

  // Add Selected Questions to Existing Test
  const handleConfirmAddToTest = async () => {
    if (!targetTestId) {
      onToast?.('error', 'Please select a destination mock test!');
      return;
    }

    const selectedList = questions.filter((q) => selectedQuestionIds.has(q.id));
    if (selectedList.length === 0) {
      onToast?.('error', 'No questions selected!');
      return;
    }

    await dataService.addQuestionsToExistingTest(targetTestId, selectedList);
    onToast?.('success', `Added ${selectedList.length} questions to selected Mock Test!`);
    setIsAddToTestModalOpen(false);
    setSelectedQuestionIds(new Set());
    loadBankData();

    if (onNavigateToTest) {
      onNavigateToTest(targetTestId);
    }
  };

  // Bulk Apply Improvements
  const handleApplyAllImprovements = async (improvedQuestions: Question[]) => {
    for (const q of improvedQuestions) {
      await dataService.saveQuestionToBank(q);
    }
    onToast?.('success', `Applied 360° Quality Improvements to ${improvedQuestions.length} questions in Bank!`);
    loadBankData();
  };

  // Bulk Apply Explanations
  const handleApplyBulkExplanations = async (updatedQuestions: Question[]) => {
    for (const q of updatedQuestions) {
      await dataService.saveQuestionToBank(q);
    }
    onToast?.('success', `Saved AI Explanations to ${updatedQuestions.length} questions in Bank!`);
    loadBankData();
  };

  // Single Question AI Explain
  const handleSingleAIExplain = async (q: Question) => {
    try {
      setIsGeneratingExplanationId(q.id);
      const explanation = await aiService.generateSingleExplanation(q, 'bilingual', 'step_by_step');
      const updatedQ = { ...q, explanation };
      await dataService.saveQuestionToBank(updatedQ);
      setQuestions((prev) => prev.map((item) => (item.id === q.id ? updatedQ : item)));
      onToast?.('success', `Generated AI explanation for "${q.question_text.slice(0, 30)}..."!`);
    } catch (err: any) {
      onToast?.('error', err?.message || 'Failed to generate explanation.');
    } finally {
      setIsGeneratingExplanationId(null);
    }
  };

  // Manual Edit Modal AI Explanation
  const handleGenerateExplanationInEditModal = async () => {
    if (!editingQuestion?.question_text) {
      onToast?.('error', 'Please enter question text first!');
      return;
    }
    try {
      setIsGeneratingEditExplanation(true);
      const explanation = await aiService.generateSingleExplanation(
        editingQuestion as Question,
        'bilingual',
        'step_by_step'
      );
      setEditingQuestion((prev) => (prev ? { ...prev, explanation } : null));
      onToast?.('success', 'AI Explanation generated!');
    } catch (err: any) {
      onToast?.('error', err?.message || 'Failed to generate explanation.');
    } finally {
      setIsGeneratingEditExplanation(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* TOP HERO & REPOSITORY STATS */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white p-6 rounded-3xl border border-indigo-500/20 shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-blue-400" /> Master Repository
              </span>
              <span className="text-xs text-slate-400">
                {questions.length} Total MCQs Available
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              Central Question Bank & AI Suite
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Generate MCQs with Gemini AI, run 360° deep question inspections across all MCQs at once, smart parse exam papers, and assemble custom Mock Tests in 1-click.
            </p>
          </div>

          {/* ACTION BUTTONS GROUP */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* BULK 360 INSPECT BUTTON */}
            <button
              onClick={() => setIsBulkInspectOpen(true)}
              className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer border border-amber-300/40"
              title="Audit and improve quality for all bank questions at once"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>360° Inspect All</span>
            </button>

            {/* BULK EXPLANATIONS BUTTON */}
            <button
              onClick={() => setIsBulkExplanationOpen(true)}
              className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              title="Generate AI explanations for all bank questions at once"
            >
              <BookOpen className="w-4 h-4 text-blue-200" />
              <span>AI Explanations (Bulk)</span>
            </button>

            <button
              onClick={() => setIsAiGenModalOpen(true)}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer border border-slate-700"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>AI MCQ Generator</span>
            </button>

            <button
              onClick={() => setIsSmartParseModalOpen(true)}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <Zap className="w-4 h-4 text-emerald-200" />
              <span>AI Smart Parse</span>
            </button>

            <button
              onClick={() => {
                setEditingQuestion({
                  id: 'q-' + Date.now(),
                  test_id: 'bank',
                  question_text: '',
                  option_a: '',
                  option_b: '',
                  option_c: '',
                  option_d: '',
                  correct_answer: 'A',
                  explanation: '',
                  subject: distinctSubjects[0] || 'General Studies',
                  section: 'General',
                  chapter: 'General',
                  topic: 'General Topic',
                  difficulty: 'Medium',
                  marks: 1,
                  negative_marks: 0.25,
                });
                setIsManualModalOpen(true);
              }}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/20 backdrop-blur-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Question</span>
            </button>
          </div>
        </div>

        {/* QUICK STATS PILLS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-white/10 mt-6">
          <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Total Questions</span>
            <div className="text-xl font-black text-white">{questions.length}</div>
          </div>
          <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Unique Subjects</span>
            <div className="text-xl font-black text-blue-300">{distinctSubjects.length}</div>
          </div>
          <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">360° Inspected</span>
            <div className="text-xl font-black text-emerald-400">
              {questions.filter((q) => q.inspection_status === 'verified').length}
            </div>
          </div>
          <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Connected Mock Tests</span>
            <div className="text-xl font-black text-amber-300">{tests.length}</div>
          </div>
        </div>
      </div>

      {/* MULTI-DIMENSIONAL FILTERS & SEARCH */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* SEARCH INPUT */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by question text, subject, chapter, topic, options..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-hidden"
            />
          </div>

          {/* FILTER DROPDOWNS */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedSubject}
              onChange={(e) => {
                setSelectedSubject(e.target.value);
                setSelectedChapter('all');
              }}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold"
            >
              <option value="all">All Subjects ({distinctSubjects.length})</option>
              {distinctSubjects.map((s, i) => (
                <option key={i} value={s}>{s}</option>
              ))}
            </select>

            {distinctChapters.length > 0 && (
              <select
                value={selectedChapter}
                onChange={(e) => setSelectedChapter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
              >
                <option value="all">All Chapters</option>
                {distinctChapters.map((c, i) => (
                  <option key={i} value={c}>{c}</option>
                ))}
              </select>
            )}

            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
            >
              <option value="all">All Difficulties</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>

            <select
              value={selectedInspectionStatus}
              onChange={(e) => setSelectedInspectionStatus(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
            >
              <option value="all">All Inspection Status</option>
              <option value="verified">360° Inspected</option>
              <option value="pending">Pending Inspection</option>
            </select>
          </div>
        </div>

        {/* BATCH SELECTION ACTION BAR */}
        {selectedQuestionIds.size > 0 && (
          <div className="p-4 bg-indigo-50 dark:bg-indigo-950/60 rounded-2xl border-2 border-indigo-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center">
                {selectedQuestionIds.size}
              </span>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-indigo-950 dark:text-indigo-200">
                  {selectedQuestionIds.size} Question(s) Selected
                </h4>
                <p className="text-[11px] text-indigo-700 dark:text-indigo-300">
                  Perform bulk AI enhancements, create a new mock test, or transfer to an existing test.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* BATCH 360 INSPECT SELECTED */}
              <button
                onClick={() => setIsBulkInspectOpen(true)}
                className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>360° Inspect Selected ({selectedQuestionIds.size})</span>
              </button>

              {/* BATCH EXPLAIN SELECTED */}
              <button
                onClick={() => setIsBulkExplanationOpen(true)}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>AI Explanations ({selectedQuestionIds.size})</span>
              </button>

              <button
                onClick={() => {
                  setNewTestForm((prev) => ({
                    ...prev,
                    title: `Mock Test (${selectedQuestionIds.size} Questions)`,
                    duration_minutes: Math.max(15, selectedQuestionIds.size),
                    passing_marks: Math.round(selectedQuestionIds.size * 0.4),
                  }));
                  setIsCreateTestModalOpen(true);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Create Mock Test</span>
              </button>

              <button
                onClick={() => setIsAddToTestModalOpen(true)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Add to Existing Test</span>
              </button>

              <button
                onClick={handleDeleteSelected}
                className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs rounded-xl border border-rose-200 transition-all flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>

              <button
                onClick={() => setSelectedQuestionIds(new Set())}
                className="px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white"
              >
                Deselect
              </button>
            </div>
          </div>
        )}
      </div>

      {/* QUESTIONS LIST */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        
        {/* TABLE HEADER CONTROLS */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-slate-500">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={filteredQuestions.length > 0 && selectedQuestionIds.size === filteredQuestions.length}
              onChange={handleSelectAllFiltered}
              className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
            />
            <span>
              Showing {filteredQuestions.length} of {questions.length} Questions
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400">Click 360° or AI Explain on any card</span>
          </div>
        </div>

        {/* QUESTIONS ACCORDION / CARDS */}
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
            <p className="text-xs font-bold">Loading Central Question Bank...</p>
          </div>
        ) : filteredQuestions.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <HelpCircle className="w-12 h-12 mx-auto text-slate-300" />
            <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300">No Questions Found</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Generate new questions using AI, smart parse an exam paper, or adjust your search filters.
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setIsAiGenModalOpen(true)}
                className="px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl shadow-sm cursor-pointer"
              >
                Generate with AI
              </button>
              <button
                onClick={() => setIsSmartParseModalOpen(true)}
                className="px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-sm cursor-pointer"
              >
                AI Smart Parse
              </button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredQuestions.map((q, idx) => (
              <div 
                key={q.id || idx} 
                className={`p-5 transition-all space-y-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 ${selectedQuestionIds.has(q.id) ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <input
                      type="checkbox"
                      checked={selectedQuestionIds.has(q.id)}
                      onChange={() => toggleSelectQuestion(q.id)}
                      className="mt-1 w-4 h-4 rounded text-indigo-600 cursor-pointer"
                    />

                    <div className="space-y-1.5 flex-1">
                      {/* TAXONOMY BADGES */}
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
                        <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded-md">
                          {q.subject || 'General Studies'}
                        </span>
                        {q.section && q.section !== 'General' && (
                          <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 rounded-md">
                            Section: {q.section}
                          </span>
                        )}
                        {q.chapter && q.chapter !== 'General' && (
                          <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-md">
                            Chapter: {q.chapter}
                          </span>
                        )}
                        {q.topic && q.topic !== 'General Topic' && (
                          <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 rounded-md">
                            Topic: {q.topic}
                          </span>
                        )}
                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-md">
                          Level: {q.difficulty || 'Medium'}
                        </span>

                        {q.quality_score ? (
                          <span className="px-2 py-0.5 bg-emerald-500 text-white rounded-md flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" /> QA {q.quality_score}/100
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-800 text-slate-500 rounded-md">
                            Not Audited
                          </span>
                        )}
                      </div>

                      {/* QUESTION TEXT */}
                      <p className="text-sm font-bold text-slate-900 dark:text-white leading-relaxed">
                        {q.question_text}
                      </p>

                      {/* OPTIONS GRID */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                        <div className={`p-2 rounded-lg border ${q.correct_answer === 'A' ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 font-bold text-emerald-900 dark:text-emerald-300' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'}`}>
                          A. {q.option_a} {q.correct_answer === 'A' && '✓'}
                        </div>
                        <div className={`p-2 rounded-lg border ${q.correct_answer === 'B' ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 font-bold text-emerald-900 dark:text-emerald-300' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'}`}>
                          B. {q.option_b} {q.correct_answer === 'B' && '✓'}
                        </div>
                        <div className={`p-2 rounded-lg border ${q.correct_answer === 'C' ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 font-bold text-emerald-900 dark:text-emerald-300' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'}`}>
                          C. {q.option_c} {q.correct_answer === 'C' && '✓'}
                        </div>
                        <div className={`p-2 rounded-lg border ${q.correct_answer === 'D' ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 font-bold text-emerald-900 dark:text-emerald-300' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'}`}>
                          D. {q.option_d} {q.correct_answer === 'D' && '✓'}
                        </div>
                      </div>

                      {/* EXPLANATION */}
                      {q.explanation ? (
                        <div className="text-[11px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/80 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 flex items-start justify-between gap-2">
                          <p>
                            <b className="text-indigo-600 dark:text-indigo-400">Explanation:</b> {q.explanation}
                          </p>
                          <button
                            onClick={() => handleSingleAIExplain(q)}
                            disabled={isGeneratingExplanationId === q.id}
                            className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-bold shrink-0"
                          >
                            Regenerate
                          </button>
                        </div>
                      ) : (
                        <div className="p-2 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-xs text-slate-500 flex items-center justify-between">
                          <span>No explanation yet.</span>
                          <button
                            onClick={() => handleSingleAIExplain(q)}
                            disabled={isGeneratingExplanationId === q.id}
                            className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-1"
                          >
                            <Sparkles className="w-3 h-3 text-blue-500" />
                            <span>✦ AI Explain</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* QUESTION ACTIONS */}
                  <div className="flex flex-col sm:flex-row items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleSingleAIExplain(q)}
                      disabled={isGeneratingExplanationId === q.id}
                      className="px-2.5 py-1.5 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-700 dark:text-blue-300 font-bold text-xs rounded-xl border border-blue-200 dark:border-blue-800 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      title="Generate AI explanation for this question"
                    >
                      {isGeneratingExplanationId === q.id ? (
                        <Sparkles className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                      )}
                      <span>✦ AI Explain</span>
                    </button>

                    <button
                      onClick={() => setInspectingQuestion(q)}
                      title="360° AI Quality Audit & Polish"
                      className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 fill-slate-950" />
                      <span>360° Inspect</span>
                    </button>

                    <button
                      onClick={() => {
                        setEditingQuestion({ ...q });
                        setIsManualModalOpen(true);
                      }}
                      title="Edit Question"
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleDeleteQuestion(q.id)}
                      title="Delete Question"
                      className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* 360° DEGREE MCQ INSPECTION MODAL */}
      {inspectingQuestion && (
        <MCQInspectionModal
          isOpen={!!inspectingQuestion}
          question={inspectingQuestion}
          onClose={() => setInspectingQuestion(null)}
          onApplyImprovement={async (updated) => {
            await dataService.saveQuestionToBank(updated);
            loadBankData();
          }}
          onToast={onToast}
        />
      )}

      {/* AI SMART PARSE MODAL */}
      <AISmartParseModal
        isOpen={isSmartParseModalOpen}
        testId="bank"
        defaultSubject={selectedSubject !== 'all' ? selectedSubject : 'General Studies'}
        onClose={() => setIsSmartParseModalOpen(false)}
        onSuccessImport={() => loadBankData()}
        onToast={onToast}
      />

      {/* AI QUESTION GENERATOR MODAL */}
      <AIQuestionGeneratorModal
        isOpen={isAiGenModalOpen}
        testId="bank"
        defaultSubject={selectedSubject !== 'all' ? selectedSubject : 'General Studies'}
        onClose={() => setIsAiGenModalOpen(false)}
        onSuccessImport={() => loadBankData()}
        onToast={onToast}
      />

      {/* MANUAL QUESTION ADD/EDIT MODAL */}
      {isManualModalOpen && editingQuestion && (
        <Modal
          isOpen={isManualModalOpen}
          onClose={() => setIsManualModalOpen(false)}
          title={editingQuestion.id ? 'Edit Question' : 'Add Question to Bank'}
          maxWidth="3xl"
        >
          <form onSubmit={handleSaveManualQuestion} className="space-y-4">
            
            {/* SUBJECT & CHAPTER ROW */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Subject Name *
                </label>
                <input
                  type="text"
                  required
                  value={editingQuestion.subject || ''}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, subject: e.target.value })}
                  placeholder="e.g. English Grammar, General Studies"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Chapter Name
                </label>
                <input
                  type="text"
                  value={editingQuestion.chapter || ''}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, chapter: e.target.value })}
                  placeholder="e.g. Noun, Tenses, Rivers..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                Question Text *
              </label>
              <textarea
                rows={3}
                required
                value={editingQuestion.question_text || ''}
                onChange={(e) => setEditingQuestion({ ...editingQuestion, question_text: e.target.value })}
                placeholder="Enter complete question statement here..."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Option A *
                </label>
                <input
                  type="text"
                  required
                  value={editingQuestion.option_a || ''}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, option_a: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Option B *
                </label>
                <input
                  type="text"
                  required
                  value={editingQuestion.option_b || ''}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, option_b: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Option C
                </label>
                <input
                  type="text"
                  value={editingQuestion.option_c || ''}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, option_c: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Option D
                </label>
                <input
                  type="text"
                  value={editingQuestion.option_d || ''}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, option_d: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Correct Answer *
                </label>
                <select
                  value={editingQuestion.correct_answer || 'A'}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, correct_answer: e.target.value as any })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-emerald-600"
                >
                  <option value="A">Option A</option>
                  <option value="B">Option B</option>
                  <option value="C">Option C</option>
                  <option value="D">Option D</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Difficulty Level
                </label>
                <select
                  value={editingQuestion.difficulty || 'Medium'}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, difficulty: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                >
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Marks
                </label>
                <input
                  type="number"
                  step="0.25"
                  value={editingQuestion.marks || 1}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, marks: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400">
                  Explanation / Solution
                </label>
                <button
                  type="button"
                  onClick={handleGenerateExplanationInEditModal}
                  disabled={isGeneratingEditExplanation}
                  className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isGeneratingEditExplanation ? 'animate-spin' : 'text-blue-500'}`} />
                  <span>{isGeneratingEditExplanation ? 'Generating...' : '✦ AI Generate Solution'}</span>
                </button>
              </div>
              <textarea
                rows={3}
                value={editingQuestion.explanation || ''}
                onChange={(e) => setEditingQuestion({ ...editingQuestion, explanation: e.target.value })}
                placeholder="Detailed step-by-step solution..."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsManualModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:underline"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" /> Save Question
              </button>
            </div>

          </form>
        </Modal>
      )}

      {/* CREATE MOCK TEST FROM SELECTED QUESTIONS MODAL */}
      {isCreateTestModalOpen && (
        <Modal
          isOpen={isCreateTestModalOpen}
          onClose={() => setIsCreateTestModalOpen(false)}
          title={`Create Mock Test (${selectedQuestionIds.size} Questions Selected)`}
          maxWidth="2xl"
        >
          <form onSubmit={handleConfirmCreateTest} className="space-y-4">
            
            <div className="p-4 bg-indigo-50 dark:bg-indigo-950/40 rounded-2xl border border-indigo-200 dark:border-indigo-800 text-xs text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600 shrink-0" />
              <span>
                All <b>{selectedQuestionIds.size} selected questions</b> will be automatically organized into the new Mock Test with all options, keys, explanations, and sections intact.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                Mock Test Title *
              </label>
              <input
                type="text"
                required
                value={newTestForm.title}
                onChange={(e) => setNewTestForm({ ...newTestForm, title: e.target.value })}
                placeholder="e.g. HP Police Constable Full Mock Test 01"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Exam Category
                </label>
                <input
                  type="text"
                  value={newTestForm.category}
                  onChange={(e) => setNewTestForm({ ...newTestForm, category: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Duration (Minutes)
                </label>
                <input
                  type="number"
                  value={newTestForm.duration_minutes}
                  onChange={(e) => setNewTestForm({ ...newTestForm, duration_minutes: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Marks / Question
                </label>
                <input
                  type="number"
                  step="0.25"
                  value={newTestForm.marks_per_question}
                  onChange={(e) => setNewTestForm({ ...newTestForm, marks_per_question: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Negative Mark
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={newTestForm.negative_marking}
                  onChange={(e) => setNewTestForm({ ...newTestForm, negative_marking: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Passing Marks
                </label>
                <input
                  type="number"
                  value={newTestForm.passing_marks}
                  onChange={(e) => setNewTestForm({ ...newTestForm, passing_marks: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsCreateTestModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:underline"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" /> Create & Publish Mock Test
              </button>
            </div>

          </form>
        </Modal>
      )}

      {/* ADD TO EXISTING TEST MODAL */}
      {isAddToTestModalOpen && (
        <Modal
          isOpen={isAddToTestModalOpen}
          onClose={() => setIsAddToTestModalOpen(false)}
          title={`Add ${selectedQuestionIds.size} Question(s) to Existing Mock Test`}
          maxWidth="lg"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-500">
              Select the destination mock test to which the {selectedQuestionIds.size} selected questions will be appended.
            </p>

            <div className="space-y-2 max-h-64 overflow-y-auto p-1">
              {tests.map((t) => (
                <label
                  key={t.id}
                  className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${targetTestId === t.id ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 ring-1 ring-blue-500/30' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="destinationTest"
                      value={t.id}
                      checked={targetTestId === t.id}
                      onChange={() => setTargetTestId(t.id)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">
                        {t.title}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {t.category} • {t.total_questions || 0} existing questions
                      </div>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                    {t.test_code}
                  </span>
                </label>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsAddToTestModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:underline"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAddToTest}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" /> Add {selectedQuestionIds.size} Questions
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* BATCH 360° INSPECTION MODAL (ALL / SELECTED AT ONCE) */}
      <BulkMCQInspectionModal
        isOpen={isBulkInspectOpen}
        questions={
          selectedQuestionIds.size > 0
            ? questions.filter((q) => selectedQuestionIds.has(q.id))
            : questions
        }
        onClose={() => setIsBulkInspectOpen(false)}
        onApplyAllImprovements={handleApplyAllImprovements}
        onToast={onToast}
      />

      {/* BATCH AI EXPLANATION MODAL (ALL / SELECTED AT ONCE) */}
      <BulkAIExplanationModal
        isOpen={isBulkExplanationOpen}
        questions={
          selectedQuestionIds.size > 0
            ? questions.filter((q) => selectedQuestionIds.has(q.id))
            : questions
        }
        onClose={() => setIsBulkExplanationOpen(false)}
        onApplyExplanations={handleApplyBulkExplanations}
        onToast={onToast}
      />

    </div>
  );
};
