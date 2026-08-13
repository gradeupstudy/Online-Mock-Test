import React, { useState, useEffect } from 'react';
import { User, Phone, Mail, MapPin, Building, ArrowRight, ShieldCheck, CheckCircle } from 'lucide-react';
import { INDIAN_STATES_DISTRICTS } from '../../data/indianStatesDistricts';
import { Test } from '../../types';

export interface StudentRegistrationData {
  student_name: string;
  student_mobile: string;
  student_email: string;
  student_state: string;
  student_district: string;
}

interface StudentRegistrationProps {
  test: Test;
  onStartExam: (data: StudentRegistrationData) => void;
  onToast?: (type: 'success' | 'error' | 'info', msg: string) => void;
}

export const StudentRegistration: React.FC<StudentRegistrationProps> = ({ test, onStartExam, onToast }) => {
  const [formData, setFormData] = useState<StudentRegistrationData>({
    student_name: '',
    student_mobile: '',
    student_email: '',
    student_state: 'Himachal Pradesh',
    student_district: 'Kangra'
  });

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.student_name.trim()) {
      onToast?.('error', 'Please enter your Full Name');
      return;
    }

    if (!/^\d{10}$/.test(formData.student_mobile.trim())) {
      onToast?.('error', 'Please enter a valid 10-digit mobile number');
      return;
    }

    if (!formData.student_email.includes('@')) {
      onToast?.('error', 'Please enter a valid email address');
      return;
    }

    if (!formData.student_state || !formData.student_district) {
      onToast?.('error', 'Please select your State and District');
      return;
    }

    // Save to localStorage for convenience
    localStorage.setItem('gradeup_student_info', JSON.stringify(formData));

    onToast?.('success', 'Registration verified! Starting exam...');
    onStartExam(formData);
  };

  const availableDistricts = INDIAN_STATES_DISTRICTS[formData.student_state] || [];

  return (
    <div className="max-w-xl mx-auto space-y-6 my-6">
      
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xl space-y-6">
        
        {/* Header */}
        <div className="space-y-1">
          <span className="px-2.5 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-xs rounded-md">
            Candidate Verification Step
          </span>
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
                Email Address *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
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
            <p>
              By proceeding, you certify that you are attempting this test honestly without external help. Your score will be calculated based on standard exam marking rules.
            </p>
          </div>

          {/* Submit Action */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="submit"
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Launch Exam Terminal Now</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>

        </form>

      </div>

    </div>
  );
};
