import React, { useState, useEffect } from 'react';
import { Settings, Save, Globe, Mail, Phone, Youtube, Send, Instagram, ShieldCheck, Check } from 'lucide-react';
import { AdminSettings } from '../../types';
import { dataService } from '../../services/dataService';

interface AdminSettingsViewProps {
  onToast?: (type: 'success' | 'error' | 'info', msg: string) => void;
}

export const AdminSettingsView: React.FC<AdminSettingsViewProps> = ({ onToast }) => {
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [saving, setSaving] = useState(false);

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

  if (!settings) return <div className="p-8 text-center text-slate-500">Loading settings...</div>;

  return (
    <div className="space-y-6">
      
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Platform Settings & Branding</h1>
        <p className="text-xs text-slate-500">Configure Gradeup Study platform defaults, helpline contacts, and social links</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Basic Brand Config */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
            Brand Identity
          </h2>

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
