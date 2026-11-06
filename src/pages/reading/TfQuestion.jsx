import React from 'react';
import Icon from '../../components/Icon';
import Ruby from '../../components/Ruby';

export default function TfQuestion({
  question,
  userAnswer = {},
  onChange,
  graded = false,
  showAnswers = false,
  results = [],
}) {
  return (
    <div className="question-body question-tf">
      <div className="question-prompt">
        <Ruby text={question.prompt} />
      </div>

      <div className="tf-items-list">
        {question.items.map((item, idx) => {
          const val = showAnswers ? item.answer : userAnswer[idx];
          const result = results[idx];

          return (
            <div
              key={idx}
              className={`tf-item-row ${
                graded
                  ? result?.correct
                    ? 'item-correct'
                    : 'item-incorrect'
                  : ''
              }`}
            >
              <div className="tf-item-text">
                <span className="item-index">({idx + 1})</span>
                <Ruby text={item.text} />
              </div>

              <div className="tf-item-controls">
                <div className="tf-buttons-group">
                  <button
                    type="button"
                    className={`tf-btn tf-btn-true ${val === true ? 'selected' : ''}`}
                    onClick={() => !showAnswers && onChange(idx, true)}
                    disabled={showAnswers}
                    aria-label={`Câu ${idx + 1}: Chọn Đúng`}
                  >
                    <span className="tf-symbol">○</span>
                    <span className="tf-text">Đúng</span>
                  </button>
                  <button
                    type="button"
                    className={`tf-btn tf-btn-false ${val === false ? 'selected' : ''}`}
                    onClick={() => !showAnswers && onChange(idx, false)}
                    disabled={showAnswers}
                    aria-label={`Câu ${idx + 1}: Chọn Sai`}
                  >
                    <span className="tf-symbol">×</span>
                    <span className="tf-text">Sai</span>
                  </button>
                </div>

                {graded && result && (
                  <div className={`grading-badge ${result.correct ? 'badge-correct' : 'badge-incorrect'}`}>
                    {result.correct ? (
                      <span><Icon name="check" size={14} strokeWidth={2.4} /> Đúng (+1đ)</span>
                    ) : (
                      <span>
                        <Icon name="cross" size={14} strokeWidth={2.4} /> Sai · Đáp án: <strong>{item.answer ? '○ (Đúng)' : '× (Sai)'}</strong>
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
