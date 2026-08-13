import React, { useState, useEffect } from 'react';
import { Header } from './components/common/Header';
import { Footer } from './components/common/Footer';
import { Toast, ToastType } from './components/common/Toast';
import { SupabaseSetupModal } from './components/admin/SupabaseSetupModal';
import { AdminLogin } from './components/admin/AdminLogin';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { StudentHome } from './components/student/StudentHome';
import { TestIntro } from './components/student/TestIntro';
import { SocialGate } from './components/student/SocialGate';
import { StudentRegistration, StudentRegistrationData } from './components/student/StudentRegistration';
import { TestInterface } from './components/student/TestInterface';
import { TestResult } from './components/student/TestResult';
import { Test, Attempt } from './types';
import { dataService } from './services/dataService';

type ViewMode =
  | 'student_home'
  | 'student_intro'
  | 'student_social'
  | 'student_register'
  | 'student_exam'
  | 'student_result'
  | 'admin_login'
  | 'admin_dashboard';

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('student_home');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Active exam states
  const [selectedTest, setSelectedTest] = useState<Test | null>(null);
  const [studentData, setStudentData] = useState<StudentRegistrationData | null>(null);
  const [completedAttempt, setCompletedAttempt] = useState<Attempt | null>(null);

  // Modals & Toasts
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null);

  useEffect(() => {
    // Check initial dark mode preference
    const savedTheme = localStorage.getItem('gradeup_theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setIsDarkMode(true);
    } else {
      setIsDarkMode(false);
    }

    // Check admin session
    const adminSession = sessionStorage.getItem('gradeup_admin_logged');
    if (adminSession === 'true') {
      setIsAdminAuthenticated(true);
    }

    // Handle initial routing from URL parameters / pathname
    handleRouteFromUrl();

    // Listen to back/forward browser history changes
    window.addEventListener('popstate', handleRouteFromUrl);
    return () => window.removeEventListener('popstate', handleRouteFromUrl);
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
    }
  }, [isDarkMode]);

  const handleRouteFromUrl = async () => {
    const pathname = window.location.pathname; // e.g. "/test/demo" or "/admin"
    const searchParams = new URLSearchParams(window.location.search);
    const hash = window.location.hash;

    let testIdentifier: string | null = null;

    // Check pathname: /t/:id or /test/:id or /test/:slug
    if (pathname.includes('/t/')) {
      const parts = pathname.split('/t/');
      if (parts[1]) {
        testIdentifier = decodeURIComponent(parts[1].split('/')[0].split('?')[0]);
      }
    } else if (pathname.includes('/test/')) {
      const parts = pathname.split('/test/');
      if (parts[1]) {
        testIdentifier = decodeURIComponent(parts[1].split('/')[0].split('?')[0]);
      }
    } else if (pathname === '/admin' || pathname === '/admin/') {
      const isAdminLogged = sessionStorage.getItem('gradeup_admin_logged') === 'true';
      if (isAdminLogged) {
        setIsAdminAuthenticated(true);
        setViewMode('admin_dashboard');
      } else {
        setViewMode('admin_login');
      }
      return;
    }

    // Check query string: ?t=demo or ?test=demo or ?testId=demo or ?slug=demo
    if (!testIdentifier) {
      testIdentifier = searchParams.get('t') || searchParams.get('test') || searchParams.get('testId') || searchParams.get('slug');
    }

    // Check hash string: #/test/demo or #test=demo
    if (!testIdentifier && hash) {
      if (hash.includes('/test/')) {
        const parts = hash.split('/test/');
        if (parts[1]) {
          testIdentifier = decodeURIComponent(parts[1].split('/')[0].split('?')[0]);
        }
      } else if (hash.includes('test=')) {
        const match = hash.match(/test=([^&]+)/);
        if (match) testIdentifier = decodeURIComponent(match[1]);
      }
    }

    if (testIdentifier) {
      const test = await dataService.getTestBySlugOrId(testIdentifier);
      if (test) {
        setSelectedTest(test);
        setViewMode('student_intro');
      } else {
        showToast('error', `Test "${testIdentifier}" not found. Showing test directory.`);
        setViewMode('student_home');
      }
    }
  };

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('gradeup_theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('gradeup_theme', 'light');
      }
      return next;
    });
  };

  const showToast = (type: ToastType, message: string) => {
    setToast({ type, message });
  };

  // Student flow handlers
  const handleSelectTest = (test: Test) => {
    setSelectedTest(test);
    setViewMode('student_intro');
    const newSearch = `?t=${encodeURIComponent(test.slug || test.id)}`;
    if (window.location.search !== newSearch) {
      window.history.pushState({}, '', `/${newSearch}`);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleProceedToSocialGate = () => {
    setViewMode('student_social');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSocialGatePassed = () => {
    setViewMode('student_register');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStartExam = (data: StudentRegistrationData) => {
    setStudentData(data);
    setViewMode('student_exam');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFinishExam = (attempt: Attempt) => {
    setCompletedAttempt(attempt);
    setViewMode('student_result');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToDirectory = () => {
    setSelectedTest(null);
    setStudentData(null);
    setCompletedAttempt(null);
    setViewMode('student_home');
    if (window.location.pathname !== '/') {
      window.history.pushState({}, '', '/');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Admin flow handlers
  const handleAdminNavClick = () => {
    if (isAdminAuthenticated) {
      setViewMode('admin_dashboard');
    } else {
      setViewMode('admin_login');
    }
    if (window.location.pathname !== '/admin') {
      window.history.pushState({}, '', '/admin');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAdminLoginSuccess = () => {
    setIsAdminAuthenticated(true);
    sessionStorage.setItem('gradeup_admin_logged', 'true');
    setViewMode('admin_dashboard');
    showToast('success', 'Admin login successful!');
  };

  const handleAdminLogout = () => {
    setIsAdminAuthenticated(false);
    sessionStorage.removeItem('gradeup_admin_logged');
    setViewMode('student_home');
    showToast('info', 'Logged out of admin panel');
  };

  const isExamTerminalActive = viewMode === 'student_exam';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      
      {/* HEADER (Hidden during active test taking for clean exam environment) */}
      {!isExamTerminalActive && (
        <Header
          currentView={
            viewMode.startsWith('admin') ? 'admin' :
            viewMode === 'student_exam' ? 'test' :
            viewMode === 'student_result' ? 'result' : 'student'
          }
          isAdminAuthenticated={isAdminAuthenticated}
          isAdminLoggedIn={isAdminAuthenticated}
          onNavigateView={(view) => {
            if (view === 'admin') {
              handleAdminNavClick();
            } else {
              handleBackToDirectory();
            }
          }}
          onOpenAdmin={handleAdminNavClick}
          onOpenHome={handleBackToDirectory}
          onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
          darkMode={isDarkMode}
          isDarkMode={isDarkMode}
          onToggleDarkMode={toggleDarkMode}
          onToast={showToast}
        />
      )}

      {/* MAIN CONTAINER */}
      <main className={`flex-1 ${isExamTerminalActive ? 'p-0' : 'max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6'}`}>
        
        {/* STUDENT VIEWS */}
        {viewMode === 'student_home' && (
          <StudentHome
            onSelectTest={handleSelectTest}
            onOpenAdmin={handleAdminNavClick}
          />
        )}

        {viewMode === 'student_intro' && selectedTest && (
          <TestIntro
            test={selectedTest}
            onBack={handleBackToDirectory}
            onProceedToSocialGate={handleProceedToSocialGate}
          />
        )}

        {viewMode === 'student_social' && (
          <SocialGate
            onSuccessGate={handleSocialGatePassed}
            onToast={showToast}
          />
        )}

        {viewMode === 'student_register' && selectedTest && (
          <StudentRegistration
            test={selectedTest}
            onStartExam={handleStartExam}
            onToast={showToast}
          />
        )}

        {viewMode === 'student_exam' && selectedTest && studentData && (
          <TestInterface
            test={selectedTest}
            studentData={studentData}
            onFinishExam={handleFinishExam}
            onToast={showToast}
          />
        )}

        {viewMode === 'student_result' && completedAttempt && (
          <TestResult
            attempt={completedAttempt}
            onBackToHome={handleBackToDirectory}
            onToast={showToast}
          />
        )}

        {/* ADMIN VIEWS */}
        {viewMode === 'admin_login' && (
          <AdminLogin
            onLoginSuccess={handleAdminLoginSuccess}
            onBackToHome={handleBackToDirectory}
            onToast={showToast}
          />
        )}

        {viewMode === 'admin_dashboard' && isAdminAuthenticated && (
          <AdminDashboard
            onLogout={handleAdminLogout}
            onToast={showToast}
            onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
          />
        )}

      </main>

      {/* FOOTER (Hidden during active exam) */}
      {!isExamTerminalActive && <Footer onOpenAdmin={handleAdminNavClick} />}

      {/* SUPABASE SETUP CONFIG MODAL */}
      <SupabaseSetupModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        onToast={showToast}
      />

      {/* TOAST POPUP NOTIFICATION */}
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

    </div>
  );
}
