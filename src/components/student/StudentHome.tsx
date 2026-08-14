import React, { useState, useEffect } from 'react';
import { Search, Clock, Award, FileText, CheckCircle, ArrowRight, Sparkles, Filter, ShieldCheck, Flame, BookOpen } from 'lucide-react';
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

  useEffect(() => {
    loadPublishedTests();
  }, []);

  const loadPublishedTests = async () => {
    setLoading(true);
    const allTests = await dataService.getTests(false); // only published
    setTests(allTests);
    setLoading(false);
  };

  const categories = ['All', ...Array.from(new Set(tests.map((t) => t.category)))];

  const filteredTests = tests.filter((t) => {
    const codeStr = (t.exam_code || t.test_code || '').toLowerCase();
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          codeStr.includes(searchQuery.toLowerCase()) ||
                          t.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'All' || t.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-8 pb-12">
      
      {/* Banner / Hero */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white p-5 sm:p-8 md:p-10 shadow-xl border border-blue-900/40">
        <div className="relative z-10 max-w-2xl space-y-3 sm:space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" /> Gradeup Study Official Test Portal
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

      {/* Filter and Search Bar */}
      <div className="space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative w-full sm:w-80 md:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search exam, test series or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl sm:rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-hidden shadow-xs"
            />
          </div>

          <div className="text-xs text-slate-500 font-semibold flex items-center justify-between sm:justify-end gap-2">
            <span>Showing <strong className="text-slate-800 dark:text-slate-200">{filteredTests.length}</strong> published test series</span>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 sm:px-4 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Test List Grid */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 text-sm">Loading available mock tests...</div>
      ) : filteredTests.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No mock tests available right now</h3>
          <p className="text-xs text-slate-500 mt-1">Try clearing your search query or check back later.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTests.map((test) => (
            <div
              key={test.id}
              className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between shadow-xs hover:shadow-xl hover:border-blue-500/50 dark:hover:border-blue-500/50 transition-all duration-300 relative overflow-hidden"
            >
              <div className="space-y-4">
                
                {/* Category & Code Header */}
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-bold text-[11px] rounded-lg border border-blue-200 dark:border-blue-900">
                    {test.category}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider font-semibold">
                    {test.exam_code || test.test_code}
                  </span>
                </div>

                {/* Title & Description */}
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                    {test.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                    {test.description}
                  </p>
                </div>

                {/* Exam Key Metrics */}
                <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-center text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Time</span>
                    <span className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center justify-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3 text-blue-500" /> {test.duration_minutes}m
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Questions</span>
                    <span className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center justify-center gap-1 mt-0.5">
                      <FileText className="w-3 h-3 text-indigo-500" /> {test.total_questions}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Marks</span>
                    <span className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center justify-center gap-1 mt-0.5">
                      <Award className="w-3 h-3 text-emerald-500" /> {test.total_marks}
                    </span>
                  </div>
                </div>

                {/* Negative marking note */}
                {test.negative_marking > 0 && (
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                    <span>• Negative Marking: -{test.negative_marking} per wrong answer</span>
                  </p>
                )}

              </div>

              {/* Action Button */}
              <div className="pt-6 border-t border-slate-100 dark:border-slate-800/80 mt-4">
                <button
                  onClick={() => onSelectTest(test)}
                  className="w-full py-3 px-4 bg-slate-900 hover:bg-blue-600 dark:bg-slate-800 dark:hover:bg-blue-600 text-white font-bold text-xs rounded-xl transition-all duration-200 flex items-center justify-center gap-2 group-hover:shadow-lg"
                >
                  <span>Start Mock Test</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

            </div>
          ))}
        </div>
      )}

    </div>
  );
};
