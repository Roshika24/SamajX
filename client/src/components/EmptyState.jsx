import styles from './EmptyState.module.css';

/**
 * Friendly empty-state placeholder with illustration, title, description, and CTA.
 */
export function EmptyState({ icon, title, description, action, className = '' }) {
  const cls = [
    styles.empty,
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={cls}>
      {icon && <div className={styles.icon} aria-hidden="true">{icon}</div>}
      {title && <h3 className={styles.title}>{title}</h3>}
      {description && <p className={styles.description}>{description}</p>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}

export default EmptyState;
