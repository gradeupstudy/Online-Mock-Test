import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { 
  Sparkles, 
  Key, 
  Plus, 
  Trash2, 
  CheckCircle, 
  RefreshCw, 
  AlertCircle, 
  ArrowRight, 
  BookOpen, 
  Layers, 
  Target, 
  HelpCircle, 
  ShieldCheck,
  Check,
  Zap,
  Shuffle
} from 'lucide-react';
import { aiService, AIGenerateParams, shuffleAndBalanceQuestions, shuffleQuestionOptions } from '../../services/aiService';
import { Question } from '../../types';
import { dataService } from '../../services/dataService';

interface AIQuestionGeneratorModalProps {
  isOpen: boolean;
  testId?: string;
  testNegativeMarking?: number;
  testMarksPerQuestion?: number;
  defaultSubject?: string;
  defaultSection?: string;
  availableSections?: string[];
  onClose: () => void;
  onSuccessImport: (newQuestions?: Question[]) => void;
  onToast?: (type: 'success' | 'error' | 'info', msg: string) => void;
}

const POPULAR_SUBJECTS = [
  'General Studies',
  'English Grammar',
  'General English',
  'Reasoning Ability',
  'Quantitative Aptitude',
  'Himachal Pradesh GK',
  'Indian Polity & Constitution',
  'General Science',
  'General Hindi',
  'Current Affairs'
];

