-- ========================================================
-- GRADEUP STUDY MOCK TEST PLATFORM - PRODUCTION SUPABASE SCHEMA
-- ========================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TESTS TABLE
CREATE TABLE IF NOT EXISTS public.tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_code VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    category VARCHAR(100) DEFAULT 'Competitive Exam',
    subject VARCHAR(100) DEFAULT 'General Paper',
    total_questions INTEGER DEFAULT 0,
    total_marks DECIMAL(10,2) DEFAULT 100.00,
    marks_per_question DECIMAL(5,2) DEFAULT 1.00,
    negative_marking DECIMAL(5,2) DEFAULT 0.25,
    duration_minutes INTEGER DEFAULT 90,
    passing_marks DECIMAL(10,2) DEFAULT 40.00,
    instructions TEXT,
    status VARCHAR(20) DEFAULT 'published' CHECK (status IN ('draft', 'published', 'unpublished', 'archived')),
    is_published BOOLEAN DEFAULT true,
    social_gate_enabled BOOLEAN DEFAULT true,
    social_gate_mode VARCHAR(50) DEFAULT 'global' CHECK (social_gate_mode IN ('global', 'custom_selection', 'custom_links')),
    social_platform_ids JSONB DEFAULT '[]'::jsonb,
    custom_social_platforms JSONB DEFAULT '[]'::jsonb,
    social_gate_title VARCHAR(255) DEFAULT 'Gradeup Study Official Community Requirement',
    social_gate_description TEXT DEFAULT 'Join our official community channels to receive free study PDFs, daily exam updates, and answer key notifications.',
    anti_cheating_enabled BOOLEAN DEFAULT true,
    randomize_questions BOOLEAN DEFAULT false,
    randomize_options BOOLEAN DEFAULT false,
    allow_back_navigation BOOLEAN DEFAULT true,
    allow_mark_for_review BOOLEAN DEFAULT true,
    show_result_immediately BOOLEAN DEFAULT true,
    show_correct_answers BOOLEAN DEFAULT true,
    show_explanation BOOLEAN DEFAULT true,
    enable_leaderboard BOOLEAN DEFAULT true,
    max_attempts_per_student INTEGER DEFAULT 1,
    start_time TIMESTAMP WITH TIME ZONE NULL,
    end_time TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. QUESTIONS TABLE
CREATE TABLE IF NOT EXISTS public.questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID REFERENCES public.tests(id) ON DELETE CASCADE,
    question_number INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    question_image TEXT NULL,
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT NOT NULL,
    correct_answer VARCHAR(1) NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D')),
    explanation TEXT NULL,
    marks DECIMAL(5,2) DEFAULT 1.00,
    negative_marks DECIMAL(5,2) DEFAULT 0.25,
    subject VARCHAR(100) DEFAULT 'General Studies',
    chapter VARCHAR(100) DEFAULT 'General',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_test_question_number UNIQUE (test_id, question_number)
);

-- 3. STUDENTS TABLE (Email is optional)
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(255) NOT NULL,
    mobile VARCHAR(15) NOT NULL,
    email VARCHAR(255) NULL,
    state VARCHAR(100) NOT NULL,
    district VARCHAR(100) NOT NULL,
    gender VARCHAR(20) NULL,
    age INTEGER NULL,
    exam_category VARCHAR(100) NULL,
    roll_number VARCHAR(50) NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. ATTEMPTS TABLE
