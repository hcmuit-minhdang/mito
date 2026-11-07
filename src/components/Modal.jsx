import React, { useEffect, useRef, useState } from 'react';

export default function Modal({ isOpen, onClose, title, children, className = '' }) {
  const modalRef = useRef(null);
  const prevFocusedRef = useRef(null);
  const [closing, setClosing] = useState(false);

  function handleClose() {
    if (closing) return;
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      onClose();
      return;
    }
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      onClose();
    }, 200);
  }

  useEffect(() => {
    if (!isOpen) {
      setClosing(false);
      return;
    }

    // Remember currently focused element to restore upon close
    prevFocusedRef.current = document.activeElement;

    // Focus the modal or first focusable child
    const modalEl = modalRef.current;
    if (modalEl) {
      const focusable = modalEl.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length > 0) {
        focusable[0].focus();
      } else {
        modalEl.focus();
      }
    }

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
        return;
      }

      // Trap focus within modal
      if (e.key === 'Tab') {
        if (!modalRef.current) return;
        const focusable = Array.from(
          modalRef.current.querySelectorAll(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    // Prevent body scroll while modal open
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
      if (prevFocusedRef.current && prevFocusedRef.current.focus) {
        prevFocusedRef.current.focus();
      }
    };
  }, [isOpen]);

  if (!isOpen && !closing) return null;

  return (
    <div
      className={`modal-backdrop ${closing ? 'is-closing' : ''}`}
      onClick={handleClose}
      role="presentation"
    >
      <div
        className={`modal-box ${closing ? 'is-closing' : ''} ${className}`.trim()}
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Cửa sổ thông tin'}
        tabIndex="-1"
      >
        <button
          type="button"
          className="modal-close-btn"
          onClick={handleClose}
          aria-label="Đóng cửa sổ"
          title="Đóng (Esc)"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        {children}
      </div>
    </div>
  );
}
