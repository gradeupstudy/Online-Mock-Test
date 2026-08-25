export type TestStatus = 'draft' | 'published' | 'unpublished' | 'archived';

export interface Test {
  id: string;
  test_code: string;
  exam_code?: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  subject: string;
  total_questions: number;
  total_marks: number;
  marks_per_question: number;
  negative_marking: number;
  duration_minutes: number;
  passing_marks: number;
  instructions: string;
  status: TestStatus;
  is_published: boolean;
  is_multisection?: boolean;
  sections?: string[];
  social_gate_enabled: boolean;
  social_gate_mode?: 'global' | 'custom_selection' | 'custom_links';
  social_platform_ids?: string[];
  custom_social_platforms?: SocialPlatform[];
  social_gate_title?: string;
  social_gate_description?: string;
  anti_cheating_enabled: boolean;
  randomize_questions: boolean;
  randomize_options: boolean;
  allow_back_navigation: boolean;
  allow_mark_for_review: boolean;
  show_result_immediately: boolean;
  show_correct_answers: boolean;
  show_explanation: boolean;
  enable_leaderboard: boolean;
  max_attempts_per_student: number;
  start_time?: string | null;
  end_time?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Question {
  id: string;
  test_id: string;
  question_number: number;
  question_text: string;
  question_image?: string | null;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer?: 'A' | 'B' | 'C' | 'D' | string; // Optional on public student client!
  explanation?: string | null;
  marks: number;
  negative_marks: number;
  subject: string;
  chapter: string;
  section?: string;
  topic?: string;
  difficulty?: 'Easy' | 'Medium' | 'Hard' | 'Mixed' | string;
  quality_score?: number;
  inspection_status?: 'verified' | 'needs_review' | 'pending';
  inspection_notes?: string;
  created_at?: string;
}

export interface Student {
  id: string;
  full_name: string;
  mobile: string;
  email?: string | null;
  state: string;
  district: string;
  gender?: string;
  age?: number;
  exam_category?: string;
  roll_number?: string;
  created_at?: string;
}

export type AttemptStatus = 'in_progress' | 'completed' | 'auto_submitted' | 'abandoned';

export interface AttemptResponseItem {
  question_id: string;
  user_answer: string | null;
  correct_answer?: string;
  status: 'correct' | 'wrong' | 'unattempted';
  marks_awarded: number;
}

export interface Attempt {
  id: string;
  test_id: string;
  student_id?: string;
  student_name: string;
  student_mobile: string;
  student_email?: string | null;
  student_state: string;
  student_district: string;
  start_time?: string;
  end_time?: string | null;
  submitted_at?: string | null;
  status: AttemptStatus;
  total_questions?: number;
  attempted_questions?: number;
  correct_answers: number;
  wrong_answers: number;
  skipped_questions?: number;
  unattempted_answers?: number;
  score: number;
  percentage: number;
  time_taken_seconds: number;
  suspicious_activity_count?: number;
  rank?: number;
  created_at?: string;
  responses?: AttemptResponseItem[];
}

export interface Answer {
  id: string;
  attempt_id: string;
  question_id: string;
  selected_answer: 'A' | 'B' | 'C' | 'D' | null;
  is_correct: boolean;
  marks_obtained: number;
  is_marked_for_review: boolean;
  answered_at?: string;
}

export interface SocialPlatform {
  id: string;
  platform_name: string;
  platform_url: string;
  icon: string;
  button_text: string;
  verification_method: 'redirect_only' | 'manual_confirmation' | 'oauth' | 'official_api' | 'admin_verification';
  is_required: boolean;
  is_active: boolean;
  order_index?: number;
  created_at?: string;
}

export interface SocialVerification {
  id: string;
  attempt_id?: string;
  student_id?: string;
  platform_id: string;
  status: 'clicked' | 'unverified' | 'verified_pending' | 'verified';
  verification_method: string;
  verified_at?: string | null;
  created_at?: string;
}

export interface AdminSettings {
  brand_name: string;
  logo_url: string;
  website_url: string;
  support_email: string;
  whatsapp_number: string;
  whatsapp_channel_url?: string;
  telegram_channel: string;
  youtube_channel: string;
  instagram_handle: string;
  default_test_duration: number;
  default_marks: number;
  default_negative_marking: number;
  mask_leaderboard_names: boolean;
  admin_email?: string;
  admin_password?: string;
  social_gate_title?: string;
  social_gate_description?: string;
  social_platforms?: SocialPlatform[];
  social_gate_enabled?: boolean;
}

export interface PublicLeaderboardEntry {
  rank: number;
  attempt_id: string;
  student_name: string;
  student_district?: string;
  student_state?: string;
  masked_name: string;
  score: number;
  percentage?: number;
  correct_answers: number;
  wrong_answers?: number;
  unattempted_answers?: number;
  time_taken_seconds: number;
  submitted_at: string;
}

export interface SubmitAttemptResult {
  success: boolean;
  attempt_id: string;
  status: AttemptStatus;
  score: number;
  max_marks: number;
  correct_answers: number;
  wrong_answers: number;
  skipped_questions: number;
  percentage: number;
  time_taken_seconds: number;
  already_submitted: boolean;
}

export type QuestionStatus = 'not_visited' | 'visited' | 'answered' | 'marked_for_review' | 'answered_marked';

export type ReportStatus = 'pending' | 'reviewed' | 'resolved' | 'dismissed';

export type ReportIssueType = 
  | 'wrong_answer_key'
  | 'question_error'
  | 'typo_grammar'
  | 'ambiguous_options'
  | 'out_of_syllabus'
  | 'other';

export interface QuestionReport {
  id: string;
  test_id: string;
  test_title?: string;
  question_id: string;
  question_number?: number;
  question_text?: string;
  option_a?: string;
  option_b?: string;
  option_c?: string;
  option_d?: string;
  correct_answer?: string;
  explanation?: string | null;
  student_name?: string;
  student_mobile?: string;
  student_email?: string | null;
  issue_type: ReportIssueType;
  student_comment: string;
  status: ReportStatus;
  admin_notes?: string;
  resolved_at?: string | null;
  created_at: string;
}

// ----------------------------------------------------
// STUDENT PERSONALIZED PERFORMANCE ANALYTICS TYPES
// ----------------------------------------------------

export type PerformanceStatusCategory = 'strong' | 'average' | 'needs_improvement' | 'weak' | 'insufficient_data';

export interface PerformanceStatusInfo {
  status: PerformanceStatusCategory;
  label: string; // 'Strong 🟢', 'Average 🟡', 'Needs Improvement 🟠', 'Weak 🔴', 'Insufficient Data'
  badgeEmoji: string; // '🟢', '🟡', '🟠', '🔴', '⚪'
  color: string; // hex / tailwind color identifier
  badgeClass: string;
  bgClass: string;
  borderClass: string;
  description: string;
}

export interface TopicPerformance {
  subject: string;
  chapter: string;
  topic: string;
  total_questions: number;
  attempted: number;
  correct: number;
  incorrect: number;
  skipped: number;
  accuracy: number; // Percentage 0-100 based on attempted
  has_sufficient_data: boolean; // True if attempted >= 3
  status: PerformanceStatusInfo;
}

export interface ChapterPerformance {
  subject: string;
  chapter: string;
  total_questions: number;
  attempted: number;
  correct: number;
  incorrect: number;
  skipped: number;
  accuracy: number;
  status: PerformanceStatusInfo;
  topics: TopicPerformance[];
}

export interface SubjectPerformance {
  subject: string;
  total_questions: number;
  attempted: number;
  correct: number;
  incorrect: number;
  skipped: number;
  accuracy: number;
  score: number;
  max_marks: number;
  status: PerformanceStatusInfo;
  avg_time_per_question?: number;
  chapters: ChapterPerformance[];
}

export interface DifficultyPerformance {
  difficulty: 'Easy' | 'Moderate' | 'Hard';
  total_questions: number;
  attempted: number;
  correct: number;
  incorrect: number;
  skipped: number;
  accuracy: number;
  status: PerformanceStatusInfo;
  recommendation: string;
}

export interface WeakAreaItem {
  id: string;
  subject: string;
  chapter: string;
  topic: string;
  accuracy: number;
  attempted: number;
  incorrect: number;
  total_questions: number;
  status: PerformanceStatusInfo;
  level: 'topic' | 'chapter';
}

export interface StrongAreaItem {
  id: string;
  subject: string;
  chapter: string;
  topic: string;
  accuracy: number;
  attempted: number;
  correct: number;
  total_questions: number;
  status: PerformanceStatusInfo;
  level: 'topic' | 'chapter';
}

export interface SpeedAnalysisSubjectItem {
  subject: string;
  avg_time_seconds: number;
  accuracy: number;
  insight: string;
  pace: 'fast' | 'moderate' | 'slow';
}

export interface SpeedAnalysis {
  total_time_seconds: number;
  avg_time_per_question_seconds: number;
  ideal_time_per_question_seconds: number;
  pace_status: 'optimal' | 'fast' | 'slow';
  subject_times: SpeedAnalysisSubjectItem[];
  insights: string[];
}

export interface RecentAttemptHistoryItem {
  id: string;
  test_id: string;
  test_title: string;
  date: string;
  score: number;
  total_marks: number;
  percentage: number;
  accuracy: number;
  time_taken_seconds: number;
  status: PerformanceStatusInfo;
}

export interface CrossTestProgress {
  has_history: boolean;
  total_completed_tests: number;
  previous_avg_accuracy: number;
  current_accuracy: number;
  improvement_delta: number; // e.g. +8.2 or -3.1
  is_improved: boolean;
  message: string;
  recent_attempts: RecentAttemptHistoryItem[];
}

export interface PersonalizedStudentAnalytics {
  attempt_id: string;
  test_id: string;
  student_name: string;
  overall_score: number;
  total_marks: number;
  percentage: number;
  overall_accuracy: number;
  correct_answers: number;
  wrong_answers: number;
  skipped_questions: number;
  total_questions: number;
  attempted_questions: number;
  time_taken_seconds: number;
  overall_status: PerformanceStatusInfo;
  subjects: SubjectPerformance[];
  weakest_areas: WeakAreaItem[];
  strongest_areas: StrongAreaItem[];
  difficulty_breakdown: DifficultyPerformance[];
  speed_analysis: SpeedAnalysis;
  progress: CrossTestProgress;
}
