import React, { useState, useEffect } from 'react';
import { Settings, Save, Globe, Mail, Phone, Youtube, Send, Instagram, MessageCircle, Share2, ShieldCheck, Check, Key, Lock, UserCheck, Image as ImageIcon, GraduationCap, ExternalLink } from 'lucide-react';
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
    if (s.admin_email) {
      setAdminEmail(s.admin_email);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    try {
      const saved = await dataService.updateSettings(settings);
      setSettings(saved);
      onToast?.('success', 'Official social media links & admin settings saved to Supabase permanent cloud storage!');
    } catch (err) {
      console.error('Failed to save settings', err);
      onToast?.('error', 'Failed to save settings to Supabase');
    } finally {
      setSaving(false);
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

    // Save to centralized database (Supabase admin_settings table)
    await dataService.updateSettings({
      admin_email: adminEmail.trim(),
      ...(newPassword ? { admin_password: newPassword } : {})
    });

    // Save to local storage for persistent offline / fallback admin access
    localStorage.setItem('gradeup_admin_email', adminEmail.trim());
    if (newPassword) {
      localStorage.setItem('gradeup_admin_password', newPassword);
    }

    setNewPassword('');
    setConfirmPassword('');
    setUpdatingAuth(false);
    onToast?.('success', 'Admin ID & Password updated & synced across all browsers successfully!');
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

          {/* PROJECT LOGO SECTION - DEFAULT FIXED LOGO */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-tr from-blue-700 via-indigo-600 to-blue-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Main Project Logo
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Official Gradeup Study default emblem active as project logo.
              </p>
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

        {/* Official Social Media Links (Bottom Bar & Social Gate) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Share2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Official Social Media Links (Bottom Bar & Community)
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              These links appear on the website footer/bottom bar and connect students to your official channels.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* YouTube */}
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1.5">
                <Youtube className="w-4 h-4 text-rose-600" />
                <span>YouTube Channel URL</span>
              </label>
              <div className="relative">
                <input
                  type="url"
                  placeholder="https://youtube.com/@gradeupstudy"
                  value={settings.youtube_channel || ''}
                  onChange={(e) => setSettings({ ...settings, youtube_channel: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white"
                />
                {settings.youtube_channel && (
                  <a
                    href={settings.youtube_channel}
                    target="_blank"
                    rel="noreferrer"
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-rose-600"
                    title="Open Link"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>

            {/* Telegram */}
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1.5">
                <Send className="w-4 h-4 text-blue-500" />
                <span>Telegram Channel / Group Link</span>
              </label>
              <div className="relative">
                <input
                  type="url"
                  placeholder="https://t.me/gradeupstudyofficial"
                  value={settings.telegram_channel || ''}
                  onChange={(e) => setSettings({ ...settings, telegram_channel: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white"
                />
                {settings.telegram_channel && (
                  <a
                    href={settings.telegram_channel}
                    target="_blank"
                    rel="noreferrer"
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-blue-500"
                    title="Open Link"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>

            {/* Instagram */}
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1.5">
                <Instagram className="w-4 h-4 text-pink-600" />
                <span>Instagram Profile Link</span>
              </label>
              <div className="relative">
                <input
                  type="url"
                  placeholder="https://instagram.com/gradeupstudy.official"
                  value={settings.instagram_handle || ''}
                  onChange={(e) => setSettings({ ...settings, instagram_handle: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white"
                />
                {settings.instagram_handle && (
                  <a
                    href={settings.instagram_handle}
                    target="_blank"
                    rel="noreferrer"
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-pink-600"
                    title="Open Link"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>

            {/* WhatsApp Channel */}
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1.5">
                <MessageCircle className="w-4 h-4 text-emerald-600" />
                <span>WhatsApp Channel / Community Link</span>
              </label>
              <div className="relative">
                <input
                  type="url"
                  placeholder="https://whatsapp.com/channel/gradeupstudy"
                  value={settings.whatsapp_channel_url || ''}
                  onChange={(e) => setSettings({ ...settings, whatsapp_channel_url: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white"
                />
                {settings.whatsapp_channel_url && (
                  <a
                    href={settings.whatsapp_channel_url}
                    target="_blank"
                    rel="noreferrer"
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-emerald-600"
                    title="Open Link"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Global Social Gate & Community Section */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Official Community Requirement (Social Gate)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure default heading and description displayed to students before starting tests.
              </p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.social_gate_enabled ?? true}
                onChange={(e) => setSettings({ ...settings, social_gate_enabled: e.target.checked })}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {settings.social_gate_enabled ?? true ? '🟢 Enabled' : '🔴 Disabled'}
              </span>
            </label>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                Community Requirement Title
              </label>
              <input
                type="text"
                value={settings.social_gate_title || 'Gradeup Study Official Community Requirement'}
                onChange={(e) => setSettings({ ...settings, social_gate_title: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                Community Instructions / Subtitle
              </label>
              <textarea
                rows={2}
                value={settings.social_gate_description || 'Join our official community channels to receive free study PDFs, daily exam updates, and answer key notifications.'}
                onChange={(e) => setSettings({ ...settings, social_gate_description: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium"
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
