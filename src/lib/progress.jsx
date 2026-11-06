// Progress management and React Context
import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { allVocab, allKanji, getVocabByLesson, getKanjiByLesson, getLessonTotalQuestions } from './data';

const STORAGE_KEY = 'tn:v1';

const DEFAULT_SETTINGS = {
  theme: 'system', // 'light' | 'dark' | 'system'
  furigana: true,
  fontSize: 'md',  // 'sm' | 'md' | 'lg'
  showTranslation: true,
};

const DEFAULT_PROGRESS = {
  vocabKnown: {},    // { "1:0": true }
  kanjiKnown: {},    // { "音": true }
  readingScore: {},  // { "1": { score: 10, total: 12 } }
  settings: DEFAULT_SETTINGS,
  recent: null,      // { type: 'reading' | 'vocab' | 'kanji', lessonId: 1, title: string, timestamp: number }
};

function loadStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PROGRESS;
    const parsed = JSON.parse(raw);
    return {
      vocabKnown: parsed.vocabKnown && typeof parsed.vocabKnown === 'object' ? parsed.vocabKnown : {},
      kanjiKnown: parsed.kanjiKnown && typeof parsed.kanjiKnown === 'object' ? parsed.kanjiKnown : {},
      readingScore: parsed.readingScore && typeof parsed.readingScore === 'object' ? parsed.readingScore : {},
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
      recent: parsed.recent || null,
    };
  } catch (err) {
    console.warn('Storage blocked or corrupt, using defaults:', err);
    return DEFAULT_PROGRESS;
  }
}

function saveStorage(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn('Could not save to localStorage:', err);
  }
}

const ProgressContext = createContext(null);

