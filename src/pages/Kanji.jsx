import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import Icon from '../components/Icon';
import { allKanji, getKanjiByLesson } from '../lib/data';
import { useProgress } from '../lib/progress';
import { shuffle, pickDistractors, makeChoiceQuestion } from '../lib/quiz';
import { normalizeKana } from '../lib/kana';
import SpeakButton from '../components/SpeakButton';
import LessonFilter from '../components/LessonFilter';
import Tabs from '../components/Tabs';
import Modal from '../components/Modal';
import ProgressBar from '../components/ProgressBar';

export default function Kanji() {
  const { isKanjiKnown, toggleKanjiKnown, setKanjiKnown, setRecent } = useProgress();

  // Filters
  const [selectedLessons, setSelectedLessons] = useState([1, 2, 3, 4, 5, 6, 7, 8]);
  const [params] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(params.get('q') || '');
  useEffect(() => {
    setSearchQuery(params.get('q') || '');
  }, [params]);
  const [onlyUnknown, setOnlyUnknown] = useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState('grid'); // 'grid' | 'flashcard' | 'reading' | 'typing' | 'kanji_choice'

  // Modal Detail Kanji state
  const [modalKanjiIndex, setModalKanjiIndex] = useState(null);
  // Bản chụp danh sách lúc mở modal: giữ nguyên khi đánh dấu "đã thuộc" để modal không nhảy chữ
  // (ví dụ khi đang bật "Chỉ hiện chữ chưa thuộc", danh sách lọc sẽ co lại).
  const [modalKanjiList, setModalKanjiList] = useState([]);

  // Flashcard mode state
  const [cardIndex, setCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [shuffledCards, setShuffledCards] = useState([]);

  // Reading Quiz state
  const [readingQuizQuestions, setReadingQuizQuestions] = useState([]);
  const [readingQuizIndex, setReadingQuizIndex] = useState(0);
  const [readingQuizSelected, setReadingQuizSelected] = useState(null);
  const [readingQuizIsAnswered, setReadingQuizIsAnswered] = useState(false);
  const [readingQuizScore, setReadingQuizScore] = useState(0);
  const [readingQuizDone, setReadingQuizDone] = useState(false);

  // Typing Quiz state
  const [typingIndex, setTypingIndex] = useState(0);
  const [typingInput, setTypingInput] = useState('');
  const [typingStatus, setTypingStatus] = useState(null);
  const [typingScore, setTypingScore] = useState({ correct: 0, total: 0 });

  // Kanji Choice Quiz state (Hiragana -> choose Kanji)
  const [choiceQuizQuestions, setChoiceQuizQuestions] = useState([]);
  const [choiceQuizIndex, setChoiceQuizIndex] = useState(0);
  const [choiceQuizSelected, setChoiceQuizSelected] = useState(null);
  const [choiceQuizIsAnswered, setChoiceQuizIsAnswered] = useState(false);
  const [choiceQuizScore, setChoiceQuizScore] = useState(0);
  const [choiceQuizDone, setChoiceQuizDone] = useState(false);

  // Update recent activity
  useEffect(() => {
    setRecent({
      type: 'kanji',
      lessonId: selectedLessons.length === 1 ? selectedLessons[0] : null,
      title: 'Học và luyện tập Kanji',
    });
  }, [selectedLessons, setRecent]);

  // Tập chữ theo bài / tìm kiếm (chưa áp dụng "chỉ hiện chưa thuộc")
  const baseKanji = useMemo(() => {
    let list = getKanjiByLesson(selectedLessons);

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const qKana = normalizeKana(searchQuery);
      list = list.filter((item) => {
        const matchK = item.k.includes(q);
        const matchOn = item.on.some((o) => normalizeKana(o).includes(qKana));
        const matchKun = item.kun.some((k) => normalizeKana(k).includes(qKana));
        const matchWords = item.words.some(
          ([w, r]) => w.includes(q) || normalizeKana(r).includes(qKana)
        );
        const matchHv = (item.hv || '').toLowerCase().includes(q) || (item.mean || '').toLowerCase().includes(q);
        return matchK || matchOn || matchKun || matchWords || matchHv;
      });
    }

    return list;
  }, [selectedLessons, searchQuery]);

  // Filtered Kanji List
  const filteredKanji = useMemo(
    () => (onlyUnknown ? baseKanji.filter((item) => !isKanjiKnown(item.k)) : baseKanji),
    [baseKanji, onlyUnknown, isKanjiKnown]
  );

  // Words list extracted from current filtered kanji.
  // Một từ ghép có thể nằm dưới nhiều chữ (vd 音楽 ở cả 音 và 楽): giữ lần xuất hiện đầu để quiz
  // và chế độ gõ không hỏi cùng một từ hai lần.
  const filteredWords = useMemo(() => {
    const seen = new Set();
    const list = [];
    for (const k of filteredKanji) {
      for (const [word, reading] of k.words) {
        const key = `${word}|${reading}`;
        if (seen.has(key)) continue;
        seen.add(key);
        list.push({ word, reading, kanji: k.k, lesson: k.lesson });
      }
    }
    return list;
  }, [filteredKanji]);

  // Khi bộ lọc đổi (bài / tìm kiếm / bật-tắt "chưa thuộc"), bỏ các bài trắc nghiệm đã tạo để chúng
  // không còn dùng câu hỏi của bộ lọc cũ. Khóa chỉ tính theo tập lọc GỐC (không phụ thuộc trạng
  // thái đã thuộc): đánh dấu một chữ "đã thuộc" khi "chưa thuộc" đang bật không được làm mất bài.
  const filteredKanjiKey = useMemo(
    () => `${baseKanji.map((k) => k.id).join('|')}#${onlyUnknown}`,
    [baseKanji, onlyUnknown]
  );
  useEffect(() => {
    setReadingQuizQuestions([]);
    setReadingQuizIndex(0);
    setReadingQuizSelected(null);
    setReadingQuizIsAnswered(false);
    setReadingQuizScore(0);
    setReadingQuizDone(false);
    setChoiceQuizQuestions([]);
    setChoiceQuizIndex(0);
    setChoiceQuizSelected(null);
    setChoiceQuizIsAnswered(false);
    setChoiceQuizScore(0);
    setChoiceQuizDone(false);
  }, [filteredKanjiKey]);

  // Synchronize flashcard / typing items
  useEffect(() => {
    setShuffledCards(filteredKanji);
    setCardIndex(0);
    setIsFlipped(false);
    setTypingIndex(0);
    setTypingInput('');
    setTypingStatus(null);
    setTypingScore({ correct: 0, total: 0 });
  }, [filteredKanji]);

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
        setCardIndex((prev) => (prev > 0 ? prev - 1 : shuffledCards.length - 1));
        setIsFlipped(false);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setCardIndex((prev) => (prev < shuffledCards.length - 1 ? prev + 1 : 0));
        setIsFlipped(false);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, shuffledCards.length]);

  // Modal navigation
  const currentModalKanji =
    modalKanjiIndex != null ? modalKanjiList[modalKanjiIndex] : null;

  function handleModalPrev() {
    if (modalKanjiIndex > 0) {
      setModalKanjiIndex(modalKanjiIndex - 1);
    } else {
      setModalKanjiIndex(modalKanjiList.length - 1);
    }
  }

  function handleModalNext() {
    if (modalKanjiIndex < modalKanjiList.length - 1) {
      setModalKanjiIndex(modalKanjiIndex + 1);
    } else {
      setModalKanjiIndex(0);
    }
  }

  // Phím ← / → chuyển chữ trong modal (khớp gợi ý trên nút Trước/Sau)
  const isModalOpen = modalKanjiIndex !== null;
  useEffect(() => {
    if (!isModalOpen) return;
    function onKey(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleModalPrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleModalNext();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isModalOpen, modalKanjiIndex, modalKanjiList.length]);

  // Reading Quiz Builder
  const startReadingQuiz = useCallback(() => {
    if (filteredWords.length < 4) return;

    const selectedWords = shuffle(filteredWords).slice(0, 15);
    const questions = selectedWords.map((item) => {
      const distractors = pickDistractors(
        item,
        filteredWords,
        3,
        (w) => w.reading
      ).map((w) => w.reading);

      const choice = makeChoiceQuestion({
        correctOption: item.reading,
        distractorOptions: distractors,
      });

      return {
        item,
        prompt: item.word,
        options: choice.options,
        answerIndex: choice.answerIndex,
      };
    });

    setReadingQuizQuestions(questions);
    setReadingQuizIndex(0);
    setReadingQuizSelected(null);
    setReadingQuizIsAnswered(false);
    setReadingQuizScore(0);
    setReadingQuizDone(false);
  }, [filteredWords]);

  function handleReadingQuizAnswer(optIdx) {
    if (readingQuizIsAnswered) return;
    setReadingQuizSelected(optIdx);
    setReadingQuizIsAnswered(true);

    const isCorrect = optIdx === readingQuizQuestions[readingQuizIndex].answerIndex;
    if (isCorrect) {
      setReadingQuizScore((prev) => prev + 1);
    }
  }

  function handleReadingQuizNext() {
    if (readingQuizIndex < readingQuizQuestions.length - 1) {
      setReadingQuizIndex((prev) => prev + 1);
      setReadingQuizSelected(null);
      setReadingQuizIsAnswered(false);
    } else {
      setReadingQuizDone(true);
    }
  }

  // Kanji Choice Quiz Builder (Hiragana -> choose Kanji)
  const startChoiceQuiz = useCallback(() => {
    if (filteredWords.length < 4) return;

    const selectedWords = shuffle(filteredWords).slice(0, 15);
    const questions = selectedWords.map((item) => {
      // Loại các từ đồng âm với đề bài (vd はな: 鼻/花) khỏi đáp án nhiễu, vì nhìn cách đọc
      // thì chúng cũng "đúng" và người học không thể phân biệt.
      const distractors = pickDistractors(
        item,
        filteredWords.filter((w) => w.reading !== item.reading),
        3,
        (w) => w.word
      ).map((w) => w.word);

      const choice = makeChoiceQuestion({
        correctOption: item.word,
        distractorOptions: distractors,
      });

      return {
        item,
        prompt: item.reading,
        options: choice.options,
        answerIndex: choice.answerIndex,
      };
    });

    setChoiceQuizQuestions(questions);
    setChoiceQuizIndex(0);
    setChoiceQuizSelected(null);
    setChoiceQuizIsAnswered(false);
    setChoiceQuizScore(0);
    setChoiceQuizDone(false);
  }, [filteredWords]);

  function handleChoiceQuizAnswer(optIdx) {
    if (choiceQuizIsAnswered) return;
    setChoiceQuizSelected(optIdx);
    setChoiceQuizIsAnswered(true);

    const isCorrect = optIdx === choiceQuizQuestions[choiceQuizIndex].answerIndex;
    if (isCorrect) {
      setChoiceQuizScore((prev) => prev + 1);
    }
  }

  function handleChoiceQuizNext() {
    if (choiceQuizIndex < choiceQuizQuestions.length - 1) {
      setChoiceQuizIndex((prev) => prev + 1);
      setChoiceQuizSelected(null);
      setChoiceQuizIsAnswered(false);
    } else {
      setChoiceQuizDone(true);
    }
  }

  // Typing Handlers
  const currentTypingWord = filteredWords[typingIndex] || null;

  function handleTypingSubmit(e) {
    if (e) e.preventDefault();
    if (!currentTypingWord || typingStatus !== null) return;

    const isMatch =
      normalizeKana(typingInput) === normalizeKana(currentTypingWord.reading);
    setTypingStatus(isMatch ? 'correct' : 'incorrect');
    setTypingScore((prev) => ({
      correct: prev.correct + (isMatch ? 1 : 0),
      total: prev.total + 1,
    }));
  }

  function handleTypingNext() {
    setTypingStatus(null);
    setTypingInput('');
    setTypingIndex((prev) => (prev < filteredWords.length - 1 ? prev + 1 : 0));
  }

  const totalKnownKanji = allKanji.filter((k) => isKanjiKnown(k.k)).length;
  const filteredKnownCount = filteredKanji.filter((k) => isKanjiKnown(k.k)).length;
  const currentFlashcard = shuffledCards[cardIndex] || filteredKanji[0];

  return (
    <div className="kanji-page container page-content">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">
          Học & Luyện tập Hán tự (Kanji)
        </h1>
        <p className="page-subtitle">
          Tổng hợp 193 chữ Hán trung cấp trong 8 bài học. Tra cứu âm Hán Việt, âm On・Kun, nghĩa, mẹo nhớ, từ ví dụ và luyện tập đa dạng.
        </p>
      </div>

      {/* Filter panel */}
      <div className="kanji-filter-panel card">
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
              placeholder="Tìm chữ Kanji, Hán Việt, âm On/Kun, từ ví dụ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => setSearchQuery('')}
                aria-label="Xóa tìm kiếm"
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
            <span>Chỉ hiện chữ chưa thuộc</span>
          </label>
        </div>

        {/* Global Progress Bar */}
        <div className="kanji-progress-strip">
          <ProgressBar
            value={totalKnownKanji}
            max={allKanji.length}
            label="Tiến độ toàn bộ 193 Kanji:"
            subLabel={`Đang xem: ${filteredKnownCount}/${filteredKanji.length} chữ thuộc`}
            color="primary"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          { id: 'grid', label: 'Bảng chữ Kanji', icon: 'grid', count: filteredKanji.length },
          { id: 'flashcard', label: 'Thẻ ghi nhớ', icon: 'cards' },
          { id: 'reading', label: 'Đọc từ ví dụ', icon: 'reading' },
          { id: 'typing', label: 'Gõ cách đọc', icon: 'keyboard' },
          { id: 'kanji_choice', label: 'Chọn kanji', icon: 'target' },
        ]}
        activeTab={activeTab}
        onChange={(tab) => {
          setActiveTab(tab);
          if (tab === 'reading' && readingQuizQuestions.length === 0) {
            startReadingQuiz();
          } else if (tab === 'kanji_choice' && choiceQuizQuestions.length === 0) {
            startChoiceQuiz();
          }
        }}
      />

      {/* TAB 1: BẢNG KANJI (GRID) */}
      {activeTab === 'grid' && (
        <div className="tab-pane-grid">
          {filteredKanji.length === 0 ? (
            <div className="empty-state card">
              <p>Không có chữ kanji nào khớp với bộ lọc.</p>
            </div>
          ) : (
            <div className="kanji-tiles-grid">
              {filteredKanji.map((item, idx) => {
                const isKnown = isKanjiKnown(item.k);
                const primaryOn = item.on?.[0] || '';
                const primaryKun = item.kun?.[0] || '';

                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`kanji-tile-card ${isKnown ? 'is-known' : ''}`}
                    style={{ '--i': idx }}
                    onClick={() => {
                      setModalKanjiList(filteredKanji);
                      setModalKanjiIndex(idx);
                    }}
                    title={`Chữ ${item.k} (Bài ${item.lesson}) - Bấm xem chi tiết`}
                  >
                    <div className="tile-top-bar">
                      <span className="tile-lesson">Bài {item.lesson}</span>
                      <span className={`tile-status-indicator ${isKnown ? 'status-known' : 'status-unknown'}`}>
                        {isKnown ? <Icon name="check" size={14} strokeWidth={2.4} label="Đã thuộc" /> : <Icon name="circle" size={14} label="Chưa thuộc" />}
                      </span>
                    </div>

                    <div className="tile-character">{item.k}</div>
                    {item.hv && <div className="tile-hv">{item.hv.split(',')[0]}</div>}

                    <div className="tile-readings">
                      {primaryOn && <span className="reading-on">{primaryOn}</span>}
                      {primaryKun && <span className="reading-kun">{primaryKun}</span>}
                    </div>

                    {isKnown && <span className="tile-known-badge"><Icon name="check" size={12} strokeWidth={2.4} /> Đã thuộc</span>}
                  </button>
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
              <p>Không có kanji nào để luyện flashcard.</p>
            </div>
          ) : (
            <div className="flashcard-container">
              <div className="flashcard-toolbar">
                <span className="flashcard-counter">
                  Chữ {cardIndex + 1} / {shuffledCards.length}
                </span>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => {
                    setShuffledCards(shuffle(filteredKanji));
                    setCardIndex(0);
                    setIsFlipped(false);
                  }}
                >
                  <Icon name="shuffle" size={16} /> Trộn thẻ
                </button>
              </div>

              {/* Scene Card */}
              <div
                className={`flashcard-scene ${isFlipped ? 'flipped' : ''}`}
                onClick={() => setIsFlipped((prev) => !prev)}
              >
                <div className="flashcard-inner">
                  {/* Front: Kanji >= 96px */}
                  <div className="flashcard-face flashcard-front">
                    <span className="card-badge">Bài {currentFlashcard.lesson}</span>
                    <div className="kanji-huge-char">{currentFlashcard.k}</div>
                    <div className="card-audio-wrap">
                      <SpeakButton text={currentFlashcard.k} size="lg" />
                    </div>
                    <div className="card-click-hint">Bấm để lật xem âm đọc & từ ví dụ ↷</div>
                  </div>

                  {/* Back: On, Kun, Words */}
                  <div className="flashcard-face flashcard-back">
                    <span className="card-badge">Bài {currentFlashcard.lesson}</span>
                    <div className="kanji-back-char-small">{currentFlashcard.k}</div>
                    {(currentFlashcard.hv || currentFlashcard.mean) && (
                      <div className="modal-meaning">
                        {currentFlashcard.hv && <span className="hv-pill">{currentFlashcard.hv}</span>}
                        {currentFlashcard.mean && <span className="mean-text">{currentFlashcard.mean}</span>}
                      </div>
                    )}

                    <div className="kanji-back-readings-box">
                      <div className="reading-line">
                        <strong>Âm On:</strong>{' '}
                        <span>
                          {currentFlashcard.on.length > 0
                            ? currentFlashcard.on.join('・')
                            : '—'}
                        </span>
                      </div>
                      <div className="reading-line">
                        <strong>Âm Kun:</strong>{' '}
                        <span>
                          {currentFlashcard.kun.length > 0
                            ? currentFlashcard.kun.join('・')
                            : '—'}
                        </span>
                      </div>
                    </div>

                    <div className="kanji-back-words-list">
                      <strong>Từ ví dụ:</strong>
                      <div className="words-chips">
                        {currentFlashcard.words.map(([w, r], wIdx) => (
                          <span key={wIdx} className="word-chip">
                            {w} 【{r}】
                          </span>
                        ))}
                      </div>
                    </div>

                    {currentFlashcard.tip && (
                      <p className="kanji-tip"><Icon name="sparkle" size={16} /> <span>{currentFlashcard.tip}</span></p>
                    )}
                    <div className="card-click-hint">Bấm để lật lại ↶</div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flashcard-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    setKanjiKnown(currentFlashcard.k, false);
                    setCardIndex((prev) => (prev < shuffledCards.length - 1 ? prev + 1 : 0));
                    setIsFlipped(false);
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
                      setCardIndex((prev) => (prev > 0 ? prev - 1 : shuffledCards.length - 1));
                      setIsFlipped(false);
                    }}
                    title="Chữ trước"
                    aria-label="Chữ trước"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    className="arrow-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCardIndex((prev) => (prev < shuffledCards.length - 1 ? prev + 1 : 0));
                      setIsFlipped(false);
                    }}
                    title="Chữ sau"
                    aria-label="Chữ sau"
                  >
                    →
                  </button>
                </div>

                <button
                  type="button"
                  className="btn btn-success"
                  onClick={(e) => {
                    e.stopPropagation();
                    setKanjiKnown(currentFlashcard.k, true);
                    setCardIndex((prev) => (prev < shuffledCards.length - 1 ? prev + 1 : 0));
                    setIsFlipped(false);
                  }}
                >
                  <Icon name="check" size={16} /> Đã thuộc
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ĐỌC TỪ VÍ DỤ (QUIZ) */}
      {activeTab === 'reading' && (
        <div className="tab-pane-reading-quiz">
          {filteredWords.length < 4 ? (
            <div className="empty-state card">
              <p>Cần ít nhất 4 từ ví dụ để tạo bài trắc nghiệm đọc từ.</p>
            </div>
          ) : readingQuizDone || readingQuizQuestions.length === 0 ? (
            <div className="quiz-result-card card">
              {readingQuizDone ? (
                <>
                  <h2>Hoàn thành bài trắc nghiệm đọc từ!</h2>
                  <p className="score-number-large">
                    {readingQuizScore} / {readingQuizQuestions.length} câu đúng (
                    {Math.round((readingQuizScore / readingQuizQuestions.length) * 100)}%)
                  </p>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={startReadingQuiz}
                  >
                    Làm bài trắc nghiệm khác
                  </button>
                </>
              ) : (
                <>
                  <h2>Luyện chọn cách đọc đúng của từ</h2>
                  <p>Hệ thống sẽ hiển thị từ vựng kanji, bạn chọn cách đọc Hiragana đúng nhất.</p>
                  <button
                    type="button"
                    className="btn btn-primary btn-large"
                    onClick={startReadingQuiz}
                  >
                    Bắt đầu làm bài
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="quiz-active-card card">
              <ProgressBar
                value={readingQuizIndex + 1}
                max={readingQuizQuestions.length}
                label={`Câu ${readingQuizIndex + 1} / ${readingQuizQuestions.length}`}
                showPercent={false}
              />

              <div className="quiz-prompt-box">
                <span className="quiz-prompt-label">Cách đọc đúng của từ này là gì?</span>
                <div className="quiz-prompt-text">{readingQuizQuestions[readingQuizIndex].prompt}</div>
                <SpeakButton text={readingQuizQuestions[readingQuizIndex].prompt} size="md" />
              </div>

              <div className="quiz-choices-grid">
                {readingQuizQuestions[readingQuizIndex].options.map((opt, oIdx) => {
                  const isSelected = readingQuizSelected === oIdx;
                  const isCorrect = oIdx === readingQuizQuestions[readingQuizIndex].answerIndex;
                  let optClass = '';
                  if (readingQuizIsAnswered) {
                    if (isCorrect) optClass = 'choice-correct';
                    else if (isSelected && !isCorrect) optClass = 'choice-wrong';
                  }

                  return (
                    <button
                      key={oIdx}
                      type="button"
                      className={`quiz-choice-btn ${optClass}`}
                      onClick={() => handleReadingQuizAnswer(oIdx)}
                      disabled={readingQuizIsAnswered}
                    >
                      <span className="choice-letter">{String.fromCharCode(65 + oIdx)}.</span>
                      <span className="choice-text">{opt}</span>
                    </button>
                  );
                })}
              </div>

              {readingQuizIsAnswered && (
                <div className="quiz-footer-actions">
                  <div className="feedback-text">
                    {readingQuizSelected === readingQuizQuestions[readingQuizIndex].answerIndex ? (
                      <span className="correct-feedback"><Icon name="check" size={16} /> Chính xác!</span>
                    ) : (
                      <span className="incorrect-feedback">
                        <Icon name="cross" size={16} /> Chưa đúng. Đáp án là:{' '}
                        <strong>
                          {readingQuizQuestions[readingQuizIndex].options[readingQuizQuestions[readingQuizIndex].answerIndex]}
                        </strong>
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleReadingQuizNext}
                  >
                    {readingQuizIndex < readingQuizQuestions.length - 1 ? 'Câu tiếp theo →' : 'Xem kết quả'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: GÕ CÁCH ĐỌC KANJI */}
      {activeTab === 'typing' && (
        <div className="tab-pane-typing">
          {filteredWords.length === 0 ? (
            <div className="empty-state card">
              <p>Không có từ vựng nào để gõ cách đọc.</p>
            </div>
          ) : (
            <div className="typing-quiz-card card">
              <div className="typing-header">
                <span className="lesson-badge">Bài {currentTypingWord?.lesson}</span>
                <span className="typing-counter">
                  Từ {typingIndex + 1} / {filteredWords.length}
                </span>
                {typingScore.total > 0 && (
                  <span className="typing-score">
                    Đúng {typingScore.correct}/{typingScore.total}
                  </span>
                )}
              </div>

              <div className="typing-prompt-box">
                <div className="typing-word">{currentTypingWord?.word}</div>
                <SpeakButton text={currentTypingWord?.word} size="md" />
              </div>

              <form onSubmit={handleTypingSubmit} className="typing-form">
                <label htmlFor="kanji-reading-input" className="typing-label">
                  Gõ cách đọc hiragana của từ trên:
                </label>
                <div className="typing-input-row">
                  <input
                    id="kanji-reading-input"
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
                    <p><Icon name="check" size={16} /> Chính xác! Cách đọc: <strong>{currentTypingWord?.reading}</strong></p>
                  ) : (
                    <p>
                      <Icon name="cross" size={16} /> Chưa đúng. Đáp án đúng là: <strong>【{currentTypingWord?.reading}】</strong>
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: CHỌN KANJI TỪ CÁCH ĐỌC */}
      {activeTab === 'kanji_choice' && (
        <div className="tab-pane-kanji-choice">
          {filteredWords.length < 4 ? (
            <div className="empty-state card">
              <p>Cần ít nhất 4 từ ví dụ để tạo bài chọn kanji.</p>
            </div>
          ) : choiceQuizDone || choiceQuizQuestions.length === 0 ? (
            <div className="quiz-result-card card">
              {choiceQuizDone ? (
                <>
                  <h2>Hoàn thành bài chọn kanji!</h2>
                  <p className="score-number-large">
                    {choiceQuizScore} / {choiceQuizQuestions.length} câu đúng (
                    {Math.round((choiceQuizScore / choiceQuizQuestions.length) * 100)}%)
                  </p>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={startChoiceQuiz}
                  >
                    Làm bài khác
                  </button>
                </>
              ) : (
                <>
                  <h2>Chọn cách viết Kanji đúng cho từ</h2>
                  <p>Hệ thống hiện cách đọc hiragana, bạn chọn đúng chữ Kanji tương ứng.</p>
                  <button
                    type="button"
                    className="btn btn-primary btn-large"
                    onClick={startChoiceQuiz}
                  >
                    Bắt đầu làm bài
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="quiz-active-card card">
              <ProgressBar
                value={choiceQuizIndex + 1}
                max={choiceQuizQuestions.length}
                label={`Câu ${choiceQuizIndex + 1} / ${choiceQuizQuestions.length}`}
                showPercent={false}
              />

              <div className="quiz-prompt-box">
                <span className="quiz-prompt-label">Chọn cách viết Kanji đúng cho cách đọc:</span>
                <div className="quiz-prompt-text">
                  【{choiceQuizQuestions[choiceQuizIndex].prompt}】
                </div>
              </div>

              <div className="quiz-choices-grid">
                {choiceQuizQuestions[choiceQuizIndex].options.map((opt, oIdx) => {
                  const isSelected = choiceQuizSelected === oIdx;
                  const isCorrect = oIdx === choiceQuizQuestions[choiceQuizIndex].answerIndex;
                  let optClass = '';
                  if (choiceQuizIsAnswered) {
                    if (isCorrect) optClass = 'choice-correct';
                    else if (isSelected && !isCorrect) optClass = 'choice-wrong';
                  }

                  return (
                    <button
                      key={oIdx}
                      type="button"
                      className={`quiz-choice-btn ${optClass}`}
                      onClick={() => handleChoiceQuizAnswer(oIdx)}
                      disabled={choiceQuizIsAnswered}
                    >
                      <span className="choice-letter">{String.fromCharCode(65 + oIdx)}.</span>
                      <span className="choice-text">{opt}</span>
                    </button>
                  );
                })}
              </div>

              {choiceQuizIsAnswered && (
                <div className="quiz-footer-actions">
                  <div className="feedback-text">
                    {choiceQuizSelected === choiceQuizQuestions[choiceQuizIndex].answerIndex ? (
                      <span className="correct-feedback"><Icon name="check" size={16} /> Chính xác!</span>
                    ) : (
                      <span className="incorrect-feedback">
                        <Icon name="cross" size={16} /> Chưa đúng. Đáp án là:{' '}
                        <strong>
                          {choiceQuizQuestions[choiceQuizIndex].options[choiceQuizQuestions[choiceQuizIndex].answerIndex]}
                        </strong>
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleChoiceQuizNext}
                  >
                    {choiceQuizIndex < choiceQuizQuestions.length - 1 ? 'Câu tiếp theo →' : 'Xem kết quả'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* MODAL CHI TIẾT KANJI */}
      {currentModalKanji && (
        <Modal
          isOpen={modalKanjiIndex !== null}
          onClose={() => setModalKanjiIndex(null)}
          title={`Chi tiết chữ ${currentModalKanji.k}`}
          className="kanji-detail-modal"
        >
          <div className="modal-kanji-content">
            <div className="modal-header-nav">
              <span className="modal-lesson-tag">Bài {currentModalKanji.lesson}</span>

              <div className="modal-nav-buttons">
                <button
                  type="button"
                  className="modal-arrow-btn"
                  onClick={handleModalPrev}
                  title="Chữ trước (←)"
                >
                  ← Trước
                </button>
                <span className="modal-index-counter">
                  {modalKanjiIndex + 1} / {modalKanjiList.length}
                </span>
                <button
                  type="button"
                  className="modal-arrow-btn"
                  onClick={handleModalNext}
                  title="Chữ sau (→)"
                >
                  Sau →
                </button>
              </div>
            </div>

            {/* Giant Kanji >= 96px */}
            <div className="modal-kanji-hero">
              <div className="modal-giant-char">{currentModalKanji.k}</div>
              <div className="modal-hero-actions">
                <SpeakButton text={currentModalKanji.k} size="lg" />
                <button
                  type="button"
                  className={`btn-modal-known ${isKanjiKnown(currentModalKanji.k) ? 'is-known' : ''}`}
                  onClick={() => toggleKanjiKnown(currentModalKanji.k)}
                >
                  {isKanjiKnown(currentModalKanji.k) ? <><Icon name="check" size={16} /> Đã thuộc</> : <><Icon name="plus" size={16} /> Đánh dấu đã thuộc</>}
                </button>
              </div>
            </div>

            {/* Hán Việt, nghĩa, mẹo */}
            {(currentModalKanji.hv || currentModalKanji.mean) && (
              <div className="modal-meaning">
                {currentModalKanji.hv && <span className="hv-pill" title="Âm Hán Việt">{currentModalKanji.hv}</span>}
                {currentModalKanji.mean && <span className="mean-text">{currentModalKanji.mean}</span>}
              </div>
            )}
            {currentModalKanji.tip && (
              <p className="kanji-tip"><Icon name="sparkle" size={16} /> <span><strong>Mẹo nhớ:</strong> {currentModalKanji.tip}</span></p>
            )}

            {/* Readings */}
            <div className="modal-readings-grid">
              <div className="reading-block block-on">
                <div className="reading-block-title">Âm On (音読み)</div>
                <div className="reading-block-values">
                  {currentModalKanji.on.length > 0 ? (
                    currentModalKanji.on.map((on, idx) => (
                      <span key={idx} className="on-pill">
                        {on}
                      </span>
                    ))
                  ) : (
                    <span className="empty-val">—</span>
                  )}
                </div>
              </div>

              <div className="reading-block block-kun">
                <div className="reading-block-title">Âm Kun (訓読み)</div>
                <div className="reading-block-values">
                  {currentModalKanji.kun.length > 0 ? (
                    currentModalKanji.kun.map((kun, idx) => (
                      <span key={idx} className="kun-pill">
                        {kun}
                      </span>
                    ))
                  ) : (
                    <span className="empty-val">—</span>
                  )}
                </div>
              </div>
            </div>

            {/* Words list with pronunciation */}
            <div className="modal-words-section">
              <h4 className="words-section-title">
                Từ vựng ví dụ ({currentModalKanji.words.length} từ):
              </h4>
              <div className="modal-words-list">
                {currentModalKanji.words.map(([word, reading], wIdx) => (
                  <div key={wIdx} className="modal-word-card">
                    <div className="word-card-info">
                      <strong className="word-card-text">{word}</strong>
                      <span className="word-card-reading">【{reading}】</span>
                    </div>
                    <SpeakButton text={word} size="sm" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
