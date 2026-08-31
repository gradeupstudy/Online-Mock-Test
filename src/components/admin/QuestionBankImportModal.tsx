import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Check, 
  Filter, 
  BookOpen, 
  Layers, 
  Sparkles, 
  Zap, 
  CheckSquare, 
  Square, 
  X, 
  ChevronDown, 
  ChevronUp, 
  HelpCircle,
  Hash,
  Award,
  RefreshCw,
  Plus,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Lock,
  Unlock,
  Info
} from 'lucide-react';
import { Question } from '../../types';
import { 
  dataService, 
  getQuestionFingerprint, 
  getQuestionMockTestUsages, 
  QuestionBankUsageReport, 
  MockTestUsageInfo 
} from '../../services/dataService';
import { Modal } from '../common/Modal';

interface QuestionBankImportModalProps {
  isOpen: boolean;
  testId: string;
  testTitle?: string;
  existingQuestions: Question[];
  onClose: () => void;
  onSuccessImport: () => void;
  onToast?: (type: 'success' | 'error' | 'info', msg: string) => void;
}

export const QuestionBankImportModal: React.FC<QuestionBankImportModalProps> = ({
  isOpen,
  testId,
  testTitle,
  existingQuestions,
  onClose,
  onSuccessImport,
  onToast,
}) => {
  const [allBankQuestions, setAllBankQuestions] = useState<Question[]>([]);
  const [usageReport, setUsageReport] = useState<QuestionBankUsageReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedChapter, setSelectedChapter] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [selectedUsageFilter, setSelectedUsageFilter] = useState<'all' | 'fresh_only' | 'already_used'>('all');

  // Anti-Duplicate & Safety Settings
  const [preventDuplicates, setPreventDuplicates] = useState(true);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedExplanationId, setExpandedExplanationId] = useState<string | null>(null);

  const notify = (type: 'success' | 'error' | 'info', msg: string) => {
    if (onToast) onToast(type, msg);
  };

  useEffect(() => {
    if (isOpen) {
      loadBankData();
    }
  }, [isOpen]);

  const loadBankData = async () => {
    setLoading(true);
    try {
      const [all, report] = await Promise.all([
        dataService.getAllQuestionBank(),
        dataService.getMockTestQuestionUsageMap()
      ]);

      const currentIds = new Set(existingQuestions.map(q => q.id));
      const currentFps = new Set(existingQuestions.map(q => getQuestionFingerprint(q)).filter(Boolean));

      // Filter out questions that are already in THIS test (by id or exact fingerprint)
      const available = all.filter(q => {
        if (currentIds.has(q.id)) return false;
        const fp = getQuestionFingerprint(q);
        if (fp && currentFps.has(fp)) return false;
        return true;
      });

      setAllBankQuestions(available);
      setUsageReport(report);
      setSelectedIds(new Set());
    } catch (err) {
      console.error('Failed to load bank questions', err);
      notify('error', 'Failed to load question bank.');
    } finally {
      setLoading(false);
    }
  };

  // Usage stats
  const usageStats = useMemo(() => {
    let freshCount = 0;
    let usedCount = 0;
    allBankQuestions.forEach(q => {
      const usages = getQuestionMockTestUsages(q, usageReport, testId);
      if (usages.length > 0) usedCount++;
      else freshCount++;
    });
    return { freshCount, usedCount, total: allBankQuestions.length };
  }, [allBankQuestions, usageReport, testId]);

  // Extract unique subjects with counts
  const subjectOptions = useMemo(() => {
    const map = new Map<string, number>();
    allBankQuestions.forEach(q => {
      const subj = q.subject || 'General Studies';
      map.set(subj, (map.get(subj) || 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [allBankQuestions]);

  // Extract unique chapters with counts based on selected subject
  const chapterOptions = useMemo(() => {
    const map = new Map<string, number>();
    allBankQuestions.forEach(q => {
      const subj = q.subject || 'General Studies';
      if (selectedSubject === 'all' || subj === selectedSubject) {
        const chapt = q.chapter || 'General';
        map.set(chapt, (map.get(chapt) || 0) + 1);
      }
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [allBankQuestions, selectedSubject]);

  // Filtered list of questions
  const filteredQuestions = useMemo(() => {
    return allBankQuestions.filter(q => {
      const s = searchQuery.toLowerCase().trim();
      const qText = (q.question_text || '').toLowerCase();
      const optA = (q.option_a || '').toLowerCase();
      const optB = (q.option_b || '').toLowerCase();
      const optC = (q.option_c || '').toLowerCase();
      const optD = (q.option_d || '').toLowerCase();
      const subj = (q.subject || '').toLowerCase();
      const chapt = (q.chapter || '').toLowerCase();

      const matchesSearch = !s || qText.includes(s) || optA.includes(s) || optB.includes(s) || optC.includes(s) || optD.includes(s) || subj.includes(s) || chapt.includes(s);
      const matchesSubject = selectedSubject === 'all' || (q.subject || 'General Studies') === selectedSubject;
      const matchesChapter = selectedChapter === 'all' || (q.chapter || 'General') === selectedChapter;
      const matchesDifficulty = selectedDifficulty === 'all' || (q.difficulty || 'Medium') === selectedDifficulty;

      // Mock Test Usage filter
      const usages = getQuestionMockTestUsages(q, usageReport, testId);
      const isUsed = usages.length > 0;
      let matchesUsage = true;
      if (selectedUsageFilter === 'fresh_only') {
        matchesUsage = !isUsed;
      } else if (selectedUsageFilter === 'already_used') {
        matchesUsage = isUsed;
      }

      return matchesSearch && matchesSubject && matchesChapter && matchesDifficulty && matchesUsage;
    });
  }, [allBankQuestions, searchQuery, selectedSubject, selectedChapter, selectedDifficulty, selectedUsageFilter, usageReport, testId]);

  // Check if all selectable filtered are selected
  const selectableFiltered = useMemo(() => {
    if (!preventDuplicates) return filteredQuestions;
    return filteredQuestions.filter(q => getQuestionMockTestUsages(q, usageReport, testId).length === 0);
  }, [filteredQuestions, preventDuplicates, usageReport, testId]);

  const isAllFilteredSelected = selectableFiltered.length > 0 && selectableFiltered.every(q => selectedIds.has(q.id));
  const someFilteredSelected = selectableFiltered.some(q => selectedIds.has(q.id));

  // Handlers
  const handleToggleQuestion = (id: string) => {
    const question = allBankQuestions.find(q => q.id === id);
    const usages = question ? getQuestionMockTestUsages(question, usageReport, testId) : [];
    const isAlreadyUsed = usages.length > 0;

    if (!selectedIds.has(id) && isAlreadyUsed && preventDuplicates) {
      notify(
        'info', 
        `⚠️ Yeh MCQ pehle se "${usages[0].testTitle}" me added hai. Agar reuse karna hai to upar "Prevent Duplicate MCQs" ko uncheck karein.`
      );
      return;
    }

    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleSelectAllFiltered = () => {
    if (isAllFilteredSelected) {
      // Deselect all selectable filtered
      setSelectedIds(prev => {
        const next = new Set(prev);
        selectableFiltered.forEach(q => next.delete(q.id));
        return next;
      });
    } else {
      // Select all selectable filtered
      if (selectableFiltered.length === 0) {
        notify('info', 'No fresh/available questions in current filter. Turn off "Prevent Duplicate MCQs" to select already used questions.');
        return;
      }
      setSelectedIds(prev => {
        const next = new Set(prev);
        selectableFiltered.forEach(q => next.add(q.id));
        return next;
      });
      if (preventDuplicates && filteredQuestions.length > selectableFiltered.length) {
        const skipped = filteredQuestions.length - selectableFiltered.length;
        notify('info', `Selected ${selectableFiltered.length} fresh MCQs (Skipped ${skipped} MCQs already used in other mock tests).`);
      }
    }
  };

  const handleQuickPickRandom = (count: number) => {
    // Pick only selectable (fresh if preventDuplicates is true)
    const unselected = selectableFiltered.filter(q => !selectedIds.has(q.id));
    if (unselected.length === 0) {
      if (preventDuplicates && filteredQuestions.length > selectableFiltered.length) {
        notify('info', 'All available fresh questions are already selected! Remaining questions are already used in other mock tests.');
      } else {
        notify('info', 'All currently filtered questions are already selected!');
      }
      return;
    }
    const shuffled = [...unselected].sort(() => 0.5 - Math.random());
    const picked = shuffled.slice(0, count);
    setSelectedIds(prev => {
      const next = new Set(prev);
      picked.forEach(q => next.add(q.id));
      return next;
    });
    notify('success', `Added ${picked.length} fresh random MCQs to your selection!`);
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedSubject('all');
    setSelectedChapter('all');
    setSelectedDifficulty('all');
    setSelectedUsageFilter('all');
  };

  const handleImportSelected = async () => {
    const toImport = allBankQuestions.filter(q => selectedIds.has(q.id));
    if (toImport.length === 0) {
      notify('error', 'Please select at least one question to import!');
      return;
    }

    setIsImporting(true);
    try {
      await dataService.addQuestionsToExistingTest(testId, toImport);
      notify('success', `Successfully imported ${toImport.length} questions into mock test!`);
      onSuccessImport();
      onClose();
    } catch (err) {
      console.error('Failed to import questions to test', err);
      notify('error', 'Failed to import questions. Please try again.');
    } finally {
      setIsImporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Import Questions from Question Bank"
      maxWidth="5xl"
    >
      <div className="space-y-4">
        
        {/* TOP BAR / STATS HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Central Question Bank
                {testTitle && (
                  <span className="text-xs font-normal text-slate-500 truncate max-w-xs">
                    for &ldquo;{testTitle}&rdquo;
                  </span>
                )}
              </h4>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex-wrap">
                <span>{allBankQuestions.length} Available in Bank</span>
                <span>•</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {usageStats.freshCount} Fresh / Unused
                </span>
                {usageStats.usedCount > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> {usageStats.usedCount} In Other Mocks
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center flex-wrap">
            <div className="px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-xs font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1.5 shadow-xs">
              <CheckSquare className="w-4 h-4 text-purple-600" />
              <span>{selectedIds.size} Selected</span>
            </div>
            {selectedIds.size > 0 && (
              <button
                type="button"
                onClick={handleClearSelection}
                className="px-2.5 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition-all cursor-pointer"
              >
                Clear Selection
              </button>
            )}
          </div>
        </div>

        {/* ANTI-DUPLICATE GUARD BANNER & CONTROLS */}
        <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 dark:from-slate-800 dark:via-purple-950/30 dark:to-slate-800 p-3 rounded-2xl border border-purple-200 dark:border-purple-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${preventDuplicates ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300' : 'bg-slate-200 dark:bg-slate-700 text-slate-600'}`}>
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>Multi-Mock Overlap Protection</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold uppercase ${preventDuplicates ? 'bg-emerald-500 text-white' : 'bg-slate-400 text-white'}`}>
                  {preventDuplicates ? 'Active' : 'Off'}
                </span>
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {preventDuplicates 
                  ? 'Har MCQ par indicator dikhega agar wo pehle kisi mock me add ho chuka hai, aur duplicate add hone se protect karega.'
                  : 'Overlap protection off hai: Ek hi question ko multiple mock tests me select kiya ja sakta hai.'}
              </p>
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer select-none bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs hover:border-purple-400 transition-all shrink-0">
            <input
              type="checkbox"
              checked={preventDuplicates}
              onChange={(e) => setPreventDuplicates(e.target.checked)}
              className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
            />
            <span>Prevent Duplicate MCQs</span>
          </label>
        </div>

        {/* SEARCH & FILTER CONTROLS BAR */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
          
          {/* Row 1: Search Bar & Usage Filter Tabs */}
          <div className="flex flex-col md:flex-row gap-2.5 items-stretch md:items-center">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by keywords in question, options, subject, chapter..."
                className="w-full pl-10 pr-9 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-medium focus:ring-2 focus:ring-purple-500 focus:bg-white dark:focus:bg-slate-900 outline-hidden transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* USAGE FILTER CHIPS */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0 text-xs">
              <button
                type="button"
                onClick={() => setSelectedUsageFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  selectedUsageFilter === 'all'
                    ? 'bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                All ({allBankQuestions.length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedUsageFilter('fresh_only')}
                className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-all ${
                  selectedUsageFilter === 'fresh_only'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                }`}
              >
                <CheckCircle2 className="w-3 h-3" />
                Fresh Only ({usageStats.freshCount})
              </button>
              <button
                type="button"
                onClick={() => setSelectedUsageFilter('already_used')}
                className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-all ${
                  selectedUsageFilter === 'already_used'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                }`}
              >
                <AlertTriangle className="w-3 h-3" />
                Used in Mocks ({usageStats.usedCount})
              </button>
            </div>

            {(selectedSubject !== 'all' || selectedChapter !== 'all' || selectedDifficulty !== 'all' || selectedUsageFilter !== 'all' || searchQuery) && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="text-xs font-semibold text-slate-500 hover:text-purple-600 flex items-center justify-center gap-1 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors whitespace-nowrap"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reset
              </button>
            )}
          </div>

          {/* Row 2: Subject, Chapter & Difficulty Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
            
            {/* Subject Filter */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5 text-blue-500" />
                Filter by Subject
              </label>
              <select
                value={selectedSubject}
                onChange={(e) => {
                  setSelectedSubject(e.target.value);
                  setSelectedChapter('all');
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-purple-500 outline-hidden"
              >
                <option value="all">📚 All Subjects ({allBankQuestions.length})</option>
                {subjectOptions.map(([subj, count]) => (
                  <option key={subj} value={subj}>
                    {subj} ({count} Qs)
                  </option>
                ))}
              </select>
            </div>

            {/* Chapter / Topic Filter */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-emerald-500" />
                Filter by Chapter
              </label>
              <select
                value={selectedChapter}
                onChange={(e) => setSelectedChapter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-purple-500 outline-hidden"
              >
                <option value="all">📑 All Chapters ({chapterOptions.reduce((acc, c) => acc + c[1], 0)})</option>
                {chapterOptions.map(([chapt, count]) => (
                  <option key={chapt} value={chapt}>
                    {chapt} ({count} Qs)
                  </option>
                ))}
              </select>
            </div>

            {/* Difficulty Filter */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-amber-500" />
                Difficulty Level
              </label>
              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-purple-500 outline-hidden"
              >
                <option value="all">🎯 All Difficulties</option>
                <option value="Easy">🟢 Easy</option>
                <option value="Medium">🟡 Medium</option>
                <option value="Hard">🔴 Hard</option>
              </select>
            </div>

          </div>

          {/* QUICK BATCH SELECTION TOOLBAR */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-700/60 text-xs">
            
            {/* Select All Filtered Checkbox Button */}
            <button
              type="button"
              onClick={handleToggleSelectAllFiltered}
              disabled={filteredQuestions.length === 0}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                isAllFilteredSelected 
                  ? 'bg-purple-600 text-white shadow-xs' 
                  : someFilteredSelected
                    ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-300'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200'
              } disabled:opacity-50`}
            >
              {isAllFilteredSelected ? (
                <CheckSquare className="w-4 h-4" />
              ) : (
                <Square className="w-4 h-4 text-slate-400" />
              )}
              <span>
                {isAllFilteredSelected
                  ? `Deselect Filtered (${selectableFiltered.length})`
                  : preventDuplicates && filteredQuestions.length > selectableFiltered.length
                    ? `Select Fresh Filtered (${selectableFiltered.length})`
                    : `Select All Filtered (${filteredQuestions.length})`}
              </span>
            </button>

            {/* Quick Pick Random Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                Quick Pick (Fresh):
              </span>
              {[5, 10, 15, 20, 25].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => handleQuickPickRandom(n)}
                  disabled={selectableFiltered.length === 0}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-purple-100 dark:bg-slate-700 dark:hover:bg-purple-950 text-slate-700 hover:text-purple-700 dark:text-slate-200 dark:hover:text-purple-300 rounded-lg font-bold text-[11px] transition-colors disabled:opacity-40 cursor-pointer"
                  title={`Pick ${n} random fresh questions from currently filtered list`}
                >
                  +{n} Fresh
                </button>
              ))}
            </div>

          </div>

        </div>

        {/* QUESTIONS LIST CONTAINER */}
        <div className="space-y-2">
          
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 px-1">
            <span>Showing {filteredQuestions.length} of {allBankQuestions.length} Questions</span>
            <span>Click any question card to select/deselect</span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-purple-600" />
              <span>Loading questions & mock test usage map...</span>
            </div>
          ) : filteredQuestions.length === 0 ? (
            <div className="p-12 text-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 space-y-2">
              <HelpCircle className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                No questions found matching your filter criteria
              </p>
              <p className="text-xs text-slate-400">
                Try changing the subject/chapter filter or clearing the search keyword.
              </p>
              <button
                type="button"
                onClick={handleClearFilters}
                className="mt-2 px-4 py-1.5 text-xs font-bold text-purple-600 bg-purple-50 dark:bg-purple-950 rounded-xl hover:bg-purple-100 transition-colors cursor-pointer"
              >
                Clear All Filters
              </button>
            </div>
          ) : (
            <div className="max-h-[460px] overflow-y-auto space-y-2.5 p-1 pr-1.5 scrollbar-thin">
              {filteredQuestions.map((bq, index) => {
                const isSelected = selectedIds.has(bq.id);
                const isExpanded = expandedExplanationId === bq.id;
                const usages = getQuestionMockTestUsages(bq, usageReport, testId);
                const isAlreadyUsed = usages.length > 0;
                const isLocked = isAlreadyUsed && preventDuplicates;

                return (
                  <div
                    key={bq.id}
                    onClick={() => handleToggleQuestion(bq.id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer select-none ${
                      isSelected 
                        ? 'bg-purple-50/90 dark:bg-purple-950/40 border-purple-500 shadow-xs ring-1 ring-purple-500' 
                        : isAlreadyUsed
                          ? 'bg-amber-50/30 dark:bg-amber-950/15 border-amber-300/80 dark:border-amber-700/60 hover:border-amber-400'
                          : 'bg-white dark:bg-slate-800/90 border-slate-200/90 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-xs'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      
                      {/* Checkbox / Lock */}
                      <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
                        {isLocked && !isSelected ? (
                          <div 
                            onClick={() => handleToggleQuestion(bq.id)}
                            title={`Locked: Already used in "${usages.map(u => u.testTitle).join(', ')}"`}
                            className="w-4 h-4 rounded bg-amber-100 dark:bg-amber-950 border border-amber-400 flex items-center justify-center cursor-pointer text-amber-700"
                          >
                            <Lock className="w-2.5 h-2.5" />
                          </div>
                        ) : (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleQuestion(bq.id)}
                            className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                          />
                        )}
                      </div>

                      {/* Question Content */}
                      <div className="flex-1 min-w-0 space-y-2 text-xs">
                        
                        {/* Badges Bar */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          
                          {/* CRITICAL: MOCK TEST USAGE INDICATOR BADGE */}
                          {isAlreadyUsed ? (
                            <span 
                              className="px-2.5 py-0.5 bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700/80 rounded-md font-bold text-[10px] flex items-center gap-1 shadow-xs"
                              title={`Already added in: ${usages.map(u => u.testTitle).join(', ')}`}
                            >
                              <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                              <span>Already in Mock: <b>{usages.map(u => u.testTitle).join(', ')}</b></span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 rounded-md font-bold text-[10px] flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              <span>⭐ Fresh MCQ</span>
                            </span>
                          )}

                          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-200 rounded-md font-bold text-[10px]">
                            {bq.subject || 'General'}
                          </span>

                          {bq.chapter && (
                            <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 rounded-md font-bold text-[10px]">
                              {bq.chapter}
                            </span>
                          )}

                          {bq.difficulty && (
                            <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                              bq.difficulty === 'Easy' 
                                ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300'
                                : bq.difficulty === 'Hard'
                                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            }`}>
                              {bq.difficulty}
                            </span>
                          )}

                          {bq.quality_score && (
                            <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 rounded-md font-bold text-[10px] flex items-center gap-1">
                              <Sparkles className="w-2.5 h-2.5 text-purple-600" />
                              QA {bq.quality_score}%
                            </span>
                          )}

                          <span className="text-[10px] text-slate-400 ml-auto">
                            #{index + 1}
                          </span>
                        </div>

                        {/* Question Text */}
                        <p className="font-bold text-slate-900 dark:text-white leading-relaxed text-[13px]">
                          {bq.question_text}
                        </p>

                        {/* Question Image / Diagram */}
                        {bq.question_image && (
                          <div className="my-1.5 p-1 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 max-w-xs">
                            <img
                              src={bq.question_image}
                              alt="Question Diagram"
                              className="max-h-32 w-auto object-contain rounded"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        )}

                        {/* Options Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                          {[
                            { key: 'A', text: bq.option_a, img: bq.option_a_image },
                            { key: 'B', text: bq.option_b, img: bq.option_b_image },
                            { key: 'C', text: bq.option_c, img: bq.option_c_image },
                            { key: 'D', text: bq.option_d, img: bq.option_d_image },
                          ].map(({ key, text, img }) => {
                            if (!text && !img) return null;
                            const isCorrect = bq.correct_answer === key;
                            return (
                              <div
                                key={key}
                                className={`p-2 rounded-xl border text-[11px] flex flex-col gap-1 ${
                                  isCorrect
                                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 font-bold text-emerald-900 dark:text-emerald-200'
                                    : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span><b className="mr-1">{key}.</b> {text}</span>
                                  {isCorrect && <span className="text-emerald-600 font-bold">✓</span>}
                                </div>
                                {img && (
                                  <div className="p-0.5 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 max-w-[120px]">
                                    <img
                                      src={img}
                                      alt={`Option ${key}`}
                                      className="max-h-16 w-auto object-contain rounded"
                                      referrerPolicy="no-referrer"
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Optional Explanation Accordion */}
                        {(bq.explanation || bq.explanation_image) && (
                          <div className="pt-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => setExpandedExplanationId(isExpanded ? null : bq.id)}
                              className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <span>{isExpanded ? 'Hide Explanation' : 'View Explanation'}</span>
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                            {isExpanded && (
                              <div className="mt-1.5 p-2.5 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded-xl text-[11px] text-slate-700 dark:text-slate-300 space-y-2">
                                <span className="font-bold text-blue-800 dark:text-blue-300 block mb-0.5">Explanation:</span>
                                {bq.explanation && <p>{bq.explanation}</p>}
                                {bq.explanation_image && (
                                  <div className="p-1 bg-white dark:bg-slate-800 rounded border border-blue-200 dark:border-blue-800 max-w-xs">
                                    <img
                                      src={bq.explanation_image}
                                      alt="Solution Diagram"
                                      className="max-h-28 w-auto object-contain rounded"
                                      referrerPolicy="no-referrer"
                                    />
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* STICKY FOOTER ACTIONS */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
          <div className="text-xs font-bold text-slate-600 dark:text-slate-400">
            {selectedIds.size > 0 ? (
              <span className="text-purple-600 dark:text-purple-400">
                ✨ Ready to add {selectedIds.size} questions to test
              </span>
            ) : (
              <span>Select questions above or use quick pick to import</span>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleImportSelected}
              disabled={selectedIds.size === 0 || isImporting}
              className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              {isImporting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Importing Questions...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Import {selectedIds.size} Questions to Test</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </Modal>
  );
};
