import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Search, 
  Check, 
  Sparkles, 
  Target, 
  ArrowRight, 
  Layers, 
  Flame, 
  Compass, 
  BookOpen,
  CheckCircle2
} from 'lucide-react';
import { TargetExam, Test } from '../../types';
import { dataService } from '../../services/dataService';
import { TargetExamIcon } from '../common/TargetExamIcon';
import { PracticeModeIcon } from '../common/PracticeModeIcon';

interface TargetExamSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedExamId: string | null;
  onSelectExam: (exam: TargetExam | null) => void;
  allTests?: Test[];
}

export const TargetExamSelectModal: React.FC<TargetExamSelectModalProps> = ({
  isOpen,
  onClose,
  selectedExamId,
  onSelectExam,
  allTests = []
}) => {
  const [exams, setExams] = useState<TargetExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [tempSelectedId, setTempSelectedId] = useState<string | null>(selectedExamId);

  useEffect(() => {
    if (isOpen) {
      setTempSelectedId(selectedExamId);
      loadExams();
    }
  }, [isOpen, selectedExamId]);

  const loadExams = async () => {
    setLoading(true);
    const list = await dataService.getTargetExams(false);
    setExams(list);
    setLoading(false);
  };

  // Derive available categories
  const categories = useMemo(() => {
    const cats = Array.from(new Set(exams.map(e => e.category).filter(Boolean)));
    return ['All', ...cats];
  }, [exams]);

  // Compute test counts for each target exam
  const examStatsMap = useMemo(() => {
    const map = new Map<string, { total: number; topic_wise: number; subject_wise: number; full_mock: number; pyq: number }>();
    exams.forEach(exam => {
      const testsForThis = dataService.getTestsForTargetExam(exam, 'All', allTests);
      const stats = {
        total: testsForThis.length,
        topic_wise: testsForThis.filter(t => (exam.mode_test_map?.topic_wise?.includes(t.id)) || (dataService.getTestsForTargetExam(exam, 'topic_wise', allTests).some(x => x.id === t.id))).length,
        subject_wise: testsForThis.filter(t => (exam.mode_test_map?.subject_wise?.includes(t.id)) || (dataService.getTestsForTargetExam(exam, 'subject_wise', allTests).some(x => x.id === t.id))).length,
        full_mock: testsForThis.filter(t => (exam.mode_test_map?.full_mock?.includes(t.id)) || (dataService.getTestsForTargetExam(exam, 'full_mock', allTests).some(x => x.id === t.id))).length,
        pyq: testsForThis.filter(t => (exam.mode_test_map?.pyq?.includes(t.id)) || (dataService.getTestsForTargetExam(exam, 'pyq', allTests).some(x => x.id === t.id))).length,
      };
      map.set(exam.id, stats);
    });
    return map;
  }, [exams, allTests]);

  // Filter exams by search and category
  const filteredExams = useMemo(() => {
    return exams.filter(exam => {
      const q = (searchQuery || '').toLowerCase().trim();
      const matchesSearch =
        !q ||
        (exam.title || '').toLowerCase().includes(q) ||
        (exam.hindiTitle || '').toLowerCase().includes(q) ||
        (exam.category || '').toLowerCase().includes(q) ||
        (exam.description || '').toLowerCase().includes(q);

      const matchesCat = selectedCategory === 'All' || exam.category === selectedCategory;

      return matchesSearch && matchesCat;
    });
  }, [exams, searchQuery, selectedCategory]);

  if (!isOpen) return null;

  const handleConfirmSelection = (examToSelect?: TargetExam | null) => {
    const target = examToSelect !== undefined 
      ? examToSelect 
      : exams.find(e => e.id === tempSelectedId) || null;
    
    if (target) {
      dataService.setSelectedTargetExamId(target.id);
      onSelectExam(target);
    } else {
      dataService.setSelectedTargetExamId(null);
      onSelectExam(null);
    }
    onClose();
  };

  const handleSelectAllExams = () => {
    dataService.setSelectedTargetExamId(null);
    onSelectExam(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* MODAL HEADER */}
        <div className="p-3 sm:p-5 bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-white relative shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-blue-500/30 border border-blue-400/40 text-blue-200 text-[10px] sm:text-[11px] font-bold flex items-center gap-1 shrink-0">
                  <Target className="w-3 h-3 text-blue-300" />
                  <span>Target Exam</span>
                </span>
                <h2 className="text-base sm:text-xl font-black tracking-tight text-white truncate">
                  Choose Your Target Exam
                </h2>
              </div>
              <p className="hidden sm:block text-xs text-slate-300 leading-relaxed mt-0.5">
                Select your upcoming exam to unlock tailored <strong>Topic Wise MCQs</strong>, <strong>Section Tests</strong>, <strong>Full Mock Papers</strong>, and <strong>PYQs</strong>.
              </p>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
              title="Close modal"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          {/* SEARCH & SHOW ALL ROW */}
          <div className="mt-2.5 sm:mt-3 pt-2.5 sm:pt-3 border-t border-white/10 flex items-center gap-2">
            {/* Search Input */}
            <div className="relative flex-1 min-w-0">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search exam (SSC, Railways, Police, Banking)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 sm:pl-9 pr-7 sm:pr-8 py-1.5 sm:py-2 bg-white/10 hover:bg-white/15 focus:bg-white/20 text-white placeholder:text-slate-400 border border-white/15 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-blue-400 outline-hidden transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* View All Option Button */}
            <button
              onClick={handleSelectAllExams}
              className="px-2.5 sm:px-3 py-1.5 sm:py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold rounded-lg sm:rounded-xl text-slate-200 hover:text-white transition-all whitespace-nowrap cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
            >
              <BookOpen className="w-3.5 h-3.5 text-blue-300" />
              <span className="hidden xs:inline">Show All</span>
              <span className="xs:hidden">All</span>
            </button>
          </div>

          {/* Category Filter Tabs */}
          {categories.length > 2 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pt-2 pb-0.5 scrollbar-none -mx-1 px-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-0.5 sm:py-1 text-[11px] sm:text-xs font-bold rounded-md sm:rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-blue-500 text-white shadow-xs'
                      : 'bg-white/10 text-slate-300 hover:bg-white/20'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* MODAL BODY / EXAM CARDS GRID */}
        <div className="p-3 sm:p-5 overflow-y-auto flex-1 min-h-0 space-y-3">
          {loading ? (
            <div className="py-12 text-center text-slate-400 font-bold text-sm">
              Loading available target exams...
            </div>
          ) : filteredExams.length === 0 ? (
            <div className="py-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 space-y-2">
              <Target className="w-8 h-8 text-slate-300 mx-auto" />
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Target Exam found</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                No exam matches "{searchQuery}". You can explore all exams or reset your search.
              </p>
              <button
                onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }}
                className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 cursor-pointer"
              >
                Clear Search
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3.5">
              {filteredExams.map((exam) => {
                const isSelected = tempSelectedId === exam.id;
                const stats = examStatsMap.get(exam.id) || { total: 0, topic_wise: 0, subject_wise: 0, full_mock: 0, pyq: 0 };

                return (
                  <div
                    key={exam.id}
                    onClick={() => {
                      setTempSelectedId(exam.id);
                    }}
                    onDoubleClick={() => {
                      handleConfirmSelection(exam);
                    }}
                    className={`group relative rounded-xl sm:rounded-2xl p-3 sm:p-4 cursor-pointer transition-all duration-200 border flex flex-col justify-between select-none ${
                      isSelected
                        ? 'bg-blue-50/90 dark:bg-blue-950/40 border-blue-500 dark:border-blue-400 shadow-md ring-2 ring-blue-500/50 dark:ring-blue-400/50 scale-[1.005]'
                        : 'bg-white dark:bg-slate-800/80 border-slate-200/90 dark:border-slate-700/80 hover:border-blue-300 dark:hover:border-slate-600 hover:shadow-md'
                    }`}
                  >
                    {/* Selected Checkmark Badge */}
                    {isSelected && (
                      <div className="absolute top-2.5 right-2.5 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-blue-600 text-white text-[9px] sm:text-[10px] font-bold shadow-xs">
                        <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 stroke-[3]" /> Chosen
                      </div>
                    )}

                    <div className="space-y-2">
                      
                      {/* Top Category & Badge Row */}
                      <div className="flex items-center justify-between gap-1.5 pr-14">
                        <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700/80 text-slate-600 dark:text-slate-300 truncate">
                          {exam.category}
                        </span>
                        {exam.badgeText && (
                          <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 shrink-0">
                            {exam.badgeText}
                          </span>
                        )}
                      </div>

                      {/* Icon & Title */}
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 shadow-xs ${
                          isSelected
                            ? 'bg-blue-600 text-white'
                            : 'bg-blue-50 dark:bg-slate-700 text-blue-600 dark:text-blue-300 border border-blue-100 dark:border-slate-600'
                        }`}>
                          <TargetExamIcon icon={exam.icon} size="sm" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white leading-snug">
                            {exam.title}
                          </h3>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-1 sm:line-clamp-2 leading-relaxed">
                        {exam.description || 'Targeted test series for comprehensive exam preparation.'}
                      </p>

                      {/* Mode Availability Breakdown Pills */}
                      <div className="pt-1.5 border-t border-slate-100 dark:border-slate-700/60 flex flex-wrap items-center gap-1 text-[9px] sm:text-[10px]">
                        <span className="px-1.5 py-0.2 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold border border-blue-100 dark:border-blue-900/50">
                          📘 {stats.topic_wise || 0} Topic
                        </span>
                        <span className="px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-100 dark:border-indigo-900/50">
                          📑 {stats.subject_wise || 0} Section
                        </span>
                        <span className="px-1.5 py-0.2 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-100 dark:border-emerald-900/50">
                          🎯 {stats.full_mock || 0} Full
                        </span>
                        <span className="px-1.5 py-0.2 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold border border-amber-100 dark:border-amber-900/50">
                          🏛️ {stats.pyq || 0} PYQ
                        </span>
                      </div>

                    </div>

                    {/* Quick Select Action Bar */}
                    <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-500 dark:text-slate-400 text-[10px] sm:text-[11px]">
                        <strong className="text-slate-900 dark:text-white font-black">{stats.total}</strong> Tests
                      </span>

                      <span className={`font-black text-[11px] sm:text-xs inline-flex items-center gap-1 ${
                        isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 group-hover:text-blue-600'
                      }`}>
                        <span>{isSelected ? 'Chosen ✓' : 'Select →'}</span>
                      </span>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="px-3 py-2.5 sm:px-5 sm:py-3 bg-slate-50 dark:bg-slate-950/90 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0">
          <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate max-w-[130px] sm:max-w-xs">
            {tempSelectedId ? (
              <span className="truncate block">
                Selected: <strong className="text-blue-600 dark:text-blue-400 font-black">{exams.find(e => e.id === tempSelectedId)?.title}</strong>
              </span>
            ) : (
              <span className="truncate block">Select exam or click All</span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-auto">
            <button
              onClick={onClose}
              className="px-2.5 sm:px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-all cursor-pointer"
            >
              Skip
            </button>

            <button
              onClick={() => handleConfirmSelection()}
              disabled={!tempSelectedId}
              className={`px-3.5 sm:px-5 py-1.5 rounded-lg text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-1.5 shadow-xs ${
                tempSelectedId
                  ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer active:scale-95'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
              }`}
            >
              <span>Continue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
