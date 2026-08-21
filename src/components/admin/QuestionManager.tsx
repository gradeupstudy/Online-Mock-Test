import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Upload, 
  Eye, 
  ArrowLeft, 
  Check, 
  FileSpreadsheet, 
  Image as ImageIcon, 
  HelpCircle, 
  Sparkles, 
  FileText,
  Zap,
  ShieldCheck,
  Layers,
  BookOpen,
  Copy,
  Shuffle,
  Sliders,
  Settings2,
  MinusCircle,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { Test, Question } from '../../types';
import { dataService, generateUUID, shuffleQuestionOptions, shuffleAndBalanceQuestions, parseSafeNumber } from '../../services/dataService';
import { aiService } from '../../services/aiService';
import { Modal } from '../common/Modal';
import { AIQuestionGeneratorModal } from './AIQuestionGeneratorModal';
import { TextJsonImportModal } from './TextJsonImportModal';
import { MCQInspectionModal } from './MCQInspectionModal';
import { AISmartParseModal } from './AISmartParseModal';
import { BulkMCQInspectionModal } from './BulkMCQInspectionModal';
import { BulkAIExplanationModal } from './BulkAIExplanationModal';
import { QuestionBankImportModal } from './QuestionBankImportModal';

interface QuestionManagerProps {
  testId: string;
  onBackToTests: () => void;
  onOpenBulkImport: (testId: string) => void;
  onToast?: (type: 'success' | 'error' | 'info', msg: string) => void;
}

