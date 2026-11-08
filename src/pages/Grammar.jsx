import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { allGrammar, getGrammarByLesson, lessons } from '../lib/data';
import { useProgress } from '../lib/progress';
import { stripRuby } from '../lib/ruby';
import { normalizeKana } from '../lib/kana';
import Icon from '../components/Icon';
import Ruby from '../components/Ruby';
import SpeakButton from '../components/SpeakButton';
import LessonFilter from '../components/LessonFilter';
import Tabs from '../components/Tabs';
import ProgressBar from '../components/ProgressBar';
import { useReveal } from '../lib/useReveal';
import ExampleLine from './grammar/ExampleLine';
import Practice from './grammar/Practice';
import './grammar/grammar.css';

const CIRCLED_NUMBERS = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];

export default function Grammar() {
  const {
    settings,
    updateSettings,
    isGrammarKnown,
    toggleGrammarKnown,
    setRecent,
  } = useProgress();

  const [params] = useSearchParams();

  // Filter states
  const [selectedLessons, setSelectedLessons] = useState(() => {
    const l = params.get('lesson');
    if (l) {
      const num = parseInt(l, 10);
      if (num >= 1 && num <= 8) return [num];
    }
    return [1, 2, 3, 4, 5, 6, 7, 8];
  });

  const [searchQuery, setSearchQuery] = useState(() => params.get('q') || '');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'main' | 'extra'
  const [onlyUnknown, setOnlyUnknown] = useState(false);

  // Tab state: 'list' | 'practice'
  const [activeTab, setActiveTab] = useState('list');

  // Collapse state for cards
  const [collapsedCards, setCollapsedCards] = useState({});

  // Sync with URL query parameters
  useEffect(() => {
    const q = params.get('q');
    if (q != null) setSearchQuery(q);
    const l = params.get('lesson');
    if (l) {
      const num = parseInt(l, 10);
      if (num >= 1 && num <= 8) {
        setSelectedLessons([num]);
      }
    }
  }, [params]);

  // Update recent activity
  useEffect(() => {
    setRecent({
      type: 'grammar',
      lessonId: selectedLessons.length === 1 ? selectedLessons[0] : null,
      title: 'Ngữ pháp',
    });
  }, [selectedLessons, setRecent]);

  // Settings values
  const furigana = settings.furigana !== false;
  const showTranslation = settings.showTranslation !== false;

  // Counts by type for current lesson filter
  const typeCounts = useMemo(() => {
    const byLesson = getGrammarByLesson(selectedLessons);
    const main = byLesson.filter((g) => !g.extra).length;
    const extra = byLesson.filter((g) => g.extra).length;
    return { all: byLesson.length, main, extra };
  }, [selectedLessons]);

  // Base list filtered by lesson, type, and search query
  const baseItems = useMemo(() => {
    let list = getGrammarByLesson(selectedLessons);

    if (filterType === 'main') {
      list = list.filter((g) => !g.extra);
    } else if (filterType === 'extra') {
      list = list.filter((g) => g.extra);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const qKana = normalizeKana(searchQuery);

      list = list.filter((g) => {
        const matchPattern =
          stripRuby(g.pattern).toLowerCase().includes(q) ||
          normalizeKana(g.pattern).includes(qKana);

        const matchMeaning = stripRuby(g.meaningVi).toLowerCase().includes(q);

        const matchConnection = (g.connection || []).some(
          (c) =>
            stripRuby(c).toLowerCase().includes(q) ||
            normalizeKana(c).includes(qKana)
        );

        const matchNotes = (g.notes || []).some(
          (n) =>
            stripRuby(n).toLowerCase().includes(q) ||
            normalizeKana(n).includes(qKana)
        );

        const matchExamples = (g.examples || []).some(
          (ex) =>
            stripRuby(ex.ja).toLowerCase().includes(q) ||
            normalizeKana(stripRuby(ex.ja)).includes(qKana) ||
            (ex.vi && ex.vi.toLowerCase().includes(q))
        );

        const matchId = g.id.toLowerCase().includes(q);

        return (
          matchPattern ||
          matchMeaning ||
          matchConnection ||
          matchNotes ||
          matchExamples ||
          matchId
        );
      });
    }

    return list;
  }, [selectedLessons, filterType, searchQuery]);

  // Apply "chỉ hiện mục chưa thuộc"
  const filteredItems = useMemo(
    () => (onlyUnknown ? baseItems.filter((g) => !isGrammarKnown(g.id)) : baseItems),
    [baseItems, onlyUnknown, isGrammarKnown]
  );

  // Khóa theo danh sách id (không chỉ số lượng): đổi bộ lọc mà số mục giữ nguyên (vd Bài 1 -> Bài 4, cùng 10 mục)
  // vẫn phải chạy lại để các thẻ mới được thêm class is-visible, nếu không chúng giữ opacity:0.
  const itemsKey = useMemo(() => filteredItems.map((g) => g.id).join(','), [filteredItems]);
  useReveal([itemsKey, activeTab]);

  // Known count in the filtered items
  const knownCountInFilter = filteredItems.filter((g) => isGrammarKnown(g.id)).length;

  // Group items by lesson (1..8)
  const groupedByLesson = useMemo(() => {
    const groups = [];
    const lessonNumbers = [1, 2, 3, 4, 5, 6, 7, 8];
    for (const num of lessonNumbers) {
      const items = filteredItems.filter((g) => g.lessonId === num);
      if (items.length > 0) {
        const lessonInfo = lessons.find((l) => l.id === num);
        groups.push({
          lessonId: num,
          lessonInfo,
          items,
        });
      }
    }
    return groups;
  }, [filteredItems]);

  const toggleCollapse = useCallback((id) => {
    setCollapsedCards((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }, []);

  const resetFilters = useCallback(() => {
    setSelectedLessons([1, 2, 3, 4, 5, 6, 7, 8]);
    setSearchQuery('');
    setFilterType('all');
    setOnlyUnknown(false);
  }, []);

  return (
    <div className="grammar-page container page-content">
      {/* Page Title */}
      <div className="page-header">
        <h1 className="page-title">Ngữ pháp</h1>
        <p className="page-subtitle">
          Tổng hợp 56 mẫu câu chính và 13 mục mở rộng từ 8 bài học 『中級を学ぼう』. Tra cứu công thức kết hợp, ý nghĩa, lưu ý và câu ví dụ minh họa kèm furigana.
        </p>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          { id: 'list', label: 'Tra cứu', icon: 'list', count: filteredItems.length },
          { id: 'practice', label: 'Luyện tập', icon: 'target' },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* Common Filter Panel */}
      <div className="g-filter-panel card">
        <LessonFilter
          selectedLessons={selectedLessons}
          onChange={setSelectedLessons}
          multiple={true}
        />

        {/* Type Filter */}
        <div className="g-type-filter" role="group" aria-label="Loại ngữ pháp">
          <span className="filter-title">Loại:</span>
          {[
            ['all', `Tất cả (${typeCounts.all})`],
            ['main', `Mục chính (${typeCounts.main})`],
            ['extra', `Mở rộng (α) (${typeCounts.extra})`],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`filter-pill ${filterType === id ? 'active' : ''}`}
              aria-pressed={filterType === id}
              onClick={() => setFilterType(id)}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Search & Only Unknown */}
        <div className="g-filter-controls-row">
          <div className="search-input-wrap">
            <Icon name="search" size={18} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Tìm mẫu câu, tiếng Nhật, nghĩa tiếng Việt, lưu ý..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Tìm kiếm ngữ pháp"
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
            <span>Chỉ hiện mục chưa thuộc</span>
          </label>
        </div>

        {/* Toolbar switches: Furigana & Translation */}
        <div className="g-toolbar-switches">
          <label className="toggle-switch-label">
            <input
              type="checkbox"
              checked={furigana}
              onChange={(e) => updateSettings({ furigana: e.target.checked })}
            />
            <span className="switch-slider" />
            <span className="toggle-text">Furigana</span>
          </label>

          <label className="toggle-switch-label">
            <input
              type="checkbox"
              checked={showTranslation}
              onChange={(e) => updateSettings({ showTranslation: e.target.checked })}
            />
            <span className="switch-slider" />
            <span className="toggle-text">Bản dịch tiếng Việt</span>
          </label>
        </div>

        {/* Progress Display */}
        <div className="g-progress-row">
          <ProgressBar
            value={knownCountInFilter}
            max={filteredItems.length}
            label={`Đã thuộc: ${knownCountInFilter} / ${filteredItems.length}`}
            showPercent={true}
          />
        </div>

        {/* Stats Strip */}
        <div className="g-stats-strip">
          <span>
            Hiển thị <strong>{filteredItems.length}</strong> mục ngữ pháp
          </span>
          <span className="stat-sep">·</span>
          <span>
            Đã thuộc: <strong>{knownCountInFilter}</strong> / {filteredItems.length} (
            {filteredItems.length
              ? Math.round((knownCountInFilter / filteredItems.length) * 100)
              : 0}
            %)
          </span>
        </div>
      </div>

      {/* TAB 1: TRA CỨU */}
      {activeTab === 'list' && (
        <div className="g-tab-pane-list">
          {filteredItems.length === 0 ? (
            <div className="g-empty-state card">
              <Icon name="search" size={32} />
              <p>Không tìm thấy mẫu ngữ pháp nào phù hợp với bộ lọc hiện tại.</p>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={resetFilters}
              >
                Xóa bộ lọc
              </button>
            </div>
          ) : (
            groupedByLesson.map((group) => (
              <section
                key={group.lessonId}
                className="g-lesson-group"
                aria-labelledby={`lesson-heading-${group.lessonId}`}
              >
                <div className="g-lesson-header">
                  <h2
                    id={`lesson-heading-${group.lessonId}`}
                    className="g-lesson-title"
                  >
                    <span>Bài {group.lessonId}:</span>
                    <Ruby text={group.lessonInfo?.title} show={furigana} />
                    {group.lessonInfo?.titleVi && (
                      <span className="g-lesson-title-vi">
                        ({group.lessonInfo.titleVi})
                      </span>
                    )}
                  </h2>
                  <span className="g-lesson-count-badge">
                    {group.items.length} mẫu
                  </span>
                </div>

                <div className="g-cards-list">
                  {group.items.map((item, idx) => {
                    const isKnown = isGrammarKnown(item.id);
                    const isCollapsed = Boolean(collapsedCards[item.id]);

                    return (
                      <article
                        key={item.id}
                        className={`g-card reveal ${isKnown ? 'is-known' : ''}`}
                        style={{ '--i': Math.min(idx, 8) }}
                      >
                        <div className="g-card-header">
                          <div className="g-card-meta">
                            <span className="g-badge-no">Mục {item.no}</span>
                            {item.extra && (
                              <span
                                className="g-badge-extra"
                                title="Mục ngữ pháp mở rộng (α)"
                              >
                                Mở rộng α
                              </span>
                            )}
                          </div>

                          <div className="g-card-actions">
                            <button
                              type="button"
                              className={`btn-known-toggle ${isKnown ? 'active' : ''}`}
                              onClick={() => toggleGrammarKnown(item.id)}
                              aria-pressed={isKnown}
                              title={isKnown ? 'Bỏ đánh dấu' : 'Đánh dấu đã thuộc'}
                            >
                              {isKnown ? (
                                <>
                                  <Icon name="check" size={14} /> Đã thuộc
                                </>
                              ) : (
                                'Chưa thuộc'
                              )}
                            </button>

                            <button
                              type="button"
                              className="g-collapse-btn"
                              aria-expanded={!isCollapsed}
                              onClick={() => toggleCollapse(item.id)}
                              title={isCollapsed ? 'Mở rộng chi tiết' : 'Thu gọn chi tiết'}
                            >
                              <Icon
                                name={isCollapsed ? 'arrowDown' : 'arrowUp'}
                                size={14}
                              />
                              <span className="g-collapse-btn-text">
                                {isCollapsed ? 'Chi tiết' : 'Thu gọn'}
                              </span>
                            </button>
                          </div>
                        </div>

                        {/* Pattern Row */}
                        <div className="g-pattern-row">
                          <div className="g-pattern-title-wrap">
                            <span className="g-pattern-text">
                              <Ruby text={item.pattern} show={furigana} />
                            </span>
                            <SpeakButton
                              text={stripRuby(item.pattern)}
                              size="sm"
                            />
                          </div>
                        </div>

                        {/* Meaning (Vietnamese) */}
                        <div className="g-meaning-block">
                          <Ruby
                            text={item.meaningVi}
                            show={furigana}
                            className="g-meaning-text"
                          />
                        </div>

                        {/* Collapsible Details */}
                        {!isCollapsed && (
                          <div className="g-card-body">
                            {/* Connection block if present */}
                            {item.connection && item.connection.length > 0 && (
                              <div className="g-connection-block">
                                <div className="g-block-label">
                                  <Icon name="grammar" size={14} /> Cách kết hợp
                                </div>
                                <ul className="g-connection-list">
                                  {item.connection.map((conn, cIdx) => (
                                    <li key={cIdx} className="g-connection-item">
                                      <Ruby text={conn} show={furigana} />
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Notes block if present */}
                            {item.notes && item.notes.length > 0 && (
                              <div className="g-notes-block">
                                <div className="g-block-label">
                                  <Icon name="note" size={14} /> Lưu ý
                                </div>
                                <ul className="g-notes-list">
                                  {item.notes.map((note, nIdx) => (
                                    <li key={nIdx} className="g-notes-item">
                                      <Ruby text={note} show={furigana} />
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Examples block if present */}
                            {item.examples && item.examples.length > 0 && (
                              <div className="g-examples-block">
                                <div className="g-block-label">
                                  <Icon name="list" size={14} /> Ví dụ
                                </div>
                                <div className="g-examples-list">
                                  {item.examples.map((ex, eIdx) => (
                                    <div key={eIdx} className="g-example-item">
                                      <div className="g-example-ja-row">
                                        <span className="g-example-num">
                                          {CIRCLED_NUMBERS[eIdx] || `${eIdx + 1}.`}
                                        </span>
                                        <ExampleLine
                                          ja={ex.ja}
                                          hl={ex.hl}
                                          show={furigana}
                                        />
                                        <SpeakButton
                                          text={stripRuby(ex.ja)}
                                          size="sm"
                                        />
                                      </div>
                                      {showTranslation && ex.vi && (
                                        <div className="g-example-vi">
                                          {ex.vi}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              </section>
            ))
          )}
        </div>
      )}

      {/* TAB 2: LUYỆN TẬP */}
      {activeTab === 'practice' && (
        <div className="g-tab-pane-practice">
          <Practice items={filteredItems} />
        </div>
      )}
    </div>
  );
}
