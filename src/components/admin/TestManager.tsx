import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit3, Trash2, Copy, Share2, Eye, CheckCircle, XCircle, Settings, FileText, ArrowLeft, RefreshCw, Users, HelpCircle, CheckSquare, Square, Layers, Youtube, Send, Instagram, MessageCircle, Globe, ShieldCheck, CheckCircle2, ExternalLink, Zap, Lock, Filter, Sparkles } from 'lucide-react';
import { Test, TestStatus, SocialPlatform } from '../../types';
import { dataService, generateUUID, parseSafeNumber } from '../../services/dataService';
import { Modal } from '../common/Modal';
import { BulkTestAttemptsModal } from './BulkTestAttemptsModal';
import { BulkAITestGeneratorModal } from './BulkAITestGeneratorModal';

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
  const [availablePlatforms, setAvailablePlatforms] = useState<SocialPlatform[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterSubject, setFilterSubject] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterAttempts, setFilterAttempts] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<Partial<Test> | null>(null);
  const [deletingTest, setDeletingTest] = useState<Test | null>(null);

  // Bulk Selection & Attempt Control States
  const [selectedTestIds, setSelectedTestIds] = useState<Set<string>>(new Set());
  const [isBulkAttemptsModalOpen, setIsBulkAttemptsModalOpen] = useState(false);
  const [isBulkAIGeneratorOpen, setIsBulkAIGeneratorOpen] = useState(false);
  const [testsForBulkAI, setTestsForBulkAI] = useState<Test[]>([]);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  useEffect(() => {
    loadTests();

    const handleTestsUpdated = () => {
      loadTests();
    };

    window.addEventListener('gradeup_tests_updated', handleTestsUpdated);
    return () => {
      window.removeEventListener('gradeup_tests_updated', handleTestsUpdated);
    };
  }, []);

  const loadTests = async () => {
    setLoading(true);
    try {
      const [fetched, platforms] = await Promise.all([
        dataService.getTests(true),
        dataService.getSocialPlatforms(true)
      ]);
      setTests(fetched || []);
      setAvailablePlatforms(platforms || []);
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
      negative_marking: 0,
      duration_minutes: 15,
      passing_marks: 8.0,
      instructions: '1. Duration is 15 minutes.\n2. Each question carries 1 mark.\n3. Negative marking applies if configured.\n4. Complete all questions before submitting.',
      status: 'published',
      is_published: true,
      social_gate_enabled: true,
      social_gate_mode: 'global',
      social_platform_ids: availablePlatforms.filter(p => p.is_active).map(p => p.id),
      custom_social_platforms: [],
      social_gate_title: '',
      social_gate_description: '',
      anti_cheating_enabled: true,
      randomize_questions: false,
      randomize_options: false,
      allow_back_navigation: true,
      allow_mark_for_review: true,
      show_result_immediately: true,
      show_correct_answers: true,
      show_explanation: true,
      enable_leaderboard: true,
      max_attempts_per_student: 0
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (test: Test) => {
    setEditingTest({
      ...test,
      max_attempts_per_student: test.max_attempts_per_student !== undefined ? Number(test.max_attempts_per_student) : 0,
      social_gate_enabled: test.social_gate_enabled ?? true,
      social_gate_mode: test.social_gate_mode || 'global',
      social_platform_ids: test.social_platform_ids && test.social_platform_ids.length > 0 
        ? test.social_platform_ids 
        : availablePlatforms.filter(p => p.is_active).map(p => p.id),
      custom_social_platforms: test.custom_social_platforms || [],
      social_gate_title: test.social_gate_title || '',
      social_gate_description: test.social_gate_description || ''
    });
    setIsModalOpen(true);
  };

  const handleSaveTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTest?.title || !editingTest.test_code) {
      notify('error', 'Test Title and Test Code are required!');
      return;
    }

    setIsSaving(true);
    try {
      const slug = editingTest.slug
        ? editingTest.slug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
        : editingTest.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

      const totalQuestions = parseSafeNumber(editingTest.total_questions, 10);
      const marksPerQuestion = parseSafeNumber(editingTest.marks_per_question, 1);
      const totalMarks = parseSafeNumber(editingTest.total_marks, totalQuestions * marksPerQuestion);
      const negativeMark = parseSafeNumber(editingTest.negative_marking, 0);
      const duration = parseSafeNumber(editingTest.duration_minutes, 15);
      const passingMarks = parseSafeNumber(editingTest.passing_marks, totalMarks * 0.4);
      const maxAttempts = parseSafeNumber(editingTest.max_attempts_per_student, 0);

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
        max_attempts_per_student: maxAttempts,
        status: (editingTest.status as TestStatus) || 'published',
        is_published: editingTest.status === 'published' || editingTest.is_published === true
      };

      const saved = await dataService.saveTest(testToSave);
      
      // Update local state immediately so test appears with zero lag
      setTests((prev) => {
        const idx = prev.findIndex((t) => t.id === saved.id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = saved;
          return updated;
        }
        return [saved, ...prev];
      });

      // Clear filters so new test is guaranteed visible
      setSearchQuery('');
      setFilterCategory('all');
      setFilterStatus('all');

      notify('success', `Mock test "${saved.title}" saved successfully!`);
      setIsModalOpen(false);
      await loadTests();
    } catch (err: any) {
      console.error('Error saving test:', err);
      notify('error', `Failed to save test: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
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

  const handleTogglePlatformSelection = (platformId: string) => {
    if (!editingTest) return;
    const currentIds = editingTest.social_platform_ids || [];
    const exists = currentIds.includes(platformId);
    const newIds = exists ? currentIds.filter(id => id !== platformId) : [...currentIds, platformId];
    setEditingTest({
      ...editingTest,
      social_platform_ids: newIds
    });
  };

  const handleSelectAllPlatforms = () => {
    if (!editingTest) return;
    setEditingTest({
      ...editingTest,
      social_platform_ids: availablePlatforms.map(p => p.id)
    });
  };

  const handleDeselectAllPlatforms = () => {
    if (!editingTest) return;
    setEditingTest({
      ...editingTest,
      social_platform_ids: []
    });
  };

  const handleAddCustomPlatform = () => {
    if (!editingTest) return;
    const newPlatform: SocialPlatform = {
      id: generateUUID(),
      platform_name: 'Telegram Group',
      platform_url: 'https://t.me/',
      icon: 'send',
      button_text: 'Join Channel',
      verification_method: 'redirect_only',
      is_required: true,
      is_active: true,
      order_index: (editingTest.custom_social_platforms?.length || 0) + 1
    };
    setEditingTest({
      ...editingTest,
      custom_social_platforms: [...(editingTest.custom_social_platforms || []), newPlatform]
    });
  };

  const handleUpdateCustomPlatform = (index: number, field: keyof SocialPlatform, value: any) => {
    if (!editingTest || !editingTest.custom_social_platforms) return;
    const updated = [...editingTest.custom_social_platforms];
    updated[index] = {
      ...updated[index],
      [field]: value
    };
    setEditingTest({
      ...editingTest,
      custom_social_platforms: updated
    });
  };

  const handleRemoveCustomPlatform = (index: number) => {
    if (!editingTest || !editingTest.custom_social_platforms) return;
    const updated = editingTest.custom_social_platforms.filter((_, i) => i !== index);
    setEditingTest({
      ...editingTest,
      custom_social_platforms: updated
    });
  };

  const handleCloneGlobalToCustom = () => {
    if (!editingTest) return;
    const cloned = availablePlatforms.map(p => ({
      ...p,
      id: generateUUID()
    }));
    setEditingTest({
      ...editingTest,
      custom_social_platforms: cloned
    });
    notify('info', 'Loaded global channels as editable custom channels!');
  };

  // Unique categories derived dynamically from all available tests
  const dynamicCategories = Array.from(
    new Set([
      'Police Exam',
      'Revenue Exam',
      'Teacher Exam',
      'General Exam',
      ...tests.map((t) => t.category).filter(Boolean)
    ])
  ) as string[];

  // Unique subjects derived dynamically from all available tests
  const dynamicSubjects = Array.from(
    new Set([
      ...tests.map((t) => t.subject).filter(Boolean)
    ])
  ) as string[];

  // Bulk Selection Handlers
  const toggleSelectTest = (id: string) => {
    setSelectedTestIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllFiltered = () => {
    const allFilteredIds = filteredTests.map((t) => t.id);
    const allAlreadySelected = allFilteredIds.length > 0 && allFilteredIds.every((id) => selectedTestIds.has(id));
    if (allAlreadySelected) {
      setSelectedTestIds((prev) => {
        const next = new Set(prev);
        allFilteredIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedTestIds((prev) => {
        const next = new Set(prev);
        allFilteredIds.forEach((id) => next.add(id));
        return next;
      });
    }
  };

  const handleSelectAllTests = () => {
    setSelectedTestIds(new Set(tests.map((t) => t.id)));
  };

  const handleClearSelection = () => {
    setSelectedTestIds(new Set());
  };

  const handleOpenBulkAttempts = (singleTestId?: string) => {
    if (singleTestId) {
      setSelectedTestIds(new Set([singleTestId]));
    } else if (selectedTestIds.size === 0) {
      // If none selected, default to all filtered or all tests
      if (filteredTests.length > 0) {
        setSelectedTestIds(new Set(filteredTests.map((t) => t.id)));
      } else {
        setSelectedTestIds(new Set(tests.map((t) => t.id)));
      }
    }
    setIsBulkAttemptsModalOpen(true);
  };

  const handleOpenBulkAIGenerator = (singleTest?: Test) => {
    if (singleTest) {
      setTestsForBulkAI([singleTest]);
    } else if (selectedTestIds.size > 0) {
      const selected = tests.filter((t) => selectedTestIds.has(t.id));
      setTestsForBulkAI(selected.length > 0 ? selected : tests);
    } else if (filteredTests.length > 0) {
      setTestsForBulkAI(filteredTests);
    } else {
      setTestsForBulkAI(tests);
    }
    setIsBulkAIGeneratorOpen(true);
  };

  const handleBulkPublish = async (isPublished: boolean) => {
    if (selectedTestIds.size === 0) return;
    setIsBulkProcessing(true);
    try {
      const ids = Array.from<string>(selectedTestIds);
      await dataService.bulkUpdateTestStatus(ids, isPublished);
      notify('success', `${isPublished ? 'Published' : 'Unpublished'} ${ids.length} mock tests!`);
      await loadTests();
    } catch (e: any) {
      notify('error', `Bulk update failed: ${e?.message}`);
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTestIds.size === 0) return;
    const count = selectedTestIds.size;
    if (!window.confirm(`Are you sure you want to permanently delete ${count} selected mock tests? All questions, student results, and analytics will be wiped.`)) {
      return;
    }
    setIsBulkProcessing(true);
    try {
      const ids = Array.from<string>(selectedTestIds);
      await dataService.bulkDeleteTests(ids);
      notify('success', `Deleted ${count} mock tests successfully.`);
      handleClearSelection();
      await loadTests();
    } catch (e: any) {
      notify('error', `Bulk delete failed: ${e?.message}`);
    } finally {
      setIsBulkProcessing(false);
    }
  };

  // Filtered tests
  const filteredTests = tests.filter((t) => {
    const title = (t.title || '').toLowerCase();
    const code = (t.test_code || '').toLowerCase();
    const cat = (t.category || '').toLowerCase();
    const sub = (t.subject || '').toLowerCase();
    const q = searchQuery.toLowerCase().trim();

    const matchesQuery = !q || title.includes(q) || code.includes(q) || cat.includes(q) || sub.includes(q);
    const matchesCategory = filterCategory === 'all' || (t.category || '') === filterCategory;
    const matchesSubject = filterSubject === 'all' || (t.subject || '') === filterSubject;
    const matchesStatus = filterStatus === 'all' || (t.status || 'published') === filterStatus;
    
    const attempts = t.max_attempts_per_student !== undefined && t.max_attempts_per_student !== null ? Number(t.max_attempts_per_student) : 0;
    const matchesAttempts = 
      filterAttempts === 'all' ||
      (filterAttempts === 'unlimited' && attempts === 0) ||
      (filterAttempts === 'single' && attempts === 1) ||
      (filterAttempts === 'multiple' && attempts > 1);

    return matchesQuery && matchesCategory && matchesSubject && matchesStatus && matchesAttempts;
  });

  const isAllFilteredSelected = filteredTests.length > 0 && filteredTests.every((t) => selectedTestIds.has(t.id));
  const selectedTestsList = tests.filter((t) => selectedTestIds.has(t.id));

  return (
    <div className="space-y-6">
      
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[11px] font-black rounded-md uppercase tracking-wider">
              Management Portal
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">Mock Test Manager</h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">Create, configure, publish, and bulk control student attempt limits for online mock exams</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Bulk AI MCQ Generator Button */}
          <button
            type="button"
            onClick={() => handleOpenBulkAIGenerator()}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer shrink-0"
            title="Generate AI MCQs across multiple mock tests simultaneously"
          >
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
            <span>Bulk AI MCQ Generator</span>
            {selectedTestIds.size > 0 && (
              <span className="px-1.5 py-0.5 bg-amber-400 text-slate-950 rounded-full text-[10px] font-black">
                {selectedTestIds.size}
              </span>
            )}
          </button>

          {/* Quick Bulk Attempts Button in Header */}
          <button
            type="button"
            onClick={() => handleOpenBulkAttempts()}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold text-xs rounded-xl border border-indigo-200 dark:border-indigo-800 shadow-xs transition-all cursor-pointer shrink-0"
            title="Bulk control attempt limits across mock tests"
          >
            <Zap className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Control Attempt Limits</span>
            {selectedTestIds.size > 0 && (
              <span className="px-1.5 py-0.5 bg-indigo-600 text-white rounded-full text-[10px] font-black">
                {selectedTestIds.size}
              </span>
            )}
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm rounded-xl shadow-md transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Create Mock Test</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm">
        <div className="sm:col-span-2 lg:col-span-2 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search test name, code, category, subject..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-hidden font-medium text-slate-900 dark:text-white"
          />
        </div>

        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-hidden font-medium text-slate-900 dark:text-white"
        >
          <option value="all">All Categories</option>
          {dynamicCategories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        <select
          value={filterSubject}
          onChange={(e) => setFilterSubject(e.target.value)}
          className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-hidden font-medium text-slate-900 dark:text-white"
        >
          <option value="all">All Subjects</option>
          {dynamicSubjects.map((sub) => (
            <option key={sub} value={sub}>
              {sub}
            </option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-hidden font-medium text-slate-900 dark:text-white"
        >
          <option value="all">All Statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="unpublished">Unpublished</option>
        </select>

        {/* Filter by Attempt Limit */}
        <select
          value={filterAttempts}
          onChange={(e) => setFilterAttempts(e.target.value)}
          className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-hidden font-medium text-slate-900 dark:text-white"
        >
          <option value="all">All Attempts Policy</option>
          <option value="unlimited">∞ Unlimited Only</option>
          <option value="single">🔒 1 Attempt Only</option>
          <option value="multiple">⚡ 2+ Attempts</option>
        </select>
      </div>

      {/* Bulk Selection Bar & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSelectAllFiltered}
            className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:border-blue-500 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 shadow-2xs transition-all cursor-pointer"
          >
            {isAllFilteredSelected ? (
              <CheckSquare className="w-4 h-4 text-blue-600" />
            ) : selectedTestIds.size > 0 ? (
              <div className="w-4 h-4 rounded bg-blue-600 text-white flex items-center justify-center text-[10px] font-black">
                -
              </div>
            ) : (
              <Square className="w-4 h-4 text-slate-400" />
            )}
            <span>
              {isAllFilteredSelected
                ? 'Deselect All Filtered'
                : `Select All Filtered (${filteredTests.length})`}
            </span>
          </button>

          {selectedTestIds.size > 0 && (
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
              <strong className="text-blue-600 dark:text-blue-400 font-extrabold">{selectedTestIds.size}</strong> of {tests.length} mock tests selected
            </span>
          )}
        </div>

        {selectedTestIds.size > 0 ? (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => handleOpenBulkAIGenerator()}
              disabled={isBulkProcessing}
              className="px-3.5 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Generate MCQs with AI for selected tests"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              <span>⚡ Generate AI MCQs ({selectedTestIds.size})</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenBulkAttempts()}
              disabled={isBulkProcessing}
              className="px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Set Attempt Limits ({selectedTestIds.size})</span>
            </button>

            <button
              type="button"
              onClick={() => handleBulkPublish(true)}
              disabled={isBulkProcessing}
              className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 border border-emerald-300 dark:border-emerald-800 font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              Publish
            </button>

            <button
              type="button"
              onClick={() => handleBulkPublish(false)}
              disabled={isBulkProcessing}
              className="px-3 py-1.5 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 hover:bg-amber-100 border border-amber-300 dark:border-amber-800 font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              Unpublish
            </button>

            <button
              type="button"
              onClick={handleBulkDelete}
              disabled={isBulkProcessing}
              className="px-3 py-1.5 bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 hover:bg-rose-100 border border-rose-200 dark:border-rose-900 font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              Delete
            </button>

            <button
              type="button"
              onClick={handleClearSelection}
              className="px-2.5 py-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-bold text-xs cursor-pointer"
            >
              Clear
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSelectAllTests}
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              Select All {tests.length} Tests for Bulk Control
            </button>
          </div>
        )}
      </div>

      {/* Tests Grid / Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTests.map((test) => {
          const isSelected = selectedTestIds.has(test.id);
          const hasSubject = Boolean(test.subject && test.subject.trim());
          const hasSections = Boolean(test.is_multisection && test.sections && test.sections.length > 0);

          return (
            <div
              key={test.id}
              onClick={() => toggleSelectTest(test.id)}
              className={`group bg-white dark:bg-slate-900 rounded-2xl border p-5 sm:p-6 flex flex-col justify-between shadow-md hover:shadow-xl transition-all duration-200 relative cursor-pointer ${
                isSelected
                  ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/20 dark:bg-blue-950/20'
                  : 'border-slate-200/90 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500'
              }`}
            >
              <div className="space-y-3.5">
                
                {/* Header Row: Checkbox + Category Badge + Test Code + Published Status */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Multi-Select Checkbox */}
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelectTest(test.id);
                      }}
                      className="cursor-pointer shrink-0"
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer pointer-events-none"
                      />
                    </div>

                    <span className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-lg border border-blue-200 dark:border-blue-900 shadow-2xs">
                      {test.category}
                    </span>
                    <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/90 dark:border-slate-700 font-mono text-[11px] font-bold rounded-md uppercase">
                      {test.exam_code || test.test_code}
                    </span>
                  </div>

                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border flex items-center gap-1.5 shadow-2xs shrink-0 ${
                    test.is_published
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                      : 'bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${test.is_published ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                    <span>{test.is_published ? 'Published' : 'Draft'}</span>
                  </span>
                </div>

                {/* Subject & Section Tags */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {hasSubject && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/80 rounded-lg text-xs font-bold">
                      <FileText className="w-3 h-3 text-indigo-500" />
                      <span>Subject: {test.subject}</span>
                    </span>
                  )}
                  {hasSections && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-50 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200 text-xs font-bold rounded-lg border border-amber-200 dark:border-amber-800">
                      <Layers className="w-3 h-3 text-amber-600" />
                      <span>Sections ({test.sections!.length}): {test.sections!.join(', ')}</span>
                    </span>
                  )}
                </div>

                {/* Title & Description */}
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 leading-snug">
                    {test.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mt-1 leading-relaxed min-h-[32px]">
                    {test.description || 'Practice test series based on real exam pattern with instant detailed results.'}
                  </p>
                </div>

                {/* Specs Badge Pill Grid - High Contrast */}
                <div className="grid grid-cols-4 gap-1.5 bg-slate-50 dark:bg-slate-800/80 p-2.5 sm:p-3 rounded-xl border border-slate-200/90 dark:border-slate-700/80 text-center text-xs">
                  <div>
                    <p className="font-black text-slate-900 dark:text-white text-xs sm:text-sm">{test.total_questions}</p>
                    <p className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Questions</p>
                  </div>
                  <div>
                    <p className="font-black text-slate-900 dark:text-white text-xs sm:text-sm">{test.duration_minutes}m</p>
                    <p className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Duration</p>
                  </div>
                  <div>
                    <p className="font-black text-slate-900 dark:text-white text-xs sm:text-sm">{test.total_marks}</p>
                    <p className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Marks</p>
                  </div>
                  <div>
                    <p className="font-black text-rose-600 dark:text-rose-400 text-xs sm:text-sm">{test.negative_marking}</p>
                    <p className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Neg Mark</p>
                  </div>
                </div>

                {/* Status Badges Row: Social Gate + Attempt Limit */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {/* Interactive Attempt Limit Badge - Click to Configure Attempts! */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenBulkAttempts(test.id);
                    }}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border shadow-2xs hover:scale-105 transition-all cursor-pointer ${
                      (!test.max_attempts_per_student || test.max_attempts_per_student === 0)
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/60 hover:bg-emerald-100'
                        : test.max_attempts_per_student === 1
                        ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-900/60 hover:bg-amber-100'
                        : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-900/60 hover:bg-indigo-100'
                    }`}
                    title="Click to change student attempt limit for this test"
                  >
                    <Users className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {(!test.max_attempts_per_student || test.max_attempts_per_student === 0)
                        ? '∞ Unlimited Attempts'
                        : `${test.max_attempts_per_student} Attempt${test.max_attempts_per_student > 1 ? 's' : ''} Limit`}
                    </span>
                    <Zap className="w-3 h-3 ml-0.5 opacity-60" />
                  </button>

                  {/* Social Gate Status Badge on Card */}
                  {test.social_gate_enabled !== false ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60 shadow-2xs">
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                      <span className="truncate">
                        {test.social_gate_mode === 'custom_links'
                          ? `Custom (${test.custom_social_platforms?.length || 0})`
                          : test.social_gate_mode === 'custom_selection'
                          ? `Selected (${test.social_platform_ids?.length || 0})`
                          : 'Global Gate'}
                      </span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                      <XCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Gate Off</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Actions Bar */}
              <div 
                className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800/90 mt-4"
                onClick={(e) => e.stopPropagation()}
              >
                
                {/* Primary Action Buttons */}
                <div className="flex items-center justify-between gap-1.5">
                  <button
                    onClick={() => onSelectTestQuestions(test.id)}
                    className="flex-1 py-2.5 px-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Questions ({test.total_questions})</span>
                  </button>

                  {onViewTestResults && (
                    <button
                      onClick={() => onViewTestResults(test.id)}
                      className="px-3 py-2.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl transition-all font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      title="View Student Results & Leaderboard"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Results</span>
                    </button>
                  )}

                  <button
                    onClick={() => onPreviewTest(test.slug)}
                    className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/90 dark:border-slate-700 rounded-xl transition-all cursor-pointer shadow-2xs"
                    title="Preview Student View"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>

                {/* Secondary Tools Row with Crisp Buttons */}
                <div className="flex items-center justify-between text-xs gap-1.5 pt-1">
                  <button
                    onClick={() => handleCopyLink(test.slug)}
                    className="px-2.5 py-1 bg-slate-50 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-blue-950/60 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-300 border border-slate-200/90 dark:border-slate-700 rounded-lg font-bold flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
                    title="Copy Student Link"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Copy Link</span>
                  </button>

                  <button
                    onClick={() => handleOpenBulkAIGenerator(test)}
                    className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-lg font-bold flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
                    title="Generate MCQs with AI for this test"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    <span>AI MCQs</span>
                  </button>

                  <button
                    onClick={() => handleTogglePublish(test)}
                    className={`px-2.5 py-1 rounded-lg font-bold border transition-all cursor-pointer shadow-2xs ${
                      test.is_published
                        ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800 hover:bg-amber-100'
                        : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100'
                    }`}
                  >
                    {test.is_published ? 'Unpublish' : 'Publish'}
                  </button>

                  <div className="flex items-center gap-1 ml-auto">
                    <button
                      onClick={() => handleOpenEditModal(test)}
                      className="p-1.5 bg-slate-50 hover:bg-blue-50 dark:bg-slate-800 text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-300 border border-slate-200/90 dark:border-slate-700 rounded-lg transition-all cursor-pointer"
                      title="Edit Settings"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDuplicate(test.id)}
                      className="p-1.5 bg-slate-50 hover:bg-indigo-50 dark:bg-slate-800 text-slate-600 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-300 border border-slate-200/90 dark:border-slate-700 rounded-lg transition-all cursor-pointer"
                      title="Duplicate Test"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(test)}
                      className="p-1.5 bg-slate-50 hover:bg-rose-50 dark:bg-slate-800 text-rose-500 hover:text-rose-700 dark:hover:bg-rose-950/60 border border-slate-200/90 dark:border-slate-700 rounded-lg transition-all cursor-pointer"
                      title="Delete Test"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

              </div>

            </div>
          );
        })}

        {filteredTests.length === 0 && (
          <div className="col-span-full py-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-md">
            <p className="text-slate-600 dark:text-slate-400 text-sm font-semibold">No mock tests found matching your filter criteria.</p>
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
                    value={editingTest.negative_marking ?? 0}
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

            {/* Student Attempt Limit Configuration */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/90 dark:border-slate-700/80 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                        Student Attempt Limit
                      </h4>
                      <span className="px-2 py-0.5 text-[10px] font-black rounded-md border shadow-2xs">
                        {(!editingTest.max_attempts_per_student || editingTest.max_attempts_per_student === 0) ? (
                          <span className="text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950 border-emerald-300 dark:border-emerald-800">
                            ∞ Unlimited Attempts
                          </span>
                        ) : (
                          <span className="text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950 border-indigo-300 dark:border-indigo-800">
                            {editingTest.max_attempts_per_student} Attempt{editingTest.max_attempts_per_student > 1 ? 's' : ''} Max
                          </span>
                        )}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Set how many times each student can attempt this mock test using their mobile number.
                    </p>
                  </div>
                </div>

                {/* Preset Options */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { label: 'Unlimited (∞)', val: 0 },
                    { label: '1 Attempt (Strict)', val: 1 },
                    { label: '2 Attempts', val: 2 },
                    { label: '3 Attempts', val: 3 },
                    { label: '5 Attempts', val: 5 },
                  ].map((preset) => {
                    const isSelected = (editingTest.max_attempts_per_student ?? 0) === preset.val;
                    return (
                      <button
                        key={preset.val}
                        type="button"
                        onClick={() => setEditingTest({ ...editingTest, max_attempts_per_student: preset.val })}
                        className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Custom Attempt Limit (Enter 0 for Unlimited):
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editingTest.max_attempts_per_student ?? 0}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setEditingTest({ ...editingTest, max_attempts_per_student: isNaN(val) || val < 0 ? 0 : val });
                    }}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-bold text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-indigo-500"
                    placeholder="0 = Unlimited, 1 = Single attempt..."
                  />
                </div>

                <div className="flex items-center p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                  {(!editingTest.max_attempts_per_student || editingTest.max_attempts_per_student === 0) ? (
                    <div className="text-emerald-700 dark:text-emerald-300 space-y-0.5">
                      <p className="font-bold flex items-center gap-1">
                        <span>✨ Unlimited Practice Mode</span>
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Students can practice and re-attempt this exam unlimited times without restrictions.
                      </p>
                    </div>
                  ) : editingTest.max_attempts_per_student === 1 ? (
                    <div className="text-amber-700 dark:text-amber-300 space-y-0.5">
                      <p className="font-bold flex items-center gap-1">
                        <span>🔒 Single Strict Attempt</span>
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        High-stakes exam mode. Students can only attempt once per mobile number.
                      </p>
                    </div>
                  ) : (
                    <div className="text-indigo-700 dark:text-indigo-300 space-y-0.5">
                      <p className="font-bold flex items-center gap-1">
                        <span>🎯 Limited to {editingTest.max_attempts_per_student} Attempts</span>
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Students can attempt up to {editingTest.max_attempts_per_student} times before access is locked.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Social Media Requirements (Mock by Mock) */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-4 space-y-4">
                
                {/* Header & Toggle */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-700/60">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/60 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                        <span>Social Follow Gate Requirements</span>
                        <span className="px-1.5 py-0.5 text-[9px] font-bold bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-md border border-blue-200 dark:border-blue-900">
                          Mock-by-Mock
                        </span>
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Require students to visit/join Gradeup Study channels before starting this mock test.
                      </p>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer self-start sm:self-auto bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs select-none">
                    <input
                      type="checkbox"
                      checked={editingTest.social_gate_enabled ?? true}
                      onChange={(e) => setEditingTest({ ...editingTest, social_gate_enabled: e.target.checked })}
                      className="rounded text-blue-600 w-4 h-4"
                    />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {editingTest.social_gate_enabled ?? true ? 'Gate Enabled' : 'Gate Disabled'}
                    </span>
                  </label>
                </div>

                {/* Gate Options when Enabled */}
                {(editingTest.social_gate_enabled ?? true) && (
                  <div className="space-y-4 pt-1">
                    
                    {/* Mode Selector Tabs */}
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">
                        Requirement Mode for this Mock Test:
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        
                        <button
                          type="button"
                          onClick={() => setEditingTest({ ...editingTest, social_gate_mode: 'global' })}
                          className={`p-3 rounded-xl border text-left transition-all ${
                            (editingTest.social_gate_mode || 'global') === 'global'
                              ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-400 dark:border-blue-600 text-blue-900 dark:text-blue-200 ring-2 ring-blue-500/20'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 font-bold text-xs mb-1">
                            <Globe className="w-3.5 h-3.5 text-blue-500" />
                            <span>Global Default</span>
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                            Inherit all active global channels from Social Gate Manager.
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() => setEditingTest({ ...editingTest, social_gate_mode: 'custom_selection' })}
                          className={`p-3 rounded-xl border text-left transition-all ${
                            editingTest.social_gate_mode === 'custom_selection'
                              ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-400 dark:border-blue-600 text-blue-900 dark:text-blue-200 ring-2 ring-blue-500/20'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 font-bold text-xs mb-1">
                            <CheckSquare className="w-3.5 h-3.5 text-indigo-500" />
                            <span>Select Specific Channels</span>
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                            Pick & choose which channels apply specifically to this mock test.
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (!editingTest.custom_social_platforms || editingTest.custom_social_platforms.length === 0) {
                              handleCloneGlobalToCustom();
                            }
                            setEditingTest(prev => ({ ...prev, social_gate_mode: 'custom_links' }));
                          }}
                          className={`p-3 rounded-xl border text-left transition-all ${
                            editingTest.social_gate_mode === 'custom_links'
                              ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-400 dark:border-blue-600 text-blue-900 dark:text-blue-200 ring-2 ring-blue-500/20'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 font-bold text-xs mb-1">
                            <Edit3 className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Custom Links & Batch</span>
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                            Define custom URLs or specific exam batch groups for this test.
                          </p>
                        </button>

                      </div>
                    </div>

                    {/* Mode 1: Global Default View */}
                    {(editingTest.social_gate_mode || 'global') === 'global' && (
                      <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-700 dark:text-slate-300">Active Global Channels ({availablePlatforms.filter(p => p.is_active).length}):</span>
                          <span className="text-[10px] text-slate-400">Configured in Social Gate Tab</span>
                        </div>
                        <div className="flex flex-wrap gap-2 pt-1">
                          {availablePlatforms.filter(p => p.is_active).map(p => (
                            <span key={p.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-semibold">
                              {p.icon === 'youtube' && <Youtube className="w-3.5 h-3.5 text-rose-600" />}
                              {p.icon === 'send' && <Send className="w-3.5 h-3.5 text-blue-500" />}
                              {p.icon === 'instagram' && <Instagram className="w-3.5 h-3.5 text-pink-600" />}
                              {p.icon === 'message-circle' && <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />}
                              {p.icon !== 'youtube' && p.icon !== 'send' && p.icon !== 'instagram' && p.icon !== 'message-circle' && <Globe className="w-3.5 h-3.5 text-indigo-500" />}
                              <span>{p.platform_name}</span>
                              {p.is_required && <span className="text-[9px] bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-300 px-1 rounded font-bold">Mandatory</span>}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Mode 2: Custom Selection View */}
                    {editingTest.social_gate_mode === 'custom_selection' && (
                      <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              Select Channels for this Mock Test:
                            </p>
                            <p className="text-[10px] text-slate-500">
                              Selected: {(editingTest.social_platform_ids || []).length} of {availablePlatforms.length} platforms
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={handleSelectAllPlatforms}
                              className="px-2 py-1 text-[10px] font-bold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 rounded"
                            >
                              Select All
                            </button>
                            <span className="text-slate-300">|</span>
                            <button
                              type="button"
                              onClick={handleDeselectAllPlatforms}
                              className="px-2 py-1 text-[10px] font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                            >
                              Clear All
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {availablePlatforms.map((p) => {
                            const isSelected = (editingTest.social_platform_ids || []).includes(p.id);
                            return (
                              <label
                                key={p.id}
                                className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                                  isSelected
                                    ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700'
                                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/80 opacity-70'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleTogglePlatformSelection(p.id)}
                                    className="rounded text-blue-600 w-4 h-4"
                                  />
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      {p.icon === 'youtube' && <Youtube className="w-3.5 h-3.5 text-rose-600 shrink-0" />}
                                      {p.icon === 'send' && <Send className="w-3.5 h-3.5 text-blue-500 shrink-0" />}
                                      {p.icon === 'instagram' && <Instagram className="w-3.5 h-3.5 text-pink-600 shrink-0" />}
                                      {p.icon === 'message-circle' && <MessageCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                                      {p.icon !== 'youtube' && p.icon !== 'send' && p.icon !== 'instagram' && p.icon !== 'message-circle' && <Globe className="w-3.5 h-3.5 text-indigo-500 shrink-0" />}
                                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{p.platform_name}</span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 truncate max-w-[180px]">{p.platform_url}</p>
                                  </div>
                                </div>
                                {p.is_required && (
                                  <span className="text-[9px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950 px-1.5 py-0.5 rounded border border-rose-200 dark:border-rose-900 shrink-0">
                                    Mandatory
                                  </span>
                                )}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Mode 3: Custom Links & Channels View */}
                    {editingTest.social_gate_mode === 'custom_links' && (
                      <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              Custom Channels for this Mock Test:
                            </p>
                            <p className="text-[10px] text-slate-500">
                              Configure specific URLs (e.g. Police Batch Telegram or Dedicated YouTube channel)
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={handleCloneGlobalToCustom}
                              className="px-2.5 py-1 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors"
                            >
                              📥 Load Global Template
                            </button>
                            <button
                              type="button"
                              onClick={handleAddCustomPlatform}
                              className="px-2.5 py-1 text-[10px] font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" /> Add Channel
                            </button>
                          </div>
                        </div>

                        {(!editingTest.custom_social_platforms || editingTest.custom_social_platforms.length === 0) ? (
                          <div className="py-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                            No custom channels added. Click "Load Global Template" or "Add Channel".
                          </div>
                        ) : (
                          <div className="space-y-2.5">
                            {editingTest.custom_social_platforms.map((cp, idx) => (
                              <div key={cp.id || idx} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
                                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 flex-1 w-full">
                                  
                                  {/* Icon & Name */}
                                  <div className="flex items-center gap-2 sm:col-span-1">
                                    <select
                                      value={cp.icon}
                                      onChange={(e) => handleUpdateCustomPlatform(idx, 'icon', e.target.value)}
                                      className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium outline-hidden"
                                    >
                                      <option value="youtube">YouTube</option>
                                      <option value="send">Telegram</option>
                                      <option value="message-circle">WhatsApp</option>
                                      <option value="instagram">Instagram</option>
                                      <option value="globe">Website</option>
                                    </select>
                                    <input
                                      type="text"
                                      value={cp.platform_name}
                                      onChange={(e) => handleUpdateCustomPlatform(idx, 'platform_name', e.target.value)}
                                      placeholder="Platform Name"
                                      className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold outline-hidden"
                                    />
                                  </div>

                                  {/* URL */}
                                  <div className="sm:col-span-2">
                                    <input
                                      type="url"
                                      value={cp.platform_url}
                                      onChange={(e) => handleUpdateCustomPlatform(idx, 'platform_url', e.target.value)}
                                      placeholder="https://t.me/..."
                                      className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono outline-hidden"
                                    />
                                  </div>

                                  {/* Button text & Required */}
                                  <div className="flex items-center gap-2 sm:col-span-1">
                                    <input
                                      type="text"
                                      value={cp.button_text || ''}
                                      onChange={(e) => handleUpdateCustomPlatform(idx, 'button_text', e.target.value)}
                                      placeholder="Button Label"
                                      className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-hidden"
                                    />
                                    <label className="flex items-center gap-1 text-[11px] font-bold text-slate-700 dark:text-slate-300 shrink-0 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={cp.is_required}
                                        onChange={(e) => handleUpdateCustomPlatform(idx, 'is_required', e.target.checked)}
                                        className="rounded text-rose-600"
                                      />
                                      <span>Req</span>
                                    </label>
                                  </div>

                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleRemoveCustomPlatform(idx)}
                                  className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors shrink-0"
                                  title="Remove channel"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Custom Header & Subtitle */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                          Custom Social Gate Title (Optional):
                        </label>
                        <input
                          type="text"
                          value={editingTest.social_gate_title || ''}
                          onChange={(e) => setEditingTest({ ...editingTest, social_gate_title: e.target.value })}
                          placeholder="Gradeup Study Official Community Requirement"
                          className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-hidden"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                          Custom Instructions / Subtitle (Optional):
                        </label>
                        <input
                          type="text"
                          value={editingTest.social_gate_description || ''}
                          onChange={(e) => setEditingTest({ ...editingTest, social_gate_description: e.target.value })}
                          placeholder="Join our official community channels to receive free study PDFs..."
                          className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-hidden"
                        />
                      </div>
                    </div>

                  </div>
                )}

              </div>
            </div>

            {/* Other Checkbox Settings */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Exam Rules & Security</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                
                <label className="flex items-center gap-2 cursor-pointer p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
                  <input
                    type="checkbox"
                    checked={editingTest.anti_cheating_enabled ?? true}
                    onChange={(e) => setEditingTest({ ...editingTest, anti_cheating_enabled: e.target.checked })}
                    className="rounded text-blue-600"
                  />
                  <span>Anti-Cheating Protection (Tab lock & Copy prevention)</span>
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
                  <span>Enable Public Leaderboard & Rank List</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
                  <input
                    type="checkbox"
                    checked={editingTest.show_result_immediately ?? true}
                    onChange={(e) => setEditingTest({ ...editingTest, show_result_immediately: e.target.checked })}
                    className="rounded text-blue-600"
                  />
                  <span>Show Detailed Scorecard Immediately</span>
                </label>

              </div>
            </div>

            {/* Modal Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:underline disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center gap-2"
              >
                {isSaving && (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
                <span>{isSaving ? 'Saving Mock Test...' : 'Save Mock Test'}</span>
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

      {/* Bulk Test Attempts Control Modal */}
      {isBulkAttemptsModalOpen && (
        <BulkTestAttemptsModal
          isOpen={isBulkAttemptsModalOpen}
          onClose={() => setIsBulkAttemptsModalOpen(false)}
          selectedTests={selectedTestsList.length > 0 ? selectedTestsList : tests}
          allTests={tests}
          onUpdateSelection={(ids) => setSelectedTestIds(new Set(ids))}
          onRefreshData={loadTests}
          onToast={notify}
          onSuccess={() => {
            loadTests();
          }}
        />
      )}

      {/* Bulk AI Question Generator Modal */}
      {isBulkAIGeneratorOpen && (
        <BulkAITestGeneratorModal
          isOpen={isBulkAIGeneratorOpen}
          onClose={() => setIsBulkAIGeneratorOpen(false)}
          selectedTests={testsForBulkAI.length > 0 ? testsForBulkAI : selectedTestsList.length > 0 ? selectedTestsList : tests}
          allTests={tests}
          onSelectTestQuestions={onSelectTestQuestions}
          onToast={notify}
          onSuccess={(updatedTests, totalCount) => {
            loadTests();
          }}
        />
      )}

    </div>
  );
};
