import React, { useState, useEffect, useRef } from 'react';
import { Clock, ShieldAlert, CheckCircle2, Bookmark, XCircle, ChevronLeft, ChevronRight, Menu, ZoomIn, ZoomOut, Save, AlertTriangle, ArrowRight, Grid, AlertCircle } from 'lucide-react';
import { Test, Question, Attempt } from '../../types';
import { StudentRegistrationData } from './StudentRegistration';
import { dataService } from '../../services/dataService';
import { Modal } from '../common/Modal';

interface TestInterfaceProps {
  test: Test;
  studentData: StudentRegistrationData;
  onFinishExam: (attempt: Attempt) => void;
  onToast?: (type: 'success' | 'error' | 'info', msg: string) => void;
}

export const TestInterface: React.FC<TestInterfaceProps> = ({
  test,
  studentData,
  onFinishExam,
  onToast
}) => {
  const notify = (type: 'success' | 'error' | 'info', msg: string) => {
    if (typeof onToast === 'function') {
      onToast(type, msg);
    }
  };
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Question state records
  // selectedAnswers: { [questionId]: 'A' | 'B' | 'C' | 'D' }
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  // markedForReview: { [questionId]: boolean }
  const [markedForReview, setMarkedForReview] = useState<Record<string, boolean>>({});
  // visitedQuestions: { [questionId]: boolean }
  const [visitedQuestions, setVisitedQuestions] = useState<Record<string, boolean>>({});

  // Timer state
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(test.duration_minutes * 60);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showMobilePalette, setShowMobilePalette] = useState(false);

  // Font size toggle for question text
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg'>('base');

  // Anti-cheating warning counter
  const [tabSwitchCount, setTabSwitchCount] = useState(0);

  // Refs
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadQuestionsAndRestore();
    setupAntiCheating();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Timer effect
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeftSeconds((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleAutoSubmitTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Load questions and restore saved local state
  const loadQuestionsAndRestore = async () => {
    setLoading(true);
    const qList = await dataService.getPublicQuestions(test.id);
    // Sort by question_number
    qList.sort((a, b) => a.question_number - b.question_number);
    setQuestions(qList);

    if (qList.length > 0) {
      setVisitedQuestions({ [qList[0].id]: true });
    }

    // Attempt restoring saved exam progress
    const saveKey = `gradeup_progress_${test.id}_${studentData.student_mobile}`;
    const savedProgress = localStorage.getItem(saveKey);
    if (savedProgress) {
      try {
        const parsed = JSON.parse(savedProgress);
        if (parsed.answers) setSelectedAnswers(parsed.answers);
        if (parsed.review) setMarkedForReview(parsed.review);
        if (parsed.visited) setVisitedQuestions(parsed.visited);
        if (parsed.timeLeft && parsed.timeLeft > 10) setTimeLeftSeconds(parsed.timeLeft);
        notify('info', 'Restored your saved test progress');
      } catch (e) {
        // ignore
      }
    }

    setLoading(false);
  };

  // Autosave to localStorage on state change
  useEffect(() => {
    if (questions.length === 0) return;
    const saveKey = `gradeup_progress_${test.id}_${studentData.student_mobile}`;
    localStorage.setItem(
      saveKey,
      JSON.stringify({
        answers: selectedAnswers,
        review: markedForReview,
        visited: visitedQuestions,
        timeLeft: timeLeftSeconds
      })
    );
  }, [selectedAnswers, markedForReview, visitedQuestions, timeLeftSeconds]);

  // Anti Cheating tab change detection
  const setupAntiCheating = () => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitchCount((prev) => {
          const next = prev + 1;
          notify('error', `Warning #${next}: Tab switching is tracked during mock exams!`);
          return next;
        });
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  };

  const handleAutoSubmitTimeUp = () => {
    notify('error', 'Time is up! Submitting your exam automatically...');
    calculateAndSubmit();
  };

  const currentQuestion = questions[currentIndex];

  const handleSelectOption = (opt: string) => {
    if (!currentQuestion) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: opt
    }));
  };

  const handleClearChoice = () => {
    if (!currentQuestion) return;
    setSelectedAnswers((prev) => {
      const copy = { ...prev };
      delete copy[currentQuestion.id];
      return copy;
    });
  };

  const handleToggleMarkReview = () => {
    if (!currentQuestion) return;
    setMarkedForReview((prev) => ({
      ...prev,
      [currentQuestion.id]: !prev[currentQuestion.id]
    }));
  };

  const handleGoToQuestion = (index: number) => {
    if (index >= 0 && index < questions.length) {
      setCurrentIndex(index);
      const q = questions[index];
      if (q) {
        setVisitedQuestions((prev) => ({
          ...prev,
          [q.id]: true
        }));
      }
      setShowMobilePalette(false);
    }
  };

  const handleSaveAndNext = () => {
    if (currentIndex < questions.length - 1) {
      handleGoToQuestion(currentIndex + 1);
    }
  };

  const handleMarkReviewAndNext = () => {
    handleToggleMarkReview();
    if (currentIndex < questions.length - 1) {
      handleGoToQuestion(currentIndex + 1);
    }
  };

  // Calculate scores & submit attempt via server-side scoring RPC
  const calculateAndSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    const timeTaken = (test.duration_minutes * 60) - timeLeftSeconds;

    // Create or find attempt record
    let baseAttempt: Attempt = {
      id: studentData.attempt_id || (crypto.randomUUID ? crypto.randomUUID() : 'att-' + Date.now()),
      test_id: test.id,
      student_name: studentData.student_name,
      student_mobile: studentData.student_mobile,
      student_email: studentData.student_email || null,
      student_state: studentData.student_state,
      student_district: studentData.student_district,
      status: 'in_progress',
      score: 0,
      percentage: 0,
      correct_answers: 0,
      wrong_answers: 0,
      time_taken_seconds: timeTaken
    };

    if (!studentData.attempt_id) {
      baseAttempt = await dataService.createAttempt(test, {
        full_name: studentData.student_name,
        mobile: studentData.student_mobile,
        email: studentData.student_email,
        state: studentData.student_state,
        district: studentData.student_district
      });
    }

    // Submit attempt to server RPC
    const savedAttempt = await dataService.submitAttemptSecure(
      test,
      baseAttempt,
      selectedAnswers,
      timeTaken,
      tabSwitchCount
    );

    // Clear progress from localStorage
    const saveKey = `gradeup_progress_${test.id}_${studentData.student_mobile}`;
    localStorage.removeItem(saveKey);

    notify('success', 'Exam submitted successfully!');
    onFinishExam(savedAttempt);
  };

  // Helper formatting timer
  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Calculate palette status
  const getQuestionStatus = (q: Question) => {
    const isAns = Boolean(selectedAnswers[q.id]);
    const isRev = Boolean(markedForReview[q.id]);
    const isVis = Boolean(visitedQuestions[q.id]);

    if (isAns && isRev) return 'answered-review'; // Purple with check
    if (isAns) return 'answered'; // Green
    if (isRev) return 'marked-review'; // Purple
    if (isVis) return 'not-answered'; // Red
    return 'not-visited'; // Gray/White
  };

  const countAnswered = questions.filter((q) => Boolean(selectedAnswers[q.id])).length;
  const countMarked = questions.filter((q) => Boolean(markedForReview[q.id])).length;
  const countNotAnswered = questions.filter((q) => visitedQuestions[q.id] && !selectedAnswers[q.id]).length;
  const countNotVisited = questions.filter((q) => !visitedQuestions[q.id]).length;

  // Group unique sections for test section switcher
  const sectionsList = test.sections && test.sections.length > 0
    ? test.sections
    : Array.from(new Set(questions.map((q) => q.section || q.subject))).filter(Boolean);

  if (loading) {
    return <div className="py-20 text-center font-bold text-slate-500">Loading exam terminal...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col font-sans -mx-4 -mt-6 sm:-mx-6 sm:-mt-8">
      
      {/* EXAM TOP HEADER BAR */}
      <header className="bg-slate-900 text-white px-3 sm:px-6 py-2.5 sm:py-3 sticky top-0 z-30 border-b border-slate-800 flex items-center justify-between gap-2">
        
        {/* Test title & Candidate info */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={() => setShowMobilePalette(true)}
            className="lg:hidden px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded-xl text-white font-bold text-xs flex items-center gap-1.5 border border-slate-700 shrink-0 cursor-pointer shadow-xs"
            title="Open Question Palette"
          >
            <Grid className="w-4 h-4 text-blue-400" />
            <span className="hidden xs:inline">Palette</span>
            <span className="text-[11px] font-mono text-blue-300">({currentIndex + 1}/{questions.length})</span>
          </button>

          <div className="min-w-0">
            <h1 className="font-black text-xs sm:text-sm md:text-base text-white truncate">{test.title}</h1>
            <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">
              Candidate: <span className="text-blue-300 font-bold">{studentData.student_name}</span> ({studentData.student_district})
            </p>
          </div>
        </div>

        {/* Font size toggles & Timer & Submit */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          
          {/* Zoom Controls (Tablet & PC) */}
          <div className="hidden sm:flex items-center gap-1 bg-slate-800 px-2 py-1 rounded-xl text-xs border border-slate-700">
            <button
              onClick={() => setFontSize('sm')}
              className={`px-1.5 py-0.5 rounded-lg font-bold transition-colors ${fontSize === 'sm' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
              title="Small text"
            >
              A-
            </button>
            <button
              onClick={() => setFontSize('base')}
              className={`px-1.5 py-0.5 rounded-lg font-bold transition-colors ${fontSize === 'base' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
              title="Normal text"
            >
              A
            </button>
            <button
              onClick={() => setFontSize('lg')}
              className={`px-1.5 py-0.5 rounded-lg font-bold transition-colors ${fontSize === 'lg' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
              title="Large text"
            >
              A+
            </button>
          </div>

          {/* Countdown Clock */}
          <div className={`px-2.5 sm:px-3.5 py-1.5 rounded-xl font-mono font-black text-xs sm:text-sm md:text-base flex items-center gap-1.5 border shadow-inner ${
            timeLeftSeconds < 300
              ? 'bg-rose-950 text-rose-300 border-rose-600 animate-pulse'
              : 'bg-slate-800 text-emerald-400 border-slate-700'
          }`}>
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span>{formatTimer(timeLeftSeconds)}</span>
          </div>

          {/* Finish & Submit Button */}
          <button
            onClick={() => setShowConfirmModal(true)}
            className="px-3 sm:px-4 py-1.5 sm:py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <span>Submit</span>
            <span className="hidden sm:inline">Exam</span>
          </button>
        </div>

      </header>

      {/* Section Switcher Bar */}
      {sectionsList.length > 0 && (
        <div className="bg-slate-800 text-slate-300 px-3 sm:px-6 py-2 border-b border-slate-700 flex items-center gap-2 overflow-x-auto text-xs font-bold scrollbar-none">
          <span className="text-amber-400 uppercase text-[10px] tracking-wider shrink-0 mr-1 font-black">Sections:</span>
          {sectionsList.map((sec) => {
            const firstIdx = questions.findIndex((q) => q.section === sec || q.subject === sec);
            const isCurrentSection = (currentQuestion?.section === sec) || (!currentQuestion?.section && currentQuestion?.subject === sec);
            return (
              <button
                key={sec}
                onClick={() => firstIdx !== -1 && handleGoToQuestion(firstIdx)}
                className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer text-xs ${
                  isCurrentSection
                    ? 'bg-blue-600 text-white font-black shadow-xs'
                    : 'bg-slate-900 hover:bg-slate-700 text-slate-300 font-semibold'
                }`}
              >
                <span>{sec}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* MAIN EXAM LAYOUT */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* LEFT/CENTER: Question View */}
        <main className="flex-1 p-3 sm:p-6 lg:p-8 overflow-y-auto space-y-6">
          
          {currentQuestion ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 p-4 sm:p-7 md:p-8 shadow-xs space-y-5 sm:space-y-6 max-w-4xl mx-auto">
              
              {/* Question Number & Tags */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 sm:pb-4">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-xl bg-blue-600 text-white font-black text-sm flex items-center justify-center shadow-xs shrink-0">
                    Q{currentQuestion.question_number}
                  </span>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Question {currentIndex + 1} of {questions.length}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <span className="px-2 sm:px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs rounded-lg">
                    +{test.marks_per_question} Marks
                  </span>
                  {currentQuestion.section && (
                    <span className="px-2 sm:px-2.5 py-0.5 bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200 font-bold text-xs rounded-lg border border-amber-200 dark:border-amber-800">
                      Section: {currentQuestion.section}
                    </span>
                  )}
                  {currentQuestion.subject && (
                    <span className="px-2 sm:px-2.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-bold text-xs rounded-lg">
                      {currentQuestion.subject}
                    </span>
                  )}
                </div>
              </div>

              {/* Question Statement */}
              <div className={`text-slate-900 dark:text-white font-bold leading-relaxed whitespace-pre-line ${
                fontSize === 'sm' ? 'text-sm' : fontSize === 'lg' ? 'text-lg sm:text-xl' : 'text-base sm:text-lg'
              }`}>
                {currentQuestion.question_text}
              </div>

              {/* Options List */}
              <div className="space-y-2.5 sm:space-y-3 pt-1 sm:pt-2">
                {[
                  { key: 'A', text: currentQuestion.option_a },
                  { key: 'B', text: currentQuestion.option_b },
                  { key: 'C', text: currentQuestion.option_c },
                  { key: 'D', text: currentQuestion.option_d }
                ].map(({ key, text }) => {
                  if (!text) return null;
                  const isSelected = selectedAnswers[currentQuestion.id] === key;

                  return (
                    <button
                      key={key}
                      onClick={() => handleSelectOption(key)}
                      className={`w-full text-left p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border transition-all flex items-start gap-3 group cursor-pointer active:scale-[0.99] min-h-[48px] ${
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-950/80 border-blue-600 dark:border-blue-500 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-xl font-black text-xs flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700 group-hover:border-blue-500'
                      }`}>
                        {key}
                      </div>

                      <div className={`text-sm sm:text-base font-semibold pt-0.5 leading-relaxed flex-1 ${
                        isSelected ? 'text-blue-900 dark:text-blue-100 font-bold' : 'text-slate-800 dark:text-slate-200'
                      }`}>
                        {text}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* EXAM CONTROL BUTTONS */}
              <div className="pt-4 sm:pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                
                {/* Secondary tools */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleMarkReviewAndNext}
                    className="flex-1 sm:flex-none px-3 sm:px-4 py-2.5 bg-purple-50 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Bookmark className="w-4 h-4" />
                    <span>{markedForReview[currentQuestion.id] ? 'Unmark Review' : 'Mark Review'}</span>
                  </button>

                  <button
                    onClick={handleClearChoice}
                    className="flex-1 sm:flex-none px-3 sm:px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <XCircle className="w-4 h-4" /> <span>Clear</span>
                  </button>
                </div>

                {/* Main progression controls */}
                <div className="flex items-center gap-2">
                  <button
                    disabled={currentIndex === 0}
                    onClick={() => handleGoToQuestion(currentIndex - 1)}
                    className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 disabled:opacity-40 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" /> <span>Previous</span>
                  </button>

                  <button
                    onClick={handleSaveAndNext}
                    className="flex-1 sm:flex-none px-5 sm:px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Save & Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

              </div>

            </div>
          ) : (
            <div className="p-8 text-center text-slate-500 font-bold">No questions found for this exam.</div>
          )}

        </main>

        {/* RIGHT: DESKTOP QUESTION PALETTE SIDEBAR */}
        <aside className="hidden lg:block w-80 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 p-5 overflow-y-auto space-y-6">
          
          <h3 className="font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wider flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <span>Question Palette</span>
            <span className="text-xs text-blue-600 font-mono font-bold">{questions.length} Questions</span>
          </h3>

          {/* Palette Legends */}
          <div className="grid grid-cols-2 gap-2 text-[11px] font-bold text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded bg-emerald-600 text-white text-[9px] flex items-center justify-center">
                {countAnswered}
              </span>
              <span>Answered</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded bg-rose-600 text-white text-[9px] flex items-center justify-center">
                {countNotAnswered}
              </span>
              <span>Not Answered</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded bg-purple-600 text-white text-[9px] flex items-center justify-center">
                {countMarked}
              </span>
              <span>Marked Review</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[9px] flex items-center justify-center">
                {countNotVisited}
              </span>
              <span>Not Visited</span>
            </div>
          </div>

          {/* Question Grid Buttons */}
          <div className="grid grid-cols-5 gap-2 pt-2">
            {questions.map((q, idx) => {
              const status = getQuestionStatus(q);
              const isCurrent = idx === currentIndex;

              let btnBg = 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700';
              if (status === 'answered') btnBg = 'bg-emerald-600 text-white hover:bg-emerald-700';
              if (status === 'answered-review') btnBg = 'bg-purple-600 text-white font-black border-2 border-emerald-400';
              if (status === 'marked-review') btnBg = 'bg-purple-600 text-white hover:bg-purple-700';
              if (status === 'not-answered') btnBg = 'bg-rose-600 text-white hover:bg-rose-700';

              return (
                <button
                  key={q.id}
                  onClick={() => handleGoToQuestion(idx)}
                  className={`h-9 rounded-xl font-bold text-xs flex items-center justify-center transition-all cursor-pointer ${btnBg} ${
                    isCurrent ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-900 scale-105 shadow-sm' : ''
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

        </aside>

      </div>

      {/* MOBILE QUESTION PALETTE DRAWER MODAL */}
      <Modal
        isOpen={showMobilePalette}
        onClose={() => setShowMobilePalette(false)}
        title="Question Navigation Palette"
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
              <span>Answered</span>
              <strong className="text-sm">{countAnswered}</strong>
            </div>
            <div className="p-2.5 bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 rounded-xl border border-rose-200 dark:border-rose-800 flex items-center justify-between">
              <span>Unanswered</span>
              <strong className="text-sm">{countNotAnswered}</strong>
            </div>
            <div className="p-2.5 bg-purple-50 dark:bg-purple-950/50 text-purple-800 dark:text-purple-300 rounded-xl border border-purple-200 dark:border-purple-800 flex items-center justify-between">
              <span>Marked</span>
              <strong className="text-sm">{countMarked}</strong>
            </div>
            <div className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <span>Not Visited</span>
              <strong className="text-sm">{countNotVisited}</strong>
            </div>
          </div>

          <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2 pt-2 max-h-[50vh] overflow-y-auto p-1">
            {questions.map((q, idx) => {
              const status = getQuestionStatus(q);
              const isCurrent = idx === currentIndex;
              let btnBg = 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300';
              if (status === 'answered') btnBg = 'bg-emerald-600 text-white';
              if (status === 'answered-review') btnBg = 'bg-purple-600 text-white font-black border-2 border-emerald-400';
              if (status === 'marked-review') btnBg = 'bg-purple-600 text-white';
              if (status === 'not-answered') btnBg = 'bg-rose-600 text-white';

              return (
                <button
                  key={q.id}
                  onClick={() => {
                    handleGoToQuestion(idx);
                    setShowMobilePalette(false);
                  }}
                  className={`h-11 rounded-xl font-bold text-xs flex items-center justify-center transition-all cursor-pointer active:scale-95 ${btnBg} ${
                    isCurrent ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-900 shadow-md scale-105' : ''
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </div>
      </Modal>

      {/* CONFIRM EXAM SUBMISSION MODAL */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Confirm Exam Submission"
        maxWidth="md"
      >
        <div className="space-y-6">
          
          <div className="p-4 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Are you sure you want to finish the exam?</p>
              <p className="mt-0.5 opacity-90">Once submitted, your answers will be evaluated immediately and cannot be changed.</p>
            </div>
          </div>

          {/* Breakdown summary */}
          <div className="grid grid-cols-2 gap-3 text-center text-xs">
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
              <p className="text-xl font-black text-emerald-600">{countAnswered}</p>
              <p className="text-slate-400 font-bold uppercase text-[10px]">Answered</p>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
              <p className="text-xl font-black text-rose-600">{countNotAnswered}</p>
              <p className="text-slate-400 font-bold uppercase text-[10px]">Unanswered</p>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
              <p className="text-xl font-black text-purple-600">{countMarked}</p>
              <p className="text-slate-400 font-bold uppercase text-[10px]">Marked Review</p>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
              <p className="text-xl font-black text-slate-500">{countNotVisited}</p>
              <p className="text-slate-400 font-bold uppercase text-[10px]">Not Visited</p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => setShowConfirmModal(false)}
              className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:underline"
            >
              Resume Test
            </button>

            <button
              onClick={calculateAndSubmit}
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all"
            >
              {isSubmitting ? 'Evaluating Score...' : 'Confirm & Generate Scorecard'}
            </button>
          </div>

        </div>
      </Modal>

    </div>
  );
};
