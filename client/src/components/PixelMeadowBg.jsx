import React from 'react';
import styles from './PixelMeadowBg.module.css';

/**
 * Pastel Pixel-Art Meadow & Mountain backdrop.
 * Strictly used for student/citizen playful ambiance.
 * Keeps contrast high and readable for primary content.
 */
export default function PixelMeadowBg({ children, className = '' }) {
  return (
    <div className={`${styles.meadowWrapper} ${className}`}>
      <div className={styles.skyCanvas} aria-hidden="true">
        <div className={styles.cloud1} />
        <div className={styles.cloud2} />
        <svg
          className={styles.mountains}
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
          fill="none"
        >
          <path
            d="M0 120 L0 80 L180 20 L320 70 L480 30 L680 85 L840 25 L1020 75 L1200 40 L1200 120 Z"
            fill="#477FA8"
          />
          <path
            d="M0 120 L0 95 L220 55 L380 90 L560 60 L780 100 L950 50 L1200 85 L1200 120 Z"
            fill="#A8D58D"
            opacity="0.4"
          />
        </svg>
      </div>

      <div className={styles.contentContainer}>
        {children}
      </div>
    </div>
  );
}
