import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Database, CheckCircle, Copy, Check, ExternalLink } from 'lucide-react';
import { isSupabaseConfigured, getSupabaseClient } from '../../lib/supabase';

interface SupabaseSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessToast?: (msg: string) => void;
  onToast?: (type: 'success' | 'error' | 'info', msg: string) => void;
}

export const SupabaseSetupModal: React.FC<SupabaseSetupModalProps> = ({
  isOpen,
  onClose,
  onSuccessToast,
  onToast
}) => {
  const notifySuccess = (msg: string) => {
    if (typeof onToast === 'function') {
      onToast('success', msg);
    } else if (typeof onSuccessToast === 'function') {
      onSuccessToast(msg);
    }
  };
  const [url, setUrl] = useState(localStorage.getItem('gradeup_supabase_url') || '');
  const [key, setKey] = useState(localStorage.getItem('gradeup_supabase_key') || '');
  const [isTesting, setIsTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<'none' | 'success' | 'error'>('none');
  const [copiedSql, setCopiedSql] = useState(false);

  const handleSaveAndTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTesting(true);
    setTestStatus('none');

    localStorage.setItem('gradeup_supabase_url', url.trim());
    localStorage.setItem('gradeup_supabase_key', key.trim());

    try {
      const client = getSupabaseClient();
      if (client) {
        const { error } = await client.from('tests').select('count', { count: 'exact', head: true });
        if (!error) {
          setTestStatus('success');
          notifySuccess('Supabase connected successfully!');
        } else {
          setTestStatus('error');
        }
      } else {
        setTestStatus('error');
      }
    } catch (e) {
      setTestStatus('error');
    } finally {
      setIsTesting(false);
    }
  };

  const handleCopySql = () => {
    const sqlText = `-- Gradeup Study Supabase Schema SQL
-- Copy and run in Supabase SQL Editor:
CREATE TABLE IF NOT EXISTS public.tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_code VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    category VARCHAR(100) DEFAULT 'Police Exam',
    total_questions INTEGER DEFAULT 0,
    total_marks DECIMAL(10,2) DEFAULT 100.00,
    marks_per_question DECIMAL(5,2) DEFAULT 1.00,
    negative_marking DECIMAL(5,2) DEFAULT 0.25,
    duration_minutes INTEGER DEFAULT 90,
    status VARCHAR(20) DEFAULT 'published',
    is_published BOOLEAN DEFAULT true,
    social_gate_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Full SQL file available in supabase/schema.sql in codebase`;

    navigator.clipboard.writeText(sqlText);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const isConnected = isSupabaseConfigured();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Supabase Database Configuration" maxWidth="xl">
      <div className="space-y-6">
        {/* Status Box */}
        <div className={`p-4 rounded-xl border flex items-center justify-between ${
          isConnected
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200'
            : 'bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-200'
        }`}>
          <div className="flex items-center gap-3">
            <Database className="w-6 h-6 text-emerald-600 shrink-0" />
            <div>
              <p className="font-bold text-sm">
                {isConnected ? 'Supabase Live Connection Active' : 'Offline / Local Engine Active'}
              </p>
              <p className="text-xs opacity-80">
                {isConnected
                  ? 'All mock tests, student attempts, and results are synced with your remote Supabase PostgreSQL database.'
                  : 'Currently running with high-performance client storage engine. Enter your Supabase credentials below to connect remote DB.'}
              </p>
            </div>
          </div>
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleSaveAndTest} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Supabase Project URL
            </label>
            <input
              type="text"
              placeholder="https://xyzcompany.supabase.co"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Supabase Anon Key
            </label>
            <input
              type="password"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-hidden"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleCopySql}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {copiedSql ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              <span>{copiedSql ? 'SQL Schema Copied!' : 'Copy SQL Schema'}</span>
            </button>

            <button
              type="submit"
              disabled={isTesting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md transition-all disabled:opacity-50"
            >
              {isTesting ? 'Connecting...' : 'Save & Test Connection'}
            </button>
          </div>
        </form>

        {testStatus === 'success' && (
          <div className="p-3 bg-emerald-100 text-emerald-900 rounded-xl text-xs font-semibold flex items-center gap-2">
            <CheckCircle className="w-4 h-4" /> Connection established! Tables found in Supabase database.
          </div>
        )}

        {testStatus === 'error' && (
          <div className="p-3 bg-rose-100 text-rose-900 rounded-xl text-xs font-semibold">
            Unable to query 'tests' table in Supabase. Please ensure you have run the schema.sql in Supabase SQL Editor.
          </div>
        )}

        <div className="text-xs text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span>Need help getting credentials?</span>
          <a
            href="https://supabase.com/dashboard"
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 hover:underline flex items-center gap-1 font-semibold"
          >
            Supabase Dashboard <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </Modal>
  );
};
