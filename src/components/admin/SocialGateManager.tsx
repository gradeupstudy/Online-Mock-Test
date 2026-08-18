import React, { useState, useEffect } from 'react';
import { Share2, Plus, Edit3, Trash2, Youtube, Send, Instagram, MessageCircle, Globe, ShieldAlert, Power, CheckCircle2, XCircle, Filter, Save, Cloud, Eye, HelpCircle } from 'lucide-react';
import { SocialPlatform, AdminSettings } from '../../types';
import { dataService } from '../../services/dataService';
import { Modal } from '../common/Modal';

interface SocialGateManagerProps {
  onToast?: (type: 'success' | 'error' | 'info', msg: string) => void;
}

export const SocialGateManager: React.FC<SocialGateManagerProps> = ({ onToast }) => {
  const [platforms, setPlatforms] = useState<SocialPlatform[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlatform, setEditingPlatform] = useState<Partial<SocialPlatform> | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'disabled'>('all');
  
  // Global Social Gate Header & Instructions
  const [globalTitle, setGlobalTitle] = useState('Gradeup Study Official Community Requirement');
  const [globalDescription, setGlobalDescription] = useState('Join our official community channels to receive free study PDFs, daily exam updates, and answer key notifications.');
  const [isGlobalGateEnabled, setIsGlobalGateEnabled] = useState(true);
  const [savingGlobalSettings, setSavingGlobalSettings] = useState(false);
  const [deletingPlatformId, setDeletingPlatformId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const settings = await dataService.getSettings();
      if (settings.social_gate_title) {
        setGlobalTitle(settings.social_gate_title);
      }
      if (settings.social_gate_description) {
        setGlobalDescription(settings.social_gate_description);
      }
      if (settings.social_gate_enabled !== undefined) {
        setIsGlobalGateEnabled(settings.social_gate_enabled);
      }

      const fetched = await dataService.getSocialPlatforms(true);
      setPlatforms(fetched);
    } catch (err) {
      console.warn('Error loading social gate data', err);
    }
  };

  const handleSaveGlobalHeader = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!globalTitle.trim()) {
      onToast?.('error', 'Community Gate Title cannot be empty!');
      return;
    }
    setSavingGlobalSettings(true);
    try {
      await dataService.updateSettings({
        social_gate_title: globalTitle.trim(),
        social_gate_description: globalDescription.trim(),
        social_gate_enabled: isGlobalGateEnabled
      });
      onToast?.('success', 'Global Community Requirement header saved & synced to Supabase Cloud! Visible on all browsers.');
    } catch (err) {
      console.error('Failed to save global community header', err);
      onToast?.('error', 'Failed to save global header to Supabase.');
    } finally {
      setSavingGlobalSettings(false);
    }
  };

  const handleOpenAdd = () => {
    const newId = crypto.randomUUID ? crypto.randomUUID() : 'sp-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
    setEditingPlatform({
      id: newId,
      platform_name: '',
      platform_url: '',
      icon: 'youtube',
      button_text: 'Subscribe on YouTube',
      verification_method: 'redirect_only',
      is_required: true,
      is_active: true
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: SocialPlatform) => {
    setEditingPlatform({ ...p });
    setIsModalOpen(true);
  };

  const handleToggleActive = async (p: SocialPlatform) => {
    const newStatus = !p.is_active;
    await dataService.toggleSocialPlatformActive(p.id, newStatus);
    onToast?.(
      newStatus ? 'success' : 'info',
      `"${p.platform_name}" channel ${newStatus ? 'Enabled' : 'Disabled'} & synced to Supabase!`
    );
    loadData();
  };

  const handleSavePlatform = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlatform?.platform_name || !editingPlatform.platform_url) {
      onToast?.('error', 'Platform name and URL are required!');
      return;
    }
    await dataService.saveSocialPlatform(editingPlatform as SocialPlatform);
    onToast?.('success', `Platform "${editingPlatform.platform_name}" saved & synced across all browsers!`);
    setIsModalOpen(false);
    loadData();
  };

  const handleDelete = (id: string) => {
    setDeletingPlatformId(id);
  };

  const confirmDeletePlatform = async () => {
    if (!deletingPlatformId) return;
    await dataService.deleteSocialPlatform(deletingPlatformId);
    onToast?.('info', 'Platform requirement deleted & synced.');
    setDeletingPlatformId(null);
    loadData();
  };

  const handleEnforceYouTubeOnly = async () => {
    const updated = platforms.map(p => {
      const isYT = (p.platform_name || '').toLowerCase().includes('youtube');
      return {
        ...p,
        is_active: isYT,
        is_required: isYT
      };
    });
    await dataService.saveSocialPlatformsBulk(updated);
    onToast?.('success', 'Preset applied: ONLY YouTube is mandatory & active! Synced to Supabase for all devices.');
    loadData();
  };

  const handleForceSyncAll = async () => {
    await dataService.saveSocialPlatformsBulk(platforms);
    await dataService.updateSettings({
      social_gate_title: globalTitle.trim(),
      social_gate_description: globalDescription.trim(),
      social_gate_enabled: isGlobalGateEnabled,
      social_platforms: platforms
    });
    onToast?.('success', 'All social channel configurations synced to Supabase database successfully!');
    loadData();
  };

  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case 'youtube': return <Youtube className="w-5 h-5 text-rose-600" />;
      case 'send': return <Send className="w-5 h-5 text-blue-500" />;
      case 'instagram': return <Instagram className="w-5 h-5 text-pink-600" />;
      case 'message-circle': return <MessageCircle className="w-5 h-5 text-emerald-600" />;
      default: return <Globe className="w-5 h-5 text-indigo-600" />;
    }
  };

  const filteredPlatforms = platforms.filter(p => {
    if (filterStatus === 'active') return p.is_active;
    if (filterStatus === 'disabled') return !p.is_active;
    return true;
  });

  const activeCount = platforms.filter(p => p.is_active).length;
  const disabledCount = platforms.filter(p => !p.is_active).length;

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
              Community & Social Gate
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
              <Cloud className="w-3.5 h-3.5" /> Supabase Synced
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white mt-1">Social Follow Gate & Community Manager</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Edit the "Official Community Requirement" title, description, and manage YouTube, Telegram, Instagram & WhatsApp channels. All changes save directly to the central cloud database.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleEnforceYouTubeOnly}
            title="Set YouTube as the only active mandatory channel and disable all others"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 font-bold text-xs rounded-xl border border-rose-200 dark:border-rose-800 transition-all shrink-0 cursor-pointer"
          >
            <Youtube className="w-4 h-4 text-rose-600" />
            <span>Preset: Only YouTube</span>
          </button>

          <button
            onClick={handleForceSyncAll}
            title="Force sync all channels and global headers to Supabase"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-bold text-xs rounded-xl border border-emerald-200 dark:border-emerald-800 transition-all shrink-0 cursor-pointer"
          >
            <Cloud className="w-4 h-4 text-emerald-600" />
            <span>Sync Cloud Database</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Social Channel</span>
          </button>
        </div>
      </div>

      {/* SECTION 1: GLOBAL SOCIAL GATE HEADER & INSTRUCTIONS EDITOR */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-blue-200 dark:border-blue-900/60 p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Gradeup Study Official Community Requirement (Header & Subtitle)</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Customize the title and instructions shown at the top of the social gate screen for all students across every browser.
            </p>
          </div>
          
          <label className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer self-start sm:self-auto">
            <input
              type="checkbox"
              checked={isGlobalGateEnabled}
              onChange={(e) => setIsGlobalGateEnabled(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
            />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {isGlobalGateEnabled ? '🟢 Gate Enabled Globally' : '🔴 Gate Disabled Globally'}
            </span>
          </label>
        </div>

        <form onSubmit={handleSaveGlobalHeader} className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                Main Community Header Title *
              </label>
              <input
                type="text"
                required
                value={globalTitle}
                onChange={(e) => setGlobalTitle(e.target.value)}
                placeholder="e.g. Gradeup Study Official Community Requirement"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Default: "Gradeup Study Official Community Requirement"
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                Subtitle / Community Requirement Instructions
              </label>
              <textarea
                rows={2}
                value={globalDescription}
                onChange={(e) => setGlobalDescription(e.target.value)}
                placeholder="e.g. Join our official community channels to receive free study PDFs, daily exam updates, and answer key notifications."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          {/* LIVE PREVIEW BOX */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-2">
              <Eye className="w-4 h-4 text-blue-500" />
              <span>Live Student Gate Preview</span>
            </div>
            <div className="text-center bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 max-w-lg mx-auto shadow-xs">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                {globalTitle || "Gradeup Study Official Community Requirement"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {globalDescription || "Join our official community channels to receive free study PDFs, daily exam updates, and answer key notifications."}
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingGlobalSettings}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{savingGlobalSettings ? 'Saving to Cloud Database...' : 'Save & Sync Header to Supabase Cloud'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* FILTER & STATS BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold uppercase text-slate-400">Filter Channels:</span>
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                filterStatus === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All ({platforms.length})
            </button>
            <button
              onClick={() => setFilterStatus('active')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                filterStatus === 'active'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Enabled ({activeCount})
            </button>
            <button
              onClick={() => setFilterStatus('disabled')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                filterStatus === 'disabled'
                  ? 'bg-slate-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Disabled ({disabledCount})
            </button>
          </div>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          💡 Changes made here sync to Supabase and update on all student devices.
        </div>
      </div>

      {/* Info Warning Banner */}
      <div className="p-4 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-900 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold">Honest Verification Architecture</p>
          <p className="mt-0.5 opacity-90">
            For platforms without public API OAuth verification (e.g. Telegram / YouTube channel links), Gradeup Study securely opens the official community page and tracks membership confirmation rather than outputting false claims.
          </p>
        </div>
      </div>

      {/* Platforms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredPlatforms.map((p) => (
          <div
            key={p.id}
            className={`bg-white dark:bg-slate-900 rounded-2xl border p-6 flex flex-col justify-between gap-4 shadow-xs transition-all ${
              p.is_active
                ? 'border-slate-200 dark:border-slate-800'
                : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 opacity-75'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0">
                  {getIconComponent(p.icon)}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-base text-slate-900 dark:text-white">{p.platform_name}</p>
                    {p.is_active ? (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-extrabold rounded-md flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Enabled
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400 text-[10px] font-extrabold rounded-md flex items-center gap-1">
                        <XCircle className="w-3 h-3" /> Disabled
                      </span>
                    )}
                    {p.is_required && (
                      <span className="px-2 py-0.5 bg-rose-100 text-rose-800 dark:bg-rose-950 text-[10px] font-bold rounded-md">
                        Mandatory
                      </span>
                    )}
                  </div>
                  <a
                    href={p.platform_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-blue-600 hover:underline line-clamp-1 block mt-1 font-medium"
                  >
                    {p.platform_url}
                  </a>
                  <span className="text-[11px] text-slate-400 mt-0.5 block">Button text: "{p.button_text}"</span>
                </div>
              </div>
            </div>

            {/* Bottom Actions Bar */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
              
              {/* Quick Enable/Disable Toggle Switch Button */}
              <button
                onClick={() => handleToggleActive(p)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  p.is_active
                    ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}
                title={p.is_active ? 'Click to Disable Channel' : 'Click to Enable Channel'}
              >
                <Power className={`w-3.5 h-3.5 ${p.is_active ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
                <span>{p.is_active ? 'Enabled (Click to Disable)' : 'Disabled (Click to Enable)'}</span>
              </button>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleOpenEdit(p)}
                  className="p-2 text-slate-500 hover:text-blue-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Edit Channel Details"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(p.id)}
                  className="p-2 text-rose-500 hover:text-rose-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Delete Channel"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

            </div>
          </div>
        ))}

        {filteredPlatforms.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500 space-y-2">
            <Share2 className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="font-bold text-slate-700 dark:text-slate-300">No social channels found</p>
            <p className="text-xs text-slate-400">Click 'Add Social Channel' above to create a new requirement.</p>
          </div>
        )}
      </div>

      {/* ADD/EDIT MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPlatform?.platform_name ? "Edit Social Channel" : "Add New Social Channel"}
        maxWidth="md"
      >
        {editingPlatform && (
          <form onSubmit={handleSavePlatform} className="space-y-4">
            
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                Platform Name *
              </label>
              <input
                type="text"
                required
                value={editingPlatform.platform_name || ''}
                onChange={(e) => setEditingPlatform({ ...editingPlatform, platform_name: e.target.value })}
                placeholder="e.g. Gradeup Study Telegram"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                Channel / Page URL *
              </label>
              <input
                type="text"
                required
                value={editingPlatform.platform_url || ''}
                onChange={(e) => setEditingPlatform({ ...editingPlatform, platform_url: e.target.value })}
                placeholder="https://t.me/gradeupstudyofficial"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                Button Label
              </label>
              <input
                type="text"
                value={editingPlatform.button_text || ''}
                onChange={(e) => setEditingPlatform({ ...editingPlatform, button_text: e.target.value })}
                placeholder="Join Telegram Channel"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Icon
                </label>
                <select
                  value={editingPlatform.icon || 'youtube'}
                  onChange={(e) => setEditingPlatform({ ...editingPlatform, icon: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                >
                  <option value="youtube">YouTube</option>
                  <option value="send">Telegram</option>
                  <option value="instagram">Instagram</option>
                  <option value="message-circle">WhatsApp</option>
                  <option value="globe">Website / Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Verification Type
                </label>
                <select
                  value={editingPlatform.verification_method || 'redirect_only'}
                  onChange={(e) => setEditingPlatform({ ...editingPlatform, verification_method: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                >
                  <option value="redirect_only">Redirect & Confirm</option>
                  <option value="manual_confirmation">Manual Student Toggle</option>
                  <option value="admin_verification">Admin Review</option>
                </select>
              </div>
            </div>

            {/* Status & Mandatory Toggles */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Enable / Disable & Mandatory Controls
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex items-center gap-2.5 p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingPlatform.is_active ?? true}
                    onChange={(e) => setEditingPlatform({ ...editingPlatform, is_active: e.target.checked })}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <span className="block text-xs font-bold text-slate-900 dark:text-white">
                      {editingPlatform.is_active ? '🟢 Channel Enabled' : '🔴 Channel Disabled'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {editingPlatform.is_active ? 'Visible to students' : 'Hidden from students'}
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingPlatform.is_required ?? true}
                    onChange={(e) => setEditingPlatform({ ...editingPlatform, is_required: e.target.checked })}
                    className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
                  />
                  <div>
                    <span className="block text-xs font-bold text-slate-900 dark:text-white">
                      {editingPlatform.is_required ? '⚠️ Mandatory Visit' : 'ℹ️ Optional Visit'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Must click before exam
                    </span>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:underline"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all"
              >
                Save Channel
              </button>
            </div>

          </form>
        )}
      </Modal>

      {/* Delete Platform Modal */}
      {deletingPlatformId && (
        <Modal
          isOpen={!!deletingPlatformId}
          onClose={() => setDeletingPlatformId(null)}
          title="Delete Platform Requirement"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-700 dark:text-slate-300">
              Are you sure you want to delete this social channel requirement?
            </p>
            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setDeletingPlatformId(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeletePlatform}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition-all"
              >
                Delete Platform
              </button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
};
