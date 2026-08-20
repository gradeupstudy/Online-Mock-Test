import React, { useState, useEffect, useRef } from 'react';
import { 
  Settings, 
  Save, 
  Globe, 
  Mail, 
  Phone, 
  Youtube, 
  Send, 
  Instagram, 
  MessageCircle, 
  Share2, 
  ShieldCheck, 
  Check, 
  Key, 
  Lock, 
  UserCheck, 
  Image as ImageIcon, 
  GraduationCap, 
  ExternalLink, 
  Database, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  Upload,
  Trash2,
  Sparkles,
  Link as LinkIcon,
  CheckCircle,
  FileImage,
  Layers
} from 'lucide-react';
import { AdminSettings } from '../../types';
import { dataService } from '../../services/dataService';
import { getSupabaseClient, isSupabaseConfigured } from '../../lib/supabase';
import { GULogo, BrandLogo } from '../common/GULogo';

interface AdminSettingsViewProps {
  onToast?: (type: 'success' | 'error' | 'info', msg: string) => void;
}

export const AdminSettingsView: React.FC<AdminSettingsViewProps> = ({ onToast }) => {
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [saving, setSaving] = useState(false);

  // Logo Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [logoUploadMode, setLogoUploadMode] = useState<'upload' | 'url' | 'default'>('upload');
  const [customLogoUrlInput, setCustomLogoUrlInput] = useState('');
  const [logoFileMeta, setLogoFileMeta] = useState<{ name: string; size: string } | null>(null);
  const [isProcessingLogo, setIsProcessingLogo] = useState(false);

  // Admin Credentials State
  const [adminEmail, setAdminEmail] = useState(() => {
    return localStorage.getItem('gradeup_admin_email') || 'admin@gradeupstudy.com';
  });
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingAuth, setUpdatingAuth] = useState(false);
  const [syncingCloud, setSyncingCloud] = useState(false);
  const [syncStats, setSyncStats] = useState<{ tests: number; questions: number; attempts: number } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSyncToSupabase = async () => {
    setSyncingCloud(true);
    try {
      const res = await dataService.syncAllLocalDataToSupabase();
      if (res.success) {
        setSyncStats({ tests: res.testsCount, questions: res.questionsCount, attempts: res.attemptsCount });
        onToast?.('success', `Synced ${res.testsCount} tests, ${res.questionsCount} MCQs, and ${res.attemptsCount} attempts to Supabase successfully!`);
      } else {
        onToast?.('error', res.error || 'Failed to sync data to Supabase');
      }
    } catch (err: any) {
      onToast?.('error', err?.message || 'Sync failed');
    } finally {
      setSyncingCloud(false);
    }
  };

  const loadSettings = async () => {
    const s = await dataService.getSettings();
    setSettings(s);
    if (s.admin_email) {
      setAdminEmail(s.admin_email);
    }
    if (s.logo_url && s.logo_url !== '/logo.png' && s.logo_url !== '/logo.svg') {
      setCustomLogoUrlInput(s.logo_url);
    }
  };

  // Helper to optimize and convert image to Data URL
  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      onToast?.('error', 'Please upload a valid image file (PNG, JPG, WEBP, or SVG)');
      return;
    }

    // Max 10MB file check
    if (file.size > 10 * 1024 * 1024) {
      onToast?.('error', 'File size exceeds 10MB. Please select a smaller logo.');
      return;
    }

    setIsProcessingLogo(true);
    setLogoFileMeta({
      name: file.name,
      size: `${(file.size / 1024).toFixed(1)} KB`
    });

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (!result) {
        setIsProcessingLogo(false);
        onToast?.('error', 'Failed to read image file');
        return;
      }

      // If SVG or small image under 300KB, use directly
      if (file.type.includes('svg') || file.size < 300 * 1024) {
        if (settings) {
          setSettings({ ...settings, logo_url: result });
        }
        setCustomLogoUrlInput(result);
        setIsProcessingLogo(false);
        onToast?.('success', 'Logo loaded! Click "Save Settings" or "Apply & Save Logo Now" to publish.');
        return;
      }

      // If larger image, resize via canvas to max 600x600 for optimal fast performance
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL(file.type.includes('png') ? 'image/png' : 'image/jpeg', 0.92);
          if (settings) {
            setSettings({ ...settings, logo_url: compressedDataUrl });
          }
          setCustomLogoUrlInput(compressedDataUrl);
          onToast?.('success', `Logo optimized (${width}x${height}px) & loaded!`);
        }
        setIsProcessingLogo(false);
      };
      img.onerror = () => {
        setIsProcessingLogo(false);
        onToast?.('error', 'Could not process image');
      };
      img.src = result;
    };
    reader.onerror = () => {
      setIsProcessingLogo(false);
      onToast?.('error', 'Failed to read uploaded file');
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleResetToOfficialVectorLogo = () => {
    if (!settings) return;
    const updatedSettings = {
      ...settings,
      logo_url: '/logo.svg'
    };
    setSettings(updatedSettings);
    setCustomLogoUrlInput('');
    setLogoFileMeta(null);
    onToast?.('info', 'Switched back to Gradeup Study Official 3D Vector Emblem (Default). Click "Save Settings" or "Apply Logo Now" to save.');
  };

  const handleApplyLogoImmediately = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const saved = await dataService.updateSettings(settings);
      setSettings(saved);
      onToast?.('success', 'Official Gradeup Study Logo applied & saved across all pages successfully!');
    } catch (err) {
      console.error('Failed to save logo', err);
      onToast?.('error', 'Failed to save logo to database');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    try {
      const saved = await dataService.updateSettings(settings);
      setSettings(saved);
      onToast?.('success', 'Official social media links, logo & admin settings saved to Supabase permanent cloud storage!');
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

      {/* SUPABASE CLOUD DATABASE & PERSISTENCE CARD */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Supabase Cloud Database & Persistence
              </h2>
              <p className="text-xs text-slate-500">
                Centralized storage for all Mock Tests, MCQs Question Bank, and Student Attempts
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isSupabaseConfigured() ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-xs font-bold rounded-full border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Supabase Connected</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 text-xs font-bold rounded-full border border-amber-200 dark:border-amber-800">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Offline / Local Mode</span>
              </span>
            )}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 text-xs space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                Single Source of Truth: Supabase PostgreSQL
              </p>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                All tests, MCQs, and attempts are stored securely in Supabase. Deleting a test permanently removes it from the cloud database without reviving zombie demo tests.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSyncToSupabase}
              disabled={syncingCloud || !isSupabaseConfigured()}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer whitespace-nowrap"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncingCloud ? 'animate-spin' : ''}`} />
              <span>{syncingCloud ? 'Pushing Data to Cloud...' : 'Sync All Data to Supabase'}</span>
            </button>
          </div>
          {syncStats && (
            <p className="text-emerald-600 dark:text-emerald-400 font-medium text-[11px] pt-1">
              ✓ Successfully synced: {syncStats.tests} Tests, {syncStats.questions} MCQs, {syncStats.attempts} Student Attempts.
            </p>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Brand Identity & Official Logo Upload Section */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-6 shadow-sm">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 rounded-lg">
                  <FileImage className="w-5 h-5" />
                </div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Brand Identity & Official Logo
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Upload your official Gradeup Study logo image file (PNG, JPG, SVG, WEBP) or enter a custom logo URL.
              </p>
            </div>

            {/* Quick Status Pill */}
            <div className="flex items-center gap-2">
              {settings?.logo_url && settings.logo_url !== '/logo.png' && settings.logo_url !== '/logo.svg' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-full border border-blue-200 dark:border-blue-800">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
                  <span>Custom Logo Active</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 text-xs font-bold rounded-full border border-red-200 dark:border-red-800">
                  <Sparkles className="w-3.5 h-3.5 text-red-500" />
                  <span>Official 3D Vector Emblem</span>
                </span>
              )}
            </div>
          </div>

          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/png, image/jpeg, image/jpg, image/webp, image/svg+xml"
            className="hidden"
          />

          {/* Source Tabs */}
          <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/80 max-w-lg">
            <button
              type="button"
              onClick={() => setLogoUploadMode('upload')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                logoUploadMode === 'upload'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload File</span>
            </button>

            <button
              type="button"
              onClick={() => setLogoUploadMode('url')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                logoUploadMode === 'url'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <LinkIcon className="w-3.5 h-3.5" />
              <span>Image URL</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setLogoUploadMode('default');
                handleResetToOfficialVectorLogo();
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                logoUploadMode === 'default' || !settings?.logo_url || settings?.logo_url === '/logo.png' || settings?.logo_url === '/logo.svg'
                  ? 'bg-white dark:bg-slate-900 text-red-600 dark:text-red-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Default 3D Emblem</span>
            </button>
          </div>

          {/* Upload / Input Controls */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Col: Upload & Source Input */}
            <div className="lg:col-span-7 space-y-4">
              
              {logoUploadMode === 'upload' && (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`p-6 sm:p-8 rounded-2xl border-2 border-dashed transition-all cursor-pointer text-center flex flex-col items-center justify-center gap-3 ${
                    isDragging
                      ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 scale-[1.01]'
                      : 'border-slate-300 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/40 hover:bg-slate-100/80 dark:hover:bg-slate-800/80'
                  }`}
                >
                  <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-sm">
                    {isProcessingLogo ? (
                      <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
                    ) : (
                      <Upload className="w-6 h-6" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      {isProcessingLogo ? 'Processing image...' : 'Click to Upload or Drag & Drop Logo'}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Supports transparent PNG, SVG vector, JPG, or WEBP (Max 10MB)
                    </p>
                  </div>

                  {logoFileMeta && (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-semibold mt-2">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{logoFileMeta.name} ({logoFileMeta.size})</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    <FileImage className="w-3.5 h-3.5" />
                    <span>Select Logo File</span>
                  </button>
                </div>
              )}

              {logoUploadMode === 'url' && (
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/70 space-y-3">
                  <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300">
                    Online Image Direct URL (CDN / AWS / Website / Drive)
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <LinkIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="url"
                        placeholder="https://example.com/images/official-gradeup-logo.png"
                        value={customLogoUrlInput}
                        onChange={(e) => {
                          setCustomLogoUrlInput(e.target.value);
                          if (settings) {
                            setSettings({ ...settings, logo_url: e.target.value });
                          }
                        }}
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-hidden"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (customLogoUrlInput.trim() && settings) {
                          setSettings({ ...settings, logo_url: customLogoUrlInput.trim() });
                          onToast?.('success', 'Custom Logo URL applied to preview!');
                        }
                      }}
                      className="px-4 py-2.5 bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-700 text-white font-bold text-xs rounded-xl cursor-pointer"
                    >
                      Load
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Paste any public image link. It will automatically load and scale across header, scorecard, and merit lists.
                  </p>
                </div>
              )}

              {logoUploadMode === 'default' && (
                <div className="p-5 rounded-2xl bg-gradient-to-br from-red-50 to-amber-50 dark:from-red-950/30 dark:to-amber-950/20 border border-red-200 dark:border-red-900/50 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-800 p-2 border border-red-200 dark:border-red-900 flex items-center justify-center shadow-md shrink-0">
                      <GULogo className="w-full h-full" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        Gradeup Study 3D Vector Emblem (Built-in)
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        High-resolution 3D beveled vector with red and dark metallic graduation elements.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetToOfficialVectorLogo}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Active as Default</span>
                  </button>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleApplyLogoImmediately}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-600 to-blue-600 hover:from-red-700 hover:to-blue-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer hover:scale-[1.02]"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Saving...' : 'Apply & Save Logo Now'}</span>
                </button>

                {settings?.logo_url && settings.logo_url !== '/logo.png' && settings.logo_url !== '/logo.svg' && (
                  <button
                    type="button"
                    onClick={handleResetToOfficialVectorLogo}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    <span>Reset to Default 3D Logo</span>
                  </button>
                )}
              </div>
            </div>

            {/* Right Col: Live Multi-Context Preview Studio */}
            <div className="lg:col-span-5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-blue-500" />
                  <span>Live App Previews</span>
                </span>
                <span className="text-[10px] text-slate-400 font-medium">Auto-Scales</span>
              </div>

              {/* 1. Header Simulation Preview */}
              <div className="space-y-1.5">
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Header Top Bar Appearance</p>
                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center p-1 shadow-sm shrink-0">
                      <BrandLogo src={settings?.logo_url} className="w-full h-full" />
                    </div>
                    <div className="flex flex-col leading-tight">
                      <span className="text-sm font-black tracking-tight text-slate-900 dark:text-white">
                        GRADEUP <span className="text-red-600">STUDY</span>
                      </span>
                      <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">
                        Mock Test Portal
                      </span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 text-[10px] font-bold rounded-md">
                    Live Bar
                  </span>
                </div>
              </div>

              {/* 2. Light & Dark Background Cards */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                {/* Light Box */}
                <div className="p-4 bg-white rounded-xl border border-slate-200 flex flex-col items-center justify-center gap-2 shadow-xs text-center">
                  <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center p-2 shadow-sm">
                    <BrandLogo src={settings?.logo_url} className="w-full h-full" />
                  </div>
                  <span className="text-[10px] font-bold text-slate-600">Light Mode Box</span>
                </div>

                {/* Dark Box */}
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex flex-col items-center justify-center gap-2 shadow-xs text-center">
                  <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center p-2 shadow-sm">
                    <BrandLogo src={settings?.logo_url} className="w-full h-full" />
                  </div>
                  <span className="text-[10px] font-bold text-slate-400">Dark Mode Box</span>
                </div>
              </div>

              {/* 3. Welcome Note Presentation Mockup */}
              <div className="p-3 bg-gradient-to-r from-red-50/50 via-amber-50/40 to-blue-50/50 dark:from-red-950/20 dark:via-amber-950/20 dark:to-blue-950/20 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center p-2 shadow-md relative shrink-0">
                  <BrandLogo src={settings?.logo_url} className="w-full h-full" />
                  <div className="absolute -bottom-1.5 -right-1.5 bg-amber-500 text-white rounded-full p-1 shadow-xs">
                    <GraduationCap className="w-2.5 h-2.5" />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Welcome Note Badge
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Rendered in candidate greeting popup
                  </p>
                </div>
              </div>

            </div>

          </div>

          {/* Other Brand Identity Input Fields */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
              General Brand & Contact Information
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Brand Name
                </label>
                <input
                  type="text"
                  value={settings?.brand_name || ''}
                  onChange={(e) => settings && setSettings({ ...settings, brand_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Website URL
                </label>
                <input
                  type="text"
                  value={settings?.website_url || ''}
                  onChange={(e) => settings && setSettings({ ...settings, website_url: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Support Email
                </label>
                <input
                  type="email"
                  value={settings?.support_email || ''}
                  onChange={(e) => settings && setSettings({ ...settings, support_email: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  WhatsApp Helpline Number
                </label>
                <input
                  type="text"
                  value={settings?.whatsapp_number || ''}
                  onChange={(e) => settings && setSettings({ ...settings, whatsapp_number: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium"
                />
              </div>
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
