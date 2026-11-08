import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { allGrammar } from '../../lib/data';
import { useProgress } from '../../lib/progress';
import { stripRuby } from '../../lib/ruby';
import { shuffle, pickDistractors, makeChoiceQuestion } from '../../lib/quiz';
import Icon from '../../components/Icon';
import Ruby from '../../components/Ruby';
import ProgressBar from '../../components/ProgressBar';
import ExampleLine, { buildExampleSegments } from './ExampleLine';

// Các cách nói cùng nghĩa/cùng chức năng (dạng nói - dạng viết, lịch sự - thông thường): không dùng làm phương án nhiễu cho nhau.
const EQUIVALENT_GROUPS = [
  ['という', 'っていう'],
  ['ということだ', 'ということです', 'っていうことです'],
  ['ぐらい', 'ほど'],
  ['ともに', 'とともに'],
  ['であろうと', 'でも'],
  ['ずにはいられない', 'ずにはいられなかった', 'ずにいられない'],
  ['までもない', 'までもなく'],
  ['らしい', 'らしさ', 'らしく'],
  ['ものの', 'けれども'],
  ['ことになる', 'ということになる'],
  ['わけがない', 'はずがない'],
];
function isEquivalentChoice(a, b) {
  return EQUIVALENT_GROUPS.some((g) => g.includes(a) && g.includes(b));
}

/**
 * Tab Luyện tập Ngữ pháp:
 * 1. "Điền chỗ trống": Chọn phần ngữ pháp hl còn thiếu trong câu ví dụ.
 * 2. "Nghĩa → Mẫu câu": Chọn mẫu câu tiếng Nhật đúng với ý nghĩa tiếng Việt đã cho.
 */
