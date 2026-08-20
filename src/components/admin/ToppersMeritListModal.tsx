import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Award, 
  Printer, 
  Copy, 
  Check, 
  Download, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Calendar,
  Users,
  Layers,
  Sparkles,
  FileText,
  HelpCircle
} from 'lucide-react';
import { Attempt, Test } from '../../types';
import { Modal } from '../common/Modal';
import { printOfficialMeritList } from '../../utils/printMeritList';

interface ToppersMeritListModalProps {
  isOpen: boolean;
  onClose: () => void;
  tests: Test[];
  attempts: Attempt[];
  initialTestId?: string;
  onToast?: (type: 'success' | 'error' | 'info', msg: string) => void;
}

export const ToppersMeritListModal: React.FC<ToppersMeritListModalProps> = ({
  isOpen,
  onClose,
  tests,
  attempts,
  initialTestId,
  onToast
}) => {
  const [selectedTestId, setSelectedTestId] = useState<string>('all');
  const [topCount, setTopCount] = useState<5 | 10 | 20>(10);
  const [copiedText, setCopiedText] = useState(false);

  // Sync test ID when modal opens or initialTestId changes
  useEffect(() => {
    if (isOpen) {
      if (initialTestId && initialTestId !== 'all') {
        setSelectedTestId(initialTestId);
      } else {
        // If initial is 'all', check if there's a test with attempts to show first, else 'all'
        const testWithAttempts = tests.find(t => attempts.some(a => a.test_id === t.id));
        setSelectedTestId(testWithAttempts ? testWithAttempts.id : (tests[0]?.id || 'all'));
      }
    }
  }, [isOpen, initialTestId, tests, attempts]);

  // Selected test object
  const currentTest = selectedTestId === 'all' ? null : tests.find(t => t.id === selectedTestId);

  // Filter completed attempts for selected test
  const testAttempts = attempts.filter(
    a => (selectedTestId === 'all' || a.test_id === selectedTestId) &&
         (a.status === 'completed' || a.status === 'auto_submitted')
  );

  // Sort by score desc, then time asc
  const sortedToppers = [...testAttempts].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.time_taken_seconds - b.time_taken_seconds;
  });

  const displayToppers = sortedToppers.slice(0, topCount);

  // Top 3 Podium
  const rank1 = displayToppers[0] || null;
  const rank2 = displayToppers[1] || null;
  const rank3 = displayToppers[2] || null;

  const totalMarks = currentTest?.total_marks || (displayToppers[0]?.total_questions ? displayToppers[0].total_questions : 100);

  const handlePrintPDF = () => {
    if (displayToppers.length === 0) {
      onToast?.('error', 'No candidate results available to generate PDF merit list!');
      return;
    }

    printOfficialMeritList({
      test: currentTest,
      toppers: sortedToppers,
      topCount,
      totalAppeared: testAttempts.length
    });
    onToast?.('success', `Generating Top ${displayToppers.length} Official PDF Merit List...`);
  };

  const handleCopySummary = () => {
    if (displayToppers.length === 0) {
      onToast?.('error', 'No topper results available to copy!');
      return;
    }

    const testName = currentTest ? currentTest.title : 'All Mock Examinations';
    let text = `🏆 *GRADEUP STUDY - OFFICIAL TOPPERS MERIT LIST* 🏆\n`;
    text += `📝 *Exam:* ${testName}\n`;
    text += `📅 *Date:* ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}\n`;
    text += `👥 *Total Aspirants Appeared:* ${testAttempts.length}\n`;
    text += `📊 *Top ${displayToppers.length} Rankers Roll of Honor:*\n`;
    text += `──────────────────────\n`;

    displayToppers.forEach((att, idx) => {
      const medal = idx === 0 ? '🥇 *RANK 1*' : idx === 1 ? '🥈 *RANK 2*' : idx === 2 ? '🥉 *RANK 3*' : `🏅 *Rank ${idx + 1}*`;
      const timeMins = Math.floor(att.time_taken_seconds / 60);
      const timeSecs = att.time_taken_seconds % 60;
      text += `${medal}: *${att.student_name}*\n`;
      text += `📍 ${att.student_district ? `${att.student_district}, ` : ''}${att.student_state || 'HP'} | Score: *${att.score} Marks* (${att.percentage}%)\n`;
      text += `⏱ Time: ${timeMins}m ${timeSecs}s | Acc: ✓${att.correct_answers} ✗${att.wrong_answers}\n\n`;
    });

    text += `──────────────────────\n`;
    text += `🌐 *Gradeup Study Online Assessment System*`;

    navigator.clipboard.writeText(text);
    setCopiedText(true);
    onToast?.('success', `Copied Top ${displayToppers.length} Toppers list for WhatsApp / Telegram!`);
    setTimeout(() => setCopiedText(false), 2500);
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500" />
          <span>Toppers Merit List PDF & Share Generator</span>
        </div>
      }
      maxWidth="4xl"
    >
      <div className="space-y-5 text-slate-900 dark:text-slate-100">
        
        {/* TOP CONTROL BAR: Filters & Count */}
        <div className="bg-slate-50 dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-xs">
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
            {/* Test Selector with Attempt Counts */}
            <div className="flex-1 min-w-[220px]">
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                Select Mock Test:
              </label>
              <select
                value={selectedTestId}
                onChange={(e) => setSelectedTestId(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-hidden cursor-pointer"
              >
                <option value="all">
                  🌟 All Mock Tests Combined ({attempts.filter(a => a.status === 'completed' || a.status === 'auto_submitted').length} total attempts)
                </option>
                {tests.map((t) => {
                  const count = attempts.filter(
                    a => a.test_id === t.id && (a.status === 'completed' || a.status === 'auto_submitted')
                  ).length;
                  return (
                    <option key={t.id} value={t.id}>
                      {t.title} ({count} {count === 1 ? 'attempt' : 'attempts'})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Top 5 / 10 / 20 Filter Pills */}
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                Merit Rank Limit:
              </label>
              <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-300 dark:border-slate-600">
                {([5, 10, 20] as const).map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setTopCount(num)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                      topCount === num
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    Top {num}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-1 md:pt-0">
            <button
              onClick={handleCopySummary}
              className="flex-1 sm:flex-none px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-900 text-xs font-bold rounded-xl border border-emerald-300 dark:border-emerald-800 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              title="Copy for WhatsApp / Telegram"
            >
              {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedText ? 'Copied!' : 'Copy WhatsApp Text'}</span>
            </button>

            <button
              onClick={handlePrintPDF}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:from-blue-800 active:to-indigo-800 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Download / Print PDF</span>
            </button>
          </div>
        </div>

        {/* MERIT LIST DOCUMENT PREVIEW CANVAS */}
        <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          
          {/* HEADER: Institute & Exam Branding */}
          <div className="border-b border-slate-200 dark:border-slate-800 pb-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 text-slate-950 flex items-center justify-center font-black shadow-md border-2 border-amber-600 shrink-0">
                <Trophy className="w-6 h-6 fill-slate-950 text-slate-950" />
              </div>
              <div>
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 font-extrabold text-[10px] uppercase tracking-wider rounded-md">
                    Official Merit List
                  </span>
                  <span className="text-xs font-black text-blue-700 dark:text-blue-400 uppercase tracking-wide">
                    Gradeup Study
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 dark:text-white mt-0.5">
                  TOP {topCount} RANKERS & PERFORMANCE PODIUM
                </h2>
              </div>
            </div>

            <div className="text-center sm:text-right bg-slate-50 dark:bg-slate-800/80 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0">
              <p className="text-xs font-black text-slate-900 dark:text-white uppercase truncate max-w-[260px]">
                {currentTest ? currentTest.title : 'All Mock Examinations'}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                📅 {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} • 👥 {testAttempts.length} Candidates Appeared
              </p>
            </div>
          </div>

          {displayToppers.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <Trophy className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
              <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">No completed attempts recorded for this mock test yet.</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Once aspirants take and submit this mock test, their real-time rankings, accuracy rates, and gold/silver/bronze podium cards will appear here.
              </p>
            </div>
          ) : (
            <>
              {/* TOP 3 PODIUM CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                
                {/* 🥈 RANK 2: SILVER */}
                <div className={`order-2 sm:order-1 rounded-2xl p-4 border transition-all flex flex-col justify-between ${
                  rank2 
                    ? 'bg-slate-50 dark:bg-slate-800/70 border-slate-300 dark:border-slate-700 shadow-xs' 
                    : 'bg-slate-50/50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 opacity-60'
                }`}>
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-black text-sm">
                      🥈
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                      Rank 2 (Silver)
                    </span>
                  </div>

                  {rank2 ? (
                    <div className="space-y-2">
                      <div>
                        <p className="text-base font-black text-slate-900 dark:text-white leading-tight truncate">{rank2.student_name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1 mt-0.5 truncate">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" /> {rank2.student_district || 'District'}, {rank2.student_state || 'HP'}
                        </p>
                      </div>

                      <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
                        <div>
                          <p className="text-[9px] text-slate-400 font-bold uppercase">Marks</p>
                          <p className="text-sm font-black text-slate-900 dark:text-white">{rank2.score} pts</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] text-slate-400 font-bold uppercase">Accuracy</p>
                          <p className="text-xs font-black text-blue-600 dark:text-blue-400">{rank2.percentage}%</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic text-center py-4">Position Vacant</p>
                  )}
                </div>

                {/* 🥇 RANK 1: GOLD CHAMPION */}
                <div className={`order-1 sm:order-2 rounded-2xl p-4 sm:p-5 border-2 transition-all flex flex-col justify-between ${
                  rank1 
                    ? 'bg-gradient-to-b from-amber-50 to-amber-100/60 dark:from-amber-950/40 dark:to-amber-900/20 border-amber-400 dark:border-amber-500/80 shadow-md sm:-mt-2' 
                    : 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 opacity-60'
                }`}>
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-400 text-amber-950 font-black text-base shadow-xs">
                      🥇
                    </span>
                    <span className="text-xs font-black uppercase tracking-wider text-amber-900 dark:text-amber-300 bg-amber-200/80 dark:bg-amber-900/60 px-2.5 py-0.5 rounded-md border border-amber-300 dark:border-amber-700">
                      ★ 1st Topper ★
                    </span>
                  </div>

                  {rank1 ? (
                    <div className="space-y-2.5">
                      <div>
                        <p className="text-lg font-black text-amber-950 dark:text-amber-200 leading-tight truncate">{rank1.student_name}</p>
                        <p className="text-xs text-amber-800 dark:text-amber-400 font-bold flex items-center gap-1 mt-0.5 truncate">
                          <MapPin className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" /> {rank1.student_district || 'District'}, {rank1.student_state || 'HP'}
                        </p>
                      </div>

                      <div className="bg-white/90 dark:bg-slate-900/90 p-2.5 rounded-xl border border-amber-200 dark:border-amber-800/80 flex items-center justify-between shadow-2xs">
                        <div>
                          <p className="text-[9px] text-amber-700 dark:text-amber-400 font-bold uppercase">Topper Score</p>
                          <p className="text-base font-black text-amber-900 dark:text-amber-300">{rank1.score} Marks</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] text-amber-700 dark:text-amber-400 font-bold uppercase">Percentage</p>
                          <p className="text-xs font-black text-emerald-600 dark:text-emerald-400">{rank1.percentage}%</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] font-bold text-amber-900 dark:text-amber-300 px-0.5">
                        <span>✓ {rank1.correct_answers} Correct</span>
                        <span>✗ {rank1.wrong_answers} Wrong</span>
                        <span>⏱ {Math.floor(rank1.time_taken_seconds / 60)}m {rank1.time_taken_seconds % 60}s</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-amber-400 italic text-center py-6">Position Vacant</p>
                  )}
                </div>

                {/* 🥉 RANK 3: BRONZE */}
                <div className={`order-3 rounded-2xl p-4 border transition-all flex flex-col justify-between ${
                  rank3 
                    ? 'bg-orange-50/70 dark:bg-orange-950/40 border-amber-300 dark:border-orange-800/80 shadow-xs' 
                    : 'bg-orange-50/30 border-orange-200 opacity-60'
                }`}>
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 font-black text-sm">
                      🥉
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800">
                      Rank 3 (Bronze)
                    </span>
                  </div>

                  {rank3 ? (
                    <div className="space-y-2">
                      <div>
                        <p className="text-base font-black text-slate-900 dark:text-white leading-tight truncate">{rank3.student_name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1 mt-0.5 truncate">
                          <MapPin className="w-3 h-3 text-amber-600 shrink-0" /> {rank3.student_district || 'District'}, {rank3.student_state || 'HP'}
                        </p>
                      </div>

                      <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-amber-200 dark:border-orange-900/60 flex items-center justify-between">
                        <div>
                          <p className="text-[9px] text-slate-400 font-bold uppercase">Marks</p>
                          <p className="text-sm font-black text-slate-900 dark:text-white">{rank3.score} pts</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] text-slate-400 font-bold uppercase">Accuracy</p>
                          <p className="text-xs font-black text-blue-600 dark:text-blue-400">{rank3.percentage}%</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic text-center py-4">Position Vacant</p>
                  )}
                </div>

              </div>

              {/* COMPLETE RANKERS MERIT TABLE */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Official Roll of Merit (Rank 1 to {displayToppers.length})
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    Evaluated as per Exam Marking Scheme
                  </span>
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse min-w-[500px]">
                    <thead className="bg-slate-900 text-white font-bold uppercase text-[10px]">
                      <tr>
                        <th className="py-2 px-3 w-14 text-center">Rank</th>
                        <th className="py-2 px-3">Candidate Name</th>
                        <th className="py-2 px-3">District & State</th>
                        <th className="py-2 px-3 text-center">Correct / Wrong</th>
                        <th className="py-2 px-3 text-center">Time Taken</th>
                        <th className="py-2 px-3 text-right">Score</th>
                        <th className="py-2 px-3 text-right">Percent</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {displayToppers.map((att, idx) => {
                        const rankNum = idx + 1;
                        let rankBadge = `#${rankNum}`;
                        let rowClass = idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/80 dark:bg-slate-800/40';

                        if (rankNum === 1) {
                          rankBadge = '🥇 #1';
                          rowClass = 'bg-amber-50/70 dark:bg-amber-950/30 font-bold';
                        } else if (rankNum === 2) {
                          rankBadge = '🥈 #2';
                          rowClass = 'bg-slate-100/70 dark:bg-slate-800/60 font-bold';
                        } else if (rankNum === 3) {
                          rankBadge = '🥉 #3';
                          rowClass = 'bg-orange-50/60 dark:bg-orange-950/30 font-bold';
                        }

                        return (
                          <tr key={att.id} className={`${rowClass} hover:bg-blue-50/40 dark:hover:bg-blue-950/30 transition-colors`}>
                            <td className="py-2 px-3 text-center font-black text-slate-800 dark:text-slate-200">
                              {rankBadge}
                            </td>
                            <td className="py-2 px-3 font-bold text-slate-900 dark:text-white">
                              {att.student_name}
                            </td>
                            <td className="py-2 px-3 text-slate-600 dark:text-slate-400">
                              {att.student_district || 'Himachal'}, {att.student_state || 'HP'}
                            </td>
                            <td className="py-2 px-3 text-center font-semibold">
                              <span className="text-emerald-600 dark:text-emerald-400">✓ {att.correct_answers}</span>
                              <span className="text-slate-300 dark:text-slate-600 mx-1">|</span>
                              <span className="text-rose-600 dark:text-rose-400">✗ {att.wrong_answers}</span>
                            </td>
                            <td className="py-2 px-3 text-center text-slate-600 dark:text-slate-400">
                              {Math.floor(att.time_taken_seconds / 60)}m {att.time_taken_seconds % 60}s
                            </td>
                            <td className="py-2 px-3 text-right font-black text-slate-900 dark:text-white text-sm">
                              {att.score}
                            </td>
                            <td className="py-2 px-3 text-right font-black text-blue-600 dark:text-blue-400">
                              {att.percentage}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* FOOTER VERIFICATION WATERMARK */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-2 text-center sm:text-left">
                <div>
                  <p className="font-bold text-slate-700 dark:text-slate-300">Gradeup Study — Online Assessment Portal</p>
                  <p className="text-[10px] text-slate-400">Authentic Computer Evaluated Rankings & Accuracy Breakdown</p>
                </div>
                <div className="text-center sm:text-right">
                  <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-black text-[10px] uppercase">
                    ✓ Verified Score Transcripts
                  </span>
                </div>
              </div>
            </>
          )}

        </div>

      </div>
    </Modal>
  );
};
