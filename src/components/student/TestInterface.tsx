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
    const qList = await dataService.getQuestions(test.id);
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

  // Calculate scores & submit attempt
  const calculateAndSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    let totalScore = 0;
    let correctCount = 0;
    let wrongCount = 0;
    let unattemptedCount = 0;

    const detailedResponses: Attempt['responses'] = [];

    questions.forEach((q) => {
      const givenAns = selectedAnswers[q.id] || null;
      let status: 'correct' | 'wrong' | 'unattempted' = 'unattempted';
      let marksAwarded = 0;

      if (givenAns) {
        if (givenAns.toUpperCase() === q.correct_answer.toUpperCase()) {
          status = 'correct';
          correctCount++;
          marksAwarded = test.marks_per_question;
          totalScore += marksAwarded;
        } else {
          status = 'wrong';
          wrongCount++;
          marksAwarded = -test.negative_marking;
          totalScore += marksAwarded;
        }
      } else {
        unattemptedCount++;
      }

      detailedResponses.push({
        question_id: q.id,
        user_answer: givenAns,
        correct_answer: q.correct_answer,
        status,
        marks_awarded: marksAwarded
      });
    });

    const totalPossibleMarks = test.total_marks || (questions.length * test.marks_per_question);
    // Ensure totalScore is formatted neatly
    const finalScore = Math.max(0, Math.round(totalScore * 100) / 100);
    const percentage = Math.max(0, Math.round((finalScore / (totalPossibleMarks || 1)) * 100));
    const timeTaken = (test.duration_minutes * 60) - timeLeftSeconds;

    const newAttempt: Attempt = {
      id: 'att-' + Date.now(),
      test_id: test.id,
      student_name: studentData.student_name,
      student_mobile: studentData.student_mobile,
      student_email: studentData.student_email,
      student_state: studentData.student_state,
      student_district: studentData.student_district,
      score: finalScore,
      percentage,
      correct_answers: correctCount,
      wrong_answers: wrongCount,
      unattempted_answers: unattemptedCount,
      time_taken_seconds: timeTaken,
      status: 'completed',
      submitted_at: new Date().toISOString(),
      responses: detailedResponses
    };

    // Save to dataService
    const savedAttempt = await dataService.saveAttempt(newAttempt);

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
      <header className="bg-slate-900 text-white px-4 py-3 sticky top-0 z-30 border-b border-slate-800 flex items-center justify-between">
        
        {/* Test title & Candidate info */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:block">
            <h1 className="font-black text-sm sm:text-base text-white">{test.title}</h1>
            <p className="text-[11px] text-slate-400">
              Candidate: <span className="text-blue-300 font-bold">{studentData.student_name}</span> ({studentData.student_district})
            </p>
          </div>
          <button
            onClick={() => setShowMobilePalette(!showMobilePalette)}
            className="sm:hidden p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-white font-bold text-xs flex items-center gap-1"
          >
            <Grid className="w-4 h-4" /> Palette
          </button>
        </div>

        {/* Font size toggles & Timer */}
        <div className="flex items-center gap-4">
          
          {/* Zoom Controls */}
          <div className="hidden md:flex items-center gap-1 bg-slate-800 px-2 py-1 rounded-lg text-xs">
            <button
              onClick={() => setFontSize('sm')}
              className={`px-1.5 py-0.5 rounded font-bold ${fontSize === 'sm' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
            >
              A-
            </button>
            <button
              onClick={() => setFontSize('base')}
              className={`px-1.5 py-0.5 rounded font-bold ${fontSize === 'base' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
            >
              A
            </button>
            <button
              onClick={() => setFontSize('lg')}
              className={`px-1.5 py-0.5 rounded font-bold ${fontSize === 'lg' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
            >
              A+
            </button>
          </div>

          {/* Countdown Clock */}
          <div className={`px-3.5 py-1.5 rounded-xl font-mono font-black text-sm sm:text-base flex items-center gap-2 border ${
            timeLeftSeconds < 300
              ? 'bg-rose-950 text-rose-300 border-rose-600 animate-pulse'
              : 'bg-slate-800 text-emerald-400 border-slate-700'
          }`}>
            <Clock className="w-4 h-4" />
            <span>{formatTimer(timeLeftSeconds)}</span>
          </div>

          {/* Finish & Submit Button */}
          <button
            onClick={() => setShowConfirmModal(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center gap-1.5"
          >
            <span>Submit Exam</span>
          </button>
        </div>

      </header>

      {/* Section Switcher Bar */}
      {sectionsList.length > 0 && (
        <div className="bg-slate-800 text-slate-300 px-4 py-2 border-b border-slate-700 flex items-center gap-2 overflow-x-auto text-xs font-bold scrollbar-none">
          <span className="text-amber-400 uppercase text-[10px] tracking-wider shrink-0 mr-1 font-black">Test Sections:</span>
          {sectionsList.map((sec) => {
            const firstIdx = questions.findIndex((q) => q.section === sec || q.subject === sec);
            const isCurrentSection = (currentQuestion?.section === sec) || (!currentQuestion?.section && currentQuestion?.subject === sec);
            return (
              <button
                key={sec}
                onClick={() => firstIdx !== -1 && handleGoToQuestion(firstIdx)}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all flex items-center gap-1.5 ${
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
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        
        {/* LEFT/CENTER: Question View */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-6">
          
          {currentQuestion ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-6 max-w-4xl mx-auto">
              
              {/* Question Number & Tags */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-xl bg-blue-600 text-white font-black text-sm flex items-center justify-center">
                    Q{currentQuestion.question_number}
                  </span>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Question {currentIndex + 1} of {questions.length}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs rounded-md">
                    +{test.marks_per_question} Marks
                  </span>
                  {currentQuestion.section && (
                    <span className="px-2.5 py-0.5 bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200 font-bold text-xs rounded-md border border-amber-200 dark:border-amber-800">
                      Section: {currentQuestion.section}
                    </span>
                  )}
                  {currentQuestion.subject && (
                    <span className="px-2.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-bold text-xs rounded-md">
                      {currentQuestion.subject}
                    </span>
                  )}
                </div>
              </div>

              {/* Question Statement */}
              <div className={`text-slate-900 dark:text-white font-bold leading-relaxed ${
                fontSize === 'sm' ? 'text-sm' : fontSize === 'lg' ? 'text-xl' : 'text-base sm:text-lg'
              }`}>
                {currentQuestion.question_text}
              </div>

              {/* Options List */}
              <div className="space-y-3 pt-2">
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
                      className={`w-full text-left p-4 rounded-2xl border transition-all flex items-start gap-3.5 group cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-950/80 border-blue-600 dark:border-blue-500 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-xl font-black text-xs flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                        isSelected
                          ? 'bg-blue-600 text-white'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700 group-hover:border-blue-500'
                      }`}>
                        {key}
                      </div>

                      <div className={`text-sm sm:text-base font-semibold pt-0.5 ${
                        isSelected ? 'text-blue-900 dark:text-blue-100 font-bold' : 'text-slate-800 dark:text-slate-200'
                      }`}>
                        {text}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* EXAM CONTROL BUTTONS */}
              <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleMarkReviewAndNext}
                    className="px-4 py-2.5 bg-purple-50 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
                  >
                    <Bookmark className="w-4 h-4" />
                    <span>{markedForReview[currentQuestion.id] ? 'Unmark Review' : 'Mark for Review'}</span>
                  </button>

                  <button
                    onClick={handleClearChoice}
                    className="px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 font-bold text-xs rounded-xl transition-all flex items-center gap-1"
                  >
                    <XCircle className="w-4 h-4" /> Clear Answer
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    disabled={currentIndex === 0}
                    onClick={() => handleGoToQuestion(currentIndex - 1)}
                    className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 disabled:opacity-40 font-bold text-xs rounded-xl transition-all flex items-center gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" /> Previous
                  </button>

                  <button
                    onClick={handleSaveAndNext}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
                  >
                    <span>Save & Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

              </div>

            </div>
          ) : (
            <div className="p-8 text-center text-slate-500">No questions found for this exam.</div>
          )}

        </main>

        {/* RIGHT: DESKTOP QUESTION PALETTE SIDEBAR */}
        <aside className="hidden lg:block w-80 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 p-5 overflow-y-auto space-y-6">
          
          <h3 className="font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wider flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <span>Question Palette</span>
            <span className="text-xs text-blue-600 font-mono">{questions.length} Questions</span>
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

              let btnBg = 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300';
              if (status === 'answered') btnBg = 'bg-emerald-600 text-white';
              if (status === 'answered-review') btnBg = 'bg-purple-600 text-white font-black border-2 border-emerald-400';
              if (status === 'marked-review') btnBg = 'bg-purple-600 text-white';
              if (status === 'not-answered') btnBg = 'bg-rose-600 text-white';

              return (
                <button
                  key={q.id}
                  onClick={() => handleGoToQuestion(idx)}
                  className={`h-9 rounded-xl font-bold text-xs flex items-center justify-center transition-all ${btnBg} ${
                    isCurrent ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-900 scale-105' : ''
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
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
            <div className="p-2 bg-emerald-50 text-emerald-800 rounded-lg">Answered: {countAnswered}</div>
            <div className="p-2 bg-rose-50 text-rose-800 rounded-lg">Not Answered: {countNotAnswered}</div>
            <div className="p-2 bg-purple-50 text-purple-800 rounded-lg">Marked Review: {countMarked}</div>
            <div className="p-2 bg-slate-100 text-slate-800 rounded-lg">Not Visited: {countNotVisited}</div>
          </div>

          <div className="grid grid-cols-5 gap-2 pt-2 max-h-64 overflow-y-auto">
            {questions.map((q, idx) => {
              const status = getQuestionStatus(q);
              let btnBg = 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300';
              if (status === 'answered') btnBg = 'bg-emerald-600 text-white';
              if (status === 'marked-review') btnBg = 'bg-purple-600 text-white';
              if (status === 'not-answered') btnBg = 'bg-rose-600 text-white';

              return (
                <button
                  key={q.id}
                  onClick={() => handleGoToQuestion(idx)}
                  className={`h-10 rounded-xl font-bold text-xs flex items-center justify-center ${btnBg}`}
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
