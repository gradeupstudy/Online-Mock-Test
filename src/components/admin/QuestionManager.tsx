import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit3, Trash2, Upload, Eye, ArrowLeft, Check, FileSpreadsheet, Image as ImageIcon, HelpCircle, Sparkles, FileText } from 'lucide-react';
import { Test, Question } from '../../types';
import { dataService } from '../../services/dataService';
import { Modal } from '../common/Modal';
import { AIQuestionGeneratorModal } from './AIQuestionGeneratorModal';
import { TextJsonImportModal } from './TextJsonImportModal';

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
  const [isTextModalOpen, setIsTextModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Partial<Question> | null>(null);
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);

  useEffect(() => {
    loadTestAndQuestions();
  }, [testId]);

  const loadTestAndQuestions = async () => {
    const t = await dataService.getTestBySlugOrId(testId);
    setTest(t);
    const qList = await dataService.getQuestions(testId);
    setQuestions(qList);
  };

  const handleOpenAdd = () => {
    const nextNum = questions.length + 1;
    setEditingQuestion({
      id: 'q-' + Date.now(),
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
      chapter: 'General',
      marks: test?.marks_per_question || 1,
      negative_marks: test?.negative_marking || 0.25
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (q: Question) => {
    setEditingQuestion({ ...q });
    setIsModalOpen(true);
  };

  const handleSaveQuestion = async (e: React.FormEvent, addNext = false) => {
    e.preventDefault();
    if (!editingQuestion?.question_text || !editingQuestion.option_a || !editingQuestion.option_b) {
      notify('error', 'Please fill in question text and at least Options A and B!');
      return;
    }

    const saved = await dataService.saveQuestion(testId, editingQuestion as Question);
    notify('success', `Question ${saved.question_number} saved!`);
    await loadTestAndQuestions();

    if (addNext) {
      const updatedList = await dataService.getQuestions(testId);
      const nextNum = updatedList.length + 1;
      setEditingQuestion({
        id: 'q-' + Date.now(),
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
        chapter: editingQuestion.chapter || 'General',
        marks: editingQuestion.marks || 1,
        negative_marks: editingQuestion.negative_marks || 0.25
      });
    } else {
      setIsModalOpen(false);
    }
  };

  const [deletingQuestionId, setDeletingQuestionId] = useState<string | null>(null);

  const handleDeleteQuestion = (qId: string) => {
    setDeletingQuestionId(qId);
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
                          q.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          q.chapter.toLowerCase().includes(searchQuery.toLowerCase());
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
              Question Bank
            </span>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              {test?.title || 'Mock Test Questions'}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsAiModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 hover:from-indigo-700 hover:to-blue-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all"
          >
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
            <span>AI Question Generator</span>
          </button>

          <button
            onClick={() => setIsTextModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all"
          >
            <FileText className="w-4 h-4" />
            <span>Paste Text / JSON</span>
          </button>

          <button
            onClick={() => onOpenBulkImport(testId)}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Bulk CSV</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Question</span>
          </button>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search questions, options, chapter..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-hidden"
          />
        </div>

        <select
          value={selectedSubject}
          onChange={(e) => setSelectedSubject(e.target.value)}
          className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-hidden"
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
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs hover:border-slate-300 transition-colors"
          >
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-blue-600 text-white font-black text-sm flex items-center justify-center shrink-0">
                  Q{q.question_number}
                </span>
                <div>
                  {q.section && (
                    <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200 text-xs font-bold rounded-md mr-1.5 border border-amber-200 dark:border-amber-800">
                      Section: {q.section}
                    </span>
                  )}
                  <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-md mr-2">
                    {q.subject}
                  </span>
                  <span className="text-xs text-slate-400">Chapter: {q.chapter}</span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPreviewQuestion(q)}
                  className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Preview Question"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleOpenEdit(q)}
                  className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Edit Question"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteQuestion(q.id)}
                  className="p-1.5 text-rose-500 hover:text-rose-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Delete Question"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Question Text */}
            <p className="font-semibold text-base text-slate-900 dark:text-white mb-4 leading-relaxed">
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
            {q.explanation && (
              <div className="mt-3 p-3 bg-amber-50/60 dark:bg-amber-950/30 rounded-xl border border-amber-200/50 dark:border-amber-900/50 text-xs text-amber-900 dark:text-amber-200">
                <span className="font-bold">Explanation: </span> {q.explanation}
              </div>
            )}
          </div>
        ))}

        {questions.length === 0 && (
          <div className="py-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <p className="text-slate-500 text-sm mb-3">No questions created for this test yet.</p>
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl"
            >
              Add First Question
            </button>
          </div>
        )}
      </div>

      {/* ADD / EDIT QUESTION MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingQuestion?.id ? `Question #${editingQuestion.question_number}` : 'Add New Question'}
        maxWidth="2xl"
      >
        {editingQuestion && (
          <form onSubmit={(e) => handleSaveQuestion(e, false)} className="space-y-4">
            
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Q. Number
                </label>
                <input
                  type="number"
                  value={editingQuestion.question_number || 1}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, question_number: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Section
                </label>
                {test?.sections && test.sections.length > 0 ? (
                  <select
                    value={editingQuestion.section || test.sections[0]}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, section: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold"
                  >
                    {test.sections.map((sec, i) => (
                      <option key={i} value={sec}>{sec}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={editingQuestion.section || ''}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, section: e.target.value })}
                    placeholder="e.g. Reasoning"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  value={editingQuestion.subject || ''}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, subject: e.target.value })}
                  placeholder="e.g. Indian Polity"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Chapter
                </label>
                <input
                  type="text"
                  value={editingQuestion.chapter || ''}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, chapter: e.target.value })}
                  placeholder="e.g. Constitution"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
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
                  <span className="text-xs font-semibold text-slate-500 mb-1 block">Option A</span>
                  <input
                    type="text"
                    required
                    value={editingQuestion.option_a || ''}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, option_a: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                  />
                </div>

                <div>
                  <span className="text-xs font-semibold text-slate-500 mb-1 block">Option B</span>
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
                    required
                    value={editingQuestion.option_c || ''}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, option_c: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                  />
                </div>

                <div>
                  <span className="text-xs font-semibold text-slate-500 mb-1 block">Option D</span>
                  <input
                    type="text"
                    required
                    value={editingQuestion.option_d || ''}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, option_d: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Correct Answer Selector */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Correct Option *
                </label>
                <select
                  value={editingQuestion.correct_answer || 'A'}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, correct_answer: e.target.value as any })}
                  className="w-full px-3 py-2.5 rounded-xl border border-blue-500 bg-blue-50/50 dark:bg-slate-800 font-bold text-blue-900 dark:text-blue-300 text-sm"
                >
                  <option value="A">Option A</option>
                  <option value="B">Option B</option>
                  <option value="C">Option C</option>
                  <option value="D">Option D</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Image URL (Optional)
                </label>
                <input
                  type="text"
                  value={editingQuestion.question_image || ''}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, question_image: e.target.value })}
                  placeholder="https://example.com/diagram.png"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                />
              </div>
            </div>

            {/* Explanation */}
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                Detailed Explanation
              </label>
              <textarea
                rows={2}
                value={editingQuestion.explanation || ''}
                onChange={(e) => setEditingQuestion({ ...editingQuestion, explanation: e.target.value })}
                placeholder="Explain why this answer is correct..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
              />
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-xs font-bold text-slate-500 hover:underline"
              >
                Cancel
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => handleSaveQuestion(e, true)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl transition-colors"
                >
                  Save & Add Next
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all"
                >
                  Save Question
                </button>
              </div>
            </div>

          </form>
        )}
      </Modal>

      {/* PREVIEW QUESTION MODAL */}
      <Modal
        isOpen={Boolean(previewQuestion)}
        onClose={() => setPreviewQuestion(null)}
        title="Student View Preview"
        maxWidth="lg"
      >
        {previewQuestion && (
          <div className="space-y-4 text-slate-900 dark:text-white">
            <span className="px-2.5 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-md">
              Question #{previewQuestion.question_number}
            </span>
            <h3 className="text-lg font-bold leading-relaxed">{previewQuestion.question_text}</h3>
            
            {previewQuestion.question_image && (
              <img src={previewQuestion.question_image} alt="Diagram" className="max-h-48 rounded-xl border" />
            )}

            <div className="space-y-2 pt-2">
              <div className="p-3 rounded-xl border bg-slate-50 dark:bg-slate-800 text-sm font-medium">A. {previewQuestion.option_a}</div>
              <div className="p-3 rounded-xl border bg-slate-50 dark:bg-slate-800 text-sm font-medium">B. {previewQuestion.option_b}</div>
              <div className="p-3 rounded-xl border bg-slate-50 dark:bg-slate-800 text-sm font-medium">C. {previewQuestion.option_c}</div>
              <div className="p-3 rounded-xl border bg-slate-50 dark:bg-slate-800 text-sm font-medium">D. {previewQuestion.option_d}</div>
            </div>

            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 rounded-xl border border-emerald-200 text-xs text-emerald-900 dark:text-emerald-200">
              <span className="font-bold">Correct Answer: </span> Option {previewQuestion.correct_answer}
            </div>
          </div>
        )}
      </Modal>

      {/* AI QUESTION GENERATOR MODAL */}
      <AIQuestionGeneratorModal
        isOpen={isAiModalOpen}
        testId={testId}
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
