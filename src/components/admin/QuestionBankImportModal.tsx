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
  Plus
} from 'lucide-react';
import { Question } from '../../types';
import { dataService } from '../../services/dataService';
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
  const [loading, setLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedChapter, setSelectedChapter] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');

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
      const all = await dataService.getAllQuestionBank();
      const currentIds = new Set(existingQuestions.map(q => q.id));
      // Show questions that aren't already in this test
      const available = all.filter(q => !currentIds.has(q.id));
      setAllBankQuestions(available);
      setSelectedIds(new Set());
    } catch (err) {
      console.error('Failed to load bank questions', err);
      notify('error', 'Failed to load question bank.');
    } finally {
      setLoading(false);
    }
  };

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

      return matchesSearch && matchesSubject && matchesChapter && matchesDifficulty;
    });
  }, [allBankQuestions, searchQuery, selectedSubject, selectedChapter, selectedDifficulty]);

  // Check if all filtered are selected
  const isAllFilteredSelected = filteredQuestions.length > 0 && filteredQuestions.every(q => selectedIds.has(q.id));
  const someFilteredSelected = filteredQuestions.some(q => selectedIds.has(q.id));

  // Handlers
  const handleToggleQuestion = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleSelectAllFiltered = () => {
    if (isAllFilteredSelected) {
      // Deselect all filtered
      setSelectedIds(prev => {
        const next = new Set(prev);
        filteredQuestions.forEach(q => next.delete(q.id));
        return next;
      });
    } else {
      // Select all filtered
      setSelectedIds(prev => {
        const next = new Set(prev);
        filteredQuestions.forEach(q => next.add(q.id));
        return next;
      });
    }
  };

  const handleQuickPickRandom = (count: number) => {
    const unselected = filteredQuestions.filter(q => !selectedIds.has(q.id));
    if (unselected.length === 0) {
      notify('info', 'All currently filtered questions are already selected!');
      return;
    }
    const shuffled = [...unselected].sort(() => 0.5 - Math.random());
    const picked = shuffled.slice(0, count);
    setSelectedIds(prev => {
      const next = new Set(prev);
      picked.forEach(q => next.add(q.id));
      return next;
    });
    notify('success', `Added ${picked.length} random questions to your selection!`);
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedSubject('all');
    setSelectedChapter('all');
    setSelectedDifficulty('all');
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
            <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400">
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
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {allBankQuestions.length} Questions available to add (Already added: {existingQuestions.length})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <div className="px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-xs font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1.5 shadow-xs">
              <CheckSquare className="w-4 h-4 text-purple-600" />
              <span>{selectedIds.size} Selected</span>
            </div>
            {selectedIds.size > 0 && (
              <button
                type="button"
                onClick={handleClearSelection}
                className="px-2.5 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition-all"
              >
                Clear Selection
              </button>
            )}
          </div>
        </div>

        {/* SEARCH & FILTER CONTROLS BAR */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
          
          {/* Row 1: Search Bar & Reset */}
          <div className="flex flex-col sm:flex-row gap-2.5 items-center">
            <div className="relative flex-1 w-full">
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

            {(selectedSubject !== 'all' || selectedChapter !== 'all' || selectedDifficulty !== 'all' || searchQuery) && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="text-xs font-semibold text-slate-500 hover:text-purple-600 flex items-center gap-1 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors whitespace-nowrap"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reset Filters
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
                  setSelectedChapter('all'); // Reset chapter when subject changes
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
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold transition-all ${
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
                  ? `Deselect All Filtered (${filteredQuestions.length})`
                  : `Select All Filtered (${filteredQuestions.length})`}
              </span>
            </button>

            {/* Quick Pick Random Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                Quick Pick:
              </span>
              {[5, 10, 15, 20, 25].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => handleQuickPickRandom(n)}
                  disabled={filteredQuestions.length === 0}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-purple-100 dark:bg-slate-700 dark:hover:bg-purple-950 text-slate-700 hover:text-purple-700 dark:text-slate-200 dark:hover:text-purple-300 rounded-lg font-bold text-[11px] transition-colors disabled:opacity-40"
                  title={`Pick ${n} random questions from currently filtered list`}
                >
                  +{n} Random
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
              <span>Loading questions from central bank...</span>
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
                className="mt-2 px-4 py-1.5 text-xs font-bold text-purple-600 bg-purple-50 dark:bg-purple-950 rounded-xl hover:bg-purple-100 transition-colors"
              >
                Clear All Filters
              </button>
            </div>
          ) : (
            <div className="max-h-[460px] overflow-y-auto space-y-2.5 p-1 pr-1.5 scrollbar-thin">
              {filteredQuestions.map((bq, index) => {
                const isSelected = selectedIds.has(bq.id);
                const isExpanded = expandedExplanationId === bq.id;

                return (
                  <div
                    key={bq.id}
                    onClick={() => handleToggleQuestion(bq.id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer select-none ${
                      isSelected 
                        ? 'bg-purple-50/90 dark:bg-purple-950/40 border-purple-500 shadow-xs ring-1 ring-purple-500' 
                        : 'bg-white dark:bg-slate-800/90 border-slate-200/90 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-xs'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      
                      {/* Checkbox */}
                      <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleQuestion(bq.id)}
                          className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                        />
                      </div>

                      {/* Question Content */}
                      <div className="flex-1 min-w-0 space-y-2 text-xs">
                        
                        {/* Badges Bar */}
                        <div className="flex items-center gap-1.5 flex-wrap">
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

                        {/* Options Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                          <div className={`p-2 rounded-xl border text-[11px] ${
                            bq.correct_answer === 'A' 
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 font-bold text-emerald-900 dark:text-emerald-200' 
                              : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300'
                          }`}>
                            <span className="font-bold mr-1">A.</span> {bq.option_a}
                            {bq.correct_answer === 'A' && <span className="ml-1 text-emerald-600 font-bold">✓</span>}
                          </div>

                          <div className={`p-2 rounded-xl border text-[11px] ${
                            bq.correct_answer === 'B' 
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 font-bold text-emerald-900 dark:text-emerald-200' 
                              : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300'
                          }`}>
                            <span className="font-bold mr-1">B.</span> {bq.option_b}
                            {bq.correct_answer === 'B' && <span className="ml-1 text-emerald-600 font-bold">✓</span>}
                          </div>

                          <div className={`p-2 rounded-xl border text-[11px] ${
                            bq.correct_answer === 'C' 
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 font-bold text-emerald-900 dark:text-emerald-200' 
                              : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300'
                          }`}>
                            <span className="font-bold mr-1">C.</span> {bq.option_c}
                            {bq.correct_answer === 'C' && <span className="ml-1 text-emerald-600 font-bold">✓</span>}
                          </div>

                          <div className={`p-2 rounded-xl border text-[11px] ${
                            bq.correct_answer === 'D' 
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 font-bold text-emerald-900 dark:text-emerald-200' 
                              : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300'
                          }`}>
                            <span className="font-bold mr-1">D.</span> {bq.option_d}
                            {bq.correct_answer === 'D' && <span className="ml-1 text-emerald-600 font-bold">✓</span>}
                          </div>
                        </div>

                        {/* Optional Explanation Accordion */}
                        {bq.explanation && (
                          <div className="pt-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => setExpandedExplanationId(isExpanded ? null : bq.id)}
                              className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                            >
                              <span>{isExpanded ? 'Hide Explanation' : 'View Explanation'}</span>
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                            {isExpanded && (
                              <div className="mt-1.5 p-2.5 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded-xl text-[11px] text-slate-700 dark:text-slate-300">
                                <span className="font-bold text-blue-800 dark:text-blue-300 block mb-0.5">Explanation:</span>
                                {bq.explanation}
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
              className="px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
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
