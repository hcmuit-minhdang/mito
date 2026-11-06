import React, { useState } from 'react';
import { speak, isSpeechSupported } from '../lib/speech';

export default function SpeakButton({
  text,
  size = 'md',
  title = 'Nghe phát âm',
  className = '',
  stopEventPropagation = true,
}) {
  const [playing, setPlaying] = useState(false);

  if (!isSpeechSupported() || !text) {
    return null;
  }

  function handleClick(e) {
    if (stopEventPropagation) {
      e.stopPropagation();
    }

    setPlaying(true);
    speak(text, {
      onEnd: () => setPlaying(false),
      onError: () => setPlaying(false),
    });
  }

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 24,
  };
  const iconSize = iconSizes[size] || 20;

  return (
    <button
      type="button"
      className={`speak-btn speak-btn-${size} ${playing ? 'playing' : ''} ${className}`.trim()}
      onClick={handleClick}
      title={title}
      aria-label={title}
    >
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
      </svg>
    </button>
  );
}
