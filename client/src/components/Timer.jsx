import { useState, useEffect } from 'react';
import styles from './Timer.module.css';

/**
 * Countdown timer with monospace digit boxes.
 * Pulses gently when under 1 hour remaining.
 */
export function Timer({ deadline, variant = 'light', onExpire, className = '' }) {
  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(deadline));

  useEffect(() => {
    const id = setInterval(() => {
      const tl = getTimeLeft(deadline);
      setTimeLeft(tl);
      if (tl.total <= 0) {
        clearInterval(id);
        onExpire?.();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [deadline, onExpire]);

  const urgent = timeLeft.total > 0 && timeLeft.total < 3600000; // < 1 hour

  const cls = [
    styles.timer,
    styles[variant],
    urgent ? styles.urgent : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={cls} role="timer" aria-live="polite" aria-label="Countdown">
      <div className={styles.segment}>
        <span className={styles.digits}>{pad(timeLeft.days)}</span>
        <span className={styles.label}>days</span>
      </div>
      <span className={styles.colon}>:</span>
      <div className={styles.segment}>
        <span className={styles.digits}>{pad(timeLeft.hours)}</span>
        <span className={styles.label}>hrs</span>
      </div>
      <span className={styles.colon}>:</span>
      <div className={styles.segment}>
        <span className={styles.digits}>{pad(timeLeft.mins)}</span>
        <span className={styles.label}>min</span>
      </div>
      <span className={styles.colon}>:</span>
      <div className={styles.segment}>
        <span className={styles.digits}>{pad(timeLeft.secs)}</span>
        <span className={styles.label}>sec</span>
      </div>
    </div>
  );
}

function getTimeLeft(deadline) {
  const total = Math.max(0, new Date(deadline).getTime() - Date.now());
  return {
    total,
    days:  Math.floor(total / (1000 * 60 * 60 * 24)),
    hours: Math.floor((total / (1000 * 60 * 60)) % 24),
    mins:  Math.floor((total / (1000 * 60)) % 60),
    secs:  Math.floor((total / 1000) % 60),
  };
}

function pad(n) {
  return String(n).padStart(2, '0');
}

export default Timer;
