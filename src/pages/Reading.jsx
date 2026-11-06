import React, { useState, useEffect, useMemo, useRef } from 'react';
import Icon from '../components/Icon';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getLesson, lessons } from '../lib/data';
import { useProgress } from '../lib/progress';
import { speakParagraphs, stopSpeaking, isSpeechSupported } from '../lib/speech';
import Ruby from '../components/Ruby';
import SpeakButton from '../components/SpeakButton';
import Questions from './reading/Questions';

function makeVocabRegex(cleanW) {
  const chars = Array.from(cleanW);
  const parts = chars.map((c) => {
    const escaped = c.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    return escaped + '(\\{[^}]+\\})?';
  });
  return parts.join('');
}

function tokenizeParagraph(paragraph, vocabList) {
  if (!paragraph) return [];

  // Filter valid vocab words to match
  const validVocabs = vocabList
    .map((v) => {
      const cleanW = v.w.replace(/\([^)]*\)/g, '').replace(/[～~]/g, '').trim();
      return { ...v, cleanW };
    })
    .filter((v) => v.cleanW.length >= 2 || /[一-鿿]/.test(v.cleanW));

  // Sort longest words first
  validVocabs.sort((a, b) => b.cleanW.length - a.cleanW.length);

  // Ranges of ruby readings "{...}" – a vocab match must never start inside one,
  // otherwise it would split the furigana markup (e.g. vocab "つく" vs 作{つく}).
  const readingRanges = [];
  for (const rm of paragraph.matchAll(/\{[^}]*\}/g)) {
    readingRanges.push([rm.index, rm.index + rm[0].length]);
  }
  const insideReading = (pos) => readingRanges.some(([s, e]) => pos >= s && pos < e);

  const matches = [];
  for (const v of validVocabs) {
    const pat = makeVocabRegex(v.cleanW);
    const reg = new RegExp(pat, 'g');
    let m;
    while ((m = reg.exec(paragraph)) !== null) {
      const start = m.index;
      const end = m.index + m[0].length;
      if (insideReading(start)) continue;
      const overlaps = matches.some((x) => !(end <= x.start || start >= x.end));
      if (!overlaps) {
        matches.push({ start, end, vocab: v, raw: m[0] });
      }
    }
  }

  matches.sort((a, b) => a.start - b.start);

  const segments = [];
  let curr = 0;
  for (const m of matches) {
    if (m.start > curr) {
      segments.push({ type: 'text', text: paragraph.slice(curr, m.start) });
    }
    segments.push({ type: 'vocab', text: m.raw, vocab: m.vocab });
    curr = m.end;
  }
  if (curr < paragraph.length) {
    segments.push({ type: 'text', text: paragraph.slice(curr) });
  }

  return segments;
}

