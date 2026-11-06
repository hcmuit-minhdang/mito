import React, { useState } from 'react';
import Icon from '../../components/Icon';
import TfQuestion from './TfQuestion';
import ChoiceQuestion from './ChoiceQuestion';
import MatchQuestion from './MatchQuestion';
import FillQuestion from './FillQuestion';
import OrderQuestion from './OrderQuestion';
import ClassifyQuestion from './ClassifyQuestion';

export default function Questions({
  questions = [],
  lessonId,
  savedScore = null,
  onSaveScore,
}) {
  const [userAnswers, setUserAnswers] = useState({});
  const [status, setStatus] = useState('in-progress'); // 'in-progress' | 'graded' | 'review'

  function handleAnswerChange(qIdx, answer) {
    setUserAnswers((prev) => ({
      ...prev,
      [qIdx]: answer,
    }));
  }

  // Calculate results for all questions
  const evaluation = questions.map((q, qIdx) => {
    const ans = userAnswers[qIdx];
    let itemResults = [];

    if (q.type === 'tf') {
      itemResults = q.items.map((it, idx) => ({
        correct: ans && ans[idx] === it.answer,
        expected: it.answer,
      }));
    } else if (q.type === 'choice') {
      itemResults = [
        {
          correct: ans === q.answer,
          expected: q.answer,
        },
      ];
    } else if (q.type === 'match') {
      itemResults = q.answers.map((expectedKey, idx) => ({
        correct: ans && ans[idx] === expectedKey,
        expected: expectedKey,
      }));
    } else if (q.type === 'fill') {
      itemResults = q.items.map((it, idx) => {
        const userBlanks = ans && ans[idx] ? ans[idx] : [];
        if (Array.isArray(it.answer)) {
          if (it.anyOrder) {
            const expSorted = [...it.answer].sort();
            const uSorted = [...userBlanks].sort();
            const correct =
              expSorted.length === uSorted.length &&
              expSorted.every((v, i) => v === uSorted[i]);
            return { correct, expected: it.answer };
          }
          const correct =
            it.answer.length === userBlanks.length &&
            it.answer.every((v, i) => v === userBlanks[i]);
          return { correct, expected: it.answer };
        }
        const correct = userBlanks[0] === it.answer;
        return { correct, expected: it.answer };
      });
    } else if (q.type === 'order') {
      const defaultKeys = q.items.map((it) => it.key);
      const isExact = defaultKeys.every((k, idx) => k === q.answer[idx]);
      const initialOrder = isExact ? [...defaultKeys].reverse() : defaultKeys;
      const currentOrder = ans || initialOrder;

      itemResults = q.items.map((_, idx) => ({
        correct: currentOrder[idx] === q.answer[idx],
        expected: q.answer[idx],
      }));
    } else if (q.type === 'classify') {
      itemResults = q.items.map((it, idx) => ({
        correct: ans && ans[idx] === it.answer,
        expected: it.answer,
      }));
    }

    const correctCount = itemResults.filter((r) => r.correct).length;
    const totalCount = itemResults.length;
    return { itemResults, correctCount, totalCount };
  });

  const totalPoints = evaluation.reduce((acc, curr) => acc + curr.totalCount, 0);
  const earnedPoints = evaluation.reduce((acc, curr) => acc + curr.correctCount, 0);
  const scorePercent = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;

  function handleGrade() {
    setStatus('graded');
    if (onSaveScore) {
      onSaveScore(earnedPoints, totalPoints);
    }
  }

  function handleShowAnswers() {
    setStatus('review');
  }

  function handleReset() {
    setUserAnswers({});
    setStatus('in-progress');
  }

  const isGraded = status === 'graded';
  const isReview = status === 'review';

  return (
    <section className="reading-questions-section" aria-label="Câu hỏi đọc hiểu">
      <div className="questions-section-header">
        <div className="section-title-wrap">
          <h2 className="section-title">
            Câu hỏi kiểm tra hiểu bài
          </h2>
          <span className="total-questions-tag">
            {questions.length} phần · Tổng {totalPoints} điểm
          </span>
        </div>

        {savedScore && (
          <div className="highest-score-pill">
            <Icon name="trophy" size={16} /> Điểm cao nhất: <strong>{savedScore.score}/{savedScore.total}</strong> (
            {Math.round((savedScore.score / savedScore.total) * 100)}%)
          </div>
        )}
      </div>

      {/* Result announcement banner */}
      {(isGraded || isReview) && (
        <div
          className={`score-result-banner ${
            isReview
              ? 'banner-review'
              : earnedPoints === totalPoints
              ? 'banner-perfect'
              : earnedPoints >= totalPoints * 0.7
              ? 'banner-pass'
              : 'banner-try'
          }`}
          role="status"
        >
          {isReview ? (
            <div className="banner-content">
              <strong>Đang hiển thị đáp án mẫu</strong>
              <p>Bạn có thể bấm "Làm lại" để tự kiểm tra lại bài học.</p>
            </div>
          ) : (
            <div className="banner-content">
              <div className="score-main">
                Kết quả bài làm:{' '}
                <span className="score-numbers">
                  {earnedPoints} / {totalPoints} điểm ({scorePercent}%)
                </span>
              </div>
              <p className="score-feedback">
                {earnedPoints === totalPoints
                  ? 'Xuất sắc! Bạn đã trả lời đúng tất cả các câu!'
                  : earnedPoints >= totalPoints * 0.7
                  ? 'Làm tốt lắm! Xem các câu sai bên dưới để ôn kỹ hơn nhé.'
                  : 'Hãy ôn lại bài đọc và thử sức lần nữa nhé!'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* List of questions */}
      <div className="questions-card-list">
        {questions.map((q, qIdx) => {
          const evalItem = evaluation[qIdx];

          return (
            <div key={qIdx} className="question-card">
              <div className="question-card-header">
                <span className="q-number">Câu {qIdx + 1}</span>
                <span className="q-type-label">
                  {q.type === 'tf' && 'Đúng / Sai (○ ×)'}
                  {q.type === 'choice' && 'Trắc nghiệm chọn 1'}
                  {q.type === 'match' && 'Nối ý tương ứng'}
                  {q.type === 'fill' && 'Điền từ vào chỗ trống'}
                  {q.type === 'order' && 'Sắp xếp theo thứ tự'}
                  {q.type === 'classify' && 'Phân nhóm nội dung'}
                </span>
                {isGraded && (
                  <span className="q-score-badge">
                    {evalItem.correctCount}/{evalItem.totalCount} điểm
                  </span>
                )}
              </div>

              {q.type === 'tf' && (
                <TfQuestion
                  question={q}
                  userAnswer={userAnswers[qIdx]}
                  onChange={(itemIdx, val) => {
                    const current = userAnswers[qIdx] || {};
                    handleAnswerChange(qIdx, { ...current, [itemIdx]: val });
                  }}
                  graded={isGraded || isReview}
                  showAnswers={isReview}
                  results={evalItem.itemResults}
                />
              )}

              {q.type === 'choice' && (
                <ChoiceQuestion
                  question={q}
                  userAnswer={userAnswers[qIdx]}
                  onChange={(val) => handleAnswerChange(qIdx, val)}
                  graded={isGraded || isReview}
                  showAnswers={isReview}
                  results={evalItem.itemResults}
                />
              )}

              {q.type === 'match' && (
                <MatchQuestion
                  question={q}
                  userAnswer={userAnswers[qIdx]}
                  onChange={(itemIdx, val) => {
                    const current = userAnswers[qIdx] || {};
                    handleAnswerChange(qIdx, { ...current, [itemIdx]: val });
                  }}
                  graded={isGraded || isReview}
                  showAnswers={isReview}
                  results={evalItem.itemResults}
                />
              )}

              {q.type === 'fill' && (
                <FillQuestion
                  question={q}
                  userAnswer={userAnswers[qIdx]}
                  onChange={(itemIdx, val) => {
                    const current = userAnswers[qIdx] || {};
                    handleAnswerChange(qIdx, { ...current, [itemIdx]: val });
                  }}
                  graded={isGraded || isReview}
                  showAnswers={isReview}
                  results={evalItem.itemResults}
                />
              )}

              {q.type === 'order' && (
                <OrderQuestion
                  question={q}
                  userAnswer={userAnswers[qIdx]}
                  onChange={(val) => handleAnswerChange(qIdx, val)}
                  graded={isGraded || isReview}
                  showAnswers={isReview}
                  results={evalItem.itemResults}
                />
              )}

              {q.type === 'classify' && (
                <ClassifyQuestion
                  question={q}
                  userAnswer={userAnswers[qIdx]}
                  onChange={(itemIdx, val) => {
                    const current = userAnswers[qIdx] || {};
                    handleAnswerChange(qIdx, { ...current, [itemIdx]: val });
                  }}
                  graded={isGraded || isReview}
                  showAnswers={isReview}
                  results={evalItem.itemResults}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Action Buttons bar */}
      <div className="questions-actions-bar">
        {!isReview && (
          <button
            type="button"
            className="btn btn-primary btn-large"
            onClick={handleGrade}
          >
            <Icon name="check" size={18} /> Chấm điểm
          </button>
        )}

        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleShowAnswers}
        >
          <Icon name="eye" size={18} /> Xem đáp án
        </button>

        <button
          type="button"
          className="btn btn-outline"
          onClick={handleReset}
        >
          ↺ Làm lại
        </button>
      </div>
    </section>
  );
}
