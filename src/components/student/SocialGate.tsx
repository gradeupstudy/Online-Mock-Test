import React, { useState, useEffect } from 'react';
import { Youtube, Send, Instagram, CheckCircle2, ExternalLink, ShieldCheck, ArrowRight, Lock } from 'lucide-react';
import { SocialPlatform } from '../../types';
import { dataService } from '../../services/dataService';

interface SocialGateProps {
  onSuccessGate: () => void;
  onToast?: (type: 'success' | 'error' | 'info', msg: string) => void;
}

export const SocialGate: React.FC<SocialGateProps> = ({ onSuccessGate, onToast }) => {
  const [platforms, setPlatforms] = useState<SocialPlatform[]>([]);
  const [visited, setVisited] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlatforms();
  }, []);

  const loadPlatforms = async () => {
    setLoading(true);
    const list = await dataService.getSocialPlatforms(false);
    setPlatforms(list);
    setLoading(false);
  };

  const handleVisitPlatform = (p: SocialPlatform) => {
    // Open in new tab
    window.open(p.platform_url, '_blank', 'noopener,noreferrer');
    
    // Mark as visited in state
    setVisited((prev) => ({
      ...prev,
      [p.id]: true
    }));
    onToast?.('info', `Opened ${p.platform_name}. Click confirm once subscribed/joined!`);
  };

  const requiredPlatforms = platforms.filter((p) => p.is_required);
  const allRequiredVisited = requiredPlatforms.every((p) => visited[p.id]);

  const handleContinue = () => {
    if (!allRequiredVisited && requiredPlatforms.length > 0) {
      onToast?.('error', 'Please visit and subscribe to all mandatory Gradeup Study channels first!');
      return;
    }
    onToast?.('success', 'Social verification passed!');
    onSuccessGate();
  };

  if (loading) {
    return <div className="py-12 text-center text-slate-500">Loading social requirements...</div>;
  }

  // If no required platforms exist, automatically allow pass
  if (platforms.length === 0) {
    onSuccessGate();
    return null;
  }

  return (
    <div className="max-w-xl mx-auto space-y-6 my-6">
      
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xl space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-900 flex items-center justify-center mx-auto text-blue-600">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
            Gradeup Study Official Community Requirement
          </h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Please join our official YouTube and Telegram channels to get free PDFs, daily current affairs, and answer key notifications.
          </p>
        </div>

        {/* Platforms List */}
        <div className="space-y-3">
          {platforms.map((p) => {
            const isCompleted = Boolean(visited[p.id]);
            return (
              <div
                key={p.id}
                className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                  isCompleted
                    ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 border flex items-center justify-center shrink-0">
                    {p.icon === 'youtube' && <Youtube className="w-5 h-5 text-rose-600" />}
                    {p.icon === 'send' && <Send className="w-5 h-5 text-blue-500" />}
                    {p.icon === 'instagram' && <Instagram className="w-5 h-5 text-pink-600" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="font-bold text-sm text-slate-900 dark:text-white">{p.platform_name}</p>
                      {p.is_required && (
                        <span className="text-[10px] font-bold uppercase text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950 px-1.5 py-0.5 rounded-md">
                          Required
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500">Tap below to join official channel</p>
                  </div>
                </div>

                <button
                  onClick={() => handleVisitPlatform(p)}
                  className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shrink-0 ${
                    isCompleted
                      ? 'bg-emerald-600 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                  }`}
                >
                  {isCompleted ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" /> Joined
                    </>
                  ) : (
                    <>
                      <span>{p.button_text || 'Subscribe / Join'}</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Continue Button */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={handleContinue}
            disabled={!allRequiredVisited && requiredPlatforms.length > 0}
            className={`w-full py-3.5 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
              allRequiredVisited || requiredPlatforms.length === 0
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg cursor-pointer'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
            }`}
          >
            <span>Proceed to Student Registration</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          {!allRequiredVisited && requiredPlatforms.length > 0 && (
            <p className="text-[11px] text-rose-500 text-center font-semibold mt-2">
              Please click on each required channel above to unlock registration.
            </p>
          )}
        </div>

      </div>

    </div>
  );
};
