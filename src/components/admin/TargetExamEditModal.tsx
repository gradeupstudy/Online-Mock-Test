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
  Filter
} from 'lucide-react';
import { TargetExam, Test, PracticeMode, PRIMARY_PRACTICE_MODES } from '../../types';
import { dataService, inferPracticeMode } from '../../services/dataService';
import { TargetExamIcon } from '../common/TargetExamIcon';

interface TargetExamEditModalProps {
  isOpen: boolean;
  exam: TargetExam | null;
  onClose: () => void;
  onSaved: (savedExam: TargetExam) => void;
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
  const [isSaving, setIsSaving] = useState(false);
  const [autoMapStatus, setAutoMapStatus] = useState<string | null>(null);

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

  // Filter tests list based on search and category
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

      return matchesQuery && matchesCategory;
    });
  }, [allTests, testSearchQuery, categoryFilter]);

  // Current mapped tests for the selected practice mode
  const currentModeMappedIds = useMemo(() => {
    return new Set(formData.mode_test_map?.[selectedPracticeMode] || []);
  }, [formData.mode_test_map, selectedPracticeMode]);

  // Handler to toggle a test in current practice mode
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
                {exam ? 'Edit Target Exam & Mappings' : 'Create New Target Exam (नया लक्ष्य परीक्षा)'}
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
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
                          ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 ring-2 ring-blue-500/30'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-base">{mode.icon}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                          count > 0 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                        }`}>
                          {count} Mapped
                        </span>
                      </div>
                      <div className="mt-2">
                        <h4 className="text-xs font-black text-slate-900 dark:text-white leading-tight">
                          {mode.title}
                        </h4>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
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

              {/* TEST PICKER SECTION */}
              <div className="space-y-3 pt-2">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                  
                  {/* Search Tests */}
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder={`Search mock tests to assign to ${PRIMARY_PRACTICE_MODES.find(m => m.id === selectedPracticeMode)?.title}...`}
                      value={testSearchQuery}
                      onChange={(e) => setTestSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Category Filter */}
                  {testCategories.length > 2 && (
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 outline-hidden"
                    >
                      {testCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  )}

                  {/* Bulk Select / Deselect */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={handleSelectAllVisible}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      Select All Visible
                    </button>
                    <button
                      type="button"
                      onClick={handleClearCurrentMode}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-rose-100 dark:bg-slate-800 dark:hover:bg-rose-950/40 text-slate-700 hover:text-rose-700 dark:text-slate-300 dark:hover:text-rose-300 text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      Clear Mode
                    </button>
                  </div>

                </div>

                {/* TEST LIST CHECKBOX MATRIX */}
                <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden max-h-[320px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {filteredTests.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs font-semibold">
                      No mock tests available matching filter.
                    </div>
                  ) : (
                    filteredTests.map((test) => {
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
                                <span>{test.category}</span>
                                <span>•</span>
                                <span>{test.subject}</span>
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
                    })
                  )}
                </div>

              </div>

            </div>
          )}

          {/* MODAL FOOTER */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
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
