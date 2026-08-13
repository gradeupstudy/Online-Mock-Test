import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Sparkles, Key, Plus, Trash2, CheckCircle, RefreshCw, AlertCircle, ArrowRight, BookOpen, Layers, Target, HelpCircle, ShieldCheck } from 'lucide-react';
import { aiService, AIGenerateParams } from '../../services/aiService';
import { Question } from '../../types';
import { dataService } from '../../services/dataService';

interface AIQuestionGeneratorModalProps {
  isOpen: boolean;
  testId: string;
  defaultSubject?: string;
  defaultSection?: string;
  availableSections?: string[];
  onClose: () => void;
  onSuccessImport: () => void;
  onToast?: (type: 'success' | 'error' | 'info', msg: string) => void;
}

export const AIQuestionGeneratorModal: React.FC<AIQuestionGeneratorModalProps> = ({
  isOpen,
  testId,
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

    const params: AIGenerateParams = {
      subject,
      section: section || 'General',
      chapter: chapter || 'General',
      topic: topic || 'General Topic',
      count,
      difficulty,
      customPrompt,
      testId,
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

  const handleConfirmImport = async () => {
    if (generatedQuestions.length === 0) return;

    const existing = await dataService.getQuestions(testId);
    let startNum = existing.length + 1;

    const newQuestions: Question[] = generatedQuestions.map((q) => ({
      ...q,
      question_number: startNum++,
    }));

    const combined = [...existing, ...newQuestions];
    await dataService.saveQuestions(testId, combined);

    onToast?.('success', `Added ${newQuestions.length} AI questions to mock test!`);
    onSuccessImport();
    setGeneratedQuestions([]);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="AI Mock Test Question Generator (Gemini Multi-Key Connected)" maxWidth="4xl">
      <div className="space-y-6">

        {/* GEMINI MULTI-KEY ROTATION HEADER & MANAGER TOGGLE */}
        <div className="bg-gradient-to-r from-indigo-900 via-blue-900 to-slate-900 p-5 rounded-2xl text-white shadow-md relative overflow-hidden">
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                  Gemini 3.6 Flash AI Engine
                </span>
              </div>
              <h3 className="text-lg font-black mt-1">Automatic Multi-Key Rotation Connected</h3>
              <p className="text-xs text-blue-200 mt-0.5">
                {savedKeys.length > 0
                  ? `Connected to ${savedKeys.length} Gemini API Key(s). If Key #1 expires or hits quota limit, Key #2 takes over automatically.`
                  : 'No Gemini API Keys added yet. Click Manage Keys below to paste your Gemini API Keys.'}
              </p>
            </div>

            <button
              onClick={() => setShowKeyManager(!showKeyManager)}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/20 backdrop-blur-md flex items-center gap-2 shrink-0 transition-all"
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
                Auto-Fallback Enabled
              </span>
            </div>

            <p className="text-xs text-slate-500">
              Paste your Gemini API Keys below (one key per line or separated by comma). The system will automatically switch to the next key whenever an expired or quota error happens.
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
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all"
              >
                Save API Keys
              </button>
            </div>
          </div>
        )}

        {/* INPUT FORM FOR GENERATION */}
        {generatedQuestions.length === 0 && (
          <form onSubmit={handleGenerateAI} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5 text-blue-500" /> Subject Name *
                </label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Indian Polity"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-amber-500" /> Section Name
                </label>
                {availableSections.length > 0 ? (
                  <select
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold"
                  >
                    {availableSections.map((sec, i) => (
                      <option key={i} value={sec}>{sec}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    placeholder="e.g. Reasoning Ability"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-amber-500 outline-hidden"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-emerald-500" /> Chapter Name
                </label>
                <input
                  type="text"
                  value={chapter}
                  onChange={(e) => setChapter(e.target.value)}
                  placeholder="e.g. Constitution"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                  <Target className="w-3.5 h-3.5 text-purple-500" /> Topic Name
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Fundamental Rights"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Number of Questions to Generate
                </label>
                <select
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold"
                >
                  <option value={5}>5 Questions</option>
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
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                >
                  <option value="Easy">Easy (Basic Concepts)</option>
                  <option value="Medium">Medium (Standard Exam Pattern)</option>
                  <option value="Hard">Hard (UPSC / State PCS Level)</option>
                  <option value="Mixed">Mixed (Balanced Easy/Med/Hard)</option>
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
                placeholder="e.g. Focus on Himachal Pradesh previous year questions pattern with detailed Hindi explanations..."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
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
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
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
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                <CheckCircle className="w-4 h-4" /> AI Generated {generatedQuestions.length} Questions Ready To Save
              </span>

              <button
                onClick={() => setGeneratedQuestions([])}
                className="text-xs text-blue-600 hover:underline font-bold flex items-center gap-1"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Re-generate
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3 bg-slate-50 dark:bg-slate-900/60">
              {generatedQuestions.map((q, idx) => (
                <div key={idx} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-2">
                  <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                    <span>Q{idx + 1}. {q.question_text}</span>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 rounded-md shrink-0">
                      Ans: {q.correct_answer}
                    </span>
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
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
              >
                Save {generatedQuestions.length} Questions to Test <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

      </div>
    </Modal>
  );
};
