import React, { useState, useEffect, useRef } from 'react';
import {
  Archive,
  Download,
  Upload,
  Cloud,
  CloudLightning,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  FileArchive,
  ShieldCheck,
  Database,
  Layers,
  BookOpen,
  Folder,
  FileText,
  Trash2,
  Eye,
  Check,
  X,
  HelpCircle,
  HardDrive,
  Cpu,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import {
  backupService,
  ProjectBackupData,
  CloudBackupRecord,
  BackupManifest
} from '../../services/backupService';
import { isSupabaseConfigured } from '../../lib/supabase';
import { dataService } from '../../services/dataService';
import { Modal } from '../common/Modal';

interface ProjectBackupManagerProps {
  onToast?: (type: 'success' | 'error' | 'info', msg: string) => void;
  onOpenSupabaseModal?: () => void;
}

export const ProjectBackupManager: React.FC<ProjectBackupManagerProps> = ({
  onToast,
  onOpenSupabaseModal
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stats of current live project
  const [liveStats, setLiveStats] = useState({
    testsCount: 0,
    questionsCount: 0,
    categoriesCount: 0,
    subjectsCount: 0,
    sectionsCount: 0
  });

  // Backup creation states
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isUploadingCloud, setIsUploadingCloud] = useState(false);
  const [backupNote, setBackupNote] = useState('');
  const [lastCreatedBackup, setLastCreatedBackup] = useState<{
    filename: string;
    sizeFormatted: string;
    timestamp: string;
    blob: Blob;
  } | null>(null);

  // Cloud backups
  const [cloudBackups, setCloudBackups] = useState<CloudBackupRecord[]>([]);
  const [loadingCloudBackups, setLoadingCloudBackups] = useState(false);
  const [supabaseConnected, setSupabaseConnected] = useState(() => isSupabaseConfigured());

  // Restore states
  const [selectedFileForRestore, setSelectedFileForRestore] = useState<File | null>(null);
  const [isAnalyzingFile, setIsAnalyzingFile] = useState(false);
  const [pendingRestoreData, setPendingRestoreData] = useState<ProjectBackupData | null>(null);
  const [restoreMode, setRestoreMode] = useState<'merge' | 'replace'>('merge');
  const [isRestoring, setIsRestoring] = useState(false);
  const [inspectingCloudRecord, setInspectingCloudRecord] = useState<CloudBackupRecord | null>(null);

  const loadLiveMetrics = async () => {
    try {
      const [tests, bankQuestions, cats, subs, secs] = await Promise.all([
        dataService.getTests(true),
        dataService.getAllQuestionBank(),
        Promise.resolve(dataService.getMasterCategories()),
        Promise.resolve(dataService.getMasterSubjects()),
        Promise.resolve(dataService.getMasterSections())
      ]);

      const qMap = new Map<string, any>();
      (bankQuestions || []).forEach(q => { if (q && q.id) qMap.set(q.id, q); });

      setLiveStats({
        testsCount: (tests || []).length,
        questionsCount: qMap.size,
        categoriesCount: (cats || []).length,
        subjectsCount: (subs || []).length,
        sectionsCount: (secs || []).length
      });
    } catch (e) {
      console.warn('Failed to load live metrics for backup manager:', e);
    }
  };

  const loadCloudBackupsList = async () => {
    setLoadingCloudBackups(true);
    try {
      const backups = await backupService.listSupabaseBackups();
      setCloudBackups(backups);
      setSupabaseConnected(isSupabaseConfigured());
    } catch (err) {
      console.warn('Error loading cloud backups:', err);
    } finally {
      setLoadingCloudBackups(false);
    }
  };

  useEffect(() => {
    loadLiveMetrics();
    loadCloudBackupsList();

    const handleTaxonomy = () => loadLiveMetrics();
    const handleTests = () => loadLiveMetrics();

    window.addEventListener('gradeup_taxonomy_updated', handleTaxonomy);
    window.addEventListener('gradeup_tests_updated', handleTests);
    return () => {
      window.removeEventListener('gradeup_taxonomy_updated', handleTaxonomy);
      window.removeEventListener('gradeup_tests_updated', handleTests);
    };
  }, []);

  // 1. Create and Download Local Backup
  const handleCreateAndDownloadBackup = async () => {
    setIsCreatingBackup(true);
    try {
      const result = await backupService.createProjectBackupZip({
        backupName: backupNote.trim() || 'GradeUp Complete Snapshot',
        description: `Exported from admin panel with ${liveStats.testsCount} mock tests and ${liveStats.questionsCount} MCQs.`
      });

      backupService.downloadBackupZip(result.blob, result.filename);
      setLastCreatedBackup({
        filename: result.filename,
        sizeFormatted: result.sizeFormatted,
        timestamp: new Date().toLocaleTimeString(),
        blob: result.blob
      });

      onToast?.('success', `✓ ZIP Backup Downloaded (${result.sizeFormatted})! All mocks, MCQs, and categories included.`);
    } catch (err: any) {
      onToast?.('error', `Failed to create backup: ${err.message}`);
    } finally {
      setIsCreatingBackup(false);
    }
  };

  // 2. Backup directly to Supabase Cloud
  const handleBackupToSupabaseCloud = async () => {
    if (!supabaseConnected) {
      onToast?.('error', 'Supabase is not configured. Please connect your Supabase credentials first.');
      onOpenSupabaseModal?.();
      return;
    }

    setIsUploadingCloud(true);
    try {
      const result = await backupService.createProjectBackupZip({
        backupName: backupNote.trim() || 'Supabase Cloud Snapshot',
        description: `Automated cloud archive with ${liveStats.testsCount} tests & ${liveStats.questionsCount} MCQs.`
      });

      const uploadRes = await backupService.uploadBackupToSupabase(
        result.blob,
        result.filename,
        result.data.manifest
      );

      if (uploadRes.success) {
        onToast?.('success', `☁️ Backup successfully saved to Supabase Cloud (${result.sizeFormatted})!`);
        await loadCloudBackupsList();
      } else {
        onToast?.('error', uploadRes.error || 'Failed to upload backup to Supabase.');
      }
    } catch (err: any) {
      onToast?.('error', `Cloud backup failed: ${err.message}`);
    } finally {
      setIsUploadingCloud(false);
    }
  };

  // 3. Handle File Selection for Restore
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFileForRestore(file);
    setIsAnalyzingFile(true);
    try {
      const parsed = await backupService.readBackupZip(file);
      setPendingRestoreData(parsed);
      onToast?.('info', `Verified backup file: "${parsed.manifest.backup_name || file.name}". Ready to restore.`);
    } catch (err: any) {
      onToast?.('error', `Could not read backup file: ${err.message}`);
      setSelectedFileForRestore(null);
      setPendingRestoreData(null);
    } finally {
      setIsAnalyzingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // 4. Confirm and Execute Restore
  const handleExecuteRestore = async () => {
    if (!pendingRestoreData) return;

    setIsRestoring(true);
    try {
      const result = await backupService.restoreProjectBackup(pendingRestoreData, restoreMode);
      onToast?.(
        'success',
        `✓ Project Restored Successfully! (${result.restoredTests} Tests, ${result.restoredQuestions} MCQs, ${result.restoredCategories} Categories, ${result.restoredSections} Sections)`
      );
      setPendingRestoreData(null);
      setSelectedFileForRestore(null);
      await loadLiveMetrics();
    } catch (err: any) {
      onToast?.('error', `Restore failed: ${err.message}`);
    } finally {
      setIsRestoring(false);
    }
  };

  // 5. Restore directly from Supabase Cloud record
  const handleRestoreFromCloudRecord = async (record: CloudBackupRecord) => {
    if (!window.confirm(`Are you sure you want to restore backup "${record.filename}" from Supabase Cloud?`)) {
      return;
    }

    setIsRestoring(true);
    try {
      onToast?.('info', 'Downloading compressed archive from Supabase Cloud...');
      const blob = await backupService.downloadCloudBackupBlob(record);
      const parsed = await backupService.readBackupZip(blob);
      setPendingRestoreData(parsed);
      onToast?.('info', 'Cloud archive downloaded & verified. Please review and confirm restore below.');
    } catch (err: any) {
      onToast?.('error', `Failed to load cloud backup: ${err.message}`);
    } finally {
      setIsRestoring(false);
    }
  };

  // 6. Download cloud backup to PC
  const handleDownloadCloudRecord = async (record: CloudBackupRecord) => {
    try {
      onToast?.('info', `Downloading ${record.filename} from Supabase...`);
      const blob = await backupService.downloadCloudBackupBlob(record);
      backupService.downloadBackupZip(blob, record.filename);
      onToast?.('success', `Downloaded ${record.filename}!`);
    } catch (err: any) {
      onToast?.('error', `Download error: ${err.message}`);
    }
  };

  // 7. Delete cloud record
  const handleDeleteCloudRecord = async (record: CloudBackupRecord) => {
    if (window.confirm(`Delete backup "${record.filename}" from Supabase Cloud?`)) {
      try {
        await backupService.deleteCloudBackup(record);
        onToast?.('success', `Deleted backup "${record.filename}".`);
        await loadCloudBackupsList();
      } catch (err: any) {
        onToast?.('error', `Failed to delete backup: ${err.message}`);
      }
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* HEADER BANNER */}
      <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white rounded-3xl shadow-xl border border-indigo-500/30 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-10 h-10 rounded-2xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-400 shadow-inner">
                <Archive className="w-5 h-5" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                Complete Project Backup & Restore
              </h2>
            </div>
            <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Sabhi Mock Tests, Questions/MCQ Bank, Master Categories, Subjects, Sections aur Settings ka 
              high-compression ZIP backup banayein aur Supabase Cloud me store karein.
            </p>
          </div>

          {/* CLOUD CONNECTION STATUS BADGE */}
          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/15 shrink-0">
            <div className={`w-3 h-3 rounded-full animate-pulse ${supabaseConnected ? 'bg-emerald-400 shadow-md shadow-emerald-400/50' : 'bg-amber-400'}`} />
            <div>
              <div className="flex items-center gap-1.5 font-black text-xs">
                <span>Supabase Cloud:</span>
                <span className={supabaseConnected ? 'text-emerald-300' : 'text-amber-300'}>
                  {supabaseConnected ? 'Connected' : 'Offline'}
                </span>
              </div>
              <p className="text-[10px] text-slate-300 mt-0.5">
                {supabaseConnected ? 'Compressed cloud archives ready' : 'Configure keys in Settings'}
              </p>
            </div>
            {onOpenSupabaseModal && (
              <button
                type="button"
                onClick={onOpenSupabaseModal}
                className="px-2.5 py-1 text-[11px] font-bold bg-white/20 hover:bg-white/30 rounded-lg transition-colors cursor-pointer"
              >
                Config
              </button>
            )}
          </div>
        </div>

        {/* LIVE INVENTORY COUNTERS */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 pt-6 border-t border-white/10 text-xs">
          <div className="bg-white/5 rounded-xl p-2.5 border border-white/10">
            <span className="text-slate-400 block text-[10px] font-bold uppercase">Mock Tests</span>
            <span className="text-lg font-black text-white">{liveStats.testsCount}</span>
          </div>
          <div className="bg-white/5 rounded-xl p-2.5 border border-white/10">
            <span className="text-slate-400 block text-[10px] font-bold uppercase">Total MCQs</span>
            <span className="text-lg font-black text-blue-400">{liveStats.questionsCount}</span>
          </div>
          <div className="bg-white/5 rounded-xl p-2.5 border border-white/10">
            <span className="text-slate-400 block text-[10px] font-bold uppercase">Categories</span>
            <span className="text-lg font-black text-purple-400">{liveStats.categoriesCount}</span>
          </div>
          <div className="bg-white/5 rounded-xl p-2.5 border border-white/10">
            <span className="text-slate-400 block text-[10px] font-bold uppercase">Subjects</span>
            <span className="text-lg font-black text-indigo-400">{liveStats.subjectsCount}</span>
          </div>
          <div className="bg-white/5 rounded-xl p-2.5 border border-white/10">
            <span className="text-slate-400 block text-[10px] font-bold uppercase">Sections</span>
            <span className="text-lg font-black text-emerald-400">{liveStats.sectionsCount}</span>
          </div>
        </div>
      </div>

      {/* TWO PRIMARY PANELS: CREATE BACKUP & RESTORE BACKUP */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* PANEL 1: CREATE BACKUP */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 dark:text-white text-base">
                1. Create Compressed Backup
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Compresses all project data into a space-efficient ZIP archive.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Backup Label / Note (Optional)
              </label>
              <input
                type="text"
                value={backupNote}
                onChange={(e) => setBackupNote(e.target.value)}
                placeholder="e.g. Pre-Exam Session Backup, All Tests & New Sections..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 space-y-2 text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>What will be included in the ZIP archive:</span>
              </span>
              <ul className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-600 dark:text-slate-400 pt-1">
                <li className="flex items-center gap-1">✓ All Mock Tests ({liveStats.testsCount})</li>
                <li className="flex items-center gap-1">✓ All MCQs ({liveStats.questionsCount})</li>
                <li className="flex items-center gap-1">✓ Master Categories ({liveStats.categoriesCount})</li>
                <li className="flex items-center gap-1">✓ Master Subjects ({liveStats.subjectsCount})</li>
                <li className="flex items-center gap-1">✓ Master Sections ({liveStats.sectionsCount})</li>
                <li className="flex items-center gap-1">✓ Admin Settings & Social Gate</li>
              </ul>
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <button
              type="button"
              disabled={isCreatingBackup || isUploadingCloud}
              onClick={handleCreateAndDownloadBackup}
              className="w-full sm:flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isCreatingBackup ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Compressing ZIP...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download ZIP File</span>
                </>
              )}
            </button>

            <button
              type="button"
              disabled={isCreatingBackup || isUploadingCloud || !supabaseConnected}
              onClick={handleBackupToSupabaseCloud}
              className="w-full sm:flex-1 py-3 px-4 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              title={supabaseConnected ? 'Save directly to Supabase' : 'Connect Supabase in Settings'}
            >
              {isUploadingCloud ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
                  <span>Uploading to Cloud...</span>
                </>
              ) : (
                <>
                  <CloudLightning className="w-4 h-4 text-emerald-400" />
                  <span>Backup to Supabase Cloud</span>
                </>
              )}
            </button>
          </div>

          {lastCreatedBackup && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div className="truncate">
                  <p className="font-bold text-emerald-900 dark:text-emerald-200 truncate">
                    {lastCreatedBackup.filename}
                  </p>
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400">
                    Compressed: {lastCreatedBackup.sizeFormatted} at {lastCreatedBackup.timestamp}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => backupService.downloadBackupZip(lastCreatedBackup.blob, lastCreatedBackup.filename)}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold shrink-0 cursor-pointer"
              >
                Re-Download
              </button>
            </div>
          )}
        </div>

        {/* PANEL 2: RESTORE FROM BACKUP */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 dark:text-white text-base">
                2. Restore from ZIP Archive
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Upload a previously saved ZIP file to restore tests, questions, and settings.
              </p>
            </div>
          </div>

          {/* DROPZONE / FILE PICKER */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-purple-500 dark:hover:border-purple-500 rounded-2xl p-6 text-center cursor-pointer transition-all bg-slate-50/60 dark:bg-slate-800/40 group"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip,.json"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
              <FileArchive className="w-6 h-6" />
            </div>
            <p className="font-bold text-xs text-slate-800 dark:text-slate-200">
              {isAnalyzingFile
                ? 'Decompressing & validating ZIP archive...'
                : selectedFileForRestore
                ? selectedFileForRestore.name
                : 'Click or drop your backup .ZIP file here'}
            </p>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Supports .zip archives and legacy .json snapshots
            </span>
          </div>

          {/* RESTORE PREVIEW & CONFIRMATION BOX */}
          {pendingRestoreData && (
            <div className="p-4 bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/60 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-black text-purple-900 dark:text-purple-300 text-xs flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span>Backup Contents Verified</span>
                </span>
                <span className="text-[10px] bg-purple-200/60 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200 px-2 py-0.5 rounded-md font-bold">
                  v{pendingRestoreData.manifest.version || '2.0'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                <div className="bg-white/80 dark:bg-slate-900/80 p-2 rounded-xl border border-purple-100 dark:border-purple-900/40">
                  <span className="text-[10px] text-slate-400 block font-bold">Tests</span>
                  <span className="font-black text-slate-800 dark:text-white">
                    {pendingRestoreData.manifest.counts.tests}
                  </span>
                </div>
                <div className="bg-white/80 dark:bg-slate-900/80 p-2 rounded-xl border border-purple-100 dark:border-purple-900/40">
                  <span className="text-[10px] text-slate-400 block font-bold">MCQs</span>
                  <span className="font-black text-purple-600 dark:text-purple-400">
                    {pendingRestoreData.manifest.counts.questions}
                  </span>
                </div>
                <div className="bg-white/80 dark:bg-slate-900/80 p-2 rounded-xl border border-purple-100 dark:border-purple-900/40">
                  <span className="text-[10px] text-slate-400 block font-bold">Categories</span>
                  <span className="font-black text-slate-800 dark:text-white">
                    {pendingRestoreData.manifest.counts.categories}
                  </span>
                </div>
                <div className="bg-white/80 dark:bg-slate-900/80 p-2 rounded-xl border border-purple-100 dark:border-purple-900/40">
                  <span className="text-[10px] text-slate-400 block font-bold">Sections</span>
                  <span className="font-black text-emerald-600 dark:text-emerald-400">
                    {pendingRestoreData.manifest.counts.sections}
                  </span>
                </div>
              </div>

              {/* RESTORE MODE SELECTOR */}
              <div className="space-y-1 pt-1">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  Restore Strategy:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRestoreMode('merge')}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      restoreMode === 'merge'
                        ? 'border-purple-600 bg-purple-100/60 dark:bg-purple-900/40 font-bold text-purple-950 dark:text-purple-200'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div className="text-xs font-black">Merge (Safe)</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Adds new items without deleting existing data.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRestoreMode('replace')}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      restoreMode === 'replace'
                        ? 'border-rose-600 bg-rose-100/60 dark:bg-rose-900/40 font-bold text-rose-950 dark:text-rose-200'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div className="text-xs font-black">Clean Overwrite</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Replaces current state completely with backup.
                    </div>
                  </button>
                </div>
              </div>

              {/* CONFIRM BUTTON */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  disabled={isRestoring}
                  onClick={handleExecuteRestore}
                  className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isRestoring ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Restoring Database...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Execute Restore ({restoreMode === 'merge' ? 'Merge' : 'Overwrite'})</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPendingRestoreData(null);
                    setSelectedFileForRestore(null);
                  }}
                  className="p-2.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                  title="Cancel"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 3: SUPABASE CLOUD BACKUPS EXPLORER */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 dark:text-white text-base flex items-center gap-2">
                <span>3. Supabase Cloud Backups Explorer</span>
                <span className="text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                  Min Space / Max Speed
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Manage compressed ZIP backups stored directly in your Supabase project.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadCloudBackupsList}
              disabled={loadingCloudBackups}
              className="p-2 text-slate-500 hover:text-blue-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold"
              title="Refresh Cloud Backups"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingCloudBackups ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* LIST OF CLOUD BACKUPS */}
        {cloudBackups.length === 0 ? (
          <div className="py-12 text-center text-slate-400 space-y-2">
            <Cloud className="w-10 h-10 mx-auto opacity-40 text-slate-400" />
            <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
              No cloud backups found in Supabase yet.
            </p>
            <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
              Click &quot;Backup to Supabase Cloud&quot; above to create your first space-optimized compressed ZIP snapshot.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {cloudBackups.map((record) => {
              const testCount = record.manifest?.counts?.tests || 0;
              const qCount = record.manifest?.counts?.questions || 0;
              const dateStr = record.created_at ? new Date(record.created_at).toLocaleString() : 'Recent';

              return (
                <div
                  key={record.id || record.filename}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group hover:bg-slate-50/60 dark:hover:bg-slate-800/40 px-2 rounded-2xl transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
                      <Archive className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-xs text-slate-900 dark:text-white truncate">
                          {record.filename}
                        </p>
                        <span className="text-[10px] font-black bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 px-2 py-0.2 rounded-md">
                          {record.size_formatted}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                        <span>{dateStr}</span>
                        <span>•</span>
                        <span>{testCount} Tests</span>
                        <span>•</span>
                        <span>{qCount} MCQs</span>
                        {record.manifest?.backup_name && (
                          <>
                            <span>•</span>
                            <span className="text-slate-500 dark:text-slate-300 font-medium truncate">
                              &quot;{record.manifest.backup_name}&quot;
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => handleRestoreFromCloudRecord(record)}
                      disabled={isRestoring}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                      title="Inspect & Restore this backup"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Restore</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDownloadCloudRecord(record)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 rounded-xl transition-colors cursor-pointer"
                      title="Download ZIP to PC"
                    >
                      <Download className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteCloudRecord(record)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-xl transition-colors cursor-pointer"
                      title="Delete from Cloud"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
