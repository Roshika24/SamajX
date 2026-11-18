import styles from './ProgressBar.module.css';

/**
 * Animated progress bar with color variants.
 * Shows percentage label when showLabel is true.
 */
export function ProgressBar({
  value = 0,
  variant = 'purple',
  showLabel = false,
  label,
  className = '',
}) {
  const clamped = Math.min(100, Math.max(0, value));

  const cls = [
    styles.container,
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={cls}>
      {(showLabel || label) && (
        <div className={styles.labelRow}>
          <span className={styles.labelText}>{label || ''}</span>
          {showLabel && <span className={styles.percent}>{Math.round(clamped)}%</span>}
        </div>
      )}
      <div className={styles.track} role="progressbar" aria-valuenow={clamped} aria-valuemin={0} aria-valuemax={100}>
        <div
          className={`${styles.fill} ${styles[variant]}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

export default ProgressBar;
