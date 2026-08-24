import React, { useState } from 'react';
import { 
  Flag, 
  AlertTriangle, 
  CheckCircle2, 
  X, 
  Send, 
  HelpCircle, 
  MessageSquareWarning, 
  ShieldAlert,
  FileQuestion
} from 'lucide-react';
import { Question, ReportIssueType, Test } from '../../types';
import { dataService } from '../../services/dataService';
import { Modal } from '../common/Modal';

interface ReportMCQModalProps {
  isOpen: boolean;
  onClose: () => void;
  question: Question | null;
  test: Test | null;
  studentName?: string;
  studentMobile?: string;
  studentEmail?: string | null;
  onReportSubmitted?: (questionId: string) => void;
  onToast?: (type: 'success' | 'error' | 'info', msg: string) => void;
}

const ISSUE_OPTIONS: { type: ReportIssueType; title: string; subtitle: string; icon: string }[] = [
  {
    type: 'wrong_answer_key',
    title: 'Wrong Answer Key',
    subtitle: 'गलत उत्तर कुंजी (Marked answer is incorrect)',
    icon: '🎯'
  },
  {
    type: 'question_error',
    title: 'Question Incomplete / Error',
    subtitle: 'प्रश्न अधूरा या गलत है (Missing text, symbols or formula)',
    icon: '⚠️'
  },
  {
    type: 'typo_grammar',
    title: 'Typo or Translation Mistake',
    subtitle: 'वर्तनी या अनुवाद में त्रुटि (Spelling / language confusion)',
    icon: '📝'
  },
  {
    type: 'ambiguous_options',
    title: 'Ambiguous Options / Multiple Correct',
    subtitle: 'विकल्प अस्पष्ट या एकाधिक सही हैं (Options duplicated or confusing)',
    icon: '🔀'
  },
  {
    type: 'out_of_syllabus',
    title: 'Out of Syllabus',
    subtitle: 'पाठ्यक्रम से बाहर (Not relevant for this exam)',
    icon: '📚'
  },
  {
    type: 'other',
    title: 'Other Issue',
    subtitle: 'अन्य कोई तकनीकी या शैक्षणिक समस्या',
    icon: '💬'
  }
];

export const ReportMCQModal: React.FC<ReportMCQModalProps> = ({
  isOpen,
  onClose,
  question,
  test,
  studentName = 'Aspirant',
  studentMobile = '',
  studentEmail = '',
  onReportSubmitted,
  onToast
}) => {
  const [selectedIssue, setSelectedIssue] = useState<ReportIssueType>('wrong_answer_key');
  const [comment, setComment] = useState('');
  const [nameInput, setNameInput] = useState(studentName);
  const [mobileInput, setMobileInput] = useState(studentMobile);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Sync state when opened
  React.useEffect(() => {
    if (isOpen) {
      setIsSubmitted(false);
      setComment('');
      setSelectedIssue('wrong_answer_key');
      setNameInput(studentName || 'Aspirant');
      setMobileInput(studentMobile || '');
    }
  }, [isOpen, question?.id, studentName, studentMobile]);

  if (!isOpen || !question) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) {
      onToast?.('error', 'Please describe what needs correction in this question.');
      return;
    }

    setIsSubmitting(true);
    try {
      await dataService.submitQuestionReport({
        test_id: test?.id || question.test_id,
        test_title: test?.title || 'Mock Exam',
        question_id: question.id,
        question_number: question.question_number,
        question_text: question.question_text,
        option_a: question.option_a,
        option_b: question.option_b,
        option_c: question.option_c,
        option_d: question.option_d,
        correct_answer: question.correct_answer,
        explanation: question.explanation,
        student_name: nameInput.trim() || 'Aspirant',
        student_mobile: mobileInput.trim() || '',
        student_email: studentEmail || null,
        issue_type: selectedIssue,
        student_comment: comment.trim()
      });

      setIsSubmitted(true);
      onToast?.('success', 'Question report submitted! Our academic faculty will verify it.');
      onReportSubmitted?.(question.id);
      
      setTimeout(() => {
        onClose();
        setIsSubmitted(false);
      }, 1400);
    } catch (err: any) {
      onToast?.('error', err?.message || 'Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Report Question Error / प्रश्न में त्रुटि रिपोर्ट करें"
      maxWidth="2xl"
    >
      {isSubmitted ? (
        <div className="py-12 px-6 text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 rounded-full flex items-center justify-center mx-auto ring-8 ring-emerald-50 dark:ring-emerald-900/40 animate-bounce">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white">
            Report Submitted Successfully!
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            Thank you for bringing this to our attention. Our subject matter team will review and verify this question.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Question Summary Banner */}
          <div className="p-3.5 sm:p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="px-2.5 py-0.5 bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 rounded-lg text-xs font-black">
                Question #{question.question_number}
              </span>
              {test?.title && (
                <span className="text-xs text-slate-500 font-semibold truncate max-w-[200px] sm:max-w-xs">
                  {test.title}
                </span>
              )}
            </div>

            <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 line-clamp-2 leading-relaxed">
              {question.question_text}
            </p>

            <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px] text-slate-600 dark:text-slate-400">
              <div className="truncate"><b className="text-slate-700 dark:text-slate-300">A:</b> {question.option_a}</div>
              <div className="truncate"><b className="text-slate-700 dark:text-slate-300">B:</b> {question.option_b}</div>
              <div className="truncate"><b className="text-slate-700 dark:text-slate-300">C:</b> {question.option_c}</div>
              <div className="truncate"><b className="text-slate-700 dark:text-slate-300">D:</b> {question.option_d}</div>
            </div>
          </div>

          {/* Issue Categories Radio Grid */}
          <div className="space-y-2">
            <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Select Problem Category / समस्या का प्रकार चुनें <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ISSUE_OPTIONS.map((opt) => {
                const isSelected = selectedIssue === opt.type;
                return (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => setSelectedIssue(opt.type)}
                    className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 cursor-pointer ${
                      isSelected
                        ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-500 ring-2 ring-rose-400/30'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <span className="text-base shrink-0 mt-0.5">{opt.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-bold leading-tight ${isSelected ? 'text-rose-900 dark:text-rose-200' : 'text-slate-800 dark:text-slate-200'}`}>
                        {opt.title}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5">
                        {opt.subtitle}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Student Comment / Description */}
          <div className="space-y-1.5">
            <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Describe the Error / समस्या का विवरण दें <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="e.g. Correct answer should be Option B because... or There is a typo in the second sentence..."
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
            <p className="text-[11px] text-slate-400">
              Provide exact details or reference to help our team quickly verify and correct the question.
            </p>
          </div>

          {/* Student Info Footer Preview */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold">Reporting as:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{nameInput}</span>
              {mobileInput && <span className="text-slate-400">({mobileInput})</span>}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !comment.trim()}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Submitting...' : 'Submit Report'}</span>
              </button>
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
};
