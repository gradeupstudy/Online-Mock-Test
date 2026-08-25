import React, { useState, useEffect } from 'react';
import { 
  Database, 
  HardDrive, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  HelpCircle, 
  Users, 
  TrendingUp, 
  Image as ImageIcon,
  Layers,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { dataService, SupabaseStorageStats } from '../../services/dataService';
import { isSupabaseConfigured, getStoredSupabaseConfig } from '../../lib/supabase';

interface SupabaseStorageIndicatorProps {
  onOpenSupabaseModal?: () => void;
  onToast?: (type: 'success' | 'error' | 'info', msg: string) => void;
  compact?: boolean;
}

export const SupabaseStorageIndicator: React.FC<SupabaseStorageIndicatorProps> = ({
  onOpenSupabaseModal,
  onToast,
  compact = false
}) => {
  const [stats, setStats] = useState<SupabaseStorageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isConnected = isSupabaseConfigured();
  const config = getStoredSupabaseConfig();
  const projectRef = config.url ? config.url.replace(/^https?:\/\//, '').split('.')[0] : 'qruoyjgnluynoklayzti';

  const loadStats = async (showToast = false) => {
    setIsRefreshing(true);
    try {
      const data = await dataService.getSupabaseStorageMetrics();
      setStats(data);
      if (showToast) {
        onToast?.('success', 'Supabase storage & database metrics refreshed!');
      }
    } catch (err: any) {
      console.error('Failed to load storage metrics:', err);
      if (showToast) {
        onToast?.('error', 'Failed to fetch storage metrics');
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadStats(false);
  }, []);

  if (loading && !stats) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs animate-pulse">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800" />
            <div className="space-y-1.5">
              <div className="w-32 h-3.5 bg-slate-200 dark:bg-slate-700 rounded-md" />
              <div className="w-48 h-2.5 bg-slate-100 dark:bg-slate-800 rounded-md" />
            </div>
          </div>
          <div className="w-24 h-6 bg-slate-100 dark:bg-slate-800 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!stats) return null;

  // Percentage color helper
  const getProgressColor = (pct: number) => {
    if (pct >= 90) return 'from-rose-500 to-red-600';
    if (pct >= 75) return 'from-amber-500 to-orange-500';
    if (pct >= 50) return 'from-blue-500 to-indigo-600';
    return 'from-emerald-500 to-teal-500';
  };

  const getProgressBg = (pct: number) => {
    if (pct >= 90) return 'bg-rose-500';
    if (pct >= 75) return 'bg-amber-500';
    if (pct >= 50) return 'bg-blue-500';
    return 'bg-emerald-500';
  };

  const getStatusBadge = (pct: number) => {
    if (pct >= 90) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
          <AlertTriangle className="w-3 h-3" /> Critical ({pct}%)
        </span>
      );
    }
    if (pct >= 75) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
          <AlertTriangle className="w-3 h-3" /> High Usage ({pct}%)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Optimal Health ({pct}%)
      </span>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs transition-all hover:shadow-md">
      
      {/* TOP BAR / HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        
        {/* Title and Cloud Status */}
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500/10 via-teal-500/10 to-blue-500/10 dark:from-emerald-950/40 dark:to-blue-950/40 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 shadow-inner">
            <Database className="w-6 h-6" />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>Supabase Cloud Storage & Database Status</span>
              </h3>
              {getStatusBadge(stats.percentageUsed)}
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-semibold text-slate-700 dark:text-slate-300">Project:</span> {projectRef}
              </span>
              <span>•</span>
              <span>
                Plan: <strong className="text-slate-700 dark:text-slate-200">{stats.storageQuotaTier}</strong>
              </span>
              <span>•</span>
              <span className="text-[11px] text-slate-400">
                Updated {new Date(stats.lastCalculatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
          <button
            onClick={() => loadStats(true)}
            disabled={isRefreshing}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh Live Supabase Quota Metrics"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`} />
          </button>

          {onOpenSupabaseModal && (
            <button
              onClick={onOpenSupabaseModal}
              className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Config
            </button>
          )}

          <a
            href={`https://supabase.com/dashboard/project/${projectRef}/database/tables`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-emerald-600 dark:hover:bg-emerald-700 rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <span>Supabase Cloud</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* STORAGE METER / PROGRESS BAR SECTION */}
      <div className="mt-6 space-y-2">
        <div className="flex flex-wrap items-end justify-between gap-2 text-xs">
          <div>
            <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">Used Quota</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                {stats.totalUsedFormatted}
              </span>
              <span className="text-slate-400 font-bold text-sm">
                / {stats.allocatedQuotaFormatted}
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">Remaining Free Storage</span>
            <div className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400">
              {stats.freeFormatted} free ({stats.percentageFree}%)
            </div>
          </div>
        </div>

        {/* Dynamic Progress Bar */}
        <div className="w-full h-3.5 bg-slate-100 dark:bg-slate-800 rounded-full p-0.5 overflow-hidden border border-slate-200/80 dark:border-slate-700/60 shadow-inner">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${getProgressColor(stats.percentageUsed)} transition-all duration-700 ease-out shadow-xs`}
            style={{ width: `${Math.max(stats.percentageUsed, 1.5)}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 pt-0.5">
          <span>0 MB</span>
          <span className="text-slate-500 font-bold">
            {stats.percentageUsed}% Fill Level
          </span>
          <span>{stats.allocatedQuotaFormatted} (Free Tier Limit)</span>
        </div>
      </div>

      {/* 3 SUMMARY PILLS: ALLOCATED, FILLED, FREE */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
        
        {/* 1. Total Allocated */}
        <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Allocated Storage
            </p>
            <p className="text-base font-black text-slate-900 dark:text-white">
              {stats.allocatedQuotaFormatted}
            </p>
            <p className="text-[11px] text-blue-700/70 dark:text-blue-300/70">
              Supabase Standard Quota
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400">
            <HardDrive className="w-5 h-5" />
          </div>
        </div>

        {/* 2. Used / Filled Storage */}
        <div className="p-3.5 rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/40 flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
              Storage Filled
            </p>
            <p className="text-base font-black text-slate-900 dark:text-white">
              {stats.totalUsedFormatted}
            </p>
            <p className="text-[11px] text-purple-700/70 dark:text-purple-300/70">
              {stats.percentageUsed}% of quota used
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-900/60 text-purple-600 dark:text-purple-400">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        {/* 3. Free Storage Left */}
        <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Available Free Storage
            </p>
            <p className="text-base font-black text-emerald-600 dark:text-emerald-400">
              {stats.freeFormatted}
            </p>
            <p className="text-[11px] text-emerald-700/70 dark:text-emerald-300/70">
              {stats.percentageFree}% remaining free
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* DETAILED BREAKDOWN TOGGLE */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer py-1"
        >
          <span className="flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-slate-500" />
            <span>Detailed Table & Object Storage Breakdown ({stats.tablesBreakdown.length} Live Tables)</span>
          </span>
          <span className="flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400">
            {expanded ? 'Hide Details' : 'View Breakdown'}
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </span>
        </button>

        {/* EXPANDABLE SECTION */}
        {expanded && (
          <div className="mt-3 space-y-4 animate-fadeIn">
            
            {/* Table-by-Table Data Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {stats.tablesBreakdown.map((t) => (
                <div
                  key={t.name}
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/70 space-y-1"
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 truncate block">
                    {t.name}
                  </span>
                  <div className="flex items-baseline justify-between gap-1">
                    <span className="text-sm font-black text-slate-900 dark:text-white">
                      {t.rows.toLocaleString()} <span className="text-[10px] font-medium text-slate-400">rows</span>
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400 block">
                    {t.estimatedSizeFormatted}
                  </span>
                </div>
              ))}
            </div>

            {/* Storage Buckets & Assets summary */}
            {stats.bucketsBreakdown && stats.bucketsBreakdown.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-blue-500" />
                    <span>Supabase Storage Buckets (Images, Logos, Brand Assets)</span>
                  </span>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    {stats.objectStorageSizeFormatted}
                  </span>
                </div>
                
                <div className="space-y-1.5">
                  {stats.bucketsBreakdown.map((b) => (
                    <div key={b.bucketName} className="flex items-center justify-between text-xs py-1 border-b border-slate-200/50 dark:border-slate-700/50 last:border-0">
                      <span className="text-slate-600 dark:text-slate-400 font-medium">
                        Bucket: <strong className="text-slate-800 dark:text-slate-200">{b.bucketName}</strong> ({b.fileCount} files)
                      </span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {b.sizeFormatted}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Storage Health Guarantee Note */}
            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-[11px] text-slate-600 dark:text-slate-400 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>
                  Supabase provides <strong>500 MB</strong> of free PostgreSQL disk space & <strong>1 GB</strong> of free asset storage on the Free Tier.
                </span>
              </div>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider shrink-0">
                Live Synced
              </span>
            </div>

          </div>
        )}
      </div>

    </div>
  );
};
