import { Question, Test } from '../types';
import { normalizeText, isGenericStem } from './duplicateDetector';
import { dataService } from '../services/dataService';

export type SemanticMatchType =
  | 'exact_copy'
  | 'shuffled_options'
  | 'near_identical'
  | 'semantic_concept_duplicate';

export interface SemanticVector {
  normText: string;
  charNgrams: Set<string>;
  tokenNgrams: Set<string>;
  wordFrequencies: Map<string, number>;
  conceptKeywords: Set<string>;
  magnitude: number;
}

export interface SemanticDuplicateGroup {
  groupId: string;
  matchType: SemanticMatchType;
  confidence: number; // 0 - 100
  reason: string;
  vectorSimilarity: number;
  optionsOverlapCount: number;
  bestQuestionId: string;
  questions: Question[];
  linkedMockTests?: {
    [questionId: string]: { testId: string; testTitle: string; questionIndex: number }[];
  };
}

export interface SemanticDetectionResult {
  groups: SemanticDuplicateGroup[];
  duplicateIdMap: Map<string, { group: SemanticDuplicateGroup; partnerIds: string[] }>;
  duplicateIdsSet: Set<string>;
  totalDuplicateCount: number;
  exactCount: number;
  shuffledCount: number;
  nearIdenticalCount: number;
  semanticConceptCount: number;
  linkedMockTestsCount: number;
}

// Stopwords in English and Hindi to extract core semantic concept terms
const STOPWORDS = new Set([
  // English
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'up', 'about', 'into', 'over', 'after', 'which', 'what', 'who', 'whom',
  'this', 'that', 'these', 'those', 'am', 'and', 'or', 'not', 'can', 'could', 'should', 'would',
  'have', 'has', 'had', 'do', 'does', 'did', 'following', 'statement', 'statements', 'option', 'options',
  'choose', 'select', 'correct', 'incorrect', 'true', 'false', 'match',
  // Hindi
  'का', 'के', 'की', 'को', 'में', 'से', 'पर', 'ने', 'है', 'हैं', 'था', 'थी', 'थे', 'होता', 'होती', 'होते',
  'किया', 'गया', 'गई', 'गए', 'और', 'या', 'तो', 'भी', 'ही', 'नहीं', 'न', 'यह', 'वह', 'ये', 'वे', 'कि',
  'किस', 'कौन', 'क्या', 'निम्न', 'निम्नलिखित', 'कथन', 'सही', 'गलत', 'उत्तर', 'चुनिए', 'बताइए', 'दीजिए'
]);

/**
 * Builds a sparse Semantic Vector for a question text using Character 3-grams, Token Bigrams & TF-IDF term weights.
 */
export function buildSemanticVector(text: string): SemanticVector {
  const normText = normalizeText(text || '');
  const tokens = normText.split(/\s+/).filter(Boolean);

  const charNgrams = new Set<string>();
  const tokenNgrams = new Set<string>();
  const wordFrequencies = new Map<string, number>();
  const conceptKeywords = new Set<string>();

  // Extract character 3-grams for typo resilience & morphological variance
  const cleanSpaceless = normText.replace(/\s+/g, '');
  const cleanLen = cleanSpaceless.length;
  for (let i = 0; i <= cleanLen - 3; i++) {
    charNgrams.add(cleanSpaceless.substring(i, i + 3));
  }

  // Extract words, concept keywords, and word bigrams
  const tokLen = tokens.length;
  for (let i = 0; i < tokLen; i++) {
    const w = tokens[i];
    if (w.length >= 2) {
      wordFrequencies.set(w, (wordFrequencies.get(w) || 0) + 1);
      if (!STOPWORDS.has(w) && w.length >= 3) {
        conceptKeywords.add(w);
      }
    }
    if (i < tokLen - 1) {
      tokenNgrams.add(`${tokens[i]}_${tokens[i + 1]}`);
    }
  }

  // Calculate vector magnitude for Cosine calculation
  let sumSq = 0;
  wordFrequencies.forEach((freq, word) => {
    const weight = STOPWORDS.has(word) ? 0.3 : 1.2;
    sumSq += Math.pow(freq * weight, 2);
  });
  const magnitude = Math.sqrt(sumSq) || 1;

  return {
    normText,
    charNgrams,
    tokenNgrams,
    wordFrequencies,
    conceptKeywords,
    magnitude,
  };
}

/**
 * Pre-analyzed Question Node to prevent repeated tokenization and object allocations.
 */
interface PreparedQuestionNode {
  q: Question;
  normText: string;
  vec: SemanticVector;
  normOpts: string[];
  validOpts: string[];
  isGeneric: boolean;
}

