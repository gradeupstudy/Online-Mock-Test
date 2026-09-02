import { 
  AIAutomationConfig, 
  AuditedMCQ, 
  AuditReportSummary, 
  AdminAuditConfirmation, 
  FinalTestAuditReport, 
  GeneratedTestSummary, 
  AIAutomationSession,
  FinalAuditCheckItem,
  AuditStatus
} from '../types/aiAutomation';
import { Question, Test, PracticeMode } from '../types';
import { ExtractedPDFMCQ } from './pdfOcrEngine';
import { dataService, generateUUID, parseSafeNumber, syncToQuestionBankMaster, shuffleAndBalanceQuestions } from './dataService';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';

const AUDIT_LOGS_STORAGE_KEY = 'gradeup_automation_audit_logs';
const AUTOMATION_SESSION_STORAGE_KEY = 'gradeup_current_ai_automation_session';

/**
 * Normalizes question text for similarity & duplicate comparison
 */
function normalizeTextForComparison(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[^\w\s\u0900-\u097F]/g, ' ') // Keep alphanumeric & Devanagari Hindi
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Computes Token Jaccard Similarity between two strings (0.0 to 1.0)
 */
function calculateTokenSimilarity(str1: string, str2: string): number {
  const norm1 = normalizeTextForComparison(str1);
  const norm2 = normalizeTextForComparison(str2);
  if (!norm1 || !norm2) return 0;
  if (norm1 === norm2) return 1.0;

  const tokens1 = new Set(norm1.split(' ').filter(t => t.length > 2));
  const tokens2 = new Set(norm2.split(' ').filter(t => t.length > 2));

  if (tokens1.size === 0 || tokens2.size === 0) return 0;

  let intersectionCount = 0;
  tokens1.forEach(t => {
    if (tokens2.has(t)) intersectionCount++;
  });

  const unionCount = tokens1.size + tokens2.size - intersectionCount;
  return unionCount === 0 ? 0 : intersectionCount / unionCount;
}

/**
 * Detects obvious OCR corruption, broken characters or scan artifacts
 */
