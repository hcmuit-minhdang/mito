import React from 'react';
import Icon from '../../components/Icon';
import Ruby from '../../components/Ruby';
import { stripRuby } from '../../lib/ruby';

export default function MatchQuestion({
  question,
  userAnswer = {},
  onChange,
  graded = false,
  showAnswers = false,
  results = [],
}) {
  return (
    <div className="question-body question-match">
      <div className="question-prompt">
        <Ruby text={question.prompt} />
      </div>

      {/* Right reference bank */}
      <div className="match-reference-box">
        <span className="reference-title">Danh sách lựa chọn (Cột phải):</span>
        <div className="reference-grid">
          {question.right.map((r) => (
            <div key={r.key} className="reference-item">
              <strong className="reference-key">{r.key}.</strong>
              <span className="reference-text">
                <Ruby text={r.text} />
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Left items matching */}
      <div className="match-rows-list">
        {question.left.map((leftItem, idx) => {
          const expectedKey = question.answers[idx];
          const val = showAnswers ? expectedKey : userAnswer[idx] || '';
          const result = results[idx];
          const matchedRightItem = question.right.find((r) => r.key === expectedKey);

          return (
            <div
              key={idx}
              className={`match-row-item ${
                graded ? (result?.correct ? 'item-correct' : 'item-incorrect') : ''
              }`}
            >
              <div className="match-left-col">
                <span className="item-index">({idx + 1})</span>
                <Ruby text={leftItem} />
              </div>

              <div className="match-arrow"><Icon name="arrowRight" size={16} /></div>

              <div className="match-right-col">
                <select
                  className="match-select"
                  value={val}
                  onChange={(e) => !showAnswers && onChange(idx, e.target.value)}
                  disabled={showAnswers}
                  aria-label={`Chọn đáp án cho ${stripRuby(leftItem)}`}
                >
                  <option value="">-- Chọn đáp án --</option>
                  {question.right.map((r) => (
                    <option key={r.key} value={r.key}>
                      {r.key}. {stripRuby(r.text)}
                    </option>
                  ))}
                </select>

                {graded && result && (
                  <div className={`grading-badge ${result.correct ? 'badge-correct' : 'badge-incorrect'}`}>
                    {result.correct ? (
                      <span><Icon name="check" size={14} strokeWidth={2.4} /> Đúng (+1đ)</span>
                    ) : (
                      <span>
                        <Icon name="cross" size={14} strokeWidth={2.4} /> Sai · Đáp án đúng: <strong>{expectedKey}. {matchedRightItem ? <Ruby text={matchedRightItem.text} /> : ''}</strong>
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