export const QuestionManager: React.FC<QuestionManagerProps> = ({
  testId,
  onBackToTests,
  onOpenBulkImport,
  onToast
}) => {
  const notify = (type: 'success' | 'error' | 'info', msg: string) => {
    if (typeof onToast === 'function') {
      onToast(type, msg);
    }
  };

  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isSmartParseOpen, setIsSmartParseOpen] = useState(false);
  const [isTextModalOpen, setIsTextModalOpen] = useState(false);
  const [isBankImportOpen, setIsBankImportOpen] = useState(false);
  const [isBulkInspectOpen, setIsBulkInspectOpen] = useState(false);
  const [isBulkExplanationOpen, setIsBulkExplanationOpen] = useState(false);
  
  // Bulk negative marking and marks controls
  const [bulkNegativeMarksInput, setBulkNegativeMarksInput] = useState<number>(0);
  const [bulkMarksInput, setBulkMarksInput] = useState<number>(1);
  const [isApplyingBulkMarks, setIsApplyingBulkMarks] = useState(false);
  const [showMarkingManager, setShowMarkingManager] = useState(false);

  // Selection states for batch actions on mock test questions
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(new Set());
  const [isGeneratingExplanationId, setIsGeneratingExplanationId] = useState<string | null>(null);
  const [isRegeneratingQuestionId, setIsRegeneratingQuestionId] = useState<string | null>(null);
  const [isGeneratingEditExplanation, setIsGeneratingEditExplanation] = useState(false);

  const [editingQuestion, setEditingQuestion] = useState<Partial<Question> | null>(null);
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);
  const [inspectingQuestion, setInspectingQuestion] = useState<Question | null>(null);
  const [deletingQuestionId, setDeletingQuestionId] = useState<string | null>(null);

  useEffect(() => {
    loadTestAndQuestions();
  }, [testId]);

  const loadTestAndQuestions = async () => {
    const t = await dataService.getTestBySlugOrId(testId);
    setTest(t);
    const qList = await dataService.getQuestions(testId);
    setQuestions(qList);
    setSelectedQuestionIds(new Set());
  };

  const handleOpenBankImportModal = () => {
    setIsBankImportOpen(true);
  };

  const handleApplyAllImprovements = async (improvedQuestions: Question[]) => {
    await dataService.saveQuestions(testId, improvedQuestions);
    setQuestions(improvedQuestions);
    notify('success', 'Applied 360° Quality Improvements to all questions in test!');
  };

  const handleApplyBulkExplanations = async (updatedQuestions: Question[]) => {
    await dataService.saveQuestions(testId, updatedQuestions);
    setQuestions(updatedQuestions);
    notify('success', 'Saved AI Explanations to all questions in test!');
  };

  // 1-Click Single AI Explanation Generation on question card
  const handleSingleAIExplain = async (q: Question) => {
    try {
      setIsGeneratingExplanationId(q.id);
      const explanation = await aiService.generateSingleExplanation(q, 'bilingual', 'step_by_step');
      const updatedQ: Question = { ...q, explanation };
      await dataService.saveQuestion(testId, updatedQ);
      setQuestions(prev => prev.map(item => item.id === q.id ? updatedQ : item));
      notify('success', `Generated AI explanation for Q${q.question_number}!`);
    } catch (err: any) {
      console.error('Failed to generate single AI explanation', err);
      notify('error', err?.message || 'Failed to generate explanation with AI.');
    } finally {
      setIsGeneratingExplanationId(null);
    }
  };

  // 1-Click Single Question Regeneration with AI
  const handleRegenerateQuestion = async (q: Question) => {
    try {
      setIsRegeneratingQuestionId(q.id);
      const newQuestion = await aiService.regenerateSingleQuestion(q);
      
      // Preserve core identifiers and mock test markings
      const updatedQ: Question = {
        ...newQuestion,
        id: q.id,
        test_id: testId,
        question_number: q.question_number,
        marks: q.marks !== undefined ? q.marks : (test?.marks_per_question ?? 1),
        negative_marks: q.negative_marks !== undefined ? q.negative_marks : (test?.negative_marking ?? 0),
      };

      const updatedList = questions.map((item) => (item.id === q.id ? updatedQ : item));
      await dataService.saveQuestions(testId, updatedList);
      setQuestions(updatedList);
      notify('success', `✨ Q${q.question_number} regenerated successfully with a fresh AI question!`);
    } catch (err: any) {
      console.error('Failed to regenerate question with AI', err);
      notify('error', err?.message || 'Failed to regenerate question with AI.');
    } finally {
      setIsRegeneratingQuestionId(null);
    }
  };

  // Generate explanation inside the edit modal
  const handleGenerateExplanationInEditModal = async () => {
    if (!editingQuestion?.question_text) {
      notify('error', 'Please enter question text first!');
      return;
    }
    try {
      setIsGeneratingEditExplanation(true);
      const explanation = await aiService.generateSingleExplanation(
        editingQuestion as Question,
        'bilingual',
        'step_by_step'
      );
      setEditingQuestion(prev => prev ? { ...prev, explanation } : null);
      notify('success', 'AI Explanation generated!');
    } catch (err: any) {
      notify('error', err?.message || 'Failed to generate explanation.');
    } finally {
      setIsGeneratingEditExplanation(false);
    }
  };

  // Multi-select handlers
  const handleToggleSelectAll = () => {
    if (selectedQuestionIds.size === filteredQuestions.length) {
      setSelectedQuestionIds(new Set());
    } else {
      setSelectedQuestionIds(new Set(filteredQuestions.map(q => q.id)));
    }
  };

  const handleToggleSelectQuestion = (id: string) => {
    setSelectedQuestionIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // 1-Click: Shuffle options for ALL questions in the mock test
  const handleShuffleAllTestOptions = async () => {
    if (questions.length === 0) {
      notify('error', 'No questions to shuffle!');
      return;
    }
    if (!window.confirm(`Kya aap sabhi ${questions.length} questions ke options (A, B, C, D) shuffle/randomize karna chahte hain? Correct answers 100% accurate rahenge aur evenly balance ho jayenge.`)) {
      return;
    }
    try {
      const shuffled = shuffleAndBalanceQuestions(questions);
      await dataService.saveQuestions(testId, shuffled);
      setQuestions(shuffled);
      notify('success', `🔀 Shuffled & balanced options for all ${shuffled.length} MCQs!`);
    } catch (err: any) {
      notify('error', err?.message || 'Failed to shuffle options.');
    }
  };

  // Shuffle options for only selected questions
  const handleShuffleSelectedOptions = async () => {
    if (selectedQuestionIds.size === 0) return;
    try {
      const targetQuestions = questions.filter(q => selectedQuestionIds.has(q.id));
      const balancedTargets = shuffleAndBalanceQuestions(targetQuestions);
      const targetMap = new Map(balancedTargets.map(q => [q.id, q]));
      
      const updated = questions.map(q => targetMap.get(q.id) || q);
      await dataService.saveQuestions(testId, updated);
      setQuestions(updated);
      notify('success', `🔀 Shuffled options for ${selectedQuestionIds.size} selected questions!`);
    } catch (err: any) {
      notify('error', err?.message || 'Failed to shuffle selected options.');
    }
  };

  // 1-Click single question option shuffle
  const handleSingleShuffle = async (q: Question) => {
    try {
      const shuffledQ = shuffleQuestionOptions(q);
      await dataService.saveQuestion(testId, shuffledQ);
      setQuestions(prev => prev.map(item => item.id === q.id ? shuffledQ : item));
      notify('success', `🔀 Options shuffled for Q${q.question_number} (New Ans: ${shuffledQ.correct_answer})`);
    } catch (err: any) {
      notify('error', err?.message || 'Failed to shuffle question options.');
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedQuestionIds.size === 0) return;
    if (window.confirm(`Are you sure you want to delete ${selectedQuestionIds.size} selected questions?`)) {
      const remaining = questions.filter(q => !selectedQuestionIds.has(q.id));
      const reindexed = remaining.map((q, idx) => ({ ...q, question_number: idx + 1 }));
      await dataService.saveQuestions(testId, reindexed);
      setQuestions(reindexed);
      setSelectedQuestionIds(new Set());
      notify('info', 'Deleted selected questions.');
    }
  };

  // Bulk update negative marking for selected or all questions
  const handleBulkUpdateNegativeMarks = async (targetNegMarks: number, applyToAll = false) => {
    const targetSet = applyToAll ? new Set(questions.map(q => q.id)) : selectedQuestionIds;
    if (targetSet.size === 0) {
      notify('error', 'Please select at least one question or use Apply to All.');
      return;
    }
    setIsApplyingBulkMarks(true);
    try {
      const updated = questions.map(q => {
        if (targetSet.has(q.id)) {
          return { ...q, negative_marks: targetNegMarks };
        }
        return q;
      });
      await dataService.saveQuestions(testId, updated);
      setQuestions(updated);
      notify('success', `Updated negative marking to ${targetNegMarks === 0 ? '0 (No Negative Marking)' : `-${targetNegMarks}`} for ${targetSet.size} questions!`);
    } catch (err: any) {
      notify('error', err?.message || 'Failed to update negative marks.');
    } finally {
      setIsApplyingBulkMarks(false);
    }
  };

  // Bulk update marks for selected or all questions
  const handleBulkUpdateMarks = async (targetMarks: number, applyToAll = false) => {
    const targetSet = applyToAll ? new Set(questions.map(q => q.id)) : selectedQuestionIds;
    if (targetSet.size === 0) {
      notify('error', 'Please select at least one question or use Apply to All.');
      return;
    }
    setIsApplyingBulkMarks(true);
    try {
      const updated = questions.map(q => {
        if (targetSet.has(q.id)) {
          return { ...q, marks: targetMarks };
        }
        return q;
      });
      await dataService.saveQuestions(testId, updated);
      setQuestions(updated);
      notify('success', `Updated positive marks to +${targetMarks} for ${targetSet.size} questions!`);
    } catch (err: any) {
      notify('error', err?.message || 'Failed to update marks.');
    } finally {
      setIsApplyingBulkMarks(false);
    }
  };

  // 1-Click Sync All Questions to Test Scheme
  const handleSyncAllToTestMarkingScheme = async () => {
    if (questions.length === 0) return;
    const testNeg = test?.negative_marking !== undefined ? parseSafeNumber(test.negative_marking, 0) : 0;
    const testMarks = test?.marks_per_question !== undefined ? parseSafeNumber(test.marks_per_question, 1) : 1;
    
    if (!window.confirm(`Kya aap is Mock Test ke sabhi ${questions.length} MCQs ko Mock Test Marking Scheme (+${testMarks} / -${testNeg}) me set karna chahte hain?`)) {
      return;
    }

    setIsApplyingBulkMarks(true);
    try {
      const updated = questions.map(q => ({
        ...q,
        marks: testMarks,
        negative_marks: testNeg,
      }));
      await dataService.saveQuestions(testId, updated);
      setQuestions(updated);
      notify('success', `Synced all ${questions.length} questions to Test Marking Scheme (+${testMarks} / -${testNeg})!`);
    } catch (err: any) {
      notify('error', err?.message || 'Failed to sync marking scheme.');
    } finally {
      setIsApplyingBulkMarks(false);
    }
  };

  const handleOpenAdd = () => {
    const nextNum = questions.length + 1;
    const defaultTestNeg = test?.negative_marking !== undefined ? parseSafeNumber(test.negative_marking, 0) : 0;
    const defaultTestMarks = test?.marks_per_question !== undefined ? parseSafeNumber(test.marks_per_question, 1) : 1;
    setEditingQuestion({
      id: generateUUID(),
      test_id: testId,
      question_number: nextNum,
      question_text: '',
      option_a: '',
      option_b: '',
      option_c: '',
      option_d: '',
      correct_answer: 'A',
      explanation: '',
      subject: test?.subject || 'General Studies',
      section: test?.sections?.[0] || 'General',
      chapter: 'General',
      topic: 'General Topic',
      difficulty: 'Medium',
      marks: defaultTestMarks,
      negative_marks: defaultTestNeg
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (q: Question) => {
    const defaultTestNeg = test?.negative_marking !== undefined ? parseSafeNumber(test.negative_marking, 0) : 0;
    const defaultTestMarks = test?.marks_per_question !== undefined ? parseSafeNumber(test.marks_per_question, 1) : 1;
    setEditingQuestion({
      ...q,
      marks: q.marks !== undefined ? parseSafeNumber(q.marks, defaultTestMarks) : defaultTestMarks,
      negative_marks: q.negative_marks !== undefined ? parseSafeNumber(q.negative_marks, defaultTestNeg) : defaultTestNeg
    });
    setIsModalOpen(true);
  };

  const handleSaveQuestion = async (e: React.FormEvent, addNext = false) => {
    e.preventDefault();
    if (!editingQuestion?.question_text || !editingQuestion.option_a || !editingQuestion.option_b) {
      notify('error', 'Please fill in question text and at least Options A and B!');
      return;
    }

    const defaultTestNeg = test?.negative_marking !== undefined ? parseSafeNumber(test.negative_marking, 0) : 0;
    const defaultTestMarks = test?.marks_per_question !== undefined ? parseSafeNumber(test.marks_per_question, 1) : 1;

    const toSave: Question = {
      ...(editingQuestion as Question),
      id: editingQuestion.id || generateUUID(),
      section: editingQuestion.subject || 'General',
      topic: editingQuestion.chapter || 'General',
      marks: editingQuestion.marks !== undefined ? parseSafeNumber(editingQuestion.marks, defaultTestMarks) : defaultTestMarks,
      negative_marks: editingQuestion.negative_marks !== undefined ? parseSafeNumber(editingQuestion.negative_marks, defaultTestNeg) : defaultTestNeg,
    };

    const saved = await dataService.saveQuestion(testId, toSave);
    notify('success', `Question ${saved.question_number} saved!`);
    await loadTestAndQuestions();

    if (addNext) {
      const updatedList = await dataService.getQuestions(testId);
      const nextNum = updatedList.length + 1;
      setEditingQuestion({
        id: generateUUID(),
        test_id: testId,
        question_number: nextNum,
        question_text: '',
        option_a: '',
        option_b: '',
        option_c: '',
        option_d: '',
        correct_answer: 'A',
        explanation: '',
        subject: editingQuestion.subject || 'General Studies',
        section: editingQuestion.subject || 'General',
        chapter: editingQuestion.chapter || 'General',
        topic: editingQuestion.chapter || 'General',
        difficulty: editingQuestion.difficulty || 'Medium',
        marks: editingQuestion.marks !== undefined ? editingQuestion.marks : defaultTestMarks,
        negative_marks: editingQuestion.negative_marks !== undefined ? editingQuestion.negative_marks : defaultTestNeg
      });
    } else {
      setIsModalOpen(false);
    }
  };

  const confirmDeleteQuestion = async () => {
    if (!deletingQuestionId) return;
    await dataService.deleteQuestion(testId, deletingQuestionId);
    notify('info', 'Question deleted successfully');
    setDeletingQuestionId(null);
    loadTestAndQuestions();
  };

  // Subjects for filter
  const subjects = Array.from(new Set(questions.map(q => q.subject))).filter(Boolean);

  const filteredQuestions = questions.filter(q => {
    const matchesSearch = q.question_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          q.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          q.chapter?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          q.topic?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = selectedSubject === 'all' || q.subject === selectedSubject;
    return matchesSearch && matchesSubject;
  });

  return (
    <div className="space-y-6">
      
      {/* Top Bar with Back Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToTests}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
              Mock Test Question Manager
            </span>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              {test?.title || 'Mock Test Questions'}
            </h1>
            <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
              <span>Code: {test?.test_code}</span>
              <span>•</span>
              <span>{questions.length} Questions</span>
              <span>•</span>
              <span>{test?.category}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* BATCH AI 360 INSPECTION (ALL AT ONCE) */}
          <button
            onClick={() => setIsBulkInspectOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-gradient-to-r from-amber-500 via-amber-600 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all cursor-pointer border border-amber-300/40"
            title="Inspect and Audit all MCQs in this test simultaneously"
          >
            <ShieldCheck className="w-4 h-4 text-slate-950" />
            <span>360° Inspect All MCQs</span>
          </button>

          {/* BATCH AI EXPLANATIONS (ALL AT ONCE) */}
          <button
            onClick={() => setIsBulkExplanationOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer"
            title="Generate or upgrade AI explanations for all MCQs at once"
          >
            <BookOpen className="w-4 h-4 text-blue-200" />
            <span>AI Explanations (Bulk)</span>
          </button>

          {/* SHUFFLE ALL OPTIONS (1-CLICK RANDOMIZE) */}
          <button
            onClick={handleShuffleAllTestOptions}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
            title="1-Click: Shuffle option positions (A/B/C/D) across all questions in this mock test to balance answers"
          >
            <Shuffle className="w-4 h-4 text-indigo-200" />
            <span>Shuffle Options</span>
          </button>

          <button
            onClick={() => setIsAiModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer border border-slate-700"
          >
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
            <span>AI MCQ Gen</span>
          </button>

          <button
            onClick={() => setIsSmartParseOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Zap className="w-4 h-4 text-emerald-200" />
            <span>AI Smart Parse</span>
          </button>

          <button
            onClick={handleOpenBankImportModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Copy className="w-4 h-4" />
            <span>Import from Bank</span>
          </button>

          <button
            onClick={() => setIsTextModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>Paste Text</span>
          </button>

          <button
            onClick={() => onOpenBulkImport(testId)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>CSV</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Question</span>
          </button>
        </div>
      </div>

      {/* MULTI-SELECT ACTION BAR (When 1 or more questions are selected) */}
      {selectedQuestionIds.size > 0 && (
        <div className="p-4 bg-gradient-to-r from-indigo-950 via-slate-900 to-blue-950 text-white rounded-2xl border border-indigo-500/30 shadow-lg space-y-3 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 font-black text-sm flex items-center justify-center">
                {selectedQuestionIds.size}
              </span>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-amber-300">
                  {selectedQuestionIds.size} MCQ(s) Selected
                </h4>
                <p className="text-[11px] text-slate-300">
                  Perform bulk AI actions or update negative marking across selected questions.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setIsBulkInspectOpen(true)}
                className="px-3.5 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>360° Inspect Selected ({selectedQuestionIds.size})</span>
              </button>

              <button
                onClick={() => setIsBulkExplanationOpen(true)}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Generate Explanations ({selectedQuestionIds.size})</span>
              </button>

              <button
                onClick={handleShuffleSelectedOptions}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                title="Shuffle option positions for selected questions"
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span>Shuffle Options ({selectedQuestionIds.size})</span>
              </button>

              <button
                onClick={handleDeleteSelected}
                className="px-3 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-bold text-xs rounded-xl border border-rose-500/30 transition-all flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Selected</span>
              </button>

              <button
                onClick={() => setSelectedQuestionIds(new Set())}
                className="px-3 py-2 text-xs font-bold text-slate-400 hover:text-white"
              >
                Deselect All
              </button>
            </div>
          </div>

          {/* BULK NEGATIVE MARKING CONTROLLER FOR SELECTED */}
          <div className="pt-3 border-t border-indigo-500/20 flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black text-amber-300 flex items-center gap-1">
                <MinusCircle className="w-3.5 h-3.5" /> Bulk Negative Marking:
              </span>
              {[0, 0.25, 0.33, 0.50, 1.0].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setBulkNegativeMarksInput(preset)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    bulkNegativeMarksInput === preset
                      ? 'bg-amber-400 text-slate-950 shadow-xs'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {preset === 0 ? '0 (No Negative)' : `-${preset}`}
                </button>
              ))}
              <div className="flex items-center gap-1 bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-700">
                <span className="text-[10px] text-slate-400 font-bold">Custom:</span>
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  value={bulkNegativeMarksInput}
                  onChange={(e) => setBulkNegativeMarksInput(e.target.value === '' ? 0 : parseFloat(e.target.value))}
                  className="w-14 bg-transparent text-xs font-bold text-white text-center outline-hidden"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isApplyingBulkMarks}
                onClick={() => handleBulkUpdateNegativeMarks(bulkNegativeMarksInput, false)}
                className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Apply {bulkNegativeMarksInput === 0 ? '0 Neg' : `-${bulkNegativeMarksInput}`} to Selected ({selectedQuestionIds.size})</span>
              </button>

              <button
                type="button"
                disabled={isApplyingBulkMarks}
                onClick={() => handleBulkUpdateNegativeMarks(bulkNegativeMarksInput, true)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition-all cursor-pointer disabled:opacity-50"
              >
                Apply to ALL ({questions.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MOCK TEST MARKING POLICY & SYNC TOOLBAR */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Mock Test Marking Scheme
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  +{parseSafeNumber(test?.marks_per_question, 1)} Marks Correct
                </span>
                <span className="text-xs text-slate-300 dark:text-slate-700">•</span>
                <span className={`text-xs font-bold ${
                  parseSafeNumber(test?.negative_marking, 0) > 0
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-blue-600 dark:text-blue-400'
                }`}>
                  {parseSafeNumber(test?.negative_marking, 0) > 0
                    ? `-${parseSafeNumber(test?.negative_marking, 0)} Negative Marking`
                    : '0 Negative Marking (No Deduction)'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleSyncAllToTestMarkingScheme}
            disabled={isApplyingBulkMarks || questions.length === 0}
            className="px-3.5 py-2 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-black text-xs rounded-xl border border-blue-200 dark:border-blue-800 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="1-Click: Set all questions in this mock test to the test's official marking scheme"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isApplyingBulkMarks ? 'animate-spin' : ''}`} />
            <span>⚡ Sync All MCQs to Test Scheme (+{parseSafeNumber(test?.marks_per_question, 1)} / -{parseSafeNumber(test?.negative_marking, 0)})</span>
          </button>

          <button
            onClick={() => setShowMarkingManager(!showMarkingManager)}
            className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer ${
              showMarkingManager
                ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
            }`}
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>{showMarkingManager ? 'Hide Marking Tool' : 'Bulk Marking Tool'}</span>
          </button>
        </div>
      </div>

      {/* EXPANDABLE BULK MARKING TOOL */}
      {showMarkingManager && (
        <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <MinusCircle className="w-4 h-4 text-rose-500" />
                <span>Bulk Update Negative Marking & Question Marks</span>
              </h3>
              <p className="text-xs text-slate-500">
                Update marks or negative marking for all questions or selected questions simultaneously.
              </p>
            </div>
            <div className="text-xs font-bold text-slate-600 dark:text-slate-300">
              Selected: <span className="text-blue-600 font-black">{selectedQuestionIds.size}</span> / Total: <span className="font-black">{questions.length}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Negative Marking Section */}
            <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                1. Set Negative Marking per wrong MCQ
              </label>
              
              <div className="flex flex-wrap items-center gap-1.5">
                {[0, 0.25, 0.33, 0.50, 1.0].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setBulkNegativeMarksInput(preset)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      bulkNegativeMarksInput === preset
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {preset === 0 ? '0 (No Negative)' : `-${preset}`}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs text-slate-500 font-bold">Custom Negative Mark:</span>
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  value={bulkNegativeMarksInput}
                  onChange={(e) => setBulkNegativeMarksInput(e.target.value === '' ? 0 : parseFloat(e.target.value))}
                  className="w-24 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                />
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  disabled={isApplyingBulkMarks || selectedQuestionIds.size === 0}
                  onClick={() => handleBulkUpdateNegativeMarks(bulkNegativeMarksInput, false)}
                  className="flex-1 px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  Apply {bulkNegativeMarksInput === 0 ? '0 Neg' : `-${bulkNegativeMarksInput}`} to Selected ({selectedQuestionIds.size})
                </button>
                <button
                  type="button"
                  disabled={isApplyingBulkMarks || questions.length === 0}
                  onClick={() => handleBulkUpdateNegativeMarks(bulkNegativeMarksInput, true)}
                  className="flex-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  Apply to ALL ({questions.length})
                </button>
              </div>
            </div>

            {/* Positive Marks Section */}
            <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                2. Set Positive Marks per correct MCQ
              </label>

              <div className="flex flex-wrap items-center gap-1.5">
                {[1, 2, 3, 4].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setBulkMarksInput(preset)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      bulkMarksInput === preset
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    +{preset} Mark{preset > 1 ? 's' : ''}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs text-slate-500 font-bold">Custom Positive Marks:</span>
                <input
                  type="number"
                  step="0.25"
                  min="0.25"
                  value={bulkMarksInput}
                  onChange={(e) => setBulkMarksInput(e.target.value === '' ? 1 : parseFloat(e.target.value))}
                  className="w-24 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                />
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  disabled={isApplyingBulkMarks || selectedQuestionIds.size === 0}
                  onClick={() => handleBulkUpdateMarks(bulkMarksInput, false)}
                  className="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  Apply +{bulkMarksInput} to Selected ({selectedQuestionIds.size})
                </button>
                <button
                  type="button"
                  disabled={isApplyingBulkMarks || questions.length === 0}
                  onClick={() => handleBulkUpdateMarks(bulkMarksInput, true)}
                  className="flex-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  Apply to ALL ({questions.length})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter, Search, and Select All Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3 flex-1">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-600 dark:text-slate-300 shrink-0">
            <input
              type="checkbox"
              checked={filteredQuestions.length > 0 && selectedQuestionIds.size === filteredQuestions.length}
              onChange={handleToggleSelectAll}
              className="w-4 h-4 rounded text-blue-600 cursor-pointer"
            />
            <span>Select All</span>
          </label>

          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search questions, options, chapter, topic..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-hidden"
            />
          </div>
        </div>

        <select
          value={selectedSubject}
          onChange={(e) => setSelectedSubject(e.target.value)}
          className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-hidden font-bold"
        >
          <option value="all">All Subjects ({questions.length})</option>
          {subjects.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        {filteredQuestions.map((q) => (
          <div
            key={q.id}
            className={`bg-white dark:bg-slate-900 rounded-2xl border p-6 shadow-xs transition-all space-y-3 ${
              selectedQuestionIds.has(q.id)
                ? 'border-indigo-500/60 ring-2 ring-indigo-500/20 bg-indigo-50/20 dark:bg-indigo-950/20'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-2.5 flex-wrap">
                <input
                  type="checkbox"
                  checked={selectedQuestionIds.has(q.id)}
                  onChange={() => handleToggleSelectQuestion(q.id)}
                  className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                />

                <span className="w-8 h-8 rounded-xl bg-blue-600 text-white font-black text-sm flex items-center justify-center shrink-0">
                  Q{q.question_number}
                </span>
                
                {q.subject && (
                  <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200 text-xs font-bold rounded-md border border-blue-200 dark:border-blue-900">
                    Subject: {q.subject}
                  </span>
                )}
                {q.section && (
                  <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 text-xs font-bold rounded-md border border-amber-200 dark:border-amber-900">
                    Section: {q.section}
                  </span>
                )}
                {q.chapter && q.chapter !== 'General' && (
                  <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 text-xs font-bold rounded-md">
                    Chapter: {q.chapter}
                  </span>
                )}
                {q.topic && q.topic !== 'General Topic' && (
                  <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-200 text-xs font-bold rounded-md">
                    Topic: {q.topic}
                  </span>
                )}

                {/* Question Marking Scheme Badges */}
                <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded-md border border-emerald-200 dark:border-emerald-800">
                  +{q.marks !== undefined ? q.marks : (test?.marks_per_question ?? 1)} M
                </span>
                <span className={`px-2 py-0.5 text-xs font-bold rounded-md border ${(q.negative_marks || 0) > 0 ? 'bg-rose-50 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'}`}>
                  -{(q.negative_marks !== undefined ? q.negative_marks : (test?.negative_marking ?? 0))} Neg
                </span>

                {q.quality_score ? (
                  <span className="px-2 py-0.5 bg-emerald-500 text-white text-xs font-bold rounded-md flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> QA {q.quality_score}/100
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs font-medium rounded-md">
                    Pending Audit
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {/* 1-Click AI Explain Button */}
                <button
                  onClick={() => handleSingleAIExplain(q)}
                  disabled={isGeneratingExplanationId === q.id}
                  className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-700 dark:text-blue-300 font-bold text-xs rounded-lg border border-blue-200 dark:border-blue-800 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  title="Generate or enhance AI explanation for this question"
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
                  className="px-2.5 py-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs rounded-lg shadow-xs flex items-center gap-1 mr-1 cursor-pointer"
                  title="360° AI Quality Audit & Polish"
                >
                  <ShieldCheck className="w-3.5 h-3.5 fill-slate-950" />
                  <span>360° Inspect</span>
                </button>

                {/* 1-Click AI Regenerate MCQ Button */}
                <button
                  onClick={() => handleRegenerateQuestion(q)}
                  disabled={isRegeneratingQuestionId === q.id}
                  className="px-2.5 py-1 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-bold text-xs rounded-lg border border-purple-200 dark:border-purple-800 flex items-center gap-1 cursor-pointer disabled:opacity-50 transition-all shadow-xs mr-1"
                  title="Regenerate: Replace this MCQ with a fresh, high-quality AI question for this topic"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-purple-600 dark:text-purple-400 ${isRegeneratingQuestionId === q.id ? 'animate-spin' : ''}`} />
                  <span>{isRegeneratingQuestionId === q.id ? 'Regenerating...' : 'Regenerate'}</span>
                </button>

                <button
                  onClick={() => setPreviewQuestion(q)}
                  className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  title="Preview Question"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleSingleShuffle(q)}
                  className="p-1.5 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  title="Shuffle options A/B/C/D for this question"
                >
                  <Shuffle className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleOpenEdit(q)}
                  className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  title="Edit Question"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeletingQuestionId(q.id)}
                  className="p-1.5 text-rose-500 hover:text-rose-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  title="Delete Question"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Question Text */}
            <p className="font-semibold text-base text-slate-900 dark:text-white leading-relaxed">
              {q.question_text}
            </p>

            {q.question_image && (
              <img src={q.question_image} alt="Question Visual" className="max-h-48 rounded-xl mb-4 border" />
            )}

            {/* Options Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm font-medium">
              <div className={`p-3 rounded-xl border flex items-center justify-between ${
                q.correct_answer === 'A'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800 font-bold'
                  : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
              }`}>
                <span>A. {q.option_a}</span>
                {q.correct_answer === 'A' && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
              </div>

              <div className={`p-3 rounded-xl border flex items-center justify-between ${
                q.correct_answer === 'B'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800 font-bold'
                  : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
              }`}>
                <span>B. {q.option_b}</span>
                {q.correct_answer === 'B' && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
              </div>

              <div className={`p-3 rounded-xl border flex items-center justify-between ${
                q.correct_answer === 'C'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800 font-bold'
                  : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
              }`}>
                <span>C. {q.option_c}</span>
                {q.correct_answer === 'C' && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
              </div>

              <div className={`p-3 rounded-xl border flex items-center justify-between ${
                q.correct_answer === 'D'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800 font-bold'
                  : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
              }`}>
                <span>D. {q.option_d}</span>
                {q.correct_answer === 'D' && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
              </div>
            </div>

            {/* Explanation box */}
            {q.explanation ? (
              <div className="p-3 bg-amber-50/60 dark:bg-amber-950/30 rounded-xl border border-amber-200/50 dark:border-amber-900/50 text-xs text-amber-900 dark:text-amber-200 flex items-start justify-between gap-2">
                <div>
                  <span className="font-bold text-amber-950 dark:text-amber-300">Explanation: </span> {q.explanation}
                </div>
                <button
                  onClick={() => handleSingleAIExplain(q)}
                  disabled={isGeneratingExplanationId === q.id}
                  className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-bold shrink-0"
                >
                  Upgrade
                </button>
              </div>
            ) : (
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-xs text-slate-500 flex items-center justify-between">
                <span>No explanation provided yet.</span>
                <button
                  onClick={() => handleSingleAIExplain(q)}
                  disabled={isGeneratingExplanationId === q.id}
                  className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3 text-blue-500" />
                  <span>Generate Explanation with AI</span>
                </button>
              </div>
            )}
          </div>
        ))}

        {questions.length === 0 && (
          <div className="py-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <p className="text-slate-500 text-sm">No questions created for this test yet.</p>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setIsAiModalOpen(true)}
                className="px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl shadow-sm"
              >
                Generate with AI
              </button>
              <button
                onClick={() => setIsSmartParseOpen(true)}
                className="px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-sm"
              >
                AI Smart Parse
              </button>
              <button
                onClick={handleOpenAdd}
                className="px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl shadow-sm"
              >
                Add Manually
              </button>
            </div>
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
            await dataService.saveQuestion(testId, updated);
            loadTestAndQuestions();
          }}
          onToast={notify}
        />
      )}

      {/* AI SMART PARSE MODAL */}
      <AISmartParseModal
        isOpen={isSmartParseOpen}
        testId={testId}
        defaultSubject={test?.subject || 'General Studies'}
        defaultSection={test?.sections?.[0] || 'General'}
        availableSections={test?.sections || []}
        onClose={() => setIsSmartParseOpen(false)}
        onSuccessImport={loadTestAndQuestions}
        onToast={notify}
      />

      {/* IMPORT FROM QUESTION BANK MODAL */}
      <QuestionBankImportModal
        isOpen={isBankImportOpen}
        testId={testId}
        testTitle={test?.title}
        existingQuestions={questions}
        onClose={() => setIsBankImportOpen(false)}
        onSuccessImport={loadTestAndQuestions}
        onToast={notify}
      />

      {/* ADD / EDIT QUESTION MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingQuestion?.id ? `Question #${editingQuestion.question_number}` : 'Add New Question'}
        maxWidth="2xl"
      >
        {editingQuestion && (
          <form onSubmit={(e) => handleSaveQuestion(e, false)} className="space-y-4">
            
            {/* SUBJECT & CHAPTER ROW */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-3">
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Q. Number
                </label>
                <input
                  type="number"
                  value={editingQuestion.question_number || 1}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, question_number: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold"
                />
              </div>

              <div className="sm:col-span-5">
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Subject Name *
                </label>
                <input
                  type="text"
                  required
                  value={editingQuestion.subject || ''}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, subject: e.target.value })}
                  placeholder="e.g. English Grammar"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold"
                />
              </div>

              <div className="sm:col-span-4">
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Chapter Name
                </label>
                <input
                  type="text"
                  value={editingQuestion.chapter || ''}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, chapter: e.target.value })}
                  placeholder="e.g. Noun, Tenses..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold"
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
                placeholder="Type question here..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-hidden"
              />
            </div>

            {/* Options A, B, C, D */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400">
                Answer Options *
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className="text-xs font-semibold text-slate-500 mb-1 block">Option A *</span>
                  <input
                    type="text"
                    required
                    value={editingQuestion.option_a || ''}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, option_a: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                  />
                </div>

                <div>
                  <span className="text-xs font-semibold text-slate-500 mb-1 block">Option B *</span>
                  <input
                    type="text"
                    required
                    value={editingQuestion.option_b || ''}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, option_b: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                  />
                </div>

                <div>
                  <span className="text-xs font-semibold text-slate-500 mb-1 block">Option C</span>
                  <input
                    type="text"
                    value={editingQuestion.option_c || ''}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, option_c: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                  />
                </div>

                <div>
                  <span className="text-xs font-semibold text-slate-500 mb-1 block">Option D</span>
                  <input
                    type="text"
                    value={editingQuestion.option_d || ''}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, option_d: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Answer & Marks */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Correct Answer
                </label>
                <select
                  value={editingQuestion.correct_answer || 'A'}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, correct_answer: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-emerald-600"
                >
                  <option value="A">Option A</option>
                  <option value="B">Option B</option>
                  <option value="C">Option C</option>
                  <option value="D">Option D</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Marks
                </label>
                <input
                  type="number"
                  step="0.25"
                  value={editingQuestion.marks !== undefined ? editingQuestion.marks : (test?.marks_per_question ?? 1)}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, marks: parseSafeNumber(e.target.value, 1) })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold"
                />
                <div className="flex gap-1 mt-1.5">
                  {[1, 2, 3, 4].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setEditingQuestion({ ...editingQuestion, marks: m })}
                      className={`text-[10px] px-1.5 py-0.5 rounded font-bold cursor-pointer ${
                        editingQuestion.marks === m
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {m}M
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Negative Marks
                </label>
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  value={editingQuestion.negative_marks !== undefined ? editingQuestion.negative_marks : (test?.negative_marking ?? 0)}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, negative_marks: parseSafeNumber(e.target.value, 0) })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-rose-600 dark:text-rose-400"
                />
                <div className="flex gap-1 mt-1.5">
                  {[0, 0.25, 0.33, 0.5, 1.0].map((neg) => (
                    <button
                      key={neg}
                      type="button"
                      onClick={() => setEditingQuestion({ ...editingQuestion, negative_marks: neg })}
                      className={`text-[10px] px-1.5 py-0.5 rounded font-bold cursor-pointer ${
                        editingQuestion.negative_marks === neg
                          ? 'bg-rose-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {neg === 0 ? '0 (None)' : `-${neg}`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400">
                  Detailed Explanation
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
                placeholder="Explain the correct solution, underlying rules, shortcuts, or concepts..."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
              />
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                Cancel
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={(e) => handleSaveQuestion(e, true)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-colors"
                >
                  Save & Add Next
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" /> Save Question
                </button>
              </div>
            </div>

          </form>
        )}
      </Modal>

      {/* PREVIEW MODAL */}
      <Modal
        isOpen={!!previewQuestion}
        onClose={() => setPreviewQuestion(null)}
        title={`Preview Question #${previewQuestion?.question_number}`}
        maxWidth="lg"
      >
        {previewQuestion && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200 text-xs font-bold rounded">
                {previewQuestion.subject}
              </span>
              <span className="text-xs text-slate-500">
                Chapter: {previewQuestion.chapter}
              </span>
            </div>

            <p className="text-base font-semibold text-slate-900 dark:text-white">
              {previewQuestion.question_text}
            </p>

            <div className="space-y-2">
              {['A', 'B', 'C', 'D'].map((opt) => {
                const optKey = `option_${opt.toLowerCase()}` as keyof Question;
                const optVal = previewQuestion[optKey];
                const isCorrect = previewQuestion.correct_answer === opt;
                return (
                  <div
                    key={opt}
                    className={`p-3 rounded-xl border text-sm font-medium flex items-center justify-between ${
                      isCorrect
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold dark:bg-emerald-950/60 dark:text-emerald-200'
                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <span>{opt}. {optVal}</span>
                    {isCorrect && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                  </div>
                );
              })}
            </div>

            {previewQuestion.explanation && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 text-xs text-amber-900 dark:text-amber-200">
                <span className="font-bold">Explanation: </span> {previewQuestion.explanation}
              </div>
            )}

            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 rounded-xl border border-emerald-200 text-xs text-emerald-900 dark:text-emerald-200">
              <span className="font-bold">Correct Answer: </span> Option {previewQuestion.correct_answer}
            </div>
          </div>
        )}
      </Modal>

      {/* SINGLE QUESTION 360° INSPECTION MODAL */}
      {inspectingQuestion && (
        <MCQInspectionModal
          isOpen={!!inspectingQuestion}
          question={inspectingQuestion}
          onClose={() => setInspectingQuestion(null)}
          onApplyImprovement={async (improvedQ) => {
            await dataService.saveQuestion(testId, improvedQ);
            setQuestions((prev) => prev.map((q) => (q.id === improvedQ.id ? improvedQ : q)));
            notify('success', `Updated and polished Question #${improvedQ.question_number}!`);
            setInspectingQuestion(null);
          }}
          onToast={notify}
        />
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
        onToast={notify}
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
        onToast={notify}
      />

      {/* AI QUESTION GENERATOR MODAL */}
      <AIQuestionGeneratorModal
        isOpen={isAiModalOpen}
        testId={testId}
        testNegativeMarking={test?.negative_marking}
        testMarksPerQuestion={test?.marks_per_question}
        defaultSubject={test?.subject || 'General Studies'}
        defaultSection={test?.sections?.[0] || 'General'}
        availableSections={test?.sections || []}
        onClose={() => setIsAiModalOpen(false)}
        onSuccessImport={loadTestAndQuestions}
        onToast={notify}
      />

      {/* PASTE TEXT OR JSON FILE IMPORT MODAL */}
      <TextJsonImportModal
        isOpen={isTextModalOpen}
        testId={testId}
        testNegativeMarking={test?.negative_marking}
        testMarksPerQuestion={test?.marks_per_question}
        defaultSubject={test?.subject || 'General Studies'}
        defaultSection={test?.sections?.[0] || 'General'}
        availableSections={test?.sections || []}
        onClose={() => setIsTextModalOpen(false)}
        onSuccessImport={loadTestAndQuestions}
        onToast={notify}
      />

      {/* Delete Question Confirmation Modal */}
      {deletingQuestionId && (
        <Modal
          isOpen={!!deletingQuestionId}
          onClose={() => setDeletingQuestionId(null)}
          title="Delete Question"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-700 dark:text-slate-300">
              Are you sure you want to delete this question from the test?
            </p>
            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setDeletingQuestionId(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteQuestion}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition-all"
              >
                Delete Question
              </button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
};
