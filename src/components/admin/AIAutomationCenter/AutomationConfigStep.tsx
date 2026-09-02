import React, { useState } from 'react';
import {
  FileText,
  Upload,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sliders,
  Layers,
  BookOpen,
  Target,
  History,
  Languages,
  RotateCcw,
  Check,
  Plus,
  HelpCircle,
  FileCheck
} from 'lucide-react';
import { AIAutomationConfig } from '../../../types/aiAutomation';
import { PRIMARY_PRACTICE_MODES, PracticeMode } from '../../../types';
import { getAllCanonicalSubjectNames } from '../../../utils/taxonomyCanonicalizer';
import { dataService, inferPracticeMode } from '../../../services/dataService';

interface AutomationConfigStepProps {
  config: AIAutomationConfig;
  pdfFile: File | null;
  onPdfFileChange: (file: File | null) => void;
  onChangeConfig: (newConfig: Partial<AIAutomationConfig>) => void;
  onConfirmAndStart: () => void;
  isProcessing: boolean;
  onToast?: (type: 'success' | 'error' | 'info', msg: string) => void;
}

export const AutomationConfigStep: React.FC<AutomationConfigStepProps> = ({
  config,
  pdfFile,
  onPdfFileChange,
  onChangeConfig,
  onConfirmAndStart,
  isProcessing,
  onToast
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const canonicalSubjects = getAllCanonicalSubjectNames();
  const existingCategories = dataService.getMasterCategories();

  const handleProcessUploadedFile = (file: File) => {
    onPdfFileChange(file);

    // Extract clean name from file name
    const rawBaseName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').trim();
    const formattedPrefix = rawBaseName.charAt(0).toUpperCase() + rawBaseName.slice(1);

    const suggestedMode = inferPracticeMode({
      title: formattedPrefix,
      topic: config.topic,
      subject: config.subject
    });

    const suggestedCategory = (config.category === 'Section / Subject Practice' || config.category === 'Topic Wise Practice')
      ? (suggestedMode === 'topic_wise' ? 'Topic Wise Practice' : 'Section / Subject Practice')
      : config.category;

    onChangeConfig({
      fileName: file.name,
      fileSizeFormatted: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
      mockTestNamePrefix: config.mockTestNamePrefix === 'General Science Mock Test' || !config.mockTestNamePrefix ? formattedPrefix : config.mockTestNamePrefix,
      practiceMode: suggestedMode,
      category: suggestedCategory
    });
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        handleProcessUploadedFile(file);
      } else {
        onToast?.('error', 'Please upload a valid PDF file.');
      }
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        handleProcessUploadedFile(file);
      } else {
        onToast?.('error', 'Please upload a valid PDF file.');
      }
    }
  };

  // Calculations for summary card
  const totalTests = Math.max(1, config.numberOfMockTests || 1);
  const mcqsPerTest = Math.max(1, config.mcqsPerMockTest || 20);
  const marksPerQ = Math.max(0.1, config.marksPerQuestion || 1);
  const totalMarks = Math.round(mcqsPerTest * marksPerQ);
  const requiredUniqueQuestions = config.questionReusePolicy === 'OFF' ? (totalTests * mcqsPerTest) : mcqsPerTest;
  const startNum = config.startingTestNumber || 1;
  const endNum = startNum + totalTests - 1;

  const isConfigValid = !!pdfFile && config.mockTestNamePrefix.trim().length > 0 && config.subject.trim().length > 0;

  return (
    <div className="space-y-8 animate-fadeIn">
      
      {/* HEADER BANNER */}
      <div className="p-5 rounded-3xl bg-linear-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-xl shadow-blue-500/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-black uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Phase 1 — Configure Destination & Processing Rules</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            AI Automation Center: PDF Upload & Test Configuration
          </h2>
          <p className="text-xs sm:text-sm text-blue-100 mt-1 max-w-2xl">
            Configure destination practice path, subjects, mock test series parameters, and question rules BEFORE processing.
            A 360° AI audit will validate all questions with an approval gate before generating tests.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/20">
          <ShieldCheck className="w-8 h-8 text-emerald-300" />
          <div className="text-xs">
            <div className="font-bold text-white">2-Gate Safety Model</div>
            <div className="text-blue-100 text-[11px]">Human approval required at each phase</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: UPLOAD & CONFIGURATION CONTROLS */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* 1. PDF UPLOAD DROPZONE */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold">1</span>
                <span>Select Source PDF Document</span>
              </h3>
              {pdfFile && (
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>PDF Ready</span>
                </span>
              )}
            </div>

            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleFileDrop}
              className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
                isDragOver
                  ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40'
                  : pdfFile
                  ? 'border-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/20'
                  : 'border-slate-300 dark:border-slate-700 hover:border-blue-400 bg-slate-50/50 dark:bg-slate-800/40'
              }`}
            >
              {pdfFile ? (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-left">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <FileCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white break-all">
                        {pdfFile.name}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {(pdfFile.size / (1024 * 1024)).toFixed(2)} MB • Ready for Extraction
                      </p>
                    </div>
                  </div>
                  <label className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer transition-all shadow-xs shrink-0">
                    <span>Change PDF</span>
                    <input type="file" accept=".pdf" onChange={handleFileInput} className="hidden" />
                  </label>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      Drag & Drop your Question Bank PDF here, or <label className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">browse file<input type="file" accept=".pdf" onChange={handleFileInput} className="hidden" /></label>
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Supports scanned PDFs, standard documents, bilingual Hindi/English tests
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Page Range Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Extraction Page Range
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onChangeConfig({ pageRangeMode: 'all' })}
                    className={`px-3 py-2 text-xs font-bold rounded-xl border cursor-pointer transition-all ${
                      config.pageRangeMode === 'all'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    All Pages
                  </button>
                  <button
                    type="button"
                    onClick={() => onChangeConfig({ pageRangeMode: 'custom' })}
                    className={`px-3 py-2 text-xs font-bold rounded-xl border cursor-pointer transition-all ${
                      config.pageRangeMode === 'custom'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    Custom Range
                  </button>
                </div>
              </div>

              {config.pageRangeMode === 'custom' && (
                <div className="flex items-center gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">From Page</label>
                    <input
                      type="number"
                      min={1}
                      value={config.startPage}
                      onChange={(e) => onChangeConfig({ startPage: Math.max(1, parseInt(e.target.value) || 1) })}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">To Page</label>
                    <input
                      type="number"
                      min={config.startPage}
                      value={config.endPage}
                      onChange={(e) => onChangeConfig({ endPage: Math.max(config.startPage, parseInt(e.target.value) || config.startPage) })}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 2. DESTINATION & PRACTICE MODE */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold">2</span>
              <span>Destination Category & Practice Mode</span>
            </h3>

            {/* Practice Mode Grid */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400">
                  Practice Mode <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                  Auto-categorized by test name & topic
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {PRIMARY_PRACTICE_MODES.map((pm) => {
                  const isSelected = config.practiceMode === pm.id;
                  return (
                    <button
                      key={pm.id}
                      type="button"
                      onClick={() => {
                        const targetCat = pm.id === 'topic_wise'
                          ? 'Topic Wise Practice'
                          : pm.id === 'subject_wise'
                          ? 'Section / Subject Practice'
                          : (config.category === 'Section / Subject Practice' || config.category === 'Topic Wise Practice')
                          ? 'All Competitive Exams'
                          : config.category;
                        onChangeConfig({ practiceMode: pm.id, category: targetCat });
                      }}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 shadow-xs ring-2 ring-blue-500/20'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-black ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-slate-900 dark:text-white'}`}>
                          {pm.title}
                        </span>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                        {pm.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Category / Exam Path */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Path / Exam Category <span className="text-rose-500">*</span>
                </label>
                <select
                  value={config.category}
                  onChange={(e) => onChangeConfig({ category: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white"
                >
                  <option value="Section / Subject Practice">Section / Subject Practice</option>
                  <option value="Topic Wise Practice">Topic Wise Practice</option>
                  <option value="All Competitive Exams">All Competitive Exams</option>
                  <option value="HP Police Constable">HP Police Constable</option>
                  <option value="HP Patwari Exam">HP Patwari Exam</option>
                  <option value="HP High Court Clerk">HP High Court Clerk</option>
                  <option value="Himachal Pradesh GK">Himachal Pradesh GK</option>
                  {existingCategories
                    .filter(c => !['Section / Subject Practice', 'Topic Wise Practice', 'All Competitive Exams', 'HP Police Constable', 'HP Patwari Exam', 'HP High Court Clerk', 'Himachal Pradesh GK'].includes(c))
                    .map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Section / Subject <span className="text-rose-500">*</span>
                </label>
                <select
                  value={config.subject}
                  onChange={(e) => {
                    const subj = e.target.value;
                    const updates: Partial<AIAutomationConfig> = { subject: subj };
                    // Smart language mode auto-adjustment
                    if (subj === 'English Grammar' || subj === 'English Vocab') {
                      updates.language = 'english';
                    } else if (subj === 'Hindi Grammar' || subj === 'Hindi Vocab') {
                      updates.language = 'hindi';
                    } else if (config.language === 'english' || config.language === 'hindi') {
                      updates.language = 'bilingual';
                    }
                    onChangeConfig(updates);
                  }}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white"
                >
                  <option value="General Science">General Science (सामान्य विज्ञान)</option>
                  <option value="Hindi Grammar">Hindi Grammar (हिंदी व्याकरण - Hindi Only)</option>
                  <option value="Hindi Vocab">Hindi Vocab (हिंदी शब्दावली - Hindi Only)</option>
                  <option value="English Grammar">English Grammar (English Only)</option>
                  <option value="English Vocab">English Vocab (English Only)</option>
                  <option value="Mathematics">Mathematics (गणित)</option>
                  <option value="Reasoning Ability">Reasoning Ability (तर्कशक्ति)</option>
                  <option value="HP General Knowledge">HP General Knowledge (हिमाचल सामान्य ज्ञान)</option>
                  <option value="General Studies">General Studies (सामान्य अध्ययन)</option>
                  <option value="Current Affairs">Current Affairs (समसामयिकी)</option>
                  {canonicalSubjects
                    .filter(s => !['General Science', 'Hindi Grammar', 'Hindi Vocab', 'English Grammar', 'English Vocab', 'Mathematics', 'Reasoning Ability', 'HP General Knowledge', 'General Studies', 'Current Affairs'].includes(s))
                    .map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                </select>
              </div>
            </div>

            {/* Optional Topic */}
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                Specific Topic (Optional)
              </label>
              <input
                type="text"
                value={config.topic || ''}
                onChange={(e) => {
                  const newTopic = e.target.value;
                  const suggestedMode = inferPracticeMode({
                    title: config.mockTestNamePrefix,
                    topic: newTopic,
                    subject: config.subject
                  });
                  const suggestedCat = (config.category === 'Section / Subject Practice' || config.category === 'Topic Wise Practice')
                    ? (suggestedMode === 'topic_wise' ? 'Topic Wise Practice' : 'Section / Subject Practice')
                    : config.category;
                  onChangeConfig({ topic: newTopic, practiceMode: suggestedMode, category: suggestedCat });
                }}
                placeholder="e.g. Glands & Hormones, Nervous System, Sandhi & Samas"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* 3. TEST GENERATION SERIES PARAMETERS */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold">3</span>
              <span>Mock Test Series Parameters</span>
            </h3>

            {/* Name Prefix & Starting Number */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Mock Test Name Prefix <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={config.mockTestNamePrefix}
                  onChange={(e) => {
                    const newPrefix = e.target.value;
                    const suggestedMode = inferPracticeMode({
                      title: newPrefix,
                      topic: config.topic,
                      subject: config.subject
                    });
                    const suggestedCat = (config.category === 'Section / Subject Practice' || config.category === 'Topic Wise Practice')
                      ? (suggestedMode === 'topic_wise' ? 'Topic Wise Practice' : 'Section / Subject Practice')
                      : config.category;
                    onChangeConfig({ mockTestNamePrefix: newPrefix, practiceMode: suggestedMode, category: suggestedCat });
                  }}
                  placeholder="e.g. General Science Mock Test"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Starting Test #
                </label>
                <input
                  type="number"
                  min={1}
                  value={config.startingTestNumber}
                  onChange={(e) => onChangeConfig({ startingTestNumber: Math.max(1, parseInt(e.target.value) || 1) })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* Number of Tests & Questions per Test */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                  # of Tests <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={config.numberOfMockTests}
                  onChange={(e) => onChangeConfig({ numberOfMockTests: Math.max(1, parseInt(e.target.value) || 1) })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-black text-blue-600 dark:text-blue-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                  MCQs per Test <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min={5}
                  max={200}
                  value={config.mcqsPerMockTest}
                  onChange={(e) => onChangeConfig({ mcqsPerMockTest: Math.max(1, parseInt(e.target.value) || 20) })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-black text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Marks per Q
                </label>
                <input
                  type="number"
                  step="0.5"
                  min={0.5}
                  value={config.marksPerQuestion}
                  onChange={(e) => onChangeConfig({ marksPerQuestion: Math.max(0.1, parseFloat(e.target.value) || 1) })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Negative Mark
                </label>
                <select
                  value={config.negativeMarking}
                  onChange={(e) => onChangeConfig({ negativeMarking: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white"
                >
                  <option value={0}>0 (No Negative)</option>
                  <option value={0.25}>-0.25 (1/4th)</option>
                  <option value={0.33}>-0.33 (1/3rd)</option>
                  <option value={0.5}>-0.50 (1/2)</option>
                  <option value={1.0}>-1.00 (Full)</option>
                </select>
              </div>
            </div>

            {/* Language & Reuse Policy */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Language Mode
                </label>
                <select
                  value={config.language}
                  onChange={(e) => onChangeConfig({ language: e.target.value as any })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white"
                >
                  <option value="bilingual">Bilingual (Hindi & English)</option>
                  <option value="hindi">Hindi Only (हिंदी)</option>
                  <option value="english">English Only</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Question Reuse Policy
                </label>
                <button
                  type="button"
                  onClick={() => onChangeConfig({ questionReusePolicy: config.questionReusePolicy === 'OFF' ? 'ON' : 'OFF' })}
                  className={`w-full px-3.5 py-2 text-xs font-bold rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    config.questionReusePolicy === 'OFF'
                      ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                      : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  }`}
                >
                  <span>Reuse: <strong>{config.questionReusePolicy}</strong></span>
                  <span className="text-[10px] font-normal opacity-80">
                    {config.questionReusePolicy === 'OFF' ? '100% Unique' : 'Allow Reuse'}
                  </span>
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Distribution Order
                </label>
                <select
                  value={config.questionOrderingPreference}
                  onChange={(e) => onChangeConfig({ questionOrderingPreference: e.target.value as any })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white"
                >
                  <option value="sequential">Sequential by PDF</option>
                  <option value="topic_balanced">Topic Balanced</option>
                  <option value="random_shuffle">Random Shuffled</option>
                </select>
              </div>
            </div>

          </div>

        </div>

        {/* RIGHT COLUMN: CONFIGURATION SUMMARY & CONFIRMATION REQUIREMENT */}
        <div className="lg:col-span-5 space-y-6">
          
          <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-blue-500/40 dark:border-blue-500/30 p-6 shadow-lg space-y-6 sticky top-6">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  Pre-Processing Review
                </span>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Configuration Summary
                </h3>
              </div>
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                <Sliders className="w-5 h-5" />
              </div>
            </div>

            {/* KEY METRICS GRID */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Mock Tests</span>
                <div className="text-xl font-black text-blue-600 dark:text-blue-400 mt-0.5">
                  {totalTests} Tests
                </div>
                <span className="text-[10px] text-slate-400">
                  #{startNum} to #{endNum}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">MCQs per Test</span>
                <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
                  {mcqsPerTest} Questions
                </div>
                <span className="text-[10px] text-slate-400">
                  {totalMarks} Total Marks
                </span>
              </div>
            </div>

            {/* REQUIRED QUESTIONS CALCULATION BANNER */}
            <div className="p-4 rounded-2xl bg-linear-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/40 dark:to-blue-950/40 border border-indigo-200/80 dark:border-indigo-800/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
                  Total Valid MCQs Required:
                </span>
                <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-700">
                  {requiredUniqueQuestions} MCQs
                </span>
              </div>
              <p className="text-[11px] text-indigo-700/80 dark:text-indigo-300/80 leading-relaxed">
                {config.questionReusePolicy === 'OFF' ? (
                  <>
                    <strong>Question Reuse is OFF:</strong> The 360° audit will require at least <strong>{requiredUniqueQuestions}</strong> unique, approved questions ({totalTests} tests × {mcqsPerTest} MCQs).
                  </>
                ) : (
                  <>
                    <strong>Question Reuse is ON:</strong> Tests will draw from approved pool with shared allocation if needed.
                  </>
                )}
              </p>
            </div>

            {/* TARGET SPECIFICATIONS LIST */}
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Destination Path:</span>
                <span className="font-bold text-slate-900 dark:text-white text-right">{config.category}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Practice Mode:</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">{config.practiceMode}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Subject:</span>
                <span className="font-bold text-slate-900 dark:text-white">{config.subject}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Naming Example:</span>
                <span className="font-mono font-bold text-[11px] text-slate-700 dark:text-slate-300">
                  {config.mockTestNamePrefix} - {startNum}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Negative Marking:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {config.negativeMarking === 0 ? 'None (0)' : `-${config.negativeMarking} marks`}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-slate-500">Source PDF:</span>
                <span className="font-bold text-slate-900 dark:text-white truncate max-w-[180px]">
                  {pdfFile ? pdfFile.name : 'No PDF selected'}
                </span>
              </div>
            </div>

            {/* MANDATORY CONFIRMATION ACTION */}
            <div className="pt-2">
              <button
                type="button"
                disabled={!isConfigValid || isProcessing}
                onClick={onConfirmAndStart}
                className={`w-full py-4 px-6 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-3 shadow-lg cursor-pointer ${
                  !isConfigValid || isProcessing
                    ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed shadow-none'
                    : 'bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.01]'
                }`}
              >
                <span>CONFIRM CONFIGURATION & START PROCESSING</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {!pdfFile && (
                <p className="text-[11px] text-center text-amber-600 dark:text-amber-400 font-bold mt-2">
                  * Please upload a PDF file in Step 1 to begin.
                </p>
              )}
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
