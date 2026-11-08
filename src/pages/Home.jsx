import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { lessons, allKanji, allVocab, kanjiLessons } from '../lib/data';
import { useProgress } from '../lib/progress';
import { useReveal } from '../lib/useReveal';
import Ruby from '../components/Ruby';
import Icon from '../components/Icon';
import CountUp from '../components/CountUp';
import './grammar/home-grammar.css';
import heroImg from '../assets/hero-maple.jpg';
import toriiImg from '../assets/torii.svg';
import sakuraA from '../assets/sakura-a.svg';
import sakuraB from '../assets/sakura-b.svg';
import sakuraC from '../assets/sakura-c.svg';

const PETALS = [
  { src: sakuraA, left: '10%', size: 18, delay: '0s', duration: '11s', sway: '30px', rotStart: 0, rotEnd: 240 },
  { src: sakuraB, left: '24%', size: 14, delay: '3.2s', duration: '14s', sway: '-25px', rotStart: -40, rotEnd: 200 },
  { src: sakuraC, left: '38%', size: 22, delay: '1.5s', duration: '10s', sway: '40px', rotStart: 25, rotEnd: 290 },
  { src: sakuraA, left: '52%', size: 16, delay: '5.8s', duration: '13s', sway: '-30px', rotStart: -70, rotEnd: 190 },
  { src: sakuraB, left: '68%', size: 20, delay: '0.8s', duration: '12s', sway: '35px', rotStart: 15, rotEnd: 275 },
  { src: sakuraC, left: '79%', size: 15, delay: '4.2s', duration: '15s', sway: '-28px', rotStart: -30, rotEnd: 220 },
  { src: sakuraA, left: '88%', size: 21, delay: '2.1s', duration: '11.5s', sway: '32px', rotStart: 45, rotEnd: 310 },
  { src: sakuraB, left: '96%', size: 17, delay: '6.5s', duration: '13.5s', sway: '-35px', rotStart: -50, rotEnd: 210 },
];

