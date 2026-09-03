import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import {
  Folder,
  BookOpen,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Search,
  Layers,
  Sparkles,
  GraduationCap
} from 'lucide-react';
import { dataService } from '../../services/dataService';
import { Question, Test } from '../../types';

interface CategorySubjectManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'categories' | 'subjects' | 'sections';
  onUpdated?: () => void;
  onToast?: (type: 'success' | 'error' | 'info', msg: string) => void;
}

export const CategorySubjectManagerModal: React.FC<CategorySubjectManagerModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'categories',
  onUpdated,
  onToast
}) => {
  const [activeTab, setActiveTab] = useState<'categories' | 'subjects' | 'sections'>(initialTab);
  const [categories, setCategories] = useState<string[]>(() => dataService.getMasterCategories());
  const [subjects, setSubjects] = useState<string[]>(() => dataService.getMasterSubjects());
  const [sections, setSections] = useState<string[]>(() => dataService.getMasterSections());
  const [tests, setTests] = useState<Test[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // New item inputs
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSectionName, setNewSectionName] = useState('');

  // Editing state
  const [editingItem, setEditingItem] = useState<{ original: string; current: string } | null>(null);

  const refreshSyncState = () => {
    setCategories(dataService.getMasterCategories());
    setSubjects(dataService.getMasterSubjects());
    setSections(dataService.getMasterSections());
  };

  const loadData = async () => {
    try {
      refreshSyncState();
      // Load background test and bank counts without blocking UI
      const [allTests, allBankQs] = await Promise.all([
        dataService.getTests(),
        dataService.getAllQuestionBank()
      ]);
      setTests(allTests || []);
      setQuestions(allBankQs || []);
    } catch (err: any) {
      console.error('Failed to load master taxonomy data:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      refreshSyncState();
      loadData();
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    const handleTaxonomyUpdate = () => {
      refreshSyncState();
    };
    window.addEventListener('gradeup_taxonomy_updated', handleTaxonomyUpdate);
    return () => {
      window.removeEventListener('gradeup_taxonomy_updated', handleTaxonomyUpdate);
    };
  }, []);

  if (!isOpen) return null;

  // Add Category
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newCategoryName.trim();
    if (!name) return;
    if (categories.some(c => c.toLowerCase() === name.toLowerCase())) {
      onToast?.('info', `Category "${name}" already exists.`);
      return;
    }

    try {
      await dataService.saveMasterCategory(name);
      setNewCategoryName('');
      onToast?.('success', `Category "${name}" added successfully!`);
      refreshSyncState();
      onUpdated?.();
    } catch (err: any) {
      onToast?.('error', 'Failed to add category');
    }
  };

  // Add Subject
  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newSubjectName.trim();
    if (!name) return;
    if (subjects.some(s => s.toLowerCase() === name.toLowerCase())) {
      onToast?.('info', `Subject "${name}" already exists.`);
      return;
    }

    try {
      await dataService.saveMasterSubject(name);
      setNewSubjectName('');
      onToast?.('success', `Subject "${name}" added successfully!`);
      refreshSyncState();
      onUpdated?.();
    } catch (err: any) {
      onToast?.('error', 'Failed to add subject');
    }
  };

  // Add Section
  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newSectionName.trim();
    if (!name) return;
    if (sections.some(s => s.toLowerCase() === name.toLowerCase())) {
      onToast?.('info', `Section "${name}" already exists.`);
      return;
    }

    try {
      await dataService.saveMasterSection(name);
      setNewSectionName('');
      onToast?.('success', `Section "${name}" added successfully!`);
      refreshSyncState();
      onUpdated?.();
    } catch (err: any) {
      onToast?.('error', 'Failed to add section');
    }
  };

  // Delete Category
  const handleDeleteCategory = async (categoryName: string) => {
    if (window.confirm(`Are you sure you want to remove category "${categoryName}" from the master list?`)) {
      try {
        await dataService.deleteMasterCategory(categoryName);
        onToast?.('success', `Category "${categoryName}" removed.`);
        refreshSyncState();
        onUpdated?.();
      } catch (err: any) {
        onToast?.('error', 'Failed to delete category');
      }
    }
  };

  // Delete Subject
  const handleDeleteSubject = async (subjectName: string) => {
    if (window.confirm(`Are you sure you want to remove subject "${subjectName}" from the master list?`)) {
      try {
        await dataService.deleteMasterSubject(subjectName);
        onToast?.('success', `Subject "${subjectName}" removed.`);
        refreshSyncState();
        onUpdated?.();
      } catch (err: any) {
        onToast?.('error', 'Failed to delete subject');
      }
    }
  };

  // Delete Section
  const handleDeleteSection = async (sectionName: string) => {
    if (window.confirm(`Are you sure you want to remove section "${sectionName}" from the master list?`)) {
      try {
        await dataService.deleteMasterSection(sectionName);
        onToast?.('success', `Section "${sectionName}" removed.`);
        refreshSyncState();
        onUpdated?.();
      } catch (err: any) {
        onToast?.('error', 'Failed to delete section');
      }
    }
  };

  // Save Edit
  const handleSaveEdit = async () => {
    if (!editingItem || !editingItem.current.trim()) return;
    const newName = editingItem.current.trim();
    const oldName = editingItem.original;

    if (newName === oldName) {
      setEditingItem(null);
      return;
    }

    try {
      if (activeTab === 'categories') {
        await dataService.deleteMasterCategory(oldName);
        await dataService.saveMasterCategory(newName);
        onToast?.('success', `Category renamed to "${newName}"!`);
      } else if (activeTab === 'subjects') {
        await dataService.deleteMasterSubject(oldName);
        await dataService.saveMasterSubject(newName);
        onToast?.('success', `Subject renamed to "${newName}"!`);
      } else {
        await dataService.deleteMasterSection(oldName);
        await dataService.saveMasterSection(newName);
        onToast?.('success', `Section renamed to "${newName}"!`);
      }
      setEditingItem(null);
      refreshSyncState();
      onUpdated?.();
    } catch (err: any) {
      onToast?.('error', 'Failed to update name');
    }
  };

  // Count helper
  const getCategoryTestCount = (catName: string) => {
    return tests.filter(t => (t.category || '').toLowerCase() === catName.toLowerCase()).length;
  };

  const getSubjectMCQCount = (subName: string) => {
    return questions.filter(q => (q.subject || '').toLowerCase() === subName.toLowerCase()).length;
  };

  const getSectionMCQCount = (secName: string) => {
    return questions.filter(q => (q.section || '').toLowerCase() === secName.toLowerCase()).length;
  };

  const filteredCategories = categories.filter(c =>
    c.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSubjects = subjects.filter(s =>
    s.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSections = sections.filter(s =>
    s.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Master Categories, Subjects & Sections Pipeline"
      maxWidth="3xl"
    >
      <div className="space-y-6">
        {/* TOP NOTICE */}
        <div className="p-4 bg-gradient-to-r from-blue-900/20 via-indigo-900/20 to-purple-900/20 border border-blue-500/30 rounded-2xl text-xs space-y-1">
          <div className="flex items-center gap-2 font-black text-blue-700 dark:text-blue-300 text-sm">
            <GraduationCap className="w-4 h-4 text-blue-500" />
            <span>Unified Taxonomy & Section Pipeline</span>
          </div>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            Yaha par create ki gayi sabhi Categories, Subjects aur Sections har jagah reflect honge: <strong>AI Automation (PDF OCR)</strong>, Mock Test Creator, MCQ Bank, aur Filters me.
          </p>
        </div>

        {/* TAB SWITCHER */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveTab('categories');
                setEditingItem(null);
              }}
              className={`px-3.5 py-2 rounded-xl font-black text-xs transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'categories'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              <Folder className="w-4 h-4" />
              <span>Exam Categories ({categories.length})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('subjects');
                setEditingItem(null);
              }}
              className={`px-3.5 py-2 rounded-xl font-black text-xs transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'subjects'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Subjects & Topics ({subjects.length})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('sections');
                setEditingItem(null);
              }}
              className={`px-3.5 py-2 rounded-xl font-black text-xs transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'sections'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Exam Sections ({sections.length})</span>
            </button>
          </div>

          {/* SEARCH BAR */}
          <div className="relative w-full sm:w-52">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${activeTab}...`}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-xs rounded-xl border border-slate-200 dark:border-slate-700 font-semibold"
            />
          </div>
        </div>

        {/* ADD NEW ITEM ROW */}
        {activeTab === 'categories' ? (
          <form onSubmit={handleAddCategory} className="flex gap-2">
            <input
              type="text"
              required
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="e.g. HP Police Constable, HP Patwari, HPPSC Allied, SSC CGL..."
              className="flex-1 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold"
            />
            <button
              type="submit"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add Category</span>
            </button>
          </form>
        ) : activeTab === 'subjects' ? (
          <form onSubmit={handleAddSubject} className="flex gap-2">
            <input
              type="text"
              required
              value={newSubjectName}
              onChange={(e) => setNewSubjectName(e.target.value)}
              placeholder="e.g. Himachal Pradesh GK, Logical Reasoning, Indian Polity, Hindi..."
              className="flex-1 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold"
            />
            <button
              type="submit"
              className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add Subject</span>
            </button>
          </form>
        ) : (
          <form onSubmit={handleAddSection} className="flex gap-2">
            <input
              type="text"
              required
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
              placeholder="e.g. Section A: General Science, Section B: Reasoning, General Studies..."
              className="flex-1 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold"
            />
            <button
              type="submit"
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add Section</span>
            </button>
          </form>
        )}

        {/* LIST VIEW */}
        <div className="max-h-[420px] overflow-y-auto space-y-2 pr-1">
          {activeTab === 'categories' ? (
            filteredCategories.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-xs">
                No categories found matching your search. Add one above!
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {filteredCategories.map((cat) => {
                  const testCount = getCategoryTestCount(cat);
                  const isEditing = editingItem?.original === cat;

                  return (
                    <div
                      key={cat}
                      className="p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-2 shadow-xs group hover:border-blue-300 dark:hover:border-blue-700 transition-all"
                    >
                      {isEditing ? (
                        <div className="flex items-center gap-1.5 flex-1">
                          <input
                            type="text"
                            value={editingItem.current}
                            onChange={(e) => setEditingItem({ ...editingItem, current: e.target.value })}
                            className="flex-1 px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-blue-500 rounded-lg text-xs font-bold"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={handleSaveEdit}
                            className="p-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 cursor-pointer"
                            title="Save"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingItem(null)}
                            className="p-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 cursor-pointer"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                              <Folder className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                {cat}
                              </p>
                              <span className="text-[10px] text-slate-400 font-medium">
                                {testCount} Mock {testCount === 1 ? 'Test' : 'Tests'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => setEditingItem({ original: cat, current: cat })}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition-colors cursor-pointer"
                              title="Edit Category Name"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCategory(cat)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
                              title="Delete Category"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          ) : activeTab === 'subjects' ? (
            filteredSubjects.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-xs">
                No subjects found matching your search. Add one above!
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {filteredSubjects.map((sub) => {
                  const qCount = getSubjectMCQCount(sub);
                  const isEditing = editingItem?.original === sub;

                  return (
                    <div
                      key={sub}
                      className="p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-2 shadow-xs group hover:border-purple-300 dark:hover:border-purple-700 transition-all"
                    >
                      {isEditing ? (
                        <div className="flex items-center gap-1.5 flex-1">
                          <input
                            type="text"
                            value={editingItem.current}
                            onChange={(e) => setEditingItem({ ...editingItem, current: e.target.value })}
                            className="flex-1 px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-purple-500 rounded-lg text-xs font-bold"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={handleSaveEdit}
                            className="p-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 cursor-pointer"
                            title="Save"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingItem(null)}
                            className="p-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 cursor-pointer"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                              <BookOpen className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                {sub}
                              </p>
                              <span className="text-[10px] text-slate-400 font-medium">
                                {qCount} MCQs in Bank
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => setEditingItem({ original: sub, current: sub })}
                              className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/50 rounded-lg transition-colors cursor-pointer"
                              title="Edit Subject Name"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSubject(sub)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
                              title="Delete Subject"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            filteredSections.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-xs">
                No sections found matching your search. Add one above!
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {filteredSections.map((sec) => {
                  const qCount = getSectionMCQCount(sec);
                  const isEditing = editingItem?.original === sec;

                  return (
                    <div
                      key={sec}
                      className="p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-2 shadow-xs group hover:border-emerald-300 dark:hover:border-emerald-700 transition-all"
                    >
                      {isEditing ? (
                        <div className="flex items-center gap-1.5 flex-1">
                          <input
                            type="text"
                            value={editingItem.current}
                            onChange={(e) => setEditingItem({ ...editingItem, current: e.target.value })}
                            className="flex-1 px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-emerald-500 rounded-lg text-xs font-bold"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={handleSaveEdit}
                            className="p-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 cursor-pointer"
                            title="Save"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingItem(null)}
                            className="p-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 cursor-pointer"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                              <Layers className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                {sec}
                              </p>
                              <span className="text-[10px] text-slate-400 font-medium">
                                {qCount} MCQs in Section
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => setEditingItem({ original: sec, current: sec })}
                              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-lg transition-colors cursor-pointer"
                              title="Edit Section Name"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSection(sec)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
                              title="Delete Section"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>

        {/* FOOTER */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Changes are automatically synchronized across all mock tests, PDF OCR automation, and question bank.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-xs rounded-xl shadow-xs cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </Modal>
  );
};
