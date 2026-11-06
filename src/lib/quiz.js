// Quiz and randomization utilities

/**
 * Returns a new shuffled copy of an array using Fisher-Yates algorithm.
 * @template T
 * @param {T[]} array
 * @returns {T[]}
 */
export function shuffle(array) {
  if (!array || array.length <= 1) return [...(array || [])];
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Picks `count` distractors from `pool` that are distinct from `correctItem`.
 * @template T
 * @param {T} correctItem
 * @param {T[]} pool
 * @param {number} count
 * @param {function(T): any} [keyFn]
 * @returns {T[]}
 */
export function pickDistractors(correctItem, pool, count, keyFn = (x) => x) {
  const correctKey = keyFn(correctItem);
  const candidates = pool.filter((item) => keyFn(item) !== correctKey);
  const shuffledCandidates = shuffle(candidates);

  const seenKeys = new Set();
  const distractors = [];

  for (const item of shuffledCandidates) {
    const key = keyFn(item);
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      distractors.push(item);
      if (distractors.length >= count) break;
    }
  }

  return distractors;
}

/**
 * Builds a 4-choice question object.
 * @param {object} params
 * @param {any} params.prompt
 * @param {any} params.correctOption
 * @param {any[]} params.distractorOptions
 * @returns {{ options: any[], answerIndex: number }}
 */
export function makeChoiceQuestion({ correctOption, distractorOptions }) {
  const allOptions = [correctOption, ...distractorOptions.slice(0, 3)];
  const shuffled = shuffle(allOptions);
  const answerIndex = shuffled.indexOf(correctOption);
  return {
    options: shuffled,
    answerIndex,
  };
}
