import React, { useState, useEffect } from 'react';
import { User, Phone, Mail, MapPin, Building, ArrowRight, ShieldCheck, CheckCircle, AlertTriangle, Trophy, Eye, ArrowLeft, RefreshCw, Layers } from 'lucide-react';
import { INDIAN_STATES_DISTRICTS } from '../../data/indianStatesDistricts';
import { Test, Attempt } from '../../types';
import { dataService } from '../../services/dataService';

export interface StudentRegistrationData {
  attempt_id?: string;
  student_name: string;
  student_mobile: string;
  student_email: string;
  student_state: string;
  student_district: string;
}

interface StudentRegistrationProps {
  test: Test;
  onStartExam: (data: StudentRegistrationData) => void;
  onBackToHome?: () => void;
  onViewPreviousAttempt?: (attempt: Attempt) => void;
  onToast?: (type: 'success' | 'error' | 'info', msg: string) => void;
}

export const StudentRegistration: React.FC<StudentRegistrationProps> = ({ 
  test, 
  onStartExam, 
  onBackToHome,
  onViewPreviousAttempt,
  onToast 
}) => {
  const [formData, setFormData] = useState<StudentRegistrationData>({
    student_name: '',
    student_mobile: '',
    student_email: '',
    student_state: 'Himachal Pradesh',
    student_district: 'Kangra'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attemptBlock, setAttemptBlock] = useState<{
    reason: string;
    currentAttempts: number;
    maxAttempts: number;
    previousAttempts: Attempt[];
  } | null>(null);

  const maxAttempts = test.max_attempts_per_student !== undefined && test.max_attempts_per_student !== null 
    ? Number(test.max_attempts_per_student) 
    : 0;

  useEffect(() => {
    // Load cached student info from localStorage if available
    const saved = localStorage.getItem('gradeup_student_info');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setFormData(parsed);
      } catch (e) {
        // ignore
      }
    }
  }, []);

  const handleStateChange = (stateName: string) => {
    const districtsForState = INDIAN_STATES_DISTRICTS[stateName] || [];
    setFormData((prev) => ({
      ...prev,
      student_state: stateName,
      student_district: districtsForState[0] || ''
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.student_name.trim()) {
      onToast?.('error', 'Please enter your Full Name');
      return;
    }

    if (!/^\d{10}$/.test(formData.student_mobile.trim())) {
      onToast?.('error', 'Please enter a valid 10-digit mobile number');
      return;
    }

    if (formData.student_email.trim() && !formData.student_email.includes('@')) {
      onToast?.('error', 'Please enter a valid email address');
      return;
    }

    if (!formData.student_state || !formData.student_district) {
      onToast?.('error', 'Please select your State and District');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Check Student Attempt Eligibility
      const eligibility = await dataService.checkStudentAttemptEligibility(test, formData.student_mobile.trim());

      if (!eligibility.allowed) {
        setAttemptBlock({
          reason: eligibility.reason || 'Attempt limit reached for this mock test.',
          currentAttempts: eligibility.currentAttempts,
          maxAttempts: eligibility.maxAttempts,
          previousAttempts: eligibility.previousAttempts || []
        });
        onToast?.('error', `Attempt limit reached (${eligibility.currentAttempts}/${eligibility.maxAttempts})!`);
        setIsSubmitting(false);
        return;
      }

      // Save to localStorage for convenience
      localStorage.setItem('gradeup_student_info', JSON.stringify(formData));

      // Register attempt in database
      const attempt = await dataService.createAttempt(test, {
        full_name: formData.student_name.trim(),
        mobile: formData.student_mobile.trim(),
        email: formData.student_email.trim() || null,
        state: formData.student_state,
        district: formData.student_district
      });

      onToast?.('success', 'Registration verified! Starting exam...');
      onStartExam({
        ...formData,
        attempt_id: attempt.id
      });
    } catch (err: any) {
      console.error('Registration attempt error', err);
      onToast?.('error', err?.message || 'Failed to register attempt');
    } finally {
      setIsSubmitting(false);
    }
  };

  const availableDistricts = INDIAN_STATES_DISTRICTS[formData.student_state] || [];

  return (
    <div className="max-w-xl mx-auto space-y-6 my-6 px-3">
      
      {/* Modal / Dialog when attempt limit exceeded */}
      {attemptBlock && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-rose-200 dark:border-rose-900/60 p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto shrink-0 shadow-sm">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <span className="px-2.5 py-0.5 bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-bold text-xs rounded-full border border-rose-200 dark:border-rose-900">
                Attempt Limit Exceeded
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                Maximum Attempts Reached
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                You have already completed this mock test <strong>{attemptBlock.currentAttempts} time{attemptBlock.currentAttempts > 1 ? 's' : ''}</strong> on mobile number <strong>{formData.student_mobile}</strong>.
              </p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 text-xs space-y-2">
              <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 font-medium">
                <span>Mock Exam:</span>
                <strong className="text-slate-900 dark:text-white text-right max-w-[200px] truncate">{test.title}</strong>
              </div>
              <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 font-medium">
                <span>Allowed Attempts:</span>
                <strong className="text-indigo-600 dark:text-indigo-400">{attemptBlock.maxAttempts} Attempt{attemptBlock.maxAttempts > 1 ? 's' : ''}</strong>
              </div>
              <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 font-medium">
                <span>Your Completed Attempts:</span>
                <strong className="text-rose-600 dark:text-rose-400">{attemptBlock.currentAttempts} Completed</strong>
              </div>
            </div>

            {/* Actions for student */}
            <div className="space-y-2 pt-2">
              {attemptBlock.previousAttempts && attemptBlock.previousAttempts.length > 0 && onViewPreviousAttempt && (
                <button
                  type="button"
                  onClick={() => {
                    const latest = attemptBlock.previousAttempts[0];
                    setAttemptBlock(null);
                    onViewPreviousAttempt(latest);
                  }}
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Trophy className="w-4 h-4" />
                  <span>View Your Previous Scorecard & Rank</span>
                </button>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAttemptBlock(null)}
                  className="flex-1 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer text-center"
                >
                  Change Mobile No.
                </button>
                {onBackToHome && (
                  <button
                    type="button"
                    onClick={() => {
                      setAttemptBlock(null);
                      onBackToHome();
                    }}
                    className="flex-1 py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all cursor-pointer text-center"
                  >
                    Back to Test List
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xl space-y-6">
        
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-xs rounded-md">
              Candidate Verification Step
            </span>

            {/* Attempt Limit Badge on Form Header */}
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border shadow-2xs ${
              maxAttempts === 0
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                : maxAttempts === 1
                ? 'bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
            }`}>
              {maxAttempts === 0 
                ? '∞ Unlimited Attempts Allowed' 
                : `⚡ ${maxAttempts} Attempt${maxAttempts > 1 ? 's' : ''} Limit`}
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            Enter Student Registration Details
          </h2>
          <p className="text-xs text-slate-500">
            Your details will be used to generate your official Mock Test Performance Scorecard and Leaderboard position.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Student Name */}
          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
              Candidate Full Name *
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                required
                placeholder="e.g. Rahul Sharma"
                value={formData.student_name}
                onChange={(e) => setFormData({ ...formData, student_name: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-hidden font-medium"
              />
            </div>
          </div>

          {/* Contact info grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Mobile Number */}
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                WhatsApp Mobile No. *
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="tel"
                  required
                  maxLength={10}
                  placeholder="10 digit mobile"
                  value={formData.student_mobile}
                  onChange={(e) => setFormData({ ...formData, student_mobile: e.target.value.replace(/\D/g, '') })}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-hidden font-medium"
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                Email Address (Optional)
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  placeholder="name@email.com"
                  value={formData.student_email}
                  onChange={(e) => setFormData({ ...formData, student_email: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-hidden font-medium"
                />
              </div>
            </div>

          </div>

          {/* Location Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* State */}
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                State *
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <select
                  value={formData.student_state}
                  onChange={(e) => handleStateChange(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-hidden font-medium"
                >
                  {Object.keys(INDIAN_STATES_DISTRICTS).map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* District */}
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                District *
              </label>
              <div className="relative">
                <Building className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <select
                  value={formData.student_district}
                  onChange={(e) => setFormData({ ...formData, student_district: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-hidden font-medium"
                >
                  {availableDistricts.map((dst) => (
                    <option key={dst} value={dst}>{dst}</option>
                  ))}
                </select>
              </div>
            </div>

          </div>

          {/* Security & Verification Terms */}
          <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p>
                By proceeding, you certify that you are attempting this test honestly without external help.
              </p>
              {maxAttempts > 0 ? (
                <p className="text-[11px] text-amber-700 dark:text-amber-300 font-bold">
                  Note: This test has a limit of {maxAttempts} attempt{maxAttempts > 1 ? 's' : ''} per mobile number.
                </p>
              ) : (
                <p className="text-[11px] text-emerald-700 dark:text-emerald-300 font-bold">
                  Note: Unlimited practice attempts are permitted on this mock test.
                </p>
              )}
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-extrabold text-sm rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Launch Exam Terminal Now</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>

        </form>

      </div>

    </div>
  );
};
