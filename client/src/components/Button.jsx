import styles from './Button.module.css';

/**
 * Pill-shaped button with variant and size props.
 * Renders a <button> element — spread ...rest for onClick, type, etc.
 */
export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  children,
  className = '',
  ...rest
}) {
  const cls = [
    styles.btn,
    styles[variant],
    styles[size],
    loading ? styles.loading : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button className={cls} disabled={disabled || loading} {...rest}>
      {loading && <span className={styles.spinner} aria-hidden="true" />}
      <span className={loading ? styles.labelHidden : ''}>{children}</span>
    </button>
  );
}

export default Button;
