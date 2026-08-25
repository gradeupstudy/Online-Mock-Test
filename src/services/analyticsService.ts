import { 
  Attempt, 
  Question, 
  Test, 
  PersonalizedStudentAnalytics,
  PerformanceStatusInfo,
  PerformanceStatusCategory,
  SubjectPerformance,
  ChapterPerformance,
  TopicPerformance,
  DifficultyPerformance,
  WeakAreaItem,
  StrongAreaItem,
  SpeedAnalysis,
  SpeedAnalysisSubjectItem,
  CrossTestProgress,
  RecentAttemptHistoryItem
} from '../types';
import { dataService } from './dataService';

// ----------------------------------------------------
// 1. STATUS RESOLVER (Strict Specification Thresholds)
// ----------------------------------------------------
export function getPerformanceStatus(accuracy: number): PerformanceStatusInfo {
  // 80%+ → Strong 🟢
  if (accuracy >= 80) {
    return {
      status: 'strong',
      label: 'Strong',
      badgeEmoji: '🟢',
      color: '#10b981',
      badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      bgClass: 'bg-emerald-50/50 dark:bg-emerald-950/20',
      borderClass: 'border-emerald-300 dark:border-emerald-700',
      description: 'Excellent conceptual grasp and precision. Keep practicing to maintain speed.'
    };
  }
  // 60–79% → Average 🟡
  if (accuracy >= 60) {
    return {
      status: 'average',
      label: 'Average',
      badgeEmoji: '🟡',
      color: '#f59e0b',
      badgeClass: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      bgClass: 'bg-amber-50/50 dark:bg-amber-950/20',
      borderClass: 'border-amber-300 dark:border-amber-700',
      description: 'Good foundation with room for refinement. Target tricky question patterns.'
    };
  }
  // 40–59% → Needs Improvement 🟠
  if (accuracy >= 40) {
    return {
      status: 'needs_improvement',
      label: 'Needs Improvement',
      badgeEmoji: '🟠',
      color: '#f97316',
      badgeClass: 'bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300 border-orange-200 dark:border-orange-800',
      bgClass: 'bg-orange-50/50 dark:bg-orange-950/20',
      borderClass: 'border-orange-300 dark:border-orange-700',
      description: 'Concept gaps detected. Systematic revision and mock drills recommended.'
    };
  }
  // Below 40% → Weak 🔴
  return {
    status: 'weak',
    label: 'Weak',
    badgeEmoji: '🔴',
    color: '#ef4444',
    badgeClass: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    bgClass: 'bg-rose-50/50 dark:bg-rose-950/20',
    borderClass: 'border-rose-300 dark:border-rose-700',
    description: 'Requires immediate attention. Focus on basic fundamentals and concept clarity.'
  };
}

export function getInsufficientDataStatus(): PerformanceStatusInfo {
  return {
    status: 'insufficient_data',
    label: 'Insufficient Data',
    badgeEmoji: '⚪',
    color: '#64748b',
    badgeClass: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
    bgClass: 'bg-slate-50 dark:bg-slate-900/30',
    borderClass: 'border-slate-200 dark:border-slate-700',
    description: 'Attempt at least 3 questions in this topic for an accurate performance diagnosis.'
  };
}

