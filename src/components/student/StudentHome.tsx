import React, { useState, useEffect } from 'react';
import { Search, Clock, Award, FileText, CheckCircle, ArrowRight, Sparkles, Filter, ShieldCheck, Flame, BookOpen, Layers, X, Tag } from 'lucide-react';
import { Test } from '../../types';
import { dataService } from '../../services/dataService';

interface StudentHomeProps {
  onSelectTest: (test: Test) => void;
  onOpenAdmin: () => void;
}

export const StudentHome: React.FC<StudentHomeProps> = ({ onSelectTest, onOpenAdmin }) => {
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedSubject, setSelectedSubject] = useState<string>('All');

  useEffect(() => {
    loadPublishedTests();
  }, []);

  const loadPublishedTests = async () => {
    setLoading(true);
    const allTests = await dataService.getTests(false); // only published
    setTests(allTests);
    setLoading(false);
  };

  // Derive unique categories
  const categories = ['All', ...Array.from(new Set(tests.map((t) => t.category).filter(Boolean)))];

  // Derive unique subjects from both test.subject and test.sections
  const subjectSet = new Set<string>();
  tests.forEach((t) => {
    if (t.subject && t.subject.trim()) {
      subjectSet.add(t.subject.trim());
    }
    if (Array.isArray(t.sections)) {
      t.sections.forEach((sec) => {
        if (sec && sec.trim()) subjectSet.add(sec.trim());
      });
    }
  });
  const subjects = ['All', ...Array.from(subjectSet)];

  // Helper to test if a test matches the selected subject
  const matchesSubjectFilter = (t: Test, subject: string) => {
    if (subject === 'All') return true;
    const subLower = subject.toLowerCase();
    if (t.subject && t.subject.toLowerCase() === subLower) return true;
    if (Array.isArray(t.sections) && t.sections.some((s) => s.toLowerCase() === subLower)) return true;
    if (t.title.toLowerCase().includes(subLower)) return true;
    return false;
  };

  const filteredTests = tests.filter((t) => {
    const q = searchQuery.toLowerCase().trim();
    const codeStr = (t.exam_code || t.test_code || '').toLowerCase();
    const subjectStr = (t.subject || '').toLowerCase();
    const sectionsStr = (t.sections || []).join(' ').toLowerCase();

    const matchesSearch =
      !q ||
      t.title.toLowerCase().includes(q) ||
      codeStr.includes(q) ||
      (t.description || '').toLowerCase().includes(q) ||
      (t.category || '').toLowerCase().includes(q) ||
      subjectStr.includes(q) ||
      sectionsStr.includes(q);

    const matchesCat = selectedCategory === 'All' || t.category === selectedCategory;
    const matchesSub = matchesSubjectFilter(t, selectedSubject);

    return matchesSearch && matchesCat && matchesSub;
  });

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setSelectedSubject('All');
  };

  const isFiltered = searchQuery !== '' || selectedCategory !== 'All' || selectedSubject !== 'All';

  return (
    <div className="space-y-8 pb-12">
      
      {/* Banner / Hero */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white p-5 sm:p-8 md:p-10 shadow-xl border border-blue-900/40">
        <div className="relative z-10 max-w-2xl space-y-3 sm:space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" /> Gradeup Study Official Test Portal
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white leading-tight">
            Master Competitive Exams with Real Exam Pattern Mock Tests
          </h1>
          <p className="text-xs sm:text-sm md:text-base text-slate-300 leading-relaxed">
            Practice state-level recruitment mock tests with real-time timers, negative marking, instant score cards, and subject-wise answer keys.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3 sm:gap-6 text-xs text-slate-300">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" /> <span>Free Registration</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" /> <span>Instant Performance Result</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" /> <span>Detailed Explanations</span>
            </div>
          </div>
        </div>

        {/* Decorative background circle */}
        <div className="absolute -right-12 -bottom-12 w-80 h-80 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
      </div>

      {/* Filter and Search Section */}
      <div className="space-y-4 bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-md">
        
        {/* Top Search Bar & Result Count */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1 max-w-lg">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Search exam title, subject (e.g. English, GK, Maths), or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-hidden"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3 text-xs text-slate-600 dark:text-slate-400 font-semibold">
            <span>
              Showing <strong className="text-blue-600 dark:text-blue-400 font-black">{filteredTests.length}</strong> of {tests.length} tests
            </span>
            {isFiltered && (
              <button
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400 font-bold hover:underline cursor-pointer"
              >
                <X className="w-3.5 h-3.5" /> Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* 1. Exam Category Filter Pills */}
        <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
            <Layers className="w-3.5 h-3.5 text-blue-500" />
            <span>Filter by Category:</span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none -mx-2 px-2">
            {categories.map((cat) => {
              const count = cat === 'All' ? tests.length : tests.filter((t) => t.category === cat).length;
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <span>{cat === 'All' ? 'All Exams' : cat}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                    isSelected ? 'bg-blue-700 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Subject Name Filter Pills */}
        {subjects.length > 1 && (
          <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
              <span>Filter by Subject:</span>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none -mx-2 px-2">
              {subjects.map((sub) => {
                const count = sub === 'All'
                  ? tests.length
                  : tests.filter((t) => matchesSubjectFilter(t, sub)).length;
                const isSelected = selectedSubject === sub;
                return (
                  <button
                    key={sub}
                    onClick={() => setSelectedSubject(sub)}
                    className={`px-3.5 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-300 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <span>{sub === 'All' ? 'All Subjects' : sub}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                      isSelected ? 'bg-indigo-700 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* Test List Grid */}
      {loading ? (
        <div className="py-16 text-center text-slate-500 font-bold text-sm">Loading available mock tests...</div>
      ) : filteredTests.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-8 space-y-3 shadow-md">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No mock tests found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            No mock tests match the selected category &quot;{selectedCategory}&quot; and subject &quot;{selectedSubject}&quot;. Try resetting your filters.
          </p>
          <button
            onClick={handleResetFilters}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs"
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTests.map((test) => {
            const hasExplicitSubject = Boolean(test.subject && test.subject.trim());
            const hasSections = Boolean(test.sections && test.sections.length > 0);

            return (
              <div
                key={test.id}
                className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 sm:p-6 flex flex-col justify-between shadow-md hover:shadow-xl hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-200 relative overflow-hidden"
              >
                <div className="space-y-3.5">
                  
                  {/* Category & Code Header */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-bold text-xs rounded-lg border border-blue-200 dark:border-blue-900 shadow-2xs">
                      {test.category}
                    </span>
                    <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/90 dark:border-slate-700 font-mono text-[11px] font-bold rounded-md uppercase">
                      {test.exam_code || test.test_code}
                    </span>
                  </div>

                  {/* Subject Badge / Sections Pill */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {hasExplicitSubject ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-bold text-xs rounded-lg border border-indigo-200 dark:border-indigo-800">
                        <BookOpen className="w-3 h-3 text-indigo-500" />
                        <span>Subject: {test.subject}</span>
                      </span>
                    ) : hasSections ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-50 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 font-bold text-xs rounded-lg border border-amber-200 dark:border-amber-800">
                        <Layers className="w-3 h-3 text-amber-500" />
                        <span>Sections ({test.sections!.length}): {test.sections!.join(', ')}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold text-xs rounded-lg border border-slate-200/80 dark:border-slate-700">
                        <BookOpen className="w-3 h-3 text-slate-400" />
                        <span>General Paper</span>
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

                  {/* Exam Key Metrics */}
                  <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200/90 dark:border-slate-700/80 text-center text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block uppercase tracking-wider">Time</span>
                      <span className="font-black text-slate-900 dark:text-white flex items-center justify-center gap-1 mt-0.5 text-xs sm:text-sm">
                        <Clock className="w-3.5 h-3.5 text-blue-500" /> {test.duration_minutes}m
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block uppercase tracking-wider">Questions</span>
                      <span className="font-black text-slate-900 dark:text-white flex items-center justify-center gap-1 mt-0.5 text-xs sm:text-sm">
                        <FileText className="w-3.5 h-3.5 text-indigo-500" /> {test.total_questions}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block uppercase tracking-wider">Marks</span>
                      <span className="font-black text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1 mt-0.5 text-xs sm:text-sm">
                        <Award className="w-3.5 h-3.5 text-emerald-500" /> {test.total_marks}
                      </span>
                    </div>
                  </div>

                  {/* Rules summary: Negative marking & Attempt Limit */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                    {(!test.max_attempts_per_student || test.max_attempts_per_student === 0) ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60">
                        <span>∞ Unlimited Practice</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900/60">
                        <span>⚡ Max {test.max_attempts_per_student} Attempt{test.max_attempts_per_student > 1 ? 's' : ''}</span>
                      </span>
                    )}

                    {test.negative_marking > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60">
                        <span>Neg: -{test.negative_marking}</span>
                      </span>
                    )}
                  </div>

                </div>

                {/* Action Button */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800/90 mt-4">
                  <button
                    onClick={() => onSelectTest(test)}
                    className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs sm:text-sm rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg cursor-pointer"
                  >
                    <span>Start Mock Test</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
