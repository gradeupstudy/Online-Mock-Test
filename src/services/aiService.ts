import { GoogleGenAI, Type } from '@google/genai';
import { Question } from '../types';

const STORAGE_KEY = 'gradeup_gemini_api_keys';

export interface AIGenerateParams {
  subject: string;
  chapter: string;
  topic: string;
  section?: string;
  count: number;
  difficulty: string; // Easy, Medium, Hard, Mixed
  customPrompt?: string;
  testId: string;
  onLog?: (msg: string) => void;
}

export const aiService = {
  /**
   * Get list of saved Gemini API keys.
   */
  getStoredApiKeys: (): string[] => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((k) => String(k).trim()).filter(Boolean);
        }
      }
    } catch (e) {
      console.warn('Error reading stored Gemini API keys:', e);
    }

    // Default key fallback from env if available
    const envKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || (process as any).env?.GEMINI_API_KEY || '';
    return envKey ? [envKey] : [];
  },

  /**
   * Save list of Gemini API keys.
   */
  saveApiKeys: (keys: string[]): void => {
    const cleaned = keys.map((k) => k.trim()).filter(Boolean);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
  },

  /**
   * Generate questions using Gemini AI with automatic API Key rotation fallback.
   */
  generateQuestions: async (params: AIGenerateParams): Promise<Question[]> => {
    const keys = aiService.getStoredApiKeys();

    if (keys.length === 0) {
      throw new Error(
        'No Gemini API Key found! Please add at least one Gemini API Key in the AI Settings box below.'
      );
    }

    const targetCount = Math.max(1, Number(params.count) || 5);

    const promptText = `
You are a premier question paper creator and subject expert for Indian competitive exams (UPSC, SSC, Banking, Railway, HPPSC, State Exams).

CRITICAL DIRECTIVE: You MUST generate EXACTLY ${targetCount} unique Multiple Choice Questions (MCQs).
DO NOT STOP AFTER 1 QUESTION. The output JSON MUST be an ARRAY CONTAINING EXACTLY ${targetCount} ITEMS.

Parameters:
- Total MCQs to Generate: ${targetCount}
- Subject: ${params.subject || 'General Knowledge'}
- Chapter: ${params.chapter || 'General'}
- Topic: ${params.topic || 'General Topic'}
- Difficulty Level: ${params.difficulty || 'Medium'}
${params.customPrompt ? `- Custom Focus / Instructions: ${params.customPrompt}` : ''}

Strict JSON Output Schema:
Return a JSON ARRAY containing EXACTLY ${targetCount} question objects.
Each object in the array MUST contain:
1. "question_text": Full clear question text (Hindi/English as requested)
2. "option_a": Option A text
3. "option_b": Option B text
4. "option_c": Option C text
5. "option_d": Option D text
6. "correct_answer": "A", "B", "C", or "D"
7. "explanation": Detailed step-by-step answer explanation
8. "subject": "${params.subject || 'General Knowledge'}"
9. "chapter": "${params.chapter || 'General'}"

Make sure every single question is unique, correct, and well-structured. Generate all ${targetCount} MCQs now.
    `.trim();

    let lastError: Error | null = null;
    const keyLogs: string[] = [];

    // Loop through keys until one succeeds
    for (let i = 0; i < keys.length; i++) {
      const currentKey = keys[i];
      const maskedKey = currentKey.length > 8 ? `${currentKey.substring(0, 4)}...${currentKey.substring(currentKey.length - 4)}` : 'Key #' + (i + 1);

      params.onLog?.(`🔑 Trying Gemini API Key #${i + 1} (${maskedKey})...`);

      try {
        // Attempt using GoogleGenAI SDK
        const ai = new GoogleGenAI({
          apiKey: currentKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        });

        const response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: promptText,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question_text: { type: Type.STRING },
                  option_a: { type: Type.STRING },
                  option_b: { type: Type.STRING },
                  option_c: { type: Type.STRING },
                  option_d: { type: Type.STRING },
                  correct_answer: { type: Type.STRING },
                  explanation: { type: Type.STRING },
                  subject: { type: Type.STRING },
                  chapter: { type: Type.STRING },
                },
                required: [
                  'question_text',
                  'option_a',
                  'option_b',
                  'option_c',
                  'option_d',
                  'correct_answer',
                ],
              },
            },
          },
        });

        const rawText = response.text || '';
        if (!rawText) {
          throw new Error('Empty response received from Gemini API.');
        }

        let parsedJson: any = null;
        try {
          parsedJson = JSON.parse(rawText);
        } catch (e) {
          const match = rawText.match(/\[\s*\{[\s\S]*\}\s*\]/);
          if (match) {
            parsedJson = JSON.parse(match[0]);
          }
        }

        let questionArray: any[] = [];
        if (Array.isArray(parsedJson)) {
          questionArray = parsedJson;
        } else if (parsedJson && typeof parsedJson === 'object') {
          // If Gemini returned a single object instead of array, wrap it
          questionArray = [parsedJson];
        }

        if (questionArray.length === 0) {
          throw new Error('AI generated invalid or empty question array.');
        }

        params.onLog?.(`✅ Success with API Key #${i + 1}! Generated ${questionArray.length} questions in one go.`);

        // Convert to full Question type
        const questions: Question[] = questionArray.map((q: any, idx: number) => ({
          id: 'q-ai-' + Date.now() + '-' + idx,
          test_id: params.testId,
          question_number: idx + 1,
          question_text: q.question_text || 'Question ' + (idx + 1),
          option_a: q.option_a || 'Option A',
          option_b: q.option_b || 'Option B',
          option_c: q.option_c || 'Option C',
          option_d: q.option_d || 'Option D',
          correct_answer: (['A', 'B', 'C', 'D'].includes(q.correct_answer?.toUpperCase()) ? q.correct_answer.toUpperCase() : 'A') as 'A'|'B'|'C'|'D',
          explanation: q.explanation || '',
          subject: q.subject || params.subject || 'General Knowledge',
          chapter: q.chapter || params.chapter || 'General',
          section: q.section || params.section || 'General',
          marks: 1,
          negative_marks: 0.25,
        }));

        return questions;

      } catch (err: any) {
        const errorMsg = err?.message || String(err);
        console.warn(`Key #${i + 1} failed:`, errorMsg);
        keyLogs.push(`Key #${i + 1} failed: ${errorMsg}`);

        // If there are more keys available, log rotation notice and continue
        if (i < keys.length - 1) {
          params.onLog?.(`⚠️ Key #${i + 1} expired / quota limit hit (${errorMsg.substring(0, 50)}...). Automatically rotating to Key #${i + 2}...`);
        } else {
          lastError = new Error(`All ${keys.length} Gemini API Key(s) failed or exceeded quota limit. Details: ${keyLogs.join(' | ')}`);
        }
      }
    }

    throw lastError || new Error('Failed to generate questions with AI.');
  },
};
