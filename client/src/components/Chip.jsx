import styles from './Chip.module.css';

/**
 * Small pill-shaped tag for categories, specialties, statuses.
 */
export function Chip({
  variant = 'default',
  size = 'sm',
  children,
  className = '',
}) {
  const cls = [
    styles.chip,
    styles[variant],
    styles[size],
    className,
  ].filter(Boolean).join(' ');

  return <span className={cls}>{children}</span>;
}

export default Chip;
