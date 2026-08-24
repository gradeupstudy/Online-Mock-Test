import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import {
  Sparkles,
  Zap,
  Key,
  CheckCircle,
  AlertCircle,
  Layers,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Plus,
  Trash2,
  HelpCircle,
  FileText,
  Play,
  Check,
  Pause,
  XCircle,
  Eye,
  Settings,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  CheckSquare,
  Square
} from 'lucide-react';
import { Test, Question } from '../../types';
import { aiService, AIGenerateParams, shuffleAndBalanceQuestions } from '../../services/aiService';
import { dataService } from '../../services/dataService';

export interface BulkAITestGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTests: Test[];
  allTests?: Test[];
  onSuccess: (updatedTests: Test[], totalQuestionsGenerated: number) => void;
  onSelectTestQuestions?: (testId: string) => void;
  onToast?: (type: 'success' | 'error' | 'info', msg: string) => void;
}

export interface TestBatchItemConfig {
  test: Test;
  selected: boolean;
  topic: string;
  chapter: string;
  subject: string;
  section: string;
  count: number;
  existingCount: number;
  status: 'idle' | 'generating' | 'saving' | 'completed' | 'error';
  errorMessage?: string;
  generatedCount: number;
}

export const BulkAITestGeneratorModal: React.FC<BulkAITestGeneratorModalProps> = ({
  isOpen,
  onClose,
  selectedTests,
  allTests = [],
  onSuccess,
  onSelectTestQuestions,
  onToast
}) => {
  // Batch Items State
  const [batchItems, setBatchItems] = useState<TestBatchItemConfig[]>([]);
  const [availableTests, setAvailableTests] = useState<Test[]>([]);
  const [searchTestQuery, setSearchTestQuery] = useState('');
  const [showAddTestDropdown, setShowAddTestDropdown] = useState(false);

  // Global Settings
  const [countMode, setCountMode] = useState<'fill_target' | 'fixed' | 'custom'>('fill_target');
  const [fixedCount, setFixedCount] = useState(10);
  const [topicMode, setTopicMode] = useState<'auto_infer' | 'custom_uniform'>('auto_infer');
  const [uniformTopic, setUniformTopic] = useState('');
  const [difficulty, setDifficulty] = useState('Medium');
  const [language, setLanguage] = useState<'bilingual' | 'hindi' | 'english'>('bilingual');
  const [saveStrategy, setSaveStrategy] = useState<'append' | 'replace'>('append');
  const [autoUpdateTestTotals, setAutoUpdateTestTotals] = useState(true);

  // API Key Management
  const [showKeyManager, setShowKeyManager] = useState(false);
  const [apiKeysInput, setApiKeysInput] = useState('');
  const [savedKeys, setSavedKeys] = useState<string[]>([]);

  // Execution Engine States
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentExecutingIndex, setCurrentExecutingIndex] = useState<number | null>(null);
  const [overallProgress, setOverallProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [totalGeneratedOverall, setTotalGeneratedOverall] = useState(0);

  useEffect(() => {
    if (isOpen) {
      loadKeys();
      initializeBatch();
    } else {
      setIsRunning(false);
      setIsCompleted(false);
      setLogs([]);
      setCurrentExecutingIndex(null);
    }
  }, [isOpen, selectedTests, allTests]);

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
    onToast?.('success', `Saved ${splitKeys.length} Gemini API Key(s)! Multi-key failover enabled.`);
    setShowKeyManager(false);
  };

  const initializeBatch = async () => {
    const pool = allTests.length > 0 ? allTests : selectedTests;
    setAvailableTests(pool);

    const initialSelection = selectedTests.length > 0 ? selectedTests : pool.slice(0, 3);
    
    // Fetch existing question count for each test
    const items: TestBatchItemConfig[] = [];
    for (const t of initialSelection) {
      const existing = await dataService.getQuestions(t.id, true);
      const existingCount = existing ? existing.length : 0;
      const targetTotal = Number(t.total_questions) || 20;
      const needed = Math.max(1, targetTotal - existingCount);

      items.push({
        test: t,
        selected: true,
        subject: t.subject || t.category || 'General Studies',
        section: t.subject || 'General',
        chapter: t.title || 'General',
        topic: `${t.title} - ${t.subject || t.category || 'Competitive Exam'}`,
        count: needed > 0 ? needed : 10,
        existingCount,
        status: 'idle',
        generatedCount: 0
      });
    }

    setBatchItems(items);
    setIsCompleted(false);
    setTotalGeneratedOverall(0);
    setOverallProgress(0);
  };

  // Toggle selection of a test in the batch
  const handleToggleSelect = (index: number) => {
    setBatchItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], selected: !next[index].selected };
      return next;
    });
  };

  // Toggle select all in batch
  const handleToggleSelectAll = () => {
    const allSelected = batchItems.every((item) => item.selected);
    setBatchItems((prev) =>
      prev.map((item) => ({ ...item, selected: !allSelected }))
    );
  };

  // Remove test from batch
  const handleRemoveTest = (index: number) => {
    setBatchItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Add test to batch
  const handleAddTestToBatch = async (test: Test) => {
    if (batchItems.some((b) => b.test.id === test.id)) {
      onToast?.('info', `"${test.title}" is already in the batch!`);
      return;
    }
    const existing = await dataService.getQuestions(test.id, true);
    const existingCount = existing ? existing.length : 0;
    const targetTotal = Number(test.total_questions) || 20;
    const needed = Math.max(1, targetTotal - existingCount);

    const newItem: TestBatchItemConfig = {
      test,
      selected: true,
      subject: test.subject || test.category || 'General Studies',
      section: test.subject || 'General',
      chapter: test.title || 'General',
      topic: `${test.title} - ${test.subject || test.category || 'Competitive Exam'}`,
      count: needed > 0 ? needed : 10,
      existingCount,
      status: 'idle',
      generatedCount: 0
    };

    setBatchItems((prev) => [...prev, newItem]);
    setShowAddTestDropdown(false);
  };

  // Update item field
  const handleUpdateItemField = (index: number, field: keyof TestBatchItemConfig, value: any) => {
    setBatchItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  // Calculate actual count for an item based on mode
  const getItemQuestionCount = (item: TestBatchItemConfig): number => {
    if (countMode === 'fill_target') {
      const targetTotal = Number(item.test.total_questions) || 20;
      const diff = targetTotal - item.existingCount;
      return diff > 0 ? diff : 5;
    }
    if (countMode === 'fixed') {
      return fixedCount;
    }
    return item.count;
  };

  // Selected active items
  const activeSelectedItems = batchItems.filter((b) => b.selected);
  const totalQuestionsToGenerate = activeSelectedItems.reduce(
    (acc, curr) => acc + getItemQuestionCount(curr),
    0
  );

  // START BATCH GENERATION
  const handleStartBatchGeneration = async () => {
    if (activeSelectedItems.length === 0) {
      onToast?.('error', 'Please select at least one mock test to generate MCQs!');
      return;
    }

    if (savedKeys.length === 0) {
      onToast?.('error', 'No Gemini API Keys found! Please click "Manage API Keys" to add at least 1 key.');
      setShowKeyManager(true);
      return;
    }

    setIsRunning(true);
    setIsCompleted(false);
    setLogs([]);
    setTotalGeneratedOverall(0);

    const updatedBatch = [...batchItems];
    let totalGeneratedCount = 0;
    const completedTestsList: Test[] = [];

    const appendLog = (msg: string) => {
      const timeStr = new Date().toLocaleTimeString();
      setLogs((prev) => [...prev, `[${timeStr}] ${msg}`]);
    };

    appendLog(`🚀 Starting Multi-Test AI MCQ Generation for ${activeSelectedItems.length} mock tests (${totalQuestionsToGenerate} total MCQs)...`);

    for (let i = 0; i < updatedBatch.length; i++) {
      const item = updatedBatch[i];
      if (!item.selected) continue;

      setCurrentExecutingIndex(i);
      item.status = 'generating';
      setBatchItems([...updatedBatch]);

      const testTitle = item.test.title || `Test #${i + 1}`;
      const neededCount = getItemQuestionCount(item);
      const testNeg = Number(item.test.negative_marking) || 0;
      const testMarks = Number(item.test.marks_per_question) || 1;

      appendLog(`▶ [Test ${i + 1}/${updatedBatch.length}] Generating ${neededCount} MCQs for "${testTitle}" (Subject: ${item.subject}, Category: ${item.test.category})...`);

      // Determine language prompt
      let langInstruction = '';
      if (language === 'hindi') {
        langInstruction = 'STRICT REQUIREMENT: All questions, options, and explanations MUST be written in pure HINDI (Devanagari script हिन्दी).';
      } else if (language === 'english') {
        langInstruction = 'STRICT REQUIREMENT: All questions, options, and explanations MUST be written in ENGLISH.';
      } else {
        langInstruction = 'BILINGUAL/STANDARD: For general/state exam topics, provide questions in Hindi or standard bilingual format as suitable for competitive exams.';
      }

      // Determine prompt/topic
      let effectiveTopic = item.topic;
      if (topicMode === 'custom_uniform' && uniformTopic.trim()) {
        effectiveTopic = uniformTopic.trim();
      } else if (topicMode === 'auto_infer') {
        effectiveTopic = `Exam: ${item.test.category || 'State Exam'} | Test: ${item.test.title} | Subject: ${item.subject || 'General'} | Chapter: ${item.chapter || 'All Chapters'}`;
      }

      const customPromptDetails = `
TARGET EXAM: ${item.test.category || 'Competitive Exam'}
TEST TITLE: ${item.test.title}
SUBJECT: ${item.subject}
CHAPTER / TOPIC: ${effectiveTopic}
TARGET DIFFICULTY: ${difficulty}
${langInstruction}
INSTRUCTIONS: ${item.test.instructions || 'Standard competitive examination questions.'}
`.trim();

      try {
        const genParams: AIGenerateParams = {
          subject: item.subject || 'General Studies',
          section: item.section || 'General',
          chapter: item.chapter || 'General',
          topic: effectiveTopic,
          count: neededCount,
          difficulty,
          customPrompt: customPromptDetails,
          testId: item.test.id,
          negativeMarks: testNeg,
          marks: testMarks,
          onLog: (msg) => appendLog(`  └─ ${msg}`)
        };

        const generated = await aiService.generateQuestions(genParams);

        if (!generated || generated.length === 0) {
          throw new Error('AI returned 0 valid questions.');
        }

        item.status = 'saving';
        setBatchItems([...updatedBatch]);
        appendLog(`💾 Saving ${generated.length} generated MCQs to "${testTitle}" in database...`);

        // Fetch current questions for test
        const existing = await dataService.getQuestions(item.test.id, true);
        let finalQuestions: Question[] = [];

        if (saveStrategy === 'replace') {
          finalQuestions = generated.map((q, qIdx) => ({
            ...q,
            test_id: item.test.id,
            question_number: qIdx + 1,
            negative_marks: testNeg,
            marks: testMarks
          }));
        } else {
          const startingNumber = existing.length + 1;
          const formattedNew = generated.map((q, qIdx) => ({
            ...q,
            test_id: item.test.id,
            question_number: startingNumber + qIdx,
            negative_marks: testNeg,
            marks: testMarks
          }));
          finalQuestions = [...existing, ...formattedNew];
        }

        // Save to database
        await dataService.saveQuestions(item.test.id, finalQuestions);

        // Update Test total_questions & total_marks if requested
        if (autoUpdateTestTotals) {
          const updatedTest: Test = {
            ...item.test,
            total_questions: finalQuestions.length,
            total_marks: finalQuestions.length * testMarks
          };
          await dataService.saveTest(updatedTest);
          completedTestsList.push(updatedTest);
        } else {
          completedTestsList.push(item.test);
        }

        item.status = 'completed';
        item.generatedCount = generated.length;
        item.existingCount = finalQuestions.length;
        totalGeneratedCount += generated.length;
        setTotalGeneratedOverall(totalGeneratedCount);
        setBatchItems([...updatedBatch]);

        appendLog(`✅ [Test ${i + 1} Success] "${testTitle}" updated successfully with ${generated.length} MCQs! (Now has ${finalQuestions.length} total questions).`);

        // Update overall progress percentage
        const completedCount = updatedBatch.filter((b) => b.status === 'completed').length;
        setOverallProgress(Math.round((completedCount / activeSelectedItems.length) * 100));

      } catch (err: any) {
        console.error(`Error generating for test ${item.test.title}:`, err);
        item.status = 'error';
        item.errorMessage = err?.message || 'Generation failed';
        setBatchItems([...updatedBatch]);
        appendLog(`❌ [Test ${i + 1} Error] Failed to generate for "${testTitle}": ${item.errorMessage}`);
      }
    }

    setIsRunning(false);
    setCurrentExecutingIndex(null);
    setIsCompleted(true);
    setOverallProgress(100);
    appendLog(`🎉 Multi-Test AI Generation Batch Finished! Total ${totalGeneratedCount} MCQs added across selected mock tests.`);

    // Trigger update events
    window.dispatchEvent(new CustomEvent('gradeup_tests_updated'));
    window.dispatchEvent(new CustomEvent('gradeup_questions_updated'));

    onSuccess(completedTestsList, totalGeneratedCount);
    onToast?.('success', `Generated ${totalGeneratedCount} MCQs across ${completedTestsList.length} mock tests!`);
  };

  // Retry a single failed test
  const handleRetrySingle = async (index: number) => {
    const item = batchItems[index];
    if (!item) return;

    item.status = 'generating';
    item.errorMessage = undefined;
    setBatchItems([...batchItems]);

    const testTitle = item.test.title || `Test #${index + 1}`;
    const neededCount = getItemQuestionCount(item);
    const testNeg = Number(item.test.negative_marking) || 0;
    const testMarks = Number(item.test.marks_per_question) || 1;

    try {
      const genParams: AIGenerateParams = {
        subject: item.subject || 'General Studies',
        section: item.section || 'General',
        chapter: item.chapter || 'General',
        topic: item.topic,
        count: neededCount,
        difficulty,
        customPrompt: `TARGET EXAM: ${item.test.category}\nTEST: ${item.test.title}\nSUBJECT: ${item.subject}`,
        testId: item.test.id,
        negativeMarks: testNeg,
        marks: testMarks
      };

      const generated = await aiService.generateQuestions(genParams);
      const existing = await dataService.getQuestions(item.test.id, true);
      const finalQuestions = [...existing, ...generated.map((q, qIdx) => ({
        ...q,
        test_id: item.test.id,
        question_number: existing.length + 1 + qIdx,
        negative_marks: testNeg,
        marks: testMarks
      }))];

      await dataService.saveQuestions(item.test.id, finalQuestions);
      if (autoUpdateTestTotals) {
        await dataService.saveTest({
          ...item.test,
          total_questions: finalQuestions.length,
          total_marks: finalQuestions.length * testMarks
        });
      }

      item.status = 'completed';
      item.generatedCount = generated.length;
      item.existingCount = finalQuestions.length;
      setBatchItems([...batchItems]);
      onToast?.('success', `Retried & generated ${generated.length} MCQs for "${testTitle}"!`);
    } catch (err: any) {
      item.status = 'error';
      item.errorMessage = err?.message || 'Retry failed';
      setBatchItems([...batchItems]);
      onToast?.('error', `Retry failed for "${testTitle}": ${item.errorMessage}`);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isRunning) onClose();
      }}
      title="⚡ Multi-Test AI Question Generator (Batch MCQ Creation)"
      maxWidth="5xl"
    >
      <div className="space-y-6">

        {/* GEMINI MULTI-KEY & STATUS BANNER */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 p-5 rounded-2xl text-white shadow-md relative overflow-hidden border border-indigo-500/30">
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                  <Zap className="w-3 h-3 fill-slate-950" /> Gemini 3.7 Flash Batch Engine
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold uppercase tracking-wider">
                  Parallel Batch Automation
                </span>
              </div>
              <h3 className="text-lg font-black mt-1">Multi-Mock Test Bulk MCQ Auto-Populator</h3>
              <p className="text-xs text-blue-200 mt-0.5 max-w-2xl leading-relaxed">
                Select multiple mock tests (e.g. Set 1, Set 2, Set 3, Police, HPPSC) to generate dozens of exam-aligned MCQs simultaneously. Saves hours of manual question entry!
              </p>
            </div>

            <button
              onClick={() => setShowKeyManager(!showKeyManager)}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/20 backdrop-blur-md flex items-center gap-2 shrink-0 transition-all cursor-pointer"
            >
              <Key className="w-4 h-4 text-amber-400" />
              <span>{showKeyManager ? 'Close Keys' : `API Keys (${savedKeys.length})`}</span>
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
                  Gemini API Key Rotation & Multi-Key Manager
                </h4>
              </div>
              <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950 px-2.5 py-1 rounded-lg">
                Multi-Key Auto Failover Active
              </span>
            </div>

            <p className="text-xs text-slate-500">
              Paste your Gemini API Keys below (one key per line). During batch generation, the engine will automatically rotate across keys to prevent rate limit bottlenecks.
            </p>

            <textarea
              rows={4}
              value={apiKeysInput}
              onChange={(e) => setApiKeysInput(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full p-3 font-mono text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-hidden text-slate-800 dark:text-slate-200"
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowKeyManager(false)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveKeys}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" /> Save API Keys
              </button>
            </div>
          </div>
        )}

        {/* GLOBAL BATCH CONFIGURATION PANEL */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
            <h4 className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Settings className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Batch Generation Settings (Applied Across Selected Tests)</span>
            </h4>
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-2.5 py-1 rounded-lg">
              {activeSelectedItems.length} Tests Selected • ~{totalQuestionsToGenerate} MCQs Total
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* 1. Question Count Strategy */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                MCQ Count Mode
              </label>
              <select
                value={countMode}
                onChange={(e) => setCountMode(e.target.value as any)}
                disabled={isRunning}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-hidden"
              >
                <option value="fill_target">🎯 Auto-Fill to Target Total</option>
                <option value="fixed">🔢 Fixed Count per Test</option>
                <option value="custom">✏️ Custom per Test in Table</option>
              </select>
              <p className="text-[10px] text-slate-500 mt-1">
                {countMode === 'fill_target'
                  ? 'Fills remaining questions to reach test total_questions'
                  : countMode === 'fixed'
                  ? 'Generates exact same number for each test'
                  : 'Customize per test in the table below'}
              </p>
            </div>

            {/* 1b. If Fixed Count */}
            {countMode === 'fixed' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Questions Per Test
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={fixedCount}
                  onChange={(e) => setFixedCount(Math.max(1, parseInt(e.target.value) || 1))}
                  disabled={isRunning}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>
            )}

            {/* 2. Topic Strategy */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Topic & Syllabus Mode
              </label>
              <select
                value={topicMode}
                onChange={(e) => setTopicMode(e.target.value as any)}
                disabled={isRunning}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-hidden"
              >
                <option value="auto_infer">🤖 Auto-Infer from Test Title & Subject</option>
                <option value="custom_uniform">📝 Uniform Topic for All</option>
              </select>
            </div>

            {/* 3. Language */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Language / Script
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as any)}
                disabled={isRunning}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-hidden"
              >
                <option value="bilingual">🇮🇳 Bilingual (Hindi / English)</option>
                <option value="hindi">🇮🇳 Pure Hindi (हिन्दी)</option>
                <option value="english">🇬🇧 English Only</option>
              </select>
            </div>

            {/* 4. Difficulty */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Difficulty Level
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                disabled={isRunning}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-hidden"
              >
                <option value="Easy">Easy (Foundation Level)</option>
                <option value="Medium">Medium (Exam Standard)</option>
                <option value="Hard">Hard (Advanced / Deep)</option>
                <option value="Exam-Standard">Exam-Standard (Mixed Balance)</option>
              </select>
            </div>

          </div>

          {/* If Uniform Topic is chosen */}
          {topicMode === 'custom_uniform' && (
            <div className="pt-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Uniform Topic / Custom Syllabus for All Tests
              </label>
              <input
                type="text"
                value={uniformTopic}
                onChange={(e) => setUniformTopic(e.target.value)}
                placeholder="e.g. Himachal Pradesh Geography, Rivers, History & HP Police 2024 Exam Pattern"
                disabled={isRunning}
                className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-hidden"
              />
            </div>
          )}

          {/* Checkbox Options */}
          <div className="flex flex-wrap items-center gap-6 pt-2 text-xs font-bold text-slate-700 dark:text-slate-300">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="saveStrategy"
                checked={saveStrategy === 'append'}
                onChange={() => setSaveStrategy('append')}
                disabled={isRunning}
                className="text-blue-600 focus:ring-blue-500"
              />
              <span>Append (Add to existing questions safely)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-amber-700 dark:text-amber-400">
              <input
                type="radio"
                name="saveStrategy"
                checked={saveStrategy === 'replace'}
                onChange={() => setSaveStrategy('replace')}
                disabled={isRunning}
                className="text-amber-600 focus:ring-amber-500"
              />
              <span>Replace (Overwrite existing questions)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300 ml-auto">
              <input
                type="checkbox"
                checked={autoUpdateTestTotals}
                onChange={(e) => setAutoUpdateTestTotals(e.target.checked)}
                disabled={isRunning}
                className="rounded-sm text-blue-600 focus:ring-blue-500"
              />
              <span>Auto-sync test total_questions & total_marks in database</span>
            </label>
          </div>
        </div>

        {/* MULTI-TEST BATCH QUEUE TABLE */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleToggleSelectAll}
                disabled={isRunning}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer"
              >
                {batchItems.every((b) => b.selected) ? (
                  <CheckSquare className="w-4 h-4 text-blue-600" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400" />
                )}
                <span>Select All ({batchItems.length})</span>
              </button>

              <span className="text-xs font-bold text-slate-500">
                Queue: <strong>{activeSelectedItems.length}</strong> of {batchItems.length} tests active
              </span>
            </div>

            {/* Add More Tests Dropdown Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowAddTestDropdown(!showAddTestDropdown)}
                disabled={isRunning}
                className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 hover:bg-blue-100 border border-blue-200 dark:border-blue-800 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add More Tests to Batch</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {/* Dropdown Menu */}
              {showAddTestDropdown && (
                <div className="absolute right-0 top-full mt-2 w-80 max-h-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl z-20 overflow-hidden flex flex-col p-2 space-y-1">
                  <div className="p-1">
                    <input
                      type="text"
                      placeholder="Search mock tests..."
                      value={searchTestQuery}
                      onChange={(e) => setSearchTestQuery(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-hidden text-slate-900 dark:text-white"
                    />
                  </div>
                  <div className="overflow-y-auto max-h-48 space-y-1 scrollbar-thin">
                    {availableTests
                      .filter((t) =>
                        t.title.toLowerCase().includes(searchTestQuery.toLowerCase()) ||
                        t.category.toLowerCase().includes(searchTestQuery.toLowerCase())
                      )
                      .map((t) => {
                        const inBatch = batchItems.some((b) => b.test.id === t.id);
                        return (
                          <button
                            key={t.id}
                            onClick={() => handleAddTestToBatch(t)}
                            disabled={inBatch}
                            className={`w-full text-left p-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                              inBatch
                                ? 'opacity-40 bg-slate-50 dark:bg-slate-800 cursor-not-allowed'
                                : 'hover:bg-blue-50 dark:hover:bg-blue-950/50 cursor-pointer text-slate-800 dark:text-slate-200'
                            }`}
                          >
                            <div className="truncate mr-2">
                              <p className="font-bold truncate">{t.title}</p>
                              <p className="text-[10px] text-slate-400">{t.category} • {t.total_questions || 20} Qs</p>
                            </div>
                            {inBatch ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            ) : (
                              <Plus className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Test List Table */}
          <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
            <div className="overflow-x-auto max-h-[380px] scrollbar-thin">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800/80 text-[11px] font-black text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
                    <th className="py-3 px-3 w-10 text-center">Active</th>
                    <th className="py-3 px-4 min-w-[200px]">Mock Test Title & Category</th>
                    <th className="py-3 px-3 min-w-[140px]">Subject / Topic</th>
                    <th className="py-3 px-3 w-28 text-center">Current Qs</th>
                    <th className="py-3 px-3 w-32 text-center">AI Generate</th>
                    <th className="py-3 px-3 min-w-[140px] text-center">Status</th>
                    <th className="py-3 px-3 w-12 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {batchItems.map((item, idx) => {
                    const isExecuting = currentExecutingIndex === idx;
                    const calculatedCount = getItemQuestionCount(item);

                    return (
                      <tr
                        key={item.test.id}
                        className={`transition-colors ${
                          isExecuting
                            ? 'bg-blue-50/60 dark:bg-blue-950/30'
                            : item.status === 'completed'
                            ? 'bg-emerald-50/30 dark:bg-emerald-950/10'
                            : item.status === 'error'
                            ? 'bg-rose-50/40 dark:bg-rose-950/20'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="py-3 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={item.selected}
                            onChange={() => handleToggleSelect(idx)}
                            disabled={isRunning}
                            className="rounded-sm text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                        </td>

                        {/* Title & Info */}
                        <td className="py-3 px-4">
                          <div className="space-y-0.5">
                            <p className="font-extrabold text-slate-900 dark:text-white line-clamp-1">
                              {item.test.title}
                            </p>
                            <div className="flex items-center gap-2 flex-wrap text-[11px]">
                              <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold rounded-md border border-blue-200 dark:border-blue-900">
                                {item.test.category}
                              </span>
                              <span className="font-mono text-slate-500 text-[10px]">
                                {item.test.test_code}
                              </span>
                              <span className="text-slate-400 text-[10px]">
                                Marks: {item.test.marks_per_question || 1} | Neg: {item.test.negative_marking || 0}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Subject & Topic Editor */}
                        <td className="py-3 px-3">
                          {topicMode === 'auto_infer' ? (
                            <div className="space-y-1">
                              <input
                                type="text"
                                value={item.subject}
                                onChange={(e) => handleUpdateItemField(idx, 'subject', e.target.value)}
                                placeholder="Subject"
                                disabled={isRunning}
                                className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold"
                              />
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px] italic">
                              Uniform topic applied
                            </span>
                          )}
                        </td>

                        {/* Current Question Count */}
                        <td className="py-3 px-3 text-center">
                          <span className="font-black text-slate-700 dark:text-slate-300">
                            {item.existingCount}
                          </span>
                          <span className="text-slate-400 text-[11px]">
                            {' '}/ {item.test.total_questions || 20}
                          </span>
                        </td>

                        {/* AI Generate Count */}
                        <td className="py-3 px-3 text-center">
                          {countMode === 'custom' ? (
                            <input
                              type="number"
                              min={1}
                              max={100}
                              value={item.count}
                              onChange={(e) =>
                                handleUpdateItemField(idx, 'count', Math.max(1, parseInt(e.target.value) || 1))
                              }
                              disabled={isRunning}
                              className="w-16 px-2 py-1 text-center bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold mx-auto"
                            />
                          ) : (
                            <span className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-extrabold rounded-lg text-xs">
                              +{calculatedCount} MCQs
                            </span>
                          )}
                        </td>

                        {/* Status Badge */}
                        <td className="py-3 px-3 text-center">
                          {item.status === 'idle' && (
                            <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-lg font-bold text-[11px]">
                              ⏳ Ready
                            </span>
                          )}
                          {item.status === 'generating' && (
                            <span className="px-2.5 py-1 bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 animate-pulse">
                              <RefreshCw className="w-3 h-3 animate-spin" /> Generating...
                            </span>
                          )}
                          {item.status === 'saving' && (
                            <span className="px-2.5 py-1 bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 rounded-lg font-bold text-[11px]">
                              💾 Saving...
                            </span>
                          )}
                          {item.status === 'completed' && (
                            <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1">
                              <CheckCircle className="w-3.5 h-3.5" /> +{item.generatedCount} Done
                            </span>
                          )}
                          {item.status === 'error' && (
                            <div className="flex items-center justify-center gap-1">
                              <span className="px-2 py-0.5 bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 rounded-lg font-bold text-[10px] truncate max-w-[90px]" title={item.errorMessage}>
                                ❌ Failed
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRetrySingle(idx)}
                                className="p-1 hover:bg-rose-200 dark:hover:bg-rose-900 rounded text-rose-700 dark:text-rose-300 cursor-pointer"
                                title="Retry this test"
                              >
                                <RefreshCw className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </td>

                        {/* Remove */}
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveTest(idx)}
                            disabled={isRunning}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer disabled:opacity-30"
                            title="Remove from batch"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* PROGRESS BAR & LIVE LOGS (During & After Generation) */}
        {(isRunning || isCompleted || logs.length > 0) && (
          <div className="p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-3">
            
            <div className="flex items-center justify-between text-xs font-bold">
              <div className="flex items-center gap-2">
                {isRunning ? (
                  <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />
                ) : isCompleted ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                ) : null}
                <span>
                  {isRunning
                    ? `Generating Questions... (${overallProgress}%)`
                    : `Batch Generation Finished! Generated ${totalGeneratedOverall} MCQs.`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowLogs(!showLogs)}
                className="text-xs text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>{showLogs ? 'Hide Console Logs' : `View Console Logs (${logs.length})`}</span>
                {showLogs ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>

            {/* Progress Track */}
            <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500 transition-all duration-300 rounded-full"
                style={{ width: `${overallProgress}%` }}
              />
            </div>

            {/* Collapsible Console Logs Drawer */}
            {showLogs && (
              <div className="max-h-40 overflow-y-auto bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-[11px] space-y-1 text-slate-300 scrollbar-thin">
                {logs.map((log, lIdx) => (
                  <div key={lIdx} className="leading-relaxed">
                    {log}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* MODAL FOOTER CONTROLS */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="text-xs font-semibold text-slate-500">
            <span>Ready to generate </span>
            <strong className="text-blue-600 dark:text-blue-400 font-black">{totalQuestionsToGenerate} MCQs</strong>
            <span> across </span>
            <strong className="text-slate-800 dark:text-slate-200">{activeSelectedItems.length} mock tests</strong>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isRunning}
              className="px-4 py-2.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-all cursor-pointer disabled:opacity-50"
            >
              {isCompleted ? 'Close' : 'Cancel'}
            </button>

            <button
              type="button"
              onClick={handleStartBatchGeneration}
              disabled={isRunning || activeSelectedItems.length === 0}
              className="px-6 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white font-black text-xs sm:text-sm rounded-xl shadow-lg shadow-blue-500/25 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRunning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processing Batch ({overallProgress}%)...</span>
                </>
              ) : isCompleted ? (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Generate Again</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-amber-300" />
                  <span>Start Bulk AI Generation ({activeSelectedItems.length} Tests)</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </Modal>
  );
};
