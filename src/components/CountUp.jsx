import React, { useEffect, useState, useRef } from 'react';

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

export function CountUp({ to = 0, suffix = '', duration = 900, className = '' }) {
  const target = typeof to === 'number' ? to : Number(to) || 0;

  const [displayValue, setDisplayValue] = useState(() => {
    if (typeof window === 'undefined') return target;
    try {
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return target;
      }
    } catch {
      // fallback
    }
    return 0;
  });

  const rafRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') {
      setDisplayValue(target);
      return;
    }

    try {
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        setDisplayValue(target);
        return;
      }
    } catch {
      // fallback
    }

    if (duration <= 0 || target === 0) {
      setDisplayValue(target);
      return;
    }

    let startTime = null;
    const startValue = 0;

    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutCubic(progress);
      const current = Math.round(startValue + (target - startValue) * easedProgress);

      if (progress < 1) {
        setDisplayValue(current);
        rafRef.current = requestAnimationFrame(step);
      } else {
        setDisplayValue(target);
        rafRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [target, duration]);

  return (
    <span className={`count-up ${className}`.trim()}>
      {displayValue}{suffix}
    </span>
  );
}

export default CountUp;
