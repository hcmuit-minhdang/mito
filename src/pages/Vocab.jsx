import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Icon from '../components/Icon';
import { allVocab, getVocabByLesson } from '../lib/data';
import { useProgress } from '../lib/progress';
import { shuffle, pickDistractors, makeChoiceQuestion } from '../lib/quiz';
import { normalizeKana } from '../lib/kana';
import SpeakButton from '../components/SpeakButton';
import LessonFilter from '../components/LessonFilter';
import Tabs from '../components/Tabs';
import ProgressBar from '../components/ProgressBar';

export default function Vocab() {
  const { isVocabKnown, toggleVocabKnown, setVocabKnown, setRecent } = useProgress();

  // Filters
  const [selectedLessons, setSelectedLessons] = useState([1, 2, 3, 4, 5, 6, 7, 8]);
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyUnknown, setOnlyUnknown] = useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'flashcard' | 'quiz' | 'typing'

  // List mode options
  const [hideReading, setHideReading] = useState(false);
  const [hideMeaning, setHideMeaning] = useState(false);
  const [revealedItems, setRevealedItems] = useState({});

  // Flashcard mode state
  const [cardIndex, setCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [cardFrontType, setCardFrontType] = useState('ja'); // 'ja' | 'vi'
  const [shuffledCards, setShuffledCards] = useState([]);

  // Quiz mode state
  const [quizQuestionCount, setQuizQuestionCount] = useState(10);
  const [quizType, setQuizType] = useState('ja_to_vi'); // 'ja_to_vi' | 'vi_to_ja' | 'word_to_reading'
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizSelectedOption, setQuizSelectedOption] = useState(null);
  const [quizIsAnswered, setQuizIsAnswered] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [quizWrongItems, setQuizWrongItems] = useState([]);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [quizStreakMap, setQuizStreakMap] = useState({}); // { [vocabId]: count }

  // Typing mode state
  const [typingIndex, setTypingIndex] = useState(0);
  const [typingInput, setTypingInput] = useState('');
  const [typingStatus, setTypingStatus] = useState(null); // null | 'correct' | 'incorrect'
  const [typingScore, setTypingScore] = useState({ correct: 0, total: 0 });

  // Update recent activity
  useEffect(() => {
    setRecent({
      type: 'vocab',
      lessonId: selectedLessons.length === 1 ? selectedLessons[0] : null,
      title: 'Ôn luyện từ vựng',
    });
  }, [selectedLessons, setRecent]);

  // Filtered Vocab List
  const filteredVocab = useMemo(() => {
    let list = getVocabByLesson(selectedLessons);

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const qKana = normalizeKana(searchQuery);
      list = list.filter((v) => {
        const matchW = v.w.toLowerCase().includes(q);
        const matchR = normalizeKana(v.r).includes(qKana);
        const matchVi = v.vi.toLowerCase().includes(q);
        const matchNote = v.note ? v.note.toLowerCase().includes(q) : false;
        return matchW || matchR || matchVi || matchNote;
      });
    }

    if (onlyUnknown) {
      list = list.filter((v) => !isVocabKnown(v.id));
    }

    return list;
  }, [selectedLessons, searchQuery, onlyUnknown, isVocabKnown]);

  // Synchronize flashcards when filtered vocab changes
  useEffect(() => {
    setShuffledCards(filteredVocab);
    setCardIndex(0);
    setIsFlipped(false);
    setTypingIndex(0);
    setTypingInput('');
    setTypingStatus(null);
    setTypingScore({ correct: 0, total: 0 });
  }, [filteredVocab]);

  // Keyboard navigation for Flashcard
  useEffect(() => {
    if (activeTab !== 'flashcard') return;

    function handleKeyDown(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevCard();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        nextCard();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, cardIndex, shuffledCards.length]);

  // Flashcard handlers
  function prevCard() {
    setIsFlipped(false);
    setCardIndex((prev) => (prev > 0 ? prev - 1 : shuffledCards.length - 1));
  }

  function nextCard() {
    setIsFlipped(false);
    setCardIndex((prev) => (prev < shuffledCards.length - 1 ? prev + 1 : 0));
  }

  function handleShuffleCards() {
    setShuffledCards(shuffle(filteredVocab));
    setCardIndex(0);
    setIsFlipped(false);
  }

  // Quiz Builder
  const startQuiz = useCallback(
    (customItems = null) => {
      const pool = customItems || filteredVocab;
      if (pool.length === 0) return;

      let itemsToUse = shuffle(pool);
      if (quizQuestionCount !== 'all' && typeof quizQuestionCount === 'number') {
        itemsToUse = itemsToUse.slice(0, quizQuestionCount);
      }

      // Generate 4-choice questions
      const generated = itemsToUse.map((item) => {
        let prompt = '';
        let correctOption = '';
        let distractorOptions = [];

        if (quizType === 'ja_to_vi') {
          prompt = `${item.w} 【${item.r}】`;
          correctOption = item.vi;
          distractorOptions = pickDistractors(item, filteredVocab, 3, (x) => x.vi).map(
            (x) => x.vi
          );
        } else if (quizType === 'vi_to_ja') {
          prompt = item.vi;
          correctOption = item.w;
          distractorOptions = pickDistractors(item, filteredVocab, 3, (x) => x.w).map(
            (x) => x.w
          );
        } else {
          // word_to_reading
          prompt = item.w;
          correctOption = item.r;
          distractorOptions = pickDistractors(item, filteredVocab, 3, (x) => x.r).map(
            (x) => x.r
          );
        }

        const choiceData = makeChoiceQuestion({
          correctOption,
          distractorOptions,
        });

        return {
          item,
          prompt,
          options: choiceData.options,
          answerIndex: choiceData.answerIndex,
        };
      });

      setQuizQuestions(generated);
      setQuizIndex(0);
      setQuizSelectedOption(null);
      setQuizIsAnswered(false);
      setQuizScore(0);
      setQuizWrongItems([]);
      setQuizCompleted(false);
    },
    [filteredVocab, quizQuestionCount, quizType]
  );

  function handleQuizAnswer(optionIdx) {
    if (quizIsAnswered) return;

    setQuizSelectedOption(optionIdx);
    setQuizIsAnswered(true);

    const currentQ = quizQuestions[quizIndex];
    const isCorrect = optionIdx === currentQ.answerIndex;
    const vocabId = currentQ.item.id;

    if (isCorrect) {
      setQuizScore((prev) => prev + 1);
      // SPEC: "câu đúng 2 lần liên tiếp thì tự đánh dấu 'đã thuộc'"
      const currentStreak = (quizStreakMap[vocabId] || 0) + 1;
      setQuizStreakMap((prev) => ({ ...prev, [vocabId]: currentStreak }));
      if (currentStreak >= 2) {
        setVocabKnown(vocabId, true);
      }
    } else {
      // SPEC: "Câu sai tự động đánh dấu 'chưa thuộc'"
      setVocabKnown(vocabId, false);
      setQuizStreakMap((prev) => ({ ...prev, [vocabId]: 0 }));
      setQuizWrongItems((prev) => [...prev, currentQ]);
    }
  }

  function handleQuizNext() {
    if (quizIndex < quizQuestions.length - 1) {
      setQuizIndex((prev) => prev + 1);
      setQuizSelectedOption(null);
      setQuizIsAnswered(false);
    } else {
      setQuizCompleted(true);
    }
  }

  // Typing Handlers
  function handleTypingSubmit(e) {
    if (e) e.preventDefault();
    if (!filteredVocab[typingIndex] || typingStatus !== null) return;

    const current = filteredVocab[typingIndex];
    const normalizedInput = normalizeKana(typingInput);
    const normalizedExpected = normalizeKana(current.r);

    const isMatch = normalizedInput === normalizedExpected;

    setTypingStatus(isMatch ? 'correct' : 'incorrect');
    setTypingScore((prev) => ({
      correct: prev.correct + (isMatch ? 1 : 0),
      total: prev.total + 1,
    }));
  }

  function handleTypingNext() {
    setTypingStatus(null);
    setTypingInput('');
    setTypingIndex((prev) => (prev < filteredVocab.length - 1 ? prev + 1 : 0));
  }

  // Toggle reveal item in list
  function toggleReveal(id, type) {
    setRevealedItems((prev) => ({
      ...prev,
      [`${id}_${type}`]: !prev[`${id}_${type}`],
    }));
  }

  const knownCountInFilter = filteredVocab.filter((v) => isVocabKnown(v.id)).length;
  const currentCard = shuffledCards[cardIndex] || filteredVocab[0];
  const currentTypingItem = filteredVocab[typingIndex];

  return (
    <div className="vocab-page container page-content">
      {/* Page Title */}
      <div className="page-header">
        <h1 className="page-title">
          Ôn luyện từ vựng trung cấp
        </h1>
        <p className="page-subtitle">
          Tổng hợp 262 từ vựng từ 8 bài học 『中級を学ぼう』. Học theo danh sách, flashcard, trắc nghiệm và gõ cách đọc.
        </p>
      </div>

      {/* Filter and Search Box */}
      <div className="vocab-filter-panel card">
        <LessonFilter
          selectedLessons={selectedLessons}
          onChange={setSelectedLessons}
          multiple={true}
        />

        <div className="filter-controls-row">
          <div className="search-input-wrap">
            <Icon name="search" size={18} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Tìm từ vựng, hiragana, nghĩa tiếng Việt..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => setSearchQuery('')}
                aria-label="Xóa ô tìm kiếm"
              >
                <Icon name="close" size={16} />
              </button>
            )}
          </div>

          <label className="checkbox-label unknown-filter-checkbox">
            <input
              type="checkbox"
              checked={onlyUnknown}
              onChange={(e) => setOnlyUnknown(e.target.checked)}
            />
            <span>Chỉ hiện từ chưa thuộc</span>
          </label>
        </div>

        <div className="vocab-stats-strip">
          <span>
            Hiển thị <strong>{filteredVocab.length}</strong> từ
          </span>
          <span className="stat-sep">·</span>
          <span>
            Đã thuộc: <strong>{knownCountInFilter}</strong>/{filteredVocab.length} (
            {filteredVocab.length ? Math.round((knownCountInFilter / filteredVocab.length) * 100) : 0}%)
          </span>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          { id: 'list', label: 'Danh sách', icon: 'list', count: filteredVocab.length },
          { id: 'flashcard', label: 'Thẻ ghi nhớ', icon: 'cards' },
          { id: 'quiz', label: 'Trắc nghiệm', icon: 'target' },
          { id: 'typing', label: 'Gõ cách đọc', icon: 'keyboard' },
        ]}
        activeTab={activeTab}
        onChange={(tab) => {
          setActiveTab(tab);
          if (tab === 'quiz' && quizQuestions.length === 0) {
            startQuiz();
          }
        }}
      />

      {/* TAB 1: DANH SÁCH */}
      {activeTab === 'list' && (
        <div className="tab-pane-list">
          {/* Controls: hide reading / hide meaning */}
          <div className="list-view-controls">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={hideReading}
                onChange={(e) => setHideReading(e.target.checked)}
              />
              <span>Ẩn cách đọc (Hiragana)</span>
            </label>

            <label className="toggle-label">
              <input
                type="checkbox"
                checked={hideMeaning}
                onChange={(e) => setHideMeaning(e.target.checked)}
              />
              <span>Ẩn nghĩa tiếng Việt</span>
            </label>
          </div>

          {filteredVocab.length === 0 ? (
            <div className="empty-state card">
              <p>Không tìm thấy từ vựng nào khớp với bộ lọc.</p>
            </div>
          ) : (
            <div className="vocab-cards-grid">
              {filteredVocab.map((v) => {
                const isKnown = isVocabKnown(v.id);
                const isReadingRevealed = !hideReading || revealedItems[`${v.id}_r`];
                const isMeaningRevealed = !hideMeaning || revealedItems[`${v.id}_vi`];

                return (
                  <div
                    key={v.id}
                    className={`vocab-item-card ${isKnown ? 'is-known' : ''}`}
                  >
                    <div className="card-top-row">
                      <span className="lesson-mini-badge">Bài {v.lessonId}</span>
                      <div className="card-top-actions">
                        <SpeakButton text={v.w} size="sm" />
                        <button
                          type="button"
                          className={`btn-known-toggle ${isKnown ? 'active' : ''}`}
                          onClick={() => toggleVocabKnown(v.id)}
                          title={isKnown ? 'Bỏ đánh dấu' : 'Đánh dấu đã thuộc'}
                        >
                          {isKnown ? <><Icon name="check" size={14} /> Đã thuộc</> : 'Chưa thuộc'}
                        </button>
                      </div>
                    </div>

                    <div className="vocab-word-large">{v.w}</div>

                    {/* Reading */}
                    <div
                      className={`vocab-reading ${!isReadingRevealed ? 'blur-hidden' : ''}`}
                      onClick={() => toggleReveal(v.id, 'r')}
                      title={!isReadingRevealed ? 'Bấm để hiện cách đọc' : undefined}
                    >
                      {isReadingRevealed ? v.r : '•••••• (bấm để xem)'}
                    </div>

                    {/* Note if available */}
                    {v.note && <div className="vocab-note"><Icon name="note" size={14} /> {v.note}</div>}

                    {/* Meaning */}
                    <div
                      className={`vocab-meaning ${!isMeaningRevealed ? 'blur-hidden' : ''}`}
                      onClick={() => toggleReveal(v.id, 'vi')}
                      title={!isMeaningRevealed ? 'Bấm để hiện nghĩa' : undefined}
                    >
                      {isMeaningRevealed ? v.vi : '•••••• (bấm để xem nghĩa)'}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: FLASHCARD */}
      {activeTab === 'flashcard' && (
        <div className="tab-pane-flashcard">
          {shuffledCards.length === 0 ? (
            <div className="empty-state card">
              <p>Không có từ vựng nào trong danh sách hiện tại để học flashcard.</p>
            </div>
          ) : (
            <div className="flashcard-container">
              {/* Toolbar */}
              <div className="flashcard-toolbar">
                <div className="front-side-selector">
                  <span>Mặt trước:</span>
                  <button
                    type="button"
                    className={`pill-btn ${cardFrontType === 'ja' ? 'active' : ''}`}
                    onClick={() => {
                      setCardFrontType('ja');
                      setIsFlipped(false);
                    }}
                  >
                    Tiếng Nhật
                  </button>
                  <button
                    type="button"
                    className={`pill-btn ${cardFrontType === 'vi' ? 'active' : ''}`}
                    onClick={() => {
                      setCardFrontType('vi');
                      setIsFlipped(false);
                    }}
                  >
                    Tiếng Việt
                  </button>
                </div>

                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={handleShuffleCards}
                  title="Xáo trộn thứ tự các thẻ"
                >
                  <Icon name="shuffle" size={16} /> Trộn thẻ
                </button>
              </div>

              {/* Progress counter */}
              <div className="flashcard-counter">
                Thẻ {cardIndex + 1} / {shuffledCards.length}
                <span className="keyboard-tip">(Phím cách: Lật thẻ · ← / →: Chuyển thẻ)</span>
              </div>

              {/* The Card */}
              <div
                className={`flashcard-scene ${isFlipped ? 'flipped' : ''}`}
                onClick={() => setIsFlipped((prev) => !prev)}
              >
                <div className="flashcard-inner">
                  {/* Front */}
                  <div className="flashcard-face flashcard-front">
                    <span className="card-badge">Bài {currentCard.lessonId}</span>
                    {cardFrontType === 'ja' ? (
                      <>
                        <div className="flashcard-word-huge">{currentCard.w}</div>
                        <div className="card-audio-wrap">
                          <SpeakButton text={currentCard.w} size="lg" />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flashcard-meaning-huge">{currentCard.vi}</div>
                      </>
                    )}
                    <div className="card-click-hint">Bấm để lật thẻ ↷</div>
                  </div>

                  {/* Back */}
                  <div className="flashcard-face flashcard-back">
                    <span className="card-badge">Bài {currentCard.lessonId}</span>
                    <div className="flashcard-back-word">{currentCard.w}</div>
                    <div className="flashcard-back-reading">【{currentCard.r}】</div>
                    <div className="card-audio-wrap">
                      <SpeakButton text={currentCard.w} size="md" />
                    </div>
                    {currentCard.note && (
                      <div className="flashcard-back-note"><Icon name="note" size={14} /> {currentCard.note}</div>
                    )}
                    <div className="flashcard-back-meaning">{currentCard.vi}</div>
                    <div className="card-click-hint">Bấm để lật lại ↶</div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flashcard-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    setVocabKnown(currentCard.id, false);
                    nextCard();
                  }}
                >
                  <Icon name="cross" size={16} /> Chưa thuộc
                </button>

                <div className="nav-arrows">
                  <button
                    type="button"
                    className="arrow-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      prevCard();
                    }}
                    title="Thẻ trước"
                    aria-label="Thẻ trước"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    className="arrow-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      nextCard();
                    }}
                    title="Thẻ kế tiếp"
                    aria-label="Thẻ kế tiếp"
                  >
                    →
                  </button>
                </div>

                <button
                  type="button"
                  className="btn btn-success"
                  onClick={(e) => {
                    e.stopPropagation();
                    setVocabKnown(currentCard.id, true);
                    nextCard();
                  }}
                >
                  <Icon name="check" size={16} /> Đã thuộc
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: TRẮC NGHIỆM */}
      {activeTab === 'quiz' && (
        <div className="tab-pane-quiz">
          {quizQuestions.length === 0 || quizCompleted ? (
            <div className="quiz-setup-box card">
              {quizCompleted ? (
                <div className="quiz-result-screen">
                  <h2>Kết quả trắc nghiệm</h2>
                  <div className="result-score-number">
                    {quizScore} / {quizQuestions.length} câu đúng (
                    {Math.round((quizScore / quizQuestions.length) * 100)}%)
                  </div>

                  {quizWrongItems.length > 0 && (
                    <div className="quiz-wrong-list">
                      <h3>Danh sách các câu làm sai:</h3>
                      <div className="wrong-items-grid">
                        {quizWrongItems.map((q, idx) => (
                          <div key={idx} className="wrong-item-row">
                            <div className="wrong-prompt">
                              <strong>{q.prompt}</strong>
                            </div>
                            <div className="wrong-answer-is">
                              Đáp án đúng:{' '}
                              <span className="correct-text">
                                {q.options[q.answerIndex]}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() =>
                          startQuiz(quizWrongItems.map((q) => q.item))
                        }
                      >
                        <Icon name="refresh" size={16} /> Ôn lại các câu sai ({quizWrongItems.length} câu)
                      </button>
                    </div>
                  )}

                  <div className="quiz-restart-actions">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => startQuiz()}
                    >
                      Làm bài trắc nghiệm mới
                    </button>
                  </div>
                </div>
              ) : (
                <div className="quiz-config-screen">
                  <h2>Cấu hình bài trắc nghiệm</h2>
                  <div className="config-form">
                    <div className="form-group">
                      <label>Dạng câu hỏi:</label>
                      <div className="radio-group">
                        <label>
                          <input
                            type="radio"
                            name="quizType"
                            checked={quizType === 'ja_to_vi'}
                            onChange={() => setQuizType('ja_to_vi')}
                          />
                          Nhật → Nghĩa Việt
                        </label>
                        <label>
                          <input
                            type="radio"
                            name="quizType"
                            checked={quizType === 'vi_to_ja'}
                            onChange={() => setQuizType('vi_to_ja')}
                          />
                          Việt → Chọn từ Nhật
                        </label>
                        <label>
                          <input
                            type="radio"
                            name="quizType"
                            checked={quizType === 'word_to_reading'}
                            onChange={() => setQuizType('word_to_reading')}
                          />
                          Từ → Cách đọc (Hiragana)
                        </label>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Số lượng câu:</label>
                      <div className="count-buttons">
                        {[10, 20, 'all'].map((cnt) => (
                          <button
                            key={cnt}
                            type="button"
                            className={`pill-btn ${quizQuestionCount === cnt ? 'active' : ''}`}
                            onClick={() => setQuizQuestionCount(cnt)}
                          >
                            {cnt === 'all' ? 'Tất cả' : `${cnt} câu`}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn btn-primary btn-large"
                      onClick={() => startQuiz()}
                      disabled={filteredVocab.length < 4}
                    >
                      Bắt đầu làm bài ({filteredVocab.length} từ khả dụng)
                    </button>
                    {filteredVocab.length < 4 && (
                      <p className="error-note">Cần ít nhất 4 từ vựng để tạo bài trắc nghiệm.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Active Quiz Question */
            <div className="quiz-active-card card">
              <div className="quiz-progress-bar-wrap">
                <ProgressBar
                  value={quizIndex + 1}
                  max={quizQuestions.length}
                  label={`Câu hỏi ${quizIndex + 1} / ${quizQuestions.length}`}
                  showPercent={false}
                />
              </div>

              <div className="quiz-question-box">
                <span className="quiz-prompt-label">Chọn đáp án đúng cho:</span>
                <div className="quiz-prompt-text">
                  {quizQuestions[quizIndex].prompt}
                </div>
                {quizType === 'ja_to_vi' && (
                  <SpeakButton text={quizQuestions[quizIndex].item.w} size="md" />
                )}
              </div>

              <div className="quiz-choices-grid">
                {quizQuestions[quizIndex].options.map((opt, oIdx) => {
                  const isSelected = quizSelectedOption === oIdx;
                  const isCorrectAnswer = oIdx === quizQuestions[quizIndex].answerIndex;

                  let optClass = '';
                  if (quizIsAnswered) {
                    if (isCorrectAnswer) optClass = 'choice-correct';
                    else if (isSelected && !isCorrectAnswer) optClass = 'choice-wrong';
                  }

                  return (
                    <button
                      key={oIdx}
                      type="button"
                      className={`quiz-choice-btn ${optClass}`}
                      onClick={() => handleQuizAnswer(oIdx)}
                      disabled={quizIsAnswered}
                    >
                      <span className="choice-letter">
                        {String.fromCharCode(65 + oIdx)}.
                      </span>
                      <span className="choice-text">{opt}</span>
                    </button>
                  );
                })}
              </div>

              {quizIsAnswered && (
                <div className="quiz-footer-actions">
                  <div className="feedback-text">
                    {quizSelectedOption === quizQuestions[quizIndex].answerIndex ? (
                      <span className="correct-feedback"><Icon name="check" size={16} /> Chính xác!</span>
                    ) : (
                      <span className="incorrect-feedback">
                        <Icon name="cross" size={16} /> Chưa đúng. Đáp án đúng là:{' '}
                        <strong>
                          {quizQuestions[quizIndex].options[quizQuestions[quizIndex].answerIndex]}
                        </strong>
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleQuizNext}
                  >
                    {quizIndex < quizQuestions.length - 1 ? 'Câu tiếp theo →' : 'Xem kết quả'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: GÕ CÁCH ĐỌC */}
      {activeTab === 'typing' && (
        <div className="tab-pane-typing">
          {filteredVocab.length === 0 ? (
            <div className="empty-state card">
              <p>Không có từ vựng nào để luyện gõ cách đọc.</p>
            </div>
          ) : (
            <div className="typing-quiz-card card">
              <div className="typing-header">
                <span className="lesson-badge">Bài {currentTypingItem.lessonId}</span>
                <span className="typing-counter">
                  Từ {typingIndex + 1} / {filteredVocab.length}
                </span>
                {typingScore.total > 0 && (
                  <span className="typing-score">
                    Đúng {typingScore.correct}/{typingScore.total}
                  </span>
                )}
              </div>

              <div className="typing-prompt-box">
                <div className="typing-word">{currentTypingItem.w}</div>
                <div className="typing-meaning">Nghĩa: {currentTypingItem.vi}</div>
                <SpeakButton text={currentTypingItem.w} size="md" />
              </div>

              <form onSubmit={handleTypingSubmit} className="typing-form">
                <label htmlFor="reading-input" className="typing-label">
                  Gõ cách đọc hiragana của từ trên:
                </label>
                <div className="typing-input-row">
                  <input
                    id="reading-input"
                    type="text"
                    className={`typing-input ${typingStatus ? `status-${typingStatus}` : ''}`}
                    placeholder="ví dụ: おんがく"
                    value={typingInput}
                    onChange={(e) => setTypingInput(e.target.value)}
                    disabled={typingStatus !== null}
                    autoComplete="off"
                    autoFocus
                  />
                  {typingStatus === null ? (
                    <button type="submit" className="btn btn-primary" disabled={!typingInput.trim()}>
                      Kiểm tra
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleTypingNext}
                    >
                      Từ tiếp →
                    </button>
                  )}
                </div>
              </form>

              {typingStatus && (
                <div className={`typing-feedback-box feedback-${typingStatus}`}>
                  {typingStatus === 'correct' ? (
                    <p><Icon name="check" size={16} /> Chính xác! Đáp án: <strong>{currentTypingItem.r}</strong></p>
                  ) : (
                    <p>
                      <Icon name="cross" size={16} /> Chưa chính xác. Đáp án đúng là: <strong>【{currentTypingItem.r}】</strong>
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
