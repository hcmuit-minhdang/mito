import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useProgress } from '../lib/progress';
import Icon from './Icon';

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
        <div className="footer-columns">
          <div className="footer-col footer-brand">
            <p className="footer-logo">
              <span lang="ja">中級を学ぼう</span>
            </p>
            <p className="footer-blurb">
              Học từ vựng, chữ Hán và đọc hiểu theo giáo trình 『中級を学ぼう 中級前期 第2版』. Tiến độ được lưu ngay trên trình duyệt của bạn.
            </p>
          </div>

          <div className="footer-col">
            <h2 className="footer-title">Học tập</h2>
            <Link to="/">Trang chủ</Link>
            <Link to="/vocab">Từ vựng</Link>
            <Link to="/kanji">Kanji</Link>
            <Link to="/grammar">Ngữ pháp</Link>
            <Link to="/reading">Đọc hiểu</Link>
          </div>

          <div className="footer-col">
            <h2 className="footer-title">Nguồn dữ liệu</h2>
            <span>Từ trong bài (ことば)</span>
            <span>Từ trong bảng 索引</span>
            <span>Bổ sung N3–N2</span>
            <span>Ngữ pháp 8 bài</span>
          </div>

          <div className="footer-col">
            <h2 className="footer-title">Dữ liệu của bạn</h2>
            <button type="button" className="footer-reset-btn" onClick={() => setShowConfirm(true)}>
              Xóa dữ liệu học tập
            </button>
          </div>
        </div>

        <p className="footer-disclaimer">
          <Icon name="warning" size={16} className="footer-warn-icon" />
          <span>
            Nghĩa tiếng Việt, đáp án câu hỏi, âm Hán Việt, mẹo nhớ và bản dịch tiếng Việt của câu ví dụ ngữ pháp do AI soạn từ nội dung sách (sách gốc không kèm bản dịch và đáp án trong file này). Từ có nhãn 索引 lấy từ bảng tra cuối sách; từ nhãn N3–N2 là phần bổ sung ngoài sách. Hãy đối chiếu lại với sách/giáo viên.
          </span>
        </p>
      </div>

      {showConfirm && (
        <div className="modal-backdrop" onClick={() => setShowConfirm(false)}>
          <div
            className="modal-box confirm-dialog"
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-reset-title"
          >
            <h3 id="confirm-reset-title">Xác nhận xóa toàn bộ tiến độ?</h3>
            <p>
              Tất cả các từ vựng đã thuộc, kanji đã đánh dấu, ngữ pháp đã học và điểm số đọc hiểu sẽ bị xóa về trạng thái ban đầu.
            </p>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowConfirm(false)}>
                Hủy bỏ
              </button>
              <button type="button" className="btn btn-danger" onClick={handleReset}>
                Xóa tất cả
              </button>
            </div>
          </div>
        </div>
      )}
    </footer>
  );
}
