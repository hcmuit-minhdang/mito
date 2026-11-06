import React from 'react';

export default function ProgressBar({
  value = 0,
  max = 100,
  label = '',
  subLabel = '',
  showPercent = true,
  color = 'primary',
  className = '',
}) {
  const safeMax = max > 0 ? max : 1;
  const percent = Math.min(100, Math.max(0, Math.round((value / safeMax) * 100)));

  return (
    <div className={`progress-wrapper ${className}`.trim()}>
      {(label || showPercent || subLabel) && (
        <div className="progress-header">
          {label && <span className="progress-label">{label}</span>}
          {subLabel && <span className="progress-sublabel">{subLabel}</span>}
          {showPercent && (
            <span className="progress-percent">
              {percent}% ({value}/{max})
            </span>
          )}
        </div>
      )}
      <div className="progress-track" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
        <div
          className={`progress-fill progress-fill-${color}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
