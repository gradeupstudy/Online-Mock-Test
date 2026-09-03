import React, { useState, useEffect } from 'react';
import { GraduationCap, ShieldCheck, Sun, Moon, Database, Award, Lock, Target } from 'lucide-react';
import { isSupabaseConfigured } from '../../lib/supabase';
import { dataService } from '../../services/dataService';
import { GULogo, BrandLogo } from './GULogo';
import { TargetExam } from '../../types';

interface HeaderProps {
  currentView?: 'student' | 'admin' | 'test' | 'result';
  isAdminAuthenticated?: boolean;
  isAdminLoggedIn?: boolean;
  onNavigateView?: (view: 'student' | 'admin') => void;
  onOpenAdmin?: () => void;
  onOpenHome?: () => void;
  onOpenSupabaseModal: () => void;
  darkMode?: boolean;
  isDarkMode?: boolean;
  onToggleDarkMode: () => void;
  onToast?: (type: 'success' | 'error' | 'info', msg: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView = 'student',
  isAdminAuthenticated,
  isAdminLoggedIn,
  onNavigateView,
  onOpenAdmin,
  onOpenHome,
  onOpenSupabaseModal,
  darkMode,
  isDarkMode,
  onToggleDarkMode,
  onToast
}) => {
  const isConnectedToSupabase = isSupabaseConfigured();
  const activeDarkMode = darkMode ?? isDarkMode ?? false;
  const activeAdminAuth = isAdminAuthenticated ?? isAdminLoggedIn ?? false;

  const [logoClicks, setLogoClicks] = useState(0);
  const [logoUrl, setLogoUrl] = useState<string | null>('/logo.png');
  const [imgError, setImgError] = useState(false);
  const [selectedTargetExam, setSelectedTargetExam] = useState<TargetExam | null>(null);
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(() => {
    return sessionStorage.getItem('gradeup_admin_unlocked') === 'true';
  });

  useEffect(() => {
    const fetchLogo = () => {
      dataService.getSettings().then(s => {
        if (s?.logo_url) {
          setLogoUrl(s.logo_url);
        }
      }).catch(err => console.warn('Failed to fetch settings in Header', err));
    };

    const fetchTargetExam = () => {
      const activeId = dataService.getSelectedTargetExamId();
      if (activeId) {
        dataService.getTargetExams().then(exams => {
          setSelectedTargetExam(exams.find(ex => ex.id === activeId) || null);
        });
      } else {
        setSelectedTargetExam(null);
      }
    };

    fetchLogo();
    fetchTargetExam();

    const handleSettingsUpdated = (e: any) => {
      if (e.detail?.logo_url !== undefined) {
        setLogoUrl(e.detail.logo_url);
      }
    };

    const handleTargetExamChanged = () => {
      fetchTargetExam();
    };

    window.addEventListener('gradeup_settings_updated', handleSettingsUpdated);
    window.addEventListener('gradeup_selected_target_exam_changed', handleTargetExamChanged);
    window.addEventListener('gradeup_target_exams_updated', handleTargetExamChanged);
    window.addEventListener('storage', fetchLogo);

    return () => {
      window.removeEventListener('gradeup_settings_updated', handleSettingsUpdated);
      window.removeEventListener('gradeup_selected_target_exam_changed', handleTargetExamChanged);
      window.removeEventListener('gradeup_target_exams_updated', handleTargetExamChanged);
      window.removeEventListener('storage', fetchLogo);
    };
  }, [currentView]);

  const handleLogoClick = () => {
    const newCount = logoClicks + 1;
    setLogoClicks(newCount);

    if (newCount === 10) {
      setLogoClicks(0);
      setIsAdminUnlocked(true);
      sessionStorage.setItem('gradeup_admin_unlocked', 'true');
      if (typeof onToast === 'function') {
        onToast('success', 'Admin Portal Unlocked! Redirecting to Admin Login...');
      }
      handleAdminClick();
    } else if (newCount >= 4 && newCount < 10) {
      if (typeof onToast === 'function') {
        onToast('info', `${10 - newCount} more clicks on logo to open Admin Login`);
      }
    } else if (newCount < 4) {
      handleStudentClick();
    }
  };

  const handleStudentClick = () => {
    if (typeof onNavigateView === 'function') {
      onNavigateView('student');
    } else if (typeof onOpenHome === 'function') {
      onOpenHome();
    }
  };

  const handleAdminClick = () => {
    if (typeof onNavigateView === 'function') {
      onNavigateView('admin');
    } else if (typeof onOpenAdmin === 'function') {
      onOpenAdmin();
    }
  };

  // Admin options (Admin button & Database settings) are ONLY visible if unlocked via 10 logo clicks or currently viewing admin
  const showAdminOption = isAdminUnlocked || currentView === 'admin';

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-2">
          
          {/* Logo & Brand Name */}
          <div 
            onClick={handleLogoClick}
            className="flex items-center gap-2 sm:gap-3 cursor-pointer group select-none relative min-w-0"
            title="Gradeup Study Mock Tests (Click to navigate)"
          >
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center p-1 shadow-md shadow-slate-900/10 group-hover:scale-105 transition-transform overflow-hidden shrink-0">
              <BrandLogo src={logoUrl} className="w-full h-full" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-base sm:text-xl md:text-2xl font-black tracking-tight text-slate-900 dark:text-white truncate">
                  GRADEUP <span className="text-blue-600 dark:text-blue-400">STUDY</span>
                </span>
                <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 shrink-0">
                  Mock Tests
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium hidden sm:block truncate">
                Your Trusted Partner During Preparation
              </p>
            </div>
          </div>

          {/* Right Navigation & Status Controls */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            
            {/* Target Exam Quick Switcher (Student View) */}
            {currentView !== 'admin' && (
              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('gradeup_open_target_exam_modal'));
                }}
                className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/70 dark:hover:bg-blue-900/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800/80 transition-all cursor-pointer shadow-2xs"
                title="Click to select or change your Target Exam"
              >
                <Target className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                <span className="hidden sm:inline font-bold text-slate-500 dark:text-slate-400">Target:</span>
                <span className="max-w-[85px] sm:max-w-[130px] truncate font-black">
                  {selectedTargetExam ? (selectedTargetExam.short_name || selectedTargetExam.title) : 'Select Exam'}
                </span>
                <span className="text-[10px] text-blue-500 font-mono">▾</span>
              </button>
            )}

            {/* Supabase Connection Status Badge (ONLY visible inside Admin Panel) */}
            {currentView === 'admin' && (
              <button
                onClick={onOpenSupabaseModal}
                className={`hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                  isConnectedToSupabase
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800 hover:bg-emerald-100'
                    : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 hover:bg-slate-200'
                }`}
                title="Click to manage Supabase database settings"
              >
                <Database className="w-3.5 h-3.5" />
                <span>{isConnectedToSupabase ? 'Supabase Live' : 'Database Settings'}</span>
              </button>
            )}

            {/* View Switcher (Student / Admin - Hidden on main screen unless unlocked) */}
            {showAdminOption && (
              <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 sm:p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                <button
                  onClick={handleStudentClick}
                  className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                    currentView === 'student' || currentView === 'test' || currentView === 'result'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>Student</span>
                </button>

                <button
                  onClick={handleAdminClick}
                  className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                    currentView === 'admin'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>Admin</span>
                  {activeAdminAuth && (
                    <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500 animate-pulse" />
                  )}
                </button>
              </div>
            )}

            {/* Dark / Light Toggle */}
            <button
              onClick={onToggleDarkMode}
              className="p-2 sm:p-2.5 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
              title="Toggle Dark / Light theme"
              aria-label="Toggle theme"
            >
              {activeDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
