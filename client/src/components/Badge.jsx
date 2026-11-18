import styles from './Badge.module.css';

/**
 * Small indicator badge for team levels and statuses.
 */
export function Badge({
  variant = 'beginner',
  dot = false,
  children,
  className = '',
}) {
  const cls = [
    styles.badge,
    styles[variant],
    className,
  ].filter(Boolean).join(' ');

  return (
    <span className={cls}>
      {dot && <span className={styles.dot} aria-hidden="true" />}
      {children}
    </span>
  );
}

export default Badge;
