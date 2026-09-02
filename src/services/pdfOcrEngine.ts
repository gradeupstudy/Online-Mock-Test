import * as pdfjsLib from 'pdfjs-dist';
import { GoogleGenAI, Type } from '@google/genai';
import { aiService } from './aiService';
import { Question } from '../types';
import { generateUUID } from './dataService';
import {
  canonicalizeSubject,
  canonicalizeChapter,
  normalizeQuestionTaxonomy,
  getAllCanonicalSubjectNames,
  getCanonicalChaptersForSubject,
  MASTER_CANONICAL_TAXONOMY,
} from '../utils/taxonomyCanonicalizer';

// Configure pdfjs worker
try {
  if (typeof window !== 'undefined') {
    // Use stable cloudflare/unpkg worker or fallback
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`;
  }
} catch (e) {
  console.warn('PDF.js worker setup warning:', e);
}

export interface ExtractedPDFMCQ {
  question_number: number;
  question_text: string;
  question_hi?: string | null;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: 'A' | 'B' | 'C' | 'D' | string;
  answer_source: 'pdf_answer_key' | 'pdf_inline' | 'ai_determined' | 'none';
  answer_status: 'verified' | 'conflict' | 'needs_review';
  explanation?: string | null;
  subject: string;
  chapter: string;
  topic: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Moderate' | string;
  source_page: number;
  validation_status: 'valid' | 'needs_review' | 'invalid';
  validation_issues: string[];
  duplicate_status: 'unique' | 'duplicate' | 'near_duplicate';
  confidence: number;
  selected?: boolean;
}

export interface PDFExtractionSummary {
  total_questions_found: number;
  valid: number;
  needs_review: number;
  invalid: number;
  duplicates: number;
  answer_conflicts?: number;
  pages_processed?: number;
  total_pages?: number;
}

export interface PDFExtractionOutput {
  questions: ExtractedPDFMCQ[];
  summary: PDFExtractionSummary;
}

export interface PDFProcessProgress {
  currentPage: number;
  totalPages: number;
  questionsFound: number;
  phase: 'reading_pdf' | 'extracting_pages' | 'locating_answer_keys' | 'ocr_chunk_processing' | 'reconciling_answers' | 'finalizing' | 'completed' | 'error';
  statusMessage: string;
  percentage: number;
}

export interface PDFProcessOptions {
  file: File;
  startPage?: number;
  endPage?: number;
  taxonomyMode?: 'auto_multi' | 'single_override'; // 'auto_multi' lets AI determine subject & chapter per question; 'single_override' applies fixed default to all
  defaultSubject?: string;
  defaultChapter?: string;
  defaultTopic?: string;
  standardizeTaxonomy?: boolean; // When true, normalizes subjects and chapters to master canonical taxonomy
  languageMode?: 'auto' | 'bilingual' | 'english' | 'hindi';
  ocrPrecision?: 'multimodal_vision' | 'fast_text' | 'auto';
  testId?: string;
  onProgress?: (progress: PDFProcessProgress) => void;
  onLog?: (msg: string) => void;
}

export interface RawPageData {
  pageNumber: number;
  text: string;
  hasSubstantialText: boolean;
  imageJpegBase64?: string;
}

/**
 * Normalizes Hindi / letter option markers into standard 'A' | 'B' | 'C' | 'D'.
 */
export function normalizeOptionLetter(val: any): 'A' | 'B' | 'C' | 'D' | null {
  if (!val) return null;
  const str = String(val).trim().toUpperCase();
  
  // Direct match
  if (['A', 'B', 'C', 'D'].includes(str)) return str as any;

  // Hindi mappings: क->A, ख->B, ग->C, घ->D, 1->A, 2->B, 3->C, 4->D
  if (str.includes('क') || str.includes('(क)') || str === '1' || str.includes('(1)')) return 'A';
  if (str.includes('ख') || str.includes('(ख)') || str === '2' || str.includes('(2)')) return 'B';
  if (str.includes('ग') || str.includes('(ग)') || str === '3' || str.includes('(3)')) return 'C';
  if (str.includes('घ') || str.includes('(घ)') || str === '4' || str.includes('(4)')) return 'D';

  const m = str.match(/\b([A-D])\b/) || str.match(/([A-D])[\.\)\:\-\s]/);
  if (m && ['A', 'B', 'C', 'D'].includes(m[1].toUpperCase())) {
    return m[1].toUpperCase() as any;
  }
  return null;
}

export const pdfOcrEngine = {
  /**
   * Reads the complete PDF, extracts text and renders images for OCR where needed.
   */
  loadPdfPages: async (
    file: File,
    startPage: number = 1,
    endPage?: number,
    onProgress?: (progress: PDFProcessProgress) => void,
    onLog?: (msg: string) => void
  ): Promise<{ pages: RawPageData[]; totalDocPages: number }> => {
    onLog?.(`📄 Loading PDF file: "${file.name}" (${(file.size / (1024 * 1024)).toFixed(2)} MB)...`);
    
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/cmaps/',
      cMapPacked: true,
      standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/standard_fonts/',
    });

    const pdfDoc = await loadingTask.promise;
    const totalDocPages = pdfDoc.numPages;
    const fromPage = Math.max(1, startPage);
    const toPage = endPage ? Math.min(totalDocPages, endPage) : totalDocPages;

    onLog?.(`📑 PDF Loaded successfully! Document contains ${totalDocPages} total pages. Processing pages ${fromPage} to ${toPage}...`);

    const pages: RawPageData[] = [];

    for (let pageNum = fromPage; pageNum <= toPage; pageNum++) {
      const pageIndex = pageNum - fromPage + 1;
      const totalToProcess = toPage - fromPage + 1;
      const pct = Math.round((pageIndex / totalToProcess) * 35); // First 35% for loading

      onProgress?.({
        currentPage: pageNum,
        totalPages: totalDocPages,
        questionsFound: 0,
        phase: 'extracting_pages',
        statusMessage: `Extracting page ${pageNum} of ${totalDocPages}...`,
        percentage: pct,
      });

      const page = await pdfDoc.getPage(pageNum);
      
      // Extract text content
      const textContent = await page.getTextContent();
      let pageText = '';
      let lastY: number | null = null;

      for (const item of textContent.items as any[]) {
        if (!item.str) continue;
        // Add line breaks when vertical position changes significantly
        if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
          pageText += '\n';
        } else if (pageText && !pageText.endsWith(' ') && !pageText.endsWith('\n')) {
          pageText += ' ';
        }
        pageText += item.str;
        lastY = item.transform[5];
      }

      pageText = pageText.trim();
      const hasSubstantialText = pageText.length > 80;

      let imageBase64: string | undefined;

      // If page is scanned/image or has very little raw text, render to high-res canvas
      if (!hasSubstantialText) {
        onLog?.(`🔍 Page ${pageNum} appears scanned/image-based (Text length: ${pageText.length}). Rendering high-resolution canvas for OCR...`);
        try {
          const viewport = page.getViewport({ scale: 1.6 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          if (context) {
            await (page.render({
              canvasContext: context,
              viewport: viewport,
              canvas: canvas,
            } as any)).promise;

            const fullDataUrl = canvas.toDataURL('image/jpeg', 0.85);
            imageBase64 = fullDataUrl.replace(/^data:image\/[a-z]+;base64,/, '');
          }
        } catch (renderErr) {
          console.warn(`Failed to render canvas for page ${pageNum}:`, renderErr);
        }
      }

      pages.push({
        pageNumber: pageNum,
        text: pageText,
        hasSubstantialText,
        imageJpegBase64: imageBase64,
      });
    }

    return { pages, totalDocPages };
  },

  /**
   * Scans pages (especially end pages or appendix) for Answer Keys or solution tables.
   */
  locateGlobalAnswerKeys: async (
    pages: RawPageData[],
    onLog?: (msg: string) => void
  ): Promise<Map<number, string>> => {
    const answerKeyMap = new Map<number, string>();
    onLog?.(`🎯 Scanning document for global Answer Key tables / answer sheets...`);

    // Look through pages for Answer key indicators (e.g. 'ANSWER KEY', 'उत्तर कुंजी', 'उत्तरमाला', 'ANSWERS')
    const candidatePages = pages.filter((p) => {
      const lower = p.text.toLowerCase();
      return (
        lower.includes('answer key') ||
        lower.includes('answer-key') ||
        lower.includes('उत्तर कुंजी') ||
        lower.includes('उत्तरमाला') ||
        lower.includes('answers') ||
        lower.includes('solutions') ||
        /(?:q\.?\s*\d+[\s\-\:\.\)]+[a-d])/i.test(p.text)
      );
    });

    if (candidatePages.length === 0) {
      onLog?.(`ℹ️ No explicit separate Answer Key page detected. Inline & section answers will be parsed.`);
      return answerKeyMap;
    }

    onLog?.(`🔎 Found ${candidatePages.length} candidate page(s) with potential Answer Keys (e.g. Page ${candidatePages.map((p) => p.pageNumber).join(', ')}). Parsing answer tables...`);

    // Try regex-based fast extraction first
    for (const cp of candidatePages) {
      const text = cp.text;

      // Pattern 1: 1.(B) 2.(C) 3.(A) or 1. B 2. C or 1-B, 2-C, 3-A
      const regex1 = /(?:Q\.?|\b)?(\d{1,4})\s*[\.\:\-\)\s]+\(?([A-Da-d]|क|ख|ग|घ|[1-4])\)?/g;
      let match: RegExpExecArray | null;
      let countFromRegex = 0;

      while ((match = regex1.exec(text)) !== null) {
        const qNum = parseInt(match[1], 10);
        const optLetter = normalizeOptionLetter(match[2]);
        if (qNum > 0 && optLetter) {
          answerKeyMap.set(qNum, optLetter);
          countFromRegex++;
        }
      }

      if (countFromRegex > 5) {
        onLog?.(`✅ Extracted ${countFromRegex} mapped answer keys from Page ${cp.pageNumber}!`);
      }
    }

    return answerKeyMap;
  },

  /**
   * Main Entry Point: Process Complete PDF with full OCR & Document Understanding.
   */
  processCompletePDF: async (options: PDFProcessOptions): Promise<PDFExtractionOutput> => {
    const {
      file,
      startPage = 1,
      endPage,
      taxonomyMode = 'auto_multi',
      defaultSubject = 'General Studies',
      defaultChapter = 'General',
      defaultTopic = 'General Topic',
      standardizeTaxonomy = true,
      languageMode = 'auto',
      onProgress,
      onLog,
    } = options;

    onProgress?.({
      currentPage: 0,
      totalPages: 0,
      questionsFound: 0,
      phase: 'reading_pdf',
      statusMessage: 'Loading PDF document into OCR engine...',
      percentage: 5,
    });

    // Step 1: Load and extract all pages
    const { pages, totalDocPages } = await pdfOcrEngine.loadPdfPages(
      file,
      startPage,
      endPage,
      onProgress,
      onLog
    );

    if (pages.length === 0) {
      throw new Error('PDF has no extractable pages in the specified range.');
    }

    // Step 2: Locate global answer keys
    onProgress?.({
      currentPage: pages[0].pageNumber,
      totalPages: totalDocPages,
      questionsFound: 0,
      phase: 'locating_answer_keys',
      statusMessage: 'Scanning document for global Answer Keys & Solution Tables...',
      percentage: 38,
    });

    const globalAnswerKeyMap = await pdfOcrEngine.locateGlobalAnswerKeys(pages, onLog);

    // Step 3: Process in sliding chunks with 1-page overlap to prevent cross-page split question cutoff
    const chunkPageBatches: RawPageData[][] = [];
    if (pages.length <= 3) {
      chunkPageBatches.push(pages);
    } else {
      let i = 0;
      while (i < pages.length) {
        const batch = pages.slice(i, i + 3);
        chunkPageBatches.push(batch);
        if (i + 3 >= pages.length) break;
        i += 2; // 1-page overlap between batches so consecutive pages always share context
      }
    }

    const allExtractedQuestions: ExtractedPDFMCQ[] = [];
    const chunkCount = chunkPageBatches.length;

    onLog?.(`🚀 Commencing Document OCR Understanding across ${pages.length} pages in ${chunkCount} overlapping page batches with cross-page question stitching...`);

    for (let cIdx = 0; cIdx < chunkCount; cIdx++) {
      const chunkPages = chunkPageBatches[cIdx];
      const startP = chunkPages[0].pageNumber;
      const endP = chunkPages[chunkPages.length - 1].pageNumber;

      const progressPct = 40 + Math.round(((cIdx + 1) / chunkCount) * 50);

      onProgress?.({
        currentPage: endP,
        totalPages: totalDocPages,
        questionsFound: allExtractedQuestions.length,
        phase: 'ocr_chunk_processing',
        statusMessage: `Processing Pages ${startP} to ${endP} of ${totalDocPages} (${allExtractedQuestions.length} MCQs found so far)...`,
        percentage: progressPct,
      });

      onLog?.(`🔄 [Batch ${cIdx + 1}/${chunkCount}] Processing Pages ${startP}–${endP}...`);

      try {
        const chunkMCQs = await pdfOcrEngine.processPageChunk({
          pages: chunkPages,
          globalAnswerKeyMap,
          taxonomyMode,
          defaultSubject,
          defaultChapter,
          defaultTopic,
          standardizeTaxonomy,
          languageMode,
          onLog,
        });

        onLog?.(`✨ [Batch ${cIdx + 1}/${chunkCount}] Successfully extracted ${chunkMCQs.length} MCQs from Pages ${startP}–${endP}!`);
        allExtractedQuestions.push(...chunkMCQs);
      } catch (chunkErr: any) {
        onLog?.(`⚠️ [Batch ${cIdx + 1} Warning] Error processing Pages ${startP}–${endP}: ${chunkErr?.message || chunkErr}. Continuing next batch...`);
      }
    }

    // Step 4: Reconcile, Deduplicate & Validate all questions
    onProgress?.({
      currentPage: totalDocPages,
      totalPages: totalDocPages,
      questionsFound: allExtractedQuestions.length,
      phase: 'reconciling_answers',
      statusMessage: 'Reconciling answer keys, stitching cross-page options, and running AI validation audit...',
      percentage: 93,
    });

    onLog?.(`🧩 Reconciling extracted questions with document answer keys, stitching cross-page options, deduplicating & standardizing taxonomy...`);

    const pageTextMap = new Map<number, string>();
    pages.forEach(p => pageTextMap.set(p.pageNumber, p.text));

    const finalQuestions = pdfOcrEngine.reconcileAndValidateQuestions(
      allExtractedQuestions,
      globalAnswerKeyMap,
      standardizeTaxonomy,
      pageTextMap,
      onLog
    );

    // Step 5: Compute summary statistics
    let validCount = 0;
    let needsReviewCount = 0;
    let invalidCount = 0;
    let duplicateCount = 0;
    let conflictCount = 0;

    finalQuestions.forEach((q) => {
      if (q.validation_status === 'valid') validCount++;
      else if (q.validation_status === 'invalid') invalidCount++;
      else needsReviewCount++;

      if (q.duplicate_status === 'duplicate' || q.duplicate_status === 'near_duplicate') {
        duplicateCount++;
      }
      if (q.answer_status === 'conflict') {
        conflictCount++;
      }
    });

    const summary: PDFExtractionSummary = {
      total_questions_found: finalQuestions.length,
      valid: validCount,
      needs_review: needsReviewCount,
      invalid: invalidCount,
      duplicates: duplicateCount,
      answer_conflicts: conflictCount,
      pages_processed: pages.length,
      total_pages: totalDocPages,
    };

    onProgress?.({
      currentPage: totalDocPages,
      totalPages: totalDocPages,
      questionsFound: finalQuestions.length,
      phase: 'completed',
      statusMessage: `Completed! Extracted ${finalQuestions.length} MCQs (${validCount} Valid, ${needsReviewCount} Needs Review).`,
      percentage: 100,
    });

    onLog?.(`🎉 [OCR COMPLETE] Processed COMPLETE PDF! Total ${finalQuestions.length} MCQs extracted (${validCount} Valid, ${needsReviewCount} Needs Review, ${conflictCount} Conflicts).`);

    return {
      questions: finalQuestions,
      summary,
    };
  },

  /**
   * Process a chunk of pages using Gemini 3.7 Flash with Multimodal and OCR capabilities.
   */
  processPageChunk: async (params: {
    pages: RawPageData[];
    globalAnswerKeyMap: Map<number, string>;
    taxonomyMode?: 'auto_multi' | 'single_override';
    defaultSubject: string;
    defaultChapter: string;
    defaultTopic: string;
    standardizeTaxonomy?: boolean;
    languageMode: 'auto' | 'bilingual' | 'english' | 'hindi';
    onLog?: (msg: string) => void;
  }): Promise<ExtractedPDFMCQ[]> => {
    const {
      pages,
      globalAnswerKeyMap,
      taxonomyMode = 'auto_multi',
      defaultSubject,
      defaultChapter,
      defaultTopic,
      standardizeTaxonomy = true,
      languageMode = 'auto',
      onLog,
    } = params;

    // Combine page texts with clear page boundary markers
    let combinedText = '';
    const imagesParts: any[] = [];

    pages.forEach((p) => {
      combinedText += `\n\n--- [PAGE ${p.pageNumber}] ---\n${p.text}\n`;
      if (p.imageJpegBase64) {
        imagesParts.push({
          inlineData: {
            mimeType: 'image/jpeg',
            data: p.imageJpegBase64,
          },
        });
      }
    });

    // Provide any known answer keys for this chunk's potential question numbers
    const relevantKeysList: string[] = [];
    globalAnswerKeyMap.forEach((ans, qNum) => {
      relevantKeysList.push(`Q${qNum} -> Option ${ans}`);
    });
    const answerKeyContext = relevantKeysList.length > 0
      ? `KNOWN GLOBAL ANSWER KEY MAPPINGS FROM DOCUMENT (for cross-checking):\n${relevantKeysList.slice(0, 50).join(', ')}`
      : 'No separate answer key table found yet; extract inline answers from the questions.';

    const canonicalSubjectsList = getAllCanonicalSubjectNames().join(', ');

    const taxonomyInstructions = taxonomyMode === 'auto_multi'
      ? `4. MULTI-SUBJECT & MULTI-CHAPTER AUTO-DETECTION (AI DYNAMIC CLASSIFICATION):
   - This PDF may contain questions from MULTIPLE SUBJECTS and MULTIPLE CHAPTERS (e.g. History, Geography, Polity & Constitution, Indian Economy, General Science, Quantitative Aptitude, Reasoning & Mental Ability, English Grammar & Comprehension, Hindi Language & Grammar, Current Affairs, Computer Awareness, Himachal Pradesh GK, etc.).
   - You MUST analyze each question's domain, formulas, keywords, concepts, and section headers on the page to determine its specific genuine Subject and Chapter.
   - Choose the Subject from standard Master Subjects: [${canonicalSubjectsList}].
   - Examples of Subject & Chapter classification:
     • Math / Numbers / Percentage / Algebra / Geometry / SI-CI / Time & Work -> Subject: "Quantitative Aptitude", Chapter: "..."
     • Logic / Series / Puzzles / Blood Relations / Syllogism / Coding-Decoding -> Subject: "Reasoning & Mental Ability", Chapter: "..."
     • Physics / Chemistry / Biology / Laws of Motion / Optics / Cells -> Subject: "General Science", Chapter: "..."
     • Constitution / Articles / Parliament / President / Judiciary / Rights -> Subject: "Polity & Constitution", Chapter: "..."
     • Rivers / Mountains / Climate / Soils / Maps / Minerals -> Subject: "Geography", Chapter: "..."
     • Ancient / Medieval / Modern History / Freedom Movement -> Subject: "History", Chapter: "..."
     • English Vocabulary / Idioms / Tenses / Error Spotting -> Subject: "English Grammar & Comprehension", Chapter: "..."
     • हिन्दी व्याकरण / संधि / समास / विलोम / पर्यायवाची / मुहावरे -> Subject: "Hindi Language & Grammar", Chapter: "..."
   - DO NOT force all questions to a single default subject! Classify each question according to its genuine content.
   - (Only fallback to "${defaultSubject}" / "${defaultChapter}" if subject cannot be determined).`
      : `4. FIXED SINGLE SUBJECT & CHAPTER OVERRIDE:
   - For this single-topic document, set every question to:
     • Subject: "${defaultSubject}"
     • Chapter: "${defaultChapter}"
     • Topic: "${defaultTopic}"`;

    const languageDirectives = languageMode === 'english'
      ? `6. LANGUAGE TARGET: STRICTLY ENGLISH ONLY (English Grammar / English Vocabulary / Comprehension):
   - Keep Question Text and all 4 options strictly in English.
   - Do NOT translate into Hindi. Set question_hi = null.
   - Do NOT generate bilingual slashes (e.g. use "Mitochondria", NOT "Mitochondria / माइटोकॉन्ड्रिया").`
      : languageMode === 'hindi'
      ? `6. LANGUAGE TARGET: STRICTLY HINDI ONLY (हिन्दी व्याकरण / हिन्दी शब्दावली / हिन्दी साहित्य):
   - Keep Question Text and all 4 options strictly in pure Devanagari Hindi.
   - Do NOT translate into English. Set question_text and question_hi to the Hindi text.
   - Do NOT generate English slashes.`
      : `6. LANGUAGE TARGET: BILINGUAL (English + Hindi) / General Studies / Multi-Disciplinary:
   - If question in document contains both English & Hindi, put English in question_text and Hindi in question_hi.
   - If question is only in one language, extract it cleanly.`;

    const systemPrompt = `
You are the world's most accurate Exam PDF Question Extraction & OCR Engine.
Analyze the following PDF content (Pages ${pages.map((p) => p.pageNumber).join(', ')}).

TASK:
Extract EVERY genuine Multiple Choice Question (MCQ) from this entire page range and convert it into structured question data.

CRITICAL EXTRACTION RULES:
1. QUESTION IDENTIFICATION:
   - Identify every single question number accurately (1, 2, 3, Q1, Q.1, (1), etc.).
   - Extract the full, clean question statement.
   - If the question is BILINGUAL (contains both English & Hindi/Devanagari text):
     - Put the English text in "question_text"
     - Put the Hindi/Devanagari text in "question_hi"
   - If the question is ONLY in Hindi, put the Hindi text in "question_text" AND "question_hi".
   - If ONLY English, set "question_hi": null.

2. OPTIONS EXTRACTION & CROSS-PAGE STITCHING (A, B, C, D) — HIGHEST PRIORITY:
   - Extract option_a, option_b, option_c, option_d cleanly without leading labels ("A.", "(A)", "1.", "क.", "(क)").
   - CROSS-PAGE QUESTION SPLIT STITCHING:
     • Questions and their option choices frequently span across page boundaries! A question may start near the bottom of Page N with options (a) and (b), followed by a watermark / website advertisement / footer / page break (e.g. "visit thegkadda.com...", "Page X of Y", telegram links, header text), and its remaining options (c) and (d) appear at the top of Page N+1 before the next question number starts!
     • You MUST ignore all intervening watermarks, website URLs, and header/footer lines between options.
     • Seamlessly STITCH options (c) and (d) from the top of the next page onto the preceding question from the bottom of the previous page so that the question has ALL 4 options (A, B, C, D) fully populated!
     • If a page begins with orphan options like "c) ...", "d) ...", "(ग) ...", "(घ) ...", "(c) ...", "(d) ..." without a preceding question number, attach them to the last question from the previous page!
   - Handle Hindi option tags: क -> option_a, ख -> option_b, ग -> option_c, घ -> option_d.
   - If an option is genuinely missing in the document, keep option text empty "" and mark validation_status = "needs_review".

3. ANSWER EXTRACTION — STRICT TRUTH HIERARCHY:
   - Check for inline answers right after the question (e.g., "Ans: (B)", "उत्तर: (ख)", "Answer - C", "Ans: Ravi").
   - If answer is given as a word (e.g. "Ans: Ravi" matching Option B), map it to "B".
   - If an explicit answer is given in the text:
     - Set correct_answer = 'A' | 'B' | 'C' | 'D'
     - Set answer_source = "pdf_inline" (or "pdf_answer_key")
     - Set answer_status = "verified"
   - If PDF answer contradicts known factual truths or conflicts with another section:
     - Set answer_status = "conflict"
     - Add to validation_issues: "Conflict with reference answer"
   - IF NO ANSWER IS GIVEN IN THE PDF:
     - Do NOT guess silently! NEVER use "A" as a fallback!
     - If you (the AI) are >90% certain of the factually correct answer:
       - Set correct_answer = correct option letter
       - Set answer_source = "ai_determined"
       - Set answer_status = "verified"
     - If you are UNCERTAIN or the question is subjective:
       - Set correct_answer = "A" (or best guess)
       - Set answer_source = "none"
       - Set answer_status = "needs_review"
       - Add to validation_issues: "No answer found in document; requires admin review"

${taxonomyInstructions}

${languageDirectives}

5. FIELD DETAILS:
   - explanation: Extract the explanation if given in the text/solution, else null or concise rationale.
   - difficulty: "Easy" | "Medium" | "Hard" | "Moderate".
   - source_page: Integer page number where question starts (${pages[0].pageNumber}).
   - validation_status: "valid" (if complete with all 4 options & verified answer) | "needs_review" | "invalid".
   - validation_issues: string array describing any issues (e.g., ["Low OCR clarity", "Missing Option D"]).
   - duplicate_status: "unique" | "duplicate" | "near_duplicate".
   - confidence: integer from 0 to 100.

${answerKeyContext}

RAW DOCUMENT PAGES TEXT:
"""
${combinedText}
"""

OUTPUT FORMAT: Return a JSON ARRAY of question objects matching the specified schema.
`.trim();

    return aiService.executeWithKeyRotation<ExtractedPDFMCQ[]>(
      `PDF OCR Pages ${pages.map((p) => p.pageNumber).join(',')}`,
      onLog,
      async (ai) => {
        const contents: any[] = [];

        // Add image parts if any scanned page
        if (imagesParts.length > 0) {
          contents.push(...imagesParts);
        }

        // Add system prompt and text
        contents.push({ text: systemPrompt });

        const response = await aiService.generateWithModelFallback(
          ai,
          {
            contents,
            config: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    question_number: { type: Type.INTEGER },
                    question_text: { type: Type.STRING },
                    question_hi: { type: Type.STRING, nullable: true },
                    option_a: { type: Type.STRING },
                    option_b: { type: Type.STRING },
                    option_c: { type: Type.STRING },
                    option_d: { type: Type.STRING },
                    correct_answer: { type: Type.STRING },
                    answer_source: { type: Type.STRING },
                    answer_status: { type: Type.STRING },
                    explanation: { type: Type.STRING, nullable: true },
                    subject: { type: Type.STRING },
                    chapter: { type: Type.STRING },
                    topic: { type: Type.STRING },
                    difficulty: { type: Type.STRING },
                    source_page: { type: Type.INTEGER },
                    validation_status: { type: Type.STRING },
                    validation_issues: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    duplicate_status: { type: Type.STRING },
                    confidence: { type: Type.INTEGER },
                  },
                  required: [
                    'question_number',
                    'question_text',
                    'option_a',
                    'option_b',
                    'option_c',
                    'option_d',
                    'correct_answer',
                    'answer_source',
                    'answer_status',
                    'subject',
                    'source_page',
                    'validation_status',
                  ],
                },
              },
            },
          },
          onLog,
          `PDF Chunk OCR Pages ${pages[0].pageNumber}-${pages[pages.length - 1].pageNumber}`
        );

        const rawText = response.text || '';
        if (!rawText) return [];

        let cleaned = rawText.trim();
        if (cleaned.startsWith('```json')) {
          cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
        } else if (cleaned.startsWith('```')) {
          cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }

        let parsed: any;
        try {
          parsed = JSON.parse(cleaned);
        } catch {
          const match = cleaned.match(/\[\s*\{[\s\S]*\}\s*\]/);
          if (match) {
            parsed = JSON.parse(match[0]);
          } else {
            return [];
          }
        }

        if (!Array.isArray(parsed)) return [];

        const defaultPage = pages[0].pageNumber;

        return parsed.map((item: any, idx: number) => {
          const qNum = typeof item.question_number === 'number' ? item.question_number : idx + 1;
          const optLetter = normalizeOptionLetter(item.correct_answer) || 'A';
          const srcPage = typeof item.source_page === 'number' ? item.source_page : defaultPage;

          // Cross check with global answer key if present
          let ansSource = item.answer_source || 'pdf_inline';
          let ansStatus = item.answer_status || 'verified';
          const validationIssues: string[] = Array.isArray(item.validation_issues) ? item.validation_issues : [];

          if (globalAnswerKeyMap.has(qNum)) {
            const keyAnswer = globalAnswerKeyMap.get(qNum)!;
            if (item.answer_source !== 'pdf_inline' || !item.correct_answer) {
              // Adopt key answer
              ansSource = 'pdf_answer_key';
              ansStatus = 'verified';
            } else if (optLetter !== keyAnswer) {
              ansStatus = 'conflict';
              validationIssues.push(`Conflict: Question has option (${optLetter}), but Answer Key says (${keyAnswer})`);
            }
          }

          // Check options validity
          const hasEmptyOption = !item.option_a || !item.option_b || !item.option_c || !item.option_d;
          if (hasEmptyOption && !validationIssues.includes('Missing one or more option choices')) {
            validationIssues.push('Missing one or more option choices');
          }

          let valStatus = item.validation_status || 'valid';
          if (validationIssues.length > 0 || ansStatus === 'conflict' || hasEmptyOption) {
            valStatus = valStatus === 'invalid' ? 'invalid' : 'needs_review';
          }

          // Apply Taxonomy Resolution (AI Auto-Detection per question vs Single Fixed Override)
          let rawSubj: string;
          let rawChap: string;
          let rawTop: string;

          if (taxonomyMode === 'single_override') {
            rawSubj = defaultSubject || item.subject || 'General Studies';
            rawChap = defaultChapter || item.chapter || 'General';
            rawTop = defaultTopic || item.topic || 'General Topic';
          } else {
            // auto_multi mode: Trust the AI's detected subject and chapter per question
            rawSubj = (item.subject && String(item.subject).trim()) ? String(item.subject).trim() : (defaultSubject || 'General Studies');
            rawChap = (item.chapter && String(item.chapter).trim()) ? String(item.chapter).trim() : (defaultChapter || 'General');
            rawTop = (item.topic && String(item.topic).trim()) ? String(item.topic).trim() : (defaultTopic || 'General Topic');
          }

          const taxonomy = standardizeTaxonomy
            ? normalizeQuestionTaxonomy({ subject: rawSubj, chapter: rawChap, topic: rawTop })
            : { subject: rawSubj, chapter: rawChap, topic: rawTop };

          return {
            question_number: qNum,
            question_text: String(item.question_text || '').trim(),
            question_hi: item.question_hi ? String(item.question_hi).trim() : null,
            option_a: String(item.option_a || '').trim(),
            option_b: String(item.option_b || '').trim(),
            option_c: String(item.option_c || '').trim(),
            option_d: String(item.option_d || '').trim(),
            correct_answer: optLetter,
            answer_source: ansSource as any,
            answer_status: ansStatus as any,
            explanation: item.explanation ? String(item.explanation).trim() : null,
            subject: taxonomy.subject,
            chapter: taxonomy.chapter,
            topic: taxonomy.topic,
            difficulty: item.difficulty || 'Moderate',
            source_page: srcPage,
            validation_status: valStatus as any,
            validation_issues: validationIssues,
            duplicate_status: (item.duplicate_status || 'unique') as any,
            confidence: typeof item.confidence === 'number' ? item.confidence : 92,
            selected: valStatus !== 'invalid',
          };
        });
      }
    );
  },

  /**
   * Reconciles global answer keys, cleans duplicate question numbers, sorts in ascending sequence,
   * stitches split cross-page options, and recovers missing options from adjacent page text.
   */
  reconcileAndValidateQuestions: (
    questions: ExtractedPDFMCQ[],
    globalAnswerKeyMap: Map<number, string>,
    standardizeTaxonomy: boolean = true,
    pageTextMap?: Map<number, string>,
    onLog?: (msg: string) => void
  ): ExtractedPDFMCQ[] => {
    // 1. Sort by question_number, then by source_page
    const sorted = [...questions].sort((a, b) => {
      if (a.question_number !== b.question_number) {
        return a.question_number - b.question_number;
      }
      return a.source_page - b.source_page;
    });

    // 2. Remove identical duplicates from page overlap while merging incomplete options
    const seenMap = new Map<string, ExtractedPDFMCQ>();
    const seenTexts = new Map<string, number>();

    const deduplicated: ExtractedPDFMCQ[] = [];

    sorted.forEach((q) => {
      // Standardize subject, chapter, topic if enabled
      if (standardizeTaxonomy) {
        const norm = normalizeQuestionTaxonomy({
          subject: q.subject,
          chapter: q.chapter,
          topic: q.topic,
        });
        q.subject = norm.subject;
        q.chapter = norm.chapter;
        q.topic = norm.topic;
      }

      // Normalize text for duplicate detection
      const normText = q.question_text.toLowerCase().replace(/[^a-z0-9\u0900-\u097F]/g, '');
      const key = `${q.question_number}_${normText.substring(0, 30)}`;

      if (seenMap.has(key)) {
        // Question seen from chunk overlap: Merge any missing options into existing instance
        const existing = seenMap.get(key)!;
        if ((!existing.option_c || existing.option_c.length < 2) && q.option_c) existing.option_c = q.option_c;
        if ((!existing.option_d || existing.option_d.length < 2) && q.option_d) existing.option_d = q.option_d;
        if ((!existing.option_a || existing.option_a.length < 2) && q.option_a) existing.option_a = q.option_a;
        if ((!existing.option_b || existing.option_b.length < 2) && q.option_b) existing.option_b = q.option_b;
        if (!existing.explanation && q.explanation) existing.explanation = q.explanation;
        if (!existing.question_hi && q.question_hi) existing.question_hi = q.question_hi;

        const all4OptionsPresent = Boolean(existing.option_a && existing.option_b && existing.option_c && existing.option_d);
        if (all4OptionsPresent) {
          existing.validation_issues = existing.validation_issues.filter(
            (iss) => !iss.toLowerCase().includes('missing') && !iss.toLowerCase().includes('option')
          );
          if (existing.validation_issues.length === 0 && existing.answer_status !== 'conflict') {
            existing.validation_status = 'valid';
          }
        }
        return;
      }
      seenMap.set(key, q);

      // Algorithmic Orphan Option & Translation Stitcher for cross-page splits
      if (pageTextMap && q.source_page) {
        const nextPageText = pageTextMap.get(q.source_page + 1);
        if (nextPageText) {
          // Look at top lines before the next question number
          const lines = nextPageText.split('\n').map((l) => l.trim()).filter(Boolean);
          const topLines: string[] = [];
          for (const line of lines) {
            // Stop when the next question number starts (e.g. "221.", "Q221", "(221)", "Q. 221")
            if (/^(?:Q\.?\s*)?\d{1,4}[\.\)\:\-]\s+/i.test(line)) break;
            topLines.push(line);
          }
          const topText = topLines.join('\n');

          // Check if Hindi question translation was cut off / placed on the next page
          if (!q.question_hi || q.question_hi.length < 5) {
            // Find lines with Devanagari characters before the options
            const hindiLines = topLines.filter(
              (l) =>
                /[\u0900-\u097F]/.test(l) &&
                !/^(?:[a-d1-4क-घ]|\([a-d1-4क-घ]\))[\.\)\:\-\s]/i.test(l) &&
                !/visit|thegkadda|telegram|http|download|mock\s*test|copyright/i.test(l)
            );
            if (hindiLines.length > 0) {
              q.question_hi = hindiLines.join(' ').trim();
            }
          }

          // Check if option A was cut off / on next page
          if (!q.option_a || q.option_a.length < 2 || q.option_a.toLowerCase().includes('not clearly visible')) {
            const aMatch = topText.match(/(?:^|\n)\s*(?:a|A|\(a\)|\(A\)|क|\(क\)|\(1\)|1)[\.\:\)\-\s]+([^\n]+)/i);
            if (aMatch && aMatch[1] && !/visit|thegkadda|\.com|http/i.test(aMatch[1])) {
              q.option_a = aMatch[1].trim();
            }
          }

          // Check if option B was cut off / on next page
          if (!q.option_b || q.option_b.length < 2 || q.option_b.toLowerCase().includes('not clearly visible')) {
            const bMatch = topText.match(/(?:^|\n)\s*(?:b|B|\(b\)|\(B\)|ख|\(ख\)|\(2\)|2)[\.\:\)\-\s]+([^\n]+)/i);
            if (bMatch && bMatch[1] && !/visit|thegkadda|\.com|http/i.test(bMatch[1])) {
              q.option_b = bMatch[1].trim();
            }
          }

          // Check if option C was cut off / on next page
          if (!q.option_c || q.option_c.length < 2 || q.option_c.toLowerCase().includes('not clearly visible')) {
            const cMatch = topText.match(/(?:^|\n)\s*(?:c|C|\(c\)|\(C\)|ग|\(ग\)|\(3\)|3)[\.\:\)\-\s]+([^\n]+)/i);
            if (cMatch && cMatch[1] && !/visit|thegkadda|\.com|http/i.test(cMatch[1])) {
              q.option_c = cMatch[1].trim();
            }
          }

          // Check if option D was cut off / on next page
          if (!q.option_d || q.option_d.length < 2 || q.option_d.toLowerCase().includes('not clearly visible')) {
            const dMatch = topText.match(/(?:^|\n)\s*(?:d|D|\(d\)|\(D\)|घ|\(घ\)|\(4\)|4)[\.\:\)\-\s]+([^\n]+)/i);
            if (dMatch && dMatch[1] && !/visit|thegkadda|\.com|http/i.test(dMatch[1])) {
              q.option_d = dMatch[1].trim();
            }
          }

          // Check for inline answer at top of next page (e.g., "Ans: D", "Ans - (d)")
          if (!q.correct_answer || q.answer_source === 'none') {
            const ansMatch = topText.match(/(?:Ans|Answer|उत्तर)[\s\:\-\.]*(?:Option\s*)?\(?([A-D|क-घ|1-4])\)?/i);
            if (ansMatch && ansMatch[1]) {
              const letter = ansMatch[1].toUpperCase();
              const mapped = letter === 'क' || letter === '1' ? 'A' : letter === 'ख' || letter === '2' ? 'B' : letter === 'ग' || letter === '3' ? 'C' : letter === 'घ' || letter === '4' ? 'D' : (['A', 'B', 'C', 'D'].includes(letter) ? letter : 'A');
              q.correct_answer = mapped as any;
              q.answer_source = 'pdf_inline';
              q.answer_status = 'verified';
            }
          }

          if (q.option_a && q.option_b && q.option_c && q.option_d) {
            q.validation_issues = q.validation_issues.filter(
              (iss) => !iss.toLowerCase().includes('missing') && !iss.toLowerCase().includes('option')
            );
            if (q.validation_issues.length === 0 && q.answer_status !== 'conflict') {
              q.validation_status = 'valid';
            }
          }
        }
      }

      // Check text-based duplicate across different numbers
      if (normText.length > 20) {
        if (seenTexts.has(normText)) {
          q.duplicate_status = 'duplicate';
          q.validation_status = 'needs_review';
          q.validation_issues.push(`Duplicate of Question #${seenTexts.get(normText)}`);
        } else {
          seenTexts.set(normText, q.question_number);
        }
      }

      // Check global answer key mapping
      if (globalAnswerKeyMap.has(q.question_number)) {
        const keyAns = globalAnswerKeyMap.get(q.question_number)!;
        if (q.answer_source === 'none' || !q.correct_answer) {
          q.correct_answer = keyAns;
          q.answer_source = 'pdf_answer_key';
          q.answer_status = 'verified';
        } else if (q.correct_answer !== keyAns) {
          q.answer_status = 'conflict';
          if (!q.validation_issues.some((iss) => iss.includes('Conflict'))) {
            q.validation_issues.push(`Answer key conflict: Key says (${keyAns}), text says (${q.correct_answer})`);
          }
          q.validation_status = 'needs_review';
        }
      }

      deduplicated.push(q);
    });

    onLog?.(`✨ Reconciled questions: ${deduplicated.length} final MCQs after document deduplication, cross-page option stitching & taxonomy standardization.`);
    return deduplicated;
  },

  /**
   * Helper to convert ExtractedPDFMCQs into standard GradeUp Question models for database persistence.
   */
  convertToGradeUpQuestions: (
    extracted: ExtractedPDFMCQ[],
    targetTestId: string,
    marksPerQuestion: number = 1,
    negativeMarks: number = 0,
    startQuestionNumber: number = 1,
    standardizeTaxonomy: boolean = true
  ): Question[] => {
    let currentNum = startQuestionNumber;

    return extracted.map((eq) => {
      // If question has bilingual Hindi text, combine or format cleanly
      let fullQText = eq.question_text;
      if (eq.question_hi && eq.question_hi !== eq.question_text) {
        fullQText = `${eq.question_text}\n\n${eq.question_hi}`;
      }

      const taxonomy = standardizeTaxonomy
        ? normalizeQuestionTaxonomy({ subject: eq.subject, chapter: eq.chapter, topic: eq.topic })
        : { subject: eq.subject || 'General Studies', chapter: eq.chapter || 'General', topic: eq.topic || 'General Topic' };

      const q: Question = {
        id: generateUUID(),
        test_id: targetTestId,
        question_number: currentNum++,
        question_text: fullQText,
        option_a: eq.option_a,
        option_b: eq.option_b,
        option_c: eq.option_c,
        option_d: eq.option_d,
        correct_answer: eq.correct_answer as any,
        explanation: eq.explanation || '',
        marks: marksPerQuestion,
        negative_marks: negativeMarks,
        subject: taxonomy.subject,
        chapter: taxonomy.chapter,
        topic: taxonomy.topic,
        difficulty: eq.difficulty || 'Medium',
        inspection_status: eq.validation_status === 'valid' ? 'verified' : 'needs_review',
        inspection_notes: eq.validation_issues.length > 0 ? eq.validation_issues.join(' | ') : undefined,
        quality_score: eq.confidence || 90,
      };

      return q;
    });
  },
};

