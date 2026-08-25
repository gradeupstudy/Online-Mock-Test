import React, { useState } from 'react';
import { 
  PersonalizedStudentAnalytics, 
  SubjectPerformance, 
  ChapterPerformance, 
  TopicPerformance,
  WeakAreaItem,
  StrongAreaItem,
  DifficultyPerformance
} from '../../../types';
import { 
  Target, 
  TrendingUp, 
  TrendingDown, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  Clock, 
  Brain, 
  BookOpen, 
  Layers, 
  AlertTriangle, 
  Zap, 
  ChevronDown, 
  ChevronRight, 
  Sparkles, 
  BarChart3, 
  Flame, 
  ShieldAlert, 
  Check,
  Award,
  ArrowRight,
  Info,
  Calendar
} from 'lucide-react';

interface StudentPerformanceDashboardProps {
  analytics: PersonalizedStudentAnalytics;
  onExploreTopic?: (subject: string, chapter: string, topic: string) => void;
}

export const StudentPerformanceDashboard: React.FC<StudentPerformanceDashboardProps> = ({ 
  analytics,
  onExploreTopic 
}) => {
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>(() => {
    // Expand first subject by default
    const initial: Record<string, boolean> = {};
    if (analytics.subjects && analytics.subjects.length > 0) {
      initial[analytics.subjects[0].subject] = true;
    }
    return initial;
  });

  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    if (analytics.subjects?.[0]?.chapters?.[0]) {
      const key = `${analytics.subjects[0].subject}:::${analytics.subjects[0].chapters[0].chapter}`;
      initial[key] = true;
    }
    return initial;
  });

  const [activeAnalysisView, setActiveAnalysisView] = useState<'hierarchy' | 'strengths_weaknesses' | 'difficulty_speed'>('hierarchy');

  const toggleSubject = (subjectName: string) => {
    setExpandedSubjects(prev => ({
      ...prev,
      [subjectName]: !prev[subjectName]
    }));
  };

  const toggleChapter = (subjectName: string, chapterName: string) => {
    const key = `${subjectName}:::${chapterName}`;
    setExpandedChapters(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const expandAll = () => {
    const subMap: Record<string, boolean> = {};
    const chapMap: Record<string, boolean> = {};
    analytics.subjects.forEach(s => {
      subMap[s.subject] = true;
      s.chapters.forEach(c => {
        chapMap[`${s.subject}:::${c.chapter}`] = true;
      });
    });
    setExpandedSubjects(subMap);
    setExpandedChapters(chapMap);
  };

  const collapseAll = () => {
    setExpandedSubjects({});
    setExpandedChapters({});
  };

  const { overall, subjects, weak_areas, strong_areas, difficulty_breakdown, speed_analysis, progress } = analytics;

  return (
    <div className="space-y-6" id="student-personalized-analytics-root">
      
      {/* ========================================================= */}
      {/* 1. OVERALL PREPARATION STATUS & PERFORMANCE CARD           */}
      {/* ========================================================= */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-7 shadow-xs overflow-hidden">
        
        {/* Status Indicator Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-start gap-3.5">
            <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900 shrink-0">
              <Brain className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                  Personalized Performance Analysis
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
                  Diagnostic Report
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Deterministic subject, chapter, topic, and difficulty precision breakdown.
              </p>
            </div>
          </div>

          {/* Preparation Status Badge */}
          <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/80 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 sm:self-center">
            <span className="text-2xl">{overall.status_info.badgeEmoji}</span>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Preparation Status</p>
              <p className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>{overall.status_info.label}</span>
                <span className="text-xs font-semibold text-slate-400">({overall.accuracy.toFixed(1)}% Accuracy)</span>
              </p>
            </div>
          </div>
        </div>

        {/* 6 Key Performance Metric Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-5">
          
          <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
            <p className="text-[11px] font-bold text-slate-400 uppercase">Score</p>
            <p className="text-xl font-black text-slate-900 dark:text-white mt-1">
              {overall.score} <span className="text-xs text-slate-400 font-normal">/ {overall.max_marks}</span>
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5 font-medium">{overall.percentage.toFixed(1)}% Marks</p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
            <p className="text-[11px] font-bold text-slate-400 uppercase">Accuracy</p>
            <p className="text-xl font-black text-blue-600 dark:text-blue-400 mt-1">
              {overall.accuracy.toFixed(1)}%
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5 font-medium">Attempted Precision</p>
          </div>

          <div className="bg-emerald-50/60 dark:bg-emerald-950/20 p-3.5 rounded-2xl border border-emerald-100 dark:border-emerald-900/40 text-center">
            <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">Correct</p>
            <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {overall.correct_answers}
            </p>
            <p className="text-[10px] text-emerald-600/80 font-medium">Questions</p>
          </div>

          <div className="bg-rose-50/60 dark:bg-rose-950/20 p-3.5 rounded-2xl border border-rose-100 dark:border-rose-900/40 text-center">
            <p className="text-[11px] font-bold text-rose-700 dark:text-rose-400 uppercase">Incorrect</p>
            <p className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1">
              {overall.wrong_answers}
            </p>
            <p className="text-[10px] text-rose-600/80 font-medium">Wrong Answers</p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
            <p className="text-[11px] font-bold text-slate-400 uppercase">Skipped</p>
            <p className="text-xl font-black text-slate-600 dark:text-slate-300 mt-1">
              {overall.skipped_questions}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5 font-medium">Unattempted</p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
            <p className="text-[11px] font-bold text-slate-400 uppercase">Time Spent</p>
            <p className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
              {Math.floor(overall.time_taken_seconds / 60)}m {overall.time_taken_seconds % 60}s
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5 font-medium">
              ~{Math.round(overall.average_time_per_question_seconds)}s / question
            </p>
          </div>

        </div>

        {/* Preparation Level Rules Reference Bar */}
        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <span className="font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-blue-500" /> Preparation Benchmarks:
          </span>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[11px]">
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
              <span>🟢</span> 80%+ Strong
            </span>
            <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
              <span>🟡</span> 60–79% Average
            </span>
            <span className="inline-flex items-center gap-1 font-semibold text-orange-600 dark:text-orange-400">
              <span>🟠</span> 40–59% Needs Improvement
            </span>
            <span className="inline-flex items-center gap-1 font-semibold text-rose-600 dark:text-rose-400">
              <span>🔴</span> &lt;40% Weak
            </span>
          </div>
        </div>

      </div>

      {/* ========================================================= */}
      {/* 2. PROGRESS COMPARISON (If Previous Attempts Exist)        */}
      {/* ========================================================= */}
      {progress && progress.total_completed_tests > 1 && (
        <div className="bg-gradient-to-r from-blue-50/80 via-indigo-50/80 to-purple-50/80 dark:from-slate-900 dark:via-blue-950/30 dark:to-indigo-950/30 rounded-3xl border border-blue-200/80 dark:border-blue-900/50 p-5 sm:p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-600 text-white shadow-xs">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                  Cross-Test Progress & Trend
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Compared against your previous {progress.total_completed_tests - 1} completed mock tests
                </p>
              </div>
            </div>

            <span className="px-3 py-1 bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-300 font-bold text-xs rounded-full border border-blue-200 dark:border-blue-800 shadow-xs self-start sm:self-auto">
              Test #{progress.total_completed_tests} Attempted
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Score Change */}
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xs p-3.5 rounded-2xl border border-white dark:border-slate-700">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Score Trajectory</p>
              <div className="flex items-center justify-between mt-1">
                <p className="text-lg font-black text-slate-900 dark:text-white">
                  {progress.last_score !== undefined ? `${progress.last_score.toFixed(1)} pts` : '-'}
                </p>
                {progress.score_change !== undefined && (
                  <span className={`text-xs font-black px-2 py-0.5 rounded-md flex items-center gap-0.5 ${
                    progress.score_change >= 0 
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' 
                      : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                  }`}>
                    {progress.score_change >= 0 ? '+' : ''}{progress.score_change.toFixed(1)} pts
                  </span>
                )}
              </div>
            </div>

            {/* Accuracy Change */}
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xs p-3.5 rounded-2xl border border-white dark:border-slate-700">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Accuracy Improvement</p>
              <div className="flex items-center justify-between mt-1">
                <p className="text-lg font-black text-blue-600 dark:text-blue-400">
                  {progress.last_accuracy !== undefined ? `${progress.last_accuracy.toFixed(1)}%` : '-'}
                </p>
                {progress.accuracy_change !== undefined && (
                  <span className={`text-xs font-black px-2 py-0.5 rounded-md flex items-center gap-0.5 ${
                    progress.accuracy_change >= 0 
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' 
                      : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                  }`}>
                    {progress.accuracy_change >= 0 ? '+' : ''}{progress.accuracy_change.toFixed(1)}%
                  </span>
                )}
              </div>
            </div>

            {/* Pace & Speed Change */}
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xs p-3.5 rounded-2xl border border-white dark:border-slate-700">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Pace / Speed Change</p>
              <div className="flex items-center justify-between mt-1">
                <p className="text-lg font-black text-indigo-600 dark:text-indigo-400">
                  {Math.round(overall.average_time_per_question_seconds)}s <span className="text-xs font-normal text-slate-400">/ Q</span>
                </p>
                {progress.speed_change_seconds !== undefined && (
                  <span className={`text-xs font-black px-2 py-0.5 rounded-md flex items-center gap-0.5 ${
                    progress.speed_change_seconds <= 0 
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' 
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                  }`}>
                    {progress.speed_change_seconds <= 0 ? 'Faster' : 'Slower'} by {Math.abs(Math.round(progress.speed_change_seconds))}s
                  </span>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. SECTION SUB-VIEWS (Subject Hierarchy vs Insights)       */}
      {/* ========================================================= */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveAnalysisView('hierarchy')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeAnalysisView === 'hierarchy'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Subject, Chapter & Topic Breakdown</span>
        </button>

        <button
          onClick={() => setActiveAnalysisView('strengths_weaknesses')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeAnalysisView === 'strengths_weaknesses'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          <Target className="w-3.5 h-3.5" />
          <span>Strengths & Weak Areas ({weak_areas.length + strong_areas.length})</span>
        </button>

        <button
          onClick={() => setActiveAnalysisView('difficulty_speed')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeAnalysisView === 'difficulty_speed'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Difficulty & Time Speed Analysis</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* VIEW A: SUBJECT -> CHAPTER -> TOPIC DRILLDOWN             */}
      {/* ========================================================= */}
      {activeAnalysisView === 'hierarchy' && (
        <div className="space-y-4">
          
          {/* Action Header: Expand/Collapse */}
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
              Subject & Topic Hierarchy ({subjects.length} Subjects Evaluated)
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={expandAll}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                Expand All
              </button>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <button
                onClick={collapseAll}
                className="text-xs font-semibold text-slate-500 hover:underline cursor-pointer"
              >
                Collapse All
              </button>
            </div>
          </div>

          {/* Subjects Accordion List */}
          <div className="space-y-4">
            {subjects.map((sub) => {
              const isSubExpanded = !!expandedSubjects[sub.subject];
              
              return (
                <div 
                  key={sub.subject}
                  className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-all"
                >
                  {/* Subject Header */}
                  <div 
                    onClick={() => toggleSubject(sub.subject)}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors select-none"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {isSubExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-black text-slate-900 dark:text-white">
                            {sub.subject}
                          </h4>
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black border ${sub.status_info.badgeClass}`}>
                            {sub.status_info.badgeEmoji} {sub.status_info.label}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5 font-medium">
                          {sub.chapters.length} Chapters • {sub.total_questions} Questions • {sub.attempted_questions} Attempted
                        </p>
                      </div>
                    </div>

                    {/* Subject Metrics Pills */}
                    <div className="flex items-center gap-3 sm:gap-4 self-end sm:self-center">
                      <div className="text-right">
                        <p className="text-xs font-bold text-slate-400">Score</p>
                        <p className="text-sm font-black text-slate-800 dark:text-slate-200">
                          {sub.score_obtained} <span className="text-[10px] text-slate-400 font-normal">/ {sub.max_marks}</span>
                        </p>
                      </div>

                      <div className="text-right border-l border-slate-100 dark:border-slate-800 pl-3">
                        <p className="text-xs font-bold text-slate-400">Accuracy</p>
                        <p className="text-base font-black text-blue-600 dark:text-blue-400">
                          {sub.accuracy.toFixed(1)}%
                        </p>
                      </div>

                      {/* Accuracy progress mini-bar */}
                      <div className="w-16 sm:w-20 hidden md:block">
                        <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-500"
                            style={{ 
                              width: `${Math.min(100, Math.max(0, sub.accuracy))}%`,
                              backgroundColor: sub.status_info.color 
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Chapters & Topics Drilldown */}
                  {isSubExpanded && (
                    <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 p-4 sm:p-5 space-y-3">
                      
                      {sub.chapters.map((chap) => {
                        const chapKey = `${sub.subject}:::${chap.chapter}`;
                        const isChapExpanded = !!expandedChapters[chapKey];

                        return (
                          <div 
                            key={chap.chapter}
                            className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 overflow-hidden shadow-2xs"
                          >
                            {/* Chapter Header */}
                            <div 
                              onClick={() => toggleChapter(sub.subject, chap.chapter)}
                              className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors select-none"
                            >
                              <div className="flex items-center gap-2.5">
                                <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500">
                                  {isChapExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                      {chap.chapter}
                                    </span>
                                    <span className={`px-2 py-0.2 rounded-md text-[10px] font-bold border ${chap.status_info.badgeClass}`}>
                                      {chap.status_info.badgeEmoji} {chap.status_info.label}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-400">
                                    {chap.topics.length} Topics • {chap.correct_answers}/{chap.attempted_questions} Correct • {chap.skipped_questions} Skipped
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-3 self-end sm:self-center text-xs">
                                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                  +{chap.correct_answers}
                                </span>
                                <span className="text-slate-300 dark:text-slate-600">/</span>
                                <span className="font-bold text-rose-600 dark:text-rose-400">
                                  -{chap.wrong_answers}
                                </span>
                                <div className="text-right pl-2 border-l border-slate-200 dark:border-slate-700">
                                  <span className="font-black text-sm text-slate-900 dark:text-white">
                                    {chap.accuracy.toFixed(1)}%
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Chapter Topics Table */}
                            {isChapExpanded && (
                              <div className="border-t border-slate-100 dark:border-slate-700/80 p-3 bg-slate-50/80 dark:bg-slate-900/60 overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                  <thead>
                                    <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-400 uppercase">
                                      <th className="py-2 px-3">Topic Name</th>
                                      <th className="py-2 px-2 text-center">Questions</th>
                                      <th className="py-2 px-2 text-center">Attempted</th>
                                      <th className="py-2 px-2 text-center">Correct</th>
                                      <th className="py-2 px-2 text-center">Incorrect</th>
                                      <th className="py-2 px-2 text-center">Accuracy</th>
                                      <th className="py-2 px-3 text-right">Preparation Status</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                    {chap.topics.map((top) => {
                                      const isInsufficient = top.is_insufficient_data;
                                      
                                      return (
                                        <tr key={top.topic} className="hover:bg-white/60 dark:hover:bg-slate-800/40 transition-colors">
                                          <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                                            {top.topic}
                                            {isInsufficient && (
                                              <span className="block text-[10px] text-slate-400 font-normal">
                                                (Needs ≥3 attempts for score rating)
                                              </span>
                                            )}
                                          </td>
                                          <td className="py-2.5 px-2 text-center text-slate-600 dark:text-slate-300 font-medium">
                                            {top.total_questions}
                                          </td>
                                          <td className="py-2.5 px-2 text-center text-slate-600 dark:text-slate-300 font-medium">
                                            {top.attempted_questions}
                                          </td>
                                          <td className="py-2.5 px-2 text-center font-bold text-emerald-600 dark:text-emerald-400">
                                            {top.correct_answers}
                                          </td>
                                          <td className="py-2.5 px-2 text-center font-bold text-rose-600 dark:text-rose-400">
                                            {top.wrong_answers}
                                          </td>
                                          <td className="py-2.5 px-2 text-center font-black text-slate-900 dark:text-white">
                                            {isInsufficient ? (
                                              <span className="text-slate-400 font-medium">
                                                {top.attempted_questions > 0 ? `${top.accuracy.toFixed(0)}%*` : 'N/A'}
                                              </span>
                                            ) : (
                                              `${top.accuracy.toFixed(1)}%`
                                            )}
                                          </td>
                                          <td className="py-2.5 px-3 text-right">
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black border ${top.status_info.badgeClass}`}>
                                              <span>{top.status_info.badgeEmoji}</span>
                                              <span>{top.status_info.label}</span>
                                            </span>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}

                          </div>
                        );
                      })}

                    </div>
                  )}

                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* VIEW B: STRENGTHS & WEAK AREAS IDENTIFICATION              */}
      {/* ========================================================= */}
      {activeAnalysisView === 'strengths_weaknesses' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Strong Areas Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-emerald-200/80 dark:border-emerald-900/60 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-emerald-100 dark:border-emerald-900/40">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                    <Flame className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>Strong Mastery Areas</span>
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        (≥80% Accuracy)
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Topics and chapters where you demonstrated high conceptual precision
                    </p>
                  </div>
                </div>
                <span className="text-xl">🟢</span>
              </div>

              {strong_areas.length === 0 ? (
                <div className="p-6 text-center text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <p className="text-xs">No topics met the ≥80% strong threshold with sufficient question attempts.</p>
                  <p className="text-[11px] text-slate-500 mt-1">Keep practicing full tests to build your strong mastery foundation.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {strong_areas.map((area, idx) => (
                    <div 
                      key={idx}
                      className="p-3.5 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/50 flex flex-col justify-between gap-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                            {area.topic}
                          </p>
                          <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400">
                            {area.subject} • {area.chapter}
                          </p>
                        </div>
                        <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 shrink-0">
                          {area.accuracy.toFixed(0)}%
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-emerald-800/70 dark:text-emerald-300/80 pt-1 border-t border-emerald-200/50 dark:border-emerald-900/40">
                        <span>{area.correct}/{area.attempted} Correct</span>
                        <span className="font-semibold">{area.action_recommendation}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-500" />
              <span>Maintain these strong topics through periodic speed test revisions.</span>
            </div>
          </div>

          {/* Weak Areas Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-rose-200/80 dark:border-rose-900/60 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-rose-100 dark:border-rose-900/40">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>Actionable Weak Areas</span>
                      <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                        (&lt;50% Accuracy)
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Targeted concepts that caused negative mark deductions
                    </p>
                  </div>
                </div>
                <span className="text-xl">🔴</span>
              </div>

              {weak_areas.length === 0 ? (
                <div className="p-6 text-center text-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-900">
                  <CheckCircle2 className="w-6 h-6 mx-auto mb-1 text-emerald-500" />
                  <p className="text-xs font-bold">Terrific work! No critical weak areas detected (&lt;50%).</p>
                  <p className="text-[11px] text-emerald-700/80 mt-1">All attempted topics achieved satisfactory performance.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {weak_areas.map((area, idx) => (
                    <div 
                      key={idx}
                      className="p-3.5 bg-rose-50/50 dark:bg-rose-950/20 rounded-2xl border border-rose-100 dark:border-rose-900/50 flex flex-col justify-between gap-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-bold text-rose-900 dark:text-rose-200">
                            {area.topic}
                          </p>
                          <p className="text-[11px] text-rose-700/80 dark:text-rose-400">
                            {area.subject} • {area.chapter}
                          </p>
                        </div>
                        <span className="text-sm font-black text-rose-600 dark:text-rose-400 shrink-0">
                          {area.accuracy.toFixed(0)}%
                        </span>
                      </div>

                      {/* Action Recommendation */}
                      <div className="p-2 bg-white/80 dark:bg-slate-900/80 rounded-xl border border-rose-200/60 dark:border-rose-900/60 text-[11px] text-rose-900 dark:text-rose-300 font-semibold flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span>Plan: {area.action_recommendation}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Prioritize revising weak areas before attempting your next mock test.</span>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* VIEW C: DIFFICULTY BREAKDOWN & SPEED ANALYSIS              */}
      {/* ========================================================= */}
      {activeAnalysisView === 'difficulty_speed' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Difficulty-wise Breakdown Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Difficulty-wise Precision
                  </h3>
                  <p className="text-xs text-slate-400">
                    Performance split across Easy, Moderate, and Hard questions
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {difficulty_breakdown.map((diff) => {
                const badgeColor = 
                  diff.difficulty === 'Easy' ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200' :
                  diff.difficulty === 'Moderate' ? 'text-amber-600 bg-amber-50 dark:bg-amber-950/50 border-amber-200' :
                  'text-rose-600 bg-rose-50 dark:bg-rose-950/50 border-rose-200';

                return (
                  <div 
                    key={diff.difficulty}
                    className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className={`px-2.5 py-0.5 rounded-md text-xs font-black border ${badgeColor}`}>
                        {diff.difficulty} Tier
                      </span>
                      <div className="text-right">
                        <span className="text-base font-black text-slate-900 dark:text-white">
                          {diff.accuracy.toFixed(1)}% Accuracy
                        </span>
                        <span className="text-xs text-slate-400 ml-1.5">
                          ({diff.correct_answers}/{diff.attempted_questions} Correct)
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          diff.difficulty === 'Easy' ? 'bg-emerald-500' :
                          diff.difficulty === 'Moderate' ? 'bg-amber-500' :
                          'bg-rose-500'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, diff.accuracy))}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                      <span>Total Questions: {diff.total_questions}</span>
                      <span>Incorrect: {diff.wrong_answers} • Skipped: {diff.skipped_questions}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Speed & Pace Analysis Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Speed & Time Management
                  </h3>
                  <p className="text-xs text-slate-400">
                    Pace efficiency analysis compared to standard benchmarks
                  </p>
                </div>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                speed_analysis.pace_status === 'optimal' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' :
                speed_analysis.pace_status === 'fast' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' :
                'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
              }`}>
                {speed_analysis.pace_status} Pace
              </span>
            </div>

            {/* Core Speed Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                <p className="text-[11px] font-bold text-slate-400 uppercase">Avg Time / Question</p>
                <p className="text-xl font-black text-slate-900 dark:text-white mt-1">
                  {Math.round(speed_analysis.average_time_per_question_seconds)}s
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Target: {Math.round(speed_analysis.ideal_time_per_question_seconds)}s / Q
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                <p className="text-[11px] font-bold text-slate-400 uppercase">Total Time</p>
                <p className="text-xl font-black text-slate-900 dark:text-white mt-1">
                  {Math.floor(speed_analysis.total_time_seconds / 60)}m {speed_analysis.total_time_seconds % 60}s
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">Attempt Time</p>
              </div>
            </div>

            {/* Speed Insights List */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-600 dark:text-slate-300">Pace Observations:</p>
              {speed_analysis.insights.map((insight, idx) => (
                <div 
                  key={idx}
                  className="p-3 bg-blue-50/60 dark:bg-blue-950/20 rounded-xl border border-blue-100 dark:border-blue-900/40 text-xs text-blue-900 dark:text-blue-300 flex items-start gap-2"
                >
                  <Zap className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                  <span>{insight}</span>
                </div>
              ))}
            </div>

            {/* Subject Speed Breakdown */}
            {speed_analysis.subject_times && speed_analysis.subject_times.length > 0 && (
              <div className="pt-2 space-y-1.5">
                <p className="text-xs font-bold text-slate-600 dark:text-slate-300">Time by Subject:</p>
                <div className="space-y-1">
                  {speed_analysis.subject_times.map((item) => (
                    <div 
                      key={item.subject} 
                      className="flex items-center justify-between text-xs py-1 px-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40"
                    >
                      <span className="text-slate-700 dark:text-slate-300 font-medium">{item.subject}</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        ~{Math.round(item.estimated_seconds / 60)}m ({Math.round(item.estimated_seconds)}s)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

        </div>
      )}

    </div>
  );
};
