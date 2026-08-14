import React from 'react';
import { Clock, Award, AlertTriangle, CheckCircle, ShieldCheck, FileText, ArrowRight, ArrowLeft } from 'lucide-react';
import { Test } from '../../types';

interface TestIntroProps {
  test: Test;
  onBack: () => void;
  onProceedToSocialGate: () => void;
}

export const TestIntro: React.FC<TestIntroProps> = ({ test, onBack, onProceedToSocialGate }) => {
  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      
      {/* Top Back Navigation */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Test Directory
      </button>

      {/* Test Title Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="px-3 py-1 bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200 text-xs font-bold rounded-lg border border-blue-200 dark:border-blue-900">
            {test.category}
          </span>
          <span className="text-xs font-mono font-bold text-slate-400">
            CODE: {test.exam_code || test.test_code}
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
          {test.title}
        </h1>

        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          {test.description}
        </p>

        {/* Stats Summary Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase">Time Allowed</p>
            <p className="text-lg font-black text-slate-900 dark:text-white mt-0.5">{test.duration_minutes} Mins</p>
          </div>

          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase">Total Questions</p>
            <p className="text-lg font-black text-slate-900 dark:text-white mt-0.5">{test.total_questions}</p>
          </div>

          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase">Total Marks</p>
            <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{test.total_marks}</p>
          </div>

          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase">Negative Marking</p>
            <p className="text-lg font-black text-rose-600 dark:text-rose-400 mt-0.5">-{test.negative_marking}</p>
          </div>
        </div>
      </div>

      {/* Rules & Instructions */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <ShieldCheck className="w-5 h-5 text-blue-600" /> Exam Rules & Marking Scheme
        </h2>

        <div className="space-y-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
          <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-slate-900 dark:text-white">Correct Answer Score</p>
              <p className="text-xs text-slate-500">Each question carries +{test.marks_per_question} marks.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-slate-900 dark:text-white">Negative Marking Policy</p>
              <p className="text-xs text-slate-500">For each incorrect attempt, {test.negative_marking} marks will be deducted from your total score.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
            <Clock className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-slate-900 dark:text-white">Timer & Auto-Submit</p>
              <p className="text-xs text-slate-500">The exam countdown timer runs continuously. The test will auto-submit once timer reaches 00:00.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
            <FileText className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-slate-900 dark:text-white">Question Palette Status Codes</p>
              <ul className="text-xs text-slate-500 mt-1 space-y-1 list-disc list-inside">
                <li><span className="font-bold text-slate-700 dark:text-slate-200">White/Gray:</span> Not Visited</li>
                <li><span className="font-bold text-rose-600">Red:</span> Visited but Not Answered</li>
                <li><span className="font-bold text-emerald-600">Green:</span> Answered</li>
                <li><span className="font-bold text-purple-600">Purple:</span> Marked for Review</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            onClick={onProceedToSocialGate}
            className="w-full sm:w-auto px-6 sm:px-8 py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Agree & Proceed to Registration</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>

    </div>
  );
};