export interface ExtractMCQsFromPDFOptions {
  file: File;
  pageRangeMode?: 'all' | 'custom';
  startPage?: number;
  endPage?: number;
  defaultSubject?: string;
  defaultChapter?: string;
  defaultTopic?: string;
  languageMode?: 'auto' | 'bilingual' | 'english' | 'hindi';
  onProgress?: (
    percentage: number,
    statusMessage: string,
    currentPage?: number,
    totalPages?: number,
    extractedCount?: number
  ) => void;
}

export async function extractMCQsFromPDF(
  options: ExtractMCQsFromPDFOptions
): Promise<{ success: boolean; questions: ExtractedPDFMCQ[]; error?: string }> {
  try {
    const startP = options.pageRangeMode === 'custom' ? (options.startPage || 1) : 1;
    const endP = options.pageRangeMode === 'custom' ? options.endPage : undefined;

    const result = await pdfOcrEngine.processCompletePDF({
      file: options.file,
      startPage: startP,
      endPage: endP,
      defaultSubject: options.defaultSubject || 'General Studies',
      defaultChapter: options.defaultChapter || 'General',
      defaultTopic: options.defaultTopic || 'General Topic',
      taxonomyMode: 'auto_multi',
      standardizeTaxonomy: true,
      languageMode: options.languageMode || 'auto',
      onProgress: (p) => {
        options.onProgress?.(
          p.percentage,
          p.statusMessage,
          p.currentPage,
          p.totalPages,
          p.questionsFound
        );
      }
    });

    return {
      success: true,
      questions: result.questions || []
    };
  } catch (err: any) {
    return {
      success: false,
      questions: [],
      error: err?.message || 'Failed to extract MCQs from PDF'
    };
  }
}