export const AIQuestionGeneratorModal: React.FC<AIQuestionGeneratorModalProps> = ({
  isOpen,
  testId,
  testNegativeMarking,
  testMarksPerQuestion,
  defaultSubject = 'General Studies',
  defaultSection = 'General',
  availableSections = [],
  onClose,
  onSuccessImport,
  onToast,
}) => {
  // Input Form States
  const [subject, setSubject] = useState(defaultSubject);
  const [section, setSection] = useState(defaultSection);
  const [chapter, setChapter] = useState('');
  const [topic, setTopic] = useState('');
  const [count, setCount] = useState(5);
  const [difficulty, setDifficulty] = useState('Medium');
  const [customPrompt, setCustomPrompt] = useState('');

  // API Key Management State
  const [showKeyManager, setShowKeyManager] = useState(false);
  const [apiKeysInput, setApiKeysInput] = useState('');
  const [savedKeys, setSavedKeys] = useState<string[]>([]);

  // Generation & Status States
  const [generating, setGenerating] = useState(false);
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [generatedQuestions, setGeneratedQuestions] = useState<Question[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadKeys();
      setSubject(defaultSubject);
      setSection(defaultSection);
    }
  }, [isOpen, defaultSubject, defaultSection]);

  const loadKeys = () => {
    const keys = aiService.getStoredApiKeys();
    setSavedKeys(keys);
    setApiKeysInput(keys.join('\n'));
  };

  const handleSaveKeys = () => {
    const splitKeys = apiKeysInput
      .split('\n')
      .flatMap((k) => k.split(','))
      .map((k) => k.trim())
      .filter(Boolean);

    aiService.saveApiKeys(splitKeys);
    setSavedKeys(splitKeys);
    onToast?.('success', `Saved ${splitKeys.length} Gemini API Key(s)! Multi-key fallback enabled.`);
    setShowKeyManager(false);
  };

  const handleGenerateAI = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subject.trim()) {
      onToast?.('error', 'Please enter Subject name!');
      return;
    }

    if (savedKeys.length === 0) {
      onToast?.('error', 'No Gemini API Keys found! Please click "Manage API Keys" to add at least 1 key.');
      setShowKeyManager(true);
      return;
    }

    setGenerating(true);
    setLogs([]);
    setGeneratedQuestions([]);

    let targetNegMarks = 0;
    let targetMarks = 1;
    if (testId && testId !== 'bank') {
      if (testNegativeMarking !== undefined) {
        targetNegMarks = testNegativeMarking;
      } else {
        const tObj = await dataService.getTestBySlugOrId(testId);
        targetNegMarks = tObj ? Number(tObj.negative_marking) || 0 : 0;
      }
      if (testMarksPerQuestion !== undefined) {
        targetMarks = testMarksPerQuestion;
      }
    }

    const params: AIGenerateParams = {
      subject: subject.trim(),
      section: subject.trim() || 'General',
      chapter: chapter.trim() || 'General',
      topic: chapter.trim() || 'General',
      count,
      difficulty,
      customPrompt,
      testId: testId || 'bank',
      negativeMarks: targetNegMarks,
      marks: targetMarks,
      onLog: (msg) => {
        setLogs((prev) => [...prev, msg]);
      },
    };

    try {
      const result = await aiService.generateQuestions(params);
      setGeneratedQuestions(result);
      onToast?.('success', `Successfully generated ${result.length} AI questions!`);
    } catch (err: any) {
      const errorMsg = err?.message || 'Failed to generate questions.';
      onToast?.('error', errorMsg);
      setLogs((prev) => [...prev, `❌ Error: ${errorMsg}`]);
    } finally {
      setGenerating(false);
    }
  };

  const handleShuffleOptions = () => {
    if (generatedQuestions.length === 0) return;
    const shuffled = shuffleAndBalanceQuestions(generatedQuestions);
    setGeneratedQuestions(shuffled);
    onToast?.('success', '🔀 Shuffled all options! Correct answers are now evenly distributed across A, B, C, D.');
  };

  const handleRegenerateSinglePreview = async (index: number) => {
    const targetQ = generatedQuestions[index];
    if (!targetQ) return;

    try {
      setRegeneratingIndex(index);
      const newQ = await aiService.regenerateSingleQuestion(targetQ);
      setGeneratedQuestions((prev) =>
        prev.map((item, idx) => (idx === index ? { ...newQ, question_number: idx + 1 } : item))
      );
      onToast?.('success', `✨ Regenerated Q${index + 1} with a fresh AI question!`);
    } catch (err: any) {
      console.error('Failed to regenerate preview question', err);
      onToast?.('error', err?.message || 'Failed to regenerate question.');
    } finally {
      setRegeneratingIndex(null);
    }
  };

  const getAnswerDistribution = () => {
    const counts = { A: 0, B: 0, C: 0, D: 0 };
    generatedQuestions.forEach((q) => {
      const ans = (q.correct_answer?.toUpperCase() || 'A') as 'A' | 'B' | 'C' | 'D';
      if (counts[ans] !== undefined) counts[ans]++;
    });
    return counts;
  };

  const handleConfirmImport = async () => {
    if (generatedQuestions.length === 0) return;

    if (testId && testId !== 'bank') {
      const existing = await dataService.getQuestions(testId);
      const tObj = await dataService.getTestBySlugOrId(testId);
      const testNeg = testNegativeMarking !== undefined ? testNegativeMarking : (tObj ? Number(tObj.negative_marking) || 0 : 0);
      const testMarks = testMarksPerQuestion !== undefined ? testMarksPerQuestion : (tObj ? Number(tObj.marks_per_question) || 1 : 1);
      let startNum = existing.length + 1;

      const newQuestions: Question[] = generatedQuestions.map((q) => ({
        ...q,
        test_id: testId,
        question_number: startNum++,
        negative_marks: testNeg,
        marks: testMarks,
      }));

      const combined = [...existing, ...newQuestions];
      await dataService.saveQuestions(testId, combined);
      onToast?.('success', `Added ${newQuestions.length} AI questions to mock test!`);
      onSuccessImport(newQuestions);
    } else {
      for (const q of generatedQuestions) {
        await dataService.saveQuestionToBank({
          ...q,
          test_id: 'bank',
          negative_marks: 0,
          marks: 1,
        });
      }
      onToast?.('success', `Saved ${generatedQuestions.length} AI questions to Question Bank!`);
      onSuccessImport(generatedQuestions);
    }

    setGeneratedQuestions([]);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="AI Mock Test Question Generator (Gemini 3.7 Flash + Fallback)" maxWidth="4xl">
      <div className="space-y-6">

        {/* GEMINI MULTI-KEY & MULTI-MODEL ROTATION HEADER */}
        <div className="bg-gradient-to-r from-indigo-900 via-blue-900 to-slate-900 p-5 rounded-2xl text-white shadow-md relative overflow-hidden">
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                  <Zap className="w-3 h-3 fill-slate-950" /> Gemini 3.7 Flash Primary
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold uppercase tracking-wider">
                  Auto Model Fallback
                </span>
              </div>
              <h3 className="text-lg font-black mt-1">Multi-Model & Multi-Key Failover Engine</h3>
              <p className="text-xs text-blue-200 mt-0.5">
                {savedKeys.length > 0
                  ? `Active on ${savedKeys.length} Gemini API Key(s). Uses Gemini 3.7 Flash first; if 3.7 Flash experiences high demand (503/429), it auto-cascades to fallback models instantly.`
                  : 'No Gemini API Keys added yet. Click Manage Keys below to paste your Gemini API Keys.'}
              </p>
            </div>

            <button
              onClick={() => setShowKeyManager(!showKeyManager)}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/20 backdrop-blur-md flex items-center gap-2 shrink-0 transition-all cursor-pointer"
            >
              <Key className="w-4 h-4 text-amber-400" />
              <span>{showKeyManager ? 'Close Key Manager' : `Manage API Keys (${savedKeys.length})`}</span>
            </button>
          </div>
        </div>

        {/* EXPANDABLE MULTI-KEY MANAGEMENT BOX */}
        {showKeyManager && (
          <div className="p-5 bg-slate-50 dark:bg-slate-800/90 rounded-2xl border-2 border-indigo-500/40 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                  Gemini API Keys Manager (Paste Multiple Keys)
                </h4>
              </div>
              <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950 px-2.5 py-1 rounded-lg">
                Multi-Key & Model Cascade Active
              </span>
            </div>

            <p className="text-xs text-slate-500">
              Paste your Gemini API Keys below (one key per line or separated by comma). The system prioritizes Gemini 3.7 Flash and automatically shifts to fallback models and rotates through your API keys if high demand (503/429) or quota errors occur.
            </p>

            <textarea
              rows={4}
              value={apiKeysInput}
              onChange={(e) => setApiKeysInput(e.target.value)}
              placeholder="Paste Gemini API Keys here (e.g. AIzaSyA...\nAIzaSyB...)"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono focus:ring-2 focus:ring-indigo-500 outline-hidden"
            />

            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-slate-400">
                Found {savedKeys.length} configured key(s)
              </span>
              <button
                onClick={handleSaveKeys}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all cursor-pointer"
              >
                Save API Keys
              </button>
            </div>
          </div>
        )}

        {/* INPUT FORM FOR GENERATION */}
        {generatedQuestions.length === 0 && (
          <form onSubmit={handleGenerateAI} className="space-y-4">
            
            {/* SUBJECT & CHAPTER ROW */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                    <BookOpen className="w-4 h-4" /> 1. Subject Name *
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">e.g. English Grammar</span>
                </label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. English Grammar, General Studies..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
                {/* Popular chips */}
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {POPULAR_SUBJECTS.slice(0, 4).map((sub, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSubject(sub)}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                    >
                      {sub}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <Layers className="w-4 h-4" /> 2. Chapter Name
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">e.g. Noun, Tenses, Rivers</span>
                </label>
                <input
                  type="text"
                  value={chapter}
                  onChange={(e) => setChapter(e.target.value)}
                  placeholder="e.g. Noun, Tenses, Indian Constitution, Rivers..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 outline-hidden"
                />
                <p className="text-[10px] text-slate-400 mt-1.5">
                  Specify topic/chapter to generate targeted exam questions.
                </p>
              </div>
            </div>

            {/* COUNT & DIFFICULTY */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Number of Questions to Generate
                </label>
                <select
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold"
                >
                  <option value={5}>5 Questions (Fastest)</option>
                  <option value={10}>10 Questions</option>
                  <option value={15}>15 Questions</option>
                  <option value={20}>20 Questions</option>
                  <option value={25}>25 Questions</option>
                  <option value={30}>30 Questions</option>
                  <option value={50}>50 Questions</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Difficulty Level
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold"
                >
                  <option value="Easy">Easy (Basic Concepts)</option>
                  <option value="Medium">Medium (Standard Exam Pattern)</option>
                  <option value="Hard">Hard (State PCS / UPSC Level)</option>
                  <option value="Mixed">Mixed (Balanced Easy / Medium / Hard)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                Custom AI Instructions / Exam Focus (Optional)
              </label>
              <textarea
                rows={2}
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="e.g. Focus on previous year questions pattern with detailed bilingual explanations..."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
              />
            </div>

            {/* GENERATION STATUS LOGS */}
            {logs.length > 0 && (
              <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 space-y-1 max-h-40 overflow-y-auto">
                <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-1">
                  Execution & Key Rotation Logs:
                </p>
                {logs.map((log, idx) => (
                  <div key={idx} className="leading-relaxed">
                    {log}
                  </div>
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
                type="submit"
                disabled={generating}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {generating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-amber-300" />
                    <span>Generating Questions with AI...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Generate {count} MCQs Now</span>
                  </>
                )}
              </button>
            </div>

          </form>
        )}

        {/* GENERATED QUESTIONS PREVIEW TABLE */}
        {generatedQuestions.length > 0 && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-100 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4" /> {generatedQuestions.length} Questions Ready
                </span>

                {/* Answer Distribution Pills */}
                {(() => {
                  const dist = getAnswerDistribution();
                  return (
                    <div className="flex items-center gap-1 text-[11px] font-bold bg-white dark:bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                      <span className="text-slate-400 font-normal mr-1">Answer Keys:</span>
                      <span className="text-blue-600 font-extrabold">A:{dist.A}</span>
                      <span className="text-slate-300">•</span>
                      <span className="text-emerald-600 font-extrabold">B:{dist.B}</span>
                      <span className="text-slate-300">•</span>
                      <span className="text-purple-600 font-extrabold">C:{dist.C}</span>
                      <span className="text-slate-300">•</span>
                      <span className="text-amber-600 font-extrabold">D:{dist.D}</span>
                    </div>
                  );
                })()}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleShuffleOptions}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Shuffle option positions across all questions to randomize correct answers"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  <span>Shuffle Options (Randomize Keys)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setGeneratedQuestions([])}
                  className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-bold flex items-center gap-1 px-2 py-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Re-generate
                </button>
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3 bg-slate-50 dark:bg-slate-900/60">
              {generatedQuestions.map((q, idx) => (
                <div key={idx} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-2">
                  <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white gap-2">
                    <span className="flex-1">Q{idx + 1}. {q.question_text}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleRegenerateSinglePreview(idx)}
                        disabled={regeneratingIndex === idx}
                        className="px-2 py-0.5 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-bold text-[11px] rounded-md border border-purple-200 dark:border-purple-800 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        title="Regenerate this specific question with AI"
                      >
                        <RefreshCw className={`w-3 h-3 text-purple-600 dark:text-purple-400 ${regeneratingIndex === idx ? 'animate-spin' : ''}`} />
                        <span>{regeneratingIndex === idx ? 'Regenerating...' : 'Regenerate'}</span>
                      </button>
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 rounded-md shrink-0 font-bold">
                        Ans: {q.correct_answer}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-300">
                    <div>A. {q.option_a}</div>
                    <div>B. {q.option_b}</div>
                    <div>C. {q.option_c}</div>
                    <div>D. {q.option_d}</div>
                  </div>

                  {q.explanation && (
                    <div className="text-[11px] text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-2 rounded-lg">
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
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setGeneratedQuestions([])}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:underline"
              >
                Discard
              </button>
              <button
                onClick={handleConfirmImport}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                Save {generatedQuestions.length} Questions {testId && testId !== 'bank' ? 'to Test' : 'to Question Bank'} <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

      </div>
    </Modal>
  );
};
