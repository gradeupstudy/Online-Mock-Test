import JSZip from 'jszip';
import { Test, Question, AdminSettings, SocialPlatform, Attempt, QuestionReport } from '../types';
import { dataService } from './dataService';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';

export interface BackupManifest {
  version: string;
  timestamp: string;
  created_at: string;
  app_name: string;
  backup_name?: string;
  counts: {
    tests: number;
    questions: number;
    categories: number;
    subjects: number;
    sections: number;
    attempts: number;
    reports: number;
    settings: boolean;
  };
  size_bytes?: number;
  description?: string;
}

export interface ProjectBackupData {
  manifest: BackupManifest;
  tests: Test[];
  questions: Question[];
  taxonomy: {
    categories: string[];
    subjects: string[];
    sections: string[];
  };
  settings: AdminSettings | null;
  socialPlatforms: SocialPlatform[];
  attempts?: Attempt[];
  reports?: QuestionReport[];
}

export interface CloudBackupRecord {
  id: string;
  filename: string;
  created_at: string;
  size_bytes: number;
  size_formatted: string;
  manifest: BackupManifest;
  source: 'storage' | 'database';
  storage_path?: string;
  base64_data?: string;
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const backupService = {
  /**
   * Generates a fully compressed ZIP file containing all mocks, questions,
   * taxonomy (categories, subjects, sections), admin settings, and attempts.
   */
  async createProjectBackupZip(options: {
    backupName?: string;
    description?: string;
    includeAttempts?: boolean;
    includeReports?: boolean;
  } = {}): Promise<{
    blob: Blob;
    filename: string;
    sizeBytes: number;
    sizeFormatted: string;
    data: ProjectBackupData;
  }> {
    const {
      backupName = 'GradeUp Portal Backup',
      description = 'Complete project snapshot including mocks, MCQs, and taxonomy',
      includeAttempts = true,
      includeReports = true,
    } = options;

    // 1. Gather all project data from local storage, IDB, and services
    const [
      allTests,
      allBankQuestions,
      categories,
      subjects,
      sections,
      adminSettings,
      socialPlatforms,
      attempts,
      reports
    ] = await Promise.all([
      dataService.getTests(true),
      dataService.getAllQuestionBank(),
      Promise.resolve(dataService.getMasterCategories()),
      Promise.resolve(dataService.getMasterSubjects()),
      Promise.resolve(dataService.getMasterSections()),
      dataService.getSettings(),
      dataService.getSocialPlatforms(),
      includeAttempts ? dataService.getAttempts() : Promise.resolve([]),
      includeReports ? dataService.getQuestionReports() : Promise.resolve([])
    ]);

    // Deduplicate and combine all test questions and bank questions
    const questionMap = new Map<string, Question>();
    (allBankQuestions || []).forEach(q => {
      if (q && q.id) questionMap.set(q.id, q);
    });

    // Also ensure test questions are mapped
    for (const t of (allTests || [])) {
      if (t && t.id) {
        try {
          const qs = await dataService.getQuestions(t.id, true);
          qs.forEach(q => { if (q && q.id) questionMap.set(q.id, q); });
        } catch {}
      }
    }
    const combinedQuestions = Array.from(questionMap.values());

    const now = new Date();
    const timestampStr = now.toISOString().replace(/[:.]/g, '-');
    const dateFormatted = now.toISOString().slice(0, 10);
    const filename = `gradeup_backup_${dateFormatted}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}.zip`;

    const manifest: BackupManifest = {
      version: '2.0',
      timestamp: now.toISOString(),
      created_at: now.toLocaleString(),
      app_name: 'GradeUp Study Portal',
      backup_name: backupName,
      description: description,
      counts: {
        tests: (allTests || []).length,
        questions: combinedQuestions.length,
        categories: (categories || []).length,
        subjects: (subjects || []).length,
        sections: (sections || []).length,
        attempts: (attempts || []).length,
        reports: (reports || []).length,
        settings: !!adminSettings
      }
    };

    const projectData: ProjectBackupData = {
      manifest,
      tests: allTests || [],
      questions: combinedQuestions,
      taxonomy: {
        categories: categories || [],
        subjects: subjects || [],
        sections: sections || []
      },
      settings: adminSettings,
      socialPlatforms: socialPlatforms || [],
      attempts: includeAttempts ? attempts : [],
      reports: includeReports ? reports : []
    };

    // 2. Build ZIP archive using JSZip with maximum deflate compression
    const zip = new JSZip();

    // Add manifest and individual categorized JSON files
    zip.file('manifest.json', JSON.stringify(manifest, null, 2));
    zip.file('mock_tests.json', JSON.stringify(allTests || [], null, 2));
    zip.file('questions.json', JSON.stringify(combinedQuestions, null, 2));
    zip.file('taxonomy.json', JSON.stringify({
      categories: categories || [],
      subjects: subjects || [],
      sections: sections || []
    }, null, 2));
    zip.file('admin_settings.json', JSON.stringify(adminSettings || {}, null, 2));
    zip.file('social_platforms.json', JSON.stringify(socialPlatforms || [], null, 2));
    
    if (includeAttempts) {
      zip.file('attempts.json', JSON.stringify(attempts || [], null, 2));
    }
    if (includeReports) {
      zip.file('question_reports.json', JSON.stringify(reports || [], null, 2));
    }

    // Add full combined snapshot as backup fallback
    zip.file('gradeup_full_snapshot.json', JSON.stringify(projectData, null, 2));

    // Compress
    const blob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: {
        level: 9 // maximum compression level for smallest footprint
      }
    });

