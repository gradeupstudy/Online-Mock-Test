import { PracticeMode, Test, Question } from './index';

export type AutomationState =
  | 'UPLOADED'
  | 'CONFIGURED'
  | 'OCR_PROCESSING'
  | 'BILINGUAL_ENRICHING'
  | 'AUDITING'
  | 'AUDIT_READY'
  | 'WAITING_FOR_ADMIN_CONFIRMATION'
  | 'AUDIT_REJECTED'
  | 'PAUSED'
  | 'GENERATING_TESTS'
  | 'FINAL_AUDIT'
  | 'READY_FOR_ADMIN_REVIEW'
  | 'PUBLISHED';

export type AuditStatus = 'VALID' | 'NEEDS_REVIEW' | 'INVALID' | 'DUPLICATE' | 'NEAR_DUPLICATE';

export interface AIAutomationConfig {
  // Source File & Range
  fileName: string;
  fileSizeFormatted: string;
  pageRangeMode: 'all' | 'custom';
  startPage: number;
  endPage: number;
  totalPages: number;

  // Destination / Test Settings
  category: string; // Mock Test Path / Category (e.g. "Section / Subject Practice" or "HP Police Constable")
  practiceMode: PracticeMode; // 'topic_wise' | 'subject_wise' | 'full_mock' | 'pyq'
  subject: string; // Section / Subject (e.g. "General Science")
  topic?: string; // Optional Topic
  mockTestNamePrefix: string; // e.g. "General Science Mock Test"
  startingTestNumber: number; // e.g. 1
  numberOfMockTests: number; // e.g. 50
  mcqsPerMockTest: number; // e.g. 20
  marksPerQuestion: number; // e.g. 1
  negativeMarking: number; // e.g. 0
  durationMinutes: number; // e.g. 15
  passingMarks?: number;
  language: 'bilingual' | 'hindi' | 'english';
  autoEnrichDualLanguageAndExplanations?: boolean; // Pre-audit dual language & explanation enrichment
  questionReusePolicy: 'OFF' | 'ON';
  questionOrderingPreference: 'sequential' | 'topic_balanced' | 'random_shuffle';
}

export interface AuditedMCQ {
  id: string;
  original_number: number;
  question_text: string;
  question_hi?: string | null;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: 'A' | 'B' | 'C' | 'D' | string;
  answer_source?: string;
  explanation?: string | null;
  subject: string;
  chapter?: string;
  topic?: string;
  difficulty?: 'Easy' | 'Medium' | 'Hard' | 'Moderate' | string;
  source_page: number;
  
  // 360° Audit Status & Details
  audit_status: AuditStatus;
  audit_reasons: string[];
  audit_score: number; // 0 - 100
  is_approved_by_admin: boolean;
  is_excluded: boolean;
  duplicate_of_id?: string;
  duplicate_similarity_pct?: number;
  ocr_confidence?: number;
  has_math_formula?: boolean;
  has_hindi_text?: boolean;
  admin_notes?: string;
  last_edited_at?: string;
}

export interface AuditReportSummary {
  total_extracted: number;
  valid_count: number;
  needs_review_count: number;
  invalid_count: number;
  duplicate_count: number;
  near_duplicate_count: number;
  approved_for_generation: number;
  required_for_generation: number;
  is_sufficient: boolean;
  deficit: number;
}

export interface AdminAuditConfirmation {
  id: string;
  confirmed_by_admin_id: string;
  confirmed_by_email: string;
  timestamp: string;
  audit_version: string;
  audit_summary: AuditReportSummary;
  config_snapshot: AIAutomationConfig;
  total_approved_questions: number;
  action: 'APPROVED_AND_STARTED_GENERATION' | 'PAUSED' | 'REJECTED';
  notes?: string;
}

export interface FinalAuditCheckItem {
  id: string;
  title: string;
  description: string;
  passed: boolean;
  details?: string;
}

export interface FinalTestAuditReport {
  timestamp: string;
  total_tests_requested: number;
  total_tests_generated: number;
  mcqs_per_test_requested: number;
  mcqs_per_test_verified: boolean;
  total_unique_assignments_required: number;
  total_unique_assignments_verified: number;
  marks_per_test_verified: boolean;
  negative_marking_verified: boolean;
  no_unintended_duplicates: boolean;
  no_orphan_records: boolean;
  database_relationships_valid: boolean;
  all_tests_in_ready_review: boolean;
  passed: boolean;
  checks: FinalAuditCheckItem[];
}

export interface GeneratedTestSummary {
  test: Test;
  questions: Question[];
  question_count: number;
  total_marks: number;
  is_published: boolean;
}

export interface AIAutomationSession {
  id: string;
  state: AutomationState;
  config: AIAutomationConfig;
  extractedQuestions: AuditedMCQ[];
  auditSummary: AuditReportSummary;
  adminConfirmation?: AdminAuditConfirmation | null;
  generatedTests: GeneratedTestSummary[];
  finalAuditReport?: FinalTestAuditReport | null;
  createdAt: string;
  updatedAt: string;
}
