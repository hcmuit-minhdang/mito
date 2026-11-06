import React, { useMemo } from 'react';
import Icon from '../../components/Icon';
import Ruby from '../../components/Ruby';

export default function OrderQuestion({
  question,
  userAnswer,
  onChange,
  graded = false,
  showAnswers = false,
  results = [],
}) {
  // Deterministic initial order that is NOT equal to answer
  const initialOrder = useMemo(() => {
    const defaultKeys = question.items.map((it) => it.key);
    // If default matches answer, reverse it
    const isExact = defaultKeys.every((k, idx) => k === question.answer[idx]);
    if (isExact) {
      return [...defaultKeys].reverse();
    }
    return defaultKeys;
  }, [question]);

  const currentKeys = showAnswers ? question.answer : userAnswer || initialOrder;

  // Map keys back to item objects
  const itemsMap = useMemo(() => {
    const map = {};
    for (const item of question.items) {
      map[item.key] = item;
    }
    return map;
  }, [question.items]);

  function moveItem(fromIndex, toIndex) {
    if (showAnswers) return;
    if (toIndex < 0 || toIndex >= currentKeys.length) return;
    const next = [...currentKeys];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    onChange(next);
  }

  return (
    <div className="question-body question-order">
      <div className="question-prompt">
        <Ruby text={question.prompt} />
      </div>

      <p className="order-instructions">
        Sử dụng các nút mũi tên <strong>↑</strong> và <strong>↓</strong> để di chuyển các bước theo đúng trình tự thời gian.
      </p>

      <div className="order-items-list">
        {currentKeys.map((key, idx) => {
          const item = itemsMap[key];
          const result = results[idx];
          const expectedKey = question.answer[idx];
          const expectedItem = itemsMap[expectedKey];

          return (
            <div
              key={key}
              className={`order-item-row ${
                graded ? (result?.correct ? 'item-correct' : 'item-incorrect') : ''
              }`}
            >
              <div className="order-position-badge">Bước {idx + 1}</div>

              <div className="order-item-text">
                <strong className="order-key">[{item?.key}]</strong>{' '}
                <Ruby text={item?.text} />
              </div>

              <div className="order-buttons-group">
                <button
                  type="button"
                  className="order-btn"
                  onClick={() => moveItem(idx, idx - 1)}
                  disabled={idx === 0 || showAnswers}
                  title="Di chuyển lên"
                  aria-label={`Di chuyển mục ${item?.key} lên`}
                >
                  <Icon name="arrowUp" size={16} />
                </button>
                <button
                  type="button"
                  className="order-btn"
                  onClick={() => moveItem(idx, idx + 1)}
                  disabled={idx === currentKeys.length - 1 || showAnswers}
                  title="Di chuyển xuống"
                  aria-label={`Di chuyển mục ${item?.key} xuống`}
                >
                  <Icon name="arrowDown" size={16} />
                </button>
              </div>

              {graded && result && (
                <div className={`grading-badge ${result.correct ? 'badge-correct' : 'badge-incorrect'}`}>
                  {result.correct ? (
                    <span><Icon name="check" size={14} strokeWidth={2.4} /> Đúng vị trí (+1đ)</span>
                  ) : (
                    <span>
                      <Icon name="cross" size={14} strokeWidth={2.4} /> Sai · Vị trí này phải là: <strong>[{expectedKey}] {expectedItem?.text}</strong>
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showAnswers && (
        <div className="order-summary-answer">
          Trình tự đúng:{' '}
          <strong>
            {question.answer.map((k) => `[${k}] ${itemsMap[k]?.text}`).join(' → ')}
          </strong>
        </div>
      )}
    </div>
  );
}
