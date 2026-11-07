import { useLayoutEffect } from 'react';

// Phần tử đã được hiện ra. React ghi đè cả chuỗi className khi className đổi
// (ví dụ bấm "đã thuộc", đọc to đoạn văn), làm mất class `is-visible`.
// Tập này giúp khôi phục lại class đó ngay sau mỗi lần render.
const revealed = new WeakSet();

export function useReveal(deps = []) {
  // Chạy sau mỗi lần render: trả lại `is-visible` cho phần tử đã hiện nhưng bị React xóa class.
  useLayoutEffect(() => {
    if (typeof document === 'undefined') return;
    document.querySelectorAll('.reveal:not(.is-visible)').forEach((el) => {
      if (revealed.has(el)) el.classList.add('is-visible');
    });
  });

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('IntersectionObserver' in window)) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    document.documentElement.classList.add('js-reveal');

    const elements = document.querySelectorAll('.reveal:not(.is-visible)');
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            revealed.add(entry.target);
            entry.target.classList.add('is-visible');
            obs.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.12,
        rootMargin: '0px 0px -8% 0px',
      }
    );

    elements.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
    };
  }, deps);
}