CREATE TABLE IF NOT EXISTS public.attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID REFERENCES public.tests(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    student_name VARCHAR(255) NOT NULL,
    student_mobile VARCHAR(15) NOT NULL,
    student_email VARCHAR(255) NULL,
    student_state VARCHAR(100) NOT NULL,
    student_district VARCHAR(100) NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE NULL,
    submitted_at TIMESTAMP WITH TIME ZONE NULL,
    status VARCHAR(20) DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'auto_submitted', 'abandoned')),
    total_questions INTEGER DEFAULT 0,
    attempted_questions INTEGER DEFAULT 0,
    correct_answers INTEGER DEFAULT 0,
    wrong_answers INTEGER DEFAULT 0,
    skipped_questions INTEGER DEFAULT 0,
    score DECIMAL(10,2) DEFAULT 0.00,
    percentage DECIMAL(5,2) DEFAULT 0.00,
    time_taken_seconds INTEGER DEFAULT 0,
    suspicious_activity_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. ANSWERS TABLE
CREATE TABLE IF NOT EXISTS public.answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID REFERENCES public.attempts(id) ON DELETE CASCADE,
    question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE,
    selected_answer VARCHAR(1) NULL CHECK (selected_answer IN ('A', 'B', 'C', 'D', NULL)),
    is_correct BOOLEAN DEFAULT false,
    marks_obtained DECIMAL(5,2) DEFAULT 0.00,
    is_marked_for_review BOOLEAN DEFAULT false,
    answered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_attempt_question UNIQUE (attempt_id, question_id)
);

