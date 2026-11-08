// Data loader and indexer for lessons and kanji

import l1 from '../data/lesson1.json';
import l2 from '../data/lesson2.json';
import l3 from '../data/lesson3.json';
import l4 from '../data/lesson4.json';
import l5 from '../data/lesson5.json';
import l6 from '../data/lesson6.json';
import l7 from '../data/lesson7.json';
import l8 from '../data/lesson8.json';

import k1 from '../data/kanji1.json';
import k2 from '../data/kanji2.json';
import k3 from '../data/kanji3.json';
import k4 from '../data/kanji4.json';
import k5 from '../data/kanji5.json';
import k6 from '../data/kanji6.json';
import k7 from '../data/kanji7.json';
import k8 from '../data/kanji8.json';

import grammarData from '../data/grammar.json';

export const lessons = [l1, l2, l3, l4, l5, l6, l7, l8].sort((a, b) => a.id - b.id);
export const kanjiLessons = [k1, k2, k3, k4, k5, k6, k7, k8].sort((a, b) => a.lesson - b.lesson);

/**
 * Returns a lesson by ID (1..8).
 * @param {number|string} id
 */
export function getLesson(id) {
  const num = parseInt(id, 10);
  return lessons.find((l) => l.id === num) || null;
}

/**
 * Flattened array of all vocab across all lessons (từ trong bài + từ mở rộng từ 索引 của sách).
 * ID format per spec: `${lesson.id}:${index}`
 */
export const allVocab = lessons.flatMap((l) =>
  l.vocab.map((v, idx) => ({
    id: `${l.id}:${idx}`,
    lessonId: l.id,
    vocabIndex: idx,
    w: v.w,
    r: v.r,
    note: v.note || '',
    vi: v.vi,
    src: v.src || 'list',
    tip: v.tip || '',
  }))
);

/**
 * Get vocab items for one or more lessons.
 * @param {number|number[]} lessonIds - single lesson ID or array of lesson IDs
 */
export function getVocabByLesson(lessonIds) {
  if (lessonIds == null) return allVocab;
  const ids = Array.isArray(lessonIds) ? lessonIds.map(Number) : [Number(lessonIds)];
  return allVocab.filter((v) => ids.includes(v.lessonId));
}

/**
 * Flattened array of all kanji across all lessons (193 items).
 */
export const allKanji = kanjiLessons.flatMap((kl) =>
  kl.kanji.map((k) => ({
    id: `${kl.lesson}:${k.k}`,
    lesson: kl.lesson,
    k: k.k,
    on: k.on || [],
    kun: k.kun || [],
    words: k.words || [],
    hv: k.hv || '',
    mean: k.mean || '',
    tip: k.tip || '',
  }))
);

/**
 * Get kanji items for one or more lessons.
 * @param {number|number[]} lessonIds
 */
export function getKanjiByLesson(lessonIds) {
  if (lessonIds == null) return allKanji;
  const ids = Array.isArray(lessonIds) ? lessonIds.map(Number) : [Number(lessonIds)];
  return allKanji.filter((k) => ids.includes(k.lesson));
}

/**
 * All example words from kanji data.
 * Array of { word, reading, kanji, lesson }
 */
export const allKanjiWords = allKanji.flatMap((k) =>
  k.words.map(([word, reading]) => ({
    word,
    reading,
    kanji: k.k,
    lesson: k.lesson,
  }))
);

/**
 * Calculates total possible points for comprehension questions of a lesson.
 * @param {number|string} lessonId
 * @returns {number}
 */
export function getLessonTotalQuestions(lessonId) {
  const lesson = getLesson(lessonId);
  if (!lesson || !lesson.questions) return 0;
  let total = 0;
  for (const q of lesson.questions) {
    if (q.type === 'tf') {
      total += (q.items || []).length;
    } else if (q.type === 'choice') {
      total += 1;
    } else if (q.type === 'match') {
      total += (q.left || []).length;
    } else if (q.type === 'fill') {
      total += (q.items || []).length;
    } else if (q.type === 'order') {
      total += (q.items || []).length;
    } else if (q.type === 'classify') {
      total += (q.items || []).length;
    }
  }
  return total;
}

/**
 * Flattened array of all grammar items (69 items: 56 main + 13 extra).
 * Preserves all fields, adds lessonId = lesson.
 * Sorted by lesson, then no, then main item before extra.
 */
export const allGrammar = [...grammarData]
  .map((g) => ({
    ...g,
    lessonId: g.lesson,
  }))
  .sort((a, b) => {
    if (a.lesson !== b.lesson) return a.lesson - b.lesson;
    if (a.no !== b.no) return a.no - b.no;
    if (a.extra !== b.extra) return a.extra ? 1 : -1;
    return a.id.localeCompare(b.id);
  });

/**
 * Get grammar items for one or more lessons.
 * @param {number|number[]} lessonIds
 */
export function getGrammarByLesson(lessonIds) {
  if (lessonIds == null) return allGrammar;
  const ids = Array.isArray(lessonIds) ? lessonIds.map(Number) : [Number(lessonIds)];
  return allGrammar.filter((g) => ids.includes(g.lessonId));
}

