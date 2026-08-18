import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { 
  Sparkles, 
  FileText, 
  CheckCircle, 
  Trash2, 
  ArrowRight, 
  RefreshCw, 
  BookOpen, 
  Layers, 
  Target, 
  Edit3,
  Check,
  Zap,
  HelpCircle,
  Upload,
  Shuffle
} from 'lucide-react';
import { Question } from '../../types';
import { aiService, shuffleAndBalanceQuestions } from '../../services/aiService';
import { dataService } from '../../services/dataService';

interface AISmartParseModalProps {
  isOpen: boolean;
  testId?: string;
  defaultSubject?: string;
  defaultSection?: string;
  availableSections?: string[];
  onClose: () => void;
  onSuccessImport: (importedQuestions?: Question[]) => void;
  onToast?: (type: 'success' | 'error' | 'info', msg: string) => void;
}

export const AISmartParseModal: React.FC<AISmartParseModalProps> = ({
  isOpen,
  testId,
  defaultSubject = 'General Studies',
  defaultSection = 'General',
  availableSections = [],
  onClose,
  onSuccessImport,
  onToast,
}) => {
  const [rawText, setRawText] = useState('');
  const [subject, setSubject] = useState(defaultSubject);
  const [section, setSection] = useState(defaultSection);
  const [chapter, setChapter] = useState('');
  const [topic, setTopic] = useState('');

  const [parsing, setParsing] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [parsedQuestions, setParsedQuestions] = useState<Question[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  React.useEffect(() => {
    if (isOpen) {
      setSubject(defaultSubject);
      setSection(defaultSection);
    }
  }, [isOpen, defaultSubject, defaultSection]);

  const handleRunSmartParse = async () => {
    if (!rawText.trim()) {
      onToast?.('error', 'Please paste question paper text or questions first!');
      return;
    }

    setParsing(true);
    setLogs([]);
    setParsedQuestions([]);

    try {
      const result = await aiService.smartParseQuestions({
        rawText,
        defaultSubject: subject || 'General Studies',
        defaultSection: subject || 'General',
        defaultChapter: chapter || 'General',
        defaultTopic: chapter || 'General',
        testId: testId || 'bank',
        onLog: (msg) => setLogs((prev) => [...prev, msg]),
      });

      setParsedQuestions(result);
      setSelectedIndices(new Set(result.map((_, i) => i)));
      onToast?.('success', `AI Smart Parse identified ${result.length} questions!`);
    } catch (err: any) {
      const msg = err?.message || 'Failed to parse text.';
      onToast?.('error', msg);
      setLogs((prev) => [...prev, `❌ Error: ${msg}`]);
    } finally {
      setParsing(false);
    }
  };

  const toggleSelect = (idx: number) => {
    const next = new Set(selectedIndices);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    setSelectedIndices(next);
  };

  const toggleSelectAll = () => {
    if (selectedIndices.size === parsedQuestions.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(parsedQuestions.map((_, i) => i)));
    }
  };

  const handleShuffleOptions = () => {
    if (parsedQuestions.length === 0) return;
    const shuffled = shuffleAndBalanceQuestions(parsedQuestions);
    setParsedQuestions(shuffled);
    onToast?.('success', '🔀 Shuffled all options! Correct answers are now balanced across A, B, C, D.');
  };

  const handleConfirmSave = async () => {
    const toImport = parsedQuestions.filter((_, idx) => selectedIndices.has(idx));
    if (toImport.length === 0) {
      onToast?.('error', 'No questions selected to import!');
      return;
    }

    if (testId && testId !== 'bank') {
      const existing = await dataService.getQuestions(testId);
      let startNum = existing.length + 1;
      const renumbered: Question[] = toImport.map((q) => ({
        ...q,
        test_id: testId,
        question_number: startNum++,
      }));
      const combined = [...existing, ...renumbered];
      await dataService.saveQuestions(testId, combined);
      onToast?.('success', `Imported ${renumbered.length} questions to Mock Test!`);
    } else {
      for (const q of toImport) {
        await dataService.saveQuestionToBank({
          ...q,
          test_id: 'bank',
        });
      }
      onToast?.('success', `Imported ${toImport.length} questions to Question Bank!`);
    }

    onSuccessImport(toImport);
    setParsedQuestions([]);
    setRawText('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="AI Smart Parse (Auto Extract from Text / PDF / Papers)" maxWidth="5xl">
      <div className="space-y-6">

        {/* TOP BANNER */}
        <div className="bg-gradient-to-r from-teal-900 via-emerald-950 to-slate-900 text-white p-5 rounded-2xl border border-emerald-500/30 shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-400 text-slate-950 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                  <Zap className="w-3 h-3 fill-slate-950" /> Gemini Smart OCR & NLP
                </span>
              </div>
              <h3 className="text-lg font-black mt-1">Smart Question Paper Parser</h3>
              <p className="text-xs text-emerald-200 mt-0.5">
                Paste any unstructured question text, exam paper, copy-pasted MCQs, or mixed Hindi/English questions. Gemini will automatically structure, extract keys & generate explanations.
              </p>
            </div>
          </div>
        </div>

        {/* INPUT STAGE */}
        {parsedQuestions.length === 0 && (
          <div className="space-y-4">

            {/* DEFAULT TAXONOMY METADATA */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5 text-blue-500" /> Default Subject
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. English Grammar, General Studies..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-emerald-500" /> Chapter Name (Optional)
                </label>
                <input
                  type="text"
                  value={chapter}
                  onChange={(e) => setChapter(e.target.value)}
                  placeholder="e.g. Noun, Tenses, Rivers..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 outline-hidden"
                />
              </div>
            </div>

            {/* RAW TEXTAREA */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400">
                Paste Raw Exam Text / Questions Here
              </label>
              <textarea
                rows={9}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Example:
1. Which of the following is a collective noun?
(A) Army
(B) Honesty
(C) Iron
(D) Gold
Answer: A
Explanation: 'Army' represents a group of soldiers, hence collective noun.

2. प्र. भारत के संविधान की आत्मा किसे कहा जाता है?
(क) मौलिक अधिकार
(ख) प्रस्तावना
(ग) नीति निदेशक तत्व
(घ) मौलिक कर्तव्य
उत्तर: (ख)"
                className="w-full px-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono focus:ring-2 focus:ring-emerald-500 outline-hidden leading-relaxed"
              />
            </div>

            {/* LOGS */}
            {logs.length > 0 && (
              <div className="p-3 bg-slate-900 rounded-xl font-mono text-xs text-slate-300 space-y-1 max-h-36 overflow-y-auto">
                {logs.map((log, i) => (
                  <div key={i}>{log}</div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:underline"
              >
                Cancel
              </button>
              <button
                onClick={handleRunSmartParse}
                disabled={parsing}
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {parsing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-emerald-200" />
                    <span>Parsing with AI...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-emerald-200" />
                    <span>Auto Parse Questions with AI</span>
                  </>
                )}
              </button>
            </div>

          </div>
        )}

        {/* PARSED QUESTIONS PREVIEW TABLE */}
        {parsedQuestions.length > 0 && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-100 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleSelectAll}
                  className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  {selectedIndices.size === parsedQuestions.length ? 'Deselect All' : 'Select All'}
                </button>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  {selectedIndices.size} of {parsedQuestions.length} Selected
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleShuffleOptions}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Shuffle option positions across all parsed questions to randomize correct answers"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  <span>Shuffle Options</span>
                </button>

                <button
                  onClick={() => setParsedQuestions([])}
                  className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-bold flex items-center gap-1 px-2 py-1 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Paste Again
                </button>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3 bg-slate-50 dark:bg-slate-900/60">
              {parsedQuestions.map((q, idx) => (
                <div 
                  key={idx} 
                  className={`bg-white dark:bg-slate-800 p-4 rounded-xl border transition-all text-xs space-y-2 ${selectedIndices.has(idx) ? 'border-emerald-500 shadow-xs ring-1 ring-emerald-500/20' : 'border-slate-200 dark:border-slate-700 opacity-60'}`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedIndices.has(idx)}
                      onChange={() => toggleSelect(idx)}
                      className="mt-1 w-4 h-4 rounded text-emerald-600 cursor-pointer"
                    />
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-bold text-slate-900 dark:text-white text-sm">
                          Q{idx + 1}. {q.question_text}
                        </span>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 rounded-md font-bold shrink-0">
                          Ans: {q.correct_answer}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-slate-600 dark:text-slate-300">
                        <div>A. {q.option_a}</div>
                        <div>B. {q.option_b}</div>
                        <div>C. {q.option_c}</div>
                        <div>D. {q.option_d}</div>
                      </div>

                      {q.explanation && (
                        <div className="text-[11px] text-amber-900 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-2 rounded-lg">
                          <b>Explanation:</b> {q.explanation}
                        </div>
                      )}

                      <div className="flex items-center gap-2 pt-1 text-[10px] text-slate-400">
                        <span>Subject: {q.subject}</span>
                        {q.section && <span>• Section: {q.section}</span>}
                        {q.chapter && <span>• Chapter: {q.chapter}</span>}
                        {q.topic && <span>• Topic: {q.topic}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setParsedQuestions([])}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:underline"
              >
                Discard
              </button>
              <button
                onClick={handleConfirmSave}
                disabled={selectedIndices.size === 0}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4" /> Save {selectedIndices.size} Questions {testId && testId !== 'bank' ? 'to Test' : 'to Question Bank'}
              </button>
            </div>
          </div>
        )}

      </div>
    </Modal>
  );
};