    manifest.size_bytes = blob.size;

    return {
      blob,
      filename,
      sizeBytes: blob.size,
      sizeFormatted: formatBytes(blob.size),
      data: projectData
    };
  },

  /**
   * Triggers a browser download of the compressed ZIP file.
   */
  downloadBackupZip(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 2000);
  },

  /**
   * Reads, inspects, and validates an uploaded ZIP file.
   */
  async readBackupZip(fileOrBlob: Blob | File): Promise<ProjectBackupData> {
    try {
      const zip = await JSZip.loadAsync(fileOrBlob);

      // Check if this is our standard multi-file zip or a single snapshot
      let manifest: BackupManifest | null = null;
      let tests: Test[] = [];
      let questions: Question[] = [];
      let taxonomy = { categories: [] as string[], subjects: [] as string[], sections: [] as string[] };
      let settings: AdminSettings | null = null;
      let socialPlatforms: SocialPlatform[] = [];
      let attempts: Attempt[] = [];
      let reports: QuestionReport[] = [];

      // 1. Read manifest
      const manifestFile = zip.file('manifest.json');
      if (manifestFile) {
        const text = await manifestFile.async('text');
        try {
          manifest = JSON.parse(text);
        } catch {}
      }

      // 2. Read tests
      const testsFile = zip.file('mock_tests.json');
      if (testsFile) {
        const text = await testsFile.async('text');
        try {
          tests = JSON.parse(text);
        } catch {}
      }

      // 3. Read questions
      const questionsFile = zip.file('questions.json');
      if (questionsFile) {
        const text = await questionsFile.async('text');
        try {
          questions = JSON.parse(text);
        } catch {}
      }

      // 4. Read taxonomy
      const taxonomyFile = zip.file('taxonomy.json');
      if (taxonomyFile) {
        const text = await taxonomyFile.async('text');
        try {
          const parsedTax = JSON.parse(text);
          taxonomy = {
            categories: Array.isArray(parsedTax.categories) ? parsedTax.categories : [],
            subjects: Array.isArray(parsedTax.subjects) ? parsedTax.subjects : [],
            sections: Array.isArray(parsedTax.sections) ? parsedTax.sections : []
          };
        } catch {}
      }

      // 5. Read settings
      const settingsFile = zip.file('admin_settings.json');
      if (settingsFile) {
        const text = await settingsFile.async('text');
        try {
          settings = JSON.parse(text);
        } catch {}
      }

      // 6. Read social platforms
      const socialFile = zip.file('social_platforms.json');
      if (socialFile) {
        const text = await socialFile.async('text');
        try {
          socialPlatforms = JSON.parse(text);
        } catch {}
      }

      // 7. Read attempts
      const attemptsFile = zip.file('attempts.json');
      if (attemptsFile) {
        const text = await attemptsFile.async('text');
        try {
          attempts = JSON.parse(text);
        } catch {}
      }

      // 8. Read reports
      const reportsFile = zip.file('question_reports.json');
      if (reportsFile) {
        const text = await reportsFile.async('text');
        try {
          reports = JSON.parse(text);
        } catch {}
      }

      // Fallback: Check full snapshot if individual files are missing
      if (tests.length === 0 && questions.length === 0) {
        const snapshotFile = zip.file('gradeup_full_snapshot.json');
        if (snapshotFile) {
          const text = await snapshotFile.async('text');
          const snap = JSON.parse(text);
          tests = snap.tests || [];
          questions = snap.questions || [];
          taxonomy = snap.taxonomy || taxonomy;
          settings = snap.settings || settings;
          socialPlatforms = snap.socialPlatforms || socialPlatforms;
          attempts = snap.attempts || attempts;
          reports = snap.reports || reports;
          if (!manifest && snap.manifest) manifest = snap.manifest;
        }
      }

      // Build manifest if missing
      if (!manifest) {
        manifest = {
          version: '2.0',
          timestamp: new Date().toISOString(),
          created_at: new Date().toLocaleString(),
          app_name: 'GradeUp Study Portal',
          counts: {
            tests: tests.length,
            questions: questions.length,
            categories: taxonomy.categories.length,
            subjects: taxonomy.subjects.length,
            sections: taxonomy.sections.length,
            attempts: attempts.length,
            reports: reports.length,
            settings: !!settings
          }
        };
      }

      return {
        manifest,
        tests,
        questions,
        taxonomy,
        settings,
        socialPlatforms,
        attempts,
        reports
      };
    } catch (err: any) {
      // Fallback: If user accidentally uploaded a .json backup instead of a .zip
      try {
        const text = await (fileOrBlob as Blob).text();
        const parsed = JSON.parse(text);
        if (parsed.tests || parsed.questions) {
          return {
            manifest: parsed.manifest || {
              version: '1.0',
              timestamp: new Date().toISOString(),
              created_at: new Date().toLocaleString(),
              app_name: 'GradeUp Study Portal',
              counts: {
                tests: (parsed.tests || []).length,
                questions: (parsed.questions || []).length,
                categories: (parsed.taxonomy?.categories || []).length,
                subjects: (parsed.taxonomy?.subjects || []).length,
                sections: (parsed.taxonomy?.sections || []).length,
                attempts: (parsed.attempts || []).length,
                reports: (parsed.reports || []).length,
                settings: !!parsed.settings
              }
            },
            tests: parsed.tests || [],
            questions: parsed.questions || [],
            taxonomy: parsed.taxonomy || { categories: [], subjects: [], sections: [] },
            settings: parsed.settings || null,
            socialPlatforms: parsed.socialPlatforms || [],
            attempts: parsed.attempts || [],
            reports: parsed.reports || []
          };
        }
      } catch {}
      throw new Error(`Invalid or corrupt backup ZIP archive: ${err.message}`);
    }
  },

  /**
   * Restores all data from a parsed backup package.
   * Supports 'merge' (add new items without deleting existing) or 'replace' (clean overwrite).
   */
  async restoreProjectBackup(
    backup: ProjectBackupData,
    mode: 'merge' | 'replace' = 'merge'
  ): Promise<{
    restoredTests: number;
    restoredQuestions: number;
    restoredCategories: number;
    restoredSubjects: number;
    restoredSections: number;
    restoredSettings: boolean;
  }> {
    let finalTests: Test[] = [];
    let finalQuestions: Question[] = [];

    // 1. Handle Mock Tests
    if (mode === 'replace') {
      finalTests = [...(backup.tests || [])];
    } else {
      const currentTests = await dataService.getTests(true);
      const testMap = new Map<string, Test>();
      (currentTests || []).forEach(t => { if (t && t.id) testMap.set(t.id, t); });
      (backup.tests || []).forEach(t => { if (t && t.id) testMap.set(t.id, t); });
      finalTests = Array.from(testMap.values());
    }

    try {
      localStorage.setItem('gradeup_tests', JSON.stringify(finalTests));
    } catch {}

    for (const t of finalTests) {
      try {
        await dataService.saveTest(t);
      } catch {}
    }

    // 2. Handle Questions (Tests & Question Bank)
    if (mode === 'replace') {
      finalQuestions = [...(backup.questions || [])];
    } else {
      const currentBank = await dataService.getAllQuestionBank();
      const qMap = new Map<string, Question>();
      (currentBank || []).forEach(q => { if (q && q.id) qMap.set(q.id, q); });
      (backup.questions || []).forEach(q => { if (q && q.id) qMap.set(q.id, q); });
      finalQuestions = Array.from(qMap.values());
    }

    // Save to master bank
    try {
      localStorage.setItem('gradeup_question_bank_master', JSON.stringify(finalQuestions));
    } catch {}

    // Distribute questions into their respective mock tests if test_id matches
    const questionsByTestId = new Map<string, Question[]>();
    finalQuestions.forEach(q => {
      if (q.test_id && q.test_id !== 'bank') {
        const arr = questionsByTestId.get(q.test_id) || [];
        arr.push(q);
        questionsByTestId.set(q.test_id, arr);
      }
    });

    for (const [tId, qArr] of questionsByTestId.entries()) {
      try {
        await dataService.saveQuestions(tId, qArr);
      } catch {}
    }

    // 3. Handle Unified Taxonomy (Categories, Subjects, Sections)
    let catCount = 0;
    let subCount = 0;
    let secCount = 0;

    if (backup.taxonomy) {
      if (mode === 'replace') {
        localStorage.setItem('gradeup_master_categories', JSON.stringify(backup.taxonomy.categories || []));
        localStorage.setItem('gradeup_master_subjects', JSON.stringify(backup.taxonomy.subjects || []));
        localStorage.setItem('gradeup_master_sections', JSON.stringify(backup.taxonomy.sections || []));
        catCount = (backup.taxonomy.categories || []).length;
        subCount = (backup.taxonomy.subjects || []).length;
        secCount = (backup.taxonomy.sections || []).length;
      } else {
        for (const c of (backup.taxonomy.categories || [])) {
          if (c && c.trim()) {
            await dataService.saveMasterCategory(c.trim());
            catCount++;
          }
        }
        for (const s of (backup.taxonomy.subjects || [])) {
          if (s && s.trim()) {
            await dataService.saveMasterSubject(s.trim());
            subCount++;
          }
        }
        for (const sec of (backup.taxonomy.sections || [])) {
          if (sec && sec.trim()) {
            await dataService.saveMasterSection(sec.trim());
            secCount++;
          }
        }
      }
    }

    // 4. Handle Admin Settings
    let restoredSettings = false;
    if (backup.settings) {
      await dataService.updateSettings(backup.settings);
      restoredSettings = true;
    }

    // 5. Handle Social Platforms
    if (Array.isArray(backup.socialPlatforms) && backup.socialPlatforms.length > 0) {
      for (const p of backup.socialPlatforms) {
        try {
          await dataService.saveSocialPlatform(p);
        } catch {}
      }
    }

    // 6. Handle Attempts & Reports
    if (Array.isArray(backup.attempts) && backup.attempts.length > 0) {
      const currentAttempts = await dataService.getAttempts();
      const attMap = new Map<string, Attempt>();
      if (mode !== 'replace') {
        currentAttempts.forEach(a => { if (a && a.id) attMap.set(a.id, a); });
      }
      backup.attempts.forEach(a => { if (a && a.id) attMap.set(a.id, a); });
      localStorage.setItem('gradeup_attempts', JSON.stringify(Array.from(attMap.values())));
    }

    if (Array.isArray(backup.reports) && backup.reports.length > 0) {
      const currentReports = await dataService.getQuestionReports();
      const repMap = new Map<string, QuestionReport>();
      if (mode !== 'replace') {
        currentReports.forEach(r => { if (r && r.id) repMap.set(r.id, r); });
      }
      backup.reports.forEach(r => { if (r && r.id) repMap.set(r.id, r); });
      localStorage.setItem('gradeup_question_reports', JSON.stringify(Array.from(repMap.values())));
    }

    // 7. Dispatch global refresh events
    window.dispatchEvent(new CustomEvent('gradeup_tests_updated'));
    window.dispatchEvent(new CustomEvent('gradeup_taxonomy_updated'));
    window.dispatchEvent(new CustomEvent('gradeup_reports_updated'));

    return {
      restoredTests: finalTests.length,
      restoredQuestions: finalQuestions.length,
      restoredCategories: catCount,
      restoredSubjects: subCount,
      restoredSections: secCount,
      restoredSettings
    };
  },

  /**
   * Uploads compressed backup to Supabase.
   * Utilizes Supabase Storage bucket 'project-backups' if available,
   * and maintains a sync index in 'admin_settings' table for fast retrieval.
   */
  async uploadBackupToSupabase(
    zipBlob: Blob,
    filename: string,
    manifest: BackupManifest
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    const supabase = getSupabaseClient();
    if (!isSupabaseConfigured() || !supabase) {
      return { success: false, error: 'Supabase credentials are not configured.' };
    }

    let storagePath: string | undefined;
    let storageErrorMsg: string | undefined;

    // Try Supabase Storage first
    try {
      const bucketName = 'project-backups';
      // Attempt bucket creation if not exists (fails gracefully if restricted)
      try {
        await supabase.storage.createBucket(bucketName, { public: false });
      } catch {}

      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from(bucketName)
        .upload(filename, zipBlob, {
          cacheControl: '3600',
          upsert: true,
          contentType: 'application/zip'
        });

      if (!uploadErr && uploadData) {
        storagePath = uploadData.path;
      } else {
        storageErrorMsg = uploadErr?.message;
      }
    } catch (err: any) {
      storageErrorMsg = err?.message;
    }

    // Convert to base64 for persistent metadata catalog
    let base64Zip = '';
    try {
      const arrayBuffer = await zipBlob.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      base64Zip = btoa(binary);
    } catch {}

    const newRecord: CloudBackupRecord = {
      id: `backup_${Date.now()}`,
      filename,
      created_at: new Date().toISOString(),
      size_bytes: zipBlob.size,
      size_formatted: formatBytes(zipBlob.size),
      manifest,
      source: storagePath ? 'storage' : 'database',
      storage_path: storagePath,
      base64_data: base64Zip || undefined
    };

    // Update local and Supabase cloud backup log
    try {
      const localBackups = this.getLocalCloudBackupIndex();
      localBackups.unshift(newRecord);
      localStorage.setItem('gradeup_cloud_backups_index', JSON.stringify(localBackups.slice(0, 15)));

      // Also persist index into Supabase admin_settings table if possible
      const { data: existingSettings } = await supabase
        .from('admin_settings')
        .select('id, custom_configs')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingSettings && existingSettings.id) {
        const configs = existingSettings.custom_configs || {};
        const remoteBackups = Array.isArray(configs.cloud_backups) ? configs.cloud_backups : [];
        // Store metadata without bloated base64 to save DB quota
        const leanRecord = { ...newRecord, base64_data: undefined };
        const updatedList = [leanRecord, ...remoteBackups.filter((b: any) => b.filename !== filename)].slice(0, 10);
        
        await supabase
          .from('admin_settings')
          .update({
            custom_configs: { ...configs, cloud_backups: updatedList },
            updated_at: new Date().toISOString()
          })
          .eq('id', existingSettings.id);
      }

      return {
        success: true,
        url: storagePath
      };
    } catch (err: any) {
      if (storagePath) {
        return { success: true, url: storagePath };
      }
      return {
        success: false,
        error: storageErrorMsg || err.message || 'Failed to save cloud backup record.'
      };
    }
  },

  /**
   * Retrieves local cache of cloud backup index.
   */
  getLocalCloudBackupIndex(): CloudBackupRecord[] {
    try {
      const raw = localStorage.getItem('gradeup_cloud_backups_index');
      if (raw) {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch {}
    return [];
  },

  /**
   * Lists available cloud backups from Supabase Storage and database metadata.
   */
  async listSupabaseBackups(): Promise<CloudBackupRecord[]> {
    const supabase = getSupabaseClient();
    const localRecords = this.getLocalCloudBackupIndex();

    if (!isSupabaseConfigured() || !supabase) {
      return localRecords;
    }

    const backupMap = new Map<string, CloudBackupRecord>();
    localRecords.forEach(r => backupMap.set(r.filename, r));

    try {
      // 1. Fetch remote list from Supabase admin_settings
      const { data: settingsData } = await supabase
        .from('admin_settings')
        .select('custom_configs')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (settingsData && settingsData.custom_configs?.cloud_backups) {
        const remoteList: CloudBackupRecord[] = settingsData.custom_configs.cloud_backups;
        remoteList.forEach(r => {
          if (!backupMap.has(r.filename)) {
            backupMap.set(r.filename, r);
          }
        });
      }

      // 2. Fetch remote files from Storage bucket 'project-backups'
      try {
        const { data: storageFiles, error } = await supabase.storage
          .from('project-backups')
          .list('', { limit: 20, sortBy: { column: 'created_at', order: 'desc' } });

        if (!error && Array.isArray(storageFiles)) {
          storageFiles.forEach(f => {
            if (f.name.endsWith('.zip')) {
              const existing = backupMap.get(f.name);
              const size = f.metadata?.size || (existing ? existing.size_bytes : 0);
              backupMap.set(f.name, {
                id: f.id || existing?.id || f.name,
                filename: f.name,
                created_at: f.created_at || existing?.created_at || new Date().toISOString(),
                size_bytes: size,
                size_formatted: formatBytes(size),
                manifest: existing?.manifest || {
                  version: '2.0',
                  timestamp: f.created_at || new Date().toISOString(),
                  created_at: new Date(f.created_at || Date.now()).toLocaleString(),
                  app_name: 'GradeUp Study Portal',
                  counts: {
                    tests: 0,
                    questions: 0,
                    categories: 0,
                    subjects: 0,
                    sections: 0,
                    attempts: 0,
                    reports: 0,
                    settings: true
                  }
                },
                source: 'storage',
                storage_path: f.name
              });
            }
          });
        }
      } catch {}

      const sorted = Array.from(backupMap.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      localStorage.setItem('gradeup_cloud_backups_index', JSON.stringify(sorted.slice(0, 15)));
      return sorted;
    } catch (err) {
      console.warn('Error fetching Supabase cloud backups:', err);
      return localRecords;
    }
  },

  /**
   * Downloads or retrieves a cloud backup zip blob from Supabase.
   */
  async downloadCloudBackupBlob(record: CloudBackupRecord): Promise<Blob> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      if (record.base64_data) {
        const byteCharacters = atob(record.base64_data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        return new Blob([byteArray], { type: 'application/zip' });
      }
      throw new Error('Supabase is not connected and local cached zip data is missing.');
    }

    // Try storage download first
    if (record.source === 'storage' || record.storage_path) {
      try {
        const path = record.storage_path || record.filename;
        const { data, error } = await supabase.storage.from('project-backups').download(path);
        if (!error && data) {
          return data;
        }
      } catch {}
    }

    // Fallback: check base64 data
    if (record.base64_data) {
      const byteCharacters = atob(record.base64_data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      return new Blob([byteArray], { type: 'application/zip' });
    }

    throw new Error('Could not download cloud backup from Supabase Storage. File may have been removed or access is restricted.');
  },

  /**
   * Deletes a cloud backup record from Supabase Storage and index.
   */
  async deleteCloudBackup(record: CloudBackupRecord): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        if (record.storage_path) {
          await supabase.storage.from('project-backups').remove([record.storage_path]);
        }
      } catch {}
    }

    const current = this.getLocalCloudBackupIndex();
    const updated = current.filter(b => b.filename !== record.filename && b.id !== record.id);
    localStorage.setItem('gradeup_cloud_backups_index', JSON.stringify(updated));

    if (supabase) {
      try {
        const { data: existingSettings } = await supabase
          .from('admin_settings')
          .select('id, custom_configs')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existingSettings && existingSettings.id) {
          const configs = existingSettings.custom_configs || {};
          const remoteBackups = Array.isArray(configs.cloud_backups) ? configs.cloud_backups : [];
          const updatedList = remoteBackups.filter((b: any) => b.filename !== record.filename && b.id !== record.id);
          await supabase
            .from('admin_settings')
            .update({
              custom_configs: { ...configs, cloud_backups: updatedList },
              updated_at: new Date().toISOString()
            })
            .eq('id', existingSettings.id);
        }
      } catch {}
    }

    return true;
  }
};
