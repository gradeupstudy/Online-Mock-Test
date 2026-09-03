import React, { useState, useEffect, useRef } from 'react';
import { Search, Clock, Award, FileText, CheckCircle, ArrowRight, Sparkles, Filter, ShieldCheck, Flame, BookOpen, Layers, X, Tag, Compass, Target, BookMarked, History, Check } from 'lucide-react';
import { Test, PracticeMode, PRIMARY_PRACTICE_MODES, PracticeModeConfig } from '../../types';
import { dataService, inferPracticeMode } from '../../services/dataService';
import { PracticeModeIcon, CategoryBadgeIcon, SubjectBadgeIcon } from '../common/PracticeModeIcon';

interface StudentHomeProps {
  onSelectTest: (test: Test) => void;
  onOpenAdmin: () => void;
}

export const StudentHome: React.FC<StudentHomeProps> = ({ onSelectTest, onOpenAdmin }) => {
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPracticeMode, setSelectedPracticeMode] = useState<PracticeMode | 'All'>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedSubject, setSelectedSubject] = useState<string>('All');

  const showingTestsHeaderRef = useRef<HTMLDivElement>(null);
  const filterSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadPublishedTests();
  }, []);

  const loadPublishedTests = async () => {
    setLoading(true);
    const allTests = await dataService.getTests(false); // only published
    setTests(allTests);
    setLoading(false);
  };

  // Helper to scroll smoothly down to "Showing Tests for:" mock tests section
  const scrollToShowingTests = () => {
    setTimeout(() => {
      if (showingTestsHeaderRef.current) {
        showingTestsHeaderRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    }, 80);
  };

  // Helper to handle practice mode selection with automatic smooth scroll to "Showing Tests for:"
  const handleSelectPracticeMode = (modeId: PracticeMode | 'All', shouldScroll: boolean = true) => {
    if (selectedPracticeMode === modeId && modeId !== 'All') {
      setSelectedPracticeMode('All');
    } else {
      setSelectedPracticeMode(modeId);
      setSelectedCategory('All');
      setSelectedSubject('All');
      if (shouldScroll && modeId !== 'All') {
        scrollToShowingTests();
      }
    }
  };

  // Helper to get effective practice mode of a test
  const getTestMode = (t: Test): PracticeMode => {
    return inferPracticeMode(t);
  };

  // Calculate counts for each of the 4 primary practice modes
  const practiceModeCounts = React.useMemo(() => {
    const counts: Record<PracticeMode, number> = {
      topic_wise: 0,
      subject_wise: 0,
      full_mock: 0,
      pyq: 0
    };
    tests.forEach((t) => {
      const mode = getTestMode(t);
      if (counts[mode] !== undefined) {
        counts[mode]++;
      } else {
        counts.full_mock++;
      }
    });
    return counts;
  }, [tests]);

  // Tests within selected practice mode (used to compute available categories & subjects)
  const modeFilteredTests = React.useMemo(() => {
    if (selectedPracticeMode === 'All') return tests;
    return tests.filter((t) => getTestMode(t) === selectedPracticeMode);
  }, [tests, selectedPracticeMode]);

  // Derive unique categories based on current practice mode filter
  const categories = React.useMemo(() => {
    return ['All', ...Array.from(new Set(modeFilteredTests.map((t) => t.category).filter(Boolean)))];
  }, [modeFilteredTests]);

  // Derive unique subjects from both test.subject and test.sections within current practice mode
  const subjects = React.useMemo(() => {
    const subjectSet = new Set<string>();
    modeFilteredTests.forEach((t) => {
      if (t.subject && t.subject.trim()) {
        subjectSet.add(t.subject.trim());
      }
      if (Array.isArray(t.sections)) {
        t.sections.forEach((sec) => {
          if (sec && sec.trim()) subjectSet.add(sec.trim());
        });
      }
    });
    return ['All', ...Array.from(subjectSet)];
  }, [modeFilteredTests]);

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

    const matchesMode = selectedPracticeMode === 'All' || getTestMode(t) === selectedPracticeMode;
    const matchesCat = selectedCategory === 'All' || t.category === selectedCategory;
    const matchesSub = matchesSubjectFilter(t, selectedSubject);

    return matchesSearch && matchesMode && matchesCat && matchesSub;
  });

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedPracticeMode('All');
    setSelectedCategory('All');
    setSelectedSubject('All');
  };

  const isFiltered = searchQuery !== '' || selectedPracticeMode !== 'All' || selectedCategory !== 'All' || selectedSubject !== 'All';

  const activeModeConfig = PRIMARY_PRACTICE_MODES.find((m) => m.id === selectedPracticeMode);

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
            Choose from 4 primary practice modes: Topic Wise MCQs, Section / Subject Tests, Full Length Mock Tests, or Official Previous Year Papers.
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

      {/* 4 PRIMARY PRACTICE MODES (MAIN LEVEL SELECTION) */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Compass className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Choose Your Practice Mode
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
              Targeted practice designed for every stage of your exam preparation
            </p>
          </div>

          {selectedPracticeMode !== 'All' && (
            <button
              onClick={() => setSelectedPracticeMode('All')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-all self-start sm:self-auto cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Show All Practice Modes</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PRIMARY_PRACTICE_MODES.map((mode) => {
            const isSelected = selectedPracticeMode === mode.id;
            const count = practiceModeCounts[mode.id] || 0;

            return (
              <div
                key={mode.id}
                onClick={() => handleSelectPracticeMode(mode.id, true)}
                className={`group relative rounded-2xl p-5 cursor-pointer transition-all duration-200 flex flex-col justify-between border select-none ${
                  isSelected
                    ? `ring-2 ring-blue-600 dark:ring-blue-400 bg-white dark:bg-slate-900 border-blue-500 shadow-xl shadow-blue-500/10 scale-[1.02]`
                    : `bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-lg shadow-sm hover:scale-[1.01]`
                }`}
              >
                {/* Active Indicator Chip */}
                {isSelected && (
                  <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold shadow-xs animate-in fade-in">
                    <Check className="w-3 h-3 stroke-[3]" /> Selected
                  </div>
                )}

                <div className="space-y-3">
                  {/* Icon & Test Type Badge */}
                  <div className="flex items-center gap-3">
                    <PracticeModeIcon
                      mode={mode.id}
                      size="lg"
                      variant="gradient"
                      className="group-hover:scale-105 transition-transform"
                    />
                    <div>
                      <span className={`inline-block text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                        isSelected
                          ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-extrabold'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}>
                        {mode.testType}
                      </span>
                      <h3 className="text-base font-black text-slate-900 dark:text-white mt-0.5 leading-snug">
                        {mode.title}
                      </h3>
                    </div>
                  </div>

                  {/* Student Goal Description */}
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800/80">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-slate-600 dark:text-slate-400 block">
                      Student Goal:
                    </span>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                      {mode.goal}
                    </p>
                  </div>

                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    {mode.description}
                  </p>
                </div>

                {/* Card Footer: Count & CTA */}
                <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-600 dark:text-slate-400">
                    <strong className="text-slate-900 dark:text-white font-black">{count}</strong> Tests
                  </span>

                  <span className={`font-bold inline-flex items-center gap-1 transition-colors ${
                    isSelected
                      ? 'text-blue-600 dark:text-blue-400 font-black'
                      : 'text-slate-500 group-hover:text-blue-600 dark:group-hover:text-blue-400'
                  }`}>
                    <span>{isSelected ? 'Viewing Below ↓' : 'Explore Tests →'}</span>
                    <ArrowRight className={`w-3.5 h-3.5 transition-transform ${isSelected ? 'rotate-90' : 'group-hover:translate-x-0.5'}`} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter and Search Section */}
      <div
        id="mock-tests-filter-section"
        ref={filterSectionRef}
        className="space-y-4 bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-md"
      >
        
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

        {/* Practice Mode Selected Indicator / Filter Pills */}
        <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              <Target className="w-3.5 h-3.5 text-blue-500" />
              <span>Practice Mode:</span>
            </div>
            {selectedPracticeMode !== 'All' && (
              <span className="text-[11px] text-blue-600 dark:text-blue-400 font-bold">
                Filtered by mode
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none -mx-2 px-2">
            <button
              onClick={() => handleSelectPracticeMode('All', false)}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                selectedPracticeMode === 'All'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <span>All Modes</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                selectedPracticeMode === 'All' ? 'bg-blue-700 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}>
                {tests.length}
              </span>
            </button>

            {PRIMARY_PRACTICE_MODES.map((mode) => {
              const count = practiceModeCounts[mode.id] || 0;
              const isSelected = selectedPracticeMode === mode.id;
              return (
                <button
                  key={mode.id}
                  onClick={() => handleSelectPracticeMode(mode.id, true)}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <PracticeModeIcon mode={mode.id} size="xs" variant="bare" />
                  <span>{mode.title}</span>
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

        {/* 1. Exam Category Filter Pills */}
        <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
            <Layers className="w-3.5 h-3.5 text-blue-500" />
            <span>Filter by Category:</span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none -mx-2 px-2">
            {categories.map((cat) => {
              const count = cat === 'All'
                ? modeFilteredTests.length
                : modeFilteredTests.filter((t) => t.category === cat).length;
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
                  {cat !== 'All' && <CategoryBadgeIcon category={cat} className="w-3.5 h-3.5" />}
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
                  ? modeFilteredTests.length
                  : modeFilteredTests.filter((t) => matchesSubjectFilter(t, sub)).length;
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
                    {sub !== 'All' && <SubjectBadgeIcon subject={sub} className="w-3.5 h-3.5" />}
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

      {/* Target Anchor & Active Practice Mode Status Header */}
      <div id="showing-tests-position" ref={showingTestsHeaderRef} className="scroll-mt-24">
        {selectedPracticeMode !== 'All' && activeModeConfig && (
          <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-in fade-in ${activeModeConfig.color.bg} ${activeModeConfig.color.border}`}>
            <div className="flex items-center gap-3">
              <PracticeModeIcon mode={activeModeConfig.id} size="md" variant="gradient" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] uppercase font-black tracking-wider text-slate-600 dark:text-slate-400">
                    Showing Tests for:
                  </span>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                    {activeModeConfig.testType}
                  </span>
                </div>
                <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                  {activeModeConfig.title}
                </h4>
              </div>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                <strong className="font-black text-blue-600 dark:text-blue-400">{filteredTests.length}</strong> Mock Tests Available
              </span>
              <button
                onClick={() => handleSelectPracticeMode('All', false)}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer shadow-2xs text-slate-700 dark:text-slate-300 transition-all"
              >
                <X className="w-3.5 h-3.5" />
                <span>Show All Tests</span>
              </button>
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
            No mock tests match the selected filters. Try changing your practice mode or clearing filters.
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
            const mode = getTestMode(test);
            const modeConfig = PRIMARY_PRACTICE_MODES.find((m) => m.id === mode);

            return (
              <div
                key={test.id}
                className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 sm:p-6 flex flex-col justify-between shadow-md hover:shadow-xl hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-200 relative overflow-hidden"
              >
                <div className="space-y-3.5">
                  
                  {/* Mode & Category & Code Header */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {modeConfig && (
                        <span className={`px-2 py-0.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 border ${modeConfig.color.bg} ${modeConfig.color.text} ${modeConfig.color.border}`}>
                          <PracticeModeIcon mode={modeConfig.id} size="xs" variant="bare" />
                          <span>{modeConfig.title}</span>
                        </span>
                      )}
                      {(() => {
                        const effectiveCat = (test.category === 'Section / Subject Practice' && mode === 'topic_wise')
                          ? 'Topic Wise Practice'
                          : (test.category || 'All Competitive Exams');
                        if (effectiveCat === modeConfig?.title) return null;
                        return (
                          <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-bold text-xs rounded-lg border border-blue-200 dark:border-blue-900 shadow-2xs flex items-center gap-1">
                            <CategoryBadgeIcon category={effectiveCat} className="w-3 h-3" />
                            <span>{effectiveCat}</span>
                          </span>
                        );
                      })()}
                    </div>
                    <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/90 dark:border-slate-700 font-mono text-[11px] font-bold rounded-md uppercase shrink-0">
                      {test.exam_code || test.test_code}
                    </span>
                  </div>

                  {/* Subject Badge / Sections Pill */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {hasExplicitSubject ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-bold text-xs rounded-lg border border-indigo-200 dark:border-indigo-800">
                        <SubjectBadgeIcon subject={test.subject} className="w-3 h-3 text-indigo-500" />
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
