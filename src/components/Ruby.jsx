import React, { useState } from 'react';
import { parseRuby, hasRuby } from '../lib/ruby';

/**
 * Ruby Furigana Component
 * Renders Japanese text with <ruby><rb>base</rb><rt>furigana</rt></ruby>.
 * When show=false, renders base text, but optionally allows clicking to peek.
 */
export default function Ruby({ text, show = true, allowPeek = true, className = '' }) {
  const [revealed, setRevealed] = useState({});

  if (text == null) return null;
  const str = String(text);

  // Fast path for text with no ruby markup
  if (!hasRuby(str)) {
    return <span className={className}>{str}</span>;
  }

  const tokens = parseRuby(str);

  function toggleReveal(index, e) {
    if (!allowPeek || show) return;
    e.stopPropagation();
    setRevealed((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  }

  return (
    <span className={`ruby-container ${className}`.trim()}>
      {tokens.map((tok, idx) => {
        if (tok.type === 'text') {
          return <React.Fragment key={idx}>{tok.value}</React.Fragment>;
        }

        const isVisible = show || Boolean(revealed[idx]);

        if (isVisible) {
          return (
            <ruby
              key={idx}
              className={!show ? 'ruby-peeked' : ''}
              onClick={(e) => toggleReveal(idx, e)}
              title={!show ? 'Bấm để ẩn cách đọc' : undefined}
            >
              <rb>{tok.base}</rb>
              <rt>{tok.ruby}</rt>
            </ruby>
          );
        }

        return (
          <span
            key={idx}
            className="ruby-hidden-peek"
            onClick={(e) => toggleReveal(idx, e)}
            title="Bấm để xem cách đọc"
          >
            {tok.base}
          </span>
        );
      })}
    </span>
  );
}