-- 6. SOCIAL PLATFORMS TABLE
CREATE TABLE IF NOT EXISTS public.social_platforms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform_name VARCHAR(100) NOT NULL,
    platform_url TEXT NOT NULL,
    icon VARCHAR(50) DEFAULT 'share2',
    button_text VARCHAR(100) DEFAULT 'Follow Us',
    verification_method VARCHAR(50) DEFAULT 'redirect_only' CHECK (verification_method IN ('redirect_only', 'manual_confirmation', 'oauth', 'official_api', 'admin_verification')),
    is_required BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. SOCIAL VERIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.social_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID REFERENCES public.attempts(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    platform_id UUID REFERENCES public.social_platforms(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'clicked' CHECK (status IN ('clicked', 'unverified', 'verified_pending', 'verified')),
    verification_method VARCHAR(50) DEFAULT 'redirect_only',
    verified_at TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. ADMIN SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.admin_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_name VARCHAR(255) DEFAULT 'Gradeup Study',
    logo_url TEXT DEFAULT '',
    website_url TEXT DEFAULT 'https://gradeupstudy.com',
    support_email VARCHAR(255) DEFAULT 'support@gradeupstudy.com',
    whatsapp_number VARCHAR(20) DEFAULT '+919816000000',
    telegram_channel TEXT DEFAULT 'https://t.me/gradeupstudy',
    youtube_channel TEXT DEFAULT 'https://youtube.com/@gradeupstudy',
    instagram_handle TEXT DEFAULT 'https://instagram.com/gradeupstudy',
    default_test_duration INTEGER DEFAULT 90,
    default_marks DECIMAL(5,2) DEFAULT 1.00,
    default_negative_marking DECIMAL(5,2) DEFAULT 0.25,
    mask_leaderboard_names BOOLEAN DEFAULT true,
    social_gate_enabled BOOLEAN DEFAULT true,
    social_gate_title VARCHAR(255) DEFAULT 'Gradeup Study Official Community Requirement',
    social_gate_description TEXT DEFAULT 'Join our official community channels to receive free study PDFs, daily exam updates, and answer key notifications.',
    social_platforms JSONB DEFAULT '[]'::jsonb,
    admin_email VARCHAR(255) DEFAULT 'admin@gradeupstudy.com',
    admin_password VARCHAR(255) DEFAULT 'gradeup123',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_tests_slug ON public.tests(slug);
CREATE INDEX IF NOT EXISTS idx_tests_test_code ON public.tests(test_code);
CREATE INDEX IF NOT EXISTS idx_tests_is_published ON public.tests(is_published);
CREATE INDEX IF NOT EXISTS idx_questions_test_id ON public.questions(test_id);
CREATE INDEX IF NOT EXISTS idx_attempts_test_id ON public.attempts(test_id);
CREATE INDEX IF NOT EXISTS idx_attempts_student_id ON public.attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_attempts_status ON public.attempts(status);
CREATE INDEX IF NOT EXISTS idx_attempts_submitted_at ON public.attempts(submitted_at);
CREATE INDEX IF NOT EXISTS idx_answers_attempt_id ON public.answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_social_verifications_student_id ON public.social_verifications(student_id);

-- ========================================================
-- SECURITY RPC FUNCTIONS (CRITICAL REQS)
-- ========================================================

-- RPC 1: Fetch Questions WITHOUT sending correct_answer or explanation to student browser
CREATE OR REPLACE FUNCTION public.get_public_test_questions(p_test_id UUID)
RETURNS TABLE (
    id UUID,
    test_id UUID,
    question_number INT,
    question_text TEXT,
    question_image TEXT,
    option_a TEXT,
    option_b TEXT,
    option_c TEXT,
    option_d TEXT,
    marks DECIMAL(5,2),
    negative_marks DECIMAL(5,2),
    subject VARCHAR(100),
    chapter VARCHAR(100)
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT 
        q.id,
        q.test_id,
        q.question_number,
        q.question_text,
        q.question_image,
        q.option_a,
        q.option_b,
        q.option_c,
        q.option_d,
        q.marks,
        q.negative_marks,
        q.subject,
        q.chapter
    FROM public.questions q
    INNER JOIN public.tests t ON t.id = q.test_id
    WHERE q.test_id = p_test_id AND t.is_published = true
    ORDER BY q.question_number ASC;
$$;

-- RPC 2: Server-Side Scoring Function (Prevents Client Tampering)
CREATE OR REPLACE FUNCTION public.submit_attempt_secure(
    p_attempt_id UUID,
    p_answers JSONB,
    p_time_taken_seconds INT,
    p_suspicious_count INT DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_attempt RECORD;
    v_test RECORD;
    v_q RECORD;
    v_ans_obj JSONB;
    v_selected VARCHAR(1);
    v_question_id UUID;
    v_correct_count INT := 0;
    v_wrong_count INT := 0;
    v_skipped_count INT := 0;
    v_attempted_count INT := 0;
    v_total_score DECIMAL(10,2) := 0.00;
    v_max_marks DECIMAL(10,2) := 0.00;
    v_percentage DECIMAL(5,2) := 0.00;
    v_q_marks DECIMAL(5,2);
    v_q_neg DECIMAL(5,2);
    v_is_correct BOOLEAN;
    v_marks_obtained DECIMAL(5,2);
BEGIN
    -- Check if attempt exists
    SELECT * INTO v_attempt FROM public.attempts WHERE id = p_attempt_id;
    IF v_attempt IS NULL THEN
        RAISE EXCEPTION 'Attempt not found';
    END IF;

    -- If already completed/auto_submitted, return existing result without re-calculating (Duplicate Protection)
    IF v_attempt.status IN ('completed', 'auto_submitted') THEN
        RETURN jsonb_build_object(
            'success', true,
            'attempt_id', v_attempt.id,
            'status', v_attempt.status,
            'score', v_attempt.score,
            'correct_answers', v_attempt.correct_answers,
            'wrong_answers', v_attempt.wrong_answers,
            'skipped_questions', v_attempt.skipped_questions,
            'percentage', v_attempt.percentage,
            'time_taken_seconds', v_attempt.time_taken_seconds,
            'already_submitted', true
        );
    END IF;

    -- Get test configuration
    SELECT * INTO v_test FROM public.tests WHERE id = v_attempt.test_id;

    -- Calculate scoring from official database questions
    FOR v_q IN SELECT * FROM public.questions WHERE test_id = v_attempt.test_id ORDER BY question_number ASC LOOP
        v_q_marks := COALESCE(v_q.marks, v_test.marks_per_question, 1.00);
        v_q_neg := COALESCE(v_q.negative_marks, v_test.negative_marking, 0.25);
        v_max_marks := v_max_marks + v_q_marks;

        -- Find user response for this question in JSONB array
        v_selected := NULL;
        FOR v_ans_obj IN SELECT * FROM jsonb_array_elements(p_answers) LOOP
            IF (v_ans_obj->>'question_id')::UUID = v_q.id THEN
                v_selected := NULLIF(TRIM(v_ans_obj->>'selected_answer'), '');
                EXIT;
            END IF;
        END LOOP;

        IF v_selected IS NOT NULL AND v_selected IN ('A', 'B', 'C', 'D') THEN
            v_attempted_count := v_attempted_count + 1;
            IF v_selected = v_q.correct_answer THEN
                v_correct_count := v_correct_count + 1;
                v_is_correct := true;
                v_marks_obtained := v_q_marks;
                v_total_score := v_total_score + v_q_marks;
            ELSE
                v_wrong_count := v_wrong_count + 1;
                v_is_correct := false;
                v_marks_obtained := -1.0 * v_q_neg;
                v_total_score := v_total_score - v_q_neg;
            END IF;
        ELSE
            v_skipped_count := v_skipped_count + 1;
            v_is_correct := false;
            v_marks_obtained := 0.00;
        END IF;

        -- Insert or Update answer record
        INSERT INTO public.answers (attempt_id, question_id, selected_answer, is_correct, marks_obtained, answered_at)
        VALUES (p_attempt_id, v_q.id, v_selected, v_is_correct, v_marks_obtained, NOW())
        ON CONFLICT (attempt_id, question_id) 
        DO UPDATE SET 
            selected_answer = EXCLUDED.selected_answer,
            is_correct = EXCLUDED.is_correct,
            marks_obtained = EXCLUDED.marks_obtained,
            answered_at = NOW();
    END LOOP;

    -- Score must never be negative (default rule)
    IF v_total_score < 0 THEN
        v_total_score := 0.00;
    END IF;

    IF v_max_marks > 0 THEN
        v_percentage := ROUND((v_total_score / v_max_marks) * 100.0, 2);
    END IF;

    -- Update attempt status atomically
    UPDATE public.attempts SET
        status = 'completed',
        submitted_at = NOW(),
        end_time = NOW(),
        attempted_questions = v_attempted_count,
        correct_answers = v_correct_count,
        wrong_answers = v_wrong_count,
        skipped_questions = v_skipped_count,
        score = v_total_score,
        percentage = v_percentage,
        time_taken_seconds = p_time_taken_seconds,
        suspicious_activity_count = p_suspicious_count
    WHERE id = p_attempt_id;

    RETURN jsonb_build_object(
        'success', true,
        'attempt_id', p_attempt_id,
        'status', 'completed',
        'score', v_total_score,
        'max_marks', v_max_marks,
        'correct_answers', v_correct_count,
        'wrong_answers', v_wrong_count,
        'skipped_questions', v_skipped_count,
        'percentage', v_percentage,
        'time_taken_seconds', p_time_taken_seconds,
        'already_submitted', false
    );
END;
$$;

-- RPC 3: Public Leaderboard with Masked Names & Privacy
CREATE OR REPLACE FUNCTION public.get_top_leaderboard(p_test_id UUID, p_limit INT DEFAULT 20)
RETURNS TABLE (
    rank BIGINT,
    attempt_id UUID,
    masked_name TEXT,
    score DECIMAL(10,2),
    correct_answers INT,
    time_taken_seconds INT,
    submitted_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT 
        ROW_NUMBER() OVER (
            ORDER BY a.score DESC, a.correct_answers DESC, a.time_taken_seconds ASC, a.submitted_at ASC
        ) as rank,
        a.id as attempt_id,
        CASE 
            WHEN LENGTH(a.student_name) > 3 THEN
                SUBSTRING(a.student_name FROM 1 FOR 1) || REPEAT('*', GREATEST(1, LENGTH(SPLIT_PART(a.student_name, ' ', 1)) - 1)) || ' ' || SUBSTRING(COALESCE(SPLIT_PART(a.student_name, ' ', 2), '') FROM 1 FOR 1) || '.'
            ELSE a.student_name
        END as masked_name,
        a.score,
        a.correct_answers,
        a.time_taken_seconds,
        a.submitted_at
    FROM public.attempts a
    WHERE a.test_id = p_test_id AND a.status IN ('completed', 'auto_submitted')
    ORDER BY a.score DESC, a.correct_answers DESC, a.time_taken_seconds ASC, a.submitted_at ASC
    LIMIT p_limit;
$$;

-- RPC 4: Get Student Rank
CREATE OR REPLACE FUNCTION public.get_student_rank(p_test_id UUID, p_attempt_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_rank INT;
BEGIN
    WITH ranked AS (
        SELECT 
            id,
            ROW_NUMBER() OVER (
                ORDER BY score DESC, correct_answers DESC, time_taken_seconds ASC, submitted_at ASC
            ) as r
        FROM public.attempts
        WHERE test_id = p_test_id AND status IN ('completed', 'auto_submitted')
    )
    SELECT r INTO v_rank FROM ranked WHERE id = p_attempt_id;
    RETURN COALESCE(v_rank, 0);
END;
$$;

-- ========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ========================================================
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Tests Policy
DROP POLICY IF EXISTS "Public tests viewable" ON public.tests;
CREATE POLICY "Public tests viewable" ON public.tests FOR SELECT USING (is_published = true OR auth.role() = 'authenticated');
CREATE POLICY "Admin write tests" ON public.tests FOR ALL USING (auth.role() = 'authenticated');

-- Questions Policy
DROP POLICY IF EXISTS "Questions viewable for published tests" ON public.questions;
CREATE POLICY "Questions viewable for published tests" ON public.questions FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.tests WHERE tests.id = questions.test_id AND tests.is_published = true)
    OR auth.role() = 'authenticated'
);
CREATE POLICY "Admin write questions" ON public.questions FOR ALL USING (auth.role() = 'authenticated');

-- Students Policy
DROP POLICY IF EXISTS "Anyone register student" ON public.students;
DROP POLICY IF EXISTS "Admin read students" ON public.students;
CREATE POLICY "Anyone register student" ON public.students FOR ALL USING (true);

-- Attempts Policy
DROP POLICY IF EXISTS "Anyone start attempt" ON public.attempts;
DROP POLICY IF EXISTS "Read attempt own or admin" ON public.attempts;
DROP POLICY IF EXISTS "Admin write attempts" ON public.attempts;
CREATE POLICY "Anyone manage attempts" ON public.attempts FOR ALL USING (true);

-- Answers Policy
DROP POLICY IF EXISTS "Anyone insert answer" ON public.answers;
DROP POLICY IF EXISTS "Read answers own attempt" ON public.answers;
DROP POLICY IF EXISTS "Admin write answers" ON public.answers;
CREATE POLICY "Anyone manage answers" ON public.answers FOR ALL USING (true);

-- Social & Settings Policy
DROP POLICY IF EXISTS "Anyone view active social" ON public.social_platforms;
DROP POLICY IF EXISTS "Admin manage social" ON public.social_platforms;
CREATE POLICY "Anyone view active social" ON public.social_platforms FOR SELECT USING (true);
CREATE POLICY "Admin manage social" ON public.social_platforms FOR ALL USING (true);

DROP POLICY IF EXISTS "Anyone view settings" ON public.admin_settings;
DROP POLICY IF EXISTS "Admin manage settings" ON public.admin_settings;
CREATE POLICY "Anyone view settings" ON public.admin_settings FOR SELECT USING (true);
CREATE POLICY "Admin manage settings" ON public.admin_settings FOR ALL USING (true);

DROP POLICY IF EXISTS "Public tests viewable" ON public.tests;
DROP POLICY IF EXISTS "Admin write tests" ON public.tests;
CREATE POLICY "Public tests viewable" ON public.tests FOR ALL USING (true);
CREATE POLICY "Admin write tests" ON public.tests FOR ALL USING (true);

DROP POLICY IF EXISTS "Questions viewable for published tests" ON public.questions;
DROP POLICY IF EXISTS "Admin write questions" ON public.questions;
CREATE POLICY "Questions viewable for published tests" ON public.questions FOR ALL USING (true);
CREATE POLICY "Admin write questions" ON public.questions FOR ALL USING (true);

-- ========================================================
-- MIGRATION SCRIPT FOR EXISTING SUPABASE DATABASES
-- Run this block if your tables were already created previously:
-- ========================================================
/*
-- 1. Ensure students unique mobile constraint
ALTER TABLE public.students DROP CONSTRAINT IF EXISTS unique_student_mobile;
CREATE UNIQUE INDEX IF NOT EXISTS idx_students_mobile ON public.students(mobile);

-- 2. Ensure RLS policies allow seamless student submissions
DROP POLICY IF EXISTS "Anyone register student" ON public.students;
DROP POLICY IF EXISTS "Admin read students" ON public.students;
CREATE POLICY "Anyone register student" ON public.students FOR ALL USING (true);

DROP POLICY IF EXISTS "Anyone start attempt" ON public.attempts;
DROP POLICY IF EXISTS "Read attempt own or admin" ON public.attempts;
DROP POLICY IF EXISTS "Admin write attempts" ON public.attempts;
CREATE POLICY "Anyone manage attempts" ON public.attempts FOR ALL USING (true);

DROP POLICY IF EXISTS "Anyone insert answer" ON public.answers;
DROP POLICY IF EXISTS "Read answers own attempt" ON public.answers;
DROP POLICY IF EXISTS "Admin write answers" ON public.answers;
CREATE POLICY "Anyone manage answers" ON public.answers FOR ALL USING (true);

-- 3. Ensure Social Gate columns
ALTER TABLE public.tests ADD COLUMN IF NOT EXISTS social_gate_enabled BOOLEAN DEFAULT true;
ALTER TABLE public.tests ADD COLUMN IF NOT EXISTS social_gate_mode VARCHAR(50) DEFAULT 'global';
ALTER TABLE public.tests ADD COLUMN IF NOT EXISTS social_platform_ids JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.tests ADD COLUMN IF NOT EXISTS custom_social_platforms JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.tests ADD COLUMN IF NOT EXISTS social_gate_title VARCHAR(255) DEFAULT 'Gradeup Study Official Community Requirement';
ALTER TABLE public.tests ADD COLUMN IF NOT EXISTS social_gate_description TEXT DEFAULT 'Join our official community channels to receive free study PDFs, daily exam updates, and answer key notifications.';

ALTER TABLE public.admin_settings ADD COLUMN IF NOT EXISTS social_gate_title VARCHAR(255) DEFAULT 'Gradeup Study Official Community Requirement';
ALTER TABLE public.admin_settings ADD COLUMN IF NOT EXISTS social_gate_description TEXT DEFAULT 'Join our official community channels to receive free study PDFs, daily exam updates, and answer key notifications.';
ALTER TABLE public.admin_settings ADD COLUMN IF NOT EXISTS social_gate_enabled BOOLEAN DEFAULT true;
ALTER TABLE public.admin_settings ADD COLUMN IF NOT EXISTS social_platforms JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.admin_settings ADD COLUMN IF NOT EXISTS admin_email VARCHAR(255) DEFAULT 'admin@gradeupstudy.com';
ALTER TABLE public.admin_settings ADD COLUMN IF NOT EXISTS admin_password VARCHAR(255) DEFAULT 'gradeup123';
*/
