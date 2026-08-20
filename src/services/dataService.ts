import { Test, Question, Student, Attempt, Answer, SocialPlatform, AdminSettings, PublicLeaderboardEntry, SubmitAttemptResult, TestStatus } from '../types';
import { DEMO_TESTS, DEMO_QUESTIONS, DEMO_ATTEMPTS, DEMO_SOCIAL_PLATFORMS, DEMO_ADMIN_SETTINGS } from '../data/demoData';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';

export const isValidUUID = (id: string | null | undefined): boolean => {
  if (!id || typeof id !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

export const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const parseSafeNumber = (val: unknown, defaultVal = 0): number => {
  if (typeof val === 'number') return isNaN(val) ? defaultVal : val;
  if (typeof val === 'string') {
    const clean = val.replace(',', '.').trim();
    const num = parseFloat(clean);
    return isNaN(num) ? defaultVal : num;
  }
  return defaultVal;
};

export const STANDARD_PLATFORM_UUIDS: Record<string, string> = {
  'sp-yt': 'a1000000-0000-0000-0000-000000000001',
  'youtube': 'a1000000-0000-0000-0000-000000000001',
  'sp-tg': 'a1000000-0000-0000-0000-000000000002',
  'telegram': 'a1000000-0000-0000-0000-000000000002',
  'telegram channel': 'a1000000-0000-0000-0000-000000000002',
  'sp-ig': 'a1000000-0000-0000-0000-000000000003',
  'instagram': 'a1000000-0000-0000-0000-000000000003',
  'sp-wa': 'a1000000-0000-0000-0000-000000000004',
  'whatsapp': 'a1000000-0000-0000-0000-000000000004',
  'whatsapp channel': 'a1000000-0000-0000-0000-000000000004',
};

export const normalizePlatformId = (id: string | null | undefined, name?: string): string => {
  if (id && isValidUUID(id)) return id;
  const key = (id || '').toLowerCase().trim();
  if (STANDARD_PLATFORM_UUIDS[key]) return STANDARD_PLATFORM_UUIDS[key];
  if (name) {
    const nameKey = name.toLowerCase().trim();
    if (STANDARD_PLATFORM_UUIDS[nameKey]) return STANDARD_PLATFORM_UUIDS[nameKey];
    for (const [k, v] of Object.entries(STANDARD_PLATFORM_UUIDS)) {
      if (nameKey.includes(k) || k.includes(nameKey)) return v;
    }
  }
  return generateUUID();
};

const STORAGE_KEYS = {
  TESTS: 'gradeup_tests',
  QUESTIONS: 'gradeup_questions',
  ATTEMPTS: 'gradeup_attempts',
  ANSWERS: 'gradeup_answers',
  SOCIAL: 'gradeup_social_platforms',
  SETTINGS: 'gradeup_admin_settings',
  ACTIVE_ATTEMPT: 'gradeup_active_attempt_'
};

// Initialize local storage with default structure
const initLocalStorage = () => {
  const isRemoteActive = isSupabaseConfigured();
  if (!localStorage.getItem(STORAGE_KEYS.TESTS)) {
    localStorage.setItem(STORAGE_KEYS.TESTS, JSON.stringify(isRemoteActive ? [] : DEMO_TESTS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.QUESTIONS)) {
    localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(isRemoteActive ? {} : DEMO_QUESTIONS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.ATTEMPTS)) {
    localStorage.setItem(STORAGE_KEYS.ATTEMPTS, JSON.stringify(isRemoteActive ? [] : DEMO_ATTEMPTS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.SOCIAL)) {
    localStorage.setItem(STORAGE_KEYS.SOCIAL, JSON.stringify(DEMO_SOCIAL_PLATFORMS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEMO_ADMIN_SETTINGS));
  }
};

initLocalStorage();

export const sanitizeSocialUrl = (platformNameOrIcon: string, url?: string | null): string => {
  const norm = (platformNameOrIcon || '').toLowerCase();
  const cleanUrl = (url || '').trim();
  
  if (norm.includes('telegram') || norm.includes('send') || norm.includes('t.me')) {
    if (!cleanUrl || cleanUrl === 'https://t.me/gradeupstudy' || cleanUrl === 'http://t.me/gradeupstudy' || cleanUrl === 'https://t.me/gradeupstudy/') {
      return 'https://t.me/gradeupstudyofficial';
    }
    return cleanUrl;
  }
  
  if (norm.includes('instagram') || norm.includes('ig') || norm.includes('insta')) {
    if (!cleanUrl || cleanUrl === 'https://instagram.com/gradeupstudy' || cleanUrl === 'http://instagram.com/gradeupstudy' || cleanUrl === 'https://www.instagram.com/gradeupstudy' || cleanUrl === 'https://instagram.com/gradeupstudy/') {
      return 'https://instagram.com/gradeupstudy.official';
    }
    return cleanUrl;
  }

  if (norm.includes('youtube') || norm.includes('yt')) {
    if (!cleanUrl) return 'https://youtube.com/@gradeupstudy';
    return cleanUrl;
  }

  if (norm.includes('whatsapp') || norm.includes('wa') || norm.includes('message-circle')) {
    if (!cleanUrl) return 'https://whatsapp.com/channel/gradeupstudy';
    return cleanUrl;
  }

  return cleanUrl;
};

/**
 * Safely shuffle the 4 options (A, B, C, D) for a single Question.
 * Keeps the correct answer mapping 100% accurate, but reorders the options randomly
 * or targets a specific new option slot ('A' | 'B' | 'C' | 'D') if desired.
 */
export const shuffleQuestionOptions = (
  q: Question,
  forcedTargetAnswer?: 'A' | 'B' | 'C' | 'D'
): Question => {
  const currentKey = (['A', 'B', 'C', 'D'].includes(q.correct_answer?.toUpperCase())
    ? q.correct_answer.toUpperCase()
    : 'A') as 'A' | 'B' | 'C' | 'D';

  const optionsMap: Record<'A' | 'B' | 'C' | 'D', string> = {
    A: q.option_a || '',
    B: q.option_b || '',
    C: q.option_c || '',
    D: q.option_d || ''
  };

  const correctText = optionsMap[currentKey] || q.option_a;
  
  // Extract all 4 options
  const originalList = [
    { text: q.option_a, wasCorrect: currentKey === 'A' },
    { text: q.option_b, wasCorrect: currentKey === 'B' },
    { text: q.option_c, wasCorrect: currentKey === 'C' },
    { text: q.option_d, wasCorrect: currentKey === 'D' }
  ];

  let newList: string[] = [];
  let newCorrectKey: 'A' | 'B' | 'C' | 'D' = 'A';

  if (forcedTargetAnswer) {
    const targetIdx = ['A', 'B', 'C', 'D'].indexOf(forcedTargetAnswer);
    const distractors = originalList.filter(item => !item.wasCorrect).map(item => item.text);
    
    // Shuffle distractors
    for (let i = distractors.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [distractors[i], distractors[j]] = [distractors[j], distractors[i]];
    }

    newList = [];
    let dIdx = 0;
    for (let i = 0; i < 4; i++) {
      if (i === targetIdx) {
        newList.push(correctText);
      } else {
        newList.push(distractors[dIdx++] || `Option ${['A', 'B', 'C', 'D'][i]}`);
      }
    }
    newCorrectKey = forcedTargetAnswer;
  } else {
    // Random Fisher-Yates shuffle
    const shuffled = [...originalList];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    newList = shuffled.map(item => item.text);
    const foundIdx = shuffled.findIndex(item => item.wasCorrect);
    newCorrectKey = (['A', 'B', 'C', 'D'][foundIdx >= 0 ? foundIdx : 0]) as 'A' | 'B' | 'C' | 'D';
  }

  // Update explanation if it contains explicit "Option X" text
  let newExplanation = q.explanation || '';
  if (newExplanation && currentKey !== newCorrectKey) {
    newExplanation = newExplanation.replace(
      new RegExp(`Option\\s+${currentKey}\\b`, 'gi'),
      `Option ${newCorrectKey}`
    );
  }

  return {
    ...q,
    option_a: newList[0] || q.option_a,
    option_b: newList[1] || q.option_b,
    option_c: newList[2] || q.option_c,
    option_d: newList[3] || q.option_d,
    correct_answer: newCorrectKey,
    explanation: newExplanation
  };
};

/**
 * Shuffle & Balance options across an entire list of questions.
 * Ensures an even distribution of correct answers across A, B, C, D (~25% each)
 * and prevents long streaks of identical answers.
 */
export const shuffleAndBalanceQuestions = (questions: Question[]): Question[] => {
  if (!questions || questions.length === 0) return [];

  const keys: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];
  const balancedTargets: ('A' | 'B' | 'C' | 'D')[] = [];
  const fullCycles = Math.ceil(questions.length / 4);
  
  for (let c = 0; c < fullCycles; c++) {
    const cycleKeys = [...keys];
    // Shuffle the 4 keys for this cycle
    for (let i = cycleKeys.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cycleKeys[i], cycleKeys[j]] = [cycleKeys[j], cycleKeys[i]];
    }
    // Prevent last key of previous cycle matching first key of new cycle
    if (balancedTargets.length > 0 && balancedTargets[balancedTargets.length - 1] === cycleKeys[0]) {
      [cycleKeys[0], cycleKeys[1]] = [cycleKeys[1], cycleKeys[0]];
    }
    balancedTargets.push(...cycleKeys);
  }

  return questions.map((q, idx) => {
    const targetKey = balancedTargets[idx] || keys[idx % 4];
    return shuffleQuestionOptions(q, targetKey);
  });
};

export const sanitizeAdminSettings = (s?: Partial<AdminSettings> | any): AdminSettings => {
  const data = s || {};
  const brand_name = data.brand_name || data.app_name || 'Gradeup Study';
  const logo_url = data.logo_url !== undefined && data.logo_url !== null ? data.logo_url : DEMO_ADMIN_SETTINGS.logo_url;
  const youtube_channel = sanitizeSocialUrl('youtube', data.youtube_channel);
  const telegram_channel = sanitizeSocialUrl('telegram', data.telegram_channel);
  const instagram_handle = sanitizeSocialUrl('instagram', data.instagram_handle);
  const whatsapp_channel_url = sanitizeSocialUrl('whatsapp', data.whatsapp_channel_url);

  return {
    ...DEMO_ADMIN_SETTINGS,
    ...data,
    brand_name,
    logo_url,
    youtube_channel,
    telegram_channel,
    instagram_handle,
    whatsapp_channel_url,
  };
};

export const sanitizeAttemptForSupabase = (a: Attempt) => {
  return {
    id: isValidUUID(a.id) ? a.id : generateUUID(),
    test_id: isValidUUID(a.test_id) ? a.test_id : a.test_id,
    student_id: isValidUUID(a.student_id) ? a.student_id : generateUUID(),
    student_name: a.student_name || 'Candidate',
    student_mobile: a.student_mobile || '',
    student_email: a.student_email || null,
    student_state: a.student_state || 'Himachal Pradesh',
    student_district: a.student_district || 'General',
    start_time: a.start_time || new Date().toISOString(),
    end_time: a.end_time || (a.status === 'completed' || a.status === 'auto_submitted' ? new Date().toISOString() : null),
    submitted_at: a.submitted_at || (a.status === 'completed' || a.status === 'auto_submitted' ? new Date().toISOString() : null),
    status: a.status || 'in_progress',
    total_questions: parseSafeNumber(a.total_questions, 0),
    attempted_questions: parseSafeNumber(a.attempted_questions, 0),
    correct_answers: parseSafeNumber(a.correct_answers, 0),
    wrong_answers: parseSafeNumber(a.wrong_answers, 0),
    skipped_questions: parseSafeNumber(a.skipped_questions, 0),
    score: parseSafeNumber(a.score, 0),
    percentage: parseSafeNumber(a.percentage, 0),
    time_taken_seconds: parseSafeNumber(a.time_taken_seconds, 0),
    suspicious_activity_count: parseSafeNumber(a.suspicious_activity_count, 0),
    created_at: a.created_at || new Date().toISOString()
  };
};

export const dataService = {
  // ------------------------------------
  // ADMIN SETTINGS
  // ------------------------------------
  getSettings: async (): Promise<AdminSettings> => {
    let settings = { ...DEMO_ADMIN_SETTINGS };
    const supabase = getSupabaseClient();
    
    // Retrieve cached logo if user previously uploaded one
    let cachedLogo: string | null = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.logo_url && parsed.logo_url.trim() !== '' && parsed.logo_url !== '/logo.png' && parsed.logo_url !== '/logo.svg') {
          cachedLogo = parsed.logo_url;
        }
      }
    } catch {
      // ignore
    }

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('admin_settings')
          .select('*')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!error && data) {
          settings = sanitizeAdminSettings(data);
          
          // If Supabase returned a valid custom logo, use it
          if (data.logo_url && data.logo_url.trim() !== '' && data.logo_url !== '/logo.png' && data.logo_url !== '/logo.svg') {
            settings.logo_url = data.logo_url;
          } else if (cachedLogo) {
            // Preserve uploaded custom logo if remote had empty string
            settings.logo_url = cachedLogo;
            // Silently sync back to Supabase
            if (data.id) {
              (async () => {
                try {
                  await supabase.from('admin_settings').update({ logo_url: cachedLogo, updated_at: new Date().toISOString() }).eq('id', data.id);
                } catch {
                  // ignore
                }
              })();
            }
          }

          // If whatsapp_channel_url is empty in data, check social_platforms array or fallback
          if (!settings.whatsapp_channel_url && Array.isArray(data.social_platforms)) {
            const wa = data.social_platforms.find((p: any) => (p.platform_name || '').toLowerCase().includes('whatsapp') || p.icon === 'message-circle');
            if (wa && wa.platform_url) {
              settings.whatsapp_channel_url = sanitizeSocialUrl('whatsapp', wa.platform_url);
            }
          }
          
          // Also check social_platforms table in Supabase if any links were missing
          try {
            const { data: spRows } = await supabase.from('social_platforms').select('*');
            if (spRows && spRows.length > 0) {
              spRows.forEach((row: any) => {
                const name = (row.platform_name || '').toLowerCase();
                if ((name.includes('youtube') || row.icon === 'youtube') && row.platform_url && (!data.youtube_channel || data.youtube_channel.includes('gradeupstudy'))) {
                  settings.youtube_channel = sanitizeSocialUrl('youtube', row.platform_url);
                }
                if ((name.includes('telegram') || row.icon === 'send') && row.platform_url && (!data.telegram_channel || data.telegram_channel.includes('gradeupstudy'))) {
                  settings.telegram_channel = sanitizeSocialUrl('telegram', row.platform_url);
                }
                if ((name.includes('instagram') || row.icon === 'instagram') && row.platform_url && (!data.instagram_handle || data.instagram_handle.includes('gradeupstudy'))) {
                  settings.instagram_handle = sanitizeSocialUrl('instagram', row.platform_url);
                }
                if ((name.includes('whatsapp') || row.icon === 'message-circle') && row.platform_url && (!settings.whatsapp_channel_url || settings.whatsapp_channel_url.includes('gradeupstudy'))) {
                  settings.whatsapp_channel_url = sanitizeSocialUrl('whatsapp', row.platform_url);
                }
              });
            }
          } catch {
            // ignore
          }

          localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
          
          // If settings contains social_platforms, sync to local storage cache as well
          if (Array.isArray(data.social_platforms) && data.social_platforms.length > 0) {
            const sanitizedSP = data.social_platforms.map((p: any) => ({
              ...p,
              platform_url: sanitizeSocialUrl(p.platform_name || p.icon, p.platform_url)
            }));
            localStorage.setItem(STORAGE_KEYS.SOCIAL, JSON.stringify(sanitizedSP));
          }
        } else {
          // If no row in Supabase admin_settings yet, check localStorage
          const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
          if (raw) {
            try {
              settings = sanitizeAdminSettings(JSON.parse(raw));
            } catch {
              settings = { ...DEMO_ADMIN_SETTINGS };
            }
          }
        }
      } catch (err) {
        console.warn('Supabase fetch settings failed, using cache', err);
        const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
        if (raw) {
          try {
            settings = sanitizeAdminSettings(JSON.parse(raw));
          } catch {
            settings = { ...DEMO_ADMIN_SETTINGS };
          }
        }
      }
    } else {
      const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (raw) {
        try {
          settings = sanitizeAdminSettings(JSON.parse(raw));
        } catch {
          settings = { ...DEMO_ADMIN_SETTINGS };
        }
      }
    }

    settings = sanitizeAdminSettings(settings);

    // Clear out unsplash image URLs if present
    if (settings.logo_url && settings.logo_url.includes('unsplash.com')) {
      settings.logo_url = '/logo.svg';
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    }

    return settings;
  },

  uploadLogoFile: async (file: File | Blob): Promise<{ success: boolean; url: string; source: 'supabase_storage' | 'cloud_compressed' }> => {
    const supabase = getSupabaseClient();
    
    // 1. Try uploading binary directly to Supabase Storage Bucket
    if (isSupabaseConfigured() && supabase) {
      const possibleBuckets = ['logos', 'brand', 'assets', 'gradeup-assets', 'gradeup_assets', 'public', 'images'];
      const fileExt = file instanceof File ? file.name.split('.').pop() || 'png' : 'png';
      const fileName = `official_logo_${Date.now()}.${fileExt}`;
      const filePath = `brand/${fileName}`;

      for (const bucket of possibleBuckets) {
        try {
          const { data: uploadData, error: uploadErr } = await supabase.storage
            .from(bucket)
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: true,
              contentType: file.type || 'image/png'
            });

          if (!uploadErr && uploadData) {
            const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(filePath);
            if (publicData?.publicUrl) {
              const publicUrl = publicData.publicUrl;
              // Immediately write to Supabase admin_settings
              try {
                await supabase.from('admin_settings').update({ logo_url: publicUrl, updated_at: new Date().toISOString() }).neq('id', '00000000-0000-0000-0000-000000000000');
              } catch {
                // ignore
              }
              return { success: true, url: publicUrl, source: 'supabase_storage' };
            }
          }
        } catch {
          // continue checking other buckets
        }
      }
    }

    // 2. High-Fidelity Canvas compression for direct Cloud Database payload (Retina Sharp 400px max)
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const rawData = e.target?.result as string;
        const img = new Image();
        img.onload = async () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 400; // 400px gives crisp retina quality
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          let compressed = rawData;
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            compressed = canvas.toDataURL(file.type.includes('png') ? 'image/png' : 'image/jpeg', 0.92);
          }

          // Directly sync to Supabase admin_settings table
          if (isSupabaseConfigured() && supabase) {
            try {
              await supabase.from('admin_settings').update({ logo_url: compressed, updated_at: new Date().toISOString() }).neq('id', '00000000-0000-0000-0000-000000000000');
            } catch {
              // ignore
            }
          }

          resolve({ success: true, url: compressed, source: 'cloud_compressed' });
        };
        img.onerror = () => resolve({ success: true, url: rawData, source: 'cloud_compressed' });
        img.src = rawData;
      };
      reader.onerror = () => resolve({ success: false, url: '', source: 'cloud_compressed' });
      reader.readAsDataURL(file);
    });
  },

  updateSettings: async (newSettings: Partial<AdminSettings>): Promise<AdminSettings> => {
    const current = await dataService.getSettings();
    const updated: AdminSettings = sanitizeAdminSettings({
      ...current,
      ...newSettings,
      social_gate_title: newSettings.social_gate_title !== undefined ? newSettings.social_gate_title : (current.social_gate_title || DEMO_ADMIN_SETTINGS.social_gate_title),
      social_gate_description: newSettings.social_gate_description !== undefined ? newSettings.social_gate_description : (current.social_gate_description || DEMO_ADMIN_SETTINGS.social_gate_description),
      social_gate_enabled: newSettings.social_gate_enabled !== undefined ? newSettings.social_gate_enabled : (current.social_gate_enabled ?? true)
    });

    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));

    // 1. Sync & update social_platforms list
    const currentPlatforms = await dataService.getSocialPlatforms(true);
    const updatedPlatforms = currentPlatforms.map((p) => {
      const lowerName = (p.platform_name || '').toLowerCase();
      if (updated.youtube_channel && (lowerName.includes('youtube') || p.icon === 'youtube' || p.id === 'a1000000-0000-0000-0000-000000000001')) {
        return { ...p, platform_url: updated.youtube_channel };
      }
      if (updated.telegram_channel && (lowerName.includes('telegram') || p.icon === 'send' || p.id === 'a1000000-0000-0000-0000-000000000002')) {
        return { ...p, platform_url: updated.telegram_channel };
      }
      if (updated.instagram_handle && (lowerName.includes('instagram') || p.icon === 'instagram' || p.id === 'a1000000-0000-0000-0000-000000000003')) {
        return { ...p, platform_url: updated.instagram_handle };
      }
      if (updated.whatsapp_channel_url && (lowerName.includes('whatsapp') || p.icon === 'message-circle' || p.id === 'a1000000-0000-0000-0000-000000000004')) {
        return { ...p, platform_url: updated.whatsapp_channel_url };
      }
      return p;
    });

    updated.social_platforms = updatedPlatforms;
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
    localStorage.setItem(STORAGE_KEYS.SOCIAL, JSON.stringify(updatedPlatforms));

    // 2. Persist to Supabase Cloud Database (Global Single Source of Truth)
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      try {
        // Step A: Immediately & directly persist logo_url to Supabase admin_settings table
        if (updated.logo_url) {
          try {
            await supabase.from('admin_settings').update({
              logo_url: updated.logo_url,
              brand_name: updated.brand_name || 'Gradeup Study',
              updated_at: new Date().toISOString()
            }).neq('id', '00000000-0000-0000-0000-000000000000');
          } catch {
            // ignore
          }
        }

        const { data: existingRows } = await supabase.from('admin_settings').select('*');
        
        if (existingRows && existingRows.length > 0) {
          for (const row of existingRows) {
            const rowKeys = Object.keys(row);
            const dynamicPayload: Record<string, unknown> = {
              updated_at: new Date().toISOString()
            };

            // Dynamically assign ONLY columns present in Supabase admin_settings table!
            if (rowKeys.includes('logo_url')) dynamicPayload.logo_url = updated.logo_url;
            if (rowKeys.includes('app_name')) dynamicPayload.app_name = updated.brand_name || 'Gradeup Study';
            if (rowKeys.includes('brand_name')) dynamicPayload.brand_name = updated.brand_name || 'Gradeup Study';
            if (rowKeys.includes('app_subtitle')) dynamicPayload.app_subtitle = 'Free Online Mock Test Portal';
            if (rowKeys.includes('website_url')) dynamicPayload.website_url = updated.website_url;
            if (rowKeys.includes('support_email')) dynamicPayload.support_email = updated.support_email;
            if (rowKeys.includes('whatsapp_number')) dynamicPayload.whatsapp_number = updated.whatsapp_number;
            if (rowKeys.includes('whatsapp_channel_url')) dynamicPayload.whatsapp_channel_url = updated.whatsapp_channel_url;
            if (rowKeys.includes('telegram_channel')) dynamicPayload.telegram_channel = updated.telegram_channel;
            if (rowKeys.includes('youtube_channel')) dynamicPayload.youtube_channel = updated.youtube_channel;
            if (rowKeys.includes('instagram_handle')) dynamicPayload.instagram_handle = updated.instagram_handle;
            if (rowKeys.includes('default_test_duration')) dynamicPayload.default_test_duration = parseSafeNumber(updated.default_test_duration, 90);
            if (rowKeys.includes('default_marks')) dynamicPayload.default_marks = parseSafeNumber(updated.default_marks, 1.0);
            if (rowKeys.includes('default_negative_marking')) dynamicPayload.default_negative_marking = parseSafeNumber(updated.default_negative_marking, 0.25);
            if (rowKeys.includes('mask_leaderboard_names')) dynamicPayload.mask_leaderboard_names = updated.mask_leaderboard_names ?? true;
            if (rowKeys.includes('social_gate_enabled')) dynamicPayload.social_gate_enabled = updated.social_gate_enabled ?? true;
            if (rowKeys.includes('enable_social_gate')) dynamicPayload.enable_social_gate = updated.social_gate_enabled ?? true;
            if (rowKeys.includes('enable_leaderboard')) dynamicPayload.enable_leaderboard = !updated.mask_leaderboard_names;
            if (rowKeys.includes('social_gate_title')) dynamicPayload.social_gate_title = updated.social_gate_title;
            if (rowKeys.includes('social_gate_description')) dynamicPayload.social_gate_description = updated.social_gate_description;
            if (rowKeys.includes('social_platforms')) dynamicPayload.social_platforms = updatedPlatforms;
            if (rowKeys.includes('admin_email') && updated.admin_email) dynamicPayload.admin_email = updated.admin_email;
            if (rowKeys.includes('admin_password') && updated.admin_password) dynamicPayload.admin_password = updated.admin_password;

            const { error: updErr } = await supabase.from('admin_settings').update(dynamicPayload).eq('id', row.id);
            if (updErr) {
              console.warn('Dynamic update failed, fallback atomic logo commit:', updErr);
              await supabase.from('admin_settings').update({
                logo_url: updated.logo_url,
                updated_at: new Date().toISOString()
              }).eq('id', row.id);
            }
          }
        } else {
          // If no row exists, insert initial row with standard columns
          const initialPayload: Record<string, unknown> = {
            app_name: updated.brand_name || 'Gradeup Study',
            logo_url: updated.logo_url || '',
            admin_email: updated.admin_email || 'admin@gradeupstudy.com',
            show_watermark: true,
            anti_cheating_warning_limit: 3,
            max_test_duration_minutes: 180,
            enable_social_gate: true,
            enable_leaderboard: true,
            enable_student_login: false,
            updated_at: new Date().toISOString()
          };
          await supabase.from('admin_settings').insert(initialPayload);
        }

        // 3. Direct dual-sync to Supabase `social_platforms` table for all 4 official channels
        const officialPlatformDefs = [
          {
            id: 'a1000000-0000-0000-0000-000000000001',
            platform_name: 'YouTube',
            platform_url: updated.youtube_channel || 'https://youtube.com/@gradeupstudy',
            icon: 'youtube',
            button_text: 'Subscribe on YouTube',
            verification_method: 'redirect_only',
            is_required: true,
            is_active: true,
            order_index: 1
          },
          {
            id: 'a1000000-0000-0000-0000-000000000002',
            platform_name: 'Telegram Channel',
            platform_url: updated.telegram_channel || 'https://t.me/gradeupstudyofficial',
            icon: 'send',
            button_text: 'Join Telegram Channel',
            verification_method: 'redirect_only',
            is_required: true,
            is_active: true,
            order_index: 2
          },
          {
            id: 'a1000000-0000-0000-0000-000000000003',
            platform_name: 'Instagram',
            platform_url: updated.instagram_handle || 'https://instagram.com/gradeupstudy.official',
            icon: 'instagram',
            button_text: 'Follow on Instagram',
            verification_method: 'redirect_only',
            is_required: false,
            is_active: true,
            order_index: 3
          },
          {
            id: 'a1000000-0000-0000-0000-000000000004',
            platform_name: 'WhatsApp Channel',
            platform_url: updated.whatsapp_channel_url || 'https://whatsapp.com/channel/gradeupstudy',
            icon: 'message-circle',
            button_text: 'Join WhatsApp Channel',
            verification_method: 'redirect_only',
            is_required: true,
            is_active: true,
            order_index: 4
          }
        ];

        for (const def of officialPlatformDefs) {
          try {
            await supabase.from('social_platforms').upsert(def);
            await supabase
              .from('social_platforms')
              .update({ platform_url: def.platform_url })
              .ilike('platform_name', `%${def.platform_name}%`);
          } catch (e) {
            console.warn(`Supabase sync for platform ${def.platform_name} error:`, e);
          }
        }

        // Also sync global social gate updates to all tests that use global social gate
        if (newSettings.social_gate_title || newSettings.social_gate_description) {
          try {
            await supabase
              .from('tests')
              .update({
                social_gate_title: updated.social_gate_title,
                social_gate_description: updated.social_gate_description,
                updated_at: new Date().toISOString()
              })
              .or('social_gate_mode.eq.global,social_gate_mode.is.null');
          } catch (syncErr) {
            console.warn('Syncing tests social gate header in Supabase:', syncErr);
          }
        }
      } catch (e) {
        console.error('Failed to update settings in Supabase', e);
      }
    }

    // Broadcast update events so all components (Footer, Header, SocialGate, AdminSettingsView, SocialGateManager) instantly reflect the new links
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('gradeup_settings_updated', { detail: updated }));
        window.dispatchEvent(new CustomEvent('gradeup_social_updated', { detail: updatedPlatforms }));
      }
    } catch {
      // ignore
    }

    return updated;
  },

  // ------------------------------------
  // TESTS MANAGEMENT
  // ------------------------------------
  getTests: async (includeUnpublished = true): Promise<Test[]> => {
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      try {
        let query = supabase.from('tests').select('*').order('created_at', { ascending: false });
        if (!includeUnpublished) {
          query = query.eq('is_published', true).eq('status', 'published');
        }
        const { data, error } = await query;
        if (!error && Array.isArray(data)) {
          const remoteTests = data as Test[];
          localStorage.setItem(STORAGE_KEYS.TESTS, JSON.stringify(remoteTests));
          if (!includeUnpublished) {
            return remoteTests.filter(t => t.is_published && (t.status === 'published' || !t.status));
          }
          return remoteTests;
        }
      } catch (e) {
        console.warn('Supabase fetch tests error, using local cache', e);
      }
    }

    // Offline / Local cache fallback
    const rawLocal = localStorage.getItem(STORAGE_KEYS.TESTS);
    let localTests: Test[] = [];
    try {
      localTests = rawLocal ? JSON.parse(rawLocal) : [];
      if (!Array.isArray(localTests)) localTests = [];
    } catch {
      localTests = [];
    }

    if (!includeUnpublished) {
      return localTests.filter(t => t.is_published && (t.status === 'published' || !t.status));
    }
    return localTests;
  },

  getTestBySlugOrId: async (identifier: string): Promise<Test | null> => {
    if (!identifier) return null;
    let cleanId = identifier.trim();
    try {
      cleanId = decodeURIComponent(cleanId);
    } catch {
      // keep cleanId
    }

    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      try {
        const isUUID = isValidUUID(cleanId);
        let query = supabase.from('tests').select('*');
        if (isUUID) {
          query = query.or(`slug.ilike.${cleanId},test_code.ilike.${cleanId},id.eq.${cleanId}`);
        } else {
          query = query.or(`slug.ilike.${cleanId},test_code.ilike.${cleanId}`);
        }
        const { data } = await query.limit(1).maybeSingle();
        if (data) {
          const testData = data as Test;
          const localTests = await dataService.getTests(true);
          const idx = localTests.findIndex(t => t.id === testData.id);
          if (idx >= 0) localTests[idx] = testData;
          else localTests.unshift(testData);
          localStorage.setItem(STORAGE_KEYS.TESTS, JSON.stringify(localTests));
          return testData;
        }
      } catch (e) {
        console.warn('Supabase getTestBySlugOrId lookup failed', e);
      }
    }

    const tests = await dataService.getTests(true);
    if (!tests || tests.length === 0) return null;

    const lowerId = cleanId.toLowerCase();
    const found = tests.find(t => 
      (t.slug && t.slug.toLowerCase() === lowerId) ||
      (t.id && t.id.toLowerCase() === lowerId) ||
      (t.test_code && t.test_code.toLowerCase() === lowerId)
    );
    if (found) return found;

    const partialMatch = tests.find(t =>
      (t.slug && (lowerId.includes(t.slug.toLowerCase()) || t.slug.toLowerCase().includes(lowerId))) ||
      (t.test_code && (lowerId.includes(t.test_code.toLowerCase()) || t.test_code.toLowerCase().includes(lowerId)))
    );
    if (partialMatch) return partialMatch;

    return tests[0];
  },

  getPublicShareableUrl: (slugOrCode: string): string => {
    let origin = window.location.origin;
    if (origin.includes('-dev-')) {
      origin = origin.replace('-dev-', '-pre-');
    }
    const clean = encodeURIComponent(slugOrCode || 'demo');
    return `${origin}/?t=${clean}`;
  },

  getTestById: async (testId: string): Promise<Test | null> => {
    return dataService.getTestBySlugOrId(testId);
  },

  saveTest: async (test: Test): Promise<Test> => {
    const validId = isValidUUID(test.id) ? test.id : generateUUID();
    const status: TestStatus = test.status || (test.is_published ? 'published' : 'draft');
    const isPublished = status === 'published' || test.is_published === true;
    const totalQuestions = parseSafeNumber(test.total_questions, 0);
    const marksPerQuestion = parseSafeNumber(test.marks_per_question, 1);
    const totalMarks = parseSafeNumber(test.total_marks, totalQuestions * marksPerQuestion);
    const negativeMark = parseSafeNumber(test.negative_marking, 0.25);
    const duration = parseSafeNumber(test.duration_minutes, 15);
    const passingMarks = parseSafeNumber(test.passing_marks, totalMarks * 0.4);

    let cleanSlug = (test.slug || test.title || `test-${Date.now()}`)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
    if (!cleanSlug) cleanSlug = `test-${Date.now()}`;

    const cleanCode = (test.test_code || `TEST-${Math.floor(1000 + Math.random() * 9000)}`).trim().toUpperCase();

    const sanitizedTest: Test = {
      ...test,
      id: validId,
      slug: cleanSlug,
      test_code: cleanCode,
      category: test.category || 'Police Exam',
      subject: test.subject || 'General Paper',
      total_questions: totalQuestions,
      marks_per_question: marksPerQuestion,
      total_marks: totalMarks,
      negative_marking: negativeMark,
      duration_minutes: duration,
      passing_marks: passingMarks,
      status,
      is_published: isPublished,
      created_at: test.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // 1. Immediately store in local cache so UI displays it immediately with zero delay
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.TESTS);
      let localTests: Test[] = raw ? JSON.parse(raw) : DEMO_TESTS;
      if (!Array.isArray(localTests)) localTests = DEMO_TESTS;
      const idx = localTests.findIndex(t => t.id === sanitizedTest.id);
      if (idx >= 0) {
        localTests[idx] = sanitizedTest;
      } else {
        localTests.unshift(sanitizedTest);
      }
      localStorage.setItem(STORAGE_KEYS.TESTS, JSON.stringify(localTests));
      window.dispatchEvent(new CustomEvent('gradeup_tests_updated', { detail: sanitizedTest }));
    } catch (e) {
      console.warn('Local test cache save error', e);
    }

    // 2. Persist to Supabase if available with progressive fallback & error recovery
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      try {
        const fullPayload = {
          id: sanitizedTest.id,
          test_code: sanitizedTest.test_code,
          title: sanitizedTest.title,
          slug: sanitizedTest.slug,
          description: sanitizedTest.description || '',
          category: sanitizedTest.category || 'Competitive Exam',
          subject: sanitizedTest.subject || 'General Paper',
          total_questions: sanitizedTest.total_questions,
          total_marks: sanitizedTest.total_marks,
          marks_per_question: sanitizedTest.marks_per_question,
          negative_marking: sanitizedTest.negative_marking,
          duration_minutes: sanitizedTest.duration_minutes,
          passing_marks: sanitizedTest.passing_marks,
          instructions: sanitizedTest.instructions || '',
          status: sanitizedTest.status,
          is_published: sanitizedTest.is_published,
          social_gate_enabled: sanitizedTest.social_gate_enabled ?? true,
          social_gate_mode: sanitizedTest.social_gate_mode || 'global',
          social_platform_ids: sanitizedTest.social_platform_ids || [],
          custom_social_platforms: sanitizedTest.custom_social_platforms || [],
          social_gate_title: sanitizedTest.social_gate_title || '',
          social_gate_description: sanitizedTest.social_gate_description || '',
          anti_cheating_enabled: sanitizedTest.anti_cheating_enabled ?? true,
          randomize_questions: sanitizedTest.randomize_questions ?? false,
          randomize_options: sanitizedTest.randomize_options ?? false,
          allow_back_navigation: sanitizedTest.allow_back_navigation ?? true,
          allow_mark_for_review: sanitizedTest.allow_mark_for_review ?? true,
          show_result_immediately: sanitizedTest.show_result_immediately ?? true,
          show_correct_answers: sanitizedTest.show_correct_answers ?? true,
          show_explanation: sanitizedTest.show_explanation ?? true,
          enable_leaderboard: sanitizedTest.enable_leaderboard ?? true,
          max_attempts_per_student: parseSafeNumber(sanitizedTest.max_attempts_per_student, 1),
          start_time: sanitizedTest.start_time || null,
          end_time: sanitizedTest.end_time || null,
          created_at: sanitizedTest.created_at,
          updated_at: sanitizedTest.updated_at
        };

        let { data, error } = await supabase.from('tests').upsert(fullPayload, { onConflict: 'id' }).select().single();

        // If error due to missing table columns or constraint, attempt retry with core payload
        if (error) {
          console.warn('Supabase full upsert error, attempting core payload fallback:', error.message);
          
          // Core schema payload that matches standard columns in all Supabase setups
          const corePayload = {
            id: sanitizedTest.id,
            test_code: sanitizedTest.test_code,
            title: sanitizedTest.title,
            slug: sanitizedTest.slug,
            description: sanitizedTest.description || '',
            category: sanitizedTest.category || 'Competitive Exam',
            subject: sanitizedTest.subject || 'General Paper',
            total_questions: sanitizedTest.total_questions,
            total_marks: sanitizedTest.total_marks,
            marks_per_question: sanitizedTest.marks_per_question,
            negative_marking: sanitizedTest.negative_marking,
            duration_minutes: sanitizedTest.duration_minutes,
            passing_marks: sanitizedTest.passing_marks,
            instructions: sanitizedTest.instructions || '',
            status: sanitizedTest.status,
            is_published: sanitizedTest.is_published,
            created_at: sanitizedTest.created_at,
            updated_at: sanitizedTest.updated_at
          };

          // If duplicate key error on slug/code, make slug/code unique
          if (error.code === '23505' || error.message.toLowerCase().includes('duplicate') || error.message.toLowerCase().includes('unique')) {
            const randSuffix = Math.floor(100 + Math.random() * 900);
            corePayload.slug = `${sanitizedTest.slug}-${randSuffix}`;
            corePayload.test_code = `${sanitizedTest.test_code}-${randSuffix}`;
            sanitizedTest.slug = corePayload.slug;
            sanitizedTest.test_code = corePayload.test_code;
          }

          const coreResult = await supabase.from('tests').upsert(corePayload, { onConflict: 'id' }).select().single();
          if (!coreResult.error && coreResult.data) {
            data = coreResult.data;
            error = null;
          } else {
            console.error('Supabase core test save fallback also failed:', coreResult.error);
          }
        }

        if (data) {
          const remoteTest = data as Test;
          // Merge remote with sanitized
          const finalizedTest = { ...sanitizedTest, ...remoteTest };
          const raw = localStorage.getItem(STORAGE_KEYS.TESTS);
          let localTests: Test[] = raw ? JSON.parse(raw) : [];
          const idx = localTests.findIndex(t => t.id === finalizedTest.id);
          if (idx >= 0) localTests[idx] = finalizedTest;
          else localTests.unshift(finalizedTest);
          localStorage.setItem(STORAGE_KEYS.TESTS, JSON.stringify(localTests));
          return finalizedTest;
        }
      } catch (e) {
        console.error('Supabase test save exception', e);
      }
    }

    return sanitizedTest;
  },

  deleteTest: async (testId: string): Promise<boolean> => {
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      try {
        if (isValidUUID(testId)) {
          // 1. Delete questions for this test
          await supabase.from('questions').delete().eq('test_id', testId);
          
          // 2. Delete answers for attempts belonging to this test
          const { data: atts } = await supabase.from('attempts').select('id').eq('test_id', testId);
          if (atts && atts.length > 0) {
            const attIds = atts.map((a: any) => a.id);
            await supabase.from('answers').delete().in('attempt_id', attIds);
          }

          // 3. Delete attempts belonging to this test
          await supabase.from('attempts').delete().eq('test_id', testId);

          // 4. Delete the test row itself
          await supabase.from('tests').delete().eq('id', testId);
        }
      } catch (e) {
        console.error('Supabase test delete error', e);
      }
    }

    // Purge test from local cache
    const raw = localStorage.getItem(STORAGE_KEYS.TESTS);
    let tests: Test[] = [];
    try {
      tests = raw ? JSON.parse(raw) : [];
    } catch {}
    const filtered = tests.filter(t => t.id !== testId && t.slug !== testId && t.test_code !== testId);
    localStorage.setItem(STORAGE_KEYS.TESTS, JSON.stringify(filtered));

    // Purge questions from local cache
    const qRaw = localStorage.getItem(STORAGE_KEYS.QUESTIONS);
    if (qRaw) {
      try {
        const qMap = JSON.parse(qRaw);
        delete qMap[testId];
        localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(qMap));
      } catch {}
    }

    // Purge attempts from local cache
    const aRaw = localStorage.getItem(STORAGE_KEYS.ATTEMPTS);
    if (aRaw) {
      try {
        const attList: Attempt[] = JSON.parse(aRaw);
        const filteredAtts = attList.filter(a => a.test_id !== testId);
        localStorage.setItem(STORAGE_KEYS.ATTEMPTS, JSON.stringify(filteredAtts));
      } catch {}
    }

    window.dispatchEvent(new CustomEvent('gradeup_tests_updated'));
    return true;
  },

  duplicateTest: async (testId: string): Promise<Test | null> => {
    const original = await dataService.getTestBySlugOrId(testId);
    if (!original) return null;

    const newId = generateUUID();
    const newCode = original.test_code + '-COPY';
    const newTitle = original.title + ' (Copy)';
    const newSlug = original.slug + '-copy-' + Math.floor(Math.random() * 1000);

    const duplicated: Test = {
      ...original,
      id: newId,
      test_code: newCode,
      title: newTitle,
      slug: newSlug,
      status: 'published',
      is_published: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await dataService.saveTest(duplicated);

    const questions = await dataService.getQuestions(testId, true);
    if (questions.length > 0) {
      const duplicatedQuestions = questions.map((q, idx) => ({
        ...q,
        id: generateUUID(),
        test_id: newId,
        question_number: idx + 1
      }));
      await dataService.saveQuestions(newId, duplicatedQuestions);
    }

    return duplicated;
  },

  // ------------------------------------
  // QUESTIONS MANAGEMENT (SECURE)
  // ------------------------------------

  // For Students: Uses public RPC to omit correct_answer and explanation before submission!
  getPublicQuestions: async (testId: string): Promise<Question[]> => {
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase && isValidUUID(testId)) {
      try {
        const { data, error } = await supabase.rpc('get_public_test_questions', { p_test_id: testId });
        if (!error && data && data.length > 0) {
          return data.map((q: any) => ({
            ...q,
            correct_answer: undefined, // Hide correct answer from client memory
            explanation: undefined
          }));
        }
      } catch (e) {
        console.warn('RPC get_public_test_questions fallback to table query', e);
      }
    }
    // Fallback if RPC fails or local storage
    const allQ = await dataService.getQuestions(testId, false);
    return allQ.map(q => ({
      ...q,
      correct_answer: undefined,
      explanation: undefined
    }));
  },

  // For Admin / Results: Fetch full question dataset
  getQuestions: async (testId: string, includeAnswers = true): Promise<Question[]> => {
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase && isValidUUID(testId)) {
      try {
        const { data, error } = await supabase
          .from('questions')
          .select('*')
          .eq('test_id', testId)
          .order('question_number', { ascending: true });
        if (!error && Array.isArray(data)) {
          // Update local cache for this test
          const raw = localStorage.getItem(STORAGE_KEYS.QUESTIONS);
          let questionsMap: Record<string, Question[]> = {};
          try {
            questionsMap = raw ? JSON.parse(raw) : {};
          } catch {}
          questionsMap[testId] = data as Question[];
          localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(questionsMap));

          if (!includeAnswers) {
            return (data as Question[]).map(q => ({ ...q, correct_answer: undefined, explanation: undefined }));
          }
          return data as Question[];
        }
      } catch (e) {
        console.warn('Supabase questions fetch error', e);
      }
    }

    const raw = localStorage.getItem(STORAGE_KEYS.QUESTIONS);
    let questionsMap: Record<string, Question[]> = {};
    try {
      questionsMap = raw ? JSON.parse(raw) : {};
    } catch {}
    const questions = questionsMap[testId] || [];
    if (!includeAnswers) {
      return questions.map(q => ({ ...q, correct_answer: undefined, explanation: undefined }));
    }
    return questions;
  },

  saveQuestions: async (testId: string, questions: Question[]): Promise<void> => {
    let targetTestId = testId;
    if (!isValidUUID(targetTestId)) {
      const foundTest = await dataService.getTestBySlugOrId(testId);
      if (foundTest && isValidUUID(foundTest.id)) {
        targetTestId = foundTest.id;
      } else {
        targetTestId = generateUUID();
      }
    }
    const sanitizedQuestions = questions.map((q, idx) => {
      const qId = isValidUUID(q.id) ? q.id : generateUUID();
      const ans = (q.correct_answer || 'A').toString().toUpperCase().trim().slice(0, 1);
      const validAns = ['A', 'B', 'C', 'D'].includes(ans) ? ans : 'A';
      return {
        id: qId,
        test_id: targetTestId,
        question_number: Number(q.question_number) || (idx + 1),
        question_text: q.question_text || '',
        question_image: q.question_image || null,
        option_a: q.option_a || '',
        option_b: q.option_b || '',
        option_c: q.option_c || '',
        option_d: q.option_d || '',
        correct_answer: validAns,
        explanation: q.explanation || null,
        marks: parseSafeNumber(q.marks, 1),
        negative_marks: parseSafeNumber(q.negative_marks, 0.25),
        subject: q.subject || 'General Studies',
        chapter: q.chapter || 'General',
        created_at: q.created_at || new Date().toISOString()
      };
    });

    // 1. Ensure test metadata exists and update totals
    const test = await dataService.getTestBySlugOrId(targetTestId);
    if (test) {
      const updatedTest: Test = {
        ...test,
        total_questions: sanitizedQuestions.length,
        total_marks: sanitizedQuestions.reduce((sum, q) => sum + (Number(q.marks) || 1), 0)
      };
      await dataService.saveTest(updatedTest);
    }

    // 2. Persist questions in Supabase
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase && isValidUUID(targetTestId)) {
      try {
        await supabase.from('questions').delete().eq('test_id', targetTestId);
        if (sanitizedQuestions.length > 0) {
          const { error } = await supabase.from('questions').insert(sanitizedQuestions);
          if (error) {
            console.error('Supabase save questions error:', error);
          }
        }
      } catch (e) {
        console.error('Supabase save questions exception', e);
      }
    }

    // 3. Update local cache
    const raw = localStorage.getItem(STORAGE_KEYS.QUESTIONS);
    let questionsMap: Record<string, Question[]> = {};
    try {
      questionsMap = raw ? JSON.parse(raw) : {};
    } catch {}
    questionsMap[targetTestId] = sanitizedQuestions as unknown as Question[];
    localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(questionsMap));
  },

  saveQuestion: async (testId: string, question: Question): Promise<Question> => {
    const questions = await dataService.getQuestions(testId, true);
    const validQId = isValidUUID(question.id) ? question.id : generateUUID();
    const cleanQuestion: Question = {
      ...question,
      id: validQId,
      test_id: testId
    };

    const index = questions.findIndex(q => q.id === cleanQuestion.id);
    if (index >= 0) {
      questions[index] = cleanQuestion;
    } else {
      questions.push(cleanQuestion);
    }
    questions.sort((a, b) => a.question_number - b.question_number);
    await dataService.saveQuestions(testId, questions);
    return cleanQuestion;
  },

  deleteQuestion: async (testId: string, questionId: string): Promise<void> => {
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase && isValidUUID(questionId)) {
      try {
        await supabase.from('questions').delete().eq('id', questionId);
      } catch (e) {
        console.error('Supabase deleteQuestion error:', e);
      }
    }

    const questions = await dataService.getQuestions(testId, true);
    const filtered = questions.filter(q => q.id !== questionId);
    const reindexed = filtered.map((q, idx) => ({ ...q, question_number: idx + 1 }));
    await dataService.saveQuestions(testId, reindexed);
  },

  // ------------------------------------
  // QUESTION BANK MASTER SYSTEM
  // ------------------------------------
  getAllQuestionBank: async (): Promise<Question[]> => {
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('questions')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && Array.isArray(data)) return data as Question[];
      } catch (e) {
        console.warn('Supabase all questions fetch error', e);
      }
    }

    const raw = localStorage.getItem(STORAGE_KEYS.QUESTIONS);
    let questionsMap: Record<string, Question[]> = {};
    try {
      questionsMap = raw ? JSON.parse(raw) : {};
    } catch {}
    
    const allList: Question[] = [];
    const seenIds = new Set<string>();

    Object.entries(questionsMap).forEach(([_, qList]) => {
      if (Array.isArray(qList)) {
        qList.forEach(q => {
          if (q && q.id && !seenIds.has(q.id)) {
            seenIds.add(q.id);
            allList.push(q);
          }
        });
      }
    });

    return allList;
  },

  saveQuestionToBank: async (question: Question): Promise<Question> => {
    const testId = question.test_id || 'bank';
    const saved = await dataService.saveQuestion(testId, question);
    return saved;
  },

  deleteQuestionFromBank: async (questionId: string): Promise<void> => {
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase && isValidUUID(questionId)) {
      try {
        await supabase.from('questions').delete().eq('id', questionId);
      } catch (e) {
        console.error('Supabase deleteQuestionFromBank error:', e);
      }
    }

    const raw = localStorage.getItem(STORAGE_KEYS.QUESTIONS);
    let questionsMap: Record<string, Question[]> = {};
    try {
      questionsMap = raw ? JSON.parse(raw) : {};
    } catch {}

    let targetTestId = 'bank';
    Object.entries(questionsMap).forEach(([tId, list]) => {
      if (Array.isArray(list) && list.some(q => q.id === questionId)) {
        targetTestId = tId;
      }
    });

    await dataService.deleteQuestion(targetTestId, questionId);
  },

  createTestFromQuestions: async (
    testMeta: Partial<Test>,
    selectedQuestions: Question[]
  ): Promise<Test> => {
    const newId = generateUUID();
    const cleanTitle = testMeta.title || 'Custom Mock Test';
    const cleanSlug = (testMeta.slug || cleanTitle)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') + '-' + Math.floor(Math.random() * 1000);

    const distinctSections = Array.from(
      new Set(selectedQuestions.map(q => q.section).filter(Boolean))
    ) as string[];

    const distinctSubjects = Array.from(
      new Set(selectedQuestions.map(q => q.subject).filter(Boolean))
    );

    const totalMarks = selectedQuestions.reduce(
      (acc, q) => acc + (Number(q.marks) || Number(testMeta.marks_per_question) || 1),
      0
    );

    const newTest: Test = {
      id: newId,
      test_code: testMeta.test_code || 'TEST-' + Math.floor(1000 + Math.random() * 9000),
      title: cleanTitle,
      slug: cleanSlug,
      description: testMeta.description || `Generated from Question Bank (${selectedQuestions.length} Questions)`,
      category: testMeta.category || 'General',
      subject: distinctSubjects.length === 1 ? distinctSubjects[0] : 'Multi-Subject',
      total_questions: selectedQuestions.length,
      total_marks: totalMarks,
      marks_per_question: Number(testMeta.marks_per_question) || 1,
      negative_marking: Number(testMeta.negative_marking) || 0.25,
      duration_minutes: Number(testMeta.duration_minutes) || Math.max(15, selectedQuestions.length),
      passing_marks: Number(testMeta.passing_marks) || Math.round(totalMarks * 0.4),
      instructions: testMeta.instructions || '1. Read all questions carefully.\n2. Negative marking applies.\n3. Do not refresh the page during test.',
      status: 'published',
      is_published: true,
      is_multisection: distinctSections.length > 1,
      sections: distinctSections.length > 0 ? distinctSections : ['General'],
      social_gate_enabled: testMeta.social_gate_enabled ?? true,
      anti_cheating_enabled: testMeta.anti_cheating_enabled ?? true,
      randomize_questions: testMeta.randomize_questions ?? false,
      randomize_options: testMeta.randomize_options ?? false,
      allow_back_navigation: testMeta.allow_back_navigation ?? true,
      allow_mark_for_review: testMeta.allow_mark_for_review ?? true,
      show_result_immediately: testMeta.show_result_immediately ?? true,
      show_correct_answers: testMeta.show_correct_answers ?? true,
      show_explanation: testMeta.show_explanation ?? true,
      enable_leaderboard: testMeta.enable_leaderboard ?? true,
      max_attempts_per_student: testMeta.max_attempts_per_student ?? 3,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await dataService.saveTest(newTest);

    // Clone and map questions into new test with valid UUIDs
    const testQuestions: Question[] = selectedQuestions.map((q, idx) => ({
      ...q,
      id: generateUUID(),
      test_id: newId,
      question_number: idx + 1,
    }));

    await dataService.saveQuestions(newId, testQuestions);
    return newTest;
  },

  addQuestionsToExistingTest: async (
    targetTestId: string,
    selectedQuestions: Question[]
  ): Promise<void> => {
    const existing = await dataService.getQuestions(targetTestId, true);
    let startNum = existing.length + 1;

    const cloned: Question[] = selectedQuestions.map(q => ({
      ...q,
      id: generateUUID(),
      test_id: targetTestId,
      question_number: startNum++,
    }));

    const combined = [...existing, ...cloned];
    await dataService.saveQuestions(targetTestId, combined);
  },

  // ------------------------------------
  // SOCIAL PLATFORMS
  // ------------------------------------
  getSocialPlatforms: async (includeInactive = true): Promise<SocialPlatform[]> => {
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      // 1. Try checking admin_settings first (authoritative admin configuration row)
      try {
        const { data: settingsData, error: settingsError } = await supabase
          .from('admin_settings')
          .select('social_platforms')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!settingsError && settingsData && Array.isArray(settingsData.social_platforms) && settingsData.social_platforms.length > 0) {
          const platforms: SocialPlatform[] = settingsData.social_platforms.map((p: any, idx: number) => ({
            id: normalizePlatformId(p.id, p.platform_name),
            platform_name: p.platform_name || 'Community Channel',
            platform_url: sanitizeSocialUrl(p.platform_name || p.icon, p.platform_url || ''),
            icon: p.icon || 'share2',
            button_text: p.button_text || 'Join Channel',
            verification_method: p.verification_method || 'redirect_only',
            is_required: p.is_required !== undefined ? Boolean(p.is_required) : true,
            is_active: p.is_active !== undefined ? Boolean(p.is_active) : true,
            order_index: p.order_index !== undefined ? p.order_index : idx + 1
          }));

          localStorage.setItem(STORAGE_KEYS.SOCIAL, JSON.stringify(platforms));
          if (!includeInactive) {
            return platforms.filter((p) => p.is_active === true);
          }
          return platforms;
        }
      } catch (e) {
        console.warn('Supabase admin_settings social_platforms fetch error', e);
      }

      // 2. Try fetching from social_platforms table
      try {
        let query = supabase
          .from('social_platforms')
          .select('*')
          .order('order_index', { ascending: true })
          .order('created_at', { ascending: true });

        if (!includeInactive) {
          query = query.eq('is_active', true);
        }

        const { data, error } = await query;
          
        if (!error && data && data.length > 0) {
          const seen = new Map<string, SocialPlatform>();
          (data as SocialPlatform[]).forEach((item, idx) => {
            const key = (item.platform_name || '').toLowerCase().trim();
            const normalizedId = normalizePlatformId(item.id, item.platform_name);
            const isItemActive = item.is_active !== undefined ? Boolean(item.is_active) : true;
            seen.set(key || normalizedId, {
              ...item,
              id: normalizedId,
              platform_url: sanitizeSocialUrl(item.platform_name || item.icon, item.platform_url),
              is_active: isItemActive,
              order_index: item.order_index !== undefined ? item.order_index : idx + 1
            });
          });
          const deduplicated = Array.from(seen.values());
          localStorage.setItem(STORAGE_KEYS.SOCIAL, JSON.stringify(deduplicated));
          if (!includeInactive) {
            return deduplicated.filter((p) => p.is_active === true);
          }
          return deduplicated;
        }
      } catch (e) {
        console.warn('Supabase social platforms table fetch error', e);
      }
    }

    const raw = localStorage.getItem(STORAGE_KEYS.SOCIAL);
    const platforms: SocialPlatform[] = raw ? JSON.parse(raw) : DEMO_SOCIAL_PLATFORMS;
    
    // Check if admin settings has newer custom links
    let adminCustomLinks: Partial<AdminSettings> | null = null;
    const rawSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (rawSettings) {
      try {
        adminCustomLinks = JSON.parse(rawSettings);
      } catch {
        // ignore
      }
    }

    const normalized = platforms.map((p, idx) => {
      const lowerName = (p.platform_name || '').toLowerCase();
      let updatedUrl = sanitizeSocialUrl(p.platform_name || p.icon, p.platform_url);
      if (adminCustomLinks?.youtube_channel && (lowerName.includes('youtube') || p.icon === 'youtube')) {
        updatedUrl = sanitizeSocialUrl('youtube', adminCustomLinks.youtube_channel);
      }
      if (adminCustomLinks?.telegram_channel && (lowerName.includes('telegram') || p.icon === 'send')) {
        updatedUrl = sanitizeSocialUrl('telegram', adminCustomLinks.telegram_channel);
      }
      if (adminCustomLinks?.instagram_handle && (lowerName.includes('instagram') || p.icon === 'instagram')) {
        updatedUrl = sanitizeSocialUrl('instagram', adminCustomLinks.instagram_handle);
      }
      if (adminCustomLinks?.whatsapp_channel_url && (lowerName.includes('whatsapp') || p.icon === 'message-circle')) {
        updatedUrl = sanitizeSocialUrl('whatsapp', adminCustomLinks.whatsapp_channel_url);
      }

      return {
        ...p,
        platform_url: updatedUrl,
        id: normalizePlatformId(p.id, p.platform_name),
        is_active: p.is_active !== undefined ? Boolean(p.is_active) : true,
        order_index: p.order_index !== undefined ? p.order_index : idx + 1
      };
    });

    if (!includeInactive) {
      return normalized.filter((p) => p.is_active === true);
    }
    return normalized;
  },

  saveSocialPlatform: async (platform: SocialPlatform): Promise<SocialPlatform> => {
    const platforms = await dataService.getSocialPlatforms(true);
    const cleanId = normalizePlatformId(platform.id, platform.platform_name);
    const sanitizedPlatform: SocialPlatform = {
      ...platform,
      id: cleanId,
      platform_url: sanitizeSocialUrl(platform.platform_name || platform.icon, platform.platform_url),
      is_active: platform.is_active !== undefined ? Boolean(platform.is_active) : true,
      is_required: platform.is_required !== undefined ? Boolean(platform.is_required) : true,
      verification_method: platform.verification_method || 'redirect_only'
    };

    const idx = platforms.findIndex(p => 
      p.id === cleanId || 
      p.platform_name.toLowerCase().trim() === sanitizedPlatform.platform_name.toLowerCase().trim()
    );
    if (idx >= 0) {
      platforms[idx] = sanitizedPlatform;
    } else {
      platforms.push(sanitizedPlatform);
    }
    localStorage.setItem(STORAGE_KEYS.SOCIAL, JSON.stringify(platforms));

    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      try {
        // 1. Upsert into social_platforms table with standard ID
        await supabase.from('social_platforms').upsert({
          id: sanitizedPlatform.id,
          platform_name: sanitizedPlatform.platform_name,
          platform_url: sanitizedPlatform.platform_url,
          icon: sanitizedPlatform.icon || 'share2',
          button_text: sanitizedPlatform.button_text || 'Follow Us',
          verification_method: sanitizedPlatform.verification_method || 'redirect_only',
          is_required: sanitizedPlatform.is_required,
          is_active: sanitizedPlatform.is_active,
          order_index: sanitizedPlatform.order_index ?? 0
        });

        // 2. Update any existing legacy rows matching this platform_name
        try {
          await supabase
            .from('social_platforms')
            .update({
              is_active: sanitizedPlatform.is_active,
              is_required: sanitizedPlatform.is_required,
              platform_url: sanitizedPlatform.platform_url,
              button_text: sanitizedPlatform.button_text
            })
            .ilike('platform_name', `%${sanitizedPlatform.platform_name}%`);
        } catch {
          // ignore
        }
      } catch (e) {
        console.warn('Supabase save social platform table error:', e);
      }

      // 3. Update admin_settings.social_platforms array for instant cross-browser synchronization
      try {
        await dataService.updateSettings({ social_platforms: platforms });
      } catch (err) {
        console.error('Failed to sync social_platforms to admin_settings', err);
      }
    }
    return sanitizedPlatform;
  },

  saveSocialPlatformsBulk: async (platforms: SocialPlatform[]): Promise<SocialPlatform[]> => {
    const normalized = platforms.map((p, idx) => ({
      ...p,
      id: normalizePlatformId(p.id, p.platform_name),
      is_active: p.is_active !== undefined ? Boolean(p.is_active) : true,
      order_index: idx + 1
    }));
    localStorage.setItem(STORAGE_KEYS.SOCIAL, JSON.stringify(normalized));

    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      try {
        for (const p of normalized) {
          await supabase.from('social_platforms').upsert({
            id: p.id,
            platform_name: p.platform_name,
            platform_url: p.platform_url,
            icon: p.icon || 'share2',
            button_text: p.button_text || 'Follow Us',
            verification_method: p.verification_method || 'redirect_only',
            is_required: p.is_required ?? true,
            is_active: p.is_active,
            order_index: p.order_index ?? 0
          });

          // Also update by name to keep legacy rows synced
          await supabase
            .from('social_platforms')
            .update({ is_active: p.is_active, is_required: p.is_required })
            .ilike('platform_name', `%${p.platform_name}%`);
        }
      } catch (e) {
        console.warn('Bulk upsert social_platforms error:', e);
      }

      try {
        await dataService.updateSettings({ social_platforms: normalized });
      } catch (e) {
        console.error('Failed to bulk sync social platforms to admin_settings', e);
      }
    }
    return normalized;
  },

  toggleSocialPlatformActive: async (id: string, isActive: boolean): Promise<SocialPlatform | null> => {
    const platforms = await dataService.getSocialPlatforms(true);
    const cleanId = normalizePlatformId(id);
    const target = platforms.find(p => p.id === id || p.id === cleanId || normalizePlatformId(p.id, p.platform_name) === cleanId);
    if (!target) return null;
    
    const updatedList = platforms.map(p => {
      if (
        p.id === id || 
        p.id === cleanId || 
        normalizePlatformId(p.id, p.platform_name) === cleanId ||
        (target && p.platform_name.toLowerCase().trim() === target.platform_name.toLowerCase().trim())
      ) {
        return { ...p, id: cleanId, is_active: isActive };
      }
      return p;
    });

    localStorage.setItem(STORAGE_KEYS.SOCIAL, JSON.stringify(updatedList));

    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase
          .from('social_platforms')
          .update({ is_active: isActive })
          .eq('id', cleanId);

        await supabase
          .from('social_platforms')
          .update({ is_active: isActive })
          .eq('id', id);

        if (target.platform_name) {
          await supabase
            .from('social_platforms')
            .update({ is_active: isActive })
            .ilike('platform_name', `%${target.platform_name}%`);
        }
      } catch (e) {
        console.warn('Supabase toggle social platform error:', e);
      }

      try {
        await dataService.updateSettings({ social_platforms: updatedList });
      } catch (err) {
        console.error('Failed to sync to admin_settings:', err);
      }
    }

    return { ...target, id: cleanId, is_active: isActive };
  },

  deleteSocialPlatform: async (id: string): Promise<void> => {
    const platforms = await dataService.getSocialPlatforms(true);
    const cleanId = normalizePlatformId(id);
    const targetPlatform = platforms.find(p => p.id === id || p.id === cleanId || normalizePlatformId(p.id, p.platform_name) === cleanId);
    const filtered = platforms.filter(p => 
      p.id !== id && 
      p.id !== cleanId && 
      normalizePlatformId(p.id, p.platform_name) !== cleanId &&
      (!targetPlatform || p.platform_name.toLowerCase().trim() !== targetPlatform.platform_name.toLowerCase().trim())
    );
    localStorage.setItem(STORAGE_KEYS.SOCIAL, JSON.stringify(filtered));

    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('social_platforms').delete().eq('id', id);
        await supabase.from('social_platforms').delete().eq('id', cleanId);
        if (targetPlatform && targetPlatform.platform_name) {
          await supabase.from('social_platforms').delete().ilike('platform_name', `%${targetPlatform.platform_name}%`);
        }
      } catch (e) {
        console.warn('Supabase delete social platform error', e);
      }

      try {
        await dataService.updateSettings({ social_platforms: filtered });
      } catch (err) {
        console.error('Failed to sync updated list to admin_settings after delete', err);
      }
    }
  },

  // ------------------------------------
  // STUDENT REGISTRATION & ATTEMPTS
  // ------------------------------------
  checkPreviousAttempt: async (testId: string, mobile: string): Promise<Attempt | null> => {
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      try {
        let query = supabase
          .from('attempts')
          .select('*')
          .eq('student_mobile', mobile)
          .in('status', ['completed', 'auto_submitted'])
          .order('created_at', { ascending: false });

        if (isValidUUID(testId)) {
          query = query.eq('test_id', testId);
        }
        const { data, error } = await query.limit(1).maybeSingle();
        if (!error && data) {
          return data as Attempt;
        }
      } catch (e) {
        console.warn('Supabase checkPreviousAttempt failed', e);
      }
    }
    const attempts = await dataService.getAttempts(testId);
    return attempts.find(a => a.student_mobile === mobile && (a.status === 'completed' || a.status === 'auto_submitted')) || null;
  },

  createAttempt: async (
    test: Test,
    student: { full_name: string; mobile: string; email?: string | null; state: string; district: string; gender?: string }
  ): Promise<Attempt> => {
    const attemptId = generateUUID();
    let studentId = generateUUID();

    // Resolve real test UUID
    let realTestId = test.id;
    if (!isValidUUID(realTestId)) {
      const found = await dataService.getTestBySlugOrId(test.slug || test.id);
      if (found && isValidUUID(found.id)) {
        realTestId = found.id;
      }
    }

    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      try {
        // Look up student by mobile number
        const { data: existingStudent } = await supabase
          .from('students')
          .select('id')
          .eq('mobile', student.mobile)
          .limit(1)
          .maybeSingle();

        if (existingStudent && existingStudent.id) {
          studentId = existingStudent.id;
          // Update details
          await supabase.from('students').update({
            full_name: student.full_name,
            email: student.email || null,
            state: student.state,
            district: student.district,
            gender: student.gender || null
          }).eq('id', studentId);
        } else {
          // Insert new student record
          const { data: newStu } = await supabase.from('students').insert({
            id: studentId,
            full_name: student.full_name,
            mobile: student.mobile,
            email: student.email || null,
            state: student.state,
            district: student.district,
            gender: student.gender || null
          }).select().single();

          if (newStu && newStu.id) {
            studentId = newStu.id;
          }
        }

        // Insert new attempt into Supabase
        const initialAttemptDb = sanitizeAttemptForSupabase({
          id: attemptId,
          test_id: realTestId,
          student_id: studentId,
          student_name: student.full_name,
          student_mobile: student.mobile,
          student_email: student.email || null,
          student_state: student.state,
          student_district: student.district,
          start_time: new Date().toISOString(),
          status: 'in_progress',
          total_questions: test.total_questions,
          attempted_questions: 0,
          correct_answers: 0,
          wrong_answers: 0,
          skipped_questions: test.total_questions,
          score: 0,
          percentage: 0,
          time_taken_seconds: 0,
          created_at: new Date().toISOString()
        });

        const { error: attErr } = await supabase.from('attempts').insert(initialAttemptDb);
        if (attErr) {
          console.error('Supabase initial attempt insert error:', attErr);
        }
      } catch (e) {
        console.error('Supabase attempt creation exception:', e);
      }
    }

    const newAttempt: Attempt = {
      id: attemptId,
      test_id: realTestId,
      student_id: studentId,
      student_name: student.full_name,
      student_mobile: student.mobile,
      student_email: student.email || null,
      student_state: student.state,
      student_district: student.district,
      start_time: new Date().toISOString(),
      status: 'in_progress',
      total_questions: test.total_questions,
      attempted_questions: 0,
      correct_answers: 0,
      wrong_answers: 0,
      skipped_questions: test.total_questions,
      score: 0,
      percentage: 0,
      time_taken_seconds: 0,
      created_at: new Date().toISOString()
    };

    const attempts = await dataService.getAttempts();
    attempts.unshift(newAttempt);
    localStorage.setItem(STORAGE_KEYS.ATTEMPTS, JSON.stringify(attempts));

    localStorage.setItem(STORAGE_KEYS.ACTIVE_ATTEMPT + test.id, JSON.stringify({
      attempt: newAttempt,
      answers: {}
    }));

    return newAttempt;
  },

  saveAnswerProgress: (testId: string, attemptId: string, answers: Record<string, { selected: 'A'|'B'|'C'|'D'|null; marked: boolean }>) => {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_ATTEMPT + testId, JSON.stringify({
      attemptId,
      answers,
      lastSavedAt: new Date().toISOString()
    }));
  },

  getSavedAnswerProgress: (testId: string) => {
    const raw = localStorage.getItem(STORAGE_KEYS.ACTIVE_ATTEMPT + testId);
    return raw ? JSON.parse(raw) : null;
  },

  clearSavedProgress: (testId: string) => {
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_ATTEMPT + testId);
  },

  // SECURE SERVER-SIDE SUBMISSION WITH AUTOMATIC CLOUD FALLBACK PERSISTENCE
  submitAttemptSecure: async (
    test: Test,
    attempt: Attempt,
    selectedAnswers: Record<string, string>,
    timeTakenSeconds: number,
    suspiciousCount = 0
  ): Promise<Attempt> => {
    const supabase = getSupabaseClient();
    
    // Resolve real test UUID
    let realTestId = test.id;
    if (!isValidUUID(realTestId)) {
      const found = await dataService.getTestBySlugOrId(test.slug || test.id);
      if (found && isValidUUID(found.id)) {
        realTestId = found.id;
      }
    }

    const formattedAnswers = Object.entries(selectedAnswers).map(([qId, ans]) => ({
      question_id: qId,
      selected_answer: ans
    }));

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase.rpc('submit_attempt_secure', {
          p_attempt_id: attempt.id,
          p_answers: formattedAnswers,
          p_time_taken_seconds: timeTakenSeconds,
          p_suspicious_count: suspiciousCount
        });

        if (!error && data && data.success) {
          // Fetch updated attempt details
          const updatedAttempt = await dataService.getAttemptById(attempt.id);
          if (updatedAttempt) {
            const answers = await dataService.getAttemptAnswers(attempt.id);
            const questions = await dataService.getQuestions(test.id, true);

            const responses = questions.map(q => {
              const ansRecord = answers.find(a => a.question_id === q.id);
              const userAns = ansRecord ? ansRecord.selected_answer : (selectedAnswers[q.id] || null);
              const isCorrect = ansRecord ? ansRecord.is_correct : (userAns === q.correct_answer);
              const status: 'correct' | 'wrong' | 'unattempted' = !userAns ? 'unattempted' : (isCorrect ? 'correct' : 'wrong');

              return {
                question_id: q.id,
                user_answer: userAns,
                correct_answer: q.correct_answer,
                status,
                marks_awarded: ansRecord ? Number(ansRecord.marks_obtained) : 0
              };
            });

            const completed: Attempt = {
              ...updatedAttempt,
              responses
            };

            // Update local storage
            const localAttempts = await dataService.getAttempts();
            const idx = localAttempts.findIndex(a => a.id === completed.id);
            if (idx >= 0) localAttempts[idx] = completed;
            else localAttempts.unshift(completed);
            localStorage.setItem(STORAGE_KEYS.ATTEMPTS, JSON.stringify(localAttempts));

            dataService.clearSavedProgress(test.id);
            return completed;
          }
        } else if (error) {
          console.warn('Supabase submit_attempt_secure RPC error:', error);
        }
      } catch (err) {
        console.warn('Supabase submit_attempt_secure exception, proceeding to direct cloud sync', err);
      }
    }

    // Direct Evaluation & Robust Cloud Persistence
    const questions = await dataService.getQuestions(test.id, true);
    let attempted = 0;
    let correct = 0;
    let wrong = 0;
    let totalScore = 0;

    const answerRecords: Answer[] = [];
    const responses: Attempt['responses'] = [];

    questions.forEach(q => {
      const selected = selectedAnswers[q.id] || null;
      let isCorrect = false;
      let marksObtained = 0;

      if (selected) {
        attempted++;
        if (selected.toUpperCase() === (q.correct_answer || '').toUpperCase()) {
          correct++;
          isCorrect = true;
          marksObtained = parseSafeNumber(q.marks, parseSafeNumber(test.marks_per_question, 1));
        } else {
          wrong++;
          isCorrect = false;
          marksObtained = - parseSafeNumber(q.negative_marks, parseSafeNumber(test.negative_marking, 0.25));
        }
      }

      totalScore += marksObtained;

      const ansId = generateUUID();
      answerRecords.push({
        id: ansId,
        attempt_id: attempt.id,
        question_id: q.id,
        selected_answer: selected as any,
        is_correct: isCorrect,
        marks_obtained: marksObtained,
        is_marked_for_review: false
      });

      responses.push({
        question_id: q.id,
        user_answer: selected,
        correct_answer: q.correct_answer || '',
        status: !selected ? 'unattempted' : (isCorrect ? 'correct' : 'wrong'),
        marks_awarded: marksObtained
      });
    });

    const skipped = Math.max(0, test.total_questions - attempted);
    const finalScore = Math.max(0, Math.round(totalScore * 100) / 100);
    const maxMarks = parseSafeNumber(test.total_marks, test.total_questions * parseSafeNumber(test.marks_per_question, 1));
    const percentage = maxMarks > 0 ? Math.round((finalScore / maxMarks) * 10000) / 100 : 0;

    const completedAttempt: Attempt = {
      ...attempt,
      test_id: realTestId,
      submitted_at: new Date().toISOString(),
      end_time: new Date().toISOString(),
      status: 'completed',
      attempted_questions: attempted,
      correct_answers: correct,
      wrong_answers: wrong,
      skipped_questions: skipped,
      score: finalScore,
      percentage,
      time_taken_seconds: timeTakenSeconds,
      suspicious_activity_count: suspiciousCount,
      responses
    };

    // DIRECT SUPABASE CLOUD DATABASE SYNC (GUARANTEES SAVING TO BACKEND)
    if (isSupabaseConfigured() && supabase) {
      try {
        // 1. Ensure student exists in students table
        let studentId = completedAttempt.student_id;
        if (!isValidUUID(studentId)) {
          studentId = generateUUID();
          completedAttempt.student_id = studentId;
        }

        const { data: existingStudent } = await supabase
          .from('students')
          .select('id')
          .eq('mobile', completedAttempt.student_mobile)
          .limit(1)
          .maybeSingle();

        if (existingStudent && existingStudent.id) {
          studentId = existingStudent.id;
          completedAttempt.student_id = studentId;
        } else {
          await supabase.from('students').insert({
            id: studentId,
            full_name: completedAttempt.student_name,
            mobile: completedAttempt.student_mobile,
            email: completedAttempt.student_email || null,
            state: completedAttempt.student_state,
            district: completedAttempt.student_district
          });
        }

        // 2. Upsert sanitized attempt into Supabase public.attempts
        const sanitizedAttempt = sanitizeAttemptForSupabase(completedAttempt);
        const { error: upsertErr } = await supabase.from('attempts').upsert(sanitizedAttempt);
        if (upsertErr) {
          console.error('Supabase direct attempt upsert error:', upsertErr);
        }

        // 3. Upsert answers into Supabase public.answers
        if (answerRecords.length > 0) {
          const dbAnswers = answerRecords.map(a => ({
            id: isValidUUID(a.id) ? a.id : generateUUID(),
            attempt_id: sanitizedAttempt.id,
            question_id: isValidUUID(a.question_id) ? a.question_id : undefined,
            selected_answer: a.selected_answer || null,
            is_correct: a.is_correct || false,
            marks_obtained: a.marks_obtained || 0,
            answered_at: new Date().toISOString()
          })).filter(a => a.question_id);

          if (dbAnswers.length > 0) {
            await supabase.from('answers').upsert(dbAnswers, { onConflict: 'attempt_id,question_id' });
          }
        }
      } catch (syncErr) {
        console.error('Supabase direct sync error in submitAttemptSecure:', syncErr);
      }
    }

    // Save locally
    const attempts = await dataService.getAttempts();
    const idx = attempts.findIndex(a => a.id === completedAttempt.id);
    if (idx >= 0) {
      attempts[idx] = completedAttempt;
    } else {
      attempts.unshift(completedAttempt);
    }
    localStorage.setItem(STORAGE_KEYS.ATTEMPTS, JSON.stringify(attempts));

    dataService.clearSavedProgress(test.id);
    return completedAttempt;
  },

  // Backward compatibility alias for submitAttempt
  submitAttempt: async (
    test: Test,
    attempt: Attempt,
    studentAnswers: Record<string, { selected: 'A'|'B'|'C'|'D'|null; marked: boolean }>,
    _questionsUnused: Question[],
    timeTakenSeconds: number,
    suspiciousCount = 0
  ): Promise<Attempt> => {
    const stringAnswers: Record<string, string> = {};
    Object.entries(studentAnswers).forEach(([qId, val]) => {
      if (val && val.selected) {
        stringAnswers[qId] = val.selected;
      }
    });

    return dataService.submitAttemptSecure(test, attempt, stringAnswers, timeTakenSeconds, suspiciousCount);
  },

  saveAttempt: async (attempt: Attempt): Promise<Attempt> => {
    const sanitized = sanitizeAttemptForSupabase(attempt);

    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('attempts').upsert(sanitized);
      } catch (e) {
        console.error('Supabase save attempt error', e);
      }
    }

    const attempts = await dataService.getAttempts();
    const idx = attempts.findIndex(a => a.id === attempt.id);
    if (idx >= 0) {
      attempts[idx] = attempt;
    } else {
      attempts.unshift(attempt);
    }
    localStorage.setItem(STORAGE_KEYS.ATTEMPTS, JSON.stringify(attempts));

    return attempt;
  },

  getAttempts: async (testId?: string): Promise<Attempt[]> => {
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      try {
        let query = supabase.from('attempts').select('*').order('created_at', { ascending: false });
        if (testId && testId !== 'all') {
          if (isValidUUID(testId)) {
            query = query.eq('test_id', testId);
          } else {
            // Find test by slug
            const foundTest = await dataService.getTestBySlugOrId(testId);
            if (foundTest && isValidUUID(foundTest.id)) {
              query = query.eq('test_id', foundTest.id);
            }
          }
        }
        const { data, error } = await query;
        if (!error && data && Array.isArray(data)) {
          localStorage.setItem(STORAGE_KEYS.ATTEMPTS, JSON.stringify(data));
          return data as Attempt[];
        }
      } catch (e) {
        console.warn('Supabase fetch attempts error', e);
      }
    }
    const raw = localStorage.getItem(STORAGE_KEYS.ATTEMPTS);
    let attempts: Attempt[] = [];
    try {
      attempts = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(attempts)) attempts = [];
    } catch {
      attempts = [];
    }

    if (testId && testId !== 'all') {
      return attempts.filter(a => a.test_id === testId);
    }
    return attempts;
  },

  getAttemptById: async (attemptId: string): Promise<Attempt | null> => {
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase && isValidUUID(attemptId)) {
      try {
        const { data, error } = await supabase.from('attempts').select('*').eq('id', attemptId).maybeSingle();
        if (!error && data) return data as Attempt;
      } catch (e) {
        console.warn('Supabase fetch attempt by ID failed', e);
      }
    }
    const attempts = await dataService.getAttempts();
    return attempts.find(a => a.id === attemptId) || null;
  },

  getAttemptAnswers: async (attemptId: string): Promise<Answer[]> => {
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase && isValidUUID(attemptId)) {
      try {
        const { data, error } = await supabase.from('answers').select('*').eq('attempt_id', attemptId);
        if (!error && data) return data as Answer[];
      } catch (e) {
        console.warn('Supabase fetch attempt answers error', e);
      }
    }
    const raw = localStorage.getItem(STORAGE_KEYS.ANSWERS);
    const answersMap: Record<string, Answer[]> = raw ? JSON.parse(raw) : {};
    return answersMap[attemptId] || [];
  },

  // ------------------------------------
  // MANUAL FULL SYNC UTILITY TO SUPABASE
  // ------------------------------------
  syncAllLocalDataToSupabase: async (): Promise<{
    success: boolean;
    testsCount: number;
    questionsCount: number;
    attemptsCount: number;
    error?: string;
  }> => {
    const supabase = getSupabaseClient();
    if (!isSupabaseConfigured() || !supabase) {
      return { success: false, testsCount: 0, questionsCount: 0, attemptsCount: 0, error: 'Supabase is not configured' };
    }

    let syncedTests = 0;
    let syncedQuestions = 0;
    let syncedAttempts = 0;

    try {
      // 1. Sync all tests
      const tests = await dataService.getTests(true);
      for (const t of tests) {
        await dataService.saveTest(t);
        syncedTests++;
      }

      // 2. Sync all questions
      const rawQ = localStorage.getItem(STORAGE_KEYS.QUESTIONS);
      if (rawQ) {
        const qMap = JSON.parse(rawQ);
        for (const [tId, qList] of Object.entries(qMap)) {
          if (Array.isArray(qList) && qList.length > 0) {
            await dataService.saveQuestions(tId, qList as Question[]);
            syncedQuestions += qList.length;
          }
        }
      }

      // 3. Sync all attempts
      const attempts = await dataService.getAttempts();
      for (const att of attempts) {
        await dataService.saveAttempt(att);
        syncedAttempts++;
      }

      // 4. Sync Settings & Social Platforms
      const settings = await dataService.getSettings();
      await dataService.updateSettings(settings);

      const platforms = await dataService.getSocialPlatforms(true);
      for (const p of platforms) {
        await dataService.saveSocialPlatform(p);
      }

      return {
        success: true,
        testsCount: syncedTests,
        questionsCount: syncedQuestions,
        attemptsCount: syncedAttempts
      };
    } catch (err: any) {
      return {
        success: false,
        testsCount: syncedTests,
        questionsCount: syncedQuestions,
        attemptsCount: syncedAttempts,
        error: err?.message || 'Sync failed'
      };
    }
  },

  // ------------------------------------
  // LEADERBOARD & RANKINGS (DYNAMIC / MASKED)
  // ------------------------------------
  getLeaderboard: async (testId: string, limit = 20): Promise<PublicLeaderboardEntry[]> => {
    const supabase = getSupabaseClient();
    let realTestId = testId;
    if (!isValidUUID(realTestId)) {
      const found = await dataService.getTestBySlugOrId(testId);
      if (found && isValidUUID(found.id)) {
        realTestId = found.id;
      }
    }

    if (isSupabaseConfigured() && supabase && isValidUUID(realTestId)) {
      try {
        const { data, error } = await supabase.rpc('get_top_leaderboard', {
          p_test_id: realTestId,
          p_limit: limit
        });
        if (!error && data && Array.isArray(data) && data.length > 0) {
          return data as PublicLeaderboardEntry[];
        }
      } catch (e) {
        console.warn('Supabase fetch get_top_leaderboard RPC error', e);
      }
    }

    // Direct calculation from attempts table
    const attempts = await dataService.getAttempts(realTestId);
    const completed = attempts.filter(a => a.status === 'completed' || a.status === 'auto_submitted');
    completed.sort((a, b) => b.score - a.score || a.time_taken_seconds - b.time_taken_seconds);

    return completed.slice(0, limit).map((a, idx) => {
      const nameParts = (a.student_name || 'Candidate').split(' ');
      const firstName = nameParts[0] || 'Candidate';
      const initial = nameParts.length > 1 ? ` ${nameParts[1][0]}.` : '';
      const masked = `${firstName}${initial}`;

      return {
        rank: idx + 1,
        attempt_id: a.id,
        student_name: a.student_name || 'Aspirant',
        student_district: a.student_district || 'Himachal Pradesh',
        student_state: a.student_state || 'HP',
        masked_name: masked,
        score: a.score,
        percentage: a.percentage || 0,
        correct_answers: a.correct_answers || 0,
        wrong_answers: a.wrong_answers || 0,
        unattempted_answers: a.skipped_questions ?? (a.total_questions ? a.total_questions - (a.attempted_questions || 0) : 0),
        time_taken_seconds: a.time_taken_seconds || 0,
        submitted_at: a.submitted_at || a.created_at || new Date().toISOString()
      };
    });
  },

  getStudentRank: async (testId: string, attemptId: string): Promise<number> => {
    let realTestId = testId;
    if (!isValidUUID(realTestId)) {
      const found = await dataService.getTestBySlugOrId(testId);
      if (found && isValidUUID(found.id)) {
        realTestId = found.id;
      }
    }

    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase && isValidUUID(realTestId) && isValidUUID(attemptId)) {
      try {
        const { data, error } = await supabase.rpc('get_student_rank', {
          p_test_id: realTestId,
          p_attempt_id: attemptId
        });
        if (!error && typeof data === 'number') return data;
      } catch (e) {
        console.warn('Supabase fetch get_student_rank RPC error', e);
      }
    }

    const leaderboard = await dataService.getLeaderboard(realTestId, 1000);
    const found = leaderboard.find(l => l.attempt_id === attemptId);
    return found ? found.rank : 1;
  }
};
