import styles from './EmptyState.module.css';

/**
 * Friendly empty-state placeholder with illustration, title, description, and CTA.
 */
export function EmptyState({ icon, title, description, action, className = '' }) {
  const cls = [
    styles.empty,
    className,
  ].filter(Boolean).join(' ');

  const defaultIllustration = (
    <svg className={styles.defaultSvg} viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="32" cy="32" r="28" stroke="var(--color-primary-border)" strokeWidth="1.5" strokeDasharray="3 3" />
      <circle cx="32" cy="32" r="20" fill="var(--color-primary-bg)" stroke="none" />
      <path d="M26 32h12M32 26v12" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );

  return (
    <div className={cls}>
      <div className={styles.iconWrapper} aria-hidden="true">
        {icon || defaultIllustration}
      </div>
      {title && <h3 className={styles.title}>{title}</h3>}
      {description && <p className={styles.description}>{description}</p>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}

export default EmptyState;

