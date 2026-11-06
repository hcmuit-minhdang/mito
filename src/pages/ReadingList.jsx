import React from 'react';
import Icon from '../components/Icon';
import { Link } from 'react-router-dom';
import { lessons, getLessonTotalQuestions } from '../lib/data';
import { useProgress } from '../lib/progress';
import Ruby from '../components/Ruby';
import ProgressBar from '../components/ProgressBar';

export default function ReadingList() {
  const { getReadingScore } = useProgress();

  return (
    <div className="reading-list-page container page-content">
      <div className="page-header">
        <h1 className="page-title">
          Luyện đọc hiểu trung cấp
        </h1>
        <p className="page-subtitle">
          8 bài đọc từ giáo trình 『中級を学ぼう 中級前期 第2版』 kèm furigana, bản dịch tiếng Việt, phát âm và câu hỏi đọc hiểu.
        </p>
      </div>

      <div className="reading-grid">
        {lessons.map((lesson) => {
          const totalQ = getLessonTotalQuestions(lesson.id);
          const savedScore = getReadingScore(lesson.id);
          const paragraphsCount = lesson.reading?.paragraphs?.length || 0;
          const vocabCount = lesson.vocab?.length || 0;

          return (
            <div key={lesson.id} className="reading-card">
              <div className="reading-card-header">
                <span className="lesson-badge">Bài {lesson.id}</span>
                <span className="pages-tag">Trang {lesson.bookPages}</span>
              </div>

              <div className="reading-card-titles">
                <h2 className="lesson-title-ja">
                  <Ruby text={lesson.title} show={true} />
                </h2>
                <p className="lesson-title-vi">{lesson.titleVi}</p>
              </div>

              <div className="reading-card-meta">
                <span className="meta-pill"><Icon name="note" size={14} /> {paragraphsCount} đoạn văn</span>
                <span className="meta-pill"><Icon name="vocab" size={14} /> {vocabCount} từ vựng</span>
                <span className="meta-pill"><Icon name="help" size={14} /> {lesson.questions?.length || 0} bài tập</span>
              </div>

              <div className="reading-card-score-box">
                {savedScore ? (
                  <ProgressBar
                    value={savedScore.score}
                    max={savedScore.total || totalQ}
                    label="Điểm cao nhất:"
                    color={
                      savedScore.score === (savedScore.total || totalQ)
                        ? 'success'
                        : 'primary'
                    }
                  />
                ) : (
                  <div className="score-unattempted">
                    <span>Điểm đọc hiểu:</span>
                    <span className="unattempted-badge">Chưa làm</span>
                  </div>
                )}
              </div>

              <div className="reading-card-footer">
                <Link
                  to={`/reading/${lesson.id}`}
                  className="btn btn-primary btn-block"
                >
                  Vào bài đọc & làm bài tập <Icon name="arrowRight" size={16} />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
