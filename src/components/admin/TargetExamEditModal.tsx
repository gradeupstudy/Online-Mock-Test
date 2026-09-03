import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Save, 
  Target, 
  Sparkles, 
  Layers, 
  Search, 
  Check, 
  Plus, 
  Trash2, 
  Wand2, 
  Info,
  CheckSquare,
  Square,
  MinusSquare,
  Filter,
  BookOpen,
  History,
  ChevronDown,
  ChevronRight,
  Folder,
  FolderCheck,
  CheckCheck,
  ListFilter
} from 'lucide-react';
import { TargetExam, Test, PracticeMode, PRIMARY_PRACTICE_MODES } from '../../types';
import { dataService, inferPracticeMode } from '../../services/dataService';
import { TargetExamIcon } from '../common/TargetExamIcon';
import { PracticeModeIcon } from '../common/PracticeModeIcon';

interface TargetExamEditModalProps {
  isOpen: boolean;
  exam: TargetExam | null;
  onClose: () => void;
  onSaved: (savedExam: TargetExam) => void;
  onDeleted?: (deletedId: string) => void;
  allTests: Test[];
}

const AVAILABLE_ICONS = [
  'Shield',
  'Landmark',
  'Train',
  'Award',
  'Compass',
  'GraduationCap',
  'Briefcase',
  'BookOpen',
  'Target',
  'FileText',
  'Flame',
  'Zap',
  'Sparkles',
  'Layers'
];

const PRESET_CATEGORIES = [
  'Himachal State Exams',
  'Staff Selection Commission',
  'Railways',
  'Banking & Insurance',
  'State PCS / Civil Services',
  'Police & Defense',
  'Teaching Exams',
  'General & Mixed'
];

