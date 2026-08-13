import React, { useState, useEffect } from 'react';
import { GraduationCap, ShieldCheck, Sun, Moon, Database, Award, Lock } from 'lucide-react';
import { isSupabaseConfigured } from '../../lib/supabase';
import { dataService } from '../../services/dataService';
import { GULogo } from './GULogo';

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
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(() => {
    return sessionStorage.getItem('gradeup_admin_unlocked') === 'true';
  });

  useEffect(() => {
    dataService.getSettings().then(s => {
      if (s?.logo_url) {
        setLogoUrl(s.logo_url);
        setImgError(false);
      }
    }).catch(err => console.warn('Failed to fetch settings in Header', err));
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Logo & Brand Name */}
          <div 
            onClick={handleLogoClick}
            className="flex items-center gap-3 cursor-pointer group select-none relative"
            title="Gradeup Study Mock Tests"
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-tr from-blue-700 via-indigo-600 to-blue-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform overflow-hidden">
              {logoUrl && !imgError ? (
                <img
                  src={logoUrl}
                  alt="Gradeup Study Logo"
                  className="w-full h-full object-cover"
                  onError={() => setImgError(true)}
                />
              ) : (
                <GraduationCap className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                  GRADEUP <span className="text-blue-600 dark:text-blue-400">STUDY</span>
                </span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
                  Mock Tests
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium hidden xs:block">
                Your Trusted Partner During Preparation
              </p>
            </div>
          </div>

          {/* Right Navigation & Status Controls */}
          <div className="flex items-center gap-2 sm:gap-4">
            
            {/* Supabase Connection Status Badge (ONLY visible inside Admin Panel) */}
            {currentView === 'admin' && (
              <button
                onClick={onOpenSupabaseModal}
                className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
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
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                <button
                  onClick={handleStudentClick}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                    currentView === 'student' || currentView === 'test' || currentView === 'result'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Award className="w-4 h-4" />
                  <span>Student</span>
                </button>

                <button
                  onClick={handleAdminClick}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                    currentView === 'admin'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Admin</span>
                  {activeAdminAuth && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  )}
                </button>
              </div>
            )}

            {/* Dark / Light Toggle */}
            <button
              onClick={onToggleDarkMode}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors"
              title="Toggle Dark / Light theme"
            >
              {activeDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
