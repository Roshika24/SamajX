import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import styles from './PublicLayout.module.css';

export default function PublicLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const closeMenu = () => setMobileMenuOpen(false);

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <nav className={styles.nav}>
          <Link to="/" className={styles.logo} onClick={closeMenu}>
            <span className={styles.logoBadge}>
              <svg className={styles.logoSvg} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" />
                <path d="M9 12l2 2 4-4" />
              </svg>
            </span>
            <span className={styles.brandName}>
              Samaj<span className={styles.brandAccent}>X</span>
            </span>
          </Link>

          {/* Desktop Links */}
          <div className={styles.links}>
            <Link to="/" className={location.pathname === '/' ? styles.activeLink : ''}>Home</Link>
            <Link to="/register/leader">Student Teams</Link>
            <Link to="/login">Log in</Link>
            <Link to="/register" className={styles.registerBtn}>Get Started</Link>
          </div>

          {/* Mobile hamburger button */}
          <button
            type="button"
            className={styles.hamburger}
            onClick={() => setMobileMenuOpen(prev => !prev)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            <span className={`${styles.bar} ${mobileMenuOpen ? styles.barTop : ''}`} />
            <span className={`${styles.bar} ${mobileMenuOpen ? styles.barMid : ''}`} />
            <span className={`${styles.bar} ${mobileMenuOpen ? styles.barBot : ''}`} />
          </button>
        </nav>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className={styles.mobileMenu}>
            <Link to="/" onClick={closeMenu} className={styles.mobileLink}>Home</Link>
            <Link to="/register/leader" onClick={closeMenu} className={styles.mobileLink}>Student Teams (Join with Code)</Link>
            <Link to="/login" onClick={closeMenu} className={styles.mobileLink}>Log In</Link>
            <Link to="/register" onClick={closeMenu} className={styles.mobileRegisterBtn}>Get Started</Link>
          </div>
        )}
      </header>

      <main id="main-content" className={styles.main}>
        <Outlet />
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerColMain}>
            <div className={styles.footerLogo}>
              <span className={styles.footerLogoBadge}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
              </span>
              <strong>SamajX</strong>
            </div>
            <p className={styles.footerTagline}>
              Where local community issues meet university engineering solutions. Verified civic problem-solving for transparent public impact.
            </p>
            <div className={styles.hackathonBadge}>
              <span className={styles.hackathonDot} />
              National Civic Tech Initiative
            </div>
          </div>

          <div className={styles.footerCol}>
            <h4>Platform</h4>
            <ul>
              <li><Link to="/login">Citizen Reporting</Link></li>
              <li><Link to="/register/leader">Student Team Hub</Link></li>
              <li><Link to="/register">University Registration</Link></li>
              <li><Link to="/register">CSR & Industry Partners</Link></li>
            </ul>
          </div>

          <div className={styles.footerCol}>
            <h4>Transparency</h4>
            <ul>
              <li><span style={{ color: 'var(--color-gray-400)', fontSize: '0.85rem' }}>Cryptographic Proofs</span></li>
              <li><span style={{ color: 'var(--color-gray-400)', fontSize: '0.85rem' }}>Automated AI Triage</span></li>
              <li><span style={{ color: 'var(--color-gray-400)', fontSize: '0.85rem' }}>Verified Certificates</span></li>
              <li><span style={{ color: 'var(--color-gray-400)', fontSize: '0.85rem' }}>OpenStreetMap Integration</span></li>
            </ul>
          </div>
        </div>

        <div className={styles.footerBottom}>
          <p>© {new Date().getFullYear()} SamajX Civic Network. All rights reserved.</p>
          <div className={styles.footerLegal}>
            <span>Privacy-First Civic Tech</span>
            <span>•</span>
            <span>EXIF Stripped Uploads</span>
            <span>•</span>
            <span>Independent Verification</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
