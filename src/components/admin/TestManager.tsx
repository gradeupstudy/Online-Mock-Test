import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit3, Trash2, Copy, Share2, Eye, CheckCircle, XCircle, Settings, FileText, ArrowLeft, RefreshCw, Users, HelpCircle, CheckSquare, Layers } from 'lucide-react';
import { Test, TestStatus } from '../../types';
import { dataService, generateUUID, parseSafeNumber } from '../../services/dataService';
import { Modal } from '../common/Modal';

interface TestManagerProps {
  onSelectTestQuestions: (testId: string) => void;
  onViewTestResults?: (testId: string) => void;
  onPreviewTest: (testSlug: string) => void;
  onToast?: (type: 'success' | 'error' | 'info', msg: string) => void;
}

export const TestManager: React.FC<TestManagerProps> = ({
  onSelectTestQuestions,
  onViewTestResults,
  onPreviewTest,
  onToast
}) => {
  const notify = (type: 'success' | 'error' | 'info', msg: string) => {
    if (typeof onToast === 'function') {
      onToast(type, msg);
    }
  };
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<Partial<Test> | null>(null);
  const [deletingTest, setDeletingTest] = useState<Test | null>(null);

  useEffect(() => {
    loadTests();
  }, []);

  const loadTests = async () => {
    setLoading(true);
    try {
      const fetched = await dataService.getTests(true);
      setTests(fetched);
    } catch (e) {
      console.error('Failed to load tests', e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    const code = 'HPPC-' + Math.floor(1000 + Math.random() * 9000);
    const newId = generateUUID();
    setEditingTest({
      id: newId,
      test_code: code,
      title: '',
      slug: '',
      description: '',
      category: 'Police Exam',
      subject: 'General Paper',
      total_questions: 20,
      total_marks: 20.0,
      marks_per_question: 1.0,
      negative_marking: 0.25,
      duration_minutes: 15,
      passing_marks: 8.0,
      instructions: '1. Duration is 15 minutes.\n2. Each question carries 1 mark.\n3. Negative marking: 0.25 marks per wrong answer.\n4. Complete all questions before submitting.',
      status: 'published',
      is_published: true,
      social_gate_enabled: true,
      anti_cheating_enabled: true,
      randomize_questions: false,
      randomize_options: false,
      allow_back_navigation: true,
      allow_mark_for_review: true,
      show_result_immediately: true,
      show_correct_answers: true,
      show_explanation: true,
      enable_leaderboard: true,
      max_attempts_per_student: 1
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (test: Test) => {
    setEditingTest({ ...test });
    setIsModalOpen(true);
  };

  const handleSaveTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTest?.title || !editingTest.test_code) {
      notify('error', 'Test Title and Test Code are required!');
      return;
    }

    const slug = editingTest.slug
      ? editingTest.slug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
      : editingTest.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

    const totalQuestions = parseSafeNumber(editingTest.total_questions, 10);
    const marksPerQuestion = parseSafeNumber(editingTest.marks_per_question, 1);
    const totalMarks = parseSafeNumber(editingTest.total_marks, totalQuestions * marksPerQuestion);
    const negativeMark = parseSafeNumber(editingTest.negative_marking, 0.25);
    const duration = parseSafeNumber(editingTest.duration_minutes, 15);
    const passingMarks = parseSafeNumber(editingTest.passing_marks, totalMarks * 0.4);

    const testToSave: Test = {
      ...(editingTest as Test),
      id: editingTest.id || generateUUID(),
      slug: slug || `test-${Date.now()}`,
      category: editingTest.category || 'Police Exam',
      subject: editingTest.subject || 'General Paper',
      total_questions: totalQuestions,
      marks_per_question: marksPerQuestion,
      total_marks: totalMarks,
      negative_marking: negativeMark,
      duration_minutes: duration,
      passing_marks: passingMarks,
      status: (editingTest.status as TestStatus) || 'published',
      is_published: editingTest.status === 'published' || editingTest.is_published === true
    };

    const saved = await dataService.saveTest(testToSave);
    notify('success', `Mock test "${saved.title}" saved successfully!`);
    setIsModalOpen(false);
    await loadTests();
  };

  const handleTogglePublish = async (test: Test) => {
    const updatedStatus: TestStatus = test.status === 'published' ? 'unpublished' : 'published';
    const updated: Test = {
      ...test,
      status: updatedStatus,
      is_published: updatedStatus === 'published'
    };
    await dataService.saveTest(updated);
    notify('info', `Test status changed to ${updatedStatus}`);
    loadTests();
  };

  const handleDuplicate = async (testId: string) => {
    const duplicated = await dataService.duplicateTest(testId);
    if (duplicated) {
      notify('success', `Test duplicated as "${duplicated.title}"`);
      loadTests();
    }
  };

  const handleDelete = (test: Test) => {
    setDeletingTest(test);
  };

  const confirmDeleteTest = async () => {
    if (!deletingTest) return;
    await dataService.deleteTest(deletingTest.id);
    notify('success', `Mock test "${deletingTest.title}" deleted successfully`);
    setDeletingTest(null);
    loadTests();
  };

  const handleCopyLink = (slug: string) => {
    const url = dataService.getPublicShareableUrl(slug);
    navigator.clipboard.writeText(url);
    notify('success', 'Public shareable test URL copied!');
  };

  // Filtered tests
  const filteredTests = tests.filter((t) => {
    const matchesQuery = t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         t.test_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         t.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || t.category === filterCategory;
    const matchesStatus = filterStatus === 'all' || t.status === filterStatus;
    return matchesQuery && matchesCategory && matchesStatus;
  });

  return (
    <div className="space-y-6">
      
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Mock Test Manager</h1>
          <p className="text-xs text-slate-500">Create, configure, publish, and duplicate online mock exams</p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Create Mock Test</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="md:col-span-2 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search test name, code, category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-hidden"
          />
        </div>

        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-hidden"
        >
          <option value="all">All Categories</option>
          <option value="Police Exam">Police Exam</option>
          <option value="Revenue Exam">Revenue Exam</option>
          <option value="Teacher Exam">Teacher Exam</option>
          <option value="General Exam">General Exam</option>
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-hidden"
        >
          <option value="all">All Statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="unpublished">Unpublished</option>
        </select>
      </div>

      {/* Tests Grid / Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTests.map((test) => (
          <div
            key={test.id}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between shadow-xs hover:border-blue-300 dark:hover:border-blue-700 transition-all"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="px-2.5 py-0.5 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-md">
                  {test.category}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  test.is_published
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                }`}>
                  {test.is_published ? 'Published' : 'Draft'}
                </span>
              </div>

              <h3 className="text-base font-bold text-slate-900 dark:text-white line-clamp-2 mb-1">
                {test.title}
              </h3>
              {test.is_multisection && test.sections && test.sections.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200 text-[10px] font-black rounded-md border border-amber-200 dark:border-amber-800">
                    Multi-Section ({test.sections.length}): {test.sections.join(', ')}
                  </span>
                </div>
              )}
              <p className="text-xs text-slate-500 line-clamp-2 mb-4">
                {test.description || 'No description provided.'}
              </p>

              {/* Specs Badge Pill Grid */}
              <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl text-center text-xs mb-4">
                <div>
                  <p className="font-black text-slate-900 dark:text-white">{test.total_questions}</p>
                  <p className="text-[10px] text-slate-400 uppercase">Questions</p>
                </div>
                <div>
                  <p className="font-black text-slate-900 dark:text-white">{test.duration_minutes}m</p>
                  <p className="text-[10px] text-slate-400 uppercase">Duration</p>
                </div>
                <div>
                  <p className="font-black text-slate-900 dark:text-white">{test.negative_marking}</p>
                  <p className="text-[10px] text-slate-400 uppercase">Neg Mark</p>
                </div>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between gap-1.5">
                <button
                  onClick={() => onSelectTestQuestions(test.id)}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1"
                >
                  <FileText className="w-3.5 h-3.5" /> Questions ({test.total_questions})
                </button>
                {onViewTestResults && (
                  <button
                    onClick={() => onViewTestResults(test.id)}
                    className="px-2.5 py-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-xl transition-colors font-bold text-xs flex items-center gap-1"
                    title="View Student Results & Leaderboard"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Results</span>
                  </button>
                )}
                <button
                  onClick={() => onPreviewTest(test.slug)}
                  className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl transition-colors"
                  title="Preview Test"
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 gap-1">
                <button
                  onClick={() => handleCopyLink(test.slug)}
                  className="inline-flex items-center gap-1 hover:text-blue-600 font-medium"
                >
                  <Share2 className="w-3.5 h-3.5" /> Copy Link
                </button>
                <button
                  onClick={() => handleTogglePublish(test)}
                  className={`font-semibold ${test.is_published ? 'text-amber-600' : 'text-emerald-600'}`}
                >
                  {test.is_published ? 'Unpublish' : 'Publish'}
                </button>
                <button
                  onClick={() => handleOpenEditModal(test)}
                  className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  title="Edit Settings"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDuplicate(test.id)}
                  className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  title="Duplicate Test"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(test)}
                  className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors"
                  title="Delete Test"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          </div>
        ))}

        {filteredTests.length === 0 && (
          <div className="col-span-full py-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <p className="text-slate-500 text-sm">No mock tests found matching your filter criteria.</p>
          </div>
        )}
      </div>

      {/* CREATE / EDIT TEST MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTest?.id && tests.some(t => t.id === editingTest.id) ? "Edit Mock Test" : "Create New Mock Test"}
        maxWidth="2xl"
      >
        {editingTest && (
          <form onSubmit={handleSaveTest} className="space-y-4 text-slate-900 dark:text-white">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Mock Test Title *
                </label>
                <input
                  type="text"
                  required
                  value={editingTest.title || ''}
                  onChange={(e) => setEditingTest({ ...editingTest, title: e.target.value })}
                  placeholder="e.g. HP Police Constable Mock Test – 01"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Test Code *
                </label>
                <input
                  type="text"
                  required
                  value={editingTest.test_code || ''}
                  onChange={(e) => setEditingTest({ ...editingTest, test_code: e.target.value })}
                  placeholder="HPPC001"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400">
                  Custom Link Keyword / URL Slug (Apne mutabiq link name set karein)
                </label>
                <span className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold">
                  Preview: ?t={editingTest.slug || 'custom-keyword'}
                </span>
              </div>
              <input
                type="text"
                value={editingTest.slug || ''}
                onChange={(e) => setEditingTest({ ...editingTest, slug: e.target.value })}
                placeholder="e.g. hp-police-test-1, maths-mock-5, gk-special"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-hidden font-mono"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Is keyword ke sath aapka short link banega: <code className="text-blue-600 dark:text-blue-400 font-bold">{dataService.getPublicShareableUrl(editingTest.slug || 'custom-keyword')}</code>
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                Description
              </label>
              <textarea
                rows={2}
                value={editingTest.description || ''}
                onChange={(e) => setEditingTest({ ...editingTest, description: e.target.value })}
                placeholder="Short overview of the syllabus and target exam"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-hidden"
              />
            </div>

            {/* Section Configuration */}
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-900 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wider block">
                    Mock Test Section Structure
                  </label>
                  <p className="text-[11px] text-amber-700 dark:text-amber-300">
                    Choose whether this test has a single section or multiple sections (e.g., Reasoning, Maths, English, GK).
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingTest({ ...editingTest, is_multisection: false })}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      !editingTest.is_multisection
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    Single Section
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingTest({
                      ...editingTest,
                      is_multisection: true,
                      sections: editingTest.sections && editingTest.sections.length > 0 ? editingTest.sections : ['General Knowledge', 'Reasoning Ability', 'Quantitative Aptitude', 'General English']
                    })}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      editingTest.is_multisection
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    Multiple Sections
                  </button>
                </div>
              </div>

              {editingTest.is_multisection && (
                <div className="pt-2">
                  <label className="block text-[11px] font-bold text-amber-900 dark:text-amber-200 mb-1">
                    Section Names (Comma Separated)
                  </label>
                  <input
                    type="text"
                    value={(editingTest.sections || []).join(', ')}
                    onChange={(e) => {
                      const secs = e.target.value.split(',').map((s) => s.trim()).filter(Boolean);
                      setEditingTest({ ...editingTest, sections: secs });
                    }}
                    placeholder="e.g. Reasoning Ability, Quantitative Aptitude, General English, HP GK"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                  />
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {(editingTest.sections || []).map((sec, idx) => (
                      <span key={idx} className="px-2.5 py-0.5 bg-amber-200 dark:bg-amber-900/80 text-amber-900 dark:text-amber-100 rounded-lg text-[11px] font-bold">
                        Section {idx + 1}: {sec}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Category & Subject */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Exam Category / Course *
                </label>
                <input
                  type="text"
                  required
                  value={editingTest.category || ''}
                  onChange={(e) => setEditingTest({ ...editingTest, category: e.target.value })}
                  placeholder="e.g. Police Exam, HP Forest Guard, Patwari, HPAS"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Subject / Paper Name
                </label>
                <input
                  type="text"
                  value={editingTest.subject || ''}
                  onChange={(e) => setEditingTest({ ...editingTest, subject: e.target.value })}
                  placeholder="e.g. Full Syllabus Mock Test, Hindi & English, GK"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>
            </div>

            {/* Questions & Marks Configuration */}
            <div className="p-3.5 bg-blue-50/60 dark:bg-blue-950/30 rounded-xl border border-blue-200/80 dark:border-blue-900/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                  <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  Questions & Marks Setup
                </span>
                <span className="text-[11px] text-blue-700 dark:text-blue-300">
                  Target: <b>{editingTest.total_questions || 0} Questions</b> | <b>{editingTest.total_marks || 0} Total Marks</b>
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Total Questions *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    required
                    value={editingTest.total_questions ?? 20}
                    onChange={(e) => {
                      const num = parseInt(e.target.value) || 0;
                      const marksPerQ = editingTest.marks_per_question ?? 1;
                      setEditingTest({
                        ...editingTest,
                        total_questions: num,
                        total_marks: num * marksPerQ
                      });
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white"
                  />
                  <div className="flex gap-1 mt-1.5">
                    {[10, 20, 50, 80, 100].map((count) => (
                      <button
                        key={count}
                        type="button"
                        onClick={() => {
                          const marksPerQ = editingTest.marks_per_question ?? 1;
                          setEditingTest({
                            ...editingTest,
                            total_questions: count,
                            total_marks: count * marksPerQ
                          });
                        }}
                        className={`text-[10px] px-1.5 py-0.5 rounded font-semibold transition-all ${
                          editingTest.total_questions === count
                            ? 'bg-blue-600 text-white'
                            : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {count}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Marks / Question *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    required
                    value={editingTest.marks_per_question ?? 1.0}
                    onChange={(e) => {
                      const marksPerQ = parseFloat(e.target.value) || 1;
                      const num = editingTest.total_questions ?? 0;
                      setEditingTest({
                        ...editingTest,
                        marks_per_question: marksPerQ,
                        total_marks: num * marksPerQ
                      });
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Total Marks
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={editingTest.total_marks ?? 20.0}
                    onChange={(e) => setEditingTest({ ...editingTest, total_marks: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-blue-600 dark:text-blue-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Negative Mark
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    value={editingTest.negative_marking ?? 0.25}
                    onChange={(e) => setEditingTest({ ...editingTest, negative_marking: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-rose-600 dark:text-rose-400"
                  />
                  <div className="flex gap-1 mt-1.5">
                    {[0, 0.25, 0.33, 0.5].map((neg) => (
                      <button
                        key={neg}
                        type="button"
                        onClick={() => setEditingTest({ ...editingTest, negative_marking: neg })}
                        className={`text-[10px] px-1.5 py-0.5 rounded font-semibold transition-all ${
                          editingTest.negative_marking === neg
                            ? 'bg-rose-600 text-white'
                            : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {neg === 0 ? 'None' : `-${neg}`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Duration (Minutes) *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={editingTest.duration_minutes ?? 15}
                  onChange={(e) => setEditingTest({ ...editingTest, duration_minutes: parseInt(e.target.value) || 15 })}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Passing Marks
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={editingTest.passing_marks ?? 8.0}
                  onChange={(e) => setEditingTest({ ...editingTest, passing_marks: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Publish Status *
                </label>
                <select
                  value={editingTest.status || 'published'}
                  onChange={(e) => setEditingTest({ ...editingTest, status: e.target.value as TestStatus, is_published: e.target.value === 'published' })}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-emerald-600 dark:text-emerald-400"
                >
                  <option value="published">🟢 Published (Live for Students)</option>
                  <option value="draft">🟡 Draft (Admin Only)</option>
                  <option value="unpublished">🔴 Unpublished (Hidden)</option>
                </select>
              </div>
            </div>

            {/* Checkbox Settings */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Test Features & Rules</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                
                <label className="flex items-center gap-2 cursor-pointer p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
                  <input
                    type="checkbox"
                    checked={editingTest.social_gate_enabled ?? true}
                    onChange={(e) => setEditingTest({ ...editingTest, social_gate_enabled: e.target.checked })}
                    className="rounded text-blue-600"
                  />
                  <span>Enable Social Follow Gate</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
                  <input
                    type="checkbox"
                    checked={editingTest.anti_cheating_enabled ?? true}
                    onChange={(e) => setEditingTest({ ...editingTest, anti_cheating_enabled: e.target.checked })}
                    className="rounded text-blue-600"
                  />
                  <span>Anti-Cheating Protection</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
                  <input
                    type="checkbox"
                    checked={editingTest.randomize_options ?? false}
                    onChange={(e) => setEditingTest({ ...editingTest, randomize_options: e.target.checked })}
                    className="rounded text-blue-600"
                  />
                  <span>Randomize Answer Options</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
                  <input
                    type="checkbox"
                    checked={editingTest.enable_leaderboard ?? true}
                    onChange={(e) => setEditingTest({ ...editingTest, enable_leaderboard: e.target.checked })}
                    className="rounded text-blue-600"
                  />
                  <span>Enable Public Leaderboard</span>
                </label>

              </div>
            </div>

            {/* Modal Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:underline"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md transition-all"
              >
                Save Mock Test
              </button>
            </div>

          </form>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      {deletingTest && (
        <Modal
          isOpen={!!deletingTest}
          onClose={() => setDeletingTest(null)}
          title="Delete Mock Test"
        >
          <div className="space-y-4">
            <div className="p-4 bg-rose-50 dark:bg-rose-950/40 rounded-2xl border border-rose-200 dark:border-rose-900 flex items-start gap-3">
              <Trash2 className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-rose-900 dark:text-rose-200">
                  Are you sure you want to delete this test?
                </h4>
                <p className="text-xs text-rose-700 dark:text-rose-300 mt-1">
                  Mock Test: <strong className="font-extrabold">{deletingTest.title}</strong>
                </p>
                <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-2">
                  Warning: All associated questions, student results, and analytics for this test will be permanently deleted.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setDeletingTest(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteTest}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Test Permanently</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
};