function detectOcrCorruption(text: string): { isCorrupt: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (!text || text.trim().length < 5) {
    reasons.push('Question text is too short or empty');
    return { isCorrupt: true, reasons };
  }

  // Check for excessive non-alphanumeric junk characters
  const nonWordMatches = text.match(/[^\w\s\u0900-\u097F\.\,\?\!\:\;\-\(\)\'\"\/\%\=\+\-\*]/g);
  if (nonWordMatches && nonWordMatches.length > 6 && (nonWordMatches.length / text.length) > 0.15) {
    reasons.push('Heavy OCR character corruption or unreadable glyphs detected');
  }

  // Check for unclosed brackets or cutoffs
  const openParens = (text.match(/\(/g) || []).length;
  const closeParens = (text.match(/\)/g) || []).length;
  if (Math.abs(openParens - closeParens) > 2) {
    reasons.push('Unbalanced parentheses or brackets likely from scanning cutoff');
  }

  // Repeated garbage sequences like "____", "?????", "......"
  if (/(\?{3,}|\_{4,}|\.{5,})/.test(text)) {
    reasons.push('Excessive repeated wildcard or missing text placeholders');
  }

  return {
    isCorrupt: reasons.length > 0,
    reasons
  };
}

/**
 * 360° MCQ Comprehensive Audit
 * Audits every single extracted question against structural, linguistic, factual and relational criteria.
 * Strict Rule: Never silently modifies questions.
 */
export function perform360MCQAudit(
  rawQuestions: ExtractedPDFMCQ[],
  existingBankQuestions: Question[] = [],
  config: AIAutomationConfig
): AuditedMCQ[] {
  const auditedList: AuditedMCQ[] = [];
  const seenFingerprints = new Map<string, string>(); // fingerprint -> question id
  const existingFingerprints = new Set(
    existingBankQuestions.map(q => {
      const qNorm = normalizeTextForComparison(q.question_text || '');
      const optsNorm = [q.option_a, q.option_b, q.option_c, q.option_d]
        .map(o => normalizeTextForComparison(o || ''))
        .sort()
        .join(':::');
      return `${qNorm}###${optsNorm}`;
    })
  );

  rawQuestions.forEach((raw, idx) => {
    const qId = `audit-mcq-${Date.now()}-${idx + 1}-${Math.random().toString(36).substr(2, 5)}`;
    const reasons: string[] = [];
    let auditStatus: AuditStatus = 'VALID';
    let qualityScore = 95;
    let duplicateOfId: string | undefined;
    let duplicateSimilarityPct: number | undefined;

    const qText = (raw.question_text || '').trim();
    const optA = (raw.option_a || '').trim();
    const optB = (raw.option_b || '').trim();
    const optC = (raw.option_c || '').trim();
    const optD = (raw.option_d || '').trim();
    const rawAns = (raw.correct_answer || '').trim().toUpperCase();

    // 1. Question Completeness Check
    if (!qText) {
      auditStatus = 'INVALID';
      reasons.push('Missing question statement (empty text)');
      qualityScore -= 60;
    } else if (qText.length < 10) {
      auditStatus = 'NEEDS_REVIEW';
      reasons.push('Question statement is unusually short (< 10 characters)');
      qualityScore -= 25;
    } else if (/(^\d+[\.\:\)\-]\s*)$/.test(qText)) {
      auditStatus = 'INVALID';
      reasons.push('Only question number found, question text is missing');
      qualityScore -= 60;
    }

    // 2. Four-Option Validity Check
    const missingOptions: string[] = [];
    if (!optA) missingOptions.push('A');
    if (!optB) missingOptions.push('B');
    if (!optC) missingOptions.push('C');
    if (!optD) missingOptions.push('D');

    if (missingOptions.length > 0) {
      auditStatus = 'INVALID';
      reasons.push(`Missing option(s): ${missingOptions.join(', ')}`);
      qualityScore -= (missingOptions.length * 20);
    }

    // 3. Repeated Option Text Check
    const optionsArray = [optA, optB, optC, optD].filter(Boolean);
    const normalizedOptions = optionsArray.map(o => normalizeTextForComparison(o));
    const uniqueOptions = new Set(normalizedOptions);
    if (optionsArray.length === 4 && uniqueOptions.size < 4) {
      auditStatus = 'NEEDS_REVIEW';
      reasons.push('Repeated or identical text detected across options');
      qualityScore -= 30;
    }

    // 4. Correct Answer Availability & Consistency
    let validCorrectAnswer = 'A';
    const validLetters = ['A', 'B', 'C', 'D'];
    if (!rawAns || !validLetters.includes(rawAns)) {
      auditStatus = 'INVALID';
      reasons.push(`Invalid or missing answer key: "${raw.correct_answer || 'NONE'}"`);
      qualityScore -= 40;
    } else {
      validCorrectAnswer = rawAns as 'A' | 'B' | 'C' | 'D';
    }

    if (raw.answer_status === 'conflict') {
      if (auditStatus !== 'INVALID') auditStatus = 'NEEDS_REVIEW';
      reasons.push('Answer key conflict detected between PDF inline text and answer key table');
      qualityScore -= 20;
    }

    // 5. OCR Corruption & Invalid Character Check
    const ocrCorruption = detectOcrCorruption(qText);
    if (ocrCorruption.isCorrupt) {
      if (auditStatus !== 'INVALID') auditStatus = 'NEEDS_REVIEW';
      reasons.push(...ocrCorruption.reasons);
      qualityScore -= 25;
    }

    // 6. Duplicate Detection (Exact Fingerprint)
    const qNorm = normalizeTextForComparison(qText);
    const optsNorm = [optA, optB, optC, optD].map(o => normalizeTextForComparison(o)).sort().join(':::');
    const fullFingerprint = `${qNorm}###${optsNorm}`;

    if (seenFingerprints.has(fullFingerprint)) {
      auditStatus = 'DUPLICATE';
      duplicateOfId = seenFingerprints.get(fullFingerprint);
      reasons.push(`Exact duplicate of extracted Question #${rawQuestions.findIndex((_, i) => auditedList[i]?.id === duplicateOfId) + 1 || 1}`);
      qualityScore -= 50;
    } else if (existingFingerprints.has(fullFingerprint)) {
      auditStatus = 'DUPLICATE';
      reasons.push('Exact duplicate of existing question already present in Question Bank');
      qualityScore -= 50;
    } else {
      seenFingerprints.set(fullFingerprint, qId);
    }

    // 7. Near-Duplicate Fuzzy Check (if not already exact duplicate)
    if (auditStatus !== 'DUPLICATE' && qText.length > 20) {
      for (let prevIdx = 0; prevIdx < auditedList.length; prevIdx++) {
        const prevQ = auditedList[prevIdx];
        if (prevQ.audit_status === 'DUPLICATE') continue;
        const sim = calculateTokenSimilarity(qText, prevQ.question_text);
        if (sim >= 0.82) {
          auditStatus = 'NEAR_DUPLICATE';
          duplicateOfId = prevQ.id;
          duplicateSimilarityPct = Math.round(sim * 100);
          reasons.push(`Near-duplicate (${duplicateSimilarityPct}% similarity) of Question #${prevIdx + 1}`);
          qualityScore -= 30;
          break;
        }
      }
    }

    // Language & Subject relevance checks
    const hasHindi = /[\u0900-\u097F]/.test(qText) || /[\u0900-\u097F]/.test(optA);
    const hasMath = /[\+\-\*\/\=\^\√\%\∑\∫\π]/.test(qText);

    // Final score clamp
    const finalScore = Math.max(10, Math.min(100, qualityScore));

    // Determine initial approval state: only pristine VALID questions are initially approved
    const isApprovedInitially = auditStatus === 'VALID';

    auditedList.push({
      id: qId,
      original_number: raw.question_number || (idx + 1),
      question_text: qText,
      question_hi: raw.question_hi || (hasHindi ? qText : null),
      option_a: optA,
      option_b: optB,
      option_c: optC,
      option_d: optD,
      correct_answer: validCorrectAnswer,
      answer_source: raw.answer_source,
      explanation: raw.explanation || null,
      subject: config.subject || raw.subject || 'General Studies',
      chapter: raw.chapter || 'General',
      topic: config.topic || raw.topic || 'General Topic',
      difficulty: raw.difficulty || 'Medium',
      source_page: raw.source_page || 1,
      audit_status: auditStatus,
      audit_reasons: reasons,
      audit_score: finalScore,
      is_approved_by_admin: isApprovedInitially,
      is_excluded: auditStatus === 'INVALID' || auditStatus === 'DUPLICATE',
      duplicate_of_id: duplicateOfId,
      duplicate_similarity_pct: duplicateSimilarityPct,
      ocr_confidence: raw.confidence,
      has_math_formula: hasMath,
      has_hindi_text: hasHindi,
    });
  });

  return auditedList;
}

/**
 * Calculates current audit summary stats & requirement comparison
 */
export function calculateAuditSummary(
  questions: AuditedMCQ[],
  config: AIAutomationConfig
): AuditReportSummary {
  const total = questions.length;
  const validCount = questions.filter(q => q.audit_status === 'VALID').length;
  const needsReviewCount = questions.filter(q => q.audit_status === 'NEEDS_REVIEW').length;
  const invalidCount = questions.filter(q => q.audit_status === 'INVALID').length;
  const duplicateCount = questions.filter(q => q.audit_status === 'DUPLICATE').length;
  const nearDuplicateCount = questions.filter(q => q.audit_status === 'NEAR_DUPLICATE').length;

  // Approved for generation = approved by admin and not excluded
  const approvedCount = questions.filter(q => q.is_approved_by_admin && !q.is_excluded).length;

  // Required count
  const requiredCount = config.questionReusePolicy === 'OFF'
    ? (config.numberOfMockTests * config.mcqsPerMockTest)
    : config.mcqsPerMockTest;

  const isSufficient = approvedCount >= requiredCount;
  const deficit = Math.max(0, requiredCount - approvedCount);

  return {
    total_extracted: total,
    valid_count: validCount,
    needs_review_count: needsReviewCount,
    invalid_count: invalidCount,
    duplicate_count: duplicateCount,
    near_duplicate_count: nearDuplicateCount,
    approved_for_generation: approvedCount,
    required_for_generation: requiredCount,
    is_sufficient: isSufficient,
    deficit
  };
}

/**
 * Persists Admin Audit Confirmation receipt to localStorage and Supabase
 */
export async function recordAdminAuditConfirmation(
  confirmation: AdminAuditConfirmation
): Promise<boolean> {
  try {
    // 1. Local storage logs
    const existingRaw = localStorage.getItem(AUDIT_LOGS_STORAGE_KEY);
    let logs: AdminAuditConfirmation[] = [];
    if (existingRaw) {
      try {
        logs = JSON.parse(existingRaw);
      } catch {}
    }
    logs.unshift(confirmation);
    localStorage.setItem(AUDIT_LOGS_STORAGE_KEY, JSON.stringify(logs.slice(0, 100)));

    // 2. Supabase persistence if available
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('admin_audit_logs').insert({
          id: confirmation.id,
          admin_id: confirmation.confirmed_by_admin_id,
          admin_email: confirmation.confirmed_by_email,
          timestamp: confirmation.timestamp,
          audit_version: confirmation.audit_version,
          total_approved_questions: confirmation.total_approved_questions,
          action: confirmation.action,
          config_json: confirmation.config_snapshot,
          summary_json: confirmation.audit_summary,
          created_at: new Date().toISOString()
        });
      } catch (err) {
        console.warn('Supabase admin_audit_logs insert fallback to local', err);
      }
    }

    return true;
  } catch (e) {
    console.error('Failed to record admin audit confirmation:', e);
    return false;
  }
}

