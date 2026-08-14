import React, { useState, useEffect, useRef } from 'react';
import { Youtube, Send, Instagram, CheckCircle2, ExternalLink, ShieldCheck, ArrowRight, Lock, Loader2, Globe, CheckSquare, Square } from 'lucide-react';
import { SocialPlatform } from '../../types';
import { dataService } from '../../services/dataService';

interface SocialGateProps {
  onSuccessGate: () => void;
  onToast?: (type: 'success' | 'error' | 'info', msg: string) => void;
}

export const SocialGate: React.FC<SocialGateProps> = ({ onSuccessGate, onToast }) => {
  const [platforms, setPlatforms] = useState<SocialPlatform[]>([]);
  const [visited, setVisited] = useState<Record<string, boolean>>({});
  const [verifying, setVerifying] = useState<Record<string, number>>({});
  const [confirmedDeclaration, setConfirmedDeclaration] = useState(false);
  const [loading, setLoading] = useState(true);

  const timerRefs = useRef<Record<string, NodeJS.Timeout>>({});

  useEffect(() => {
    loadPlatforms();
    return () => {
      // Clear timers on unmount
      Object.values(timerRefs.current).forEach(clearInterval);
    };
  }, []);

  const loadPlatforms = async () => {
    setLoading(true);
    const list = await dataService.getSocialPlatforms(false);
    setPlatforms(list);

    // Check pre-verified platforms from localStorage
    const savedVisited: Record<string, boolean> = {};
    list.forEach((p) => {
      if (localStorage.getItem(`gradeup_social_joined_${p.id}`) === 'true') {
        savedVisited[p.id] = true;
      }
    });
    setVisited(savedVisited);
    setLoading(false);
  };

  const handleVisitPlatform = (p: SocialPlatform) => {
    // Open in new tab
    window.open(p.platform_url, '_blank', 'noopener,noreferrer');

    // If already verified, no need to re-verify
    if (visited[p.id]) {
      onToast?.('info', `You have already verified ${p.platform_name}!`);
      return;
    }

    onToast?.('info', `Opened ${p.platform_name}. Verifying your membership...`);

    // Start 5-second verification countdown
    setVerifying((prev) => ({ ...prev, [p.id]: 5 }));

    if (timerRefs.current[p.id]) {
      clearInterval(timerRefs.current[p.id]);
    }

    timerRefs.current[p.id] = setInterval(() => {
      setVerifying((prev) => {
        const currentSecs = prev[p.id];
        if (currentSecs === undefined || currentSecs <= 1) {
          clearInterval(timerRefs.current[p.id]);
          // Mark as verified
          setVisited((vPrev) => ({ ...vPrev, [p.id]: true }));
          localStorage.setItem(`gradeup_social_joined_${p.id}`, 'true');
          onToast?.('success', `${p.platform_name} verified successfully! ✅`);
          const newVerifying = { ...prev };
          delete newVerifying[p.id];
          return newVerifying;
        }
        return { ...prev, [p.id]: currentSecs - 1 };
      });
    }, 1000);
  };

  const requiredPlatforms = platforms.filter((p) => p.is_required);
  const allRequiredVisited = requiredPlatforms.every((p) => visited[p.id]);
  const isAnyVerifying = Object.keys(verifying).length > 0;

  const canProceed = allRequiredVisited && confirmedDeclaration && !isAnyVerifying;

  const handleContinue = () => {
    if (isAnyVerifying) {
      onToast?.('info', 'Verification in progress, please wait a few seconds...');
      return;
    }
    if (!allRequiredVisited && requiredPlatforms.length > 0) {
      onToast?.('error', 'Please visit and verify all mandatory Gradeup Study channels first!');
      return;
    }
    if (!confirmedDeclaration) {
      onToast?.('error', 'Please check the confirmation declaration box before proceeding.');
      return;
    }
    onToast?.('success', 'Social verification passed!');
    onSuccessGate();
  };

  if (loading) {
    return <div className="py-12 text-center text-slate-500">Loading social requirements...</div>;
  }

  // If no platforms exist, automatically allow pass
  if (platforms.length === 0) {
    onSuccessGate();
    return null;
  }

  return (
    <div className="max-w-xl mx-auto space-y-6 my-6">
      
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xl space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 flex items-center justify-center mx-auto text-blue-600 dark:text-blue-400 shadow-xs">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
            Gradeup Study Official Community Requirement
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
            Join our official community channels to receive free study PDFs, daily exam updates, and answer key notifications.
          </p>
        </div>

        {/* Platforms List */}
        <div className="space-y-3">
          {platforms.map((p) => {
            const isCompleted = Boolean(visited[p.id]);
            const count = verifying[p.id];
            const isVerifying = count !== undefined && count > 0;

            return (
              <div
                key={p.id}
                className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isCompleted
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
                    : isVerifying
                    ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 shadow-xs">
                    {p.icon === 'youtube' && <Youtube className="w-5 h-5 text-rose-600" />}
                    {p.icon === 'send' && <Send className="w-5 h-5 text-blue-500" />}
                    {p.icon === 'instagram' && <Instagram className="w-5 h-5 text-pink-600" />}
                    {p.icon !== 'youtube' && p.icon !== 'send' && p.icon !== 'instagram' && (
                      <Globe className="w-5 h-5 text-indigo-500" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="font-bold text-sm text-slate-900 dark:text-white truncate">{p.platform_name}</p>
                      {p.is_required && (
                        <span className="text-[10px] font-bold uppercase text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950 px-1.5 py-0.5 rounded-md border border-rose-200 dark:border-rose-900 shrink-0">
                          Required
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {isCompleted
                        ? 'Verified & Membership confirmed'
                        : isVerifying
                        ? `Checking membership status (${count}s)...`
                        : 'Tap button to join & verify'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleVisitPlatform(p)}
                  disabled={isVerifying}
                  className={`w-full sm:w-auto px-3.5 py-2.5 sm:py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shrink-0 shadow-xs ${
                    isCompleted
                      ? 'bg-emerald-600 text-white'
                      : isVerifying
                      ? 'bg-amber-500 text-white cursor-wait animate-pulse'
                      : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white cursor-pointer'
                  }`}
                >
                  {isCompleted ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" /> Verified ✅
                    </>
                  ) : isVerifying ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Verifying ({count}s)
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

        {/* Confirmation Checkbox Declaration */}
        <div className="pt-2">
          <label
            onClick={() => setConfirmedDeclaration(!confirmedDeclaration)}
            className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <div className="mt-0.5 shrink-0 text-blue-600 dark:text-blue-400">
              {confirmedDeclaration ? (
                <CheckSquare className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Square className="w-5 h-5 text-slate-400" />
              )}
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed select-none">
              I confirm that I have joined/subscribed to the required official Gradeup Study channels for updates and study materials.
            </p>
          </label>
        </div>

        {/* Continue Button */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={handleContinue}
            disabled={!canProceed}
            className={`w-full py-3.5 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
              canProceed
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg cursor-pointer hover:scale-[1.01]'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
            }`}
          >
            <span>Proceed to Student Registration</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          {!canProceed && (
            <p className="text-[11px] text-rose-500 text-center font-semibold mt-2">
              {!allRequiredVisited
                ? 'Please click and verify all required channels above.'
                : !confirmedDeclaration
                ? 'Please tick the confirmation check box above to unlock registration.'
                : 'Verifying membership... Please wait.'}
            </p>
          )}
        </div>

      </div>

    </div>
  );
};