export default function Reading() {
  const { id } = useParams();
  const navigate = useNavigate();
  const lessonId = parseInt(id, 10) || 1;
  const lesson = getLesson(lessonId);

  const {
    settings,
    updateSettings,
    isVocabKnown,
    toggleVocabKnown,
    getReadingScore,
    saveReadingScore,
    setRecent,
  } = useProgress();

  const [furigana, setFurigana] = useState(settings.furigana);
  const [showTranslation, setShowTranslation] = useState(settings.showTranslation);
  const [fontSize, setFontSize] = useState(settings.fontSize || 'md');
  const [activeVocabPopover, setActiveVocabPopover] = useState(null);
  const [showVocabAccordion, setShowVocabAccordion] = useState(false);

  // Audio reading state
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [playingParagraphIdx, setPlayingParagraphIdx] = useState(-1);

  // Stop audio when unmounting or switching lesson
  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, [lessonId]);

  // Update recent activity
  useEffect(() => {
    if (lesson) {
      setRecent({
        type: 'reading',
        lessonId: lesson.id,
        title: `Bài ${lesson.id}: ${lesson.titleVi}`,
      });
    }
  }, [lesson, setRecent]);

  // If invalid lesson id, redirect to list
  if (!lesson) {
    return (
      <div className="container page-content">
        <p>Không tìm thấy bài học này.</p>
        <Link to="/reading" className="btn btn-primary">
          Về danh sách bài đọc
        </Link>
      </div>
    );
  }

  const savedScore = getReadingScore(lesson.id);

  // Tokenize all paragraphs with lesson vocab
  const tokenizedParagraphs = useMemo(() => {
    const rawParagraphs = lesson.reading.paragraphs || [];
    return rawParagraphs.map((p) => tokenizeParagraph(p, lesson.vocab || []));
  }, [lesson]);

  function handleStartAudio() {
    if (isPlayingAudio) {
      stopSpeaking();
      setIsPlayingAudio(false);
      setPlayingParagraphIdx(-1);
      return;
    }

    setIsPlayingAudio(true);
    speakParagraphs(lesson.reading.paragraphs, {
      onParagraphChange: (idx) => {
        setPlayingParagraphIdx(idx);
        // Scroll paragraph into view smoothly if needed
        const el = document.getElementById(`paragraph-${idx}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      },
      onEnd: () => {
        setIsPlayingAudio(false);
        setPlayingParagraphIdx(-1);
      },
      onError: () => {
        setIsPlayingAudio(false);
        setPlayingParagraphIdx(-1);
      },
    });
  }

  function handleScoreSave(score, total) {
    saveReadingScore(lesson.id, score, total);
  }

  return (
    <div className={`reading-detail-page font-size-${fontSize}`}>
      {/* Sticky Toolbar */}
      <div className="reading-sticky-toolbar">
        <div className="toolbar-inner">
          <div className="toolbar-group">
            <label className="toggle-switch-label">
              <input
                type="checkbox"
                checked={furigana}
                onChange={(e) => {
                  setFurigana(e.target.checked);
                  updateSettings({ furigana: e.target.checked });
                }}
              />
              <span className="switch-slider" />
              <span className="toggle-text">Furigana</span>
            </label>

            <label className="toggle-switch-label">
              <input
                type="checkbox"
                checked={showTranslation}
                onChange={(e) => {
                  setShowTranslation(e.target.checked);
                  updateSettings({ showTranslation: e.target.checked });
                }}
              />
              <span className="switch-slider" />
              <span className="toggle-text">Bản dịch</span>
            </label>
          </div>

          <div className="toolbar-group">
            {/* Font size control */}
            <div className="font-size-controls" role="group" aria-label="Cỡ chữ">
              <button
                type="button"
                className={`size-btn ${fontSize === 'sm' ? 'active' : ''}`}
                onClick={() => {
                  setFontSize('sm');
                  updateSettings({ fontSize: 'sm' });
                }}
                title="Cỡ chữ nhỏ"
              >
                A-
              </button>
              <button
                type="button"
                className={`size-btn ${fontSize === 'md' ? 'active' : ''}`}
                onClick={() => {
                  setFontSize('md');
                  updateSettings({ fontSize: 'md' });
                }}
                title="Cỡ chữ vừa"
              >
                A
              </button>
              <button
                type="button"
                className={`size-btn ${fontSize === 'lg' ? 'active' : ''}`}
                onClick={() => {
                  setFontSize('lg');
                  updateSettings({ fontSize: 'lg' });
                }}
                title="Cỡ chữ lớn"
              >
                A+
              </button>
            </div>

            {/* Read full audio button */}
            {isSpeechSupported() && (
              <button
                type="button"
                className={`btn btn-audio-play ${isPlayingAudio ? 'is-playing' : ''}`}
                onClick={handleStartAudio}
                title={isPlayingAudio ? 'Dừng đọc' : 'Đọc cả bài bằng giọng Nhật'}
              >
                {isPlayingAudio ? (
                  <>
                    <Icon name="stop" size={16} className="audio-anim-icon" /> Dừng đọc
                  </>
                ) : (
                  <>
                    <Icon name="volume" size={18} /> Đọc cả bài
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="container reading-content-container">
        {/* Breadcrumb Navigation */}
        <div className="reading-breadcrumbs">
          <Link to="/reading" className="breadcrumb-link">
            ← Danh sách bài đọc
          </Link>
          <span className="breadcrumb-sep">/</span>
          <span className="breadcrumb-current">Bài {lesson.id}</span>
        </div>

        {/* Article Header */}
        <header className="reading-article-header">
          <div className="lesson-badge-header">
            <span>Bài {lesson.id}</span>
            <span className="pages-info">Trang {lesson.bookPages}</span>
          </div>
          <h1 className="reading-title-ja">
            <Ruby text={lesson.title} show={furigana} />
          </h1>
          <p className="reading-title-vi">{lesson.titleVi}</p>
        </header>

        {/* Main Japanese Article Text */}
        <article className="reading-article-body">
          {tokenizedParagraphs.map((segments, pIdx) => {
            const isPlayingThis = isPlayingAudio && playingParagraphIdx === pIdx;
            const translation = lesson.reading.translationVi?.[pIdx];

            return (
              <React.Fragment key={pIdx}>
                <div
                  id={`paragraph-${pIdx}`}
                  className={`reading-paragraph-wrap ${isPlayingThis ? 'paragraph-speaking' : ''}`}
                >
                  <div className="paragraph-badge">第{pIdx + 1}段落</div>
                  <p className="paragraph-text-ja">
                    {segments.map((seg, sIdx) => {
                      if (seg.type === 'text') {
                        return <Ruby key={sIdx} text={seg.text} show={furigana} />;
                      }

                      // Vocab highlighted word
                      const v = seg.vocab;
                      const popoverKey = `${pIdx}-${sIdx}`;
                      const isPopoverOpen = activeVocabPopover === popoverKey;
                      const isKnown = isVocabKnown(v.id);

                      return (
                        <span
                          key={sIdx}
                          className={`vocab-highlight-word ${isKnown ? 'is-known' : ''}`}
                          tabIndex="0"
                          role="button"
                          aria-label={`Từ vựng: ${v.w}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveVocabPopover(isPopoverOpen ? null : popoverKey);
                          }}
                          onMouseEnter={() => setActiveVocabPopover(popoverKey)}
                          onMouseLeave={() => setActiveVocabPopover(null)}
                        >
                          <Ruby text={seg.text} show={furigana} />

                          {/* Lookup popover */}
                          {isPopoverOpen && (
                            <span
                              className="vocab-lookup-popover"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <span className="popover-top-row">
                                <strong className="popover-word">{v.w}</strong>
                                <span className="popover-reading">【{v.r}】</span>
                                <SpeakButton text={v.w} size="sm" />
                              </span>
                              {v.note && (
                                <span className="popover-note"><Icon name="note" size={13} /> {v.note}</span>
                              )}
                              <span className="popover-vi">{v.vi}</span>
                              <button
                                type="button"
                                className={`popover-known-btn ${isKnown ? 'known' : ''}`}
                                onClick={() => toggleVocabKnown(v.id)}
                              >
                                {isKnown ? <><Icon name="check" size={14} /> Đã thuộc</> : <><Icon name="plus" size={14} /> Đánh dấu đã thuộc</>}
                              </button>
                            </span>
                          )}
                        </span>
                      );
                    })}
                  </p>

                  {/* Vietnamese translation */}
                  {showTranslation && translation && (
                    <div className="paragraph-translation-vi">
                      <span className="trans-label" aria-label="Bản dịch tiếng Việt">VI</span> {translation}
                    </div>
                  )}
                </div>

                {/* Lesson 2 Table insertion */}
                {lesson.reading.table && lesson.reading.table.afterParagraph === pIdx && (
                  <div className="lesson-reading-table-wrap">
                    <table className="reading-custom-table">
                      {lesson.reading.table.headers && (
                        <thead>
                          <tr>
                            {lesson.reading.table.headers.map((h, hIdx) => (
                              <th key={hIdx}>
                                <Ruby text={h} show={furigana} />
                              </th>
                            ))}
                          </tr>
                        </thead>
                      )}
                      <tbody>
                        {lesson.reading.table.rows.map((row, rIdx) => (
                          <tr key={rIdx}>
                            {row.map((cell, cIdx) => (
                              <td key={cIdx}>
                                <Ruby text={cell} show={furigana} />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </article>

        {/* Vocab of Lesson Accordion */}
        <section className="lesson-vocab-accordion">
          <button
            type="button"
            className="accordion-toggle-btn"
            onClick={() => setShowVocabAccordion((prev) => !prev)}
            aria-expanded={showVocabAccordion}
          >
            <span className="accordion-title">
              <Icon name="vocab" size={20} /> Từ vựng của bài ({lesson.vocab?.length || 0} từ)
            </span>
            <span className="accordion-arrow">
              {showVocabAccordion ? '▲ Thu gọn' : '▼ Mở rộng'}
            </span>
          </button>

          {showVocabAccordion && (
            <div className="accordion-content">
              <div className="vocab-accordion-grid">
                {lesson.vocab.map((v, idx) => {
                  const vocabId = `${lesson.id}:${idx}`;
                  const isKnown = isVocabKnown(vocabId);

                  return (
                    <div
                      key={idx}
                      className={`accordion-vocab-card ${isKnown ? 'is-known' : ''}`}
                    >
                      <div className="card-top">
                        <div className="word-and-reading">
                          <strong className="card-word">{v.w}</strong>
                          <span className="card-reading">{v.r}</span>
                        </div>
                        <div className="card-actions">
                          <SpeakButton text={v.w} size="sm" />
                          <button
                            type="button"
                            className={`known-check-btn ${isKnown ? 'active' : ''}`}
                            onClick={() => toggleVocabKnown(vocabId)}
                            title={isKnown ? 'Bỏ đánh dấu' : 'Đánh dấu đã thuộc'}
                          >
                            {isKnown ? <><Icon name="check" size={13} /> Thuộc</> : 'Chưa'}
                          </button>
                        </div>
                      </div>
                      {v.note && <div className="card-note"><Icon name="note" size={13} /> {v.note}</div>}
                      <div className="card-vi">{v.vi}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* Comprehension Questions */}
        <Questions
          questions={lesson.questions || []}
          lessonId={lesson.id}
          savedScore={savedScore}
          onSaveScore={handleScoreSave}
        />

        {/* Prev / Next Lesson Navigation */}
        <nav className="lesson-bottom-nav" aria-label="Chuyển bài học">
          {lesson.id > 1 ? (
            <button
              type="button"
              className="btn btn-secondary nav-prev-btn"
              onClick={() => navigate(`/reading/${lesson.id - 1}`)}
            >
              ← Bài {lesson.id - 1}
            </button>
          ) : (
            <div />
          )}

          <Link to="/reading" className="btn btn-outline nav-list-btn">
            Danh sách 8 bài
          </Link>

          {lesson.id < 8 ? (
            <button
              type="button"
              className="btn btn-primary nav-next-btn"
              onClick={() => navigate(`/reading/${lesson.id + 1}`)}
            >
              Bài {lesson.id + 1} →
            </button>
          ) : (
            <div />
          )}
        </nav>
      </div>
    </div>
  );
}
