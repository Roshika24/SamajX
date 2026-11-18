import styles from './Card.module.css';

/**
 * Rounded card container with variant styling.
 * The 'hero' variant adds a purple background with a diagonal yellow swoosh.
 */
export function Card({
  variant = 'default',
  padding = 'md',
  children,
  className = '',
  ...rest
}) {
  const cls = [
    styles.card,
    styles[variant],
    styles[`pad-${padding}`],
    className,
  ].filter(Boolean).join(' ');

  return <div className={cls} {...rest}>{children}</div>;
}

export default Card;
