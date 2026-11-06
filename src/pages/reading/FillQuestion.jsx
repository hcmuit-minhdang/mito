import React from 'react';
import Icon from '../../components/Icon';
import Ruby from '../../components/Ruby';
import { stripRuby } from '../../lib/ruby';

export default function FillQuestion({
  question,
  userAnswer = {},
  onChange,
  graded = false,
  showAnswers = false,
  results = [],
}) {
  return (
    <div className="question-body question-fill">
      <div className="question-prompt">
        <Ruby text={question.prompt} />
      </div>

      {/* Word Bank Reference */}
      {question.wordBank && question.wordBank.length > 0 && (
        <div className="word-bank-box">
          <span className="word-bank-title">Từ gợi ý (Word Bank):</span>
          <div className="word-bank-tags">
            {question.wordBank.map((word, wIdx) => (
              <span key={wIdx} className="word-bank-pill">
                <Ruby text={word} />
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Items with blanks */}
      <div className="fill-items-list">
        {question.items.map((item, itemIdx) => {
          const parts = item.text.split(/（\s*）/g);
          const blankCount = parts.length - 1;
          const result = results[itemIdx];

          const itemAnswers = userAnswer[itemIdx] || [];

          function handleBlankChange(blankIdx, val) {
            const next = [...itemAnswers];
            next[blankIdx] = val;
            onChange(itemIdx, next);
          }

          // Expected display for answer
          const expectedDisplay = Array.isArray(item.answer)
            ? item.answer.join(item.anyOrder ? ' / ' : ', ')
            : item.answer;

          return (
            <div
              key={itemIdx}
              className={`fill-item-row ${
                graded ? (result?.correct ? 'item-correct' : 'item-incorrect') : ''
              }`}
            >
              <div className="fill-item-content">
                <span className="item-index">({itemIdx + 1})</span>
                <span className="fill-text-wrapper">
                  {parts.map((part, pIdx) => (
                    <React.Fragment key={pIdx}>
                      <Ruby text={part} />
                      {pIdx < blankCount && (
                        <select
                          className="fill-select"
                          value={
                            showAnswers
                              ? Array.isArray(item.answer)
                                ? item.answer[pIdx] || ''
                                : item.answer
                              : itemAnswers[pIdx] || ''
                          }
                          onChange={(e) =>
                            !showAnswers && handleBlankChange(pIdx, e.target.value)
                          }
                          disabled={showAnswers}
                          aria-label={`Chỗ trống ${pIdx + 1} của câu ${itemIdx + 1}`}
                        >
                          <option value="">（ ... ）</option>
                          {question.wordBank.map((w, wIdx) => (
                            <option key={wIdx} value={w}>
                              {stripRuby(w)}
                            </option>
                          ))}
                        </select>
                      )}
                    </React.Fragment>
                  ))}
                </span>
              </div>

              {graded && result && (
                <div className={`grading-badge ${result.correct ? 'badge-correct' : 'badge-incorrect'}`}>
                  {result.correct ? (
                    <span><Icon name="check" size={14} strokeWidth={2.4} /> Đúng (+1đ)</span>
                  ) : (
                    <span>
                      <Icon name="cross" size={14} strokeWidth={2.4} /> Sai · Đáp án đúng: <strong>{expectedDisplay}</strong>
                      {item.anyOrder ? ' (thứ tự tự do)' : ''}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
