import React, { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useProgress } from '../lib/progress';
import Icon from './Icon';

const NAV = [
  { to: '/', label: 'Trang chủ', icon: 'home', end: true },
  { to: '/vocab', label: 'Từ vựng', icon: 'vocab' },
  { to: '/kanji', label: 'Kanji', icon: 'kanji' },
  { to: '/grammar', label: 'Ngữ pháp', icon: 'grammar' },
  { to: '/reading', label: 'Đọc hiểu', icon: 'reading' },
];

export default function Header() {
  const { settings, toggleTheme } = useProgress();
  const navigate = useNavigate();
  const [q, setQ] = useState('');

  const isDark =
    settings.theme === 'dark' ||
    (settings.theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  function handleSearch(e) {
    e.preventDefault();
    const term = q.trim();
    navigate(term ? `/vocab?q=${encodeURIComponent(term)}` : '/vocab');
  }

  return (
    <>
      <a className="skip-link" href="#main-content">Bỏ qua điều hướng</a>
      <header className="site-header">
        <div className="header-inner">
          <Link to="/" className="site-brand" aria-label="中級を学ぼう — về trang chủ">
            <span className="brand-seal" aria-hidden="true">学</span>
            <span className="brand-text">
              <span className="brand-kanji">中級を学ぼう</span>
              <span className="brand-subtitle">Tiếng Nhật trung cấp</span>
            </span>
          </Link>

          <form className="header-search" role="search" onSubmit={handleSearch}>
            <Icon name="search" size={18} />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm từ vựng, hiragana, nghĩa..."
              aria-label="Tìm từ vựng"
            />
          </form>

          <nav className="site-nav desktop-nav" aria-label="Menu chính">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="header-actions">
            <button
              type="button"
              className="theme-toggle-btn"
              onClick={toggleTheme}
              title={`Giao diện: ${settings.theme === 'dark' ? 'Tối' : settings.theme === 'light' ? 'Sáng' : 'Tự động'} (bấm để đổi)`}
              aria-label="Đổi giao diện sáng/tối"
            >
              <Icon name={isDark ? 'sun' : 'moon'} size={20} />
            </button>
          </div>
        </div>
      </header>

      <nav className="bottom-nav" aria-label="Menu trên điện thoại">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `bottom-nav-link ${isActive ? 'active' : ''}`}
          >
            <Icon name={item.icon} size={22} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
}
