-- ========================================================
-- GRADEUP STUDY MOCK TEST PLATFORM - SUPABASE SCHEMA SQL
-- ========================================================

-- Enable UUID extension if not enabled
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. STUDENTS TABLE
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(255) NOT NULL,
    mobile VARCHAR(15) NOT NULL,
    email VARCHAR(255) NOT NULL,
    state VARCHAR(100) NOT NULL,
    district VARCHAR(100) NOT NULL,
    gender VARCHAR(20) NULL,
    age INTEGER NULL,
    exam_category VARCHAR(100) NULL,
    roll_number VARCHAR(50) NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_student_contact UNIQUE (mobile, email)
);

-- 4. ATTEMPTS TABLE
CREATE TABLE IF NOT EXISTS public.attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID REFERENCES public.tests(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    student_name VARCHAR(255) NOT NULL,
    student_mobile VARCHAR(15) NOT NULL,
    student_email VARCHAR(255) NOT NULL,
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
    answered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. SOCIAL_PLATFORMS TABLE
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

-- 7. SOCIAL_VERIFICATIONS TABLE
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

-- 8. ADMIN_SETTINGS TABLE
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
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- INDEXES FOR SPEED AND QUERY OPTIMIZATION
CREATE INDEX IF NOT EXISTS idx_tests_slug ON public.tests(slug);
CREATE INDEX IF NOT EXISTS idx_questions_test_id ON public.questions(test_id);
CREATE INDEX IF NOT EXISTS idx_attempts_test_id ON public.attempts(test_id);
CREATE INDEX IF NOT EXISTS idx_attempts_student_id ON public.attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_answers_attempt_id ON public.answers(attempt_id);

-- ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Anonymous users can read published tests
CREATE POLICY "Public tests are viewable by anyone" ON public.tests
    FOR SELECT USING (is_published = true OR auth.role() = 'authenticated');

-- Anonymous users can read questions for published tests
CREATE POLICY "Questions viewable for published tests" ON public.questions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.tests 
            WHERE tests.id = questions.test_id AND (tests.is_published = true OR auth.role() = 'authenticated')
        )
    );

-- Allow students to register and create attempts
CREATE POLICY "Anyone can register student" ON public.students FOR INSERT WITH CHECK (true);
CREATE POLICY "Students can read own record" ON public.students FOR SELECT USING (true);

CREATE POLICY "Anyone can create attempt" ON public.attempts FOR INSERT WITH CHECK (true);
CREATE POLICY "Students can view attempts" ON public.attempts FOR SELECT USING (true);
CREATE POLICY "Students can update attempt" ON public.attempts FOR UPDATE USING (true);

CREATE POLICY "Anyone can insert answers" ON public.answers FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view answers for their attempt" ON public.answers FOR SELECT USING (true);

CREATE POLICY "Anyone can view active social platforms" ON public.social_platforms FOR SELECT USING (is_active = true OR auth.role() = 'authenticated');

-- Admin full privileges policy for authenticated users
CREATE POLICY "Admin full access on tests" ON public.tests FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin full access on questions" ON public.questions FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin full access on social platforms" ON public.social_platforms FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin full access on settings" ON public.admin_settings FOR ALL USING (auth.role() = 'authenticated');
