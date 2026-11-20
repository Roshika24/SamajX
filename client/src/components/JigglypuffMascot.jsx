import React from 'react';
import styles from './JigglypuffMascot.module.css';

/**
 * Authentic, nostalgic pixel-art / anime inspired Jigglypuff mascot.
 * Used strictly for Student Leader, Citizen, and Milestone celebration spaces.
 * Strictly NOT rendered on Admin consoles.
 *
 * @param {object} props
 * @param {'idle' | 'celebrate' | 'thinking' | 'sleeping' | 'trainer'} [props.variant='idle']
 * @param {'small' | 'medium' | 'large' | 'hero'} [props.size='medium']
 * @param {string} [props.speech]
 * @param {boolean} [props.showShadow=true]
 * @param {string} [props.className]
 */
export default function JigglypuffMascot({
  variant = 'idle',
  size = 'medium',
  speech,
  showShadow = true,
  className = '',
}) {
  const sizeDimensions = {
    small: { width: 48, height: 48 },
    medium: { width: 84, height: 84 },
    large: { width: 130, height: 130 },
    hero: { width: 176, height: 176 },
  };

  const dim = sizeDimensions[size] || sizeDimensions.medium;

  const animationClass = {
    idle: styles.animateFloat,
    celebrate: styles.animateBounce,
    sleeping: styles.animateSleep,
    thinking: styles.animateThinking,
    trainer: styles.animateFloat,
  }[variant] || styles.animateFloat;

  return (
    <div className={`${styles.container} ${className}`} aria-label="Jigglypuff Team Mascot">
      {speech && (
        <div className={styles.speechBubble} role="status">
          {speech}
        </div>
      )}

      <div
        className={`${styles.mascotWrapper} ${animationClass}`}
        style={{ width: dim.width, height: dim.height }}
      >
        <svg
          viewBox="0 0 160 160"
          width={dim.width}
          height={dim.height}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Body gradients */}
            <radialGradient id="jigglyBody" cx="40%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#FFD1DC" />
              <stop offset="60%" stopColor="#F48FB1" />
              <stop offset="100%" stopColor="#E57373" />
            </radialGradient>
            <radialGradient id="jigglyCheek" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FF4081" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#F48FB1" stopOpacity="0" />
            </radialGradient>
            {/* Eye gradients */}
            <radialGradient id="eyeTeal" cx="45%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#4DD0E1" />
              <stop offset="50%" stopColor="#00ACC1" />
              <stop offset="100%" stopColor="#006064" />
            </radialGradient>
            <linearGradient id="earInner" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#37474F" />
              <stop offset="100%" stopColor="#212121" />
            </linearGradient>
            {/* Gold microphone gradient */}
            <linearGradient id="micHead" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FFF9C4" />
              <stop offset="50%" stopColor="#FFD54F" />
              <stop offset="100%" stopColor="#FFA000" />
            </linearGradient>
          </defs>

          {/* Left Ear */}
          <path
            d="M32 46 L20 18 Q25 14 36 22 L54 36 Z"
            fill="#F48FB1"
            stroke="#C2185B"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
          <path
            d="M28 40 L23 23 Q27 21 34 26 L45 34 Z"
            fill="url(#earInner)"
          />

          {/* Right Ear */}
          <path
            d="M128 46 L140 18 Q135 14 124 22 L106 36 Z"
            fill="#F48FB1"
            stroke="#C2185B"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
          <path
            d="M132 40 L137 23 Q133 21 126 26 L115 34 Z"
            fill="url(#earInner)"
          />

          {/* Feet */}
          {variant !== 'sleeping' ? (
            <>
              {/* Left foot */}
              <ellipse
                cx="56"
                cy="142"
                rx="14"
                ry="9"
                transform="rotate(-15 56 142)"
                fill="#F48FB1"
                stroke="#C2185B"
                strokeWidth="3.5"
              />
              {/* Right foot */}
              <ellipse
                cx="104"
                cy="142"
                rx="14"
                ry="9"
                transform="rotate(15 104 142)"
                fill="#F48FB1"
                stroke="#C2185B"
                strokeWidth="3.5"
              />
            </>
          ) : (
            <>
              <ellipse cx="58" cy="140" rx="13" ry="7" fill="#F48FB1" stroke="#C2185B" strokeWidth="3" />
              <ellipse cx="102" cy="140" rx="13" ry="7" fill="#F48FB1" stroke="#C2185B" strokeWidth="3" />
            </>
          )}

          {/* Main Round Body */}
          <circle
            cx="80"
            cy="84"
            r="58"
            fill="url(#jigglyBody)"
            stroke="#C2185B"
            strokeWidth="4"
          />

          {/* Cheeks blush */}
          <circle cx="44" cy="98" r="11" fill="url(#jigglyCheek)" />
          <circle cx="116" cy="98" r="11" fill="url(#jigglyCheek)" />

          {/* Hair Tuft Curl (Forehead) */}
          <path
            d="M74 42 C70 28, 92 20, 96 34 C98 42, 88 52, 80 50 C74 48, 72 40, 78 38 C84 36, 88 42, 82 44"
            fill="#FFD1DC"
            stroke="#C2185B"
            strokeWidth="3.5"
            strokeLinecap="round"
          />

          {/* EYES based on variant */}
          {variant === 'sleeping' ? (
            /* Sleeping closed eyes */
            <>
              <path
                d="M45 82 Q56 90 67 82"
                stroke="#4527A0"
                strokeWidth="4"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M93 82 Q104 90 115 82"
                stroke="#4527A0"
                strokeWidth="4"
                strokeLinecap="round"
                fill="none"
              />
            </>
          ) : (
            /* Open anime eyes */
            <>
              {/* Left Eye */}
              <ellipse
                cx="56"
                cy="76"
                rx="15"
                ry="17"
                fill="url(#eyeTeal)"
                stroke="#1A237E"
                strokeWidth="3.5"
              />
              {/* Pupil depth */}
              <ellipse cx="57" cy="78" rx="8" ry="10" fill="#004D40" />
              {/* Sparkle highlights */}
              <circle cx="51" cy="70" r="5.5" fill="#FFFFFF" />
              <circle cx="61" cy="83" r="2.2" fill="#FFFFFF" />

              {/* Right Eye */}
              <ellipse
                cx="104"
                cy="76"
                rx="15"
                ry="17"
                fill="url(#eyeTeal)"
                stroke="#1A237E"
                strokeWidth="3.5"
              />
              {/* Pupil depth */}
              <ellipse cx="103" cy="78" rx="8" ry="10" fill="#004D40" />
              {/* Sparkle highlights */}
              <circle cx="99" cy="70" r="5.5" fill="#FFFFFF" />
              <circle cx="109" cy="83" r="2.2" fill="#FFFFFF" />
            </>
          )}

          {/* Mouth / Expressions */}
          {variant === 'celebrate' ? (
            /* Big Joyful Open Mouth */
            <path
              d="M72 96 Q80 112 88 96 Q80 94 72 96 Z"
              fill="#D81B60"
              stroke="#880E4F"
              strokeWidth="2.5"
            />
          ) : variant === 'thinking' ? (
            /* Cute tilted small mouth */
            <path
              d="M75 96 Q80 100 86 95"
              stroke="#880E4F"
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
            />
          ) : variant === 'sleeping' ? (
            /* Tiny relaxed smile */
            <path
              d="M76 96 Q80 100 84 96"
              stroke="#880E4F"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />
          ) : (
            /* Friendly gentle smile */
            <path
              d="M74 95 Q80 104 86 95"
              stroke="#880E4F"
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
            />
          )}

          {/* ARMS */}
          {variant === 'celebrate' ? (
            /* Arms raised celebrating */
            <>
              <path
                d="M36 84 C22 72, 24 58, 38 66 Z"
                fill="#F48FB1"
                stroke="#C2185B"
                strokeWidth="3.5"
                strokeLinejoin="round"
              />
              <path
                d="M124 84 C138 72, 136 58, 122 66 Z"
                fill="#F48FB1"
                stroke="#C2185B"
                strokeWidth="3.5"
                strokeLinejoin="round"
              />
              {/* Celebration stars */}
              <path d="M22 34 L25 40 L31 41 L26 46 L28 52 L22 48 L16 52 L18 46 L13 41 L19 40 Z" fill="#FFD54F" />
              <path d="M138 34 L141 40 L147 41 L142 46 L144 52 L138 48 L132 52 L134 46 L129 41 L135 40 Z" fill="#FFD54F" />
            </>
          ) : variant === 'trainer' ? (
            /* Confident trainer pose with microphone marker */
            <>
              <ellipse cx="38" cy="98" rx="8" ry="6" fill="#F48FB1" stroke="#C2185B" strokeWidth="3" />
              {/* Holding gold marker / mic */}
              <rect x="114" y="80" width="8" height="26" rx="3" fill="#37474F" stroke="#212121" strokeWidth="2" transform="rotate(20 114 80)" />
              <circle cx="124" cy="80" r="9" fill="url(#micHead)" stroke="#FF8F00" strokeWidth="2" />
              <ellipse cx="118" cy="96" rx="7" ry="5" fill="#F48FB1" stroke="#C2185B" strokeWidth="2.5" />
            </>
          ) : (
            /* Default stubby paws resting */
            <>
              <ellipse cx="40" cy="98" rx="8" ry="6" transform="rotate(15 40 98)" fill="#F48FB1" stroke="#C2185B" strokeWidth="3" />
              <ellipse cx="120" cy="98" rx="8" ry="6" transform="rotate(-15 120 98)" fill="#F48FB1" stroke="#C2185B" strokeWidth="3" />
            </>
          )}

          {/* Sleeping Zzz accents */}
          {variant === 'sleeping' && (
            <text x="122" y="52" fill="#E85D96" fontSize="22" fontWeight="800" fontFamily="sans-serif">
              Zzz
            </text>
          )}
        </svg>

        {variant === 'idle' && <span className={styles.melodyNote}>🎵</span>}
      </div>

      {showShadow && <div className={styles.shadow} />}
    </div>
  );
}
