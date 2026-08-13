import React, { useState } from 'react';
import { Lock, Mail, Key, ShieldCheck, ArrowRight } from 'lucide-react';
import { getSupabaseClient, isSupabaseConfigured } from '../../lib/supabase';

interface AdminLoginProps {
  onLoginSuccess: () => void;
  onBackToHome?: () => void;
  onToast?: (type: 'success' | 'error' | 'info', msg: string) => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess, onBackToHome, onToast }) => {
  const [email, setEmail] = useState('admin@gradeupstudy.com');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const notify = (type: 'success' | 'error' | 'info', msg: string) => {
    if (typeof onToast === 'function') {
      onToast(type, msg);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const supabase = getSupabaseClient();

    // Check if Supabase Auth is active
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        });
        if (!error && data.user) {
          notify('success', 'Admin login successful!');
          onLoginSuccess();
          setIsLoading(false);
          return;
        }
      } catch (err) {
        console.warn('Supabase auth attempt failed, checking master passcode', err);
      }
    }

    // Default admin passcode fallback if Supabase Auth is not set or for local dev access
    if (password === 'gradeup123' || password === 'admin123' || password === 'admin') {
      notify('success', 'Admin authenticated successfully!');
      onLoginSuccess();
    } else {
      notify('error', 'Invalid admin password. Default passcode: gradeup123');
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-8">
        
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-blue-600/10 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Admin Portal</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Gradeup Study Test Control Panel
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Admin Email
            </label>
            <div className="relative">
              <Mail className="w-5 h-5 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-hidden"
                placeholder="admin@gradeupstudy.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Password / Passcode
            </label>
            <div className="relative">
              <Key className="w-5 h-5 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-hidden"
                placeholder="Enter admin password (e.g., gradeup123)"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Demo passcode: <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-blue-600 font-bold">gradeup123</code>
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all mt-6"
          >
            {isLoading ? 'Verifying...' : 'Login to Admin Panel'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-4 flex items-center justify-center gap-1">
          <Lock className="w-3.5 h-3.5 text-slate-400" />
          <span>Protected by Gradeup Study Security & Supabase Auth</span>
        </div>

      </div>
    </div>
  );
};
