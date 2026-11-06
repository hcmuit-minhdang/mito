// Utility functions for Furigana / Ruby markup
// Furigana format: 漢字{かんじ}

export const RUBY_REGEX = /([一-鿿々〆ヵヶ]+)\{([^}]+)\}/g;

/**
 * Strips ruby markup, returning base kanji string without braces.
 * @param {string} text
 * @returns {string}
 */
export function stripRuby(text) {
  if (typeof text !== 'string') return text == null ? '' : String(text);
  // Replace kanji{reading} with kanji
  const stripped = text.replace(RUBY_REGEX, '$1');
  // Fallback to strip any remaining stray {reading} if any
  return stripped.replace(/\{[^}]*\}/g, '');
}

/**
 * Checks if a string contains ruby markup.
 * @param {string} text
 * @returns {boolean}
 */
export function hasRuby(text) {
  if (typeof text !== 'string') return false;
  return /\{[^}]+\}/.test(text);
}

/**
 * Parses text into an array of tokens:
 * [{ type: 'text', value: '...' }, { type: 'ruby', base: '漢', ruby: 'かん' }]
 * @param {string} text
 * @returns {Array<{type: 'text', value: string} | {type: 'ruby', base: string, ruby: string}>}
 */
export function parseRuby(text) {
  if (typeof text !== 'string') {
    return [{ type: 'text', value: text == null ? '' : String(text) }];
  }

  const tokens = [];
  const regex = new RegExp(RUBY_REGEX.source, 'g');
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({
        type: 'text',
        value: text.slice(lastIndex, match.index),
      });
    }
    tokens.push({
      type: 'ruby',
      base: match[1],
      ruby: match[2],
    });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    tokens.push({
      type: 'text',
      value: text.slice(lastIndex),
    });
  }

  return tokens;
}