/**
 * Fast comparison between two pre-built question nodes.
 */
function comparePrebuiltNodes(
  nodeA: PreparedQuestionNode,
  nodeB: PreparedQuestionNode
): {
  isDuplicate: boolean;
  matchType?: SemanticMatchType;
  confidence?: number;
  reason?: string;
  vectorSimilarity?: number;
  optionsOverlapCount?: number;
} {
  const { normText: normA, vec: vecA, normOpts: optsA, validOpts: validA, isGeneric: isGenA, q: qA } = nodeA;
  const { normText: normB, vec: vecB, normOpts: optsB, validOpts: validB, isGeneric: isGenB, q: qB } = nodeB;

  if (!normA || !normB || qA.id === qB.id) return { isDuplicate: false };

  // 1. Exact text shortcut
  let exactOrderMatches = 0;
  for (let i = 0; i < 4; i++) {
    if (optsA[i] && optsB[i] && optsA[i] === optsB[i]) {
      exactOrderMatches++;
    }
  }

  if (normA === normB && exactOrderMatches >= 3) {
    return {
      isDuplicate: true,
      matchType: 'exact_copy',
      confidence: 100,
      reason: `Exact Copy: 100% identical question text with ${exactOrderMatches}/4 identical ordered options.`,
      vectorSimilarity: 1.0,
      optionsOverlapCount: exactOrderMatches,
    };
  }

  // Calculate semantic vector similarity
  const sim = calculateSemanticVectorSimilarity(vecA, vecB);

  // Fast options overlap
  let overlapCount = 0;
  const usedB = new Set<number>();
  validA.forEach((optA) => {
    const matchedIdx = validB.findIndex(
      (optB, idx) => !usedB.has(idx) && (optA === optB || (optA.length > 5 && optB.length > 5 && (optA.includes(optB) || optB.includes(optA))))
    );
    if (matchedIdx !== -1) {
      usedB.add(matchedIdx);
      overlapCount++;
    }
  });

  const isIdenticalOptionSet = validA.length >= 3 && validA.length === validB.length && overlapCount === validA.length;
  const isGeneric = isGenA || isGenB;

  // 2. Shuffled Options (identical text, shuffled options)
  if (normA === normB && isIdenticalOptionSet) {
    return {
      isDuplicate: true,
      matchType: 'shuffled_options',
      confidence: 98,
      reason: `Shuffled Options: Identical question text with 4/4 matching options in permuted positions.`,
      vectorSimilarity: 1.0,
      optionsOverlapCount: overlapCount,
    };
  }

  // 3. Generic stem protection
  if (isGeneric) {
    if (isIdenticalOptionSet || overlapCount >= 3) {
      return {
        isDuplicate: true,
        matchType: isIdenticalOptionSet ? 'exact_copy' : 'near_identical',
        confidence: isIdenticalOptionSet ? 97 : 90,
        reason: `Generic MCQ Stem: Matches ${overlapCount}/4 options with standard phrasing.`,
        vectorSimilarity: sim,
        optionsOverlapCount: overlapCount,
      };
    }
    return { isDuplicate: false };
  }

  // 4. Near Identical (Semantic vector similarity >= 0.86 + at least 3 matching options)
  if (sim >= 0.86 && overlapCount >= 3) {
    return {
      isDuplicate: true,
      matchType: 'near_identical',
      confidence: Math.round(sim * 60 + (overlapCount / 4) * 40),
      reason: `Near Identical: ${Math.round(sim * 100)}% semantic vector match and ${overlapCount}/4 matching options.`,
      vectorSimilarity: sim,
      optionsOverlapCount: overlapCount,
    };
  }

  // 5. Semantic Concept Duplicate (High concept vector similarity >= 0.88 across same subject)
  if (sim >= 0.88 && overlapCount >= 2 && qA.subject && qB.subject && qA.subject === qB.subject) {
    return {
      isDuplicate: true,
      matchType: 'semantic_concept_duplicate',
      confidence: Math.round(sim * 95),
      reason: `Semantic Vector Concept Match: High semantic similarity (${Math.round(sim * 100)}%) across same subject concept.`,
      vectorSimilarity: sim,
      optionsOverlapCount: overlapCount,
    };
  }

  return { isDuplicate: false };
}

/**
 * Calculates Cosine Vector Similarity between two semantic vectors.
 */