// ----------------------------------------------------
// 2. CORE DETERMINISTIC ANALYTICS CALCULATION ENGINE
// ----------------------------------------------------
export class AnalyticsEngine {
  /**
   * Computes complete personalized analytics combining questions, answers and attempt data.
   * Does NOT make external AI calls; uses pure robust deterministic aggregation.
   */
  public static calculate(
    attempt: Attempt,
    questions: Question[],
    test?: Test | null,
    previousAttempts: Attempt[] = []
  ): PersonalizedStudentAnalytics {
    // 1. Index questions by ID
    const questionMap = new Map<string, Question>();
    questions.forEach((q) => questionMap.set(q.id, q));

    // 2. Index responses
    const responseMap = new Map<string, { status: 'correct' | 'wrong' | 'unattempted'; marks: number; selected?: string | null }>();
    if (Array.isArray(attempt.responses)) {
      attempt.responses.forEach((r) => {
        responseMap.set(r.question_id, {
          status: r.status,
          marks: r.marks_awarded || 0,
          selected: r.user_answer
        });
      });
    }

    // 3. Overall Counters & Accuracy
    let totalQuestionsCount = questions.length || attempt.total_questions || 0;
    let attemptedCount = 0;
    let correctCount = 0;
    let wrongCount = 0;
    let skippedCount = 0;
    let totalMarksSum = 0;
    let scoreSum = 0;

    // Subject -> Chapter -> Topic aggregators
    interface TopicAccumulator {
      subject: string;
      chapter: string;
      topic: string;
      total: number;
      attempted: number;
      correct: number;
      incorrect: number;
      skipped: number;
      marksObtained: number;
      maxMarks: number;
    }

    interface ChapterAccumulator {
      subject: string;
      chapter: string;
      total: number;
      attempted: number;
      correct: number;
      incorrect: number;
      skipped: number;
      marksObtained: number;
      maxMarks: number;
      topics: Map<string, TopicAccumulator>;
    }

    interface SubjectAccumulator {
      subject: string;
      total: number;
      attempted: number;
      correct: number;
      incorrect: number;
      skipped: number;
      marksObtained: number;
      maxMarks: number;
      chapters: Map<string, ChapterAccumulator>;
    }

    const subjectMap = new Map<string, SubjectAccumulator>();

    // Difficulty aggregator
    const difficultyMap = new Map<string, { total: number; attempted: number; correct: number; incorrect: number; skipped: number }>();
    ['Easy', 'Moderate', 'Hard'].forEach((d) => {
      difficultyMap.set(d, { total: 0, attempted: 0, correct: 0, incorrect: 0, skipped: 0 });
    });

    questions.forEach((q) => {
      const qMarks = Number(q.marks) || 1.0;
      totalMarksSum += qMarks;

      const resp = responseMap.get(q.id);
      const isAttempted = resp && resp.status !== 'unattempted' && resp.selected && resp.selected.trim() !== '';
      const isCorrect = resp ? resp.status === 'correct' : false;
      const isWrong = resp ? resp.status === 'wrong' : false;
      const marksAwarded = resp ? resp.marks : 0;

      if (isAttempted) {
        attemptedCount++;
        scoreSum += marksAwarded;
        if (isCorrect) {
          correctCount++;
        } else if (isWrong) {
          wrongCount++;
        }
      } else {
        skippedCount++;
      }

      // Normalize Subject, Chapter, Topic
      const subjectName = (q.subject || 'General Studies').trim();
      const chapterName = (q.chapter || 'General Chapter').trim();
      const topicName = (q.topic || q.chapter || 'Core Concepts').trim();

      // Normalize Difficulty
      let diffKey: 'Easy' | 'Moderate' | 'Hard' = 'Moderate';
      const rawDiff = (q.difficulty || '').toLowerCase().trim();
      if (rawDiff.includes('easy')) {
        diffKey = 'Easy';
      } else if (rawDiff.includes('hard') || rawDiff.includes('difficult')) {
        diffKey = 'Hard';
      } else {
        diffKey = 'Moderate';
      }

      // Accumulate Difficulty
      const diffStat = difficultyMap.get(diffKey)!;
      diffStat.total++;
      if (isAttempted) {
        diffStat.attempted++;
        if (isCorrect) diffStat.correct++;
        if (isWrong) diffStat.incorrect++;
      } else {
        diffStat.skipped++;
      }

      // Accumulate Subject
      if (!subjectMap.has(subjectName)) {
        subjectMap.set(subjectName, {
          subject: subjectName,
          total: 0,
          attempted: 0,
          correct: 0,
          incorrect: 0,
          skipped: 0,
          marksObtained: 0,
          maxMarks: 0,
          chapters: new Map()
        });
      }
      const subAcc = subjectMap.get(subjectName)!;
      subAcc.total++;
      subAcc.maxMarks += qMarks;
      if (isAttempted) {
        subAcc.attempted++;
        subAcc.marksObtained += marksAwarded;
        if (isCorrect) subAcc.correct++;
        if (isWrong) subAcc.incorrect++;
      } else {
        subAcc.skipped++;
      }

      // Accumulate Chapter
      if (!subAcc.chapters.has(chapterName)) {
        subAcc.chapters.set(chapterName, {
          subject: subjectName,
          chapter: chapterName,
          total: 0,
          attempted: 0,
          correct: 0,
          incorrect: 0,
          skipped: 0,
          marksObtained: 0,
          maxMarks: 0,
          topics: new Map()
        });
      }
      const chapAcc = subAcc.chapters.get(chapterName)!;
      chapAcc.total++;
      chapAcc.maxMarks += qMarks;
      if (isAttempted) {
        chapAcc.attempted++;
        chapAcc.marksObtained += marksAwarded;
        if (isCorrect) chapAcc.correct++;
        if (isWrong) chapAcc.incorrect++;
      } else {
        chapAcc.skipped++;
      }

      // Accumulate Topic
      if (!chapAcc.topics.has(topicName)) {
        chapAcc.topics.set(topicName, {
          subject: subjectName,
          chapter: chapterName,
          topic: topicName,
          total: 0,
          attempted: 0,
          correct: 0,
          incorrect: 0,
          skipped: 0,
          marksObtained: 0,
          maxMarks: 0
        });
      }
      const topAcc = chapAcc.topics.get(topicName)!;
      topAcc.total++;
      topAcc.maxMarks += qMarks;
      if (isAttempted) {
        topAcc.attempted++;
        topAcc.marksObtained += marksAwarded;
        if (isCorrect) topAcc.correct++;
        if (isWrong) topAcc.incorrect++;
      } else {
        topAcc.skipped++;
      }
    });

    // Handle fallback if attempt record had pre-calculated numbers
    if (attempt.correct_answers !== undefined && attempt.correct_answers > 0 && correctCount === 0) {
      correctCount = attempt.correct_answers;
      wrongCount = attempt.wrong_answers || 0;
      skippedCount = attempt.skipped_questions || 0;
      attemptedCount = attempt.attempted_questions || (correctCount + wrongCount);
      scoreSum = attempt.score || 0;
    }

    const overallScore = attempt.score !== undefined ? attempt.score : Math.max(0, scoreSum);
    const overallMaxMarks = test?.total_marks || totalMarksSum || (totalQuestionsCount * 1.0);
    const percentage = overallMaxMarks > 0 ? Number(((overallScore / overallMaxMarks) * 100).toFixed(2)) : 0;
    
    // Overall Accuracy is based on attempted questions (standard testing metric)
    const overallAccuracy = attemptedCount > 0 
      ? Math.round((correctCount / attemptedCount) * 100) 
      : (percentage > 0 ? Math.round(percentage) : 0);

    const overallStatus = getPerformanceStatus(overallAccuracy);

    // 4. Build Structured Subject & Chapter & Topic Models
    const allTopicsList: TopicPerformance[] = [];
    const allChaptersList: ChapterPerformance[] = [];

    const subjects: SubjectPerformance[] = Array.from(subjectMap.values()).map((sub) => {
      const subAccuracy = sub.attempted > 0 ? Math.round((sub.correct / sub.attempted) * 100) : 0;
      const subStatus = getPerformanceStatus(subAccuracy);

      const chapters: ChapterPerformance[] = Array.from(sub.chapters.values()).map((chap) => {
        const chapAccuracy = chap.attempted > 0 ? Math.round((chap.correct / chap.attempted) * 100) : 0;
        const chapStatus = getPerformanceStatus(chapAccuracy);

        const topics: TopicPerformance[] = Array.from(chap.topics.values()).map((top) => {
          const topAccuracy = top.attempted > 0 ? Math.round((top.correct / top.attempted) * 100) : 0;
          // STRICT RULE: Minimum 3 attempted questions for reliable topic classification
          const hasSufficientData = top.attempted >= 3;
          const topStatus = hasSufficientData ? getPerformanceStatus(topAccuracy) : getInsufficientDataStatus();

          const topicPerf: TopicPerformance = {
            subject: top.subject,
            chapter: top.chapter,
            topic: top.topic,
            total_questions: top.total,
            attempted: top.attempted,
            correct: top.correct,
            incorrect: top.incorrect,
            skipped: top.skipped,
            accuracy: topAccuracy,
            has_sufficient_data: hasSufficientData,
            status: topStatus
          };
          allTopicsList.push(topicPerf);
          return topicPerf;
        });

        const chapPerf: ChapterPerformance = {
          subject: chap.subject,
          chapter: chap.chapter,
          total_questions: chap.total,
          attempted: chap.attempted,
          correct: chap.correct,
          incorrect: chap.incorrect,
          skipped: chap.skipped,
          accuracy: chapAccuracy,
          status: chapStatus,
          topics
        };
        allChaptersList.push(chapPerf);
        return chapPerf;
      });

      // Estimated time for subject proportional to question weight
      const totalTestSeconds = attempt.time_taken_seconds || (test?.duration_minutes ? test.duration_minutes * 60 : 0);
      const subTime = totalQuestionsCount > 0 ? Math.round((sub.total / totalQuestionsCount) * totalTestSeconds) : 0;
      const avgTimePerQ = sub.attempted > 0 ? Math.round(subTime / sub.attempted) : 0;

      return {
        subject: sub.subject,
        total_questions: sub.total,
        attempted: sub.attempted,
        correct: sub.correct,
        incorrect: sub.incorrect,
        skipped: sub.skipped,
        accuracy: subAccuracy,
        score: Number(sub.marksObtained.toFixed(2)),
        max_marks: Number(sub.maxMarks.toFixed(2)),
        status: subStatus,
        avg_time_per_question: avgTimePerQ,
        chapters
      };
    });

    // 5. Weakest Areas (Top 5)
    // Priority: Low accuracy, high attempts, high incorrect count
    // Topic-level if sufficient data (>= 3), or chapter-level (>= 2) if topics sparse
    const validTopicsWithData = allTopicsList.filter((t) => t.has_sufficient_data && t.attempted > 0);
    const candidateWeakAreas: WeakAreaItem[] = [];

    if (validTopicsWithData.length >= 3) {
      validTopicsWithData.forEach((t) => {
        if (t.accuracy < 75) {
          candidateWeakAreas.push({
            id: `topic-${t.subject}-${t.chapter}-${t.topic}`,
            subject: t.subject,
            chapter: t.chapter,
            topic: t.topic,
            accuracy: t.accuracy,
            attempted: t.attempted,
            incorrect: t.incorrect,
            total_questions: t.total_questions,
            status: t.status,
            level: 'topic'
          });
        }
      });
    }

    // If not enough topic candidates, supplement with Chapter-level data
    if (candidateWeakAreas.length < 5) {
      allChaptersList.forEach((c) => {
        if (c.attempted >= 2 && c.accuracy < 75) {
          // Avoid duplicate subject/chapter
          const exists = candidateWeakAreas.some((w) => w.subject === c.subject && w.chapter === c.chapter);
          if (!exists) {
            candidateWeakAreas.push({
              id: `chap-${c.subject}-${c.chapter}`,
              subject: c.subject,
              chapter: c.chapter,
              topic: c.chapter,
              accuracy: c.accuracy,
              attempted: c.attempted,
              incorrect: c.incorrect,
              total_questions: c.total_questions,
              status: c.status,
              level: 'chapter'
            });
          }
        }
      });
    }

    // Sort weakest areas: Lowest accuracy first, then most incorrect answers, then highest attempted
    candidateWeakAreas.sort((a, b) => {
      if (a.accuracy !== b.accuracy) return a.accuracy - b.accuracy;
      if (a.incorrect !== b.incorrect) return b.incorrect - a.incorrect;
      return b.attempted - a.attempted;
    });
    const weakest_areas = candidateWeakAreas.slice(0, 5);

    // 6. Strongest Areas (Top 5)
    // Priority: High accuracy (>= 70%), high attempts, high correct count
    const candidateStrongAreas: StrongAreaItem[] = [];
    if (validTopicsWithData.length >= 3) {
      validTopicsWithData.forEach((t) => {
        if (t.accuracy >= 60) {
          candidateStrongAreas.push({
            id: `top-strong-${t.subject}-${t.chapter}-${t.topic}`,
            subject: t.subject,
            chapter: t.chapter,
            topic: t.topic,
            accuracy: t.accuracy,
            attempted: t.attempted,
            correct: t.correct,
            total_questions: t.total_questions,
            status: t.status,
            level: 'topic'
          });
        }
      });
    }

    if (candidateStrongAreas.length < 5) {
      allChaptersList.forEach((c) => {
        if (c.attempted >= 2 && c.accuracy >= 60) {
          const exists = candidateStrongAreas.some((s) => s.subject === c.subject && s.chapter === c.chapter);
          if (!exists) {
            candidateStrongAreas.push({
              id: `chap-strong-${c.subject}-${c.chapter}`,
              subject: c.subject,
              chapter: c.chapter,
              topic: c.chapter,
              accuracy: c.accuracy,
              attempted: c.attempted,
              correct: c.correct,
              total_questions: c.total_questions,
              status: c.status,
              level: 'chapter'
            });
          }
        }
      });
    }

    candidateStrongAreas.sort((a, b) => {
      if (a.accuracy !== b.accuracy) return b.accuracy - a.accuracy;
      if (a.attempted !== b.attempted) return b.attempted - a.attempted;
      return b.correct - a.correct;
    });
    const strongest_areas = candidateStrongAreas.slice(0, 5);

    // 7. Difficulty Breakdown
    const difficulty_breakdown: DifficultyPerformance[] = (['Easy', 'Moderate', 'Hard'] as const).map((diff) => {
      const stat = difficultyMap.get(diff)!;
      const acc = stat.attempted > 0 ? Math.round((stat.correct / stat.attempted) * 100) : 0;
      const st = getPerformanceStatus(acc);

      let recommendation = '';
      if (diff === 'Easy') {
        recommendation = acc >= 80 
          ? 'Exceptional foundation in basic concepts and straightforward definitions.'
          : 'Focus on basic fundamentals; easy questions should aim for near 100% accuracy.';
      } else if (diff === 'Moderate') {
        recommendation = acc >= 70
          ? 'Strong standard exam-level problem-solving ability.'
          : 'Standard exam problems need more targeted practice to eliminate avoidable errors.';
      } else {
        recommendation = acc >= 60
          ? 'Outstanding high-order thinking and complex problem mastery.'
          : 'Practice multi-step analytical questions to secure high top-tier ranks.';
      }

      return {
        difficulty: diff,
        total_questions: stat.total,
        attempted: stat.attempted,
        correct: stat.correct,
        incorrect: stat.incorrect,
        skipped: stat.skipped,
        accuracy: acc,
        status: st,
        recommendation
      };
    });

    // 8. Speed & Time Analysis
    const totalTimeSec = attempt.time_taken_seconds || 0;
    const avgTimePerQSec = attemptedCount > 0 ? Math.round(totalTimeSec / attemptedCount) : (totalQuestionsCount > 0 ? Math.round(totalTimeSec / totalQuestionsCount) : 0);
    const idealTimePerQSec = test?.duration_minutes && totalQuestionsCount > 0 
      ? Math.round((test.duration_minutes * 60) / totalQuestionsCount) 
      : 54; // default ~54s for competitive tests

    let paceStatus: 'optimal' | 'fast' | 'slow' = 'optimal';
    if (avgTimePerQSec > idealTimePerQSec * 1.25) paceStatus = 'slow';
    else if (avgTimePerQSec < idealTimePerQSec * 0.5 && overallAccuracy < 70) paceStatus = 'fast';

    const subjectSpeedItems: SpeedAnalysisSubjectItem[] = subjects.map((s) => {
      const avgSec = s.avg_time_per_question || avgTimePerQSec;
      let pace: 'fast' | 'moderate' | 'slow' = 'moderate';
      if (avgSec < idealTimePerQSec * 0.75) pace = 'fast';
      else if (avgSec > idealTimePerQSec * 1.25) pace = 'slow';

      let insight = '';
      if (s.accuracy >= 80 && pace === 'fast') {
        insight = 'High accuracy with rapid solving speed — mastery level.';
      } else if (s.accuracy < 50 && pace === 'slow') {
        insight = `${s.subject} accuracy is low and average solving time is high — requires concept revision.`;
      } else if (s.accuracy < 50 && pace === 'fast') {
        insight = 'Rushing through questions with high error rate — avoid hurried guesses.';
      } else {
        insight = `Consistent pace with ${s.accuracy}% accuracy.`;
      }

      return {
        subject: s.subject,
        avg_time_seconds: avgSec,
        accuracy: s.accuracy,
        insight,
        pace
      };
    });

    const speedInsights: string[] = [];
    if (avgTimePerQSec > 0) {
      speedInsights.push(`Average time per question was ${avgTimePerQSec} seconds (Target: ~${idealTimePerQSec}s).`);
    }
    if (paceStatus === 'fast' && overallAccuracy < 65) {
      speedInsights.push('You completed questions very quickly, which caused unforced errors. Slow down slightly and read options attentively.');
    } else if (paceStatus === 'slow') {
      speedInsights.push('Time spent per question is on the higher side. Focus on shortcut techniques and mental math to boost speed.');
    } else if (overallAccuracy >= 80) {
      speedInsights.push('Balanced time distribution with high accuracy across sections.');
    }

    // 9. Cross-Test Progress Tracking
    const completedHistory = previousAttempts.filter((a) => a.status === 'completed' && a.id !== attempt.id);
    let crossProgress: CrossTestProgress;

    if (completedHistory.length > 0) {
      const prevAccuracies = completedHistory.map((a) => {
        const attCount = a.attempted_questions || ((a.correct_answers || 0) + (a.wrong_answers || 0));
        return attCount > 0 ? Math.round(((a.correct_answers || 0) / attCount) * 100) : (a.percentage || 0);
      });
      const prevAvgAcc = Math.round(prevAccuracies.reduce((sum, v) => sum + v, 0) / prevAccuracies.length);
      const delta = Number((overallAccuracy - prevAvgAcc).toFixed(1));
      const isImproved = delta >= 0;

      let msg = '';
      if (delta > 0) {
        msg = `Your accuracy improved by +${delta}% compared to your previous tests average (${prevAvgAcc}% → ${overallAccuracy}%). Outstanding growth!`;
      } else if (delta === 0) {
        msg = `Your performance is steady at ${overallAccuracy}% accuracy across your test attempts.`;
      } else {
        msg = `Accuracy changed by ${delta}% from your previous test average (${prevAvgAcc}%). Review weak chapters to bounce back.`;
      }

      const recentAttemptsList: RecentAttemptHistoryItem[] = [
        ...completedHistory.map((a: any) => {
          const attCount = a.attempted_questions || ((a.correct_answers || 0) + (a.wrong_answers || 0));
          const acc = attCount > 0 ? Math.round(((a.correct_answers || 0) / attCount) * 100) : (a.percentage || 0);
          return {
            id: a.id,
            test_id: a.test_id,
            test_title: a.test_title || 'Previous Mock Test',
            date: a.submitted_at ? new Date(a.submitted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Earlier',
            score: a.score || 0,
            total_marks: a.max_marks || (a.total_questions || 10),
            percentage: a.percentage || 0,
            accuracy: acc,
            time_taken_seconds: a.time_taken_seconds || 0,
            status: getPerformanceStatus(acc)
          };
        }),
        {
          id: attempt.id,
          test_id: attempt.test_id,
          test_title: test?.title || 'Current Test',
          date: 'Current Attempt',
          score: overallScore,
          total_marks: overallMaxMarks,
          percentage,
          accuracy: overallAccuracy,
          time_taken_seconds: totalTimeSec,
          status: overallStatus
        }
      ].slice(-5); // keep latest 5

      crossProgress = {
        has_history: true,
        total_completed_tests: completedHistory.length + 1,
        previous_avg_accuracy: prevAvgAcc,
        current_accuracy: overallAccuracy,
        improvement_delta: delta,
        is_improved: isImproved,
        message: msg,
        recent_attempts: recentAttemptsList
      };
    } else {
      crossProgress = {
        has_history: false,
        total_completed_tests: 1,
        previous_avg_accuracy: overallAccuracy,
        current_accuracy: overallAccuracy,
        improvement_delta: 0,
        is_improved: true,
        message: 'This is your benchmark test! Take more mock tests to track your learning curve and accuracy trends over time.',
        recent_attempts: [
          {
            id: attempt.id,
            test_id: attempt.test_id,
            test_title: test?.title || 'Current Test',
            date: 'Current Attempt',
            score: overallScore,
            total_marks: overallMaxMarks,
            percentage,
            accuracy: overallAccuracy,
            time_taken_seconds: totalTimeSec,
            status: overallStatus
          }
        ]
      };
    }

    return {
      attempt_id: attempt.id,
      test_id: attempt.test_id,
      student_name: attempt.student_name || 'Student',
      overall_score: overallScore,
      total_marks: overallMaxMarks,
      percentage,
      overall_accuracy: overallAccuracy,
      correct_answers: correctCount,
      wrong_answers: wrongCount,
      skipped_questions: skippedCount,
      total_questions: totalQuestionsCount,
      attempted_questions: attemptedCount,
      time_taken_seconds: totalTimeSec,
      overall_status: overallStatus,
      subjects,
      weakest_areas,
      strongest_areas,
      difficulty_breakdown,
      speed_analysis: {
        total_time_seconds: totalTimeSec,
        avg_time_per_question_seconds: avgTimePerQSec,
        ideal_time_per_question_seconds: idealTimePerQSec,
        pace_status: paceStatus,
        subject_times: subjectSpeedItems,
        insights: speedInsights
      },
      progress: crossProgress
    };
  }
}

// ----------------------------------------------------
// 3. ASYNC SERVICE WRAPPER FOR INTEGRATION
// ----------------------------------------------------
export const analyticsService = {
  /**
   * Main service function to generate complete analytics for an attempt
   */
  async getStudentAttemptAnalytics(
    attempt: Attempt,
    test?: Test | null,
    questions?: Question[]
  ): Promise<PersonalizedStudentAnalytics> {
    // 1. Fetch test if missing
    let targetTest = test;
    if (!targetTest && attempt.test_id) {
      targetTest = await dataService.getTestById(attempt.test_id);
    }

    // 2. Fetch full questions with metadata if missing
    let targetQuestions = questions;
    if (!targetQuestions || targetQuestions.length === 0) {
      targetQuestions = await dataService.getQuestions(attempt.test_id, true);
    }

    // 3. Fetch student previous attempts for progress tracking
    let previousAttempts: Attempt[] = [];
    try {
      if (attempt.student_mobile) {
        // Query attempts across tests for the same student
        const allAttempts = await dataService.getAttempts();
        previousAttempts = allAttempts.filter(
          (a) => a.student_mobile === attempt.student_mobile && a.status === 'completed'
        );
      }
    } catch (e) {
      console.warn('Could not load student attempt history:', e);
    }

    return AnalyticsEngine.calculate(attempt, targetQuestions || [], targetTest, previousAttempts);
  }
};
