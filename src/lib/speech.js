// Web Speech API wrapper for ja-JP
import { stripRuby } from './ruby';

let activeUtterance = null;
let paragraphQueue = [];
let currentParagraphIndex = -1;
let isPlayingParagraphs = false;

/**
 * Checks if SpeechSynthesis is supported by the current browser.
 * @returns {boolean}
 */
export function isSpeechSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
}

/**
 * Finds a suitable ja-JP voice if available.
 * @returns {SpeechSynthesisVoice | null}
 */
function getJapaneseVoice() {
  if (!isSpeechSupported()) return null;
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang === 'ja-JP' || v.lang === 'ja_JP') ||
    voices.find((v) => v.lang.startsWith('ja')) ||
    null
  );
}

/**
 * Speaks a single Japanese text string.
 * @param {string} text - text to speak (can contain ruby markup, will be stripped)
 * @param {object} [options]
 * @param {function} [options.onStart]
 * @param {function} [options.onEnd]
 * @param {function} [options.onError]
 * @param {number} [options.rate=0.9]
 * @returns {SpeechSynthesisUtterance | null}
 */
export function speak(text, options = {}) {
  if (!isSpeechSupported()) return null;

  stopSpeaking();

  const cleanText = stripRuby(text).trim();
  if (!cleanText) return null;

  const utter = new SpeechSynthesisUtterance(cleanText);
  utter.lang = 'ja-JP';
  utter.rate = options.rate || 0.9;

  const jaVoice = getJapaneseVoice();
  if (jaVoice) {
    utter.voice = jaVoice;
  }

  utter.onstart = () => {
    if (options.onStart) options.onStart();
  };

  utter.onend = () => {
    activeUtterance = null;
    if (options.onEnd) options.onEnd();
  };

  utter.onerror = (e) => {
    activeUtterance = null;
    if (options.onError) options.onError(e);
  };

  activeUtterance = utter;
  window.speechSynthesis.speak(utter);
  return utter;
}

/**
 * Stops any ongoing speech.
 */
export function stopSpeaking() {
  if (!isSpeechSupported()) return;
  isPlayingParagraphs = false;
  paragraphQueue = [];
  currentParagraphIndex = -1;
  activeUtterance = null;
  window.speechSynthesis.cancel();
}

/**
 * Sequentially speaks a list of paragraphs.
 * @param {string[]} paragraphs
 * @param {object} [options]
 * @param {function(number): void} [options.onParagraphChange] - called with index of current paragraph
 * @param {function} [options.onEnd] - called when all paragraphs finished
 * @param {function} [options.onError]
 */
export function speakParagraphs(paragraphs, options = {}) {
  if (!isSpeechSupported() || !paragraphs || paragraphs.length === 0) return;

  stopSpeaking();
  isPlayingParagraphs = true;
  paragraphQueue = [...paragraphs];
  currentParagraphIndex = 0;

  function speakNext() {
    if (!isPlayingParagraphs || currentParagraphIndex >= paragraphQueue.length) {
      isPlayingParagraphs = false;
      currentParagraphIndex = -1;
      if (options.onEnd) options.onEnd();
      return;
    }

    const idx = currentParagraphIndex;
    if (options.onParagraphChange) {
      options.onParagraphChange(idx);
    }

    const text = paragraphQueue[idx];
    speak(text, {
      rate: 0.92,
      onEnd: () => {
        if (!isPlayingParagraphs) return;
        currentParagraphIndex++;
        // Short pause between paragraphs
        setTimeout(() => {
          if (isPlayingParagraphs) speakNext();
        }, 300);
      },
      onError: (e) => {
        if (!isPlayingParagraphs) return;
        currentParagraphIndex++;
        if (options.onError) options.onError(e);
        speakNext();
      },
    });
  }

  speakNext();
}
