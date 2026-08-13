import { createClient } from '@supabase/supabase-js';

const getStoredSupabaseConfig = () => {
  const metaEnv = (import.meta as unknown as { env: Record<string, string> }).env || {};
  const url = metaEnv.VITE_SUPABASE_URL || localStorage.getItem('gradeup_supabase_url') || '';
  const key = metaEnv.VITE_SUPABASE_ANON_KEY || localStorage.getItem('gradeup_supabase_key') || '';
  return { url, key };
};

export const isSupabaseConfigured = (): boolean => {
  const { url, key } = getStoredSupabaseConfig();
  return Boolean(url && url.length > 5 && key && key.length > 10);
};

export const getSupabaseClient = () => {
  const { url, key } = getStoredSupabaseConfig();
  if (url && key) {
    return createClient(url, key);
  }
  return null;
};

export const supabase = getSupabaseClient();
