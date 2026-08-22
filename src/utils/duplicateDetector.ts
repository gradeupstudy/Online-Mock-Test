import { Question } from '../types';

export type DuplicateMatchType = 'exact_copy' | 'shuffled_options' | 'near_identical';

export interface DuplicateGroup {
  groupId: string;
  matchType: DuplicateMatchType;
  confidence: number; // e.g. 100, 95, 90
  reason: string;
  questions: Question[];
  bestQuestionId: string;
  matchingOptionsCount: number;
  questionSimilarity: number;
}

export interface DuplicateDetectionResult {
  groups: DuplicateGroup[];
  duplicateIdMap: Map<string, { group: DuplicateGroup; partnerIds: string[] }>;
  duplicateIdsSet: Set<string>;
  totalDuplicateCount: number;
  exactCount: number;
  shuffledCount: number;
  nearIdenticalCount: number;
}

/**
 * Normalizes text for comparison: lowercases, removes punctuation, trims extra spaces.
 */
export const normalizeText = (text: string): string => {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[?.,!;:_'"“”‘’`~\-–—()[\]{}<>/*+=#@$%^&|\\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Common generic MCQ stem patterns that appear in many completely unrelated questions.
 * Questions matching these patterns MUST have matching options to be considered duplicates.
 */
const GENERIC_QUESTION_PATTERNS = [
  'which of the following is correct',
  'which of the following is not correct',
  'which of the following is true',
  'which of the following is false',
  'which of the following is incorrect',
  'which sentence is grammatically correct',
  'which of the following statement is correct',
  'which of the following statements is correct',
  'which of the following statements is true',
  'which of the following statements are correct',
  'choose the correct option',
  'choose the correct answer',
  'choose the correct statement',
  'find the correct statement',
  'select the correct option',
  'select the correct answer',
  'inme se kaun sa sahi hai',
  'inme se kaun sa galat hai',
  'nimnalikhit me se kaun sa kathan sahi hai',
  'nimnalikhit me se kaun sa kathan satya hai',
  'match the following',
  'read the following statements',
  'consider the following statements',
];

/**
 * Checks if a question text is a generic standard stem.
 */
export const isGenericStem = (normalizedText: string): boolean => {
  if (!normalizedText || normalizedText.length <= 15) return true;
  return GENERIC_QUESTION_PATTERNS.some(
    (pattern) => normalizedText === pattern || normalizedText.startsWith(pattern) && normalizedText.length < pattern.length + 15
  );
};

/**
 * Calculates Token Jaccard Similarity between two normalized strings (0 to 1).
 */
export const calculateTextSimilarity = (textA: string, textB: string): number => {
  const normA = normalizeText(textA);
  const normB = normalizeText(textB);

  if (!normA && !normB) return 1;
  if (!normA || !normB) return 0;
  if (normA === normB) return 1;

  const tokensA = new Set(normA.split(' ').filter(Boolean));
  const tokensB = new Set(normB.split(' ').filter(Boolean));

  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let intersectionCount = 0;
  tokensA.forEach((token) => {
    if (tokensB.has(token)) intersectionCount++;
  });

  const unionSize = new Set([...tokensA, ...tokensB]).size;
  return unionSize > 0 ? intersectionCount / unionSize : 0;
};

/**
 * Extracts and normalizes the 4 options of a question.
 */
export const getNormalizedOptions = (q: Question): string[] => {
  return [
    normalizeText(q.option_a || ''),
    normalizeText(q.option_b || ''),
    normalizeText(q.option_c || ''),
    normalizeText(q.option_d || ''),
  ].filter(Boolean);
};

/**
 * Compares two sets of options:
 * Returns exact order match count, and total set overlap count.
 */
export const compareQuestionOptions = (
  qA: Question,
  qB: Question
): { exactOrderMatches: number; setOverlapCount: number; isIdenticalSet: boolean } => {
  const optsA = [
    normalizeText(qA.option_a || ''),
    normalizeText(qA.option_b || ''),
    normalizeText(qA.option_c || ''),
    normalizeText(qA.option_d || ''),
  ];

  const optsB = [
    normalizeText(qB.option_a || ''),
    normalizeText(qB.option_b || ''),
    normalizeText(qB.option_c || ''),
    normalizeText(qB.option_d || ''),
  ];

  let exactOrderMatches = 0;
  for (let i = 0; i < 4; i++) {
    if (optsA[i] && optsB[i] && optsA[i] === optsB[i]) {
      exactOrderMatches++;
    }
  }

  const validA = optsA.filter(Boolean);
  const validB = optsB.filter(Boolean);

  let setOverlapCount = 0;
  const usedB = new Set<number>();
  validA.forEach((optA) => {
    const matchedIdx = validB.findIndex((optB, idx) => !usedB.has(idx) && (optA === optB || calculateTextSimilarity(optA, optB) >= 0.9));
    if (matchedIdx !== -1) {
      usedB.add(matchedIdx);
      setOverlapCount++;
    }
  });

  const isIdenticalSet = validA.length >= 3 && validA.length === validB.length && setOverlapCount === validA.length;

  return { exactOrderMatches, setOverlapCount, isIdenticalSet };
};

/**
 * Determines if Question A and Question B are duplicates of each other.
 */
export const checkQuestionsDuplicatePair = (
  qA: Question,
  qB: Question
): { isDuplicate: boolean; matchType?: DuplicateMatchType; confidence?: number; reason?: string; similarity?: number; optionMatches?: number } => {
  if (qA.id === qB.id) return { isDuplicate: false };

  const normQA = normalizeText(qA.question_text || '');
  const normQB = normalizeText(qB.question_text || '');

  if (!normQA || !normQB) return { isDuplicate: false };

  const qSimilarity = calculateTextSimilarity(normQA, normQB);
  const isGeneric = isGenericStem(normQA) || isGenericStem(normQB);
  const { exactOrderMatches, setOverlapCount, isIdenticalSet } = compareQuestionOptions(qA, qB);

  // Case 1: Exact Question Text + 4/4 Options Match
  if (normQA === normQB && exactOrderMatches >= 3) {
    return {
      isDuplicate: true,
      matchType: 'exact_copy',
      confidence: 100,
      reason: `Exact Copy: Identical question text and ${exactOrderMatches}/4 options match in identical order.`,
      similarity: 1.0,
      optionMatches: exactOrderMatches,
    };
  }

  // Case 2: Exact Question Text + Shuffled Options (All options present but different positions)
  if (normQA === normQB && isIdenticalSet) {
    return {
      isDuplicate: true,
      matchType: 'shuffled_options',
      confidence: 98,
      reason: `Shuffled Options: Identical question text with the same 4 options in permuted positions.`,
      similarity: 1.0,
      optionMatches: setOverlapCount,
    };
  }

  // Case 3: Generic Question Stem (e.g. "Which of the following is correct?")
  // STRICT RULE: If question text is generic, options MUST match (at least 3 options overlap) to be considered duplicate!
  if (isGeneric) {
    if (isIdenticalSet || setOverlapCount >= 3) {
      return {
        isDuplicate: true,
        matchType: isIdenticalSet ? 'exact_copy' : 'near_identical',
        confidence: isIdenticalSet ? 98 : 90,
        reason: `Generic Question Stem: Matches ${setOverlapCount}/4 options with identical question prompt.`,
        similarity: qSimilarity,
        optionMatches: setOverlapCount,
      };
    }
    // If question is generic but options DO NOT match, it is NOT a duplicate!
    return { isDuplicate: false };
  }

  // Case 4: Non-Generic Question with High Question Similarity (>85%) AND at least 2-3 matching options
  if (qSimilarity >= 0.85 && setOverlapCount >= 3) {
    return {
      isDuplicate: true,
      matchType: isIdenticalSet ? 'shuffled_options' : 'near_identical',
      confidence: Math.round(qSimilarity * 50 + (setOverlapCount / 4) * 50),
      reason: `High Similarity: ${Math.round(qSimilarity * 100)}% question text match and ${setOverlapCount}/4 options match.`,
      similarity: qSimilarity,
      optionMatches: setOverlapCount,
    };
  }

  // Case 5: Very long distinct question text (> 60 chars) with 100% exact match even if options are partially missing
  if (normQA.length > 60 && normQA === normQB && setOverlapCount >= 2) {
    return {
      isDuplicate: true,
      matchType: 'near_identical',
      confidence: 92,
      reason: `Long Detailed Question Match: Exact ${normQA.length}-char question text match and ${setOverlapCount} options match.`,
      similarity: 1.0,
      optionMatches: setOverlapCount,
    };
  }

  return { isDuplicate: false };
};

/**
 * Evaluates quality score for a question to automatically pick the best version to keep.
 */
export const scoreQuestionQuality = (q: Question): number => {
  let score = q.quality_score || 50;
  if (q.explanation && q.explanation.trim().length > 20) score += 30;
  if (q.option_a && q.option_b && q.option_c && q.option_d) score += 15;
  if (q.subject && q.subject !== 'General Studies') score += 5;
  if (q.topic && q.topic !== 'General Topic') score += 5;
  if (q.inspection_status === 'verified') score += 20;
  return score;
};

/**
 * Runs deep duplicate analysis on an entire list of questions.
 * Groups questions into clusters of duplicates using Union-Find / Disjoint Sets.
 */
export const detectDuplicateQuestions = (questions: Question[]): DuplicateDetectionResult => {
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
    };
  }

  // Disjoint set for grouping
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (i: number): number => {
    if (parent[i] === i) return i;
    parent[i] = find(parent[i]);
    return parent[i];
  };
  const union = (i: number, j: number) => {
    const rootI = find(i);
    const rootJ = find(j);
    if (rootI !== rootJ) {
      parent[rootJ] = rootI;
    }
  };

  // Pair metadata map
  const pairInfo = new Map<string, { matchType: DuplicateMatchType; confidence: number; reason: string; similarity: number; optionMatches: number }>();

  // Compare all pairs
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const qA = questions[i];
      const qB = questions[j];

      const res = checkQuestionsDuplicatePair(qA, qB);
      if (res.isDuplicate) {
        union(i, j);
        const pairKey = `${i}-${j}`;
        pairInfo.set(pairKey, {
          matchType: res.matchType || 'exact_copy',
          confidence: res.confidence || 95,
          reason: res.reason || 'MCQ Match',
          similarity: res.similarity || 1,
          optionMatches: res.optionMatches || 4,
        });
      }
    }
  }

  // Group by disjoint set root
  const groupBuckets = new Map<number, Question[]>();
  for (let i = 0; i < n; i++) {
    const root = find(i);
    if (!groupBuckets.has(root)) {
      groupBuckets.set(root, []);
    }
    groupBuckets.get(root)!.push(questions[i]);
  }

  const groups: DuplicateGroup[] = [];
  const duplicateIdMap = new Map<string, { group: DuplicateGroup; partnerIds: string[] }>();
  const duplicateIdsSet = new Set<string>();

  let exactCount = 0;
  let shuffledCount = 0;
  let nearIdenticalCount = 0;

  groupBuckets.forEach((list, rootIdx) => {
    if (list.length > 1) {
      // Pick best question in group based on quality scoring
      let bestQ = list[0];
      let bestScore = scoreQuestionQuality(bestQ);

      for (let k = 1; k < list.length; k++) {
        const currentScore = scoreQuestionQuality(list[k]);
        if (currentScore > bestScore) {
          bestScore = currentScore;
          bestQ = list[k];
        }
      }

      // Determine group matchType from pairs
      let groupMatchType: DuplicateMatchType = 'exact_copy';
      let minConfidence = 100;
      let primaryReason = 'Exact duplicate MCQ';
      let avgSim = 1;
      let avgOpts = 4;

      // Scan pair relationships within group
      for (let a = 0; a < list.length; a++) {
        for (let b = a + 1; b < list.length; b++) {
          const idxA = questions.findIndex((q) => q.id === list[a].id);
          const idxB = questions.findIndex((q) => q.id === list[b].id);
          const key = idxA < idxB ? `${idxA}-${idxB}` : `${idxB}-${idxA}`;
          const p = pairInfo.get(key);
          if (p) {
            groupMatchType = p.matchType;
            minConfidence = Math.min(minConfidence, p.confidence);
            primaryReason = p.reason;
            avgSim = p.similarity;
            avgOpts = p.optionMatches;
          }
        }
      }

      if (groupMatchType === 'exact_copy') exactCount++;
      else if (groupMatchType === 'shuffled_options') shuffledCount++;
      else nearIdenticalCount++;

      const groupObj: DuplicateGroup = {
        groupId: `dup-group-${rootIdx}-${list[0].id}`,
        matchType: groupMatchType,
        confidence: minConfidence,
        reason: primaryReason,
        questions: list,
        bestQuestionId: bestQ.id,
        matchingOptionsCount: avgOpts,
        questionSimilarity: avgSim,
      };

      groups.push(groupObj);

      const allIdsInGroup = list.map((q) => q.id);
      list.forEach((q) => {
        duplicateIdsSet.add(q.id);
        duplicateIdMap.set(q.id, {
          group: groupObj,
          partnerIds: allIdsInGroup.filter((id) => id !== q.id),
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
  };
};
