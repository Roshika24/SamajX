import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import styles from './DashboardLayout.module.css';

/**
 * Shared dashboard shell for authenticated roles.
 * Shows a top bar with logo, user info, and logout.
 * The Outlet renders the role-specific content.
 */
export default function DashboardLayout({ navItems = [], title = '' }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <Link to="/" className={styles.logo}>
          <span className={styles.logoIcon}>⚡</span>
          CivicPulse
        </Link>
        <div className={styles.headerRight}>
          <span className={styles.userName}>{user?.display_name}</span>
          <button className={styles.logoutBtn} onClick={handleLogout}>Log out</button>
        </div>
      </header>
      <div className={styles.body}>
        {navItems.length > 0 && (
          <aside className={styles.sidebar}>
            <nav>
              {title && <h4 className={styles.sidebarTitle}>{title}</h4>}
              <ul className={styles.navList}>
                {navItems.map(item => (
                  <li key={item.to}>
                    <Link to={item.to} className={styles.navLink}>{item.label}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>
        )}
        <main id="main-content" className={styles.main}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
