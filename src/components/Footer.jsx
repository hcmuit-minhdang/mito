import React, { useState } from 'react';
import Icon from './Icon';
import { useProgress } from '../lib/progress';

export default function Footer() {
  const { resetAllProgress } = useProgress();
  const [showConfirm, setShowConfirm] = useState(false);

  function handleReset() {
    resetAllProgress();
    setShowConfirm(false);
  }

  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <p className="footer-disclaimer">
          <Icon name="warning" size={16} className="footer-warn-icon" /> <em>Nghĩa tiếng Việt, đáp án câu hỏi, âm Hán Việt và mẹo nhớ do AI soạn (sách gốc không kèm bản dịch và đáp án trong file này). Từ có nhãn 索引 lấy từ bảng tra cuối sách; từ nhãn N3–N2 là phần bổ sung ngoài sách. Hãy đối chiếu lại với sách/giáo viên.</em>
        </p>

        <div className="footer-actions">
          <span>Giáo trình 『中級を学ぼう 中級前期 第2版』 (8 bài học)</span>
          {' · '}
          <button
            type="button"
            className="footer-reset-btn"
            onClick={() => setShowConfirm(true)}
          >
            Xóa dữ liệu học tập
          </button>
        </div>
      </div>

      {showConfirm && (
        <div className="modal-backdrop" onClick={() => setShowConfirm(false)}>
          <div
            className="modal-box confirm-dialog"
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
          >
            <h3>Xác nhận xóa toàn bộ tiến độ?</h3>
            <p>
              Tất cả các từ vựng đã thuộc, kanji đã đánh dấu và điểm số đọc hiểu sẽ bị xóa về trạng thái ban đầu.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowConfirm(false)}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleReset}
              >
                Xóa tất cả
              </button>
            </div>
          </div>
        </div>
      )}
    </footer>
  );
}
