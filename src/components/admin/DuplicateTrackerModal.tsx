import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Trash2,
  ShieldCheck,
  Zap,
  X,
  Sparkles,
  ArrowRight,
  Eye,
  Check,
  RefreshCw,
  Download,
  Filter,
  Search,
  BookOpen,
  Split,
  FileText,
  Bookmark,
  Layers
} from 'lucide-react';
import { Question } from '../../types';
import { scoreQuestionQuality } from '../../utils/duplicateDetector';
import { SemanticDuplicateGroup, SemanticMatchType } from '../../utils/semanticVectorDeduplication';
import { dataService } from '../../services/dataService';
import { duxqeMutationEngine } from '../../services/duxqeMutationEngine';
import { DUXQEMutateModal } from './DUXQEMutateModal';

interface DuplicateTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  groups: (SemanticDuplicateGroup | any)[];
  totalDuplicateCount: number;
  onRefreshData: () => Promise<void>;
  onToast?: (type: 'success' | 'error' | 'info', msg: string) => void;
  onEditQuestion?: (q: Question) => void;
  initialFocusedGroupId?: string | null;
}

export const DuplicateTrackerModal: React.FC<DuplicateTrackerModalProps> = ({
  isOpen,
  onClose,
  groups,
  totalDuplicateCount,
  onRefreshData,
  onToast,
  onEditQuestion,
  initialFocusedGroupId,
}) => {
  const [filterType, setFilterType] = useState<'all' | SemanticMatchType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [autoHealLinkedMockTests, setAutoHealLinkedMockTests] = useState(true);
  const [dismissedGroupIds, setDismissedGroupIds] = useState<Set<string>>(new Set());
  const [activeGroupId, setActiveGroupId] = useState<string | null>(initialFocusedGroupId || null);
  
  // DU-XQE Mutation State
  const [mutatingQuestion, setMutatingQuestion] = useState<Question | null>(null);

  if (!isOpen) return null;

  // Filter active groups
  const visibleGroups = groups.filter((g) => {
    if (dismissedGroupIds.has(g.groupId)) return false;
    if (filterType !== 'all' && g.matchType !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const hasMatch = g.questions.some(
        (item: Question) =>
          item.question_text?.toLowerCase().includes(q) ||
          item.subject?.toLowerCase().includes(q) ||
          item.option_a?.toLowerCase().includes(q)
      );
      if (!hasMatch) return false;
    }
    return true;
  });

  const exactCount = groups.filter((g) => g.matchType === 'exact_copy' && !dismissedGroupIds.has(g.groupId)).length;
  const shuffledCount = groups.filter((g) => g.matchType === 'shuffled_options' && !dismissedGroupIds.has(g.groupId)).length;
  const nearCount = groups.filter((g) => g.matchType === 'near_identical' && !dismissedGroupIds.has(g.groupId)).length;
  const semanticCount = groups.filter((g) => g.matchType === 'semantic_concept_duplicate' && !dismissedGroupIds.has(g.groupId)).length;

  // Resolve single group: Keep specific question and delete the others
  const handleResolveGroup = async (group: SemanticDuplicateGroup, keepQuestionId: string) => {
    try {
      setIsProcessing(true);
      const toDelete = group.questions.filter((q) => q.id !== keepQuestionId);
      const keptQuestion = group.questions.find((q) => q.id === keepQuestionId) || group.questions[0];

      const deletedIds: string[] = [];
      const retainedMap = new Map<string, Question>();

      for (const q of toDelete) {
        deletedIds.push(q.id);
        retainedMap.set(q.id, keptQuestion);
      }

      await dataService.deleteQuestionsFromBankBatch(deletedIds, retainedMap);

      let healMsg = '';
      if (autoHealLinkedMockTests && deletedIds.length > 0) {
        const healResult = await duxqeMutationEngine.autoHealAndRefillMockTests(
          deletedIds,
          retainedMap
        );
        if (healResult.totalTestsAffected > 0) {
          healMsg = ` 🧬 Auto-Healed ${healResult.totalTestsAffected} linked Mock Test(s) (Replaced: ${healResult.totalQuestionsReplaced}, DU-XQE Refilled: ${healResult.totalQuestionsRegenerated}).`;
        }
      }

      onToast?.(
        'success',
        `Retained selected MCQ and removed ${toDelete.length} duplicate copy!${healMsg}`
      );
      setDismissedGroupIds((prev) => new Set([...prev, group.groupId]));
      await onRefreshData();
    } catch (err: any) {
      console.error('Resolve group error:', err);
      onToast?.('error', 'Failed to resolve duplicate group.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Dismiss group (keep both as valid distinct questions)
  const handleDismissGroup = (groupId: string) => {
    setDismissedGroupIds((prev) => new Set([...prev, groupId]));
    onToast?.('info', 'Group dismissed. Both MCQs will be preserved.');
  };

  // Auto-clean all visible duplicate groups
  const handleAutoCleanAll = async () => {
    if (visibleGroups.length === 0) {
      onToast?.('info', 'No duplicate groups to clean!');
      return;
    }

    const redundantCount = visibleGroups.reduce((acc, g) => acc + (g.questions.length - 1), 0);
    const confirmed = window.confirm(
      `Auto-Clean All Semantic Duplicates?\n\nThis will keep the HIGHEST QUALITY version (highest QA score, complete explanation & verified status) for each of the ${visibleGroups.length} duplicate groups and remove ${redundantCount} redundant copies.\n\n${
        autoHealLinkedMockTests
          ? '✓ DU-XQE Auto-Healing will ensure all linked Mock Tests maintain their exact question counts!'
          : ''
      }\n\nDo you want to proceed?`
    );
    if (!confirmed) return;

    try {
      setIsProcessing(true);
      let removedTotal = 0;
      const deletedIds: string[] = [];
      const retainedMap = new Map<string, Question>();

      for (const group of visibleGroups) {
        const keepId = group.bestQuestionId;
        const keptQ = group.questions.find((q: Question) => q.id === keepId) || group.questions[0];
        const toDelete = group.questions.filter((q: Question) => q.id !== keepId);

        for (const q of toDelete) {
          deletedIds.push(q.id);
          retainedMap.set(q.id, keptQ);
          removedTotal++;
        }
      }

      await dataService.deleteQuestionsFromBankBatch(deletedIds, retainedMap);

      let healMsg = '';
      if (autoHealLinkedMockTests && deletedIds.length > 0) {
        const healResult = await duxqeMutationEngine.autoHealAndRefillMockTests(
          deletedIds,
          retainedMap
        );
        if (healResult.totalTestsAffected > 0) {
          healMsg = ` 🧬 DU-XQE Auto-Healed ${healResult.totalTestsAffected} linked Mock Tests to maintain full target question counts!`;
        }
      }

      onToast?.(
        'success',
        `Successfully auto-cleaned ${removedTotal} duplicate questions across ${visibleGroups.length} groups!${healMsg}`
      );
      await onRefreshData();
      onClose();
    } catch (err: any) {
      console.error('Auto clean error:', err);
      onToast?.('error', 'Error while auto-cleaning duplicates.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Export Duplicate Report as JSON
  const handleExportReport = () => {
    const reportData = {
      generatedAt: new Date().toISOString(),
      engine: 'Semantic Vector Deduplication & DU-XQE Mutation Engine',
      summary: {
        totalDuplicateGroups: groups.length,
        totalQuestionsInvolved: totalDuplicateCount,
        exactMatchGroups: exactCount,
        shuffledOptionsGroups: shuffledCount,
        nearIdenticalGroups: nearCount,
        semanticConceptGroups: semanticCount,
      },
      duplicateGroups: groups.map((g, idx) => ({
        groupNumber: idx + 1,
        matchType: g.matchType,
        confidence: `${g.confidence}%`,
        reason: g.reason,
        vectorSimilarity: g.vectorSimilarity,
        recommendedBestQuestionId: g.bestQuestionId,
        questions: g.questions.map((q: Question) => ({
          id: q.id,
          question_text: q.question_text,
          subject: q.subject,
          chapter: q.chapter,
          options: { A: q.option_a, B: q.option_b, C: q.option_c, D: q.option_d },
          correct_answer: q.correct_answer,
          explanation: q.explanation,
          qualityScore: scoreQuestionQuality(q),
        })),
      })),
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Semantic_Vector_MCQ_Audit_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    onToast?.('success', 'Semantic duplicate report exported successfully!');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* MODAL HEADER */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center font-black shrink-0 shadow-xs">
              <AlertCircle className="w-6 h-6 text-rose-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg sm:text-xl font-black tracking-tight text-white">
                  Semantic Vector Deduplication & DU-XQE Engine
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-500 text-white shadow-xs">
                  {visibleGroups.length} Groups ({visibleGroups.reduce((acc, g) => acc + g.questions.length, 0)} MCQs)
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Cosine N-Gram vector comparison with DU-XQE Mock Test auto-healing. Never lose required test question counts.
              </p>
            </div>
          </div>

          {/* Top Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleExportReport}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-white/15"
              title="Download detailed duplicate analysis report"
            >
              <Download className="w-4 h-4 text-slate-300" />
              <span>Export Audit</span>
            </button>

            <button
              onClick={handleAutoCleanAll}
              disabled={isProcessing || visibleGroups.length === 0}
              className="px-4 py-2 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white rounded-xl text-xs font-black shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isProcessing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
              )}
              <span>Auto-Clean All Duplicates</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* AUTO-HEAL TOGGLE & METRICS BAR */}
        <div className="px-4 py-3 bg-purple-50/70 dark:bg-purple-950/30 border-b border-purple-200 dark:border-purple-900/50 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center font-black shrink-0 shadow-2xs">
              <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
            </div>
            <div>
              <span className="font-black text-purple-950 dark:text-purple-200">
                DU-XQE Auto-Heal & Maintain Mock Test MCQ Counts
              </span>
              <p className="text-[11px] text-purple-800/80 dark:text-purple-300/80">
                When duplicates are removed from Question Bank, linked mock tests are automatically relinked or refilled with fresh unique MCQs.
              </p>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-purple-200 dark:border-purple-800 shrink-0">
            <input
              type="checkbox"
              checked={autoHealLinkedMockTests}
              onChange={(e) => setAutoHealLinkedMockTests(e.target.checked)}
              className="w-4 h-4 text-purple-600 rounded cursor-pointer"
            />
            <span className="font-bold text-xs text-purple-900 dark:text-purple-200">
              Auto-Heal Linked Tests
            </span>
          </label>
        </div>

        {/* METRICS & FILTER BAR */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
          
          {/* STAT PILLS */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                filterType === 'all'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <span>All Duplicates</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20">{groups.length}</span>
            </button>

            <button
              onClick={() => setFilterType('exact_copy')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                filterType === 'exact_copy'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60'
              }`}
            >
              <span>100% Exact Copy</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20">{exactCount}</span>
            </button>

            <button
              onClick={() => setFilterType('shuffled_options')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                filterType === 'shuffled_options'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/60'
              }`}
            >
              <span>Shuffled Options</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20">{shuffledCount}</span>
            </button>

            <button
              onClick={() => setFilterType('near_identical')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                filterType === 'near_identical'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-900/60'
              }`}
            >
              <span>Near-Identical</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20">{nearCount}</span>
            </button>

            <button
              onClick={() => setFilterType('semantic_concept_duplicate')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                filterType === 'semantic_concept_duplicate'
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-900/60'
              }`}
            >
              <span>Semantic Concept</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20">{semanticCount}</span>
            </button>
          </div>

          {/* SEARCH INPUT */}
          <div className="relative w-full md:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search in duplicate groups..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* MODAL BODY: GROUP BY GROUP SIDE-BY-SIDE COMPARISON */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {visibleGroups.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-black text-slate-900 dark:text-white">
                No Duplicate MCQs Detected!
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                All questions in the Question Bank have distinct semantic vector signatures and unique option sets.
              </p>
            </div>
          ) : (
            visibleGroups.map((group, gIdx) => {
              const qA = group.questions[0];
              const bestQ = group.questions.find((q: Question) => q.id === group.bestQuestionId) || qA;

              return (
                <div
                  key={group.groupId}
                  id={group.groupId}
                  className="rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-sm overflow-hidden space-y-4 p-4 sm:p-5 transition-all hover:border-indigo-300 dark:hover:border-indigo-700"
                >
                  {/* GROUP HEADER BADGES & REASON */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-md text-xs font-black bg-slate-900 dark:bg-slate-800 text-white">
                        Group #{gIdx + 1}
                      </span>

                      <span
                        className={`px-2.5 py-0.5 rounded-md text-xs font-black border ${
                          group.matchType === 'exact_copy'
                            ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900'
                            : group.matchType === 'shuffled_options'
                            ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900'
                            : group.matchType === 'semantic_concept_duplicate'
                            ? 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-900'
                            : 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-900'
                        }`}
                      >
                        {group.matchType === 'exact_copy'
                          ? '100% Exact Copy'
                          : group.matchType === 'shuffled_options'
                          ? 'Shuffled Options Match'
                          : group.matchType === 'semantic_concept_duplicate'
                          ? 'Semantic Concept Duplicate'
                          : 'Near-Identical MCQ'}
                      </span>

                      <span className="text-xs font-bold text-slate-500">
                        Confidence: <strong className="text-slate-900 dark:text-white">{group.confidence}%</strong>
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                      💡 {group.reason}
                    </p>
                  </div>

                  {/* SIDE BY SIDE DUAL COMPARISON GRID */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {group.questions.map((q: Question, qIndex: number) => {
                      const isBest = q.id === bestQ.id;
                      const qScore = scoreQuestionQuality(q);
                      const linkedTests = group.linkedMockTests ? group.linkedMockTests[q.id] : undefined;

                      return (
                        <div
                          key={q.id}
                          className={`rounded-2xl border p-4 space-y-3 relative flex flex-col justify-between ${
                            isBest
                              ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/80 shadow-xs'
                              : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          <div className="space-y-2.5">
                            {/* Card Top Label & Best Badge */}
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-md bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                                  Version {qIndex + 1}
                                </span>
                                <span className="text-[11px] text-slate-500 font-mono truncate max-w-[120px]">
                                  #{q.id.slice(-8)}
                                </span>
                              </div>

                              {isBest ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-600 text-white flex items-center gap-1 shadow-2xs">
                                  <Sparkles className="w-3 h-3 text-amber-300" />
                                  <span>Recommended Best Version</span>
                                </span>
                              ) : (
                                <span className="text-[10px] font-semibold text-slate-400">
                                  Duplicate Copy
                                </span>
                              )}
                            </div>

                            {/* LINKED MOCK TESTS BADGES */}
                            {linkedTests && linkedTests.length > 0 && (
                              <div className="p-2 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 text-[11px] space-y-1">
                                <div className="flex items-center gap-1 font-bold text-blue-700 dark:text-blue-300">
                                  <Bookmark className="w-3 h-3 text-blue-500" />
                                  <span>Linked in {linkedTests.length} Mock Test(s):</span>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {linkedTests.map((lt, ltIdx) => (
                                    <span
                                      key={ltIdx}
                                      className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-700 text-[10px] font-semibold text-blue-800 dark:text-blue-200"
                                    >
                                      📌 {lt.testTitle} (Q#{lt.questionIndex})
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Question Text */}
                            <div className="space-y-1">
                              <p className="text-xs font-bold text-slate-900 dark:text-white leading-relaxed">
                                {q.question_text}
                              </p>
                              <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-500">
                                <span>Subject: {q.subject || 'General'}</span>
                                <span>•</span>
                                <span>Chapter: {q.chapter || 'General'}</span>
                              </div>
                            </div>

                            {/* Options Comparison Breakdown */}
                            <div className="space-y-1.5 pt-1">
                              {[
                                { key: 'A', text: q.option_a },
                                { key: 'B', text: q.option_b },
                                { key: 'C', text: q.option_c },
                                { key: 'D', text: q.option_d },
                              ].map((opt) => {
                                const isCorrect = q.correct_answer === opt.key;
                                return (
                                  <div
                                    key={opt.key}
                                    className={`px-3 py-1.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                                      isCorrect
                                        ? 'bg-emerald-100/60 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200 font-bold'
                                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 truncate">
                                      <span className="w-4 font-black text-slate-400">{opt.key}.</span>
                                      <span className="truncate">{opt.text || <em className="text-slate-400">Empty</em>}</span>
                                    </div>
                                    {isCorrect && (
                                      <span className="text-[10px] font-black px-1.5 py-0.2 rounded-md bg-emerald-600 text-white shrink-0">
                                        Correct Ans ✓
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            {/* Explanation & Quality Score */}
                            <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 text-[11px] space-y-1">
                              <div className="flex items-center justify-between text-slate-500 font-bold">
                                <span>Explanation:</span>
                                <span className="text-indigo-600 dark:text-indigo-400">
                                  Quality Score: {qScore}/100
                                </span>
                              </div>
                              <p className="text-slate-700 dark:text-slate-300 line-clamp-3">
                                {q.explanation || <em className="text-slate-400">No explanation present</em>}
                              </p>
                            </div>
                          </div>

                          {/* ACTION BUTTONS FOR THIS VERSION */}
                          <div className="pt-3 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              {onEditQuestion && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onClose();
                                    onEditQuestion(q);
                                  }}
                                  className="text-[11px] font-bold text-slate-600 dark:text-slate-400 hover:text-indigo-600 underline cursor-pointer"
                                >
                                  Edit
                                </button>
                              )}

                              {/* DU-XQE MUTATE BUTTON */}
                              <button
                                type="button"
                                onClick={() => setMutatingQuestion(q)}
                                className="px-2.5 py-1 bg-purple-100 hover:bg-purple-200 dark:bg-purple-950 dark:hover:bg-purple-900 text-purple-900 dark:text-purple-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer border border-purple-200 dark:border-purple-800"
                                title="Mutate this question with DU-XQE into a brand new cognitive angle"
                              >
                                <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                                <span>Mutate (DU-XQE)</span>
                              </button>
                            </div>

                            <button
                              type="button"
                              disabled={isProcessing}
                              onClick={() => handleResolveGroup(group, q.id)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                                isBest
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                              }`}
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Keep This (Clean Duplicates)</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* GROUP FOOTER ACTION: DISMISS */}
                  <div className="flex items-center justify-between pt-2 text-xs text-slate-500">
                    <span className="text-[11px]">
                      Not a duplicate? Both questions will be preserved in Question Bank.
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDismissGroup(group.groupId)}
                      className="px-3 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-lg transition-all cursor-pointer text-xs"
                    >
                      Keep Both (Dismiss Warning)
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-500" />
            <span>
              Semantic Vector Deduplication & DU-XQE protects test validity and question bank integrity.
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 dark:bg-slate-700 text-white font-bold rounded-xl transition-all cursor-pointer"
          >
            Close Report
          </button>
        </div>
      </div>

      {/* DU-XQE MUTATE MODAL */}
      {mutatingQuestion && (
        <DUXQEMutateModal
          isOpen={!!mutatingQuestion}
          sourceQuestion={mutatingQuestion}
          onClose={() => setMutatingQuestion(null)}
          onSuccess={async (mutated) => {
            await dataService.saveQuestionToBank(mutated);
            onToast?.('success', `✨ Saved DU-XQE mutated variant into Question Bank!`);
            await onRefreshData();
          }}
          onToast={onToast}
        />
      )}
    </div>
  );
};
