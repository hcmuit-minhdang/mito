import React, { useMemo } from 'react';
import Ruby from '../../components/Ruby';
import { parseRuby } from '../../lib/ruby';

/**
 * Builds segments from a Japanese string with ruby markup,
 * highlighting the first occurrence of `hl` (plain text).
 * If a ruby group overlaps the hl boundary, expands to cover the whole ruby group.
 *
 * @param {string} ja
 * @param {string} hl
 * @returns {Array<{text: string, hl: boolean}>}
 */
export function buildExampleSegments(ja, hl) {
  if (!ja) return [];
  if (!hl || typeof hl !== 'string' || !hl.trim()) {
    return [{ text: ja, hl: false }];
  }

  const tokens = parseRuby(ja);
  const plainText = tokens.map((t) => (t.type === 'ruby' ? t.base : t.value)).join('');
  const matchIndex = plainText.indexOf(hl);
  if (matchIndex === -1) {
    return [{ text: ja, hl: false }];
  }

  let matchStart = matchIndex;
  let matchEnd = matchIndex + hl.length;

  // Compute character ranges for each token in plainText
  let currentPos = 0;
  const tokenRanges = tokens.map((tok) => {
    const len = tok.type === 'ruby' ? tok.base.length : tok.value.length;
    const start = currentPos;
    const end = currentPos + len;
    currentPos = end;
    return { tok, start, end };
  });

  // Expand boundaries if they cut into any ruby token
  for (const tr of tokenRanges) {
    if (tr.tok.type === 'ruby') {
      if (tr.start < matchStart && matchStart < tr.end) {
        matchStart = tr.start;
      }
      if (tr.start < matchEnd && matchEnd < tr.end) {
        matchEnd = tr.end;
      }
    }
  }

  // Assign or split tokens into highlighted / non-highlighted
  const processed = [];
  for (const tr of tokenRanges) {
    const { tok, start, end } = tr;
    if (tok.type === 'ruby') {
      const isHl = !(end <= matchStart || start >= matchEnd);
      processed.push({ tok, hl: isHl });
    } else {
      const val = tok.value;
      if (end <= matchStart || start >= matchEnd) {
        processed.push({ tok, hl: false });
      } else if (start >= matchStart && end <= matchEnd) {
        processed.push({ tok, hl: true });
      } else {
        // Text token crosses matchStart or matchEnd; split into sub-tokens
        const splitPoints = [start];
        if (matchStart > start && matchStart < end) splitPoints.push(matchStart);
        if (matchEnd > start && matchEnd < end) splitPoints.push(matchEnd);
        splitPoints.push(end);

        for (let i = 0; i < splitPoints.length - 1; i++) {
          const p1 = splitPoints[i];
          const p2 = splitPoints[i + 1];
          const subText = val.slice(p1 - start, p2 - start);
          const isHl = p1 >= matchStart && p2 <= matchEnd;
          processed.push({
            tok: { type: 'text', value: subText },
            hl: isHl,
          });
        }
      }
    }
  }

  // Merge contiguous tokens with the same hl status
  const grouped = [];
  for (const item of processed) {
    if (grouped.length === 0 || grouped[grouped.length - 1].hl !== item.hl) {
      grouped.push({ tokens: [item.tok], hl: item.hl });
    } else {
      grouped[grouped.length - 1].tokens.push(item.tok);
    }
  }

  return grouped.map((group) => ({
    hl: group.hl,
    text: group.tokens
      .map((t) => (t.type === 'ruby' ? `${t.base}{${t.ruby}}` : t.value))
      .join(''),
  }));
}

/**
 * Helper to split an example sentence into segments for blank-fill practice.
 * Alias to buildExampleSegments.
 *
 * @param {string} ja
 * @param {string} hl
 * @returns {Array<{text: string, hl: boolean}>}
 */
export function buildBlankSegments(ja, hl) {
  return buildExampleSegments(ja, hl);
}

export default function ExampleLine({ ja, hl, show = true }) {
  const segments = useMemo(() => buildExampleSegments(ja, hl), [ja, hl]);

  if (!ja) return null;

  return (
    <span className="g-example-line">
      {segments.map((seg, idx) => {
        if (seg.hl) {
          return (
            <span key={idx} className="g-hl">
              <Ruby text={seg.text} show={show} />
            </span>
          );
        }
        return <Ruby key={idx} text={seg.text} show={show} />;
      })}
    </span>
  );
}
