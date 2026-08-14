import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const DEFAULT_SUPABASE_URL = 'https://qruoyjgnluynoklayzti.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFydW95amdubHV5bm9rbGF5enRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY1OTY2NDMsImV4cCI6MjEwMjE3MjY0M30.KEGWYkKX2yzW5cBFpZu1j4mtvadpSzsS92ssHdw3Lf4';

export const getStoredSupabaseConfig = () => {
  const metaEnv = (import.meta as unknown as { env: Record<string, string> }).env || {};
  const url = metaEnv.VITE_SUPABASE_URL || localStorage.getItem('gradeup_supabase_url') || DEFAULT_SUPABASE_URL;
  const key = metaEnv.VITE_SUPABASE_ANON_KEY || localStorage.getItem('gradeup_supabase_key') || DEFAULT_SUPABASE_ANON_KEY;
  return { url, key };
};

export const isSupabaseConfigured = (): boolean => {
  const { url, key } = getStoredSupabaseConfig();
  return Boolean(url && url.length > 5 && key && key.length > 10);
};

let cachedClient: SupabaseClient | null = null;
let lastUrl = '';
let lastKey = '';

export const getSupabaseClient = (): SupabaseClient | null => {
  const { url, key } = getStoredSupabaseConfig();
  if (url && key) {
    if (!cachedClient || lastUrl !== url || lastKey !== key) {
      cachedClient = createClient(url, key);
      lastUrl = url;
      lastKey = key;
    }
    return cachedClient;
  }
  return null;
};

export const supabase = getSupabaseClient();

