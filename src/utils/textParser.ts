import { Question } from '../types';

export interface TextParseResult {
  questions: Partial<Question>[];
  errors: string[];
}

/**
 * Parses JSON or structured plain text input into Question objects.
 */
export function parseTextOrJsonQuestions(
  input: string,
  testId: string,
  defaultSubject: string = 'General Studies',
  defaultChapter: string = 'General',
  defaultSection: string = 'General',
  defaultNegativeMarks: number = 0,
  defaultMarks: number = 1
): TextParseResult {
  const trimmed = input.trim();
  const errors: string[] = [];
  const questions: Partial<Question>[] = [];

  if (!trimmed) {
    return { questions: [], errors: ['Input text is empty.'] };
  }

  // Active section tracker across text blocks if a Section header line is used
  let activeSection = defaultSection;

  // 1. Try parsing as JSON first
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      let parsed = JSON.parse(trimmed);

      // Handle if JSON is wrapped in an object like { "questions": [...] }
      if (!Array.isArray(parsed) && parsed.questions && Array.isArray(parsed.questions)) {
        parsed = parsed.questions;
      }

      if (Array.isArray(parsed)) {
        parsed.forEach((item: any, idx: number) => {
          const qText = item.question_text || item.question || item.q || '';
          const optA = item.option_a || item.a || item.options?.[0] || item.options?.A || '';
          const optB = item.option_b || item.b || item.options?.[1] || item.options?.B || '';
          const optC = item.option_c || item.c || item.options?.[2] || item.options?.C || '';
          const optD = item.option_d || item.d || item.options?.[3] || item.options?.D || '';
          let ans = (item.correct_answer || item.answer || item.ans || 'A').toString().trim().toUpperCase();

          // Standardize answer to A, B, C, or D
          if (ans.startsWith('A') || ans === '1' || ans === optA) ans = 'A';
          else if (ans.startsWith('B') || ans === '2' || ans === optB) ans = 'B';
          else if (ans.startsWith('C') || ans === '3' || ans === optC) ans = 'C';
          else if (ans.startsWith('D') || ans === '4' || ans === optD) ans = 'D';
          else if (!['A', 'B', 'C', 'D'].includes(ans)) ans = 'A';

          if (!qText || !optA || !optB) {
            errors.push(`JSON Item #${idx + 1}: Missing question text or options.`);
            return;
          }

          questions.push({
            id: 'q-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
            test_id: testId,
            question_number: idx + 1,
            question_text: String(qText).trim(),
            option_a: String(optA).trim(),
            option_b: String(optB).trim(),
            option_c: String(optC).trim(),
            option_d: String(optD).trim(),
            correct_answer: ans as 'A' | 'B' | 'C' | 'D',
            explanation: item.explanation || item.exp || '',
            subject: item.subject || defaultSubject,
            chapter: item.chapter || defaultChapter,
            section: item.section || item.section_name || defaultSection,
            marks: item.marks !== undefined && item.marks !== null ? Number(item.marks) : defaultMarks,
            negative_marks: item.negative_marks !== undefined && item.negative_marks !== null ? Number(item.negative_marks) : defaultNegativeMarks,
          });
        });

        if (questions.length > 0) {
          return { questions, errors };
        }
      }
    } catch (e: any) {
      // Not valid JSON, fall through to plain text parsing
    }
  }

  // 2. Plain Text / Exam Question Block Parser
  // Split input by double newlines or question start markers
  const rawBlocks = trimmed.split(/\n\s*\n+/);

  let currentNumber = 1;

  for (let blockIndex = 0; blockIndex < rawBlocks.length; blockIndex++) {
    const block = rawBlocks[blockIndex].trim();
    if (!block) continue;

    // Check if block is a Section Header e.g. "Section: Reasoning" or "[Section A: Mathematics]"
    if (/^(section|\[section)\s*[\:\-]/i.test(block)) {
      const match = block.match(/section\s*[\:\-]\s*([^\]\n]+)/i);
      if (match) {
        activeSection = match[1].trim();
        continue;
      }
    }

    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length < 3) continue; // Need at least question, options, and answer

    let questionText = '';
    let optA = '';
    let optB = '';
    let optC = '';
    let optD = '';
    let correctAnswer: 'A' | 'B' | 'C' | 'D' = 'A';
    let explanation = '';
    let subject = defaultSubject;
    let chapter = defaultChapter;
    let section = activeSection;

    // Process lines inside a block
    let collectingQuestion = true;

    for (const line of lines) {
      // Check for Section line e.g. "Section: Reasoning Ability"
      if (/^section\s*:/i.test(line)) {
        const secMatch = line.match(/^section\s*:\s*(.+)$/i);
        if (secMatch) {
          section = secMatch[1].trim();
          activeSection = section;
        }
        continue;
      }

      // Check for Subject/Chapter line e.g., "Subject: Polity | Chapter: Rights"
      if (/^subject\s*:/i.test(line)) {
        const subMatch = line.match(/^subject\s*:\s*([^|]+)/i);
        if (subMatch) subject = subMatch[1].trim();
        const chapMatch = line.match(/chapter\s*:\s*([^|]+)/i);
        if (chapMatch) chapter = chapMatch[1].trim();
        const secMatch = line.match(/section\s*:\s*(.+)$/i);
        if (secMatch) section = secMatch[1].trim();
        continue;
      }

      // Check for Option A, B, C, D lines
      if (/^(a[\.\)\:-]|\(a\))/i.test(line)) {
        collectingQuestion = false;
        optA = line.replace(/^(a[\.\)\:-]|\(a\))\s*/i, '');
      } else if (/^(b[\.\)\:-]|\(b\))/i.test(line)) {
        collectingQuestion = false;
        optB = line.replace(/^(b[\.\)\:-]|\(b\))\s*/i, '');
      } else if (/^(c[\.\)\:-]|\(c\))/i.test(line)) {
        collectingQuestion = false;
        optC = line.replace(/^(c[\.\)\:-]|\(c\))\s*/i, '');
      } else if (/^(d[\.\)\:-]|\(d\))/i.test(line)) {
        collectingQuestion = false;
        optD = line.replace(/^(d[\.\)\:-]|\(d\))\s*/i, '');
      }
      // Check for Answer line e.g., "Ans: B", "Answer: Option C"
      else if (/^(ans|answer|correct\s*answer)\s*[\:\-]/i.test(line)) {
        collectingQuestion = false;
        const ansMatch = line.match(/(option\s*)?([abcd])/i);
        if (ansMatch) {
          correctAnswer = ansMatch[2].toUpperCase() as 'A' | 'B' | 'C' | 'D';
        }
      }
      // Check for Explanation line e.g., "Explanation: ..."
      else if (/^(exp|explanation|note)\s*[\:\-]/i.test(line)) {
        collectingQuestion = false;
        explanation = line.replace(/^(exp|explanation|note)\s*[\:\-]\s*/i, '');
      }
      // Line is part of Question text
      else if (collectingQuestion) {
        // Strip question prefix like "1. ", "Q1: ", "Question 1)"
        const cleanLine = line.replace(/^q(uestion)?\s*\d*[\.\)\:-]\s*/i, '');
        questionText += (questionText ? ' ' : '') + cleanLine;
      } else if (explanation) {
        // Multi-line explanation
        explanation += ' ' + line;
      }
    }

    if (questionText && optA && optB) {
      questions.push({
        id: 'q-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
        test_id: testId,
        question_number: currentNumber++,
        question_text: questionText,
        option_a: optA,
        option_b: optB,
        option_c: optC || 'None of the above',
        option_d: optD || 'All of the above',
        correct_answer: correctAnswer,
        explanation: explanation,
        subject: subject,
        chapter: chapter,
        section: section,
        marks: defaultMarks,
        negative_marks: defaultNegativeMarks,
      });
    } else {
      errors.push(`Block #${blockIndex + 1}: Could not recognize question text or options.`);
    }
  }

  if (questions.length === 0 && errors.length === 0) {
    errors.push('No valid questions could be extracted. Please check format guidelines.');
  }

  return { questions, errors };
}
