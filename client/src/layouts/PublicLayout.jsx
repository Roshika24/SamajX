import { Outlet, Link } from 'react-router-dom';
import styles from './PublicLayout.module.css';

export default function PublicLayout() {
  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <nav className={styles.nav}>
          <Link to="/" className={styles.logo}>
            <span className={styles.logoIcon}>⚡</span>
            SamajX
          </Link>
          <div className={styles.links}>
            <Link to="/login">Log in</Link>
            <Link to="/register" className={styles.registerBtn}>Get Started</Link>
          </div>
        </nav>
      </header>
      <main id="main-content">
        <Outlet />
      </main>
    </div>
  );
}
