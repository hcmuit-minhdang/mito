import React from 'react';
import Icon from '../../components/Icon';
import Ruby from '../../components/Ruby';

export default function ClassifyQuestion({
  question,
  userAnswer = {},
  onChange,
  graded = false,
  showAnswers = false,
  results = [],
}) {
  return (
    <div className="question-body question-classify">
      <div className="question-prompt">
        <Ruby text={question.prompt} />
      </div>

      {/* Categories header summary */}
      <div className="classify-categories-box">
        <span className="categories-title">Các nhóm phân loại:</span>
        <div className="categories-list">
          {question.categories.map((cat, cIdx) => (
            <span key={cIdx} className="category-tag">
              <span className="category-num">{cIdx + 1}</span>
              <Ruby text={cat} />
            </span>
          ))}
        </div>
      </div>

      {/* Items to classify */}
      <div className="classify-items-list">
        {question.items.map((item, idx) => {
          const val = showAnswers ? item.answer : userAnswer[idx];
          const result = results[idx];

          return (
            <div
              key={idx}
              className={`classify-item-row ${
                graded ? (result?.correct ? 'item-correct' : 'item-incorrect') : ''
              }`}
            >
              <div className="classify-item-text">
                <span className="item-index">({idx + 1})</span>
                <Ruby text={item.text} />
              </div>

              <div className="classify-controls">
                <div className="category-buttons-group">
                  {question.categories.map((cat, cIdx) => {
                    const isSelected = val === cIdx;
                    return (
                      <button
                        key={cIdx}
                        type="button"
                        className={`category-pill-btn ${isSelected ? 'selected' : ''}`}
                        onClick={() => !showAnswers && onChange(idx, cIdx)}
                        disabled={showAnswers}
                      >
                        <span className="pill-num">{cIdx + 1}.</span>
                        <Ruby text={cat} />
                      </button>
                    );
                  })}
                </div>

                {graded && result && (
                  <div className={`grading-badge ${result.correct ? 'badge-correct' : 'badge-incorrect'}`}>
                    {result.correct ? (
                      <span><Icon name="check" size={14} strokeWidth={2.4} /> Đúng (+1đ)</span>
                    ) : (
                      <span>
                        <Icon name="cross" size={14} strokeWidth={2.4} /> Sai · Nhóm đúng: <strong>{question.categories[item.answer]}</strong>
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