export default function Practice({ items = [] }) {
  const { settings, setGrammarKnown } = useProgress();
  const furigana = settings.furigana !== false;

  // Mode: 'blank' ("Điền chỗ trống") | 'pattern' ("Nghĩa → Mẫu câu")
  const [mode, setMode] = useState('blank');

  // Question count configuration: 10 | 20 | 'all'
  const [questionCountSetting, setQuestionCountSetting] = useState(10);

  // Active quiz session state
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizSelectedOption, setQuizSelectedOption] = useState(null);
  const [quizIsAnswered, setQuizIsAnswered] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [quizWrongItems, setQuizWrongItems] = useState([]);
  const [quizCompleted, setQuizCompleted] = useState(false);

  // Consecutive correct answers per item in this session: { [itemId]: count }
  const [streakMap, setStreakMap] = useState({});

  // Stale quiz detection & preventing reset when quiz itself marks an item known
  const selfUpdatedKnownRef = useRef(false);
  const containerRef = useRef(null);
  const itemsKey = useMemo(() => items.map((it) => it.id).sort().join(','), [items]);
  const prevItemsKeyRef = useRef(itemsKey);

  useEffect(() => {
    if (prevItemsKeyRef.current !== itemsKey) {
      prevItemsKeyRef.current = itemsKey;
      if (selfUpdatedKnownRef.current) {
        // Change triggered by our own setGrammarKnown call; do not reset quiz
        selfUpdatedKnownRef.current = false;
        return;
      }
      // Filter changed outside; reset quiz to prevent stale data
      setQuizQuestions([]);
      setQuizIndex(0);
      setQuizSelectedOption(null);
      setQuizIsAnswered(false);
      setQuizScore(0);
      setQuizWrongItems([]);
      setQuizCompleted(false);
    }
  }, [itemsKey]);

  // Cờ trên chỉ có hiệu lực cho đúng lần render ngay sau khi bài luyện tự đánh dấu "đã thuộc".
  // Nếu không xóa, khi bộ lọc không đổi theo (items giữ nguyên) cờ sẽ kẹt ở true và lần đổi bộ lọc
  // sau đó bị bỏ qua, khiến bài đang làm bị cũ. Effect này khai báo SAU effect trên nên chạy sau nó.
  useEffect(() => {
    selfUpdatedKnownRef.current = false;
  });

  // Pool of valid examples for mode 'blank' from the filtered items:
  // ex.hl must appear EXACTLY once in stripRuby(ex.ja) and ex.hl.length >= 2
  const blankPool = useMemo(() => {
    const pool = [];
    for (const item of items) {
      for (const ex of item.examples || []) {
        const hl = ex.hl ? ex.hl.trim() : '';
        if (hl.length >= 2) {
          const plain = stripRuby(ex.ja);
          if (plain.split(hl).length === 2) {
            pool.push({ item, example: ex });
          }
        }
      }
    }
    return pool;
  }, [items]);

  // Pool for mode 'pattern' from the filtered items
  const patternPool = useMemo(() => {
    return items.filter((item) => Boolean(item.pattern && item.meaningVi));
  }, [items]);

  // Global pool of hl distractors from ENTIRE allGrammar (to guarantee 4 choices)
  const allBlankDistractorPool = useMemo(() => {
    const pool = [];
    for (const item of allGrammar) {
      for (const ex of item.examples || []) {
        const hl = ex.hl ? ex.hl.trim() : '';
        if (hl.length >= 2) {
          pool.push({ itemId: item.id, hl });
        }
      }
    }
    return pool;
  }, []);

  // Available question count for the current mode
  const availableCount = mode === 'blank' ? blankPool.length : patternPool.length;

  // Handle switching quiz mode
  function handleModeChange(newMode) {
    if (newMode === mode) return;
    setMode(newMode);
    setQuizQuestions([]);
    setQuizIndex(0);
    setQuizSelectedOption(null);
    setQuizIsAnswered(false);
    setQuizScore(0);
    setQuizWrongItems([]);
    setQuizCompleted(false);
  }

  // Builder for questions
  const startQuiz = useCallback(
    (customItems = null) => {
      let rawPool;
      if (customItems) {
        rawPool = customItems;
      } else {
        const base = mode === 'blank' ? blankPool : patternPool;
        if (base.length === 0) return;
        let shuffled = shuffle(base);
        if (questionCountSetting !== 'all' && typeof questionCountSetting === 'number') {
          shuffled = shuffled.slice(0, questionCountSetting);
        }
        rawPool = shuffled;
      }

      if (!rawPool || rawPool.length === 0) return;

      const generated = rawPool.map((cand) => {
        // If cand has example, it is a blank question
        if (cand.example || mode === 'blank') {
          const item = cand.item;
          const example = cand.example;
          const hl = example.hl.trim();

          // Pick 3 distractors from OTHER grammar items with different hl string
          // Loại phương án có thể cũng đúng: trùng chuỗi, chứa nhau (だろう / のだろうか), hoặc cùng nhóm tương đương.
          const poolCandidates = allBlankDistractorPool.filter(
            (c) =>
              c.itemId !== item.id &&
              c.hl !== hl &&
              !c.hl.includes(hl) &&
              !hl.includes(c.hl) &&
              !isEquivalentChoice(c.hl, hl)
          );
          const distractorObjs = pickDistractors(
            { itemId: item.id, hl },
            poolCandidates,
            3,
            (c) => c.hl
          );
          const distractorOptions = distractorObjs.map((c) => c.hl);

          const choiceData = makeChoiceQuestion({
            correctOption: hl,
            distractorOptions,
          });

          const segments = buildExampleSegments(example.ja, hl);

          return {
            mode: 'blank',
            item,
            example,
            segments,
            options: choiceData.options,
            answerIndex: choiceData.answerIndex,
          };
        } else {
          // Pattern question
          const item = cand.item || cand;
          const correctOption = item.pattern;

          // Pick 3 distractors from allGrammar with different pattern strings
          const poolCandidates = allGrammar.filter(
            (g) => g.id !== item.id && g.pattern !== correctOption
          );
          const distractorObjs = pickDistractors(
            item,
            poolCandidates,
            3,
            (g) => g.pattern
          );
          const distractorOptions = distractorObjs.map((g) => g.pattern);

          const choiceData = makeChoiceQuestion({
            correctOption,
            distractorOptions,
          });

          return {
            mode: 'pattern',
            item,
            options: choiceData.options,
            answerIndex: choiceData.answerIndex,
          };
        }
      });

      setQuizQuestions(generated);
      setQuizIndex(0);
      setQuizSelectedOption(null);
      setQuizIsAnswered(false);
      setQuizScore(0);
      setQuizWrongItems([]);
      setQuizCompleted(false);
    },
    [mode, blankPool, patternPool, questionCountSetting, allBlankDistractorPool]
  );

  // Handle answering an option
  const handleAnswer = useCallback(
    (optionIdx) => {
      if (quizIsAnswered || !quizQuestions[quizIndex]) return;

      setQuizSelectedOption(optionIdx);
      setQuizIsAnswered(true);

      const currentQ = quizQuestions[quizIndex];
      const isCorrect = optionIdx === currentQ.answerIndex;
      const itemId = currentQ.item.id;

      if (isCorrect) {
        setQuizScore((prev) => prev + 1);
        const currentStreak = (streakMap[itemId] || 0) + 1;
        setStreakMap((prev) => ({ ...prev, [itemId]: currentStreak }));
        // Quy tắc: Đúng 2 lần liên tiếp cùng một mục trong phiên -> setGrammarKnown(id, true)
        if (currentStreak >= 2) {
          selfUpdatedKnownRef.current = true;
          setGrammarKnown(itemId, true);
        }
      } else {
        // Quy tắc: Đáp án sai -> setGrammarKnown(id, false), streak reset về 0
        selfUpdatedKnownRef.current = true;
        setGrammarKnown(itemId, false);
        setStreakMap((prev) => ({ ...prev, [itemId]: 0 }));
        setQuizWrongItems((prev) => [...prev, { ...currentQ, selectedOption: optionIdx }]);
      }
    },
    [quizIsAnswered, quizQuestions, quizIndex, streakMap, setGrammarKnown]
  );

  // Advance to next question or complete
  const handleNext = useCallback(() => {
    if (quizIndex < quizQuestions.length - 1) {
      setQuizIndex((prev) => prev + 1);
      setQuizSelectedOption(null);
      setQuizIsAnswered(false);
    } else {
      setQuizCompleted(true);
    }
  }, [quizIndex, quizQuestions.length]);

  // Restart current quiz with same questions
  function handleRestartCurrent() {
    if (quizQuestions.length === 0) return;
    const rawItems = quizQuestions.map((q) =>
      q.mode === 'blank' ? { item: q.item, example: q.example } : q.item
    );
    startQuiz(rawItems);
  }

  // Retry only wrong items
  function handleRetryWrong() {
    if (quizWrongItems.length === 0) return;
    const rawItems = quizWrongItems.map((q) =>
      q.mode === 'blank' ? { item: q.item, example: q.example } : q.item
    );
    startQuiz(rawItems);
  }

  // Keyboard shortcut listener: keys 1-4 for options, Enter for next
  useEffect(() => {
    function handleKeyDown(e) {
      if (quizQuestions.length === 0 || quizCompleted) return;
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      const tag = e.target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      // Enter chỉ xử lý khi tiêu điểm đang ở trong khung luyện tập (hoặc không ở đâu cả).
      // Nếu không, Enter trên link/nút ở header, footer, tab "Tra cứu"... bị chặn và bài nhảy sang câu sau.
      const inPractice = containerRef.current && containerRef.current.contains(e.target);
      const onNothing = e.target === document.body;

      if (!quizIsAnswered) {
        if (['1', '2', '3', '4'].includes(e.key) && (inPractice || onNothing)) {
          const idx = parseInt(e.key, 10) - 1;
          const currentQ = quizQuestions[quizIndex];
          if (currentQ && currentQ.options[idx] !== undefined) {
            e.preventDefault();
            handleAnswer(idx);
          }
        }
      } else {
        if (e.key === 'Enter' && (inPractice || onNothing)) {
          // Nút "Câu tiếp theo" có autoFocus; nếu tiêu điểm đang ở một nút khác trong khung, để nút đó tự xử lý Enter.
          if (inPractice && tag === 'button' && !e.target.classList.contains('g-btn-next')) return;
          e.preventDefault();
          handleNext();
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [quizQuestions, quizCompleted, quizIsAnswered, quizIndex, handleAnswer, handleNext]);

  // Current active question
  const currentQ = quizQuestions[quizIndex];

  // Helper for first example in pattern mode explanation
  const firstExample = useMemo(() => {
    if (!currentQ || currentQ.mode !== 'pattern') return null;
    const exs = currentQ.item.examples;
    return exs && exs.length > 0 ? exs[0] : null;
  }, [currentQ]);

  return (
    <div className="g-practice-container" ref={containerRef}>
      {/* 1. Mode Switcher (Segmented Control) */}
      <div className="g-practice-mode-wrap">
        <div className="g-practice-mode-nav" role="tablist" aria-label="Chế độ luyện tập">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'blank'}
            className={`g-mode-btn ${mode === 'blank' ? 'active' : ''}`}
            onClick={() => handleModeChange('blank')}
          >
            <Icon name="text" size={18} />
            <span>Điền chỗ trống</span>
            <span className="g-mode-count-badge">({blankPool.length})</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'pattern'}
            className={`g-mode-btn ${mode === 'pattern' ? 'active' : ''}`}
            onClick={() => handleModeChange('pattern')}
          >
            <Icon name="translate" size={18} />
            <span>Nghĩa → Mẫu câu</span>
            <span className="g-mode-count-badge">({patternPool.length})</span>
          </button>
        </div>
      </div>

      {/* 2. Setup Screen (when no active quiz or completed) */}
      {quizQuestions.length === 0 || quizCompleted ? (
        quizCompleted ? (
          /* RESULT SCREEN */
          <div className="g-practice-result-card card">
            <div className="g-result-header">
              <div className="g-result-trophy-wrap">
                <Icon name="trophy" size={44} className="g-result-trophy" />
              </div>
              <h2 className="g-result-title">Kết quả luyện tập</h2>
              <div className="g-result-score-line">
                <span className="g-score-number">{quizScore}</span>
                <span className="g-score-sep">/</span>
                <span className="g-score-total">{quizQuestions.length} câu đúng</span>
                <span className="g-score-percent">
                  ({quizQuestions.length ? Math.round((quizScore / quizQuestions.length) * 100) : 0}%)
                </span>
              </div>
              <p className="g-result-message">
                {quizScore === quizQuestions.length
                  ? 'Xuất sắc! Bạn đã trả lời chính xác tất cả các câu hỏi!'
                  : quizScore >= Math.ceil(quizQuestions.length * 0.8)
                  ? 'Rất tốt! Bạn đã nắm vững hầu hết các mẫu câu trong bài.'
                  : quizScore >= Math.ceil(quizQuestions.length * 0.5)
                  ? 'Khá tốt! Hãy ôn lại các câu chưa đúng để ghi nhớ chắc hơn.'
                  : 'Cần cố gắng thêm! Hãy xem lại lưu ý và luyện tập thêm nhé.'}
              </p>
              <div className="g-result-sync-note">
                <Icon name="sparkle" size={15} />
                <span>
                  Quy tắc ghi nhớ: Đúng 2 lần liên tiếp được đánh dấu &ldquo;Đã thuộc&rdquo;; trả lời sai tự động chuyển thành &ldquo;Chưa thuộc&rdquo;.
                </span>
              </div>
            </div>

            {/* List of wrong questions */}
            {quizWrongItems.length > 0 && (
              <div className="g-result-wrong-section">
                <h3 className="g-wrong-title">
                  <Icon name="cross" size={18} />
                  <span>Danh sách câu làm sai ({quizWrongItems.length} câu):</span>
                </h3>
                <div className="g-wrong-items-list">
                  {quizWrongItems.map((q, idx) => (
                    <div key={idx} className="g-wrong-card">
                      <div className="g-wrong-card-meta">
                        <span className="g-badge-no">Bài {q.item.lessonId} · Mục {q.item.no}</span>
                        {q.item.extra && <span className="g-badge-extra">Mở rộng</span>}
                      </div>

                      {q.mode === 'blank' ? (
                        <div className="g-wrong-prompt-block">
                          <div className="g-wrong-sentence" lang="ja">
                            <ExampleLine ja={q.example.ja} hl={q.example.hl} show={furigana} />
                          </div>
                          {q.example.vi && (
                            <div className="g-wrong-sentence-vi">{q.example.vi}</div>
                          )}
                        </div>
                      ) : (
                        <div className="g-wrong-prompt-block">
                          <div className="g-wrong-meaning-vi">
                            <Ruby text={q.item.meaningVi} show={furigana} />
                          </div>
                        </div>
                      )}

                      <div className="g-wrong-answers-comparison">
                        <div className="g-user-answer is-wrong">
                          <span className="g-ans-label">Bạn đã chọn:</span>
                          <span className="g-ans-val">
                            <Icon name="cross" size={14} /> {q.options[q.selectedOption]}
                          </span>
                        </div>
                        <div className="g-correct-answer is-correct">
                          <span className="g-ans-label">Đáp án đúng:</span>
                          <span className="g-ans-val">
                            <Icon name="check" size={14} /> {q.options[q.answerIndex]}
                          </span>
                        </div>
                      </div>

                      <div className="g-wrong-item-info">
                        <div className="g-wrong-info-row">
                          <strong>Mẫu câu:</strong>
                          <Ruby text={q.item.pattern} show={furigana} />
                        </div>
                        <div className="g-wrong-info-row">
                          <strong>Ý nghĩa:</strong>
                          <span><Ruby text={q.item.meaningVi} show={furigana} /></span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="g-result-actions">
              {quizWrongItems.length > 0 && (
                <button
                  type="button"
                  className="btn btn-primary btn-large"
                  onClick={handleRetryWrong}
                >
                  <Icon name="refresh" size={18} />
                  <span>Ôn lại các câu sai ({quizWrongItems.length} câu)</span>
                </button>
              )}
              <button
                type="button"
                className="btn btn-secondary btn-large"
                onClick={handleRestartCurrent}
              >
                <Icon name="refresh" size={18} />
                <span>Làm lại bài này</span>
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setQuizQuestions([]);
                  setQuizIndex(0);
                  setQuizSelectedOption(null);
                  setQuizIsAnswered(false);
                  setQuizScore(0);
                  setQuizWrongItems([]);
                  setQuizCompleted(false);
                }}
              >
                Cài đặt bài mới
              </button>
            </div>
          </div>
        ) : (
          /* CONFIGURATION SCREEN */
          <div className="g-practice-config-card card">
            <div className="g-config-header">
              <div className="g-config-icon-wrap">
                <Icon name={mode === 'blank' ? 'text' : 'translate'} size={36} />
              </div>
              <h2 className="g-config-title">
                {mode === 'blank' ? 'Luyện tập Điền chỗ trống' : 'Luyện tập Nghĩa → Mẫu câu'}
              </h2>
              <p className="g-config-desc">
                {mode === 'blank'
                  ? 'Hệ thống trích xuất câu ví dụ thực tế và che phần mẫu ngữ pháp. Nhiệm vụ của bạn là chọn đúng mẫu câu cần điền vào chỗ trống.'
                  : 'Hệ thống hiển thị ý nghĩa tiếng Việt của mẫu ngữ pháp. Nhiệm vụ của bạn là chọn đúng công thức / mẫu câu tiếng Nhật tương ứng.'}
              </p>
            </div>

            {availableCount < 1 ? (
              <div className="g-config-empty-alert">
                <Icon name="warning" size={24} className="g-alert-icon" />
                <div className="g-alert-content">
                  <h4>Không có câu hỏi khả dụng</h4>
                  <p>
                    Bộ lọc hiện tại không tìm thấy câu ví dụ hoặc mẫu câu phù hợp. Vui lòng chọn thêm bài học hoặc tắt bớt điều kiện lọc ở trên để bắt đầu luyện tập.
                  </p>
                </div>
              </div>
            ) : (
              <div className="g-config-form">
                <div className="g-config-group">
                  <span className="g-config-label">Số lượng câu hỏi:</span>
                  <div className="g-count-pills" role="group" aria-label="Số câu hỏi">
                    {[10, 20, 'all'].map((cnt) => {
                      const label = cnt === 'all' ? `Tất cả (${availableCount})` : `${cnt} câu`;
                      const isSelected = questionCountSetting === cnt;
                      return (
                        <button
                          key={cnt}
                          type="button"
                          className={`g-count-pill ${isSelected ? 'active' : ''}`}
                          aria-pressed={isSelected}
                          onClick={() => setQuestionCountSetting(cnt)}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="g-config-summary">
                  <span>
                    Nguồn dữ liệu:{' '}
                    <strong>{availableCount}</strong>{' '}
                    {mode === 'blank' ? 'câu ví dụ khả dụng' : 'mẫu ngữ pháp khả dụng'} theo bộ lọc.
                  </span>
                </div>

                <button
                  type="button"
                  className="btn btn-primary btn-large g-start-btn"
                  onClick={() => startQuiz()}
                >
                  <Icon name="target" size={20} />
                  <span>
                    Bắt đầu luyện tập (
                    {questionCountSetting === 'all'
                      ? availableCount
                      : Math.min(questionCountSetting, availableCount)}{' '}
                    câu)
                  </span>
                </button>
              </div>
            )}
          </div>
        )
      ) : (
        /* 3. Active Quiz Screen */
        <div className="g-practice-quiz-card card" aria-live="polite">
          {/* Header with progress and current score */}
          <div className="g-quiz-header">
            <div className="g-quiz-progress-wrap">
              <ProgressBar
                value={quizIndex + 1}
                max={quizQuestions.length}
                label={`Câu ${quizIndex + 1} / ${quizQuestions.length}`}
                showPercent={false}
              />
            </div>
            <div className="g-quiz-score-indicator" aria-label={`Điểm hiện tại: ${quizScore}`}>
              <Icon name="trophy" size={16} />
              <span>
                Điểm: <strong>{quizScore}</strong> / {quizIndex + (quizIsAnswered ? 1 : 0)}
              </span>
            </div>
          </div>

          {/* Question Prompt Area */}
          <div className="g-quiz-prompt-area">
            <div className="g-quiz-prompt-meta">
              <span className="g-badge-no">
                Bài {currentQ.item.lessonId} · Mục {currentQ.item.no}
              </span>
              {currentQ.item.extra && <span className="g-badge-extra">Mở rộng</span>}
              <span className="g-quiz-prompt-kind">
                {currentQ.mode === 'blank' ? 'Điền vào chỗ trống:' : 'Chọn mẫu câu đúng:'}
              </span>
            </div>

            {currentQ.mode === 'blank' ? (
              <div className="g-quiz-blank-box">
                <div className="g-quiz-sentence" lang="ja">
                  {currentQ.segments.map((seg, idx) =>
                    seg.hl ? (
                      <span key={idx} className="g-quiz-blank" aria-label="Chỗ trống cần điền">
                        （　　　）
                      </span>
                    ) : (
                      <Ruby key={idx} text={seg.text} show={furigana} />
                    )
                  )}
                </div>
                {currentQ.example.vi && (
                  <div className="g-quiz-hint">
                    <span className="g-hint-label">Gợi ý nghĩa:</span>
                    <span className="g-hint-text">{currentQ.example.vi}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="g-quiz-pattern-box">
                <div className="g-quiz-pattern-question-title">
                  Mẫu câu tiếng Nhật nào thể hiện ý nghĩa sau đây?
                </div>
                <div className="g-quiz-meaning-text">
                  <Ruby text={currentQ.item.meaningVi} show={furigana} />
                </div>
              </div>
            )}
          </div>

          {/* 4 Choices Grid */}
          <div
            className="g-quiz-choices-grid"
            role="radiogroup"
            aria-label="Các lựa chọn đáp án"
          >
            {currentQ.options.map((opt, oIdx) => {
              const isSelected = quizSelectedOption === oIdx;
              const isCorrectAnswer = oIdx === currentQ.answerIndex;

              let btnClass = '';
              let badge = null;

              if (quizIsAnswered) {
                if (isCorrectAnswer) {
                  btnClass = 'choice-correct';
                  badge = (
                    <span className="g-choice-status status-correct">
                      <Icon name="check" size={16} /> Đúng
                    </span>
                  );
                } else if (isSelected && !isCorrectAnswer) {
                  btnClass = 'choice-wrong';
                  badge = (
                    <span className="g-choice-status status-wrong">
                      <Icon name="cross" size={16} /> Sai
                    </span>
                  );
                } else {
                  btnClass = 'choice-dimmed';
                }
              }

              return (
                <button
                  key={oIdx}
                  type="button"
                  className={`g-quiz-choice-btn ${btnClass}`}
                  onClick={() => handleAnswer(oIdx)}
                  disabled={quizIsAnswered}
                  aria-pressed={isSelected}
                >
                  <span className="g-choice-num-key" aria-hidden="true">
                    {oIdx + 1}
                  </span>
                  <span className="g-choice-text" lang="ja">
                    {currentQ.mode === 'pattern' ? (
                      <Ruby text={opt} show={furigana} />
                    ) : (
                      opt
                    )}
                  </span>
                  {badge}
                </button>
              );
            })}
          </div>

          {/* Feedback & Detailed Explanation after answering */}
          {quizIsAnswered && (
            <div className="g-quiz-feedback-box">
              <div
                className={`g-feedback-banner ${
                  quizSelectedOption === currentQ.answerIndex ? 'is-correct' : 'is-wrong'
                }`}
              >
                {quizSelectedOption === currentQ.answerIndex ? (
                  <div className="g-feedback-text">
                    <Icon name="check" size={20} />
                    <span>
                      <strong>Chính xác!</strong> Bạn được +1 điểm.
                    </span>
                  </div>
                ) : (
                  <div className="g-feedback-text">
                    <Icon name="cross" size={20} />
                    <span>
                      <strong>Chưa đúng!</strong> Đáp án đúng là:{' '}
                      <strong className="g-highlight-answer">
                        {currentQ.options[currentQ.answerIndex]}
                      </strong>
                    </span>
                  </div>
                )}
              </div>

              {/* Detailed Item Breakdown */}
              <div className="g-quiz-explanation card">
                <h4 className="g-explain-heading">
                  <Icon name="note" size={16} />
                  <span>Giải thích chi tiết</span>
                </h4>

                {currentQ.mode === 'blank' ? (
                  <div className="g-explain-content">
                    <div className="g-explain-row">
                      <span className="g-explain-label">Câu đầy đủ:</span>
                      <div className="g-explain-val" lang="ja">
                        <ExampleLine
                          ja={currentQ.example.ja}
                          hl={currentQ.example.hl}
                          show={furigana}
                        />
                      </div>
                    </div>
                    {currentQ.example.vi && (
                      <div className="g-explain-row">
                        <span className="g-explain-label">Dịch nghĩa:</span>
                        <div className="g-explain-val">{currentQ.example.vi}</div>
                      </div>
                    )}
                    <div className="g-explain-row">
                      <span className="g-explain-label">Mẫu câu:</span>
                      <div className="g-explain-val g-pattern-bold" lang="ja">
                        <Ruby text={currentQ.item.pattern} show={furigana} />
                      </div>
                    </div>
                    <div className="g-explain-row">
                      <span className="g-explain-label">Ý nghĩa mẫu:</span>
                      <div className="g-explain-val"><Ruby text={currentQ.item.meaningVi} show={furigana} /></div>
                    </div>
                  </div>
                ) : (
                  <div className="g-explain-content">
                    <div className="g-explain-row">
                      <span className="g-explain-label">Mẫu câu:</span>
                      <div className="g-explain-val g-pattern-bold" lang="ja">
                        <Ruby text={currentQ.item.pattern} show={furigana} />
                      </div>
                    </div>
                    <div className="g-explain-row">
                      <span className="g-explain-label">Ý nghĩa:</span>
                      <div className="g-explain-val"><Ruby text={currentQ.item.meaningVi} show={furigana} /></div>
                    </div>
                    {firstExample && (
                      <div className="g-explain-row">
                        <span className="g-explain-label">Ví dụ minh họa:</span>
                        <div className="g-explain-val">
                          <div lang="ja" className="g-first-ex-ja">
                            <ExampleLine
                              ja={firstExample.ja}
                              hl={firstExample.hl}
                              show={furigana}
                            />
                          </div>
                          {firstExample.vi && (
                            <div className="g-first-ex-vi">{firstExample.vi}</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Next Question CTA */}
              <div className="g-quiz-next-actions">
                <button
                  type="button"
                  className="btn btn-primary btn-large g-btn-next"
                  onClick={handleNext}
                  autoFocus
                >
                  <span>
                    {quizIndex < quizQuestions.length - 1 ? 'Câu tiếp theo' : 'Xem kết quả bài làm'}
                  </span>
                  <span className="g-shortcut-hint" aria-hidden="true">(phím Enter)</span>
                  <Icon name="arrowRight" size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