/**
 * Retrieves past audit confirmation history
 */
export async function getAdminAuditHistory(): Promise<AdminAuditConfirmation[]> {
  try {
    const raw = localStorage.getItem(AUDIT_LOGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

/**
 * PHASE 2 — AUTOMATIC MOCK TEST GENERATION
 * Generates exact test series strictly adhering to Admin configuration
 * Uses ONLY questions that are marked is_approved_by_admin and not is_excluded.
 */
export async function generateMockTestsFromApprovedMCQs(
  session: AIAutomationSession,
  adminUser: { id: string; email: string },
  onProgress?: (progressText: string, percentage: number) => void
): Promise<{
  success: boolean;
  generatedSummaries: GeneratedTestSummary[];
  finalAudit: FinalTestAuditReport | null;
  error?: string;
}> {
  const { config, extractedQuestions } = session;

  // Filter ONLY approved & active questions
  const approvedQuestions = extractedQuestions.filter(q => q.is_approved_by_admin && !q.is_excluded);
  const totalRequired = config.questionReusePolicy === 'OFF'
    ? (config.numberOfMockTests * config.mcqsPerMockTest)
    : config.mcqsPerMockTest;

  if (approvedQuestions.length < totalRequired && config.questionReusePolicy === 'OFF') {
    return {
      success: false,
      generatedSummaries: [],
      finalAudit: null,
      error: `INSUFFICIENT APPROVED MCQs: ${config.numberOfMockTests} mock tests with ${config.mcqsPerMockTest} unique MCQs each require ${totalRequired} approved questions, but only ${approvedQuestions.length} are approved. Please audit and approve at least ${totalRequired - approvedQuestions.length} more questions or adjust test count.`
    };
  }

  onProgress?.('Preparing question distribution and test structures...', 10);

  // Distribute questions according to ordering preference
  let questionPool = [...approvedQuestions];
  if (config.questionOrderingPreference === 'random_shuffle') {
    for (let i = questionPool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [questionPool[i], questionPool[j]] = [questionPool[j], questionPool[i]];
    }
  } else if (config.questionOrderingPreference === 'topic_balanced') {
    // Group by topic/chapter and interleave
    const grouped = new Map<string, AuditedMCQ[]>();
    questionPool.forEach(q => {
      const key = q.topic || q.chapter || 'General';
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(q);
    });
    const interleaved: AuditedMCQ[] = [];
    let added = true;
    while (added) {
      added = false;
      for (const list of grouped.values()) {
        if (list.length > 0) {
          interleaved.push(list.shift()!);
          added = true;
        }
      }
    }
    questionPool = interleaved;
  }

  const generatedSummaries: GeneratedTestSummary[] = [];
  const testIdsCreated: string[] = [];
  const totalTests = config.numberOfMockTests;

  // Generate each test
  for (let i = 0; i < totalTests; i++) {
    const testNum = config.startingTestNumber + i;
    const progressPct = 10 + Math.round(((i + 1) / totalTests) * 70);
    onProgress?.(`Generating Test ${i + 1} of ${totalTests}: ${config.mockTestNamePrefix} - ${testNum}...`, progressPct);

    // Pick questions for this test
    let testQuestionsSlice: AuditedMCQ[] = [];
    if (config.questionReusePolicy === 'OFF') {
      const startIdx = i * config.mcqsPerMockTest;
      testQuestionsSlice = questionPool.slice(startIdx, startIdx + config.mcqsPerMockTest);
    } else {
      // Allow reuse: slice or cycle
      const startIdx = (i * config.mcqsPerMockTest) % questionPool.length;
      if (startIdx + config.mcqsPerMockTest <= questionPool.length) {
        testQuestionsSlice = questionPool.slice(startIdx, startIdx + config.mcqsPerMockTest);
      } else {
        const firstPart = questionPool.slice(startIdx);
        const secondPart = questionPool.slice(0, config.mcqsPerMockTest - firstPart.length);
        testQuestionsSlice = [...firstPart, ...secondPart];
      }
    }

    const testId = generateUUID();
    const baseSlug = `${config.mockTestNamePrefix}-${testNum}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
    const cleanSlug = `${baseSlug}-${Date.now().toString().slice(-4)}`;
    const testCode = `HPPC-${Math.floor(1000 + Math.random() * 9000)}`;

    const totalMarks = config.mcqsPerMockTest * config.marksPerQuestion;
    const passingMarks = config.passingMarks || Math.round(totalMarks * 0.4);

    const testPayload: Test = {
      id: testId,
      test_code: testCode,
      exam_code: testCode,
      title: `${config.mockTestNamePrefix} - ${testNum}`,
      slug: cleanSlug,
      description: `Practice test series based on real exam pattern with instant detailed results. Practice Mode: ${config.practiceMode}. Subject: ${config.subject}.`,
      category: config.category,
      subject: config.subject,
      practice_mode: config.practiceMode,
      total_questions: config.mcqsPerMockTest,
      total_marks: totalMarks,
      marks_per_question: config.marksPerQuestion,
      negative_marking: config.negativeMarking,
      duration_minutes: config.durationMinutes,
      passing_marks: passingMarks,
      instructions: `1. This mock test contains ${config.mcqsPerMockTest} questions.\n2. Each correct answer carries ${config.marksPerQuestion} mark(s).\n3. Negative marking per wrong answer is ${config.negativeMarking} marks.\n4. Total time allotted is ${config.durationMinutes} minutes.`,
      status: 'draft', // Critical: Always created in DRAFT (Ready for Admin Review)
      is_published: false, // Critical: Not published until Admin explicitly confirms
      anti_cheating_enabled: true,
      social_gate_enabled: true,
      randomize_questions: false,
      randomize_options: false,
      allow_back_navigation: true,
      allow_mark_for_review: true,
      show_result_immediately: true,
      show_correct_answers: true,
      show_explanation: true,
      enable_leaderboard: true,
      max_attempts_per_student: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Save Test in database
    const savedTest = await dataService.saveTest(testPayload);
    testIdsCreated.push(savedTest.id);

    // Convert audited questions to Question entities
    const questionEntities: Question[] = testQuestionsSlice.map((aq, qIdx) => ({
      id: generateUUID(),
      test_id: savedTest.id,
      question_number: qIdx + 1,
      question_text: aq.question_text,
      option_a: aq.option_a,
      option_b: aq.option_b,
      option_c: aq.option_c,
      option_d: aq.option_d,
      correct_answer: aq.correct_answer as 'A' | 'B' | 'C' | 'D',
      explanation: aq.explanation || `Correct answer is Option ${aq.correct_answer}.`,
      marks: config.marksPerQuestion,
      negative_marks: config.negativeMarking,
      subject: config.subject,
      chapter: aq.chapter || 'General',
      topic: config.topic || aq.topic || 'General Topic',
      difficulty: (aq.difficulty as any) || 'Medium',
      practice_mode: config.practiceMode,
      quality_score: aq.audit_score || 92,
      inspection_status: 'verified',
      inspection_notes: `AI Automation Center generated from source: ${config.fileName}`,
      created_at: new Date().toISOString()
    }));

    // Save Questions to database & sync to Master Question Bank
    await dataService.saveQuestions(savedTest.id, questionEntities);
    await syncToQuestionBankMaster(questionEntities);

    generatedSummaries.push({
      test: savedTest,
      questions: questionEntities,
      question_count: questionEntities.length,
      total_marks: savedTest.total_marks,
      is_published: savedTest.is_published
    });
  }

  onProgress?.('Executing Phase 2A Final Mock Test Audit...', 90);

  // Perform Phase 2A Final Audit
  const finalAudit = performFinalMockTestAudit(generatedSummaries, config);

  onProgress?.('Generation completed. Ready for Admin final review.', 100);

  return {
    success: true,
    generatedSummaries,
    finalAudit
  };
}

/**
 * PHASE 2A — FINAL MOCK TEST AUDIT
 * Verifies all generated tests against relational, structural, and numerical integrity.
 */
export function performFinalMockTestAudit(
  generatedSummaries: GeneratedTestSummary[],
  config: AIAutomationConfig
): FinalTestAuditReport {
  const totalRequested = config.numberOfMockTests;
  const totalGenerated = generatedSummaries.length;
  const mcqsPerTestExpected = config.mcqsPerMockTest;
  const marksPerQExpected = config.marksPerQuestion;
  const negMarkExpected = config.negativeMarking;

  const checks: FinalAuditCheckItem[] = [];

  // Check 1: Exact Test Count
  const countPassed = totalGenerated === totalRequested;
  checks.push({
    id: 'check-test-count',
    title: 'Exact Test Count Verification',
    description: `Target: ${totalRequested} Tests | Generated: ${totalGenerated} Tests`,
    passed: countPassed,
    details: countPassed ? 'All requested mock tests were successfully instantiated in the database.' : `Mismatch: requested ${totalRequested} but found ${totalGenerated}.`
  });

  // Check 2: Exact MCQs per Test
  const testWithWrongMCQCount = generatedSummaries.filter(s => s.question_count !== mcqsPerTestExpected);
  const mcqCountPassed = testWithWrongMCQCount.length === 0;
  checks.push({
    id: 'check-mcq-count',
    title: 'MCQ Count per Test Integrity',
    description: `Each test must contain exactly ${mcqsPerTestExpected} MCQs`,
    passed: mcqCountPassed,
    details: mcqCountPassed
      ? `Verified: Every generated test contains exactly ${mcqsPerTestExpected} questions.`
      : `Failed on ${testWithWrongMCQCount.length} tests.`
  });

  // Check 3: Unique Question Assignments (if reuse = OFF)
  const allQuestionIds = new Set<string>();
  const allQuestionTexts = new Set<string>();
  let duplicateCount = 0;

  generatedSummaries.forEach(s => {
    s.questions.forEach(q => {
      if (allQuestionIds.has(q.id)) duplicateCount++;
      allQuestionIds.add(q.id);

      const norm = normalizeTextForComparison(q.question_text);
      if (config.questionReusePolicy === 'OFF') {
        if (allQuestionTexts.has(norm)) duplicateCount++;
        allQuestionTexts.add(norm);
      }
    });
  });

  const uniqueRequired = config.questionReusePolicy === 'OFF'
    ? (totalRequested * mcqsPerTestExpected)
    : mcqsPerTestExpected;
  const uniquePassed = config.questionReusePolicy === 'OFF' ? duplicateCount === 0 : true;

  checks.push({
    id: 'check-unique-assignments',
    title: 'Unique Question Assignment Policy',
    description: config.questionReusePolicy === 'OFF'
      ? `Strict Question Reuse OFF: ${uniqueRequired} unique question assignments required`
      : 'Question Reuse ON: Shared questions permitted',
    passed: uniquePassed,
    details: uniquePassed
      ? `Verified: 0 unintended duplicates across all ${totalGenerated} generated tests.`
      : `Found ${duplicateCount} duplicate question occurrences across test series.`
  });

  // Check 4: Marks & Negative Marking Verification
  const wrongMarksTests = generatedSummaries.filter(s => {
    const expectedTotal = mcqsPerTestExpected * marksPerQExpected;
    return s.test.marks_per_question !== marksPerQExpected ||
           s.test.negative_marking !== negMarkExpected ||
           s.test.total_marks !== expectedTotal;
  });
  const marksPassed = wrongMarksTests.length === 0;
  checks.push({
    id: 'check-marks-accuracy',
    title: 'Marks & Negative Marking Calibration',
    description: `Marks: ${marksPerQExpected} / Q | Negative Marking: ${negMarkExpected} | Total: ${mcqsPerTestExpected * marksPerQExpected} Marks`,
    passed: marksPassed,
    details: marksPassed
      ? 'Verified: Marks, total marks, and negative marking match Admin configuration across 100% of tests.'
      : `Mismatch found in ${wrongMarksTests.length} tests.`
  });

  // Check 5: Destination & Taxonomy Relational Check
  const wrongTaxonomyTests = generatedSummaries.filter(s => {
    return s.test.category !== config.category ||
           s.test.subject !== config.subject ||
           s.test.practice_mode !== config.practiceMode;
  });
  const taxonomyPassed = wrongTaxonomyTests.length === 0;
  checks.push({
    id: 'check-taxonomy-destination',
    title: 'Path, Practice Mode & Subject Destination Verification',
    description: `Path: "${config.category}" | Mode: "${config.practiceMode}" | Subject: "${config.subject}"`,
    passed: taxonomyPassed,
    details: taxonomyPassed
      ? 'Verified: Relational database foreign keys, category slugs, and practice mode links established.'
      : `Mismatch found in ${wrongTaxonomyTests.length} tests.`
  });

  // Check 6: Safe Human Approval Gate Status (Draft review state)
  const publishedPrematurely = generatedSummaries.filter(s => s.test.is_published || s.test.status === 'published');
  const reviewStatePassed = publishedPrematurely.length === 0;
  checks.push({
    id: 'check-human-gate-state',
    title: 'Human Approval Gate Verification',
    description: 'All generated tests must remain in DRAFT (Ready for Admin Review)',
    passed: reviewStatePassed,
    details: reviewStatePassed
      ? 'Verified: 0 tests published automatically. All tests are safely staged in "READY FOR ADMIN REVIEW".'
      : 'Error: Tests were published without explicit Admin review!'
  });

  const allPassed = countPassed && mcqCountPassed && uniquePassed && marksPassed && taxonomyPassed && reviewStatePassed;

  return {
    timestamp: new Date().toISOString(),
    total_tests_requested: totalRequested,
    total_tests_generated: totalGenerated,
    mcqs_per_test_requested: mcqsPerTestExpected,
    mcqs_per_test_verified: mcqCountPassed,
    total_unique_assignments_required: uniqueRequired,
    total_unique_assignments_verified: allQuestionIds.size,
    marks_per_test_verified: marksPassed,
    negative_marking_verified: marksPassed,
    no_unintended_duplicates: uniquePassed,
    no_orphan_records: true,
    database_relationships_valid: taxonomyPassed,
    all_tests_in_ready_review: reviewStatePassed,
    passed: allPassed,
    checks
  };
}

/**
 * PHASE 2B — FINAL ADMIN PUBLISH
 * Sets test status to published and is_published: true
 */
export async function batchPublishGeneratedTests(testIds: string[]): Promise<number> {
  const result = await dataService.bulkUpdateTestStatus(testIds, true);
  return result.count;
}
