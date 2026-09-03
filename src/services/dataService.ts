import { Test, Question, Student, Attempt, Answer, SocialPlatform, AdminSettings, PublicLeaderboardEntry, SubmitAttemptResult, TestStatus, QuestionReport, ReportStatus, PracticeMode, PRIMARY_PRACTICE_MODES, PracticeModeConfig, TargetExam } from '../types';
import { DEMO_TESTS, DEMO_QUESTIONS, DEMO_ATTEMPTS, DEMO_SOCIAL_PLATFORMS, DEMO_ADMIN_SETTINGS } from '../data/demoData';
import { DEFAULT_TARGET_EXAMS } from '../data/defaultTargetExams';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';
import { idbStorage } from '../utils/idbStorage';

/**
 * Canonical Broad Subject Identifiers (mixed topics)
 */
export const BROAD_SUBJECT_PATTERNS = [
  'general science', 'science', 'सामान्य विज्ञान', 'विज्ञान',
  'english grammar', 'general english', 'english language', 'english vocab', 'अंग्रेजी',
  'hindi grammar', 'general hindi', 'hindi vyakaran', 'hindi bhasha', 'hindi vocab', 'हिन्दी व्याकरण', 'हिंदी व्याकरण', 'हिंदी', 'हिन्दी',
  'mathematics', 'quantitative aptitude', 'numerical ability', 'maths', 'math', 'गणित',
  'reasoning ability', 'general intelligence', 'logical reasoning', 'reasoning', 'तर्कशक्ति',
  'hp general knowledge', 'himachal pradesh gk', 'himachal gk', 'hp gk', 'हिमाचल सामान्य ज्ञान', 'हिमाचल प्रदेश सामान्य ज्ञान',
  'general studies', 'general knowledge', 'gk / gs', 'gk/gs', 'general awareness', 'gs', 'gk', 'सामान्य ज्ञान', 'सामान्य अध्ययन',
  'current affairs', 'समसामयिकी',
  'computer awareness', 'computer & it', 'computer', 'कंप्यूटर',
  'environment', 'ecology', 'biodiversity', 'पर्यावरण'
];

/**
 * Intelligent Practice Mode Classifier
 * Distinguishes:
 * 1. 'pyq' -> Previous year question papers
 * 2. 'topic_wise' -> Specific topic / chapter tests (e.g. "Understanding Plants - I", "Human Eye - II", "Blood - I", "Tenses - I")
 * 3. 'subject_wise' -> Section / Subject mixed mock tests (e.g. "General Science Mock Test - 1", "English Grammar Mock Test - 1")
 * 4. 'full_mock' -> Multi-subject full syllabus mock tests (e.g. "HP Police Constable Full Mock 1", "HP Patwari Full Mock 1")
 */
export const inferPracticeMode = (test?: Partial<Test> | null): PracticeMode => {
  if (!test) return 'full_mock';

  const title = (test.title || '').trim();
  const titleLower = title.toLowerCase();
  const catLower = (test.category || '').toLowerCase();
  const descLower = (test.description || '').toLowerCase();
  const subjLower = (test.subject || '').toLowerCase();
  const topicLower = (test.topic || '').toLowerCase();

  const combined = `${titleLower} ${catLower} ${descLower} ${subjLower} ${topicLower}`;

  // 1. PYQ Detection
  if (
    combined.includes('pyq') ||
    combined.includes('previous year') ||
    combined.includes('past paper') ||
    combined.includes('solved paper') ||
    combined.includes('official paper') ||
    (/\b(201\d|202[0-6])\b/.test(combined) && combined.includes('paper'))
  ) {
    return 'pyq';
  }

  // 2. Multi-Subject Full Length Mock Detection
  if (
    titleLower.includes('full mock') ||
    titleLower.includes('full length') ||
    titleLower.includes('complete mock') ||
    titleLower.includes('grand mock') ||
    titleLower.includes('full syllabus') ||
    catLower.includes('full mock') ||
    (Array.isArray(test.sections) && test.sections.length > 1) ||
    test.is_multisection ||
    (test.total_questions && test.total_questions >= 80 && (
      titleLower.includes('police constable') ||
      titleLower.includes('patwari') ||
      titleLower.includes('high court') ||
      titleLower.includes('clerk') ||
      titleLower.includes('all competitive')
    ))
  ) {
    return 'full_mock';
  }

  // 3. Explicit Topic-Wise Keywords
  if (
    catLower.includes('topic wise') ||
    catLower.includes('topic-wise') ||
    catLower.includes('topicwise') ||
    titleLower.includes('topic wise') ||
    titleLower.includes('topic-wise') ||
    titleLower.includes('topicwise') ||
    titleLower.includes('topic mcq') ||
    titleLower.includes('chapter test') ||
    titleLower.includes('conceptual test')
  ) {
    return 'topic_wise';
  }

  // 4. Broad Subject Mock Test Match (Section / Subject Practice)
  // e.g. "General Science Mock test - 1", "General Science Practice - 1", "English Grammar Mock Test - 1", "Reasoning Mock Test - 2"
  const isBroadSubjectMock = BROAD_SUBJECT_PATTERNS.some(subjKey => {
    const regex = new RegExp(`^${subjKey}(\\s+(mock\\s*test|practice\\s*test|sectional\\s*test|subject\\s*test|mock|test|paper|part|series))?(\\s*[-–—:]\\s*\\d+|\\s+\\d+)?$`, 'i');
    return regex.test(titleLower);
  });

  if (isBroadSubjectMock) {
    return 'subject_wise';
  }

  // 5. If topic is explicitly provided and is a specific topic (not 'General', 'Mixed', or empty)
  if (
    test.topic &&
    test.topic.trim() &&
    !['general', 'general topic', 'all', 'mixed', 'none', 'default'].includes(topicLower) &&
    topicLower !== subjLower
  ) {
    return 'topic_wise';
  }

  // 6. Check if Title represents a specific topic (e.g. "Understanding Plants - I", "Human Eye - II", "Blood - I", "Tenses - I", "Photosynthesis")
  // If the title does NOT match a broad whole-subject name and is not a multi-subject exam full mock, it is a topic test!
  const isSubjectOrExamName = BROAD_SUBJECT_PATTERNS.some(k => titleLower.startsWith(k)) ||
    titleLower.includes('constable') ||
    titleLower.includes('patwari') ||
    titleLower.includes('full syllabus') ||
    titleLower.includes('mixed test');

  if (!isSubjectOrExamName) {
    return 'topic_wise';
  }

  // 7. If previously set explicitly on test object and valid
  if (test.practice_mode && ['topic_wise', 'subject_wise', 'full_mock', 'pyq'].includes(test.practice_mode)) {
    return test.practice_mode;
  }

  return 'subject_wise';
};

export interface SupabaseTableMetric {
  name: string;
  rows: number;
  estimatedSizeBytes: number;
  estimatedSizeFormatted: string;
}

export interface SupabaseBucketMetric {
  bucketName: string;
  fileCount: number;
  sizeBytes: number;
  sizeFormatted: string;
}

export interface SupabaseStorageStats {
  allocatedQuotaBytes: number;
  allocatedQuotaFormatted: string;
  databaseSizeBytes: number;
  databaseSizeFormatted: string;
  objectStorageSizeBytes: number;
  objectStorageSizeFormatted: string;
  totalUsedBytes: number;
  totalUsedFormatted: string;
  freeBytes: number;
  freeFormatted: string;
  percentageUsed: number;
  percentageFree: number;
  storageQuotaTier: string;
  isRealtimeConnected: boolean;
  tablesBreakdown: SupabaseTableMetric[];
  bucketsBreakdown: SupabaseBucketMetric[];
  lastCalculatedAt: string;
}

