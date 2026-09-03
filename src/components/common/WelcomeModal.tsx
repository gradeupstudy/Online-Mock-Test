import React, { useState, useEffect } from 'react';
import { Sparkles, GraduationCap, Rocket, Target, TrendingUp, Trophy, ArrowRight, X } from 'lucide-react';
import { GULogo, BrandLogo } from './GULogo';
import { dataService } from '../../services/dataService';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({ isOpen, onClose }) => {
  const [logoUrl, setLogoUrl] = useState<string | null>('/logo.svg');

  useEffect(() => {
    if (isOpen) {
      dataService.getSettings().then(s => {
        if (s?.logo_url) {
          setLogoUrl(s.logo_url);
        }
      }).catch(err => console.warn('Failed to load settings in WelcomeModal', err));
    }

    const handleSettingsUpdated = (e: any) => {
      if (e.detail?.logo_url !== undefined) {
        setLogoUrl(e.detail.logo_url);
      }
    };

    const handleStorageChange = () => {
      dataService.getSettings().then(s => {
        if (s?.logo_url) {
          setLogoUrl(s.logo_url);
        }
      }).catch(err => console.warn('Failed to load settings in WelcomeModal', err));
    };

    window.addEventListener('gradeup_settings_updated', handleSettingsUpdated);
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('gradeup_settings_updated', handleSettingsUpdated);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      style={{ animation: 'fadeIn 0.25s ease-out forwards' }}
    >
      {/* Backdrop with blur */}
      <div 
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div 
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden z-10 my-auto text-slate-900 dark:text-white transform transition-all"
        style={{ animation: 'scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}
      >
        {/* Top Decorative Header Accent */}
        <div className="h-2 w-full bg-gradient-to-r from-red-600 via-amber-500 to-blue-600" />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer z-20"
          aria-label="Close Welcome Note"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content Body */}
        <div className="p-6 sm:p-8 text-center space-y-6">
          
          {/* Official Gradeup Study Logo Presentation */}
          <div className="relative inline-flex items-center justify-center mx-auto">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-white dark:bg-slate-800 border-2 border-slate-200/90 dark:border-slate-700 flex items-center justify-center p-3.5 shadow-xl relative transition-transform hover:scale-105">
              <BrandLogo src={logoUrl} className="w-full h-full" />
              <div className="absolute -bottom-2.5 -right-2.5 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white rounded-full p-2 shadow-lg border-2 border-white dark:border-slate-900">
                <GraduationCap className="w-4 h-4" />
              </div>
            </div>
          </div>


          {/* Heading Section */}
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center justify-center gap-2 flex-wrap">
              <span>Welcome to Gradeup Study</span>
              <span className="text-2xl sm:text-3xl">🎓</span>
            </h2>

            {/* Subtitle Badge */}
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-gradient-to-r from-red-50 to-amber-50 dark:from-red-950/40 dark:to-amber-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/60 rounded-full text-xs font-black uppercase tracking-wider shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Free Mock Test Portfolio</span>
            </div>
          </div>

          {/* Motto / 3-Step Pillar Box */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700/70 space-y-3">
            <div className="text-sm sm:text-base font-extrabold text-blue-600 dark:text-blue-400 flex items-center justify-center gap-2">
              <span>Practice. Improve. Succeed.</span>
              <span className="text-base">🚀</span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1 text-center">
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                <div className="w-7 h-7 mx-auto rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-1.5 font-bold text-xs">
                  <Target className="w-4 h-4" />
                </div>
                <p className="text-[11px] font-black text-slate-800 dark:text-slate-200">Practice</p>
                <p className="text-[9px] text-slate-500 font-medium">Real Exam MCQs</p>
              </div>

              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                <div className="w-7 h-7 mx-auto rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-1.5 font-bold text-xs">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <p className="text-[11px] font-black text-slate-800 dark:text-slate-200">Improve</p>
                <p className="text-[9px] text-slate-500 font-medium">Instant Analysis</p>
              </div>

              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                <div className="w-7 h-7 mx-auto rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-1.5 font-bold text-xs">
                  <Trophy className="w-4 h-4" />
                </div>
                <p className="text-[11px] font-black text-slate-800 dark:text-slate-200">Succeed</p>
                <p className="text-[9px] text-slate-500 font-medium">State Merit Rank</p>
              </div>
            </div>
          </div>

          {/* Warm Heartfelt Wish Banner */}
          <div className="p-3.5 bg-gradient-to-r from-amber-500/10 via-red-500/10 to-blue-500/10 rounded-2xl border border-amber-300/40 dark:border-amber-700/30">
            <p className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center justify-center gap-1.5">
              <span>Best of Luck, Aspirant!</span>
              <span>✨</span>
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Your dedication today shapes your success tomorrow.
            </p>
          </div>

          {/* Action CTA Button */}
          <div className="pt-1">
            <button
              onClick={onClose}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-red-600 via-red-500 to-amber-600 hover:from-red-700 hover:to-amber-700 active:scale-[0.98] text-white font-extrabold text-sm sm:text-base shadow-lg shadow-red-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Start Practicing Mock Tests</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
