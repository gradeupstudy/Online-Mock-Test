import { Test, Question, Student, Attempt, Answer, SocialPlatform, AdminSettings, PublicLeaderboardEntry, SubmitAttemptResult } from '../types';
import { DEMO_TESTS, DEMO_QUESTIONS, DEMO_ATTEMPTS, DEMO_SOCIAL_PLATFORMS, DEMO_ADMIN_SETTINGS } from '../data/demoData';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';

const STORAGE_KEYS = {
  TESTS: 'gradeup_tests',
  QUESTIONS: 'gradeup_questions',
  ATTEMPTS: 'gradeup_attempts',
  ANSWERS: 'gradeup_answers',
  SOCIAL: 'gradeup_social_platforms',
  SETTINGS: 'gradeup_admin_settings',
  ACTIVE_ATTEMPT: 'gradeup_active_attempt_'
};

// Initialize local storage with fallback demo data if empty
const initLocalStorage = () => {
  if (!localStorage.getItem(STORAGE_KEYS.TESTS)) {
    localStorage.setItem(STORAGE_KEYS.TESTS, JSON.stringify(DEMO_TESTS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.QUESTIONS)) {
    localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(DEMO_QUESTIONS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.ATTEMPTS)) {
    localStorage.setItem(STORAGE_KEYS.ATTEMPTS, JSON.stringify(DEMO_ATTEMPTS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.SOCIAL)) {
    localStorage.setItem(STORAGE_KEYS.SOCIAL, JSON.stringify(DEMO_SOCIAL_PLATFORMS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEMO_ADMIN_SETTINGS));
  }
};

initLocalStorage();

export const dataService = {
  // ------------------------------------
  // ADMIN SETTINGS
  // ------------------------------------
  getSettings: async (): Promise<AdminSettings> => {
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase.from('admin_settings').select('*').limit(1).single();
        if (!error && data) return data as AdminSettings;
      } catch (err) {
        console.warn('Supabase fetch settings failed', err);
      }
    }
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return raw ? JSON.parse(raw) : DEMO_ADMIN_SETTINGS;
  },

  updateSettings: async (settings: Partial<AdminSettings>): Promise<AdminSettings> => {
    const current = await dataService.getSettings();
    const updated = { ...current, ...settings };
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('admin_settings').upsert(updated);
      } catch (e) {
        console.error('Failed to update settings in Supabase', e);
      }
    }
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
    return updated;
  },

  // ------------------------------------
  // TESTS MANAGEMENT
  // ------------------------------------
  getTests: async (includeUnpublished = true): Promise<Test[]> => {
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      try {
        let query = supabase.from('tests').select('*').order('created_at', { ascending: false });
        if (!includeUnpublished) {
          query = query.eq('is_published', true).eq('status', 'published');
        }
        const { data, error } = await query;
        if (!error && data) return data as Test[];
      } catch (e) {
        console.warn('Supabase fetch tests error', e);
      }
    }
    const raw = localStorage.getItem(STORAGE_KEYS.TESTS);
    const tests: Test[] = raw ? JSON.parse(raw) : DEMO_TESTS;
    if (!includeUnpublished) {
      return tests.filter(t => t.is_published && t.status === 'published');
    }
    return tests;
  },

  getTestBySlugOrId: async (identifier: string): Promise<Test | null> => {
    if (!identifier) return null;
    const cleanId = identifier.trim().toLowerCase();

    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data } = await supabase
          .from('tests')
          .select('*')
          .or(`slug.eq.${identifier},test_code.eq.${identifier},id.eq.${identifier}`)
          .limit(1)
          .maybeSingle();

        if (data) return data as Test;
      } catch (e) {
        console.warn('Supabase getTestBySlugOrId lookup failed', e);
      }
    }

    const tests = await dataService.getTests(true);
    if (!tests || tests.length === 0) return null;

    const found = tests.find(t => 
      (t.slug && t.slug.toLowerCase() === cleanId) ||
      (t.id && t.id.toLowerCase() === cleanId) ||
      (t.test_code && t.test_code.toLowerCase() === cleanId)
    );
    if (found) return found;

    const partialMatch = tests.find(t =>
      (t.slug && (cleanId.includes(t.slug.toLowerCase()) || t.slug.toLowerCase().includes(cleanId))) ||
      (t.test_code && (cleanId.includes(t.test_code.toLowerCase()) || t.test_code.toLowerCase().includes(cleanId)))
    );
    if (partialMatch) return partialMatch;

    return tests[0];
  },

  getPublicShareableUrl: (slugOrCode: string): string => {
    let origin = window.location.origin;
    if (origin.includes('-dev-')) {
      origin = origin.replace('-dev-', '-pre-');
    }
    const clean = encodeURIComponent(slugOrCode || 'demo');
    return `${origin}/?t=${clean}`;
  },

  getTestById: async (testId: string): Promise<Test | null> => {
    return dataService.getTestBySlugOrId(testId);
  },

  saveTest: async (test: Test): Promise<Test> => {
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase.from('tests').upsert(test).select().single();
        if (!error && data) return data as Test;
      } catch (e) {
        console.error('Supabase test save error', e);
      }
    }
    const tests = await dataService.getTests(true);
    const index = tests.findIndex(t => t.id === test.id);
    if (index >= 0) {
      tests[index] = { ...test, updated_at: new Date().toISOString() };
    } else {
      tests.unshift({ ...test, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    }
    localStorage.setItem(STORAGE_KEYS.TESTS, JSON.stringify(tests));
    return test;
  },

  deleteTest: async (testId: string): Promise<boolean> => {
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('tests').delete().eq('id', testId);
      } catch (e) {
        console.error('Supabase test delete error', e);
      }
    }
    const tests = await dataService.getTests(true);
    const filtered = tests.filter(t => t.id !== testId);
    localStorage.setItem(STORAGE_KEYS.TESTS, JSON.stringify(filtered));
    return true;
  },

  duplicateTest: async (testId: string): Promise<Test | null> => {
    const original = await dataService.getTestBySlugOrId(testId);
    if (!original) return null;

    const newId = crypto.randomUUID ? crypto.randomUUID() : 'test-' + Date.now();
    const newCode = original.test_code + '-COPY';
    const newTitle = original.title + ' (Copy)';
    const newSlug = original.slug + '-copy-' + Math.floor(Math.random() * 1000);

    const duplicated: Test = {
      ...original,
      id: newId,
      test_code: newCode,
      title: newTitle,
      slug: newSlug,
      status: 'published',
      is_published: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await dataService.saveTest(duplicated);

    const questions = await dataService.getQuestions(testId, true);
    if (questions.length > 0) {
      const duplicatedQuestions = questions.map(q => ({
        ...q,
        id: crypto.randomUUID ? crypto.randomUUID() : 'q-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
        test_id: newId
      }));
      await dataService.saveQuestions(newId, duplicatedQuestions);
    }

    return duplicated;
  },

  // ------------------------------------
  // QUESTIONS MANAGEMENT (SECURE)
  // ------------------------------------

  // For Students: Uses public RPC to omit correct_answer and explanation before submission!
  getPublicQuestions: async (testId: string): Promise<Question[]> => {
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase.rpc('get_public_test_questions', { p_test_id: testId });
        if (!error && data && data.length > 0) {
          return data.map((q: any) => ({
            ...q,
            correct_answer: undefined, // Hide correct answer from client memory
            explanation: undefined
          }));
        }
      } catch (e) {
        console.warn('RPC get_public_test_questions fallback to table query', e);
      }
    }
    // Fallback if RPC fails or local storage
    const allQ = await dataService.getQuestions(testId, false);
    return allQ.map(q => ({
      ...q,
      correct_answer: undefined,
      explanation: undefined
    }));
  },

  // For Admin / Results: Fetch full question dataset
  getQuestions: async (testId: string, includeAnswers = true): Promise<Question[]> => {
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('questions')
          .select('*')
          .eq('test_id', testId)
          .order('question_number', { ascending: true });
        if (!error && data) return data as Question[];
      } catch (e) {
        console.warn('Supabase questions fetch error', e);
      }
    }

    const raw = localStorage.getItem(STORAGE_KEYS.QUESTIONS);
    const questionsMap: Record<string, Question[]> = raw ? JSON.parse(raw) : DEMO_QUESTIONS;
    const questions = questionsMap[testId] || [];
    if (!includeAnswers) {
      return questions.map(q => ({ ...q, correct_answer: undefined, explanation: undefined }));
    }
    return questions;
  },

  saveQuestions: async (testId: string, questions: Question[]): Promise<void> => {
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('questions').delete().eq('test_id', testId);
        await supabase.from('questions').insert(questions);
      } catch (e) {
        console.error('Supabase save questions error', e);
      }
    }

    const raw = localStorage.getItem(STORAGE_KEYS.QUESTIONS);
    const questionsMap: Record<string, Question[]> = raw ? JSON.parse(raw) : DEMO_QUESTIONS;
    questionsMap[testId] = questions;
    localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(questionsMap));

    const test = await dataService.getTestBySlugOrId(testId);
    if (test) {
      const updatedTest: Test = {
        ...test,
        total_questions: questions.length,
        total_marks: questions.reduce((sum, q) => sum + (Number(q.marks) || 1), 0)
      };
      await dataService.saveTest(updatedTest);
    }
  },

  saveQuestion: async (testId: string, question: Question): Promise<Question> => {
    const questions = await dataService.getQuestions(testId, true);
    const index = questions.findIndex(q => q.id === question.id);
    if (index >= 0) {
      questions[index] = question;
    } else {
      questions.push(question);
    }
    questions.sort((a, b) => a.question_number - b.question_number);
    await dataService.saveQuestions(testId, questions);
    return question;
  },

  deleteQuestion: async (testId: string, questionId: string): Promise<void> => {
    const questions = await dataService.getQuestions(testId, true);
    const filtered = questions.filter(q => q.id !== questionId);
    const reindexed = filtered.map((q, idx) => ({ ...q, question_number: idx + 1 }));
    await dataService.saveQuestions(testId, reindexed);
  },

  // ------------------------------------
  // SOCIAL PLATFORMS
  // ------------------------------------
  getSocialPlatforms: async (includeInactive = true): Promise<SocialPlatform[]> => {
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      try {
        let query = supabase.from('social_platforms').select('*');
        if (!includeInactive) {
          query = query.eq('is_active', true);
        }
        const { data, error } = await query;
        if (!error && data) return data as SocialPlatform[];
      } catch (e) {
        console.warn('Supabase social platforms fetch error', e);
      }
    }
    const raw = localStorage.getItem(STORAGE_KEYS.SOCIAL);
    const platforms: SocialPlatform[] = raw ? JSON.parse(raw) : DEMO_SOCIAL_PLATFORMS;
    if (!includeInactive) {
      return platforms.filter(p => p.is_active);
    }
    return platforms;
  },

  saveSocialPlatform: async (platform: SocialPlatform): Promise<SocialPlatform> => {
    const platforms = await dataService.getSocialPlatforms(true);
    const idx = platforms.findIndex(p => p.id === platform.id);
    if (idx >= 0) {
      platforms[idx] = platform;
    } else {
      platforms.push(platform);
    }
    localStorage.setItem(STORAGE_KEYS.SOCIAL, JSON.stringify(platforms));

    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('social_platforms').upsert(platform);
      } catch (e) {
        console.error('Supabase save social platform error', e);
      }
    }
    return platform;
  },

  toggleSocialPlatformActive: async (id: string, isActive: boolean): Promise<SocialPlatform | null> => {
    const platforms = await dataService.getSocialPlatforms(true);
    const platform = platforms.find(p => p.id === id);
    if (!platform) return null;
    const updated = { ...platform, is_active: isActive };
    return await dataService.saveSocialPlatform(updated);
  },

  deleteSocialPlatform: async (id: string): Promise<void> => {
    const platforms = await dataService.getSocialPlatforms(true);
    const filtered = platforms.filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEYS.SOCIAL, JSON.stringify(filtered));

    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('social_platforms').delete().eq('id', id);
      } catch (e) {
        console.error('Supabase delete social platform error', e);
      }
    }
  },

  // ------------------------------------
  // STUDENT REGISTRATION & ATTEMPTS
  // ------------------------------------
  checkPreviousAttempt: async (testId: string, mobile: string): Promise<Attempt | null> => {
    const attempts = await dataService.getAttempts(testId);
    return attempts.find(a => a.student_mobile === mobile && (a.status === 'completed' || a.status === 'auto_submitted')) || null;
  },

  createAttempt: async (
    test: Test,
    student: { full_name: string; mobile: string; email?: string | null; state: string; district: string; gender?: string }
  ): Promise<Attempt> => {
    const attemptId = crypto.randomUUID ? crypto.randomUUID() : 'att-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
    const studentId = crypto.randomUUID ? crypto.randomUUID() : 'stu-' + Date.now();

    const newAttempt: Attempt = {
      id: attemptId,
      test_id: test.id,
      student_id: studentId,
      student_name: student.full_name,
      student_mobile: student.mobile,
      student_email: student.email || null,
      student_state: student.state,
      student_district: student.district,
      start_time: new Date().toISOString(),
      status: 'in_progress',
      total_questions: test.total_questions,
      attempted_questions: 0,
      correct_answers: 0,
      wrong_answers: 0,
      skipped_questions: test.total_questions,
      score: 0,
      percentage: 0,
      time_taken_seconds: 0,
      created_at: new Date().toISOString()
    };

    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      try {
        // Upsert student record
        await supabase.from('students').upsert({
          id: studentId,
          full_name: student.full_name,
          mobile: student.mobile,
          email: student.email || null,
          state: student.state,
          district: student.district,
          gender: student.gender || null
        }, { onConflict: 'mobile' });

        // Create attempt in Supabase
        await supabase.from('attempts').insert(newAttempt);
      } catch (e) {
        console.error('Supabase attempt creation error', e);
      }
    }

    const attempts = await dataService.getAttempts();
    attempts.unshift(newAttempt);
    localStorage.setItem(STORAGE_KEYS.ATTEMPTS, JSON.stringify(attempts));

    localStorage.setItem(STORAGE_KEYS.ACTIVE_ATTEMPT + test.id, JSON.stringify({
      attempt: newAttempt,
      answers: {}
    }));

    return newAttempt;
  },

  saveAnswerProgress: (testId: string, attemptId: string, answers: Record<string, { selected: 'A'|'B'|'C'|'D'|null; marked: boolean }>) => {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_ATTEMPT + testId, JSON.stringify({
      attemptId,
      answers,
      lastSavedAt: new Date().toISOString()
    }));
  },

  getSavedAnswerProgress: (testId: string) => {
    const raw = localStorage.getItem(STORAGE_KEYS.ACTIVE_ATTEMPT + testId);
    return raw ? JSON.parse(raw) : null;
  },

  clearSavedProgress: (testId: string) => {
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_ATTEMPT + testId);
  },

  // SECURE SERVER-SIDE SUBMISSION VIA SUPABASE RPC
  submitAttemptSecure: async (
    test: Test,
    attempt: Attempt,
    selectedAnswers: Record<string, string>,
    timeTakenSeconds: number,
    suspiciousCount = 0
  ): Promise<Attempt> => {
    const supabase = getSupabaseClient();
    
    // Format student answers array for RPC
    const formattedAnswers = Object.entries(selectedAnswers).map(([qId, ans]) => ({
      question_id: qId,
      selected_answer: ans
    }));

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase.rpc('submit_attempt_secure', {
          p_attempt_id: attempt.id,
          p_answers: formattedAnswers,
          p_time_taken_seconds: timeTakenSeconds,
          p_suspicious_count: suspiciousCount
        });

        if (!error && data && data.success) {
          // Fetch updated attempt details
          const updatedAttempt = await dataService.getAttemptById(attempt.id);
          if (updatedAttempt) {
            // Fetch answers and official questions to construct responses view
            const answers = await dataService.getAttemptAnswers(attempt.id);
            const questions = await dataService.getQuestions(test.id, true);

            const responses = questions.map(q => {
              const ansRecord = answers.find(a => a.question_id === q.id);
              const userAns = ansRecord ? ansRecord.selected_answer : (selectedAnswers[q.id] || null);
              const isCorrect = ansRecord ? ansRecord.is_correct : (userAns === q.correct_answer);
              const status: 'correct' | 'wrong' | 'unattempted' = !userAns ? 'unattempted' : (isCorrect ? 'correct' : 'wrong');

              return {
                question_id: q.id,
                user_answer: userAns,
                correct_answer: q.correct_answer,
                status,
                marks_awarded: ansRecord ? Number(ansRecord.marks_obtained) : 0
              };
            });

            const completed = {
              ...updatedAttempt,
              responses
            };

            dataService.clearSavedProgress(test.id);
            return completed;
          }
        } else if (error) {
          console.error('Supabase submit_attempt_secure RPC error:', error);
        }
      } catch (err) {
        console.error('Supabase submit_attempt_secure failed, fallback to client evaluation', err);
      }
    }

    // Client evaluation fallback (used only if Supabase not configured or offline demo)
    const questions = await dataService.getQuestions(test.id, true);
    let attempted = 0;
    let correct = 0;
    let wrong = 0;
    let totalScore = 0;

    const answerRecords: Answer[] = [];
    const responses: Attempt['responses'] = [];

    questions.forEach(q => {
      const selected = selectedAnswers[q.id] || null;
      let isCorrect = false;
      let marksObtained = 0;

      if (selected) {
        attempted++;
        if (selected.toUpperCase() === (q.correct_answer || '').toUpperCase()) {
          correct++;
          isCorrect = true;
          marksObtained = Number(q.marks) || Number(test.marks_per_question) || 1;
        } else {
          wrong++;
          isCorrect = false;
          marksObtained = - (Number(q.negative_marks) || Number(test.negative_marking) || 0.25);
        }
      }

      totalScore += marksObtained;

      answerRecords.push({
        id: crypto.randomUUID ? crypto.randomUUID() : 'ans-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
        attempt_id: attempt.id,
        question_id: q.id,
        selected_answer: selected as any,
        is_correct: isCorrect,
        marks_obtained: marksObtained,
        is_marked_for_review: false
      });

      responses.push({
        question_id: q.id,
        user_answer: selected,
        correct_answer: q.correct_answer || '',
        status: !selected ? 'unattempted' : (isCorrect ? 'correct' : 'wrong'),
        marks_awarded: marksObtained
      });
    });

    const skipped = test.total_questions - attempted;
    const finalScore = Math.max(0, Math.round(totalScore * 100) / 100);
    const maxMarks = test.total_marks || (test.total_questions * (test.marks_per_question || 1));
    const percentage = maxMarks > 0 ? Math.round((finalScore / maxMarks) * 10000) / 100 : 0;

    const completedAttempt: Attempt = {
      ...attempt,
      submitted_at: new Date().toISOString(),
      status: 'completed',
      attempted_questions: attempted,
      correct_answers: correct,
      wrong_answers: wrong,
      skipped_questions: skipped,
      score: finalScore,
      percentage,
      time_taken_seconds: timeTakenSeconds,
      suspicious_activity_count: suspiciousCount,
      responses
    };

    const attempts = await dataService.getAttempts();
    const idx = attempts.findIndex(a => a.id === completedAttempt.id);
    if (idx >= 0) {
      attempts[idx] = completedAttempt;
    } else {
      attempts.unshift(completedAttempt);
    }
    localStorage.setItem(STORAGE_KEYS.ATTEMPTS, JSON.stringify(attempts));

    dataService.clearSavedProgress(test.id);
    return completedAttempt;
  },

  // Backward compatibility alias for submitAttempt
  submitAttempt: async (
    test: Test,
    attempt: Attempt,
    studentAnswers: Record<string, { selected: 'A'|'B'|'C'|'D'|null; marked: boolean }>,
    _questionsUnused: Question[],
    timeTakenSeconds: number,
    suspiciousCount = 0
  ): Promise<Attempt> => {
    const stringAnswers: Record<string, string> = {};
    Object.entries(studentAnswers).forEach(([qId, val]) => {
      if (val && val.selected) {
        stringAnswers[qId] = val.selected;
      }
    });

    return dataService.submitAttemptSecure(test, attempt, stringAnswers, timeTakenSeconds, suspiciousCount);
  },

  saveAttempt: async (attempt: Attempt): Promise<Attempt> => {
    const attempts = await dataService.getAttempts();
    const idx = attempts.findIndex(a => a.id === attempt.id);
    if (idx >= 0) {
      attempts[idx] = attempt;
    } else {
      attempts.unshift(attempt);
    }
    localStorage.setItem(STORAGE_KEYS.ATTEMPTS, JSON.stringify(attempts));

    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('attempts').upsert(attempt);
      } catch (e) {
        console.error('Supabase save attempt error', e);
      }
    }
    return attempt;
  },

  getAttempts: async (testId?: string): Promise<Attempt[]> => {
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      try {
        let query = supabase.from('attempts').select('*').order('created_at', { ascending: false });
        if (testId) {
          query = query.eq('test_id', testId);
        }
        const { data, error } = await query;
        if (!error && data) return data as Attempt[];
      } catch (e) {
        console.warn('Supabase fetch attempts error', e);
      }
    }
    const raw = localStorage.getItem(STORAGE_KEYS.ATTEMPTS);
    const attempts: Attempt[] = raw ? JSON.parse(raw) : DEMO_ATTEMPTS;
    if (testId) {
      return attempts.filter(a => a.test_id === testId);
    }
    return attempts;
  },

  getAttemptById: async (attemptId: string): Promise<Attempt | null> => {
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase.from('attempts').select('*').eq('id', attemptId).single();
        if (!error && data) return data as Attempt;
      } catch (e) {
        console.warn('Supabase fetch attempt by ID failed', e);
      }
    }
    const attempts = await dataService.getAttempts();
    return attempts.find(a => a.id === attemptId) || null;
  },

  getAttemptAnswers: async (attemptId: string): Promise<Answer[]> => {
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase.from('answers').select('*').eq('attempt_id', attemptId);
        if (!error && data) return data as Answer[];
      } catch (e) {
        console.warn('Supabase fetch attempt answers error', e);
      }
    }
    const raw = localStorage.getItem(STORAGE_KEYS.ANSWERS);
    const answersMap: Record<string, Answer[]> = raw ? JSON.parse(raw) : {};
    return answersMap[attemptId] || [];
  },

  // ------------------------------------
  // LEADERBOARD & RANKINGS (DYNAMIC / MASKED)
  // ------------------------------------
  getLeaderboard: async (testId: string, limit = 20): Promise<PublicLeaderboardEntry[]> => {
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase.rpc('get_top_leaderboard', {
          p_test_id: testId,
          p_limit: limit
        });
        if (!error && data) return data as PublicLeaderboardEntry[];
      } catch (e) {
        console.warn('Supabase fetch get_top_leaderboard RPC error', e);
      }
    }

    // Fallback mask calculation
    const attempts = await dataService.getAttempts(testId);
    const completed = attempts.filter(a => a.status === 'completed' || a.status === 'auto_submitted');
    completed.sort((a, b) => b.score - a.score || a.time_taken_seconds - b.time_taken_seconds);

    return completed.slice(0, limit).map((a, idx) => {
      const nameParts = a.student_name.split(' ');
      const firstName = nameParts[0] || 'Candidate';
      const initial = nameParts.length > 1 ? ` ${nameParts[1][0]}.` : '';
      const masked = `${firstName}${initial}`;

      return {
        rank: idx + 1,
        attempt_id: a.id,
        masked_name: masked,
        score: a.score,
        correct_answers: a.correct_answers,
        time_taken_seconds: a.time_taken_seconds,
        submitted_at: a.submitted_at || a.created_at || new Date().toISOString()
      };
    });
  },

  getStudentRank: async (testId: string, attemptId: string): Promise<number> => {
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase.rpc('get_student_rank', {
          p_test_id: testId,
          p_attempt_id: attemptId
        });
        if (!error && typeof data === 'number') return data;
      } catch (e) {
        console.warn('Supabase fetch get_student_rank RPC error', e);
      }
    }

    const leaderboard = await dataService.getLeaderboard(testId, 1000);
    const found = leaderboard.find(l => l.attempt_id === attemptId);
    return found ? found.rank : 1;
  }
};
