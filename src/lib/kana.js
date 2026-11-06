// Kana utilities for text normalization and comparison

/**
 * Converts Katakana characters in a string to Hiragana.
 * Katakana range: \u30A1 - \u30F6
 * Corresponding Hiragana offset: -0x60
 * @param {string} str
 * @returns {string}
 */
export function katakanaToHiragana(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[\u30A1-\u30F6]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0x60)
  );
}

/**
 * Normalizes input for comparison:
 * 1. Converts katakana to hiragana
 * 2. Strips all half-width and full-width whitespace
 * 3. Trims and lowercases
 * 4. Normalizes unicode
 * @param {string} str
 * @returns {string}
 */
export function normalizeKana(str) {
  if (typeof str !== 'string') return '';
  const converted = katakanaToHiragana(str);
  // Remove whitespace (half and fullwidth \u3000)
  return converted
    .trim()
    .toLowerCase()
    .replace(/[\s\u3000\u00A0]+/g, '')
    .normalize('NFC');
}

/**
 * Checks if a character is kanji.
 * @param {string} char
 * @returns {boolean}
 */
export function isKanji(char) {
  return /^[一-鿿々〆ヵヶ]$/.test(char);
}
