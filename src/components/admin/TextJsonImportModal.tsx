import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { FileText, Upload, CheckCircle, AlertTriangle, Trash2, ArrowRight, Clipboard, HelpCircle } from 'lucide-react';
import { parseTextOrJsonQuestions, TextParseResult } from '../../utils/textParser';
import { Question } from '../../types';
import { dataService } from '../../services/dataService';

interface TextJsonImportModalProps {
  isOpen: boolean;
  testId: string;
  defaultSubject?: string;
  defaultSection?: string;
  availableSections?: string[];
  onClose: () => void;
  onSuccessImport: () => void;
  onToast?: (type: 'success' | 'error' | 'info', msg: string) => void;
}

export const TextJsonImportModal: React.FC<TextJsonImportModalProps> = ({
  isOpen,
  testId,
  defaultSubject = 'General Studies',
  defaultSection = 'General',
  availableSections = [],
  onClose,
  onSuccessImport,
  onToast,
}) => {
  const [activeTab, setActiveTab] = useState<'paste' | 'file'>('paste');
  const [targetSection, setTargetSection] = useState(defaultSection);
  const [customSectionInput, setCustomSectionInput] = useState('');
  const [rawText, setRawText] = useState('');
  const [result, setResult] = useState<TextParseResult | null>(null);
  const [parsing, setParsing] = useState(false);

  // Synchronize defaultSection if changed
  React.useEffect(() => {
    if (defaultSection) setTargetSection(defaultSection);
  }, [defaultSection]);

  const effectiveSection = targetSection === 'CUSTOM' ? customSectionInput || 'General' : targetSection;

  const handleParseText = () => {
    if (!rawText.trim()) {
      onToast?.('error', 'Please paste text or JSON first!');
      return;
    }
    setParsing(true);
    const parseRes = parseTextOrJsonQuestions(rawText, testId, defaultSubject, 'General', effectiveSection);
    setResult(parseRes);
    setParsing(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) {
          setRawText(content);
          setParsing(true);
          const parseRes = parseTextOrJsonQuestions(content, testId, defaultSubject, 'General', effectiveSection);
          setResult(parseRes);
          setParsing(false);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleConfirmImport = async () => {
    if (!result || result.questions.length === 0) return;

    const existing = await dataService.getQuestions(testId);
    let startNum = existing.length + 1;

    const newQuestions: Question[] = result.questions.map((q) => ({
      id: q.id || 'q-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      test_id: testId,
      question_number: startNum++,
      question_text: q.question_text || '',
      option_a: q.option_a || '',
      option_b: q.option_b || '',
      option_c: q.option_c || '',
      option_d: q.option_d || '',
      correct_answer: q.correct_answer || 'A',
      explanation: q.explanation || '',
      subject: q.subject || defaultSubject,
      chapter: q.chapter || 'General',
      section: q.section || effectiveSection,
      marks: q.marks || 1,
      negative_marks: q.negative_marks || 0.25,
    }));

    const combined = [...existing, ...newQuestions];
    await dataService.saveQuestions(testId, combined);

    onToast?.('success', `Successfully imported ${newQuestions.length} questions into section "${effectiveSection}"!`);
    onSuccessImport();
    handleReset();
    onClose();
  };

  const handleReset = () => {
    setRawText('');
    setResult(null);
  };

  const sampleTextFormat = `Q1. Who is known as the Father of Indian Constitution?
A) Mahatma Gandhi
B) Dr. B. R. Ambedkar
C) Jawaharlal Nehru
D) Sardar Patel
Ans: B
Explanation: Dr. Ambedkar was the Chairman of the Drafting Committee.

Q2. What is the capital of Himachal Pradesh?
A) Manali
B) Dharamshala
C) Shimla
D) Solan
Ans: C
Explanation: Shimla is the summer capital of HP.`;

  const sampleJsonFormat = `[
  {
    "question_text": "Which element has the chemical symbol Fe?",
    "option_a": "Gold",
    "option_b": "Iron",
    "option_c": "Silver",
    "option_d": "Copper",
    "correct_answer": "B",
    "explanation": "Fe stands for Ferrum (Iron).",
    "subject": "Chemistry",
    "chapter": "Elements"
  }
]`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Paste Text or JSON File Questions Import" maxWidth="4xl">
      <div className="space-y-6">
        
        {/* Section Selection Bar */}
        <div className="bg-amber-50 dark:bg-amber-950/40 p-3.5 rounded-2xl border border-amber-200 dark:border-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200">
              Assign Questions to Test Section *
            </label>
            <p className="text-[11px] text-amber-700 dark:text-amber-300">
              Select or enter which section these imported questions belong to.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={targetSection}
              onChange={(e) => setTargetSection(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 text-xs font-bold text-amber-900 dark:text-amber-100"
            >
              {availableSections.length > 0 ? (
                availableSections.map((sec, i) => (
                  <option key={i} value={sec}>{sec}</option>
                ))
              ) : (
                <>
                  <option value="General Studies">General Studies</option>
                  <option value="General Knowledge">General Knowledge</option>
                  <option value="Reasoning Ability">Reasoning Ability</option>
                  <option value="Quantitative Aptitude">Quantitative Aptitude</option>
                  <option value="General English">General English</option>
                  <option value="General Hindi">General Hindi</option>
                  <option value="Himachal Pradesh GK">Himachal Pradesh GK</option>
                </>
              )}
              <option value="CUSTOM">+ Custom Section Name...</option>
            </select>

            {targetSection === 'CUSTOM' && (
              <input
                type="text"
                placeholder="Type Section Name"
                value={customSectionInput}
                onChange={(e) => setCustomSectionInput(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 text-xs font-bold"
              />
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
          <button
            onClick={() => setActiveTab('paste')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'paste'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <Clipboard className="w-4 h-4" />
            <span>Paste Text or JSON</span>
          </button>

          <button
            onClick={() => setActiveTab('file')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'file'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Upload File (.txt / .json)</span>
          </button>
        </div>

        {/* Tab 1: Paste Text/JSON */}
        {activeTab === 'paste' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400">
                Paste Question Content Below
              </label>

              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setRawText(sampleTextFormat)}
                  className="text-blue-600 hover:underline font-semibold"
                >
                  Load Sample Text
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={() => setRawText(sampleJsonFormat)}
                  className="text-blue-600 hover:underline font-semibold"
                >
                  Load Sample JSON
                </button>
              </div>
            </div>

            <textarea
              rows={8}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Paste questions here in text or JSON format..."
              className="w-full px-3.5 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-hidden"
            />

            <div className="flex justify-end">
              <button
                onClick={handleParseText}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
              >
                <FileText className="w-4 h-4" />
                <span>Parse Questions</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Upload File */}
        {activeTab === 'file' && (
          <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-8 text-center hover:border-blue-500 transition-colors bg-slate-50 dark:bg-slate-800/40 space-y-3">
            <FileText className="w-12 h-12 text-slate-400 mx-auto" />
            <p className="font-bold text-slate-800 dark:text-slate-200 text-base">
              Select or Drop Question File (.txt or .json)
            </p>
            <p className="text-xs text-slate-500">
              Files containing plain text question blocks or JSON array format.
            </p>

            <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl cursor-pointer shadow-md transition-all">
              <Upload className="w-4 h-4" /> Browse File
              <input type="file" accept=".txt,.json" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        )}

        {/* Format Guidelines Box */}
        <div className="p-4 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-900 text-xs text-amber-900 dark:text-amber-200 space-y-1">
          <p className="font-bold flex items-center gap-1">
            <HelpCircle className="w-4 h-4 text-amber-600" /> Supported Formats & Section Guide:
          </p>
          <ul className="list-disc list-inside space-y-0.5 text-[11px] opacity-90">
            <li><b>Plain Text Format:</b> Question block followed by <code>A) ... B) ... C) ... D) ... Ans: B</code> and optional <code>Section: Reasoning Ability</code> or <code>Explanation: ...</code></li>
            <li><b>Multi-Section Text Header:</b> You can write <code>Section: Quantitative Aptitude</code> before a group of questions to switch section dynamically.</li>
            <li><b>JSON Format:</b> Array of objects with <code>question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, section</code></li>
          </ul>
        </div>

        {/* Parsing Indicator */}
        {parsing && (
          <div className="text-center py-4 text-xs text-slate-500 font-bold">
            Parsing question content...
          </div>
        )}

        {/* Parsing Errors */}
        {result && result.errors.length > 0 && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900 text-xs text-rose-900 dark:text-rose-200 space-y-1">
            <div className="flex items-center gap-2 font-bold text-sm text-rose-700 dark:text-rose-300">
              <AlertTriangle className="w-4 h-4" /> Format Warnings / Errors ({result.errors.length}):
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-[11px]">
              {result.errors.map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Parsed Live Preview Table */}
        {result && result.questions.length > 0 && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                <CheckCircle className="w-4 h-4" /> {result.questions.length} Valid Questions Extracted
              </span>
              <button
                onClick={handleReset}
                className="text-xs text-rose-500 hover:underline flex items-center gap-1 font-semibold"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear Preview
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0 font-semibold text-slate-600 dark:text-slate-300">
                  <tr>
                    <th className="p-2.5">#</th>
                    <th className="p-2.5">Question Text</th>
                    <th className="p-2.5">Options</th>
                    <th className="p-2.5">Answer</th>
                    <th className="p-2.5">Section</th>
                    <th className="p-2.5">Subject</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {result.questions.map((q, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="p-2.5 font-bold text-slate-500">{idx + 1}</td>
                      <td className="p-2.5 font-medium text-slate-900 dark:text-white line-clamp-2 max-w-xs">{q.question_text}</td>
                      <td className="p-2.5 text-slate-500">A: {q.option_a} | B: {q.option_b}</td>
                      <td className="p-2.5 font-bold text-emerald-600">{q.correct_answer}</td>
                      <td className="p-2.5 font-bold text-indigo-600 dark:text-indigo-400">{q.section || effectiveSection}</td>
                      <td className="p-2.5 text-slate-500">{q.subject}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:underline"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmImport}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
              >
                Confirm & Add {result.questions.length} Questions <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

      </div>
    </Modal>
  );
};