export function calculateSemanticVectorSimilarity(vecA: SemanticVector, vecB: SemanticVector): number {
  if (vecA.normText === vecB.normText) return 1.0;
  if (!vecA.normText || !vecB.normText) return 0;

  // 1. Word frequency dot product
  let dotProduct = 0;
  vecA.wordFrequencies.forEach((freqA, word) => {
    if (vecB.wordFrequencies.has(word)) {
      const freqB = vecB.wordFrequencies.get(word)!;
      const weight = STOPWORDS.has(word) ? 0.3 : 1.2;
      dotProduct += (freqA * weight) * (freqB * weight);
    }
  });
  const wordCosine = dotProduct / (vecA.magnitude * vecB.magnitude);

  // Quick exit if word cosine is very low
  if (wordCosine < 0.35) return wordCosine * 0.45;

  // 2. Character 3-gram Jaccard
  let charMatch = 0;
  vecA.charNgrams.forEach((ng) => {
    if (vecB.charNgrams.has(ng)) charMatch++;
  });
  const charUnion = new Set([...vecA.charNgrams, ...vecB.charNgrams]).size;
  const charSim = charUnion > 0 ? charMatch / charUnion : 0;

  // 3. Concept Keywords Overlap
  let conceptMatch = 0;
  vecA.conceptKeywords.forEach((kw) => {
    if (vecB.conceptKeywords.has(kw)) conceptMatch++;
  });
  const conceptUnion = new Set([...vecA.conceptKeywords, ...vecB.conceptKeywords]).size;
  const conceptSim = conceptUnion > 0 ? conceptMatch / conceptUnion : 0;

  // Weighted composite similarity
  const compositeScore = (wordCosine * 0.45) + (charSim * 0.30) + (conceptSim * 0.25);
  return Math.min(1.0, Math.max(0, compositeScore));
}

/**
 * Compares two questions using Semantic Vector analysis.
 */
export function checkSemanticVectorDuplicate(
  qA: Question,
  qB: Question
): {
  isDuplicate: boolean;
  matchType?: SemanticMatchType;
  confidence?: number;
  reason?: string;
  vectorSimilarity?: number;
  optionsOverlapCount?: number;
} {
  if (qA.id === qB.id) return { isDuplicate: false };

  const normA = normalizeText(qA.question_text || '');
  const normB = normalizeText(qB.question_text || '');
  if (!normA || !normB) return { isDuplicate: false };

  const optsA = [
    normalizeText(qA.option_a || ''),
    normalizeText(qA.option_b || ''),
    normalizeText(qA.option_c || ''),
    normalizeText(qA.option_d || ''),
  ];
  const optsB = [
    normalizeText(qB.option_b || ''),
    normalizeText(qB.option_b || ''),
    normalizeText(qB.option_c || ''),
    normalizeText(qB.option_d || ''),
  ];

  const nodeA: PreparedQuestionNode = {
    q: qA,
    normText: normA,
    vec: buildSemanticVector(qA.question_text),
    normOpts: optsA,
    validOpts: optsA.filter(Boolean),
    isGeneric: isGenericStem(normA),
  };

  const nodeB: PreparedQuestionNode = {
    q: qB,
    normText: normB,
    vec: buildSemanticVector(qB.question_text),
    normOpts: optsB,
    validOpts: optsB.filter(Boolean),
    isGeneric: isGenericStem(normB),
  };

  return comparePrebuiltNodes(nodeA, nodeB);
}

/**
 * Maps all question IDs to the Mock Tests they are linked in.
 */
export async function mapQuestionsToMockTests(): Promise<{
  [questionId: string]: { testId: string; testTitle: string; questionIndex: number }[];
}> {
  const result: { [questionId: string]: { testId: string; testTitle: string; questionIndex: number }[] } = {};

  try {
    const tests = await dataService.getTests(true);
    const rawQuestions = localStorage.getItem('gradeup_questions');
    let questionsMap: Record<string, Question[]> = {};
    try {
      questionsMap = rawQuestions ? JSON.parse(rawQuestions) : {};
    } catch {}

    tests.forEach((test) => {
      const qList = questionsMap[test.id] || [];
      qList.forEach((q, idx) => {
        if (q && q.id) {
          if (!result[q.id]) {
            result[q.id] = [];
          }
          result[q.id].push({
            testId: test.id,
            testTitle: test.title || `Mock Test #${test.id}`,
            questionIndex: idx + 1,
          });
        }
      });
    });
  } catch (e) {
    console.warn('Failed to map questions to mock tests:', e);
  }

  return result;
}

/**
 * Fast synchronous mapping from localStorage for immediate memoized renders.
 */
