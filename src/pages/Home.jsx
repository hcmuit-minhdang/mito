import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { lessons } from '../lib/data';
import { useProgress } from '../lib/progress';
import Ruby from '../components/Ruby';
import Icon from '../components/Icon';

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

export default function Home() {
  const navigate = useNavigate();
  const { stats, recent } = useProgress();

  const readingDone = lessons.filter((l) => stats.getLessonStats(l.id).readingScore != null).length;
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

  function handleResumeRecent() {
    if (!recent) return;
    if (recent.type === 'reading' && recent.lessonId) navigate(`/reading/${recent.lessonId}`);
    else if (recent.type === 'vocab') navigate('/vocab');
    else if (recent.type === 'kanji') navigate('/kanji');
    else navigate('/reading');
  }

  const skills = [
    {
      to: '/vocab',
      icon: 'vocab',
      title: 'Từ vựng',
      desc: 'Danh sách, thẻ ghi nhớ, trắc nghiệm và gõ cách đọc.',
      label: 'Đã thuộc',
      value: pct(stats.knownVocabCount, stats.totalVocabCount),
      text: `${stats.knownVocabCount}/${stats.totalVocabCount} từ`,
      tone: 'ink',
    },
    {
      to: '/kanji',
      icon: 'kanji',
      title: 'Chữ Hán',
      desc: 'Âm On・Kun, từ ví dụ, luyện đọc và chọn chữ.',
      label: 'Đã thuộc',
      value: pct(stats.knownKanjiCount, stats.totalKanjiCount),
      text: `${stats.knownKanjiCount}/${stats.totalKanjiCount} chữ`,
      tone: 'seal',
    },
    {
      to: '/reading',
      icon: 'reading',
      title: 'Đọc hiểu',
      desc: 'Furigana bật/tắt, bản dịch, tra từ, đọc to và 6 dạng câu hỏi.',
      label: 'Đã làm',
      value: pct(readingDone, lessons.length),
      text: `${readingDone}/${lessons.length} bài`,
      tone: 'moss',
    },
  ];

  return (
    <div className="home-page container page-content">
      {/* ---------- Hero ---------- */}
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow">Giáo trình 中級前期 · 8 bài</p>
          <h1 id="hero-title" className="hero-title">
            <span lang="ja">中級を学ぼう</span>
          </h1>
          <p className="hero-lead">
            Học từ vựng, chữ Hán và đọc hiểu theo từng bài của giáo trình — mỗi ngày một ít, tiến độ được lưu ngay trên máy bạn.
          </p>
          <div className="hero-actions">
            {recent ? (
              <button type="button" className="btn btn-primary btn-large" onClick={handleResumeRecent}>
                Học tiếp: {recent.title || 'bài gần nhất'}
                <Icon name="arrowRight" size={18} />
              </button>
            ) : (
              <Link to="/reading/1" className="btn btn-primary btn-large">
                Bắt đầu từ bài 1
                <Icon name="arrowRight" size={18} />
              </Link>
            )}
            <a href="#muc-luc" className="btn btn-outline btn-large">Xem mục lục</a>
          </div>
        </div>

        <aside className="hero-stats" aria-label="Tiến độ tổng quan">
          <h2 className="hero-stats-title">Tiến độ của bạn</h2>
          {skills.map((s) => (
            <Meter key={s.title} label={s.title} value={s.value} text={s.text} tone={s.tone} />
          ))}
        </aside>
      </section>

      {/* ---------- Skills ---------- */}
      <section className="home-section" aria-labelledby="skills-title">
        <div className="section-head">
          <h2 id="skills-title" className="section-heading">Ba kỹ năng</h2>
        </div>
        <div className="skills-grid">
          {skills.map((s, i) => (
            <Link key={s.to} to={s.to} className={`skill-card skill-${s.tone}`}>
              <span className="skill-index" aria-hidden="true">0{i + 1}</span>
              <span className="skill-icon-wrap"><Icon name={s.icon} size={24} /></span>
              <span className="skill-title">{s.title}</span>
              <span className="skill-desc">{s.desc}</span>
              <span className="skill-go">
                Mở <Icon name="arrowRight" size={16} />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ---------- Table of contents ---------- */}
      <section className="home-section" id="muc-luc" aria-labelledby="toc-title">
        <div className="section-head">
          <h2 id="toc-title" className="section-heading">
            <span lang="ja">目次</span> · Mục lục 8 bài
          </h2>
        </div>

        <ol className="toc">
          {lessons.map((lesson) => {
            const st = stats.getLessonStats(lesson.id);
            return (
              <li key={lesson.id} className="toc-item">
                <div className="toc-num" aria-hidden="true">{lesson.id}</div>

                <div className="toc-main">
                  <h3 className="toc-title" lang="ja">
                    <Ruby text={lesson.title} show={true} />
                  </h3>
                  <p className="toc-title-vi">
                    <span className="sr-only">Bài {lesson.id}: </span>
                    {lesson.titleVi}
                    <span className="toc-pages"> · tr. {lesson.bookPages}</span>
                  </p>
                </div>

                <div className="toc-meters">
                  <Meter label="Từ vựng" value={st.vocabPercent} text={`${st.vocabKnown}/${st.vocabTotal}`} tone="ink" />
                  <Meter label="Kanji" value={st.kanjiPercent} text={`${st.kanjiKnown}/${st.kanjiTotal}`} tone="seal" />
                  <Meter
                    label="Đọc hiểu"
                    value={st.readingPercent || 0}
                    text={st.readingScore != null ? `${st.readingScore}/${st.readingTotal}` : '—'}
                    tone="moss"
                  />
                </div>

                <div className="toc-actions">
                  <Link to="/vocab" className="chip-link" aria-label={`Từ vựng bài ${lesson.id}`}>
                    <Icon name="vocab" size={15} /> Từ vựng
                  </Link>
                  <Link to="/kanji" className="chip-link" aria-label={`Kanji bài ${lesson.id}`}>
                    <Icon name="kanji" size={15} /> Kanji
                  </Link>
                  <Link to={`/reading/${lesson.id}`} className="chip-link chip-link-strong" aria-label={`Đọc hiểu bài ${lesson.id}`}>
                    <Icon name="reading" size={15} /> Đọc hiểu
                  </Link>
                </div>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
