import React from 'react';
import Icon from '../../components/Icon';
import Ruby from '../../components/Ruby';

export default function ChoiceQuestion({
  question,
  userAnswer = null,
  onChange,
  graded = false,
  showAnswers = false,
  results = [],
}) {
  const currentAnswer = showAnswers ? question.answer : userAnswer;
  const result = results[0];

  return (
    <div className="question-body question-choice">
      <div className="question-prompt">
        <Ruby text={question.prompt} />
      </div>

      <div className="choice-options-list" role="radiogroup">
        {question.options.map((opt, idx) => {
          const isSelected = currentAnswer === idx;
          const isCorrectAnswer = question.answer === idx;

          let optionStatusClass = '';
          if (graded) {
            if (isCorrectAnswer) {
              optionStatusClass = 'option-should-be';
            } else if (isSelected && !isCorrectAnswer) {
              optionStatusClass = 'option-wrong-picked';
            }
          }

          return (
            <label
              key={idx}
              className={`choice-option-row ${isSelected ? 'selected' : ''} ${optionStatusClass}`}
            >
              <input
                type="radio"
                name={`choice-${question.prompt}`}
                checked={isSelected}
                onChange={() => !showAnswers && onChange(idx)}
                disabled={showAnswers}
              />
              <span className="choice-index">{idx + 1}.</span>
              <span className="choice-text">
                <Ruby text={opt} />
              </span>
            </label>
          );
        })}
      </div>

      {graded && result && (
        <div className={`grading-badge ${result.correct ? 'badge-correct' : 'badge-incorrect'}`}>
          {result.correct ? (
            <span><Icon name="check" size={14} strokeWidth={2.4} /> Đúng (+1đ)</span>
          ) : (
            <span>
              <Icon name="cross" size={14} strokeWidth={2.4} /> Sai · Đáp án đúng: <strong>({question.answer + 1}) <Ruby text={question.options[question.answer]} /></strong>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
