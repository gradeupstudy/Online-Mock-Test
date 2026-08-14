import React, { useState, useRef } from 'react';
import { 
  Trophy, 
  Award, 
  Printer, 
  Share2, 
  Copy, 
  Check, 
  Download, 
  Medal, 
  Sparkles, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Calendar,
  Users,
  ChevronDown
} from 'lucide-react';
import { Attempt, Test } from '../../types';
import { Modal } from '../common/Modal';

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
  const [selectedTestId, setSelectedTestId] = useState<string>(
    initialTestId && initialTestId !== 'all' ? initialTestId : (tests[0]?.id || 'all')
  );
  const [topCount, setTopCount] = useState<5 | 10 | 20>(10);
  const [copiedText, setCopiedText] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Selected test object
  const currentTest = tests.find(t => t.id === selectedTestId) || tests[0];

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

  const handlePrint = () => {
    window.print();
  };

  const handleCopySummary = () => {
    if (displayToppers.length === 0) return;

    let text = `🏆 *GRADEUP STUDY - OFFICIAL TOPPERS MERIT LIST* 🏆\n`;
    text += `📝 *Exam:* ${currentTest ? currentTest.title : 'Mock Test'}\n`;
    text += `📅 *Date:* ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}\n`;
    text += `👥 *Total Test-Takers:* ${testAttempts.length}\n`;
    text += `──────────────────────\n`;

    displayToppers.forEach((att, idx) => {
      const medal = idx === 0 ? '🥇 *RANK 1*' : idx === 1 ? '🥈 *RANK 2*' : idx === 2 ? '🥉 *RANK 3*' : `🏅 *Rank ${idx + 1}*`;
      const timeMins = Math.floor(att.time_taken_seconds / 60);
      const timeSecs = att.time_taken_seconds % 60;
      text += `${medal}: *${att.student_name}*\n`;
      text += `📍 ${att.student_district || 'District'}, ${att.student_state || 'HP'} | Score: *${att.score} Pts* (${att.percentage}%)\n`;
      text += `⏱ Time: ${timeMins}m ${timeSecs}s | Acc: ✓${att.correct_answers} ✗${att.wrong_answers}\n\n`;
    });

    text += `──────────────────────\n`;
    text += `🎯 Attempt free mocks & download solutions on *Gradeup Study*!`;

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
      title="Toppers Merit List PDF & Share Generator"
      size="2xl"
    >
      <div className="space-y-6">
        
        {/* TOP CONTROL BAR: Filters & Count (Hidden in Print) */}
        <div className="print:hidden bg-slate-50 dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-1">
            {/* Test Selector */}
            <div className="w-full sm:w-72">
              <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                Select Mock Test:
              </label>
              <div className="relative">
                <select
                  value={selectedTestId}
                  onChange={(e) => setSelectedTestId(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-hidden"
                >
                  {tests.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                  {tests.length === 0 && <option value="all">All Mock Tests</option>}
                </select>
              </div>
            </div>

            {/* Top 5 / 10 / 20 Pills */}
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                Show Top Candidates:
              </label>
              <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-300 dark:border-slate-700">
                {([5, 10, 20] as const).map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setTopCount(num)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                      topCount === num
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Top {num}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-2 sm:pt-0">
            <button
              onClick={handleCopySummary}
              className="flex-1 sm:flex-none px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-900 text-xs font-bold rounded-xl border border-emerald-300 dark:border-emerald-800 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              title="Copy for WhatsApp / Telegram"
            >
              {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedText ? 'Copied!' : 'Copy for WhatsApp'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save PDF</span>
            </button>
          </div>
        </div>

        {/* PRINTABLE MERIT LIST DOCUMENT CANVAS */}
        <div 
          ref={printRef}
          className="bg-white text-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xl space-y-6 print:border-none print:shadow-none print:p-0 print:m-0"
        >
          {/* HEADER: Institute & Exam Branding */}
          <div className="border-b-2 border-slate-900 pb-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 text-slate-950 flex items-center justify-center font-black shadow-md border-2 border-amber-600 shrink-0">
                <Trophy className="w-7 h-7 fill-slate-950 text-slate-950" />
              </div>
              <div>
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 font-extrabold text-[10px] uppercase tracking-wider rounded-md">
                    Official Merit List
                  </span>
                  <span className="text-xs font-bold text-slate-500">
                    Gradeup Study Academy
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950 mt-0.5">
                  TOP {topCount} RANKERS & PERFORMANCE PODIUM
                </h2>
              </div>
            </div>

            <div className="text-center sm:text-right bg-slate-50 p-2.5 rounded-xl border border-slate-200 shrink-0">
              <p className="text-xs font-black text-slate-900 uppercase">
                {currentTest?.title || 'Mock Examination'}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                📅 {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} • {testAttempts.length} Candidates Appeared
              </p>
            </div>
          </div>

          {displayToppers.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <Trophy className="w-10 h-10 mx-auto text-slate-300" />
              <p className="font-bold text-slate-600">No completed attempts recorded for this mock test yet.</p>
              <p className="text-xs">Once students take this test, their live rankings and gold/silver/bronze scorecards will show here.</p>
            </div>
          ) : (
            <>
              {/* GOLD, SILVER, BRONZE TOP 3 PODIUM */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
                
                {/* 🥈 RANK 2: SILVER */}
                <div className={`order-2 sm:order-1 rounded-2xl p-4 border-2 transition-all relative flex flex-col justify-between ${
                  rank2 
                    ? 'bg-gradient-to-b from-slate-50 to-slate-100 border-slate-300 text-slate-800 shadow-sm' 
                    : 'bg-slate-50 border-slate-200 opacity-60'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-300 text-slate-800 font-black text-sm shadow-inner">
                      🥈
                    </span>
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                      Rank 2 (Silver)
                    </span>
                  </div>

                  {rank2 ? (
                    <div className="space-y-2">
                      <div>
                        <p className="text-base font-black text-slate-900 leading-tight">{rank2.student_name}</p>
                        <p className="text-xs text-slate-500 font-semibold flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-400" /> {rank2.student_district || 'District'}, {rank2.student_state || 'HP'}
                        </p>
                      </div>

                      <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">Marks</p>
                          <p className="text-base font-black text-slate-800">{rank2.score} pts</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-slate-400 font-bold uppercase">Accuracy</p>
                          <p className="text-xs font-black text-blue-600">{rank2.percentage}%</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic text-center py-4">Position Vacant</p>
                  )}
                </div>

                {/* 🥇 RANK 1: GOLD CHAMPION (Taller, Radiant) */}
                <div className={`order-1 sm:order-2 rounded-2xl p-5 border-2 transition-all relative flex flex-col justify-between ${
                  rank1 
                    ? 'bg-gradient-to-b from-amber-50 via-yellow-50 to-amber-100/60 border-amber-400 text-amber-950 shadow-md sm:-mt-2' 
                    : 'bg-amber-50/50 border-amber-200 opacity-60'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 text-amber-950 font-black text-lg shadow-md border border-amber-400">
                      🥇
                    </span>
                    <span className="text-xs font-black uppercase tracking-wider text-amber-900 bg-amber-200/80 px-2.5 py-0.5 rounded-md border border-amber-300">
                      ★ 1st Topper ★
                    </span>
                  </div>

                  {rank1 ? (
                    <div className="space-y-2.5">
                      <div>
                        <p className="text-lg font-black text-amber-950 leading-tight">{rank1.student_name}</p>
                        <p className="text-xs text-amber-800 font-bold flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-amber-600" /> {rank1.student_district || 'District'}, {rank1.student_state || 'HP'}
                        </p>
                      </div>

                      <div className="bg-white/90 p-3 rounded-xl border border-amber-200 flex items-center justify-between shadow-xs">
                        <div>
                          <p className="text-[10px] text-amber-700 font-bold uppercase">Topper Score</p>
                          <p className="text-lg font-black text-amber-900">{rank1.score} Marks</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-amber-700 font-bold uppercase">Percentage</p>
                          <p className="text-sm font-black text-emerald-600">{rank1.percentage}%</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] font-bold text-amber-900 px-1">
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
                <div className={`order-3 rounded-2xl p-4 border-2 transition-all relative flex flex-col justify-between ${
                  rank3 
                    ? 'bg-gradient-to-b from-orange-50 to-amber-100/40 border-amber-300 text-amber-950 shadow-sm' 
                    : 'bg-orange-50/50 border-orange-200 opacity-60'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-200 text-amber-900 font-black text-sm shadow-inner">
                      🥉
                    </span>
                    <span className="text-[11px] font-black uppercase tracking-wider text-amber-800 bg-white px-2 py-0.5 rounded-md border border-amber-200">
                      Rank 3 (Bronze)
                    </span>
                  </div>

                  {rank3 ? (
                    <div className="space-y-2">
                      <div>
                        <p className="text-base font-black text-slate-900 leading-tight">{rank3.student_name}</p>
                        <p className="text-xs text-slate-500 font-semibold flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-amber-600" /> {rank3.student_district || 'District'}, {rank3.student_state || 'HP'}
                        </p>
                      </div>

                      <div className="bg-white p-2.5 rounded-xl border border-amber-200 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">Marks</p>
                          <p className="text-base font-black text-amber-900">{rank3.score} pts</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-slate-400 font-bold uppercase">Accuracy</p>
                          <p className="text-xs font-black text-blue-600">{rank3.percentage}%</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic text-center py-4">Position Vacant</p>
                  )}
                </div>

              </div>

              {/* COMPLETE RANKERS MERIT TABLE (Rank 1 to topCount) */}
              <div className="space-y-2.5 pt-2">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
                    Official Roll of Merit (Rank 1 to {displayToppers.length})
                  </h3>
                  <span className="text-[11px] text-slate-400 font-semibold">
                    Evaluated as per Exam Marking Scheme
                  </span>
                </div>

                <div className="rounded-2xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-900 text-white font-bold uppercase text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3 w-14 text-center">Rank</th>
                        <th className="py-2.5 px-3">Candidate Name</th>
                        <th className="py-2.5 px-3">District & State</th>
                        <th className="py-2.5 px-3 text-center">Correct / Wrong</th>
                        <th className="py-2.5 px-3 text-center">Time Taken</th>
                        <th className="py-2.5 px-3 text-right">Score</th>
                        <th className="py-2.5 px-3 text-right">Percent</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {displayToppers.map((att, idx) => {
                        const rankNum = idx + 1;
                        let rankBadge = `#${rankNum}`;
                        let rowClass = idx % 2 === 0 ? 'bg-white' : 'bg-slate-50';

                        if (rankNum === 1) {
                          rankBadge = '🥇 #1';
                          rowClass = 'bg-amber-50/70 font-bold';
                        } else if (rankNum === 2) {
                          rankBadge = '🥈 #2';
                          rowClass = 'bg-slate-100 font-bold';
                        } else if (rankNum === 3) {
                          rankBadge = '🥉 #3';
                          rowClass = 'bg-orange-50/60 font-bold';
                        }

                        return (
                          <tr key={att.id} className={`${rowClass} hover:bg-blue-50/50 transition-colors`}>
                            <td className="py-2.5 px-3 text-center font-black text-slate-800">
                              {rankBadge}
                            </td>
                            <td className="py-2.5 px-3 font-bold text-slate-900">
                              {att.student_name}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">
                              {att.student_district || 'Himachal'}, {att.student_state || 'HP'}
                            </td>
                            <td className="py-2.5 px-3 text-center font-semibold">
                              <span className="text-emerald-700">✓ {att.correct_answers}</span>
                              <span className="text-slate-300 mx-1">|</span>
                              <span className="text-rose-600">✗ {att.wrong_answers}</span>
                            </td>
                            <td className="py-2.5 px-3 text-center text-slate-600">
                              {Math.floor(att.time_taken_seconds / 60)}m {att.time_taken_seconds % 60}s
                            </td>
                            <td className="py-2.5 px-3 text-right font-black text-slate-900 text-sm">
                              {att.score}
                            </td>
                            <td className="py-2.5 px-3 text-right font-black text-blue-700">
                              {att.percentage}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* FOOTER VERIFICATION WATERMARK & MOTTO */}
              <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-2 text-center sm:text-left">
                <div>
                  <p className="font-bold text-slate-700">Gradeup Study Academy — Comprehensive Mock Test Portal</p>
                  <p className="text-[10px] text-slate-400">Authentic Computer Evaluated Rankings & Accuracy Breakdown</p>
                </div>
                <div className="text-center sm:text-right">
                  <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-black text-[10px] uppercase">
                    ✓ Verified Scorecards
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
