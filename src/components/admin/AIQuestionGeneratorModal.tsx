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
  Shuffle,
  Dna,
  Languages,
  Globe
} from 'lucide-react';
import { 
  aiService, 
  AIGenerateParams, 
  shuffleAndBalanceQuestions, 
  shuffleQuestionOptions,
  sanitizeBilingualQuestionFields 
} from '../../services/aiService';
import { Question } from '../../types';
import { dataService } from '../../services/dataService';
import { MCQInspectionModal } from './MCQInspectionModal';
import { BulkMCQInspectionModal } from './BulkMCQInspectionModal';
import { duxqeMutationEngine } from '../../services/duxqeMutationEngine';
import { DUXQEMutateModal } from './DUXQEMutateModal';

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
  const [useDUXQEGuard, setUseDUXQEGuard] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);
  const [mutatingQuestion, setMutatingQuestion] = useState<Question | null>(null);
  const [mutatingIndex, setMutatingIndex] = useState<number | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [generatedQuestions, setGeneratedQuestions] = useState<Question[]>([]);

  // Selection & Dual Language Conversion States
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [isConvertingDualLang, setIsConvertingDualLang] = useState(false);
  const [convertingSingleIndex, setConvertingSingleIndex] = useState<number | null>(null);
  const [dualLangProgress, setDualLangProgress] = useState<{ done: number; total: number; message: string } | null>(null);

  // 360° AI Inspection States
  const [inspectingQuestion, setInspectingQuestion] = useState<Question | null>(null);
  const [isBulkInspectOpen, setIsBulkInspectOpen] = useState(false);

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
      let result: Question[] = [];
      if (useDUXQEGuard) {
        setLogs((prev) => [...prev, '🧬 [DU-XQE] Loading Question Bank knowledge vectors for anti-repetition check...']);
        const bankQuestions = await dataService.getAllQuestionBank();
        const testQuestions = testId && testId !== 'bank' ? await dataService.getQuestions(testId) : [];
        const existingPool = [...bankQuestions, ...testQuestions];

        result = await duxqeMutationEngine.generateUniqueQuestionsDUXQE(params, existingPool);
        onToast?.('success', `✨ Generated ${result.length} unique questions with DU-XQE Anti-Repetition Guard!`);
      } else {
        result = await aiService.generateQuestions(params);
        onToast?.('success', `Successfully generated ${result.length} AI questions!`);
      }
      setGeneratedQuestions(result);
      // Select all by default so user can convert or perform actions easily
      setSelectedIndices(new Set(result.map((_, i) => i)));
    } catch (err: any) {
      const errorMsg = err?.message || 'Failed to generate questions.';
      onToast?.('error', errorMsg);
      setLogs((prev) => [...prev, `❌ Error: ${errorMsg}`]);
    } finally {
      setGenerating(false);
    }
  };

  const handleToggleSelectQuestion = (index: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (selectedIndices.size === generatedQuestions.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(generatedQuestions.map((_, i) => i)));
    }
  };

  const handleConvertToDualLanguage = async (onlySelected = false) => {
    if (generatedQuestions.length === 0) return;
    if (savedKeys.length === 0) {
      onToast?.('error', 'Please configure your Gemini API Key first.');
      setShowKeyManager(true);
      return;
    }

    const targetIndices = onlySelected && selectedIndices.size > 0
      ? Array.from(selectedIndices).map(Number).sort((a, b) => a - b)
      : generatedQuestions.map((_, i) => i);

    if (targetIndices.length === 0) {
      onToast?.('info', 'Please select at least 1 question to convert.');
      return;
    }

    const questionsToConvert = targetIndices.map((idx) => {
      const q = generatedQuestions[idx];
      const sanitized = sanitizeBilingualQuestionFields(q.question_text, q.question_hi, 'bilingual');
      return {
        ...q,
        question_text: sanitized.question_text,
        question_hi: sanitized.question_hi,
      };
    });

    setIsConvertingDualLang(true);
    setDualLangProgress({
      done: 0,
      total: questionsToConvert.length,
      message: `Initializing Dual Language translation engine for ${questionsToConvert.length} MCQs...`
    });

    try {
      const convertedResults = await aiService.bulkConvertToDualLanguageMCQs(
        questionsToConvert,
        'bilingual',
        (done, total, logMsg) => {
          setDualLangProgress({ done, total, message: logMsg });
        }
      );

      setGeneratedQuestions((prev) => {
        const updated = [...prev];
        targetIndices.forEach((origIdx, cIdx) => {
          const conv = convertedResults[cIdx];
          if (conv) {
            const sanitized = sanitizeBilingualQuestionFields(
              conv.question_text || updated[origIdx].question_text,
              conv.question_hi,
              'bilingual'
            );
            updated[origIdx] = {
              ...updated[origIdx],
              question_text: sanitized.question_text,
              question_hi: sanitized.question_hi || '',
              option_a: conv.option_a || updated[origIdx].option_a,
              option_b: conv.option_b || updated[origIdx].option_b,
              option_c: conv.option_c || updated[origIdx].option_c,
              option_d: conv.option_d || updated[origIdx].option_d,
              correct_answer: conv.correct_answer || updated[origIdx].correct_answer,
              explanation: conv.explanation || updated[origIdx].explanation,
            };
          }
        });
        return updated;
      });

      onToast?.('success', `🎉 Successfully converted ${convertedResults.length} MCQs into Dual Language (English + Hindi)!`);
    } catch (err: any) {
      console.error('Dual Language conversion failed:', err);
      onToast?.('error', 'Dual Language conversion failed: ' + (err?.message || err));
    } finally {
      setIsConvertingDualLang(false);
      setDualLangProgress(null);
    }
  };

  const handleConvertSingleToDualLanguage = async (idx: number) => {
    const q = generatedQuestions[idx];
    if (!q) return;

    if (savedKeys.length === 0) {
      onToast?.('error', 'Please configure your Gemini API Key first.');
      setShowKeyManager(true);
      return;
    }

    try {
      setConvertingSingleIndex(idx);
      onToast?.('info', `Translating Q${idx + 1} to Dual Language (English + Hindi)...`);
      const sanitizedInput = sanitizeBilingualQuestionFields(q.question_text, q.question_hi, 'bilingual');
      const res = await aiService.convertSingleToDualLanguage({
        ...q,
        question_text: sanitizedInput.question_text,
        question_hi: sanitizedInput.question_hi,
      }, 'bilingual');

      const sanitizedRes = sanitizeBilingualQuestionFields(
        res.question_text || q.question_text,
        res.question_hi,
        'bilingual'
      );

      setGeneratedQuestions((prev) =>
        prev.map((item, i) =>
          i === idx
            ? {
                ...item,
                question_text: sanitizedRes.question_text,
                question_hi: sanitizedRes.question_hi || '',
                option_a: res.option_a || item.option_a,
                option_b: res.option_b || item.option_b,
                option_c: res.option_c || item.option_c,
                option_d: res.option_d || item.option_d,
                correct_answer: res.correct_answer || item.correct_answer,
                explanation: res.explanation || item.explanation,
              }
            : item
        )
      );
      onToast?.('success', `Converted Q${idx + 1} into Dual Language (English + Hindi)!`);
    } catch (err: any) {
      console.error('Failed to convert question to dual language:', err);
      onToast?.('error', err?.message || 'Failed to convert question.');
    } finally {
      setConvertingSingleIndex(null);
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

  const handleApplySingleInspection = (updatedQuestion: Question) => {
    setGeneratedQuestions((prev) =>
      prev.map((q) => (q.id === updatedQuestion.id ? updatedQuestion : q))
    );
    setInspectingQuestion(null);
    onToast?.('success', `Updated & verified question with 360° AI quality audit!`);
  };

  const handleApplyBulkInspection = (improvedQuestions: Question[]) => {
    setGeneratedQuestions(improvedQuestions);
    setIsBulkInspectOpen(false);
    onToast?.('success', `Applied 360° AI Quality Audit & Auto-Fix to all ${improvedQuestions.length} generated questions!`);
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

            {/* DU-XQE ENGINE TOGGLE */}
            <div className="p-3 rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/60 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center font-black shrink-0 shadow-xs">
                  <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-purple-900 dark:text-purple-200">
                      DU-XQE Anti-Repetition Guard
                    </span>
                    <span className="px-2 py-0.2 rounded-full text-[9px] font-black bg-purple-600 text-white uppercase tracking-wider">
                      Active
                    </span>
                  </div>
                  <p className="text-[11px] text-purple-700/80 dark:text-purple-300/70">
                    Cross-checks Question Bank knowledge vectors to prevent repetitive MCQs and force diverse conceptual angles.
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={useDUXQEGuard}
                  onChange={(e) => setUseDUXQEGuard(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
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
            {/* DUAL LANGUAGE ACTIVE PROGRESS NOTIFICATION */}
            {isConvertingDualLang && dualLangProgress && (
              <div className="p-4 bg-gradient-to-r from-purple-950 via-indigo-950 to-slate-900 text-white rounded-2xl border border-purple-500/40 shadow-xl space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-purple-400 animate-spin" />
                    <span className="font-black text-purple-200">
                      Dual Language AI Conversion in Progress...
                    </span>
                  </div>
                  <span className="font-extrabold text-amber-300">
                    {dualLangProgress.done} / {dualLangProgress.total} ({Math.round((dualLangProgress.done / Math.max(1, dualLangProgress.total)) * 100)}%)
                  </span>
                </div>
                <div className="w-full bg-slate-800/80 rounded-full h-2 overflow-hidden border border-purple-500/30">
                  <div
                    className="bg-gradient-to-r from-purple-500 to-indigo-400 h-2 transition-all duration-300 rounded-full"
                    style={{
                      width: `${Math.min(100, Math.round((dualLangProgress.done / Math.max(1, dualLangProgress.total)) * 100))}%`,
                    }}
                  />
                </div>
                <p className="text-[11px] text-purple-200/90 font-medium truncate">
                  {dualLangProgress.message}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-100 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Select All Checkbox */}
                <label className="flex items-center gap-2 cursor-pointer bg-white dark:bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 select-none shadow-2xs">
                  <input
                    type="checkbox"
                    checked={generatedQuestions.length > 0 && selectedIndices.size === generatedQuestions.length}
                    onChange={handleToggleSelectAll}
                    className="w-4 h-4 rounded text-purple-600 cursor-pointer"
                  />
                  <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                    Select All ({selectedIndices.size}/{generatedQuestions.length})
                  </span>
                </label>

                <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4" /> {generatedQuestions.length} Ready
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

              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                {/* 1-CLICK DUAL LANGUAGE CONVERSION BUTTON */}
                <button
                  type="button"
                  onClick={() => handleConvertToDualLanguage(selectedIndices.size > 0 && selectedIndices.size < generatedQuestions.length)}
                  disabled={isConvertingDualLang}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-black text-xs rounded-lg shadow-md flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  title="Translate and convert questions into pristine bilingual format (English + Hindi with separate question_hi field)"
                >
                  <Languages className={`w-3.5 h-3.5 text-purple-200 ${isConvertingDualLang ? 'animate-spin' : ''}`} />
                  <span>
                    {selectedIndices.size > 0 && selectedIndices.size < generatedQuestions.length
                      ? `🌐 Dual Language Selected (${selectedIndices.size})`
                      : `🌐 Dual Language All (${generatedQuestions.length})`}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsBulkInspectOpen(true)}
                  className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs rounded-lg shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Run 360° AI Quality Inspection, fact check & auto-repair across all generated MCQs"
                >
                  <Sparkles className="w-3.5 h-3.5 fill-slate-950" />
                  <span>360° Inspect All</span>
                </button>

                <button
                  type="button"
                  onClick={handleShuffleOptions}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Shuffle option positions across all questions to randomize correct answers"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  <span>Shuffle Options</span>
                </button>

                <button
                  type="button"
                  onClick={() => setGeneratedQuestions([])}
                  className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-bold flex items-center gap-1 px-2 py-1 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Re-generate
                </button>
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3 bg-slate-50 dark:bg-slate-900/60">
              {generatedQuestions.map((q, idx) => {
                const isSelected = selectedIndices.has(idx);
                const hasHindi = Boolean(q.question_hi && q.question_hi.trim().length > 0);

                return (
                  <div 
                    key={q.id || idx} 
                    className={`p-4 rounded-xl border text-xs space-y-2.5 transition-all shadow-xs ${
                      isSelected
                        ? 'bg-purple-50/20 dark:bg-purple-950/20 border-purple-500/50 ring-1 ring-purple-500/30'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between font-bold text-slate-900 dark:text-white gap-2">
                      <div className="flex items-start gap-2.5 flex-1">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectQuestion(idx)}
                          className="w-4 h-4 mt-0.5 rounded text-purple-600 cursor-pointer shrink-0"
                        />
                        <div className="space-y-1.5 flex-1">
                          {/* English Question Text */}
                          <div className="text-sm font-semibold text-slate-900 dark:text-white leading-relaxed">
                            <span className="font-black text-purple-600 dark:text-purple-400 mr-1.5">Q{idx + 1}.</span>
                            {q.question_text}
                          </div>

                          {/* Dedicated Hindi Question Box if Dual Language */}
                          {hasHindi && (
                            <div className="p-2.5 bg-orange-50/60 dark:bg-orange-950/30 rounded-lg border border-orange-200/60 dark:border-orange-900/40 text-xs text-orange-950 dark:text-orange-200">
                              <div className="flex items-center gap-1.5 mb-1 font-bold text-[10px] uppercase text-orange-700 dark:text-orange-400">
                                <Languages className="w-3 h-3" />
                                <span>हिन्दी अनुवाद (Hindi Translation)</span>
                              </div>
                              <p className="leading-relaxed font-medium">
                                {q.question_hi}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                        {/* Dual Language Single Button */}
                        <button
                          type="button"
                          onClick={() => handleConvertSingleToDualLanguage(idx)}
                          disabled={convertingSingleIndex === idx || isConvertingDualLang}
                          className={`px-2.5 py-1 text-[11px] font-black rounded-lg border flex items-center gap-1 cursor-pointer transition-all shadow-2xs ${
                            hasHindi
                              ? 'bg-purple-100 hover:bg-purple-200 dark:bg-purple-950/70 text-purple-900 dark:text-purple-200 border-purple-300 dark:border-purple-700'
                              : 'bg-slate-100 hover:bg-purple-100 dark:bg-slate-800 text-slate-700 hover:text-purple-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                          }`}
                          title="Convert this question into Dual Language (English + Hindi)"
                        >
                          <Languages className={`w-3 h-3 text-purple-600 dark:text-purple-400 ${convertingSingleIndex === idx ? 'animate-spin' : ''}`} />
                          <span>{convertingSingleIndex === idx ? 'Translating...' : hasHindi ? 'Re-Translate' : '🌐 Dual Lang'}</span>
                        </button>

                        {q.quality_score !== undefined && (
                          <span className={`px-2 py-0.5 rounded-md text-[11px] font-black flex items-center gap-1 border ${
                            q.quality_score >= 85
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                              : q.quality_score >= 70
                              ? 'bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800'
                              : 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                          }`}>
                            <ShieldCheck className="w-3 h-3" /> QA {q.quality_score}/100
                          </span>
                        )}

                        {/* 360° AI INSPECTION BUTTON */}
                        <button
                          type="button"
                          onClick={() => setInspectingQuestion(q)}
                          className="px-2 py-1 bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/70 dark:hover:bg-amber-900/70 text-amber-950 dark:text-amber-200 font-extrabold text-[11px] rounded-lg border border-amber-300 dark:border-amber-700 flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
                          title="360° AI Inspection: Check factuality, question quality, distractors & 1-click Auto Fix before saving"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                          <span>360° Inspect</span>
                        </button>

                        {/* DU-XQE MUTATE BUTTON */}
                        <button
                          type="button"
                          onClick={() => {
                            setMutatingQuestion(q);
                            setMutatingIndex(idx);
                          }}
                          className="px-2 py-1 bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/60 dark:hover:bg-purple-800/60 text-purple-900 dark:text-purple-200 font-bold text-[11px] rounded-lg border border-purple-300 dark:border-purple-700 flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
                          title="Mutate with DU-XQE: Cognitive perspective shift (Inverted framing, scenario, angle shift)"
                        >
                          <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                          <span>Mutate</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRegenerateSinglePreview(idx)}
                          disabled={regeneratingIndex === idx}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[11px] rounded-lg border border-slate-200 dark:border-slate-700 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          title="Regenerate this specific question with AI"
                        >
                          <RefreshCw className={`w-3 h-3 text-slate-600 dark:text-slate-400 ${regeneratingIndex === idx ? 'animate-spin' : ''}`} />
                          <span>{regeneratingIndex === idx ? 'Regenerating...' : 'Regenerate'}</span>
                        </button>

                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 rounded-lg shrink-0 font-black border border-emerald-200 dark:border-emerald-800">
                          Ans: {q.correct_answer}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/40 p-2.5 rounded-lg">
                      <div className={q.correct_answer === 'A' ? 'font-bold text-emerald-600 dark:text-emerald-400' : ''}>A. {q.option_a}</div>
                      <div className={q.correct_answer === 'B' ? 'font-bold text-emerald-600 dark:text-emerald-400' : ''}>B. {q.option_b}</div>
                      <div className={q.correct_answer === 'C' ? 'font-bold text-emerald-600 dark:text-emerald-400' : ''}>C. {q.option_c}</div>
                      <div className={q.correct_answer === 'D' ? 'font-bold text-emerald-600 dark:text-emerald-400' : ''}>D. {q.option_d}</div>
                    </div>

                    {q.explanation && (
                      <div className="text-[11px] text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-lg border border-amber-200/60 dark:border-amber-800/40">
                        <b>Explanation:</b> {q.explanation}
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-1 text-[10px] text-slate-400 flex-wrap">
                      <span>Subject: {q.subject}</span>
                      {q.section && <span>• Section: {q.section}</span>}
                      {q.chapter && <span>• Chapter: {q.chapter}</span>}
                      {q.topic && <span>• Topic: {q.topic}</span>}
                      {hasHindi && <span className="text-purple-600 dark:text-purple-400 font-bold">• 🌐 Bilingual Dual Language</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="text-xs font-bold text-slate-500">
                Selected: <span className="text-purple-600 font-black">{selectedIndices.size}</span> / Total: <span className="font-black">{generatedQuestions.length}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setGeneratedQuestions([])}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:underline cursor-pointer"
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
          </div>
        )}

      </div>

      {/* 360° SINGLE MCQ INSPECTION & REPAIR MODAL */}
      {inspectingQuestion && (
        <MCQInspectionModal
          isOpen={!!inspectingQuestion}
          question={inspectingQuestion}
          onClose={() => setInspectingQuestion(null)}
          onApplyImprovement={handleApplySingleInspection}
          onToast={onToast}
        />
      )}

      {/* 360° BULK MCQ AUDIT & REPAIR MODAL */}
      {isBulkInspectOpen && (
        <BulkMCQInspectionModal
          isOpen={isBulkInspectOpen}
          testTitle={subject ? `${subject} (Generated Preview Set)` : 'AI Generated Questions'}
          questions={generatedQuestions}
          onClose={() => setIsBulkInspectOpen(false)}
          onApplyAllImprovements={handleApplyBulkInspection}
          onToast={onToast}
        />
      )}

      {/* DU-XQE MUTATE MODAL */}
      {mutatingQuestion && (
        <DUXQEMutateModal
          isOpen={!!mutatingQuestion}
          sourceQuestion={mutatingQuestion}
          onClose={() => {
            setMutatingQuestion(null);
            setMutatingIndex(null);
          }}
          onSuccess={(mutated, mode) => {
            if (mode === 'add_new') {
              setGeneratedQuestions((prev) => [
                ...prev,
                { ...mutated, question_number: prev.length + 1 }
              ]);
              onToast?.('success', `✨ Added new DU-XQE mutated variant as Q${generatedQuestions.length + 1}!`);
            } else if (mutatingIndex !== null) {
              setGeneratedQuestions((prev) =>
                prev.map((item, idx) =>
                  idx === mutatingIndex ? { ...mutated, question_number: idx + 1 } : item
                )
              );
              onToast?.('success', `✨ Applied DU-XQE mutated variant to Q${mutatingIndex + 1}!`);
            }
          }}
          onToast={onToast}
        />
      )}
    </Modal>
  );
};
