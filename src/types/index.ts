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
  telegram_channel: string;
  youtube_channel: string;
  instagram_handle: string;
  default_test_duration: number;
  default_marks: number;
  default_negative_marking: number;
  mask_leaderboard_names: boolean;
}

export interface PublicLeaderboardEntry {
  rank: number;
  attempt_id: string;
  masked_name: string;
  score: number;
  correct_answers: number;
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
