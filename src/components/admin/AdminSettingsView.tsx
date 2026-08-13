import React, { useState, useEffect } from 'react';
import { Settings, Save, Globe, Mail, Phone, Youtube, Send, Instagram, ShieldCheck, Check, Key, Lock, UserCheck, Image as ImageIcon, Upload, Trash2 } from 'lucide-react';
import { AdminSettings } from '../../types';
import { dataService } from '../../services/dataService';
import { getSupabaseClient, isSupabaseConfigured } from '../../lib/supabase';

interface AdminSettingsViewProps {
  onToast?: (type: 'success' | 'error' | 'info', msg: string) => void;
}

export const AdminSettingsView: React.FC<AdminSettingsViewProps> = ({ onToast }) => {
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [saving, setSaving] = useState(false);

  // Admin Credentials State
  const [adminEmail, setAdminEmail] = useState(() => {
    return localStorage.getItem('gradeup_admin_email') || 'admin@gradeupstudy.com';
  });
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingAuth, setUpdatingAuth] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const s = await dataService.getSettings();
    setSettings(s);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    await dataService.updateSettings(settings);
    onToast?.('success', 'Admin settings updated successfully!');
    setSaving(false);
  };

  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        onToast?.('error', 'Image size should be less than 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string' && settings) {
          setSettings({ ...settings, logo_url: reader.result });
          onToast?.('info', 'New logo uploaded! Click "Save Settings" to apply.');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateAdminCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminEmail.trim()) {
      onToast?.('error', 'Admin User ID / Email cannot be empty');
      return;
    }
    if (newPassword && newPassword !== confirmPassword) {
      onToast?.('error', 'New passwords do not match!');
      return;
    }
    if (newPassword && newPassword.length < 6) {
      onToast?.('error', 'Password should be at least 6 characters long');
      return;
    }

    setUpdatingAuth(true);
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      try {
        const updateData: { email?: string; password?: string } = { email: adminEmail.trim() };
        if (newPassword) {
          updateData.password = newPassword;
        }
        const { error } = await supabase.auth.updateUser(updateData);
        if (error) {
          onToast?.('error', error.message || 'Failed to update Supabase admin credentials');
        } else {
          onToast?.('success', 'Supabase Admin credentials updated!');
        }
      } catch (err) {
        console.error('Supabase user update failed', err);
      }
    }

    // Save to local storage for persistent offline / fallback admin access
    localStorage.setItem('gradeup_admin_email', adminEmail.trim());
    if (newPassword) {
      localStorage.setItem('gradeup_admin_password', newPassword);
    }

    setNewPassword('');
    setConfirmPassword('');
    setUpdatingAuth(false);
    onToast?.('success', 'Admin User ID & Password updated successfully!');
  };

  if (!settings) return <div className="p-8 text-center text-slate-500">Loading settings...</div>;

  return (
    <div className="space-y-6">
      
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Platform Settings & Security</h1>
        <p className="text-xs text-slate-500">Configure Gradeup Study platform defaults, admin credentials, helpline contacts, and social links</p>
      </div>

      {/* ADMIN LOGIN CREDENTIALS / SECURITY SECTION */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="p-2 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-lg">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Admin Login Credentials (User ID & Password)
            </h2>
            <p className="text-xs text-slate-500">Change your Admin User ID (Email) and Password</p>
          </div>
        </div>

        <form onSubmit={handleUpdateAdminCredentials} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                Admin User ID / Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-medium"
                  placeholder="admin@gradeupstudy.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                New Password
              </label>
              <div className="relative">
                <Key className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-medium"
                  placeholder="Leave blank to keep current"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                Confirm New Password
              </label>
              <div className="relative">
                <Key className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-medium"
                  placeholder="Re-enter new password"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-slate-500">
              {isSupabaseConfigured()
                ? 'Updates your admin account in Supabase Auth & Local Storage'
                : 'Updates local admin credentials'}
            </p>
            <button
              type="submit"
              disabled={updatingAuth}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              <UserCheck className="w-4 h-4" />
              <span>{updatingAuth ? 'Updating...' : 'Update Admin Credentials'}</span>
            </button>
          </div>
        </form>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Basic Brand Config */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
            Brand Identity & Project Logo
          </h2>

          {/* PROJECT LOGO SECTION */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Main Project Logo
            </label>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-tr from-blue-700 via-indigo-600 to-blue-500 flex items-center justify-center text-white shadow-md overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700">
                {settings.logo_url ? (
                  <img
                    src={settings.logo_url}
                    alt="Project Logo"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <ImageIcon className="w-8 h-8 opacity-80" />
                )}
              </div>

              <div className="flex-1 w-full space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={settings.logo_url || ''}
                    onChange={(e) => setSettings({ ...settings, logo_url: e.target.value })}
                    placeholder="Enter image URL (e.g., https://example.com/logo.png)"
                    className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                  />
                  {settings.logo_url && (
                    <button
                      type="button"
                      onClick={() => setSettings({ ...settings, logo_url: '' })}
                      className="p-2 text-rose-500 hover:text-rose-700 bg-rose-50 dark:bg-rose-950/50 rounded-lg hover:bg-rose-100 transition-colors"
                      title="Remove Logo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    <Upload className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Upload Logo Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoFileUpload}
                      className="hidden"
                    />
                  </label>
                  <span className="text-[11px] text-slate-500">
                    Recommended: PNG / SVG / JPG (Max 2MB)
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                Brand Name
              </label>
              <input
                type="text"
                value={settings.brand_name}
                onChange={(e) => setSettings({ ...settings, brand_name: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                Website URL
              </label>
              <input
                type="text"
                value={settings.website_url}
                onChange={(e) => setSettings({ ...settings, website_url: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                Support Email
              </label>
              <input
                type="email"
                value={settings.support_email}
                onChange={(e) => setSettings({ ...settings, support_email: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                WhatsApp Helpline Number
              </label>
              <input
                type="text"
                value={settings.whatsapp_number}
                onChange={(e) => setSettings({ ...settings, whatsapp_number: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Exam Defaults */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
            Exam Engine Defaults
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                Default Duration (Minutes)
              </label>
              <input
                type="number"
                value={settings.default_test_duration}
                onChange={(e) => setSettings({ ...settings, default_test_duration: parseInt(e.target.value) || 90 })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                Default Marks Per Question
              </label>
              <input
                type="number"
                step="0.1"
                value={settings.default_marks}
                onChange={(e) => setSettings({ ...settings, default_marks: parseFloat(e.target.value) || 1 })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                Default Negative Marking
              </label>
              <input
                type="number"
                step="0.05"
                value={settings.default_negative_marking}
                onChange={(e) => setSettings({ ...settings, default_negative_marking: parseFloat(e.target.value) || 0.25 })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer pt-2 text-xs font-bold text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={settings.mask_leaderboard_names}
              onChange={(e) => setSettings({ ...settings, mask_leaderboard_names: e.target.checked })}
              className="rounded text-blue-600"
            />
            <span>Privacy Protection: Mask student mobile numbers on leaderboards</span>
          </label>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-lg transition-all"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>

      </form>

    </div>
  );
};