function Meter({ label, value, text, tone }) {
  return (
    <div className="meter">
      <div className="meter-row">
        <span className="meter-label">{label}</span>
        <span className="meter-text">{text}</span>
      </div>
      <div
        className="meter-track"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
      >
        <div className={`meter-fill tone-${tone}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

const FILTERS = [
  ['all', 'Tất cả'],
  ['todo', 'Chưa học'],
  ['doing', 'Đang học'],
  ['done', 'Đã xong'],
];

export default function Home() {
  const navigate = useNavigate();
  const { stats, recent } = useProgress();
  const [filter, setFilter] = useState('all');
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

  useReveal([filter]);

  const lessonRows = useMemo(
    () =>
      lessons.map((lesson) => {
        const st = stats.getLessonStats(lesson.id);
        const touched = st.vocabKnown + st.kanjiKnown + st.grammarKnown > 0 || st.readingScore != null;
        const done =
          st.vocabPercent >= 100 &&
          st.kanjiPercent >= 100 &&
          st.grammarPercent >= 100 &&
          st.readingScore != null;
        return { lesson, st, status: done ? 'done' : touched ? 'doing' : 'todo' };
      }),
    [stats]
  );

  const visibleRows = lessonRows.filter((r) => filter === 'all' || r.status === filter);
  const readingDone = lessonRows.filter((r) => r.st.readingScore != null).length;

  // Gợi ý: 3 bài chưa xong, ưu tiên bài đang học
  const suggestions = [...lessonRows]
    .filter((r) => r.status !== 'done')
    .sort((a, b) => (a.status === 'doing' ? -1 : 1) - (b.status === 'doing' ? -1 : 1) || a.lesson.id - b.lesson.id)
    .slice(0, 3);

  // Mẹo nhớ kanji của ngày (ổn định theo ngày)
  const dayIndex = Math.floor(Date.now() / 86400000);
  const kanjiOfDay = allKanji.filter((k) => k.tip)[dayIndex % allKanji.filter((k) => k.tip).length];

  const counts = {
    list: allVocab.filter((v) => v.src === 'list').length,
    index: allVocab.filter((v) => v.src === 'index').length,
    extra: allVocab.filter((v) => v.src === 'extra').length,
  };

  function handleResumeRecent() {
    if (!recent) return;
    if (recent.type === 'reading' && recent.lessonId) navigate(`/reading/${recent.lessonId}`);
    else if (recent.type === 'grammar') {
      if (recent.lessonId) navigate(`/grammar?lesson=${recent.lessonId}`);
      else navigate('/grammar');
    }
    else if (recent.type === 'vocab') navigate('/vocab');
    else if (recent.type === 'kanji') navigate('/kanji');
    else navigate('/reading');
  }

  const skills = [
    {
      to: '/vocab',
      title: 'Từ vựng',
      desc: 'Danh sách, thẻ ghi nhớ, trắc nghiệm và gõ cách đọc cho cả từ trong bài lẫn từ N3–N2.',
      tags: [`${allVocab.length} từ`, 'Flashcard', 'Trắc nghiệm'],
      value: pct(stats.knownVocabCount, stats.totalVocabCount),
      text: (
        <>
          <CountUp to={stats.knownVocabCount} duration={900} />/{stats.totalVocabCount} từ đã thuộc
        </>
      ),
    },
    {
      to: '/kanji',
      title: 'Chữ Hán',
      desc: '193 chữ với âm Hán Việt, âm On・Kun, mẹo nhớ và từ ví dụ.',
      tags: ['Hán Việt', 'Mẹo nhớ', 'On・Kun'],
      value: pct(stats.knownKanjiCount, stats.totalKanjiCount),
      text: (
        <>
          <CountUp to={stats.knownKanjiCount} duration={900} />/{stats.totalKanjiCount} chữ đã thuộc
        </>
      ),
    },
    {
      to: '/grammar',
      title: 'Ngữ pháp',
      desc: '56 mẫu câu chính và 13 mục mở rộng kèm công thức, lưu ý, ví dụ và luyện tập trắc nghiệm.',
      tags: [`${stats.totalGrammarCount} mẫu`, 'Công thức', 'Luyện tập'],
      value: stats.grammarPercent,
      text: (
        <>
          <CountUp to={stats.knownGrammarCount} duration={900} />/{stats.totalGrammarCount} mẫu đã thuộc
        </>
      ),
    },
    {
      to: '/reading',
      title: 'Đọc hiểu',
      desc: 'Bài đọc có furigana bật/tắt, bản dịch, tra từ tức thì, đọc to và 6 dạng câu hỏi.',
      tags: ['Furigana', 'Bản dịch', 'Đọc to'],
      value: pct(readingDone, lessons.length),
      text: (
        <>
          <CountUp to={readingDone} duration={900} />/{lessons.length} bài đã làm
        </>
      ),
    },
  ];

  return (
    <div className="home-page">
      {/* ---------- Hero ---------- */}
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-img-wrap" aria-hidden="true">
          <img className="hero-img" src={heroImg} alt="" width="1920" height="1280" fetchpriority="high" decoding="async" />
        </div>
        <div className="hero-overlay" aria-hidden="true" />
        <div className="hero-petals" aria-hidden="true">
          {PETALS.map((p, i) => (
            <span
              key={i}
              className="petal m-petal"
              aria-hidden="true"
              style={{
                left: p.left,
                width: `${p.size}px`,
                height: `${p.size}px`,
                animationDuration: p.duration,
                animationDelay: p.delay,
                '--sway': p.sway,
                '--rot-start': `${p.rotStart}deg`,
                '--rot-end': `${p.rotEnd}deg`,
              }}
            >
              <img src={p.src} alt="" />
            </span>
          ))}
        </div>

        <div className="container hero-inner">
          <span className="hero-accent" aria-hidden="true" />
          <p className="hero-eyebrow m-hero-enter" style={{ animationDelay: '0ms' }}>
            <span lang="ja">中級前期</span> · Tiếng Nhật trung cấp
          </p>
          <h1 id="hero-title" className="hero-title m-hero-enter" style={{ animationDelay: '90ms' }}>
            Chinh phục tiếng Nhật trung cấp, <span lang="ja">中級を学ぼう</span>
          </h1>
          <p className="hero-lead m-hero-enter" style={{ animationDelay: '180ms' }}>
            Từ vựng, chữ Hán, ngữ pháp và đọc hiểu theo từng bài của giáo trình — mỗi ngày một ít, tiến độ được lưu ngay trên máy bạn.
          </p>
          <div className="hero-actions m-hero-enter" style={{ animationDelay: '270ms' }}>
            {recent ? (
              <button type="button" className="btn btn-primary btn-large" onClick={handleResumeRecent}>
                Học tiếp: {recent.title || (recent.type === 'grammar' ? 'Ngữ pháp' : 'bài gần nhất')}
                {recent.type === 'grammar' && recent.lessonId ? ` Bài ${recent.lessonId}` : ''} →
              </button>
            ) : (
              <Link to="/reading/1" className="btn btn-primary btn-large">Bắt đầu từ bài 1 →</Link>
            )}
            <a href="#muc-luc" className="btn btn-ghost-light btn-large">Xem mục lục</a>
          </div>
        </div>
      </section>

      <div className="home-body">
        <div className="container">
          {/* ---------- Featured skills ---------- */}
          <section className="home-section" aria-labelledby="skills-title">
            <div className="section-head">
              <div>
                <h2 id="skills-title" className="section-heading">Bốn kỹ năng chính</h2>
                <p className="section-sub">Chọn một kỹ năng để bắt đầu luyện hôm nay.</p>
              </div>
            </div>
            <div className="featured-grid">
              {skills.map((s, i) => (
                <Link
                  key={s.to}
                  to={s.to}
                  className="featured-card reveal"
                  style={{ '--i': i }}
                >
                  <div className="featured-band">
                    <span className="featured-badge">★ Kỹ năng</span>
                    <span className="featured-num" aria-hidden="true">0{i + 1}</span>
                  </div>
                  <div className="featured-body">
                    <h3 className="featured-title">{s.title}</h3>
                    <p className="featured-desc">{s.desc}</p>
                    <ul className="tag-row" aria-label="Nội dung">
                      {s.tags.map((t) => <li key={t} className="tag">{t}</li>)}
                    </ul>
                    <hr className="divider" />
                    <Meter label="Tiến độ" value={s.value} text={s.text} tone="seal" />
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* ---------- Two columns ---------- */}
          <div className="home-columns">
            <aside className="home-side" aria-labelledby="side-title">
              <div className="section-head section-head-col">
                <h2 id="side-title" className="section-heading">Gợi ý cho bạn</h2>
                <p className="section-sub">Ôn tập theo nguồn từ và bài tiếp theo.</p>
              </div>

              <div className="side-panel">
                <div className="side-panel-head">
                  <img src={toriiImg} alt="" width="38" height="32" className="torii-float" />
                  <span>Dành riêng cho bạn</span>
                </div>
                <div className="side-panel-body">
                  <p className="side-label">Chủ đề ôn tập</p>
                  <ul className="tag-row tag-row-wrap">
                    <li><Link className="tag tag-link" to="/vocab?src=list">#TừTrongBài ({counts.list})</Link></li>
                    <li><Link className="tag tag-link" to="/vocab?src=index">#Từ索引 ({counts.index})</Link></li>
                    <li><Link className="tag tag-link" to="/vocab?src=extra">#N3N2 ({counts.extra})</Link></li>
                    <li><Link className="tag tag-link" to="/kanji">#HánViệt</Link></li>
                    <li><Link className="tag tag-link" to="/grammar">#NgữPháp ({stats.totalGrammarCount})</Link></li>
                    <li><Link className="tag tag-link" to="/reading/1">#Furigana</Link></li>
                  </ul>

                  <hr className="divider" />
                  <p className="side-label">Bài gợi ý</p>
                  <ul className="suggest-list">
                    {suggestions.map(({ lesson, st }) => {
                      const firstKanji = kanjiLessons.find((k) => k.lesson === lesson.id)?.kanji[0]?.k || '学';
                      return (
                        <li key={lesson.id}>
                          <Link to={`/reading/${lesson.id}`} className="suggest-item">
                            <span className="suggest-thumb" aria-hidden="true" lang="ja">{firstKanji}</span>
                            <span className="suggest-text">
                              <span className="suggest-title"><span className="sr-only">Bài {lesson.id}: </span><Ruby text={lesson.title} show={false} /></span>
                              <span className="suggest-meta">Bài {lesson.id} · {st.vocabTotal} từ · {st.kanjiTotal} kanji · {st.grammarTotal} ngữ pháp</span>
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>

                  {kanjiOfDay && (
                    <>
                      <hr className="divider" />
                      <p className="side-label">Mẹo nhớ kanji hôm nay</p>
                      <Link to="/kanji" className="kod">
                        <span className="kod-char" lang="ja">{kanjiOfDay.k}</span>
                        <span className="kod-text">
                          <span className="kod-hv">{kanjiOfDay.hv} <span className="kod-mean">· {kanjiOfDay.mean}</span></span>
                          <span className="kod-tip">{kanjiOfDay.tip}</span>
                        </span>
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </aside>

            <section className="home-main" id="muc-luc" aria-labelledby="toc-title">
              <div className="section-head section-head-col">
                <h2 id="toc-title" className="section-heading">Mục lục 8 bài</h2>
                <p className="section-sub">Mỗi bài có từ vựng, kanji, ngữ pháp và bài đọc riêng.</p>
              </div>

              <div className="chip-row" role="group" aria-label="Lọc bài học theo tiến độ">
                {FILTERS.map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    className={`chip ${filter === id ? 'chip-selected' : ''}`}
                    aria-pressed={filter === id}
                    onClick={() => setFilter(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <ol className="post-list">
                {visibleRows.map(({ lesson, st }, i) => (
                  <li
                    key={lesson.id}
                    className="post-card reveal"
                    style={{ '--i': i }}
                  >
                    <div className="post-head">
                      <span className="post-avatar" aria-hidden="true">{lesson.id}</span>
                      <div className="post-info">
                        <h3 className="post-title" lang="ja"><Ruby text={lesson.title} show={true} /></h3>
                        <p className="post-sub">Bài {lesson.id} · {lesson.titleVi} · tr. {lesson.bookPages}</p>
                      </div>
                    </div>
                    <div className="toc-meters">
                      <Meter
                        label="Từ vựng"
                        value={st.vocabPercent}
                        text={<><CountUp to={st.vocabKnown} duration={900} />/{st.vocabTotal}</>}
                        tone="ink"
                      />
                      <Meter
                        label="Kanji"
                        value={st.kanjiPercent}
                        text={<><CountUp to={st.kanjiKnown} duration={900} />/{st.kanjiTotal}</>}
                        tone="seal"
                      />
                      <Meter
                        label="Ngữ pháp"
                        value={st.grammarPercent}
                        text={<><CountUp to={st.grammarKnown} duration={900} />/{st.grammarTotal}</>}
                        tone="grammar"
                      />
                      <Meter
                        label="Đọc hiểu"
                        value={st.readingPercent || 0}
                        text={st.readingScore != null ? <><CountUp to={st.readingScore} duration={900} />/{st.readingTotal}</> : '—'}
                        tone="moss"
                      />
                    </div>
                    <hr className="divider" />
                    <div className="post-actions">
                      <Link to="/vocab" className="pill-link" aria-label={`Từ vựng bài ${lesson.id}`}><Icon name="vocab" size={16} /> Từ vựng</Link>
                      <Link to="/kanji" className="pill-link" aria-label={`Kanji bài ${lesson.id}`}><Icon name="kanji" size={16} /> Kanji</Link>
                      <Link to={`/grammar?lesson=${lesson.id}`} className="pill-link" aria-label={`Ngữ pháp bài ${lesson.id}`}><Icon name="grammar" size={16} /> Ngữ pháp</Link>
                      <Link to={`/reading/${lesson.id}`} className="pill-link pill-link-strong" aria-label={`Đọc hiểu bài ${lesson.id}`}><Icon name="reading" size={16} /> Đọc hiểu</Link>
                    </div>
                  </li>
                ))}
              </ol>
              {visibleRows.length === 0 && (
                <p className="empty-note">Chưa có bài nào ở nhóm này. Hãy bắt đầu học hoặc chọn "Tất cả".</p>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