export function mapQuestionsToMockTestsSync(): {
  [questionId: string]: { testId: string; testTitle: string; questionIndex: number }[];
} {
  const result: { [questionId: string]: { testId: string; testTitle: string; questionIndex: number }[] } = {};
  try {
    const rawTests = localStorage.getItem('gradeup_tests');
    const tests: any[] = rawTests ? JSON.parse(rawTests) : [];
    const rawQuestions = localStorage.getItem('gradeup_questions');
    let questionsMap: Record<string, Question[]> = {};
    try {
      questionsMap = rawQuestions ? JSON.parse(rawQuestions) : {};
    } catch {}

    tests.forEach((test) => {
      const qList = questionsMap[test.id] || [];
      qList.forEach((q, idx) => {
        if (q && q.id) {
          if (!result[q.id]) {
            result[q.id] = [];
          }
          result[q.id].push({
            testId: test.id,
            testTitle: test.title || `Mock Test #${test.id}`,
            questionIndex: idx + 1,
          });
        }
      });
    });
  } catch {}
  return result;
}

/**
 * Runs full Semantic Vector Deduplication analysis on a list of questions (synchronous, blazing fast O(N)).
 */
export function detectSemanticVectorDuplicates(
  questions: Question[],
  linkedMap: { [questionId: string]: { testId: string; testTitle: string; questionIndex: number }[] } = mapQuestionsToMockTestsSync()
): SemanticDetectionResult {
  const n = questions.length;
  if (n <= 1) {
    return {
      groups: [],
      duplicateIdMap: new Map(),
      duplicateIdsSet: new Set(),
      totalDuplicateCount: 0,
      exactCount: 0,
      shuffledCount: 0,
      nearIdenticalCount: 0,
      semanticConceptCount: 0,
      linkedMockTestsCount: 0,
    };
  }

  // 1. Precompute Nodes once for all questions O(N)
  const nodes: PreparedQuestionNode[] = [];
  const exactTextBuckets = new Map<string, number[]>();
  const keywordInvertedIndex = new Map<string, number[]>();

  for (let i = 0; i < n; i++) {
    const q = questions[i];
    const normText = normalizeText(q.question_text || '');
    const opts = [
      normalizeText(q.option_a || ''),
      normalizeText(q.option_b || ''),
      normalizeText(q.option_c || ''),
      normalizeText(q.option_d || ''),
    ];

    const vec = buildSemanticVector(q.question_text || '');
    const node: PreparedQuestionNode = {
      q,
      normText,
      vec,
      normOpts: opts,
      validOpts: opts.filter(Boolean),
      isGeneric: isGenericStem(normText),
    };
    nodes.push(node);

    // Exact text bucketing
    if (normText) {
      if (!exactTextBuckets.has(normText)) {
        exactTextBuckets.set(normText, []);
      }
      exactTextBuckets.get(normText)!.push(i);
    }

    // Inverted index on concept keywords
    vec.conceptKeywords.forEach((kw) => {
      if (kw.length >= 3) {
        if (!keywordInvertedIndex.has(kw)) {
          keywordInvertedIndex.set(kw, []);
        }
        keywordInvertedIndex.get(kw)!.push(i);
      }
    });
  }

  // 2. Union-Find Structure
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (i: number): number => {
    if (parent[i] === i) return i;
    parent[i] = find(parent[i]);
    return parent[i];
  };
  const union = (i: number, j: number) => {
    const rootI = find(i);
    const rootJ = find(j);
    if (rootI !== rootJ) parent[rootJ] = rootI;
  };

  const pairMeta = new Map<string, {
    matchType: SemanticMatchType;
    confidence: number;
    reason: string;
    vectorSimilarity: number;
    optionsOverlapCount: number;
  }>();

  const checkedPairs = new Set<string>();

  const testAndUnion = (i: number, j: number) => {
    if (i === j) return;
    const pairKey = i < j ? `${i}-${j}` : `${j}-${i}`;
    if (checkedPairs.has(pairKey)) return;
    checkedPairs.add(pairKey);

    const res = comparePrebuiltNodes(nodes[i], nodes[j]);
    if (res.isDuplicate) {
      union(i, j);
      pairMeta.set(pairKey, {
        matchType: res.matchType || 'exact_copy',
        confidence: res.confidence || 95,
        reason: res.reason || 'Semantic Match',
        vectorSimilarity: res.vectorSimilarity || 1,
        optionsOverlapCount: res.optionsOverlapCount || 4,
      });
    }
  };

  // 3A. Check Exact Text Buckets (Instant O(K))
  exactTextBuckets.forEach((indices) => {
    if (indices.length > 1) {
      for (let a = 0; a < indices.length; a++) {
        for (let b = a + 1; b < indices.length; b++) {
          testAndUnion(indices[a], indices[b]);
        }
      }
    }
  });

  // 3B. Candidate Generation via Inverted Keyword Index (Fuzzy & Semantic)
  // Only compare items that share high-information concept keywords
  keywordInvertedIndex.forEach((indices) => {
    if (indices.length > 1 && indices.length < 150) {
      for (let a = 0; a < indices.length; a++) {
        for (let b = a + 1; b < indices.length; b++) {
          testAndUnion(indices[a], indices[b]);
        }
      }
    }
  });

  // 3C. Fallback for smaller sets (n <= 300) to ensure 100% full coverage
  if (n <= 300) {
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        testAndUnion(i, j);
      }
    }
  }

  // 4. Bucket groups
  const groupBuckets = new Map<number, Question[]>();
  for (let i = 0; i < n; i++) {
    const root = find(i);
    if (!groupBuckets.has(root)) groupBuckets.set(root, []);
    groupBuckets.get(root)!.push(questions[i]);
  }

  const groups: SemanticDuplicateGroup[] = [];
  const duplicateIdMap = new Map<string, { group: SemanticDuplicateGroup; partnerIds: string[] }>();
  const duplicateIdsSet = new Set<string>();

  let exactCount = 0;
  let shuffledCount = 0;
  let nearIdenticalCount = 0;
  let semanticConceptCount = 0;
  let linkedMockTestsCount = 0;

  groupBuckets.forEach((list, rootIdx) => {
    if (list.length > 1) {
      // Pick best question
      let bestQ = list[0];
      let bestScore = -1;
      list.forEach((q) => {
        let sc = q.quality_score || 50;
        if (q.explanation && q.explanation.length > 30) sc += 30;
        if (q.inspection_status === 'verified') sc += 20;
        if (sc > bestScore) {
          bestScore = sc;
          bestQ = q;
        }
      });

      let groupMatchType: SemanticMatchType = 'exact_copy';
      let minConf = 100;
      let reason = 'Duplicate detected';
      let avgSim = 1;
      let avgOpts = 4;

      for (let a = 0; a < list.length; a++) {
        for (let b = a + 1; b < list.length; b++) {
          const idxA = questions.findIndex((q) => q.id === list[a].id);
          const idxB = questions.findIndex((q) => q.id === list[b].id);
          const key = idxA < idxB ? `${idxA}-${idxB}` : `${idxB}-${idxA}`;
          const p = pairMeta.get(key);
          if (p) {
            groupMatchType = p.matchType;
            minConf = Math.min(minConf, p.confidence);
            reason = p.reason;
            avgSim = p.vectorSimilarity;
            avgOpts = p.optionsOverlapCount;
          }
        }
      }

      if (groupMatchType === 'exact_copy') exactCount++;
      else if (groupMatchType === 'shuffled_options') shuffledCount++;
      else if (groupMatchType === 'near_identical') nearIdenticalCount++;
      else semanticConceptCount++;

      const groupLinked: { [qId: string]: { testId: string; testTitle: string; questionIndex: number }[] } = {};
      list.forEach((q) => {
        if (linkedMap[q.id] && linkedMap[q.id].length > 0) {
          groupLinked[q.id] = linkedMap[q.id];
          linkedMockTestsCount += linkedMap[q.id].length;
        }
      });

      const groupObj: SemanticDuplicateGroup = {
        groupId: `semantic-group-${rootIdx}-${list[0].id}`,
        matchType: groupMatchType,
        confidence: minConf,
        reason,
        vectorSimilarity: avgSim,
        optionsOverlapCount: avgOpts,
        bestQuestionId: bestQ.id,
        questions: list,
        linkedMockTests: groupLinked,
      };

      groups.push(groupObj);

      const allIds = list.map((q) => q.id);
      list.forEach((q) => {
        duplicateIdsSet.add(q.id);
        duplicateIdMap.set(q.id, {
          group: groupObj,
          partnerIds: allIds.filter((id) => id !== q.id),
        });
      });
    }
  });

  return {
    groups,
    duplicateIdMap,
    duplicateIdsSet,
    totalDuplicateCount: duplicateIdsSet.size,
    exactCount,
    shuffledCount,
    nearIdenticalCount,
    semanticConceptCount,
    linkedMockTestsCount,
  };
}

/**
 * Runs full Semantic Vector Deduplication analysis on a list of questions (async version).
 */
export async function runSemanticVectorDeduplication(
  questions: Question[]
): Promise<SemanticDetectionResult> {
  const linkedMap = await mapQuestionsToMockTests();
  return detectSemanticVectorDuplicates(questions, linkedMap);
}
