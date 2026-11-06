import React from 'react';

const ALL_LESSON_IDS = [1, 2, 3, 4, 5, 6, 7, 8];

export default function LessonFilter({
  selectedLessons,
  onChange,
  multiple = true,
  className = '',
}) {
  const isAll =
    !selectedLessons ||
    selectedLessons.length === 0 ||
    selectedLessons.length === ALL_LESSON_IDS.length;

  function handleAllClick() {
    onChange(ALL_LESSON_IDS);
  }

  function handleLessonClick(id) {
    if (!multiple) {
      onChange([id]);
      return;
    }

    if (isAll) {
      // If was all, clicking a single lesson singles it out
      onChange([id]);
      return;
    }

    const current = new Set(selectedLessons || []);
    if (current.has(id)) {
      current.delete(id);
      if (current.size === 0) {
        // If nothing left, select all
        onChange(ALL_LESSON_IDS);
      } else {
        onChange(Array.from(current).sort((a, b) => a - b));
      }
    } else {
      current.add(id);
      if (current.size === ALL_LESSON_IDS.length) {
        onChange(ALL_LESSON_IDS);
      } else {
        onChange(Array.from(current).sort((a, b) => a - b));
      }
    }
  }

  return (
    <div className={`lesson-filter-bar ${className}`.trim()} role="group" aria-label="Bộ lọc bài học">
      <span className="filter-title">Bài:</span>
      <button
        type="button"
        className={`filter-pill ${isAll ? 'active' : ''}`}
        aria-pressed={isAll}
        onClick={handleAllClick}
      >
        Tất cả
      </button>
      {ALL_LESSON_IDS.map((id) => {
        const isSelected = !isAll && selectedLessons && selectedLessons.includes(id);
        return (
          <button
            key={id}
            type="button"
            className={`filter-pill ${isSelected ? 'active' : ''}`}
            aria-pressed={!!isSelected}
            onClick={() => handleLessonClick(id)}
          >
            Bài {id}
          </button>
        );
      })}
    </div>
  );
}
