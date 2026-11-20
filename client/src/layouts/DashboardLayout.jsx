import { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import styles from './DashboardLayout.module.css';

/**
 * Shared dashboard shell for authenticated roles.
 * Shows a modern top bar with logo, role badge, user avatar, and logout.
 * Responsive sidebar with mobile drawer support.
 */
export default function DashboardLayout({ navItems = [], title = '' }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const roleLabels = {
    citizen: 'Citizen',
    leader: 'Student Leader',
    university_admin: 'University Admin',
    company: 'Industry / CSR',
    platform_admin: 'Platform Admin',
  };

  const userInitial = (user?.display_name || user?.email || 'U').charAt(0).toUpperCase();

  return (
    <div className={`${styles.layout} ${(user?.role === 'leader' || user?.role === 'citizen') ? styles.studentTheme : styles.adminTheme}`}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          {navItems.length > 0 && (
            <button
              type="button"
              className={styles.menuToggle}
              onClick={() => setMobileNavOpen(prev => !prev)}
              aria-label="Toggle navigation sidebar"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}
          <Link to="/" className={styles.logo}>
            <span className={styles.logoBadge}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" />
                <path d="M9 12l2 2 4-4" />
              </svg>
            </span>
            <span className={styles.brandText}>
              Samaj<span className={styles.brandAccent}>X</span>
            </span>
          </Link>
          {user?.role && (
            <span className={styles.roleBadge}>
              {roleLabels[user.role] || title || user.role}
            </span>
          )}
        </div>

        <div className={styles.headerRight}>
          <div className={styles.userProfile}>
            <div className={styles.avatar}>
              {userInitial}
            </div>
            <div className={styles.userDetails}>
              <span className={styles.userName}>{user?.display_name || 'User'}</span>
              <span className={styles.userEmail}>{user?.email}</span>
            </div>
          </div>
          <button className={styles.logoutBtn} onClick={handleLogout} title="Log out">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 4 }}>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Log out
          </button>
        </div>
      </header>

      <div className={styles.body}>
        {navItems.length > 0 && (
          <>
            {/* Backdrop for mobile */}
            {mobileNavOpen && (
              <div className={styles.mobileBackdrop} onClick={() => setMobileNavOpen(false)} />
            )}
            <aside className={`${styles.sidebar} ${mobileNavOpen ? styles.sidebarOpen : ''}`}>
              <nav className={styles.navContainer}>
                {title && <div className={styles.sidebarHeader}><span className={styles.sidebarTitle}>{title} Workspace</span></div>}
                <ul className={styles.navList}>
                  {navItems.map(item => {
                    const isActive = location.pathname === item.to || (item.to !== '/citizen' && item.to !== '/leader' && item.to !== '/admin/university' && item.to !== '/admin/platform' && location.pathname.startsWith(item.to));
                    return (
                      <li key={item.to}>
                        <Link
                          to={item.to}
                          className={`${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
                          onClick={() => setMobileNavOpen(false)}
                        >
                          <span className={styles.navDot} />
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            </aside>
          </>
        )}
        <main id="main-content" className={styles.main}>
          <div className={styles.mainInner}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

