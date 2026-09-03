import React, { useState, useEffect, useMemo } from 'react';
import { 
  Target, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Layers, 
  Sparkles, 
  Check, 
  X, 
  Wand2, 
  ArrowUpDown,
  BookOpen,
  Filter,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { TargetExam, Test, PRIMARY_PRACTICE_MODES } from '../../types';
import { dataService } from '../../services/dataService';
import { TargetExamIcon } from '../common/TargetExamIcon';
import { TargetExamEditModal } from './TargetExamEditModal';

interface TargetExamManagerProps {
  onToast: (type: 'success' | 'error' | 'info', msg: string) => void;
}

export const TargetExamManager: React.FC<TargetExamManagerProps> = ({ onToast }) => {
  const [exams, setExams] = useState<TargetExam[]>([]);
  const [allTests, setAllTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  
  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<TargetExam | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isAutoMappingAll, setIsAutoMappingAll] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [examList, testList] = await Promise.all([
        dataService.getTargetExams(true),
        dataService.getTests(true)
      ]);
      setExams(examList);
      setAllTests(testList);
    } catch (err) {
      console.error('Failed to load target exams', err);
      onToast('error', 'Failed to load Target Exams');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleUpdate = () => {
      loadData();
    };
    window.addEventListener('gradeup_target_exams_updated', handleUpdate);
    window.addEventListener('gradeup_tests_updated', handleUpdate);

    return () => {
      window.removeEventListener('gradeup_target_exams_updated', handleUpdate);
      window.removeEventListener('gradeup_tests_updated', handleUpdate);
    };
  }, []);

  const categories = useMemo(() => {
    const cats = Array.from(new Set(exams.map(e => e.category).filter(Boolean)));
    return ['All', ...cats];
  }, [exams]);

  // Compute test stats for each exam
  const examStats = useMemo(() => {
    const map = new Map<string, { total: number; topic_wise: number; subject_wise: number; full_mock: number; pyq: number }>();
    exams.forEach(exam => {
      const tests = dataService.getTestsForTargetExam(exam, 'All', allTests);
      const stats = {
        total: tests.length,
        topic_wise: tests.filter(t => (exam.mode_test_map?.topic_wise?.includes(t.id)) || (dataService.getTestsForTargetExam(exam, 'topic_wise', allTests).some(x => x.id === t.id))).length,
        subject_wise: tests.filter(t => (exam.mode_test_map?.subject_wise?.includes(t.id)) || (dataService.getTestsForTargetExam(exam, 'subject_wise', allTests).some(x => x.id === t.id))).length,
        full_mock: tests.filter(t => (exam.mode_test_map?.full_mock?.includes(t.id)) || (dataService.getTestsForTargetExam(exam, 'full_mock', allTests).some(x => x.id === t.id))).length,
        pyq: tests.filter(t => (exam.mode_test_map?.pyq?.includes(t.id)) || (dataService.getTestsForTargetExam(exam, 'pyq', allTests).some(x => x.id === t.id))).length,
      };
      map.set(exam.id, stats);
    });
    return map;
  }, [exams, allTests]);

  const filteredExams = useMemo(() => {
    return exams.filter(exam => {
      const q = (searchQuery || '').toLowerCase().trim();
      const matchesSearch =
        !q ||
        (exam.title || '').toLowerCase().includes(q) ||
        (exam.hindiTitle || '').toLowerCase().includes(q) ||
        (exam.category || '').toLowerCase().includes(q) ||
        (exam.description || '').toLowerCase().includes(q);

      const matchesCat = categoryFilter === 'All' || exam.category === categoryFilter;

      return matchesSearch && matchesCat;
    });
  }, [exams, searchQuery, categoryFilter]);

  const handleToggleActive = async (exam: TargetExam) => {
    try {
      const updated = await dataService.saveTargetExam({
        ...exam,
        is_active: !exam.is_active
      });
      setExams(prev => prev.map(e => e.id === updated.id ? updated : e));
      onToast('success', `Exam "${exam.title}" is now ${updated.is_active ? 'Active' : 'Inactive'}`);
    } catch (err) {
      onToast('error', 'Failed to update exam status');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await dataService.deleteTargetExam(id);
      setExams(prev => prev.filter(e => e.id !== id));
      setDeleteConfirmId(null);
      onToast('success', 'Target Exam removed successfully');
    } catch (err) {
      onToast('error', 'Failed to delete target exam');
    }
  };

  const handleAutoMapAll = async () => {
    setIsAutoMappingAll(true);
    try {
      let mapped = 0;
      for (const exam of exams) {
        await dataService.autoMapTestsToTargetExam(exam.id);
        mapped++;
      }
      await loadData();
      onToast('success', `Successfully auto-mapped mock tests across all ${mapped} target exams!`);
    } catch (err) {
      onToast('error', 'Failed to auto-map tests');
    } finally {
      setIsAutoMappingAll(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* TOP STATS & ACTIONS HEADER */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900">
              <Target className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Target Exam Management (लक्ष्य परीक्षा प्रबंधन)
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
            Create target exams (e.g. HP Police, Patwari, SSC, Railways) and configure exactly which mock tests appear in each practice mode for students.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <button
            onClick={handleAutoMapAll}
            disabled={isAutoMappingAll}
            className="flex-1 sm:flex-initial px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
            title="Auto assigns matching mock tests for all target exams"
          >
            <Wand2 className={`w-4 h-4 ${isAutoMappingAll ? 'animate-spin' : ''}`} />
            <span>{isAutoMappingAll ? 'Mapping Tests...' : 'Auto-Map All Tests'}</span>
          </button>

          <button
            onClick={() => {
              setEditingExam(null);
              setIsEditModalOpen(true);
            }}
            className="flex-1 sm:flex-initial px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-black rounded-xl shadow-md shadow-blue-500/25 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create Target Exam</span>
          </button>
        </div>
      </div>

      {/* FILTER & SEARCH CONTROLS */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by target exam title, hindi name, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 outline-hidden"
          >
            {categories.map(c => (
              <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>
            ))}
          </select>
        </div>

      </div>

      {/* TARGET EXAMS GRID / LIST */}
      {loading ? (
        <div className="p-16 text-center text-slate-400 font-bold text-sm">
          Loading Target Exams...
        </div>
      ) : filteredExams.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
          <Target className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">No Target Exams Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {searchQuery ? `No exams match "${searchQuery}".` : 'No target exams created yet. Click "Create Target Exam" above to add your first exam.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredExams.map((exam) => {
            const stats = examStats.get(exam.id) || { total: 0, topic_wise: 0, subject_wise: 0, full_mock: 0, pyq: 0 };

            return (
              <div
                key={exam.id}
                className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/90 dark:border-slate-800 hover:border-blue-300 dark:hover:border-slate-700 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group space-y-4"
              >
                <div className="space-y-3">
                  
                  {/* Category & Status Bar */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {exam.category}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {exam.badgeText && (
                        <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-md bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300">
                          {exam.badgeText}
                        </span>
                      )}

                      <button
                        onClick={() => handleToggleActive(exam)}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors cursor-pointer ${
                          exam.is_active !== false
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                        title="Toggle visibility for students"
                      >
                        {exam.is_active !== false ? 'Active' : 'Hidden'}
                      </button>
                    </div>
                  </div>

                  {/* Icon & Title */}
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-300 border border-blue-100 dark:border-blue-900 flex items-center justify-center shrink-0 shadow-xs">
                      <TargetExamIcon icon={exam.icon} size="md" />
                    </div>

                    <div className="min-w-0">
                      <h3 className="text-base font-black text-slate-900 dark:text-white leading-snug">
                        {exam.title}
                      </h3>
                      {exam.hindiTitle && (
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                          {exam.hindiTitle}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  {exam.description && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {exam.description}
                    </p>
                  )}

                  {/* Practice Mode Mappings breakdown */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                      <span>Mapped Mock Tests:</span>
                      <strong className="text-slate-900 dark:text-white font-black">{stats.total} Total</strong>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                      <div className="p-1.5 rounded-lg bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 flex items-center justify-between">
                        <span className="text-blue-700 dark:text-blue-300 font-bold">📘 Topic Wise</span>
                        <strong className="text-blue-900 dark:text-blue-200">{stats.topic_wise}</strong>
                      </div>
                      <div className="p-1.5 rounded-lg bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between">
                        <span className="text-indigo-700 dark:text-indigo-300 font-bold">📑 Section Mock</span>
                        <strong className="text-indigo-900 dark:text-indigo-200">{stats.subject_wise}</strong>
                      </div>
                      <div className="p-1.5 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 flex items-center justify-between">
                        <span className="text-emerald-700 dark:text-emerald-300 font-bold">🎯 Full Mock</span>
                        <strong className="text-emerald-900 dark:text-emerald-200">{stats.full_mock}</strong>
                      </div>
                      <div className="p-1.5 rounded-lg bg-amber-50/60 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40 flex items-center justify-between">
                        <span className="text-amber-800 dark:text-amber-300 font-bold">🏛️ PYQ Papers</span>
                        <strong className="text-amber-900 dark:text-amber-200">{stats.pyq}</strong>
                      </div>
                    </div>
                  </div>

                </div>

                {/* ACTION BUTTONS */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() => {
                      setEditingExam(exam);
                      setIsEditModalOpen(true);
                    }}
                    className="flex-1 py-2 px-3 bg-slate-100 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-blue-950/60 text-slate-700 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-slate-200 dark:border-slate-700"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Configure & Map Tests</span>
                  </button>

                  {deleteConfirmId === exam.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDelete(exam.id)}
                        className="p-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition-colors cursor-pointer"
                        title="Confirm Delete"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="p-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs hover:bg-slate-300 transition-colors cursor-pointer"
                        title="Cancel"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirmId(exam.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition-colors cursor-pointer"
                      title="Delete Target Exam"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* EDIT / CREATE MODAL */}
      <TargetExamEditModal
        isOpen={isEditModalOpen}
        exam={editingExam}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingExam(null);
        }}
        onSaved={(saved) => {
          setExams(prev => {
            const idx = prev.findIndex(e => e.id === saved.id);
            if (idx >= 0) {
              const updated = [...prev];
              updated[idx] = saved;
              return updated;
            }
            return [...prev, saved];
          });
          onToast('success', `Target Exam "${saved.title}" saved successfully!`);
        }}
        allTests={allTests}
      />

    </div>
  );
};
