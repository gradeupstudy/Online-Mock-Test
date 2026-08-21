import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Upload, FileSpreadsheet, CheckCircle, AlertTriangle, Download, Trash2, ArrowRight } from 'lucide-react';
import { parseQuestionsCSV, CSVParseResult } from '../../utils/csv';
import { Question } from '../../types';
import { dataService, parseSafeNumber } from '../../services/dataService';

interface BulkImportModalProps {
  isOpen: boolean;
  testId: string;
  onClose: () => void;
  onSuccessImport: () => void;
  onToast?: (type: 'success' | 'error' | 'info', msg: string) => void;
}

export const BulkImportModal: React.FC<BulkImportModalProps> = ({
  isOpen,
  testId,
  onClose,
  onSuccessImport,
  onToast
}) => {
  const notify = (type: 'success' | 'error' | 'info', msg: string) => {
    if (typeof onToast === 'function') {
      onToast(type, msg);
    }
  };
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [result, setResult] = useState<CSVParseResult | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setParsing(true);
      let testNeg = 0;
      let testMarks = 1;
      if (testId && testId !== 'bank') {
        const testObj = await dataService.getTestBySlugOrId(testId);
        if (testObj) {
          testNeg = parseSafeNumber(testObj.negative_marking, 0);
          testMarks = parseSafeNumber(testObj.marks_per_question, 1);
        }
      }
      const parseRes = await parseQuestionsCSV(selectedFile, testId, testNeg, testMarks);
      setResult(parseRes);
      setParsing(false);
    }
  };

  const handleDownloadSample = () => {
    const csvContent = `Question,Option_A,Option_B,Option_C,Option_D,Answer,Explanation,Subject,Chapter,Marks,Negative_Marks
Who is known as the Father of Indian Constitution?,Mahatma Gandhi,Dr. B. R. Ambedkar,Jawaharlal Nehru,Sardar Patel,B,Dr. Ambedkar was chairman of drafting committee.,Indian Polity,Constitution,1,0
Which river is known as Iravati in Sanskrit?,Beas,Ravi,Satluj,Chenab,B,Ravi river was called Iravati.,HP GK,Rivers of HP,1,0
What is 15% of 200?,20,25,30,35,C,15 * 200 / 100 = 30.,Maths,Percentage,1,0`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'Gradeup_Study_Questions_Sample.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleConfirmImport = async () => {
    if (!result || result.questions.length === 0) return;

    // Get existing questions and append
    const existing = await dataService.getQuestions(testId);
    let testNeg = 0;
    let testMarks = 1;
    if (testId && testId !== 'bank') {
      const testObj = await dataService.getTestBySlugOrId(testId);
      if (testObj) {
        testNeg = parseSafeNumber(testObj.negative_marking, 0);
        testMarks = parseSafeNumber(testObj.marks_per_question, 1);
      }
    }
    let startNum = existing.length + 1;

    const newQuestions = result.questions.map((q) => ({
      ...q,
      question_number: startNum++,
      marks: q.marks !== undefined && q.marks !== null ? q.marks : testMarks,
      negative_marks: q.negative_marks !== undefined && q.negative_marks !== null ? q.negative_marks : testNeg
    }));

    const combined = [...existing, ...newQuestions];
    await dataService.saveQuestions(testId, combined);

    onToast?.('success', `Successfully imported ${newQuestions.length} questions!`);
    onSuccessImport();
    handleReset();
    onClose();
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Bulk Import Questions via CSV" maxWidth="4xl">
      <div className="space-y-6">
        
        {/* Helper Instructions & Sample Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900 text-xs">
          <div>
            <p className="font-bold text-blue-900 dark:text-blue-200 text-sm">CSV Format Guidelines</p>
            <p className="text-blue-700 dark:text-blue-300">
              Columns required: <code className="font-bold">Question, Option_A, Option_B, Option_C, Option_D, Answer (A/B/C/D), Explanation, Subject, Chapter</code>
            </p>
          </div>
          <button
            onClick={handleDownloadSample}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shrink-0 transition-colors"
          >
            <Download className="w-4 h-4" /> Download Sample CSV
          </button>
        </div>

        {/* Dropzone */}
        {!result && (
          <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-8 text-center hover:border-blue-500 transition-colors bg-slate-50 dark:bg-slate-800/40">
            <FileSpreadsheet className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <p className="font-bold text-slate-800 dark:text-slate-200 text-base mb-1">
              Select or Drop CSV Question File
            </p>
            <p className="text-xs text-slate-500 mb-4">Supports .csv file format exported from Excel or Sheets</p>

            <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl cursor-pointer shadow-md transition-all">
              <Upload className="w-4 h-4" /> Browse File
              <input type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
            </label>
          </div>
        )}

        {/* Parsing Progress */}
        {parsing && (
          <div className="text-center py-8">
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Parsing questions file...</p>
          </div>
        )}

        {/* Errors Box */}
        {result && result.errors.length > 0 && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900 text-xs text-rose-900 dark:text-rose-200 space-y-1">
            <div className="flex items-center gap-2 font-bold text-sm text-rose-700 dark:text-rose-300 mb-1">
              <AlertTriangle className="w-4 h-4" /> {result.errors.length} Format Errors Detected:
            </div>
            <ul className="list-disc list-inside space-y-0.5">
              {result.errors.map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Live Preview Table */}
        {result && result.questions.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                <CheckCircle className="w-4 h-4" /> {result.questions.length} Valid Questions Ready To Import
              </span>
              <button
                onClick={handleReset}
                className="text-xs text-rose-500 hover:underline flex items-center gap-1 font-semibold"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear File
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0 font-semibold text-slate-600 dark:text-slate-300">
                  <tr>
                    <th className="p-2.5">#</th>
                    <th className="p-2.5">Question</th>
                    <th className="p-2.5">Options</th>
                    <th className="p-2.5">Answer</th>
                    <th className="p-2.5">Subject</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {result.questions.map((q, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="p-2.5 font-bold text-slate-500">{idx + 1}</td>
                      <td className="p-2.5 font-medium text-slate-900 dark:text-white line-clamp-1 max-w-xs">{q.question_text}</td>
                      <td className="p-2.5 text-slate-500">A: {q.option_a} | B: {q.option_b}</td>
                      <td className="p-2.5 font-bold text-emerald-600">{q.correct_answer}</td>
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
                Confirm & Import {result.questions.length} Questions <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

      </div>
    </Modal>
  );
};