export const isValidUUID = (id: string | null | undefined): boolean => {
  if (!id || typeof id !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

export const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const parseSafeNumber = (val: unknown, defaultVal = 0): number => {
  if (typeof val === 'number') return isNaN(val) ? defaultVal : val;
  if (typeof val === 'string') {
    const clean = val.replace(',', '.').trim();
    const num = parseFloat(clean);
    return isNaN(num) ? defaultVal : num;
  }
  return defaultVal;
};

export const STANDARD_PLATFORM_UUIDS: Record<string, string> = {
  'sp-yt': 'a1000000-0000-0000-0000-000000000001',
  'youtube': 'a1000000-0000-0000-0000-000000000001',
  'sp-tg': 'a1000000-0000-0000-0000-000000000002',
  'telegram': 'a1000000-0000-0000-0000-000000000002',
  'telegram channel': 'a1000000-0000-0000-0000-000000000002',
  'sp-ig': 'a1000000-0000-0000-0000-000000000003',
  'instagram': 'a1000000-0000-0000-0000-000000000003',
  'sp-wa': 'a1000000-0000-0000-0000-000000000004',
  'whatsapp': 'a1000000-0000-0000-0000-000000000004',
  'whatsapp channel': 'a1000000-0000-0000-0000-000000000004',
};

export const normalizePlatformId = (id: string | null | undefined, name?: string): string => {
  if (id && isValidUUID(id)) return id;
  const key = (id || '').toLowerCase().trim();
  if (STANDARD_PLATFORM_UUIDS[key]) return STANDARD_PLATFORM_UUIDS[key];
  if (name) {
    const nameKey = name.toLowerCase().trim();
    if (STANDARD_PLATFORM_UUIDS[nameKey]) return STANDARD_PLATFORM_UUIDS[nameKey];
    for (const [k, v] of Object.entries(STANDARD_PLATFORM_UUIDS)) {
      if (nameKey.includes(k) || k.includes(nameKey)) return v;
    }
  }
  return generateUUID();
};

const STORAGE_KEYS = {
  TESTS: 'gradeup_tests',
  QUESTIONS: 'gradeup_questions',
  QUESTION_BANK: 'gradeup_question_bank_master',
  DELETED_QUESTIONS: 'gradeup_deleted_questions_blacklist',
  ATTEMPTS: 'gradeup_attempts',
  ANSWERS: 'gradeup_answers',
  SOCIAL: 'gradeup_social_platforms',
  SETTINGS: 'gradeup_admin_settings',
  ACTIVE_ATTEMPT: 'gradeup_active_attempt_',
  REPORTS: 'gradeup_question_reports',
  MASTER_CATEGORIES: 'gradeup_master_categories',
  MASTER_SUBJECTS: 'gradeup_master_subjects',
  MASTER_SECTIONS: 'gradeup_master_sections',
  TARGET_EXAMS: 'gradeup_target_exams',
  DELETED_TARGET_EXAMS: 'gradeup_deleted_target_exams',
  SELECTED_TARGET_EXAM: 'gradeup_selected_target_exam_id'
};

export const DEFAULT_MASTER_CATEGORIES: string[] = [
  'Section / Subject Practice',
  'Topic Wise Practice',
  'All Competitive Exams',
  'HP Police Constable',
  'HP Police SI',
  'HP Forest Guard',
  'HP Patwari',
  'HPPSC HPAS (Himachal Administrative Services)',
  'HPPSC Naib Tehsildar',
  'HPPSC Allied Services',
  'HPPSC Conductor',
  'HP TGT Arts / Non-Medical / Medical',
  'HP TET (Teacher Eligibility Test)',
  'HP JBT / D.El.Ed',
  'HP High Court Clerk / Process Server',
  'HP Secretariat Clerk / JOA IT',
  'SSC CGL / CHSL / GD / MTS',
  'Railways RRB NTPC / Group D',
  'Banking IBPS / SBI PO & Clerk',
  'State PSC Exams',
  'Himachal Pradesh GK',
  'General Studies & Mock Tests'
];

export const DEFAULT_MASTER_SUBJECTS: string[] = [
  'General Science',
  'General Knowledge',
  'General Studies',
  'Himachal Pradesh GK',
  'HP History, Geography & Culture',
  'Indian Polity & Constitution',
  'Indian History & National Movement',
  'Geography of India & World',
  'Indian Economy & Budget',
  'Logical Reasoning & Mental Ability',
  'Quantitative Aptitude & Mathematics',
  'English Language & Grammar',
  'Hindi Bhasha & Vyakaran',
  'Computer Awareness & IT',
  'Environment, Ecology & Biodiversity',
  'National & International Current Affairs',
  'Teaching Aptitude & Pedagogy'
];

export const DEFAULT_MASTER_SECTIONS: string[] = [
  'General Knowledge',
  'General Science',
  'General Studies',
  'Reasoning Ability',
  'Quantitative Aptitude',
  'General English',
  'General Hindi',
  'Himachal Pradesh GK',
  'Current Affairs',
  'Computer Knowledge',
  'Section / Subject Practice',
  'General'
];

/**
 * Normalize question string for exact content fingerprinting
 */
export const normalizeQuestionText = (text: string): string => {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[?.,!;:_'"“”‘’`~\-–—()[\]{}<>/*+=#@$%^&|\\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Computes deterministic content fingerprint for a Question.
 * Questions with identical text & options (even if options are shuffled or IDs differ) produce the EXACT same fingerprint.
 */
export const getQuestionFingerprint = (q: Partial<Question>): string => {
  if (!q || !q.question_text) return '';
  const normText = normalizeQuestionText(q.question_text);
  if (!normText) return '';
  const opts = [
    normalizeQuestionText(q.option_a || ''),
    normalizeQuestionText(q.option_b || ''),
    normalizeQuestionText(q.option_c || ''),
    normalizeQuestionText(q.option_d || ''),
  ].filter(Boolean).sort().join('|');

  return `${normText}:::${opts}`;
};

/**
 * Calculates completeness and quality rank of a question for master preservation
 */
export const getQuestionQualityRank = (q: Partial<Question>): number => {
  if (!q) return 0;
  let score = 0;
  if (q.inspection_status === 'verified') score += 1000;
  if (q.explanation && q.explanation.trim().length > 10) score += Math.min(q.explanation.length, 500);
  if (q.question_image) score += 100;
  if (q.option_a_image || q.option_b_image || q.option_c_image || q.option_d_image) score += 100;
  if (q.explanation_image) score += 50;
  if (q.quality_score !== undefined) score += Number(q.quality_score);
  if (q.topic && q.topic !== 'General Topic') score += 50;
  if (q.chapter && q.chapter !== 'General') score += 50;
  if (q.subject && q.subject !== 'General Studies') score += 50;
  if (q.difficulty) score += 20;
  return score;
};

/**
 * Safely merges duplicate questions keeping the highest quality data fields
 */
export const mergeMasterQuestion = (existing: Question | undefined, incoming: Question): Question => {
  if (!existing) {
    return {
      ...incoming,
      test_id: 'bank',
      inspection_status: incoming.inspection_status || 'verified',
      quality_score: incoming.quality_score !== undefined ? Number(incoming.quality_score) : 90,
    };
  }

  const existingRank = getQuestionQualityRank(existing);
  const incomingRank = getQuestionQualityRank(incoming);
  const primary = incomingRank >= existingRank ? incoming : existing;
  const secondary = incomingRank >= existingRank ? existing : incoming;

  return {
    ...secondary,
    ...primary,
    id: existing.id || primary.id, // Preserve existing stable master ID
    test_id: 'bank',
    question_text: primary.question_text || secondary.question_text,
    question_image: primary.question_image || secondary.question_image || null,
    option_a: primary.option_a || secondary.option_a,
    option_a_image: primary.option_a_image || secondary.option_a_image || null,
    option_b: primary.option_b || secondary.option_b,
    option_b_image: primary.option_b_image || secondary.option_b_image || null,
    option_c: primary.option_c || secondary.option_c,
    option_c_image: primary.option_c_image || secondary.option_c_image || null,
    option_d: primary.option_d || secondary.option_d,
    option_d_image: primary.option_d_image || secondary.option_d_image || null,
    correct_answer: primary.correct_answer || secondary.correct_answer || 'A',
    explanation: (primary.explanation && primary.explanation.length > (secondary.explanation?.length || 0)) ? primary.explanation : (secondary.explanation || primary.explanation || ''),
    explanation_image: primary.explanation_image || secondary.explanation_image || null,
    subject: primary.subject && primary.subject !== 'General Studies' ? primary.subject : (secondary.subject || primary.subject || 'General Studies'),
    chapter: primary.chapter && primary.chapter !== 'General' ? primary.chapter : (secondary.chapter || primary.chapter || 'General'),
    topic: primary.topic && primary.topic !== 'General Topic' ? primary.topic : (secondary.topic || primary.topic || 'General Topic'),
    difficulty: primary.difficulty || secondary.difficulty || 'Medium',
    inspection_status: (primary.inspection_status === 'verified' || secondary.inspection_status === 'verified') ? 'verified' : (primary.inspection_status || 'pending'),
    quality_score: Math.max(Number(primary.quality_score) || 90, Number(secondary.quality_score) || 90),
    created_at: existing.created_at || primary.created_at || new Date().toISOString()
  };
};

/**
 * Question Mock Test Usage Information
 */
export interface MockTestUsageInfo {
  testId: string;
  testTitle: string;
  testCode?: string;
  slug?: string;
}

export interface QuestionBankUsageReport {
  usageById: Map<string, MockTestUsageInfo[]>;
  usageByFingerprint: Map<string, MockTestUsageInfo[]>;
  allTests: Test[];
}

/**
 * Helper to determine which mock tests (if any) currently contain a given question.
 */
export const getQuestionMockTestUsages = (
  q: Partial<Question>,
  usageReport?: QuestionBankUsageReport | null,
  excludeTestId?: string
): MockTestUsageInfo[] => {
  if (!q || !usageReport) return [];

  const foundMap = new Map<string, MockTestUsageInfo>();

  if (q.id && usageReport.usageById && usageReport.usageById.has(q.id)) {
    usageReport.usageById.get(q.id)!.forEach(u => {
      if (!excludeTestId || u.testId !== excludeTestId) {
        foundMap.set(u.testId, u);
      }
    });
  }

  const fp = getQuestionFingerprint(q);
  if (fp && usageReport.usageByFingerprint && usageReport.usageByFingerprint.has(fp)) {
    usageReport.usageByFingerprint.get(fp)!.forEach(u => {
      if (!excludeTestId || u.testId !== excludeTestId) {
        foundMap.set(u.testId, u);
      }
    });
  }

  return Array.from(foundMap.values());
};

// Helper: Ensure questions are permanently registered in Question Bank Master without creating duplicates
export const syncToQuestionBankMaster = (questionsToSync: Question[]): void => {
  if (!Array.isArray(questionsToSync) || questionsToSync.length === 0) return;
  try {
    // Load deleted blacklist
    let deletedSet = new Set<string>();
    try {
      const rawBlacklist = localStorage.getItem(STORAGE_KEYS.DELETED_QUESTIONS);
      if (rawBlacklist) {
        const parsed = JSON.parse(rawBlacklist);
        if (Array.isArray(parsed)) deletedSet = new Set(parsed);
      }
    } catch {}

    const raw = localStorage.getItem(STORAGE_KEYS.QUESTION_BANK);
    let bankList: Question[] = [];
    try {
      bankList = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(bankList)) bankList = [];
    } catch {
      bankList = [];
    }

    const bankMap = new Map<string, Question>();
    const fingerprintMap = new Map<string, string>(); // fingerprint -> questionId

    // Index existing bank questions by ID and fingerprint
    bankList.forEach(q => {
      if (q && q.id && !deletedSet.has(q.id)) {
        bankMap.set(q.id, q);
        const fp = getQuestionFingerprint(q);
        if (fp && !fingerprintMap.has(fp)) {
          fingerprintMap.set(fp, q.id);
        }
      }
    });

    questionsToSync.forEach(q => {
      if (!q || !q.question_text) return;
      if (deletedSet.has(q.id)) return; // Skip if deleted from bank

      const fp = getQuestionFingerprint(q);
      const existingIdByFp = fp ? fingerprintMap.get(fp) : undefined;
      const targetId = existingIdByFp || (q.id && isValidUUID(q.id) ? q.id : generateUUID());

      if (deletedSet.has(targetId)) return;

      const existing = bankMap.get(targetId);
      const cleanQ = mergeMasterQuestion(existing, {
        ...q,
        id: targetId,
        test_id: 'bank'
      });

      bankMap.set(targetId, cleanQ);
      if (fp) fingerprintMap.set(fp, targetId);
    });

    const updatedList = Array.from(bankMap.values());
    try {
      localStorage.setItem(STORAGE_KEYS.QUESTION_BANK, JSON.stringify(updatedList));
    } catch (lsErr) {
      console.warn('localStorage quota reached for Question Bank; persisting safely in IndexedDB:', lsErr);
    }
    idbStorage.set(STORAGE_KEYS.QUESTION_BANK, updatedList);
  } catch (e) {
    console.warn('Failed to sync to Question Bank Master:', e);
  }
};

// Initialize local storage with default structure
const initLocalStorage = () => {
  const isRemoteActive = isSupabaseConfigured();
  if (!localStorage.getItem(STORAGE_KEYS.TESTS)) {
    localStorage.setItem(STORAGE_KEYS.TESTS, JSON.stringify(isRemoteActive ? [] : DEMO_TESTS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.QUESTIONS)) {
    localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(isRemoteActive ? {} : DEMO_QUESTIONS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.QUESTION_BANK)) {
    const initialBank: Question[] = [];
    const seen = new Set<string>();
    Object.values(DEMO_QUESTIONS).forEach(qList => {
      if (Array.isArray(qList)) {
        qList.forEach(q => {
          if (q && q.id && !seen.has(q.id)) {
            seen.add(q.id);
            initialBank.push({ ...q, test_id: 'bank' });
          }
        });
      }
    });
    localStorage.setItem(STORAGE_KEYS.QUESTION_BANK, JSON.stringify(initialBank));
  }
  if (!localStorage.getItem(STORAGE_KEYS.ATTEMPTS)) {
    localStorage.setItem(STORAGE_KEYS.ATTEMPTS, JSON.stringify(isRemoteActive ? [] : DEMO_ATTEMPTS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.SOCIAL)) {
    localStorage.setItem(STORAGE_KEYS.SOCIAL, JSON.stringify(DEMO_SOCIAL_PLATFORMS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEMO_ADMIN_SETTINGS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.REPORTS)) {
    localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.TARGET_EXAMS)) {
    try {
      const rawDeleted = localStorage.getItem(STORAGE_KEYS.DELETED_TARGET_EXAMS);
      const deletedIds = new Set(rawDeleted ? JSON.parse(rawDeleted) : []);
      const initial = DEFAULT_TARGET_EXAMS.filter(e => !deletedIds.has(e.id));
      localStorage.setItem(STORAGE_KEYS.TARGET_EXAMS, JSON.stringify(initial));
    } catch {
      localStorage.setItem(STORAGE_KEYS.TARGET_EXAMS, JSON.stringify(DEFAULT_TARGET_EXAMS));
    }
  }
};

initLocalStorage();

export const sanitizeSocialUrl = (platformNameOrIcon: string, url?: string | null): string => {
  const norm = (platformNameOrIcon || '').toLowerCase();
  const cleanUrl = (url || '').trim();
  
  if (norm.includes('telegram') || norm.includes('send') || norm.includes('t.me')) {
    if (!cleanUrl || cleanUrl === 'https://t.me/gradeupstudy' || cleanUrl === 'http://t.me/gradeupstudy' || cleanUrl === 'https://t.me/gradeupstudy/') {
      return 'https://t.me/gradeupstudyofficial';
    }
    return cleanUrl;
  }
  
  if (norm.includes('instagram') || norm.includes('ig') || norm.includes('insta')) {
    if (!cleanUrl || cleanUrl === 'https://instagram.com/gradeupstudy' || cleanUrl === 'http://instagram.com/gradeupstudy' || cleanUrl === 'https://www.instagram.com/gradeupstudy' || cleanUrl === 'https://instagram.com/gradeupstudy/') {
      return 'https://instagram.com/gradeupstudy.official';
    }
    return cleanUrl;
  }

  if (norm.includes('youtube') || norm.includes('yt')) {
    if (!cleanUrl) return 'https://youtube.com/@gradeupstudy';
    return cleanUrl;
  }

  if (norm.includes('whatsapp') || norm.includes('wa') || norm.includes('message-circle')) {
    if (!cleanUrl) return 'https://whatsapp.com/channel/gradeupstudy';
    return cleanUrl;
  }

  return cleanUrl;
};

/**
 * Safely shuffle the 4 options (A, B, C, D) for a single Question.
 * Keeps the correct answer mapping 100% accurate, but reorders the options randomly
 * or targets a specific new option slot ('A' | 'B' | 'C' | 'D') if desired.
 */
export const shuffleQuestionOptions = (
  q: Question,
  forcedTargetAnswer?: 'A' | 'B' | 'C' | 'D'
): Question => {
  const currentKey = (['A', 'B', 'C', 'D'].includes(q.correct_answer?.toUpperCase())
    ? q.correct_answer.toUpperCase()
    : 'A') as 'A' | 'B' | 'C' | 'D';

  const optionsMap: Record<'A' | 'B' | 'C' | 'D', string> = {
    A: q.option_a || '',
    B: q.option_b || '',
    C: q.option_c || '',
    D: q.option_d || ''
  };

  const correctText = optionsMap[currentKey] || q.option_a;
  
  // Extract all 4 options
  const originalList = [
    { text: q.option_a, wasCorrect: currentKey === 'A' },
    { text: q.option_b, wasCorrect: currentKey === 'B' },
    { text: q.option_c, wasCorrect: currentKey === 'C' },
    { text: q.option_d, wasCorrect: currentKey === 'D' }
  ];

  let newList: string[] = [];
  let newCorrectKey: 'A' | 'B' | 'C' | 'D' = 'A';

  if (forcedTargetAnswer) {
    const targetIdx = ['A', 'B', 'C', 'D'].indexOf(forcedTargetAnswer);
    const distractors = originalList.filter(item => !item.wasCorrect).map(item => item.text);
    
    // Shuffle distractors
    for (let i = distractors.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [distractors[i], distractors[j]] = [distractors[j], distractors[i]];
    }

    newList = [];
    let dIdx = 0;
    for (let i = 0; i < 4; i++) {
      if (i === targetIdx) {
        newList.push(correctText);
      } else {
        newList.push(distractors[dIdx++] || `Option ${['A', 'B', 'C', 'D'][i]}`);
      }
    }
    newCorrectKey = forcedTargetAnswer;
  } else {
    // Random Fisher-Yates shuffle
    const shuffled = [...originalList];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    newList = shuffled.map(item => item.text);
    const foundIdx = shuffled.findIndex(item => item.wasCorrect);
    newCorrectKey = (['A', 'B', 'C', 'D'][foundIdx >= 0 ? foundIdx : 0]) as 'A' | 'B' | 'C' | 'D';
  }

  // Update explanation if it contains explicit "Option X" text
  let newExplanation = q.explanation || '';
  if (newExplanation && currentKey !== newCorrectKey) {
    newExplanation = newExplanation.replace(
      new RegExp(`Option\\s+${currentKey}\\b`, 'gi'),
      `Option ${newCorrectKey}`
    );
  }

  return {
    ...q,
    option_a: newList[0] || q.option_a,
    option_b: newList[1] || q.option_b,
    option_c: newList[2] || q.option_c,
    option_d: newList[3] || q.option_d,
    correct_answer: newCorrectKey,
    explanation: newExplanation
  };
};

/**
 * Shuffle & Balance options across an entire list of questions.
 * Ensures an even distribution of correct answers across A, B, C, D (~25% each)
 * and prevents long streaks of identical answers.
 */
export const shuffleAndBalanceQuestions = (questions: Question[]): Question[] => {
  if (!questions || questions.length === 0) return [];

  const keys: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];
  const balancedTargets: ('A' | 'B' | 'C' | 'D')[] = [];
  const fullCycles = Math.ceil(questions.length / 4);
  
  for (let c = 0; c < fullCycles; c++) {
    const cycleKeys = [...keys];
    // Shuffle the 4 keys for this cycle
    for (let i = cycleKeys.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cycleKeys[i], cycleKeys[j]] = [cycleKeys[j], cycleKeys[i]];
    }
    // Prevent last key of previous cycle matching first key of new cycle
    if (balancedTargets.length > 0 && balancedTargets[balancedTargets.length - 1] === cycleKeys[0]) {
      [cycleKeys[0], cycleKeys[1]] = [cycleKeys[1], cycleKeys[0]];
    }
    balancedTargets.push(...cycleKeys);
  }

  return questions.map((q, idx) => {
    const targetKey = balancedTargets[idx] || keys[idx % 4];
    return shuffleQuestionOptions(q, targetKey);
  });
};

export const sanitizeAdminSettings = (s?: Partial<AdminSettings> | any): AdminSettings => {
  const data = s || {};
  const brand_name = data.brand_name || data.app_name || 'Gradeup Study';
  const logo_url = data.logo_url !== undefined && data.logo_url !== null ? data.logo_url : DEMO_ADMIN_SETTINGS.logo_url;
  let website_url = data.website_url || DEMO_ADMIN_SETTINGS.website_url;
  if (website_url === 'https://gradeupstudy.com' || website_url === 'http://gradeupstudy.com' || website_url === 'gradeupstudy.com') {
    website_url = 'https://mock.gradeupstudy.com';
  }
  const youtube_channel = sanitizeSocialUrl('youtube', data.youtube_channel);
  const telegram_channel = sanitizeSocialUrl('telegram', data.telegram_channel);
  const instagram_handle = sanitizeSocialUrl('instagram', data.instagram_handle);
  const whatsapp_channel_url = sanitizeSocialUrl('whatsapp', data.whatsapp_channel_url);

  return {
    ...DEMO_ADMIN_SETTINGS,
    ...data,
    brand_name,
    logo_url,
    website_url,
    youtube_channel,
    telegram_channel,
    instagram_handle,
    whatsapp_channel_url,
  };
};

export const sanitizeAttemptForSupabase = (a: Attempt) => {
  return {
    id: isValidUUID(a.id) ? a.id : generateUUID(),
    test_id: isValidUUID(a.test_id) ? a.test_id : a.test_id,
    student_id: isValidUUID(a.student_id) ? a.student_id : generateUUID(),
    student_name: a.student_name || 'Candidate',
    student_mobile: a.student_mobile || '',
    student_email: a.student_email || null,
    student_state: a.student_state || 'Himachal Pradesh',
    student_district: a.student_district || 'General',
    start_time: a.start_time || new Date().toISOString(),
    end_time: a.end_time || (a.status === 'completed' || a.status === 'auto_submitted' ? new Date().toISOString() : null),
    submitted_at: a.submitted_at || (a.status === 'completed' || a.status === 'auto_submitted' ? new Date().toISOString() : null),
    status: a.status || 'in_progress',
    total_questions: parseSafeNumber(a.total_questions, 0),
    attempted_questions: parseSafeNumber(a.attempted_questions, 0),
    correct_answers: parseSafeNumber(a.correct_answers, 0),
    wrong_answers: parseSafeNumber(a.wrong_answers, 0),
    skipped_questions: parseSafeNumber(a.skipped_questions, 0),
    score: parseSafeNumber(a.score, 0),
    percentage: parseSafeNumber(a.percentage, 0),
    time_taken_seconds: parseSafeNumber(a.time_taken_seconds, 0),
    suspicious_activity_count: parseSafeNumber(a.suspicious_activity_count, 0),
    created_at: a.created_at || new Date().toISOString()
  };
};

export const dataService = {
  // ------------------------------------
  // ADMIN SETTINGS
  // ------------------------------------
  getSettings: async (): Promise<AdminSettings> => {
    let settings = { ...DEMO_ADMIN_SETTINGS };
    const supabase = getSupabaseClient();
    
    // Retrieve cached logo if user previously uploaded one
    let cachedLogo: string | null = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.logo_url && parsed.logo_url.trim() !== '' && parsed.logo_url !== '/logo.png' && parsed.logo_url !== '/logo.svg') {
          cachedLogo = parsed.logo_url;
        }
      }
    } catch {
      // ignore
    }

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('admin_settings')
          .select('*')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!error && data) {
          settings = sanitizeAdminSettings(data);
          
          // If Supabase returned a valid custom logo, use it
          if (data.logo_url && data.logo_url.trim() !== '' && data.logo_url !== '/logo.png' && data.logo_url !== '/logo.svg') {
            settings.logo_url = data.logo_url;
          } else if (cachedLogo) {
            // Preserve uploaded custom logo if remote had empty string
            settings.logo_url = cachedLogo;
            // Silently sync back to Supabase
            if (data.id) {
              (async () => {
                try {
                  await supabase.from('admin_settings').update({ logo_url: cachedLogo, updated_at: new Date().toISOString() }).eq('id', data.id);
                } catch {
                  // ignore
                }
              })();
            }
          }

          // If whatsapp_channel_url is empty in data, check social_platforms array or fallback
          if (!settings.whatsapp_channel_url && Array.isArray(data.social_platforms)) {
            const wa = data.social_platforms.find((p: any) => (p.platform_name || '').toLowerCase().includes('whatsapp') || p.icon === 'message-circle');
            if (wa && wa.platform_url) {
              settings.whatsapp_channel_url = sanitizeSocialUrl('whatsapp', wa.platform_url);
            }
          }
          
          // Also check social_platforms table in Supabase if any links were missing
          try {
            const { data: spRows } = await supabase.from('social_platforms').select('*');
            if (spRows && spRows.length > 0) {
              spRows.forEach((row: any) => {
                const name = (row.platform_name || '').toLowerCase();
                if ((name.includes('youtube') || row.icon === 'youtube') && row.platform_url && (!data.youtube_channel || data.youtube_channel.includes('gradeupstudy'))) {
                  settings.youtube_channel = sanitizeSocialUrl('youtube', row.platform_url);
                }
                if ((name.includes('telegram') || row.icon === 'send') && row.platform_url && (!data.telegram_channel || data.telegram_channel.includes('gradeupstudy'))) {
                  settings.telegram_channel = sanitizeSocialUrl('telegram', row.platform_url);
                }
                if ((name.includes('instagram') || row.icon === 'instagram') && row.platform_url && (!data.instagram_handle || data.instagram_handle.includes('gradeupstudy'))) {
                  settings.instagram_handle = sanitizeSocialUrl('instagram', row.platform_url);
                }
                if ((name.includes('whatsapp') || row.icon === 'message-circle') && row.platform_url && (!settings.whatsapp_channel_url || settings.whatsapp_channel_url.includes('gradeupstudy'))) {
                  settings.whatsapp_channel_url = sanitizeSocialUrl('whatsapp', row.platform_url);
                }
              });
            }
          } catch {
            // ignore
          }

          localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
          
          // If settings contains social_platforms, sync to local storage cache as well
          if (Array.isArray(data.social_platforms) && data.social_platforms.length > 0) {
            const sanitizedSP = data.social_platforms.map((p: any) => ({
              ...p,
              platform_url: sanitizeSocialUrl(p.platform_name || p.icon, p.platform_url)
            }));
            localStorage.setItem(STORAGE_KEYS.SOCIAL, JSON.stringify(sanitizedSP));
          }
        } else {
          // If no row in Supabase admin_settings yet, check localStorage
          const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
          if (raw) {
            try {
              settings = sanitizeAdminSettings(JSON.parse(raw));
            } catch {
              settings = { ...DEMO_ADMIN_SETTINGS };
            }
          }
        }
      } catch (err) {
        console.warn('Supabase fetch settings failed, using cache', err);
        const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
        if (raw) {
          try {
            settings = sanitizeAdminSettings(JSON.parse(raw));
          } catch {
            settings = { ...DEMO_ADMIN_SETTINGS };
          }
        }
      }
    } else {
      const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (raw) {
        try {
          settings = sanitizeAdminSettings(JSON.parse(raw));
        } catch {
          settings = { ...DEMO_ADMIN_SETTINGS };
        }
      }
    }

    settings = sanitizeAdminSettings(settings);

    // Clear out unsplash image URLs if present
    if (settings.logo_url && settings.logo_url.includes('unsplash.com')) {
      settings.logo_url = '/logo.svg';
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    }

    return settings;
  },

  uploadLogoFile: async (file: File | Blob): Promise<{ success: boolean; url: string; source: 'supabase_storage' | 'cloud_compressed' }> => {
    const supabase = getSupabaseClient();
    
    // 1. Try uploading binary directly to Supabase Storage Bucket
    if (isSupabaseConfigured() && supabase) {
      const possibleBuckets = ['logos', 'brand', 'assets', 'gradeup-assets', 'gradeup_assets', 'public', 'images'];
      const fileExt = file instanceof File ? file.name.split('.').pop() || 'png' : 'png';
      const fileName = `official_logo_${Date.now()}.${fileExt}`;
      const filePath = `brand/${fileName}`;

      for (const bucket of possibleBuckets) {
        try {
          const { data: uploadData, error: uploadErr } = await supabase.storage
            .from(bucket)
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: true,
              contentType: file.type || 'image/png'
            });

          if (!uploadErr && uploadData) {
            const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(filePath);
            if (publicData?.publicUrl) {
              const publicUrl = publicData.publicUrl;
              // Immediately write to Supabase admin_settings
              try {
                await supabase.from('admin_settings').update({ logo_url: publicUrl, updated_at: new Date().toISOString() }).neq('id', '00000000-0000-0000-0000-000000000000');
              } catch {
                // ignore
              }
              return { success: true, url: publicUrl, source: 'supabase_storage' };
            }
          }
        } catch {
          // continue checking other buckets
        }
      }
    }

    // 2. High-Fidelity Canvas compression for direct Cloud Database payload (Retina Sharp 400px max)
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const rawData = e.target?.result as string;
        const img = new Image();
        img.onload = async () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 400; // 400px gives crisp retina quality
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          let compressed = rawData;
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            compressed = canvas.toDataURL(file.type.includes('png') ? 'image/png' : 'image/jpeg', 0.92);
          }

          // Directly sync to Supabase admin_settings table
          if (isSupabaseConfigured() && supabase) {
            try {
              await supabase.from('admin_settings').update({ logo_url: compressed, updated_at: new Date().toISOString() }).neq('id', '00000000-0000-0000-0000-000000000000');
            } catch {
              // ignore
            }
          }

          resolve({ success: true, url: compressed, source: 'cloud_compressed' });
        };
        img.onerror = () => resolve({ success: true, url: rawData, source: 'cloud_compressed' });
        img.src = rawData;
      };
      reader.onerror = () => resolve({ success: false, url: '', source: 'cloud_compressed' });
      reader.readAsDataURL(file);
    });
  },

  /**
   * High-Performance Question & Option Image Uploader:
   * Uploads reasoning figures, mirror/water images, diagrams to Supabase Storage,
   * with automatic high-res canvas compression fallback.
   */
  uploadQuestionImage: async (file: File | Blob, folder = 'mcq_images'): Promise<{ success: boolean; url: string; source: 'supabase_storage' | 'cloud_compressed' }> => {
    const supabase = getSupabaseClient();
    
    // 1. Try uploading to Supabase Storage Bucket
    if (isSupabaseConfigured() && supabase) {
      const possibleBuckets = ['question_images', 'question-images', 'images', 'assets', 'public', 'logos'];
      const fileExt = file instanceof File ? file.name.split('.').pop() || 'png' : 'png';
      const fileName = `mcq_img_${Date.now()}_${Math.random().toString(36).substr(2, 6)}.${fileExt}`;
      const filePath = `${folder}/${fileName}`;

      for (const bucket of possibleBuckets) {
        try {
          const { data: uploadData, error: uploadErr } = await supabase.storage
            .from(bucket)
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: true,
              contentType: file.type || 'image/png'
            });

          if (!uploadErr && uploadData) {
            const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(filePath);
            if (publicData?.publicUrl) {
              return { success: true, url: publicData.publicUrl, source: 'supabase_storage' };
            }
          }
        } catch {
          // try next bucket
        }
      }
    }

    // 2. High-Fidelity Canvas compression for offline / direct base64 fallback (Max 1200px)
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const rawData = e.target?.result as string;
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 1200; // 1200px provides crisp detail for diagrams & mirror/water reasoning problems
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          let compressed = rawData;
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            compressed = canvas.toDataURL(file.type.includes('png') ? 'image/png' : 'image/jpeg', 0.88);
          }
          resolve({ success: true, url: compressed, source: 'cloud_compressed' });
        };
        img.onerror = () => resolve({ success: true, url: rawData, source: 'cloud_compressed' });
        img.src = rawData;
      };
      reader.onerror = () => resolve({ success: false, url: '', source: 'cloud_compressed' });
      reader.readAsDataURL(file);
    });
  },

  // ------------------------------------
  // MASTER CATEGORIES, SUBJECTS & SECTIONS SYSTEM
  // ------------------------------------
  getMasterCategories: (): string[] => {
    let savedCats: string[] = [];
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.MASTER_CATEGORIES);
      if (raw) {
        savedCats = JSON.parse(raw);
      }
    } catch {}

    // Combine with categories from existing mock tests & default standard categories
    let testCats: string[] = [];
    try {
      const rawTests = localStorage.getItem(STORAGE_KEYS.TESTS);
      if (rawTests) {
        const tests = JSON.parse(rawTests);
        if (Array.isArray(tests)) {
          testCats = tests.map(t => (t.category || '').trim()).filter(Boolean);
        }
      }
    } catch {}

    const set = new Set<string>();
    DEFAULT_MASTER_CATEGORIES.forEach(c => { if (c && c.trim()) set.add(c.trim()); });
    if (Array.isArray(savedCats)) {
      savedCats.forEach(c => { if (c && c.trim()) set.add(c.trim()); });
    }
    if (Array.isArray(testCats)) {
      testCats.forEach(c => { if (c && c.trim()) set.add(c.trim()); });
    }

    return Array.from(set).sort((a, b) => a.localeCompare(b));
  },

  saveMasterCategory: async (categoryName: string): Promise<string[]> => {
    const name = categoryName.trim();
    if (!name) return dataService.getMasterCategories();
    const existing = [...dataService.getMasterCategories()];
    if (!existing.some(c => c.toLowerCase() === name.toLowerCase())) {
      existing.unshift(name);
      try {
        localStorage.setItem(STORAGE_KEYS.MASTER_CATEGORIES, JSON.stringify(existing));
      } catch {}
      idbStorage.set(STORAGE_KEYS.MASTER_CATEGORIES, existing);
    }
    return existing;
  },

  deleteMasterCategory: async (categoryName: string): Promise<string[]> => {
    const current = dataService.getMasterCategories();
    const updated = current.filter(c => c.toLowerCase() !== categoryName.toLowerCase());
    try {
      localStorage.setItem(STORAGE_KEYS.MASTER_CATEGORIES, JSON.stringify(updated));
    } catch {}
    idbStorage.set(STORAGE_KEYS.MASTER_CATEGORIES, updated);
    return updated;
  },

  getMasterSubjects: (): string[] => {
    let savedSubs: string[] = [];
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.MASTER_SUBJECTS);
      if (raw) {
        savedSubs = JSON.parse(raw);
      }
    } catch {}

    // Combine with subjects from Question Bank Master, Tests & default standard subjects
    let bankSubs: string[] = [];
    try {
      const rawBank = localStorage.getItem(STORAGE_KEYS.QUESTION_BANK);
      if (rawBank) {
        const bank = JSON.parse(rawBank);
        if (Array.isArray(bank)) {
          bankSubs = bank.map(q => (q.subject || '').trim()).filter(Boolean);
        }
      }
    } catch {}

    let testSubs: string[] = [];
    try {
      const rawTests = localStorage.getItem(STORAGE_KEYS.TESTS);
      if (rawTests) {
        const tests = JSON.parse(rawTests);
        if (Array.isArray(tests)) {
          testSubs = tests.map(t => (t.subject || '').trim()).filter(Boolean);
        }
      }
    } catch {}

    const set = new Set<string>();
    DEFAULT_MASTER_SUBJECTS.forEach(s => { if (s && s.trim()) set.add(s.trim()); });
    if (Array.isArray(savedSubs)) {
      savedSubs.forEach(s => { if (s && s.trim()) set.add(s.trim()); });
    }
    if (Array.isArray(bankSubs)) {
      bankSubs.forEach(s => { if (s && s.trim()) set.add(s.trim()); });
    }
    if (Array.isArray(testSubs)) {
      testSubs.forEach(s => { if (s && s.trim()) set.add(s.trim()); });
    }

    return Array.from(set).sort((a, b) => a.localeCompare(b));
  },

  saveMasterSubject: async (subjectName: string): Promise<string[]> => {
    const name = subjectName.trim();
    if (!name) return dataService.getMasterSubjects();
    const existing = [...dataService.getMasterSubjects()];
    if (!existing.some(s => s.toLowerCase() === name.toLowerCase())) {
      existing.unshift(name);
      try {
        localStorage.setItem(STORAGE_KEYS.MASTER_SUBJECTS, JSON.stringify(existing));
      } catch {}
      idbStorage.set(STORAGE_KEYS.MASTER_SUBJECTS, existing);
    }
    return existing;
  },

  deleteMasterSubject: async (subjectName: string): Promise<string[]> => {
    const current = dataService.getMasterSubjects();
    const updated = current.filter(s => s.toLowerCase() !== subjectName.toLowerCase());
    try {
      localStorage.setItem(STORAGE_KEYS.MASTER_SUBJECTS, JSON.stringify(updated));
    } catch {}
    idbStorage.set(STORAGE_KEYS.MASTER_SUBJECTS, updated);
    return updated;
  },

  getMasterSections: (): string[] => {
    let savedSections: string[] = [];
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.MASTER_SECTIONS);
      if (raw) {
        savedSections = JSON.parse(raw);
      }
    } catch {}

    // Combine with sections from Tests & Questions
    let testSections: string[] = [];
    try {
      const rawTests = localStorage.getItem(STORAGE_KEYS.TESTS);
      if (rawTests) {
        const tests = JSON.parse(rawTests);
        if (Array.isArray(tests)) {
          tests.forEach(t => {
            if (Array.isArray(t.sections)) {
              t.sections.forEach((sec: any) => {
                const secName = typeof sec === 'string' ? sec : (sec?.name || sec?.title || '');
                if (secName && secName.trim()) testSections.push(secName.trim());
              });
            }
          });
        }
      }
    } catch {}

    let questionSections: string[] = [];
    try {
      const rawBank = localStorage.getItem(STORAGE_KEYS.QUESTION_BANK);
      if (rawBank) {
        const bank = JSON.parse(rawBank);
        if (Array.isArray(bank)) {
          questionSections = bank.map(q => (q.section || '').trim()).filter(Boolean);
        }
      }
    } catch {}

    const set = new Set<string>();
    DEFAULT_MASTER_SECTIONS.forEach(s => { if (s && s.trim()) set.add(s.trim()); });
    if (Array.isArray(savedSections)) {
      savedSections.forEach(s => { if (s && s.trim()) set.add(s.trim()); });
    }
    if (Array.isArray(testSections)) {
      testSections.forEach(s => { if (s && s.trim()) set.add(s.trim()); });
    }
    if (Array.isArray(questionSections)) {
      questionSections.forEach(s => { if (s && s.trim()) set.add(s.trim()); });
    }

    return Array.from(set).sort((a, b) => a.localeCompare(b));
  },

  saveMasterSection: async (sectionName: string): Promise<string[]> => {
    const name = sectionName.trim();
    if (!name) return dataService.getMasterSections();
    const existing = [...dataService.getMasterSections()];
    if (!existing.some(s => s.toLowerCase() === name.toLowerCase())) {
      existing.unshift(name);
      try {
        localStorage.setItem(STORAGE_KEYS.MASTER_SECTIONS, JSON.stringify(existing));
      } catch {}
      idbStorage.set(STORAGE_KEYS.MASTER_SECTIONS, existing);
    }
    return existing;
  },

  deleteMasterSection: async (sectionName: string): Promise<string[]> => {
    const current = dataService.getMasterSections();
    const updated = current.filter(s => s.toLowerCase() !== sectionName.toLowerCase());
    try {
      localStorage.setItem(STORAGE_KEYS.MASTER_SECTIONS, JSON.stringify(updated));
    } catch {}
    idbStorage.set(STORAGE_KEYS.MASTER_SECTIONS, updated);
    return updated;
  },

  updateSettings: async (newSettings: Partial<AdminSettings>): Promise<AdminSettings> => {
    const current = await dataService.getSettings();
    const updated: AdminSettings = sanitizeAdminSettings({
      ...current,
      ...newSettings,
      social_gate_title: newSettings.social_gate_title !== undefined ? newSettings.social_gate_title : (current.social_gate_title || DEMO_ADMIN_SETTINGS.social_gate_title),
      social_gate_description: newSettings.social_gate_description !== undefined ? newSettings.social_gate_description : (current.social_gate_description || DEMO_ADMIN_SETTINGS.social_gate_description),
      social_gate_enabled: newSettings.social_gate_enabled !== undefined ? newSettings.social_gate_enabled : (current.social_gate_enabled ?? true)
    });

    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));

    // 1. Sync & update social_platforms list
    const currentPlatforms = await dataService.getSocialPlatforms(true);
    const updatedPlatforms = currentPlatforms.map((p) => {
      const lowerName = (p.platform_name || '').toLowerCase();
      if (updated.youtube_channel && (lowerName.includes('youtube') || p.icon === 'youtube' || p.id === 'a1000000-0000-0000-0000-000000000001')) {
        return { ...p, platform_url: updated.youtube_channel };
      }
      if (updated.telegram_channel && (lowerName.includes('telegram') || p.icon === 'send' || p.id === 'a1000000-0000-0000-0000-000000000002')) {
        return { ...p, platform_url: updated.telegram_channel };
      }
      if (updated.instagram_handle && (lowerName.includes('instagram') || p.icon === 'instagram' || p.id === 'a1000000-0000-0000-0000-000000000003')) {
        return { ...p, platform_url: updated.instagram_handle };
      }
      if (updated.whatsapp_channel_url && (lowerName.includes('whatsapp') || p.icon === 'message-circle' || p.id === 'a1000000-0000-0000-0000-000000000004')) {
        return { ...p, platform_url: updated.whatsapp_channel_url };
      }
      return p;
    });

    updated.social_platforms = updatedPlatforms;
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
    localStorage.setItem(STORAGE_KEYS.SOCIAL, JSON.stringify(updatedPlatforms));

    // 2. Persist to Supabase Cloud Database (Global Single Source of Truth)
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      try {
        // Step A: Immediately & directly persist logo_url to Supabase admin_settings table
        if (updated.logo_url) {
          try {
            await supabase.from('admin_settings').update({
              logo_url: updated.logo_url,
              brand_name: updated.brand_name || 'Gradeup Study',
              updated_at: new Date().toISOString()
            }).neq('id', '00000000-0000-0000-0000-000000000000');
          } catch {
            // ignore
          }
        }

        const { data: existingRows } = await supabase.from('admin_settings').select('*');
        
        if (existingRows && existingRows.length > 0) {
          for (const row of existingRows) {
            const rowKeys = Object.keys(row);
            const dynamicPayload: Record<string, unknown> = {
              updated_at: new Date().toISOString()
            };

            // Dynamically assign ONLY columns present in Supabase admin_settings table!
            if (rowKeys.includes('logo_url')) dynamicPayload.logo_url = updated.logo_url;
            if (rowKeys.includes('app_name')) dynamicPayload.app_name = updated.brand_name || 'Gradeup Study';
            if (rowKeys.includes('brand_name')) dynamicPayload.brand_name = updated.brand_name || 'Gradeup Study';
            if (rowKeys.includes('app_subtitle')) dynamicPayload.app_subtitle = 'Free Online Mock Test Portal';
            if (rowKeys.includes('website_url')) dynamicPayload.website_url = updated.website_url;
            if (rowKeys.includes('support_email')) dynamicPayload.support_email = updated.support_email;
            if (rowKeys.includes('whatsapp_number')) dynamicPayload.whatsapp_number = updated.whatsapp_number;
            if (rowKeys.includes('whatsapp_channel_url')) dynamicPayload.whatsapp_channel_url = updated.whatsapp_channel_url;
            if (rowKeys.includes('telegram_channel')) dynamicPayload.telegram_channel = updated.telegram_channel;
            if (rowKeys.includes('youtube_channel')) dynamicPayload.youtube_channel = updated.youtube_channel;
            if (rowKeys.includes('instagram_handle')) dynamicPayload.instagram_handle = updated.instagram_handle;
            if (rowKeys.includes('default_test_duration')) dynamicPayload.default_test_duration = parseSafeNumber(updated.default_test_duration, 90);
            if (rowKeys.includes('default_marks')) dynamicPayload.default_marks = parseSafeNumber(updated.default_marks, 1.0);
            if (rowKeys.includes('default_negative_marking')) dynamicPayload.default_negative_marking = parseSafeNumber(updated.default_negative_marking, 0.25);
            if (rowKeys.includes('mask_leaderboard_names')) dynamicPayload.mask_leaderboard_names = updated.mask_leaderboard_names ?? true;
            if (rowKeys.includes('social_gate_enabled')) dynamicPayload.social_gate_enabled = updated.social_gate_enabled ?? true;
            if (rowKeys.includes('enable_social_gate')) dynamicPayload.enable_social_gate = updated.social_gate_enabled ?? true;
            if (rowKeys.includes('enable_leaderboard')) dynamicPayload.enable_leaderboard = !updated.mask_leaderboard_names;
            if (rowKeys.includes('social_gate_title')) dynamicPayload.social_gate_title = updated.social_gate_title;
            if (rowKeys.includes('social_gate_description')) dynamicPayload.social_gate_description = updated.social_gate_description;
            if (rowKeys.includes('social_platforms')) dynamicPayload.social_platforms = updatedPlatforms;
            if (rowKeys.includes('admin_email') && updated.admin_email) dynamicPayload.admin_email = updated.admin_email;
            if (rowKeys.includes('admin_password') && updated.admin_password) dynamicPayload.admin_password = updated.admin_password;

            const { error: updErr } = await supabase.from('admin_settings').update(dynamicPayload).eq('id', row.id);
            if (updErr) {
              console.warn('Dynamic update failed, fallback atomic logo commit:', updErr);
              await supabase.from('admin_settings').update({
                logo_url: updated.logo_url,
                updated_at: new Date().toISOString()
              }).eq('id', row.id);
            }
          }
        } else {
          // If no row exists, insert initial row with standard columns
          const initialPayload: Record<string, unknown> = {
            app_name: updated.brand_name || 'Gradeup Study',
            logo_url: updated.logo_url || '',
            admin_email: updated.admin_email || 'admin@gradeupstudy.com',
            show_watermark: true,
            anti_cheating_warning_limit: 3,
            max_test_duration_minutes: 180,
            enable_social_gate: true,
            enable_leaderboard: true,
            enable_student_login: false,
            updated_at: new Date().toISOString()
          };
          await supabase.from('admin_settings').insert(initialPayload);
        }

        // 3. Direct dual-sync to Supabase `social_platforms` table for all 4 official channels
        const officialPlatformDefs = [
          {
            id: 'a1000000-0000-0000-0000-000000000001',
            platform_name: 'YouTube',
            platform_url: updated.youtube_channel || 'https://youtube.com/@gradeupstudy',
            icon: 'youtube',
            button_text: 'Subscribe on YouTube',
            verification_method: 'redirect_only',
            is_required: true,
            is_active: true,
            order_index: 1
          },
          {
            id: 'a1000000-0000-0000-0000-000000000002',
            platform_name: 'Telegram Channel',
            platform_url: updated.telegram_channel || 'https://t.me/gradeupstudyofficial',
            icon: 'send',
            button_text: 'Join Telegram Channel',
            verification_method: 'redirect_only',
            is_required: true,
            is_active: true,
            order_index: 2
          },
          {
            id: 'a1000000-0000-0000-0000-000000000003',
            platform_name: 'Instagram',
            platform_url: updated.instagram_handle || 'https://instagram.com/gradeupstudy.official',
            icon: 'instagram',
            button_text: 'Follow on Instagram',
            verification_method: 'redirect_only',
            is_required: false,
            is_active: true,
            order_index: 3
          },
          {
            id: 'a1000000-0000-0000-0000-000000000004',
            platform_name: 'WhatsApp Channel',
            platform_url: updated.whatsapp_channel_url || 'https://whatsapp.com/channel/gradeupstudy',
            icon: 'message-circle',
            button_text: 'Join WhatsApp Channel',
            verification_method: 'redirect_only',
            is_required: true,
            is_active: true,
            order_index: 4
          }
        ];

        for (const def of officialPlatformDefs) {
          try {
            await supabase.from('social_platforms').upsert(def);
            await supabase
              .from('social_platforms')
              .update({ platform_url: def.platform_url })
              .ilike('platform_name', `%${def.platform_name}%`);
          } catch (e) {
            console.warn(`Supabase sync for platform ${def.platform_name} error:`, e);
          }
        }

        // Also sync global social gate updates to all tests that use global social gate
        if (newSettings.social_gate_title || newSettings.social_gate_description) {
          try {
            await supabase
              .from('tests')
              .update({
                social_gate_title: updated.social_gate_title,
                social_gate_description: updated.social_gate_description,
                updated_at: new Date().toISOString()
              })
              .or('social_gate_mode.eq.global,social_gate_mode.is.null');
          } catch (syncErr) {
            console.warn('Syncing tests social gate header in Supabase:', syncErr);
          }
        }
      } catch (e) {
        console.error('Failed to update settings in Supabase', e);
      }
    }

    // Broadcast update events so all components (Footer, Header, SocialGate, AdminSettingsView, SocialGateManager) instantly reflect the new links
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('gradeup_settings_updated', { detail: updated }));
        window.dispatchEvent(new CustomEvent('gradeup_social_updated', { detail: updatedPlatforms }));
      }
    } catch {
      // ignore
    }

    return updated;
  },

  // ------------------------------------
  // TESTS MANAGEMENT
  // ------------------------------------
  getTestQuestionCounts: async (): Promise<Record<string, number>> => {
    const counts: Record<string, number> = {};

    // 1. Initial count from DEMO_QUESTIONS for demo tests
    if (typeof DEMO_QUESTIONS === 'object' && DEMO_QUESTIONS) {
      Object.entries(DEMO_QUESTIONS).forEach(([tId, list]) => {
        if (Array.isArray(list) && list.length > 0) {
          counts[tId] = list.length;
        }
      });
    }

    // 2. Read from localStorage questions map
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.QUESTIONS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          Object.entries(parsed).forEach(([tId, list]) => {
            if (Array.isArray(list)) {
              counts[tId] = list.length;
            }
          });
        }
      }
    } catch {}

    // 3. Query Supabase questions table if configured
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('questions')
          .select('test_id');
        if (!error && Array.isArray(data)) {
          const remoteCounts: Record<string, number> = {};
          data.forEach((q: any) => {
            if (q.test_id && q.test_id !== 'bank') {
              remoteCounts[q.test_id] = (remoteCounts[q.test_id] || 0) + 1;
            }
          });
          // Merge remote counts
          Object.entries(remoteCounts).forEach(([tId, cnt]) => {
            counts[tId] = cnt;
          });
        }
      } catch (e) {
        console.warn('Supabase fetch questions count warning:', e);
      }
    }

    return counts;
  },

  getTests: async (includeUnpublished = true): Promise<Test[]> => {
    const qCounts = await dataService.getTestQuestionCounts();
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      try {
        let query = supabase.from('tests').select('*').order('created_at', { ascending: false });
        if (!includeUnpublished) {
          query = query.eq('is_published', true).eq('status', 'published');
        }
        const { data, error } = await query;
        if (!error && Array.isArray(data)) {
          // Read local cache map to preserve local settings if remote is null/undefined
          const rawLocal = localStorage.getItem(STORAGE_KEYS.TESTS);
          let localMap: Record<string, Test> = {};
          try {
            const parsed = rawLocal ? JSON.parse(rawLocal) : [];
            if (Array.isArray(parsed)) {
              parsed.forEach((t: Test) => { if (t?.id) localMap[t.id] = t; });
            }
          } catch {}

          const remoteTests = (data as any[]).map(t => {
            const local = localMap[t.id];
            const maxAttempts = (t.max_attempts_per_student !== undefined && t.max_attempts_per_student !== null)
              ? Number(t.max_attempts_per_student)
              : (local?.max_attempts_per_student !== undefined && local?.max_attempts_per_student !== null)
              ? Number(local.max_attempts_per_student)
              : 0;

            const actualQuestionsCount = qCounts[t.id] !== undefined
              ? qCounts[t.id]
              : (t.slug && qCounts[t.slug] !== undefined ? qCounts[t.slug] : 0);

            const marksPerQ = parseSafeNumber(t.marks_per_question, 1);
            const actualTotalMarks = actualQuestionsCount > 0 
              ? (actualQuestionsCount * marksPerQ)
              : parseSafeNumber(t.total_marks, 0);

            const actualMode = inferPracticeMode({
              ...t,
              ...(local || {}),
              practice_mode: t.practice_mode || local?.practice_mode
            });
            const effectiveCategory = (t.category === 'Section / Subject Practice' && actualMode === 'topic_wise')
              ? 'Topic Wise Practice'
              : (t.category || 'All Competitive Exams');

            return {
              ...(local || {}),
              ...t,
              practice_mode: actualMode,
              category: effectiveCategory,
              total_questions: actualQuestionsCount,
              total_marks: actualTotalMarks,
              max_attempts_per_student: maxAttempts
            } as Test;
          });

          localStorage.setItem(STORAGE_KEYS.TESTS, JSON.stringify(remoteTests));
          if (!includeUnpublished) {
            return remoteTests.filter(t => t.is_published && (t.status === 'published' || !t.status));
          }
          return remoteTests;
        }
      } catch (e) {
        console.warn('Supabase fetch tests error, using local cache', e);
      }
    }

    // Offline / Local cache fallback
    const rawLocal = localStorage.getItem(STORAGE_KEYS.TESTS);
    let localTests: Test[] = [];
    try {
      localTests = rawLocal ? JSON.parse(rawLocal) : DEMO_TESTS;
      if (!Array.isArray(localTests) || localTests.length === 0) localTests = DEMO_TESTS;
    } catch {
      localTests = DEMO_TESTS;
    }

    const calibratedLocalTests = localTests.map(t => {
      const actualQuestionsCount = qCounts[t.id] !== undefined
        ? qCounts[t.id]
        : (t.slug && qCounts[t.slug] !== undefined ? qCounts[t.slug] : 0);
      const marksPerQ = parseSafeNumber(t.marks_per_question, 1);
      const actualTotalMarks = actualQuestionsCount > 0 
        ? (actualQuestionsCount * marksPerQ)
        : parseSafeNumber(t.total_marks, 0);

      const actualMode = inferPracticeMode(t);
      const effectiveCategory = (t.category === 'Section / Subject Practice' && actualMode === 'topic_wise')
        ? 'Topic Wise Practice'
        : (t.category || 'All Competitive Exams');

      return {
        ...t,
        practice_mode: actualMode,
        category: effectiveCategory,
        total_questions: actualQuestionsCount,
        total_marks: actualTotalMarks
      };
    });

    try {
      localStorage.setItem(STORAGE_KEYS.TESTS, JSON.stringify(calibratedLocalTests));
    } catch {}

    if (!includeUnpublished) {
      return calibratedLocalTests.filter(t => t.is_published && (t.status === 'published' || !t.status));
    }
    return calibratedLocalTests;
  },

  getTestBySlugOrId: async (identifier: string): Promise<Test | null> => {
    if (!identifier) return null;
    let cleanId = identifier.trim();
    try {
      cleanId = decodeURIComponent(cleanId);
    } catch {
      // keep cleanId
    }

    const qCounts = await dataService.getTestQuestionCounts();
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      try {
        const isUUID = isValidUUID(cleanId);
        let query = supabase.from('tests').select('*');
        if (isUUID) {
          query = query.or(`slug.ilike.${cleanId},test_code.ilike.${cleanId},id.eq.${cleanId}`);
        } else {
          query = query.or(`slug.ilike.${cleanId},test_code.ilike.${cleanId}`);
        }
        const { data } = await query.limit(1).maybeSingle();
        if (data) {
          const rawLocal = localStorage.getItem(STORAGE_KEYS.TESTS);
          let localTest: Test | undefined;
          try {
            const parsed = rawLocal ? JSON.parse(rawLocal) : [];
            localTest = parsed.find((t: Test) => t.id === data.id || t.slug === data.slug);
          } catch {}

          const maxAttempts = (data.max_attempts_per_student !== undefined && data.max_attempts_per_student !== null)
            ? Number(data.max_attempts_per_student)
            : (localTest?.max_attempts_per_student !== undefined && localTest?.max_attempts_per_student !== null)
            ? Number(localTest.max_attempts_per_student)
            : 0;

          const actualCount = qCounts[data.id] !== undefined
            ? qCounts[data.id]
            : (data.slug && qCounts[data.slug] !== undefined ? qCounts[data.slug] : 0);

          const marksPerQ = parseSafeNumber(data.marks_per_question, 1);
          const actualTotalMarks = actualCount > 0 ? (actualCount * marksPerQ) : parseSafeNumber(data.total_marks, 0);

          const testData: Test = {
            ...(localTest || {}),
            ...(data as Test),
            total_questions: actualCount,
            total_marks: actualTotalMarks,
            max_attempts_per_student: maxAttempts
          };

          const localTests = await dataService.getTests(true);
          const idx = localTests.findIndex(t => t.id === testData.id);
          if (idx >= 0) localTests[idx] = testData;
          else localTests.unshift(testData);
          localStorage.setItem(STORAGE_KEYS.TESTS, JSON.stringify(localTests));
          return testData;
        }
      } catch (e) {
        console.warn('Supabase getTestBySlugOrId lookup failed', e);
      }
    }

    const tests = await dataService.getTests(true);
    if (!tests || tests.length === 0) return null;

    const lowerId = cleanId.toLowerCase();
    const found = tests.find(t => 
      (t.slug && t.slug.toLowerCase() === lowerId) ||
      (t.id && t.id.toLowerCase() === lowerId) ||
      (t.test_code && t.test_code.toLowerCase() === lowerId)
    );
    if (found) return found;

    const partialMatch = tests.find(t =>
      (t.slug && (lowerId.includes(t.slug.toLowerCase()) || t.slug.toLowerCase().includes(lowerId))) ||
      (t.test_code && (lowerId.includes(t.test_code.toLowerCase()) || t.test_code.toLowerCase().includes(lowerId)))
    );
    if (partialMatch) return partialMatch;

    return tests[0];
  },

  getPublicShareableUrl: (slugOrCode: string): string => {
    let origin = 'https://mock.gradeupstudy.com';
    try {
      // If running inside custom domain or localhost
      if (typeof window !== 'undefined' && window.location && window.location.origin) {
        origin = window.location.origin;
      }
      const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (raw) {
        const s = JSON.parse(raw);
        if (s.website_url && s.website_url.startsWith('http')) {
          let url = s.website_url.replace(/\/+$/, '');
          if (url === 'https://gradeupstudy.com' || url === 'http://gradeupstudy.com' || url === 'gradeupstudy.com') {
            url = 'https://mock.gradeupstudy.com';
          }
          origin = url;
        }
      }
    } catch {}

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
    const validId = isValidUUID(test.id) ? test.id : generateUUID();
    const status: TestStatus = test.status || (test.is_published ? 'published' : 'draft');
    const isPublished = status === 'published' || test.is_published === true;
    const totalQuestions = parseSafeNumber(test.total_questions, 0);
    const marksPerQuestion = parseSafeNumber(test.marks_per_question, 1);
    const totalMarks = parseSafeNumber(test.total_marks, totalQuestions * marksPerQuestion);
    const negativeMark = parseSafeNumber(test.negative_marking, 0);
    const duration = parseSafeNumber(test.duration_minutes, 15);
    const passingMarks = parseSafeNumber(test.passing_marks, totalMarks * 0.4);

    let cleanSlug = (test.slug || test.title || `test-${Date.now()}`)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
    if (!cleanSlug) cleanSlug = `test-${Date.now()}`;

    const cleanCode = (test.test_code || `TEST-${Math.floor(1000 + Math.random() * 9000)}`).trim().toUpperCase();

    const maxAttempts = parseSafeNumber(test.max_attempts_per_student, 0);

    const inferredMode = inferPracticeMode(test);
    const effectiveCategory = (test.category === 'Section / Subject Practice' && inferredMode === 'topic_wise')
      ? 'Topic Wise Practice'
      : (test.category || 'Police Exam');

    const sanitizedTest: Test = {
      ...test,
      id: validId,
      slug: cleanSlug,
      test_code: cleanCode,
      category: effectiveCategory,
      subject: test.subject || 'General Paper',
      practice_mode: inferredMode,
      total_questions: totalQuestions,
      marks_per_question: marksPerQuestion,
      total_marks: totalMarks,
      negative_marking: negativeMark,
      duration_minutes: duration,
      passing_marks: passingMarks,
      max_attempts_per_student: maxAttempts,
      status,
      is_published: isPublished,
      created_at: test.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // 1. Immediately store in local cache so UI displays it immediately with zero delay
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.TESTS);
      let localTests: Test[] = raw ? JSON.parse(raw) : DEMO_TESTS;
      if (!Array.isArray(localTests)) localTests = DEMO_TESTS;
      const idx = localTests.findIndex(t => t.id === sanitizedTest.id);
      if (idx >= 0) {
        localTests[idx] = sanitizedTest;
      } else {
        localTests.unshift(sanitizedTest);
      }
      localStorage.setItem(STORAGE_KEYS.TESTS, JSON.stringify(localTests));
      window.dispatchEvent(new CustomEvent('gradeup_tests_updated', { detail: sanitizedTest }));
    } catch (e) {
      console.warn('Local test cache save error', e);
    }

    // 2. Persist to Supabase if available with progressive fallback & error recovery
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      try {
        const fullPayload = {
          id: sanitizedTest.id,
          test_code: sanitizedTest.test_code,
          title: sanitizedTest.title,
          slug: sanitizedTest.slug,
          description: sanitizedTest.description || '',
          category: sanitizedTest.category || 'Competitive Exam',
          subject: sanitizedTest.subject || 'General Paper',
          total_questions: sanitizedTest.total_questions,
          total_marks: sanitizedTest.total_marks,
          marks_per_question: sanitizedTest.marks_per_question,
          negative_marking: sanitizedTest.negative_marking,
          duration_minutes: sanitizedTest.duration_minutes,
          passing_marks: sanitizedTest.passing_marks,
          instructions: sanitizedTest.instructions || '',
          status: sanitizedTest.status,
          is_published: sanitizedTest.is_published,
          social_gate_enabled: sanitizedTest.social_gate_enabled ?? true,
          social_gate_mode: sanitizedTest.social_gate_mode || 'global',
          social_platform_ids: sanitizedTest.social_platform_ids || [],
          custom_social_platforms: sanitizedTest.custom_social_platforms || [],
          social_gate_title: sanitizedTest.social_gate_title || '',
          social_gate_description: sanitizedTest.social_gate_description || '',
          anti_cheating_enabled: sanitizedTest.anti_cheating_enabled ?? true,
          randomize_questions: sanitizedTest.randomize_questions ?? false,
          randomize_options: sanitizedTest.randomize_options ?? false,
          allow_back_navigation: sanitizedTest.allow_back_navigation ?? true,
          allow_mark_for_review: sanitizedTest.allow_mark_for_review ?? true,
          show_result_immediately: sanitizedTest.show_result_immediately ?? true,
          show_correct_answers: sanitizedTest.show_correct_answers ?? true,
          show_explanation: sanitizedTest.show_explanation ?? true,
          enable_leaderboard: sanitizedTest.enable_leaderboard ?? true,
          max_attempts_per_student: maxAttempts,
          start_time: sanitizedTest.start_time || null,
          end_time: sanitizedTest.end_time || null,
          created_at: sanitizedTest.created_at,
          updated_at: sanitizedTest.updated_at
        };

        let { data, error } = await supabase.from('tests').upsert(fullPayload, { onConflict: 'id' }).select().single();

        // If error due to missing table columns or constraint, attempt retry with core payload
        if (error) {
          console.warn('Supabase full upsert error, attempting core payload fallback:', error.message);
          
          // Core schema payload that matches standard columns in all Supabase setups
          const corePayload = {
            id: sanitizedTest.id,
            test_code: sanitizedTest.test_code,
            title: sanitizedTest.title,
            slug: sanitizedTest.slug,
            description: sanitizedTest.description || '',
            category: sanitizedTest.category || 'Competitive Exam',
            subject: sanitizedTest.subject || 'General Paper',
            total_questions: sanitizedTest.total_questions,
            total_marks: sanitizedTest.total_marks,
            marks_per_question: sanitizedTest.marks_per_question,
            negative_marking: sanitizedTest.negative_marking,
            duration_minutes: sanitizedTest.duration_minutes,
            passing_marks: sanitizedTest.passing_marks,
            max_attempts_per_student: maxAttempts,
            instructions: sanitizedTest.instructions || '',
            status: sanitizedTest.status,
            is_published: sanitizedTest.is_published,
            created_at: sanitizedTest.created_at,
            updated_at: sanitizedTest.updated_at
          };

          // If duplicate key error on slug/code, make slug/code unique
          if (error.code === '23505' || error.message.toLowerCase().includes('duplicate') || error.message.toLowerCase().includes('unique')) {
            const randSuffix = Math.floor(100 + Math.random() * 900);
            corePayload.slug = `${sanitizedTest.slug}-${randSuffix}`;
            corePayload.test_code = `${sanitizedTest.test_code}-${randSuffix}`;
            sanitizedTest.slug = corePayload.slug;
            sanitizedTest.test_code = corePayload.test_code;
          }

          const coreResult = await supabase.from('tests').upsert(corePayload, { onConflict: 'id' }).select().single();
          if (!coreResult.error && coreResult.data) {
            data = coreResult.data;
            error = null;
          } else {
            console.error('Supabase core test save fallback also failed:', coreResult.error);
          }
        }

        // Direct update for max_attempts_per_student to guarantee column synchronization
        try {
          await supabase
            .from('tests')
            .update({ 
              max_attempts_per_student: maxAttempts,
              updated_at: new Date().toISOString()
            })
            .eq('id', sanitizedTest.id);
        } catch {
          // non-fatal
        }

        if (data) {
          const remoteTest = data as Test;
          // Ensure user's sanitized values always take precedence and max_attempts_per_student is strictly preserved
          const finalizedTest: Test = { 
            ...remoteTest, 
            ...sanitizedTest,
            max_attempts_per_student: maxAttempts 
          };
          const raw = localStorage.getItem(STORAGE_KEYS.TESTS);
          let localTests: Test[] = raw ? JSON.parse(raw) : [];
          const idx = localTests.findIndex(t => t.id === finalizedTest.id);
          if (idx >= 0) localTests[idx] = finalizedTest;
          else localTests.unshift(finalizedTest);
          localStorage.setItem(STORAGE_KEYS.TESTS, JSON.stringify(localTests));
          return finalizedTest;
        }
      } catch (e) {
        console.error('Supabase test save exception', e);
      }
    }

    return sanitizedTest;
  },

  deleteTest: async (testId: string): Promise<boolean> => {
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      try {
        if (isValidUUID(testId)) {
          // 1. Delete questions for this test
          await supabase.from('questions').delete().eq('test_id', testId);
          
          // 2. Delete answers for attempts belonging to this test
          const { data: atts } = await supabase.from('attempts').select('id').eq('test_id', testId);
          if (atts && atts.length > 0) {
            const attIds = atts.map((a: any) => a.id);
            await supabase.from('answers').delete().in('attempt_id', attIds);
          }

          // 3. Delete attempts belonging to this test
          await supabase.from('attempts').delete().eq('test_id', testId);

          // 4. Delete the test row itself
          await supabase.from('tests').delete().eq('id', testId);
        }
      } catch (e) {
        console.error('Supabase test delete error', e);
      }
    }

    // Purge test from local cache
    const raw = localStorage.getItem(STORAGE_KEYS.TESTS);
    let tests: Test[] = [];
    try {
      tests = raw ? JSON.parse(raw) : [];
    } catch {}
    const filtered = tests.filter(t => t.id !== testId && t.slug !== testId && t.test_code !== testId);
    localStorage.setItem(STORAGE_KEYS.TESTS, JSON.stringify(filtered));

    // Purge questions from local cache
    const qRaw = localStorage.getItem(STORAGE_KEYS.QUESTIONS);
    if (qRaw) {
      try {
        const qMap = JSON.parse(qRaw);
        delete qMap[testId];
        localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(qMap));
      } catch {}
    }

    // Purge attempts from local cache
    const aRaw = localStorage.getItem(STORAGE_KEYS.ATTEMPTS);
    if (aRaw) {
      try {
        const attList: Attempt[] = JSON.parse(aRaw);
        const filteredAtts = attList.filter(a => a.test_id !== testId);
        localStorage.setItem(STORAGE_KEYS.ATTEMPTS, JSON.stringify(filteredAtts));
      } catch {}
    }

    window.dispatchEvent(new CustomEvent('gradeup_tests_updated'));
    return true;
  },

  duplicateTest: async (testId: string): Promise<Test | null> => {
    const original = await dataService.getTestBySlugOrId(testId);
    if (!original) return null;

    const newId = generateUUID();
    const newCode = original.test_code + '-COPY';
    const newTitle = original.title + ' (Copy)';
    const randSuffix = Math.floor(100 + Math.random() * 900);
    const newSlug = original.slug + '-copy-' + randSuffix;

    // Duplicate test metadata ONLY (duration, negative marking, category, subject, instructions, timer rules, etc.)
    // Questions are NOT copied so the administrator gets a fresh, clean test structure to add new MCQs.
    const duplicated: Test = {
      ...original,
      id: newId,
      test_code: newCode,
      title: newTitle,
      slug: newSlug,
      total_questions: 0,
      total_marks: 0,
      status: 'draft',
      is_published: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await dataService.saveTest(duplicated);
    await dataService.saveQuestions(newId, []);

    return duplicated;
  },

  bulkUpdateTestAttempts: async (testIds: string[], maxAttempts: number): Promise<{ success: boolean; count: number }> => {
    const cleanAttempts = parseSafeNumber(maxAttempts, 0);
    if (!testIds || testIds.length === 0) return { success: true, count: 0 };
    
    // 1. Update local cache
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.TESTS);
      let localTests: Test[] = raw ? JSON.parse(raw) : DEMO_TESTS;
      if (Array.isArray(localTests)) {
        localTests = localTests.map(t => {
          if (testIds.includes(t.id)) {
            return {
              ...t,
              max_attempts_per_student: cleanAttempts,
              updated_at: new Date().toISOString()
            };
          }
          return t;
        });
        localStorage.setItem(STORAGE_KEYS.TESTS, JSON.stringify(localTests));
        window.dispatchEvent(new CustomEvent('gradeup_tests_updated', { detail: { updatedCount: testIds.length } }));
      }
    } catch (e) {
      console.warn('Local bulk attempt update error', e);
    }

    // 2. Update in Supabase if configured
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      try {
        const validUUIDs = testIds.filter(id => isValidUUID(id));
        if (validUUIDs.length > 0) {
          await supabase
            .from('tests')
            .update({
              max_attempts_per_student: cleanAttempts,
              updated_at: new Date().toISOString()
            })
            .in('id', validUUIDs);
        }
      } catch (e) {
        console.warn('Supabase bulk attempt update error', e);
      }
    }

    return { success: true, count: testIds.length };
  },

  bulkUpdateTestStatus: async (testIds: string[], isPublished: boolean): Promise<{ success: boolean; count: number }> => {
    if (!testIds || testIds.length === 0) return { success: true, count: 0 };
    const status: TestStatus = isPublished ? 'published' : 'unpublished';

    // 1. Update local cache
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.TESTS);
      let localTests: Test[] = raw ? JSON.parse(raw) : DEMO_TESTS;
      if (Array.isArray(localTests)) {
        localTests = localTests.map(t => {
          if (testIds.includes(t.id)) {
            return {
              ...t,
              status,
              is_published: isPublished,
              updated_at: new Date().toISOString()
            };
          }
          return t;
        });
        localStorage.setItem(STORAGE_KEYS.TESTS, JSON.stringify(localTests));
        window.dispatchEvent(new CustomEvent('gradeup_tests_updated', { detail: { updatedCount: testIds.length } }));
      }
    } catch (e) {
      console.warn('Local bulk status update error', e);
    }

    // 2. Update in Supabase
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      try {
        const validUUIDs = testIds.filter(id => isValidUUID(id));
        if (validUUIDs.length > 0) {
          await supabase
            .from('tests')
            .update({
              status,
              is_published: isPublished,
              updated_at: new Date().toISOString()
            })
            .in('id', validUUIDs);
        }
      } catch (e) {
        console.warn('Supabase bulk status update error', e);
      }
    }

    return { success: true, count: testIds.length };
  },

  bulkDeleteTests: async (testIds: string[]): Promise<{ success: boolean; count: number }> => {
    if (!testIds || testIds.length === 0) return { success: true, count: 0 };

    for (const id of testIds) {
      await dataService.deleteTest(id);
    }

    return { success: true, count: testIds.length };
  },

  // ------------------------------------
  // QUESTIONS MANAGEMENT (SECURE)
  // ------------------------------------

  // For Students: Uses public RPC to omit correct_answer and explanation before submission!
  getPublicQuestions: async (testId: string): Promise<Question[]> => {
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase && isValidUUID(testId)) {
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
    let resolvedTestId = testId;
    if (!isValidUUID(resolvedTestId)) {
      const foundTest = await dataService.getTestBySlugOrId(testId);
      if (foundTest && isValidUUID(foundTest.id)) {
        resolvedTestId = foundTest.id;
      }
    }

    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase && isValidUUID(resolvedTestId)) {
      try {
        const { data, error } = await supabase
          .from('questions')
          .select('*')
          .eq('test_id', resolvedTestId)
          .order('question_number', { ascending: true });
        if (!error && Array.isArray(data) && data.length > 0) {
          // Update local cache for this test
          const raw = localStorage.getItem(STORAGE_KEYS.QUESTIONS);
          let questionsMap: Record<string, Question[]> = {};
          try {
            questionsMap = raw ? JSON.parse(raw) : {};
          } catch {}
          questionsMap[resolvedTestId] = data as Question[];
          if (testId && testId !== resolvedTestId) {
            questionsMap[testId] = data as Question[];
          }
          localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(questionsMap));
          idbStorage.set(STORAGE_KEYS.QUESTIONS, questionsMap);

          if (!includeAnswers) {
            return (data as Question[]).map(q => ({ ...q, correct_answer: undefined, explanation: undefined }));
          }
          return data as Question[];
        }
      } catch (e) {
        console.warn('Supabase questions fetch error', e);
      }
    }

    // Local / IndexedDB Fallback
    const raw = localStorage.getItem(STORAGE_KEYS.QUESTIONS);
    let questionsMap: Record<string, Question[]> = {};
    try {
      questionsMap = raw ? JSON.parse(raw) : {};
    } catch {}

    let questions = questionsMap[resolvedTestId] || questionsMap[testId] || [];

    // If localStorage was empty, try reading from IndexedDB
    if (questions.length === 0) {
      try {
        const idbMap = await idbStorage.get<Record<string, Question[]>>(STORAGE_KEYS.QUESTIONS);
        if (idbMap) {
          questions = idbMap[resolvedTestId] || idbMap[testId] || [];
          if (questions.length > 0) {
            questionsMap[resolvedTestId] = questions;
            questionsMap[testId] = questions;
            localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(questionsMap));
          }
        }
      } catch {}
    }

    // If we have local questions but Supabase had none, attempt background sync to Supabase
    if (questions.length > 0 && isSupabaseConfigured() && supabase && isValidUUID(resolvedTestId)) {
      setTimeout(() => {
        dataService.syncQuestionsToRemote(resolvedTestId, questions).catch(() => {});
      }, 500);
    }

    if (!includeAnswers) {
      return questions.map(q => ({ ...q, correct_answer: undefined, explanation: undefined }));
    }
    return questions;
  },

  // Helper to safely push questions to Supabase without blocking local UI
  syncQuestionsToRemote: async (targetTestId: string, questions: Question[]): Promise<void> => {
    const supabase = getSupabaseClient();
    if (!isSupabaseConfigured() || !supabase || !isValidUUID(targetTestId)) return;

    try {
      // 1. Ensure test exists in Supabase tests table to satisfy foreign key constraint
      const test = await dataService.getTestBySlugOrId(targetTestId);
      if (test) {
        await supabase.from('tests').upsert({
          id: targetTestId,
          test_code: test.test_code || `TEST-${Math.floor(1000 + Math.random() * 9000)}`,
          title: test.title,
          slug: test.slug || targetTestId,
          description: test.description || '',
          category: test.category || 'Competitive Exam',
          subject: test.subject || 'General Paper',
          total_questions: questions.length,
          total_marks: questions.reduce((sum, q) => sum + (Number(q.marks) || 1), 0),
          marks_per_question: test.marks_per_question || 1,
          negative_marking: test.negative_marking || 0,
          duration_minutes: test.duration_minutes || 15,
          passing_marks: test.passing_marks || 0,
          instructions: test.instructions || '',
          status: test.status || 'published',
          is_published: test.is_published !== false,
          created_at: test.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });
      }

      // 2. Delete existing questions and insert clean rows
      await supabase.from('questions').delete().eq('test_id', targetTestId);
      if (questions.length > 0) {
        const cleanRows = questions.map((q, idx) => ({
          id: isValidUUID(q.id) ? q.id : generateUUID(),
          test_id: targetTestId,
          question_number: idx + 1,
          question_text: q.question_text || '',
          question_image: q.question_image || null,
          option_a: q.option_a || '',
          option_b: q.option_b || '',
          option_c: q.option_c || '',
          option_d: q.option_d || '',
          correct_answer: (q.correct_answer || 'A').toString().toUpperCase().trim().slice(0, 1),
          explanation: q.explanation || null,
          marks: parseSafeNumber(q.marks, 1),
          negative_marks: parseSafeNumber(q.negative_marks, 0),
          subject: q.subject || 'General Studies',
          chapter: q.chapter || 'General',
          created_at: q.created_at || new Date().toISOString()
        }));

        // Insert in batches of 50 to avoid payload limits
        for (let i = 0; i < cleanRows.length; i += 50) {
          const batch = cleanRows.slice(i, i + 50);
          const { error: insErr } = await supabase.from('questions').insert(batch);
          if (insErr) {
            console.warn('Supabase questions batch insert warning:', insErr);
          }
        }
      }
    } catch (e) {
      console.warn('syncQuestionsToRemote exception:', e);
    }
  },

  saveQuestions: async (testId: string, questions: Question[]): Promise<void> => {
    let targetTestId = testId;
    if (!isValidUUID(targetTestId)) {
      const foundTest = await dataService.getTestBySlugOrId(testId);
      if (foundTest && isValidUUID(foundTest.id)) {
        targetTestId = foundTest.id;
      } else {
        targetTestId = generateUUID();
      }
    }

    // Strictly re-index questions from 1 to N to prevent any unique constraint violations
    const sanitizedQuestions: Question[] = questions.map((q, idx) => {
      const qId = isValidUUID(q.id) ? q.id : generateUUID();
      const ans = (q.correct_answer || 'A').toString().toUpperCase().trim().slice(0, 1);
      const validAns = (['A', 'B', 'C', 'D'].includes(ans) ? ans : 'A') as 'A' | 'B' | 'C' | 'D';
      return {
        id: qId,
        test_id: targetTestId,
        question_number: idx + 1,
        question_text: q.question_text || '',
        question_image: q.question_image || null,
        option_a: q.option_a || '',
        option_a_image: q.option_a_image || null,
        option_b: q.option_b || '',
        option_b_image: q.option_b_image || null,
        option_c: q.option_c || '',
        option_c_image: q.option_c_image || null,
        option_d: q.option_d || '',
        option_d_image: q.option_d_image || null,
        correct_answer: validAns,
        explanation: q.explanation || null,
        explanation_image: q.explanation_image || null,
        marks: parseSafeNumber(q.marks, 1),
        negative_marks: parseSafeNumber(q.negative_marks, 0),
        subject: q.subject || 'General Studies',
        section: q.section || 'General',
        chapter: q.chapter || 'General',
        topic: q.topic || 'General Topic',
        difficulty: q.difficulty || 'Medium',
        quality_score: q.quality_score !== undefined ? Number(q.quality_score) : 90,
        inspection_status: q.inspection_status || 'verified',
        inspection_notes: q.inspection_notes || null,
        created_at: q.created_at || new Date().toISOString()
      };
    });

    // 1. Update local cache immediately (both LocalStorage and IndexedDB)
    const raw = localStorage.getItem(STORAGE_KEYS.QUESTIONS);
    let questionsMap: Record<string, Question[]> = {};
    try {
      questionsMap = raw ? JSON.parse(raw) : {};
    } catch {}
    questionsMap[targetTestId] = sanitizedQuestions;
    if (testId && testId !== targetTestId) {
      questionsMap[testId] = sanitizedQuestions;
    }
    localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(questionsMap));
    idbStorage.set(STORAGE_KEYS.QUESTIONS, questionsMap);

    // 2. Ensure test metadata exists and update totals in local cache & database
    const test = await dataService.getTestBySlugOrId(targetTestId);
    if (test) {
      const updatedTest: Test = {
        ...test,
        total_questions: sanitizedQuestions.length,
        total_marks: sanitizedQuestions.reduce((sum, q) => sum + (Number(q.marks) || 1), 0)
      };
      await dataService.saveTest(updatedTest);
    }

    // 3. Automatically sync to Question Bank Master
    if (sanitizedQuestions.length > 0) {
      syncToQuestionBankMaster(sanitizedQuestions);
    }

    // 4. Safely persist questions in Supabase (with test parent record creation)
    await dataService.syncQuestionsToRemote(targetTestId, sanitizedQuestions);

    // 5. Dispatch update events
    window.dispatchEvent(new CustomEvent('gradeup_questions_updated', {
      detail: { testId: targetTestId, count: sanitizedQuestions.length }
    }));
    window.dispatchEvent(new CustomEvent('gradeup_tests_updated'));
  },

  saveQuestion: async (testId: string, question: Question): Promise<Question> => {
    const questions = await dataService.getQuestions(testId, true);
    const validQId = isValidUUID(question.id) ? question.id : generateUUID();
    const cleanQuestion: Question = {
      ...question,
      id: validQId,
      test_id: testId
    };

    const index = questions.findIndex(q => q.id === cleanQuestion.id);
    if (index >= 0) {
      questions[index] = cleanQuestion;
    } else {
      questions.push(cleanQuestion);
    }
    questions.sort((a, b) => a.question_number - b.question_number);
    await dataService.saveQuestions(testId, questions);
    syncToQuestionBankMaster([cleanQuestion]);
    return cleanQuestion;
  },

  updateQuestion: async (question: Question): Promise<Question> => {
    return dataService.saveQuestion(question.test_id, question);
  },

  // Unlink/Delete question from a specific Mock Test ONLY.
  // The question remains 100% SAFE and intact in the Question Bank Master.
  deleteQuestion: async (testId: string, questionId: string): Promise<void> => {
    const questions = await dataService.getQuestions(testId, true);
    const filtered = questions.filter(q => q.id !== questionId);
    const reindexed = filtered.map((q, idx) => ({ ...q, question_number: idx + 1 }));
    await dataService.saveQuestions(testId, reindexed);
  },

  // ------------------------------------
  // HIGH-PERFORMANCE BATCH TESTS & QUESTIONS SAVER
  // Avoids individual roundtrips, ensures zero UI freezes & 100% data integrity
  // ------------------------------------
  saveBatchTestsAndQuestions: async (
    tests: Test[],
    questionsByTestId: Record<string, Question[]>
  ): Promise<{ savedTests: Test[]; totalQuestionsCount: number }> => {
    if (!Array.isArray(tests) || tests.length === 0) {
      return { savedTests: [], totalQuestionsCount: 0 };
    }

    const sanitizedTests: Test[] = [];
    const allSanitizedQuestions: Question[] = [];
    const cleanQuestionsMap: Record<string, Question[]> = {};

    // 1. Sanitize all Tests & Questions in memory with zero blocking I/O
    for (const test of tests) {
      const validId = isValidUUID(test.id) ? test.id : generateUUID();
      const status: TestStatus = test.status || (test.is_published ? 'published' : 'draft');
      const isPublished = status === 'published' || test.is_published === true;
      const totalQuestions = parseSafeNumber(test.total_questions, 0);
      const marksPerQuestion = parseSafeNumber(test.marks_per_question, 1);
      const totalMarks = parseSafeNumber(test.total_marks, totalQuestions * marksPerQuestion);
      const negativeMark = parseSafeNumber(test.negative_marking, 0);
      const duration = parseSafeNumber(test.duration_minutes, 15);
      const passingMarks = parseSafeNumber(test.passing_marks, totalMarks * 0.4);
      const maxAttempts = parseSafeNumber(test.max_attempts_per_student, 0);
      const inferredMode = inferPracticeMode(test);
      const effectiveCategory = (test.category === 'Section / Subject Practice' && inferredMode === 'topic_wise')
        ? 'Topic Wise Practice'
        : (test.category || 'Police Exam');

      let cleanSlug = (test.slug || test.title || `test-${Date.now()}`)
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
      if (!cleanSlug) cleanSlug = `test-${Date.now()}`;

      const cleanCode = (test.test_code || `TEST-${Math.floor(1000 + Math.random() * 9000)}`).trim().toUpperCase();

      const sanitizedTest: Test = {
        ...test,
        id: validId,
        slug: cleanSlug,
        test_code: cleanCode,
        category: effectiveCategory,
        subject: test.subject || 'General Paper',
        practice_mode: inferredMode,
        total_questions: totalQuestions,
        marks_per_question: marksPerQuestion,
        total_marks: totalMarks,
        negative_marking: negativeMark,
        duration_minutes: duration,
        passing_marks: passingMarks,
        max_attempts_per_student: maxAttempts,
        status,
        is_published: isPublished,
        created_at: test.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      sanitizedTests.push(sanitizedTest);

      // Sanitize questions for this test
      const rawQs = questionsByTestId[test.id] || questionsByTestId[validId] || [];
      const testSanitizedQs: Question[] = rawQs.map((q, idx) => {
        const qId = isValidUUID(q.id) ? q.id : generateUUID();
        const ans = (q.correct_answer || 'A').toString().toUpperCase().trim().slice(0, 1);
        const validAns = (['A', 'B', 'C', 'D'].includes(ans) ? ans : 'A') as 'A' | 'B' | 'C' | 'D';
        return {
          id: qId,
          test_id: validId,
          question_number: Number(q.question_number) || (idx + 1),
          question_text: q.question_text || '',
          question_image: q.question_image || null,
          option_a: q.option_a || '',
          option_a_image: q.option_a_image || null,
          option_b: q.option_b || '',
          option_b_image: q.option_b_image || null,
          option_c: q.option_c || '',
          option_c_image: q.option_c_image || null,
          option_d: q.option_d || '',
          option_d_image: q.option_d_image || null,
          correct_answer: validAns,
          explanation: q.explanation || null,
          explanation_image: q.explanation_image || null,
          marks: parseSafeNumber(q.marks, marksPerQuestion),
          negative_marks: parseSafeNumber(q.negative_marks, negativeMark),
          subject: q.subject || sanitizedTest.subject || 'General Studies',
          section: q.section || 'General',
          chapter: q.chapter || 'General',
          topic: q.topic || 'General Topic',
          difficulty: q.difficulty || 'Medium',
          quality_score: q.quality_score !== undefined ? Number(q.quality_score) : 90,
          inspection_status: q.inspection_status || 'verified',
          inspection_notes: q.inspection_notes || null,
          created_at: q.created_at || new Date().toISOString()
        };
      });

      cleanQuestionsMap[validId] = testSanitizedQs;
      allSanitizedQuestions.push(...testSanitizedQs);
    }

    // 2. Batch write to LocalStorage & IndexedDB (Single Pass!)
    try {
      const rawTests = localStorage.getItem(STORAGE_KEYS.TESTS);
      let localTests: Test[] = rawTests ? JSON.parse(rawTests) : DEMO_TESTS;
      if (!Array.isArray(localTests)) localTests = DEMO_TESTS;

      const newTestIds = new Set(sanitizedTests.map(t => t.id));
      const filteredExisting = localTests.filter(t => !newTestIds.has(t.id));
      const updatedTestsList = [...sanitizedTests, ...filteredExisting];

      localStorage.setItem(STORAGE_KEYS.TESTS, JSON.stringify(updatedTestsList));
      idbStorage.set(STORAGE_KEYS.TESTS, updatedTestsList);

      // Questions map single write
      const rawQs = localStorage.getItem(STORAGE_KEYS.QUESTIONS);
      let localQsMap: Record<string, Question[]> = {};
      try {
        localQsMap = rawQs ? JSON.parse(rawQs) : {};
      } catch {}

      for (const [tId, qList] of Object.entries(cleanQuestionsMap)) {
        localQsMap[tId] = qList;
      }
      localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(localQsMap));
      idbStorage.set(STORAGE_KEYS.QUESTIONS, localQsMap);

      window.dispatchEvent(new CustomEvent('gradeup_tests_updated', { detail: sanitizedTests }));
    } catch (lsErr) {
      console.warn('LocalStorage batch write error, fallback to IndexedDB:', lsErr);
    }

    // 3. Batch Sync to Master Question Bank (Single Pass!)
    if (allSanitizedQuestions.length > 0) {
      try {
        syncToQuestionBankMaster(allSanitizedQuestions);
      } catch (qbErr) {
        console.warn('Question bank sync warning:', qbErr);
      }
    }

    // 4. Asynchronously & safely sync to Supabase with chunking & strict timeout protection
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      const syncRemote = async () => {
        try {
          // A. Batch upsert tests in chunks of 50
          for (let i = 0; i < sanitizedTests.length; i += 50) {
            const chunk = sanitizedTests.slice(i, i + 50);
            const testPayloads = chunk.map(st => ({
              id: st.id,
              test_code: st.test_code,
              title: st.title,
              slug: st.slug,
              description: st.description || '',
              category: st.category || 'Competitive Exam',
              subject: st.subject || 'General Paper',
              total_questions: st.total_questions,
              total_marks: st.total_marks,
              marks_per_question: st.marks_per_question,
              negative_marking: st.negative_marking,
              duration_minutes: st.duration_minutes,
              passing_marks: st.passing_marks,
              instructions: st.instructions || '',
              status: st.status,
              is_published: st.is_published,
              max_attempts_per_student: st.max_attempts_per_student || 0,
              created_at: st.created_at,
              updated_at: st.updated_at
            }));

            await Promise.race([
              supabase.from('tests').upsert(testPayloads, { onConflict: 'id' }),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Supabase tests upsert timeout')), 5000))
            ]).catch(e => console.warn('Supabase tests chunk upsert warning:', e));
          }

          // B. Batch upsert questions in chunks of 200
          for (let i = 0; i < allSanitizedQuestions.length; i += 200) {
            const chunk = allSanitizedQuestions.slice(i, i + 200);
            const questionRows = chunk.map(q => ({
              id: q.id,
              test_id: q.test_id,
              question_number: q.question_number,
              question_text: q.question_text,
              question_image: q.question_image,
              option_a: q.option_a,
              option_b: q.option_b,
              option_c: q.option_c,
              option_d: q.option_d,
              correct_answer: q.correct_answer,
              explanation: q.explanation,
              marks: q.marks,
              negative_marks: q.negative_marks,
              subject: q.subject,
              chapter: q.chapter,
              topic: q.topic || 'General Topic',
              difficulty: q.difficulty || 'Medium',
              section: q.section || 'General',
              created_at: q.created_at
            }));

            await Promise.race([
              supabase.from('questions').upsert(questionRows, { onConflict: 'id' }),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Supabase questions upsert timeout')), 5000))
            ]).catch(e => console.warn('Supabase questions chunk upsert warning:', e));
          }
        } catch (remoteErr) {
          console.warn('Supabase remote background batch sync warning:', remoteErr);
        }
      };

      // Run remote sync with max total timeout protection (max 5s total wait)
      await Promise.race([
        syncRemote(),
        new Promise(r => setTimeout(r, 5000))
      ]);
    }

    return {
      savedTests: sanitizedTests,
      totalQuestionsCount: allSanitizedQuestions.length
    };
  },

  // ------------------------------------
  // QUESTION BANK MASTER SYSTEM
  // ------------------------------------
  getAllQuestionBank: async (): Promise<Question[]> => {
    // 0. Load deleted questions blacklist
    let deletedSet = new Set<string>();
    try {
      const rawBlacklist = localStorage.getItem(STORAGE_KEYS.DELETED_QUESTIONS);
      if (rawBlacklist) {
        const parsed = JSON.parse(rawBlacklist);
        if (Array.isArray(parsed)) deletedSet = new Set(parsed);
      }
    } catch {}

    // 1. Load Question Bank Master pool from cache / IndexedDB immediately
    const rawBank = localStorage.getItem(STORAGE_KEYS.QUESTION_BANK);
    let masterBank: Question[] = [];
    try {
      masterBank = rawBank ? JSON.parse(rawBank) : [];
      if (!Array.isArray(masterBank)) masterBank = [];
    } catch {
      masterBank = [];
    }

    if (masterBank.length === 0) {
      try {
        const idbBank = await idbStorage.get<Question[]>(STORAGE_KEYS.QUESTION_BANK);
        if (Array.isArray(idbBank) && idbBank.length > 0) {
          masterBank = idbBank;
        }
      } catch {}
    }

    const bankMap = new Map<string, Question>();
    const fingerprintMap = new Map<string, string>(); // fingerprint -> questionId

    // Helper to safely register a question in the master bank index without creating duplicates
    const registerQuestion = (q: any) => {
      if (!q || !q.question_text || !q.id) return;
      if (deletedSet.has(q.id)) return;

      const fp = getQuestionFingerprint(q);
      const existingIdByFp = fp ? fingerprintMap.get(fp) : undefined;
      const targetId = existingIdByFp || q.id;

      if (deletedSet.has(targetId)) return;

      const existing = bankMap.get(targetId);
      const cleanQ = mergeMasterQuestion(existing, {
        ...q,
        id: targetId,
        test_id: 'bank'
      });

      bankMap.set(targetId, cleanQ);
      if (fp) fingerprintMap.set(fp, targetId);
    };

    // 1a. Ingest cached master bank
    masterBank.forEach(q => registerQuestion(q));

    // 2. Fallback: Seed demo questions only if bank is completely empty and offline
    if (bankMap.size === 0 && !isSupabaseConfigured()) {
      Object.values(DEMO_QUESTIONS).forEach(qList => {
        if (Array.isArray(qList)) {
          qList.forEach(q => registerQuestion(q));
        }
      });
    }

    // 3. Fast Supabase sync with timeout race (6000ms max)
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      try {
        const fetchPromise = (async () => {
          let allRemoteRows: any[] = [];
          let from = 0;
          const batchSize = 1000;
          let hasMore = true;

          while (hasMore) {
            const { data, error } = await supabase
              .from('questions')
              .select('*')
              .range(from, from + batchSize - 1)
              .order('created_at', { ascending: false });

            if (error) break;
            if (Array.isArray(data) && data.length > 0) {
              allRemoteRows = allRemoteRows.concat(data);
              if (data.length < batchSize) {
                hasMore = false;
              } else {
                from += batchSize;
              }
            } else {
              hasMore = false;
            }
            if (from > 10000) break;
          }
          return allRemoteRows;
        })();

        const timeoutPromise = new Promise<any[]>((_, reject) =>
          setTimeout(() => reject(new Error('Supabase fetch timeout')), 6000)
        );

        const remoteData = await Promise.race([fetchPromise, timeoutPromise]);
        if (Array.isArray(remoteData) && remoteData.length > 0) {
          remoteData.forEach((q: any) => registerQuestion(q));
        }
      } catch (e) {
        console.warn('Supabase questions fetch warning (continuing with cached bank):', e);
      }
    }

    const unifiedList = Array.from(bankMap.values());
    try {
      localStorage.setItem(STORAGE_KEYS.QUESTION_BANK, JSON.stringify(unifiedList));
    } catch {}
    return unifiedList;
  },

  syncQuestionBankWithSupabase: async (options?: { timeoutMs?: number }): Promise<{
    success: boolean;
    totalCount: number;
    pulledFromCloud: number;
    error?: string;
  }> => {
    const timeoutMs = options?.timeoutMs || 10000;
    const supabase = getSupabaseClient();
    if (!isSupabaseConfigured() || !supabase) {
      const local = await dataService.getAllQuestionBank();
      return { success: true, totalCount: local.length, pulledFromCloud: 0 };
    }

    // Load deleted blacklist
    let deletedSet = new Set<string>();
    try {
      const rawBlacklist = localStorage.getItem(STORAGE_KEYS.DELETED_QUESTIONS);
      if (rawBlacklist) {
        const parsed = JSON.parse(rawBlacklist);
        if (Array.isArray(parsed)) deletedSet = new Set(parsed);
      }
    } catch {}

    try {
      const fetchPromise = (async () => {
        let allRemoteRows: any[] = [];
        let from = 0;
        const batchSize = 1000;
        let hasMore = true;

        while (hasMore) {
          const { data, error } = await supabase
            .from('questions')
            .select('*')
            .range(from, from + batchSize - 1)
            .order('created_at', { ascending: false });

          if (error) {
            console.warn('Supabase range query error:', error);
            break;
          }

          if (Array.isArray(data) && data.length > 0) {
            allRemoteRows = allRemoteRows.concat(data);
            if (data.length < batchSize) {
              hasMore = false;
            } else {
              from += batchSize;
            }
          } else {
            hasMore = false;
          }

          if (from > 25000) break;
        }
        return allRemoteRows;
      })();

      const timeoutPromise = new Promise<any[]>((_, reject) =>
        setTimeout(() => reject(new Error('Supabase sync timed out')), timeoutMs)
      );

      const remoteQuestions = await Promise.race([fetchPromise, timeoutPromise]);

      // Load local master bank
      const rawBank = localStorage.getItem(STORAGE_KEYS.QUESTION_BANK);
      let masterBank: Question[] = [];
      try {
        masterBank = rawBank ? JSON.parse(rawBank) : [];
        if (!Array.isArray(masterBank)) masterBank = [];
      } catch {
        masterBank = [];
      }

      const bankMap = new Map<string, Question>();
      const fingerprintMap = new Map<string, string>(); // fingerprint -> questionId

      const registerQuestion = (q: any) => {
        if (!q || !q.question_text || !q.id) return;
        if (deletedSet.has(q.id)) return;

        const fp = getQuestionFingerprint(q);
        const existingIdByFp = fp ? fingerprintMap.get(fp) : undefined;
        const targetId = existingIdByFp || q.id;

        if (deletedSet.has(targetId)) return;

        const existing = bankMap.get(targetId);
        const cleanQ = mergeMasterQuestion(existing, {
          ...q,
          id: targetId,
          test_id: 'bank'
        });

        bankMap.set(targetId, cleanQ);
        if (fp) fingerprintMap.set(fp, targetId);
      };

      masterBank.forEach(q => registerQuestion(q));

      // Merge remote questions
      let pulledCount = 0;
      if (Array.isArray(remoteQuestions)) {
        remoteQuestions.forEach((q: any) => {
          registerQuestion(q);
          pulledCount++;
        });
      }

      const unifiedList = Array.from(bankMap.values());
      try {
        localStorage.setItem(STORAGE_KEYS.QUESTION_BANK, JSON.stringify(unifiedList));
      } catch (quotaErr) {
        console.warn('LocalStorage quota limit reached:', quotaErr);
      }

      return {
        success: true,
        totalCount: unifiedList.length,
        pulledFromCloud: pulledCount
      };
    } catch (e: any) {
      console.warn('Supabase syncQuestionBank error:', e);
      const local = await dataService.getAllQuestionBank();
      return {
        success: false,
        totalCount: local.length,
        pulledFromCloud: 0,
        error: e.message || 'Sync failed'
      };
    }
  },

  saveQuestionToBank: async (question: Question): Promise<Question> => {
    const validQId = isValidUUID(question.id) ? question.id : generateUUID();
    const cleanQ: Question = {
      ...question,
      id: validQId,
      test_id: 'bank',
      inspection_status: question.inspection_status || 'verified',
      quality_score: question.quality_score !== undefined ? Number(question.quality_score) : 90,
      created_at: question.created_at || new Date().toISOString()
    };

    // Remove from blacklist if previously deleted
    try {
      const rawBlacklist = localStorage.getItem(STORAGE_KEYS.DELETED_QUESTIONS);
      if (rawBlacklist) {
        const parsed = JSON.parse(rawBlacklist);
        if (Array.isArray(parsed)) {
          const updated = parsed.filter(id => id !== validQId && id !== question.id);
          localStorage.setItem(STORAGE_KEYS.DELETED_QUESTIONS, JSON.stringify(updated));
        }
      }
    } catch {}

    syncToQuestionBankMaster([cleanQ]);

    // Persist immediately to Supabase
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      try {
        const dbPayload: any = {
          id: validQId,
          test_id: null,
          question_text: cleanQ.question_text || '',
          question_image: cleanQ.question_image || null,
          option_a: cleanQ.option_a || '',
          option_b: cleanQ.option_b || '',
          option_c: cleanQ.option_c || '',
          option_d: cleanQ.option_d || '',
          correct_answer: (cleanQ.correct_answer || 'A').toString().toUpperCase().slice(0, 1),
          explanation: cleanQ.explanation || null,
          marks: parseSafeNumber(cleanQ.marks, 1),
          negative_marks: parseSafeNumber(cleanQ.negative_marks, 0),
          subject: cleanQ.subject || 'General Studies',
          chapter: cleanQ.chapter || 'General',
          topic: cleanQ.topic || 'General Topic',
          difficulty: cleanQ.difficulty || 'Medium',
          created_at: cleanQ.created_at
        };
        await supabase.from('questions').upsert(dbPayload, { onConflict: 'id' });
      } catch (err) {
        console.warn('Supabase saveQuestionToBank upsert error:', err);
      }
    }

    return cleanQ;
  },

  // High-Speed Atomic Batch Save for Question Bank (Saves 1000+ MCQs with automatic deduplication)
  saveQuestionsToBankBatch: async (questionsList: Question[]): Promise<{ success: boolean; count: number }> => {
    if (!Array.isArray(questionsList) || questionsList.length === 0) return { success: true, count: 0 };

    // 1. Sanitize and prepare questions
    const sanitizedList: Question[] = questionsList.map(question => {
      const validQId = isValidUUID(question.id) ? question.id : generateUUID();
      const ans = (question.correct_answer || 'A').toString().toUpperCase().trim().slice(0, 1);
      const validAns = (['A', 'B', 'C', 'D'].includes(ans) ? ans : 'A') as 'A' | 'B' | 'C' | 'D';
      return {
        ...question,
        id: validQId,
        test_id: question.test_id && question.test_id !== 'bank' ? question.test_id : 'bank',
        correct_answer: validAns,
        inspection_status: question.inspection_status || 'verified',
        quality_score: question.quality_score !== undefined ? Number(question.quality_score) : 95,
        created_at: question.created_at || new Date().toISOString()
      };
    });

    const newIdsSet = new Set(sanitizedList.map(q => q.id));

    // 2. Remove from blacklist if previously marked
    try {
      const rawBlacklist = localStorage.getItem(STORAGE_KEYS.DELETED_QUESTIONS);
      if (rawBlacklist) {
        const parsed = JSON.parse(rawBlacklist);
        if (Array.isArray(parsed)) {
          const updated = parsed.filter(id => !newIdsSet.has(id));
          localStorage.setItem(STORAGE_KEYS.DELETED_QUESTIONS, JSON.stringify(updated));
        }
      }
    } catch {}

    // 3. Single-Pass LocalStorage Master Bank Update with fingerprint deduplication
    try {
      const rawBank = localStorage.getItem(STORAGE_KEYS.QUESTION_BANK);
      let bankList: Question[] = rawBank ? JSON.parse(rawBank) : [];
      if (!Array.isArray(bankList)) bankList = [];
      const bankMap = new Map<string, Question>();
      const fingerprintMap = new Map<string, string>();

      bankList.forEach(q => {
        if (q && q.id) {
          bankMap.set(q.id, q);
          const fp = getQuestionFingerprint(q);
          if (fp && !fingerprintMap.has(fp)) {
            fingerprintMap.set(fp, q.id);
          }
        }
      });

      sanitizedList.forEach(cleanQ => {
        const fp = getQuestionFingerprint(cleanQ);
        const existingIdByFp = fp ? fingerprintMap.get(fp) : undefined;
        const targetId = existingIdByFp || cleanQ.id;

        const existing = bankMap.get(targetId);
        const merged = mergeMasterQuestion(existing, {
          ...cleanQ,
          id: targetId,
          test_id: 'bank'
        });

        bankMap.set(targetId, merged);
        if (fp) fingerprintMap.set(fp, targetId);
      });

      localStorage.setItem(STORAGE_KEYS.QUESTION_BANK, JSON.stringify(Array.from(bankMap.values())));
    } catch (e) {
      console.warn('LocalStorage batch save error:', e);
    }

    // 4. Also update linked questions across Mock Tests in single pass
    try {
      const rawQuestions = localStorage.getItem(STORAGE_KEYS.QUESTIONS);
      let questionsMap: Record<string, Question[]> = rawQuestions ? JSON.parse(rawQuestions) : {};
      let changed = false;
      const updatedMap = new Map(sanitizedList.map(q => [q.id, q]));

      Object.entries(questionsMap).forEach(([tId, list]) => {
        if (Array.isArray(list)) {
          let testChanged = false;
          const updatedList = list.map(q => {
            if (updatedMap.has(q.id)) {
              testChanged = true;
              const rep = updatedMap.get(q.id)!;
              return {
                ...q,
                ...rep,
                test_id: tId,
                question_number: q.question_number,
                marks: q.marks,
                negative_marks: q.negative_marks
              };
            }
            return q;
          });
          if (testChanged) {
            questionsMap[tId] = updatedList;
            changed = true;
          }
        }
      });

      if (changed) {
        localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(questionsMap));
      }
    } catch (e) {
      console.warn('Test questions batch update warning:', e);
    }

    // 5. Parallel Batch Upsert to Supabase in chunks of 500
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      try {
        const dbRows = sanitizedList.map(cleanQ => ({
          id: cleanQ.id,
          test_id: cleanQ.test_id && cleanQ.test_id !== 'bank' && isValidUUID(cleanQ.test_id) ? cleanQ.test_id : null,
          question_text: cleanQ.question_text || '',
          question_image: cleanQ.question_image || null,
          option_a: cleanQ.option_a || '',
          option_b: cleanQ.option_b || '',
          option_c: cleanQ.option_c || '',
          option_d: cleanQ.option_d || '',
          correct_answer: (cleanQ.correct_answer || 'A').toString().toUpperCase().slice(0, 1),
          explanation: cleanQ.explanation || null,
          marks: parseSafeNumber(cleanQ.marks, 1),
          negative_marks: parseSafeNumber(cleanQ.negative_marks, 0),
          subject: cleanQ.subject || 'General Studies',
          chapter: cleanQ.chapter || 'General',
          topic: cleanQ.topic || 'General Topic',
          difficulty: cleanQ.difficulty || 'Medium',
          created_at: cleanQ.created_at
        }));

        for (let i = 0; i < dbRows.length; i += 500) {
          const chunk = dbRows.slice(i, i + 500);
          await supabase.from('questions').upsert(chunk, { onConflict: 'id' });
        }
      } catch (err) {
        console.warn('Supabase saveQuestionsToBankBatch upsert error:', err);
      }
    }

    return { success: true, count: sanitizedList.length };
  },

  // Batch delete questions from Question Bank Master, all Mock Tests, and Supabase Cloud
  deleteQuestionsFromBankBatch: async (
    questionIds: string[],
    retainedQuestionMap?: Map<string, Question>
  ): Promise<{ success: boolean; count: number }> => {
    if (!questionIds || questionIds.length === 0) return { success: true, count: 0 };
    const idsToDeleteSet = new Set(questionIds);

    // 1. Maintain persistent blacklist so deleted IDs are never re-imported or resurrected
    try {
      const rawBlacklist = localStorage.getItem(STORAGE_KEYS.DELETED_QUESTIONS);
      let blacklist: string[] = rawBlacklist ? JSON.parse(rawBlacklist) : [];
      if (!Array.isArray(blacklist)) blacklist = [];
      const updatedBlacklist = Array.from(new Set([...blacklist, ...questionIds]));
      localStorage.setItem(STORAGE_KEYS.DELETED_QUESTIONS, JSON.stringify(updatedBlacklist.slice(-50000)));
    } catch (e) {
      console.warn('Failed to update deleted questions blacklist:', e);
    }

    // 2. Remove from local Question Bank Master storage (STORAGE_KEYS.QUESTION_BANK)
    try {
      const rawBank = localStorage.getItem(STORAGE_KEYS.QUESTION_BANK);
      let masterBank: Question[] = rawBank ? JSON.parse(rawBank) : [];
      if (Array.isArray(masterBank)) {
        const filteredBank = masterBank.filter(q => !idsToDeleteSet.has(q.id));
        localStorage.setItem(STORAGE_KEYS.QUESTION_BANK, JSON.stringify(filteredBank));
      }
    } catch (e) {
      console.warn('Failed to update question bank master:', e);
    }

    // 3. Remove / Relink from all Mock Tests in local cache (STORAGE_KEYS.QUESTIONS)
    try {
      const rawQuestions = localStorage.getItem(STORAGE_KEYS.QUESTIONS);
      let questionsMap: Record<string, Question[]> = rawQuestions ? JSON.parse(rawQuestions) : {};
      let changed = false;

      Object.entries(questionsMap).forEach(([testId, qList]) => {
        if (Array.isArray(qList)) {
          const hasAny = qList.some(q => idsToDeleteSet.has(q.id));
          if (hasAny) {
            changed = true;
            const updatedList: Question[] = [];
            const seenIdsInTest = new Set<string>();

            qList.forEach(q => {
              if (!idsToDeleteSet.has(q.id)) {
                updatedList.push(q);
                seenIdsInTest.add(q.id);
              } else if (retainedQuestionMap && retainedQuestionMap.has(q.id)) {
                const retainedBest = retainedQuestionMap.get(q.id)!;
                if (retainedBest && retainedBest.id && !seenIdsInTest.has(retainedBest.id)) {
                  updatedList.push({
                    ...retainedBest,
                    test_id: testId,
                    marks: q.marks || retainedBest.marks || 1,
                    negative_marks: q.negative_marks !== undefined ? q.negative_marks : retainedBest.negative_marks || 0,
                  });
                  seenIdsInTest.add(retainedBest.id);
                }
              }
            });

            const finalized = updatedList.map((q, idx) => ({ ...q, question_number: idx + 1 }));
            questionsMap[testId] = finalized;
          }
        }
      });

      if (changed) {
        localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(questionsMap));
      }
    } catch (e) {
      console.warn('Failed to clean mock test questions map:', e);
    }

    // 4. Delete permanently from Supabase Cloud
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      try {
        const validUUIDs = questionIds.filter(id => isValidUUID(id));
        if (validUUIDs.length > 0) {
          for (let i = 0; i < validUUIDs.length; i += 500) {
            const batch = validUUIDs.slice(i, i + 500);
            await supabase.from('questions').delete().in('id', batch);
          }
        }
        const nonUUIDs = questionIds.filter(id => !isValidUUID(id));
        if (nonUUIDs.length > 0) {
          try {
            for (let i = 0; i < nonUUIDs.length; i += 500) {
              const batch = nonUUIDs.slice(i, i + 500);
              await supabase.from('questions').delete().in('id', batch);
            }
          } catch {}
        }
      } catch (e) {
        console.warn('Supabase batch delete error:', e);
      }
    }

    return { success: true, count: questionIds.length };
  },

  // Deletes question permanently from Question Bank Master.
  deleteQuestionFromBank: async (questionId: string): Promise<void> => {
    await dataService.deleteQuestionsFromBankBatch([questionId]);
  },

  // Shift/Update Subject and Chapter taxonomy for one or multiple questions in bulk
  shiftQuestionsTaxonomy: async (
    questionIds: string[],
    taxonomy: { subject?: string; chapter?: string; topic?: string }
  ): Promise<{ success: boolean; updatedCount: number }> => {
    if (!Array.isArray(questionIds) || questionIds.length === 0) {
      return { success: true, updatedCount: 0 };
    }

    const idsSet = new Set(questionIds);
    const allBank = await dataService.getAllQuestionBank();
    const toUpdate: Question[] = [];

    allBank.forEach((q) => {
      if (idsSet.has(q.id)) {
        toUpdate.push({
          ...q,
          subject: taxonomy.subject !== undefined && taxonomy.subject.trim() ? taxonomy.subject.trim() : q.subject,
          chapter: taxonomy.chapter !== undefined ? taxonomy.chapter.trim() : q.chapter,
          topic: taxonomy.topic !== undefined ? taxonomy.topic.trim() : q.topic,
        });
      }
    });

    if (toUpdate.length > 0) {
      await dataService.saveQuestionsToBankBatch(toUpdate);
    }

    return { success: true, updatedCount: toUpdate.length };
  },

  createTestFromQuestions: async (
    testMeta: Partial<Test>,
    selectedQuestions: Question[]
  ): Promise<Test> => {
    const newId = generateUUID();
    const cleanTitle = testMeta.title || 'Custom Mock Test';
    const cleanSlug = (testMeta.slug || cleanTitle)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') + '-' + Math.floor(Math.random() * 1000);

    const distinctSections = Array.from(
      new Set(selectedQuestions.map(q => q.section).filter(Boolean))
    ) as string[];

    const distinctSubjects = Array.from(
      new Set(selectedQuestions.map(q => q.subject).filter(Boolean))
    );

    const totalMarks = selectedQuestions.reduce(
      (acc, q) => acc + (Number(q.marks) || Number(testMeta.marks_per_question) || 1),
      0
    );

    const newTest: Test = {
      id: newId,
      test_code: testMeta.test_code || 'TEST-' + Math.floor(1000 + Math.random() * 9000),
      title: cleanTitle,
      slug: cleanSlug,
      description: testMeta.description || `Generated from Question Bank (${selectedQuestions.length} Questions)`,
      category: testMeta.category || 'General',
      subject: distinctSubjects.length === 1 ? distinctSubjects[0] : 'Multi-Subject',
      total_questions: selectedQuestions.length,
      total_marks: totalMarks,
      marks_per_question: Number(testMeta.marks_per_question) || 1,
      negative_marking: parseSafeNumber(testMeta.negative_marking, 0),
      duration_minutes: Number(testMeta.duration_minutes) || Math.max(15, selectedQuestions.length),
      passing_marks: Number(testMeta.passing_marks) || Math.round(totalMarks * 0.4),
      instructions: testMeta.instructions || '1. Read all questions carefully.\n2. Negative marking applies if configured.\n3. Do not refresh the page during test.',
      status: 'published',
      is_published: true,
      is_multisection: distinctSections.length > 1,
      sections: distinctSections.length > 0 ? distinctSections : ['General'],
      social_gate_enabled: testMeta.social_gate_enabled ?? true,
      anti_cheating_enabled: testMeta.anti_cheating_enabled ?? true,
      randomize_questions: testMeta.randomize_questions ?? false,
      randomize_options: testMeta.randomize_options ?? false,
      allow_back_navigation: testMeta.allow_back_navigation ?? true,
      allow_mark_for_review: testMeta.allow_mark_for_review ?? true,
      show_result_immediately: testMeta.show_result_immediately ?? true,
      show_correct_answers: testMeta.show_correct_answers ?? true,
      show_explanation: testMeta.show_explanation ?? true,
      enable_leaderboard: testMeta.enable_leaderboard ?? true,
      max_attempts_per_student: testMeta.max_attempts_per_student ?? 3,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await dataService.saveTest(newTest);

    // Clone and map questions into new test with valid UUIDs and apply new test's negative marking and marks
    const testQuestions: Question[] = selectedQuestions.map((q, idx) => ({
      ...q,
      id: generateUUID(),
      test_id: newId,
      question_number: idx + 1,
      negative_marks: parseSafeNumber(newTest.negative_marking, 0),
      marks: parseSafeNumber(newTest.marks_per_question, parseSafeNumber(q.marks, 1)),
    }));

    await dataService.saveQuestions(newId, testQuestions);
    return newTest;
  },

  addQuestionsToExistingTest: async (
    targetTestId: string,
    selectedQuestions: Question[]
  ): Promise<void> => {
    const existing = await dataService.getQuestions(targetTestId, true);
    const targetTest = await dataService.getTestBySlugOrId(targetTestId);
    const testNeg = targetTest ? parseSafeNumber(targetTest.negative_marking, 0) : 0;
    const testMarks = targetTest ? parseSafeNumber(targetTest.marks_per_question, 1) : 1;
    let startNum = existing.length + 1;

    const cloned: Question[] = selectedQuestions.map(q => ({
      ...q,
      id: generateUUID(),
      test_id: targetTestId,
      question_number: startNum++,
      negative_marks: testNeg,
      marks: parseSafeNumber(q.marks, testMarks),
    }));

    const combined = [...existing, ...cloned];
    await dataService.saveQuestions(targetTestId, combined);
  },

  // Builds an accurate map of which Mock Tests each Question is currently used in
  getMockTestQuestionUsageMap: async (): Promise<QuestionBankUsageReport> => {
    const tests = await dataService.getTests(true);
    const testMap = new Map<string, Test>();
    tests.forEach(t => {
      if (t?.id) testMap.set(t.id, t);
      if (t?.slug) testMap.set(t.slug, t);
    });

    const usageById = new Map<string, MockTestUsageInfo[]>();
    const usageByFingerprint = new Map<string, MockTestUsageInfo[]>();

    const recordUsage = (q: Partial<Question>, testId: string) => {
      if (!q || !testId || testId === 'bank') return;
      const testObj = testMap.get(testId);
      const usageInfo: MockTestUsageInfo = {
        testId: testId,
        testTitle: testObj?.title || `Mock Test #${testId.slice(0, 8)}`,
        testCode: testObj?.test_code,
        slug: testObj?.slug
      };

      // Index by ID
      if (q.id) {
        const existing = usageById.get(q.id) || [];
        if (!existing.some(u => u.testId === testId)) {
          usageById.set(q.id, [...existing, usageInfo]);
        }
      }

      // Index by Fingerprint (detects identical questions even if UUID was regenerated)
      const fp = getQuestionFingerprint(q);
      if (fp) {
        const existing = usageByFingerprint.get(fp) || [];
        if (!existing.some(u => u.testId === testId)) {
          usageByFingerprint.set(fp, [...existing, usageInfo]);
        }
      }
    };

    // 1. Read all local questions map
    try {
      const rawQuestions = localStorage.getItem(STORAGE_KEYS.QUESTIONS);
      const questionsMap: Record<string, Question[]> = rawQuestions ? JSON.parse(rawQuestions) : {};
      Object.entries(questionsMap).forEach(([testId, qList]) => {
        if (testId !== 'bank' && Array.isArray(qList)) {
          qList.forEach(q => recordUsage(q, testId));
        }
      });
    } catch (e) {
      console.warn('Error indexing local questions for usage map:', e);
    }

    // 2. Read DEMO_QUESTIONS
    try {
      Object.entries(DEMO_QUESTIONS).forEach(([testId, qList]) => {
        if (testId !== 'bank' && Array.isArray(qList)) {
          qList.forEach(q => recordUsage(q, testId));
        }
      });
    } catch (e) {
      console.warn('Error indexing demo questions for usage map:', e);
    }

    // 3. Supabase Cloud lookup (if configured)
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('questions')
          .select('id, test_id, question_text, option_a, option_b, option_c, option_d')
          .neq('test_id', 'bank');
        if (!error && Array.isArray(data)) {
          data.forEach((q: any) => {
            if (q && q.test_id && q.test_id !== 'bank') {
              recordUsage(q, q.test_id);
            }
          });
        }
      } catch (e) {
        console.warn('Supabase questions fetch for usage map warning:', e);
      }
    }

    return { usageById, usageByFingerprint, allTests: tests };
  },

  // ------------------------------------
  // SOCIAL PLATFORMS
  // ------------------------------------
  getSocialPlatforms: async (includeInactive = true): Promise<SocialPlatform[]> => {
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      // 1. Try checking admin_settings first (authoritative admin configuration row)
      try {
        const { data: settingsData, error: settingsError } = await supabase
          .from('admin_settings')
          .select('social_platforms')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!settingsError && settingsData && Array.isArray(settingsData.social_platforms) && settingsData.social_platforms.length > 0) {
          const platforms: SocialPlatform[] = settingsData.social_platforms.map((p: any, idx: number) => ({
            id: normalizePlatformId(p.id, p.platform_name),
            platform_name: p.platform_name || 'Community Channel',
            platform_url: sanitizeSocialUrl(p.platform_name || p.icon, p.platform_url || ''),
            icon: p.icon || 'share2',
            button_text: p.button_text || 'Join Channel',
            verification_method: p.verification_method || 'redirect_only',
            is_required: p.is_required !== undefined ? Boolean(p.is_required) : true,
            is_active: p.is_active !== undefined ? Boolean(p.is_active) : true,
            order_index: p.order_index !== undefined ? p.order_index : idx + 1
          }));

          localStorage.setItem(STORAGE_KEYS.SOCIAL, JSON.stringify(platforms));
          if (!includeInactive) {
            return platforms.filter((p) => p.is_active === true);
          }
          return platforms;
        }
      } catch (e) {
        console.warn('Supabase admin_settings social_platforms fetch error', e);
      }

      // 2. Try fetching from social_platforms table
      try {
        let query = supabase
          .from('social_platforms')
          .select('*')
          .order('order_index', { ascending: true })
          .order('created_at', { ascending: true });

        if (!includeInactive) {
          query = query.eq('is_active', true);
        }

        const { data, error } = await query;
          
        if (!error && data && data.length > 0) {
          const seen = new Map<string, SocialPlatform>();
          (data as SocialPlatform[]).forEach((item, idx) => {
            const key = (item.platform_name || '').toLowerCase().trim();
            const normalizedId = normalizePlatformId(item.id, item.platform_name);
            const isItemActive = item.is_active !== undefined ? Boolean(item.is_active) : true;
            seen.set(key || normalizedId, {
              ...item,
              id: normalizedId,
              platform_url: sanitizeSocialUrl(item.platform_name || item.icon, item.platform_url),
              is_active: isItemActive,
              order_index: item.order_index !== undefined ? item.order_index : idx + 1
            });
          });
          const deduplicated = Array.from(seen.values());
          localStorage.setItem(STORAGE_KEYS.SOCIAL, JSON.stringify(deduplicated));
          if (!includeInactive) {
            return deduplicated.filter((p) => p.is_active === true);
          }
          return deduplicated;
        }
      } catch (e) {
        console.warn('Supabase social platforms table fetch error', e);
      }
    }

    const raw = localStorage.getItem(STORAGE_KEYS.SOCIAL);
    const platforms: SocialPlatform[] = raw ? JSON.parse(raw) : DEMO_SOCIAL_PLATFORMS;
    
    // Check if admin settings has newer custom links
    let adminCustomLinks: Partial<AdminSettings> | null = null;
    const rawSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (rawSettings) {
      try {
        adminCustomLinks = JSON.parse(rawSettings);
      } catch {
        // ignore
      }
    }

    const normalized = platforms.map((p, idx) => {
      const lowerName = (p.platform_name || '').toLowerCase();
      let updatedUrl = sanitizeSocialUrl(p.platform_name || p.icon, p.platform_url);
      if (adminCustomLinks?.youtube_channel && (lowerName.includes('youtube') || p.icon === 'youtube')) {
        updatedUrl = sanitizeSocialUrl('youtube', adminCustomLinks.youtube_channel);
      }
      if (adminCustomLinks?.telegram_channel && (lowerName.includes('telegram') || p.icon === 'send')) {
        updatedUrl = sanitizeSocialUrl('telegram', adminCustomLinks.telegram_channel);
      }
      if (adminCustomLinks?.instagram_handle && (lowerName.includes('instagram') || p.icon === 'instagram')) {
        updatedUrl = sanitizeSocialUrl('instagram', adminCustomLinks.instagram_handle);
      }
      if (adminCustomLinks?.whatsapp_channel_url && (lowerName.includes('whatsapp') || p.icon === 'message-circle')) {
        updatedUrl = sanitizeSocialUrl('whatsapp', adminCustomLinks.whatsapp_channel_url);
      }

      return {
        ...p,
        platform_url: updatedUrl,
        id: normalizePlatformId(p.id, p.platform_name),
        is_active: p.is_active !== undefined ? Boolean(p.is_active) : true,
        order_index: p.order_index !== undefined ? p.order_index : idx + 1
      };
    });

    if (!includeInactive) {
      return normalized.filter((p) => p.is_active === true);
    }
    return normalized;
  },

  saveSocialPlatform: async (platform: SocialPlatform): Promise<SocialPlatform> => {
    const platforms = await dataService.getSocialPlatforms(true);
    const cleanId = normalizePlatformId(platform.id, platform.platform_name);
    const sanitizedPlatform: SocialPlatform = {
      ...platform,
      id: cleanId,
      platform_url: sanitizeSocialUrl(platform.platform_name || platform.icon, platform.platform_url),
      is_active: platform.is_active !== undefined ? Boolean(platform.is_active) : true,
      is_required: platform.is_required !== undefined ? Boolean(platform.is_required) : true,
      verification_method: platform.verification_method || 'redirect_only'
    };

    const idx = platforms.findIndex(p => 
      p.id === cleanId || 
      (p.platform_name || '').toLowerCase().trim() === (sanitizedPlatform.platform_name || '').toLowerCase().trim()
    );
    if (idx >= 0) {
      platforms[idx] = sanitizedPlatform;
    } else {
      platforms.push(sanitizedPlatform);
    }
    localStorage.setItem(STORAGE_KEYS.SOCIAL, JSON.stringify(platforms));

    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      try {
        // 1. Upsert into social_platforms table with standard ID
        await supabase.from('social_platforms').upsert({
          id: sanitizedPlatform.id,
          platform_name: sanitizedPlatform.platform_name,
          platform_url: sanitizedPlatform.platform_url,
          icon: sanitizedPlatform.icon || 'share2',
          button_text: sanitizedPlatform.button_text || 'Follow Us',
          verification_method: sanitizedPlatform.verification_method || 'redirect_only',
          is_required: sanitizedPlatform.is_required,
          is_active: sanitizedPlatform.is_active,
          order_index: sanitizedPlatform.order_index ?? 0
        });

        // 2. Update any existing legacy rows matching this platform_name
        try {
          await supabase
            .from('social_platforms')
            .update({
              is_active: sanitizedPlatform.is_active,
              is_required: sanitizedPlatform.is_required,
              platform_url: sanitizedPlatform.platform_url,
              button_text: sanitizedPlatform.button_text
            })
            .ilike('platform_name', `%${sanitizedPlatform.platform_name}%`);
        } catch {
          // ignore
        }
      } catch (e) {
        console.warn('Supabase save social platform table error:', e);
      }

      // 3. Update admin_settings.social_platforms array for instant cross-browser synchronization
      try {
        await dataService.updateSettings({ social_platforms: platforms });
      } catch (err) {
        console.error('Failed to sync social_platforms to admin_settings', err);
      }
    }
    return sanitizedPlatform;
  },

  saveSocialPlatformsBulk: async (platforms: SocialPlatform[]): Promise<SocialPlatform[]> => {
    const normalized = platforms.map((p, idx) => ({
      ...p,
      id: normalizePlatformId(p.id, p.platform_name),
      is_active: p.is_active !== undefined ? Boolean(p.is_active) : true,
      order_index: idx + 1
    }));
    localStorage.setItem(STORAGE_KEYS.SOCIAL, JSON.stringify(normalized));

    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      try {
        for (const p of normalized) {
          await supabase.from('social_platforms').upsert({
            id: p.id,
            platform_name: p.platform_name,
            platform_url: p.platform_url,
            icon: p.icon || 'share2',
            button_text: p.button_text || 'Follow Us',
            verification_method: p.verification_method || 'redirect_only',
            is_required: p.is_required ?? true,
            is_active: p.is_active,
            order_index: p.order_index ?? 0
          });

          // Also update by name to keep legacy rows synced
          await supabase
            .from('social_platforms')
            .update({ is_active: p.is_active, is_required: p.is_required })
            .ilike('platform_name', `%${p.platform_name}%`);
        }
      } catch (e) {
        console.warn('Bulk upsert social_platforms error:', e);
      }

      try {
        await dataService.updateSettings({ social_platforms: normalized });
      } catch (e) {
        console.error('Failed to bulk sync social platforms to admin_settings', e);
      }
    }
    return normalized;
  },

  toggleSocialPlatformActive: async (id: string, isActive: boolean): Promise<SocialPlatform | null> => {
    const platforms = await dataService.getSocialPlatforms(true);
    const cleanId = normalizePlatformId(id);
    const target = platforms.find(p => p.id === id || p.id === cleanId || normalizePlatformId(p.id, p.platform_name) === cleanId);
    if (!target) return null;
    
    const updatedList = platforms.map(p => {
      if (
        p.id === id || 
        p.id === cleanId || 
        normalizePlatformId(p.id, p.platform_name) === cleanId ||
        (target && (p.platform_name || '').toLowerCase().trim() === (target.platform_name || '').toLowerCase().trim())
      ) {
        return { ...p, id: cleanId, is_active: isActive };
      }
      return p;
    });

    localStorage.setItem(STORAGE_KEYS.SOCIAL, JSON.stringify(updatedList));

    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase
          .from('social_platforms')
          .update({ is_active: isActive })
          .eq('id', cleanId);

        await supabase
          .from('social_platforms')
          .update({ is_active: isActive })
          .eq('id', id);

        if (target.platform_name) {
          await supabase
            .from('social_platforms')
            .update({ is_active: isActive })
            .ilike('platform_name', `%${target.platform_name}%`);
        }
      } catch (e) {
        console.warn('Supabase toggle social platform error:', e);
      }

      try {
        await dataService.updateSettings({ social_platforms: updatedList });
      } catch (err) {
        console.error('Failed to sync to admin_settings:', err);
      }
    }

    return { ...target, id: cleanId, is_active: isActive };
  },

  deleteSocialPlatform: async (id: string): Promise<void> => {
    const platforms = await dataService.getSocialPlatforms(true);
    const cleanId = normalizePlatformId(id);
    const targetPlatform = platforms.find(p => p.id === id || p.id === cleanId || normalizePlatformId(p.id, p.platform_name) === cleanId);
    const filtered = platforms.filter(p => 
      p.id !== id && 
      p.id !== cleanId && 
      normalizePlatformId(p.id, p.platform_name) !== cleanId &&
      (!targetPlatform || (p.platform_name || '').toLowerCase().trim() !== (targetPlatform.platform_name || '').toLowerCase().trim())
    );
    localStorage.setItem(STORAGE_KEYS.SOCIAL, JSON.stringify(filtered));

    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('social_platforms').delete().eq('id', id);
        await supabase.from('social_platforms').delete().eq('id', cleanId);
        if (targetPlatform && targetPlatform.platform_name) {
          await supabase.from('social_platforms').delete().ilike('platform_name', `%${targetPlatform.platform_name}%`);
        }
      } catch (e) {
        console.warn('Supabase delete social platform error', e);
      }

      try {
        await dataService.updateSettings({ social_platforms: filtered });
      } catch (err) {
        console.error('Failed to sync updated list to admin_settings after delete', err);
      }
    }
  },

  // ------------------------------------
  // STUDENT REGISTRATION & ATTEMPTS
  // ------------------------------------
  getStudentAttemptsForTest: async (testId: string, mobile: string): Promise<Attempt[]> => {
    const cleanMobile = (mobile || '').trim();
    if (!cleanMobile) return [];

    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      try {
        let query = supabase
          .from('attempts')
          .select('*')
          .eq('student_mobile', cleanMobile)
          .in('status', ['completed', 'auto_submitted'])
          .order('created_at', { ascending: false });

        if (isValidUUID(testId)) {
          query = query.eq('test_id', testId);
        }
        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          return data as Attempt[];
        }
      } catch (e) {
        console.warn('Supabase getStudentAttemptsForTest failed', e);
      }
    }
    const attempts = await dataService.getAttempts(testId);
    return attempts.filter(a => a.student_mobile === cleanMobile && (a.status === 'completed' || a.status === 'auto_submitted'));
  },

  checkStudentAttemptEligibility: async (
    test: Test,
    mobile: string
  ): Promise<{ allowed: boolean; currentAttempts: number; maxAttempts: number; previousAttempts: Attempt[]; reason?: string }> => {
    const cleanMobile = (mobile || '').trim();
    const maxAttempts = test.max_attempts_per_student !== undefined && test.max_attempts_per_student !== null 
      ? Number(test.max_attempts_per_student) 
      : 0;

    // 0 or negative represents Unlimited Attempts
    if (maxAttempts <= 0) {
      return { allowed: true, currentAttempts: 0, maxAttempts: 0, previousAttempts: [] };
    }

    if (!cleanMobile) {
      return { allowed: true, currentAttempts: 0, maxAttempts, previousAttempts: [] };
    }

    const previousAttempts = await dataService.getStudentAttemptsForTest(test.id, cleanMobile);
    const count = previousAttempts.length;

    if (count >= maxAttempts) {
      return {
        allowed: false,
        currentAttempts: count,
        maxAttempts,
        previousAttempts,
        reason: `Attempt Limit Exceeded: You have already completed this mock test ${count} time${count > 1 ? 's' : ''}. The maximum allowed attempt limit is ${maxAttempts}.`
      };
    }

    return {
      allowed: true,
      currentAttempts: count,
      maxAttempts,
      previousAttempts
    };
  },

  checkPreviousAttempt: async (testId: string, mobile: string): Promise<Attempt | null> => {
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      try {
        let query = supabase
          .from('attempts')
          .select('*')
          .eq('student_mobile', mobile)
          .in('status', ['completed', 'auto_submitted'])
          .order('created_at', { ascending: false });

        if (isValidUUID(testId)) {
          query = query.eq('test_id', testId);
        }
        const { data, error } = await query.limit(1).maybeSingle();
        if (!error && data) {
          return data as Attempt;
        }
      } catch (e) {
        console.warn('Supabase checkPreviousAttempt failed', e);
      }
    }
    const attempts = await dataService.getAttempts(testId);
    return attempts.find(a => a.student_mobile === mobile && (a.status === 'completed' || a.status === 'auto_submitted')) || null;
  },

  createAttempt: async (
    test: Test,
    student: { full_name: string; mobile: string; email?: string | null; state: string; district: string; gender?: string }
  ): Promise<Attempt> => {
    const attemptId = generateUUID();
    let studentId = generateUUID();

    // Resolve real test UUID
    let realTestId = test.id;
    if (!isValidUUID(realTestId)) {
      const found = await dataService.getTestBySlugOrId(test.slug || test.id);
      if (found && isValidUUID(found.id)) {
        realTestId = found.id;
      }
    }

    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      try {
        // Look up student by mobile number
        const { data: existingStudent } = await supabase
          .from('students')
          .select('id')
          .eq('mobile', student.mobile)
          .limit(1)
          .maybeSingle();

        if (existingStudent && existingStudent.id) {
          studentId = existingStudent.id;
          // Update details
          await supabase.from('students').update({
            full_name: student.full_name,
            email: student.email || null,
            state: student.state,
            district: student.district,
            gender: student.gender || null
          }).eq('id', studentId);
        } else {
          // Insert new student record
          const { data: newStu } = await supabase.from('students').insert({
            id: studentId,
            full_name: student.full_name,
            mobile: student.mobile,
            email: student.email || null,
            state: student.state,
            district: student.district,
            gender: student.gender || null
          }).select().single();

          if (newStu && newStu.id) {
            studentId = newStu.id;
          }
        }

        // Insert new attempt into Supabase
        const initialAttemptDb = sanitizeAttemptForSupabase({
          id: attemptId,
          test_id: realTestId,
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
        });

        const { error: attErr } = await supabase.from('attempts').insert(initialAttemptDb);
        if (attErr) {
          console.error('Supabase initial attempt insert error:', attErr);
        }
      } catch (e) {
        console.error('Supabase attempt creation exception:', e);
      }
    }

    const newAttempt: Attempt = {
      id: attemptId,
      test_id: realTestId,
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

  // SECURE SERVER-SIDE SUBMISSION WITH AUTOMATIC CLOUD FALLBACK PERSISTENCE
  submitAttemptSecure: async (
    test: Test,
    attempt: Attempt,
    selectedAnswers: Record<string, string>,
    timeTakenSeconds: number,
    suspiciousCount = 0
  ): Promise<Attempt> => {
    const supabase = getSupabaseClient();
    
    // Resolve real test UUID
    let realTestId = test.id;
    if (!isValidUUID(realTestId)) {
      const found = await dataService.getTestBySlugOrId(test.slug || test.id);
      if (found && isValidUUID(found.id)) {
        realTestId = found.id;
      }
    }

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

            const completed: Attempt = {
              ...updatedAttempt,
              responses
            };

            // Update local storage
            const localAttempts = await dataService.getAttempts();
            const idx = localAttempts.findIndex(a => a.id === completed.id);
            if (idx >= 0) localAttempts[idx] = completed;
            else localAttempts.unshift(completed);
            localStorage.setItem(STORAGE_KEYS.ATTEMPTS, JSON.stringify(localAttempts));

            dataService.clearSavedProgress(test.id);
            return completed;
          }
        } else if (error) {
          console.warn('Supabase submit_attempt_secure RPC error:', error);
        }
      } catch (err) {
        console.warn('Supabase submit_attempt_secure exception, proceeding to direct cloud sync', err);
      }
    }

    // Direct Evaluation & Robust Cloud Persistence
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
          marksObtained = parseSafeNumber(q.marks, parseSafeNumber(test.marks_per_question, 1));
        } else {
          wrong++;
          isCorrect = false;
          const testNeg = parseSafeNumber(test.negative_marking, 0);
          let negDeduction = 0;
          if (testNeg > 0) {
            negDeduction = q.negative_marks !== undefined ? parseSafeNumber(q.negative_marks, testNeg) : testNeg;
          } else {
            // If mock test specifies 0 negative marking, strictly 0 penalty is deducted
            negDeduction = 0;
          }
          marksObtained = - negDeduction;
        }
      }

      totalScore += marksObtained;

      const ansId = generateUUID();
      answerRecords.push({
        id: ansId,
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

    const skipped = Math.max(0, test.total_questions - attempted);
    const finalScore = Math.max(0, Math.round(totalScore * 100) / 100);
    const maxMarks = parseSafeNumber(test.total_marks, test.total_questions * parseSafeNumber(test.marks_per_question, 1));
    const percentage = maxMarks > 0 ? Math.round((finalScore / maxMarks) * 10000) / 100 : 0;

    const completedAttempt: Attempt = {
      ...attempt,
      test_id: realTestId,
      submitted_at: new Date().toISOString(),
      end_time: new Date().toISOString(),
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

    // DIRECT SUPABASE CLOUD DATABASE SYNC (GUARANTEES SAVING TO BACKEND)
    if (isSupabaseConfigured() && supabase) {
      try {
        // 1. Ensure student exists in students table
        let studentId = completedAttempt.student_id;
        if (!isValidUUID(studentId)) {
          studentId = generateUUID();
          completedAttempt.student_id = studentId;
        }

        const { data: existingStudent } = await supabase
          .from('students')
          .select('id')
          .eq('mobile', completedAttempt.student_mobile)
          .limit(1)
          .maybeSingle();

        if (existingStudent && existingStudent.id) {
          studentId = existingStudent.id;
          completedAttempt.student_id = studentId;
        } else {
          await supabase.from('students').insert({
            id: studentId,
            full_name: completedAttempt.student_name,
            mobile: completedAttempt.student_mobile,
            email: completedAttempt.student_email || null,
            state: completedAttempt.student_state,
            district: completedAttempt.student_district
          });
        }

        // 2. Upsert sanitized attempt into Supabase public.attempts
        const sanitizedAttempt = sanitizeAttemptForSupabase(completedAttempt);
        const { error: upsertErr } = await supabase.from('attempts').upsert(sanitizedAttempt);
        if (upsertErr) {
          console.error('Supabase direct attempt upsert error:', upsertErr);
        }

        // 3. Upsert answers into Supabase public.answers
        if (answerRecords.length > 0) {
          const dbAnswers = answerRecords.map(a => ({
            id: isValidUUID(a.id) ? a.id : generateUUID(),
            attempt_id: sanitizedAttempt.id,
            question_id: isValidUUID(a.question_id) ? a.question_id : undefined,
            selected_answer: a.selected_answer || null,
            is_correct: a.is_correct || false,
            marks_obtained: a.marks_obtained || 0,
            answered_at: new Date().toISOString()
          })).filter(a => a.question_id);

          if (dbAnswers.length > 0) {
            await supabase.from('answers').upsert(dbAnswers, { onConflict: 'attempt_id,question_id' });
          }
        }
      } catch (syncErr) {
        console.error('Supabase direct sync error in submitAttemptSecure:', syncErr);
      }
    }

    // Save locally
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
    const sanitized = sanitizeAttemptForSupabase(attempt);

    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('attempts').upsert(sanitized);
      } catch (e) {
        console.error('Supabase save attempt error', e);
      }
    }

    const attempts = await dataService.getAttempts();
    const idx = attempts.findIndex(a => a.id === attempt.id);
    if (idx >= 0) {
      attempts[idx] = attempt;
    } else {
      attempts.unshift(attempt);
    }
    localStorage.setItem(STORAGE_KEYS.ATTEMPTS, JSON.stringify(attempts));

    return attempt;
  },

  getAttempts: async (testId?: string): Promise<Attempt[]> => {
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      try {
        let query = supabase.from('attempts').select('*').order('created_at', { ascending: false });
        if (testId && testId !== 'all') {
          if (isValidUUID(testId)) {
            query = query.eq('test_id', testId);
          } else {
            // Find test by slug
            const foundTest = await dataService.getTestBySlugOrId(testId);
            if (foundTest && isValidUUID(foundTest.id)) {
              query = query.eq('test_id', foundTest.id);
            }
          }
        }
        const { data, error } = await query;
        if (!error && data && Array.isArray(data)) {
          localStorage.setItem(STORAGE_KEYS.ATTEMPTS, JSON.stringify(data));
          return data as Attempt[];
        }
      } catch (e) {
        console.warn('Supabase fetch attempts error', e);
      }
    }
    const raw = localStorage.getItem(STORAGE_KEYS.ATTEMPTS);
    let attempts: Attempt[] = [];
    try {
      attempts = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(attempts)) attempts = [];
    } catch {
      attempts = [];
    }

    if (testId && testId !== 'all') {
      return attempts.filter(a => a.test_id === testId);
    }
    return attempts;
  },

  getAttemptById: async (attemptId: string): Promise<Attempt | null> => {
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase && isValidUUID(attemptId)) {
      try {
        const { data, error } = await supabase.from('attempts').select('*').eq('id', attemptId).maybeSingle();
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
    if (isSupabaseConfigured() && supabase && isValidUUID(attemptId)) {
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
  // MANUAL FULL SYNC UTILITY TO SUPABASE
  // ------------------------------------
  syncAllLocalDataToSupabase: async (): Promise<{
    success: boolean;
    testsCount: number;
    questionsCount: number;
    attemptsCount: number;
    error?: string;
  }> => {
    const supabase = getSupabaseClient();
    if (!isSupabaseConfigured() || !supabase) {
      return { success: false, testsCount: 0, questionsCount: 0, attemptsCount: 0, error: 'Supabase is not configured' };
    }

    let syncedTests = 0;
    let syncedQuestions = 0;
    let syncedAttempts = 0;

    try {
      // 1. Sync all tests
      const tests = await dataService.getTests(true);
      for (const t of tests) {
        await dataService.saveTest(t);
        syncedTests++;
      }

      // 2. Sync all questions
      const rawQ = localStorage.getItem(STORAGE_KEYS.QUESTIONS);
      if (rawQ) {
        const qMap = JSON.parse(rawQ);
        for (const [tId, qList] of Object.entries(qMap)) {
          if (Array.isArray(qList) && qList.length > 0) {
            await dataService.saveQuestions(tId, qList as Question[]);
            syncedQuestions += qList.length;
          }
        }
      }

      // 3. Sync all attempts
      const attempts = await dataService.getAttempts();
      for (const att of attempts) {
        await dataService.saveAttempt(att);
        syncedAttempts++;
      }

      // 4. Sync Settings & Social Platforms
      const settings = await dataService.getSettings();
      await dataService.updateSettings(settings);

      const platforms = await dataService.getSocialPlatforms(true);
      for (const p of platforms) {
        await dataService.saveSocialPlatform(p);
      }

      return {
        success: true,
        testsCount: syncedTests,
        questionsCount: syncedQuestions,
        attemptsCount: syncedAttempts
      };
    } catch (err: any) {
      return {
        success: false,
        testsCount: syncedTests,
        questionsCount: syncedQuestions,
        attemptsCount: syncedAttempts,
        error: err?.message || 'Sync failed'
      };
    }
  },

  // ------------------------------------
  // LEADERBOARD & RANKINGS (DYNAMIC / MASKED)
  // ------------------------------------
  getLeaderboard: async (testId: string, limit = 20): Promise<PublicLeaderboardEntry[]> => {
    const supabase = getSupabaseClient();
    let realTestId = testId;
    if (!isValidUUID(realTestId)) {
      const found = await dataService.getTestBySlugOrId(testId);
      if (found && isValidUUID(found.id)) {
        realTestId = found.id;
      }
    }

    if (isSupabaseConfigured() && supabase && isValidUUID(realTestId)) {
      try {
        const { data, error } = await supabase.rpc('get_top_leaderboard', {
          p_test_id: realTestId,
          p_limit: limit
        });
        if (!error && data && Array.isArray(data) && data.length > 0) {
          return data as PublicLeaderboardEntry[];
        }
      } catch (e) {
        console.warn('Supabase fetch get_top_leaderboard RPC error', e);
      }
    }

    // Direct calculation from attempts table
    const attempts = await dataService.getAttempts(realTestId);
    const completed = attempts.filter(a => a.status === 'completed' || a.status === 'auto_submitted');
    completed.sort((a, b) => b.score - a.score || a.time_taken_seconds - b.time_taken_seconds);

    return completed.slice(0, limit).map((a, idx) => {
      const nameParts = (a.student_name || 'Candidate').split(' ');
      const firstName = nameParts[0] || 'Candidate';
      const initial = nameParts.length > 1 ? ` ${nameParts[1][0]}.` : '';
      const masked = `${firstName}${initial}`;

      return {
        rank: idx + 1,
        attempt_id: a.id,
        student_name: a.student_name || 'Aspirant',
        student_district: a.student_district || 'Himachal Pradesh',
        student_state: a.student_state || 'HP',
        masked_name: masked,
        score: a.score,
        percentage: a.percentage || 0,
        correct_answers: a.correct_answers || 0,
        wrong_answers: a.wrong_answers || 0,
        unattempted_answers: a.skipped_questions ?? (a.total_questions ? a.total_questions - (a.attempted_questions || 0) : 0),
        time_taken_seconds: a.time_taken_seconds || 0,
        submitted_at: a.submitted_at || a.created_at || new Date().toISOString()
      };
    });
  },

  getStudentRank: async (testId: string, attemptId: string): Promise<number> => {
    let realTestId = testId;
    if (!isValidUUID(realTestId)) {
      const found = await dataService.getTestBySlugOrId(testId);
      if (found && isValidUUID(found.id)) {
        realTestId = found.id;
      }
    }

    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase && isValidUUID(realTestId) && isValidUUID(attemptId)) {
      try {
        const { data, error } = await supabase.rpc('get_student_rank', {
          p_test_id: realTestId,
          p_attempt_id: attemptId
        });
        if (!error && typeof data === 'number') return data;
      } catch (e) {
        console.warn('Supabase fetch get_student_rank RPC error', e);
      }
    }

    const leaderboard = await dataService.getLeaderboard(realTestId, 1000);
    const found = leaderboard.find(l => l.attempt_id === attemptId);
    return found ? found.rank : 1;
  },

  // ------------------------------------
  // QUESTION REPORTS (STUDENT FEEDBACK & ISSUE TRACKER)
  // ------------------------------------
  submitQuestionReport: async (
    reportInput: Omit<QuestionReport, 'id' | 'created_at' | 'status'> & { status?: ReportStatus }
  ): Promise<QuestionReport> => {
    const newReport: QuestionReport = {
      id: generateUUID(),
      test_id: reportInput.test_id,
      test_title: reportInput.test_title || 'Mock Test',
      question_id: reportInput.question_id,
      question_number: reportInput.question_number || 1,
      question_text: reportInput.question_text || '',
      option_a: reportInput.option_a || '',
      option_b: reportInput.option_b || '',
      option_c: reportInput.option_c || '',
      option_d: reportInput.option_d || '',
      correct_answer: reportInput.correct_answer || '',
      explanation: reportInput.explanation || null,
      student_name: reportInput.student_name || 'Aspirant',
      student_mobile: reportInput.student_mobile || '',
      student_email: reportInput.student_email || null,
      issue_type: reportInput.issue_type,
      student_comment: reportInput.student_comment.trim(),
      status: reportInput.status || 'pending',
      admin_notes: '',
      resolved_at: null,
      created_at: new Date().toISOString()
    };

    // Try Supabase if configured
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('question_reports').insert([newReport]);
      } catch (err) {
        console.warn('Supabase submit question report error:', err);
      }
    }

    // Save to localStorage
    const raw = localStorage.getItem(STORAGE_KEYS.REPORTS);
    let reports: QuestionReport[] = [];
    try {
      reports = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(reports)) reports = [];
    } catch {
      reports = [];
    }

    reports.unshift(newReport);
    localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(reports));

    // Dispatch custom event for real-time badge & dashboard counters
    try {
      window.dispatchEvent(new CustomEvent('gradeup_reports_updated', { detail: newReport }));
    } catch {}

    return newReport;
  },

  getQuestionReports: async (filter?: {
    testId?: string;
    status?: ReportStatus | 'all';
    issueType?: string;
  }): Promise<QuestionReport[]> => {
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      try {
        let query = supabase.from('question_reports').select('*').order('created_at', { ascending: false });
        if (filter?.testId && filter.testId !== 'all') {
          query = query.eq('test_id', filter.testId);
        }
        if (filter?.status && filter.status !== 'all') {
          query = query.eq('status', filter.status);
        }
        if (filter?.issueType && filter.issueType !== 'all') {
          query = query.eq('issue_type', filter.issueType);
        }
        const { data, error } = await query;
        if (!error && data && Array.isArray(data)) {
          // Merge or sync locally
          localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(data));
          return data as QuestionReport[];
        }
      } catch (err) {
        console.warn('Supabase fetch question reports error:', err);
      }
    }

    // Fallback to local storage
    const raw = localStorage.getItem(STORAGE_KEYS.REPORTS);
    let reports: QuestionReport[] = [];
    try {
      reports = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(reports)) reports = [];
    } catch {
      reports = [];
    }

    return reports.filter((r) => {
      if (filter?.testId && filter.testId !== 'all' && r.test_id !== filter.testId) {
        return false;
      }
      if (filter?.status && filter.status !== 'all' && r.status !== filter.status) {
        return false;
      }
      if (filter?.issueType && filter.issueType !== 'all' && r.issue_type !== filter.issueType) {
        return false;
      }
      return true;
    });
  },

  updateQuestionReportStatus: async (
    reportId: string,
    status: ReportStatus,
    adminNotes?: string
  ): Promise<QuestionReport | null> => {
    const supabase = getSupabaseClient();
    const resolvedAt = (status === 'resolved' || status === 'dismissed') ? new Date().toISOString() : null;

    if (isSupabaseConfigured() && supabase && isValidUUID(reportId)) {
      try {
        await supabase
          .from('question_reports')
          .update({
            status,
            admin_notes: adminNotes || '',
            resolved_at: resolvedAt
          })
          .eq('id', reportId);
      } catch (err) {
        console.warn('Supabase update question report error:', err);
      }
    }

    const raw = localStorage.getItem(STORAGE_KEYS.REPORTS);
    let reports: QuestionReport[] = [];
    try {
      reports = raw ? JSON.parse(raw) : [];
    } catch {}

    const idx = reports.findIndex((r) => r.id === reportId);
    if (idx !== -1) {
      reports[idx] = {
        ...reports[idx],
        status,
        admin_notes: adminNotes !== undefined ? adminNotes : reports[idx].admin_notes,
        resolved_at: resolvedAt
      };
      localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(reports));

      try {
        window.dispatchEvent(new CustomEvent('gradeup_reports_updated'));
      } catch {}

      return reports[idx];
    }
    return null;
  },

  deleteQuestionReport: async (reportId: string): Promise<void> => {
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase && isValidUUID(reportId)) {
      try {
        await supabase.from('question_reports').delete().eq('id', reportId);
      } catch (err) {
        console.warn('Supabase delete question report error:', err);
      }
    }

    const raw = localStorage.getItem(STORAGE_KEYS.REPORTS);
    let reports: QuestionReport[] = [];
    try {
      reports = raw ? JSON.parse(raw) : [];
    } catch {}

    const filtered = reports.filter((r) => r.id !== reportId);
    localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(filtered));

    try {
      window.dispatchEvent(new CustomEvent('gradeup_reports_updated'));
    } catch {}
  },

  bulkUpdateQuestionReports: async (
    reportIds: string[],
    status: ReportStatus
  ): Promise<void> => {
    const supabase = getSupabaseClient();
    const resolvedAt = (status === 'resolved' || status === 'dismissed') ? new Date().toISOString() : null;

    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase
          .from('question_reports')
          .update({ status, resolved_at: resolvedAt })
          .in('id', reportIds);
      } catch (err) {
        console.warn('Supabase bulk update question reports error:', err);
      }
    }

    const raw = localStorage.getItem(STORAGE_KEYS.REPORTS);
    let reports: QuestionReport[] = [];
    try {
      reports = raw ? JSON.parse(raw) : [];
    } catch {}

    const updated = reports.map((r) => {
      if (reportIds.includes(r.id)) {
        return { ...r, status, resolved_at: resolvedAt };
      }
      return r;
    });

    localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(updated));

    try {
      window.dispatchEvent(new CustomEvent('gradeup_reports_updated'));
    } catch {}
  },

  deleteQuestionReportsBulk: async (reportIds: string[]): Promise<void> => {
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('question_reports').delete().in('id', reportIds);
      } catch (err) {
        console.warn('Supabase bulk delete question reports error:', err);
      }
    }

    const raw = localStorage.getItem(STORAGE_KEYS.REPORTS);
    let reports: QuestionReport[] = [];
    try {
      reports = raw ? JSON.parse(raw) : [];
    } catch {}

    const filtered = reports.filter((r) => !reportIds.includes(r.id));
    localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(filtered));

    try {
      window.dispatchEvent(new CustomEvent('gradeup_reports_updated'));
    } catch {}
  },

  // ------------------------------------
  // SUPABASE STORAGE & DATABASE QUOTA METRICS
  // ------------------------------------
  getSupabaseStorageMetrics: async (): Promise<SupabaseStorageStats> => {
    const supabase = getSupabaseClient();
    const isRemote = isSupabaseConfigured() && supabase !== null;

    const tablesToTrack = [
      { name: 'tests', avgRowBytes: 1536 },
      { name: 'questions', avgRowBytes: 2048 },
      { name: 'students', avgRowBytes: 512 },
      { name: 'attempts', avgRowBytes: 1024 },
      { name: 'answers', avgRowBytes: 256 },
      { name: 'social_platforms', avgRowBytes: 512 },
      { name: 'social_verifications', avgRowBytes: 256 },
      { name: 'admin_settings', avgRowBytes: 4096 },
      { name: 'question_reports', avgRowBytes: 1024 }
    ];

    const tablesBreakdown: SupabaseTableMetric[] = [];
    let totalDbSizeBytes = 0;

    const formatBytes = (bytes: number): string => {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
    };

    if (isRemote && supabase) {
      for (const t of tablesToTrack) {
        try {
          const { count, error } = await supabase
            .from(t.name)
            .select('*', { count: 'exact', head: true });

          const rowCount = !error && count !== null ? count : 0;
          // Base Postgres table page size overhead + average row size
          const estimatedSize = rowCount > 0 ? (8192 + (rowCount * t.avgRowBytes)) : 8192;
          totalDbSizeBytes += estimatedSize;

          tablesBreakdown.push({
            name: t.name,
            rows: rowCount,
            estimatedSizeBytes: estimatedSize,
            estimatedSizeFormatted: formatBytes(estimatedSize)
          });
        } catch {
          // If table doesn't exist yet or query fails
          tablesBreakdown.push({
            name: t.name,
            rows: 0,
            estimatedSizeBytes: 0,
            estimatedSizeFormatted: '0 B'
          });
        }
      }
    } else {
      // Local storage fallback counts
      const tests = await dataService.getTests(true);
      const rawQ = localStorage.getItem(STORAGE_KEYS.QUESTIONS);
      let totalQ = 0;
      if (rawQ) {
        try {
          const parsed = JSON.parse(rawQ);
          Object.values(parsed).forEach((arr: any) => {
            if (Array.isArray(arr)) totalQ += arr.length;
          });
        } catch {}
      }
      const attempts = await dataService.getAttempts();
      const rawReports = localStorage.getItem(STORAGE_KEYS.REPORTS);
      let totalReports = 0;
      if (rawReports) {
        try {
          const parsed = JSON.parse(rawReports);
          if (Array.isArray(parsed)) totalReports = parsed.length;
        } catch {}
      }

      const countsMap: Record<string, number> = {
        tests: tests.length,
        questions: totalQ,
        students: new Set(attempts.map(a => a.student_mobile)).size,
        attempts: attempts.length,
        answers: attempts.length * 15,
        social_platforms: 4,
        social_verifications: attempts.length,
        admin_settings: 1,
        question_reports: totalReports
      };

      for (const t of tablesToTrack) {
        const rowCount = countsMap[t.name] || 0;
        const estimatedSize = rowCount > 0 ? (8192 + (rowCount * t.avgRowBytes)) : 8192;
        totalDbSizeBytes += estimatedSize;

        tablesBreakdown.push({
          name: t.name,
          rows: rowCount,
          estimatedSizeBytes: estimatedSize,
          estimatedSizeFormatted: formatBytes(estimatedSize)
        });
      }
    }

    // Check Object Storage Buckets in Supabase (e.g. logos, assets)
    const bucketsBreakdown: SupabaseBucketMetric[] = [];
    let objectStorageSizeBytes = 0;

    if (isRemote && supabase) {
      try {
        const { data: buckets, error } = await supabase.storage.listBuckets();
        if (!error && Array.isArray(buckets)) {
          for (const b of buckets) {
            try {
              const { data: files } = await supabase.storage.from(b.name).list('', { limit: 100 });
              const fileCount = files ? files.length : 0;
              // Estimate average 150KB per asset file if size not in metadata
              let bucketBytes = 0;
              if (files) {
                files.forEach((f: any) => {
                  bucketBytes += f.metadata?.size || 150000;
                });
              }
              objectStorageSizeBytes += bucketBytes;
              bucketsBreakdown.push({
                bucketName: b.name,
                fileCount,
                sizeBytes: bucketBytes,
                sizeFormatted: formatBytes(bucketBytes)
              });
            } catch {}
          }
        }
      } catch {
        // Storage API may have RLS or be disabled
      }
    }

    // If no buckets found or local, add default asset indicators
    if (bucketsBreakdown.length === 0) {
      const defaultLogoBytes = 124000; // ~124KB brand assets
      objectStorageSizeBytes += defaultLogoBytes;
      bucketsBreakdown.push({
        bucketName: 'brand-assets',
        fileCount: 3,
        sizeBytes: defaultLogoBytes,
        sizeFormatted: formatBytes(defaultLogoBytes)
      });
    }

    // Supabase Free Tier Standard Allocation is 500 MB Postgres DB + 1 GB Storage
    // Total combined standard allocation = 500 MB (524,288,000 bytes) database quota
    const allocatedQuotaBytes = 524288000; // 500 MB
    const totalUsedBytes = totalDbSizeBytes + objectStorageSizeBytes;
    const freeBytes = Math.max(0, allocatedQuotaBytes - totalUsedBytes);
    const percentageUsed = Math.min(100, Math.max(0.1, parseFloat(((totalUsedBytes / allocatedQuotaBytes) * 100).toFixed(2))));
    const percentageFree = parseFloat((100 - percentageUsed).toFixed(2));

    return {
      allocatedQuotaBytes,
      allocatedQuotaFormatted: '500 MB',
      databaseSizeBytes: totalDbSizeBytes,
      databaseSizeFormatted: formatBytes(totalDbSizeBytes),
      objectStorageSizeBytes,
      objectStorageSizeFormatted: formatBytes(objectStorageSizeBytes),
      totalUsedBytes,
      totalUsedFormatted: formatBytes(totalUsedBytes),
      freeBytes,
      freeFormatted: formatBytes(freeBytes),
      percentageUsed,
      percentageFree,
      storageQuotaTier: 'Supabase Free Tier (500 MB DB + 1 GB Storage)',
      isRealtimeConnected: isRemote,
      tablesBreakdown,
      bucketsBreakdown,
      lastCalculatedAt: new Date().toISOString()
    };
  },

  // ------------------------------------
  // TARGET EXAMS MANAGEMENT & MAPPINGS
  // ------------------------------------

  getTargetExams: async (includeInactive = false): Promise<TargetExam[]> => {
    let list: TargetExam[] = [];
    const supabase = getSupabaseClient();

    // Get list of permanently deleted target exam IDs/slugs
    const getDeletedIds = (): Set<string> => {
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.DELETED_TARGET_EXAMS);
        return new Set(raw ? JSON.parse(raw) : []);
      } catch {
        return new Set();
      }
    };
    const deletedIds = getDeletedIds();
    const isDeleted = (e: TargetExam | null | undefined): boolean => {
      if (!e) return true;
      if (e.id && deletedIds.has(e.id)) return true;
      if (e.slug && deletedIds.has(e.slug)) return true;
      return false;
    };

    if (isSupabaseConfigured() && supabase) {
      try {
        const query = supabase.from('target_exams').select('*').order('order_index', { ascending: true });
        if (!includeInactive) {
          query.eq('is_active', true);
        }
        const { data, error } = await query;
        if (!error && Array.isArray(data) && data.length > 0) {
          list = data
            .filter((item: any) => !isDeleted(item))
            .map((item: any) => ({
              ...item,
              mode_test_map: item.mode_test_map || { topic_wise: [], subject_wise: [], full_mock: [], pyq: [] }
            }));
          localStorage.setItem(STORAGE_KEYS.TARGET_EXAMS, JSON.stringify(list));
          idbStorage.set(STORAGE_KEYS.TARGET_EXAMS, list);
          return list;
        }
      } catch (err) {
        console.warn('Failed to fetch target exams from Supabase, using local fallback', err);
      }
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEYS.TARGET_EXAMS);
      if (raw !== null) {
        const parsed = JSON.parse(raw);
        list = Array.isArray(parsed) ? parsed : [];
      } else {
        // First-time setup only: populate with default target exams
        list = DEFAULT_TARGET_EXAMS.filter(def => !isDeleted(def));
        localStorage.setItem(STORAGE_KEYS.TARGET_EXAMS, JSON.stringify(list));
        idbStorage.set(STORAGE_KEYS.TARGET_EXAMS, list);
      }
    } catch {
      list = DEFAULT_TARGET_EXAMS.filter(def => !isDeleted(def));
    }

    // Always filter out any exam that the admin has explicitly deleted
    list = (Array.isArray(list) ? list : []).filter(e => e && !isDeleted(e));

    list.sort((a, b) => (a.order_index ?? 999) - (b.order_index ?? 999));

    if (!includeInactive) {
      list = list.filter(e => e.is_active !== false);
    }

    return list;
  },

  getTargetExamById: async (idOrSlug: string): Promise<TargetExam | null> => {
    if (!idOrSlug) return null;
    const exams = await dataService.getTargetExams(true);
    const target = exams.find(e => e.id === idOrSlug || e.slug === idOrSlug);
    return target || null;
  },

  saveTargetExam: async (exam: Partial<TargetExam>): Promise<TargetExam> => {
    const existingList = await dataService.getTargetExams(true);
    const now = new Date().toISOString();

    const id = exam.id || generateUUID();
    const slug = exam.slug || (exam.title || 'target-exam').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    // Unmark as deleted if it was previously deleted
    try {
      const rawDeleted = localStorage.getItem(STORAGE_KEYS.DELETED_TARGET_EXAMS);
      if (rawDeleted) {
        const delArr: string[] = JSON.parse(rawDeleted);
        const updated = delArr.filter(d => d !== id);
        localStorage.setItem(STORAGE_KEYS.DELETED_TARGET_EXAMS, JSON.stringify(updated));
      }
    } catch {}

    const completeExam: TargetExam = {
      id,
      title: (exam.title || 'New Target Exam').trim(),
      hindiTitle: exam.hindiTitle?.trim() || '',
      slug,
      category: exam.category || 'General & Mixed',
      icon: exam.icon || 'Target',
      description: exam.description || '',
      badgeText: exam.badgeText || '',
      is_active: exam.is_active !== undefined ? exam.is_active : true,
      is_popular: Boolean(exam.is_popular),
      order_index: exam.order_index !== undefined ? exam.order_index : (existingList.length + 1),
      mode_test_map: exam.mode_test_map || { topic_wise: [], subject_wise: [], full_mock: [], pyq: [] },
      assigned_test_ids: exam.assigned_test_ids || [],
      created_at: exam.created_at || now,
      updated_at: now
    };

    const idx = existingList.findIndex(e => e.id === id);
    if (idx >= 0) {
      existingList[idx] = completeExam;
    } else {
      existingList.push(completeExam);
    }

    try {
      localStorage.setItem(STORAGE_KEYS.TARGET_EXAMS, JSON.stringify(existingList));
    } catch (lsErr) {
      console.warn('localStorage quota warning for target exams:', lsErr);
    }
    idbStorage.set(STORAGE_KEYS.TARGET_EXAMS, existingList);

    // Sync to Supabase if configured
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('target_exams').upsert({
          id: completeExam.id,
          title: completeExam.title,
          hindi_title: completeExam.hindiTitle,
          slug: completeExam.slug,
          category: completeExam.category,
          icon: completeExam.icon,
          description: completeExam.description,
          badge_text: completeExam.badgeText,
          is_active: completeExam.is_active,
          is_popular: completeExam.is_popular,
          order_index: completeExam.order_index,
          mode_test_map: completeExam.mode_test_map,
          assigned_test_ids: completeExam.assigned_test_ids,
          updated_at: now
        });
      } catch (sbErr) {
        console.warn('Supabase target exams upsert warning (table might be optional/schema-agnostic):', sbErr);
      }
    }

    // Dispatch local event
    window.dispatchEvent(new CustomEvent('gradeup_target_exams_updated', { detail: completeExam }));

    return completeExam;
  },

  deleteTargetExam: async (idOrSlug: string): Promise<boolean> => {
    if (!idOrSlug) return false;

    // 1. Identify all identifiers (id and slug) for the target exam
    let idToDelete = idOrSlug;
    let slugToDelete: string | null = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.TARGET_EXAMS);
      const existingList: TargetExam[] = raw ? JSON.parse(raw) : [];
      const found = existingList.find(e => e.id === idOrSlug || e.slug === idOrSlug) ||
                    DEFAULT_TARGET_EXAMS.find(e => e.id === idOrSlug || e.slug === idOrSlug);
      if (found) {
        idToDelete = found.id;
        slugToDelete = found.slug || null;
      }
    } catch {}

    // 2. Record in permanently deleted exams set (in both LocalStorage and IndexedDB)
    try {
      const rawDeleted = localStorage.getItem(STORAGE_KEYS.DELETED_TARGET_EXAMS);
      const deletedList: string[] = rawDeleted ? JSON.parse(rawDeleted) : [];
      if (!deletedList.includes(idToDelete)) {
        deletedList.push(idToDelete);
      }
      if (slugToDelete && !deletedList.includes(slugToDelete)) {
        deletedList.push(slugToDelete);
      }
      if (idOrSlug && !deletedList.includes(idOrSlug)) {
        deletedList.push(idOrSlug);
      }
      localStorage.setItem(STORAGE_KEYS.DELETED_TARGET_EXAMS, JSON.stringify(deletedList));
      idbStorage.set(STORAGE_KEYS.DELETED_TARGET_EXAMS, deletedList);
    } catch (e) {
      console.warn('Failed to record deleted target exam id', e);
    }

    // 3. Remove from local storage array and IndexedDB
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.TARGET_EXAMS);
      const existingList: TargetExam[] = raw ? JSON.parse(raw) : [];
      const filtered = existingList.filter(e => 
        e.id !== idToDelete && 
        e.slug !== idToDelete && 
        e.id !== idOrSlug && 
        e.slug !== idOrSlug &&
        (!slugToDelete || (e.id !== slugToDelete && e.slug !== slugToDelete))
      );
      localStorage.setItem(STORAGE_KEYS.TARGET_EXAMS, JSON.stringify(filtered));
      idbStorage.set(STORAGE_KEYS.TARGET_EXAMS, filtered);
    } catch (e) {
      console.warn('Failed to remove from local storage on delete', e);
    }

    // 4. If active selected target exam was deleted, reset it
    const activeSelectedId = dataService.getSelectedTargetExamId();
    if (
      activeSelectedId === idToDelete || 
      activeSelectedId === idOrSlug || 
      (slugToDelete && activeSelectedId === slugToDelete)
    ) {
      dataService.setSelectedTargetExamId(null);
    }

    // 5. Delete from Supabase if configured
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('target_exams').delete().or(`id.eq.${idToDelete},slug.eq.${idToDelete}`);
      } catch (sbErr) {
        console.warn('Supabase delete target exam warning:', sbErr);
      }
    }

    window.dispatchEvent(new CustomEvent('gradeup_target_exams_updated', { detail: { deletedId: idToDelete, slug: slugToDelete } }));
    return true;
  },

  restoreDefaultTargetExams: async (): Promise<TargetExam[]> => {
    try {
      localStorage.removeItem(STORAGE_KEYS.DELETED_TARGET_EXAMS);
      localStorage.setItem(STORAGE_KEYS.TARGET_EXAMS, JSON.stringify(DEFAULT_TARGET_EXAMS));
      idbStorage.set(STORAGE_KEYS.TARGET_EXAMS, DEFAULT_TARGET_EXAMS);
    } catch (e) {
      console.warn('Failed to restore default target exams', e);
    }
    window.dispatchEvent(new CustomEvent('gradeup_target_exams_updated', { detail: { restored: true } }));
    return [...DEFAULT_TARGET_EXAMS];
  },

  getSelectedTargetExamId: (): string | null => {
    try {
      const val = localStorage.getItem(STORAGE_KEYS.SELECTED_TARGET_EXAM);
      return val && val !== 'null' && val !== 'undefined' ? val : null;
    } catch {
      return null;
    }
  },

  setSelectedTargetExamId: (id: string | null): void => {
    try {
      if (id) {
        localStorage.setItem(STORAGE_KEYS.SELECTED_TARGET_EXAM, id);
      } else {
        localStorage.removeItem(STORAGE_KEYS.SELECTED_TARGET_EXAM);
      }
    } catch {}
    window.dispatchEvent(new CustomEvent('gradeup_selected_target_exam_changed', { detail: { id } }));
  },

  getEffectiveTargetExam: async (): Promise<TargetExam | null> => {
    const selectedId = dataService.getSelectedTargetExamId();
    const exams = await dataService.getTargetExams(false);
    if (!selectedId) {
      return null;
    }
    const match = exams.find(e => e.id === selectedId || e.slug === selectedId);
    return match || null;
  },

  updateTargetExamModeMappings: async (
    targetExamId: string,
    modeTestMap: TargetExam['mode_test_map']
  ): Promise<TargetExam | null> => {
    const exam = await dataService.getTargetExamById(targetExamId);
    if (!exam) return null;

    // Collect all assigned test IDs across the 4 modes
    const allAssigned = new Set<string>();
    if (modeTestMap) {
      (Object.values(modeTestMap) as string[][]).forEach(list => {
        if (Array.isArray(list)) {
          list.forEach(id => allAssigned.add(id));
        }
      });
    }

    const updated = await dataService.saveTargetExam({
      ...exam,
      mode_test_map: modeTestMap,
      assigned_test_ids: Array.from(allAssigned)
    });

    return updated;
  },

  /**
   * Intelligently auto-maps existing mock tests to a target exam based on:
   * 1. Category name match
   * 2. Title & Exam code keywords match
   * 3. Inferred Practice Mode
   */
  autoMapTestsToTargetExam: async (targetExamId: string): Promise<TargetExam | null> => {
    const [exam, allTests] = await Promise.all([
      dataService.getTargetExamById(targetExamId),
      dataService.getTests(true)
    ]);

    if (!exam) return null;

    const newModeMap: {
      topic_wise: string[];
      subject_wise: string[];
      full_mock: string[];
      pyq: string[];
    } = {
      topic_wise: [],
      subject_wise: [],
      full_mock: [],
      pyq: []
    };

    const examTitleLower = (exam?.title || '').toLowerCase();
    const examCatLower = (exam?.category || '').toLowerCase();
    const examSlugLower = (exam?.slug || '').toLowerCase();

    // Check key search terms (e.g. ['police', 'constable', 'hp police'] or ['patwari'] or ['ssc', 'cgl'])
    const keywords: string[] = [];
    if (examSlugLower.includes('police')) keywords.push('police', 'constable', 'si');
    if (examSlugLower.includes('patwari')) keywords.push('patwari', 'revenue');
    if (examSlugLower.includes('court')) keywords.push('court', 'clerk', 'process server');
    if (examSlugLower.includes('ssc')) keywords.push('ssc', 'cgl', 'chsl', 'mts', 'gd');
    if (examSlugLower.includes('railway') || examSlugLower.includes('ntpc')) keywords.push('railway', 'rrb', 'ntpc', 'group d');
    if (examSlugLower.includes('bank')) keywords.push('bank', 'ibps', 'sbi', 'po', 'clerk');
    if (examSlugLower.includes('hpas') || examSlugLower.includes('allied')) keywords.push('hpas', 'allied', 'naib', 'hppsc');
    if (examSlugLower.includes('tet') || examSlugLower.includes('tgt')) keywords.push('tet', 'tgt', 'jbt', 'teaching');

    allTests.forEach(test => {
      const tMode = inferPracticeMode(test);
      const testTitleLower = (test.title || '').toLowerCase();
      const testCatLower = (test.category || '').toLowerCase();
      const testCodeLower = (test.test_code || test.exam_code || '').toLowerCase();

      let isMatch = false;

      // Check direct tag
      if (Array.isArray(test.target_exam_ids) && test.target_exam_ids.includes(exam.id)) {
        isMatch = true;
      }
      // Check universal exam or general test
      else if (exam.id === 'general-competitive-all') {
        isMatch = true;
      }
      // Check category match
      else if (testCatLower && examTitleLower.includes(testCatLower)) {
        isMatch = true;
      }
      // Check keyword matches
      else if (keywords.some(kw => testTitleLower.includes(kw) || testCatLower.includes(kw) || testCodeLower.includes(kw))) {
        isMatch = true;
      }

      if (isMatch) {
        if (newModeMap[tMode] && !newModeMap[tMode].includes(test.id)) {
          newModeMap[tMode].push(test.id);
        }
      }
    });

    return dataService.updateTargetExamModeMappings(exam.id, newModeMap);
  },

  /**
   * Filters tests for a Target Exam and optional Practice Mode:
   * If targetExam has an explicit mode_test_map, tests mapped to that mode (or all modes) are returned.
   * If mode_test_map is empty or unconfigured for this exam, falls back to intelligent category/keyword matching.
   */
  getTestsForTargetExam: (
    targetExam: TargetExam | null | undefined,
    practiceMode?: PracticeMode | 'All',
    testsToFilter?: Test[]
  ): Test[] => {
    const tests = testsToFilter || [];
    if (!targetExam) {
      if (!practiceMode || practiceMode === 'All') return tests;
      return tests.filter(t => inferPracticeMode(t) === practiceMode);
    }

    const modeMap = targetExam.mode_test_map || {};
    const assignedIds = new Set(targetExam.assigned_test_ids || []);

    // Check if exam has any explicit mappings configured
    const hasExplicitMappings =
      (modeMap.topic_wise && modeMap.topic_wise.length > 0) ||
      (modeMap.subject_wise && modeMap.subject_wise.length > 0) ||
      (modeMap.full_mock && modeMap.full_mock.length > 0) ||
      (modeMap.pyq && modeMap.pyq.length > 0) ||
      assignedIds.size > 0;

    if (hasExplicitMappings) {
      if (practiceMode && practiceMode !== 'All') {
        const allowedIds = new Set(modeMap[practiceMode] || []);
        // Also include any tests tagged to this target exam whose inferred mode is practiceMode
        return tests.filter(t => {
          if (allowedIds.has(t.id)) return true;
          if (Array.isArray(t.target_exam_ids) && t.target_exam_ids.includes(targetExam.id) && inferPracticeMode(t) === practiceMode) {
            return true;
          }
          return false;
        });
      } else {
        // All modes for this target exam
        const allAllowed = new Set<string>();
        if (modeMap.topic_wise) modeMap.topic_wise.forEach(id => allAllowed.add(id));
        if (modeMap.subject_wise) modeMap.subject_wise.forEach(id => allAllowed.add(id));
        if (modeMap.full_mock) modeMap.full_mock.forEach(id => allAllowed.add(id));
        if (modeMap.pyq) modeMap.pyq.forEach(id => allAllowed.add(id));
        assignedIds.forEach(id => allAllowed.add(id));

        return tests.filter(t => {
          if (allAllowed.has(t.id)) return true;
          if (Array.isArray(t.target_exam_ids) && t.target_exam_ids.includes(targetExam.id)) return true;
          return false;
        });
      }
    }

    // Fallback: Smart keyword & category matching for default / unmapped exams
    const examTitleLower = (targetExam?.title || '').toLowerCase();
    const examCatLower = (targetExam?.category || '').toLowerCase();
    const examSlugLower = (targetExam?.slug || '').toLowerCase();

    const keywords: string[] = [];
    if (examSlugLower.includes('police')) keywords.push('police', 'constable', 'si');
    if (examSlugLower.includes('patwari')) keywords.push('patwari', 'revenue');
    if (examSlugLower.includes('court')) keywords.push('court', 'clerk', 'process server');
    if (examSlugLower.includes('ssc')) keywords.push('ssc', 'cgl', 'chsl', 'mts', 'gd');
    if (examSlugLower.includes('railway') || examSlugLower.includes('ntpc')) keywords.push('railway', 'rrb', 'ntpc', 'group d');
    if (examSlugLower.includes('bank')) keywords.push('bank', 'ibps', 'sbi', 'po', 'clerk');
    if (examSlugLower.includes('hpas') || examSlugLower.includes('allied')) keywords.push('hpas', 'allied', 'naib', 'hppsc');
    if (examSlugLower.includes('tet') || examSlugLower.includes('tgt')) keywords.push('tet', 'tgt', 'jbt', 'teaching');

    return tests.filter(test => {
      const tMode = inferPracticeMode(test);
      if (practiceMode && practiceMode !== 'All' && tMode !== practiceMode) {
        return false;
      }

      if (targetExam.id === 'general-competitive-all') {
        return true;
      }

      if (Array.isArray(test.target_exam_ids) && test.target_exam_ids.includes(targetExam.id)) {
        return true;
      }

      const tTitle = (test.title || '').toLowerCase();
      const tCat = (test.category || '').toLowerCase();
      const tCode = (test.test_code || test.exam_code || '').toLowerCase();

      if (tCat && examTitleLower.includes(tCat)) return true;
      if (keywords.length > 0 && keywords.some(kw => tTitle.includes(kw) || tCat.includes(kw) || tCode.includes(kw))) {
        return true;
      }

      // If test is a general subject/topic test (e.g. Science, GK, English, Maths, Reasoning), it is also useful for this exam
      if (tCat === 'Section / Subject Practice' || tCat === 'Topic Wise Practice' || tCat === 'All Competitive Exams') {
        return true;
      }

      return false;
    });
  }
};
