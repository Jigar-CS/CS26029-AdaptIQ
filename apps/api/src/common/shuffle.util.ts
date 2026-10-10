/**
 * Deterministic pseudo-random number generator (Mulberry32) and seeded Fisher-Yates shuffle.
 *
 * Guarantees:
 * 1. Shuffling is deterministic given the same seed (e.g., attemptId + questionId).
 * 2. Option order remains strictly stable across component re-renders and page refreshes for an existing attempt.
 * 3. Uniformly distributes option positions (A, B, C, D) across different attempts.
 * 4. Preserves all option properties (id, optionText, isCorrect, misconception, etc.).
 * 5. Works identically across all subjects and assessment types.
 */

export function hashString(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

export function createMulberry32Rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Deterministic Fisher-Yates shuffle using a string seed.
 */
export function seededShuffle<T>(items: T[], seedStr: string): T[] {
  if (!items || items.length <= 1) return items ? [...items] : [];
  const seedNum = hashString(seedStr);
  const rng = createMulberry32Rng(seedNum);

  const array = [...items];
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
  return array;
}

/**
 * Standard unbiased Fisher-Yates shuffle using crypto/Math.random for fresh question creation.
 */
export function randomShuffle<T>(items: T[]): T[] {
  if (!items || items.length <= 1) return items ? [...items] : [];
  const array = [...items];
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
  return array;
}

/**
 * Shuffles question options deterministically using context (attempt/session ID + question ID).
 * If no context ID is provided, performs a fresh random shuffle.
 */
export function shuffleQuestionOptions<T extends { id?: string }>(
  options: T[],
  contextId?: string,
  questionId?: string,
): T[] {
  if (!options || options.length <= 1) return options ? [...options] : [];
  if (contextId) {
    const seed = `${contextId}:${questionId || ''}`;
    return seededShuffle(options, seed);
  }
  return randomShuffle(options);
}