export function ProgressProvider({ children }) {
  const [data, setData] = useState(loadStorage);

  // Sync state to localStorage on every change
  useEffect(() => {
    saveStorage(data);
  }, [data]);

  // Sync theme to document element
  useEffect(() => {
    const theme = data.settings.theme;
    const root = document.documentElement;

    function applySystemTheme(e) {
      if (theme === 'system') {
        const isDark = e ? e.matches : window.matchMedia('(prefers-color-scheme: dark)').matches;
        root.setAttribute('data-theme', isDark ? 'dark' : 'light');
      }
    }

    if (theme === 'system') {
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      applySystemTheme(media);
      if (media.addEventListener) {
        media.addEventListener('change', applySystemTheme);
        return () => media.removeEventListener('change', applySystemTheme);
      }
    } else {
      root.setAttribute('data-theme', theme);
    }
  }, [data.settings.theme]);

  // Vocab helpers
  const isVocabKnown = useCallback((id) => Boolean(data.vocabKnown[id]), [data.vocabKnown]);

  const toggleVocabKnown = useCallback((id) => {
    setData((prev) => {
      const nextKnown = { ...prev.vocabKnown };
      if (nextKnown[id]) {
        delete nextKnown[id];
      } else {
        nextKnown[id] = true;
      }
      return { ...prev, vocabKnown: nextKnown };
    });
  }, []);

  const setVocabKnown = useCallback((id, known) => {
    setData((prev) => {
      const nextKnown = { ...prev.vocabKnown };
      if (known) {
        nextKnown[id] = true;
      } else {
        delete nextKnown[id];
      }
      return { ...prev, vocabKnown: nextKnown };
    });
  }, []);

  // Kanji helpers
  const isKanjiKnown = useCallback((k) => Boolean(data.kanjiKnown[k]), [data.kanjiKnown]);

  const toggleKanjiKnown = useCallback((k) => {
    setData((prev) => {
      const nextKnown = { ...prev.kanjiKnown };
      if (nextKnown[k]) {
        delete nextKnown[k];
      } else {
        nextKnown[k] = true;
      }
      return { ...prev, kanjiKnown: nextKnown };
    });
  }, []);

  const setKanjiKnown = useCallback((k, known) => {
    setData((prev) => {
      const nextKnown = { ...prev.kanjiKnown };
      if (known) {
        nextKnown[k] = true;
      } else {
        delete nextKnown[k];
      }
      return { ...prev, kanjiKnown: nextKnown };
    });
  }, []);

  // Reading score helpers
  const getReadingScore = useCallback((lessonId) => {
    return data.readingScore[String(lessonId)] || null;
  }, [data.readingScore]);

  const saveReadingScore = useCallback((lessonId, score, total) => {
    const key = String(lessonId);
    setData((prev) => {
      const current = prev.readingScore[key];
      // Only keep the highest score achieved
      if (!current || score > current.score) {
        return {
          ...prev,
          readingScore: {
            ...prev.readingScore,
            [key]: { score, total, updatedAt: Date.now() },
          },
        };
      }
      return prev;
    });
  }, []);

  // Settings helpers
  const updateSettings = useCallback((partial) => {
    setData((prev) => ({
      ...prev,
      settings: { ...prev.settings, ...partial },
    }));
  }, []);

  const toggleTheme = useCallback(() => {
    setData((prev) => {
      const current = prev.settings.theme;
      let next = 'dark';
      if (current === 'dark') next = 'light';
      else if (current === 'light') next = 'system';
      else {
        // if system, pick opposite of current actual display
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        next = isDark ? 'light' : 'dark';
      }
      return {
        ...prev,
        settings: { ...prev.settings, theme: next },
      };
    });
  }, []);

  // Recent activity helper
  const setRecent = useCallback((recentObj) => {
    setData((prev) => ({
      ...prev,
      recent: { ...recentObj, timestamp: Date.now() },
    }));
  }, []);

  // Reset all progress
  const resetAllProgress = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.warn(err);
    }
    setData(DEFAULT_PROGRESS);
  }, []);

  // Statistics calculation
  const stats = useMemo(() => {
    const totalVocabCount = allVocab.length;
    const knownVocabCount = Object.keys(data.vocabKnown).filter((id) => data.vocabKnown[id]).length;

    const totalKanjiCount = allKanji.length;
    const knownKanjiCount = Object.keys(data.kanjiKnown).filter((k) => data.kanjiKnown[k]).length;

    function getLessonStats(lessonId) {
      const lVocab = getVocabByLesson(lessonId);
      const lKanji = getKanjiByLesson(lessonId);
      const lVocabKnown = lVocab.filter((v) => data.vocabKnown[v.id]).length;
      const lKanjiKnown = lKanji.filter((k) => data.kanjiKnown[k.k]).length;
      const reading = data.readingScore[String(lessonId)] || null;
      const totalQuestions = getLessonTotalQuestions(lessonId);

      return {
        vocabKnown: lVocabKnown,
        vocabTotal: lVocab.length,
        vocabPercent: lVocab.length ? Math.round((lVocabKnown / lVocab.length) * 100) : 0,
        kanjiKnown: lKanjiKnown,
        kanjiTotal: lKanji.length,
        kanjiPercent: lKanji.length ? Math.round((lKanjiKnown / lKanji.length) * 100) : 0,
        readingScore: reading ? reading.score : null,
        readingTotal: totalQuestions,
        readingPercent: reading && totalQuestions ? Math.round((reading.score / totalQuestions) * 100) : 0,
      };
    }

    return {
      totalVocabCount,
      knownVocabCount,
      vocabPercent: totalVocabCount ? Math.round((knownVocabCount / totalVocabCount) * 100) : 0,
      totalKanjiCount,
      knownKanjiCount,
      kanjiPercent: totalKanjiCount ? Math.round((knownKanjiCount / totalKanjiCount) * 100) : 0,
      getLessonStats,
    };
  }, [data.vocabKnown, data.kanjiKnown, data.readingScore]);

  const value = useMemo(
    () => ({
      progress: data,
      settings: data.settings,
      recent: data.recent,
      isVocabKnown,
      toggleVocabKnown,
      setVocabKnown,
      isKanjiKnown,
      toggleKanjiKnown,
      setKanjiKnown,
      getReadingScore,
      saveReadingScore,
      updateSettings,
      toggleTheme,
      setRecent,
      resetAllProgress,
      stats,
    }),
    [
      data,
      isVocabKnown,
      toggleVocabKnown,
      setVocabKnown,
      isKanjiKnown,
      toggleKanjiKnown,
      setKanjiKnown,
      getReadingScore,
      saveReadingScore,
      updateSettings,
      toggleTheme,
      setRecent,
      resetAllProgress,
      stats,
    ]
  );

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress() {
  const context = useContext(ProgressContext);
  if (!context) {
    throw new Error('useProgress must be used within a ProgressProvider');
  }
  return context;
}
