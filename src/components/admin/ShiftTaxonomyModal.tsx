import React, { useState, useMemo, useEffect } from 'react';
import { 
  FolderSync, 
  BookOpen, 
  Layers, 
  Check, 
  X, 
  ArrowRight, 
  RefreshCw, 
  Sparkles, 
  Plus, 
  HelpCircle, 
  CheckCircle2, 
  AlertTriangle,
  FolderInput,
  Tag
} from 'lucide-react';
import { Question } from '../../types';
import { dataService } from '../../services/dataService';
import { Modal } from '../common/Modal';

interface ShiftTaxonomyModalProps {
  isOpen: boolean;
  questions: Question[];
  allBankQuestions?: Question[];
  onClose: () => void;
  onSuccess: () => void;
  onToast?: (type: 'success' | 'error' | 'info', msg: string) => void;
}

export const ShiftTaxonomyModal: React.FC<ShiftTaxonomyModalProps> = ({
  isOpen,
  questions,
  allBankQuestions = [],
  onClose,
  onSuccess,
  onToast,
}) => {
  const [isSaving, setIsSaving] = useState(false);

  // Mode toggles for Subject and Chapter
  const [updateSubject, setUpdateSubject] = useState(true);
  const [subjectMode, setSubjectMode] = useState<'existing' | 'new'>('existing');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [customSubject, setCustomSubject] = useState<string>('');

  const [updateChapter, setUpdateChapter] = useState(true);
  const [chapterMode, setChapterMode] = useState<'existing' | 'new'>('existing');
  const [selectedChapter, setSelectedChapter] = useState<string>('');
  const [customChapter, setCustomChapter] = useState<string>('');

  const [updateTopic, setUpdateTopic] = useState(false);
  const [customTopic, setCustomTopic] = useState<string>('');

  // Extract all existing unique subjects from whole bank
  const subjectList = useMemo(() => {
    const map = new Map<string, number>();
    allBankQuestions.forEach((q) => {
      const s = q.subject?.trim() || 'General Studies';
      map.set(s, (map.get(s) || 0) + 1);
    });
    // Ensure default subjects exist if bank is empty
    if (!map.has('General Studies')) map.set('General Studies', 0);
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [allBankQuestions]);

  // Determine effective active subject
  const effectiveSubject = useMemo(() => {
    if (!updateSubject) return null;
    return subjectMode === 'new' ? customSubject.trim() : selectedSubject.trim();
  }, [updateSubject, subjectMode, customSubject, selectedSubject]);

  // Extract chapters for the currently selected subject
  const chapterList = useMemo(() => {
    const map = new Map<string, number>();
    const filterSubj = effectiveSubject || (questions.length === 1 ? questions[0].subject : '');

    allBankQuestions.forEach((q) => {
      if (!filterSubj || q.subject?.toLowerCase().trim() === filterSubj.toLowerCase().trim()) {
        const c = q.chapter?.trim();
        if (c && c !== '') {
          map.set(c, (map.get(c) || 0) + 1);
        }
      }
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [allBankQuestions, effectiveSubject, questions]);

  // Determine effective active chapter
  const effectiveChapter = useMemo(() => {
    if (!updateChapter) return null;
    return chapterMode === 'new' ? customChapter.trim() : selectedChapter.trim();
  }, [updateChapter, chapterMode, customChapter, selectedChapter]);

  // Initialize initial values when opening
  useEffect(() => {
    if (isOpen && questions.length > 0) {
      const firstQ = questions[0];
      const initialSubj = firstQ.subject || 'General Studies';
      setSelectedSubject(initialSubj);
      setCustomSubject('');
      setSubjectMode('existing');

      const initialChap = firstQ.chapter || '';
      setSelectedChapter(initialChap);
      setCustomChapter('');
      setChapterMode(initialChap ? 'existing' : 'new');

      setCustomTopic(firstQ.topic || '');
      setUpdateSubject(true);
      setUpdateChapter(true);
      setUpdateTopic(false);
    }
  }, [isOpen, questions]);

  const handleApplyShift = async () => {
    if (!updateSubject && !updateChapter && !updateTopic) {
      onToast?.('error', 'Please select at least one field (Subject, Chapter, or Topic) to update.');
      return;
    }

    if (updateSubject && !effectiveSubject) {
      onToast?.('error', 'Please select or enter a valid Subject name.');
      return;
    }

    if (updateChapter && chapterMode === 'new' && !customChapter.trim()) {
      onToast?.('error', 'Please enter a valid Chapter name or choose an existing chapter.');
      return;
    }

    setIsSaving(true);
    try {
      const questionIds = questions.map((q) => q.id);
      const payload: { subject?: string; chapter?: string; topic?: string } = {};

      if (updateSubject && effectiveSubject) {
        payload.subject = effectiveSubject;
      }
      if (updateChapter) {
        payload.chapter = effectiveChapter || '';
      }
      if (updateTopic) {
        payload.topic = customTopic.trim() || '';
      }

      const res = await dataService.shiftQuestionsTaxonomy(questionIds, payload);

      if (res.success) {
        onToast?.(
          'success',
          `✓ Successfully shifted ${res.updatedCount} MCQ${res.updatedCount > 1 ? 's' : ''} to ${payload.subject || 'new taxonomy'}${payload.chapter ? ` > ${payload.chapter}` : ''}!`
        );
        onSuccess();
        onClose();
      } else {
        onToast?.('error', 'Failed to update taxonomy. Please try again.');
      }
    } catch (err) {
      console.error('Taxonomy shift error:', err);
      onToast?.('error', 'An error occurred while updating taxonomy.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Shift MCQ Subject & Chapter"
      maxWidth="3xl"
    >
      <div className="space-y-5">
        
        {/* HEADER SUMMARY BANNER */}
        <div className="p-4 bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 dark:from-slate-800 dark:via-indigo-950/40 dark:to-slate-800 rounded-2xl border border-indigo-200/80 dark:border-indigo-800/60 flex items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-xs shrink-0">
              <FolderSync className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Taxonomy Shift & Re-categorization</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-black bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">
                  {questions.length} MCQ{questions.length > 1 ? 's' : ''} Selected
                </span>
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Move selected questions to a different Subject or Chapter instantly across Question Bank and connected Mock Tests.
              </p>
            </div>
          </div>
        </div>

        {/* CONTROLS SECTION */}
        <div className="space-y-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          
          {/* SUBJECT CONFIGURATION */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-white cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={updateSubject}
                  onChange={(e) => setUpdateSubject(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Target Subject</span>
              </label>

              {updateSubject && (
                <div className="flex items-center bg-slate-200 dark:bg-slate-700 p-0.5 rounded-lg text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setSubjectMode('existing')}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      subjectMode === 'existing'
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    Select Existing
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubjectMode('new')}
                    className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
                      subjectMode === 'new'
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    <Plus className="w-3 h-3" />
                    New Subject
                  </button>
                </div>
              )}
            </div>

            {updateSubject ? (
              subjectMode === 'existing' ? (
                <div>
                  <select
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  >
                    <option value="" disabled>-- Choose a Subject --</option>
                    {subjectList.map(([subj, count]) => (
                      <option key={subj} value={subj}>
                        📚 {subj} {count > 0 ? `(${count} MCQs)` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <input
                    type="text"
                    value={customSubject}
                    onChange={(e) => setCustomSubject(e.target.value)}
                    placeholder="Enter new subject name (e.g. Hindi Vyakaran, Reasoning Ability, Indian Polity...)"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>
              )
            ) : (
              <p className="text-xs text-slate-400 italic">
                Subject will remain unchanged for selected questions.
              </p>
            )}
          </div>

          {/* CHAPTER CONFIGURATION */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-white cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={updateChapter}
                  onChange={(e) => setUpdateChapter(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Target Chapter</span>
              </label>

              {updateChapter && (
                <div className="flex items-center bg-slate-200 dark:bg-slate-700 p-0.5 rounded-lg text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setChapterMode('existing')}
                    disabled={chapterList.length === 0}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      chapterMode === 'existing'
                        ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    } disabled:opacity-40`}
                  >
                    Select Existing ({chapterList.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setChapterMode('new')}
                    className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
                      chapterMode === 'new'
                        ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    <Plus className="w-3 h-3" />
                    New Chapter
                  </button>
                </div>
              )}
            </div>

            {updateChapter ? (
              chapterMode === 'existing' && chapterList.length > 0 ? (
                <div>
                  <select
                    value={selectedChapter}
                    onChange={(e) => setSelectedChapter(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 outline-hidden"
                  >
                    <option value="">-- Leave Blank / General Chapter --</option>
                    {chapterList.map(([chapt, count]) => (
                      <option key={chapt} value={chapt}>
                        📑 {chapt} ({count} MCQs)
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <input
                    type="text"
                    value={customChapter}
                    onChange={(e) => setCustomChapter(e.target.value)}
                    placeholder="Enter chapter name (e.g. Noun, Rivers of HP, Percentage, Fundamental Rights...)"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 outline-hidden"
                  />
                </div>
              )
            ) : (
              <p className="text-xs text-slate-400 italic">
                Chapter will remain unchanged for selected questions.
              </p>
            )}
          </div>

          {/* OPTIONAL TOPIC CONFIGURATION */}
          <div className="p-3 rounded-xl bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 space-y-2">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={updateTopic}
                onChange={(e) => setUpdateTopic(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
              />
              <Tag className="w-3.5 h-3.5 text-purple-500" />
              <span>Also update Topic tag (Optional)</span>
            </label>

            {updateTopic && (
              <input
                type="text"
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                placeholder="Enter specific topic tag (e.g. Rules of Direct & Indirect, Mountain Passes...)"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-purple-500 outline-hidden"
              />
            )}
          </div>

        </div>

        {/* QUESTIONS PREVIEW CONTAINER */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400 px-1">
            <span>Questions to be updated ({questions.length})</span>
            <span>Live Transformation Preview</span>
          </div>

          <div className="max-h-52 overflow-y-auto space-y-2 p-1 pr-1.5 scrollbar-thin border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/50">
            {questions.map((q, idx) => {
              const targetSubj = updateSubject ? (effectiveSubject || '(Not Selected)') : q.subject;
              const targetChap = updateChapter ? (effectiveChapter || '(No Chapter)') : (q.chapter || '(No Chapter)');

              return (
                <div
                  key={q.id || idx}
                  className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1.5 shadow-xs"
                >
                  <p className="font-semibold text-slate-900 dark:text-white line-clamp-1">
                    <span className="text-slate-400 mr-1.5">#{idx + 1}</span>
                    {q.question_text}
                  </p>
                  
                  <div className="flex items-center gap-2 flex-wrap text-[11px]">
                    {/* Old taxonomy */}
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-slate-100 dark:bg-slate-700/80 rounded-md text-slate-600 dark:text-slate-300">
                      <span>{q.subject || 'General Studies'}</span>
                      {q.chapter && <span>› {q.chapter}</span>}
                    </div>

                    <ArrowRight className="w-3.5 h-3.5 text-indigo-500 shrink-0" />

                    {/* New taxonomy */}
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-md font-bold text-indigo-700 dark:text-indigo-300">
                      <span>{targetSubj}</span>
                      <span>› {targetChap}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleApplyShift}
            disabled={isSaving || (updateSubject && !effectiveSubject)}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Shifting Taxonomy...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Apply & Shift {questions.length} MCQ{questions.length > 1 ? 's' : ''}</span>
              </>
            )}
          </button>
        </div>

      </div>
    </Modal>
  );
};
