import Papa from 'papaparse';
import { Attempt, Question } from '../types';

export const exportAttemptsToCSV = (attempts: Attempt[], testTitle: string) => {
  const data = attempts.map(a => ({
    'Student Name': a.student_name,
    'Mobile': a.student_mobile,
    'Email': a.student_email,
    'State': a.student_state,
    'District': a.student_district,
    'Score': a.score,
    'Percentage (%)': a.percentage + '%',
    'Total Questions': a.total_questions,
    'Attempted': a.attempted_questions,
    'Correct': a.correct_answers,
    'Wrong': a.wrong_answers,
    'Skipped': a.skipped_questions,
    'Time Taken': Math.floor(a.time_taken_seconds / 60) + 'm ' + (a.time_taken_seconds % 60) + 's',
    'Status': a.status,
    'Submitted At': a.submitted_at ? new Date(a.submitted_at).toLocaleString() : 'N/A'
  }));

  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${testTitle.replace(/\s+/g, '_')}_Attempts_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export interface CSVParseResult {
  questions: Question[];
  errors: string[];
}

export const parseQuestionsCSV = (
  file: File,
  testId: string,
  defaultNegativeMarks: number = 0,
  defaultMarks: number = 1
): Promise<CSVParseResult> => {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const questions: Question[] = [];
        const errors: string[] = [];

        results.data.forEach((row: any, idx: number) => {
          const rowNum = idx + 2; // header is line 1
          
          const questionText = row.Question || row.question || row.Question_Text || row['Question Text'];
          const optionA = row.Option_A || row.option_a || row['Option A'];
          const optionB = row.Option_B || row.option_b || row['Option B'];
          const optionC = row.Option_C || row.option_c || row['Option C'];
          const optionD = row.Option_D || row.option_d || row['Option D'];
          let answer = (row.Answer || row.answer || row.Correct_Answer || row['Correct Answer'] || '').toString().trim().toUpperCase();
          const explanation = row.Explanation || row.explanation || '';
          const subject = row.Subject || row.subject || 'General Studies';
          const chapter = row.Chapter || row.chapter || 'General';

          if (!questionText) {
            errors.push(`Line ${rowNum}: Missing Question text.`);
            return;
          }
          if (!optionA || !optionB || !optionC || !optionD) {
            errors.push(`Line ${rowNum}: Missing one or more options (A, B, C, D).`);
            return;
          }
          
          if (!['A', 'B', 'C', 'D'].includes(answer)) {
            // Try matching text if answer was typed as full text
            if (answer === optionA.toUpperCase()) answer = 'A';
            else if (answer === optionB.toUpperCase()) answer = 'B';
            else if (answer === optionC.toUpperCase()) answer = 'C';
            else if (answer === optionD.toUpperCase()) answer = 'D';
            else {
              errors.push(`Line ${rowNum}: Invalid answer "${answer}". Must be A, B, C, or D.`);
              return;
            }
          }

          const rawNeg = row.Negative_Marks ?? row.negative_marks ?? row.Negative_Mark ?? row.negative_mark;
          const negVal = rawNeg !== undefined && rawNeg !== null && String(rawNeg).trim() !== '' ? Number(rawNeg) : defaultNegativeMarks;
          const rawMarks = row.Marks ?? row.marks;
          const marksVal = rawMarks !== undefined && rawMarks !== null && String(rawMarks).trim() !== '' ? Number(rawMarks) : defaultMarks;

          questions.push({
            id: 'q-csv-' + Date.now() + '-' + idx,
            test_id: testId,
            question_number: idx + 1,
            question_text: questionText.trim(),
            option_a: optionA.trim(),
            option_b: optionB.trim(),
            option_c: optionC.trim(),
            option_d: optionD.trim(),
            correct_answer: answer as 'A' | 'B' | 'C' | 'D',
            explanation: explanation ? explanation.trim() : null,
            marks: isNaN(marksVal) ? defaultMarks : marksVal,
            negative_marks: isNaN(negVal) ? defaultNegativeMarks : negVal,
            subject: subject.trim(),
            chapter: chapter.trim()
          });
        });

        resolve({ questions, errors });
      },
      error: (err) => {
        resolve({ questions: [], errors: [`Failed to parse CSV file: ${err.message}`] });
      }
    });
  });
};