export const TargetExamEditModal: React.FC<TargetExamEditModalProps> = ({
  isOpen,
  exam,
  onClose,
  onSaved,
  onDeleted,
  allTests = []
}) => {
  const [formData, setFormData] = useState<Partial<TargetExam>>({
    title: '',
    hindiTitle: '',
    slug: '',
    category: 'Himachal State Exams',
    icon: 'Target',
    description: '',
    badgeText: '',
    is_active: true,
    is_popular: false,
    order_index: 1,
    mode_test_map: {
      topic_wise: [],
      subject_wise: [],
      full_mock: [],
      pyq: []
    }
  });

  const [activeTab, setActiveTab] = useState<'details' | 'mappings'>('details');
  const [selectedPracticeMode, setSelectedPracticeMode] = useState<PracticeMode>('full_mock');
  const [testSearchQuery, setTestSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [subjectFilter, setSubjectFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unmapped' | 'mapped'>('all');
  const [viewMode, setViewMode] = useState<'subject_grouped' | 'flat'>('subject_grouped');
  const [collapsedSubjects, setCollapsedSubjects] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [autoMapStatus, setAutoMapStatus] = useState<string | null>(null);

  const handleDeleteExam = async () => {
    if (!exam?.id) return;
    setIsDeleting(true);
    try {
      await dataService.deleteTargetExam(exam.id);
      if (onDeleted) {
        onDeleted(exam.id);
      }
      onClose();
    } catch (err) {
      console.error('Failed to delete target exam', err);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  useEffect(() => {
    if (exam) {
      setFormData({
        ...exam,
        mode_test_map: exam.mode_test_map || {
          topic_wise: [],
          subject_wise: [],
          full_mock: [],
          pyq: []
        }
      });
    } else {
      setFormData({
        id: undefined,
        title: '',
        hindiTitle: '',
        slug: '',
        category: 'Himachal State Exams',
        icon: 'Target',
        description: '',
        badgeText: 'New',
        is_active: true,
        is_popular: false,
        order_index: 99,
        mode_test_map: {
          topic_wise: [],
          subject_wise: [],
          full_mock: [],
          pyq: []
        }
      });
    }
    setActiveTab('details');
    setAutoMapStatus(null);
  }, [exam, isOpen]);

  // Available unique categories in all tests
  const testCategories = useMemo(() => {
    const cats = Array.from(new Set(allTests.map(t => t.category).filter(Boolean)));
    return ['All', ...cats];
  }, [allTests]);

  // Available unique subjects in all tests for Subject-Wise grouping and picking
  const testSubjects = useMemo(() => {
    const subs = Array.from(
      new Set(
        allTests
          .map(t => (t.subject || 'General Studies').trim())
          .filter(Boolean)
      )
    );
    subs.sort((a, b) => a.localeCompare(b));
    return ['All', ...subs];
  }, [allTests]);

  // Current mapped tests for the selected practice mode
  const currentModeMappedIds = useMemo(() => {
    return new Set(formData.mode_test_map?.[selectedPracticeMode] || []);
  }, [formData.mode_test_map, selectedPracticeMode]);

  // Filter tests list based on search, category, subject, and status
  const filteredTests = useMemo(() => {
    return allTests.filter(t => {
      const q = (testSearchQuery || '').toLowerCase().trim();
      const matchesQuery =
        !q ||
        (t.title || '').toLowerCase().includes(q) ||
        (t.test_code || '').toLowerCase().includes(q) ||
        (t.category || '').toLowerCase().includes(q) ||
        (t.subject || '').toLowerCase().includes(q);

      const matchesCategory = categoryFilter === 'All' || t.category === categoryFilter;
      const testSubject = (t.subject || 'General Studies').trim();
      const matchesSubject = subjectFilter === 'All' || testSubject === subjectFilter;

      const isMapped = currentModeMappedIds.has(t.id);
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'unmapped' && !isMapped) ||
        (statusFilter === 'mapped' && isMapped);

      return matchesQuery && matchesCategory && matchesSubject && matchesStatus;
    });
  }, [allTests, testSearchQuery, categoryFilter, subjectFilter, statusFilter, currentModeMappedIds]);

  // Group filtered tests by Subject for organized subject-wise picking & select-all
  const subjectGroups = useMemo(() => {
    const groups: Record<string, Test[]> = {};
    filteredTests.forEach(t => {
      const subj = (t.subject || 'General Studies').trim();
      if (!groups[subj]) {
        groups[subj] = [];
      }
      groups[subj].push(t);
    });

    return Object.entries(groups)
      .map(([subjectName, tests]) => {
        const mappedCount = tests.filter(t => currentModeMappedIds.has(t.id)).length;
        const allMapped = tests.length > 0 && mappedCount === tests.length;
        const someMapped = mappedCount > 0 && mappedCount < tests.length;
        return {
          subjectName,
          tests,
          totalCount: tests.length,
          mappedCount,
          unmappedCount: tests.length - mappedCount,
          allMapped,
          someMapped
        };
      })
      .sort((a, b) => a.subjectName.localeCompare(b.subjectName));
  }, [filteredTests, currentModeMappedIds]);

  // Handler to toggle an individual test in current practice mode
  const handleToggleTestMapping = (testId: string) => {
    setFormData(prev => {
      const currentMap = prev.mode_test_map || { topic_wise: [], subject_wise: [], full_mock: [], pyq: [] };
      const currentList = currentMap[selectedPracticeMode] || [];
      const updatedList = currentList.includes(testId)
        ? currentList.filter(id => id !== testId)
        : [...currentList, testId];

      return {
        ...prev,
        mode_test_map: {
          ...currentMap,
          [selectedPracticeMode]: updatedList
        }
      };
    });
  };

  // Select and Add all tests of a specific subject ("Select Add" for Subject)
  const handleAddSubjectTests = (subjectTests: Test[]) => {
    setFormData(prev => {
      const currentMap = prev.mode_test_map || { topic_wise: [], subject_wise: [], full_mock: [], pyq: [] };
      const currentSet = new Set(currentMap[selectedPracticeMode] || []);
      subjectTests.forEach(t => currentSet.add(t.id));

      return {
        ...prev,
        mode_test_map: {
          ...currentMap,
          [selectedPracticeMode]: Array.from(currentSet)
        }
      };
    });
  };

  // Remove all tests of a specific subject from current practice mode
  const handleRemoveSubjectTests = (subjectTests: Test[]) => {
    setFormData(prev => {
      const currentMap = prev.mode_test_map || { topic_wise: [], subject_wise: [], full_mock: [], pyq: [] };
      const toRemoveIds = new Set(subjectTests.map(t => t.id));
      const currentList = currentMap[selectedPracticeMode] || [];
      const updatedList = currentList.filter(id => !toRemoveIds.has(id));

      return {
        ...prev,
        mode_test_map: {
          ...currentMap,
          [selectedPracticeMode]: updatedList
        }
      };
    });
  };

  // Toggle all tests of a subject (if not all mapped -> Add All; if all mapped -> Remove All)
  const handleToggleSubjectTests = (subjectTests: Test[]) => {
    const allMapped = subjectTests.length > 0 && subjectTests.every(t => currentModeMappedIds.has(t.id));
    if (allMapped) {
      handleRemoveSubjectTests(subjectTests);
    } else {
      handleAddSubjectTests(subjectTests);
    }
  };

  // Select all visible filtered tests for current practice mode
  const handleSelectAllVisible = () => {
    setFormData(prev => {
      const currentMap = prev.mode_test_map || { topic_wise: [], subject_wise: [], full_mock: [], pyq: [] };
      const currentList = new Set(currentMap[selectedPracticeMode] || []);
      filteredTests.forEach(t => currentList.add(t.id));

      return {
        ...prev,
        mode_test_map: {
          ...currentMap,
          [selectedPracticeMode]: Array.from(currentList)
        }
      };
    });
  };

  // Clear all tests from current practice mode
  const handleClearCurrentMode = () => {
    setFormData(prev => {
      const currentMap = prev.mode_test_map || { topic_wise: [], subject_wise: [], full_mock: [], pyq: [] };
      return {
        ...prev,
        mode_test_map: {
          ...currentMap,
          [selectedPracticeMode]: []
        }
      };
    });
  };

  // Expand / Collapse subject accordions
  const toggleSubjectCollapse = (subjectName: string) => {
    setCollapsedSubjects(prev => ({
      ...prev,
      [subjectName]: !prev[subjectName]
    }));
  };

  const handleExpandAllSubjects = () => {
    setCollapsedSubjects({});
  };

  const handleCollapseAllSubjects = () => {
    const collapsed: Record<string, boolean> = {};
    subjectGroups.forEach(g => {
      collapsed[g.subjectName] = true;
    });
    setCollapsedSubjects(collapsed);
  };

  // 1-Click Auto Map Intelligence
  const handleAutoMapAllModes = () => {
    const titleLower = (formData.title || '').toLowerCase();
    const catLower = (formData.category || '').toLowerCase();
    const slugLower = (formData.slug || '').toLowerCase();

    const keywords: string[] = [];
    if (titleLower.includes('police') || slugLower.includes('police')) keywords.push('police', 'constable', 'si');
    if (titleLower.includes('patwari') || slugLower.includes('patwari')) keywords.push('patwari', 'revenue');
    if (titleLower.includes('court') || slugLower.includes('court')) keywords.push('court', 'clerk', 'process server');
    if (titleLower.includes('ssc') || slugLower.includes('ssc')) keywords.push('ssc', 'cgl', 'chsl', 'mts', 'gd');
    if (titleLower.includes('railway') || titleLower.includes('ntpc')) keywords.push('railway', 'rrb', 'ntpc', 'group d');
    if (titleLower.includes('bank')) keywords.push('bank', 'ibps', 'sbi', 'po', 'clerk');
    if (titleLower.includes('hpas') || titleLower.includes('allied')) keywords.push('hpas', 'allied', 'naib', 'hppsc');
    if (titleLower.includes('tet') || titleLower.includes('tgt')) keywords.push('tet', 'tgt', 'jbt', 'teaching');

    const newMap = {
      topic_wise: [] as string[],
      subject_wise: [] as string[],
      full_mock: [] as string[],
      pyq: [] as string[]
    };

    let mappedCount = 0;

    allTests.forEach(test => {
      const tMode = inferPracticeMode(test);
      const tTitle = (test.title || '').toLowerCase();
      const tCat = (test.category || '').toLowerCase();
      const tCode = (test.test_code || test.exam_code || '').toLowerCase();

      let matched = false;

      if (formData.id === 'general-competitive-all' || titleLower.includes('general')) {
        matched = true;
      } else if (tCat && titleLower.includes(tCat)) {
        matched = true;
      } else if (keywords.some(kw => tTitle.includes(kw) || tCat.includes(kw) || tCode.includes(kw))) {
        matched = true;
      }

      if (matched) {
        if (!newMap[tMode].includes(test.id)) {
          newMap[tMode].push(test.id);
          mappedCount++;
        }
      }
    });

    setFormData(prev => ({
      ...prev,
      mode_test_map: newMap
    }));

    setAutoMapStatus(`Auto-mapped ${mappedCount} mock tests across all 4 practice modes!`);
    setTimeout(() => setAutoMapStatus(null), 4000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title?.trim()) {
      alert('Please enter a Target Exam title');
      return;
    }

    setIsSaving(true);
    try {
      const saved = await dataService.saveTargetExam(formData);
      onSaved(saved);
      onClose();
    } catch (err) {
      console.error('Failed to save Target Exam:', err);
      alert('Failed to save Target Exam. Please check connection and try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* MODAL HEADER */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
              <TargetExamIcon icon={formData.icon} size="md" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white">
                {exam ? 'Edit Target Exam & Mappings' : 'Create New Target Exam'}
              </h2>
              <p className="text-xs text-slate-300">
                Configure exam info and map which mock tests appear in each Practice Mode for students.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TABS NAVIGATION */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 px-6 pt-3 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'details'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            1. Exam Details & Categorization (मूल विवरण)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('mappings')}
            className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'mappings'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>2. Practice Mode Mock Test Mapping (प्रैक्टिस मोड टेस्ट मैपिंग)</span>
            <span className="px-1.5 py-0.2 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 text-[10px] rounded-full">
              {(formData.mode_test_map?.topic_wise?.length || 0) +
                (formData.mode_test_map?.subject_wise?.length || 0) +
                (formData.mode_test_map?.full_mock?.length || 0) +
                (formData.mode_test_map?.pyq?.length || 0)} Tests
            </span>
          </button>
        </div>

        {/* FORM CONTENT */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          
          {/* TAB 1: BASIC DETAILS */}
          {activeTab === 'details' && (
            <div className="space-y-4">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* English Title */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Exam Title (English) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HP Police Constable & SI"
                    value={formData.title || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData(prev => ({
                        ...prev,
                        title: val,
                        slug: prev.slug || val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
                      }));
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                </div>

                {/* Hindi Title */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Exam Title (Hindi / हिंदी नाम)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. हिमाचल पुलिस कांस्टेबल भर्ती परीक्षा"
                    value={formData.hindiTitle || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, hindiTitle: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                </div>

              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                
                {/* Category Group */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Category Group
                  </label>
                  <input
                    type="text"
                    list="category-presets"
                    value={formData.category || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                  <datalist id="category-presets">
                    {PRESET_CATEGORIES.map(cat => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>
                </div>

                {/* Badge Text */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Badge Tag (e.g. Trending, Popular, Upcoming)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Hot / Trending"
                    value={formData.badgeText || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, badgeText: e.target.value }))}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                </div>

                {/* Display Order */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Display Order / Sequence
                  </label>
                  <input
                    type="number"
                    value={formData.order_index ?? 1}
                    onChange={(e) => setFormData(prev => ({ ...prev, order_index: parseInt(e.target.value) || 1 }))}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                </div>

              </div>

              {/* Icon Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Select Visual Icon
                </label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {AVAILABLE_ICONS.map(iconName => (
                    <button
                      key={iconName}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, icon: iconName }))}
                      className={`p-2.5 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                        formData.icon === iconName
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm scale-110'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                      }`}
                      title={iconName}
                    >
                      <TargetExamIcon icon={iconName} size="sm" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Exam Syllabus & Test Series Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Describe the exam target, covered subjects (e.g. Hindi, English, Maths, Reasoning, HP GK, Science)..."
                  value={formData.description || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>

              {/* Toggles */}
              <div className="pt-2 flex flex-wrap gap-6 items-center">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.is_active !== false}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Active & Visible to Students (सक्रिय)
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={Boolean(formData.is_popular)}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_popular: e.target.checked }))}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Highlight as Popular / Trending Target
                  </span>
                </label>
              </div>

            </div>
          )}

          {/* TAB 2: MAPPINGS PER PRACTICE MODE */}
          {activeTab === 'mappings' && (
            <div className="space-y-4">
              
              {/* PRACTICE MODES SUB-TABS */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {PRIMARY_PRACTICE_MODES.map(mode => {
                  const isSelected = selectedPracticeMode === mode.id;
                  const count = formData.mode_test_map?.[mode.id]?.length || 0;

                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setSelectedPracticeMode(mode.id)}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 ring-2 ring-blue-500/30 shadow-xs'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <PracticeModeIcon mode={mode.id} size="sm" variant={isSelected ? 'gradient' : 'subtle'} />
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                          count > 0 
                            ? 'bg-blue-600 text-white shadow-xs' 
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                        }`}>
                          {count} Mapped
                        </span>
                      </div>
                      <div className="mt-2.5">
                        <h4 className="text-xs font-black text-slate-900 dark:text-white leading-tight">
                          {mode.title}
                        </h4>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {mode.hindiTitle}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* AUTO MAP INTELLIGENCE BAR */}
              <div className="p-3.5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 rounded-2xl border border-blue-200 dark:border-blue-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Wand2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                      Smart 1-Click Auto-Assign / स्वतः मैच करें
                    </h5>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      Instantly assigns matching tests across all 4 practice modes based on keywords and test categories.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAutoMapAllModes}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>Auto-Map All Modes</span>
                </button>
              </div>

              {autoMapStatus && (
                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold rounded-xl animate-in fade-in">
                  ✓ {autoMapStatus}
                </div>
              )}

              {/* SUBJECT-WISE TEST PICKER SECTION */}
              <div className="space-y-3 pt-1">
                
                {/* Search & Multi-Filters Toolbar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                  
                  {/* Search Tests */}
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder={`Search mock tests in ${PRIMARY_PRACTICE_MODES.find(m => m.id === selectedPracticeMode)?.title}...`}
                      value={testSearchQuery}
                      onChange={(e) => setTestSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                    {testSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setTestSearchQuery('')}
                        className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Subject Dropdown Filter */}
                  <div className="flex items-center gap-1.5">
                    <select
                      value={subjectFilter}
                      onChange={(e) => setSubjectFilter(e.target.value)}
                      className="px-3 py-2 bg-blue-50/70 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900 rounded-xl text-xs font-bold text-blue-900 dark:text-blue-200 outline-hidden cursor-pointer max-w-[170px] truncate"
                      title="Filter by Subject (विषय अनुसार फ़िल्टर)"
                    >
                      <option value="All">All Subjects ({allTests.length})</option>
                      {testSubjects.filter(s => s !== 'All').map(sub => {
                        const count = allTests.filter(t => (t.subject || 'General Studies').trim() === sub).length;
                        return (
                          <option key={sub} value={sub}>
                            {sub} ({count})
                          </option>
                        );
                      })}
                    </select>

                    {/* Category Filter */}
                    {testCategories.length > 2 && (
                      <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 outline-hidden max-w-[140px] truncate cursor-pointer"
                        title="Filter by Category"
                      >
                        {testCategories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    )}

                    {/* Status Filter */}
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as any)}
                      className="px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 outline-hidden cursor-pointer"
                      title="Filter by Mapping Status"
                    >
                      <option value="all">All Status</option>
                      <option value="unmapped">Unmapped Only</option>
                      <option value="mapped">Mapped Only</option>
                    </select>
                  </div>

                  {/* View Mode Toggle: Subject-Grouped vs Flat */}
                  <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0">
                    <button
                      type="button"
                      onClick={() => setViewMode('subject_grouped')}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                        viewMode === 'subject_grouped'
                          ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                      title="Group tests by Subject (विषय-वार सूची)"
                    >
                      <Layers className="w-3 h-3" />
                      <span>Subject-Wise</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('flat')}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                        viewMode === 'flat'
                          ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                      title="Flat List View"
                    >
                      <ListFilter className="w-3 h-3" />
                      <span>Flat List</span>
                    </button>
                  </div>

                </div>

                {/* Quick Subject Chips Bar */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
                  <span className="text-[11px] font-bold text-slate-400 shrink-0 flex items-center gap-1">
                    <BookOpen className="w-3 h-3" />
                    <span>Subjects:</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setSubjectFilter('All')}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] shrink-0 transition-all cursor-pointer ${
                      subjectFilter === 'All'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    All ({allTests.length})
                  </button>
                  {testSubjects.filter(s => s !== 'All').map(sub => {
                    const isSelected = subjectFilter === sub;
                    const count = allTests.filter(t => (t.subject || 'General Studies').trim() === sub).length;
                    const mappedInSub = allTests.filter(
                      t => (t.subject || 'General Studies').trim() === sub && currentModeMappedIds.has(t.id)
                    ).length;

                    return (
                      <button
                        key={sub}
                        type="button"
                        onClick={() => setSubjectFilter(isSelected ? 'All' : sub)}
                        className={`px-2.5 py-1 rounded-lg font-bold text-[11px] shrink-0 transition-all cursor-pointer flex items-center gap-1.5 border ${
                          isSelected
                            ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-500 ring-1 ring-blue-500/30'
                            : 'bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <span>{sub}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                          mappedInSub > 0
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                        }`}>
                          {mappedInSub > 0 ? `${mappedInSub}/${count}` : count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Bulk Actions Header & Summary */}
                <div className="flex flex-wrap items-center justify-between gap-2 px-1 py-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px]">
                      Showing <strong className="text-blue-600 dark:text-blue-400 font-black">{filteredTests.length}</strong> tests
                      {viewMode === 'subject_grouped' && ` in ${subjectGroups.length} subjects`}
                    </span>
                    {viewMode === 'subject_grouped' && subjectGroups.length > 1 && (
                      <div className="flex items-center gap-1 text-[11px] text-slate-500">
                        <span>•</span>
                        <button
                          type="button"
                          onClick={handleExpandAllSubjects}
                          className="text-blue-600 hover:underline font-semibold cursor-pointer"
                        >
                          Expand All
                        </button>
                        <span>/</span>
                        <button
                          type="button"
                          onClick={handleCollapseAllSubjects}
                          className="text-slate-500 hover:underline font-semibold cursor-pointer"
                        >
                          Collapse All
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Add All Visible Button */}
                    <button
                      type="button"
                      onClick={handleSelectAllVisible}
                      disabled={filteredTests.length === 0}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-[11px] font-bold rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1"
                      title="Select and add all currently visible tests into this practice mode"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Select & Add All Visible ({filteredTests.length})</span>
                    </button>

                    {/* Clear Current Mode Button */}
                    <button
                      type="button"
                      onClick={handleClearCurrentMode}
                      disabled={currentModeMappedIds.size === 0}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-rose-100 dark:bg-slate-800 dark:hover:bg-rose-950/40 text-slate-600 hover:text-rose-700 dark:text-slate-400 dark:hover:text-rose-300 disabled:opacity-40 text-[11px] font-bold rounded-xl transition-colors cursor-pointer"
                      title="Remove all mapped tests from this practice mode"
                    >
                      Clear Mode
                    </button>
                  </div>
                </div>

                {/* TEST LIST CONTAINER */}
                {filteredTests.length === 0 ? (
                  <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center space-y-2 bg-white dark:bg-slate-900">
                    <p className="text-xs font-bold text-slate-500">
                      No mock tests found matching the selected filters.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setTestSearchQuery('');
                        setSubjectFilter('All');
                        setCategoryFilter('All');
                        setStatusFilter('all');
                      }}
                      className="text-xs text-blue-600 hover:underline font-bold cursor-pointer"
                    >
                      Reset All Filters (फ़िल्टर रीसेट करें)
                    </button>
                  </div>
                ) : viewMode === 'subject_grouped' ? (
                  /* SUBJECT-WISE GROUPED VIEW */
                  <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                    {subjectGroups.map(group => {
                      const isCollapsed = Boolean(collapsedSubjects[group.subjectName]);

                      return (
                        <div
                          key={group.subjectName}
                          className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-xs transition-all"
                        >
                          {/* Subject Header Bar */}
                          <div
                            onClick={() => toggleSubjectCollapse(group.subjectName)}
                            className="p-3 bg-slate-50/90 hover:bg-slate-100/80 dark:bg-slate-800/60 dark:hover:bg-slate-800 cursor-pointer select-none flex flex-wrap items-center justify-between gap-2.5 transition-colors border-b border-slate-100 dark:border-slate-800/80"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <button
                                type="button"
                                className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                              >
                                {isCollapsed ? (
                                  <ChevronRight className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </button>

                              <div className="w-7 h-7 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0">
                                <BookOpen className="w-3.5 h-3.5" />
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">
                                    {group.subjectName}
                                  </h4>
                                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-300 shrink-0">
                                    {group.totalCount} Tests
                                  </span>
                                </div>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.2">
                                  {group.mappedCount > 0 ? (
                                    <span className="text-blue-600 dark:text-blue-400 font-bold">
                                      ✓ {group.mappedCount} of {group.totalCount} Assigned to {PRIMARY_PRACTICE_MODES.find(m => m.id === selectedPracticeMode)?.title}
                                    </span>
                                  ) : (
                                    <span>0 assigned to this mode</span>
                                  )}
                                </p>
                              </div>
                            </div>

                            {/* Subject Quick Actions ("Select Add") */}
                            <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                              {/* Subject Master Checkbox */}
                              <button
                                type="button"
                                onClick={() => handleToggleSubjectTests(group.tests)}
                                className="p-1 hover:bg-slate-200/60 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                                title={group.allMapped ? 'Deselect all tests in this subject' : 'Select all tests in this subject'}
                              >
                                {group.allMapped ? (
                                  <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                ) : group.someMapped ? (
                                  <MinusSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                ) : (
                                  <Square className="w-4 h-4 text-slate-400" />
                                )}
                              </button>

                              {/* Direct "Select Add Subject" Button */}
                              {group.unmappedCount > 0 ? (
                                <button
                                  type="button"
                                  onClick={() => handleAddSubjectTests(group.tests)}
                                  className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-xl transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                                  title={`Add all ${group.unmappedCount} unmapped tests of ${group.subjectName}`}
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>+ Add Subject ({group.unmappedCount})</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveSubjectTests(group.tests)}
                                  className="px-2.5 py-1 bg-emerald-50 hover:bg-rose-50 dark:bg-emerald-950/40 dark:hover:bg-rose-950/40 text-emerald-700 hover:text-rose-700 dark:text-emerald-300 dark:hover:text-rose-300 border border-emerald-200 dark:border-emerald-800 hover:border-rose-300 text-[11px] font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                                  title="All tests of this subject are assigned. Click to remove all."
                                >
                                  <Check className="w-3 h-3" />
                                  <span>All Added (Remove)</span>
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Tests List inside Subject Accordion */}
                          {!isCollapsed && (
                            <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                              {group.tests.map(test => {
                                const isMapped = currentModeMappedIds.has(test.id);
                                const inferred = inferPracticeMode(test);

                                return (
                                  <div
                                    key={test.id}
                                    onClick={() => handleToggleTestMapping(test.id)}
                                    className={`p-3 flex items-center justify-between gap-3 cursor-pointer select-none transition-colors ${
                                      isMapped
                                        ? 'bg-blue-50/60 dark:bg-blue-950/30'
                                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                    }`}
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div className="shrink-0">
                                        {isMapped ? (
                                          <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                        ) : (
                                          <Square className="w-4 h-4 text-slate-400" />
                                        )}
                                      </div>

                                      <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                          <h4 className={`text-xs font-bold truncate ${
                                            isMapped ? 'text-blue-900 dark:text-blue-200' : 'text-slate-800 dark:text-slate-200'
                                          }`}>
                                            {test.title}
                                          </h4>
                                          <span className="text-[10px] font-mono px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded shrink-0">
                                            {test.test_code}
                                          </span>
                                        </div>

                                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500">
                                          <span>{test.category}</span>
                                          <span>•</span>
                                          <span>{test.total_questions || 0} Questions</span>
                                          <span>•</span>
                                          <span>{test.duration_minutes || 0} Mins</span>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                      {inferred === selectedPracticeMode && (
                                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                          Native Match
                                        </span>
                                      )}
                                      <span className={`text-xs font-bold ${
                                        isMapped ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'
                                      }`}>
                                        {isMapped ? 'Assigned ✓' : 'Add +'}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* FLAT LIST VIEW */
                  <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden max-h-[380px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {filteredTests.map((test) => {
                      const isMapped = currentModeMappedIds.has(test.id);
                      const inferred = inferPracticeMode(test);

                      return (
                        <div
                          key={test.id}
                          onClick={() => handleToggleTestMapping(test.id)}
                          className={`p-3 flex items-center justify-between gap-3 cursor-pointer select-none transition-colors ${
                            isMapped
                              ? 'bg-blue-50/70 dark:bg-blue-950/30'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="shrink-0">
                              {isMapped ? (
                                <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-400" />
                              )}
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className={`text-xs font-bold truncate ${
                                  isMapped ? 'text-blue-900 dark:text-blue-300' : 'text-slate-800 dark:text-slate-200'
                                }`}>
                                  {test.title}
                                </h4>
                                <span className="text-[10px] font-mono px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded shrink-0">
                                  {test.test_code}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500">
                                <span className="font-semibold text-blue-600 dark:text-blue-400">{test.subject}</span>
                                <span>•</span>
                                <span>{test.category}</span>
                                <span>•</span>
                                <span>{test.total_questions} Questions</span>
                                <span>•</span>
                                <span>{test.duration_minutes} Mins</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {inferred === selectedPracticeMode && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                Native Match
                              </span>
                            )}
                            <span className={`text-xs font-bold ${
                              isMapped ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'
                            }`}>
                              {isMapped ? 'Assigned ✓' : 'Add +'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

              </div>

            </div>
          )}

          {/* MODAL FOOTER */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {exam && exam.id && (
                <div>
                  {showDeleteConfirm ? (
                    <div className="flex items-center gap-1.5 bg-rose-50 dark:bg-rose-950/50 p-1 rounded-xl border border-rose-200 dark:border-rose-900 animate-in fade-in">
                      <span className="text-[11px] font-bold text-rose-700 dark:text-rose-300 px-1">Delete this exam?</span>
                      <button
                        type="button"
                        onClick={handleDeleteExam}
                        disabled={isDeleting}
                        className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-lg cursor-pointer flex items-center gap-1 shadow-xs"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>{isDeleting ? 'Deleting...' : 'Yes, Delete'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(false)}
                        className="px-2 py-1 text-slate-500 hover:text-slate-700 dark:text-slate-400 text-xs rounded-lg cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="px-3 py-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border border-rose-200 dark:border-rose-900"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Exam</span>
                    </button>
                  )}
                </div>
              )}

              <div className="text-xs text-slate-500">
                {activeTab === 'details' ? (
                  <button
                    type="button"
                    onClick={() => setActiveTab('mappings')}
                    className="text-blue-600 hover:underline font-bold cursor-pointer"
                  >
                    Next: Configure Practice Mode Mappings →
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setActiveTab('details')}
                    className="text-slate-600 dark:text-slate-400 hover:underline font-bold cursor-pointer"
                  >
                    ← Back to Basic Details
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-md shadow-blue-500/25 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Saving...' : 'Save Target Exam & Mappings'}</span>
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
